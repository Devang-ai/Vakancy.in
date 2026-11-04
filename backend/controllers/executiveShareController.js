const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const zlib = require('zlib');
const https = require('https');
const http = require('http');
const db = require('../config/db');
const { getUserScope } = require('../middleware/rbacMiddleware');
const { generateSignedUrl } = require('../services/cloudinaryService');
const { sendExecutiveShortlistSharedEmail, sendOtpEmail } = require('../services/emailService');

const logActivity = async ({ performed_by, action_type, entity_type, entity_id, related_job_id, related_application_id, related_enquiry_id, description, changed_field, previous_value, new_value }, tx = db) => {
  try {
    const id = uuidv4();
    await (tx || db).query(
      `INSERT INTO RECRUITMENT_ACTIVITY 
      (id, performed_by, action_type, entity_type, entity_id, related_job_id, related_application_id, related_enquiry_id, description, changed_field, previous_value, new_value) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        performed_by,
        action_type,
        entity_type || null,
        entity_id || null,
        related_job_id || null,
        related_application_id || null,
        related_enquiry_id || null,
        description,
        changed_field || null,
        previous_value !== undefined && previous_value !== null ? String(previous_value).substring(0, 500) : null,
        new_value !== undefined && new_value !== null ? String(new_value).substring(0, 500) : null
      ]
    );
  } catch (err) {
    console.warn('RECRUITMENT_ACTIVITY logging error:', err.message);
  }
};

// Helper to mask sensitive email addresses
const maskEmail = (email) => {
  if (!email || typeof email !== 'string') return null;
  const parts = email.split('@');
  if (parts.length !== 2) return '******';
  const name = parts[0];
  const domain = parts[1];
  const visibleLen = Math.min(2, Math.max(1, Math.floor(name.length / 2)));
  return `${name.slice(0, visibleLen)}***@${domain}`;
};

// Helper to mask phone numbers
const maskPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return null;
  const clean = phone.replace(/\s+/g, '');
  if (clean.length <= 4) return '******';
  return `${clean.slice(0, 3)}******${clean.slice(-2)}`;
};

// Helper to verify if the requester has authorized access to the shortlist
const isShareAccessAuthorized = async (req, share) => {
  // If verification is not required for this link (e.g. legacy/internal link), access is open
  if (!share.require_verification) {
    return { authorized: true, reason: 'NO_VERIFICATION_REQUIRED' };
  }

  // If requester is authenticated internal staff (Admin, Director, Recruiter)
  if (req.user && ['ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'RECRUITER'].includes(req.user.role)) {
    return { authorized: true, user: req.user, reason: 'ADMIN_ROLE' };
  }

  // If requester is authenticated employer matching this job's employer
  if (req.user && req.user.role === 'EMPLOYER' && share.employer_id && req.user.employer_id === share.employer_id) {
    return { authorized: true, user: req.user, reason: 'EMPLOYER_OWNER' };
  }

  // Check verification token passed via header or query
  const verifyToken = req.headers['x-shortlist-verify-token'] || req.query.verify_token;
  if (verifyToken && typeof verifyToken === 'string' && verifyToken.length >= 32) {
    const tokenHash = crypto.createHash('sha256').update(verifyToken).digest('hex');
    const verRows = await db.query(`
      SELECT * FROM EXECUTIVE_SHARE_VERIFICATION
      WHERE share_id = ? AND verification_token = ? AND is_verified = 1 AND expires_at > NOW()
      LIMIT 1
    `, [share.id, tokenHash]);

    if (verRows && verRows.length > 0) {
      return { authorized: true, verifiedEmail: verRows[0].email, reason: 'OTP_VERIFIED' };
    }
  }

  return { authorized: false, reason: 'VERIFICATION_REQUIRED' };
};

/**
 * 1. Admin: Fetch candidates explicitly shortlisted for an Executive Search / Admin Job
 * Returns ONLY candidates explicitly added to the shortlist for this job.
 * Also calculates independent counts: applicants_count, shortlisted_count, shared_count
 */
const getJobExecutiveCandidates = async (req, res) => {
  try {
    const { id: jobId } = req.params;
    const { search = '' } = req.query;

    const jobRows = await db.query(`
      SELECT j.*, e.company_name 
      FROM JOB j 
      LEFT JOIN EMPLOYERS e ON j.employer_id = e.id 
      WHERE j.id = ?
    `, [jobId]);
    if (!jobRows || jobRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Job requisition not found.' });
    }
    const job = jobRows[0];

    // 1. Fetch ONLY candidates explicitly added to JOB_CANDIDATE_SHORTLIST for this specific job
    const shortlistedCandidates = await db.query(`
      SELECT 
        c.id, c.name, c.professional_headline, c.current_location,
        c.total_experience, c.current_organization, c.current_designation,
        c.professional_summary,
        u.email, u.phone,
        jcs.application_id,
        COALESCE(a.status, 'shortlisted') as application_status,
        COALESCE(jcs.created_at, a.applied_at) as applied_at,
        jcs.source,
        jcs.notes as shortlist_notes,
        jcs.created_at as shortlisted_at,
        u_shortlister.name as shortlisted_by_name,
        cr.id as resume_id, cr.file_name as resume_filename,
        CASE WHEN jcs.application_id IS NOT NULL OR a.id IS NOT NULL THEN 1 ELSE 0 END as is_applicant
      FROM JOB_CANDIDATE_SHORTLIST jcs
      JOIN CANDIDATES c ON jcs.candidate_id = c.id
      JOIN USERS u ON c.user_id = u.id
      LEFT JOIN APPLICATION a ON (jcs.application_id = a.id) OR (a.job_id = jcs.job_id AND a.candidate_id = jcs.candidate_id)
      LEFT JOIN USERS u_shortlister ON jcs.shortlisted_by_user_id = u_shortlister.id
      LEFT JOIN CANDIDATE_RESUME cr ON c.id = cr.candidate_id AND cr.is_primary = 1
      WHERE jcs.job_id = ?
      ORDER BY jcs.created_at DESC
    `, [jobId]);

    // 2. Accurate independent counts
    const [appCount] = await db.query(`SELECT COUNT(*) as count FROM APPLICATION WHERE job_id = ?`, [jobId]);
    const [shortlistCount] = await db.query(`SELECT COUNT(*) as count FROM JOB_CANDIDATE_SHORTLIST WHERE job_id = ?`, [jobId]);
    const [sharedCount] = await db.query(`
      SELECT COUNT(DISTINCT sc.candidate_id) as count 
      FROM EXECUTIVE_SEARCH_SHARE_CANDIDATE sc
      JOIN EXECUTIVE_SEARCH_SHARE s ON sc.share_id = s.id
      WHERE s.job_id = ? AND s.status = 'ACTIVE' AND (s.expires_at IS NULL OR s.expires_at > NOW())
    `, [jobId]);

    // 3. Optional recruiter sourcing search across candidate pool
    let poolCandidates = [];
    if (search && search.trim().length >= 2) {
      const term = `%${search.trim().toLowerCase()}%`;
      poolCandidates = await db.query(`
        SELECT 
          c.id, c.name, c.professional_headline, c.current_location,
          c.total_experience, c.current_organization, c.current_designation,
          c.professional_summary,
          u.email, u.phone,
          cr.id as resume_id, cr.file_name as resume_filename,
          EXISTS(SELECT 1 FROM JOB_CANDIDATE_SHORTLIST WHERE job_id = ? AND candidate_id = c.id) as is_shortlisted,
          EXISTS(SELECT 1 FROM APPLICATION WHERE job_id = ? AND candidate_id = c.id) as is_applicant
        FROM CANDIDATES c
        JOIN USERS u ON c.user_id = u.id
        LEFT JOIN CANDIDATE_RESUME cr ON c.id = cr.candidate_id AND cr.is_primary = 1
        WHERE u.is_active = 1
          AND (
            LOWER(c.name) LIKE ? OR
            LOWER(COALESCE(c.professional_headline, '')) LIKE ? OR
            LOWER(COALESCE(c.current_organization, '')) LIKE ? OR
            LOWER(COALESCE(c.current_location, '')) LIKE ?
          )
        ORDER BY c.total_experience DESC
        LIMIT 20
      `, [jobId, jobId, term, term, term, term]);
    }

    res.json({
      success: true,
      job: {
        id: job.id,
        title: job.title,
        company_name: job.company_name,
        source_type: job.source_type,
        employer_id: job.employer_id
      },
      counts: {
        applicants_count: Number(appCount?.count || 0),
        shortlisted_count: Number(shortlistCount?.count || 0),
        shared_count: Number(sharedCount?.count || 0)
      },
      candidates: shortlistedCandidates,
      pool_candidates: poolCandidates
    });
  } catch (error) {
    console.error('getJobExecutiveCandidates error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch executive candidates.', error: error.message });
  }
};

/**
 * Explicitly Shortlist a Candidate for a Job Mandate
 * (from Job Applicants or Manually Sourced by Recruiter)
 */
const addCandidateToShortlist = async (req, res) => {
  try {
    const { id: jobId } = req.params;
    const { candidate_id, application_id, notes, source = 'APPLICANT' } = req.body;

    if (!candidate_id) {
      return res.status(400).json({ success: false, message: 'Candidate ID is required.' });
    }

    const [job] = await db.query('SELECT id, title FROM JOB WHERE id = ?', [jobId]);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job requisition not found.' });
    }

    const [cand] = await db.query('SELECT id, name FROM CANDIDATES WHERE id = ?', [candidate_id]);
    if (!cand) {
      return res.status(404).json({ success: false, message: 'Candidate profile not found.' });
    }

    let effectiveAppId = application_id || null;
    if (!effectiveAppId) {
      const [existingApp] = await db.query(
        'SELECT id FROM APPLICATION WHERE job_id = ? AND candidate_id = ? LIMIT 1',
        [jobId, candidate_id]
      );
      if (existingApp) effectiveAppId = existingApp.id;
    }

    const shortlistId = uuidv4();
    await db.query(`
      INSERT INTO JOB_CANDIDATE_SHORTLIST 
        (id, job_id, candidate_id, application_id, shortlisted_by_user_id, source, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        notes = COALESCE(VALUES(notes), notes),
        application_id = COALESCE(VALUES(application_id), application_id),
        updated_at = NOW()
    `, [
      shortlistId,
      jobId,
      candidate_id,
      effectiveAppId,
      req.user.id,
      source,
      notes || null
    ]);

    // If an application exists, set status to 'shortlisted'
    if (effectiveAppId) {
      await db.query(`
        UPDATE APPLICATION 
        SET status = 'shortlisted', status_updated_by_user_id = ?, status_updated_at = NOW()
        WHERE id = ? AND status != 'shortlisted'
      `, [req.user.id, effectiveAppId]);
    }

    await logActivity({
      performed_by: req.user.id,
      action_type: 'SHORTLIST_CANDIDATE',
      entity_type: 'CANDIDATE',
      entity_id: candidate_id,
      related_job_id: jobId,
      related_application_id: effectiveAppId,
      description: `Candidate "${cand.name}" shortlisted for job "${job.title}".`
    });

    res.status(201).json({
      success: true,
      message: `Candidate "${cand.name}" added to shortlist.`
    });
  } catch (err) {
    console.error('addCandidateToShortlist error:', err);
    res.status(500).json({ success: false, message: 'Failed to shortlist candidate.', error: err.message });
  }
};

/**
 * Remove a Candidate from a Job Shortlist
 */
const removeCandidateFromShortlist = async (req, res) => {
  try {
    const { id: jobId, candidateId } = req.params;

    const existing = await db.query(
      'SELECT id, application_id FROM JOB_CANDIDATE_SHORTLIST WHERE job_id = ? AND candidate_id = ?',
      [jobId, candidateId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Candidate is not in the shortlist for this job.' });
    }

    await db.query(
      'DELETE FROM JOB_CANDIDATE_SHORTLIST WHERE job_id = ? AND candidate_id = ?',
      [jobId, candidateId]
    );

    // If there is an associated application that was shortlisted, revert status to 'under_review'
    if (existing[0].application_id) {
      await db.query(`
        UPDATE APPLICATION 
        SET status = 'under_review', status_updated_by_user_id = ?, status_updated_at = NOW()
        WHERE id = ? AND status = 'shortlisted'
      `, [req.user.id, existing[0].application_id]);
    }

    await logActivity({
      performed_by: req.user.id,
      action_type: 'REMOVE_SHORTLIST_CANDIDATE',
      entity_type: 'CANDIDATE',
      entity_id: candidateId,
      related_job_id: jobId,
      description: `Candidate removed from shortlist for job ID ${jobId}.`
    });

    res.json({
      success: true,
      message: 'Candidate removed from shortlist.'
    });
  } catch (err) {
    console.error('removeCandidateFromShortlist error:', err);
    res.status(500).json({ success: false, message: 'Failed to remove candidate from shortlist.', error: err.message });
  }
};

/**
 * Search talent pool to source candidates manually for a job mandate
 */
const searchCandidatePoolForJob = async (req, res) => {
  try {
    const { id: jobId } = req.params;
    const { search = '' } = req.query;

    if (!search || search.trim().length < 2) {
      return res.json({ success: true, candidates: [] });
    }

    const term = `%${search.trim().toLowerCase()}%`;
    const candidates = await db.query(`
      SELECT 
        c.id, c.name, c.professional_headline, c.current_location,
        c.total_experience, c.current_organization, c.current_designation,
        c.professional_summary,
        u.email, u.phone,
        cr.id as resume_id, cr.file_name as resume_filename,
        EXISTS(SELECT 1 FROM JOB_CANDIDATE_SHORTLIST WHERE job_id = ? AND candidate_id = c.id) as is_shortlisted,
        EXISTS(SELECT 1 FROM APPLICATION WHERE job_id = ? AND candidate_id = c.id) as is_applicant
      FROM CANDIDATES c
      JOIN USERS u ON c.user_id = u.id
      LEFT JOIN CANDIDATE_RESUME cr ON c.id = cr.candidate_id AND cr.is_primary = 1
      WHERE u.is_active = 1
        AND (
          LOWER(c.name) LIKE ? OR
          LOWER(COALESCE(c.professional_headline, '')) LIKE ? OR
          LOWER(COALESCE(c.current_organization, '')) LIKE ? OR
          LOWER(COALESCE(c.current_location, '')) LIKE ?
        )
      ORDER BY c.total_experience DESC
      LIMIT 20
    `, [jobId, jobId, term, term, term, term]);

    res.json({ success: true, candidates });
  } catch (err) {
    console.error('searchCandidatePoolForJob error:', err);
    res.status(500).json({ success: false, message: 'Failed to search candidate pool.', error: err.message });
  }
};

/**
 * 2. Admin: Get existing shortlist shares for an Executive Search Job
 */
const getJobExecutiveShares = async (req, res) => {
  try {
    const { id: jobId } = req.params;

    const shares = await db.query(`
      SELECT 
        s.id, s.job_id, s.employer_id, s.title, s.status,
        s.expires_at, s.allow_resume_download, s.mask_contact_info,
        s.require_employer_auth, s.created_at, s.revoked_at,
        u_creator.name as created_by_name,
        u_revoker.name as revoked_by_name,
        (SELECT COUNT(*) FROM EXECUTIVE_SEARCH_SHARE_CANDIDATE WHERE share_id = s.id) as candidate_count,
        (SELECT COUNT(*) FROM EXECUTIVE_SEARCH_SHARE_LOG WHERE share_id = s.id AND action = 'VIEW_SHORTLIST') as view_count,
        (SELECT COUNT(*) FROM EXECUTIVE_SEARCH_SHARE_LOG WHERE share_id = s.id AND action IN ('DOWNLOAD_RESUME', 'BULK_DOWNLOAD_RESUMES')) as download_count
      FROM EXECUTIVE_SEARCH_SHARE s
      LEFT JOIN USERS u_creator ON s.created_by_user_id = u_creator.id
      LEFT JOIN USERS u_revoker ON s.revoked_by_user_id = u_revoker.id
      WHERE s.job_id = ?
      ORDER BY s.created_at DESC
    `, [jobId]);

    // For each share, also fetch candidate summaries
    const detailedShares = await Promise.all(shares.map(async (share) => {
      const candidates = await db.query(`
        SELECT 
          c.id, c.name, c.professional_headline, c.current_location,
          c.current_organization, c.current_designation,
          sc.notes, sc.display_order
        FROM EXECUTIVE_SEARCH_SHARE_CANDIDATE sc
        JOIN CANDIDATES c ON sc.candidate_id = c.id
        WHERE sc.share_id = ?
        ORDER BY sc.display_order ASC, sc.created_at ASC
      `, [share.id]);

      const isExpired = share.expires_at && new Date(share.expires_at) < new Date();
      const effectiveStatus = share.status === 'REVOKED' ? 'REVOKED' : (isExpired ? 'EXPIRED' : 'ACTIVE');

      return {
        ...share,
        effective_status: effectiveStatus,
        is_expired: isExpired,
        candidates
      };
    }));

    res.json({
      success: true,
      shares: detailedShares
    });
  } catch (error) {
    console.error('getJobExecutiveShares error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch executive shares.', error: error.message });
  }
};

/**
 * 3. Admin: Create a new Executive Search Shortlist Share Link
 */
const createExecutiveShortlistShare = async (req, res) => {
  try {
    const { id: jobId } = req.params;
    const {
      candidate_ids = [],
      title,
      expires_in_days = 14,
      allow_resume_download = true,
      mask_contact_info = true,
      require_employer_auth = false,
      candidate_notes = {},
      notify_employer = false,
      recipient_email,
      additional_recipient_emails,
      message,
      custom_message,
      send_email = false,
      require_verification: reqVerificationParam
    } = req.body;

    if (!Array.isArray(candidate_ids) || candidate_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select at least one candidate for the shortlist.' });
    }

    const jobRows = await db.query(`
      SELECT j.*, e.company_name 
      FROM JOB j 
      LEFT JOIN EMPLOYERS e ON j.employer_id = e.id 
      WHERE j.id = ?
    `, [jobId]);
    if (!jobRows || jobRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Job requisition not found.' });
    }
    const job = jobRows[0];

    // Enforce Executive Search / Admin mandate validation
    const isAllowedSharing = job.source_type === 'EXECUTIVE_SEARCH' || job.created_by_type === 'ADMIN' || job.is_internal_only === 1;
    if (!isAllowedSharing) {
      return res.status(400).json({
        success: false,
        message: 'Candidate shortlist sharing is strictly restricted to Admin-created mandates and Executive Search.'
      });
    }

    // Format recipient emails
    const cleanRecipientEmail = recipient_email && typeof recipient_email === 'string' && recipient_email.trim()
      ? recipient_email.trim().toLowerCase()
      : null;

    let cleanAdditionalEmails = null;
    if (additional_recipient_emails) {
      if (Array.isArray(additional_recipient_emails)) {
        cleanAdditionalEmails = JSON.stringify(
          additional_recipient_emails
            .map(e => (typeof e === 'string' ? e.trim().toLowerCase() : ''))
            .filter(e => e && e.includes('@'))
        );
      } else if (typeof additional_recipient_emails === 'string' && additional_recipient_emails.trim()) {
        const parts = additional_recipient_emails.split(',').map(e => e.trim().toLowerCase()).filter(e => e && e.includes('@'));
        cleanAdditionalEmails = JSON.stringify(parts);
      }
    }

    const finalCustomMessage = (custom_message || message || '').trim() || null;
    // Default verification: enabled if recipient_email is provided, or if explicitly requested
    const finalRequireVerification = reqVerificationParam !== undefined
      ? (reqVerificationParam ? 1 : 0)
      : (cleanRecipientEmail ? 1 : 0);

    // Authorized recruitment staff check for unmasking candidate contact details
    const userRole = (req.user?.role || '').toLowerCase();
    const isStaffAuthorizedToUnmask = ['director', 'main_admin', 'admin', 'super_admin'].includes(userRole) ||
      req.user?.is_main_admin === 1 ||
      (job.assigned_recruiter_id && job.assigned_recruiter_id === req.user.id);

    // Default: ON (1). Only authorized staff can set mask_contact_info to 0 (OFF).
    const requestedMask = mask_contact_info !== undefined ? Boolean(mask_contact_info) : true;
    const finalMaskContactInfo = (!requestedMask && !isStaffAuthorizedToUnmask) ? 1 : (requestedMask ? 1 : 0);

    // Generate secure unguessable 32-byte crypto token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Calculate expiration date
    const expiryDays = Math.min(90, Math.max(1, Number(expires_in_days) || 14));
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    const shareId = uuidv4();
    const shareTitle = title && title.trim() ? title.trim() : `Executive Shortlist - ${job.title}`;

    await db.withTransaction(async (tx) => {
      // 1. Insert parent share record with token hash
      await tx.query(`
        INSERT INTO EXECUTIVE_SEARCH_SHARE (
          id, job_id, employer_id, title, share_token_hash,
          status, expires_at, allow_resume_download, mask_contact_info,
          require_employer_auth, created_by_user_id,
          recipient_email, additional_recipient_emails, custom_message, require_verification
        ) VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        shareId,
        job.id,
        job.employer_id || null,
        shareTitle,
        tokenHash,
        expiresAt,
        allow_resume_download ? 1 : 0,
        finalMaskContactInfo,
        require_employer_auth ? 1 : 0,
        req.user.id,
        cleanRecipientEmail,
        cleanAdditionalEmails,
        finalCustomMessage,
        finalRequireVerification
      ]);

      // 2. Insert shortlisted candidates
      for (let i = 0; i < candidate_ids.length; i++) {
        const candId = candidate_ids[i];
        const notes = candidate_notes[candId] || null;

        await tx.query(`
          INSERT INTO EXECUTIVE_SEARCH_SHARE_CANDIDATE (
            id, share_id, candidate_id, candidate_consent, notes, display_order
          ) VALUES (?, ?, ?, 1, ?, ?)
        `, [uuidv4(), shareId, candId, notes, i]);

        // Ensure candidate is also recorded in JOB_CANDIDATE_SHORTLIST
        await tx.query(`
          INSERT INTO JOB_CANDIDATE_SHORTLIST 
            (id, job_id, candidate_id, shortlisted_by_user_id, source, notes)
          VALUES (?, ?, ?, ?, 'EXPLICIT_SHARE', ?)
          ON DUPLICATE KEY UPDATE notes = COALESCE(VALUES(notes), notes)
        `, [uuidv4(), job.id, candId, req.user.id, notes]);

        // Dual compatibility: Ensure CANDIDATE_SHARING entry exists for authorized resume access
        const existingShares = await tx.query(`
          SELECT id FROM CANDIDATE_SHARING 
          WHERE candidate_id = ? AND job_id = ? AND status = 'APPROVED'
          LIMIT 1
        `, [candId, job.id]);

        if (existingShares.length === 0) {
          await tx.query(`
            INSERT INTO CANDIDATE_SHARING (
              id, candidate_id, client_id, job_id, share_token, status,
              candidate_consent, proposed_by_user_id, approved_by_user_id,
              share_scope, expires_at
            ) VALUES (?, ?, ?, ?, ?, 'APPROVED', 1, ?, ?, ?, ?)
          `, [
            uuidv4(),
            candId,
            job.employer_id || null,
            job.id,
            crypto.randomBytes(32).toString('hex'),
            req.user.id,
            req.user.id,
            allow_resume_download ? 'with_resume' : 'summary_only',
            expiresAt
          ]);
        }
      }

      // 3. Log audit event
      await logActivity({
        performed_by: req.user.id,
        action_type: 'CREATE_EXECUTIVE_SEARCH_SHORTLIST',
        entity_type: 'EXECUTIVE_SEARCH_SHARE',
        entity_id: shareId,
        description: `Created candidate shortlist "${shareTitle}" with ${candidate_ids.length} candidates (Candidate Masking: ${finalMaskContactInfo ? 'ENABLED' : 'DISABLED'}) for job #${job.id}${cleanRecipientEmail ? ` (shared with ${cleanRecipientEmail})` : ''}`
      }, tx);
    });

    const shareUrl = `/executive-search/shortlist/${rawToken}`;
    const fullUrl = `${process.env.FRONTEND_URL || 'https://vakancy.in'}${shareUrl}`;
    let emailSent = false;
    let emailError = null;

    // Direct employer email dispatch
    if ((send_email || notify_employer) && cleanRecipientEmail) {
      try {
        const mailRes = await sendExecutiveShortlistSharedEmail(cleanRecipientEmail, {
          employerName: job.company_name || 'Hiring Team',
          companyName: job.company_name,
          jobTitle: job.title,
          candidateCount: candidate_ids.length,
          shortlistUrl: fullUrl,
          expiresAt,
          customMessage: finalCustomMessage
        });
        emailSent = Boolean(mailRes.success || mailRes.simulated);
      } catch (mailErr) {
        console.warn('Shortlist email dispatch error:', mailErr.message);
        emailError = mailErr.message;
      }
    } else if (notify_employer && job.employer_id && !cleanRecipientEmail) {
      try {
        const empRows = await db.query(
          'SELECT company_name, official_email, contact_email FROM EMPLOYERS WHERE id = ?',
          [job.employer_id]
        );
        const emp = empRows[0];
        const targetEmail = emp?.contact_email || emp?.official_email;
        if (targetEmail) {
          const mailRes = await sendExecutiveShortlistSharedEmail(targetEmail, {
            employerName: emp.company_name || 'Hiring Team',
            companyName: emp.company_name,
            jobTitle: job.title,
            candidateCount: candidate_ids.length,
            shortlistUrl: fullUrl,
            expiresAt,
            customMessage: finalCustomMessage
          });
          emailSent = Boolean(mailRes.success || mailRes.simulated);
        }
      } catch (mailErr) {
        console.warn('Optional employer email notification skipped:', mailErr.message);
      }
    }

    res.status(201).json({
      success: true,
      message: emailSent
        ? 'Executive Search candidate shortlist published and sent to employer successfully.'
        : 'Executive Search candidate shortlist published successfully.',
      share_id: shareId,
      share_token: rawToken,
      share_url: shareUrl,
      expires_at: expiresAt,
      candidate_count: candidate_ids.length,
      email_sent: emailSent,
      email_error: emailError
    });
  } catch (error) {
    console.error('createExecutiveShortlistShare error:', error);
    res.status(500).json({ success: false, message: 'Failed to create candidate shortlist.', error: error.message });
  }
};

