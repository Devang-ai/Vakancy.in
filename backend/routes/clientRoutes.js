const express = require('express');
const router = express.Router();
const {
  getClients,
  createClient,
  updateClient,
  deleteClient
} = require('../controllers/clientController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.get('/', authenticateToken, authorizeRoles('recruiter', 'admin'), getClients);
router.post('/', authenticateToken, authorizeRoles('recruiter', 'admin'), createClient);
router.put('/:id', authenticateToken, authorizeRoles('recruiter', 'admin'), updateClient);
router.delete('/:id', authenticateToken, authorizeRoles('recruiter', 'admin'), deleteClient);

module.exports = router;
