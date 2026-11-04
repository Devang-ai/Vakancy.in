module.exports = {
  id: '005_company_leads',
  description: 'Create COMPANY_LEAD table, add lead_id to JOB, and seed bd role permissions',
  async up(connection) {
    // 1. Create COMPANY_LEAD table
    await connection.query(`CREATE TABLE IF NOT EXISTS COMPANY_LEAD (
      id VARCHAR(36) PRIMARY KEY,
      bd_user_id VARCHAR(36) NOT NULL,
      company_name VARCHAR(255) NOT NULL,
      normalized_company_name VARCHAR(255) NOT NULL,
      contact_person_name VARCHAR(255) NOT NULL,
      contact_phone VARCHAR(50) NOT NULL,
      contact_email VARCHAR(255) NULL,
      city VARCHAR(100) NULL,
      website VARCHAR(255) NULL,
      normalized_domain VARCHAR(255) NULL,
      notes TEXT NULL,
      confirmed_hiring_interest TINYINT(1) NOT NULL DEFAULT 1,
      status ENUM('UNCLAIMED', 'CLAIMED', 'CONTACTED', 'REQUIREMENTS_GATHERED', 'CONVERTED_TO_JOB', 'DROPPED') NOT NULL DEFAULT 'UNCLAIMED',
      claimed_by_recruiter_id VARCHAR(36) NULL,
      claimed_at TIMESTAMP NULL,
      reassigned_by_director_id VARCHAR(36) NULL,
      reassigned_at TIMESTAMP NULL,
      client_id VARCHAR(36) NULL,
      drop_reason VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_cl_bd (bd_user_id),
      INDEX idx_cl_status (status),
      INDEX idx_cl_recruiter (claimed_by_recruiter_id),
      INDEX idx_cl_client (client_id),
      INDEX idx_cl_norm_name (normalized_company_name),
      INDEX idx_cl_norm_domain (normalized_domain),
      INDEX idx_cl_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    // 2. Add lead_id to JOB table if not present
    const [jobCols] = await connection.query(`
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'JOB' AND COLUMN_NAME = 'lead_id' LIMIT 1
    `);
    if (!jobCols.length) {
      await connection.query(`ALTER TABLE JOB ADD COLUMN lead_id VARCHAR(36) NULL AFTER client_id`);
      await connection.query(`ALTER TABLE JOB ADD INDEX idx_job_lead_id (lead_id)`);
    }

    // 3. Ensure internal roles exist in ROLES table
    const rolesToEnsure = [
      { key: 'director', name: 'Director (Main Admin)', desc: 'Platform oversight, full authority and lead reassignment', sys: 1 },
      { key: 'bd', name: 'Business Development (BD)', desc: 'Submit and track verified prospective company leads', sys: 1 },
      { key: 'recruiter', name: 'Recruiter', desc: 'Claim leads from queue, gather requirements, create jobs and manage candidate pipeline', sys: 1 }
    ];

    for (const r of rolesToEnsure) {
      await connection.query(`
        INSERT INTO ROLES (id, role_key, display_name, description, is_system)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE display_name = VALUES(display_name), description = VALUES(description)
      `, ['role-' + r.key, r.key, r.name, r.desc, r.sys]);
    }

    // 4. Ensure permissions in ROLE_PERMISSIONS
    // BD permissions: leads (create, view)
    const bdPermissions = [
      { module: 'leads', action: 'create' },
      { module: 'leads', action: 'view' },
      { module: 'dashboard', action: 'view' }
    ];
    for (const p of bdPermissions) {
      await connection.query(`
        INSERT INTO ROLE_PERMISSIONS (id, role_key, module, action, is_granted)
        VALUES (?, 'bd', ?, ?, 1)
        ON DUPLICATE KEY UPDATE is_granted = 1
      `, ['perm-internal-bd-' + p.module + '-' + p.action, p.module, p.action]);
    }

    // Recruiter permissions: leads (view, claim, edit, convert)
    const recPermissions = [
      { module: 'leads', action: 'view' },
      { module: 'leads', action: 'claim' },
      { module: 'leads', action: 'edit' },
      { module: 'leads', action: 'convert' },
      { module: 'jobs', action: 'create' },
      { module: 'jobs', action: 'view' },
      { module: 'jobs', action: 'edit' },
      { module: 'candidates', action: 'view' },
      { module: 'candidates', action: 'create' },
      { module: 'candidates', action: 'edit' },
      { module: 'applications', action: 'view' },
      { module: 'applications', action: 'edit' },
      { module: 'dashboard', action: 'view' }
    ];
    for (const p of recPermissions) {
      await connection.query(`
        INSERT INTO ROLE_PERMISSIONS (id, role_key, module, action, is_granted)
        VALUES (?, 'recruiter', ?, ?, 1)
        ON DUPLICATE KEY UPDATE is_granted = 1
      `, ['perm-internal-rec-' + p.module + '-' + p.action, p.module, p.action]);
    }

    // Also support historical bd_lead role having leads permissions
    for (const p of bdPermissions) {
      await connection.query(`
        INSERT INTO ROLE_PERMISSIONS (id, role_key, module, action, is_granted)
        VALUES (?, 'bd_lead', ?, ?, 1)
        ON DUPLICATE KEY UPDATE is_granted = 1
      `, ['perm-internal-bdlead-' + p.module + '-' + p.action, p.module, p.action]);
    }
  }
};
