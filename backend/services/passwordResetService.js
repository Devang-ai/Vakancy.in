const crypto = require('crypto');

const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

function createResetToken() {
  const token = crypto.randomBytes(RESET_TOKEN_BYTES).toString('hex');
  return { token, tokenHash: hashResetToken(token), expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) };
}

function hashResetToken(token) {
  return crypto.createHash('sha256').update(String(token || ''), 'utf8').digest('hex');
}

function buildResetUrl(token, appUrl = process.env.APP_URL || 'http://localhost:5173') {
  const base = String(appUrl).replace(/\/$/, '');
  return `${base}/login?resetToken=${encodeURIComponent(token)}`;
}

module.exports = { createResetToken, hashResetToken, buildResetUrl, RESET_TOKEN_TTL_MS };
