const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

const OTP_SECRET = process.env.OTP_SECRET || process.env.JWT_SECRET || 'vakancy_secure_otp_verifier_secret_2026';
const OTP_EXPIRY_MINUTES = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_VERIFICATION_ATTEMPTS = 5;
const RESET_AUTH_TOKEN_EXPIRY = '15m';

/**
 * Generate a cryptographically secure 6-digit numeric OTP
 */
function generateSecureSixDigitOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

/**
 * Hash an OTP with a secret and salt (email + purpose)
 */
function hashOtp(otp, email, purpose = 'password_reset') {
  const normalizedEmail = (email || '').trim().toLowerCase();
  return crypto
    .createHmac('sha256', OTP_SECRET)
    .update(`${otp}:${normalizedEmail}:${purpose}`)
    .digest('hex');
}

/**
 * Invalidate existing active OTPs for the given email and purpose
 */
async function invalidatePreviousOtps(email, purpose = 'password_reset') {
  const normalizedEmail = (email || '').trim().toLowerCase();
  try {
    await db.query(
      'DELETE FROM USER_OTP WHERE LOWER(email) = ? AND purpose = ?',
      [normalizedEmail, purpose]
    );
  } catch (err) {
    console.warn('Notice invalidating previous OTPs:', err.message);
  }
}

/**
 * Create and persist a new OTP verifier
 * Enforces 60-second resend cooldown
 */
async function createOtp({ email, userId = null, purpose = 'password_reset' }) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  const now = new Date();

  // Check if an active OTP was issued within the resend cooldown window
  const existingRows = await db.query(
    'SELECT id, resend_available_at, TIMESTAMPDIFF(SECOND, NOW(), resend_available_at) AS seconds_remaining FROM USER_OTP WHERE LOWER(email) = ? AND purpose = ? AND resend_available_at > NOW() ORDER BY created_at DESC LIMIT 1',
    [normalizedEmail, purpose]
  );

  if (existingRows.length > 0) {
    const secondsRemaining = Math.max(1, Number(existingRows[0].seconds_remaining) || 60);
    const error = new Error(`Please wait ${secondsRemaining} second(s) before requesting a new code.`);
    error.code = 'RESEND_COOLDOWN';
    error.secondsRemaining = secondsRemaining;
    throw error;
  }

  // Invalidate any older OTPs for this email and purpose
  await invalidatePreviousOtps(normalizedEmail, purpose);

  const otp = generateSecureSixDigitOtp();
  const otpHash = hashOtp(otp, normalizedEmail, purpose);
  const id = uuidv4();

  await db.query(
    `INSERT INTO USER_OTP 
      (id, user_id, email, otp_hash, purpose, attempts, expires_at, resend_available_at) 
     VALUES 
      (?, ?, ?, ?, ?, 0, DATE_ADD(NOW(), INTERVAL ? MINUTE), DATE_ADD(NOW(), INTERVAL ? SECOND))`,
    [
      id,
      userId,
      normalizedEmail,
      otpHash,
      purpose,
      OTP_EXPIRY_MINUTES,
      RESEND_COOLDOWN_SECONDS
    ]
  );

  return {
    otp, // Delivered only to email sender; never returned in HTTP responses or logged
    expiresInMinutes: OTP_EXPIRY_MINUTES,
    resendCooldownSeconds: RESEND_COOLDOWN_SECONDS
  };
}

/**
 * Verify an OTP submitted by the user
 */
async function verifyOtp({ email, otp, purpose = 'password_reset' }) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  const cleanOtp = String(otp || '').trim();

  if (!cleanOtp || cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
    const error = new Error('Please enter a valid 6-digit verification code.');
    error.code = 'INVALID_OTP_FORMAT';
    throw error;
  }

  const rows = await db.query(
    'SELECT id, user_id, email, otp_hash, purpose, attempts, expires_at, (expires_at < NOW()) AS is_expired FROM USER_OTP WHERE LOWER(email) = ? AND purpose = ? ORDER BY created_at DESC LIMIT 1',
    [normalizedEmail, purpose]
  );

  if (rows.length === 0) {
    const error = new Error('No active verification code found. Please request a new one.');
    error.code = 'OTP_NOT_FOUND';
    throw error;
  }

  const record = rows[0];

  if (record.is_expired) {
    await db.query('DELETE FROM USER_OTP WHERE id = ?', [record.id]);
    const error = new Error('Verification code has expired. Please request a new one.');
    error.code = 'OTP_EXPIRED';
    throw error;
  }

  if (record.attempts >= MAX_VERIFICATION_ATTEMPTS) {
    await db.query('DELETE FROM USER_OTP WHERE id = ?', [record.id]);
    const error = new Error('Maximum incorrect verification attempts exceeded. Please request a new code.');
    error.code = 'MAX_ATTEMPTS_EXCEEDED';
    throw error;
  }

  const expectedHash = hashOtp(cleanOtp, normalizedEmail, purpose);

  if (record.otp_hash !== expectedHash) {
    const nextAttempts = record.attempts + 1;
    await db.query('UPDATE USER_OTP SET attempts = ? WHERE id = ?', [nextAttempts, record.id]);
    const remaining = MAX_VERIFICATION_ATTEMPTS - nextAttempts;

    if (remaining <= 0) {
      await db.query('DELETE FROM USER_OTP WHERE id = ?', [record.id]);
      const error = new Error('Incorrect code. Maximum attempts reached. Please request a new code.');
      error.code = 'MAX_ATTEMPTS_EXCEEDED';
      throw error;
    }

    const error = new Error(`Incorrect verification code. ${remaining} attempt(s) remaining.`);
    error.code = 'INVALID_OTP';
    error.remainingAttempts = remaining;
    throw error;
  }

  // OTP verified successfully! Delete OTP to prevent reuse
  await db.query('DELETE FROM USER_OTP WHERE id = ?', [record.id]);

  return {
    valid: true,
    userId: record.user_id,
    email: normalizedEmail
  };
}

/**
 * Generate a short-lived, single-purpose signed JWT authorization token
 * after successful OTP verification
 */
function generateResetAuthToken(email, userId) {
  const payload = {
    email: (email || '').trim().toLowerCase(),
    userId: userId || null,
    purpose: 'password_reset_auth'
  };

  return jwt.sign(payload, OTP_SECRET, {
    expiresIn: RESET_AUTH_TOKEN_EXPIRY,
    jwtid: uuidv4()
  });
}

/**
 * Verify the single-purpose reset authorization token before setting the new password
 */
function verifyResetAuthToken(token) {
  if (!token) {
    const error = new Error('Password reset authorization token is missing.');
    error.code = 'MISSING_RESET_TOKEN';
    throw error;
  }

  try {
    const decoded = jwt.verify(token, OTP_SECRET);
    if (decoded.purpose !== 'password_reset_auth') {
      const error = new Error('Invalid token purpose.');
      error.code = 'INVALID_TOKEN_PURPOSE';
      throw error;
    }
    return decoded;
  } catch (jwtErr) {
    const error = new Error('Password reset authorization has expired or is invalid. Please request a new verification code.');
    error.code = 'EXPIRED_RESET_AUTH';
    throw error;
  }
}

module.exports = {
  createOtp,
  verifyOtp,
  generateResetAuthToken,
  verifyResetAuthToken,
  OTP_EXPIRY_MINUTES,
  RESEND_COOLDOWN_SECONDS
};
