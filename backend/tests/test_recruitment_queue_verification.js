const axios = require('axios');
const db = require('../config/db');

async function verifyQueue() {
  await db.initDB();
  console.log('--- Step 1: Testing Director Login & Token ---');
  const login = await axios.post('http://localhost:5002/api/auth/login', {
    email: 'director@vakancy.com',
    password: 'password123'
  });
  const token = login.data.token;
  const headers = { Authorization: `Bearer ${token}` };

  console.log('--- Step 2: Fetching All Applications via /api/admin/applications ---');
  const allRes = await axios.get('http://localhost:5002/api/admin/applications', { headers });
  console.log(`Success: ${allRes.data.success}, Count: ${allRes.data.count}`);
  if (allRes.data.count === 0) {
    throw new Error('Expected at least 1 genuine application record in database.');
  }

  const app = allRes.data.applications[0];
  console.log('Verified Application Record:', {
    id: app.id,
    candidate_name: app.candidate_name,
    candidate_email: app.candidate_email,
    job_title: app.job_title,
    company_name: app.company_name,
    status: app.status,
    has_resume_url: Boolean(app.resume_url),
    total_experience: app.total_experience
  });

  console.log('--- Step 3: Testing Stage Lifecycle Transitions via /api/admin/applications/:id/stage ---');
  const testStages = ['under_review', 'shortlisted', 'interview', 'selected', 'on_hold'];
  for (const st of testStages) {
    const stageRes = await axios.put(`http://localhost:5002/api/admin/applications/${app.id}/stage`, {
      status: st
    }, { headers });
    if (!stageRes.data.success) {
      throw new Error(`Failed to update stage to ${st}`);
    }
    console.log(`  ✓ Successfully updated status to: '${st}'`);

    // Verify DB does not contain empty string
    const [dbRow] = await db.query('SELECT status FROM APPLICATION WHERE id = ?', [app.id]);
    if (dbRow.status === '') {
      throw new Error(`DB contains empty string for status when setting ${st}`);
    }
    console.log(`    DB verification: ${dbRow.status}`);
  }

  console.log('--- Step 4: Testing Stage Query Filtering ---');
  // Query with stage=under_review
  await axios.put(`http://localhost:5002/api/admin/applications/${app.id}/stage`, { status: 'under_review' }, { headers });
  const filterReviewRes = await axios.get('http://localhost:5002/api/admin/applications?stage=under_review', { headers });
  console.log(`Filter stage=under_review count: ${filterReviewRes.data.count} (Expected >= 1)`);
  if (filterReviewRes.data.count < 1) {
    throw new Error('stage=under_review filter failed to return application.');
  }

  // Restore to shortlisted
  await axios.put(`http://localhost:5002/api/admin/applications/${app.id}/stage`, { status: 'shortlisted' }, { headers });
  const filterShortlistedRes = await axios.get('http://localhost:5002/api/admin/applications?stage=shortlisted', { headers });
  console.log(`Filter stage=shortlisted count: ${filterShortlistedRes.data.count} (Expected >= 1)`);
  if (filterShortlistedRes.data.count < 1) {
    throw new Error('stage=shortlisted filter failed to return application.');
  }

  console.log('--- Step 5: Testing Search Query ---');
  const searchRes = await axios.get(`http://localhost:5002/api/admin/applications?search=${encodeURIComponent(app.candidate_name)}`, { headers });
  console.log(`Search for "${app.candidate_name}" returned: ${searchRes.data.count}`);
  if (searchRes.data.count < 1) {
    throw new Error('Search query failed.');
  }

  console.log('--- Step 6: Testing Audit Log in RECRUITMENT_ACTIVITY ---');
  const activities = await db.query("SELECT * FROM RECRUITMENT_ACTIVITY WHERE entity_type = 'APPLICATION' AND related_application_id = ? ORDER BY created_at DESC LIMIT 3", [app.id]);
  console.log(`Audit activities recorded: ${activities.length}`);
  for (const act of activities) {
    console.log(`  - [${act.action_type}] ${act.description} (field: ${act.changed_field}, prev: ${act.previous_value}, new: ${act.new_value})`);
  }

  console.log('====================================================');
  console.log('RECRUITMENT QUEUE VERIFICATION SUITE: ALL PASS');
  console.log('====================================================');
  process.exit(0);
}

verifyQueue().catch(err => {
  console.error('Queue verification error:', err.response?.data || err.message);
  process.exit(1);
});
