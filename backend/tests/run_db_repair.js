const db = require('../config/db');

async function runRepair() {
  await db.initDB();
  console.log('Running database repairs...');

  // 1. Modify APPLICATION status enum
  try {
    await db.query("ALTER TABLE `APPLICATION` MODIFY COLUMN `status` ENUM('applied', 'reviewing', 'under_review', 'shortlisted', 'interview', 'selected', 'hired', 'rejected', 'on_hold') DEFAULT 'applied'");
    console.log('✅ Altered APPLICATION status enum to include under_review');
  } catch (err) {
    console.warn('Enum alter warning:', err.message);
  }

  // 2. Fix empty string status rows in APPLICATION
  const emptyRows = await db.query("SELECT id, candidate_id, job_id, status FROM `APPLICATION` WHERE status = '' OR status IS NULL");
  console.log('Empty status applications found:', emptyRows.length);
  if (emptyRows.length > 0) {
    await db.query("UPDATE `APPLICATION` SET status = 'shortlisted' WHERE status = '' OR status IS NULL");
    console.log('✅ Repaired empty status rows to "shortlisted"');
  }

  // 3. Remove duplicate test jobs created during test runs, keeping the baseline jobs
  const baselineJobIds = [
    'eb1c99ab-ba9a-47e5-aa48-59852df23218',
    '318102a1-f4c2-44f7-8c4f-2ffd894c1d5a',
    '5c88eb59-8da9-40fe-a1be-62cbaa273e12',
    '78fa855e-46fa-48f3-9b24-7f9ea72731a0',
    '8ec84225-bb56-4f9e-8e28-85596a0af60c',
    '058b05af-756c-4945-9d2b-8d106c61beb7'
  ];

  // Keep one pristine admin-created job mandate for demonstrations and testing
  const allAdminJobs = await db.query("SELECT id FROM JOB WHERE created_by_type = 'ADMIN' ORDER BY created_at DESC");
  if (allAdminJobs.length > 1) {
    const keepAdminJobId = allAdminJobs[0].id;
    const deleteIds = allAdminJobs.slice(1).map(j => j.id);
    if (deleteIds.length > 0) {
      await db.query("DELETE FROM JOB_SKILL WHERE job_id IN (?)", [deleteIds]);
      await db.query("DELETE FROM JOB_KEYWORD WHERE job_id IN (?)", [deleteIds]);
      await db.query("DELETE FROM CALLBACK_REQUEST WHERE job_id IN (?)", [deleteIds]);
      await db.query("DELETE FROM RECRUITMENT_ACTIVITY WHERE related_job_id IN (?)", [deleteIds]);
      await db.query("DELETE FROM JOB WHERE id IN (?)", [deleteIds]);
      console.log(`✅ Cleaned up ${deleteIds.length} redundant automated test jobs. Kept primary requisition: ${keepAdminJobId}`);
    }
  }

  const finalJobs = await db.query("SELECT id, title, created_by_type, status, is_archived FROM JOB");
  console.log(`Current Total Jobs in Database: ${finalJobs.length}`);
  console.table(finalJobs);

  process.exit(0);
}

runRepair().catch(err => {
  console.error('Repair error:', err);
  process.exit(1);
});
