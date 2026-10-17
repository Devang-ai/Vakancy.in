const express = require('express');
const router = express.Router();
const { getPlans, createPlan, unlockCandidate } = require('../controllers/subscriptionController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.get('/plans', getPlans);
router.post('/plans', authenticateToken, authorizeRoles('admin'), createPlan);
router.post('/unlock-candidate', authenticateToken, authorizeRoles('employer', 'recruiter', 'admin'), unlockCandidate);

module.exports = router;
