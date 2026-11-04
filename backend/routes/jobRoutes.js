const express = require('express');
const router = express.Router();
const {
  getJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
  getKeywordSuggestions,
  getLocationSuggestions
} = require('../controllers/jobController');
const { createJobCallback } = require('../controllers/jobCallbackController');
const { authenticateToken, optionalAuthToken } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { publicReadLimiter, contactSubmissionLimiter } = require('../middleware/securityMiddleware');

router.get('/', publicReadLimiter, optionalAuthToken, getJobs);
router.get('/suggestions/keywords', publicReadLimiter, getKeywordSuggestions);
router.get('/suggestions/locations', publicReadLimiter, getLocationSuggestions);
router.get('/:id', publicReadLimiter, optionalAuthToken, getJobById);
router.post('/:id/callback', contactSubmissionLimiter, optionalAuthToken, createJobCallback);
router.post('/', authenticateToken, authorizeRoles('employer', 'recruiter', 'admin'), createJob);
router.put('/:id', authenticateToken, authorizeRoles('employer', 'recruiter', 'admin'), updateJob);
router.delete('/:id', authenticateToken, authorizeRoles('employer', 'recruiter', 'admin'), deleteJob);

module.exports = router;
