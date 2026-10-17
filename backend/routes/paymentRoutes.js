const express = require('express');
const router = express.Router();
const { createRazorpayOrder, verifyPayment, getPaymentHistory } = require('../controllers/paymentController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.post('/create-order', authenticateToken, createRazorpayOrder);
router.post('/verify-payment', authenticateToken, verifyPayment);
router.get('/history', authenticateToken, getPaymentHistory);

module.exports = router;
