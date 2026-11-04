module.exports = {
  id: '006_executive_search_enquiry_jobs',
  description: 'Add enquiry_id to JOB table and ensure enquiry permissions for recruiter and director roles',
  async up(connection) {
    // 1. Add enquiry_id to JOB table if not present
    const [jobCols] = await connection.query(`
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'JOB' AND COLUMN_NAME = 'enquiry_id' LIMIT 1
    `);
    if (!jobCols.length) {
      await connection.query(`ALTER TABLE JOB ADD COLUMN enquiry_id VARCHAR(36) NULL AFTER lead_id`);
      await connection.query(`ALTER TABLE JOB ADD INDEX idx_job_enquiry_id (enquiry_id)`);
    }

    // 2. Ensure Recruiter permissions on module 'enquiries'
    const recruiterPerms = [
      { module: 'enquiries', action: 'view' },
      { module: 'enquiries', action: 'edit' }
    ];
    for (const p of recruiterPerms) {
      await connection.query(`
        INSERT INTO ROLE_PERMISSIONS (id, role_key, module, action, is_granted)
        VALUES (?, 'recruiter', ?, ?, 1)
        ON DUPLICATE KEY UPDATE is_granted = 1
      `, [`perm-recruiter-${p.module}-${p.action}`, p.module, p.action]);
    }

    // 3. Ensure Director permissions on module 'enquiries'
    const directorActions = ['view', 'assign', 'edit', 'approve', 'create', 'delete', 'export', 'share'];
    for (const act of directorActions) {
      await connection.query(`
        INSERT INTO ROLE_PERMISSIONS (id, role_key, module, action, is_granted)
        VALUES (?, 'director', 'enquiries', ?, 1)
        ON DUPLICATE KEY UPDATE is_granted = 1
      `, [`perm-director-enquiries-${act}`, act]);
    }
  }
};
