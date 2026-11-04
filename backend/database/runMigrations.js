const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables if running directly or needed
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();

const { getIsolatedTestConfig } = require('../config/testDatabaseSafety');
const { migrations, validateMigrationOrder } = require('./migrations');

function getAppConfig(env = process.env) {
  const host = env.DB_HOST || '127.0.0.1';
  const port = Number(env.DB_PORT || 3306);
  const user = env.DB_USER || 'root';
  const password = env.DB_PASSWORD || '';
  const database = env.DB_NAME || 'vakancy_main_db';

  return {
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 4,
    queueLimit: 0
  };
}

async function runMigrations(env = process.env, options = {}) {
  validateMigrationOrder();

  const isTestArg = process.argv.includes('--test');
  const isAppArg = process.argv.includes('--app');
  
  const isTestMode = options.target === 'test' || isTestArg || 
    (env.NODE_ENV === 'test' && env.DATABASE_TEST_MODE === 'isolated-mysql' && !isAppArg && options.target !== 'app');

  const config = isTestMode ? getIsolatedTestConfig(env) : getAppConfig(env);
  const targetLabel = isTestMode ? `isolated test database (${config.database})` : `application database (${config.database})`;

  const pool = mysql.createPool(config);
  const connection = await pool.getConnection();
  const appliedMigrations = [];

  try {
    await connection.query(`CREATE TABLE IF NOT EXISTS SCHEMA_MIGRATIONS (
      id VARCHAR(100) PRIMARY KEY, description VARCHAR(255) NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    for (const migration of migrations) {
      const [rows] = await connection.query('SELECT id FROM SCHEMA_MIGRATIONS WHERE id = ? LIMIT 1', [migration.id]);
      if (rows.length) continue;

      console.log(`[Migration] Applying ${migration.id} to ${targetLabel}...`);
      await migration.up(connection);
      await connection.query('INSERT INTO SCHEMA_MIGRATIONS (id, description) VALUES (?, ?)', [migration.id, migration.description]);
      appliedMigrations.push(migration.id);
      console.log(`[Migration] ✔ Successfully applied ${migration.id}: ${migration.description}`);
    }

    if (appliedMigrations.length === 0) {
      console.log(`[Migration] All ${migrations.length} migrations are already up to date on ${targetLabel}.`);
    } else {
      console.log(`[Migration] Successfully applied ${appliedMigrations.length} migration(s) to ${targetLabel}.`);
    }

    return { applied: appliedMigrations, total: migrations.length };
  } finally {
    connection.release();
    await pool.end();
  }
}

if (require.main === module) {
  runMigrations().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error(`Migration refused or failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { runMigrations };

