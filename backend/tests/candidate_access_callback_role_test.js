const axios = require('axios');
const assert = require('assert');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const db = require('../config/db');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5002/api';

async function runTests() {
  console.log('================================================================');
  console.log('🚀 CANDIDATE ACCESS, CALLBACK PERSISTENCE & STAFF ROLES SUITE');
  console.log(`📡 Testing against: ${BASE_URL}`);
  console.log('================================================================\n');

  await db.initDB();

  let directorToken = '';
  let employerToken = '';
  let recruiterToken = '';
  let bdToken = '';
  let testEmployerId = '';
  let testEmployerUserId = '';
  let createdCallbackId = '';
  let testRecruiterId = '';

  // 1. Authenticate Director
  console.log('[Step 1] Authenticating Director (director@vakancy.com)...');
  const dirLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'director@vakancy.com',
    password: 'password123'
  });
  assert(dirLoginRes.data.success, 'Director login failed');
  directorToken = dirLoginRes.data.token;
  console.log('✅ Director authenticated successfully.\n');

  // 2. Fetch Employers and Pick a verified test employer
  console.log('[Step 2] Director fetching employers list...');
  const empListRes = await axios.get(`${BASE_URL}/admin/employers`, {
    headers: { Authorization: `Bearer ${directorToken}` }
  });
  assert(empListRes.data.success, 'Failed to fetch employers');
  assert(empListRes.data.employers.length > 0, 'No employers found');
  const targetEmp = empListRes.data.employers[0];
  testEmployerId = targetEmp.id;
  testEmployerUserId = targetEmp.user_id;
  console.log(`✅ Selected Employer: "${targetEmp.company_name}" (ID: ${testEmployerId}, Initial Access: ${targetEmp.candidate_access_enabled})\n`);

  // Ensure employer account exists in USERS and generate token
  const [empUser] = await db.query('SELECT email FROM USERS WHERE id = ?', [testEmployerUserId]);
  assert(empUser, 'Employer user not found in USERS table');
  
  // Generate token or login as employer
  const jwt = require('jsonwebtoken');
  employerToken = jwt.sign(
    { id: testEmployerUserId, role: 'employer', email: empUser.email },
    process.env.JWT_SECRET || 'vakancy_super_secret_jwt_key_2026_recruitment_portal',
    { expiresIn: '1h' }
  );
  console.log(`✅ Generated authenticated session for Employer: ${empUser.email}\n`);

  // 3. Test Candidate Access OFF
  console.log('[Step 3] Setting Employer Candidate Access to OFF (Locked State)...');
  const toggleOffRes = await axios.put(
    `${BASE_URL}/admin/employers/${testEmployerId}/candidate-access`,
    { candidate_access_enabled: false },
    { headers: { Authorization: `Bearer ${directorToken}` } }
  );
  assert(toggleOffRes.data.success, 'Toggle access OFF failed');
  assert(toggleOffRes.data.candidate_access_enabled === 0, 'Candidate access not 0 in response');

  // Verify in database
  const [empDbOff] = await db.query('SELECT candidate_access_enabled FROM EMPLOYERS WHERE id = ?', [testEmployerId]);
  assert(empDbOff.candidate_access_enabled === 0, 'Database column candidate_access_enabled is not 0');
  console.log('✅ Persisted in DB: candidate_access_enabled = 0');

  // Verify Employer Portal response when OFF
  const empPortalOff = await axios.get(`${BASE_URL}/employers/candidate-database`, {
    headers: { Authorization: `Bearer ${employerToken}` }
  });
  assert(empPortalOff.data.success, 'Employer candidate-database failed');
  assert(empPortalOff.data.access_enabled === false, 'Expected access_enabled to be false');
  console.log('✅ Employer Portal receives: access_enabled = false (Locked State Active)\n');

  // 4. Test Callback Request Persistence
  console.log('[Step 4] Employer Requesting Callback on Locked Candidate Database...');
  // Clean previous test callbacks for this employer to ensure deterministic test
  await db.query("DELETE FROM CALLBACK_REQUEST WHERE employer_id = ? AND source = 'CANDIDATE_DATABASE'", [testEmployerId]);

  const cbSubmitRes = await axios.post(
    `${BASE_URL}/employers/candidate-database/callback`,
    {
      notes: 'Urgent: Looking to hire 3 Lead Fullstack Engineers in Bengaluru',
      contact_phone: '+91 99887 76655'
    },
    { headers: { Authorization: `Bearer ${employerToken}` } }
  );
  assert(cbSubmitRes.data.success, 'Callback request submission failed');
  assert(cbSubmitRes.data.callback_id, 'No callback_id returned');
  createdCallbackId = cbSubmitRes.data.callback_id;
  console.log(`✅ Callback Registered with ID: ${createdCallbackId}`);

  // Verify DB insertion
  const [cbDb] = await db.query('SELECT * FROM CALLBACK_REQUEST WHERE id = ?', [createdCallbackId]);
  assert(cbDb, 'Callback request not found in DB');
  assert.strictEqual(cbDb.employer_id, testEmployerId, 'Employer ID mismatch');
  assert.strictEqual(cbDb.job_id, null, 'Job ID should be null for candidate database callback');
  assert.strictEqual(cbDb.source, 'CANDIDATE_DATABASE', 'Source should be CANDIDATE_DATABASE');
  assert.strictEqual(cbDb.status, 'NEW', 'Status should be NEW');
  console.log('✅ DB Verification: job_id = NULL, source = CANDIDATE_DATABASE, status = NEW');

  // Test Duplicate Callback Submission (Expect Graceful 200 with already_requested)
  console.log('\n[Step 4b] Testing duplicate callback request handling...');
  const cbDupRes = await axios.post(
    `${BASE_URL}/employers/candidate-database/callback`,
    { notes: 'Second submission test' },
    { headers: { Authorization: `Bearer ${employerToken}` } }
  );
  assert(cbDupRes.data.success, 'Expected duplicate request to return success: true');
  assert(cbDupRes.data.already_requested === true, 'Expected already_requested: true');
  assert.strictEqual(cbDupRes.data.code, 'CALLBACK_PENDING', 'Expected code: CALLBACK_PENDING');
  console.log('✅ Gracefully handled duplicate: already_requested = true, status = ' + cbDupRes.data.status);

  // Verify Employer Portal shows callback_pending
  const empPortalCbPending = await axios.get(`${BASE_URL}/employers/candidate-database`, {
    headers: { Authorization: `Bearer ${employerToken}` }
  });
  assert(empPortalCbPending.data.callback_pending === true, 'Expected callback_pending: true on reload');
  console.log('✅ Reload check: Employer sees callback_pending = true on locked page\n');

  // 5. Test Admin Visibility and Recruiter Assignment
  console.log('[Step 5] Admin verifying callback appearance and assigning to Recruiter...');
  const adminCbListRes = await axios.get(`${BASE_URL}/admin/callbacks`, {
    headers: { Authorization: `Bearer ${directorToken}` }
  });
  assert(adminCbListRes.data.success, 'Failed to fetch admin callbacks');
  const foundCb = adminCbListRes.data.callbacks.find(c => c.id === createdCallbackId);
  assert(foundCb, 'Created callback not visible in admin callback list');
  assert.strictEqual(foundCb.source, 'CANDIDATE_DATABASE', 'Admin callback source mismatch');
  console.log(`✅ Admin visible: Callback found under company "${foundCb.company_name}"`);

  // Find an active recruiter
  const [recUser] = await db.query("SELECT id, email, name FROM USERS WHERE role = 'recruiter' AND is_active = 1 LIMIT 1");
  assert(recUser, 'No active recruiter found in USERS table');
  testRecruiterId = recUser.id;
  console.log(`✅ Selected Active Recruiter: ${recUser.name} (${recUser.email})`);

  // Director assigns callback to Recruiter
  const assignCbRes = await axios.put(
    `${BASE_URL}/admin/callbacks/${createdCallbackId}`,
    {
      status: 'ASSIGNED',
      assigned_to_user_id: testRecruiterId,
      internal_notes: 'Assigned by Director to lead recruiter for consultation call'
    },
    { headers: { Authorization: `Bearer ${directorToken}` } }
  );
  assert(assignCbRes.data.success, 'Director callback assignment failed');
  console.log('✅ Callback assigned to Recruiter and status updated to ASSIGNED');

  // Recruiter logs in and manages callback
  recruiterToken = jwt.sign(
    { id: testRecruiterId, role: 'recruiter', email: recUser.email },
    process.env.JWT_SECRET || 'vakancy_super_secret_jwt_key_2026_recruitment_portal',
    { expiresIn: '1h' }
  );

  const recCbListRes = await axios.get(`${BASE_URL}/admin/callbacks`, {
    headers: { Authorization: `Bearer ${recruiterToken}` }
  });
  assert(recCbListRes.data.success, 'Recruiter failed to fetch callbacks');
  const recFoundCb = recCbListRes.data.callbacks.find(c => c.id === createdCallbackId);
  assert(recFoundCb, 'Assigned callback not found in Recruiter callback queue');
  console.log('✅ Recruiter confirmed visibility of assigned callback');

  // Recruiter updates status to IN_PROGRESS with consultation notes
  const recUpdateCbRes = await axios.put(
    `${BASE_URL}/admin/callbacks/${createdCallbackId}`,
    {
      status: 'IN_PROGRESS',
      internal_notes: 'Recruiter called employer: confirmed hiring requirements for senior fullstack engineers'
    },
    { headers: { Authorization: `Bearer ${recruiterToken}` } }
  );
  assert(recUpdateCbRes.data.success, 'Recruiter callback status update failed');
  console.log('✅ Recruiter successfully updated callback to IN_PROGRESS\n');

  // 6. Test Candidate Access ON (Unlock)
  console.log('[Step 6] Director enabling Candidate Database Access (ON)...');
  const toggleOnRes = await axios.put(
    `${BASE_URL}/admin/employers/${testEmployerId}/candidate-access`,
    { candidate_access_enabled: true },
    { headers: { Authorization: `Bearer ${directorToken}` } }
  );
  assert(toggleOnRes.data.success, 'Toggle access ON failed');
  assert(toggleOnRes.data.candidate_access_enabled === 1, 'Candidate access not 1');

  // Employer calls candidate database
  const empPortalOn = await axios.get(`${BASE_URL}/employers/candidate-database`, {
    headers: { Authorization: `Bearer ${employerToken}` }
  });
  assert(empPortalOn.data.success, 'Employer candidate database query failed');
  assert.strictEqual(empPortalOn.data.access_enabled, true, 'Expected access_enabled to be true');
  assert(Array.isArray(empPortalOn.data.candidates), 'Expected candidates array');
  console.log(`✅ Employer Portal UNLOCKED: access_enabled = true (${empPortalOn.data.candidates.length} candidate profiles available)\n`);

  // 7. Test Staff Roles (Admin, BD, Recruiter)
  console.log('[Step 7] Testing Staff Roles: Creation and RBAC constraints...');
  const testBdEmail = `test.bd.${Date.now()}@vakancy.com`;
  const createBdRes = await axios.post(
    `${BASE_URL}/admin/team`,
    {
      name: 'Automated Test BD Agent',
      email: testBdEmail,
      password: 'password123',
      role: 'bd',
      phone: '+91 91122 33445'
    },
    { headers: { Authorization: `Bearer ${directorToken}` } }
  );
  assert(createBdRes.data.success, 'Creating BD member failed');
  const newBdUserId = createBdRes.data.user_id;
  console.log(`✅ Created BD staff account with role "bd" (ID: ${newBdUserId})`);

  // Authenticate as new BD user
  bdToken = jwt.sign(
    { id: newBdUserId, role: 'bd', email: testBdEmail },
    process.env.JWT_SECRET || 'vakancy_super_secret_jwt_key_2026_recruitment_portal',
    { expiresIn: '1h' }
  );

  // BD user can access leads
  const bdLeadsRes = await axios.get(`${BASE_URL}/admin/leads/queue`, {
    headers: { Authorization: `Bearer ${bdToken}` }
  });
  assert(bdLeadsRes.data.success, 'BD user should have access to leads queue');
  console.log('✅ BD user has access to BD Leads module');

  // BD user MUST BE BLOCKED from candidate data
  try {
    await axios.get(`${BASE_URL}/admin/candidates`, {
      headers: { Authorization: `Bearer ${bdToken}` }
    });
    assert.fail('BD role should NOT have access to candidates!');
  } catch (err) {
    assert.strictEqual(err.response?.status, 403, 'Expected 403 for BD accessing candidates');
    assert.strictEqual(err.response?.data?.code, 'PRIVACY_PROTECTION_ACCESS_DENIED', 'Expected code: PRIVACY_PROTECTION_ACCESS_DENIED');
    console.log('✅ BD role strictly blocked with 403 PRIVACY_PROTECTION_ACCESS_DENIED from candidate data');
  }

  // Cleanup test callback and BD user
  await db.query('DELETE FROM CALLBACK_REQUEST WHERE id = ?', [createdCallbackId]);
  await db.query('DELETE FROM RECRUITMENT_ACTIVITY WHERE entity_id = ?', [createdCallbackId]);
  await db.query('DELETE FROM NOTIFICATION WHERE reference_id = ?', [createdCallbackId]);
  await db.query('DELETE FROM USERS WHERE id = ?', [newBdUserId]);

  console.log('\n================================================================');
  console.log('🎉 ALL INTEGRATION TESTS PASSED PERFECTLY!');
  console.log('================================================================\n');

  process.exit(0);
}

runTests().catch(err => {
  console.error('\n❌ TEST SUITE FAILED:', err.response?.data || err.message);
  process.exit(1);
});
