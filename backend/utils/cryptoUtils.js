const crypto = require('crypto');

// Secret key derived from APP_SECRET or fallback securely
const ENCRYPTION_SECRET = process.env.JWT_SECRET || process.env.APP_SECRET || 'vakancy_secure_encryption_key_2026';
const KEY = crypto.createHash('sha256').update(ENCRYPTION_SECRET).digest(); // 32 bytes

/**
 * Encrypt a string using AES-256-GCM
 * Output format: iv:authTag:ciphertext (hex)
 */
function encryptSecret(plaintext) {
  if (!plaintext) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  let encrypted = cipher.update(String(plaintext), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${tag}:${encrypted}`;
}

/**
 * Decrypt a string using AES-256-GCM
 */
function decryptSecret(encryptedPayload) {
  if (!encryptedPayload || typeof encryptedPayload !== 'string') return null;
  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) return null;

  try {
    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const ciphertext = parts[2];
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.warn('Decryption failed:', err.message);
    return null;
  }
}

/**
 * Generate SHA-256 hash for fast, constant-time lookup
 */
function hashSecret(secret) {
  if (!secret) return null;
  return crypto.createHash('sha256').update(String(secret).trim().toUpperCase()).digest('hex');
}

/**
 * Generate a friendly, secure access code (e.g. VK-8B39)
 */
function generateAccessCode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = 'VK-';
  const bytes = crypto.randomBytes(4);
  for (let i = 0; i < 4; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

/**
 * Verify access code against stored SHA-256 hash
 */
function verifyAccessCode(providedCode, expectedHash) {
  if (!providedCode || !expectedHash) return false;
  const providedHash = hashSecret(providedCode);
  return providedHash === expectedHash;
}

module.exports = {
  encryptSecret,
  decryptSecret,
  hashSecret,
  generateAccessCode,
  verifyAccessCode,
  encryptAccessCode: encryptSecret,
  decryptAccessCode: decryptSecret,
  hashAccessCode: hashSecret
};
