const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

// Helper to validate email format
const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

// Helper to sanitize text fields
const sanitizeText = (str) => {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/[<>]/g, '')
    .trim();
};

/**
 * createJobCallback
 * Allows candidates, visitors, or authenticated users to request an independent callback for a specific job
 * Prevents request manipulation by strictly validating job_id and company relationship
 */
const createJobCallback = async (req, res) => {
  try {
    const jobId = req.params.jobId || req.params.id;
    const pathCompanyId = req.params.companyId || null;
    const {
      companyId: bodyCompanyId,
      requester_name,
      requester_email,
      requester_phone,
      callback_reason,
      reason,
      preferred_time,
      notes
    } = req.body;

    if (!jobId || typeof jobId !== 'string') {
      return res.status(400).json({ success: false, message: 'Valid job ID is required.' });
    }

    // 1. Fetch Job and verify existence
    const jobs = await db.query(
      'SELECT id, employer_id, title, status, location FROM JOB WHERE id = ?',
      [jobId]
    );

    if (!jobs || jobs.length === 0) {
      return res.status(404).json({ success: false, message: 'Job not found.' });
    }

    const job = jobs[0];

    // 2. Validate Company association if companyId was provided in route or body
    const targetCompanyId = pathCompanyId || bodyCompanyId;
    if (targetCompanyId) {
      if (!job.employer_id || String(job.employer_id).toLowerCase() !== String(targetCompanyId).toLowerCase()) {
        return res.status(400).json({
          success: false,
          code: 'COMPANY_JOB_MISMATCH',
          message: 'The requested job does not belong to the specified company.'
        });
      }
    }

    // 3. Resolve Company profile
    let companyName = 'Company';
    if (job.employer_id) {
      const employers = await db.query(
        'SELECT id, company_name FROM EMPLOYERS WHERE id = ?',
        [job.employer_id]
      );
      if (employers.length > 0) {
        companyName = employers[0].company_name || 'Company';
      }
    }

    // 4. Resolve requester information (authenticated user fallback or explicit input)
    const userId = req.user?.id || null;
    const rawName = requester_name || req.user?.name || '';
    const rawEmail = requester_email || req.user?.email || '';
    const rawPhone = requester_phone || req.user?.phone || '';
    const rawReason = callback_reason || reason || notes || 'Inquiry regarding job opening requirements and application status';
    const rawTime = preferred_time || 'Anytime during business hours (10:00 AM - 6:00 PM)';

    const sanitizedName = sanitizeText(rawName);
    const sanitizedEmail = rawEmail.trim().toLowerCase();
    const sanitizedPhone = sanitizeText(rawPhone);
    const sanitizedReason = sanitizeText(rawReason);
    const sanitizedTime = sanitizeText(rawTime);

    if (!sanitizedName || sanitizedName.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid contact name (at least 2 characters).'
      });
    }

    if (!sanitizedEmail || !isValidEmail(sanitizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    if (!sanitizedPhone || sanitizedPhone.length < 7) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid phone number with country code (e.g. +91 9876543210).'
      });
    }

    // 5. Prevent duplicate rapid submissions for the same job and requester
    const duplicateClauses = ['job_id = ?', "status IN ('NEW', 'ASSIGNED', 'IN_PROGRESS')"];
    const duplicateParams = [job.id];

    if (userId) {
      duplicateClauses.push('(requested_by_user_id = ? OR requester_email = ?)');
      duplicateParams.push(userId, sanitizedEmail);
    } else {
      duplicateClauses.push('requester_email = ?');
      duplicateParams.push(sanitizedEmail);
    }

    const existingRows = await db.query(
      `SELECT * FROM CALLBACK_REQUEST WHERE ${duplicateClauses.join(' AND ')} ORDER BY created_at DESC LIMIT 1`,
      duplicateParams
    );

    if (existingRows && existingRows.length > 0) {
      const existing = existingRows[0];
      return res.status(200).json({
        success: true,
        already_requested: true,
        code: 'CALLBACK_PENDING',
        is_existing: true,
        status: existing.status,
        callback_id: existing.id,
        job_id: job.id,
        job_title: job.title,
        employer_id: job.employer_id,
        message: `A callback request is already active for "${job.title}" (Status: ${existing.status}). Our recruitment team will connect with you shortly.`
      });
    }

    // 6. Generate and save the new Job Callback Request
    const callbackId = uuidv4();
    const formattedInternalNotes = [
      `Source: Independent Company Job Profile Callback`,
      `Job: ${job.title} (${job.id})`,
      `Company: ${companyName}`,
      `Requester: ${sanitizedName} (${sanitizedEmail})`,
      `Phone: ${sanitizedPhone}`,
      `Preferred Time: ${sanitizedTime}`,
      `Reason: ${sanitizedReason}`
    ].join('\n');

    await db.withTransaction(async (tx) => {
      await tx.query(`
        INSERT INTO CALLBACK_REQUEST (
          id, job_id, employer_id, requested_by_user_id,
          requester_name, requester_email, requester_phone,
          callback_reason, preferred_time,
          status, source, internal_notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'NEW', 'COMPANY_JOB_CALLBACK', ?)
      `, [
        callbackId,
        job.id,
        job.employer_id || null,
        userId,
        sanitizedName,
        sanitizedEmail,
        sanitizedPhone,
        sanitizedReason,
        sanitizedTime,
        formattedInternalNotes
      ]);

      // Notify Directors & Staff in NOTIFICATION table
      const directors = await tx.query(
        "SELECT id FROM USERS WHERE role = 'director' OR is_main_admin = 1"
      );

      for (const dir of directors) {
        await tx.query(`
          INSERT INTO NOTIFICATION (id, user_id, type, title, message, reference_type, reference_id)
          VALUES (?, ?, 'callback_request', ?, ?, 'CALLBACK_REQUEST', ?)
        `, [
          uuidv4(),
          dir.id,
          `New Job Callback: ${job.title}`,
          `${sanitizedName} requested a callback for "${job.title}" at ${companyName}.`,
          callbackId
        ]);
      }

      // Log Recruitment Activity safely
      try {
        const actorId = userId || directors[0]?.id;
        if (actorId) {
          await tx.query(`
            INSERT INTO RECRUITMENT_ACTIVITY (id, performed_by, action_type, entity_type, entity_id, related_job_id, description)
            VALUES (?, ?, 'CREATE_CALLBACK_REQUEST', 'CALLBACK_REQUEST', ?, ?, ?)
          `, [
            uuidv4(),
            actorId,
            callbackId,
            job.id,
            `Callback requested for job "${job.title}" by ${sanitizedName} (${sanitizedEmail})`
          ]);
        }
      } catch (actErr) {
        console.warn('Could not log recruitment activity for callback:', actErr.message);
      }
    });

    return res.status(201).json({
      success: true,
      message: `Callback request registered successfully for "${job.title}". Our recruitment team will contact you shortly.`,
      callback_id: callbackId,
      job_id: job.id,
      job_title: job.title,
      employer_id: job.employer_id,
      company_name: companyName,
      status: 'NEW'
    });
  } catch (error) {
    console.error('createJobCallback error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit callback request.',
      error: error.message
    });
  }
};

