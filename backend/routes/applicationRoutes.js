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

// Privacy guard: Strictly prevent BD roles from accessing candidate application data
const blockBDRoles = (req, res, next) => {
  const role = req.user?.role;
  if (role === 'bd' || role === 'bd_lead') {
    return res.status(403).json({
      success: false,
      code: 'PRIVACY_PROTECTION_ACCESS_DENIED',
      message: 'Forbidden. BD roles are strictly prohibited from accessing candidate application records.'
    });
  }
  next();
};

router.post('/apply', authenticateToken, authorizeRoles('candidate'), applyForJob);
router.get('/my-applications', authenticateToken, authorizeRoles('candidate'), getMyApplications);
router.get(
  '/job/:jobId',
  authenticateToken,
  blockBDRoles,
  authorizeRoles('employer', 'recruiter', 'admin', 'main_admin', 'director', 'tl_coordinator', 'hr_manager', 'hr_executive', 'viewer'),
  getApplicantsForJob
);
router.get('/:id', authenticateToken, blockBDRoles, getApplicationById);
router.put(
  '/:id/status',
  authenticateToken,
  blockBDRoles,
  authorizeRoles('recruiter', 'admin', 'main_admin', 'director', 'tl_coordinator', 'hr_manager', 'hr_executive', 'viewer'),
  updateApplicationStatus
);

module.exports = router;
