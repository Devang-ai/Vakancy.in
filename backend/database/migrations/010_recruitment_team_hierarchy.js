module.exports = {
  id: '010_recruitment_team_hierarchy',
  description: 'Add team_manager role, permissions, assigned_team_id to JOB, team_id to USERS, and TEAM_ASSIGNMENT_HISTORY',
  async up(connection) {
    // 1. Ensure team_manager role in ROLES master table
    await connection.query(`
      INSERT INTO ROLES (id, role_key, display_name, description, is_system)
      VALUES (
        'role-team_manager',
        'team_manager',
        'Team Manager',
        'Supervises recruitment team, coordinates recruiters, allocates mandates, tracks candidate sourcing and team performance',
        1
      )
      ON DUPLICATE KEY UPDATE
        display_name = VALUES(display_name),
        description = VALUES(description);
    `);

    // 2. Ensure permissions for team_manager in ROLE_PERMISSIONS
    const TM_PERMS = [
      { mod: 'dashboard', act: 'view' },
      { mod: 'candidates', act: 'view' },
      { mod: 'candidates', act: 'edit' },
      { mod: 'jobs', act: 'view' },
      { mod: 'jobs', act: 'assign' },
      { mod: 'jobs', act: 'edit' },
      { mod: 'applications', act: 'view' },
      { mod: 'applications', act: 'edit' },
      { mod: 'candidate_sharing', act: 'view' },
      { mod: 'candidate_sharing', act: 'edit' },
      { mod: 'enquiries', act: 'view' },
      { mod: 'enquiries', act: 'edit' },
      { mod: 'enquiries', act: 'assign' },
      { mod: 'employers', act: 'view' },
      { mod: 'team', act: 'view' },
      { mod: 'team', act: 'create' },
      { mod: 'team', act: 'edit' },
      { mod: 'activity_log', act: 'view' }
    ];

    for (const p of TM_PERMS) {
      await connection.query(`
        INSERT INTO ROLE_PERMISSIONS (id, role_key, module, action, is_granted)
        VALUES (?, 'team_manager', ?, ?, 1)
        ON DUPLICATE KEY UPDATE is_granted = 1
      `, [`perm-tm-${p.mod}-${p.act}`, p.mod, p.act]);
    }

    // Also ensure team view/edit for tl_coordinator for legacy continuity
    await connection.query(`
      INSERT INTO ROLE_PERMISSIONS (id, role_key, module, action, is_granted)
      VALUES ('perm-tl-team-view', 'tl_coordinator', 'team', 'view', 1)
      ON DUPLICATE KEY UPDATE is_granted = 1
    `);

    // 3. Add assigned_team_id to JOB table if not exists
    try {
      await connection.query(`
        ALTER TABLE \`JOB\`
        ADD COLUMN \`assigned_team_id\` VARCHAR(36) NULL AFTER \`assigned_recruiter_id\`
      `);
    } catch (err) {
      if (!err.message.includes('Duplicate column name')) {
        console.warn('Notice adding assigned_team_id to JOB:', err.message);
      }
    }

    try {
      await connection.query(`
        ALTER TABLE \`JOB\`
        ADD INDEX \`idx_job_assigned_team\` (\`assigned_team_id\`)
      `);
    } catch (_) {}

    // 4. Add status to TEAMS table if not exists
    try {
      await connection.query(`
        ALTER TABLE \`TEAMS\`
        ADD COLUMN \`status\` VARCHAR(50) DEFAULT 'ACTIVE' AFTER \`description\`
      `);
    } catch (err) {
      if (!err.message.includes('Duplicate column name')) {
        console.warn('Notice adding status to TEAMS:', err.message);
      }
    }

    // 5. Add team_id to USERS table if not exists
    try {
      await connection.query(`
        ALTER TABLE \`USERS\`
        ADD COLUMN \`team_id\` VARCHAR(36) NULL AFTER \`reporting_user_id\`
      `);
    } catch (err) {
      if (!err.message.includes('Duplicate column name')) {
        console.warn('Notice adding team_id to USERS:', err.message);
      }
    }

    try {
      await connection.query(`
        ALTER TABLE \`USERS\`
        ADD INDEX \`idx_users_team\` (\`team_id\`)
      `);
    } catch (_) {}

    // 6. Sync existing team assignments from USER_ASSIGNMENTS into USERS.team_id
    try {
      await connection.query(`
        UPDATE USERS u
        JOIN (
          SELECT user_id, MAX(team_id) AS team_id
          FROM USER_ASSIGNMENTS
          WHERE team_id IS NOT NULL AND team_id != ''
          GROUP BY user_id
        ) ua ON u.id = ua.user_id
        SET u.team_id = ua.team_id
        WHERE u.team_id IS NULL OR u.team_id = ''
      `);
    } catch (_) {}

    // 7. Create TEAM_ASSIGNMENT_HISTORY table for audit logging
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`TEAM_ASSIGNMENT_HISTORY\` (
        \`id\` VARCHAR(36) PRIMARY KEY,
        \`user_id\` VARCHAR(36) NOT NULL,
        \`previous_manager_id\` VARCHAR(36) NULL,
        \`new_manager_id\` VARCHAR(36) NULL,
        \`previous_team_id\` VARCHAR(36) NULL,
        \`new_team_id\` VARCHAR(36) NULL,
        \`changed_by_user_id\` VARCHAR(36) NOT NULL,
        \`reason\` VARCHAR(255) NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_tah_user\` (\`user_id\`),
        INDEX \`idx_tah_manager\` (\`new_manager_id\`),
        INDEX \`idx_tah_team\` (\`new_team_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  }
};