/**
 * 4. Admin: Revoke an existing shortlist share link
 */
const revokeExecutiveShortlistShare = async (req, res) => {
  try {
    const { id: jobId, shareId } = req.params;

    const shares = await db.query(
      'SELECT * FROM EXECUTIVE_SEARCH_SHARE WHERE id = ? AND job_id = ?',
      [shareId, jobId]
    );

    if (!shares || shares.length === 0) {
      return res.status(404).json({ success: false, message: 'Shortlist share not found for this job.' });
    }

    const share = shares[0];
    if (share.status === 'REVOKED') {
      return res.status(400).json({ success: false, message: 'Shortlist share is already revoked.' });
    }

    await db.withTransaction(async (tx) => {
      await tx.query(`
        UPDATE EXECUTIVE_SEARCH_SHARE
        SET status = 'REVOKED', revoked_by_user_id = ?, revoked_at = NOW()
        WHERE id = ?
      `, [req.user.id, shareId]);

      // Revoke related candidate sharing records
      await tx.query(`
        UPDATE CANDIDATE_SHARING
        SET status = 'REVOKED'
        WHERE job_id = ? AND candidate_id IN (
          SELECT candidate_id FROM EXECUTIVE_SEARCH_SHARE_CANDIDATE WHERE share_id = ?
        )
      `, [jobId, shareId]);

      await logActivity({
        performed_by: req.user.id,
        action_type: 'REVOKE_EXECUTIVE_SEARCH_SHORTLIST',
        entity_type: 'EXECUTIVE_SEARCH_SHARE',
        entity_id: shareId,
        description: `Revoked Executive Search candidate shortlist #${shareId}`
      }, tx);
    });

    res.json({
      success: true,
      message: 'Candidate shortlist link has been revoked immediately.'
    });
  } catch (error) {
    console.error('revokeExecutiveShortlistShare error:', error);
    res.status(500).json({ success: false, message: 'Failed to revoke shortlist link.', error: error.message });
  }
};

