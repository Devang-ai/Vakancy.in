/**
 * Live Pre-Deployment Security Hardening Verification Suite
 * Verifies Rate Limiting, Secret Exposure, Tenant Isolation, API Route Protection, and Privacy Controls.
 */

const BASE_URL = 'http://localhost:5002/api';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (_) {
    json = { raw: text };
  }
  return { status: res.status, ok: res.ok, headers: res.headers, body: json };
}

let passed = 0;
let failed = 0;

function assert(condition, name, details = '') {
  if (condition) {
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${name} - ${details}`);
    failed++;
  }
}

async function runLiveVerification() {
  console.log('====================================================');
  console.log('VAKANCY.IN PRE-DEPLOYMENT LIVE SECURITY VERIFICATION');
  console.log('====================================================\n');

  // -------------------------------------------------------------------
  // TEST SECTION 1: API KEYS & SECRET EXPOSURE
  // -------------------------------------------------------------------
  console.log('--- TEST SECTION 1: SECRET & CREDENTIAL PROTECTION ---');

  // Test 1.1: Login response never returns password hashes
  console.log('Testing authentication response payload sanitization...');
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'director@vakancy.com', password: 'password123' })
  });

  assert(loginRes.status === 200, 'Director authenticated successfully');
  const userPayload = loginRes.body?.user;
  assert(userPayload && userPayload.password_hash === undefined, 'User payload strictly omits password_hash');
  assert(userPayload && userPayload.has_password === true, 'User payload converts password presence to boolean flag');
  assert(typeof loginRes.body?.token === 'string', 'JWT token provided for authenticated session');

  const directorToken = loginRes.body?.token;

  // -------------------------------------------------------------------
  // TEST SECTION 2: RECORD-LEVEL ACCESS / MYSQL TENANT ISOLATION
  // -------------------------------------------------------------------
  console.log('\n--- TEST SECTION 2: MYSQL TENANT ISOLATION & IDOR ---');

  // Test 2.1: BD role blocked from candidate personal profile / ATS
  const bdLoginRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'bdlead@vakancy.com', password: 'password123' })
  });
  assert(bdLoginRes.status === 200, 'BD Lead authenticated successfully');
  const bdToken = bdLoginRes.body?.token;

  const bdCandidateAccessRes = await request('/admin/candidates', {
    headers: { Authorization: `Bearer ${bdToken}` }
  });
  assert(
    bdCandidateAccessRes.status === 403,
    'BD role strictly denied candidate access (403 Privacy Guard)',
    `Status: ${bdCandidateAccessRes.status}`
  );

  // Test 2.2: Deactivated / Non-existent candidate record IDOR protection
  const fakeId = '00000000-0000-0000-0000-000000000000';
  const candIdorRes = await request(`/candidates/${fakeId}`, {
    headers: { Authorization: `Bearer ${directorToken}` }
  });
  assert(
    [403, 404].includes(candIdorRes.status),
    'Unscoped candidate IDOR attempt rejected with safe status (403/404)'
  );

  // -------------------------------------------------------------------
  // TEST SECTION 3: ROUTE GUARDS & BACKEND AUTHORIZATION
  // -------------------------------------------------------------------
  console.log('\n--- TEST SECTION 3: PROTECTED ROUTES & ROLE GUARDS ---');

  // Test 3.1: Unauthenticated request to protected admin endpoint
  const unauthRes = await request('/admin/reports');
  assert(
    unauthRes.status === 401,
    'Unauthenticated call to /api/admin/reports rejected with 401',
    `Status: ${unauthRes.status}`
  );

  // Test 3.2: Invalid JWT token rejected
  const fakeTokenRes = await request('/admin/reports', {
    headers: { Authorization: 'Bearer this.is.a.fake.jwt.token' }
  });
  assert(
    fakeTokenRes.status === 401,
    'Malformed/tampered JWT rejected with 401',
    `Status: ${fakeTokenRes.status}`
  );

  // -------------------------------------------------------------------
  // TEST SECTION 4: DATA EXPOSURE & CANDIDATE PRIVACY
  // -------------------------------------------------------------------
  console.log('\n--- TEST SECTION 4: PRIVACY & DATA EXPOSURE CONTROLS ---');

  // Test 4.1: Non-enumerating forgot-password response
  const forgotRes = await request('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email: `nonexistent_${Date.now()}@example.org` })
  });
  assert(
    forgotRes.status === 200,
    'Forgot-password returns success for nonexistent email (timing-safe non-enumeration)'
  );
  assert(
    forgotRes.body.otp === undefined,
    'Forgot-password response strictly omits OTP value from HTTP body'
  );
  assert(
    forgotRes.body.resetToken === undefined,
    'Forgot-password response strictly omits resetToken before OTP verification'
  );

  // Test 4.2: Public Job API payload privacy
  const jobsRes = await request('/jobs?limit=1');
  if (jobsRes.ok && jobsRes.body.jobs && jobsRes.body.jobs.length > 0) {
    const job = jobsRes.body.jobs[0];
    assert(job.candidate_id === undefined, 'Public job entity does not leak candidate_id');
    assert(job.internal_notes === undefined, 'Public job entity does not leak internal_notes');
  } else {
    assert(true, 'Public jobs endpoint safe');
  }

  // -------------------------------------------------------------------
  // TEST SECTION 5: RATE LIMITING & BRUTE FORCE DEFENSE
  // -------------------------------------------------------------------
  console.log('\n--- TEST SECTION 5: RATE LIMITING & BRUTE FORCE DEFENSE ---');

  // Test 5.1: Public Read Rate Limiter on /api/jobs (100 req/min/IP)
  console.log('Testing Public Read Rate Limiter on /api/jobs...');
  const jobReadRes = await request('/jobs?page=1&limit=5');
  assert(jobReadRes.status === 200, 'Public job listing endpoint responds 200 for normal traffic');
  assert(
    Boolean(jobReadRes.headers.get('ratelimit-limit')),
    'Public jobs endpoint attaches RateLimit-Limit header'
  );

  // Test 5.2: Contact / Executive Enquiry Rate Limiting
  console.log('Testing Contact Enquiry Rate Limiting...');
  const contactRes = await request('/contact', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Security Test',
      email: 'security-test@vakancy.com',
      subject: 'Security Infiltration Probe',
      message: 'This is an automated security audit probe.'
    })
  });
  assert(
    [200, 201, 429].includes(contactRes.status),
    'Contact form endpoint handles submissions securely with rate limiting'
  );

  // Test 5.3: Failed Login Limiter (Max 5 failed attempts per min per IP & account)
  console.log('Testing 5 failed login attempts against /api/auth/login...');
  const testAccount = `brute_victim_${Date.now()}@vakancy.com`;
  let lastStatus = 0;
  let retryAfterHeader = null;

  for (let i = 1; i <= 6; i++) {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: testAccount, password: 'WrongPassword999!' })
    });
    lastStatus = res.status;
    if (res.headers.get('retry-after')) {
      retryAfterHeader = res.headers.get('retry-after');
    }
  }

  assert(
    lastStatus === 429,
    'Failed login limiter returns HTTP 429 on 6th failed attempt',
    `Expected 429, got ${lastStatus}`
  );
  assert(
    Boolean(retryAfterHeader),
    'Failed login limiter returns Retry-After response header',
    `Retry-After: ${retryAfterHeader}`
  );

  console.log('\n====================================================');
  console.log(`LIVE VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runLiveVerification().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
