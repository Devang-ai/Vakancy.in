module.exports = {
  id: '011_job_candidate_shortlist',
  description: 'Create JOB_CANDIDATE_SHORTLIST table for explicit candidate shortlisting per job mandate',
  async up(connection) {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`JOB_CANDIDATE_SHORTLIST\` (
        \`id\` VARCHAR(36) PRIMARY KEY,
        \`job_id\` VARCHAR(36) NOT NULL,
        \`candidate_id\` VARCHAR(36) NOT NULL,
        \`application_id\` VARCHAR(36) NULL,
        \`shortlisted_by_user_id\` VARCHAR(36) NOT NULL,
        \`source\` VARCHAR(50) DEFAULT 'APPLICANT',
        \`notes\` VARCHAR(500) NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY \`uniq_job_candidate_shortlist\` (\`job_id\`, \`candidate_id\`),
        INDEX \`idx_jcs_job\` (\`job_id\`),
        INDEX \`idx_jcs_candidate\` (\`candidate_id\`),
        INDEX \`idx_jcs_app\` (\`application_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  }
};
