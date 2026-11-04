const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { getUserScope } = require('../middleware/rbacMiddleware');
const { uploadBufferToCloudinary } = require('../services/cloudinaryService');
const cryptoUtils = require('../utils/cryptoUtils');
const aiService = require('../services/aiService');
const { STATUSES, normalizeApplicationStatus, validateTransition } = require('../utils/applicationWorkflow');
const { sendApplicationStageEmail, sendEnquiryReplyEmail } = require('../services/emailService');
const { canSendStageEmail } = require('../services/notificationPreferenceService');
const leadsController = require('./leadsController');

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
    console.warn('Failed to log recruitment activity:', err.message);
  }
};

const maskEmail = (email) => {
  if (!email || typeof email !== 'string') return '';
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const maskedLocal = local.length > 2 ? `${local[0]}***${local[local.length - 1]}` : `${local[0]}***`;
  return `${maskedLocal}@${domain}`;
};

// 1. Overall Admin Stats & Dashboard Overview (Real DB metrics only)
const getAdminStats = async (req, res) => {
  try {
    const userRole = (req.user?.role || '').toLowerCase();
    const userId = req.user?.id;
    const scope = await getUserScope(userId, userRole);

    const { period = 'all', startDate, endDate, recruiterId, teamId } = req.query;

    const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
    if (period === 'custom') {
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Both startDate and endDate are required when period is custom.'
        });
      }
      if (!ISO_DATE_REGEX.test(startDate) || !ISO_DATE_REGEX.test(endDate) || isNaN(Date.parse(startDate)) || isNaN(Date.parse(endDate))) {
        return res.status(400).json({
          success: false,
          message: 'Invalid startDate or endDate format. Expected YYYY-MM-DD.'
        });
      }
      if (startDate > endDate) {
        return res.status(400).json({
          success: false,
          message: 'startDate cannot be after endDate.'
        });
      }
    }

    // Optional date filter clause helper with parameterized SQL bindings
    const buildDateFilter = (column) => {
      if (period === 'today') return { clause: `DATE(${column}) = CURDATE()`, params: [] };
      if (period === '7d') return { clause: `${column} >= DATE_SUB(NOW(), INTERVAL 7 DAY)`, params: [] };
      if (period === '30d') return { clause: `${column} >= DATE_SUB(NOW(), INTERVAL 30 DAY)`, params: [] };
      if (period === 'this_month') return { clause: `${column} >= DATE_FORMAT(NOW(), '%Y-%m-01')`, params: [] };
      if (period === 'custom' && startDate && endDate) {
        return {
          clause: `(${column} >= ? AND ${column} <= ?)`,
          params: [`${startDate} 00:00:00`, `${endDate} 23:59:59`]
        };
      }
      return { clause: '1 = 1', params: [] };
    };

    // -------------------------------------------------------------
    // 1. OVERVIEW METRICS (Strictly role-scoped & factual)
    // -------------------------------------------------------------
    let candTotal = 0;
    if (scope.isGlobal) {
      const [candRow] = await db.query('SELECT COUNT(*) as total FROM CANDIDATES');
      candTotal = Number(candRow?.total || 0);
    } else if (userRole === 'recruiter' || userRole === 'tl_coordinator') {
      if (scope.jobIds.length > 0) {
        const [candRow] = await db.query('SELECT COUNT(DISTINCT candidate_id) as total FROM APPLICATION WHERE job_id IN (?)', [scope.jobIds]);
        candTotal = Number(candRow?.total || 0);
      }
    }

    let empTotal = 0;
    let empPending = 0;
    if (scope.isGlobal || userRole === 'bd_lead') {
      const [empRow] = await db.query('SELECT COUNT(*) as total, SUM(CASE WHEN approval_status = "pending" THEN 1 ELSE 0 END) as pending FROM EMPLOYERS');
      empTotal = Number(empRow?.total || 0);
      empPending = Number(empRow?.pending || 0);
    } else if (userRole === 'tl_coordinator') {
      if (scope.jobIds.length > 0 || scope.clientIds.length > 0) {
        const allowedJobIds = scope.jobIds.length > 0 ? scope.jobIds : ['__NONE__'];
        const allowedClientIds = scope.clientIds.length > 0 ? scope.clientIds : ['__NONE__'];
        const [empRow] = await db.query('SELECT COUNT(DISTINCT id) as total FROM EMPLOYERS WHERE id IN (?) OR id IN (SELECT employer_id FROM JOB WHERE id IN (?))', [allowedClientIds, allowedJobIds]);
        empTotal = Number(empRow?.total || 0);
      }
    } else if (userRole === 'recruiter') {
      if (scope.jobIds.length > 0) {
        const [empRow] = await db.query('SELECT COUNT(DISTINCT employer_id) as total FROM JOB WHERE id IN (?) AND employer_id IS NOT NULL', [scope.jobIds]);
        empTotal = Number(empRow?.total || 0);
      }
    }

    let jobTotal = 0;
    let openJobs = 0;
    let draftJobs = 0;
    if (scope.isGlobal) {
      let jobWhere = 'WHERE 1=1';
      let jobParams = [];
      if (recruiterId) {
        jobWhere += ' AND (assigned_recruiter_id = ? OR id IN (SELECT assigned_job_id FROM USER_ASSIGNMENTS WHERE user_id = ?))';
        jobParams.push(recruiterId, recruiterId);
      }
      const [jobRow] = await db.query(`
        SELECT COUNT(*) as total, 
               SUM(CASE WHEN status = "open" THEN 1 ELSE 0 END) as open_jobs, 
               SUM(CASE WHEN status = "draft" THEN 1 ELSE 0 END) as draft_jobs 
        FROM JOB ${jobWhere}
      `, jobParams);
      jobTotal = Number(jobRow?.total || 0);
      openJobs = Number(jobRow?.open_jobs || 0);
      draftJobs = Number(jobRow?.draft_jobs || 0);
    } else if (userRole === 'tl_coordinator' || userRole === 'recruiter') {
      if (scope.jobIds.length > 0) {
        const [jobRow] = await db.query(`
          SELECT COUNT(*) as total, 
                 SUM(CASE WHEN status = "open" THEN 1 ELSE 0 END) as open_jobs, 
                 SUM(CASE WHEN status = "draft" THEN 1 ELSE 0 END) as draft_jobs 
          FROM JOB WHERE id IN (?)
        `, [scope.jobIds]);
        jobTotal = Number(jobRow?.total || 0);
        openJobs = Number(jobRow?.open_jobs || 0);
        draftJobs = Number(jobRow?.draft_jobs || 0);
      }
    }

    // -------------------------------------------------------------
    // 2. RECRUITMENT PIPELINE (6 Stages)
    // -------------------------------------------------------------
    let pipeline = { applied: 0, under_review: 0, shortlisted: 0, interview: 0, selected: 0, rejected: 0, total: 0 };
    if (scope.isGlobal) {
      const appDateFilter = buildDateFilter('applied_at');
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
        WHERE ${appDateFilter.clause}
      `, appDateFilter.params);
      pipeline = {
        applied: Number(appRow?.applied || 0),
        under_review: Number(appRow?.reviewing || 0),
        shortlisted: Number(appRow?.shortlisted || 0),
        interview: Number(appRow?.interview || 0),
        selected: Number(appRow?.selected || 0),
        rejected: Number(appRow?.rejected || 0),
        total: Number(appRow?.total || 0)
      };
    } else if ((userRole === 'tl_coordinator' || userRole === 'recruiter') && scope.jobIds.length > 0) {
      const appDateFilter = buildDateFilter('applied_at');
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
        WHERE job_id IN (?) AND ${appDateFilter.clause}
      `, [scope.jobIds, ...appDateFilter.params]);
      pipeline = {
        applied: Number(appRow?.applied || 0),
        under_review: Number(appRow?.reviewing || 0),
        shortlisted: Number(appRow?.shortlisted || 0),
        interview: Number(appRow?.interview || 0),
        selected: Number(appRow?.selected || 0),
        rejected: Number(appRow?.rejected || 0),
        total: Number(appRow?.total || 0)
      };
    }

    // -------------------------------------------------------------
    // 3. PENDING APPROVALS & ENQUIRIES (Actionable work queue)
    // -------------------------------------------------------------
    const pendingWorkItems = [];
    if (scope.isGlobal || userRole === 'tl_coordinator') {
      const shareWhere = scope.isGlobal ? "WHERE cs.status = 'PROPOSED'" : "WHERE cs.status = 'PROPOSED' AND (cs.job_id IN (?) OR cs.client_id IN (?))";
      const shareParams = scope.isGlobal ? [] : [scope.jobIds.length > 0 ? scope.jobIds : ['__NONE__'], scope.clientIds.length > 0 ? scope.clientIds : ['__NONE__']];
      const shares = await db.query(`
        SELECT cs.id, cs.share_token, cs.created_at, cs.candidate_id, c.name as candidate_name, u.email as candidate_email, j.title as job_title, e.company_name
        FROM CANDIDATE_SHARING cs
        JOIN CANDIDATES c ON cs.candidate_id = c.id
        LEFT JOIN USERS u ON c.user_id = u.id
        LEFT JOIN JOB j ON cs.job_id = j.id
        LEFT JOIN EMPLOYERS e ON cs.client_id = e.id
        ${shareWhere}
        ORDER BY cs.created_at DESC
        LIMIT 6
      `, shareParams);

      for (const s of shares || []) {
        const candidateDisplay = (s.candidate_name && s.candidate_name.trim() !== '')
          ? s.candidate_name.trim()
          : (s.candidate_email ? (scope.isGlobal ? s.candidate_email : maskEmail(s.candidate_email)) : `Candidate #${(s.candidate_id || s.id).substring(0, 8)}`);

        pendingWorkItems.push({
          id: s.id,
          type: 'CANDIDATE_SHARE_APPROVAL',
          title: `Candidate Share Review: ${candidateDisplay}`,
          subtitle: `${s.job_title || 'Direct Profile'} • ${s.company_name || 'Partner Review'}`,
          created_at: s.created_at,
          status: 'Awaiting Review',
          link: '/applications'
        });
      }
    }

    if (scope.isGlobal) {
      const emps = await db.query('SELECT id, company_name, COALESCE(official_email, contact_email) as email FROM EMPLOYERS WHERE approval_status = "pending" LIMIT 6');
      for (const e of emps || []) {
        pendingWorkItems.push({
          id: e.id,
          type: 'EMPLOYER_APPROVAL',
          title: `Employer Verification: ${e.company_name}`,
          subtitle: e.email ? e.email : 'Pending Compliance Review',
          status: 'Pending Verification',
          link: '/employers'
        });
      }
    }

    if (scope.isGlobal || userRole === 'tl_coordinator') {
      const enqs = await db.query('SELECT id, enquiry_type, company_name, contact_name, created_at FROM EMPLOYER_ENQUIRY WHERE status IN ("NEW", "new") ORDER BY created_at DESC LIMIT 6');
      for (const eq of enqs || []) {
        pendingWorkItems.push({
          id: eq.id,
          type: 'NEW_ENQUIRY',
          title: `${eq.enquiry_type || 'Recruitment Enquiry'}: ${eq.company_name || eq.contact_name}`,
          subtitle: `Inbound from ${eq.contact_name || 'Employer Partner'}`,
          created_at: eq.created_at,
          status: 'New Enquiry',
          link: '/enquiries'
        });
      }
    }

    // -------------------------------------------------------------
    // 4. UPCOMING INTERVIEWS (Next 7 Days, Excludes Cancelled & Past)
    // -------------------------------------------------------------
    let interviewWhere = "WHERE i.status != 'CANCELLED' AND i.interview_date >= NOW() AND i.interview_date <= DATE_ADD(NOW(), INTERVAL 7 DAY)";
    let interviewParams = [];
    if (!scope.isGlobal && (userRole === 'recruiter' || userRole === 'tl_coordinator')) {
      if (scope.jobIds.length > 0) {
        interviewWhere += " AND i.job_id IN (?)";
        interviewParams.push(scope.jobIds);
      } else {
        interviewWhere += " AND 1 = 0";
      }
    } else if (userRole === 'bd_lead') {
      interviewWhere += " AND 1 = 0";
    }

    const upcomingInterviews = await db.query(`
      SELECT i.id, i.application_id, i.candidate_id, i.job_id, i.interview_date, i.round_name, i.status,
             c.name as candidate_name, j.title as job_title, e.company_name, u.name as interviewer_name
      FROM INTERVIEWS i
      JOIN CANDIDATES c ON i.candidate_id = c.id
      JOIN JOB j ON i.job_id = j.id
      LEFT JOIN EMPLOYERS e ON j.employer_id = e.id
      LEFT JOIN USERS u ON i.interviewer_user_id = u.id
      ${interviewWhere}
      ORDER BY i.interview_date ASC
      LIMIT 8
    `, interviewParams);

    // -------------------------------------------------------------
    // 5. MY PENDING TASKS (Assigned specifically to authenticated user)
    // -------------------------------------------------------------
    const myTasks = [];
    if (userRole === 'bd_lead' || scope.isGlobal) {
      const leads = await db.query(`
        SELECT id, company_name, contact_person, follow_up_date, status
        FROM LEADS
        WHERE (assigned_bd_user_id = ? OR ?) AND follow_up_date IS NOT NULL AND status NOT IN ('CONVERTED', 'LOST', 'HANDED_OVER')
        ORDER BY follow_up_date ASC
        LIMIT 6
      `, [userId, scope.isGlobal ? 1 : 0]);
      for (const l of leads || []) {
        myTasks.push({
          id: l.id,
          title: `Lead Follow-Up: ${l.company_name}`,
          related_name: l.contact_person,
          due_date: l.follow_up_date,
          status: l.status,
          priority: 'High',
          link: '/reports'
        });
      }
    }

    const userEnquiries = await db.query(`
      SELECT id, COALESCE(subject, enquiry_type) as title, company_name, follow_up_date, status
      FROM EMPLOYER_ENQUIRY
      WHERE (assigned_to_user_id = ? OR ?) AND status IN ('NEW', 'new', 'IN_PROGRESS')
      ORDER BY created_at DESC
      LIMIT 6
    `, [userId, scope.isGlobal ? 1 : 0]);
    for (const eq of userEnquiries || []) {
      myTasks.push({
        id: eq.id,
        title: `Enquiry Action: ${eq.company_name || 'Direct Employer'}`,
        related_name: eq.title,
        due_date: eq.follow_up_date,
        status: eq.status,
        priority: 'Medium',
        link: '/enquiries'
      });
    }

    // -------------------------------------------------------------
    // 6. RECRUITER WORKLOAD (Active jobs, applications, follow-ups)
    // -------------------------------------------------------------
    let workload = [];
    if (scope.isGlobal || userRole === 'tl_coordinator') {
      let recWhere = "WHERE role = 'recruiter'";
      let recParams = [];
      if (userRole === 'tl_coordinator') {
        const ledTeams = await db.query('SELECT id FROM TEAMS WHERE lead_user_id = ?', [userId]);
        const teamIds = (ledTeams || []).map(t => t.id);
        if (teamIds.length > 0) {
          recWhere = "WHERE id IN (SELECT user_id FROM USER_ASSIGNMENTS WHERE team_id IN (?)) AND role = 'recruiter'";
          recParams = [teamIds];
        } else {
          recWhere = "WHERE 1 = 0";
        }
      }

      const recruiters = await db.query(`SELECT id, name, email FROM USERS ${recWhere} LIMIT 12`, recParams);
      for (const r of recruiters || []) {
        const [jobCnt] = await db.query(`
          SELECT COUNT(DISTINCT id) as cnt 
          FROM JOB 
          WHERE status = 'open' AND (assigned_recruiter_id = ? OR id IN (SELECT assigned_job_id FROM USER_ASSIGNMENTS WHERE user_id = ?))
        `, [r.id, r.id]);

        const [appCnt] = await db.query(`
          SELECT COUNT(DISTINCT a.id) as cnt
          FROM APPLICATION a
          JOIN JOB j ON a.job_id = j.id
          WHERE a.status IN ('applied', 'reviewing', 'shortlisted', 'interview') 
            AND (j.assigned_recruiter_id = ? OR j.id IN (SELECT assigned_job_id FROM USER_ASSIGNMENTS WHERE user_id = ?))
        `, [r.id, r.id]);

        const [taskCnt] = await db.query(`
          SELECT COUNT(DISTINCT id) as cnt
          FROM EMPLOYER_ENQUIRY
          WHERE assigned_to_user_id = ? AND status IN ('NEW', 'new', 'IN_PROGRESS')
        `, [r.id]);

        workload.push({
          recruiter_id: r.id,
          name: r.name || r.email.split('@')[0],
          email: r.email,
          active_jobs_count: Number(jobCnt?.cnt || 0),
          active_applications_count: Number(appCnt?.cnt || 0),
          pending_tasks_count: Number(taskCnt?.cnt || 0)
        });
      }
    } else if (userRole === 'recruiter') {
      const [jobCnt] = await db.query(`
        SELECT COUNT(DISTINCT id) as cnt 
        FROM JOB 
        WHERE status = 'open' AND (assigned_recruiter_id = ? OR id IN (SELECT assigned_job_id FROM USER_ASSIGNMENTS WHERE user_id = ?))
      `, [userId, userId]);

      const [appCnt] = await db.query(`
        SELECT COUNT(DISTINCT a.id) as cnt
        FROM APPLICATION a
        JOIN JOB j ON a.job_id = j.id
        WHERE a.status IN ('applied', 'reviewing', 'shortlisted', 'interview') 
          AND (j.assigned_recruiter_id = ? OR j.id IN (SELECT assigned_job_id FROM USER_ASSIGNMENTS WHERE user_id = ?))
      `, [userId, userId]);

      workload.push({
        recruiter_id: userId,
        name: req.user.name || req.user.email.split('@')[0],
        email: req.user.email,
        active_jobs_count: Number(jobCnt?.cnt || 0),
        active_applications_count: Number(appCnt?.cnt || 0),
        pending_tasks_count: 0
      });
    }

    // -------------------------------------------------------------
    // 7. JOB-WISE APPLICATION COUNTS (Sortable, scoped)
    // -------------------------------------------------------------
    let jobAppWhere = '';
    let jobAppParams = [];
    if (!scope.isGlobal && (userRole === 'recruiter' || userRole === 'tl_coordinator')) {
      if (scope.jobIds.length > 0) {
        jobAppWhere = 'WHERE j.id IN (?)';
        jobAppParams = [scope.jobIds];
      } else {
        jobAppWhere = 'WHERE 1 = 0';
      }
    } else if (userRole === 'bd_lead') {
      jobAppWhere = 'WHERE 1 = 0';
    }

    const jobWiseApps = await db.query(`
      SELECT j.id, j.title, j.status, j.created_at, e.company_name, u.name as recruiter_name, COUNT(a.id) as application_count
      FROM JOB j
      LEFT JOIN EMPLOYERS e ON j.employer_id = e.id
      LEFT JOIN USERS u ON j.assigned_recruiter_id = u.id
      LEFT JOIN APPLICATION a ON a.job_id = j.id
      ${jobAppWhere}
      GROUP BY j.id, j.title, j.status, j.created_at, e.company_name, u.name
      ORDER BY application_count DESC, j.created_at DESC
      LIMIT 8
    `, jobAppParams);

    // -------------------------------------------------------------
    // -------------------------------------------------------------
    // 8. MONTHLY RECRUITMENT TREND (Continuous 6-month timeline, scoped)
    // -------------------------------------------------------------
    const monthsSeries = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      monthsSeries.push(`${yyyy}-${mm}`);
    }

    let trendWhere = "WHERE applied_at >= DATE_SUB(DATE_FORMAT(NOW(), '%Y-%m-01'), INTERVAL 5 MONTH)";
    let trendParams = [];
    if (!scope.isGlobal && (userRole === 'recruiter' || userRole === 'tl_coordinator')) {
      if (scope.jobIds.length > 0) {
        trendWhere += " AND job_id IN (?)";
        trendParams.push(scope.jobIds);
      } else {
        trendWhere += " AND 1 = 0";
      }
    } else if (userRole === 'bd_lead') {
      trendWhere += " AND 1 = 0";
    }

    const trendRows = await db.query(`
      SELECT DATE_FORMAT(applied_at, '%Y-%m') as month,
             COUNT(*) as application_volume,
             SUM(CASE WHEN status = 'hired' THEN 1 ELSE 0 END) as selected_count
      FROM APPLICATION
      ${trendWhere}
      GROUP BY month
      ORDER BY month ASC
    `, trendParams);

    const trendMap = {};
    for (const r of trendRows || []) {
      trendMap[r.month] = {
        application_volume: Number(r.application_volume || 0),
        selected_count: Number(r.selected_count || 0)
      };
    }

    const monthlyTrend = monthsSeries.map(m => ({
      month: m,
      application_volume: trendMap[m]?.application_volume || 0,
      selected_count: trendMap[m]?.selected_count || 0
    }));

    // -------------------------------------------------------------
    // 9. LEAD CONVERSION OVERVIEW (BD Lead & Director Scope)
    // -------------------------------------------------------------
    let leadConversion = null;
    if (scope.isGlobal || userRole === 'bd_lead') {
      let leadWhere = '';
      let leadParams = [];
      if (userRole === 'bd_lead' && !scope.isGlobal) {
        leadWhere = 'WHERE assigned_bd_user_id = ?';
        leadParams = [userId];
      }
      const [leadStats] = await db.query(`
        SELECT 
          COUNT(*) as total_leads,
          SUM(CASE WHEN status IN ('QUALIFIED', 'IN_DISCOVERY', 'PROPOSAL_SENT', 'CONVERTED', 'HANDED_OVER') THEN 1 ELSE 0 END) as qualified_leads,
          SUM(CASE WHEN status IN ('CONVERTED', 'HANDED_OVER') THEN 1 ELSE 0 END) as converted_leads
        FROM LEADS
        ${leadWhere}
      `, leadParams);

      const totalLeads = Number(leadStats?.total_leads || 0);
      const convertedLeads = Number(leadStats?.converted_leads || 0);
      const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) + '%' : '0.0%';

      const sources = await db.query(`
        SELECT source, COUNT(*) as count 
        FROM LEADS 
        ${leadWhere}
        GROUP BY source 
        ORDER BY count DESC
      `, leadParams);

      leadConversion = {
        authorized: true,
        total_leads: totalLeads,
        qualified_leads: Number(leadStats?.qualified_leads || 0),
        converted_leads: convertedLeads,
        conversion_rate: conversionRate,
        sources: sources || []
      };
    } else {
      leadConversion = { authorized: false, message: 'Lead conversion analytics restricted to Business Development & Leadership.' };
    }

    // -------------------------------------------------------------
    // 10. EMAIL DELIVERY HEALTH (Operational delivery audit)
    // -------------------------------------------------------------
    let emailHealth = null;
    if (scope.isGlobal || userRole === 'tl_coordinator') {
      const isConfigured = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'dummy-key');
      const [eCounts] = await db.query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
          SUM(CASE WHEN status = 'bounced' THEN 1 ELSE 0 END) as bounced,
          SUM(CASE WHEN status = 'simulated' THEN 1 ELSE 0 END) as simulated
        FROM EMAIL_LOGS
      `);

      const recentFails = await db.query(`
        SELECT id, recipient_email, subject, template_type, status, error_message, sent_at
        FROM EMAIL_LOGS
        WHERE status IN ('failed', 'bounced')
        ORDER BY sent_at DESC
        LIMIT 4
      `);

      emailHealth = {
        authorized: true,
        provider: isConfigured ? 'Resend Production API' : 'Development Simulation / Mock',
        is_configured: isConfigured,
        total_sent: Number(eCounts?.sent || 0) + Number(eCounts?.simulated || 0),
        failed_count: Number(eCounts?.failed || 0),
        bounced_count: Number(eCounts?.bounced || 0),
        recent_failures: (recentFails || []).map(f => ({
          ...f,
          recipient_email: maskEmail(f.recipient_email)
        }))
      };
    } else {
      emailHealth = { authorized: false, message: 'Email delivery metrics restricted to Management.' };
    }

    // -------------------------------------------------------------
    // 11. OVERDUE FOLLOW-UPS (LEADS & EMPLOYER_ENQUIRY past due)
    // -------------------------------------------------------------
    const overdueFollowUps = [];

    // A. Overdue Leads (Director & BD Lead)
    if (scope.isGlobal || userRole === 'bd_lead') {
      const leadWhere = scope.isGlobal 
        ? "WHERE follow_up_date < CURDATE() AND follow_up_date IS NOT NULL AND status NOT IN ('CONVERTED', 'LOST', 'HANDED_OVER')"
        : "WHERE follow_up_date < CURDATE() AND follow_up_date IS NOT NULL AND assigned_bd_user_id = ? AND status NOT IN ('CONVERTED', 'LOST', 'HANDED_OVER')";
      const leadParams = scope.isGlobal ? [] : [userId];

      const overdueLeads = await db.query(`
        SELECT id, company_name as title, 'lead' as entity_type, contact_person as related_name, 
               DATE_FORMAT(follow_up_date, '%Y-%m-%d') as due_date, status, '/reports' as link
        FROM LEADS
        ${leadWhere}
        ORDER BY follow_up_date ASC
        LIMIT 6
      `, leadParams);

      for (const ol of overdueLeads || []) {
        overdueFollowUps.push(ol);
      }
    }

    // B. Overdue Employer Enquiries (Director, TL Coordinator, Recruiter)
    if (scope.isGlobal || userRole === 'tl_coordinator' || userRole === 'recruiter') {
      let enqWhere = "WHERE follow_up_date < CURDATE() AND follow_up_date IS NOT NULL AND status IN ('NEW', 'new', 'IN_PROGRESS')";
      let enqParams = [];
      if (!scope.isGlobal) {
        enqWhere += " AND assigned_to_user_id = ?";
        enqParams.push(userId);
      }

      const overdueEnqs = await db.query(`
        SELECT id, COALESCE(company_name, 'Direct Employer Enquiry') as title, 'enquiry' as entity_type, 
               COALESCE(contact_name, subject, 'Employer Partner') as related_name,
               DATE_FORMAT(follow_up_date, '%Y-%m-%d') as due_date, status, '/enquiries' as link
        FROM EMPLOYER_ENQUIRY
        ${enqWhere}
        ORDER BY follow_up_date ASC
        LIMIT 6
      `, enqParams);

      for (const oe of overdueEnqs || []) {
        overdueFollowUps.push(oe);
      }
    }

    // Sort combined overdue follow-ups chronologically (oldest due first) and limit to 6
    overdueFollowUps.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
    const finalOverdueFollowUps = overdueFollowUps.slice(0, 6);

    // -------------------------------------------------------------
    // 12. RECENT ACTIVITY LOG (Sanitized against sensitive tokens)
    // -------------------------------------------------------------
    const actDateFilter = buildDateFilter('a.created_at');
    const recentActivity = await db.query(`
      SELECT a.id, a.action_type, a.entity_type, a.entity_id, a.description, a.created_at, u.email as actor_email, u.role as actor_role
      FROM RECRUITMENT_ACTIVITY a
      LEFT JOIN USERS u ON a.performed_by = u.id
      WHERE ${actDateFilter.clause}
      ORDER BY a.created_at DESC
      LIMIT 8
    `, actDateFilter.params);

    // Legacy backwards-compatible stats map
    const legacyStats = {
      total_candidates: candTotal,
      total_employers: empTotal,
      pending_employers: empPending,
      total_jobs: jobTotal,
      open_jobs: openJobs,
      draft_jobs: draftJobs,
      total_applications: pipeline.total,
      pending_applications: pipeline.applied + pipeline.under_review,
      shortlisted_candidates: pipeline.shortlisted,
      interview_candidates: pipeline.interview,
      selected_candidates: pipeline.selected,
      rejected_applications: pipeline.rejected,
      total_enquiries: pendingWorkItems.filter(i => i.type === 'NEW_ENQUIRY').length,
      new_enquiries: pendingWorkItems.filter(i => i.type === 'NEW_ENQUIRY').length,
      total_leads: leadConversion?.total_leads || 0,
      new_leads: leadConversion?.qualified_leads || 0,
      converted_leads: leadConversion?.converted_leads || 0,
      total_shares: pendingWorkItems.filter(i => i.type === 'CANDIDATE_SHARE_APPROVAL').length,
      pending_shares: pendingWorkItems.filter(i => i.type === 'CANDIDATE_SHARE_APPROVAL').length
    };

    res.json({
      success: true,
      stats: legacyStats,
      metrics: {
        total_candidates: candTotal,
        total_employers: empTotal,
        total_jobs: jobTotal,
        open_jobs: openJobs,
        draft_jobs: draftJobs,
        total_applications: pipeline.total
      },
      pipeline,
      pending_work: {
        count: pendingWorkItems.length,
        items: pendingWorkItems
      },
      upcoming_interviews: upcomingInterviews || [],
      my_pending_tasks: myTasks || [],
      recruiter_workload: workload || [],
      job_applications: jobWiseApps || [],
      monthly_trend: (monthlyTrend || []).map(m => ({
        ...m,
        application_volume: Number(m.application_volume || 0),
        selected_count: Number(m.selected_count || 0)
      })),
      lead_conversion: leadConversion,
      email_health: emailHealth,
      overdue_follow_ups: finalOverdueFollowUps || [],
      recent_activity: (recentActivity || []).map(a => ({
        ...a,
        actor_email: a.actor_email ? maskEmail(a.actor_email) : 'System Worker'
      })),
      filters_applied: {
        period,
        startDate: startDate || null,
        endDate: endDate || null,
        recruiterId: recruiterId || null,
        teamId: teamId || null
      }
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
// (maskEmail is declared at top of file)

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

    const isAuthorizedAdmin = ['director', 'main_admin', 'admin', 'super_admin'].includes(userRole) || 
      req.user?.is_main_admin === 1 || 
      Boolean(scope?.isGlobal);

    const sanitizedCandidates = (candidates || []).map(c => {
      if (isAuthorizedAdmin) return c;
      // Recruiters are already query-scoped to candidates of their assigned jobs; show complete details
      if (userRole === 'recruiter' || userRole === 'tl_coordinator') return c;
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
    const isDirectorOrGlobal = ['director', 'main_admin', 'admin', 'super_admin'].includes(userRole) || req.user?.is_main_admin === 1 || Boolean(scope?.isGlobal);
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
    const {
      status, search, company, location, recruiter,
      startDate, endDate, recommended_only, include_archived,
      page = 1, limit = 20
    } = req.query;

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
    } else if (userRole === 'bd_lead' && !scope.isGlobal) {
      if (scope.clientIds.length === 0) {
        whereClauses.push('1 = 0');
      } else {
        whereClauses.push('j.employer_id IN (?)');
        queryParams.push(scope.clientIds);
      }
    }

    // Status / Archived filtering
    const isArchivedFilter = status === 'archived' || include_archived === 'true' || include_archived === '1';
    if (status === 'archived') {
      whereClauses.push('j.is_archived = 1');
    } else {
      if (!isArchivedFilter) {
        whereClauses.push('(j.is_archived IS NULL OR j.is_archived = 0)');
      }
      if (status && status !== 'all') {
        whereClauses.push(`j.status = ?`);
        queryParams.push(status);
      }
    }

    // Company filter
    if (company && company.trim()) {
      whereClauses.push(`(LOWER(e.company_name) LIKE ? OR LOWER(j.manual_company_name) LIKE ?)`);
      const term = `%${company.trim().toLowerCase()}%`;
      queryParams.push(term, term);
    }

    // Location filter
    if (location && location.trim()) {
      whereClauses.push(`LOWER(j.location) LIKE ?`);
      queryParams.push(`%${location.trim().toLowerCase()}%`);
    }

    // Recruiter filter
    if (recruiter && recruiter.trim() && recruiter !== 'all') {
      whereClauses.push(`j.assigned_recruiter_id = ?`);
      queryParams.push(recruiter.trim());
    }

    // Date range filter
    if (startDate) {
      whereClauses.push(`j.created_at >= ?`);
      queryParams.push(`${startDate} 00:00:00`);
    }
    if (endDate) {
      whereClauses.push(`j.created_at <= ?`);
      queryParams.push(`${endDate} 23:59:59`);
    }

    // Recommended only filter
    if (recommended_only === 'true' || recommended_only === '1') {
      whereClauses.push(`(j.is_recommended = 1 OR j.priority = 'recommended')`);
    }

    // General search filter
    if (search && search.trim()) {
      whereClauses.push(`(LOWER(j.title) LIKE ? OR LOWER(j.location) LIKE ? OR LOWER(e.company_name) LIKE ? OR LOWER(j.manual_company_name) LIKE ?)`);
      const term = `%${search.trim().toLowerCase()}%`;
      queryParams.push(term, term, term, term);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count total matching jobs
    const countRows = await db.query(`
      SELECT COUNT(*) as total 
      FROM JOB j
      LEFT JOIN EMPLOYERS e ON j.employer_id = e.id
      ${whereSql}
    `, queryParams);
    const totalJobs = countRows && countRows.length > 0 ? countRows[0].total : 0;

    // Pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = limit === 'all' ? 1000 : Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const jobs = await db.query(`
      SELECT 
        j.id, j.title, j.employment_type, j.workplace_type, j.seniority_level, j.location,
        j.status, j.priority, j.is_recommended, j.allow_candidate_access,
        j.is_archived, j.archive_reason, j.archived_at, j.restored_at, j.restore_note,
        j.created_at, j.updated_at, j.created_by_type, j.created_by_user_id, j.last_updated_by_user_id,
        j.min_salary, j.max_salary, j.currency, j.salary_period, j.min_experience, j.max_experience,
        j.openings_count, j.internal_notes, j.employer_id, j.client_id, j.assigned_recruiter_id,
        j.source_type, j.enquiry_id, j.lead_id,
        COALESCE(j.manual_company_name, e.company_name, 'Direct Client') as company_name,
        COALESCE(j.manual_contact_person, e.contact_person_name, '') as contact_person,
        COALESCE(j.manual_contact_phone, e.contact_person_phone, e.contact_phone, e.official_phone, '') as contact_phone,
        COALESCE(j.manual_contact_email, e.contact_person_email, e.contact_email, e.official_email, '') as contact_email,
        COALESCE(j.manual_company_website, e.website, '') as company_website,
        e.logo_url,
        recruiter.name as assigned_recruiter_name,
        recruiter.email as assigned_recruiter_email,
        creator.name as created_by_name,
        updater.name as last_updated_by_name,
        (SELECT COUNT(*) FROM APPLICATION a WHERE a.job_id = j.id) as applicant_count,
        (SELECT COUNT(*) FROM APPLICATION a WHERE a.job_id = j.id) as applicants_count,
        (SELECT COUNT(*) FROM CALLBACK_REQUEST cr WHERE cr.job_id = j.id AND cr.status != 'RESOLVED' AND cr.status != 'Resolved') as pending_callback_count
      FROM JOB j
      LEFT JOIN EMPLOYERS e ON j.employer_id = e.id
      LEFT JOIN USERS recruiter ON j.assigned_recruiter_id = recruiter.id
      LEFT JOIN USERS creator ON j.created_by_user_id = creator.id
      LEFT JOIN USERS updater ON j.last_updated_by_user_id = updater.id
      ${whereSql}
      ORDER BY j.created_at DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, limitNum, offset]);

    // Apply data protection / masking on employer contact phone/email for unauthorized roles
    // Director / Main Admin have unmasked access; Recruiters / TLs have masked company contact details by default
    const sanitizedJobs = (jobs || []).map(j => {
      const isAuthorized = Boolean(scope.isGlobal);
      if (!isAuthorized) {
        return {
          ...j,
          contact_person: j.contact_person ? `${j.contact_person.slice(0, 2)}***` : '',
          contact_phone: j.contact_phone ? `${j.contact_phone.slice(0, 3)}****${j.contact_phone.slice(-2)}` : '',
          contact_email: maskEmail(j.contact_email),
          contact_masked: true
        };
      }
      return { ...j, contact_masked: false };
    });

    res.json({
      success: true,
      count: sanitizedJobs.length,
      total: totalJobs,
      page: pageNum,
      totalPages: Math.ceil(totalJobs / limitNum),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalJobs,
        totalPages: Math.ceil(totalJobs / limitNum)
      },
      jobs: sanitizedJobs
    });
  } catch (error) {
    console.error('getAllJobs error:', error);
    res.status(500).json({ success: false, message: 'Error fetching jobs.', error: error.message });
  }
};

const getAdminJobDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = (req.user?.role || '').toLowerCase();
    const userId = req.user?.id;
    const scope = await getUserScope(userId, userRole);

    if (userRole === 'recruiter' && !scope.isGlobal && !scope.jobIds.includes(id)) {
      return res.status(403).json({ success: false, code: 'SCOPE_ACCESS_DENIED', message: 'You do not have permission to view this job.' });
    }

    const jobRows = await db.query(`
      SELECT 
        j.*,
        COALESCE(j.manual_company_name, e.company_name, 'Direct Client') as company_name,
        COALESCE(j.manual_contact_person, e.contact_person_name, '') as contact_person,
        COALESCE(j.manual_contact_phone, e.contact_person_phone, e.contact_phone, e.official_phone, '') as contact_phone,
        COALESCE(j.manual_contact_email, e.contact_person_email, e.contact_email, e.official_email, '') as contact_email,
        COALESCE(j.manual_company_website, e.website, '') as company_website,
        e.logo_url,
        recruiter.name as assigned_recruiter_name,
        recruiter.email as assigned_recruiter_email,
        creator.name as created_by_name,
        updater.name as last_updated_by_name,
        (SELECT COUNT(*) FROM APPLICATION a WHERE a.job_id = j.id) as applicant_count,
        (SELECT COUNT(*) FROM APPLICATION a WHERE a.job_id = j.id) as applicants_count,
        (SELECT COUNT(*) FROM CALLBACK_REQUEST cr WHERE cr.job_id = j.id AND cr.status != 'RESOLVED' AND cr.status != 'Resolved') as pending_callback_count
      FROM JOB j
      LEFT JOIN EMPLOYERS e ON j.employer_id = e.id
      LEFT JOIN USERS recruiter ON j.assigned_recruiter_id = recruiter.id
      LEFT JOIN USERS creator ON j.created_by_user_id = creator.id
      LEFT JOIN USERS updater ON j.last_updated_by_user_id = updater.id
      WHERE j.id = ?
    `, [id]);

    const job = jobRows && jobRows.length > 0 ? jobRows[0] : null;
    if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });

    const skills = await db.query('SELECT skill_name FROM JOB_SKILL WHERE job_id = ?', [id]);
    const keywords = await db.query('SELECT keyword FROM JOB_KEYWORD WHERE job_id = ?', [id]);
    const callbacks = await db.query('SELECT * FROM CALLBACK_REQUEST WHERE job_id = ? ORDER BY created_at DESC', [id]);

    const isAuthorized = Boolean(scope.isGlobal);

    if (!isAuthorized) {
      job.contact_person = job.contact_person ? `${job.contact_person.slice(0, 2)}***` : '';
      job.contact_phone = job.contact_phone ? `${job.contact_phone.slice(0, 3)}****${job.contact_phone.slice(-2)}` : '';
      job.contact_email = maskEmail(job.contact_email);
      job.contact_masked = true;
    }

    res.json({
      success: true,
      job: {
        ...job,
        skills: skills.map(s => s.skill_name),
        keywords: keywords.map(k => k.keyword),
        callbacks: callbacks || []
      }
    });
  } catch (error) {
    console.error('getAdminJobDetails error:', error);
    res.status(500).json({ success: false, message: 'Error retrieving job details.', error: error.message });
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
      status, assigned_recruiter_id, internal_notes, is_recommended, allow_candidate_access,
      manual_company_name, manual_contact_person, manual_contact_phone, manual_contact_email, manual_company_website
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Job title is required.' });
    }
    const cleanLocation = location && location.trim() ? location.trim() : [city, state, country].filter(Boolean).join(', ') || 'Remote / Flexible';

    const id = uuidv4();
    let targetStatus = status || 'draft';
    if (!['open', 'draft', 'closed'].includes(targetStatus)) targetStatus = 'draft';

    const skillsString = Array.isArray(required_skills) ? JSON.stringify(required_skills) : (required_skills || null);
    const keywordsString = Array.isArray(keywords) ? JSON.stringify(keywords) : (keywords || null);
    const benefitsString = Array.isArray(benefits) ? JSON.stringify(benefits) : (benefits || null);
    const respString = Array.isArray(responsibilities) ? JSON.stringify(responsibilities) : (responsibilities || '');
    const reqString = Array.isArray(requirements) ? JSON.stringify(requirements) : (requirements || '');

    const isRec = is_recommended ? 1 : 0;
    const candAccess = allow_candidate_access !== undefined ? (allow_candidate_access ? 1 : 0) : 1;

    await db.query(`
      INSERT INTO JOB (
        id, employer_id, client_id, category_id, title, department, job_domain,
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
        ?, ?, 'ADMIN', 'Vakancy Recruitment'
      )
    `, [
      id, employer_id || null, client_id || null, category_id || null, title.trim(), department || 'General', job_domain || 'General',
      employment_type || 'Full-Time', workplace_type || 'On-Site', seniority_level || 'Mid Level', cleanLocation,
      country || 'India', state || null, city || null, locality || null,
      parseFloat(min_experience) || 0, parseFloat(max_experience) || 0, fresher_allowed ? 1 : 0, min_qualification || null, degree || null, specialization || null,
      skillsString, keywordsString, notice_period || null,
      min_salary ? parseFloat(min_salary) : null, max_salary ? parseFloat(max_salary) : null, currency || 'INR', salary_period || 'Per Year', salary_type || 'CTC', benefitsString, application_deadline || null,
      description || '', respString, reqString, parseInt(openings_count, 10) || 1,
      targetStatus, isRec, candAccess, assigned_recruiter_id || null, internal_notes || null,
      manual_company_name ? manual_company_name.trim() : null,
      manual_contact_person ? manual_contact_person.trim() : null,
      manual_contact_phone ? manual_contact_phone.trim() : null,
      manual_contact_email ? manual_contact_email.trim() : null,
      manual_company_website ? manual_company_website.trim() : null,
      req.user.id, req.user.id
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
      related_job_id: id,
      description: `Created Admin job posting: ${title} (Status: ${targetStatus}${isRec ? ', Recommended' : ''})`
    });

    res.status(201).json({
      success: true,
      message: 'Job created successfully.',
      job_id: id,
      job: { id, created_by_type: 'ADMIN' }
    });
  } catch (error) {
    console.error('createInternalJob error:', error);
    res.status(500).json({ success: false, message: 'Error creating job.', error: error.message });
  }
};

