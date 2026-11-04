const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  changePassword,
  sendSetPasswordOtp,
  setPassword,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  googleAuth,
  linkGoogleAccount
} = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');
const {
  validateAuthRequest,
  failedLoginTracker,
  loginRequestLimiter,
  registrationLimiter,
  passwordResetSendOtpLimiter,
  passwordResetVerifyOtpLimiter,
  passwordResetLimiter
} = require('../middleware/securityMiddleware');

// Login endpoint protection:
// 1. General login request throttle (20 req/min/IP) prevents socket floods
// 2. Strict failed login tracker enforces max 5 failed attempts/minute per IP & per account
const loginGuards = [loginRequestLimiter, failedLoginTracker.checkLimit, validateAuthRequest('login')];

router.post('/register', registrationLimiter, validateAuthRequest('register'), register);
router.post('/login', ...loginGuards, login);
router.post('/google', loginRequestLimiter, googleAuth);
router.post('/google/link', loginRequestLimiter, linkGoogleAccount);
router.get('/me', authenticateToken, getMe);

// Phase 2 — Authenticated Password Management (Change Password & Google-only Set Password)
router.post('/change-password', authenticateToken, passwordResetLimiter, changePassword);
router.post('/set-password/send-otp', authenticateToken, passwordResetSendOtpLimiter, sendSetPasswordOtp);
router.post('/set-password', authenticateToken, passwordResetLimiter, setPassword);

// Phase 3 — Email OTP Password Recovery
router.post('/forgot-password', passwordResetSendOtpLimiter, validateAuthRequest('forgot-password'), forgotPassword);
router.post('/forgot-password/send-otp', passwordResetSendOtpLimiter, validateAuthRequest('forgot-password'), forgotPassword);
router.post('/forgot-password/verify-otp', passwordResetVerifyOtpLimiter, verifyResetOtp);
router.post('/reset-password', passwordResetLimiter, validateAuthRequest('reset-password'), resetPassword);

module.exports = router;
