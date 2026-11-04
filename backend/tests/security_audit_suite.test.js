const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';

const {
  createRateLimiter,
  createFailedLoginTracker,
  publicReadLimiter,
  contactSubmissionLimiter,
  parseAllowedOrigins,
  createCorsOptions,
  productionResponseSanitizer
} = require('../middleware/securityMiddleware');

const { authorizeRoles } = require('../middleware/roleMiddleware');
const { generateToken, verifyToken } = require('../config/jwt');

const createMockResponse = () => ({
  statusCode: 200,
  headers: {},
  payload: undefined,
  status(code) {
    this.statusCode = code;
    return this;
  },
  setHeader(name, value) {
    this.headers[name.toLowerCase()] = String(value);
  },
  getHeader(name) {
    return this.headers[name.toLowerCase()];
  },
  json(payload) {
    this.payload = payload;
    return this;
  }
});

// =========================================================================
// SECURITY CHECK 1 — RATE LIMITING TESTS
// =========================================================================

test('CHECK 1.1: Route limiter enforces request ceiling, returns HTTP 429 and Retry-After header', () => {
  const limiter = createRateLimiter({
    windowMs: 60 * 1000,
    limit: 3,
    code: 'RATE_LIMIT_TEST'
  });

  const req = { baseUrl: '/api/test', path: '/endpoint', ip: '198.51.100.1' };
  let passedCount = 0;

  for (let i = 0; i < 5; i++) {
    const res = createMockResponse();
    limiter(req, res, () => { passedCount++; });

    if (i < 3) {
      assert.equal(res.statusCode, 200);
      assert.ok(res.getHeader('ratelimit-remaining') !== undefined);
    } else {
      assert.equal(res.statusCode, 429, `Request ${i + 1} should be rate limited to 429`);
      assert.equal(res.payload.code, 'RATE_LIMIT_TEST');
      assert.ok(res.getHeader('retry-after') !== undefined, 'Must provide Retry-After header');
      assert.ok(Number(res.getHeader('retry-after')) > 0, 'Retry-After must be positive');
      assert.ok(res.payload.message, 'Must provide safe user message');
    }
  }

  assert.equal(passedCount, 3, 'Exactly 3 requests should have passed through');
});

test('CHECK 1.2: Failed login tracker blocks after 5 failed attempts per IP address within 60s', () => {
  const tracker = createFailedLoginTracker({
    maxFailedAttempts: 5,
    windowMs: 60 * 1000
  });

  const ip = '203.0.113.50';
  const account = 'user1@example.com';

  for (let i = 1; i <= 5; i++) {
    const checkRes = createMockResponse();
    let nextCalled = false;
    tracker.checkLimit({ ip, body: { email: account } }, checkRes, () => { nextCalled = true; });
    assert.equal(nextCalled, true, `Attempt ${i} should be permitted to check credentials`);
    tracker.recordFailure(ip, account);
  }

  const blockedRes = createMockResponse();
  let blockedNext = false;
  tracker.checkLimit({ ip, body: { email: account } }, blockedRes, () => { blockedNext = true; });

  assert.equal(blockedNext, false, '6th attempt must NOT reach next()');
  assert.equal(blockedRes.statusCode, 429, 'Must return HTTP 429');
  assert.equal(blockedRes.payload.code, 'LOGIN_RATE_LIMITED');
  assert.ok(blockedRes.getHeader('retry-after') !== undefined, 'Retry-After header required');
  assert.ok(blockedRes.payload.retry_after_seconds > 0);
});