const updateInternalJob = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db.query('SELECT * FROM JOB WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Job not found.' });

    const current = existing[0];

    // STRICT SECTION 4 OWNERSHIP RULE:
    // For jobs created through Employer Portal, Admin must NOT edit the original employer-created job details!
    if (current.created_by_type === 'EMPLOYER') {
      return res.status(403).json({
        success: false,
        code: 'EMPLOYER_JOB_IMMUTABLE',
        message: 'Forbidden. Admin cannot edit original employer-created job details. Only administrative controls (candidate access, archive/restore, recruiter assignment) may be modified.'
      });
    }

    const {
      title, category_id, department, job_domain, employment_type, workplace_type, seniority_level,
      location, country, state, city, locality,
      min_experience, max_experience, fresher_allowed, min_qualification, degree, specialization,
      required_skills, keywords, notice_period,
      min_salary, max_salary, currency, salary_period, salary_type, benefits, application_deadline,
      description, responsibilities, requirements, employer_id, client_id, openings_count,
      status, assigned_recruiter_id, internal_notes, is_recommended, allow_candidate_access,
      manual_company_name, manual_contact_person, manual_contact_phone, manual_contact_email, manual_company_website
    } = req.body;

    const newTitle = title !== undefined ? title.trim() : current.title;
    const cleanLocation = location !== undefined ? location.trim() : current.location;
    let targetStatus = status !== undefined ? status : current.status;
    if (!['open', 'draft', 'closed'].includes(targetStatus)) targetStatus = current.status;

    const skillsString = required_skills !== undefined ? (Array.isArray(required_skills) ? JSON.stringify(required_skills) : required_skills) : current.required_skills;
    const keywordsString = keywords !== undefined ? (Array.isArray(keywords) ? JSON.stringify(keywords) : keywords) : current.keywords;
    const benefitsString = benefits !== undefined ? (Array.isArray(benefits) ? JSON.stringify(benefits) : benefits) : current.benefits;
    const respString = responsibilities !== undefined ? (Array.isArray(responsibilities) ? JSON.stringify(responsibilities) : responsibilities) : current.responsibilities;
    const reqString = requirements !== undefined ? (Array.isArray(requirements) ? JSON.stringify(requirements) : requirements) : current.requirements;

    const newRec = is_recommended !== undefined ? (is_recommended ? 1 : 0) : current.is_recommended;
    const newCandAccess = allow_candidate_access !== undefined ? (allow_candidate_access ? 1 : 0) : current.allow_candidate_access;

    // Track field-level audit trail
    const auditFields = [
      { key: 'title', prev: current.title, next: newTitle },
      { key: 'status', prev: current.status, next: targetStatus },
      { key: 'location', prev: current.location, next: cleanLocation },
      { key: 'min_salary', prev: current.min_salary, next: min_salary !== undefined ? parseFloat(min_salary) : current.min_salary },
      { key: 'max_salary', prev: current.max_salary, next: max_salary !== undefined ? parseFloat(max_salary) : current.max_salary },
      { key: 'is_recommended', prev: current.is_recommended, next: newRec },
      { key: 'allow_candidate_access', prev: current.allow_candidate_access, next: newCandAccess },
      { key: 'assigned_recruiter_id', prev: current.assigned_recruiter_id, next: assigned_recruiter_id !== undefined ? assigned_recruiter_id : current.assigned_recruiter_id }
    ];

    for (const f of auditFields) {
      if (String(f.prev ?? '') !== String(f.next ?? '')) {
        await logActivity({
          performed_by: req.user.id,
          action_type: 'UPDATE_JOB_FIELD',
          entity_type: 'JOB',
          entity_id: id,
          related_job_id: id,
          description: `Changed ${f.key} from "${f.prev ?? 'none'}" to "${f.next ?? 'none'}"`,
          changed_field: f.key,
          previous_value: f.prev,
          new_value: f.next
        });
      }
    }

    await db.query(`
      UPDATE JOB SET
        employer_id = ?, client_id = ?, category_id = ?, title = ?, department = ?, job_domain = ?,
        employment_type = ?, workplace_type = ?, seniority_level = ?, location = ?, country = ?, state = ?, city = ?, locality = ?,
        min_experience = ?, max_experience = ?, fresher_allowed = ?, min_qualification = ?, degree = ?, specialization = ?,
        required_skills = ?, keywords = ?, notice_period = ?,
        min_salary = ?, max_salary = ?, currency = ?, salary_period = ?, salary_type = ?, benefits = ?, application_deadline = ?,
        description = ?, responsibilities = ?, requirements = ?, openings_count = ?,
        status = ?, is_recommended = ?, allow_candidate_access = ?, assigned_recruiter_id = ?, internal_notes = ?,
        manual_company_name = ?, manual_contact_person = ?, manual_contact_phone = ?, manual_contact_email = ?, manual_company_website = ?,
        last_updated_by_user_id = ?, updated_at = NOW()
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
      targetStatus, newRec, newCandAccess,
      assigned_recruiter_id !== undefined ? assigned_recruiter_id : current.assigned_recruiter_id,
      internal_notes !== undefined ? internal_notes : current.internal_notes,
      manual_company_name !== undefined ? (manual_company_name ? manual_company_name.trim() : null) : current.manual_company_name,
      manual_contact_person !== undefined ? (manual_contact_person ? manual_contact_person.trim() : null) : current.manual_contact_person,
      manual_contact_phone !== undefined ? (manual_contact_phone ? manual_contact_phone.trim() : null) : current.manual_contact_phone,
      manual_contact_email !== undefined ? (manual_contact_email ? manual_contact_email.trim() : null) : current.manual_contact_email,
      manual_company_website !== undefined ? (manual_company_website ? manual_company_website.trim() : null) : current.manual_company_website,
      req.user.id,
      id
    ]);

    if (Array.isArray(required_skills)) await syncJobSkills(id, required_skills);
    if (Array.isArray(keywords)) await syncJobKeywords(id, keywords);

    // Field-level change audit logging
    const changedFields = [];
    if (newTitle && newTitle !== current.title) changedFields.push({ field: 'title', prev: current.title, next: newTitle });
    if (min_salary !== undefined && parseFloat(min_salary) !== parseFloat(current.min_salary)) changedFields.push({ field: 'min_salary', prev: current.min_salary, next: min_salary });
    if (max_salary !== undefined && parseFloat(max_salary) !== parseFloat(current.max_salary)) changedFields.push({ field: 'max_salary', prev: current.max_salary, next: max_salary });
    if (targetStatus && targetStatus !== current.status) changedFields.push({ field: 'status', prev: current.status, next: targetStatus });

    for (const cf of changedFields) {
      await logActivity({
        performed_by: req.user.id,
        action_type: 'UPDATE_JOB',
        entity_type: 'JOB',
        entity_id: id,
        related_job_id: id,
        changed_field: cf.field,
        previous_value: String(cf.prev || ''),
        new_value: String(cf.next || ''),
        description: `Updated job ${cf.field}: "${cf.prev}" → "${cf.next}"`
      });
    }

    if (changedFields.length === 0) {
      await logActivity({
        performed_by: req.user.id,
        action_type: 'UPDATE_JOB',
        entity_type: 'JOB',
        entity_id: id,
        related_job_id: id,
        description: `Updated Admin job details: ${newTitle} (Status: ${targetStatus})`
      });
    }

    res.json({ success: true, message: 'Job updated successfully.' });
  } catch (error) {
    console.error('updateInternalJob error:', error);
    res.status(500).json({ success: false, message: 'Error updating job.', error: error.message });
  }
};

const archiveJob = async (req, res) => {
  try {
    const { id } = req.params;
    const archive_reason = req.body.archive_reason || req.body.reason;

    if (!archive_reason || !archive_reason.trim() || archive_reason.trim().length < 3) {
      return res.status(400).json({ success: false, message: 'Archive reason is required (minimum 3 characters).' });
    }

    const [job] = await db.query('SELECT * FROM JOB WHERE id = ?', [id]);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });

    await db.query(`
      UPDATE JOB SET 
        is_archived = 1, 
        archive_reason = ?, 
        archived_at = NOW(), 
        last_updated_by_user_id = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [archive_reason.trim(), req.user.id, id]);

    await logActivity({
      performed_by: req.user.id,
      action_type: 'ARCHIVE_JOB',
      entity_type: 'JOB',
      entity_id: id,
      related_job_id: id,
      description: `Archived job "${job.title}". Reason: ${archive_reason.trim()}`,
      changed_field: 'is_archived',
      previous_value: job.is_archived || 0,
      new_value: 1
    });

    res.json({ success: true, message: 'Job archived successfully.' });
  } catch (error) {
    console.error('archiveJob error:', error);
    res.status(500).json({ success: false, message: 'Error archiving job.', error: error.message });
  }
};

