const express = require('express');
const router = express.Router();
const { handleResumeEnhancer, handleJdGenerator, getAiHistory } = require('../controllers/aiController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { createRateLimiter, validateAiRequest } = require('../middleware/securityMiddleware');

const aiGenerationLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 12,
  code: 'AI_RATE_LIMITED',
  message: 'AI generation limit reached. Please wait before submitting another request.'
});

// Candidate AI Resume Builder — Candidate only
router.post('/resume-builder', authenticateToken, aiGenerationLimiter, authorizeRoles('candidate'), validateAiRequest, handleResumeEnhancer);

// Employer AI JD Generator — Employer & Recruiter only
router.post('/jd-generator', authenticateToken, aiGenerationLimiter, authorizeRoles('employer', 'recruiter', 'admin'), validateAiRequest, handleJdGenerator);

// AI Request History — Authenticated user scoped
router.get('/history', authenticateToken, getAiHistory);

module.exports = router;
