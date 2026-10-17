const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const {
  getIndustries,
  getCompanyTypes,
  getCompanySizes,
  getDepartments,
  getJobCategories,
  getLocationsHierarchy,
  getCountries,
  getStates,
  getCities,
  getSkills,
  createSkill,
  getBenefits,
  createBenefit,
  getLanguages
} = require('../controllers/masterController');

router.get('/industries', getIndustries);
router.get('/company-types', getCompanyTypes);
router.get('/company-sizes', getCompanySizes);
router.get('/departments', getDepartments);
router.get('/categories', getJobCategories);
router.get('/locations-hierarchy', getLocationsHierarchy);
router.get('/locations/countries', getCountries);
router.get('/locations/states', getStates);
router.get('/locations/cities', getCities);
router.get('/countries', getCountries);
router.get('/states', getStates);
router.get('/cities', getCities);
router.get('/skills', getSkills);
router.post('/skills', authenticateToken, createSkill);
router.get('/benefits', getBenefits);
router.post('/benefits', authenticateToken, createBenefit);
router.get('/languages', getLanguages);

module.exports = router;
