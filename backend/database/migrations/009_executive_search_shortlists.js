module.exports = {
  id: '009_executive_search_shortlists',
  description: 'Add Executive Search candidate shortlist sharing, token hashes, and audit access logs',
  async up(connection) {
    // 1. Executive Search Shortlist Share Parent Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS EXECUTIVE_SEARCH_SHARE (
        id VARCHAR(36) PRIMARY KEY,
        job_id VARCHAR(36) NOT NULL,
        employer_id VARCHAR(36) NULL,
        title VARCHAR(255) NULL,
        share_token_hash CHAR(64) NOT NULL UNIQUE,
        access_code_hash CHAR(64) NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        expires_at TIMESTAMP NULL,
        allow_resume_download TINYINT(1) DEFAULT 1,
        mask_contact_info TINYINT(1) DEFAULT 1,
        require_employer_auth TINYINT(1) DEFAULT 0,
        created_by_user_id VARCHAR(36) NOT NULL,
        revoked_by_user_id VARCHAR(36) NULL,
        revoked_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_ess_job (job_id),
        INDEX idx_ess_employer (employer_id),
        INDEX idx_ess_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 2. Executive Search Share Candidate Junction Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS EXECUTIVE_SEARCH_SHARE_CANDIDATE (
        id VARCHAR(36) PRIMARY KEY,
        share_id VARCHAR(36) NOT NULL,
        candidate_id VARCHAR(36) NOT NULL,
        candidate_consent TINYINT(1) DEFAULT 1,
        notes VARCHAR(500) NULL,
        display_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_essc_share_cand (share_id, candidate_id),
        INDEX idx_essc_cand (candidate_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 3. Executive Search Share Access and Download Log
    await connection.query(`
      CREATE TABLE IF NOT EXISTS EXECUTIVE_SEARCH_SHARE_LOG (
        id VARCHAR(36) PRIMARY KEY,
        share_id VARCHAR(36) NOT NULL,
        action VARCHAR(50) NOT NULL,
        candidate_id VARCHAR(36) NULL,
        actor_email VARCHAR(255) NULL,
        ip_address VARCHAR(100) NULL,
        user_agent VARCHAR(500) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_essl_share (share_id),
        INDEX idx_essl_action (action)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }
};
