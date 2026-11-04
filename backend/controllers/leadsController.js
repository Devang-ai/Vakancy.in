/**
 * Vakancy.in — Leads Controller (BD -> Recruiter Workflow)
 * Handles company lead lifecycle, atomic ownership claiming, status tracking,
 * Director reassignment, duplicate warnings, and lead-to-job conversion.
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { normalizeCompanyName, normalizeDomain } = require('../utils/companyNormalization');

// Helper to log recruitment activity with field-level audit trail
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
    console.warn('Failed to log recruitment activity in leadsController:', err.message);
  }
};

/**
 * 1. Check for Duplicate Company Leads, Active Clients, or Registered Employers
 * GET /api/admin/leads/check-duplicate?name=...&website=...&email=...
 */
const checkDuplicateCompanyLead = async (req, res) => {
  try {
    const companyName = req.query.name || req.query.company_name || '';
    const website = req.query.website || '';
    const email = req.query.email || '';

    const normName = normalizeCompanyName(companyName);
    const normDomain = normalizeDomain(website) || normalizeDomain(email);

    if (!normName && !normDomain) {
      return res.json({ success: true, hasDuplicate: false, matches: [] });
    }

    const matches = [];

    // 1. Check COMPANY_LEAD table
    const leadQueryParams = [];
    let leadWhereClauses = [];

    if (normName) {
      leadWhereClauses.push('(cl.normalized_company_name = ? OR cl.normalized_company_name LIKE ?)');
      leadQueryParams.push(normName, `%${normName}%`);
    }
    if (normDomain) {
      leadWhereClauses.push('cl.normalized_domain = ?');
      leadQueryParams.push(normDomain);
    }

    const leadSql = `
      SELECT 
        cl.id,
        cl.company_name,
        cl.status,
        cl.claimed_by_recruiter_id,
        cl.created_at,
        u_rec.name as recruiter_name,
        u_rec.email as recruiter_email,
        'COMPANY_LEAD' as source
      FROM COMPANY_LEAD cl
      LEFT JOIN USERS u_rec ON cl.claimed_by_recruiter_id = u_rec.id
      WHERE cl.status != 'DROPPED' AND (${leadWhereClauses.join(' OR ')})
      LIMIT 5
    `;
    const leadRows = await db.query(leadSql, leadQueryParams);
    for (const r of leadRows || []) {
      matches.push({
        source: 'COMPANY_LEAD',
        id: r.id,
        name: r.company_name,
        status: r.status,
        recruiter_id: r.claimed_by_recruiter_id,
        recruiter_name: r.recruiter_name || r.recruiter_email || null,
        created_at: r.created_at,
        message: r.claimed_by_recruiter_id
          ? `Active lead claimed by ${r.recruiter_name || 'a recruiter'} (${r.status})`
          : `Unclaimed lead already in queue (${r.status})`
      });
    }

    // 2. Check active CLIENT table
    if (normName) {
      const clientRows = await db.query(
        'SELECT id, name, industry FROM CLIENT WHERE LOWER(name) LIKE ? LIMIT 5',
        [`%${normName}%`]
      );
      for (const c of clientRows || []) {
        matches.push({
          source: 'CLIENT',
          id: c.id,
          name: c.name,
          status: 'ACTIVE_CLIENT',
          message: `Already registered as active Client (#${c.id.substring(0, 8)})`
        });
      }
    }

    // 3. Check registered EMPLOYERS table
    if (normName) {
      const empRows = await db.query(
        'SELECT id, company_name, approval_status FROM EMPLOYERS WHERE LOWER(company_name) LIKE ? LIMIT 5',
        [`%${normName}%`]
      );
      for (const e of empRows || []) {
        matches.push({
          source: 'EMPLOYER',
          id: e.id,
          name: e.company_name,
          status: e.approval_status,
          message: `Self-registered employer portal account (${e.approval_status})`
        });
      }
    }

    res.json({
      success: true,
      hasDuplicate: matches.length > 0,
      matches,
      warning: matches.length > 0 ? 'Potential duplicate company or active client detected.' : null
    });
  } catch (error) {
    console.error('checkDuplicateCompanyLead error:', error);
    res.status(500).json({ success: false, message: 'Error checking duplicate company.', error: error.message });
  }
};

