const express = require('express');
const router = express.Router();
const { getPublicCompanies, getPublicCompanyById } = require('../controllers/companyController');

router.get('/', getPublicCompanies);
router.get('/:id', getPublicCompanyById);

module.exports = router;
