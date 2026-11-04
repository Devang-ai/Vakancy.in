const express = require('express');
const router = express.Router();
const { getPublicCompanies, getPublicCompanyById } = require('../controllers/companyController');
const { createJobCallback, getCompanyJobCallbackStats } = require('../controllers/jobCallbackController');
const { optionalAuthToken } = require('../middleware/authMiddleware');
const { publicReadLimiter, contactSubmissionLimiter } = require('../middleware/securityMiddleware');

router.get('/', publicReadLimiter, getPublicCompanies);
router.get('/:companyId/job-callbacks/stats', publicReadLimiter, getCompanyJobCallbackStats);
router.post('/:companyId/jobs/:jobId/callback', contactSubmissionLimiter, optionalAuthToken, createJobCallback);
router.get('/:id', publicReadLimiter, getPublicCompanyById);

module.exports = router;
