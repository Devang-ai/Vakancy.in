const db = require('../config/db');

/**
 * checkPermission(module, action)
 * Dynamic middleware that queries ROLE_PERMISSIONS in MySQL.
 * Enables zero-code-change permission reconfiguration by Director.
 */
const checkPermission = (moduleName, actionName) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }

      const userRole = (req.user.role || '').toLowerCase();

      // Director and Main Admin always have full access across all modules and actions
      if (userRole === 'director' || userRole === 'main_admin' || req.user.is_main_admin === 1) {
        return next();
      }

      // BD role privacy guard: strictly no candidate, application, candidate_sharing, ats, or enquiries access
      if ((userRole === 'bd' || userRole === 'bd_lead') && 
          (moduleName === 'candidates' || moduleName === 'applications' || moduleName === 'candidate_sharing' || moduleName === 'ats' || moduleName === 'enquiries')) {
        return res.status(403).json({
          success: false,
          code: 'PRIVACY_PROTECTION_ACCESS_DENIED',
          message: `Forbidden. Role '${userRole}' is strictly prohibited from accessing candidate, application, and executive search enquiry records.`
        });
      }

      // Check dynamic permission in database
      const perms = await db.query(
        'SELECT is_granted FROM ROLE_PERMISSIONS WHERE role_key = ? AND module = ? AND action = ? LIMIT 1',
        [userRole, moduleName, actionName]
      );

      if (!perms || perms.length === 0 || !perms[0].is_granted) {
        return res.status(403).json({
          success: false,
          code: 'PERMISSION_DENIED',
          message: `Forbidden. Role '${userRole}' lacks '${actionName}' permission for module '${moduleName}'.`
        });
      }

      next();
    } catch (err) {
      console.error('RBAC Permission Check Error:', err);
      return res.status(500).json({ success: false, message: 'Authorization verification failed.', error: err.message });
    }
  };
};

/**
 * getUserScope(userId, role)
 * Returns the record-level scope for a team member:
 * - isGlobal: true if Director or unconstrained
 * - teamIds: array of team IDs
 * - clientIds: array of assigned client/employer IDs
 * - jobIds: array of assigned job IDs
 */
