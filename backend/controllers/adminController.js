const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { getUserScope } = require('../middleware/rbacMiddleware');
const { uploadBufferToCloudinary } = require('../services/cloudinaryService');

// Helper to log recruitment activity
const logActivity = async ({ performed_by, action_type, entity_type, entity_id, related_job_id, related_application_id, related_enquiry_id, description }) => {
  try {
    const id = uuidv4();
    await db.query(
      `INSERT INTO RECRUITMENT_ACTIVITY 
      (id, performed_by, action_type, entity_type, entity_id, related_job_id, related_application_id, related_enquiry_id, description) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        performed_by,
        action_type,
        entity_type || null,
        entity_id || null,
        related_job_id || null,
        related_application_id || null,
        related_enquiry_id || null,
        description
      ]
    );
  } catch (err) {
    console.warn('Failed to log recruitment activity:', err.message);
  }
};

// 1. Overall Admin Stats & Dashboard Overview (Real DB metrics only)
const getAdminStats = async (req, res) => {
  try {
    const userRole = (req.user?.role || '').toLowerCase();
    const userId = req.user?.id;
    const scope = await getUserScope(userId, userRole);

    // Live counts from MySQL
    const [candRow] = await db.query('SELECT COUNT(*) as total FROM CANDIDATES');
    const [empRow] = await db.query('SELECT COUNT(*) as total, SUM(CASE WHEN approval_status = "pending" THEN 1 ELSE 0 END) as pending FROM EMPLOYERS');
    const [jobRow] = await db.query('SELECT COUNT(*) as total, SUM(CASE WHEN status = "open" THEN 1 ELSE 0 END) as open_jobs, SUM(CASE WHEN status = "draft" THEN 1 ELSE 0 END) as draft_jobs FROM JOB');
    const [appRow] = await db.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = "applied" THEN 1 ELSE 0 END) as applied,
        SUM(CASE WHEN status = "reviewing" THEN 1 ELSE 0 END) as reviewing,
        SUM(CASE WHEN status = "shortlisted" THEN 1 ELSE 0 END) as shortlisted,
        SUM(CASE WHEN status = "interview" THEN 1 ELSE 0 END) as interview,
        SUM(CASE WHEN status = "hired" THEN 1 ELSE 0 END) as selected,
        SUM(CASE WHEN status = "rejected" THEN 1 ELSE 0 END) as rejected
      FROM APPLICATION
    `);
    const [enqRow] = await db.query('SELECT COUNT(*) as total, SUM(CASE WHEN status = "NEW" OR status = "new" THEN 1 ELSE 0 END) as new_enquiries FROM EMPLOYER_ENQUIRY');
    
    // Leads counts
    let leadQuery = 'SELECT COUNT(*) as total, SUM(CASE WHEN status = "NEW" THEN 1 ELSE 0 END) as new_leads, SUM(CASE WHEN status = "CONVERTED" THEN 1 ELSE 0 END) as converted_leads FROM LEADS';
    let leadParams = [];
    if (userRole === 'bd_lead' && !scope.isGlobal) {
      leadQuery += ' WHERE assigned_bd_user_id = ?';
      leadParams.push(userId);
    }
    const [leadRow] = await db.query(leadQuery, leadParams);

    // Candidate shares count
    const [shareRow] = await db.query('SELECT COUNT(*) as total, SUM(CASE WHEN status = "APPROVED" THEN 1 ELSE 0 END) as approved_shares, SUM(CASE WHEN status = "PROPOSED" THEN 1 ELSE 0 END) as pending_shares FROM CANDIDATE_SHARING');

    // Recent activity log (real recent actions with actor email)
    const recentActivity = await db.query(`
      SELECT a.id, a.action_type, a.entity_type, a.entity_id, a.description, a.created_at, u.email as actor_email, u.role as actor_role
      FROM RECRUITMENT_ACTIVITY a
      LEFT JOIN USERS u ON a.performed_by = u.id
      ORDER BY a.created_at DESC
      LIMIT 8
    `);

    res.json({
      success: true,
      stats: {
        total_candidates: Number(candRow?.total || 0),
        total_employers: Number(empRow?.total || 0),
        pending_employers: Number(empRow?.pending || 0),
        total_jobs: Number(jobRow?.total || 0),
        open_jobs: Number(jobRow?.open_jobs || 0),
        draft_jobs: Number(jobRow?.draft_jobs || 0),
        total_applications: Number(appRow?.total || 0),
        pending_applications: Number(appRow?.applied || 0) + Number(appRow?.reviewing || 0),
        shortlisted_candidates: Number(appRow?.shortlisted || 0),
        interview_candidates: Number(appRow?.interview || 0),
        selected_candidates: Number(appRow?.selected || 0),
        rejected_applications: Number(appRow?.rejected || 0),
        total_enquiries: Number(enqRow?.total || 0),
        new_enquiries: Number(enqRow?.new_enquiries || 0),
        total_leads: Number(leadRow?.total || 0),
        new_leads: Number(leadRow?.new_leads || 0),
        converted_leads: Number(leadRow?.converted_leads || 0),
        total_shares: Number(shareRow?.total || 0),
        approved_shares: Number(shareRow?.approved_shares || 0),
        pending_shares: Number(shareRow?.pending_shares || 0)
      },
      recent_activity: recentActivity || []
    });
  } catch (error) {
    console.error('getAdminStats error:', error);
    res.status(500).json({ success: false, message: 'Error fetching admin stats.', error: error.message });
  }
};

// Data-Isolation Helper: verify whether a user can access a specific candidate record
const canAccessCandidate = async (userId, userRole, candidateId, scope, isProposing = false) => {
  const normRole = (userRole || '').toLowerCase();
  if (normRole === 'director' || normRole === 'main_admin' || normRole === 'admin' || scope.isGlobal) {
    return true;
  }

  if (normRole === 'recruiter') {
    // Unassigned recruiter cannot access candidates
    if (!scope.jobIds || scope.jobIds.length === 0) return false;
    if (isProposing) return true; // Allowed to recommend candidates for assigned jobs

    // Record-level isolation: candidate must be an applicant to their assigned job or shared
    const matches = await db.query(
      'SELECT 1 FROM APPLICATION WHERE candidate_id = ? AND job_id IN (?) LIMIT 1',
      [candidateId, scope.jobIds]
    );
    return Boolean(matches && matches.length > 0);
  }

  if (normRole === 'tl_coordinator') {
    // Unassigned TL cannot access candidates
    if ((!scope.jobIds || scope.jobIds.length === 0) && (!scope.clientIds || scope.clientIds.length === 0)) {
      return false;
    }
    if (isProposing) return true;

    const allowedJobIds = scope.jobIds && scope.jobIds.length > 0 ? scope.jobIds : ['__NONE__'];
    const allowedClientIds = scope.clientIds && scope.clientIds.length > 0 ? scope.clientIds : ['__NONE__'];
    const matches = await db.query(`
      SELECT 1 
      FROM APPLICATION a
      JOIN JOB j ON a.job_id = j.id
      WHERE a.candidate_id = ?
        AND (a.job_id IN (?) OR j.employer_id IN (?))
      LIMIT 1
    `, [candidateId, allowedJobIds, allowedClientIds]);
    return Boolean(matches && matches.length > 0);
  }

  return false;
};

// Privacy helpers to avoid leaking contact info during duplicate verification or shared views
const maskEmail = (email) => {
  if (!email || typeof email !== 'string') return '';
  const parts = email.split('@');
  if (parts.length < 2) return '***';
  const user = parts[0];
  const domain = parts[1];
  const maskedUser = user.length <= 2 ? user[0] + '***' : user[0] + '***' + user[user.length - 1];
  return `${maskedUser}@${domain}`;
};

const maskPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return '****';
  return phone.slice(0, 3) + '*****' + digits.slice(-2);
};

