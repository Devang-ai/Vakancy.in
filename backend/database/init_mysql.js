const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const initMySQL = async () => {
  let conn;
  try {
    console.log('Starting MySQL initialization...');
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });

    console.log(`Connected to MySQL server on ${process.env.DB_HOST || '127.0.0.1'}:${process.env.DB_PORT || 3306}.`);

    const dbName = process.env.DB_NAME || 'vakancy_main_db';
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await conn.query(`USE \`${dbName}\``);
    console.log(`Database \`${dbName}\` selected.`);

    await conn.query('SET FOREIGN_KEY_CHECKS = 0');

    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      const statements = schemaSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 5);

      for (const stmt of statements) {
        try {
          await conn.query(stmt);
        } catch (err) {
          console.warn('Schema statement notice:', err.message);
        }
      }
      console.log('Schema tables created/verified successfully.');
    }

    const seedPath = path.join(__dirname, 'seed.sql');
    if (fs.existsSync(seedPath)) {
      const seedSql = fs.readFileSync(seedPath, 'utf8');
      const seedStmts = seedSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 5);

      for (const stmt of seedStmts) {
        try {
          await conn.query(stmt);
        } catch (err) {
          if (!err.message.includes('Duplicate entry')) {
            console.warn('Seed statement notice:', err.message);
          }
        }
      }
      console.log('Seed data inserted/verified successfully.');
    }

    const [tables] = await conn.query(`SHOW TABLES FROM \`${dbName}\``);
    console.log(`Total tables in \`${dbName}\`:`, tables.length);
    console.log('Tables:', tables.map(t => Object.values(t)[0]));

    await conn.end();
    console.log('MySQL initialization completed successfully.');
    return true;
  } catch (error) {
    console.error('MySQL initialization error:', error);
    if (conn) await conn.end();
    throw error;
  }
};

if (require.main === module) {
  initMySQL()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = initMySQL;
