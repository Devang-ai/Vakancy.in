const db = require('../config/db');

async function check() {
  await db.initDB();
  const jobs = await db.query('SELECT id, title, created_by_type, is_archived, manual_company_name, created_at FROM JOB ORDER BY created_at ASC');
  console.log(`Total jobs in DB: ${jobs.length}`);
  jobs.forEach((j, i) => {
    console.log(`[${i+1}] ${j.id} | ${j.title} | ${j.created_by_type} | archived=${j.is_archived} | ${j.manual_company_name || 'Direct Client'}`);
  });

  // Check if any test-created job exists from test runner and clean it up if title starts with 'TEST'
  const testJobs = jobs.filter(j => j.title.startsWith('TEST '));
  if (testJobs.length > 0) {
    console.log(`Cleaning up ${testJobs.length} temporary test runner jobs...`);
    for (const tj of testJobs) {
      await db.query('DELETE FROM RECRUITMENT_ACTIVITY WHERE job_id = ?', [tj.id]);
      await db.query('DELETE FROM CALLBACK_REQUEST WHERE job_id = ?', [tj.id]);
      await db.query('DELETE FROM APPLICATION WHERE job_id = ?', [tj.id]);
      await db.query('DELETE FROM JOB_KEYWORD WHERE job_id = ?', [tj.id]);
      await db.query('DELETE FROM JOB_BENEFIT WHERE job_id = ?', [tj.id]);
      await db.query('DELETE FROM JOB WHERE id = ?', [tj.id]);
      console.log(`Deleted test job: ${tj.id}`);
    }
  }

  // Also clean up any test candidate shares created during test runner
  await db.query("DELETE FROM CANDIDATE_SHARING WHERE consent_notes LIKE '%test%' OR id LIKE '%test%'");

  const finalJobs = await db.query('SELECT id, title, created_by_type, is_archived, manual_company_name FROM JOB ORDER BY created_at ASC');
  console.log(`Final legitimate jobs in DB: ${finalJobs.length}`);
  finalJobs.forEach((j, i) => {
    console.log(`[${i+1}] ${j.id} | ${j.title} | ${j.created_by_type} | archived=${j.is_archived} | ${j.manual_company_name || 'Direct Client'}`);
  });

  process.exit(0);
}

check().catch(e => {
  console.error(e);
  process.exit(1);
});
