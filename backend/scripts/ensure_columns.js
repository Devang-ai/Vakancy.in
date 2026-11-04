const db = require('../config/db');

async function main() {
  await db.initDB();
  const alterStatements = [
    'ALTER TABLE USERS ADD COLUMN reset_token_hash CHAR(64) NULL',
    'ALTER TABLE USERS ADD COLUMN token_version INT NOT NULL DEFAULT 0',
    'ALTER TABLE USERS ADD COLUMN password_changed_at DATETIME NULL',
    `CREATE TABLE IF NOT EXISTS CANDIDATE_SHARE_ACCESS_LOG (
      id VARCHAR(36) PRIMARY KEY,
      share_id VARCHAR(36) NOT NULL,
      action VARCHAR(50) NOT NULL,
      actor_user_id VARCHAR(36) NULL,
      request_fingerprint CHAR(64) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_share_access_share (share_id),
      INDEX idx_share_access_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS FILES (
      id VARCHAR(36) PRIMARY KEY,
      owner_user_id VARCHAR(36) NOT NULL,
      candidate_id VARCHAR(36) NULL,
      employer_id VARCHAR(36) NULL,
      application_id VARCHAR(36) NULL,
      file_type VARCHAR(50) NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      mime_type VARCHAR(100) NOT NULL,
      file_size INT NOT NULL,
      cloudinary_asset_id VARCHAR(255) NULL,
      cloudinary_public_id VARCHAR(255) NOT NULL,
      resource_type VARCHAR(50) DEFAULT 'auto',
      delivery_type VARCHAR(50) DEFAULT 'upload',
      secure_url TEXT NOT NULL,
      folder VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_files_owner (owner_user_id),
      INDEX idx_files_candidate (candidate_id),
      INDEX idx_files_employer (employer_id),
      INDEX idx_files_application (application_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  ];

  for (const sql of alterStatements) {
    try {
      await db.query(sql);
      console.log('Executed:', sql.substring(0, 45).replace(/\n/g, ' '));
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('Already exists, skipped.');
      } else {
        console.log('Notice:', err.message);
      }
    }
  }

  // Update token_version for existing users if NULL
  await db.query('UPDATE USERS SET token_version = 0 WHERE token_version IS NULL');
  console.log('Schema enhancements complete.');
  process.exit(0);
}

main().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
