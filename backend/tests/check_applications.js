const db = require('../config/db');

async function check() {
  await db.initDB();
  const rows = await db.query('SELECT id, job_id, candidate_id, resume_id, resume_filename, applied_at FROM APPLICATION');
  console.log('APPLICATION rows:', rows);
  process.exit(0);
}

check().catch(console.error);
