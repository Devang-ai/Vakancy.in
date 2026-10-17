const jwt = require('jsonwebtoken');

// In production mode, require a strong, externally provided JWT_SECRET
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'vakancy_super_secret_jwt_key_2026_recruitment_portal' || process.env.JWT_SECRET.length < 32) {
    throw new Error('FATAL: A strong JWT_SECRET environment variable (minimum 32 characters) must be configured in production mode.');
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'vakancy_super_secret_jwt_key_2026_recruitment_portal';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

module.exports = {
  generateToken,
  verifyToken,
  JWT_SECRET
};
