const express = require('express');
const router = express.Router();
const {
  applyForJob,
  getMyApplications,
  getApplicationById,
  getApplicantsForJob,
  updateApplicationStatus
} = require('../controllers/applicationController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.post('/apply', authenticateToken, authorizeRoles('candidate'), applyForJob);
router.get('/my-applications', authenticateToken, authorizeRoles('candidate'), getMyApplications);
router.get('/job/:jobId', authenticateToken, authorizeRoles('employer', 'recruiter', 'admin', 'main_admin', 'hr_manager', 'hr_executive', 'viewer'), getApplicantsForJob);
router.get('/:id', authenticateToken, getApplicationById);
router.put('/:id/status', authenticateToken, authorizeRoles('recruiter', 'admin', 'main_admin', 'hr_manager', 'hr_executive', 'viewer'), updateApplicationStatus);

module.exports = router;
