const express = require('express');
const router = express.Router();
const { submitContactEnquiry } = require('../controllers/contactController');

// Public Contact Enquiry Route (Rate limit safe, no auth required)
router.post('/', submitContactEnquiry);
router.post('/enquire', submitContactEnquiry);

module.exports = router;
