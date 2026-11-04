module.exports = {
  id: '004_workflow_integrity',
  description: 'Protect application uniqueness and audit shared-profile access',
  async up(connection) {
    const [duplicates] = await connection.query(`
      SELECT job_id, candidate_id, COUNT(*) AS duplicate_count
      FROM APPLICATION GROUP BY job_id, candidate_id HAVING COUNT(*) > 1 LIMIT 1
    `);
    if (duplicates.length) {
      throw new Error('APPLICATION contains duplicates; review them before adding the uniqueness constraint. No rows were changed.');
    }
    const [indexes] = await connection.query(`
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'APPLICATION'
        AND INDEX_NAME = 'uk_application_job_candidate' LIMIT 1
    `);
    if (!indexes.length) {
      await connection.query('ALTER TABLE APPLICATION ADD UNIQUE KEY uk_application_job_candidate (job_id, candidate_id)');
    }
    await connection.query(`CREATE TABLE IF NOT EXISTS CANDIDATE_SHARE_ACCESS_LOG (
      id VARCHAR(36) PRIMARY KEY, share_id VARCHAR(36) NOT NULL,
      action VARCHAR(50) NOT NULL, actor_user_id VARCHAR(36) NULL,
      request_fingerprint CHAR(64) NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_share_access_share (share_id), INDEX idx_share_access_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  }
};