/**
 * getCompanyJobCallbackStats
 * Aggregates independent callback counts per job for a given company
 * Efficient single query with GROUP BY
 */
const getCompanyJobCallbackStats = async (req, res) => {
  try {
    const { companyId } = req.params;

    if (!companyId) {
      return res.status(400).json({ success: false, message: 'Company ID is required.' });
    }

    // Verify company exists
    const employers = await db.query('SELECT id, company_name FROM EMPLOYERS WHERE id = ?', [companyId]);
    if (!employers || employers.length === 0) {
      return res.status(404).json({ success: false, message: 'Company not found.' });
    }

    const company = employers[0];

    // Query jobs with aggregated callback counts
    const jobStats = await db.query(`
      SELECT 
        j.id as job_id,
        j.title as job_title,
        j.status as job_status,
        COUNT(cr.id) as callback_count,
        SUM(CASE WHEN cr.status IN ('NEW', 'ASSIGNED', 'IN_PROGRESS', 'New', 'Assigned', 'In Progress') THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN cr.status IN ('RESOLVED', 'Resolved') THEN 1 ELSE 0 END) as resolved_count
      FROM JOB j
      LEFT JOIN CALLBACK_REQUEST cr ON j.id = cr.job_id
      WHERE j.employer_id = ?
      GROUP BY j.id, j.title, j.status
      ORDER BY callback_count DESC, j.created_at DESC
    `, [companyId]);

    // Calculate company-wide totals
    let totalCallbacks = 0;
    let totalPending = 0;
    let totalResolved = 0;

    const formattedJobs = jobStats.map(row => {
      const count = Number(row.callback_count || 0);
      const pending = Number(row.pending_count || 0);
      const resolved = Number(row.resolved_count || 0);
      totalCallbacks += count;
      totalPending += pending;
      totalResolved += resolved;

      return {
        job_id: row.job_id,
        job_title: row.job_title,
        job_status: row.job_status,
        callback_count: count,
        pending_count: pending,
        resolved_count: resolved
      };
    });

    return res.json({
      success: true,
      company_id: company.id,
      company_name: company.company_name,
      total_callbacks: totalCallbacks,
      total_pending: totalPending,
      total_resolved: totalResolved,
      jobs: formattedJobs
    });
  } catch (error) {
    console.error('getCompanyJobCallbackStats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve company job callback stats.',
      error: error.message
    });
  }
};

module.exports = {
  createJobCallback,
  getCompanyJobCallbackStats
};
