const http = require('http');
const db = require('../config/db');

async function runTests() {
  console.log('====================================================');
  console.log('🔍 RUNNING VAKANCY GOOGLE AUTH & SECURITY TEST SUITE');
  console.log('====================================================');

  await db.initDB();

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  // Helper fetch function
  async function postJson(path, body) {
    const res = await fetch(`http://localhost:5002${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }

  // TEST 1: Database Schema Verification
  console.log('\n--- 1. Database Schema & Migration Verification ---');
  try {
    const columns = await db.query('DESCRIBE USERS');
    const colMap = {};
    columns.forEach(c => colMap[c.Field] = c);

    assert(colMap.google_id !== undefined, 'USERS table has google_id column');
    assert(colMap.google_id?.Key === 'UNI', 'google_id column has UNIQUE key constraint');
    assert(colMap.auth_provider !== undefined, 'USERS table has auth_provider column');
    assert(colMap.auth_provider?.Default === 'local', 'auth_provider defaults to "local"');
    assert(colMap.password_hash?.Null === 'YES', 'password_hash is nullable (supports Google-only accounts)');
    assert(colMap.google_email !== undefined, 'USERS table has google_email column');
    assert(colMap.avatar_url !== undefined, 'USERS table has avatar_url column');
  } catch (err) {
    assert(false, `Database schema query failed: ${err.message}`);
  }

  // TEST 2: Missing Credential Rejection
  console.log('\n--- 2. Missing Google Credential Rejection ---');
  try {
    const res = await postJson('/api/auth/google', { role: 'candidate' });
    assert(res.status === 400, `Returns 400 Bad Request on missing credential (got ${res.status})`);
    assert(res.data.code === 'MISSING_CREDENTIAL', `Returns error code MISSING_CREDENTIAL (got ${res.data.code})`);
  } catch (err) {
    assert(false, `Missing credential test failed: ${err.message}`);
  }

  // TEST 3: Invalid / Forged Google Token Rejection
  console.log('\n--- 3. Invalid / Forged Google Token Rejection ---');
  try {
    const res = await postJson('/api/auth/google', { credential: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature', role: 'candidate' });
    assert(res.status === 401, `Returns 401 Unauthorized on forged/invalid token (got ${res.status})`);
    assert(res.data.code === 'INVALID_GOOGLE_TOKEN', `Returns error code INVALID_GOOGLE_TOKEN (got ${res.data.code})`);
  } catch (err) {
    assert(false, `Invalid token test failed: ${err.message}`);
  }

  // TEST 4: Privileged Role Escalation Prevention
  console.log('\n--- 4. Privileged Role Escalation Prevention ---');
  try {
    // Check that admin / director role requests are rejected by controller
    const { normalizePortalRole } = require('../controllers/authController');
    let threwAdmin = false;
    try {
      normalizePortalRole('admin');
    } catch (e) {
      threwAdmin = e.code === 'PRIVILEGED_ROLE_FORBIDDEN';
    }
    assert(threwAdmin, 'normalizePortalRole rejects "admin" role with PRIVILEGED_ROLE_FORBIDDEN');

    let threwDirector = false;
    try {
      normalizePortalRole('director');
    } catch (e) {
      threwDirector = e.code === 'PRIVILEGED_ROLE_FORBIDDEN';
    }
    assert(threwDirector, 'normalizePortalRole rejects "director" role with PRIVILEGED_ROLE_FORBIDDEN');
    assert(normalizePortalRole('candidate') === 'candidate', 'Allows candidate role');
    assert(normalizePortalRole('employer') === 'employer', 'Allows employer role');
  } catch (err) {
    assert(false, `Role escalation test failed: ${err.message}`);
  }

  // TEST 5: Existing Email/Password Authentication Unbroken
  console.log('\n--- 5. Existing Email/Password Login Preserved ---');
  const testCandidateEmail = `test.candidate.qa.${Date.now()}@example.com`;
  const testPassword = 'Password123!Safe';

  try {
    // 5.1 Register a new candidate using the existing registration API
    const regRes = await postJson('/api/auth/register', {
      name: 'QA Test Candidate',
      email: testCandidateCandidateEmail = testCandidateEmail,
      phone: '9876543210',
      password: testPassword,
      role: 'candidate'
    });
    assert(regRes.status === 201 && regRes.data.success, 'Standard candidate registration succeeds (201)');

    // 5.2 Attempt login with the newly created candidate account
    const res = await postJson('/api/auth/login', {
      identifier: testCandidateEmail,
      password: testPassword,
      role: 'candidate'
    });
    assert(res.status === 200, `Existing password login returns 200 OK (got ${res.status})`);
    assert(res.data.success === true, 'Existing password login returns success: true');
    assert(!!res.data.token, 'Existing password login returns valid JWT token');
    assert(res.data.user?.email === testCandidateEmail, 'Returns user data with matching email');
  } catch (err) {
    assert(false, `Password login preservation test failed: ${err.message}`);
  }

  // TEST 6: Anti-Account Takeover / Linking Security Verification
  console.log('\n--- 6. Anti-Account Takeover Protection Verification ---');
  try {
    // Test link endpoint with incorrect password
    const res = await postJson('/api/auth/google/link', {
      credential: 'fake-token',
      password: 'wrongpassword'
    });
    // It should reject either token verification or password check
    assert(res.status === 401, `Rejects unauthorized link attempt with 401 (got ${res.status})`);
    assert(['INVALID_GOOGLE_TOKEN', 'INVALID_CREDENTIALS'].includes(res.data.code), `Returns secure rejection code (got ${res.data.code})`);
  } catch (err) {
    assert(false, `Anti-takeover test failed: ${err.message}`);
  }

  // TEST 7: Role Isolation / Portal Conflict Protection
  console.log('\n--- 7. Portal Role Conflict Isolation ---');
  try {
    // Logging into Employer portal using candidate account
    const res = await postJson('/api/auth/login', {
      identifier: testCandidateEmail,
      password: testPassword,
      role: 'employer'
    });
    assert(res.status === 403, `Returns 403 Forbidden on portal mismatch (got ${res.status})`);
    assert(res.data.code === 'ACCOUNT_ROLE_CONFLICT', `Returns code ACCOUNT_ROLE_CONFLICT (got ${res.data.code})`);
  } catch (err) {
    assert(false, `Role isolation test failed: ${err.message}`);
  }

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