const getUserScope = async (userId, role) => {
  const normRole = (role || '').toLowerCase();
  if (normRole === 'director' || normRole === 'main_admin' || normRole === 'admin' || normRole === 'super_admin') {
    return { isGlobal: true, teamIds: [], clientIds: [], jobIds: [] };
  }

  try {
    const assignments = await db.query(
      'SELECT team_id, assigned_client_id, assigned_job_id, scope_type FROM USER_ASSIGNMENTS WHERE user_id = ?',
      [userId]
    );

    // If TL, check teams they lead
    const ledTeams = await db.query(
      'SELECT id FROM TEAMS WHERE lead_user_id = ?',
      [userId]
    );

    const teamSet = new Set();
    const clientSet = new Set();
    const jobSet = new Set();
    let isGlobal = false;

    for (const t of ledTeams || []) {
      if (t.id) teamSet.add(t.id);
    }

    for (const a of assignments || []) {
      if (a.scope_type === 'global') isGlobal = true;
      if (a.team_id) teamSet.add(a.team_id);
      if (a.assigned_client_id) clientSet.add(a.assigned_client_id);
      if (a.assigned_job_id) jobSet.add(a.assigned_job_id);
    }

    const teamIds = Array.from(teamSet);
    const ledTeamIds = (ledTeams || []).map(team => team.id).filter(Boolean);

    // Include team-level client and job assignments if user is a team manager or leads teams
    const isManagerRole = normRole === 'team_manager' || normRole === 'tl_coordinator' || ledTeamIds.length > 0;

    if (isManagerRole) {
      // Find all recruiters directly reporting to this manager
      const reportingRecruiters = await db.query(
        'SELECT id FROM USERS WHERE reporting_user_id = ?',
        [userId]
      );
      const subordinateIds = new Set((reportingRecruiters || []).map(r => r.id));

      if (ledTeamIds.length > 0) {
        // Include jobs assigned directly to led teams
        const teamAssignedJobs = await db.query(
          'SELECT id FROM JOB WHERE assigned_team_id IN (?)',
          [ledTeamIds]
        );
        for (const tj of teamAssignedJobs || []) {
          if (tj.id) jobSet.add(tj.id);
        }

        const teamAssignments = await db.query(
          'SELECT user_id, assigned_client_id, assigned_job_id FROM USER_ASSIGNMENTS WHERE team_id IN (?)',
          [ledTeamIds]
        );
        for (const ta of teamAssignments || []) {
          if (ta.user_id) subordinateIds.add(ta.user_id);
          if (ta.assigned_client_id) clientSet.add(ta.assigned_client_id);
          if (ta.assigned_job_id) jobSet.add(ta.assigned_job_id);
        }

        const teamUsers = await db.query(
          'SELECT id FROM USERS WHERE team_id IN (?)',
          [ledTeamIds]
        );
        for (const tu of teamUsers || []) {
          if (tu.id) subordinateIds.add(tu.id);
        }
      }

      // If user leads team or has reporting recruiters, include jobs assigned to their recruiters
      const allSubordinateIds = Array.from(subordinateIds).filter(id => id && id !== userId);
      if (allSubordinateIds.length > 0) {
        const memberJobs = await db.query(
          'SELECT id FROM JOB WHERE assigned_recruiter_id IN (?)',
          [allSubordinateIds]
        );
        for (const mj of memberJobs || []) {
          if (mj.id) jobSet.add(mj.id);
        }
      }
    }

    const directlyAssignedJobs = await db.query(
      'SELECT id FROM JOB WHERE assigned_recruiter_id = ?',
      [userId]
    );
    for (const job of directlyAssignedJobs || []) {
      if (job.id) jobSet.add(job.id);
    }

    const clientIds = Array.from(clientSet);

    // Any jobs belonging to assigned clients are also in scope
    if (clientIds.length > 0) {
      const clientJobs = await db.query(
        'SELECT id FROM JOB WHERE employer_id IN (?)',
        [clientIds]
      );
      for (const cj of clientJobs || []) {
        if (cj.id) jobSet.add(cj.id);
      }
    }

    const jobIds = Array.from(jobSet);

    return { isGlobal, teamIds, clientIds, jobIds };
  } catch (err) {
    console.warn('Error fetching user scope:', err.message);
    return { isGlobal: false, teamIds: [], clientIds: [], jobIds: [] };
  }
};

const requireScopedJob = async (req, res, next) => {
  try {
    const jobId = req.params.id || req.params.jobId;
    if (!jobId) return res.status(400).json({ success: false, message: 'Job ID is required.' });
    const scope = await getUserScope(req.user.id, req.user.role);
    if (scope.isGlobal || scope.jobIds.includes(jobId)) return next();
    return res.status(403).json({
      success: false,
      code: 'SCOPE_ACCESS_DENIED',
      message: 'This job is outside your assigned recruitment scope.'
    });
  } catch (error) {
    console.error('Job scope verification failed:', error);
    return res.status(500).json({ success: false, message: 'Authorization verification failed.' });
  }
};

const requireScopedApplication = async (req, res, next) => {
  try {
    const applicationId = req.params.id;
    const rows = await db.query('SELECT job_id FROM APPLICATION WHERE id = ? LIMIT 1', [applicationId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Application not found.' });
    const scope = await getUserScope(req.user.id, req.user.role);
    if (scope.isGlobal || scope.jobIds.includes(rows[0].job_id)) return next();
    return res.status(403).json({
      success: false,
      code: 'SCOPE_ACCESS_DENIED',
      message: 'This application is outside your assigned recruitment scope.'
    });
  } catch (error) {
    console.error('Application scope verification failed:', error);
    return res.status(500).json({ success: false, message: 'Authorization verification failed.' });
  }
};

module.exports = {
  checkPermission,
  getUserScope,
  requireScopedJob,
  requireScopedApplication
};
