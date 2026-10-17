const { verifyToken } = require('../config/jwt');
const db = require('../config/db');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Access denied. Authorization token required.' });
    }

    const decoded = verifyToken(token);
    const users = await db.query('SELECT id, email, role, phone, is_main_admin, is_active FROM USERS WHERE id = ?', [decoded.id]);

    if (!users || users.length === 0 || !users[0].is_active) {
      return res.status(401).json({ success: false, message: 'Invalid token or inactive user account.' });
    }

    req.user = users[0];
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.', error: error.message });
  }
};

const optionalAuthToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
      return next();
    }

    const decoded = verifyToken(token);
    const users = await db.query('SELECT id, email, role, phone, is_main_admin, is_active FROM USERS WHERE id = ?', [decoded.id]);

    if (users && users.length > 0 && users[0].is_active) {
      req.user = users[0];
    }
    next();
  } catch (error) {
    // Non-blocking for optional auth
    next();
  }
};

module.exports = { authenticateToken, optionalAuthToken, protect: authenticateToken };
