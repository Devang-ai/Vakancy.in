const express = require('express');
const router = express.Router();
const {
  getStages,
  createStage,
  manuallyAddCandidate,
  assignToPipeline,
  moveCandidateStage,
  getPipelineBoard,
  getPipelineHistory,
  addCandidateNote,
  getCandidateNotes,
  addCandidateTag,
  removeCandidateTag
} = require('../controllers/atsController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.get('/stages', getStages);
router.post('/stages', authenticateToken, authorizeRoles('admin'), createStage);

router.post('/manual-candidate', authenticateToken, authorizeRoles('recruiter', 'admin'), manuallyAddCandidate);

router.post('/pipeline/assign', authenticateToken, authorizeRoles('recruiter', 'admin'), assignToPipeline);
router.post('/pipeline/move', authenticateToken, authorizeRoles('recruiter', 'admin'), moveCandidateStage);
router.get('/pipeline/board', authenticateToken, authorizeRoles('recruiter', 'admin', 'employer'), getPipelineBoard);
router.get('/pipeline/history/:pipeline_id', authenticateToken, authorizeRoles('recruiter', 'admin', 'employer'), getPipelineHistory);

router.post('/notes', authenticateToken, authorizeRoles('recruiter', 'admin'), addCandidateNote);
router.get('/notes/:candidate_id', authenticateToken, authorizeRoles('recruiter', 'admin'), getCandidateNotes);

router.post('/tags', authenticateToken, authorizeRoles('recruiter', 'admin'), addCandidateTag);
router.delete('/tags/:id', authenticateToken, authorizeRoles('recruiter', 'admin'), removeCandidateTag);

module.exports = router;