// 2. Candidate Management
const getAllCandidates = async (req, res) => {
  try {
    const { search, limit = 50, page = 1 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const userRole = (req.user?.role || '').toLowerCase();
    const userId = req.user?.id;
    const scope = await getUserScope(userId, userRole);

    let whereClauses = [];
    let queryParams = [];

    // Recruiter scoping: only candidates who applied to recruiter's assigned jobs
    if (userRole === 'recruiter' && !scope.isGlobal) {
      if (scope.jobIds.length === 0) {
        whereClauses.push('1 = 0'); // Default deny: unassigned recruiter sees 0 candidates
      } else {
        whereClauses.push(`c.id IN (SELECT candidate_id FROM APPLICATION WHERE job_id IN (?))`);
        queryParams.push(scope.jobIds);
      }
    } else if (userRole === 'tl_coordinator' && !scope.isGlobal) {
      if (scope.jobIds.length === 0 && scope.clientIds.length === 0) {
        whereClauses.push('1 = 0'); // Default deny: unassigned TL sees 0 candidates
      } else {
        const allowedJobIds = scope.jobIds.length > 0 ? scope.jobIds : ['__NONE__'];
        const allowedClientIds = scope.clientIds.length > 0 ? scope.clientIds : ['__NONE__'];
        whereClauses.push(`c.id IN (
          SELECT a.candidate_id 
          FROM APPLICATION a 
          JOIN JOB j ON a.job_id = j.id 
          WHERE a.job_id IN (?) OR j.employer_id IN (?)
        )`);
        queryParams.push(allowedJobIds, allowedClientIds);
      }
    } else if (userRole !== 'director' && userRole !== 'main_admin' && userRole !== 'admin' && !scope.isGlobal) {
      // Default deny for any unauthorized role
      whereClauses.push('1 = 0');
    }

    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      whereClauses.push(`(LOWER(c.name) LIKE ? OR LOWER(c.professional_headline) LIKE ? OR LOWER(c.current_organization) LIKE ? OR LOWER(u.email) LIKE ? OR u.phone LIKE ?)`);
      queryParams.push(term, term, term, term, `%${search.trim()}%`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countSql = `
      SELECT COUNT(*) as total 
      FROM CANDIDATES c 
      LEFT JOIN USERS u ON c.user_id = u.id 
      ${whereSql}
    `;
    const [countRes] = await db.query(countSql, queryParams);
    const total = Number(countRes?.total || 0);

    const candidates = await db.query(`
      SELECT 
        c.id, c.user_id, c.name, c.current_location, c.profile_type,
        c.professional_headline, c.current_organization, c.current_designation,
        c.total_experience, c.preferred_location, c.created_at,
        u.email, u.phone, u.is_active
      FROM CANDIDATES c
      LEFT JOIN USERS u ON c.user_id = u.id
      ${whereSql}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, Number(limit), offset]);

    const isDirectorOrGlobal = userRole === 'director' || userRole === 'main_admin' || scope.isGlobal;
    const sanitizedCandidates = (candidates || []).map(c => {
      if (isDirectorOrGlobal) return c;
      return {
        ...c,
        email: maskEmail(c.email),
        phone: maskPhone(c.phone)
      };
    });

    res.json({
      success: true,
      candidates: sanitizedCandidates,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('getAllCandidates error:', error);
    res.status(500).json({ success: false, message: 'Error fetching candidates.', error: error.message });
  }
};

const getCandidateDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = (req.user?.role || '').toLowerCase();
    const userId = req.user?.id;
    const scope = await getUserScope(userId, userRole);

    // Enforce data-isolation check against unauthorized direct access (prevent IDOR)
    const hasAccess = await canAccessCandidate(userId, userRole, id, scope);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        code: 'SCOPE_ACCESS_DENIED',
        message: 'Forbidden. You do not have authorization to view this candidate profile or contact details.'
      });
    }

    const candidates = await db.query(`
      SELECT c.*, u.email, u.phone, u.is_active 
      FROM CANDIDATES c 
      LEFT JOIN USERS u ON c.user_id = u.id 
      WHERE c.id = ?
    `, [id]);

    if (!candidates || candidates.length === 0) {
      return res.status(404).json({ success: false, message: 'Candidate not found.' });
    }

    const candidate = candidates[0];
    const experience = await db.query('SELECT * FROM CANDIDATE_EXPERIENCE WHERE candidate_id = ? ORDER BY from_date DESC', [id]);
    const education = await db.query('SELECT * FROM CANDIDATE_EDUCATION WHERE candidate_id = ? ORDER BY year DESC', [id]);
    const projects = await db.query('SELECT * FROM CANDIDATE_PROJECT WHERE candidate_id = ? ORDER BY created_at DESC', [id]);
    const skills = await db.query(`
      SELECT s.id, s.name, s.category 
      FROM CANDIDATE_SKILL cs 
      JOIN SKILL s ON cs.skill_id = s.id 
      WHERE cs.candidate_id = ?
    `, [id]);
    const resumes = await db.query('SELECT id, resume_title, file_name, file_url, is_primary, created_at FROM CANDIDATE_RESUME WHERE candidate_id = ?', [id]);
    const notes = await db.query(`
      SELECT cn.*, u.email as author_email 
      FROM CANDIDATE_NOTE cn 
      LEFT JOIN USERS u ON cn.author_id = u.id 
      WHERE cn.candidate_id = ? 
      ORDER BY cn.created_at DESC
    `, [id]);
    const applications = await db.query(`
      SELECT a.id, a.job_id, a.status, a.applied_at, j.title as job_title, e.company_name
      FROM APPLICATION a
      JOIN JOB j ON a.job_id = j.id
      LEFT JOIN EMPLOYERS e ON j.employer_id = e.id
      WHERE a.candidate_id = ?
    `, [id]);

    // Recruiter viewing candidate logs access
    await logActivity({
      performed_by: req.user.id,
      action_type: 'VIEW_CANDIDATE_PROFILE',
      entity_type: 'CANDIDATE',
      entity_id: id,
      description: `Viewed profile of candidate: ${candidate.name}`
    });

    res.json({
      success: true,
      candidate: {
        ...candidate,
        experience: experience || [],
        education: education || [],
        projects: projects || [],
        skills: skills || [],
        resumes: resumes || [],
        notes: notes || [],
        applications: applications || []
      }
    });
  } catch (error) {
    console.error('getCandidateDetails error:', error);
    res.status(500).json({ success: false, message: 'Error fetching candidate details.', error: error.message });
  }
};

const checkCandidateDuplicate = async (req, res) => {
  try {
    const { email, phone } = req.body;
    const userRole = (req.user?.role || '').toLowerCase();
    const userId = req.user?.id;
    const scope = await getUserScope(userId, userRole);

    if (!email && !phone) {
      return res.status(400).json({ success: false, message: 'Email or phone required for duplicate detection.' });
    }

    let matches = [];
    if (email && email.trim()) {
      const emailMatches = await db.query(`
        SELECT c.id, c.name, u.email, u.phone, c.created_at 
        FROM USERS u 
        JOIN CANDIDATES c ON u.id = c.user_id 
        WHERE LOWER(u.email) = ?
      `, [email.trim().toLowerCase()]);
      matches.push(...emailMatches);
    }

    if (phone && phone.trim()) {
      const phoneDigits = phone.trim().replace(/\D/g, '');
      const phoneMatches = await db.query(`
        SELECT c.id, c.name, u.email, u.phone, c.created_at 
        FROM USERS u 
        JOIN CANDIDATES c ON u.id = c.user_id 
        WHERE REPLACE(REPLACE(u.phone, ' ', ''), '-', '') LIKE ?
      `, [`%${phoneDigits}%`]);
      matches.push(...phoneMatches);
    }

    // Deduplicate array by candidate id
    const uniqueMatches = [];
    const seen = new Set();
    for (const m of matches) {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        uniqueMatches.push(m);
      }
    }

    // Mask sensitive contact details for non-directors
    const isDirectorOrGlobal = userRole === 'director' || userRole === 'main_admin' || scope.isGlobal;
    const sanitizedMatches = uniqueMatches.map(m => {
      if (isDirectorOrGlobal) return m;
      return {
        id: m.id,
        name: m.name,
        created_at: m.created_at,
        email: maskEmail(m.email),
        phone: maskPhone(m.phone)
      };
    });

    res.json({
      success: true,
      isDuplicate: sanitizedMatches.length > 0,
      count: sanitizedMatches.length,
      matches: sanitizedMatches
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error performing duplicate check.', error: error.message });
  }
};

const addCandidateNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const userRole = (req.user?.role || '').toLowerCase();
    const userId = req.user?.id;
    const scope = await getUserScope(userId, userRole);

    if (!note || !note.trim()) {
      return res.status(400).json({ success: false, message: 'Note text is required.' });
    }

    // Enforce data-isolation check on candidate notes (prevent IDOR note injection)
    const hasAccess = await canAccessCandidate(userId, userRole, id, scope);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        code: 'SCOPE_ACCESS_DENIED',
        message: 'Cannot add notes to a candidate outside your assigned scope.'
      });
    }

    const noteId = uuidv4();
    await db.query(
      'INSERT INTO CANDIDATE_NOTE (id, candidate_id, author_id, note) VALUES (?, ?, ?, ?)',
      [noteId, id, req.user.id, note.trim()]
    );

    await logActivity({
      performed_by: req.user.id,
      action_type: 'ADD_CANDIDATE_NOTE',
      entity_type: 'CANDIDATE',
      entity_id: id,
      description: `Added internal recruiter note to candidate`
    });

    res.status(201).json({ success: true, message: 'Internal recruiter note added.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error adding note.', error: error.message });
  }
};

// 3. Job Management (Internal Postings & Executive Search)
const getAllJobs = async (req, res) => {
  try {
    const { status, search } = req.query;
    const userRole = (req.user?.role || '').toLowerCase();
    const userId = req.user?.id;
    const scope = await getUserScope(userId, userRole);

    let whereClauses = [];
    let queryParams = [];

    // Recruiter & TL record-level scoping
    if (userRole === 'recruiter' && !scope.isGlobal) {
      if (scope.jobIds.length === 0) {
        whereClauses.push('1 = 0'); // Default deny: unassigned recruiter sees 0 jobs
      } else {
        whereClauses.push(`j.id IN (?)`);
        queryParams.push(scope.jobIds);
      }
    } else if (userRole === 'tl_coordinator' && !scope.isGlobal) {
      if (scope.jobIds.length === 0 && scope.clientIds.length === 0) {
        whereClauses.push('1 = 0'); // Default deny: unassigned TL sees 0 jobs
      } else {
        const allowedJobIds = scope.jobIds.length > 0 ? scope.jobIds : ['__NONE__'];
        const allowedClientIds = scope.clientIds.length > 0 ? scope.clientIds : ['__NONE__'];
        whereClauses.push(`(j.id IN (?) OR j.employer_id IN (?))`);
        queryParams.push(allowedJobIds, allowedClientIds);
      }
    }

    if (status && status !== 'all') {
      whereClauses.push(`j.status = ?`);
      queryParams.push(status);
    }

    if (search && search.trim()) {
      whereClauses.push(`(LOWER(j.title) LIKE ? OR LOWER(j.location) LIKE ? OR LOWER(e.company_name) LIKE ?)`);
      const term = `%${search.trim().toLowerCase()}%`;
      queryParams.push(term, term, term);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const jobs = await db.query(`
      SELECT 
        j.*, 
        e.company_name, e.logo_url,
        recruiter.email as assigned_recruiter_email,
        (SELECT COUNT(*) FROM APPLICATION a WHERE a.job_id = j.id) as applicant_count
      FROM JOB j
      LEFT JOIN EMPLOYERS e ON j.employer_id = e.id
      LEFT JOIN USERS recruiter ON j.assigned_recruiter_id = recruiter.id
      ${whereSql}
      ORDER BY j.created_at DESC
    `, queryParams);

    res.json({ success: true, count: jobs.length, jobs: jobs || [] });
  } catch (error) {
    console.error('getAllJobs error:', error);
    res.status(500).json({ success: false, message: 'Error fetching jobs.', error: error.message });
  }
};

// Helper to sync skills into JOB_SKILL relational model
const syncJobSkills = async (jobId, skillsArray) => {
  if (!Array.isArray(skillsArray) || skillsArray.length === 0) return;
  try {
    await db.query('DELETE FROM JOB_SKILL WHERE job_id = ?', [jobId]);
    for (const skillName of skillsArray) {
      if (typeof skillName === 'string' && skillName.trim()) {
        const cleanSkill = skillName.trim();
        const skillId = uuidv4();
        await db.query('INSERT INTO JOB_SKILL (id, job_id, skill_name) VALUES (?, ?, ?)', [skillId, jobId, cleanSkill]);
      }
    }
  } catch (_) {}
};

// Helper to sync keywords into JOB_KEYWORD relational table
const syncJobKeywords = async (jobId, keywordsArray) => {
  if (!jobId || !Array.isArray(keywordsArray) || keywordsArray.length === 0) return;
  try {
    await db.query('DELETE FROM JOB_KEYWORD WHERE job_id = ?', [jobId]);
    for (const rawKw of keywordsArray) {
      if (typeof rawKw === 'string' && rawKw.trim()) {
        await db.query('INSERT INTO JOB_KEYWORD (id, job_id, keyword) VALUES (?, ?, ?)', [uuidv4(), jobId, rawKw.trim().toLowerCase()]);
      }
    }
  } catch (_) {}
};

const createInternalJob = async (req, res) => {
  try {
    const {
      title, category_id, department, job_domain, employment_type, workplace_type, seniority_level,
      location, country, state, city, locality,
      min_experience, max_experience, fresher_allowed, min_qualification, degree, specialization,
      required_skills, keywords, notice_period,
      min_salary, max_salary, currency, salary_period, salary_type, benefits, application_deadline,
      description, responsibilities, requirements, employer_id, client_id, openings_count,
      is_internal_only, publish_to_board, status, assigned_recruiter_id, internal_notes
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Job title is required.' });
    }
    const cleanLocation = location && location.trim() ? location.trim() : [city, state, country].filter(Boolean).join(', ') || 'Remote / Flexible';

    const id = uuidv4();
    const isInternal = is_internal_only !== undefined ? (is_internal_only ? 1 : 0) : (publish_to_board ? 0 : (status === 'open' ? 0 : 0));
    let targetStatus = status || (publish_to_board ? 'open' : 'draft');
    if (['open', 'draft', 'closed'].indexOf(targetStatus) === -1) targetStatus = 'draft';
    const sourceType = isInternal ? 'EXECUTIVE_SEARCH' : 'Vakancy Recruitment';

    const skillsString = Array.isArray(required_skills) ? JSON.stringify(required_skills) : (required_skills || null);
    const keywordsString = Array.isArray(keywords) ? JSON.stringify(keywords) : (keywords || null);
    const benefitsString = Array.isArray(benefits) ? JSON.stringify(benefits) : (benefits || null);
    const respString = Array.isArray(responsibilities) ? JSON.stringify(responsibilities) : (responsibilities || '');
    const reqString = Array.isArray(requirements) ? JSON.stringify(requirements) : (requirements || '');

    await db.query(`
      INSERT INTO JOB (
        id, employer_id, client_id, category_id, title, department, job_domain,
        employment_type, workplace_type, seniority_level, location, country, state, city, locality,
        min_experience, max_experience, fresher_allowed, min_qualification, degree, specialization,
        required_skills, keywords, notice_period,
        min_salary, max_salary, currency, salary_period, salary_type, benefits, application_deadline,
        description, responsibilities, requirements, openings_count,
        status, is_internal_only, assigned_recruiter_id, internal_notes,
        created_by_user_id, created_by_type, source_type
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, 'INTERNAL_STAFF', ?
      )
    `, [
      id, employer_id || null, client_id || null, category_id || null, title.trim(), department || 'General', job_domain || 'General',
      employment_type || 'Full Time', workplace_type || 'On-site', seniority_level || 'Mid Level', cleanLocation,
      country || 'India', state || null, city || null, locality || null,
      parseFloat(min_experience) || 0, parseFloat(max_experience) || 0, fresher_allowed ? 1 : 0, min_qualification || null, degree || null, specialization || null,
      skillsString, keywordsString, notice_period || null,
      min_salary ? parseFloat(min_salary) : null, max_salary ? parseFloat(max_salary) : null, currency || 'INR', salary_period || 'Per Year', salary_type || 'CTC', benefitsString, application_deadline || null,
      description || '', respString, reqString, parseInt(openings_count, 10) || 1,
      targetStatus, isInternal, assigned_recruiter_id || null, internal_notes || null,
      req.user.id, sourceType
    ]);

    if (Array.isArray(required_skills)) await syncJobSkills(id, required_skills);
    if (Array.isArray(keywords)) await syncJobKeywords(id, keywords);

    if (assigned_recruiter_id) {
      const assignId = uuidv4();
      await db.query(`
        INSERT INTO USER_ASSIGNMENTS (id, user_id, assigned_job_id, scope_type)
        VALUES (?, ?, ?, 'scoped')
      `, [assignId, assigned_recruiter_id, id]);
    }

    await logActivity({
      performed_by: req.user.id,
      action_type: 'CREATE_JOB',
      entity_type: 'JOB',
      entity_id: id,
      description: `Created ${isInternal ? 'private executive search mandate' : 'recruitment requisition'}: ${title} (Status: ${targetStatus})`
    });

    res.status(201).json({ success: true, message: 'Recruitment requirement created successfully.', job_id: id });
  } catch (error) {
    console.error('createInternalJob error:', error);
    res.status(500).json({ success: false, message: 'Error creating requirement.', error: error.message });
  }
};

const updateInternalJob = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db.query('SELECT * FROM JOB WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Job not found.' });

    const {
      title, category_id, department, job_domain, employment_type, workplace_type, seniority_level,
      location, country, state, city, locality,
      min_experience, max_experience, fresher_allowed, min_qualification, degree, specialization,
      required_skills, keywords, notice_period,
      min_salary, max_salary, currency, salary_period, salary_type, benefits, application_deadline,
      description, responsibilities, requirements, employer_id, client_id, openings_count,
      is_internal_only, publish_to_board, status, assigned_recruiter_id, internal_notes
    } = req.body;

    const current = existing[0];
    const newTitle = title !== undefined ? title.trim() : current.title;
    const cleanLocation = location !== undefined ? location.trim() : current.location;
    let targetStatus = status !== undefined ? status : (publish_to_board !== undefined ? (publish_to_board ? 'open' : 'draft') : current.status);
    if (['open', 'draft', 'closed'].indexOf(targetStatus) === -1) targetStatus = current.status;
    const isInternal = is_internal_only !== undefined ? (is_internal_only ? 1 : 0) : (targetStatus === 'open' ? 0 : current.is_internal_only);

    const skillsString = required_skills !== undefined ? (Array.isArray(required_skills) ? JSON.stringify(required_skills) : required_skills) : current.required_skills;
    const keywordsString = keywords !== undefined ? (Array.isArray(keywords) ? JSON.stringify(keywords) : keywords) : current.keywords;
    const benefitsString = benefits !== undefined ? (Array.isArray(benefits) ? JSON.stringify(benefits) : benefits) : current.benefits;
    const respString = responsibilities !== undefined ? (Array.isArray(responsibilities) ? JSON.stringify(responsibilities) : responsibilities) : current.responsibilities;
    const reqString = requirements !== undefined ? (Array.isArray(requirements) ? JSON.stringify(requirements) : requirements) : current.requirements;

    await db.query(`
      UPDATE JOB SET
        employer_id = ?, client_id = ?, category_id = ?, title = ?, department = ?, job_domain = ?,
        employment_type = ?, workplace_type = ?, seniority_level = ?, location = ?, country = ?, state = ?, city = ?, locality = ?,
        min_experience = ?, max_experience = ?, fresher_allowed = ?, min_qualification = ?, degree = ?, specialization = ?,
        required_skills = ?, keywords = ?, notice_period = ?,
        min_salary = ?, max_salary = ?, currency = ?, salary_period = ?, salary_type = ?, benefits = ?, application_deadline = ?,
        description = ?, responsibilities = ?, requirements = ?, openings_count = ?,
        status = ?, is_internal_only = ?, assigned_recruiter_id = ?, internal_notes = ?
      WHERE id = ?
    `, [
      employer_id !== undefined ? employer_id : current.employer_id,
      client_id !== undefined ? client_id : current.client_id,
      category_id !== undefined ? category_id : current.category_id,
      newTitle,
      department !== undefined ? department : current.department,
      job_domain !== undefined ? job_domain : current.job_domain,
      employment_type !== undefined ? employment_type : current.employment_type,
      workplace_type !== undefined ? workplace_type : current.workplace_type,
      seniority_level !== undefined ? seniority_level : current.seniority_level,
      cleanLocation,
      country !== undefined ? country : current.country,
      state !== undefined ? state : current.state,
      city !== undefined ? city : current.city,
      locality !== undefined ? locality : current.locality,
      min_experience !== undefined ? parseFloat(min_experience) : current.min_experience,
      max_experience !== undefined ? parseFloat(max_experience) : current.max_experience,
      fresher_allowed !== undefined ? (fresher_allowed ? 1 : 0) : current.fresher_allowed,
      min_qualification !== undefined ? min_qualification : current.min_qualification,
      degree !== undefined ? degree : current.degree,
      specialization !== undefined ? specialization : current.specialization,
      skillsString, keywordsString,
      notice_period !== undefined ? notice_period : current.notice_period,
      min_salary !== undefined ? (min_salary ? parseFloat(min_salary) : null) : current.min_salary,
      max_salary !== undefined ? (max_salary ? parseFloat(max_salary) : null) : current.max_salary,
      currency !== undefined ? currency : current.currency,
      salary_period !== undefined ? salary_period : current.salary_period,
      salary_type !== undefined ? salary_type : current.salary_type,
      benefitsString,
      application_deadline !== undefined ? application_deadline : current.application_deadline,
      description !== undefined ? description : current.description,
      respString, reqString,
      openings_count !== undefined ? parseInt(openings_count, 10) : current.openings_count,
      targetStatus, isInternal,
      assigned_recruiter_id !== undefined ? assigned_recruiter_id : current.assigned_recruiter_id,
      internal_notes !== undefined ? internal_notes : current.internal_notes,
      id
    ]);

    if (Array.isArray(required_skills)) await syncJobSkills(id, required_skills);
    if (Array.isArray(keywords)) await syncJobKeywords(id, keywords);

    await logActivity({
      performed_by: req.user.id,
      action_type: 'UPDATE_JOB',
      entity_type: 'JOB',
      entity_id: id,
      description: `Updated job requirement: ${newTitle} (Status: ${targetStatus})`
    });

    res.json({ success: true, message: 'Job requirement updated successfully.' });
  } catch (error) {
    console.error('updateInternalJob error:', error);
    res.status(500).json({ success: false, message: 'Error updating requirement.', error: error.message });
  }
};

const assignJobRecruiter = async (req, res) => {
  try {
    const { id } = req.params;
    const { assigned_recruiter_id } = req.body;

    if (!assigned_recruiter_id) {
      return res.status(400).json({ success: false, message: 'Recruiter ID is required.' });
    }

    await db.query('UPDATE JOB SET assigned_recruiter_id = ? WHERE id = ?', [assigned_recruiter_id, id]);

    const assignId = uuidv4();
    await db.query(`
      INSERT INTO USER_ASSIGNMENTS (id, user_id, assigned_job_id, scope_type)
      VALUES (?, ?, ?, 'scoped')
    `, [assignId, assigned_recruiter_id, id]);

    await logActivity({
      performed_by: req.user.id,
      action_type: 'ASSIGN_JOB_RECRUITER',
      entity_type: 'JOB',
      entity_id: id,
      description: `Assigned requirement to recruiter`
    });

    res.json({ success: true, message: 'Recruiter assigned successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error assigning recruiter.', error: error.message });
  }
};

const updateJobStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['open', 'closed', 'draft'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    await db.query('UPDATE JOB SET status = ? WHERE id = ?', [status, id]);

    await logActivity({
      performed_by: req.user.id,
      action_type: 'UPDATE_JOB_STATUS',
      entity_type: 'JOB',
      entity_id: id,
      description: `Updated job status to '${status}'`
    });

    res.json({ success: true, message: `Job status updated to ${status}.` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating job status.', error: error.message });
  }
};

const approveJob = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("UPDATE JOB SET status = 'open' WHERE id = ?", [id]);
    await logActivity({
      performed_by: req.user.id,
      action_type: 'APPROVE_JOB',
      entity_type: 'JOB',
      entity_id: id,
      description: `Approved job posting`
    });
    res.json({ success: true, message: 'Job approved and opened.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error approving job.', error: error.message });
  }
};

const rejectJob = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("UPDATE JOB SET status = 'closed' WHERE id = ?", [id]);
    await logActivity({
      performed_by: req.user.id,
      action_type: 'REJECT_JOB',
      entity_type: 'JOB',
      entity_id: id,
      description: `Closed/rejected job posting`
    });
    res.json({ success: true, message: 'Job rejected/closed.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error rejecting job.', error: error.message });
  }
};

// 4. Applications & ATS Recruitment Workflow
const getAllApplications = async (req, res) => {
  try {
    const { stage, jobId, search } = req.query;
    const userRole = (req.user?.role || '').toLowerCase();
    const userId = req.user?.id;
    const scope = await getUserScope(userId, userRole);

    let whereClauses = [];
    let queryParams = [];

    // Recruiter & TL record-level scoping
    if (userRole === 'recruiter' && !scope.isGlobal) {
      if (scope.jobIds.length === 0) {
        whereClauses.push('1 = 0'); // Default deny: unassigned recruiter sees 0 applications
      } else {
        whereClauses.push('a.job_id IN (?)');
        queryParams.push(scope.jobIds);
      }
    } else if (userRole === 'tl_coordinator' && !scope.isGlobal) {
      if (scope.jobIds.length === 0 && scope.clientIds.length === 0) {
        whereClauses.push('1 = 0'); // Default deny: unassigned TL sees 0 applications
      } else {
        const allowedJobIds = scope.jobIds.length > 0 ? scope.jobIds : ['__NONE__'];
        const allowedClientIds = scope.clientIds.length > 0 ? scope.clientIds : ['__NONE__'];
        whereClauses.push('(a.job_id IN (?) OR j.employer_id IN (?))');
        queryParams.push(allowedJobIds, allowedClientIds);
      }
    } else if (userRole !== 'director' && userRole !== 'main_admin' && userRole !== 'admin' && !scope.isGlobal) {
      whereClauses.push('1 = 0');
    }

    if (jobId) {
      whereClauses.push('a.job_id = ?');
      queryParams.push(jobId);
    }

    if (stage && stage !== 'all') {
      // Map UI stage to canonical DB status
      const statusMap = {
        applied: 'applied',
        under_review: 'reviewing',
        shortlisted: 'shortlisted',
        interview: 'interview',
        selected: 'hired',
        rejected: 'rejected'
      };
      whereClauses.push('a.status = ?');
      queryParams.push(statusMap[stage] || stage);
    }

    if (search && search.trim()) {
      whereClauses.push('(LOWER(c.name) LIKE ? OR LOWER(j.title) LIKE ? OR LOWER(u.email) LIKE ?)');
      const term = `%${search.trim().toLowerCase()}%`;
      queryParams.push(term, term, term);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const applications = await db.query(`
      SELECT 
        a.id, a.job_id, a.candidate_id, a.status, a.applied_at,
        c.name as candidate_name, c.professional_headline, c.current_location,
        u.email as candidate_email, u.phone as candidate_phone,
        j.title as job_title, j.location as job_location,
        e.company_name
      FROM APPLICATION a
      JOIN CANDIDATES c ON a.candidate_id = c.id
      JOIN USERS u ON c.user_id = u.id
      JOIN JOB j ON a.job_id = j.id
      LEFT JOIN EMPLOYERS e ON j.employer_id = e.id
      ${whereSql}
      ORDER BY a.applied_at DESC
    `, queryParams);

    res.json({ success: true, count: applications.length, applications: applications || [] });
  } catch (error) {
    console.error('getAllApplications error:', error);
    res.status(500).json({ success: false, message: 'Error fetching applications.', error: error.message });
  }
};

const updateApplicationStage = async (req, res) => {
  try {
    const { id } = req.params;
    const { stage, notes } = req.body;
    const userRole = (req.user?.role || '').toLowerCase();
    const userId = req.user?.id;
    const scope = await getUserScope(userId, userRole);

    // Supported recruitment stages
    const stageMap = {
      'applied': 'applied',
      'under_review': 'reviewing',
      'shortlisted': 'shortlisted',
      'interview': 'interview',
      'selected': 'hired',
      'rejected': 'rejected'
    };

    const targetStatus = stageMap[stage] || stage;
    const validStatuses = ['applied', 'reviewing', 'shortlisted', 'interview', 'hired', 'rejected'];

    if (!validStatuses.includes(targetStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid recruitment stage.' });
    }

    const currentApps = await db.query(`
      SELECT a.*, c.name as candidate_name, j.title as job_title, j.employer_id 
      FROM APPLICATION a 
      JOIN CANDIDATES c ON a.candidate_id = c.id 
      JOIN JOB j ON a.job_id = j.id 
      WHERE a.id = ?
    `, [id]);

    if (!currentApps || currentApps.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    const app = currentApps[0];

    // Enforce data-level authorization on application stage modification
    if (!scope.isGlobal && userRole === 'recruiter') {
      if (!scope.jobIds || !scope.jobIds.includes(app.job_id)) {
        return res.status(403).json({
          success: false,
          code: 'SCOPE_ACCESS_DENIED',
          message: 'Cannot update application stage for a job outside your assigned scope.'
        });
      }
    } else if (!scope.isGlobal && userRole === 'tl_coordinator') {
      const isAllowed = (scope.jobIds && scope.jobIds.includes(app.job_id)) ||
                        (app.employer_id && scope.clientIds && scope.clientIds.includes(app.employer_id));
      if (!isAllowed) {
        return res.status(403).json({
          success: false,
          code: 'SCOPE_ACCESS_DENIED',
          message: 'Cannot update application stage for a job outside your assigned team or client scope.'
        });
      }
    }

    await db.query('UPDATE APPLICATION SET status = ? WHERE id = ?', [targetStatus, id]);

    await logActivity({
      performed_by: req.user.id,
      action_type: 'UPDATE_APPLICATION_STAGE',
      entity_type: 'APPLICATION',
      entity_id: id,
      related_job_id: app.job_id,
      related_application_id: id,
      description: `Moved ${app.candidate_name} to stage '${stage}' for job '${app.job_title}'${notes ? ` (${notes})` : ''}`
    });

    res.json({ success: true, message: `Application moved to '${stage}'.` });
  } catch (error) {
    console.error('updateApplicationStage error:', error);
    res.status(500).json({ success: false, message: 'Error updating stage.', error: error.message });
  }
};

// 5. Candidate Sharing & Secure Token Client View
const getCandidateShares = async (req, res) => {
  try {
    const userRole = (req.user?.role || '').toLowerCase();
    const userId = req.user?.id;
    const scope = await getUserScope(userId, userRole);

    let whereClauses = [];
    let queryParams = [];

    // Record-level scoping for candidate sharing submissions
    if (userRole === 'recruiter' && !scope.isGlobal) {
      if (scope.jobIds.length === 0) {
        whereClauses.push('cs.proposed_by_user_id = ?');
        queryParams.push(userId);
      } else {
        whereClauses.push('(cs.proposed_by_user_id = ? OR cs.job_id IN (?))');
        queryParams.push(userId, scope.jobIds);
      }
    } else if (userRole === 'tl_coordinator' && !scope.isGlobal) {
      if (scope.jobIds.length === 0 && scope.clientIds.length === 0) {
        whereClauses.push('(cs.proposed_by_user_id = ? OR cs.tl_reviewed_by_user_id = ?)');
        queryParams.push(userId, userId);
      } else {
        const allowedJobIds = scope.jobIds.length > 0 ? scope.jobIds : ['__NONE__'];
        const allowedClientIds = scope.clientIds.length > 0 ? scope.clientIds : ['__NONE__'];
        whereClauses.push('(cs.proposed_by_user_id = ? OR cs.tl_reviewed_by_user_id = ? OR cs.job_id IN (?) OR cs.client_id IN (?))');
        queryParams.push(userId, userId, allowedJobIds, allowedClientIds);
      }
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const shares = await db.query(`
      SELECT 
        cs.*,
        c.name as candidate_name, c.professional_headline,
        j.title as job_title,
        e.company_name as client_name,
        u_prop.email as proposed_by_email,
        u_tl.email as tl_reviewed_by_email,
        u_app.email as approved_by_email,
        COALESCE(
          (SELECT payment_status FROM RECRUITMENT_COMMERCIALS rc 
           WHERE (rc.job_id IS NOT NULL AND rc.job_id = cs.job_id) 
              OR (rc.client_id IS NOT NULL AND rc.client_id = cs.client_id)
           ORDER BY rc.created_at DESC LIMIT 1),
          'NOT_QUOTED'
        ) as commercial_payment_status
      FROM CANDIDATE_SHARING cs
      JOIN CANDIDATES c ON cs.candidate_id = c.id
      LEFT JOIN JOB j ON cs.job_id = j.id
      LEFT JOIN EMPLOYERS e ON cs.client_id = e.id
      LEFT JOIN USERS u_prop ON cs.proposed_by_user_id = u_prop.id
      LEFT JOIN USERS u_tl ON cs.tl_reviewed_by_user_id = u_tl.id
      LEFT JOIN USERS u_app ON cs.approved_by_user_id = u_app.id
      ${whereSql}
      ORDER BY cs.created_at DESC
    `, queryParams);

    res.json({ success: true, count: shares.length, shares: shares || [] });
  } catch (error) {
    console.error('getCandidateShares error:', error);
    res.status(500).json({ success: false, message: 'Error fetching candidate shares.', error: error.message });
  }
};

const proposeCandidateShare = async (req, res) => {
  try {
    const { candidate_id, job_id, client_id, candidate_consent, consent_notes, share_scope = 'summary_only' } = req.body;
    const userRole = (req.user?.role || '').toLowerCase();
    const userId = req.user?.id;
    const scope = await getUserScope(userId, userRole);

    if (!candidate_id) {
      return res.status(400).json({ success: false, message: 'Candidate ID is required.' });
    }

    // Verify user has authorized data-level access to this candidate
    const hasAccess = await canAccessCandidate(userId, userRole, candidate_id, scope, true);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        code: 'SCOPE_ACCESS_DENIED',
        message: 'Cannot propose sharing for a candidate outside your assigned scope.'
      });
    }

    // If job specified, ensure it is within user's assigned scope
    if (job_id && !scope.isGlobal && userRole === 'recruiter') {
      if (!scope.jobIds || !scope.jobIds.includes(job_id)) {
        return res.status(403).json({
          success: false,
          code: 'SCOPE_ACCESS_DENIED',
          message: 'Cannot propose sharing for a job outside your assigned scope.'
        });
      }
    }

    const shareId = uuidv4();
    // Cryptographically secure unpredictable token generated up front
    const shareToken = crypto.randomBytes(32).toString('hex');

    await db.query(`
      INSERT INTO CANDIDATE_SHARING (
        id, candidate_id, client_id, job_id, share_token, status,
        candidate_consent, consent_notes, share_scope, proposed_by_user_id
      ) VALUES (?, ?, ?, ?, ?, 'PROPOSED', ?, ?, ?, ?)
    `, [
      shareId, candidate_id, client_id || null, job_id || null, shareToken,
      candidate_consent ? 1 : 0, consent_notes || 'Consent verified with candidate',
      share_scope || 'summary_only', req.user.id
    ]);

    await logActivity({
      performed_by: req.user.id,
      action_type: 'PROPOSE_CANDIDATE_SHARE',
      entity_type: 'CANDIDATE_SHARING',
      entity_id: shareId,
      description: `Proposed candidate sharing submission for review`
    });

    res.status(201).json({ success: true, message: 'Candidate submission proposed for TL review.', share_id: shareId });
  } catch (error) {
    console.error('proposeCandidateShare error:', error);
    res.status(500).json({ success: false, message: 'Error proposing candidate share.', error: error.message });
  }
};

const reviewCandidateShare = async (req, res) => {
  try {
    const { id } = req.params;
    const { candidate_consent, consent_notes, share_scope } = req.body;
    const userRole = (req.user?.role || '').toLowerCase();
    const userId = req.user?.id;
    const scope = await getUserScope(userId, userRole);

    const [share] = await db.query('SELECT * FROM CANDIDATE_SHARING WHERE id = ?', [id]);
    if (!share) {
      return res.status(404).json({ success: false, message: 'Sharing proposal not found.' });
    }

    // TL Scope validation
    if (userRole === 'tl_coordinator' && !scope.isGlobal) {
      const allowed = (share.job_id && scope.jobIds.includes(share.job_id)) ||
                      (share.client_id && scope.clientIds.includes(share.client_id)) ||
                      share.proposed_by_user_id === userId;
      if (!allowed) {
        return res.status(403).json({
          success: false,
          code: 'SCOPE_ACCESS_DENIED',
          message: 'Cannot review candidate share outside your assigned team or client scope.'
        });
      }
    }

    await db.query(`
      UPDATE CANDIDATE_SHARING 
      SET status = 'TL_REVIEWED', tl_reviewed_by_user_id = ?,
          candidate_consent = COALESCE(?, candidate_consent),
          consent_notes = COALESCE(?, consent_notes),
          share_scope = COALESCE(?, share_scope)
      WHERE id = ?
    `, [req.user.id, candidate_consent ? 1 : 0, consent_notes || null, share_scope || null, id]);

    await logActivity({
      performed_by: req.user.id,
      action_type: 'TL_REVIEW_CANDIDATE_SHARE',
      entity_type: 'CANDIDATE_SHARING',
      entity_id: id,
      description: `TL reviewed and forwarded candidate submission for Director approval`
    });

    res.json({ success: true, message: 'Candidate submission reviewed and forwarded to Director.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error reviewing candidate share.', error: error.message });
  }
};

const approveCandidateShare = async (req, res) => {
  try {
    const { id } = req.params;
    const paymentException = req.body.payment_exception || req.body.payment_exception_approved;
    const exceptionReason = req.body.exception_reason || req.body.payment_exception_reason;
    const callerRole = (req.user?.role || '').toLowerCase();

    // Check authority: Director/Main Admin, or TL if explicitly granted in ROLE_PERMISSIONS
    let hasApprovalAuthority = callerRole === 'director' || callerRole === 'main_admin' || req.user?.is_main_admin === 1;
    if (!hasApprovalAuthority && callerRole === 'tl_coordinator') {
      const [tlPerm] = await db.query(`
        SELECT is_granted FROM ROLE_PERMISSIONS 
        WHERE role_key = 'tl_coordinator' AND module = 'candidate_sharing' AND action = 'approve'
      `);
      if (tlPerm && tlPerm.is_granted === 1) {
        hasApprovalAuthority = true;
      }
    }

    if (!hasApprovalAuthority) {
      return res.status(403).json({
        success: false,
        code: 'DIRECTOR_REQUIRED',
        message: 'Forbidden. Candidate sharing approval requires Director authorization or explicitly granted permission.'
      });
    }

    // Verify candidate consent is verified server-side
    const [share] = await db.query('SELECT * FROM CANDIDATE_SHARING WHERE id = ?', [id]);
    if (!share) {
      return res.status(404).json({ success: false, message: 'Sharing proposal not found.' });
    }

    if (!share.candidate_consent) {
      return res.status(400).json({
        success: false,
        message: 'Cannot approve sharing without candidate consent. Please verify consent first.'
      });
    }

    // Verify commercial payment eligibility
    let isPaymentEligible = Boolean(share.payment_verified);
    let isException = false;

    if (!isPaymentEligible && (share.job_id || share.client_id)) {
      const commercials = await db.query(`
        SELECT id, payment_status FROM RECRUITMENT_COMMERCIALS
        WHERE (job_id IS NOT NULL AND job_id = ?)
           OR (client_id IS NOT NULL AND client_id = ?)
        ORDER BY created_at DESC
      `, [share.job_id || 'none', share.client_id || 'none']);

      if (commercials.length > 0 && commercials.some(c => c.payment_status === 'VERIFIED')) {
        isPaymentEligible = true;
      }
    }

    // Check if Director explicitly grants a payment exception
    if (!isPaymentEligible && paymentException && (callerRole === 'director' || callerRole === 'main_admin')) {
      if (!exceptionReason || !exceptionReason.trim()) {
        return res.status(400).json({
          success: false,
          message: 'An exception reason is required when approving candidate share without verified payment.'
        });
      }
      isPaymentEligible = true;
      isException = true;
    }

    if (!isPaymentEligible) {
      return res.status(400).json({
        success: false,
        code: 'PAYMENT_VERIFICATION_REQUIRED',
        message: 'Cannot activate candidate sharing. Client commercial payment is not verified. A verified payment or an authorized Director exception is required.'
      });
    }

    // Set 14-day expiry date
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    await db.query(`
      UPDATE CANDIDATE_SHARING 
      SET status = 'APPROVED', approved_by_user_id = ?, expires_at = ?,
          payment_verified = ?, payment_exception_approved = ?,
          payment_exception_reason = ?, payment_exception_by_user_id = ?
      WHERE id = ?
    `, [
      req.user.id, expiresAt,
      isPaymentEligible && !isException ? 1 : 0,
      isException ? 1 : 0,
      isException ? exceptionReason.trim() : null,
      isException ? req.user.id : null,
      id
    ]);

    await logActivity({
      performed_by: req.user.id,
      action_type: 'APPROVE_CANDIDATE_SHARE',
      entity_type: 'CANDIDATE_SHARING',
      entity_id: id,
      description: `Approved candidate sharing. Token activated with 14-day validity.${isException ? ' (Director Payment Exception Approved)' : ''}`
    });

    res.json({
      success: true,
      message: 'Candidate share approved. Secure link generated.',
      share_token: share.share_token,
      share_url: `/admin/share/${share.share_token}`,
      expires_at: expiresAt
    });
  } catch (error) {
    console.error('approveCandidateShare error:', error);
    res.status(500).json({ success: false, message: 'Error approving candidate share.', error: error.message });
  }
};

const revokeCandidateShare = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("UPDATE CANDIDATE_SHARING SET status = 'REVOKED' WHERE id = ?", [id]);

    await logActivity({
      performed_by: req.user.id,
      action_type: 'REVOKE_CANDIDATE_SHARE',
      entity_type: 'CANDIDATE_SHARING',
      entity_id: id,
      description: `Revoked candidate share link`
    });

    res.json({ success: true, message: 'Candidate share link has been revoked.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error revoking candidate share.', error: error.message });
  }
};

// Public Secure Shared Candidate Profile Viewer (token-based, safe sanitization)
const getSharedProfileByToken = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token || token.length < 32) {
      return res.status(400).json({ success: false, message: 'Invalid sharing token.' });
    }

    const shares = await db.query('SELECT * FROM CANDIDATE_SHARING WHERE share_token = ?', [token]);
    if (!shares || shares.length === 0) {
      return res.status(404).json({ success: false, message: 'Share link not found or invalid.' });
    }

    const share = shares[0];

    if (share.status === 'REVOKED') {
      return res.status(410).json({
        success: false,
        message: 'This candidate sharing link has been revoked.'
      });
    }

    if (share.status !== 'APPROVED') {
      return res.status(403).json({
        success: false,
        message: 'This candidate submission is pending internal approval.'
      });
    }

    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return res.status(410).json({ success: false, message: 'This candidate sharing link has expired.' });
    }

    // Load sanitized candidate details — no recruiter internal notes, no candidate contact details leaked
    const [cand] = await db.query(`
      SELECT 
        c.id, c.name, c.professional_headline, c.current_location,
        c.total_experience, c.current_organization, c.current_designation,
        c.professional_summary, c.preferred_location
      FROM CANDIDATES c
      WHERE c.id = ?
    `, [share.candidate_id]);

    if (!cand) {
      return res.status(404).json({ success: false, message: 'Candidate record not found.' });
    }

    const experience = await db.query('SELECT organization, designation, from_date, to_date, is_currently_working, key_achievements FROM CANDIDATE_EXPERIENCE WHERE candidate_id = ? ORDER BY from_date DESC', [share.candidate_id]);
    const education = await db.query('SELECT degree, institution, specialization, year FROM CANDIDATE_EDUCATION WHERE candidate_id = ? ORDER BY year DESC', [share.candidate_id]);
    const projects = await db.query('SELECT project_name, role, description, technologies FROM CANDIDATE_PROJECT WHERE candidate_id = ? ORDER BY created_at DESC', [share.candidate_id]);
    const skills = await db.query(`
      SELECT s.name, s.category 
      FROM CANDIDATE_SKILL cs 
      JOIN SKILL s ON cs.skill_id = s.id 
      WHERE cs.candidate_id = ?
    `, [share.candidate_id]);

    // Resume is ONLY shared if share_scope explicitly authorizes it
    let resumeData = null;
    if (share.share_scope === 'with_resume' || share.share_scope === 'full') {
      const resumes = await db.query('SELECT file_name, file_url FROM CANDIDATE_RESUME WHERE candidate_id = ? AND is_primary = 1 LIMIT 1', [share.candidate_id]);
      if (resumes && resumes.length > 0) {
        resumeData = resumes[0];
      }
    }

    res.json({
      success: true,
      profile: {
        ...cand,
        experience: experience || [],
        education: education || [],
        projects: projects || [],
        skills: skills || [],
        resume: resumeData
      },
      share_meta: {
        expires_at: share.expires_at,
        created_at: share.created_at
      }
    });
  } catch (error) {
    console.error('getSharedProfileByToken error:', error);
    res.status(500).json({ success: false, message: 'Error retrieving shared candidate.', error: error.message });
  }
};

// 6. Recruitment Enquiries (Contact Us & Executive Service)
const getAllEmployerEnquiries = async (req, res) => {
  try {
    const userRole = (req.user?.role || '').toLowerCase();
    const userId = req.user?.id;
    let query = `
      SELECT 
        eq.*, 
        COALESCE(eq.company_name, e.company_name) as company_name,
        COALESCE(eq.source, eq.enquiry_type) as enquiry_source,
        COALESCE(eq.subject, j.title, eq.enquiry_type) as display_subject,
        j.title as job_title,
        c.name as candidate_name,
        u_assign.email as assigned_to_email
      FROM EMPLOYER_ENQUIRY eq
      LEFT JOIN EMPLOYERS e ON eq.employer_id = e.id
      LEFT JOIN JOB j ON eq.job_id = j.id
      LEFT JOIN APPLICATION a ON eq.application_id = a.id
      LEFT JOIN CANDIDATES c ON a.candidate_id = c.id
      LEFT JOIN USERS u_assign ON eq.assigned_to_user_id = u_assign.id
    `;
    const { search, status, source } = req.query;
    let whereClauses = [];
    let params = [];

    // TL / Coordinator only views assigned enquiries unless Director
    if (userRole === 'tl_coordinator') {
      whereClauses.push('(eq.assigned_to_user_id = ? OR eq.assigned_to_user_id IS NULL)');
      params.push(userId);
    }

    if (status && status !== 'all') {
      whereClauses.push('LOWER(eq.status) = ?');
      params.push(status.toLowerCase());
    }

    if (source && source !== 'all') {
      whereClauses.push('(eq.source = ? OR eq.enquiry_type = ?)');
      params.push(source, source);
    }

    if (search && search.trim()) {
      whereClauses.push('(LOWER(eq.contact_name) LIKE ? OR LOWER(eq.contact_email) LIKE ? OR LOWER(eq.company_name) LIKE ? OR LOWER(eq.subject) LIKE ? OR LOWER(e.company_name) LIKE ?)');
      const term = `%${search.trim().toLowerCase()}%`;
      params.push(term, term, term, term, term);
    }

    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }

    query += ' ORDER BY eq.created_at DESC';

    const enquiries = await db.query(query, params);

    // Mask contact details for non-directors
    const isDirector = userRole === 'director' || userRole === 'main_admin' || req.user?.is_main_admin === 1;
    const sanitized = enquiries.map(enq => ({
      ...enq,
      contact_email: isDirector ? enq.contact_email : (enq.contact_email ? maskEmail(enq.contact_email) : null),
      contact_phone: isDirector ? enq.contact_phone : (enq.contact_phone ? maskPhone(enq.contact_phone) : null)
    }));

    res.json({ success: true, count: sanitized.length, enquiries: sanitized });
  } catch (error) {
    console.error('getAllEmployerEnquiries error:', error);
    res.status(500).json({ success: false, message: 'Error fetching enquiries.', error: error.message });
  }
};

const assignEnquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const { assigned_to_user_id } = req.body;

    await db.query('UPDATE EMPLOYER_ENQUIRY SET assigned_to_user_id = ?, status = "ASSIGNED" WHERE id = ?', [assigned_to_user_id, id]);

    await logActivity({
      performed_by: req.user.id,
      action_type: 'ASSIGN_ENQUIRY',
      entity_type: 'ENQUIRY',
      entity_id: id,
      description: `Assigned recruitment enquiry to coordinator`
    });

    res.json({ success: true, message: 'Enquiry assigned successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error assigning enquiry.', error: error.message });
  }
};

const updateEnquiryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assigned_to_user_id } = req.body;

    const validStatuses = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'new', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid enquiry status.' });
    }

    if (assigned_to_user_id) {
      await db.query('UPDATE EMPLOYER_ENQUIRY SET status = ?, assigned_to_user_id = ? WHERE id = ?', [status.toUpperCase(), assigned_to_user_id, id]);
    } else {
      await db.query('UPDATE EMPLOYER_ENQUIRY SET status = ? WHERE id = ?', [status.toUpperCase(), id]);
    }

    await logActivity({
      performed_by: req.user.id,
      action_type: 'UPDATE_ENQUIRY_STATUS',
      entity_type: 'ENQUIRY',
      entity_id: id,
      description: `Updated enquiry status to ${status.toUpperCase()}`
    });

    res.json({ success: true, message: `Enquiry status updated to ${status}.` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating enquiry.', error: error.message });
  }
};

const updateEnquiryDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, follow_up_date, assigned_to_user_id } = req.body;
    const userRole = (req.user?.role || '').toLowerCase();
    const userId = req.user?.id;

    // Check scope if TL
    if (userRole === 'tl_coordinator') {
      const [existing] = await db.query('SELECT assigned_to_user_id FROM EMPLOYER_ENQUIRY WHERE id = ?', [id]);
      if (existing && existing.assigned_to_user_id && existing.assigned_to_user_id !== userId) {
        return res.status(403).json({ success: false, code: 'SCOPE_ACCESS_DENIED', message: 'Cannot edit enquiry outside your assigned scope.' });
      }
    }

    const updates = [];
    const params = [];

    if (status) {
      const validStatuses = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
      if (!validStatuses.includes(status.toUpperCase())) {
        return res.status(400).json({ success: false, message: 'Invalid enquiry status.' });
      }
      updates.push('status = ?');
      params.push(status.toUpperCase());
    }

    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }

    if (follow_up_date !== undefined) {
      updates.push('follow_up_date = ?');
      params.push(follow_up_date || null);
    }

    if (assigned_to_user_id !== undefined) {
      updates.push('assigned_to_user_id = ?');
      params.push(assigned_to_user_id || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields provided for update.' });
    }

    params.push(id);
    await db.query(`UPDATE EMPLOYER_ENQUIRY SET ${updates.join(', ')} WHERE id = ?`, params);

    await logActivity({
      performed_by: req.user.id,
      action_type: 'UPDATE_ENQUIRY_DETAILS',
      entity_type: 'ENQUIRY',
      entity_id: id,
      description: `Updated enquiry details${status ? ` (Status: ${status.toUpperCase()})` : ''}`
    });

    res.json({ success: true, message: 'Enquiry details updated successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating enquiry details.', error: error.message });
  }
};

const convertEnquiryToRequirement = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title, description, location, openings_count, client_id,
      assigned_recruiter_id, internal_notes
    } = req.body;

    const [enq] = await db.query('SELECT * FROM EMPLOYER_ENQUIRY WHERE id = ?', [id]);
    if (!enq) {
      return res.status(404).json({ success: false, message: 'Enquiry not found.' });
    }
    if (enq.job_id) {
      return res.status(409).json({
        success: false,
        message: 'This enquiry has already been converted to a recruitment requirement.',
        job_id: enq.job_id
      });
    }

    const jobId = uuidv4();
    const jobTitle = (title || enq.subject || 'Executive Mandate').trim();
    const jobLocation = (location || enq.location || 'Remote / Flexible').trim();
    const openings = parseInt(openings_count || enq.openings_count) || 1;
    const jobDesc = description || enq.message || `Executive search requirement converted from enquiry #${id}`;
    const notes = internal_notes || enq.notes || `Converted from ${enq.source || 'Enquiry'} (${enq.contact_name || ''} - ${enq.company_name || ''})`;

    // Insert private Executive Search requirement
    await db.query(`
      INSERT INTO JOB (
        id, client_id, employer_id, title, department, job_domain,
        employment_type, workplace_type, location, openings_count,
        description, internal_notes, status, is_internal_only,
        assigned_recruiter_id, created_by_user_id, created_by_type, source_type
      ) VALUES (?, ?, ?, ?, 'Executive Search', 'Leadership', 'Full Time', 'Hybrid', ?, ?, ?, ?, 'draft', 1, ?, ?, 'INTERNAL_STAFF', 'EXECUTIVE_SEARCH')
    `, [
      jobId, client_id || null, enq.employer_id || null, jobTitle,
      jobLocation, openings, jobDesc, notes,
      assigned_recruiter_id || null, req.user.id
    ]);

    // If recruiter assigned, create scoping in USER_ASSIGNMENTS
    if (assigned_recruiter_id) {
      const assignId = uuidv4();
      await db.query(`
        INSERT INTO USER_ASSIGNMENTS (id, user_id, assigned_job_id, scope_type)
        VALUES (?, ?, ?, 'scoped')
      `, [assignId, assigned_recruiter_id, jobId]);
    }

    // Update enquiry status to IN_PROGRESS and link job_id
    await db.query(`
      UPDATE EMPLOYER_ENQUIRY 
      SET status = 'IN_PROGRESS', job_id = ?, notes = CONCAT(COALESCE(notes, ''), '\n[Requirement Created: ', ?)
      WHERE id = ?
    `, [jobId, jobId, id]);

    await logActivity({
      performed_by: req.user.id,
      action_type: 'CONVERT_ENQUIRY_TO_REQUIREMENT',
      entity_type: 'JOB',
      entity_id: jobId,
      description: `Converted Executive Service enquiry #${id} into Recruitment Requirement: ${jobTitle}`
    });

    res.status(201).json({
      success: true,
      message: 'Enquiry converted into Executive Search requirement.',
      job_id: jobId
    });
  } catch (error) {
    console.error('convertEnquiryToRequirement error:', error);
    res.status(500).json({ success: false, message: 'Error converting enquiry.', error: error.message });
  }
};

// 7. Employers & Clients Directory
const getAllEmployers = async (req, res) => {
  try {
    const { search, status } = req.query;
    const userRole = (req.user?.role || '').toLowerCase();
    const userId = req.user?.id;
    const scope = await getUserScope(userId, userRole);

    let whereClauses = [];
    let queryParams = [];

    // TL record-level scoping
    if (userRole === 'tl_coordinator' && !scope.isGlobal) {
      if (scope.clientIds.length === 0) {
        whereClauses.push('1 = 0');
      } else {
        whereClauses.push('e.id IN (?)');
        queryParams.push(scope.clientIds);
      }
    }

    if (status && status !== 'all') {
      whereClauses.push('e.approval_status = ?');
      queryParams.push(status);
    }

    if (search && search.trim()) {
      whereClauses.push('(LOWER(e.company_name) LIKE ? OR LOWER(e.industry) LIKE ? OR LOWER(e.contact_email) LIKE ?)');
      const term = `%${search.trim().toLowerCase()}%`;
      queryParams.push(term, term, term);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const employers = await db.query(`
      SELECT 
        e.*,
        u.email as user_email, u.is_active as user_active,
        (SELECT COUNT(*) FROM JOB j WHERE j.employer_id = e.id) as active_jobs_count
      FROM EMPLOYERS e
      LEFT JOIN USERS u ON e.user_id = u.id
      ${whereSql}
      ORDER BY e.company_name ASC
    `, queryParams);

    res.json({ success: true, count: employers.length, employers: employers || [] });
  } catch (error) {
    console.error('getAllEmployers error:', error);
    res.status(500).json({ success: false, message: 'Error fetching employers.', error: error.message });
  }
};

const approveEmployer = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("UPDATE EMPLOYERS SET approval_status = 'approved' WHERE id = ?", [id]);
    await logActivity({
      performed_by: req.user.id,
      action_type: 'APPROVE_EMPLOYER',
      entity_type: 'EMPLOYER',
      entity_id: id,
      description: `Approved employer account`
    });
    res.json({ success: true, message: 'Employer account approved.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error approving employer.', error: error.message });
  }
};

const rejectEmployer = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("UPDATE EMPLOYERS SET approval_status = 'rejected' WHERE id = ?", [id]);
    await logActivity({
      performed_by: req.user.id,
      action_type: 'REJECT_EMPLOYER',
      entity_type: 'EMPLOYER',
      entity_id: id,
      description: `Rejected employer account`
    });
    res.json({ success: true, message: 'Employer account rejected.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error rejecting employer.', error: error.message });
  }
};

