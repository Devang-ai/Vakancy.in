const express = require('express');
const router = express.Router();
const { getPaymentHistory } = require('../controllers/paymentController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { paymentUnavailable } = require('../middleware/securityMiddleware');

// Paid checkout is intentionally disabled. Keep historical records readable to their owner.
router.post('/create-order', paymentUnavailable);
router.post('/verify-payment', paymentUnavailable);
router.get('/history', authenticateToken, getPaymentHistory);

module.exports = router;
