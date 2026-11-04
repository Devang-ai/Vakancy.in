const express = require('express');
const router = express.Router();
const {
  getPublicExecutiveShortlist,
  downloadShortlistCandidateResume,
  downloadShortlistBulkResumes,
  requestShortlistVerificationOtp,
  verifyShortlistOtp
} = require('../controllers/executiveShareController');
const { createRateLimiter } = require('../middleware/securityMiddleware');

// Rate limiting for public shortlist access: 60 requests per 10 minutes
const shortlistLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  limit: 60,
  code: 'SHORTLIST_RATE_LIMIT_EXCEEDED'
});

// Stricter rate limiting for OTP verification: 15 attempts per 10 minutes
const otpLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  limit: 15,
  code: 'SHORTLIST_OTP_RATE_LIMIT_EXCEEDED'
});

// View Candidate Shortlist
router.get('/shortlist/:token', shortlistLimiter, getPublicExecutiveShortlist);

// External Employer Identity Verification via Email OTP
router.post('/shortlist/:token/send-otp', otpLimiter, requestShortlistVerificationOtp);
router.post('/shortlist/:token/verify-otp', otpLimiter, verifyShortlistOtp);

// Download Single Candidate Resume (supporting both /resumes/:candidateId and /candidates/:candidateId/resume)
router.get('/shortlist/:token/resumes/:candidateId', shortlistLimiter, downloadShortlistCandidateResume);
router.get('/shortlist/:token/candidates/:candidateId/resume', shortlistLimiter, downloadShortlistCandidateResume);

// Bulk Download All Resumes as ZIP (supporting both /resumes-bulk and /resumes.zip)
router.get('/shortlist/:token/resumes-bulk', shortlistLimiter, downloadShortlistBulkResumes);
router.get('/shortlist/:token/resumes.zip', shortlistLimiter, downloadShortlistBulkResumes);

module.exports = router;
