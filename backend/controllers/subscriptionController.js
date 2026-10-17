const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

// List active subscription plans
const getPlans = async (req, res) => {
  try {
    const plans = await db.query('SELECT * FROM SUBSCRIPTION_PLAN WHERE is_active = 1 ORDER BY price ASC');
    res.json({ success: true, plans });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching plans.', error: error.message });
  }
};

// Create subscription plan (Admin)
const createPlan = async (req, res) => {
  try {
    const { name, price, unlock_limit, duration_days } = req.body;
    if (!name || price === undefined || !unlock_limit || !duration_days) {
      return res.status(400).json({ success: false, message: 'Name, price, unlock_limit, and duration_days are required.' });
    }

    const id = uuidv4();
    await db.query(
      'INSERT INTO SUBSCRIPTION_PLAN (id, name, price, unlock_limit, duration_days, is_active) VALUES (?, ?, ?, ?, ?, 1)',
      [id, name, price, unlock_limit, duration_days]
    );

    res.status(201).json({ success: true, message: 'Subscription plan created.', plan_id: id });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating plan.', error: error.message });
  }
};

// Unlock Candidate Contact Information for Employer
const unlockCandidate = async (req, res) => {
  try {
    const { candidate_id } = req.body;
    const userId = req.user.id;

    if (!candidate_id) {
      return res.status(400).json({ success: false, message: 'Candidate ID is required.' });
    }

    const emps = await db.query('SELECT id FROM EMPLOYERS WHERE user_id = ?', [userId]);
    if (emps.length === 0) return res.status(404).json({ success: false, message: 'Employer profile not found.' });
    const employerId = emps[0].id;

    // Check active employer subscription
    const subs = await db.query(
      'SELECT es.*, sp.unlock_limit FROM EMPLOYER_SUBSCRIPTION es JOIN SUBSCRIPTION_PLAN sp ON es.plan_id = sp.id WHERE es.employer_id = ? AND es.status = "active" AND es.end_date >= CURRENT_DATE()',
      [employerId]
    );

    if (subs.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Active subscription required to unlock candidate contact information. Please purchase a plan.'
      });
    }

    const activeSub = subs[0];

    // Check if candidate is already unlocked by this employer
    const existingUnlock = await db.query(
      'SELECT id FROM CANDIDATE_UNLOCK WHERE employer_id = ? AND candidate_id = ? AND expires_at > NOW()',
      [employerId, candidate_id]
    );

    if (existingUnlock.length > 0) {
      return res.json({ success: true, message: 'Candidate contact info is already unlocked.', unlock_id: existingUnlock[0].id });
    }

    // Check unlock quota
    const unlockCountRes = await db.query('SELECT COUNT(*) as count FROM CANDIDATE_UNLOCK WHERE subscription_id = ?', [activeSub.id]);
    const currentUnlocks = unlockCountRes.length > 0 ? unlockCountRes[0].count : 0;

    if (currentUnlocks >= activeSub.unlock_limit) {
      return res.status(403).json({
        success: false,
        message: 'Subscription unlock limit reached. Upgrade your subscription plan for additional candidate unlocks.'
      });
    }

    const id = uuidv4();
    // Expiry matches subscription end date or +30 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    const expiresStr = expiresAt.toISOString().slice(0, 19).replace('T', ' ');

    await db.query(
      'INSERT INTO CANDIDATE_UNLOCK (id, employer_id, candidate_id, subscription_id, unlocked_at, expires_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?)',
      [id, employerId, candidate_id, activeSub.id, expiresStr]
    );

    // Get candidate full unmasked details to return
    const cands = await db.query('SELECT user_id, name FROM CANDIDATES WHERE id = ?', [candidate_id]);
    let contactInfo = {};
    if (cands.length > 0) {
      const users = await db.query('SELECT email, phone FROM USERS WHERE id = ?', [cands[0].user_id]);
      if (users.length > 0) {
        contactInfo = { email: users[0].email, phone: users[0].phone };
      }
    }

    res.status(201).json({
      success: true,
      message: 'Candidate contact details unlocked successfully.',
      unlock_id: id,
      contact: contactInfo
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error unlocking candidate.', error: error.message });
  }
};

module.exports = {
  getPlans,
  createPlan,
  unlockCandidate
};
