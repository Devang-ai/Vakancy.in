require('dotenv').config();
const db = require('./config/db');

async function checkJobSchema() {
  await db.initDB();
  const cols = await db.query('DESCRIBE JOB');
  console.log('JOB Table Columns:');
  cols.forEach(c => console.log(`  - ${c.Field} (${c.Type})`));
  process.exit(0);
}

checkJobSchema().catch(e => { console.error(e); process.exit(1); });
