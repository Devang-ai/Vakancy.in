const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

// User Notifications (Candidate, Recruiter, Employer, Admin)
const getUserNotifications = async (req, res) => {
  try {
    const notifications = await db.query(
      'SELECT * FROM NOTIFICATION WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );

    const unreadCount = notifications.filter(n => !n.is_read).length;

    res.json({
      success: true,
      unread_count: unreadCount,
      notifications
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching notifications.', error: error.message });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const notifs = await db.query('SELECT * FROM NOTIFICATION WHERE id = ?', [id]);
    if (notifs.length === 0) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    if (notifs[0].user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only update your own notifications.'
      });
    }

    await db.query('UPDATE NOTIFICATION SET is_read = 1 WHERE id = ? AND user_id = ?', [id, req.user.id]);
    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating notification.', error: error.message });
  }
};

const markAllRead = async (req, res) => {
  try {
    await db.query('UPDATE NOTIFICATION SET is_read = 1 WHERE user_id = ?', [req.user.id]);
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error marking notifications read.', error: error.message });
  }
};

// Candidate Job Alerts (In-Scope, isolated to authenticated candidate)
const getJobAlerts = async (req, res) => {
  try {
    if (req.user.role !== 'candidate') {
      return res.status(403).json({ success: false, message: 'Access denied: Job alerts are only accessible to candidates.' });
    }

    const alerts = await db.query(
      'SELECT * FROM JOB_ALERT WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );

    res.json({ success: true, alerts });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching job alerts.', error: error.message });
  }
};

const createJobAlert = async (req, res) => {
  try {
    if (req.user.role !== 'candidate') {
      return res.status(403).json({ success: false, message: 'Access denied: Job alerts are only accessible to candidates.' });
    }

    const { title, location, salary, frequency } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Job alert title is required.' });
    }

    const id = uuidv4();
    const alertRecord = {
      id,
      user_id: req.user.id,
      title: title.trim(),
      location: location || 'All Locations',
      salary: salary || 'Negotiable',
      frequency: frequency || 'Instant WhatsApp & Email',
      is_active: 1,
      created_at: new Date().toISOString()
    };

    await db.query(
      'INSERT INTO JOB_ALERT (id, user_id, title, location, salary, frequency, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [alertRecord.id, alertRecord.user_id, alertRecord.title, alertRecord.location, alertRecord.salary, alertRecord.frequency, alertRecord.is_active, alertRecord.created_at]
    );

    res.status(201).json({ success: true, message: 'Job alert created successfully.', alert: alertRecord });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating job alert.', error: error.message });
  }
};

const toggleJobAlert = async (req, res) => {
  try {
    if (req.user.role !== 'candidate') {
      return res.status(403).json({ success: false, message: 'Access denied: Job alerts are only accessible to candidates.' });
    }

    const { id } = req.params;
    const alerts = await db.query('SELECT * FROM JOB_ALERT WHERE id = ?', [id]);
    if (alerts.length === 0) {
      return res.status(404).json({ success: false, message: 'Job alert not found.' });
    }

    const alert = alerts[0];
    if (alert.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only modify your own job alerts.' });
    }

    const nextState = alert.is_active ? 0 : 1;
    await db.query('UPDATE JOB_ALERT SET is_active = ? WHERE id = ? AND user_id = ?', [nextState, id, req.user.id]);

    res.json({ success: true, message: `Job alert ${nextState ? 'activated' : 'paused'}.`, is_active: nextState });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating job alert.', error: error.message });
  }
};

const deleteJobAlert = async (req, res) => {
  try {
    if (req.user.role !== 'candidate') {
      return res.status(403).json({ success: false, message: 'Access denied: Job alerts are only accessible to candidates.' });
    }

    const { id } = req.params;
    const alerts = await db.query('SELECT * FROM JOB_ALERT WHERE id = ?', [id]);
    if (alerts.length === 0) {
      return res.status(404).json({ success: false, message: 'Job alert not found.' });
    }

    if (alerts[0].user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only delete your own job alerts.' });
    }

    await db.query('DELETE FROM JOB_ALERT WHERE id = ? AND user_id = ?', [id, req.user.id]);
    res.json({ success: true, message: 'Job alert deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting job alert.', error: error.message });
  }
};

// Candidate Notification Preferences
const getNotificationPreferences = async (req, res) => {
  try {
    if (req.user.role !== 'candidate') {
      return res.status(403).json({ success: false, message: 'Access denied: Preferences are only accessible to candidates.' });
    }

    const prefs = await db.query('SELECT * FROM NOTIFICATION_PREFERENCE WHERE user_id = ?', [req.user.id]);
    const defaults = {
      stageWhatsapp: true,
      stageEmail: true,
      stageSms: false,
      inboundWhatsapp: true,
      inboundEmail: true,
      digestWhatsapp: false,
      digestEmail: true,
    };
    const p = prefs.length > 0 ? prefs[0] : {};
    const formatted = {
      stageWhatsapp: p.stageWhatsapp !== undefined ? Boolean(p.stageWhatsapp) : defaults.stageWhatsapp,
      stageEmail: p.stageEmail !== undefined ? Boolean(p.stageEmail) : defaults.stageEmail,
      stageSms: p.stageSms !== undefined ? Boolean(p.stageSms) : defaults.stageSms,
      inboundWhatsapp: p.inboundWhatsapp !== undefined ? Boolean(p.inboundWhatsapp) : defaults.inboundWhatsapp,
      inboundEmail: p.inboundEmail !== undefined ? Boolean(p.inboundEmail) : defaults.inboundEmail,
      digestWhatsapp: p.digestWhatsapp !== undefined ? Boolean(p.digestWhatsapp) : defaults.digestWhatsapp,
      digestEmail: p.digestEmail !== undefined ? Boolean(p.digestEmail) : defaults.digestEmail,
    };

    res.json({
      success: true,
      preferences: formatted
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching preferences.', error: error.message });
  }
};

const updateNotificationPreferences = async (req, res) => {
  try {
    if (req.user.role !== 'candidate') {
      return res.status(403).json({ success: false, message: 'Access denied: Preferences are only accessible to candidates.' });
    }

    const existing = await db.query('SELECT id FROM NOTIFICATION_PREFERENCE WHERE user_id = ?', [req.user.id]);
    const prefsData = req.body || {};

    if (existing.length > 0) {
      await db.query(
        'UPDATE NOTIFICATION_PREFERENCE SET stageWhatsapp = ?, stageEmail = ?, stageSms = ?, inboundWhatsapp = ?, inboundEmail = ?, digestWhatsapp = ?, digestEmail = ? WHERE user_id = ?',
        [
          prefsData.stageWhatsapp ? 1 : 0,
          prefsData.stageEmail ? 1 : 0,
          prefsData.stageSms ? 1 : 0,
          prefsData.inboundWhatsapp ? 1 : 0,
          prefsData.inboundEmail ? 1 : 0,
          prefsData.digestWhatsapp ? 1 : 0,
          prefsData.digestEmail ? 1 : 0,
          req.user.id
        ]
      );
    } else {
      const id = uuidv4();
      await db.query(
        'INSERT INTO NOTIFICATION_PREFERENCE (id, user_id, stageWhatsapp, stageEmail, stageSms, inboundWhatsapp, inboundEmail, digestWhatsapp, digestEmail) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          req.user.id,
          prefsData.stageWhatsapp ? 1 : 0,
          prefsData.stageEmail ? 1 : 0,
          prefsData.stageSms ? 1 : 0,
          prefsData.inboundWhatsapp ? 1 : 0,
          prefsData.inboundEmail ? 1 : 0,
          prefsData.digestWhatsapp ? 1 : 0,
          prefsData.digestEmail ? 1 : 0
        ]
      );
    }

    res.json({ success: true, message: 'Notification preferences saved successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error saving preferences.', error: error.message });
  }
};

/**
 * Internal helper — creates an employer notification WITHOUT exposing candidate data.
 * Must only be called from trusted server-side code, not from HTTP request handlers.
 * 
 * @param {string} employerUserId  - The USERS.id of the employer to notify
 * @param {string} type            - notification type: 'new_application' | 'multiple_applications' | 'recruitment_contact' | 'recruitment_in_progress' | 'candidate_access_granted'
 * @param {string} title           - Notification title (no candidate data)
 * @param {string} message         - Notification message (no candidate name/email/phone/ID)
 * @param {string} referenceType   - e.g. 'job'
 * @param {string} referenceId     - e.g. job UUID
 */
const createEmployerNotification = async (employerUserId, type, title, message, referenceType = null, referenceId = null) => {
  try {
    if (!employerUserId || !type || !title || !message) {
      console.warn('createEmployerNotification: missing required fields');
      return null;
    }
    const id = uuidv4();
    await db.query(
      'INSERT INTO NOTIFICATION (id, user_id, type, title, message, reference_type, reference_id, is_read) VALUES (?, ?, ?, ?, ?, ?, ?, 0)',
      [id, employerUserId, type, title, message, referenceType, referenceId]
    );
    return id;
  } catch (err) {
    console.warn('createEmployerNotification error:', err.message);
    return null;
  }
};

module.exports = {
  getUserNotifications,
  markNotificationRead,
  markAllRead,
  getJobAlerts,
  createJobAlert,
  toggleJobAlert,
  deleteJobAlert,
  getNotificationPreferences,
  updateNotificationPreferences,
  createEmployerNotification
};