// 8. Leads Management (BD Lead workflow)
const getAllLeads = async (req, res) => {
  try {
    const userRole = (req.user?.role || '').toLowerCase();
    const userId = req.user?.id;
    const { status, search } = req.query;

    let whereClauses = [];
    let queryParams = [];

    // BD Lead only views own leads unless Director
    if (userRole === 'bd_lead') {
      whereClauses.push('(l.assigned_bd_user_id = ? OR l.assigned_bd_user_id IS NULL)');
      queryParams.push(userId);
    }

    if (status && status !== 'all') {
      whereClauses.push('l.status = ?');
      queryParams.push(status);
    }

    if (search && search.trim()) {
      whereClauses.push('(LOWER(l.company_name) LIKE ? OR LOWER(l.contact_person) LIKE ? OR LOWER(l.email) LIKE ?)');
      const term = `%${search.trim().toLowerCase()}%`;
      queryParams.push(term, term, term);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const leads = await db.query(`
      SELECT 
        l.*,
        u_bd.email as assigned_bd_email,
        u_tl.email as handed_over_to_email
      FROM LEADS l
      LEFT JOIN USERS u_bd ON l.assigned_bd_user_id = u_bd.id
      LEFT JOIN USERS u_tl ON l.handed_over_to_user_id = u_tl.id
      ${whereSql}
      ORDER BY l.created_at DESC
    `, queryParams);

    res.json({ success: true, count: leads.length, leads: leads || [] });
  } catch (error) {
    console.error('getAllLeads error:', error);
    res.status(500).json({ success: false, message: 'Error fetching leads.', error: error.message });
  }
};

const createLead = async (req, res) => {
  try {
    const {
      company_name, contact_person, email, phone,
      industry, location, source, notes, follow_up_date
    } = req.body;

    if (!company_name || !contact_person || !email) {
      return res.status(400).json({ success: false, message: 'Company name, contact person, and email are required.' });
    }

    const id = uuidv4();
    await db.query(`
      INSERT INTO LEADS (
        id, company_name, contact_person, email, phone,
        industry, location, source, status, notes, follow_up_date, assigned_bd_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'NEW', ?, ?, ?)
    `, [
      id, company_name.trim(), contact_person.trim(), email.trim().toLowerCase(), phone || null,
      industry || null, location || null, source || 'Direct', notes || null, follow_up_date || null, req.user.id
    ]);

    await logActivity({
      performed_by: req.user.id,
      action_type: 'CREATE_LEAD',
      entity_type: 'LEAD',
      entity_id: id,
      description: `Created new BD lead: ${company_name} (${contact_person})`
    });

    res.status(201).json({ success: true, message: 'Lead created successfully.', lead_id: id });
  } catch (error) {
    console.error('createLead error:', error);
    res.status(500).json({ success: false, message: 'Error creating lead.', error: error.message });
  }
};

const updateLead = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, follow_up_date, phone, location } = req.body;

    await db.query(`
      UPDATE LEADS 
      SET status = COALESCE(?, status),
          notes = COALESCE(?, notes),
          follow_up_date = COALESCE(?, follow_up_date),
          phone = COALESCE(?, phone),
          location = COALESCE(?, location)
      WHERE id = ?
    `, [status || null, notes || null, follow_up_date || null, phone || null, location || null, id]);

    await logActivity({
      performed_by: req.user.id,
      action_type: 'UPDATE_LEAD',
      entity_type: 'LEAD',
      entity_id: id,
      description: `Updated BD lead${status ? ` status to '${status}'` : ''}`
    });

    res.json({ success: true, message: 'Lead updated successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating lead.', error: error.message });
  }
};