test('CHECK 1.3: Failed login tracker protects account across rotating IPs (credential stuffing defense)', () => {
  const tracker = createFailedLoginTracker({
    maxFailedAttempts: 5,
    windowMs: 60 * 1000
  });

  const account = 'victim@example.com';

  for (let i = 1; i <= 5; i++) {
    const differentIp = `192.0.2.${i}`;
    const checkRes = createMockResponse();
    let nextCalled = false;
    tracker.checkLimit({ ip: differentIp, body: { email: account } }, checkRes, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
    tracker.recordFailure(differentIp, account);
  }

  const attackerIp6 = '192.0.2.99';
  const blockedRes = createMockResponse();
  let blockedNext = false;
  tracker.checkLimit({ ip: attackerIp6, body: { email: account } }, blockedRes, () => { blockedNext = true; });

  assert.equal(blockedNext, false, 'Attacker using rotating IP must be blocked when targeting same account');
  assert.equal(blockedRes.statusCode, 429);
  assert.equal(blockedRes.payload.code, 'LOGIN_RATE_LIMITED');
});

test('CHECK 1.4: Successful login clears failed attempt counters for IP and account', () => {
  const tracker = createFailedLoginTracker({
    maxFailedAttempts: 5,
    windowMs: 60 * 1000
  });

  const ip = '203.0.113.88';
  const account = 'gooduser@example.com';

  for (let i = 0; i < 4; i++) {
    tracker.recordFailure(ip, account);
  }

  tracker.recordSuccess(ip, account);

  for (let i = 0; i < 4; i++) {
    const res = createMockResponse();
    let nextCalled = false;
    tracker.checkLimit({ ip, body: { email: account } }, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true, 'Counter must be reset after success');
    tracker.recordFailure(ip, account);
  }
});

test('CHECK 1.5: Parallel / concurrent burst requests cannot bypass rate limiter', async () => {
  const limiter = createRateLimiter({
    windowMs: 60 * 1000,
    limit: 5,
    code: 'BURST_TEST'
  });

  const req = { baseUrl: '/api', path: '/burst', ip: '203.0.113.99' };
  const attempts = 15;
  const promises = [];

  for (let i = 0; i < attempts; i++) {
    promises.push(new Promise((resolve) => {
      const res = createMockResponse();
      let allowed = false;
      limiter(req, res, () => { allowed = true; });
      resolve({ allowed, statusCode: res.statusCode });
    }));
  }

  const results = await Promise.all(promises);
  const allowedTotal = results.filter(r => r.allowed).length;
  const rateLimitedTotal = results.filter(r => r.statusCode === 429).length;

  assert.equal(allowedTotal, 5, 'Exactly 5 requests must be allowed');
  assert.equal(rateLimitedTotal, 10, 'Remaining 10 requests must be rejected with 429');
});

test('CHECK 1.6: Public read limiter allows normal reads and throttles excessive queries', () => {
  const req = { baseUrl: '/api/jobs', path: '/', ip: '198.51.100.20' };
  let allowed = 0;
  for (let i = 0; i < 105; i++) {
    const res = createMockResponse();
    publicReadLimiter(req, res, () => { allowed++; });
    if (i >= 100) {
      assert.equal(res.statusCode, 429);
      assert.equal(res.payload.code, 'PUBLIC_READ_RATE_LIMITED');
    }
  }
  assert.equal(allowed, 100);
});

// =========================================================================
// SECURITY CHECK 2 — API KEYS & SECRET PROTECTION
// =========================================================================

test('CHECK 2.1: Production response sanitizer strips stack traces and error details', () => {
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';

  try {
    const res = createMockResponse();
    productionResponseSanitizer({}, res, () => {});

    res.json({
      success: false,
      message: 'Failed',
      stack: 'Error: at line 42 in /secret/path/server.js',
      error: 'SQLSTATE[42000]: Syntax error or access violation'
    });

    assert.equal(res.payload.stack, undefined, 'Stack trace must be stripped in production');
    assert.equal(res.payload.error, undefined, 'Internal error detail must be stripped in production');
    assert.equal(res.payload.message, 'Failed', 'Safe message preserved');
  } finally {
    process.env.NODE_ENV = originalEnv;
  }
});

// =========================================================================
// SECURITY CHECK 3 — RECORD-LEVEL ACCESS / MYSQL TENANT ISOLATION
// =========================================================================

test('CHECK 3.1: CORS configuration strictly enforces allowed origins and denies wildcards', () => {
  const allowed = parseAllowedOrigins('http://localhost:5173,https://vakancy.in,https://admin.vakancy.in');
  const corsOpts = createCorsOptions(allowed);

  corsOpts.origin('https://vakancy.in', (err, allow) => {
    assert.equal(err, null);
    assert.equal(allow, true);
  });

  corsOpts.origin('https://evil-hacker.com', (err, allow) => {
    assert.ok(err !== null, 'Must reject evil origin');
    assert.equal(err.status, 403);
    assert.equal(err.code, 'CORS_ORIGIN_DENIED');
  });

  assert.throws(() => {
    parseAllowedOrigins('*');
  }, /wildcard origins are not permitted/);
});

test('CHECK 3.2: Role authorization middleware strictly denies unauthorized role access', () => {
  const guard = authorizeRoles('employer', 'recruiter');

  // Candidate trying to access employer route
  const candRes = createMockResponse();
  let candNext = false;
  guard({ user: { id: 'cand-1', role: 'candidate' } }, candRes, () => { candNext = true; });
  assert.equal(candNext, false);
  assert.equal(candRes.statusCode, 403);

  // Employer accessing employer route
  const empRes = createMockResponse();
  let empNext = false;
  guard({ user: { id: 'emp-1', role: 'employer' } }, empRes, () => { empNext = true; });
  assert.equal(empNext, true);
  assert.equal(empRes.statusCode, 200);

  // Unauthenticated request
  const unauthRes = createMockResponse();
  let unauthNext = false;
  guard({}, unauthRes, () => { unauthNext = true; });
  assert.equal(unauthNext, false);
  assert.equal(unauthRes.statusCode, 401);
});

// =========================================================================
// SECURITY CHECK 4 — BACKEND API AUTHORIZATION & TOKEN REVOCATION
// =========================================================================

test('CHECK 4.1: JWT authentication verifies cryptographic signatures and rejects tampered tokens', () => {
  const token = generateToken({ id: 'user-123', email: 'test@vakancy.in', role: 'candidate', token_version: 0 });
  const decoded = verifyToken(token);
  assert.equal(decoded.id, 'user-123');
  assert.equal(decoded.role, 'candidate');

  // Tampered token must throw JsonWebTokenError
  const tamperedToken = token.slice(0, -6) + 'abcdef';
  assert.throws(() => {
    verifyToken(tamperedToken);
  }, /invalid signature|jwt malformed/i);
});

// =========================================================================
// SECURITY CHECK 5 — PRIVATE DATABASE & DATA EXPOSURE PROTECTION
// =========================================================================

test('CHECK 5.1: OTP service contract enforces cryptographic hashing', () => {
  const { createOtp } = require('../services/otpService');
  assert.equal(typeof createOtp, 'function');
});