const restoreJob = async (req, res) => {
  try {
    const { id } = req.params;
    const target_status = req.body.target_status || req.body.status;
    const restore_note = req.body.restore_note || req.body.note;

    if (!target_status || !['draft', 'open'].includes(target_status)) {
      return res.status(400).json({
        success: false,
        message: 'Target status is required when restoring a job. Explicitly choose "draft" or "open".'
      });
    }

    const [job] = await db.query('SELECT * FROM JOB WHERE id = ?', [id]);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });

    await db.query(`
      UPDATE JOB SET 
        is_archived = 0, 
        status = ?, 
        restored_at = NOW(), 
        restore_note = ?, 
        last_updated_by_user_id = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [target_status, restore_note ? restore_note.trim() : null, req.user.id, id]);

    await logActivity({
      performed_by: req.user.id,
      action_type: 'RESTORE_JOB',
      entity_type: 'JOB',
      entity_id: id,
      related_job_id: id,
      description: `Restored job "${job.title}" to status "${target_status}".${restore_note ? ` Note: ${restore_note.trim()}` : ''}`,
      changed_field: 'is_archived',
      previous_value: 1,
      new_value: 0
    });

    res.json({ success: true, message: `Job restored successfully as ${target_status}.` });
  } catch (error) {
    console.error('restoreJob error:', error);
    res.status(500).json({ success: false, message: 'Error restoring job.', error: error.message });
  }
};

const toggleCandidateAccess = async (req, res) => {
  try {
    const { id } = req.params;
    const { allow_candidate_access } = req.body;

    if (allow_candidate_access === undefined) {
      return res.status(400).json({ success: false, message: 'allow_candidate_access boolean is required.' });
    }

    const [job] = await db.query('SELECT * FROM JOB WHERE id = ?', [id]);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });

    const newAccess = allow_candidate_access ? 1 : 0;
    const prevAccess = job.allow_candidate_access !== undefined && job.allow_candidate_access !== null ? job.allow_candidate_access : 1;

    await db.query(`
      UPDATE JOB SET 
        allow_candidate_access = ?, 
        last_updated_by_user_id = ?, 
        updated_at = NOW() 
      WHERE id = ?
    `, [newAccess, req.user.id, id]);

    await logActivity({
      performed_by: req.user.id,
      action_type: 'CANDIDATE_ACCESS_TOGGLE',
      entity_type: 'JOB',
      entity_id: id,
      related_job_id: id,
      description: `Switched candidate access ${newAccess ? 'ON' : 'OFF'} for job "${job.title}"`,
      changed_field: 'allow_candidate_access',
      previous_value: prevAccess,
      new_value: newAccess
    });

    res.json({
      success: true,
      message: `Candidate access switched ${newAccess ? 'ON' : 'OFF'} for this job.`,
      allow_candidate_access: newAccess
    });
  } catch (error) {
    console.error('toggleCandidateAccess error:', error);
    res.status(500).json({ success: false, message: 'Error updating candidate access.', error: error.message });
  }
};

const getJobHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const history = await db.query(`
      SELECT 
        ra.id, ra.action_type, ra.description, ra.changed_field, ra.previous_value, ra.new_value, ra.created_at,
        u.name as performed_by_name, u.email as performed_by_email, u.role as performed_by_role
      FROM RECRUITMENT_ACTIVITY ra
      LEFT JOIN USERS u ON ra.performed_by = u.id
      WHERE ra.related_job_id = ? OR (ra.entity_type = 'JOB' AND ra.entity_id = ?)
      ORDER BY ra.created_at DESC
      LIMIT 100
    `, [id, id]);

    res.json({ success: true, count: history.length, history: history || [] });
  } catch (error) {
    console.error('getJobHistory error:', error);
    res.status(500).json({ success: false, message: 'Error fetching job history.', error: error.message });
  }
};

const getJobApplicants = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = (req.user?.role || '').toLowerCase();
    const userId = req.user?.id;

    // Strict BD privacy guard: BD roles have zero applicant or candidate access
    if (userRole === 'bd' || userRole === 'bd_lead') {
      return res.status(403).json({
        success: false,
        code: 'PRIVACY_PROTECTION_ACCESS_DENIED',
        message: 'Forbidden. BD roles are strictly prohibited from accessing applicant records.'
      });
    }

    const scope = await getUserScope(userId, userRole);

    if (userRole === 'recruiter' && !scope.isGlobal && !scope.jobIds.includes(id)) {
      return res.status(403).json({ success: false, code: 'SCOPE_ACCESS_DENIED', message: 'You do not have permission to view applicants for this job.' });
    }

    const apps = await db.query(`
      SELECT 
        a.id as application_id, a.job_id, a.candidate_id, a.status, a.applied_at,
        a.rejection_reason, a.status_updated_at,
        a.resume_id, a.resume_url, a.resume_filename, a.candidate_snapshot,
        c.name as current_candidate_name, c.professional_headline, c.current_location,
        c.total_experience, c.current_organization, c.current_designation,
        u.email as candidate_email, u.phone as candidate_phone,
        updater.name as status_updated_by_name
      FROM APPLICATION a
      JOIN CANDIDATES c ON a.candidate_id = c.id
      JOIN USERS u ON c.user_id = u.id
      LEFT JOIN USERS updater ON a.status_updated_by_user_id = updater.id
      WHERE a.job_id = ?
      ORDER BY a.applied_at DESC
    `, [id]);

    const formatted = apps.map(app => {
      let snapshot = null;
      if (app.candidate_snapshot) {
        try {
          snapshot = typeof app.candidate_snapshot === 'string' ? JSON.parse(app.candidate_snapshot) : app.candidate_snapshot;
        } catch (_) {}
      }

      return {
        id: app.application_id,
        application_id: app.application_id,
        job_id: app.job_id,
        candidate_id: app.candidate_id,
        status: app.status,
        applied_at: app.applied_at,
        rejection_reason: app.rejection_reason,
        status_updated_at: app.status_updated_at,
        status_updated_by_name: app.status_updated_by_name,
        resume_id: app.resume_id,
        resume_url: app.resume_url,
        resume_filename: app.resume_filename,
        snapshot,
        candidate_name: snapshot?.name || app.current_candidate_name,
        candidate_email: snapshot?.email || app.candidate_email,
        candidate_phone: snapshot?.phone || app.candidate_phone,
        professional_headline: snapshot?.professional_headline || app.professional_headline,
        current_location: snapshot?.current_location || app.current_location,
        total_experience: snapshot?.total_experience || app.total_experience
      };
    });

    res.json({ success: true, count: formatted.length, applicants: formatted });
  } catch (error) {
    console.error('getJobApplicants error:', error);
    res.status(500).json({ success: false, message: 'Error fetching applicants.', error: error.message });
  }
};

const getAdminApplicationResume = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = (req.user?.role || '').toLowerCase();
    const userId = req.user?.id;
    const scope = await getUserScope(userId, userRole);

    const apps = await db.query(`
      SELECT 
        a.id, a.job_id, a.candidate_id, a.resume_id, a.resume_url, a.resume_filename,
        c.name as candidate_name, cr.cloudinary_public_id, cr.file_url as cr_file_url,
        cr.file_name as cr_file_name
      FROM APPLICATION a
      JOIN CANDIDATES c ON a.candidate_id = c.id
      LEFT JOIN CANDIDATE_RESUME cr ON a.resume_id = cr.id
      WHERE a.id = ?
    `, [id]);

    if (apps.length === 0) {
      return res.status(404).json({ success: false, message: 'Application record not found.' });
    }

    const app = apps[0];

    // Every non-global internal role is restricted to its assigned job scope.
    if (!scope.isGlobal && !scope.jobIds.includes(app.job_id)) {
      return res.status(403).json({
        success: false,
        code: 'SCOPE_ACCESS_DENIED',
        message: 'You do not have permission to view resumes for this job application.'
      });
    }

    let publicId = app.cloudinary_public_id;
    const rawUrl = app.resume_url || app.cr_file_url;
    const filename = app.resume_filename || app.cr_file_name || 'candidate_resume.pdf';

    // If public_id is not directly on cr row, attempt lookup by file_url or candidate_resume
    if (!publicId && app.resume_id) {
      const crLookup = await db.query('SELECT cloudinary_public_id, file_url FROM CANDIDATE_RESUME WHERE id = ?', [app.resume_id]);
      if (crLookup.length > 0) {
        publicId = crLookup[0].cloudinary_public_id;
      }
    }

    if (!rawUrl && !publicId) {
      return res.status(404).json({
        success: false,
        message: 'No resume on file for this candidate application.'
      });
    }

    let deliveryUrl = rawUrl;
    // Generate fresh time-limited secure signed URL for Cloudinary authenticated files
    if (publicId || (rawUrl && rawUrl.includes('cloudinary.com'))) {
      try {
        const { cloudinary } = require('../services/cloudinaryService');
        let targetPublicId = publicId;
        if (!targetPublicId && rawUrl) {
          if (rawUrl.includes('/authenticated/')) {
            targetPublicId = rawUrl.split('/authenticated/')[1]?.replace(/^s--[^/]+--\//, '')?.replace(/^v\d+\//, '')?.replace(/\.[^/.]+$/, '');
          } else if (rawUrl.includes('/upload/')) {
            targetPublicId = rawUrl.split('/upload/')[1]?.replace(/^v\d+\//, '')?.replace(/\.[^/.]+$/, '');
          }
        }

        if (targetPublicId) {
          const resourceType = rawUrl && rawUrl.includes('/raw/upload/') ? 'raw' : 'image';
          deliveryUrl = cloudinary.utils.url(targetPublicId, {
            type: 'authenticated',
            resource_type: resourceType,
            sign_url: true,
            secure: true,
            format: resourceType === 'image' ? 'pdf' : undefined
          });
        }
      } catch (cloudErr) {
        console.warn('Cloudinary signing notice in getAdminApplicationResume:', cloudErr.message);
      }
    }

    res.json({
      success: true,
      url: deliveryUrl,
      filename,
      candidate_name: app.candidate_name,
      application_id: app.id,
      resume_id: app.resume_id
    });
  } catch (error) {
    console.error('getAdminApplicationResume error:', error);
    res.status(500).json({ success: false, message: 'Error retrieving application resume.', error: error.message });
  }
};

const assignJobRecruiter = async (req, res) => {
  try {
    const { id } = req.params;
    const { assigned_recruiter_id } = req.body;

    if (!assigned_recruiter_id) {
      return res.status(400).json({ success: false, message: 'Recruiter ID is required.' });
    }

    const callerRole = (req.user?.role || '').toLowerCase();
    const isDirector = callerRole === 'director' || callerRole === 'main_admin' || req.user?.is_main_admin === 1;

    if (!isDirector) {
      // Caller is a Team Manager / Coordinator
      // Verify target recruiter reports to caller or belongs to a team led by caller
      const eligibleRecruiters = await db.query(`
        SELECT u.id FROM USERS u
        LEFT JOIN USER_ASSIGNMENTS ua ON u.id = ua.user_id
        LEFT JOIN TEAMS t ON (ua.team_id = t.id OR u.team_id = t.id)
        WHERE (u.reporting_user_id = ? OR t.lead_user_id = ?) AND u.id = ?
      `, [req.user.id, req.user.id, assigned_recruiter_id]);

      if (!eligibleRecruiters || eligibleRecruiters.length === 0) {
        return res.status(403).json({
          success: false,
          code: 'TEAM_SCOPE_VIOLATION',
          message: 'Forbidden. You can only assign jobs to recruiters within your designated team.'
        });
      }
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

const assignJobTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const { assigned_team_id } = req.body;

    const callerRole = (req.user?.role || '').toLowerCase();
    const isDirector = callerRole === 'director' || callerRole === 'main_admin' || req.user?.is_main_admin === 1;

    if (!isDirector) {
      return res.status(403).json({
        success: false,
        code: 'DIRECTOR_REQUIRED',
        message: 'Forbidden. Only the Director can assign jobs to teams.'
      });
    }

    await db.query('UPDATE JOB SET assigned_team_id = ? WHERE id = ?', [assigned_team_id || null, id]);

    await logActivity({
      performed_by: req.user.id,
      action_type: 'ASSIGN_JOB_TEAM',
      entity_type: 'JOB',
      entity_id: id,
      description: `Director assigned mandate ${id} to team ${assigned_team_id || 'None'}`
    });

    res.json({ success: true, message: 'Job assigned to team successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error assigning job to team.', error: error.message });
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
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 25));
    const offset = (page - 1) * limit;
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
      if (stage === 'under_review') {
        whereClauses.push("a.status IN ('under_review', 'reviewing')");
      } else if (stage === 'selected') {
        whereClauses.push("a.status IN ('selected', 'hired')");
      } else {
        whereClauses.push('a.status = ?');
        queryParams.push(stage);
      }
    }

    if (search && search.trim()) {
      whereClauses.push('(LOWER(c.name) LIKE ? OR LOWER(j.title) LIKE ? OR LOWER(u.email) LIKE ? OR LOWER(e.company_name) LIKE ?)');
      const term = `%${search.trim().toLowerCase()}%`;
      queryParams.push(term, term, term, term);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const applications = await db.query(`
      SELECT 
        a.id, a.job_id, a.candidate_id, a.status, a.applied_at,
        a.resume_id, a.resume_url, a.resume_filename, a.candidate_snapshot, a.rejection_reason,
        a.status_updated_at,
        c.name as candidate_name, c.professional_headline, c.current_location,
        c.total_experience, c.current_organization, c.current_designation,
        c.professional_summary,
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
      LIMIT ? OFFSET ?
    `, [...queryParams, limit, offset]);

    const normalizedApps = (applications || []).map(a => {
      let snapshot = null;
      if (a.candidate_snapshot) {
        try {
          snapshot = typeof a.candidate_snapshot === 'string' ? JSON.parse(a.candidate_snapshot) : a.candidate_snapshot;
        } catch (_) {}
      }
      let canonicalStatus = a.status || 'applied';
      if (canonicalStatus === 'reviewing') canonicalStatus = 'under_review';
      if (canonicalStatus === 'hired') canonicalStatus = 'selected';

      return {
        ...a,
        status: canonicalStatus,
        candidate_snapshot: snapshot
      };
    });

    res.json({ success: true, count: normalizedApps.length, applications: normalizedApps, pagination: { page, limit, has_more: normalizedApps.length === limit } });
  } catch (error) {
    console.error('getAllApplications error:', error);
    res.status(500).json({ success: false, message: 'Error fetching applications.', error: error.message });
  }
};

const updateApplicationStage = async (req, res) => {
  try {
    const { id } = req.params;
    const { stage, status, rejection_reason, notes } = req.body;
    const userRole = (req.user?.role || '').toLowerCase();
    const userId = req.user?.id;
    const scope = await getUserScope(userId, userRole);

    const inputStatus = (status || stage || '').toLowerCase().trim();

    const targetStatus = normalizeApplicationStatus(inputStatus);

    if (!STATUSES.includes(targetStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid application status "${inputStatus}". Allowed: ${STATUSES.join(', ')}`
      });
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
    const transition = validateTransition(app.status, targetStatus);
    if (!transition.valid) {
      return res.status(409).json({ success: false, code: transition.code, message: `Application cannot move from '${transition.from}' to '${transition.to}'.` });
    }
    if (transition.unchanged) return res.json({ success: true, unchanged: true, message: 'Application is already in this stage.', status: targetStatus });

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

    const cleanRejectionReason = targetStatus === 'rejected' ? (rejection_reason || notes || null) : null;

    await db.query(`
      UPDATE APPLICATION SET 
        status = ?, 
        rejection_reason = ?, 
        status_updated_by_user_id = ?, 
        status_updated_at = NOW() 
      WHERE id = ?
    `, [targetStatus, cleanRejectionReason, req.user.id, id]);

    // Keep JOB_CANDIDATE_SHORTLIST in sync when moving to/from 'shortlisted' stage
    if (targetStatus === 'shortlisted') {
      try {
        await db.query(`
          INSERT INTO JOB_CANDIDATE_SHORTLIST 
            (id, job_id, candidate_id, application_id, shortlisted_by_user_id, source)
          VALUES (?, ?, ?, ?, ?, 'APPLICANT')
          ON DUPLICATE KEY UPDATE application_id = VALUES(application_id), updated_at = NOW()
        `, [uuidv4(), app.job_id, app.candidate_id, id, req.user.id]);
      } catch (err) {
        console.warn('Sync to JOB_CANDIDATE_SHORTLIST error:', err.message);
      }
    } else if (app.status === 'shortlisted' && targetStatus !== 'shortlisted') {
      try {
        await db.query(`
          DELETE FROM JOB_CANDIDATE_SHORTLIST 
          WHERE job_id = ? AND candidate_id = ? AND (application_id = ? OR source = 'APPLICANT')
        `, [app.job_id, app.candidate_id, id]);
      } catch (err) {
        console.warn('Remove from JOB_CANDIDATE_SHORTLIST error:', err.message);
      }
    }

    await logActivity({
      performed_by: req.user.id,
      action_type: 'UPDATE_APPLICATION_STATUS',
      entity_type: 'APPLICATION',
      entity_id: id,
      related_job_id: app.job_id,
      related_application_id: id,
      description: `Updated status for ${app.candidate_name} to '${targetStatus}' on job '${app.job_title}'${cleanRejectionReason ? ` (Reason: ${cleanRejectionReason})` : ''}`,
      changed_field: 'status',
      previous_value: app.status,
      new_value: targetStatus
    });

    const [candidateUser] = await db.query('SELECT c.user_id, u.email FROM CANDIDATES c JOIN USERS u ON c.user_id = u.id WHERE c.id = ?', [app.candidate_id]);
    if (candidateUser?.user_id) {
      await db.query(
        'INSERT INTO NOTIFICATION (id, user_id, type, title, message, reference_type, reference_id, is_read) VALUES (?, ?, ?, ?, ?, ?, ?, 0)',
        [uuidv4(), candidateUser.user_id, 'application_status', 'Application status updated', `Your application for ${app.job_title} is now ${targetStatus.replace(/_/g, ' ')}.`, 'APPLICATION', id]
      );
      if (app.status !== targetStatus && await canSendStageEmail(candidateUser.user_id)) {
        await sendApplicationStageEmail(candidateUser.email, { jobTitle: app.job_title, status: targetStatus });
      }
    }

    res.json({
      success: true,
      message: `Application status updated to '${targetStatus}'.`,
      status: targetStatus,
      rejection_reason: cleanRejectionReason
    });
  } catch (error) {
    console.error('updateApplicationStage error:', error);
    res.status(500).json({ success: false, message: 'Error updating application status.', error: error.message });
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

    const decryptedShares = (shares || []).map(s => {
      let accessCode = null;
      if (s.access_code_encrypted) {
        try {
          accessCode = cryptoUtils.decryptAccessCode(s.access_code_encrypted);
        } catch (_) {}
      }
      return {
        ...s,
        access_code: accessCode
      };
    });

    res.json({ success: true, count: decryptedShares.length, shares: decryptedShares || [] });
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
      candidate_consent === true ? 1 : 0, consent_notes || null,
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
    `, [req.user.id, candidate_consent === undefined ? null : (candidate_consent ? 1 : 0), consent_notes || null, share_scope || null, id]);

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

    // Generate and cryptographically protect client access code (AES-256-GCM + SHA-256)
    const rawAccessCode = cryptoUtils.generateAccessCode();
    const accessCodeEncrypted = cryptoUtils.encryptAccessCode(rawAccessCode);
    const accessCodeHash = cryptoUtils.hashAccessCode(rawAccessCode);

    // Set 14-day expiry date
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    await db.withTransaction(async (tx) => {
      await tx.query(`
        UPDATE CANDIDATE_SHARING 
        SET status = 'APPROVED', approved_by_user_id = ?, expires_at = ?,
            access_code_encrypted = ?, access_code_hash = ?
        WHERE id = ?
      `, [
        req.user.id, expiresAt,
        accessCodeEncrypted, accessCodeHash,
        id
      ]);

      await logActivity({
        performed_by: req.user.id,
        action_type: 'APPROVE_CANDIDATE_SHARE',
        entity_type: 'CANDIDATE_SHARING',
        entity_id: id,
        description: 'Approved consented candidate sharing. Access code generated with 14-day validity.'
      }, tx);
    });

    res.json({
      success: true,
      message: 'Candidate share approved. Secure link and access code generated.',
      share_token: share.share_token,
      access_code: rawAccessCode,
      share_url: `/share/${share.share_token}`,
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

    if (!share.candidate_consent) {
      return res.status(403).json({ success: false, message: 'Candidate consent is required for this shared profile.' });
    }

    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return res.status(410).json({ success: false, message: 'This candidate sharing link has expired.' });
    }

    // Access Code Verification (AES-256-GCM / SHA-256 protected)
    if (share.access_code_hash) {
      const providedCode = req.headers['x-access-code'] || req.query.code || req.query.access_code;
      if (!providedCode) {
        return res.status(401).json({
          success: false,
          code: 'ACCESS_CODE_REQUIRED',
          message: 'Access Code Required: Please enter the secure access code provided by your Vakancy account manager.'
        });
      }
      if (!cryptoUtils.verifyAccessCode(providedCode, share.access_code_hash)) {
        return res.status(401).json({
          success: false,
          code: 'INVALID_ACCESS_CODE',
          message: 'Invalid access code. Access denied.'
        });
      }
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

    const includeDetails = ['full', 'with_resume', 'detailed'].includes(share.share_scope);
    const experience = includeDetails ? await db.query('SELECT organization, designation, from_date, to_date, is_currently_working, key_achievements FROM CANDIDATE_EXPERIENCE WHERE candidate_id = ? ORDER BY from_date DESC', [share.candidate_id]) : [];
    const education = includeDetails ? await db.query('SELECT degree, institution, specialization, year FROM CANDIDATE_EDUCATION WHERE candidate_id = ? ORDER BY year DESC', [share.candidate_id]) : [];
    const projects = includeDetails ? await db.query('SELECT project_name, role, description, technologies FROM CANDIDATE_PROJECT WHERE candidate_id = ? ORDER BY created_at DESC', [share.candidate_id]) : [];
    const skills = includeDetails ? await db.query(`
      SELECT s.name, s.category 
      FROM CANDIDATE_SKILL cs 
      JOIN SKILL s ON cs.skill_id = s.id 
      WHERE cs.candidate_id = ?
    `, [share.candidate_id]) : [];

    // Resume is ONLY shared if share_scope explicitly authorizes it
    let resumeData = null;
    if (share.share_scope === 'with_resume' || share.share_scope === 'full') {
      const resumes = await db.query('SELECT id, file_name FROM CANDIDATE_RESUME WHERE candidate_id = ? AND is_primary = 1 LIMIT 1', [share.candidate_id]);
      if (resumes && resumes.length > 0) {
        resumeData = { file_name: resumes[0].file_name, access: 'secure_endpoint', endpoint: `/api/admin/shared-profile/${token}/resume` };
      }
    }

    try {
      const fingerprint = crypto.createHash('sha256').update(`${req.ip || ''}|${req.get('user-agent') || ''}`).digest('hex');
      await db.query('INSERT INTO CANDIDATE_SHARE_ACCESS_LOG (id, share_id, action, request_fingerprint) VALUES (?, ?, ?, ?)', [uuidv4(), share.id, 'PROFILE_VIEW', fingerprint]);
    } catch (auditError) {
      console.warn('Candidate share profile audit unavailable:', auditError.message);
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

const getSharedResumeByToken = async (req, res) => {
  try {
    const { token } = req.params;
    const [share] = await db.query('SELECT * FROM CANDIDATE_SHARING WHERE share_token = ? LIMIT 1', [token]);
    if (!share || share.status !== 'APPROVED' || !share.candidate_consent) {
      return res.status(403).json({ success: false, message: 'Resume access is not authorized.' });
    }
    if (share.expires_at && new Date(share.expires_at) <= new Date()) {
      return res.status(410).json({ success: false, message: 'This candidate sharing link has expired.' });
    }
    if (!['with_resume', 'full'].includes(share.share_scope)) {
      return res.status(403).json({ success: false, message: 'Resume access is outside the approved sharing scope.' });
    }
    if (share.access_code_hash) {
      const code = req.headers['x-access-code'] || req.query.code || req.query.access_code;
      if (!code || !cryptoUtils.verifyAccessCode(code, share.access_code_hash)) {
        return res.status(401).json({ success: false, code: 'INVALID_ACCESS_CODE', message: 'A valid access code is required.' });
      }
    }
    const [resume] = await db.query('SELECT file_name, file_url, cloudinary_public_id FROM CANDIDATE_RESUME WHERE candidate_id = ? AND is_primary = 1 LIMIT 1', [share.candidate_id]);
    if (!resume?.cloudinary_public_id) return res.status(404).json({ success: false, message: 'Resume is unavailable.' });
    const { generateSignedUrl } = require('../services/cloudinaryService');
    const resourceType = resume.file_url?.includes('/raw/upload/') ? 'raw' : 'image';
    const deliveryType = resume.file_url?.includes('/authenticated/') ? 'authenticated' : 'upload';
    const url = generateSignedUrl(resume.cloudinary_public_id, { resource_type: resourceType, type: deliveryType, expires_in: 600 });
    try {
      const fingerprint = crypto.createHash('sha256').update(`${req.ip || ''}|${req.get('user-agent') || ''}`).digest('hex');
      await db.query('INSERT INTO CANDIDATE_SHARE_ACCESS_LOG (id, share_id, action, request_fingerprint) VALUES (?, ?, ?, ?)', [uuidv4(), share.id, 'RESUME_VIEW', fingerprint]);
    } catch (_) {}
    res.json({ success: true, file_name: resume.file_name || 'candidate_resume.pdf', url, expires_in: 600 });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving shared resume.' });
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
        u_assign.email as assigned_to_email,
        u_assign.name as assigned_to_name,
        COALESCE(j_cnt.cnt, CASE WHEN eq.job_id IS NOT NULL THEN 1 ELSE 0 END) as linked_jobs_count
      FROM EMPLOYER_ENQUIRY eq
      LEFT JOIN EMPLOYERS e ON eq.employer_id = e.id
      LEFT JOIN JOB j ON eq.job_id = j.id
      LEFT JOIN APPLICATION a ON eq.application_id = a.id
      LEFT JOIN CANDIDATES c ON a.candidate_id = c.id
      LEFT JOIN USERS u_assign ON eq.assigned_to_user_id = u_assign.id
      LEFT JOIN (
        SELECT enquiry_id, COUNT(*) as cnt
        FROM JOB
        WHERE enquiry_id IS NOT NULL
        GROUP BY enquiry_id
      ) j_cnt ON eq.id = j_cnt.enquiry_id
    `;
    const { search, status, source } = req.query;
    let whereClauses = [];
    let params = [];

    // Director / Main Admin / Admin / Super Admin has full global oversight
    const isAuthorizedAdmin = ['director', 'main_admin', 'admin', 'super_admin'].includes(userRole) || req.user?.is_main_admin === 1;

    // Recruiter only views enquiries assigned to them
    if (userRole === 'recruiter' && !isAuthorizedAdmin) {
      whereClauses.push('(eq.assigned_to_user_id = ?)');
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

    // Mask contact details for unauthorized staff, but authorized admins, assigned staff, and Contact Us submissions display full contact details
    const sanitized = enquiries.map(enq => {
      const isContactUs = enq.source === 'CONTACT_US' || enq.enquiry_type === 'General Inquiry';
      const canViewContact = isAuthorizedAdmin || isContactUs || (enq.assigned_to_user_id && enq.assigned_to_user_id === userId);
      return {
        ...enq,
        contact_email: canViewContact ? enq.contact_email : (enq.contact_email ? maskEmail(enq.contact_email) : null),
        contact_phone: canViewContact ? enq.contact_phone : (enq.contact_phone ? maskPhone(enq.contact_phone) : null)
      };
    });

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
    const userRole = (req.user?.role || '').toLowerCase();
    const isDirector = userRole === 'director' || userRole === 'main_admin' || req.user?.is_main_admin === 1;

    if (!isDirector) {
      return res.status(403).json({
        success: false,
        code: 'PERMISSION_DENIED',
        message: 'Only Director or Admin can assign or reassign enquiries.'
      });
    }

    const [existing] = await db.query('SELECT id, assigned_to_user_id, status FROM EMPLOYER_ENQUIRY WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Enquiry not found.' });
    }

    let assigneeName = 'staff';
    let isReassignment = false;

    if (assigned_to_user_id) {
      const assignees = await db.query('SELECT id, name, email, role FROM USERS WHERE id = ? AND is_active = 1 LIMIT 1', [assigned_to_user_id]);
      if (!assignees || assignees.length === 0) {
        return res.status(400).json({ success: false, message: 'Assigned user is invalid or inactive.' });
      }
      
      const targetUser = assignees[0];
      if (targetUser.role !== 'recruiter') {
        return res.status(400).json({ success: false, message: 'Enquiries must be assigned to an active Recruiter.' });
      }

      assigneeName = targetUser.name || targetUser.email;
      isReassignment = Boolean(existing.assigned_to_user_id && existing.assigned_to_user_id !== assigned_to_user_id);
    }

    if (assigned_to_user_id) {
      await db.query(
        'UPDATE EMPLOYER_ENQUIRY SET assigned_to_user_id = ?, status = CASE WHEN status = "NEW" THEN "ASSIGNED" ELSE status END WHERE id = ?',
        [assigned_to_user_id, id]
      );
    } else {
      await db.query('UPDATE EMPLOYER_ENQUIRY SET assigned_to_user_id = NULL WHERE id = ?', [id]);
    }

    const actionType = isReassignment ? 'REASSIGN_ENQUIRY' : (assigned_to_user_id ? 'ASSIGN_ENQUIRY' : 'UNASSIGN_ENQUIRY');
    const desc = assigned_to_user_id
      ? (isReassignment ? `Reassigned recruitment enquiry to ${assigneeName}` : `Assigned recruitment enquiry to ${assigneeName}`)
      : 'Unassigned recruitment enquiry';

    await logActivity({
      performed_by: req.user.id,
      action_type: actionType,
      entity_type: 'ENQUIRY',
      entity_id: id,
      related_enquiry_id: id,
      changed_field: 'assigned_to_user_id',
      previous_value: existing.assigned_to_user_id || 'unassigned',
      new_value: assigned_to_user_id || 'unassigned',
      description: desc
    });

    res.json({
      success: true,
      message: assigned_to_user_id
        ? (isReassignment ? `Enquiry successfully reassigned to ${assigneeName}.` : `Enquiry successfully assigned to ${assigneeName}.`)
        : 'Enquiry unassigned.',
      enquiry_id: id,
      assigned_to_user_id: assigned_to_user_id || null,
      assigned_to_name: assigned_to_user_id ? assigneeName : null,
      is_reassignment: isReassignment
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error assigning enquiry.', error: error.message });
  }
};

const updateEnquiryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assigned_to_user_id } = req.body;
    const userRole = (req.user?.role || '').toLowerCase();
    const userId = req.user?.id;
    const isDirector = userRole === 'director' || userRole === 'main_admin' || req.user?.is_main_admin === 1;

    const [existing] = await db.query('SELECT assigned_to_user_id, status FROM EMPLOYER_ENQUIRY WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Enquiry not found.' });

    if (userRole === 'recruiter' && !isDirector) {
      if (existing.assigned_to_user_id !== userId) {
        return res.status(403).json({ success: false, code: 'SCOPE_ACCESS_DENIED', message: 'Cannot update enquiry outside your assigned scope.' });
      }
    }

    const validStatuses = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
    const normStatus = (status || '').toUpperCase();
    if (!validStatuses.includes(normStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid enquiry status.' });
    }

    if (assigned_to_user_id && isDirector) {
      await db.query('UPDATE EMPLOYER_ENQUIRY SET status = ?, assigned_to_user_id = ? WHERE id = ?', [normStatus, assigned_to_user_id, id]);
    } else {
      await db.query('UPDATE EMPLOYER_ENQUIRY SET status = ? WHERE id = ?', [normStatus, id]);
    }

    await logActivity({
      performed_by: req.user.id,
      action_type: 'UPDATE_ENQUIRY_STATUS',
      entity_type: 'ENQUIRY',
      entity_id: id,
      related_enquiry_id: id,
      changed_field: 'status',
      previous_value: existing.status || 'NEW',
      new_value: normStatus,
      description: `Updated enquiry status to ${normStatus}`
    });

    res.json({ success: true, message: `Enquiry status updated to ${normStatus}.` });
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
    const isDirector = userRole === 'director' || userRole === 'main_admin' || req.user?.is_main_admin === 1;

    const [existing] = await db.query('SELECT assigned_to_user_id, status, notes, follow_up_date FROM EMPLOYER_ENQUIRY WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Enquiry not found.' });
    }

    // Check scope if Recruiter
    if (userRole === 'recruiter' && !isDirector) {
      if (existing.assigned_to_user_id !== userId) {
        return res.status(403).json({ success: false, code: 'SCOPE_ACCESS_DENIED', message: 'Cannot edit enquiry outside your assigned scope.' });
      }
    }

    const updates = [];
    const params = [];

    if (status) {
      const validStatuses = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
      const normStatus = status.toUpperCase();
      if (!validStatuses.includes(normStatus)) {
        return res.status(400).json({ success: false, message: 'Invalid enquiry status.' });
      }
      updates.push('status = ?');
      params.push(normStatus);
    }

    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }

    if (follow_up_date !== undefined) {
      updates.push('follow_up_date = ?');
      params.push(follow_up_date || null);
    }

    if (assigned_to_user_id !== undefined && isDirector) {
      updates.push('assigned_to_user_id = ?');
      params.push(assigned_to_user_id || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields provided for update.' });
    }

    params.push(id);
    await db.query(`UPDATE EMPLOYER_ENQUIRY SET ${updates.join(', ')} WHERE id = ?`, params);

    // Activity logging
    if (status && status.toUpperCase() !== existing.status) {
      await logActivity({
        performed_by: req.user.id,
        action_type: 'UPDATE_ENQUIRY_STATUS',
        entity_type: 'ENQUIRY',
        entity_id: id,
        related_enquiry_id: id,
        changed_field: 'status',
        previous_value: existing.status || 'NEW',
        new_value: status.toUpperCase(),
        description: `Updated enquiry status to ${status.toUpperCase()}`
      });
    }

    if (notes !== undefined && notes !== existing.notes) {
      await logActivity({
        performed_by: req.user.id,
        action_type: 'ADD_ENQUIRY_NOTE',
        entity_type: 'ENQUIRY',
        entity_id: id,
        related_enquiry_id: id,
        changed_field: 'notes',
        description: 'Updated follow-up notes on recruitment enquiry'
      });
    }

    if (follow_up_date !== undefined && follow_up_date !== existing.follow_up_date) {
      await logActivity({
        performed_by: req.user.id,
        action_type: 'UPDATE_FOLLOWUP_DATE',
        entity_type: 'ENQUIRY',
        entity_id: id,
        related_enquiry_id: id,
        changed_field: 'follow_up_date',
        previous_value: existing.follow_up_date ? String(existing.follow_up_date).split('T')[0] : 'none',
        new_value: follow_up_date || 'none',
        description: `Set next follow-up date to ${follow_up_date || 'cleared'}`
      });
    }

    res.json({ success: true, message: 'Enquiry details updated successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating enquiry details.', error: error.message });
  }
};

const getEnquiryHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = (req.user?.role || '').toLowerCase();
    const userId = req.user?.id;
    const isDirector = userRole === 'director' || userRole === 'main_admin' || req.user?.is_main_admin === 1;

    const [enq] = await db.query('SELECT id, assigned_to_user_id FROM EMPLOYER_ENQUIRY WHERE id = ?', [id]);
    if (!enq) {
      return res.status(404).json({ success: false, message: 'Enquiry not found.' });
    }

    if (!isDirector && userRole === 'recruiter') {
      if (enq.assigned_to_user_id !== userId) {
        return res.status(403).json({
          success: false,
          code: 'SCOPE_ACCESS_DENIED',
          message: 'Cannot view activity history for an enquiry outside your assigned scope.'
        });
      }
    }

    const history = await db.query(`
      SELECT 
        ra.id,
        ra.action_type,
        ra.description,
        ra.changed_field,
        ra.previous_value,
        ra.new_value,
        ra.created_at,
        ra.performed_by,
        u.name as performed_by_name,
        u.email as performed_by_email,
        u.role as performed_by_role
      FROM RECRUITMENT_ACTIVITY ra
      LEFT JOIN USERS u ON ra.performed_by = u.id
      WHERE ra.related_enquiry_id = ? OR (ra.entity_type = 'ENQUIRY' AND ra.entity_id = ?)
      ORDER BY ra.created_at DESC
    `, [id, id]);

    res.json({ success: true, count: history.length, history });
  } catch (error) {
    console.error('getEnquiryHistory error:', error);
    res.status(500).json({ success: false, message: 'Error retrieving enquiry activity history.', error: error.message });
  }
};

const replyToEnquiryViaEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const { reply_message, subject } = req.body;
    const userRole = (req.user?.role || '').toLowerCase();
    const userId = req.user?.id;
    const isDirector = userRole === 'director' || userRole === 'main_admin' || req.user?.is_main_admin === 1;

    if (!reply_message || typeof reply_message !== 'string' || reply_message.trim().length < 5) {
      return res.status(400).json({ success: false, message: 'Please provide a valid response message (minimum 5 characters).' });
    }

    const [enq] = await db.query(
      'SELECT id, contact_name, contact_email, subject, notes, status, assigned_to_user_id, source FROM EMPLOYER_ENQUIRY WHERE id = ?',
      [id]
    );

    if (!enq) {
      return res.status(404).json({ success: false, message: 'Enquiry not found.' });
    }

    if (!isDirector && userRole === 'recruiter') {
      if (enq.assigned_to_user_id !== userId) {
        return res.status(403).json({
          success: false,
          code: 'SCOPE_ACCESS_DENIED',
          message: 'Cannot reply to an enquiry outside your assigned scope.'
        });
      }
    }

    if (!enq.contact_email) {
      return res.status(400).json({
        success: false,
        message: 'This enquiry has no recipient email address recorded.'
      });
    }

    const emailSubject = (subject && subject.trim()) || enq.subject || 'Your Vakancy.in Enquiry';

    // Dispatch email safely via official mailbox
    const mailRes = await sendEnquiryReplyEmail(enq.contact_email, {
      recipientName: enq.contact_name,
      subject: emailSubject,
      replyMessage: reply_message.trim(),
      originalMessage: enq.notes,
      enquiryRef: enq.id.slice(0, 8),
      responderName: req.user.name || 'Vakancy Support'
    });

    if (!mailRes.success && !mailRes.simulated) {
      return res.status(500).json({
        success: false,
        message: 'Failed to deliver email through SMTP server: ' + (mailRes.error || 'Unknown error'),
        error: mailRes.error
      });
    }

    // Auto update status from NEW to IN_PROGRESS if applicable
    let newStatus = enq.status;
    if (enq.status === 'NEW' || enq.status === 'new') {
      newStatus = 'IN_PROGRESS';
      await db.query('UPDATE EMPLOYER_ENQUIRY SET status = "IN_PROGRESS" WHERE id = ?', [id]);
    }

    // Append reply to notes / history
    const replyTimestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const updatedNotes = `${enq.notes || ''}\n\n[Email Reply by ${req.user.name || 'Admin'} at ${replyTimestamp}]:\n${reply_message.trim()}`.trim();
    await db.query('UPDATE EMPLOYER_ENQUIRY SET notes = ? WHERE id = ?', [updatedNotes, id]);

    await logActivity({
      performed_by: req.user.id,
      action_type: 'REPLY_ENQUIRY_VIA_EMAIL',
      entity_type: 'ENQUIRY',
      entity_id: id,
      related_enquiry_id: id,
      description: `Sent official email reply to ${enq.contact_email} ("${emailSubject}")`
    });

    res.json({
      success: true,
      message: 'Official response email sent successfully.',
      status: newStatus,
      recipient: enq.contact_email
    });
  } catch (error) {
    console.error('replyToEnquiryViaEmail error:', error);
    res.status(500).json({ success: false, message: 'Failed to send reply email.', error: error.message });
  }
};

