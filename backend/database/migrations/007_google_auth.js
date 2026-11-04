async function hasColumn(connection, table, column) {
  const [rows] = await connection.query(
    'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1',
    [table, column]
  );
  return rows.length > 0;
}

module.exports = {
  id: '007_google_auth',
  description: 'Add Google OAuth provider columns and nullable password support for Google sign-in',
  async up(connection) {
    // 1. Add google_id column (Google sub claim) with unique index
    if (!await hasColumn(connection, 'USERS', 'google_id')) {
      await connection.query('ALTER TABLE USERS ADD COLUMN google_id VARCHAR(255) NULL UNIQUE AFTER email');
    }

    // 2. Add auth_provider column ('local', 'google', 'google_linked')
    if (!await hasColumn(connection, 'USERS', 'auth_provider')) {
      await connection.query("ALTER TABLE USERS ADD COLUMN auth_provider VARCHAR(50) NOT NULL DEFAULT 'local' AFTER google_id");
    }

    // 3. Add google_email column (verified email from Google token)
    if (!await hasColumn(connection, 'USERS', 'google_email')) {
      await connection.query('ALTER TABLE USERS ADD COLUMN google_email VARCHAR(255) NULL AFTER auth_provider');
    }

    // 4. Add avatar_url column for Google profile picture
    if (!await hasColumn(connection, 'USERS', 'avatar_url')) {
      await connection.query('ALTER TABLE USERS ADD COLUMN avatar_url TEXT NULL AFTER google_email');
    }

    // 5. Safely modify password_hash to allow NULL for Google-authenticated users
    try {
      await connection.query('ALTER TABLE USERS MODIFY COLUMN password_hash VARCHAR(255) NULL');
    } catch (err) {
      console.warn('Notice modifying USERS.password_hash to nullable:', err.message);
    }
  }
};