/**
 * 2. BD Submits Confirmed Prospective Company Lead
 * POST /api/admin/leads
 */
const createCompanyLead = async (req, res) => {
  try {
    const {
      company_name,
      contact_person_name,
      contact_person,
      contact_phone,
      phone,
      contact_email,
      email,
      city,
      location,
      website,
      notes,
      confirmed_hiring_interest
    } = req.body;

    const finalCompanyName = (company_name || '').trim();
    const finalContactPerson = (contact_person_name || contact_person || '').trim();
    const finalPhone = (contact_phone || phone || '').trim();
    const finalEmail = (contact_email || email || '').trim().toLowerCase() || null;
    const finalCity = (city || location || '').trim() || null;
    const finalWebsite = (website || '').trim() || null;
    const finalNotes = (notes || '').trim() || null;

    if (!finalCompanyName) {
      return res.status(400).json({
        success: false,
        message: 'Company name is required.'
      });
    }
    if (!finalContactPerson) {
      return res.status(400).json({
        success: false,
        message: 'Contact person name is required.'
      });
    }
    if (!finalPhone) {
      return res.status(400).json({
        success: false,
        message: 'Contact phone is required.'
      });
    }

    // Explicit confirmation of hiring interest is mandatory
    if (
      confirmed_hiring_interest === undefined ||
      confirmed_hiring_interest === null ||
      confirmed_hiring_interest === false ||
      confirmed_hiring_interest === 0 ||
      confirmed_hiring_interest === 'false' ||
      confirmed_hiring_interest === '0'
    ) {
      return res.status(400).json({
        success: false,
        code: 'CONFIRMED_INTEREST_REQUIRED',
        message: 'BD may only submit companies that have confirmed interest in sharing hiring requirements.'
      });
    }

    const normName = normalizeCompanyName(finalCompanyName);
    const normDomain = normalizeDomain(finalWebsite) || normalizeDomain(finalEmail);
    const id = uuidv4();

    await db.query(`
      INSERT INTO COMPANY_LEAD (
        id, bd_user_id, company_name, normalized_company_name,
        contact_person_name, contact_phone, contact_email,
        city, website, normalized_domain, notes,
        confirmed_hiring_interest, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'UNCLAIMED')
    `, [
      id, req.user.id, finalCompanyName, normName,
      finalContactPerson, finalPhone, finalEmail,
      finalCity, finalWebsite, normDomain, finalNotes
    ]);

    await logActivity({
      performed_by: req.user.id,
      action_type: 'CREATE_LEAD',
      entity_type: 'COMPANY_LEAD',
      entity_id: id,
      description: `Created new BD company lead: ${finalCompanyName} (${finalContactPerson})`,
      new_value: 'UNCLAIMED'
    });

    res.status(201).json({
      success: true,
      message: 'Company lead submitted successfully and placed in shared recruiter queue.',
      lead: {
        id,
        company_name: finalCompanyName,
        contact_person_name: finalContactPerson,
        contact_phone: finalPhone,
        contact_email: finalEmail,
        city: finalCity,
        website: finalWebsite,
        status: 'UNCLAIMED',
        confirmed_hiring_interest: 1,
        bd_user_id: req.user.id
      }
    });
  } catch (error) {
    console.error('createCompanyLead error:', error);
    res.status(500).json({ success: false, message: 'Error creating company lead.', error: error.message });
  }
};

/**
 * 3. List Company Leads / Queue (Tailored by Role)
 * GET /api/admin/leads and GET /api/admin/leads/queue
 */