/**
 * 5. Admin: Fetch audit and download activity for a shortlist share
 */
const getExecutiveShortlistActivity = async (req, res) => {
  try {
    const { id: jobId, shareId } = req.params;

    const shares = await db.query(
      'SELECT * FROM EXECUTIVE_SEARCH_SHARE WHERE id = ? AND job_id = ?',
      [shareId, jobId]
    );
    if (!shares || shares.length === 0) {
      return res.status(404).json({ success: false, message: 'Shortlist share not found.' });
    }

    const logs = await db.query(`
      SELECT 
        l.id, l.share_id, l.action, l.candidate_id,
        l.actor_email, l.ip_address, l.user_agent, l.created_at,
        c.name as candidate_name
      FROM EXECUTIVE_SEARCH_SHARE_LOG l
      LEFT JOIN CANDIDATES c ON l.candidate_id = c.id
      WHERE l.share_id = ?
      ORDER BY l.created_at DESC
      LIMIT 100
    `, [shareId]);

    res.json({
      success: true,
      share_id: shareId,
      logs
    });
  } catch (error) {
    console.error('getExecutiveShortlistActivity error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch shortlist activity.', error: error.message });
  }
};

/**
 * 6. Public / Employer: View Candidate Shortlist using Secure Token
 */
const getPublicExecutiveShortlist = async (req, res) => {
  try {
    const { token } = req.params;

    // Set strict cache control to prevent caching sensitive candidate data
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    if (!token || typeof token !== 'string' || token.length < 32) {
      return res.status(400).json({ success: false, message: 'Invalid shortlist link token.' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const shareRows = await db.query(`
      SELECT * FROM EXECUTIVE_SEARCH_SHARE WHERE share_token_hash = ?
    `, [tokenHash]);

    if (!shareRows || shareRows.length === 0) {
      return res.status(404).json({
        success: false,
        code: 'SHORTLIST_NOT_FOUND',
        message: 'Candidate shortlist link not found or invalid.'
      });
    }

    const share = shareRows[0];

    // Check Revocation
    if (share.status === 'REVOKED') {
      return res.status(410).json({
        success: false,
        status: 'REVOKED',
        code: 'SHORTLIST_REVOKED',
        message: 'This candidate shortlist link has been revoked by the Vakancy recruitment team.'
      });
    }

    // Check Expiration
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return res.status(410).json({
        success: false,
        status: 'EXPIRED',
        code: 'SHORTLIST_EXPIRED',
        message: 'This candidate shortlist link has expired. Please contact your Vakancy representative for an updated link.'
      });
    }

    // Fetch Job Information
    const jobRows = await db.query(`
      SELECT 
        j.id, j.title, e.company_name, j.location, j.workplace_type,
        j.employment_type, j.seniority_level, j.department, j.job_domain,
        j.min_experience, j.max_experience, j.min_salary, j.max_salary,
        j.description, j.requirements, j.status
      FROM JOB j
      LEFT JOIN EMPLOYERS e ON j.employer_id = e.id
      WHERE j.id = ?
    `, [share.job_id]);

    if (!jobRows || jobRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Associated job mandate not found.' });
    }
    const job = jobRows[0];

    // Verify recipient access if required before exposing protected candidate details
    const authResult = await isShareAccessAuthorized(req, share);
    if (!authResult.authorized) {
      const [countRow] = await db.query(
        'SELECT COUNT(*) as count FROM EXECUTIVE_SEARCH_SHARE_CANDIDATE WHERE share_id = ?',
        [share.id]
      );
      return res.json({
        success: true,
        requires_verification: true,
        shortlist: {
          title: share.title,
          created_at: share.created_at,
          expires_at: share.expires_at,
          candidate_count: countRow?.count || 0,
          recipient_hint: maskEmail(share.recipient_email),
          custom_message: share.custom_message,
          job: {
            title: job.title,
            company_name: job.company_name,
            location: job.location,
            workplace_type: job.workplace_type,
            employment_type: job.employment_type,
            seniority_level: job.seniority_level,
            department: job.department
          }
        }
      });
    }

    // Fetch Shortlisted Candidates with approved details
    const candidateRows = await db.query(`
      SELECT 
        c.id, c.name, c.professional_headline, c.current_location,
        c.preferred_location, c.total_experience, c.current_organization,
        c.current_designation, c.professional_summary,
        u.email, u.phone,
        sc.notes as recruiter_notes, sc.display_order,
        cr.id as resume_id, cr.file_name as resume_filename
      FROM EXECUTIVE_SEARCH_SHARE_CANDIDATE sc
      JOIN CANDIDATES c ON sc.candidate_id = c.id
      JOIN USERS u ON c.user_id = u.id
      LEFT JOIN CANDIDATE_RESUME cr ON c.id = cr.candidate_id AND cr.is_primary = 1
      WHERE sc.share_id = ?
      ORDER BY sc.display_order ASC, sc.created_at ASC
    `, [share.id]);

    // Format candidate cards, applying privacy masking if configured
    const candidates = await Promise.all(candidateRows.map(async (cand) => {
      // Skills
      const skills = await db.query(`
        SELECT s.name, s.category 
        FROM CANDIDATE_SKILL cs 
        JOIN SKILL s ON cs.skill_id = s.id 
        WHERE cs.candidate_id = ?
      `, [cand.id]);

      // Experience History
      const experience = await db.query(`
        SELECT organization, designation, from_date, to_date, is_currently_working, key_achievements 
        FROM CANDIDATE_EXPERIENCE 
        WHERE candidate_id = ? 
        ORDER BY from_date DESC
      `, [cand.id]);

      // Education History
      const education = await db.query(`
        SELECT degree, institution, specialization, year 
        FROM CANDIDATE_EDUCATION 
        WHERE candidate_id = ? 
        ORDER BY year DESC
      `, [cand.id]);

      // Privacy protection
      const displayEmail = share.mask_contact_info ? maskEmail(cand.email) : cand.email;
      const displayPhone = share.mask_contact_info ? maskPhone(cand.phone) : cand.phone;

      return {
        id: cand.id,
        name: cand.name,
        professional_headline: cand.professional_headline,
        current_location: cand.current_location,
        preferred_location: cand.preferred_location,
        total_experience: cand.total_experience,
        current_organization: cand.current_organization,
        current_designation: cand.current_designation,
        professional_summary: cand.professional_summary,
        email: displayEmail,
        phone: displayPhone,
        is_contact_masked: Boolean(share.mask_contact_info),
        recruiter_notes: cand.recruiter_notes,
        notes: cand.recruiter_notes,
        has_resume: Boolean(cand.resume_id && share.allow_resume_download),
        resume_filename: share.allow_resume_download ? cand.resume_filename : null,
        skills: skills.map(s => s.name),
        experience: experience || [],
        education: education || []
      };
    }));

    // Audit Log: View Shortlist
    try {
      const clientIp = (req.ip || req.connection.remoteAddress || '').replace('::ffff:', '');
      const userAgent = req.get('user-agent') || '';
      await db.query(`
        INSERT INTO EXECUTIVE_SEARCH_SHARE_LOG (
          id, share_id, action, ip_address, user_agent
        ) VALUES (?, ?, 'VIEW_SHORTLIST', ?, ?)
      `, [uuidv4(), share.id, clientIp, userAgent.slice(0, 500)]);
    } catch (auditErr) {
      console.warn('Shortlist view log warning:', auditErr.message);
    }

    res.json({
      success: true,
      shortlist: {
        title: share.title,
        created_at: share.created_at,
        expires_at: share.expires_at,
        allow_resume_download: Boolean(share.allow_resume_download),
        candidate_count: candidates.length,
        job: {
          title: job.title,
          company_name: job.company_name,
          location: job.location,
          workplace_type: job.workplace_type,
          employment_type: job.employment_type,
          seniority_level: job.seniority_level,
          department: job.department,
          min_experience: job.min_experience,
          max_experience: job.max_experience,
          description: job.description,
          requirements: job.requirements
        },
        candidates
      },
      candidates
    });
  } catch (error) {
    console.error('getPublicExecutiveShortlist error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve candidate shortlist.', error: error.message });
  }
};

/**
 * 7. Public / Employer: Download Single Candidate Resume from Shortlist
 */
const downloadShortlistCandidateResume = async (req, res) => {
  try {
    const { token, candidateId } = req.params;

    if (!token || token.length < 32) {
      return res.status(400).json({ success: false, message: 'Invalid token.' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const shares = await db.query('SELECT * FROM EXECUTIVE_SEARCH_SHARE WHERE share_token_hash = ?', [tokenHash]);

    if (!shares || shares.length === 0) {
      return res.status(404).json({ success: false, message: 'Shortlist link not found.' });
    }

    const share = shares[0];
    if (share.status === 'REVOKED') {
      return res.status(410).json({ success: false, message: 'This shortlist link has been revoked.' });
    }
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return res.status(410).json({ success: false, message: 'This shortlist link has expired.' });
    }
    if (!share.allow_resume_download) {
      return res.status(403).json({ success: false, message: 'Resume downloads are disabled for this shortlist.' });
    }

    const authResult = await isShareAccessAuthorized(req, share);
    if (!authResult.authorized) {
      return res.status(401).json({ success: false, message: 'Identity verification required before downloading resume.' });
    }

    // Verify candidate is part of this explicit shortlist
    const items = await db.query(`
      SELECT candidate_id FROM EXECUTIVE_SEARCH_SHARE_CANDIDATE 
      WHERE share_id = ? AND candidate_id = ?
    `, [share.id, candidateId]);

    if (!items || items.length === 0) {
      return res.status(403).json({ success: false, message: 'Candidate is not part of this authorized shortlist.' });
    }

    const resumes = await db.query(`
      SELECT id, file_name, file_url, cloudinary_public_id 
      FROM CANDIDATE_RESUME 
      WHERE candidate_id = ? AND is_primary = 1 
      LIMIT 1
    `, [candidateId]);

    if (!resumes || resumes.length === 0) {
      return res.status(404).json({ success: false, message: 'Resume file is not available for this candidate.' });
    }

    const resume = resumes[0];

    // Log Download
    try {
      const clientIp = (req.ip || req.connection.remoteAddress || '').replace('::ffff:', '');
      const userAgent = req.get('user-agent') || '';
      await db.query(`
        INSERT INTO EXECUTIVE_SEARCH_SHARE_LOG (
          id, share_id, action, candidate_id, ip_address, user_agent
        ) VALUES (?, ?, 'DOWNLOAD_RESUME', ?, ?, ?)
      `, [uuidv4(), share.id, candidateId, clientIp, userAgent.slice(0, 500)]);
    } catch (_) {}

    // Generate signed download URL or stream
    if (resume.cloudinary_public_id) {
      const resourceType = resume.file_url?.includes('/raw/upload/') ? 'raw' : 'image';
      const deliveryType = resume.file_url?.includes('/authenticated/') ? 'authenticated' : 'upload';
      const signedUrl = generateSignedUrl(resume.cloudinary_public_id, {
        resource_type: resourceType,
        type: deliveryType,
        expires_in: 300
      });

      return res.json({
        success: true,
        download_url: signedUrl,
        file_name: resume.file_name || 'candidate_resume.pdf'
      });
    }

    if (resume.file_url && resume.file_url.startsWith('http')) {
      return res.json({
        success: true,
        download_url: resume.file_url,
        file_name: resume.file_name || 'candidate_resume.pdf'
      });
    }

    res.status(404).json({ success: false, message: 'Resume document could not be located.' });
  } catch (error) {
    console.error('downloadShortlistCandidateResume error:', error);
    res.status(500).json({ success: false, message: 'Failed to download candidate resume.', error: error.message });
  }
};

// Helper to fetch remote file buffer
function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchBuffer(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to fetch file: HTTP status ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// Standard CRC32 table & function for pure Node PKZIP generation
const makeCrcTable = () => {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    table[n] = c;
  }
  return table;
};
const crcTable = makeCrcTable();
const crc32 = (buf) => {
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
};

function createZipArchive(files) {
  const localFileHeaders = [];
  const centralDirectoryHeaders = [];
  let offset = 0;

  for (const file of files) {
    const filenameBuf = Buffer.from(file.name, 'utf8');
    const uncompressedData = file.data;
    const compressedData = zlib.deflateRawSync(uncompressedData);
    const crc = crc32(uncompressedData);

    const localHeader = Buffer.alloc(30 + filenameBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(8, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressedData.length, 18);
    localHeader.writeUInt32LE(uncompressedData.length, 22);
    localHeader.writeUInt16LE(filenameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);
    filenameBuf.copy(localHeader, 30);

    const centralHeader = Buffer.alloc(46 + filenameBuf.length);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressedData.length, 20);
    centralHeader.writeUInt32LE(uncompressedData.length, 24);
    centralHeader.writeUInt16LE(filenameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    filenameBuf.copy(centralHeader, 46);

    localFileHeaders.push(localHeader, compressedData);
    centralDirectoryHeaders.push(centralHeader);

    offset += localHeader.length + compressedData.length;
  }

  const centralDirSize = centralDirectoryHeaders.reduce((acc, h) => acc + h.length, 0);
  const centralDirOffset = offset;

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralDirSize, 12);
  eocd.writeUInt32LE(centralDirOffset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localFileHeaders, ...centralDirectoryHeaders, eocd]);
}

/**
 * 8. Public / Employer: Bulk Download All Approved Candidate Resumes as ZIP
 */
const downloadShortlistBulkResumes = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token || token.length < 32) {
      return res.status(400).json({ success: false, message: 'Invalid token.' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const shares = await db.query('SELECT * FROM EXECUTIVE_SEARCH_SHARE WHERE share_token_hash = ?', [tokenHash]);

    if (!shares || shares.length === 0) {
      return res.status(404).json({ success: false, message: 'Shortlist link not found.' });
    }

    const share = shares[0];
    if (share.status === 'REVOKED') {
      return res.status(410).json({ success: false, message: 'This shortlist link has been revoked.' });
    }
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return res.status(410).json({ success: false, message: 'This shortlist link has expired.' });
    }
    if (!share.allow_resume_download) {
      return res.status(403).json({ success: false, message: 'Resume downloads are disabled for this shortlist.' });
    }

    const authResult = await isShareAccessAuthorized(req, share);
    if (!authResult.authorized) {
      return res.status(401).json({ success: false, message: 'Identity verification required before exporting resumes.' });
    }

    // Fetch all candidates with primary resumes in this shortlist
    const items = await db.query(`
      SELECT 
        c.id as candidate_id, c.name as candidate_name,
        cr.file_name, cr.file_url, cr.cloudinary_public_id
      FROM EXECUTIVE_SEARCH_SHARE_CANDIDATE sc
      JOIN CANDIDATES c ON sc.candidate_id = c.id
      LEFT JOIN CANDIDATE_RESUME cr ON c.id = cr.candidate_id AND cr.is_primary = 1
      WHERE sc.share_id = ?
    `, [share.id]);

    const candidatesWithResumes = items.filter(item => item.file_url || item.cloudinary_public_id);
    if (candidatesWithResumes.length === 0) {
      return res.status(404).json({ success: false, message: 'No candidate resumes found for bulk export.' });
    }

    const zipFiles = [];
    for (let i = 0; i < candidatesWithResumes.length; i++) {
      const item = candidatesWithResumes[i];
      let fileUrl = item.file_url;

      if (item.cloudinary_public_id) {
        const resourceType = item.file_url?.includes('/raw/upload/') ? 'raw' : 'image';
        const deliveryType = item.file_url?.includes('/authenticated/') ? 'authenticated' : 'upload';
        fileUrl = generateSignedUrl(item.cloudinary_public_id, {
          resource_type: resourceType,
          type: deliveryType,
          expires_in: 300
        });
      }

      if (fileUrl && fileUrl.startsWith('http')) {
        try {
          const buffer = await fetchBuffer(fileUrl);
          const safeCandName = (item.candidate_name || `Candidate_${i + 1}`).replace(/[^a-zA-Z0-9_-]/g, '_');
          const ext = (item.file_name && item.file_name.includes('.')) ? item.file_name.split('.').pop() : 'pdf';
          const entryName = `${i + 1}_${safeCandName}_Resume.${ext}`;
          zipFiles.push({ name: entryName, data: buffer });
        } catch (fetchErr) {
          console.warn(`Could not fetch resume for ${item.candidate_name}:`, fetchErr.message);
        }
      }
    }

    if (zipFiles.length === 0) {
      for (let i = 0; i < candidatesWithResumes.length; i++) {
        const item = candidatesWithResumes[i];
        const safeCandName = (item.candidate_name || `Candidate_${i + 1}`).replace(/[^a-zA-Z0-9_-]/g, '_');
        const summaryText = `Candidate Profile: ${item.candidate_name || 'Candidate'}\nCandidate ID: ${item.candidate_id}\nOriginal File: ${item.file_name || 'Resume.pdf'}\nNote: Resume document reference stored in Vakancy ATS.`;
        zipFiles.push({
          name: `${i + 1}_${safeCandName}_Summary.txt`,
          data: Buffer.from(summaryText, 'utf-8')
        });
      }
    }

    const zipBuffer = createZipArchive(zipFiles);
    const safeTitle = (share.title || 'Shortlist').replace(/[^a-zA-Z0-9_-]/g, '_');
    const zipFilename = `${safeTitle}_Resumes.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
    res.setHeader('Content-Length', zipBuffer.length);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.send(zipBuffer);

    // Log Bulk Download
    try {
      const clientIp = (req.ip || req.connection.remoteAddress || '').replace('::ffff:', '');
      const userAgent = req.get('user-agent') || '';
      await db.query(`
        INSERT INTO EXECUTIVE_SEARCH_SHARE_LOG (
          id, share_id, action, ip_address, user_agent
        ) VALUES (?, ?, 'BULK_DOWNLOAD_RESUMES', ?, ?)
      `, [uuidv4(), share.id, clientIp, userAgent.slice(0, 500)]);
    } catch (_) {}
  } catch (error) {
    console.error('downloadShortlistBulkResumes error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to generate bulk resume ZIP export.', error: error.message });
    }
  }
};

/**
 * 9. Public / Employer: Request OTP for accessing a protected shortlist
 */
const requestShortlistVerificationOtp = async (req, res) => {
  try {
    const { token } = req.params;
    const { email } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid shortlist token.' });
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const shareRows = await db.query(`
      SELECT s.*, j.title as job_title, e.company_name 
      FROM EXECUTIVE_SEARCH_SHARE s 
      JOIN JOB j ON s.job_id = j.id 
      LEFT JOIN EMPLOYERS e ON j.employer_id = e.id 
      WHERE s.share_token_hash = ?
    `, [tokenHash]);

    if (!shareRows || shareRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Shortlist link not found.' });
    }

    const share = shareRows[0];
    if (share.status === 'REVOKED') {
      return res.status(410).json({ success: false, message: 'This shortlist link has been revoked.' });
    }
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return res.status(410).json({ success: false, message: 'This shortlist link has expired.' });
    }

    // Check if verification is required
    if (!share.require_verification) {
      return res.json({ success: true, message: 'No verification required for this shortlist.', requires_verification: false });
    }

    // Validate that cleanEmail matches recipient_email or one of additional_recipient_emails
    const authorizedEmails = [];
    if (share.recipient_email) {
      authorizedEmails.push(share.recipient_email.trim().toLowerCase());
    }
    if (share.additional_recipient_emails) {
      try {
        const parsed = typeof share.additional_recipient_emails === 'string'
          ? (share.additional_recipient_emails.startsWith('[') ? JSON.parse(share.additional_recipient_emails) : share.additional_recipient_emails.split(','))
          : share.additional_recipient_emails;
        if (Array.isArray(parsed)) {
          parsed.forEach(e => {
            if (e && typeof e === 'string') authorizedEmails.push(e.trim().toLowerCase());
          });
        }
      } catch (_) {}
    }

    // If employer account is linked, also allow employer official/contact email
    if (share.employer_id) {
      const empRows = await db.query('SELECT official_email, contact_email FROM EMPLOYERS WHERE id = ?', [share.employer_id]);
      if (empRows && empRows.length > 0) {
        if (empRows[0].official_email) authorizedEmails.push(empRows[0].official_email.trim().toLowerCase());
        if (empRows[0].contact_email) authorizedEmails.push(empRows[0].contact_email.trim().toLowerCase());
      }
    }

    if (authorizedEmails.length > 0 && !authorizedEmails.includes(cleanEmail)) {
      return res.status(403).json({
        success: false,
        message: 'This email is not authorized to access this shortlist. Please check with your team or contact Vakancy support.'
      });
    }

    // Rate-limiting check: limit OTP generation to 1 per 60 seconds per email/share
    const recentOtps = await db.query(`
      SELECT created_at FROM EXECUTIVE_SHARE_VERIFICATION 
      WHERE share_id = ? AND email = ? AND created_at > DATE_SUB(NOW(), INTERVAL 60 SECOND)
      ORDER BY created_at DESC LIMIT 1
    `, [share.id, cleanEmail]);

    if (recentOtps && recentOtps.length > 0) {
      return res.status(429).json({
        success: false,
        message: 'A verification code was recently sent. Please check your inbox or wait 60 seconds before requesting a new code.'
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await db.query(`
      INSERT INTO EXECUTIVE_SHARE_VERIFICATION 
      (id, share_id, email, otp_hash, is_verified, expires_at)
      VALUES (?, ?, ?, ?, 0, ?)
    `, [uuidv4(), share.id, cleanEmail, otpHash, expiresAt]);

    // Send email
    const emailRes = await sendOtpEmail(cleanEmail, {
      otp,
      jobTitle: share.job_title,
      companyName: share.company_name,
      expiresInMinutes: 15
    });

    res.json({
      success: true,
      message: 'A 6-digit verification code has been sent to your email address.',
      email_sent: Boolean(emailRes.success || emailRes.simulated)
    });
  } catch (err) {
    console.error('requestShortlistVerificationOtp error:', err);
    res.status(500).json({ success: false, message: 'Failed to send verification code. Please try again later.' });
  }
};

/**
 * 10. Public / Employer: Verify OTP and generate session verification token
 */
const verifyShortlistOtp = async (req, res) => {
  try {
    const { token } = req.params;
    const { email, otp } = req.body;

    if (!token || !email || !otp) {
      return res.status(400).json({ success: false, message: 'Token, email, and 6-digit code are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = String(otp).trim();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const shareRows = await db.query(
      'SELECT id, status, expires_at FROM EXECUTIVE_SEARCH_SHARE WHERE share_token_hash = ?',
      [tokenHash]
    );

    if (!shareRows || shareRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Shortlist link not found.' });
    }

    const share = shareRows[0];
    if (share.status === 'REVOKED') {
      return res.status(410).json({ success: false, message: 'This shortlist link has been revoked.' });
    }
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return res.status(410).json({ success: false, message: 'This shortlist link has expired.' });
    }

    const otpHash = crypto.createHash('sha256').update(cleanOtp).digest('hex');

    const verRows = await db.query(`
      SELECT id FROM EXECUTIVE_SHARE_VERIFICATION
      WHERE share_id = ? AND email = ? AND otp_hash = ? AND is_verified = 0 AND expires_at > NOW()
      ORDER BY created_at DESC LIMIT 1
    `, [share.id, cleanEmail, otpHash]);

    if (!verRows || verRows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification code. Please request a new code.' });
    }

    const verId = verRows[0].id;
    // Generate secure session verification token (32 bytes hex)
    const sessionVerifyToken = crypto.randomBytes(32).toString('hex');
    const sessionTokenHash = crypto.createHash('sha256').update(sessionVerifyToken).digest('hex');

    // Grant access matching the shortlist expiration (or 14 days default)
    const sessionExpiry = share.expires_at || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    await db.query(`
      UPDATE EXECUTIVE_SHARE_VERIFICATION
      SET is_verified = 1, verification_token = ?, expires_at = ?
      WHERE id = ?
    `, [sessionTokenHash, sessionExpiry, verId]);

    // Log verification action
    try {
      const clientIp = (req.ip || req.connection.remoteAddress || '').replace('::ffff:', '');
      const userAgent = req.get('user-agent') || '';
      await db.query(`
        INSERT INTO EXECUTIVE_SEARCH_SHARE_LOG (
          id, share_id, action, actor_email, ip_address, user_agent
        ) VALUES (?, ?, 'VERIFY_OTP_SUCCESS', ?, ?, ?)
      `, [uuidv4(), share.id, cleanEmail, clientIp, userAgent.slice(0, 500)]);
    } catch (_) {}

    res.json({
      success: true,
      message: 'Identity verified successfully. Candidate shortlist unlocked.',
      verification_token: sessionVerifyToken,
      verified_email: cleanEmail
    });
  } catch (err) {
    console.error('verifyShortlistOtp error:', err);
    res.status(500).json({ success: false, message: 'Failed to verify code. Please try again.' });
  }
};

module.exports = {
  getJobExecutiveCandidates,
  getJobExecutiveShares,
  createExecutiveShortlistShare,
  revokeExecutiveShortlistShare,
  getExecutiveShortlistActivity,
  getPublicExecutiveShortlist,
  downloadShortlistCandidateResume,
  downloadShortlistBulkResumes,
  addCandidateToShortlist,
  removeCandidateFromShortlist,
  searchCandidatePoolForJob,
  requestShortlistVerificationOtp,
  verifyShortlistOtp
};
