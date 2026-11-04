const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../config/db');
const { createResetToken, hashResetToken, buildResetUrl } = require('../services/passwordResetService');
const { validateTransition, normalizeApplicationStatus } = require('../utils/applicationWorkflow');

test('password reset tokens are random, hashed and URL encoded', () => {
  const first = createResetToken();
  const second = createResetToken();
  assert.notEqual(first.token, second.token);
  assert.notEqual(first.token, first.tokenHash);
  assert.equal(hashResetToken(first.token), first.tokenHash);
  assert.match(buildResetUrl(first.token, 'https://vakancy.in/'), /^https:\/\/vakancy\.in\/login\?resetToken=/);
});

test('ATS aliases normalize and terminal transitions fail closed', () => {
  assert.equal(normalizeApplicationStatus('reviewing'), 'under_review');
  assert.equal(normalizeApplicationStatus('hired'), 'selected');
  assert.equal(validateTransition('applied', 'reviewing').valid, true);
  assert.deepEqual(validateTransition('selected', 'under_review').code, 'INVALID_STATUS_TRANSITION');
  assert.equal(validateTransition('interview', 'selected').valid, true);
});

test('forgot password generates OTP and never exposes raw credential in response', async () => {
  const emailPath = require.resolve('../services/emailService');
  const authPath = require.resolve('../controllers/authController');
  let deliveredOtp = '';
  require.cache[emailPath] = { id: emailPath, filename: emailPath, loaded: true, exports: {
    sendPasswordResetEmail: async (_email, details) => ({ success: true, simulated: true }),
    sendOtpEmail: async (_email, details) => { deliveredOtp = details.otp; return { success: true, simulated: true }; }
  } };
  delete require.cache[authPath];
  const { forgotPassword } = require('../controllers/authController');
  const originalQuery = db.query;
  db.query = async (sql, params) => {
    if (sql.includes('FROM USERS') && (sql.includes('email') || sql.includes('LOWER'))) return [{ id: 'user-1', email: 'synthetic@example.test' }];
    if (sql.includes('USER_OTP') && sql.includes('resend_available_at > NOW()')) return [];
    if (sql.includes('INSERT INTO USER_OTP')) return { insertId: 1, affectedRows: 1 };
    if (sql.includes('UPDATE USER_OTP')) return { affectedRows: 1 };
    return [];
  };
  const response = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  try {
    await forgotPassword({ body: { email: 'synthetic@example.test' } }, response);
    assert.equal(response.body.success, true);
    assert.ok(deliveredOtp);
    assert.equal(deliveredOtp.length, 6);
    assert.equal(JSON.stringify(response.body).includes(deliveredOtp), false);
  } finally {
    db.query = originalQuery;
    delete require.cache[authPath];
    delete require.cache[emailPath];
  }
});

test('employer resume access requires an approved consented share', async () => {
  const controller = require('../controllers/employerController');
  const originalQuery = db.query;
  db.query = async (sql) => {
    if (sql.includes('FROM EMPLOYERS WHERE user_id')) return [{ id: 'employer-a', user_id: 'user-a' }];
    if (sql.startsWith('SELECT * FROM CANDIDATE_RESUME')) return [{ id: 'resume-a', candidate_id: 'candidate-a', cloudinary_public_id: 'private-id', file_url: '/authenticated/' }];
    if (sql.includes('FROM CANDIDATE_SHARING')) return [];
    if (sql.includes('FROM APPLICATION')) return [];
    throw new Error(`Unexpected query: ${sql}`);
  };
  const response = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  try {
    await controller.getEmployerCandidateResume({ user: { id: 'user-a', role: 'employer' }, params: { id: 'resume-a' } }, response);
    assert.equal(response.statusCode, 403);
  } finally { db.query = originalQuery; }
});

test('reset password token is single-use and increments the session generation', async () => {
  const emailPath = require.resolve('../services/emailService');
  const authPath = require.resolve('../controllers/authController');
  require.cache[emailPath] = { id: emailPath, filename: emailPath, loaded: true, exports: { sendPasswordResetEmail: async () => ({ simulated: true }) } };
  delete require.cache[authPath];
  const { resetPassword } = require('../controllers/authController');
  const originalQuery = db.query;
  let consumed = false;
  db.query = async (sql) => {
    if (sql.includes('FROM USERS WHERE reset_token_hash')) return consumed ? [] : [{ id: 'user-1', email: 'synthetic@example.test' }];
    if (sql.includes('FROM USERS WHERE LOWER(email)')) return [{ id: 'user-1', email: 'synthetic@example.test', password_hash: '$2a$10$oldfakehash' }];
    if (sql.includes('UPDATE USERS')) { consumed = true; return { affectedRows: 1 }; }
    return [];
  };
  const makeResponse = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
  try {
    const first = makeResponse();
    await resetPassword({ body: { token: 'single-use-token', newPassword: 'StrongPassword123!' } }, first);
    assert.equal(first.body.success, true);
    const second = makeResponse();
    await resetPassword({ body: { token: 'single-use-token', newPassword: 'AnotherPassword123!' } }, second);
    assert.equal(second.statusCode, 400);
  } finally {
    db.query = originalQuery;
    delete require.cache[authPath];
    delete require.cache[emailPath];
  }
});
