const db = require('../config/db');

const DEFAULT_PREFERENCES = {
  stageEmail: true,
  inboundEmail: true,
  digestEmail: true,
  stageSms: false
};

/**
 * Retrieve persistent notification preferences for a user
 * Returns defaults if user has not yet customized their preferences
 */
async function getUserPreferences(userId) {
  if (!userId) return { ...DEFAULT_PREFERENCES };

  try {
    const rows = await db.query(
      'SELECT stageEmail, inboundEmail, digestEmail, stageSms FROM NOTIFICATION_PREFERENCE WHERE user_id = ? LIMIT 1',
      [userId]
    );

    if (rows.length === 0) {
      return { ...DEFAULT_PREFERENCES };
    }

    const p = rows[0];
    return {
      stageEmail: p.stageEmail !== null && p.stageEmail !== undefined ? Boolean(p.stageEmail) : DEFAULT_PREFERENCES.stageEmail,
      inboundEmail: p.inboundEmail !== null && p.inboundEmail !== undefined ? Boolean(p.inboundEmail) : DEFAULT_PREFERENCES.inboundEmail,
      digestEmail: p.digestEmail !== null && p.digestEmail !== undefined ? Boolean(p.digestEmail) : DEFAULT_PREFERENCES.digestEmail,
      stageSms: p.stageSms !== null && p.stageSms !== undefined ? Boolean(p.stageSms) : DEFAULT_PREFERENCES.stageSms
    };
  } catch (err) {
    console.warn('⚠️ [Preferences Warning] Failed to fetch notification preferences:', err.message);
    return { ...DEFAULT_PREFERENCES };
  }
}

/**
 * Save / Update notification preferences for a user
 */
async function updateUserPreferences(userId, prefsData = {}) {
  if (!userId) return false;
  const existing = await db.query('SELECT * FROM NOTIFICATION_PREFERENCE WHERE user_id = ?', [userId]);
  const prev = existing.length > 0 ? existing[0] : {};
  const stageSmsVal = prefsData.stageSms !== undefined ? (prefsData.stageSms ? 1 : 0) : (prev.stageSms ? 1 : 0);

  if (existing.length > 0) {
    await db.query(
      'UPDATE NOTIFICATION_PREFERENCE SET stageWhatsapp = ?, stageEmail = ?, stageSms = ?, inboundWhatsapp = ?, inboundEmail = ?, digestWhatsapp = ?, digestEmail = ? WHERE user_id = ?',
      [
        prefsData.stageWhatsapp !== undefined ? (prefsData.stageWhatsapp ? 1 : 0) : (prev.stageWhatsapp ? 1 : 0),
        prefsData.stageEmail !== undefined ? (prefsData.stageEmail ? 1 : 0) : (prev.stageEmail !== undefined ? (prev.stageEmail ? 1 : 0) : 1),
        stageSmsVal,
        prefsData.inboundWhatsapp !== undefined ? (prefsData.inboundWhatsapp ? 1 : 0) : (prev.inboundWhatsapp ? 1 : 0),
        prefsData.inboundEmail !== undefined ? (prefsData.inboundEmail ? 1 : 0) : (prev.inboundEmail !== undefined ? (prev.inboundEmail ? 1 : 0) : 1),
        prefsData.digestWhatsapp !== undefined ? (prefsData.digestWhatsapp ? 1 : 0) : (prev.digestWhatsapp ? 1 : 0),
        prefsData.digestEmail !== undefined ? (prefsData.digestEmail ? 1 : 0) : (prev.digestEmail !== undefined ? (prev.digestEmail ? 1 : 0) : 1),
        userId
      ]
    );
  } else {
    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();
    await db.query(
      'INSERT INTO NOTIFICATION_PREFERENCE (id, user_id, stageWhatsapp, stageEmail, stageSms, inboundWhatsapp, inboundEmail, digestWhatsapp, digestEmail) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        userId,
        prefsData.stageWhatsapp ? 1 : 0,
        prefsData.stageEmail !== undefined ? (prefsData.stageEmail ? 1 : 0) : 1,
        stageSmsVal,
        prefsData.inboundWhatsapp ? 1 : 0,
        prefsData.inboundEmail !== undefined ? (prefsData.inboundEmail ? 1 : 0) : 1,
        prefsData.digestWhatsapp ? 1 : 0,
        prefsData.digestEmail !== undefined ? (prefsData.digestEmail ? 1 : 0) : 1
      ]
    );
  }
  return true;
}

/**
 * Check if a specific notification type is enabled for a user
 * Security-related emails (e.g. OTP, password reset, account verification) are NEVER checked or disabled by this.
 */
async function canSendNotification(userId, preferenceKey) {
  const prefs = await getUserPreferences(userId);
  return Boolean(prefs[preferenceKey]);
}

const canSendStageEmail = (userId) => canSendNotification(userId, 'stageEmail');
const canSendInboundEmail = (userId) => canSendNotification(userId, 'inboundEmail');
const canSendDigestEmail = (userId) => canSendNotification(userId, 'digestEmail');

module.exports = {
  DEFAULT_PREFERENCES,
  getUserPreferences,
  updateUserPreferences,
  canSendNotification,
  canSendStageEmail,
  canSendInboundEmail,
  canSendDigestEmail
};