const handoverLead = async (req, res) => {
  try {
    const { id } = req.params;
    const { handed_over_to_user_id, handover_notes } = req.body;

    if (!handed_over_to_user_id) {
      return res.status(400).json({ success: false, message: 'Select a TL / Coordinator to hand over the lead to.' });
    }

    await db.query(`
      UPDATE LEADS 
      SET status = 'HANDED_OVER',
          handed_over_to_user_id = ?,
          handover_notes = ?
      WHERE id = ?
    `, [handed_over_to_user_id, handover_notes || 'Handed over for recruitment coordination', id]);

    await logActivity({
      performed_by: req.user.id,
      action_type: 'HANDOVER_LEAD',
      entity_type: 'LEAD',
      entity_id: id,
      description: `Handed over lead to TL / Client Coordinator`
    });

    res.json({ success: true, message: 'Lead successfully handed over to TL Coordinator.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error handing over lead.', error: error.message });
  }
};

// Helper for hierarchical team and reporting validation
const validateReportingHierarchy = async (userId, targetReportingUserId) => {
  if (!targetReportingUserId) return { valid: true };

  if (userId && String(userId) === String(targetReportingUserId)) {
    return { valid: false, message: 'A team member cannot be their own reporting head.' };
  }

  const targetUsers = await db.query('SELECT id, role, is_active, reporting_user_id FROM USERS WHERE id = ?', [targetReportingUserId]);
  if (!targetUsers || targetUsers.length === 0) {
    return { valid: false, message: 'Reporting head does not exist.' };
  }

  const target = targetUsers[0];
  if (target.is_active !== 1) {
    return { valid: false, message: 'Reporting head account is inactive or paused.' };
  }

  // Circular loop check: traverse up from targetReportingUserId
  let currentHeadId = target.reporting_user_id;
  const visited = new Set([targetReportingUserId]);
  while (currentHeadId) {
    if (userId && String(currentHeadId) === String(userId)) {
      return { valid: false, message: 'Circular reporting relationship detected. A user cannot report to a subordinate.' };
    }
    if (visited.has(currentHeadId)) {
      return { valid: false, message: 'Circular reporting cycle detected in team hierarchy.' };
    }
    visited.add(currentHeadId);
    const heads = await db.query('SELECT reporting_user_id FROM USERS WHERE id = ?', [currentHeadId]);
    currentHeadId = heads && heads.length > 0 ? heads[0].reporting_user_id : null;
  }

  return { valid: true };
};

