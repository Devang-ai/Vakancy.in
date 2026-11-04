module.exports = {
  id: '013_executive_share_verification_and_support_email',
  description: 'Add recipient emails and verification for shortlist shares, OTP verification table, and canonical support email',
  async up(connection) {
    // 1. Add recipient email and verification columns to EXECUTIVE_SEARCH_SHARE
    try {
      await connection.query("ALTER TABLE `EXECUTIVE_SEARCH_SHARE` ADD COLUMN `recipient_email` VARCHAR(255) NULL AFTER `employer_id`");
    } catch (_) {}
    try {
      await connection.query("ALTER TABLE `EXECUTIVE_SEARCH_SHARE` ADD COLUMN `additional_recipient_emails` TEXT NULL AFTER `recipient_email`");
    } catch (_) {}
    try {
      await connection.query("ALTER TABLE `EXECUTIVE_SEARCH_SHARE` ADD COLUMN `custom_message` TEXT NULL AFTER `title`");
    } catch (_) {}
    try {
      await connection.query("ALTER TABLE `EXECUTIVE_SEARCH_SHARE` ADD COLUMN `require_verification` TINYINT(1) DEFAULT 0 AFTER `require_employer_auth`");
    } catch (_) {}

    // 2. Table for external employer verification and OTP
    await connection.query(`
      CREATE TABLE IF NOT EXISTS EXECUTIVE_SHARE_VERIFICATION (
        id VARCHAR(36) PRIMARY KEY,
        share_id VARCHAR(36) NOT NULL,
        email VARCHAR(255) NOT NULL,
        otp_hash CHAR(64) NOT NULL,
        verification_token VARCHAR(64) NULL,
        attempts INT DEFAULT 0,
        is_verified TINYINT(1) DEFAULT 0,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_esv_share (share_id),
        INDEX idx_esv_email (email),
        INDEX idx_esv_token (verification_token)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 3. Centralize canonical support email in platform_setting
    try {
      await connection.query(
        "UPDATE `platform_setting` SET `setting_value` = 'support@vakancy.in' WHERE `setting_key` = 'support_email'"
      );
    } catch (_) {}
  }
};
