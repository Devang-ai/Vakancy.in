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
    const users = await db.query(
      'SELECT id, email, role, phone, is_main_admin, is_active, token_version, google_id, auth_provider, (password_hash IS NOT NULL) AS has_password, name, avatar_url FROM USERS WHERE id = ?',
      [decoded.id]
    );

    if (!users || users.length === 0 || !users[0].is_active || Number(decoded.tokenVersion || 0) !== Number(users[0].token_version || 0)) {
      return res.status(401).json({ success: false, message: 'Invalid token or inactive user account.' });
    }

    const u = users[0];
    u.has_password = Boolean(u.has_password);
    u.google_linked = Boolean(u.google_id);
    req.user = u;
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
    const users = await db.query(
      'SELECT id, email, role, phone, is_main_admin, is_active, token_version, google_id, auth_provider, (password_hash IS NOT NULL) AS has_password, name, avatar_url FROM USERS WHERE id = ?',
      [decoded.id]
    );

    if (users && users.length > 0 && users[0].is_active && Number(decoded.tokenVersion || 0) === Number(users[0].token_version || 0)) {
      const u = users[0];
      u.has_password = Boolean(u.has_password);
      u.google_linked = Boolean(u.google_id);
      req.user = u;
    }
    next();
  } catch (error) {
    // Non-blocking for optional auth
    next();
  }
};

module.exports = { authenticateToken, optionalAuthToken, protect: authenticateToken };
