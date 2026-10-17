const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function checkSchema() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vakancy_main_db'
  });
  
  const [rows] = await db.query('DESCRIBE CANDIDATE_RESUME');
  console.log(rows);
  
  process.exit(0);
}
checkSchema();
