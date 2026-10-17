const express = require('express');
const router = express.Router();
const {
  getUserNotifications,
  markNotificationRead,
  markAllRead,
  getJobAlerts,
  createJobAlert,
  toggleJobAlert,
  deleteJobAlert,
  getNotificationPreferences,
  updateNotificationPreferences
} = require('../controllers/notificationController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

// User Notifications (Candidate, Recruiter, Employer, Admin)
router.get('/', authenticateToken, authorizeRoles('candidate', 'recruiter', 'employer', 'admin'), getUserNotifications);
router.put('/mark-read/:id', authenticateToken, authorizeRoles('candidate', 'recruiter', 'employer', 'admin'), markNotificationRead);
router.put('/mark-all-read', authenticateToken, authorizeRoles('candidate', 'recruiter', 'employer', 'admin'), markAllRead);

// Candidate Job Alerts (Persistent, candidate isolated)
router.get('/alerts', authenticateToken, authorizeRoles('candidate'), getJobAlerts);
router.post('/alerts', authenticateToken, authorizeRoles('candidate'), createJobAlert);
router.put('/alerts/:id/toggle', authenticateToken, authorizeRoles('candidate'), toggleJobAlert);
router.delete('/alerts/:id', authenticateToken, authorizeRoles('candidate'), deleteJobAlert);

// Candidate Delivery Preferences
router.get('/preferences', authenticateToken, authorizeRoles('candidate'), getNotificationPreferences);
router.put('/preferences', authenticateToken, authorizeRoles('candidate'), updateNotificationPreferences);

module.exports = router;
