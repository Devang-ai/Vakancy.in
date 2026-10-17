const express = require('express');
const router = express.Router();
const {
  getEmployerProfile,
  updateEmployerProfile,
  updateEmployerOnboarding,
  uploadCompanyLogo,
  getEmployerDashboardStats,
  getEmployerJobs,
  getEmployerJobById,
  toggleEmployerJobStatus,
  createEmployerJob,
  updateEmployerJob,
  generateEmployerJobDescription,
  updateEmployerJobDescription,
  getEmployerJobQuestions,
  updateEmployerJobQuestions,
  publishEmployerJob,
  getEmployerJobApplicants,
  getEmployerCandidateResume,
  createEmployerApplicationEnquiry,
  getEmployerApplicationEnquiries
} = require('../controllers/employerController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/profile', authenticateToken, authorizeRoles('employer', 'recruiter', 'admin'), getEmployerProfile);
router.put('/profile', authenticateToken, authorizeRoles('employer', 'recruiter', 'admin'), updateEmployerProfile);
router.put('/onboarding', authenticateToken, authorizeRoles('employer', 'recruiter', 'admin'), updateEmployerOnboarding);
router.post('/profile/logo', authenticateToken, authorizeRoles('employer', 'recruiter', 'admin'), upload.single('logo'), uploadCompanyLogo);

router.get('/dashboard-stats', authenticateToken, authorizeRoles('employer', 'recruiter', 'admin'), getEmployerDashboardStats);
router.get('/jobs', authenticateToken, authorizeRoles('employer', 'recruiter', 'admin'), getEmployerJobs);
router.get('/jobs/:id', authenticateToken, authorizeRoles('employer', 'recruiter', 'admin'), getEmployerJobById);
router.get('/jobs/:id/applicants', authenticateToken, authorizeRoles('employer', 'recruiter', 'admin'), getEmployerJobApplicants);
router.get('/resumes/:id', authenticateToken, authorizeRoles('employer', 'recruiter', 'admin'), getEmployerCandidateResume);
router.post('/jobs', authenticateToken, authorizeRoles('employer', 'recruiter', 'admin'), createEmployerJob);
router.post('/jobs/generate-jd', authenticateToken, authorizeRoles('employer', 'recruiter', 'admin'), generateEmployerJobDescription);
router.post('/jobs/:id/generate-jd', authenticateToken, authorizeRoles('employer', 'recruiter', 'admin'), generateEmployerJobDescription);
router.put('/jobs/:id', authenticateToken, authorizeRoles('employer', 'recruiter', 'admin'), updateEmployerJob);
router.put('/jobs/:id/description', authenticateToken, authorizeRoles('employer', 'recruiter', 'admin'), updateEmployerJobDescription);
router.get('/jobs/:id/questions', authenticateToken, authorizeRoles('employer', 'recruiter', 'admin'), getEmployerJobQuestions);
router.put('/jobs/:id/questions', authenticateToken, authorizeRoles('employer', 'recruiter', 'admin'), updateEmployerJobQuestions);
router.post('/jobs/:id/publish', authenticateToken, authorizeRoles('employer', 'recruiter', 'admin'), publishEmployerJob);
router.patch('/jobs/:id/status', authenticateToken, authorizeRoles('employer', 'recruiter', 'admin'), toggleEmployerJobStatus);
router.put('/jobs/:id/status', authenticateToken, authorizeRoles('employer', 'recruiter', 'admin'), toggleEmployerJobStatus);
router.post('/applications/:id/enquiry', authenticateToken, authorizeRoles('employer', 'recruiter', 'admin'), createEmployerApplicationEnquiry);
router.get('/applications/:id/enquiries', authenticateToken, authorizeRoles('employer', 'recruiter', 'admin'), getEmployerApplicationEnquiries);

module.exports = router;