// 9. Team Management & Assignment
const getAllUsers = async (req, res) => {
  try {
    const users = await db.query(`
      SELECT 
        u.id, u.email, u.name, u.phone, u.role, u.is_main_admin, u.is_active, u.reporting_user_id, u.profile_photo_url, u.created_at,
        head.name as reporting_head_name, head.email as reporting_head_email,
        r.display_name as role_display_name,
        ua.team_id, t.name as team_name, ua.scope_type
      FROM USERS u
      LEFT JOIN ROLES r ON u.role = r.role_key
      LEFT JOIN USERS head ON u.reporting_user_id = head.id
      LEFT JOIN USER_ASSIGNMENTS ua ON u.id = ua.user_id
      LEFT JOIN TEAMS t ON ua.team_id = t.id
      ORDER BY u.created_at DESC
    `);
    res.json({ success: true, count: users.length, users: users || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching users.', error: error.message });
  }
};

const createEmployee = async (req, res) => {
  try {
    const { name, email, password, role, phone, team_id, reporting_user_id, scope_type, profile_photo_url } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Email, password, and role are required.' });
    }

    const cleanRole = role.toLowerCase().trim();
    const cleanEmail = email.trim().toLowerCase();
    const existing = await db.query('SELECT id FROM USERS WHERE LOWER(email) = ?', [cleanEmail]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Reporting hierarchy check
    let effectiveReportingHead = reporting_user_id ? reporting_user_id.trim() : null;
    if (cleanRole === 'director') {
      effectiveReportingHead = null; // Director has no reporting head
    } else if (effectiveReportingHead) {
      const hierCheck = await validateReportingHierarchy(null, effectiveReportingHead);
      if (!hierCheck.valid) {
        return res.status(400).json({ success: false, message: hierCheck.message });
      }
    } else {
      // Default non-director to Director if no head specified
      const directorUser = await db.query("SELECT id FROM USERS WHERE (role = 'director' OR is_main_admin = 1) AND is_active = 1 LIMIT 1");
      if (directorUser && directorUser.length > 0) {
        effectiveReportingHead = directorUser[0].id;
      }
    }

    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    const isMainAdmin = (cleanRole === 'director' || cleanRole === 'main_admin') ? 1 : 0;

    await db.query(`
      INSERT INTO USERS (id, email, password_hash, role, phone, is_main_admin, is_active, name, reporting_user_id, profile_photo_url)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
    `, [
      userId, cleanEmail, passwordHash, cleanRole, phone || null, isMainAdmin,
      name ? name.trim() : null, effectiveReportingHead, profile_photo_url ? profile_photo_url.trim() : null
    ]);

    // Create assignment if provided
    if (team_id || scope_type) {
      const assignId = uuidv4();
      const targetScopeType = scope_type || (['recruiter', 'tl_coordinator', 'bd_lead'].includes(cleanRole) ? 'scoped' : 'global');
      await db.query(`
        INSERT INTO USER_ASSIGNMENTS (id, user_id, team_id, scope_type)
        VALUES (?, ?, ?, ?)
      `, [assignId, userId, team_id || null, targetScopeType]);
    }

    await logActivity({
      performed_by: req.user.id,
      action_type: 'CREATE_TEAM_MEMBER',
      entity_type: 'USER',
      entity_id: userId,
      description: `Created team account: ${cleanEmail} (Role: ${cleanRole}, Head: ${effectiveReportingHead || 'None'})`
    });

    res.status(201).json({ success: true, message: 'Team member account created successfully.', user_id: userId });
  } catch (error) {
    console.error('createEmployee error:', error);
    res.status(500).json({ success: false, message: 'Error creating team account.', error: error.message });
  }
};

const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const users = await db.query('SELECT id, is_active, email, role, is_main_admin FROM USERS WHERE id = ?', [id]);
    if (users.length === 0) return res.status(404).json({ success: false, message: 'User not found.' });

    const newStatus = users[0].is_active ? 0 : 1;

    // Director protection: if deactivating a director, ensure at least one other active director exists!
    if (newStatus === 0 && (users[0].role === 'director' || users[0].is_main_admin === 1)) {
      const activeDirectors = await db.query(
        "SELECT COUNT(*) as count FROM USERS WHERE (role = 'director' OR is_main_admin = 1) AND is_active = 1 AND id != ?",
        [id]
      );
      if (!activeDirectors[0] || activeDirectors[0].count === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot deactivate the sole active Director account. The system requires at least one active Director.'
        });
      }
    }

    await db.query('UPDATE USERS SET is_active = ? WHERE id = ?', [newStatus, id]);

    await logActivity({
      performed_by: req.user.id,
      action_type: 'TOGGLE_USER_STATUS',
      entity_type: 'USER',
      entity_id: id,
      description: `Changed user status to ${newStatus ? 'active' : 'deactivated'} for ${users[0].email}`
    });

    res.json({ success: true, message: `User account ${newStatus ? 'activated' : 'deactivated'}.` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error toggling user status.', error: error.message });
  }
};

