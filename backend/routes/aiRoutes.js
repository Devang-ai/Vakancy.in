const express = require('express');
const router = express.Router();
const { handleResumeEnhancer, handleJdGenerator, getAiHistory } = require('../controllers/aiController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

// Candidate AI Resume Builder — Candidate only
router.post('/resume-builder', authenticateToken, authorizeRoles('candidate'), handleResumeEnhancer);

// Employer AI JD Generator — Employer & Recruiter only
router.post('/jd-generator', authenticateToken, authorizeRoles('employer', 'recruiter', 'admin'), handleJdGenerator);

// AI Request History — Authenticated user scoped
router.get('/history', authenticateToken, getAiHistory);

module.exports = router;
