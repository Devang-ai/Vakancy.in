module.exports = {
  id: '012_job_specific_callbacks',
  description: 'Add requester contact fields and job-specific indexing to CALLBACK_REQUEST',
  async up(connection) {
    // 1. Ensure requested_by_user_id is nullable (to allow candidate/guest job callbacks)
    try {
      await connection.query("ALTER TABLE `CALLBACK_REQUEST` MODIFY COLUMN `requested_by_user_id` VARCHAR(36) NULL");
    } catch (_) {}

    // 2. Add requester contact info and callback metadata columns if not present
    const columnsToAdd = [
      { name: 'requester_name', type: 'VARCHAR(150) NULL' },
      { name: 'requester_email', type: 'VARCHAR(150) NULL' },
      { name: 'requester_phone', type: 'VARCHAR(50) NULL' },
      { name: 'callback_reason', type: 'TEXT NULL' },
      { name: 'preferred_time', type: 'VARCHAR(100) NULL' }
    ];

    for (const col of columnsToAdd) {
      try {
        await connection.query(`ALTER TABLE \`CALLBACK_REQUEST\` ADD COLUMN \`${col.name}\` ${col.type}`);
      } catch (_) {}
    }

    // 3. Add composite indexes for job-specific callback count aggregation
    try {
      await connection.query("ALTER TABLE `CALLBACK_REQUEST` ADD INDEX `idx_cb_job_status` (`job_id`, `status`)");
    } catch (_) {}

    try {
      await connection.query("ALTER TABLE `CALLBACK_REQUEST` ADD INDEX `idx_cb_employer_status` (`employer_id`, `status`)");
    } catch (_) {}
  }
};