const getAdminSelfProfile = async (req, res) => {
  try {
    const users = await db.query(`
      SELECT 
        u.id, u.email, u.name, u.phone, u.role, u.is_main_admin, u.is_active, u.reporting_user_id, u.profile_photo_url, u.created_at,
        r.display_name as role_display_name,
        head.name as reporting_head_name, head.email as reporting_head_email,
        ua.team_id, t.name as team_name, ua.scope_type
      FROM USERS u
      LEFT JOIN ROLES r ON u.role = r.role_key
      LEFT JOIN USERS head ON u.reporting_user_id = head.id
      LEFT JOIN USER_ASSIGNMENTS ua ON u.id = ua.user_id
      LEFT JOIN TEAMS t ON ua.team_id = t.id
      WHERE u.id = ?
    `, [req.user.id]);

    if (users.length === 0) return res.status(404).json({ success: false, message: 'User not found.' });

    const permissions = await db.query(
      'SELECT module, action FROM ROLE_PERMISSIONS WHERE role_key = ? AND is_granted = 1',
      [users[0].role]
    );

    res.json({
      success: true,
      profile: {
        ...users[0],
        permissions: permissions || []
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching self profile.', error: error.message });
  }
};

const updateAdminSelfProfile = async (req, res) => {
  try {
    const { name, phone, profile_photo_url } = req.body;
    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name ? name.trim() : null);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      params.push(phone ? phone.trim() : null);
    }
    if (profile_photo_url !== undefined) {
      updates.push('profile_photo_url = ?');
      params.push(profile_photo_url ? profile_photo_url.trim() : null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No editable personal profile fields provided.' });
    }

    params.push(req.user.id);
    await db.query(`UPDATE USERS SET ${updates.join(', ')} WHERE id = ?`, params);

    await logActivity({
      performed_by: req.user.id,
      action_type: 'UPDATE_SELF_PROFILE',
      entity_type: 'USER',
      entity_id: req.user.id,
      description: 'Updated personal profile details'
    });

    const refreshed = await db.query('SELECT id, email, name, phone, role, profile_photo_url FROM USERS WHERE id = ?', [req.user.id]);
    res.json({ success: true, message: 'Profile updated successfully.', profile: refreshed[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating self profile.', error: error.message });
  }
};

const uploadAdminProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an image file.' });
    }
    const userId = req.user.id;
    const folder = 'vakancy/profile_photos';
    const safePublicId = `staff_${userId}_${Date.now()}`;

    const cloudinaryResult = await uploadBufferToCloudinary(req.file.buffer, {
      folder,
      public_id: safePublicId,
      resource_type: 'image',
      mime_type: req.file.mimetype
    });

    const photoUrl = cloudinaryResult.secure_url;
    await db.query('UPDATE USERS SET profile_photo_url = ? WHERE id = ?', [photoUrl, userId]);

    await logActivity({
      performed_by: req.user.id,
      action_type: 'UPDATE_SELF_PROFILE',
      entity_type: 'USER',
      entity_id: userId,
      description: 'Uploaded and updated staff profile photo'
    });

    res.json({
      success: true,
      message: 'Profile photo uploaded successfully.',
      profile_photo_url: photoUrl
    });
  } catch (error) {
    console.error('Error uploading profile photo:', error);
    res.status(500).json({ success: false, message: 'Error uploading profile photo.', error: error.message });
  }
};

const updateAdminUserProfile = async (req, res) => {
  try {
    const callerRole = (req.user?.role || '').toLowerCase();
    if (callerRole !== 'director' && callerRole !== 'main_admin' && req.user?.is_main_admin !== 1) {
      return res.status(403).json({
        success: false,
        code: 'DIRECTOR_REQUIRED',
        message: 'Forbidden. Only the Director can edit staff administrative profiles.'
      });
    }

    const { id } = req.params;
    const targetUsers = await db.query('SELECT * FROM USERS WHERE id = ?', [id]);
    if (targetUsers.length === 0) return res.status(404).json({ success: false, message: 'Target user not found.' });

    const target = targetUsers[0];
    const {
      name, email, phone, role, reporting_user_id, team_id, scope_type, is_active, profile_photo_url
    } = req.body;

    // Hierarchy validation if changing reporting head
    if (reporting_user_id !== undefined && reporting_user_id !== null && reporting_user_id !== '') {
      const targetRole = (role !== undefined ? role : target.role).toLowerCase();
      if (targetRole === 'director') {
        return res.status(400).json({ success: false, message: 'Director cannot have a reporting head.' });
      }
      const hierCheck = await validateReportingHierarchy(id, reporting_user_id);
      if (!hierCheck.valid) {
        return res.status(400).json({ success: false, message: hierCheck.message });
      }
    }

    // Sole Director deactivation / role demotion safeguard
    const isTargetDirector = target.role === 'director' || target.is_main_admin === 1;
    const isDemotingOrDeactivating =
      (is_active !== undefined && Number(is_active) === 0) ||
      (role !== undefined && role.toLowerCase() !== 'director' && isTargetDirector);

    if (isTargetDirector && isDemotingOrDeactivating) {
      const activeDirectors = await db.query(
        "SELECT COUNT(*) as count FROM USERS WHERE (role = 'director' OR is_main_admin = 1) AND is_active = 1 AND id != ?",
        [id]
      );
      if (!activeDirectors[0] || activeDirectors[0].count === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot deactivate or change the role of the sole active Director.'
        });
      }
    }

    const userUpdates = [];
    const userParams = [];

    if (name !== undefined) { userUpdates.push('name = ?'); userParams.push(name ? name.trim() : null); }
    if (email !== undefined) { userUpdates.push('email = ?'); userParams.push(email.trim().toLowerCase()); }
    if (phone !== undefined) { userUpdates.push('phone = ?'); userParams.push(phone ? phone.trim() : null); }
    if (role !== undefined) {
      const cleanRole = role.toLowerCase();
      const isMainAdmin = (cleanRole === 'director' || cleanRole === 'main_admin') ? 1 : 0;
      userUpdates.push('role = ?', 'is_main_admin = ?');
      userParams.push(cleanRole, isMainAdmin);
    }
    if (reporting_user_id !== undefined) {
      const cleanHead = reporting_user_id ? reporting_user_id.trim() : null;
      userUpdates.push('reporting_user_id = ?');
      userParams.push(cleanHead);
    }
    if (is_active !== undefined) {
      userUpdates.push('is_active = ?');
      userParams.push(is_active ? 1 : 0);
    }
    if (profile_photo_url !== undefined) {
      userUpdates.push('profile_photo_url = ?');
      userParams.push(profile_photo_url ? profile_photo_url.trim() : null);
    }

    if (userUpdates.length > 0) {
      userParams.push(id);
      await db.query(`UPDATE USERS SET ${userUpdates.join(', ')} WHERE id = ?`, userParams);
    }

    // Update assignment if team or scope changed
    if (team_id !== undefined || scope_type !== undefined) {
      const existingAssign = await db.query('SELECT id FROM USER_ASSIGNMENTS WHERE user_id = ?', [id]);
      if (existingAssign && existingAssign.length > 0) {
        await db.query(
          'UPDATE USER_ASSIGNMENTS SET team_id = ?, scope_type = ? WHERE user_id = ?',
          [team_id || null, scope_type || 'scoped', id]
        );
      } else if (team_id || scope_type) {
        await db.query(
          'INSERT INTO USER_ASSIGNMENTS (id, user_id, team_id, scope_type) VALUES (?, ?, ?, ?)',
          [uuidv4(), id, team_id || null, scope_type || 'scoped']
        );
      }
    }

    await logActivity({
      performed_by: req.user.id,
      action_type: 'UPDATE_ADMIN_PROFILE',
      entity_type: 'USER',
      entity_id: id,
      description: `Director updated administrative profile of user ${target.email}`
    });

    res.json({ success: true, message: 'User administrative profile updated successfully.' });
  } catch (error) {
    console.error('updateAdminUserProfile error:', error);
    res.status(500).json({ success: false, message: 'Error updating user profile.', error: error.message });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const callerRole = (req.user?.role || '').toLowerCase();
    if (callerRole !== 'director' && callerRole !== 'main_admin' && req.user?.is_main_admin !== 1) {
      return res.status(403).json({
        success: false,
        code: 'DIRECTOR_REQUIRED',
        message: 'Forbidden. Only the Director can change user roles.'
      });
    }

    if (!role) return res.status(400).json({ success: false, message: 'Role is required.' });

    const isMainAdmin = (role === 'director' || role === 'main_admin') ? 1 : 0;
    await db.query('UPDATE USERS SET role = ?, is_main_admin = ? WHERE id = ?', [role.toLowerCase(), isMainAdmin, id]);

    await logActivity({
      performed_by: req.user.id,
      action_type: 'UPDATE_USER_ROLE',
      entity_type: 'USER',
      entity_id: id,
      description: `Assigned new role '${role}' to user`
    });

    res.json({ success: true, message: 'User role updated successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating user role.', error: error.message });
  }
};

