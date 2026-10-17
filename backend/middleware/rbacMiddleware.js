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
  if (normRole === 'director' || normRole === 'main_admin' || normRole === 'admin') {
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

    // Include team-level client and job assignments if user is part of or leads teams
    if (teamIds.length > 0) {
      const teamAssignments = await db.query(
        'SELECT user_id, assigned_client_id, assigned_job_id FROM USER_ASSIGNMENTS WHERE team_id IN (?)',
        [teamIds]
      );
      const teamMemberIds = [];
      for (const ta of teamAssignments || []) {
        if (ta.user_id) teamMemberIds.push(ta.user_id);
        if (ta.assigned_client_id) clientSet.add(ta.assigned_client_id);
        if (ta.assigned_job_id) jobSet.add(ta.assigned_job_id);
      }

      // If user leads team or is part of team, include jobs assigned to team recruiters
      if (teamMemberIds.length > 0) {
        const memberJobs = await db.query(
          'SELECT id FROM JOB WHERE assigned_recruiter_id IN (?)',
          [teamMemberIds]
        );
        for (const mj of memberJobs || []) {
          if (mj.id) jobSet.add(mj.id);
        }
      }
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

module.exports = {
  checkPermission,
  getUserScope
};
