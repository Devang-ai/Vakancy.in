module.exports = {
  id: '002_scope_and_sharing',
  description: 'Create explicit role, assignment, team and consented-sharing structures',
  async up(connection) {
    await connection.query(`CREATE TABLE IF NOT EXISTS ROLES (
      id VARCHAR(36) PRIMARY KEY, role_key VARCHAR(50) NOT NULL UNIQUE,
      display_name VARCHAR(100) NOT NULL, description TEXT NULL,
      is_system TINYINT(1) DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await connection.query(`CREATE TABLE IF NOT EXISTS ROLE_PERMISSIONS (
      id VARCHAR(36) PRIMARY KEY, role_key VARCHAR(50) NOT NULL,
      module VARCHAR(50) NOT NULL, action VARCHAR(50) NOT NULL,
      is_granted TINYINT(1) DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_role_mod_act (role_key, module, action)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await connection.query(`CREATE TABLE IF NOT EXISTS TEAMS (
      id VARCHAR(36) PRIMARY KEY, name VARCHAR(100) NOT NULL UNIQUE,
      lead_user_id VARCHAR(36) NULL, description TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await connection.query(`CREATE TABLE IF NOT EXISTS USER_ASSIGNMENTS (
      id VARCHAR(36) PRIMARY KEY, user_id VARCHAR(36) NOT NULL,
      team_id VARCHAR(36) NULL, assigned_client_id VARCHAR(36) NULL,
      assigned_job_id VARCHAR(36) NULL, scope_type VARCHAR(50) DEFAULT 'scoped',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_ua_user (user_id), INDEX idx_ua_team (team_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await connection.query(`CREATE TABLE IF NOT EXISTS CANDIDATE_SHARING (
      id VARCHAR(36) PRIMARY KEY, candidate_id VARCHAR(36) NOT NULL,
      client_id VARCHAR(36) NULL, job_id VARCHAR(36) NULL,
      share_token VARCHAR(64) NOT NULL UNIQUE, status VARCHAR(50) DEFAULT 'PROPOSED',
      candidate_consent TINYINT(1) DEFAULT 0, consent_notes VARCHAR(255) NULL,
      proposed_by_user_id VARCHAR(36) NOT NULL, tl_reviewed_by_user_id VARCHAR(36) NULL,
      approved_by_user_id VARCHAR(36) NULL, share_scope TEXT NULL,
      expires_at TIMESTAMP NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_share_candidate (candidate_id), INDEX idx_share_token (share_token)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  }
};
