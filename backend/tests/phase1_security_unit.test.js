const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';

const db = require('../config/db');
const {
  parseAllowedOrigins,
  createCorsOptions,
  createRateLimiter,
  validateAuthRequest,
  paymentUnavailable
} = require('../middleware/securityMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { checkPermission } = require('../middleware/rbacMiddleware');
const { createRazorpayOrder, verifyPayment } = require('../controllers/paymentController');
const { unlockCandidate } = require('../controllers/subscriptionController');
const { __test: fileSecurity } = require('../controllers/fileController');
const { app } = require('../server');

const createResponse = () => ({
  statusCode: 200,
  headers: {},
  payload: undefined,
  status(code) { this.statusCode = code; return this; },
  setHeader(name, value) { this.headers[name] = value; },
  json(payload) { this.payload = payload; return this; }
});

test('payment operations and paid unlocks fail closed without database access', async () => {
  const originalQuery = db.query;
  let queryCount = 0;
  db.query = async () => { queryCount += 1; throw new Error('Database must not be reached'); };
  try {
    for (const handler of [createRazorpayOrder, verifyPayment, unlockCandidate]) {
      const res = createResponse();
      await handler({ body: {}, user: { id: 'user-1' } }, res);
      assert.equal(res.statusCode, 503);
      assert.equal(res.payload.code, 'PAYMENTS_UNAVAILABLE');
    }
    assert.equal(queryCount, 0);
  } finally {
    db.query = originalQuery;
  }
});

test('shared payment unavailable middleware uses the canonical response', () => {
  const res = createResponse();
  paymentUnavailable({}, res);
  assert.equal(res.statusCode, 503);
  assert.deepEqual(res.payload, {
    success: false,
    code: 'PAYMENTS_UNAVAILABLE',
    message: 'Payments and paid feature activation are temporarily unavailable.'
  });
});

test('route limiter rejects abusive request patterns and permits normal traffic', () => {
  const limiter = createRateLimiter({ windowMs: 60000, limit: 2, code: 'TEST_LIMIT' });
  const request = { baseUrl: '/api/auth', path: '/login', ip: '203.0.113.10', body: {} };
  let nextCount = 0;

  for (let index = 0; index < 3; index += 1) {
    const res = createResponse();
    limiter(request, res, () => { nextCount += 1; });
    if (index === 2) {
      assert.equal(res.statusCode, 429);
      assert.equal(res.payload.code, 'TEST_LIMIT');
    }
  }
  assert.equal(nextCount, 2);
});

test('CORS accepts exact configured origins and rejects unapproved origins', async () => {
  const allowed = parseAllowedOrigins('https://vakancy.in,https://admin.vakancy.in');
  const options = createCorsOptions(allowed);

  await new Promise((resolve, reject) => {
    options.origin('https://vakancy.in', (error, accepted) => {
      try {
        assert.ifError(error);
        assert.equal(accepted, true);
        resolve();
      } catch (assertionError) { reject(assertionError); }
    });
  });

  await new Promise((resolve, reject) => {
    options.origin('https://evil.example', (error) => {
      try {
        assert.equal(error.code, 'CORS_ORIGIN_DENIED');
        assert.equal(error.status, 403);
        resolve();
      } catch (assertionError) { reject(assertionError); }
    });
  });

  assert.throws(() => parseAllowedOrigins('*'), /wildcard origins are not permitted/);
});

test('authentication validation accepts normal input and rejects oversized credentials', () => {
  const validReq = { body: { email: 'person@example.com', password: 'correct-horse' } };
  const validRes = createResponse();
  let accepted = false;
  validateAuthRequest('login')(validReq, validRes, () => { accepted = true; });
  assert.equal(accepted, true);

  const invalidRes = createResponse();
  validateAuthRequest('login')({ body: { email: 'person@example.com', password: 'x'.repeat(129) } }, invalidRes, () => {});
  assert.equal(invalidRes.statusCode, 400);
  assert.equal(invalidRes.payload.code, 'INVALID_PASSWORD');
});

test('upload validation checks magic bytes and rejects SVG or MIME spoofing', () => {
  const validPdf = Buffer.from('%PDF-1.7\nsecurity test');
  const validReq = { file: { buffer: validPdf, size: validPdf.length, mimetype: 'application/pdf', originalname: 'resume.pdf' } };
  const validRes = createResponse();
  let accepted = false;
  upload.validate('resume')(validReq, validRes, () => { accepted = true; });
  assert.equal(accepted, true);
  assert.equal(validReq.file.detectedType, 'pdf');

  const spoofedReq = { file: { buffer: Buffer.from('MZ executable'), size: 13, mimetype: 'application/pdf', originalname: 'resume.pdf' } };
  const spoofedRes = createResponse();
  upload.validate('resume')(spoofedReq, spoofedRes, () => {});
  assert.equal(spoofedRes.statusCode, 400);
  assert.equal(spoofedRes.payload.code, 'FILE_CONTENT_MISMATCH');

  const svgReq = { file: { buffer: Buffer.from('<svg><script/></svg>'), size: 21, mimetype: 'image/svg+xml', originalname: 'logo.svg' } };
  const svgRes = createResponse();
  upload.validate('logo')(svgReq, svgRes, () => {});
  assert.equal(svgRes.statusCode, 400);
});

test('cross-candidate upload associations are rejected', async () => {
  const originalQuery = db.query;
  db.query = async (sql) => {
    if (sql.includes('FROM CANDIDATES')) return [{ id: 'candidate-owned' }];
    throw new Error(`Unexpected query: ${sql}`);
  };
  try {
    const allowed = await fileSecurity.validateUploadAssociations(
      { id: 'user-1', role: 'candidate' },
      { candidate_id: 'candidate-other' }
    );
    assert.equal(allowed, false);
  } finally {
    db.query = originalQuery;
  }
});

test('ordinary candidates cannot write global master data', async () => {
  const originalQuery = db.query;
  db.query = async () => [];
  try {
    const req = { user: { id: 'candidate-user', role: 'candidate' } };
    const res = createResponse();
    let passed = false;
    await checkPermission('settings', 'edit')(req, res, () => { passed = true; });
    assert.equal(passed, false);
    assert.equal(res.statusCode, 403);
    assert.equal(res.payload.code, 'PERMISSION_DENIED');
  } finally {
    db.query = originalQuery;
  }
});

test('authorized Director permission and candidate-owned association workflows remain allowed', async () => {
  const directorReq = { user: { id: 'director-user', role: 'director' } };
  const directorRes = createResponse();
  let directorPassed = false;
  await checkPermission('settings', 'edit')(directorReq, directorRes, () => { directorPassed = true; });
  assert.equal(directorPassed, true);

  const originalQuery = db.query;
  db.query = async (sql) => {
    if (sql.includes('FROM CANDIDATES')) return [{ id: 'candidate-owned' }];
    throw new Error(`Unexpected query: ${sql}`);
  };
  try {
    const allowed = await fileSecurity.validateUploadAssociations(
      { id: 'candidate-user', role: 'candidate' },
      { candidate_id: 'candidate-owned' }
    );
    assert.equal(allowed, true);
  } finally {
    db.query = originalQuery;
  }
});

test('HTTP payment routes are unavailable, cannot unlock entitlements, and emit security headers', async (t) => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  for (const path of ['/api/payments/create-order', '/api/payments/verify-payment', '/api/subscriptions/unlock-candidate']) {
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
      body: '{}'
    });
    const payload = await response.json();
    assert.equal(response.status, 503);
    assert.equal(payload.code, 'PAYMENTS_UNAVAILABLE');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('permissions-policy'), 'camera=(), microphone=(), geolocation=(), payment=()');
    assert.match(response.headers.get('content-security-policy') || '', /default-src 'self'/);
    assert.equal(response.headers.get('x-dns-prefetch-control'), 'off');
  }
});

test('HTTP CORS rejects an unapproved browser origin before route handling', async (t) => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/api/payments/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' },
    body: '{}'
  });
  const payload = await response.json();
  assert.equal(response.status, 403);
  assert.equal(payload.code, 'CORS_ORIGIN_DENIED');
});
