const express = require('express');
const router = express.Router();
const { submitContactEnquiry } = require('../controllers/contactController');
const { contactSubmissionLimiter, validateContactRequest } = require('../middleware/securityMiddleware');

// Public Contact & Executive Search Enquiry Route (Rate limit: 5 submissions/min/IP, no auth required)
router.post('/', contactSubmissionLimiter, validateContactRequest, submitContactEnquiry);
router.post('/enquire', contactSubmissionLimiter, validateContactRequest, submitContactEnquiry);

module.exports = router;