const getEnquiryCounts = async (req, res) => {
  try {
    const userRole = (req.user?.role || '').toLowerCase();
    const userId = req.user?.id;
    const isDirector = userRole === 'director' || userRole === 'main_admin' || req.user?.is_main_admin === 1;

    let baseWhere = '';
    let params = [];
    if (userRole === 'recruiter' && !isDirector) {
      baseWhere = 'WHERE assigned_to_user_id = ?';
      params.push(userId);
    }

    const counts = await db.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN LOWER(status) = 'new' THEN 1 ELSE 0 END) as new_count,
        SUM(CASE WHEN LOWER(status) IN ('assigned', 'in_progress') THEN 1 ELSE 0 END) as in_progress_count,
        SUM(CASE WHEN LOWER(status) IN ('resolved', 'closed') THEN 1 ELSE 0 END) as resolved_count
      FROM EMPLOYER_ENQUIRY
      ${baseWhere}
    `, params);

    const row = counts[0] || {};
    res.json({
      success: true,
      counts: {
        total: Number(row.total || 0),
        new: Number(row.new_count || 0),
        in_progress: Number(row.in_progress_count || 0),
        resolved: Number(row.resolved_count || 0)
      }
    });
  } catch (error) {
    console.error('getEnquiryCounts error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve enquiry counts.', error: error.message });
  }
};

const getEnquiryLinkedJobs = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = (req.user?.role || '').toLowerCase();
    const userId = req.user?.id;
    const isDirector = userRole === 'director' || userRole === 'main_admin' || req.user?.is_main_admin === 1;

    const [enq] = await db.query('SELECT id, job_id, assigned_to_user_id FROM EMPLOYER_ENQUIRY WHERE id = ?', [id]);
    if (!enq) {
      return res.status(404).json({ success: false, message: 'Enquiry not found.' });
    }

    if (!isDirector && userRole === 'recruiter') {
      if (enq.assigned_to_user_id !== userId) {
        return res.status(403).json({
          success: false,
          code: 'SCOPE_ACCESS_DENIED',
          message: 'Cannot view linked jobs for an enquiry outside your assigned scope.'
        });
      }
    }

    const jobs = await db.query(`
      SELECT 
        j.id,
        j.title,
        j.department,
        j.location,
        j.status,
        j.openings_count,
        j.employment_type,
        j.workplace_type,
        j.seniority_level,
        j.created_at,
        j.source_type,
        u.name as recruiter_name,
        u.email as recruiter_email
      FROM JOB j
      LEFT JOIN USERS u ON j.assigned_recruiter_id = u.id
      WHERE j.enquiry_id = ? OR (j.id = ? AND ? IS NOT NULL)
      ORDER BY j.created_at DESC
    `, [id, enq.job_id, enq.job_id]);

    res.json({ success: true, count: jobs.length, jobs });
  } catch (error) {
    console.error('getEnquiryLinkedJobs error:', error);
    res.status(500).json({ success: false, message: 'Error retrieving linked jobs.', error: error.message });
  }
};

const createJobFromEnquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = (req.user?.role || '').toLowerCase();
    const userId = req.user?.id;
    const isDirector = userRole === 'director' || userRole === 'main_admin' || req.user?.is_main_admin === 1;

    const [enq] = await db.query('SELECT * FROM EMPLOYER_ENQUIRY WHERE id = ?', [id]);
    if (!enq) {
      return res.status(404).json({ success: false, message: 'Enquiry not found.' });
    }

    if (!isDirector && userRole === 'recruiter') {
      if (enq.assigned_to_user_id !== userId) {
        return res.status(403).json({
          success: false,
          code: 'SCOPE_ACCESS_DENIED',
          message: 'Cannot create job from an enquiry assigned to another recruiter.'
        });
      }
    }

    const {
      title,
      category_id,
      department,
      job_domain,
      employment_type,
      workplace_type,
      seniority_level,
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
      responsibilities,
      requirements,
      openings_count,
      status: reqStatus,
      is_recommended,
      allow_candidate_access,
      assigned_recruiter_id,
      internal_notes,
      manual_company_name,
      manual_contact_person,
      manual_contact_phone,
      manual_contact_email,
      manual_company_website,
      client_id,
      employer_id
    } = req.body;

    const finalTitle = (title || enq.subject || '').trim();
    if (!finalTitle) {
      return res.status(400).json({ success: false, message: 'Job title is required.' });
    }

    // Duplicate check: Prevent accidental duplicate job creation within 15 seconds for this enquiry
    const recentDuplicates = await db.query(`
      SELECT id, title, created_at FROM JOB
      WHERE enquiry_id = ? AND LOWER(title) = ? AND created_at >= NOW() - INTERVAL 15 SECOND
      LIMIT 1
    `, [id, finalTitle.toLowerCase()]);

    if (recentDuplicates && recentDuplicates.length > 0) {
      return res.status(409).json({
        success: false,
        message: `A job mandate "${finalTitle}" was just created for this enquiry. Duplicate prevention triggered.`,
        job_id: recentDuplicates[0].id
      });
    }

    const cleanLocation = location && location.trim() ? location.trim() : [city, state, country, enq.location].filter(Boolean).join(', ') || 'Remote / Flexible';
    const skillsString = Array.isArray(required_skills) ? JSON.stringify(required_skills) : (required_skills || null);
    const keywordsString = Array.isArray(keywords) ? JSON.stringify(keywords) : (keywords || null);
    const benefitsString = Array.isArray(benefits) ? JSON.stringify(benefits) : (benefits || null);
    const respString = Array.isArray(responsibilities) ? JSON.stringify(responsibilities) : (responsibilities || '');
    const reqString = Array.isArray(requirements) ? JSON.stringify(requirements) : (requirements || '');

    const jobId = uuidv4();
    let targetStatus = reqStatus || 'open';
    if (!['open', 'draft', 'closed'].includes(targetStatus)) targetStatus = 'open';

    const isRec = is_recommended ? 1 : 0;
    const candAccess = allow_candidate_access !== undefined ? (allow_candidate_access ? 1 : 0) : 1;
    const finalRecruiterId = assigned_recruiter_id || enq.assigned_to_user_id || (userRole === 'recruiter' ? userId : null);

    const compName = manual_company_name ? manual_company_name.trim() : (enq.company_name || null);
    const contactPerson = manual_contact_person ? manual_contact_person.trim() : (enq.contact_name || null);
    const contactPhone = manual_contact_phone ? manual_contact_phone.trim() : (enq.contact_phone || null);
    const contactEmail = manual_contact_email ? manual_contact_email.trim() : (enq.contact_email || null);
    const compWebsite = manual_company_website ? manual_company_website.trim() : null;

    await db.withTransaction(async (tx) => {
      // 1. Insert JOB record
      await tx.query(`
        INSERT INTO JOB (
          id, enquiry_id, employer_id, client_id, category_id, title, department, job_domain,
          employment_type, workplace_type, seniority_level, location, country, state, city, locality,
          min_experience, max_experience, fresher_allowed, min_qualification, degree, specialization,
          required_skills, keywords, notice_period,
          min_salary, max_salary, currency, salary_period, salary_type, benefits, application_deadline,
          description, responsibilities, requirements, openings_count,
          status, is_internal_only, is_recommended, allow_candidate_access, assigned_recruiter_id, internal_notes,
          manual_company_name, manual_contact_person, manual_contact_phone, manual_contact_email, manual_company_website,
          created_by_user_id, last_updated_by_user_id, created_by_type, source_type
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, 0, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, 'ADMIN', 'EXECUTIVE_SEARCH'
        )
      `, [
        jobId, id, employer_id || null, client_id || null, category_id || null, finalTitle, department || 'Executive Search', job_domain || 'General',
        employment_type || 'Full-Time', workplace_type || 'On-Site', seniority_level || 'Mid Level', cleanLocation,
        country || 'India', state || null, city || null, locality || null,
        parseFloat(min_experience) || 0, parseFloat(max_experience) || 0, fresher_allowed ? 1 : 0, min_qualification || null, degree || null, specialization || null,
        skillsString, keywordsString, notice_period || null,
        min_salary ? parseFloat(min_salary) : null, max_salary ? parseFloat(max_salary) : null, currency || 'INR', salary_period || 'Per Year', salary_type || 'CTC', benefitsString, application_deadline || null,
        description || enq.message || '', respString, reqString, parseInt(openings_count, 10) || parseInt(enq.openings_count, 10) || 1,
        targetStatus, isRec, candAccess, finalRecruiterId, internal_notes || null,
        compName, contactPerson, contactPhone, contactEmail, compWebsite,
        userId, userId
      ]);

      if (Array.isArray(required_skills)) await syncJobSkills(jobId, required_skills);
      if (Array.isArray(keywords)) await syncJobKeywords(jobId, keywords);

      if (finalRecruiterId) {
        const assignId = uuidv4();
        await tx.query(`
          INSERT INTO USER_ASSIGNMENTS (id, user_id, assigned_job_id, scope_type)
          VALUES (?, ?, ?, 'scoped')
        `, [assignId, finalRecruiterId, jobId]);
      }

      // Update enquiry status from NEW/ASSIGNED to IN_PROGRESS (NEVER automatically mark RESOLVED!)
      const newStatus = (enq.status === 'NEW' || enq.status === 'ASSIGNED') ? 'IN_PROGRESS' : enq.status;
      await tx.query(`
        UPDATE EMPLOYER_ENQUIRY
        SET 
          job_id = COALESCE(job_id, ?),
          status = ?,
          notes = CONCAT(COALESCE(notes, ''), '\n[Mandate Created: ', ?, ' (', ?, ')]')
        WHERE id = ?
      `, [jobId, newStatus, finalTitle, jobId, id]);

      await logActivity({
        performed_by: userId,
        action_type: 'CONVERT_ENQUIRY_TO_JOB',
        entity_type: 'JOB',
        entity_id: jobId,
        related_enquiry_id: id,
        related_job_id: jobId,
        description: `Created Executive Search job mandate "${finalTitle}" linked to enquiry #${id}`,
        changed_field: 'status',
        previous_value: enq.status,
        new_value: newStatus
      }, tx);
    });

    res.status(201).json({
      success: true,
      message: `Job mandate "${finalTitle}" created and linked to enquiry successfully.`,
      job_id: jobId,
      enquiry_id: id
    });
  } catch (error) {
    console.error('createJobFromEnquiry error:', error);
    res.status(500).json({ success: false, message: 'Error creating job from enquiry.', error: error.message });
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
        id, client_id, employer_id, enquiry_id, title, department, job_domain,
        employment_type, workplace_type, location, openings_count,
        description, internal_notes, status, is_internal_only,
        assigned_recruiter_id, created_by_user_id, created_by_type, source_type
      ) VALUES (?, ?, ?, ?, ?, 'Executive Search', 'Leadership', 'Full Time', 'Hybrid', ?, ?, ?, ?, 'draft', 1, ?, ?, 'INTERNAL_STAFF', 'EXECUTIVE_SEARCH')
    `, [
      jobId, client_id || null, enq.employer_id || null, id, jobTitle,
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
      related_enquiry_id: id,
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

const toggleEmployerCandidateAccess = async (req, res) => {
  try {
    const { id } = req.params;
    const { candidate_access_enabled } = req.body;
    if (candidate_access_enabled === undefined) {
      return res.status(400).json({ success: false, message: 'candidate_access_enabled boolean is required.' });
    }

    const newAccess = candidate_access_enabled ? 1 : 0;
    const employers = await db.query('SELECT id, company_name, candidate_access_enabled FROM EMPLOYERS WHERE id = ?', [id]);
    if (!employers || employers.length === 0) {
      return res.status(404).json({ success: false, message: 'Employer not found.' });
    }
    const emp = employers[0];

    await db.query('UPDATE EMPLOYERS SET candidate_access_enabled = ? WHERE id = ?', [newAccess, id]);

    await logActivity({
      performed_by: req.user.id,
      action_type: 'UPDATE_EMPLOYER_CANDIDATE_ACCESS',
      entity_type: 'EMPLOYER',
      entity_id: id,
      description: `${newAccess ? 'Enabled' : 'Disabled'} Candidate Database access for employer "${emp.company_name}"`,
      changed_field: 'candidate_access_enabled',
      previous_value: emp.candidate_access_enabled,
      new_value: newAccess
    });

    res.json({
      success: true,
      message: `Candidate Database access ${newAccess ? 'enabled' : 'disabled'} for ${emp.company_name}.`,
      candidate_access_enabled: newAccess
    });
  } catch (error) {
    console.error('toggleEmployerCandidateAccess error:', error);
    res.status(500).json({ success: false, message: 'Error updating candidate database access.', error: error.message });
  }
};

// 8. Leads Management (BD -> Recruiter Workflow)
const checkDuplicateCompanyLead = async (req, res) => {
  return leadsController.checkDuplicateCompanyLead(req, res);
};

const createCompanyLead = async (req, res) => {
  return leadsController.createCompanyLead(req, res);
};

const getCompanyLeadsQueue = async (req, res) => {
  return leadsController.getCompanyLeadsQueue(req, res);
};

const getCompanyLeadDetails = async (req, res) => {
  return leadsController.getCompanyLeadDetails(req, res);
};

const claimCompanyLead = async (req, res) => {
  return leadsController.claimCompanyLead(req, res);
};

const updateCompanyLeadStatus = async (req, res) => {
  return leadsController.updateCompanyLeadStatus(req, res);
};

const reassignCompanyLead = async (req, res) => {
  return leadsController.reassignCompanyLead(req, res);
};

const convertCompanyLeadToJob = async (req, res) => {
  return leadsController.convertCompanyLeadToJob(req, res);
};

// Backwards-compatible aliases
const getAllLeads = async (req, res) => {
  return leadsController.getCompanyLeadsQueue(req, res);
};

const createLead = async (req, res) => {
  return leadsController.createCompanyLead(req, res);
};

const updateLead = async (req, res) => {
  return leadsController.updateCompanyLeadStatus(req, res);
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
    const callerRole = (req.user?.role || '').toLowerCase();
    const isDirector = callerRole === 'director' || callerRole === 'main_admin' || req.user?.is_main_admin === 1;

    let whereClause = "WHERE u.role NOT IN ('candidate', 'employer')";
    const params = [];

    if (!isDirector) {
      // Find teams led by this user
      const ledTeams = await db.query('SELECT id FROM TEAMS WHERE lead_user_id = ?', [req.user.id]);
      const ledTeamIds = (ledTeams || []).map(t => t.id).filter(Boolean);

      if (ledTeamIds.length > 0) {
        whereClause += ` AND (u.id = ? OR u.reporting_user_id = ? OR COALESCE(u.team_id, ua.team_id) IN (?))`;
        params.push(req.user.id, req.user.id, ledTeamIds);
      } else {
        whereClause += ` AND (u.id = ? OR u.reporting_user_id = ?)`;
        params.push(req.user.id, req.user.id);
      }
    }

    const users = await db.query(`
      SELECT 
        u.id, u.email, u.name, u.phone, u.role, u.is_main_admin, u.is_active, u.reporting_user_id, u.profile_photo_url, u.created_at,
        head.name as reporting_head_name, head.email as reporting_head_email,
        r.display_name as role_display_name,
        COALESCE(u.team_id, ua.team_id) as team_id, t.name as team_name, ua.scope_type,
        (SELECT COUNT(*) FROM USERS sub WHERE sub.reporting_user_id = u.id AND sub.is_active = 1) as direct_reports_count
      FROM USERS u
      LEFT JOIN ROLES r ON u.role = r.role_key
      LEFT JOIN USERS head ON u.reporting_user_id = head.id
      LEFT JOIN (
        SELECT user_id, MAX(team_id) as team_id, MAX(scope_type) as scope_type
        FROM USER_ASSIGNMENTS
        GROUP BY user_id
      ) ua ON u.id = ua.user_id
      LEFT JOIN TEAMS t ON COALESCE(u.team_id, ua.team_id) = t.id
      ${whereClause}
      ORDER BY u.created_at DESC
    `, params);
    res.json({ success: true, count: users.length, users: users || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching users.', error: error.message });
  }
};

const createEmployee = async (req, res) => {
  try {
    const callerRole = (req.user?.role || '').toLowerCase();
    const isDirector = callerRole === 'director' || callerRole === 'main_admin' || req.user?.is_main_admin === 1;
    const isManager = callerRole === 'team_manager' || callerRole === 'tl_coordinator';

    const { name, email, password, role, phone, team_id, reporting_user_id, scope_type, profile_photo_url } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Email, password, and role are required.' });
    }

    const cleanRole = role.toLowerCase().trim();
    const cleanEmail = email.trim().toLowerCase();

    // Role creation permission verification: Team Manager can only create Recruiter
    if (!isDirector) {
      if (!isManager) {
        return res.status(403).json({ success: false, message: 'Forbidden. Only Directors and Team Managers can create staff accounts.' });
      }
      if (cleanRole !== 'recruiter') {
        return res.status(403).json({ success: false, message: 'Forbidden. Team Managers can only create Recruiter accounts for their team.' });
      }
    }

    const existing = await db.query('SELECT id FROM USERS WHERE LOWER(email) = ?', [cleanEmail]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Reporting hierarchy check
    let effectiveReportingHead = reporting_user_id ? reporting_user_id.trim() : null;
    let effectiveTeamId = team_id || null;

    if (!isDirector && isManager) {
      // Force reporting head to the manager themselves
      effectiveReportingHead = req.user.id;
      if (!effectiveTeamId) {
        const mgrTeams = await db.query('SELECT id FROM TEAMS WHERE lead_user_id = ? LIMIT 1', [req.user.id]);
        if (mgrTeams.length > 0) {
          effectiveTeamId = mgrTeams[0].id;
        } else if (req.user.team_id) {
          effectiveTeamId = req.user.team_id;
        }
      }
    } else {
      if (cleanRole === 'director') {
        effectiveReportingHead = null; // Director has no reporting head
      } else if (effectiveReportingHead) {
        const hierCheck = await validateReportingHierarchy(null, effectiveReportingHead);
        if (!hierCheck.valid) {
          return res.status(400).json({ success: false, message: hierCheck.message });
        }
        // Auto-associate recruiter with manager's team if not explicitly selected
        if (!effectiveTeamId) {
          const headTeams = await db.query('SELECT id FROM TEAMS WHERE lead_user_id = ? LIMIT 1', [effectiveReportingHead]);
          if (headTeams.length > 0) {
            effectiveTeamId = headTeams[0].id;
          } else {
            const headUser = await db.query('SELECT team_id FROM USERS WHERE id = ?', [effectiveReportingHead]);
            if (headUser.length > 0 && headUser[0].team_id) {
              effectiveTeamId = headUser[0].team_id;
            }
          }
        }
      } else {
        // Default non-director to Director if no head specified
        const directorUser = await db.query("SELECT id FROM USERS WHERE (role = 'director' OR is_main_admin = 1) AND is_active = 1 LIMIT 1");
        if (directorUser && directorUser.length > 0) {
          effectiveReportingHead = directorUser[0].id;
        }
      }
    }

    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    const isMainAdmin = (cleanRole === 'director' || cleanRole === 'main_admin') ? 1 : 0;

    await db.query(`
      INSERT INTO USERS (id, email, password_hash, role, phone, is_main_admin, is_active, name, reporting_user_id, team_id, profile_photo_url)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
    `, [
      userId, cleanEmail, passwordHash, cleanRole, phone || null, isMainAdmin,
      name ? name.trim() : null, effectiveReportingHead, effectiveTeamId, profile_photo_url ? profile_photo_url.trim() : null
    ]);

    // Create assignment in USER_ASSIGNMENTS
    const assignId = uuidv4();
    const targetScopeType = scope_type || (['recruiter', 'team_manager', 'tl_coordinator', 'bd_lead'].includes(cleanRole) ? 'scoped' : 'global');
    await db.query(`
      INSERT INTO USER_ASSIGNMENTS (id, user_id, team_id, scope_type)
      VALUES (?, ?, ?, ?)
    `, [assignId, userId, effectiveTeamId || null, targetScopeType]);

    await logActivity({
      performed_by: req.user.id,
      action_type: 'CREATE_TEAM_MEMBER',
      entity_type: 'USER',
      entity_id: userId,
      description: `Created team account: ${cleanEmail} (Role: ${cleanRole}, Head: ${effectiveReportingHead || 'None'}, Team: ${effectiveTeamId || 'None'})`
    });

    res.status(201).json({
      success: true,
      message: 'Team member account created successfully.',
      user_id: userId,
      team_id: effectiveTeamId,
      reporting_user_id: effectiveReportingHead
    });
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
      LEFT JOIN (
        SELECT user_id, MAX(team_id) as team_id, MAX(scope_type) as scope_type
        FROM USER_ASSIGNMENTS
        GROUP BY user_id
      ) ua ON u.id = ua.user_id
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
    const callerRole = (req.user?.role || '').toLowerCase();
    const isDirector = callerRole === 'director' || callerRole === 'main_admin' || req.user?.is_main_admin === 1;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (!isDirector) {
      whereClause += ' AND t.lead_user_id = ?';
      params.push(req.user.id);
    }

    const teams = await db.query(`
      SELECT 
        t.*,
        u.name as lead_name,
        u.email as lead_email,
        u.phone as lead_phone,
        (
          SELECT COUNT(DISTINCT u2.id)
          FROM USERS u2
          LEFT JOIN USER_ASSIGNMENTS ua ON u2.id = ua.user_id
          WHERE (u2.team_id = t.id OR ua.team_id = t.id)
            AND u2.is_active = 1
            AND u2.role NOT IN ('candidate', 'employer')
        ) as member_count,
        (
          SELECT COUNT(DISTINCT j.id)
          FROM JOB j
          LEFT JOIN USERS u3 ON j.assigned_recruiter_id = u3.id
          WHERE (j.assigned_team_id = t.id OR u3.team_id = t.id)
            AND j.status = 'open'
        ) as active_jobs_count
      FROM TEAMS t
      LEFT JOIN USERS u ON t.lead_user_id = u.id
      ${whereClause}
      ORDER BY t.name ASC
    `, params);
    res.json({ success: true, count: teams.length, teams: teams || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching teams.', error: error.message });
  }
};

const createTeam = async (req, res) => {
  try {
    const callerRole = (req.user?.role || '').toLowerCase();
    const isDirector = callerRole === 'director' || callerRole === 'main_admin' || req.user?.is_main_admin === 1;

    if (!isDirector) {
      return res.status(403).json({ success: false, message: 'Forbidden. Only Directors can create recruitment teams.' });
    }

    const { name, lead_user_id, description, status } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ success: false, message: 'Team name is required.' });

    const id = uuidv4();
    await db.query(
      'INSERT INTO TEAMS (id, name, lead_user_id, description, status) VALUES (?, ?, ?, ?, ?)',
      [id, name.trim(), lead_user_id || null, description || null, status || 'ACTIVE']
    );

    if (lead_user_id) {
      await db.query('UPDATE USERS SET team_id = ? WHERE id = ?', [id, lead_user_id]);
      const existingAssign = await db.query('SELECT id FROM USER_ASSIGNMENTS WHERE user_id = ?', [lead_user_id]);
      if (existingAssign && existingAssign.length > 0) {
        await db.query('UPDATE USER_ASSIGNMENTS SET team_id = ? WHERE user_id = ?', [id, lead_user_id]);
      } else {
        await db.query(
          'INSERT INTO USER_ASSIGNMENTS (id, user_id, team_id, scope_type) VALUES (?, ?, ?, "scoped")',
          [uuidv4(), lead_user_id, id]
        );
      }
    }

    await logActivity({
      performed_by: req.user.id,
      action_type: 'CREATE_TEAM',
      entity_type: 'TEAM',
      entity_id: id,
      description: `Created recruitment team '${name.trim()}' (Lead: ${lead_user_id || 'Unassigned'})`
    });

    res.status(201).json({ success: true, message: 'Team created successfully.', team_id: id });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating team.', error: error.message });
  }
};

const updateTeam = async (req, res) => {
  try {
    const callerRole = (req.user?.role || '').toLowerCase();
    const isDirector = callerRole === 'director' || callerRole === 'main_admin' || req.user?.is_main_admin === 1;

    if (!isDirector) {
      return res.status(403).json({ success: false, message: 'Forbidden. Only Directors can update recruitment teams.' });
    }

    const { id } = req.params;
    const { name, lead_user_id, description, status } = req.body;

    const teams = await db.query('SELECT * FROM TEAMS WHERE id = ?', [id]);
    if (teams.length === 0) return res.status(404).json({ success: false, message: 'Team not found.' });

    const updates = [];
    const params = [];

    if (name !== undefined) { updates.push('name = ?'); params.push(name.trim()); }
    if (lead_user_id !== undefined) { updates.push('lead_user_id = ?'); params.push(lead_user_id || null); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description ? description.trim() : null); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }

    if (updates.length > 0) {
      params.push(id);
      await db.query(`UPDATE TEAMS SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    if (lead_user_id) {
      await db.query('UPDATE USERS SET team_id = ? WHERE id = ?', [id, lead_user_id]);
    }

    await logActivity({
      performed_by: req.user.id,
      action_type: 'UPDATE_TEAM',
      entity_type: 'TEAM',
      entity_id: id,
      description: `Updated team ${teams[0].name}`
    });

    res.json({ success: true, message: 'Team updated successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating team.', error: error.message });
  }
};