const getTeams = async (req, res) => {
  try {
    const teams = await db.query(`
      SELECT t.*, u.email as lead_email,
        (SELECT COUNT(*) FROM USER_ASSIGNMENTS ua WHERE ua.team_id = t.id) as member_count
      FROM TEAMS t
      LEFT JOIN USERS u ON t.lead_user_id = u.id
      ORDER BY t.name ASC
    `);
    res.json({ success: true, teams: teams || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching teams.', error: error.message });
  }
};

const createTeam = async (req, res) => {
  try {
    const { name, lead_user_id, description } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ success: false, message: 'Team name is required.' });

    const id = uuidv4();
    await db.query(
      'INSERT INTO TEAMS (id, name, lead_user_id, description) VALUES (?, ?, ?, ?)',
      [id, name.trim(), lead_user_id || null, description || null]
    );

    res.status(201).json({ success: true, message: 'Team created successfully.', team_id: id });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating team.', error: error.message });
  }
};

// 10. Roles & Dynamic Permissions Matrix
const getRoles = async (req, res) => {
  try {
    const roles = await db.query('SELECT * FROM ROLES ORDER BY created_at ASC');
    res.json({ success: true, roles: roles || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching roles.', error: error.message });
  }
};

const getRolePermissions = async (req, res) => {
  try {
    const permissions = await db.query('SELECT * FROM ROLE_PERMISSIONS ORDER BY role_key, module, action');
    res.json({ success: true, permissions: permissions || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching permissions.', error: error.message });
  }
};

const updateRolePermissions = async (req, res) => {
  try {
    const { role_key, permissions } = req.body;
    const callerRole = (req.user?.role || '').toLowerCase();
    if (callerRole !== 'director' && callerRole !== 'main_admin' && req.user?.is_main_admin !== 1) {
      return res.status(403).json({
        success: false,
        code: 'DIRECTOR_REQUIRED',
        message: 'Forbidden. Only the Director can update the permissions matrix.'
      });
    }

    if (!role_key || !Array.isArray(permissions)) {
      return res.status(400).json({ success: false, message: 'Role key and permissions array are required.' });
    }

    for (const p of permissions) {
      if (p.module && p.action) {
        await db.query(`
          INSERT INTO ROLE_PERMISSIONS (id, role_key, module, action, is_granted)
          VALUES (?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE is_granted = VALUES(is_granted)
        `, [
          `perm-${role_key}-${p.module}-${p.action}`,
          role_key,
          p.module,
          p.action,
          p.is_granted ? 1 : 0
        ]);
      }
    }

    await logActivity({
      performed_by: req.user.id,
      action_type: 'UPDATE_PERMISSIONS',
      entity_type: 'ROLE',
      entity_id: role_key,
      description: `Updated permissions matrix for role '${role_key}'`
    });

    res.json({ success: true, message: `Permissions for role '${role_key}' updated successfully.` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating permissions.', error: error.message });
  }
};

const createCustomRole = async (req, res) => {
  try {
    const callerRole = (req.user?.role || '').toLowerCase();
    if (callerRole !== 'director' && callerRole !== 'main_admin' && req.user?.is_main_admin !== 1) {
      return res.status(403).json({
        success: false,
        code: 'DIRECTOR_REQUIRED',
        message: 'Forbidden. Only the Director can create custom roles.'
      });
    }

    const { role_key, display_name, description, permissions } = req.body;
    if (!role_key || !display_name) {
      return res.status(400).json({ success: false, message: 'Role key and display name are required.' });
    }

    const cleanKey = role_key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const existing = await db.query('SELECT id FROM ROLES WHERE role_key = ?', [cleanKey]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'A role with this key already exists.' });
    }

    const roleId = uuidv4();
    await db.query(
      'INSERT INTO ROLES (id, role_key, display_name, description, is_system) VALUES (?, ?, ?, ?, 0)',
      [roleId, cleanKey, display_name.trim(), description || null]
    );

    if (Array.isArray(permissions)) {
      for (const p of permissions) {
        if (p.module && p.action) {
          const permId = uuidv4();
          await db.query(`
            INSERT INTO ROLE_PERMISSIONS (id, role_key, module, action, is_granted)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE is_granted = VALUES(is_granted)
          `, [permId, cleanKey, p.module, p.action, p.is_granted ? 1 : 0]);
        }
      }
    }

    await logActivity({
      performed_by: req.user.id,
      action_type: 'CREATE_CUSTOM_ROLE',
      entity_type: 'ROLE',
      entity_id: cleanKey,
      description: `Created custom role '${display_name}' (${cleanKey})`
    });

    res.status(201).json({ success: true, message: 'Custom role created successfully.', role_id: roleId, role_key: cleanKey });
  } catch (error) {
    console.error('createCustomRole error:', error);
    res.status(500).json({ success: false, message: 'Error creating custom role.', error: error.message });
  }
};

// 11. Activity Log
const getRecruitmentActivity = async (req, res) => {
  try {
    const { action_type, entity_type, limit = 100 } = req.query;
    let whereClauses = [];
    let queryParams = [];

    if (action_type) {
      whereClauses.push('a.action_type = ?');
      queryParams.push(action_type);
    }

    if (entity_type) {
      whereClauses.push('a.entity_type = ?');
      queryParams.push(entity_type);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const logs = await db.query(`
      SELECT 
        a.*,
        u.email as actor_email,
        u.role as actor_role
      FROM RECRUITMENT_ACTIVITY a
      LEFT JOIN USERS u ON a.performed_by = u.id
      ${whereSql}
      ORDER BY a.created_at DESC
      LIMIT ?
    `, [...queryParams, Number(limit)]);

    res.json({ success: true, count: logs.length, activity: logs || [], activities: logs || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching activity log.', error: error.message });
  }
};

// 12. Master Data Catalog APIs (for categories, skills, locations, banners, cms, settings)
const getCategories = async (req, res) => {
  try {
    const categories = await db.query('SELECT * FROM JOB_CATEGORY ORDER BY name ASC');
    res.json({ success: true, categories: categories || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching categories.', error: error.message });
  }
};

const getSkills = async (req, res) => {
  try {
    const skills = await db.query('SELECT * FROM SKILL ORDER BY name ASC');
    res.json({ success: true, skills: skills || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching skills.', error: error.message });
  }
};

const getLocations = async (req, res) => {
  try {
    const locations = await db.query('SELECT * FROM LOCATION ORDER BY name ASC');
    res.json({ success: true, locations: locations || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching locations.', error: error.message });
  }
};

const getReports = async (req, res) => {
  try {
    const [candCount] = await db.query('SELECT COUNT(*) as c FROM CANDIDATES');
    const [jobCount] = await db.query('SELECT COUNT(*) as c FROM JOB');
    const [appCount] = await db.query('SELECT COUNT(*) as c FROM APPLICATION');
    res.json({
      success: true,
      reports: {
        candidates: candCount?.c || 0,
        jobs: jobCount?.c || 0,
        applications: appCount?.c || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error generating reports.', error: error.message });
  }
};

const getSettings = async (req, res) => {
  try {
    const settings = await db.query('SELECT * FROM PLATFORM_SETTING');
    res.json({ success: true, settings: settings || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching settings.', error: error.message });
  }
};

const updateSettings = async (req, res) => {
  try {
    const { settings } = req.body;
    const callerRole = (req.user?.role || '').toLowerCase();
    if (callerRole !== 'director' && callerRole !== 'main_admin' && req.user?.is_main_admin !== 1) {
      return res.status(403).json({
        success: false,
        code: 'DIRECTOR_REQUIRED',
        message: 'Forbidden. Only the Director can update platform settings.'
      });
    }
    if (Array.isArray(settings)) {
      for (const item of settings) {
        if (item.setting_key) {
          await db.query(`
            INSERT INTO PLATFORM_SETTING (id, setting_key, setting_value)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
          `, [uuidv4(), item.setting_key, item.setting_value]);
        }
      }
    }
    res.json({ success: true, message: 'Platform settings saved.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error saving settings.', error: error.message });
  }
};

// 13. Commercial & Payment Tracking for Executive Search Requirements
const getRequirementCommercials = async (req, res) => {
  try {
    const { client_id, job_id } = req.query;
    let whereClauses = [];
    let params = [];

    if (job_id) {
      whereClauses.push('rc.job_id = ?');
      params.push(job_id);
    }
    if (client_id) {
      whereClauses.push('rc.client_id = ?');
      params.push(client_id);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const commercials = await db.query(`
      SELECT 
        rc.*,
        u_create.email as created_by_email,
        u_ver.email as verified_by_email,
        j.title as job_title,
        e.company_name as client_name
      FROM RECRUITMENT_COMMERCIALS rc
      LEFT JOIN USERS u_create ON rc.created_by_user_id = u_create.id
      LEFT JOIN USERS u_ver ON rc.verified_by_user_id = u_ver.id
      LEFT JOIN JOB j ON rc.job_id = j.id
      LEFT JOIN EMPLOYERS e ON rc.client_id = e.id
      ${whereSql}
      ORDER BY rc.created_at DESC
    `, params);

    res.json({ success: true, count: commercials.length, commercials: commercials || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching commercials.', error: error.message });
  }
};

const recordCommercialQuote = async (req, res) => {
  try {
    const { client_id, job_id, enquiry_id, quoted_amount, currency = 'INR', notes } = req.body;

    if (!quoted_amount || Number(quoted_amount) <= 0) {
      return res.status(400).json({ success: false, message: 'A valid quoted amount is required.' });
    }

    const id = uuidv4();
    await db.query(`
      INSERT INTO RECRUITMENT_COMMERCIALS (
        id, client_id, job_id, enquiry_id, quoted_amount, currency,
        commercial_status, payment_status, notes, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, 'QUOTED', 'PAYMENT_PENDING', ?, ?)
    `, [
      id, client_id || null, job_id || null, enquiry_id || null,
      Number(quoted_amount), currency || 'INR', notes || null, req.user.id
    ]);

    await logActivity({
      performed_by: req.user.id,
      action_type: 'RECORD_COMMERCIAL_QUOTE',
      entity_type: 'COMMERCIAL',
      entity_id: id,
      description: `Recorded commercial quote: ${currency} ${Number(quoted_amount).toLocaleString()}`
    });

    res.status(201).json({ success: true, message: 'Commercial quote recorded successfully.', commercial_id: id });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error recording quote.', error: error.message });
  }
};

const recordCommercialPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { transaction_ref, notes, payment_received_at } = req.body;

    if (!transaction_ref || !transaction_ref.trim()) {
      return res.status(400).json({ success: false, message: 'Transaction reference or proof is required.' });
    }

    const receivedDate = payment_received_at ? new Date(payment_received_at) : new Date();

    await db.query(`
      UPDATE RECRUITMENT_COMMERCIALS
      SET payment_status = 'PAYMENT_RECEIVED',
          commercial_status = 'PAYMENT_RECEIVED',
          transaction_ref = ?,
          notes = COALESCE(?, notes),
          payment_received_at = ?
      WHERE id = ?
    `, [transaction_ref.trim(), notes || null, receivedDate, id]);

    await logActivity({
      performed_by: req.user.id,
      action_type: 'RECORD_COMMERCIAL_PAYMENT',
      entity_type: 'COMMERCIAL',
      entity_id: id,
      description: `Recorded client payment receipt with reference: ${transaction_ref.trim()}`
    });

    res.json({ success: true, message: 'Payment recorded and moved to verification queue.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error recording payment.', error: error.message });
  }
};

const verifyCommercialPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const callerRole = (req.user?.role || '').toLowerCase();

    if (callerRole !== 'director' && callerRole !== 'main_admin' && req.user?.is_main_admin !== 1) {
      return res.status(403).json({
        success: false,
        code: 'DIRECTOR_REQUIRED',
        message: 'Forbidden. Only the Director can verify commercial payments.'
      });
    }

    const [comm] = await db.query('SELECT * FROM RECRUITMENT_COMMERCIALS WHERE id = ?', [id]);
    if (!comm) {
      return res.status(404).json({ success: false, message: 'Commercial record not found.' });
    }

    await db.query(`
      UPDATE RECRUITMENT_COMMERCIALS
      SET payment_status = 'VERIFIED',
          commercial_status = 'PAYMENT_VERIFIED',
          verified_by_user_id = ?,
          verified_at = CURRENT_TIMESTAMP,
          notes = COALESCE(?, notes)
      WHERE id = ?
    `, [req.user.id, notes || null, id]);

    // Update any linked candidate sharing records
    if (comm.job_id || comm.client_id) {
      await db.query(`
        UPDATE CANDIDATE_SHARING
        SET payment_verified = 1
        WHERE (job_id IS NOT NULL AND job_id = ?)
           OR (client_id IS NOT NULL AND client_id = ?)
      `, [comm.job_id || 'none', comm.client_id || 'none']);
    }

    await logActivity({
      performed_by: req.user.id,
      action_type: 'VERIFY_COMMERCIAL_PAYMENT',
      entity_type: 'COMMERCIAL',
      entity_id: id,
      description: `Verified client commercial payment of ${comm.currency} ${comm.quoted_amount}`
    });

    res.json({ success: true, message: 'Commercial payment verified successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error verifying payment.', error: error.message });
  }
};

const rejectCommercialPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const callerRole = (req.user?.role || '').toLowerCase();

    if (callerRole !== 'director' && callerRole !== 'main_admin' && req.user?.is_main_admin !== 1) {
      return res.status(403).json({
        success: false,
        code: 'DIRECTOR_REQUIRED',
        message: 'Forbidden. Only the Director can reject commercial payments.'
      });
    }

    await db.query(`
      UPDATE RECRUITMENT_COMMERCIALS
      SET payment_status = 'REJECTED',
          notes = CONCAT(COALESCE(notes, ''), ' [REJECTED: ', ?, ']')
      WHERE id = ?
    `, [reason || 'Invalid payment verification', id]);

    await logActivity({
      performed_by: req.user.id,
      action_type: 'REJECT_COMMERCIAL_PAYMENT',
      entity_type: 'COMMERCIAL',
      entity_id: id,
      description: `Rejected client payment record`
    });

    res.json({ success: true, message: 'Commercial payment rejected.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error rejecting payment.', error: error.message });
  }
};

module.exports = {
  logActivity,
  getAdminStats,
  getAllCandidates,
  getCandidateDetails,
  checkCandidateDuplicate,
  addCandidateNote,
  getAllJobs,
  createInternalJob,
  updateInternalJob,
  assignJobRecruiter,
  updateJobStatus,
  approveJob,
  rejectJob,
  getAllApplications,
  updateApplicationStage,
  getCandidateShares,
  proposeCandidateShare,
  reviewCandidateShare,
  approveCandidateShare,
  revokeCandidateShare,
  getSharedProfileByToken,
  getAllEmployerEnquiries,
  assignEnquiry,
  updateEnquiryStatus,
  updateEnquiryDetails,
  convertEnquiryToRequirement,
  getRequirementCommercials,
  recordCommercialQuote,
  recordCommercialPayment,
  verifyCommercialPayment,
  rejectCommercialPayment,
  getAllEmployers,
  approveEmployer,
  rejectEmployer,
  getAllLeads,
  createLead,
  updateLead,
  handoverLead,
  getAllUsers,
  createEmployee,
  toggleUserStatus,
  updateUserRole,
  getAdminSelfProfile,
  updateAdminSelfProfile,
  uploadAdminProfilePhoto,
  updateAdminUserProfile,
  getTeams,
  createTeam,
  getRoles,
  getRolePermissions,
  updateRolePermissions,
  createCustomRole,
  getRecruitmentActivity,
  getCategories,
  getSkills,
  getLocations,
  getReports,
  getSettings,
  updateSettings
};