const getCompanyLeadsQueue = async (req, res) => {
  try {
    const userRole = (req.user?.role || '').toLowerCase();
    const userId = req.user?.id;
    const isDirector = userRole === 'director' || userRole === 'main_admin' || req.user?.is_main_admin === 1;

    const { queue, status, search, bd_user_id, recruiter_id } = req.query;

    let whereClauses = [];
    let queryParams = [];

    // Role-based record scoping
    if (userRole === 'bd' || userRole === 'bd_lead') {
      // BD views own leads only
      whereClauses.push('cl.bd_user_id = ?');
      queryParams.push(userId);
    } else if (userRole === 'recruiter') {
      if (queue === 'unclaimed') {
        // Shared unclaimed recruiter queue
        whereClauses.push("cl.status = 'UNCLAIMED' AND cl.claimed_by_recruiter_id IS NULL");
      } else if (queue === 'claimed' || queue === 'my') {
        // Recruiter's claimed leads
        whereClauses.push('cl.claimed_by_recruiter_id = ?');
        queryParams.push(userId);
      } else {
        // Default recruiter view: unclaimed leads OR own claimed leads
        whereClauses.push("(cl.status = 'UNCLAIMED' OR cl.claimed_by_recruiter_id = ?)");
        queryParams.push(userId);
      }
    } else if (isDirector) {
      // Director global oversight with optional filters
      if (queue === 'unclaimed') {
        whereClauses.push("cl.status = 'UNCLAIMED' AND cl.claimed_by_recruiter_id IS NULL");
      } else if (queue === 'claimed') {
        whereClauses.push('cl.claimed_by_recruiter_id IS NOT NULL');
      }
      if (bd_user_id) {
        whereClauses.push('cl.bd_user_id = ?');
        queryParams.push(bd_user_id);
      }
      if (recruiter_id) {
        whereClauses.push('cl.claimed_by_recruiter_id = ?');
        queryParams.push(recruiter_id);
      }
    }

    // Optional status filter
    if (status && status !== 'all') {
      whereClauses.push('cl.status = ?');
      queryParams.push(status);
    }

    // Search filter across company, contact, phone, city
    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      whereClauses.push(`(
        LOWER(cl.company_name) LIKE ? OR 
        LOWER(cl.contact_person_name) LIKE ? OR 
        LOWER(COALESCE(cl.contact_email, '')) LIKE ? OR 
        cl.contact_phone LIKE ? OR
        LOWER(COALESCE(cl.city, '')) LIKE ?
      )`);
      queryParams.push(term, term, term, term, term);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const leads = await db.query(`
      SELECT 
        cl.*,
        u_bd.name as bd_user_name,
        u_bd.email as bd_user_email,
        u_rec.name as claimed_recruiter_name,
        u_rec.email as claimed_recruiter_email,
        u_dir.name as reassigned_director_name,
        c.name as client_name,
        (SELECT COUNT(*) FROM JOB WHERE lead_id = cl.id) as jobs_count
      FROM COMPANY_LEAD cl
      LEFT JOIN USERS u_bd ON cl.bd_user_id = u_bd.id
      LEFT JOIN USERS u_rec ON cl.claimed_by_recruiter_id = u_rec.id
      LEFT JOIN USERS u_dir ON cl.reassigned_by_director_id = u_dir.id
      LEFT JOIN CLIENT c ON cl.client_id = c.id
      ${whereSql}
      ORDER BY cl.created_at DESC
    `, queryParams);

    res.json({
      success: true,
      count: leads.length,
      leads: leads || []
    });
  } catch (error) {
    console.error('getCompanyLeadsQueue error:', error);
    res.status(500).json({ success: false, message: 'Error fetching leads queue.', error: error.message });
  }
};

/**
 * 4. Get Company Lead Details with Linked Jobs & Activity Trail
 * GET /api/admin/leads/:id
 */
const getCompanyLeadDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = (req.user?.role || '').toLowerCase();
    const userId = req.user?.id;
    const isDirector = userRole === 'director' || userRole === 'main_admin' || req.user?.is_main_admin === 1;

    const rows = await db.query(`
      SELECT 
        cl.*,
        u_bd.name as bd_user_name,
        u_bd.email as bd_user_email,
        u_rec.name as claimed_recruiter_name,
        u_rec.email as claimed_recruiter_email,
        u_dir.name as reassigned_director_name,
        c.name as client_name,
        c.industry as client_industry
      FROM COMPANY_LEAD cl
      LEFT JOIN USERS u_bd ON cl.bd_user_id = u_bd.id
      LEFT JOIN USERS u_rec ON cl.claimed_by_recruiter_id = u_rec.id
      LEFT JOIN USERS u_dir ON cl.reassigned_by_director_id = u_dir.id
      LEFT JOIN CLIENT c ON cl.client_id = c.id
      WHERE cl.id = ?
      LIMIT 1
    `, [id]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Company lead not found.' });
    }

    const lead = rows[0];

    // Access control: BD only views own leads; recruiter only unclaimed or own
    if (!isDirector) {
      if ((userRole === 'bd' || userRole === 'bd_lead') && lead.bd_user_id !== userId) {
        return res.status(403).json({
          success: false,
          code: 'LEAD_ACCESS_DENIED',
          message: 'You can only view leads that you submitted.'
        });
      }
      if (userRole === 'recruiter' && lead.status !== 'UNCLAIMED' && lead.claimed_by_recruiter_id !== userId) {
        return res.status(403).json({
          success: false,
          code: 'LEAD_ACCESS_DENIED',
          message: 'This lead has been claimed by another recruiter.'
        });
      }
    }

    // Fetch linked jobs
    const jobs = await db.query(`
      SELECT id, title, status, openings_count, location, employment_type, created_at
      FROM JOB
      WHERE lead_id = ?
      ORDER BY created_at DESC
    `, [id]);

    // Fetch recruitment activity audit history
    const activity = await db.query(`
      SELECT 
        ra.id, ra.action_type, ra.description, ra.changed_field,
        ra.previous_value, ra.new_value, ra.created_at,
        u.name as actor_name, u.email as actor_email, u.role as actor_role
      FROM RECRUITMENT_ACTIVITY ra
      LEFT JOIN USERS u ON ra.performed_by = u.id
      WHERE (ra.entity_type = 'COMPANY_LEAD' AND ra.entity_id = ?)
      ORDER BY ra.created_at DESC
    `, [id]);

    res.json({
      success: true,
      lead: {
        ...lead,
        jobs: jobs || [],
        activity_history: activity || []
      }
    });
  } catch (error) {
    console.error('getCompanyLeadDetails error:', error);
    res.status(500).json({ success: false, message: 'Error fetching lead details.', error: error.message });
  }
};

/**
 * 5. Atomically Claim Lead ("Take Lead")
 * POST /api/admin/leads/:id/claim
 */
const claimCompanyLead = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = (req.user?.role || '').toLowerCase();
    const userId = req.user?.id;

    // BD cannot claim leads
    if (userRole === 'bd' || userRole === 'bd_lead') {
      return res.status(403).json({
        success: false,
        code: 'BD_CANNOT_CLAIM_LEADS',
        message: 'BD team members are not permitted to claim recruiter leads.'
      });
    }

    const claimResult = await db.withTransaction(async (tx) => {
      // Atomic conditional update
      const updateResult = await tx.query(`
        UPDATE COMPANY_LEAD
        SET claimed_by_recruiter_id = ?,
            claimed_at = CURRENT_TIMESTAMP,
            status = 'CLAIMED'
        WHERE id = ?
          AND status = 'UNCLAIMED'
          AND claimed_by_recruiter_id IS NULL
      `, [userId, id]);

      if (updateResult.affectedRows === 0) {
        // Inspect row state
        const rows = await tx.query('SELECT id, company_name, status, claimed_by_recruiter_id FROM COMPANY_LEAD WHERE id = ?', [id]);
        if (!rows || rows.length === 0) {
          const err = new Error('Company lead not found.');
          err.statusCode = 404;
          throw err;
        }
        const existing = rows[0];
        const err = new Error(
          existing.claimed_by_recruiter_id === userId
            ? 'You have already claimed this lead.'
            : `Lead '${existing.company_name}' has already been claimed by another recruiter.`
        );
        err.statusCode = 409;
        err.code = 'LEAD_ALREADY_CLAIMED';
        throw err;
      }

      // Fetch company name for audit description
      const [leadRow] = await tx.query('SELECT company_name FROM COMPANY_LEAD WHERE id = ?', [id]);
      const companyName = leadRow ? leadRow.company_name : 'lead';

      // Record audit history within the SAME transaction
      await logActivity({
        performed_by: userId,
        action_type: 'TAKE_LEAD',
        entity_type: 'COMPANY_LEAD',
        entity_id: id,
        description: `Recruiter claimed ownership of lead: ${companyName}`,
        changed_field: 'claimed_by_recruiter_id',
        previous_value: null,
        new_value: userId
      }, tx);

      return { lead_id: id, company_name: companyName };
    });

    res.json({
      success: true,
      message: 'Lead claimed successfully! You are now the assigned recruiter.',
      data: claimResult
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    if (statusCode === 409) {
      return res.status(409).json({
        success: false,
        code: error.code || 'LEAD_ALREADY_CLAIMED',
        message: error.message
      });
    }
    if (statusCode === 404) {
      return res.status(404).json({ success: false, message: error.message });
    }
    console.error('claimCompanyLead error:', error);
    res.status(500).json({ success: false, message: 'Error claiming lead.', error: error.message });
  }
};

