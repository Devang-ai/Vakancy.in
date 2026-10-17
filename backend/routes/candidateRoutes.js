const express = require('express');
const router = express.Router();
const {
  getCandidateProfile,
  updateCandidateProfile,
  updateProfessionalInfo,
  addExperience,
  updateExperience,
  updateEducation,
  deleteExperience,
  addEducation,
  deleteEducation,
  addSkill,
  updateSkills,
  deleteSkill,
  addLanguage,
  deleteLanguage,
  uploadResume,
  setPrimaryResume,
  deleteResume,
  updateOnboardingStep,
  addProject,
  updateProject,
  deleteProject,
  updateAdditionalInfo,
  viewResume,
  getSavedJobs,
  addSavedJob,
  removeSavedJob,
  getDashboard,
  getResumes,
  generateAiResume,
  saveAiResume
} = require('../controllers/candidateController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Onboarding
router.put('/me/onboarding', authenticateToken, authorizeRoles('candidate'), updateOnboardingStep);

// Saved Jobs
router.get('/me/saved-jobs', authenticateToken, authorizeRoles('candidate'), getSavedJobs);
router.post('/me/saved-jobs', authenticateToken, authorizeRoles('candidate'), addSavedJob);
router.delete('/me/saved-jobs/:jobId', authenticateToken, authorizeRoles('candidate'), removeSavedJob);

// Dashboard
router.get('/me/dashboard', authenticateToken, authorizeRoles('candidate'), getDashboard);

// Get current candidate profile
router.get('/me', authenticateToken, authorizeRoles('candidate'), getCandidateProfile);
router.put('/me', authenticateToken, authorizeRoles('candidate'), updateCandidateProfile);
router.put('/me/professional', authenticateToken, authorizeRoles('candidate'), updateProfessionalInfo);

// Experience
router.put('/me/experiences/:id', authenticateToken, authorizeRoles('candidate'), updateExperience);
router.post('/me/experiences', authenticateToken, authorizeRoles('candidate'), addExperience);
router.delete('/me/experiences/:id', authenticateToken, authorizeRoles('candidate'), deleteExperience);

// Education
router.put('/me/education/:id', authenticateToken, authorizeRoles('candidate'), updateEducation);
router.post('/me/education', authenticateToken, authorizeRoles('candidate'), addEducation);
router.delete('/me/education/:id', authenticateToken, authorizeRoles('candidate'), deleteEducation);

// Skills
router.put('/me/skills', authenticateToken, authorizeRoles('candidate'), updateSkills);
router.post('/me/skills', authenticateToken, authorizeRoles('candidate'), addSkill);
router.delete('/me/skills/:id', authenticateToken, authorizeRoles('candidate'), deleteSkill);

// Languages
router.post('/me/languages', authenticateToken, authorizeRoles('candidate'), addLanguage);
router.delete('/me/languages/:id', authenticateToken, authorizeRoles('candidate'), deleteLanguage);

// Resumes
router.get('/me/resumes', authenticateToken, authorizeRoles('candidate'), getResumes);
router.post('/me/resumes', authenticateToken, authorizeRoles('candidate'), upload.single('resume'), uploadResume);
router.get('/me/resumes/:id/view', authenticateToken, authorizeRoles('candidate'), viewResume);
router.put('/me/resumes/:id/set-primary', authenticateToken, authorizeRoles('candidate'), setPrimaryResume);
router.delete('/me/resumes/:id', authenticateToken, authorizeRoles('candidate'), deleteResume);
router.post('/me/generate-ai-resume', authenticateToken, authorizeRoles('candidate'), generateAiResume);
router.post('/me/save-ai-resume', authenticateToken, authorizeRoles('candidate'), saveAiResume);
// Projects
router.post('/me/projects', authenticateToken, authorizeRoles('candidate'), addProject);
router.put('/me/projects/:id', authenticateToken, authorizeRoles('candidate'), updateProject);
router.delete('/me/projects/:id', authenticateToken, authorizeRoles('candidate'), deleteProject);

// Executive Info
router.put('/me/additional', authenticateToken, authorizeRoles('candidate'), updateAdditionalInfo);

module.exports = router;
