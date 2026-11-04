const { v4: uuidv4 } = require('uuid');

async function hasTable(connection, tableName) {
  const [rows] = await connection.query(
    'SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1',
    [tableName]
  );
  return rows.length > 0;
}

module.exports = {
  id: '008_email_otp_recovery',
  description: 'Create USER_OTP table for cryptographically secure email OTP password recovery and account security',
  async up(connection) {
    const tableExists = await hasTable(connection, 'USER_OTP');
    if (!tableExists) {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`USER_OTP\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`user_id\` VARCHAR(36) NULL,
          \`email\` VARCHAR(255) NOT NULL,
          \`otp_hash\` VARCHAR(128) NOT NULL,
          \`purpose\` VARCHAR(50) NOT NULL DEFAULT 'password_reset',
          \`attempts\` INT NOT NULL DEFAULT 0,
          \`expires_at\` DATETIME NOT NULL,
          \`resend_available_at\` DATETIME NOT NULL,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX \`idx_otp_email_purpose\` (\`email\`, \`purpose\`),
          INDEX \`idx_otp_user_purpose\` (\`user_id\`, \`purpose\`),
          INDEX \`idx_otp_expires\` (\`expires_at\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      console.log('✅ Created USER_OTP table for secure email OTP recovery.');
    }
  }
};
