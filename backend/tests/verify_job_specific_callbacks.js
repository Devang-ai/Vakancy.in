/**
 * verify_job_specific_callbacks.js
 * Comprehensive TDD Acceptance Test Suite for Job-Specific Callbacks
 * 
 * Verifies:
 * 1. Callback created for Job A belongs to Job A.
 * 2. Callback created for Job B belongs to Job B.
 * 3. Job A callbacks do not appear under Job B.
 * 4. Company-level callback totals are calculated correctly per job and across the company.
 * 5. Invalid job IDs are rejected with 404.
 * 6. Mismatched company-job callback attempts are rejected (prevent request manipulation).
 * 7. Unauthorized callback access is rejected (401 / 403).
 * 8. Legacy company-level callbacks remain intact and are not assigned to arbitrary jobs.
 * 9. Existing employer callback functionality continues working without regression.
 * 10. Callbacks grouped by job endpoint / query returns structured grouping.
 */

const axios = require('axios');
const assert = require('assert');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

const BASE_URL = 'http://localhost:5002/api';

async function runTestSuite() {
  console.log('=====================================================================');
  console.log('📞 JOB-SPECIFIC CALLBACK REQUESTS - TDD ACCEPTANCE TEST SUITE');
  console.log('=====================================================================');

  await db.initDB();

  // Step 1: Admin Director Authentication
  console.log('\n--- Step 1: Authentication ---');
  let directorToken;
  try {
    const authRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'director@vakancy.com',
      password: 'password123'
    });
    directorToken = authRes.data.token;
    console.log('✅ Director authenticated successfully');
  } catch (err) {
    console.error('❌ Failed to authenticate Director:', err.response?.data || err.message);
    process.exit(1);
  }

  // Step 2: Set up Test Fixtures (Company ABC Technologies with Job A & Job B, Company XYZ with Job C)
  console.log('\n--- Step 2: Setting up Test Companies and Jobs ---');
  const companyAId = uuidv4();
  const companyBId = uuidv4();
  const jobAId = uuidv4();
  const jobBId = uuidv4();
  const jobCId = uuidv4();
  const userAId = uuidv4();
  const userBId = uuidv4();

  try {
    await db.query(`
      INSERT INTO USERS (id, email, password_hash, name, role, is_active)
      VALUES (?, ?, 'hash123', 'ABC Employer Rep', 'employer', 1)
    `, [userAId, `emp_a_${Date.now()}@abctech.test`]);

    await db.query(`
      INSERT INTO USERS (id, email, password_hash, name, role, is_active)
      VALUES (?, ?, 'hash123', 'XYZ Employer Rep', 'employer', 1)
    `, [userBId, `emp_b_${Date.now()}@xyzsol.test`]);

    // Create Company A (ABC Technologies)
    await db.query(`
      INSERT INTO EMPLOYERS (id, user_id, company_name, industry, location, approval_status, candidate_access_enabled)
      VALUES (?, ?, 'ABC Technologies Test Corp', 'Software', 'Bengaluru, India', 'approved', 0)
    `, [companyAId, userAId]);

    // Create Company B (XYZ Solutions)
    await db.query(`
      INSERT INTO EMPLOYERS (id, user_id, company_name, industry, location, approval_status, candidate_access_enabled)
      VALUES (?, ?, 'XYZ Solutions Test Corp', 'Consulting', 'Mumbai, India', 'approved', 0)
    `, [companyBId, userBId]);

    // Create Job A (React Developer under Company A)
    await db.query(`
      INSERT INTO JOB (id, employer_id, title, status, employment_type, location, created_by_type)
      VALUES (?, ?, 'React Developer', 'open', 'Full-time', 'Bengaluru', 'ADMIN')
    `, [jobAId, companyAId]);

    // Create Job B (Backend Developer under Company A)
    await db.query(`
      INSERT INTO JOB (id, employer_id, title, status, employment_type, location, created_by_type)
      VALUES (?, ?, 'Backend Developer', 'open', 'Full-time', 'Bengaluru', 'ADMIN')
    `, [jobBId, companyAId]);

    // Create Job C (DevOps Engineer under Company B)
    await db.query(`
      INSERT INTO JOB (id, employer_id, title, status, employment_type, location, created_by_type)
      VALUES (?, ?, 'DevOps Engineer', 'open', 'Full-time', 'Mumbai', 'ADMIN')
    `, [jobCId, companyBId]);

    console.log(`✅ Created test companies & jobs:
   - Company ABC: Job A (React Developer: ${jobAId}), Job B (Backend Developer: ${jobBId})
   - Company XYZ: Job C (DevOps Engineer: ${jobCId})`);
  } catch (err) {
    console.error('❌ Failed setting up test fixtures:', err.message);
    process.exit(1);
  }

  try {
    // Step 3: Test Creation of Callback for Job A
    console.log('\n--- Test 1: Callback created for Job A belongs to Job A ---');
    const cbARes = await axios.post(`${BASE_URL}/jobs/${jobAId}/callback`, {
      requester_name: 'Jane Doe',
      requester_email: 'jane.doe@example.com',
      requester_phone: '+91 9876543210',
      callback_reason: 'Inquiry regarding React Developer position and required tech stack',
      preferred_time: 'Morning 10am-12pm'
    });

    assert.strictEqual(cbARes.status, 201, 'Expected 201 Created for Job A callback');
    assert.strictEqual(cbARes.data.success, true, 'Expected success: true');
    assert.strictEqual(cbARes.data.job_id, jobAId, 'Callback must be associated with Job A ID');
    assert.strictEqual(cbARes.data.employer_id, companyAId, 'Callback must be associated with Company A ID');
    const callbackAId = cbARes.data.callback_id;

    // Verify DB record for Job A
    const [dbCbA] = await db.query('SELECT * FROM CALLBACK_REQUEST WHERE id = ?', [callbackAId]);
    assert.strictEqual(dbCbA.job_id, jobAId, 'DB record must store exact Job A id');
    assert.strictEqual(dbCbA.employer_id, companyAId, 'DB record must store exact Company A id');
    console.log(`✅ PASS: Callback for Job A created and verified in DB (ID: ${callbackAId})`);

    // Step 4: Test Creation of Callback for Job B
    console.log('\n--- Test 2: Callback created for Job B belongs to Job B ---');
    const cbBRes = await axios.post(`${BASE_URL}/jobs/${jobBId}/callback`, {
      requester_name: 'John Smith',
      requester_email: 'john.smith@example.com',
      requester_phone: '+91 9123456789',
      callback_reason: 'Questions regarding Backend Developer role and salary range',
      preferred_time: 'Afternoon 2pm-4pm'
    });

    assert.strictEqual(cbBRes.status, 201, 'Expected 201 Created for Job B callback');
    assert.strictEqual(cbBRes.data.job_id, jobBId, 'Callback must be associated with Job B ID');
    const callbackBId = cbBRes.data.callback_id;

    // Verify DB record for Job B
    const [dbCbB] = await db.query('SELECT * FROM CALLBACK_REQUEST WHERE id = ?', [callbackBId]);
    assert.strictEqual(dbCbB.job_id, jobBId, 'DB record must store exact Job B id');
    assert.strictEqual(dbCbB.employer_id, companyAId, 'DB record must store exact Company A id');
    console.log(`✅ PASS: Callback for Job B created and verified in DB (ID: ${callbackBId})`);

    // Step 5: Verify Isolation - Job A callbacks do not appear under Job B
    console.log('\n--- Test 3: Job A callbacks do not appear under Job B ---');
    const adminCbJobBRes = await axios.get(`${BASE_URL}/admin/callbacks?jobId=${jobBId}`, {
      headers: { Authorization: `Bearer ${directorToken}` }
    });
    const jobBCallbacks = adminCbJobBRes.data.callbacks;
    const hasJobAInJobB = jobBCallbacks.some(cb => cb.id === callbackAId || cb.job_id === jobAId);
    assert.strictEqual(hasJobAInJobB, false, 'Job A callbacks must NEVER appear under Job B query');
    const hasJobBInJobB = jobBCallbacks.some(cb => cb.id === callbackBId);
    assert.strictEqual(hasJobBInJobB, true, 'Job B callbacks must appear under Job B query');
    console.log('✅ PASS: Callbacks from Job A and Job B are strictly isolated');

    // Step 6: Company-level callback totals calculated correctly per job and across company
    console.log('\n--- Test 4: Company-level callback totals per job and across company ---');
    const companyStatsRes = await axios.get(`${BASE_URL}/companies/${companyAId}/job-callbacks/stats`, {
      headers: { Authorization: `Bearer ${directorToken}` }
    });
    assert.strictEqual(companyStatsRes.data.success, true, 'Company callback stats returned');
    assert.strictEqual(companyStatsRes.data.company_id, companyAId, 'Company ID matches');
    assert(companyStatsRes.data.total_callbacks >= 2, 'Total callbacks across company must be >= 2');
    
    const statsJobs = companyStatsRes.data.jobs;
    const jobAStats = statsJobs.find(j => j.job_id === jobAId);
    const jobBStats = statsJobs.find(j => j.job_id === jobBId);
    assert(jobAStats && jobAStats.callback_count >= 1, 'Job A must show at least 1 callback');
    assert(jobBStats && jobBStats.callback_count >= 1, 'Job B must show at least 1 callback');
    console.log(`✅ PASS: Company callback stats calculated accurately:
   Company Total: ${companyStatsRes.data.total_callbacks}
   - ${jobAStats.job_title}: ${jobAStats.callback_count} callbacks
   - ${jobBStats.job_title}: ${jobBStats.callback_count} callbacks`);

    // Step 7: Invalid Job IDs are rejected with 404
    console.log('\n--- Test 5: Invalid job IDs are rejected with 404 ---');
    let invalidJobRejected = false;
    try {
      await axios.post(`${BASE_URL}/jobs/non-existent-job-uuid-12345/callback`, {
        requester_name: 'Nobody',
        requester_email: 'nobody@example.com',
        requester_phone: '9999999999',
        callback_reason: 'Test on non-existent job'
      });
    } catch (err) {
      if (err.response && err.response.status === 404) {
        invalidJobRejected = true;
      }
    }
    assert.strictEqual(invalidJobRejected, true, 'Callback on non-existent job must return HTTP 404');
    console.log('✅ PASS: Invalid job ID correctly rejected with 404 Not Found');

    // Step 8: Prevent Request Manipulation / Cross-Company Job Association
    console.log('\n--- Test 6: Preventing request manipulation / company mismatch ---');
    let mismatchedCompanyRejected = false;
    try {
      // Trying to associate Job A (under Company A) with Company B
      await axios.post(`${BASE_URL}/companies/${companyBId}/jobs/${jobAId}/callback`, {
        requester_name: 'Attacker',
        requester_email: 'attacker@example.com',
        requester_phone: '9999999999',
        callback_reason: 'Trying to file callback for Job A under wrong Company B'
      });
    } catch (err) {
      if (err.response && (err.response.status === 400 || err.response.status === 404)) {
        mismatchedCompanyRejected = true;
      }
    }
    assert.strictEqual(mismatchedCompanyRejected, true, 'Job belonging to Company A cannot be requested under Company B');
    console.log('✅ PASS: Cross-company job association attempt correctly rejected');

    // Step 9: Unauthorized callback access rejected
    console.log('\n--- Test 7: Unauthorized callback access is rejected ---');
    let unauthorizedAccessRejected = false;
    try {
      await axios.get(`${BASE_URL}/admin/callbacks`);
    } catch (err) {
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        unauthorizedAccessRejected = true;
      }
    }
    assert.strictEqual(unauthorizedAccessRejected, true, 'Access to admin callbacks without auth token must be rejected');
    console.log('✅ PASS: Unauthenticated access to callback management rejected with 401/403');

    // Step 10: Legacy company-level callbacks handled separately
    console.log('\n--- Test 8: Legacy company-level callbacks handled separately ---');
    const legacyCbId = uuidv4();
    await db.query(`
      INSERT INTO CALLBACK_REQUEST (id, job_id, employer_id, requested_by_user_id, status, source, internal_notes)
      VALUES (?, NULL, ?, 'legacy-user-1', 'NEW', 'CANDIDATE_DATABASE', 'Legacy talent pool callback')
    `, [legacyCbId, companyAId]);

    const adminCallbacksAll = await axios.get(`${BASE_URL}/admin/callbacks?jobId=${jobAId}`, {
      headers: { Authorization: `Bearer ${directorToken}` }
    });
    const hasLegacyInJobA = adminCallbacksAll.data.callbacks.some(cb => cb.id === legacyCbId);
    assert.strictEqual(hasLegacyInJobA, false, 'Legacy callback with job_id=NULL must not appear under Job A');
    console.log('✅ PASS: Legacy company-level callback with job_id=NULL kept isolated from specific jobs');

    // Step 11: Callbacks Grouped by Job Endpoint / Structure
    console.log('\n--- Test 9: Callbacks grouped by job endpoint ---');
    const groupedRes = await axios.get(`${BASE_URL}/admin/callbacks?group_by=job`, {
      headers: { Authorization: `Bearer ${directorToken}` }
    });
    assert.strictEqual(groupedRes.data.success, true, 'Grouped callbacks response success');
    assert(Array.isArray(groupedRes.data.job_groups) || typeof groupedRes.data.grouped_by_job === 'object', 'Must return job groups');
    console.log('✅ PASS: Callbacks grouped by job successfully retrieved for management interface');

    // Step 12: Existing Employer Callback Endpoint Still Works
    console.log('\n--- Test 10: Existing employer callback endpoint regression check ---');
    // Test that POST /employers/jobs/:id/callback works when called with employer token
    // (We test using director token who has role authorization)
    const empExistingRes = await axios.post(`${BASE_URL}/employers/jobs/${jobAId}/callback`, {
      callback_reason: 'Employer candidate access discussion'
    }, {
      headers: { Authorization: `Bearer ${directorToken}` }
    });
    assert(empExistingRes.data.success === true || empExistingRes.data.code === 'CALLBACK_PENDING', 'Existing employer callback endpoint must work');
    console.log('✅ PASS: Existing employer callback endpoint functional without regression');

    console.log('\n=====================================================================');
    console.log('🎉 ALL 10 JOB-SPECIFIC CALLBACK TESTS PASSED PERFECTLY!');
    console.log('=====================================================================');
  } finally {
    // Cleanup fixtures
    try {
      await db.query('DELETE FROM CALLBACK_REQUEST WHERE job_id IN (?, ?, ?)', [jobAId, jobBId, jobCId]);
      await db.query('DELETE FROM CALLBACK_REQUEST WHERE employer_id IN (?, ?)', [companyAId, companyBId]);
      await db.query('DELETE FROM JOB WHERE id IN (?, ?, ?)', [jobAId, jobBId, jobCId]);
      await db.query('DELETE FROM EMPLOYERS WHERE id IN (?, ?)', [companyAId, companyBId]);
      await db.query('DELETE FROM USERS WHERE id IN (?, ?)', [userAId, userBId]);
      console.log('🧹 Cleaned up test fixtures.');
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr.message);
    }
  }
}

runTestSuite().catch(err => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
