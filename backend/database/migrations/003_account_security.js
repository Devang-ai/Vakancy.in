async function hasColumn(connection, table, column) {
  const [rows] = await connection.query(
    'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1',
    [table, column]
  );
  return rows.length > 0;
}

module.exports = {
  id: '003_account_security',
  description: 'Add hashed password-reset tokens and JWT revocation generation',
  async up(connection) {
    if (!await hasColumn(connection, 'USERS', 'reset_token_hash')) {
      await connection.query('ALTER TABLE USERS ADD COLUMN reset_token_hash CHAR(64) NULL');
    }
    if (!await hasColumn(connection, 'USERS', 'reset_token_expires')) {
      await connection.query('ALTER TABLE USERS ADD COLUMN reset_token_expires DATETIME NULL');
    }
    if (!await hasColumn(connection, 'USERS', 'token_version')) {
      await connection.query('ALTER TABLE USERS ADD COLUMN token_version INT NOT NULL DEFAULT 0');
    }
    if (!await hasColumn(connection, 'USERS', 'password_changed_at')) {
      await connection.query('ALTER TABLE USERS ADD COLUMN password_changed_at DATETIME NULL');
    }
    if (await hasColumn(connection, 'USERS', 'reset_token')) {
      await connection.query('UPDATE USERS SET reset_token = NULL WHERE reset_token IS NOT NULL');
    }
  }
};
