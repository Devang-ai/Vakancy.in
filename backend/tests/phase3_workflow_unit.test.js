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

test('forgot password stores only a token hash and never returns the token', async () => {
  const emailPath = require.resolve('../services/emailService');
  const authPath = require.resolve('../controllers/authController');
  let deliveredUrl = '';
  require.cache[emailPath] = { id: emailPath, filename: emailPath, loaded: true, exports: {
    sendPasswordResetEmail: async (_email, details) => { deliveredUrl = details.resetUrl; return { success: true, simulated: true }; }
  } };
  delete require.cache[authPath];
  const { forgotPassword } = require('../controllers/authController');
  const originalQuery = db.query;
  let storedHash = '';
  db.query = async (sql, params) => {
    if (sql.startsWith('SELECT * FROM USERS')) return [{ id: 'user-1', email: 'synthetic@example.test' }];
    if (sql.startsWith('UPDATE USERS SET reset_token_hash')) { storedHash = params[0]; return { affectedRows: 1 }; }
    throw new Error(`Unexpected query: ${sql}`);
  };
  const response = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  try {
    await forgotPassword({ body: { email: 'synthetic@example.test' } }, response);
    const token = new URL(deliveredUrl).searchParams.get('resetToken');
    assert.ok(token);
    assert.equal(storedHash, hashResetToken(token));
    assert.equal(JSON.stringify(response.body).includes(token), false);
    assert.deepEqual(Object.keys(response.body).sort(), ['message', 'success']);
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
    if (sql.startsWith('SELECT id FROM USERS WHERE reset_token_hash')) return consumed ? [] : [{ id: 'user-1' }];
    if (sql.startsWith('UPDATE USERS SET password_hash')) { consumed = true; return { affectedRows: 1 }; }
    throw new Error(`Unexpected query: ${sql}`);
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
