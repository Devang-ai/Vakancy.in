const express = require('express');
const router = express.Router();
const { getPlans, createPlan, unlockCandidate } = require('../controllers/subscriptionController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { paymentUnavailable } = require('../middleware/securityMiddleware');

router.get('/plans', getPlans);
router.post('/plans', authenticateToken, authorizeRoles('admin'), createPlan);
// Candidate unlocks are paid entitlements and remain unavailable with checkout disabled.
router.post('/unlock-candidate', paymentUnavailable);

module.exports = router;
