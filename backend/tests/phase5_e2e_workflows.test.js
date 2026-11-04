const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const db = require('../config/db');
const { app } = require('../server');
const cryptoUtils = require('../utils/cryptoUtils');

let server;
let baseUrl;

// Helper to make HTTP requests
function httpRequest(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`);
    const reqOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const req = http.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (_) {
          json = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

test.before(async () => {
  // Ensure isolated test configuration is active
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_TEST_MODE = 'isolated-mysql';
  process.env.TEST_DB_HOST = process.env.TEST_DB_HOST || '127.0.0.1';
  process.env.TEST_DB_PORT = process.env.TEST_DB_PORT || '3306';
  process.env.TEST_DB_USER = process.env.TEST_DB_USER || 'vakancy_tester';
  process.env.TEST_DB_PASSWORD = process.env.TEST_DB_PASSWORD;
  process.env.TEST_DB_NAME = process.env.TEST_DB_NAME || 'vakancy_test_phase5';
  process.env.TEST_DB_RESET_ACK = 'I_UNDERSTAND_THIS_DATABASE_IS_DISPOSABLE';

  await db.initDB();

  // Start HTTP server on dynamic port
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  if (server) {
    await new Promise(resolve => server.close(resolve));
  }
  await db.closeDB();
});

// -------------------------------------------------------------
// Step 6 E2E: Candidate Journey
// -------------------------------------------------------------
test('Step 6 E2E — Candidate Journey: login, browse jobs, submit application, duplicate prevention, dashboard', async () => {
  const candUserId = 'usr-e2e-cand-' + uuidv4().slice(0, 8);
  const candProfileId = 'cand-e2e-' + uuidv4().slice(0, 8);
  const email = `${candUserId}@test.vakancy.in`;
  const password = 'Password@123';
  const pwHash = await bcrypt.hash(password, 8);

  const empUserId = 'usr-e2e-emp-' + uuidv4().slice(0, 8);
  const empProfileId = 'emp-e2e-' + uuidv4().slice(0, 8);
  const jobId = 'job-e2e-' + uuidv4().slice(0, 8);

  // Setup synthetic records
  await db.query('INSERT INTO USERS (id, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, 1)',
    [candUserId, email, pwHash, 'candidate']);
  await db.query('INSERT INTO CANDIDATES (id, user_id, name, current_location) VALUES (?, ?, ?, ?)',
    [candProfileId, candUserId, 'E2E Test Candidate', 'Bangalore']);

  await db.query('INSERT INTO USERS (id, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, 1)',
    [empUserId, `${empUserId}@test.vakancy.in`, pwHash, 'employer']);
  await db.query('INSERT INTO EMPLOYERS (id, user_id, company_name, approval_status) VALUES (?, ?, ?, ?)',
    [empProfileId, empUserId, 'E2E Corp', 'approved']);

  await db.query(`
    INSERT INTO JOB (id, employer_id, title, description, location, status, is_archived)
    VALUES (?, ?, 'Lead Cloud Architect', 'Enterprise cloud architect mandate', 'Bangalore', 'open', 0)
  `, [jobId, empProfileId]);

  // 1. Candidate Login
  const loginRes = await httpRequest('/api/auth/login', {
    method: 'POST',
    body: { email, password }
  });
  assert.equal(loginRes.status, 200);
  assert.equal(loginRes.data.success, true);
  const candidateToken = loginRes.data.token;
  assert.ok(candidateToken, 'Candidate JWT token must be returned');

  // 2. Candidate Job Browsing
  const jobsRes = await httpRequest('/api/jobs', {
    headers: { Authorization: `Bearer ${candidateToken}` }
  });
  assert.equal(jobsRes.status, 200);
  assert.ok(Array.isArray(jobsRes.data.jobs));
  const foundJob = jobsRes.data.jobs.find(j => j.id === jobId);
  assert.ok(foundJob, 'Target job must be visible in open jobs list');

  // 3. Application Submission
  const applyRes = await httpRequest('/api/applications/apply', {
    method: 'POST',
    headers: { Authorization: `Bearer ${candidateToken}` },
    body: { job_id: jobId }
  });
  assert.equal(applyRes.status, 201);
  assert.equal(applyRes.data.success, true);

  // 4. Duplicate Application Prevention
  const dupRes = await httpRequest('/api/applications/apply', {
    method: 'POST',
    headers: { Authorization: `Bearer ${candidateToken}` },
    body: { job_id: jobId }
  });
  assert.equal(dupRes.status, 400);
  assert.match(dupRes.data.message, /already applied/i);

  // 5. Candidate Dashboard Applications
  const myAppsRes = await httpRequest('/api/applications/my-applications', {
    headers: { Authorization: `Bearer ${candidateToken}` }
  });
  assert.equal(myAppsRes.status, 200);
  assert.equal(myAppsRes.data.success, true);
  assert.ok(myAppsRes.data.applications.some(a => a.job_id === jobId));

  // Clean up
  await db.query('DELETE FROM APPLICATION WHERE job_id = ?', [jobId]);
  await db.query('DELETE FROM JOB WHERE id = ?', [jobId]);
  await db.query('DELETE FROM EMPLOYERS WHERE id = ?', [empProfileId]);
  await db.query('DELETE FROM CANDIDATES WHERE id = ?', [candProfileId]);
  await db.query('DELETE FROM USERS WHERE id IN (?, ?)', [candUserId, empUserId]);
});

// -------------------------------------------------------------
// Step 6 E2E: Admin / Recruiter & ATS Journey
// -------------------------------------------------------------
test('Step 6 E2E — Admin Journey: Director login, ATS stage updates, candidate sharing approval & access verification', async () => {
  const directorId = 'usr-e2e-dir-' + uuidv4().slice(0, 8);
  const email = `${directorId}@test.vakancy.in`;
  const password = 'Password@123';
  const pwHash = await bcrypt.hash(password, 8);

  const candUserId = 'usr-e2e-cand2-' + uuidv4().slice(0, 8);
  const candProfileId = 'cand-e2e-2-' + uuidv4().slice(0, 8);
  const jobId = 'job-e2e-2-' + uuidv4().slice(0, 8);
  const pipId = 'pip-e2e-2-' + uuidv4().slice(0, 8);

  await db.query('INSERT INTO USERS (id, email, password_hash, role, is_main_admin, is_active) VALUES (?, ?, ?, ?, 1, 1)',
    [directorId, email, pwHash, 'director']);
  await db.query('INSERT INTO USERS (id, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, 1)',
    [candUserId, `${candUserId}@test.vakancy.in`, pwHash, 'candidate']);
  await db.query('INSERT INTO CANDIDATES (id, user_id, name) VALUES (?, ?, ?)',
    [candProfileId, candUserId, 'ATS Candidate']);
  await db.query('INSERT INTO JOB (id, title, status) VALUES (?, ?, ?)',
    [jobId, 'Full Stack Engineer', 'open']);

  // Insert ATS Stages
  const stageApplied = 'stage-app-' + uuidv4().slice(0, 6);
  const stageShortlisted = 'stage-shl-' + uuidv4().slice(0, 6);
  await db.query('INSERT INTO ATS_STAGE (id, name, `order`, is_active) VALUES (?, ?, 1, 1)', [stageApplied, 'Applied']);
  await db.query('INSERT INTO ATS_STAGE (id, name, `order`, is_active) VALUES (?, ?, 2, 1)', [stageShortlisted, 'Shortlisted']);

  await db.query('INSERT INTO CANDIDATE_PIPELINE (id, candidate_id, job_id, stage_id, recruiter_id) VALUES (?, ?, ?, ?, ?)',
    [pipId, candProfileId, jobId, stageApplied, directorId]);

  // 1. Director Login
  const loginRes = await httpRequest('/api/auth/login', {
    method: 'POST',
    body: { email, password }
  });
  assert.equal(loginRes.status, 200);
  const dirToken = loginRes.data.token;

  // 2. ATS Pipeline Movement
  const moveRes = await httpRequest('/api/ats/pipeline/move', {
    method: 'POST',
    headers: { Authorization: `Bearer ${dirToken}` },
    body: {
      pipeline_id: pipId,
      to_stage_id: stageShortlisted,
      remarks: 'Candidate passed initial technical screen'
    }
  });
  assert.equal(moveRes.status, 200);
  assert.equal(moveRes.data.success, true);

  // Verify DB state
  const [pipCheck] = await db.query('SELECT stage_id FROM CANDIDATE_PIPELINE WHERE id = ?', [pipId]);
  assert.equal(pipCheck.stage_id, stageShortlisted);

  const [historyCheck] = await db.query('SELECT from_stage_id, to_stage_id FROM PIPELINE_STAGE_HISTORY WHERE pipeline_id = ?', [pipId]);
  assert.equal(historyCheck.from_stage_id, stageApplied);
  assert.equal(historyCheck.to_stage_id, stageShortlisted);

  // 3. Candidate Sharing: Propose & Approve with Consent
  const shareId = 'share-e2e-' + uuidv4().slice(0, 8);
  const shareToken = require('crypto').randomBytes(32).toString('hex');

  await db.query(`
    INSERT INTO CANDIDATE_SHARING (id, candidate_id, job_id, share_token, status, candidate_consent, proposed_by_user_id)
    VALUES (?, ?, ?, ?, 'PROPOSED', 1, ?)
  `, [shareId, candProfileId, jobId, shareToken, directorId]);

  const approveRes = await httpRequest(`/api/admin/candidate-shares/${shareId}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${dirToken}` }
  });
  assert.equal(approveRes.status, 200);
  assert.equal(approveRes.data.success, true);
  assert.ok(approveRes.data.access_code, 'Approval must return generated access code');
  const accessCode = approveRes.data.access_code;

  // 4. Verify Accessing Candidate Share via Access Code
  const accessRes = await httpRequest(`/api/admin/shared-profile/${shareToken}`, {
    method: 'GET',
    headers: { 'x-access-code': accessCode }
  });
  assert.equal(accessRes.status, 200);
  assert.equal(accessRes.data.success, true);
  assert.equal(accessRes.data.profile.name, 'ATS Candidate');

  // Clean up
  await db.query('DELETE FROM CANDIDATE_SHARE_ACCESS_LOG WHERE share_id = ?', [shareId]);
  await db.query('DELETE FROM CANDIDATE_SHARING WHERE id = ?', [shareId]);
  await db.query('DELETE FROM PIPELINE_STAGE_HISTORY WHERE pipeline_id = ?', [pipId]);
  await db.query('DELETE FROM CANDIDATE_PIPELINE WHERE id = ?', [pipId]);
  await db.query('DELETE FROM ATS_STAGE WHERE id IN (?, ?)', [stageApplied, stageShortlisted]);
  await db.query('DELETE FROM JOB WHERE id = ?', [jobId]);
  await db.query('DELETE FROM CANDIDATES WHERE id = ?', [candProfileId]);
  await db.query('DELETE FROM USERS WHERE id IN (?, ?)', [directorId, candUserId]);
});

// -------------------------------------------------------------
// Step 6 E2E: Employer Journey & Cross-User Security
// -------------------------------------------------------------
test('Step 6 E2E — Employer Journey: callback request, applicant isolation, and unauthorized cross-access denial', async () => {
  const empAUserId = 'usr-e2e-empa-' + uuidv4().slice(0, 8);
  const empAProfileId = 'emp-e2e-a-' + uuidv4().slice(0, 8);
  const jobAId = 'job-e2e-a-' + uuidv4().slice(0, 8);

  const empBUserId = 'usr-e2e-empb-' + uuidv4().slice(0, 8);
  const empBProfileId = 'emp-e2e-b-' + uuidv4().slice(0, 8);
  const jobBId = 'job-e2e-b-' + uuidv4().slice(0, 8);

  const password = 'Password@123';
  const pwHash = await bcrypt.hash(password, 8);

  await db.query('INSERT INTO USERS (id, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, 1)',
    [empAUserId, `${empAUserId}@test.vakancy.in`, pwHash, 'employer']);
  await db.query('INSERT INTO EMPLOYERS (id, user_id, company_name, approval_status) VALUES (?, ?, ?, ?)',
    [empAProfileId, empAUserId, 'Company Alpha', 'approved']);
  await db.query('INSERT INTO JOB (id, employer_id, title, status) VALUES (?, ?, ?, ?)',
    [jobAId, empAProfileId, 'Alpha Job', 'open']);

  await db.query('INSERT INTO USERS (id, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, 1)',
    [empBUserId, `${empBUserId}@test.vakancy.in`, pwHash, 'employer']);
  await db.query('INSERT INTO EMPLOYERS (id, user_id, company_name, approval_status) VALUES (?, ?, ?, ?)',
    [empBProfileId, empBUserId, 'Company Beta', 'approved']);
  await db.query('INSERT INTO JOB (id, employer_id, title, status) VALUES (?, ?, ?, ?)',
    [jobBId, empBProfileId, 'Beta Job', 'open']);

  // 1. Employer A logs in
  const loginARes = await httpRequest('/api/auth/login', {
    method: 'POST',
    body: { email: `${empAUserId}@test.vakancy.in`, password }
  });
  assert.equal(loginARes.status, 200);
  const empAToken = loginARes.data.token;

  // 2. Employer A requests callback for Job A
  const cbRes = await httpRequest(`/api/employer/jobs/${jobAId}/callback`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${empAToken}` },
    body: {
      reason: 'Candidate access is disabled, request recruiter callback',
      contact_phone: '+91 99999 11111'
    }
  });
  assert.equal(cbRes.status, 201);
  assert.equal(cbRes.data.success, true);
  const callbackId = cbRes.data.callback_id;
  assert.ok(callbackId);

  // 3. Security: Employer A cannot request callback for Job B
  const crossCbRes = await httpRequest(`/api/employer/jobs/${jobBId}/callback`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${empAToken}` },
    body: { reason: 'Unauthorized attempt' }
  });
  assert.equal(crossCbRes.status, 403);
  assert.match(crossCbRes.data.message, /Access denied/i);

  // 4. Security: Employer A cannot view applicants of Job B
  const crossAppRes = await httpRequest(`/api/applications/job/${jobBId}`, {
    headers: { Authorization: `Bearer ${empAToken}` }
  });
  assert.equal(crossAppRes.status, 403);
  assert.match(crossAppRes.data.message, /Access denied/i);

  // 5. Payment Routes remain failed-closed
  const payRes = await httpRequest('/api/payments/create-order', {
    method: 'POST',
    headers: { Authorization: `Bearer ${empAToken}` },
    body: { plan_id: 'plan-test' }
  });
  assert.equal(payRes.status, 503);
  assert.equal(payRes.data.code, 'PAYMENTS_UNAVAILABLE');

  // Clean up
  await db.query('DELETE FROM RECRUITMENT_ACTIVITY WHERE related_job_id IN (?, ?)', [jobAId, jobBId]);
  await db.query('DELETE FROM CALLBACK_REQUEST WHERE job_id IN (?, ?)', [jobAId, jobBId]);
  await db.query('DELETE FROM JOB WHERE id IN (?, ?)', [jobAId, jobBId]);
  await db.query('DELETE FROM EMPLOYERS WHERE id IN (?, ?)', [empAProfileId, empBProfileId]);
  await db.query('DELETE FROM USERS WHERE id IN (?, ?)', [empAUserId, empBUserId]);
});