/**
 * 6. Update Follow-up Status of Owned Lead
 * PUT /api/admin/leads/:id/status
 */
const updateCompanyLeadStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = (req.user?.role || '').toLowerCase();
    const userId = req.user?.id;
    const isDirector = userRole === 'director' || userRole === 'main_admin' || req.user?.is_main_admin === 1;

    const { status, notes, drop_reason } = req.body;

    const [lead] = await db.query('SELECT * FROM COMPANY_LEAD WHERE id = ?', [id]);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Company lead not found.' });
    }

    // Recruiter can only modify their own claimed lead
    if (!isDirector) {
      if (lead.claimed_by_recruiter_id !== userId) {
        return res.status(403).json({
          success: false,
          code: 'NOT_LEAD_OWNER',
          message: 'You cannot modify or update a lead claimed by another recruiter.'
        });
      }
    }

    const ALLOWED_STATUSES = ['CLAIMED', 'CONTACTED', 'REQUIREMENTS_GATHERED', 'CONVERTED_TO_JOB', 'DROPPED'];
    if (status && !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status '${status}'. Allowed statuses: ${ALLOWED_STATUSES.join(', ')}.`
      });
    }

    if (status === 'DROPPED' && !drop_reason && !lead.drop_reason) {
      return res.status(400).json({
        success: false,
        message: 'A drop reason is required when marking a lead as DROPPED.'
      });
    }

    const newStatus = status || lead.status;
    const newNotes = notes !== undefined ? notes : lead.notes;
    const newDropReason = drop_reason !== undefined ? drop_reason : lead.drop_reason;

    await db.withTransaction(async (tx) => {
      await tx.query(`
        UPDATE COMPANY_LEAD
        SET status = ?,
            notes = ?,
            drop_reason = ?
        WHERE id = ?
      `, [newStatus, newNotes, newDropReason, id]);

      await logActivity({
        performed_by: userId,
        action_type: 'UPDATE_LEAD_STATUS',
        entity_type: 'COMPANY_LEAD',
        entity_id: id,
        description: `Updated follow-up status of ${lead.company_name} to "${newStatus}"`,
        changed_field: 'status',
        previous_value: lead.status,
        new_value: newStatus
      }, tx);
    });

    res.json({
      success: true,
      message: 'Lead follow-up status updated successfully.',
      lead: { id, status: newStatus, notes: newNotes, drop_reason: newDropReason }
    });
  } catch (error) {
    console.error('updateCompanyLeadStatus error:', error);
    res.status(500).json({ success: false, message: 'Error updating lead status.', error: error.message });
  }
};

/**
 * 7. Director-Only Lead Reassignment
 * POST /api/admin/leads/:id/reassign
 */
const reassignCompanyLead = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = (req.user?.role || '').toLowerCase();
    const userId = req.user?.id;
    const isDirector = userRole === 'director' || userRole === 'main_admin' || req.user?.is_main_admin === 1;

    // Director authority check
    if (!isDirector) {
      return res.status(403).json({
        success: false,
        code: 'DIRECTOR_AUTHORITY_REQUIRED',
        message: 'Only Directors have authority to reassign lead ownership.'
      });
    }

    const { new_recruiter_id, notes } = req.body;
    if (!new_recruiter_id) {
      return res.status(400).json({ success: false, message: 'new_recruiter_id is required for reassignment.' });
    }

    // Verify target recruiter exists and is active
    const targetUsers = await db.query(
      'SELECT id, name, email, role, is_active FROM USERS WHERE id = ?',
      [new_recruiter_id]
    );
    if (!targetUsers || targetUsers.length === 0) {
      return res.status(400).json({ success: false, message: 'Target recruiter user does not exist.' });
    }
    const target = targetUsers[0];
    if (target.is_active !== 1) {
      return res.status(400).json({ success: false, message: 'Target recruiter account is inactive or disabled.' });
    }

    const [lead] = await db.query('SELECT * FROM COMPANY_LEAD WHERE id = ?', [id]);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Company lead not found.' });
    }

    const prevRecruiter = lead.claimed_by_recruiter_id;

    await db.withTransaction(async (tx) => {
      await tx.query(`
        UPDATE COMPANY_LEAD
        SET claimed_by_recruiter_id = ?,
            reassigned_by_director_id = ?,
            reassigned_at = CURRENT_TIMESTAMP,
            status = CASE WHEN status = 'UNCLAIMED' THEN 'CLAIMED' ELSE status END,
            notes = COALESCE(?, notes)
        WHERE id = ?
      `, [new_recruiter_id, userId, notes || null, id]);

      await logActivity({
        performed_by: userId,
        action_type: 'REASSIGN_LEAD',
        entity_type: 'COMPANY_LEAD',
        entity_id: id,
        description: `Director reassigned lead '${lead.company_name}' to ${target.name || target.email}`,
        changed_field: 'claimed_by_recruiter_id',
        previous_value: prevRecruiter,
        new_value: new_recruiter_id
      }, tx);
    });

    res.json({
      success: true,
      message: `Lead successfully reassigned to ${target.name || target.email}.`,
      lead_id: id,
      new_recruiter_id,
      reassigned_by: userId
    });
  } catch (error) {
    console.error('reassignCompanyLead error:', error);
    res.status(500).json({ success: false, message: 'Error reassigning lead.', error: error.message });
  }
};

/**
 * 8. Convert Lead to Client & Job Mandate (Supports Multiple Jobs Per Lead)
 * POST /api/admin/leads/:id/convert-job
 */
const convertCompanyLeadToJob = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = (req.user?.role || '').toLowerCase();
    const userId = req.user?.id;
    const isDirector = userRole === 'director' || userRole === 'main_admin' || req.user?.is_main_admin === 1;

    const [lead] = await db.query('SELECT * FROM COMPANY_LEAD WHERE id = ?', [id]);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Company lead not found.' });
    }

    // Ownership check: must be claimed by current recruiter or Director
    if (!isDirector && lead.claimed_by_recruiter_id !== userId) {
      return res.status(403).json({
        success: false,
        code: 'NOT_LEAD_OWNER',
        message: 'You cannot convert or create jobs for a lead owned by another recruiter.'
      });
    }

    const {
      title,
      job_title,
      category_id,
      department,
      job_domain,
      seniority_level,
      openings_count,
      location,
      country,
      state,
      city,
      locality,
      min_experience,
      max_experience,
      fresher_allowed,
      min_qualification,
      degree,
      specialization,
      required_skills,
      keywords,
      notice_period,
      min_salary,
      max_salary,
      currency,
      salary_period,
      salary_type,
      benefits,
      application_deadline,
      description,
      job_description,
      responsibilities,
      requirements,
      employment_type,
      workplace_type,
      status: reqStatus,
      is_recommended,
      allow_candidate_access,
      assigned_recruiter_id: reqRecruiterId,
      internal_notes,
      client_id: reqClientId
    } = req.body;

    const finalTitle = (title || job_title || '').trim();
    if (!finalTitle) {
      return res.status(400).json({ success: false, message: 'Job title is required to create a job mandate.' });
    }

    const cleanLocation = location && location.trim() ? location.trim() : [city, state, country, lead.city].filter(Boolean).join(', ') || 'Remote';
    const skillsString = Array.isArray(required_skills) ? JSON.stringify(required_skills) : (required_skills || null);
    const keywordsString = Array.isArray(keywords) ? JSON.stringify(keywords) : (keywords || null);
    const benefitsString = Array.isArray(benefits) ? JSON.stringify(benefits) : (benefits || null);
    const respString = Array.isArray(responsibilities) ? JSON.stringify(responsibilities) : (responsibilities || '');
    const reqString = Array.isArray(requirements) ? JSON.stringify(requirements) : (requirements || '');

    const result = await db.withTransaction(async (tx) => {
      // 1. Resolve or create CLIENT linkage
      let clientId = reqClientId || lead.client_id;
      if (!clientId) {
        clientId = uuidv4();
        await tx.query(`
          INSERT INTO CLIENT (id, name, industry, contact_info)
          VALUES (?, ?, ?, ?)
        `, [
          clientId,
          lead.company_name,
          department || 'General',
          JSON.stringify({
            contact_person: lead.contact_person_name,
            phone: lead.contact_phone,
            email: lead.contact_email,
            city: lead.city,
            website: lead.website
          })
        ]);

        await tx.query(`
          UPDATE COMPANY_LEAD
          SET client_id = ?
          WHERE id = ?
        `, [clientId, id]);
      }

      // 2. Create the JOB record linked to lead_id and client_id
      const jobId = uuidv4();
      const targetStatus = ['open', 'draft', 'closed'].includes(reqStatus) ? reqStatus : 'open';
      const isRec = is_recommended ? 1 : 0;
      const candAccess = allow_candidate_access !== undefined ? (allow_candidate_access ? 1 : 0) : 1;
      const assignedRecruiter = reqRecruiterId || lead.claimed_by_recruiter_id || userId;

      await tx.query(`
        INSERT INTO JOB (
          id, client_id, lead_id, category_id, title, department, job_domain,
          employment_type, workplace_type, seniority_level, location, country, state, city, locality,
          min_experience, max_experience, fresher_allowed, min_qualification, degree, specialization,
          required_skills, keywords, notice_period,
          min_salary, max_salary, currency, salary_period, salary_type, benefits, application_deadline,
          description, responsibilities, requirements, openings_count,
          status, is_internal_only, is_recommended, allow_candidate_access, assigned_recruiter_id, internal_notes,
          manual_company_name, manual_contact_person, manual_contact_phone, manual_contact_email, manual_company_website,
          created_by_user_id, last_updated_by_user_id, created_by_type, source_type
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, 0, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, 'ADMIN', 'BD_LEAD'
        )
      `, [
        jobId,
        clientId,
        id,
        category_id || null,
        finalTitle,
        department || 'General',
        job_domain || 'General',
        employment_type || 'Full-Time',
        workplace_type || 'On-Site',
        seniority_level || 'Mid Level',
        cleanLocation,
        country || 'India',
        state || null,
        city || lead.city || null,
        locality || null,
        parseFloat(min_experience) || 0,
        parseFloat(max_experience) || 0,
        fresher_allowed ? 1 : 0,
        min_qualification || null,
        degree || null,
        specialization || null,
        skillsString,
        keywordsString,
        notice_period || null,
        min_salary ? parseFloat(min_salary) : null,
        max_salary ? parseFloat(max_salary) : null,
        currency || 'INR',
        salary_period || 'Per Year',
        salary_type || 'CTC',
        benefitsString,
        application_deadline || null,
        description || job_description || `Mandate created from BD Company Lead: ${lead.company_name}`,
        respString,
        reqString,
        parseInt(openings_count, 10) || 1,
        targetStatus,
        isRec,
        candAccess,
        assignedRecruiter,
        internal_notes || null,
        lead.company_name,
        lead.contact_person_name,
        lead.contact_phone,
        lead.contact_email,
        lead.website,
        userId,
        userId
      ]);

      // 3. Update lead status to CONVERTED_TO_JOB
      await tx.query(`
        UPDATE COMPANY_LEAD
        SET status = 'CONVERTED_TO_JOB'
        WHERE id = ?
      `, [id]);

      // 4. Record audit log within transaction
      await logActivity({
        performed_by: userId,
        action_type: 'CONVERT_LEAD_TO_JOB',
        entity_type: 'COMPANY_LEAD',
        entity_id: id,
        related_job_id: jobId,
        description: `Created job mandate "${finalTitle}" linked to lead '${lead.company_name}'`,
        changed_field: 'status',
        previous_value: lead.status,
        new_value: 'CONVERTED_TO_JOB'
      }, tx);

      return {
        job_id: jobId,
        client_id: clientId,
        lead_id: id,
        title: finalTitle
      };
    });

    res.status(201).json({
      success: true,
      message: 'Job mandate created successfully and linked to company lead.',
      data: result
    });
  } catch (error) {
    console.error('convertCompanyLeadToJob error:', error);
    res.status(500).json({ success: false, message: 'Error converting lead to job.', error: error.message });
  }
};

module.exports = {
  checkDuplicateCompanyLead,
  createCompanyLead,
  getCompanyLeadsQueue,
  getCompanyLeadDetails,
  claimCompanyLead,
  updateCompanyLeadStatus,
  reassignCompanyLead,
  convertCompanyLeadToJob
};