const reassignTeamMember = async (req, res) => {
  try {
    const callerRole = (req.user?.role || '').toLowerCase();
    const isDirector = callerRole === 'director' || callerRole === 'main_admin' || req.user?.is_main_admin === 1;

    if (!isDirector) {
      return res.status(403).json({
        success: false,
        code: 'DIRECTOR_REQUIRED',
        message: 'Forbidden. Only the Director can reassign team members and reporting hierarchies.'
      });
    }

    const { id } = req.params;
    const { reporting_user_id, team_id, reason } = req.body;

    const targetUsers = await db.query('SELECT * FROM USERS WHERE id = ?', [id]);
    if (targetUsers.length === 0) {
      return res.status(404).json({ success: false, message: 'Target team member not found.' });
    }

    const target = targetUsers[0];
    if (target.role === 'director' || target.is_main_admin === 1) {
      return res.status(400).json({ success: false, message: 'Director cannot be reassigned.' });
    }

    // Circular reporting loop validation
    if (reporting_user_id) {
      const hierCheck = await validateReportingHierarchy(id, reporting_user_id);
      if (!hierCheck.valid) {
        return res.status(400).json({ success: false, message: hierCheck.message });
      }
    }

    let effectiveTeamId = team_id || null;
    if (reporting_user_id && !effectiveTeamId) {
      const headTeams = await db.query('SELECT id FROM TEAMS WHERE lead_user_id = ? LIMIT 1', [reporting_user_id]);
      if (headTeams.length > 0) {
        effectiveTeamId = headTeams[0].id;
      } else {
        const headUser = await db.query('SELECT team_id FROM USERS WHERE id = ?', [reporting_user_id]);
        if (headUser.length > 0 && headUser[0].team_id) {
          effectiveTeamId = headUser[0].team_id;
        }
      }
    }

    const prevManagerId = target.reporting_user_id;
    const prevTeamId = target.team_id;

    // Update USERS record
    await db.query(`
      UPDATE USERS
      SET reporting_user_id = ?, team_id = ?
      WHERE id = ?
    `, [reporting_user_id || null, effectiveTeamId, id]);

    // Update USER_ASSIGNMENTS
    const existingAssign = await db.query('SELECT id FROM USER_ASSIGNMENTS WHERE user_id = ?', [id]);
    if (existingAssign && existingAssign.length > 0) {
      await db.query(
        'UPDATE USER_ASSIGNMENTS SET team_id = ? WHERE user_id = ?',
        [effectiveTeamId, id]
      );
    } else {
      await db.query(
        'INSERT INTO USER_ASSIGNMENTS (id, user_id, team_id, scope_type) VALUES (?, ?, ?, "scoped")',
        [uuidv4(), id, effectiveTeamId]
      );
    }

    // Log to TEAM_ASSIGNMENT_HISTORY
    await db.query(`
      INSERT INTO TEAM_ASSIGNMENT_HISTORY (id, user_id, previous_manager_id, new_manager_id, previous_team_id, new_team_id, changed_by_user_id, reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      uuidv4(),
      id,
      prevManagerId || null,
      reporting_user_id || null,
      prevTeamId || null,
      effectiveTeamId,
      req.user.id,
      reason || 'Reassigned by Director'
    ]);

    await logActivity({
      performed_by: req.user.id,
      action_type: 'REASSIGN_TEAM_MEMBER',
      entity_type: 'USER',
      entity_id: id,
      description: `Director reassigned ${target.email} from manager ${prevManagerId || 'None'} to ${reporting_user_id || 'None'} (Team: ${effectiveTeamId || 'None'})`
    });

    res.json({
      success: true,
      message: 'Team member successfully reassigned.',
      user_id: id,
      new_manager_id: reporting_user_id,
      new_team_id: effectiveTeamId
    });
  } catch (error) {
    console.error('reassignTeamMember error:', error);
    res.status(500).json({ success: false, message: 'Error reassigning team member.', error: error.message });
  }
};

const getTeamPerformance = async (req, res) => {
  try {
    const callerRole = (req.user?.role || '').toLowerCase();
    const isDirector = callerRole === 'director' || callerRole === 'main_admin' || req.user?.is_main_admin === 1;
    const isManager = callerRole === 'team_manager' || callerRole === 'tl_coordinator';

    const targetTeamId = req.params.id;

    let teamFilter = '';
    const params = [];

    if (targetTeamId) {
      teamFilter = 'WHERE t.id = ?';
      params.push(targetTeamId);
    } else if (!isDirector && isManager) {
      teamFilter = 'WHERE t.lead_user_id = ?';
      params.push(req.user.id);
    }

    // Fetch team list
    const teams = await db.query(`
      SELECT t.id, t.name, t.description, t.status, t.created_at,
             u.id as manager_id, u.name as manager_name, u.email as manager_email
      FROM TEAMS t
      LEFT JOIN USERS u ON t.lead_user_id = u.id
      ${teamFilter}
      ORDER BY t.name ASC
    `, params);

    const performance = [];

    for (const team of teams) {
      // Find all recruiters belonging to this team or reporting to this team's manager
      const members = await db.query(`
        SELECT DISTINCT u.id, u.name, u.email, u.role, u.is_active
        FROM USERS u
        LEFT JOIN USER_ASSIGNMENTS ua ON u.id = ua.user_id
        WHERE (u.team_id = ? OR ua.team_id = ? OR (u.reporting_user_id = ? AND u.reporting_user_id IS NOT NULL))
          AND u.role = 'recruiter'
      `, [team.id, team.id, team.manager_id || 'none']);

      const memberIds = members.map(m => m.id);

      let jobsAssigned = 0;
      let activeMandates = 0;
      let candidateSourced = 0;
      let candidateShortlisted = 0;
      let candidatePlaced = 0;
      let jobIds = [];

      if (memberIds.length > 0) {
        const teamJobs = await db.query(`
          SELECT id, status, is_internal_only
          FROM JOB
          WHERE assigned_team_id = ? OR assigned_recruiter_id IN (?)
        `, [team.id, memberIds]);
        jobIds = teamJobs.map(j => j.id);
        jobsAssigned = teamJobs.length;
        activeMandates = teamJobs.filter(j => j.status === 'open').length;
      } else {
        const teamJobs = await db.query(`
          SELECT id, status, is_internal_only
          FROM JOB
          WHERE assigned_team_id = ?
        `, [team.id]);
        jobIds = teamJobs.map(j => j.id);
        jobsAssigned = teamJobs.length;
        activeMandates = teamJobs.filter(j => j.status === 'open').length;
      }

      if (jobIds.length > 0) {
        const [appStats] = await db.query(`
          SELECT 
            COUNT(*) as sourced,
            SUM(CASE WHEN LOWER(status) IN ('shortlisted', 'shortlist', 'screened', 'selected') THEN 1 ELSE 0 END) as shortlisted,
            SUM(CASE WHEN LOWER(status) IN ('hired', 'placed', 'offered') THEN 1 ELSE 0 END) as placed
          FROM APPLICATION
          WHERE job_id IN (?)
        `, [jobIds]);

        candidateSourced = Number(appStats?.sourced || 0);
        candidateShortlisted = Number(appStats?.shortlisted || 0);
        candidatePlaced = Number(appStats?.placed || 0);
      }

      performance.push({
        team_id: team.id,
        team_name: team.name,
        status: team.status || 'ACTIVE',
        manager: {
          id: team.manager_id,
          name: team.manager_name || 'Unassigned',
          email: team.manager_email
        },
        members_count: members.length,
        members: members.map(m => ({ id: m.id, name: m.name, email: m.email, is_active: m.is_active })),
        metrics: {
          jobs_assigned: jobsAssigned,
          active_mandates: activeMandates,
          candidates_sourced: candidateSourced,
          candidates_shortlisted: candidateShortlisted,
          candidates_placed: candidatePlaced
        }
      });
    }

    const summary = {
      total_teams: performance.length,
      total_managers: new Set(performance.map(p => p.manager.id).filter(Boolean)).size,
      total_recruiters: performance.reduce((acc, p) => acc + p.members_count, 0),
      total_jobs_assigned: performance.reduce((acc, p) => acc + p.metrics.jobs_assigned, 0),
      total_active_mandates: performance.reduce((acc, p) => acc + p.metrics.active_mandates, 0),
      total_candidates_sourced: performance.reduce((acc, p) => acc + p.metrics.candidates_sourced, 0),
      total_candidates_shortlisted: performance.reduce((acc, p) => acc + p.metrics.candidates_shortlisted, 0),
      total_candidates_placed: performance.reduce((acc, p) => acc + p.metrics.candidates_placed, 0)
    };

    res.json({ success: true, summary, performance });
  } catch (error) {
    console.error('getTeamPerformance error:', error);
    res.status(500).json({ success: false, message: 'Error fetching team performance.', error: error.message });
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

// 12. Employer Callback Management & AI JD Generator
const getCallbackRequests = async (req, res) => {
  try {
    const { status, jobId, group_by } = req.query;
    const userRole = (req.user?.role || '').toLowerCase();
    const userId = req.user?.id;
    const scope = await getUserScope(userId, userRole);

    let whereClauses = [];
    let queryParams = [];

    if (userRole === 'recruiter' && !scope.isGlobal) {
      const recClauses = ['cr.assigned_to_user_id = ?'];
      const recParams = [userId];
      if (scope.jobIds && scope.jobIds.length > 0) {
        recClauses.push('cr.job_id IN (?)');
        recParams.push(scope.jobIds);
      }
      if (scope.clientIds && scope.clientIds.length > 0) {
        recClauses.push('cr.employer_id IN (?)');
        recParams.push(scope.clientIds);
      }
      whereClauses.push(`(${recClauses.join(' OR ')})`);
      queryParams.push(...recParams);
    } else if (userRole === 'tl_coordinator' && !scope.isGlobal) {
      const tlClauses = ['cr.assigned_to_user_id = ?'];
      const tlParams = [userId];
      if (scope.jobIds && scope.jobIds.length > 0) {
        tlClauses.push('cr.job_id IN (?)');
        tlParams.push(scope.jobIds);
      }
      if (scope.clientIds && scope.clientIds.length > 0) {
        tlClauses.push('cr.employer_id IN (?)');
        tlParams.push(scope.clientIds);
      }
      whereClauses.push(`(${tlClauses.join(' OR ')})`);
      queryParams.push(...tlParams);
    }

    if (status && status !== 'all') {
      whereClauses.push('cr.status = ?');
      queryParams.push(status);
    }

    if (jobId) {
      whereClauses.push('cr.job_id = ?');
      queryParams.push(jobId);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const callbacks = await db.query(`
      SELECT 
        cr.*,
        j.title as job_title,
        e.company_name,
        COALESCE(cr.requester_name, requester.name) as requested_by_name,
        COALESCE(cr.requester_email, requester.email) as requested_by_email,
        COALESCE(cr.requester_phone, requester.phone) as requested_by_phone,
        assigned_user.name as assigned_to_name,
        assigned_user.email as assigned_to_email
      FROM CALLBACK_REQUEST cr
      LEFT JOIN JOB j ON cr.job_id = j.id
      LEFT JOIN EMPLOYERS e ON cr.employer_id = e.id
      LEFT JOIN USERS requester ON cr.requested_by_user_id = requester.id
      LEFT JOIN USERS assigned_user ON cr.assigned_to_user_id = assigned_user.id
      ${whereSql}
      ORDER BY cr.created_at DESC
    `, queryParams);

    // If grouping by job requested, organize callbacks into structured job groups
    let jobGroups = [];
    if (group_by === 'job' && callbacks) {
      const groupsMap = new Map();
      const legacyGroup = {
        job_id: null,
        job_title: 'General & Talent Pool Callbacks',
        employer_id: null,
        company_name: 'Direct / Talent Database',
        is_legacy: true,
        callbacks: []
      };

      for (const cb of callbacks) {
        if (!cb.job_id) {
          legacyGroup.callbacks.push(cb);
        } else {
          if (!groupsMap.has(cb.job_id)) {
            groupsMap.set(cb.job_id, {
              job_id: cb.job_id,
              job_title: cb.job_title || 'Untitled Job',
              employer_id: cb.employer_id || null,
              company_name: cb.company_name || 'Company',
              is_legacy: false,
              callbacks: []
            });
          }
          groupsMap.get(cb.job_id).callbacks.push(cb);
        }
      }

      jobGroups = Array.from(groupsMap.values()).map(g => ({
        ...g,
        callback_count: g.callbacks.length,
        pending_count: g.callbacks.filter(c => ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'New', 'Assigned', 'In Progress'].includes(c.status)).length,
        resolved_count: g.callbacks.filter(c => ['RESOLVED', 'Resolved'].includes(c.status)).length
      }));

      if (legacyGroup.callbacks.length > 0) {
        jobGroups.push({
          ...legacyGroup,
          callback_count: legacyGroup.callbacks.length,
          pending_count: legacyGroup.callbacks.filter(c => ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'New', 'Assigned', 'In Progress'].includes(c.status)).length,
          resolved_count: legacyGroup.callbacks.filter(c => ['RESOLVED', 'Resolved'].includes(c.status)).length
        });
      }
    }

    res.json({
      success: true,
      count: callbacks.length,
      callbacks: callbacks || [],
      job_groups: jobGroups
    });
  } catch (error) {
    console.error('getCallbackRequests error:', error);
    res.status(500).json({ success: false, message: 'Error retrieving callbacks.', error: error.message });
  }
};

const updateCallbackRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assigned_to_user_id, follow_up_date, internal_notes, resolution_outcome } = req.body;

    const [cb] = await db.query('SELECT * FROM CALLBACK_REQUEST WHERE id = ?', [id]);
    if (!cb) return res.status(404).json({ success: false, message: 'Callback request not found.' });

    const scope = await getUserScope(req.user.id, req.user.role);
    if (!scope.isGlobal && cb.assigned_to_user_id !== req.user.id && !scope.jobIds.includes(cb.job_id) && !scope.clientIds.includes(cb.employer_id)) {
      return res.status(403).json({ success: false, code: 'SCOPE_ACCESS_DENIED', message: 'This callback is outside your assigned scope.' });
    }

    if (assigned_to_user_id) {
      const assignees = await db.query('SELECT id FROM USERS WHERE id = ? AND is_active = 1 LIMIT 1', [assigned_to_user_id]);
      if (!assignees.length) return res.status(400).json({ success: false, message: 'Assigned user is invalid or inactive.' });
    }

    const newStatus = status || cb.status;
    if (!['NEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'].includes(newStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid callback status. Allowed: NEW, ASSIGNED, IN_PROGRESS, RESOLVED' });
    }

    await db.withTransaction(async (tx) => {
      await tx.query(`
        UPDATE CALLBACK_REQUEST SET
          status = ?,
          assigned_to_user_id = COALESCE(?, assigned_to_user_id),
          follow_up_date = COALESCE(?, follow_up_date),
          internal_notes = COALESCE(?, internal_notes),
          resolution_outcome = COALESCE(?, resolution_outcome),
          updated_at = NOW()
        WHERE id = ?
      `, [
        newStatus,
        assigned_to_user_id !== undefined ? assigned_to_user_id : null,
        follow_up_date !== undefined ? follow_up_date : null,
        internal_notes !== undefined ? internal_notes : null,
        resolution_outcome !== undefined ? resolution_outcome : null,
        id
      ]);

      await logActivity({
        performed_by: req.user.id,
        action_type: 'UPDATE_CALLBACK_REQUEST',
        entity_type: 'CALLBACK_REQUEST',
        entity_id: id,
        related_job_id: cb.job_id,
        description: `Updated callback request status to "${newStatus}"`,
        changed_field: 'status',
        previous_value: cb.status,
        new_value: newStatus
      }, tx);

      if (cb.requested_by_user_id) {
        await tx.query(
          'INSERT INTO NOTIFICATION (id, user_id, type, title, message, reference_type, reference_id, is_read) VALUES (?, ?, ?, ?, ?, ?, ?, 0)',
          [uuidv4(), cb.requested_by_user_id, 'callback_update', 'Callback request updated', `Your callback request is now ${newStatus.replace(/_/g, ' ').toLowerCase()}.`, 'CALLBACK_REQUEST', id]
        );
      }
    });

    res.json({ success: true, message: 'Callback request updated successfully.' });
  } catch (error) {
    console.error('updateCallbackRequest error:', error);
    res.status(500).json({ success: false, message: 'Error updating callback request.', error: error.message });
  }
};

const generateAdminJobDescription = async (req, res) => {
  try {
    const aiRes = await aiService.generateJobDescription(req.body);
    if (!aiRes || aiRes.isValid === false) {
      return res.status(422).json({
        success: false,
        message: aiRes?.message || 'AI job description generation is currently unavailable. Please try again.',
        error_code: aiRes?.errorCode || 'AI_GENERATION_FAILED'
      });
    }

    let structured = aiRes.structuredData || null;
    if (!structured && aiRes.text) {
      try {
        const cleaned = aiRes.text.replace(/```json/gi, '').replace(/```/g, '').trim();
        structured = JSON.parse(cleaned);
      } catch (_) {}
    }

    const overview = structured?.overview || '';
    const responsibilities = Array.isArray(structured?.responsibilities) ? structured.responsibilities : [];
    const requirements = Array.isArray(structured?.requirements) ? structured.requirements : [];
    const skills = Array.isArray(structured?.skills) ? structured.skills : [];

    res.json({
      success: true,
      data: {
        overview,
        description: overview,
        responsibilities,
        requirements,
        skills,
        raw: structured
      }
    });
  } catch (error) {
    console.error('generateAdminJobDescription error:', error);
    res.status(500).json({ success: false, message: 'Error generating job description with AI.', error: error.message });
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
  getAdminJobDetails,
  createInternalJob,
  updateInternalJob,
  archiveJob,
  restoreJob,
  toggleCandidateAccess,
  getJobHistory,
  getJobApplicants,
  getAdminApplicationResume,
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
  getSharedResumeByToken,
  getAllEmployerEnquiries,
  assignEnquiry,
  updateEnquiryStatus,
  updateEnquiryDetails,
  getEnquiryHistory,
  replyToEnquiryViaEmail,
  getEnquiryCounts,
  getEnquiryLinkedJobs,
  createJobFromEnquiry,
  convertEnquiryToRequirement,
  getRequirementCommercials,
  recordCommercialQuote,
  recordCommercialPayment,
  verifyCommercialPayment,
  rejectCommercialPayment,
  getAllEmployers,
  approveEmployer,
  rejectEmployer,
  toggleEmployerCandidateAccess,
  getAllLeads,
  createLead,
  updateLead,
  handoverLead,
  checkDuplicateCompanyLead,
  createCompanyLead,
  getCompanyLeadsQueue,
  getCompanyLeadDetails,
  claimCompanyLead,
  updateCompanyLeadStatus,
  reassignCompanyLead,
  convertCompanyLeadToJob,
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
  updateTeam,
  reassignTeamMember,
  getTeamPerformance,
  assignJobTeam,
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
  updateSettings,
  getCallbackRequests,
  updateCallbackRequest,
  generateAdminJobDescription
};
