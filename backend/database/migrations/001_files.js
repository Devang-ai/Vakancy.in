module.exports = {
  id: '001_files',
  description: 'Create centralized file metadata storage outside request handlers',
  async up(connection) {
    await connection.query(`CREATE TABLE IF NOT EXISTS FILES (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  }
};
