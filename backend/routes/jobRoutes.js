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
const { authenticateToken, optionalAuthToken } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.get('/', optionalAuthToken, getJobs);
router.get('/suggestions/keywords', getKeywordSuggestions);
router.get('/suggestions/locations', getLocationSuggestions);
router.get('/:id', optionalAuthToken, getJobById);
router.post('/', authenticateToken, authorizeRoles('employer', 'recruiter', 'admin'), createJob);
router.put('/:id', authenticateToken, authorizeRoles('employer', 'recruiter', 'admin'), updateJob);
router.delete('/:id', authenticateToken, authorizeRoles('employer', 'recruiter', 'admin'), deleteJob);

module.exports = router;
