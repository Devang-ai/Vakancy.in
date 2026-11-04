const db = require('../config/db');

async function inspectResumeTables() {
  await db.initDB();
  console.log('=== candidate_resume columns ===');
  try {
    const cols = await db.query('DESCRIBE candidate_resume');
    console.log(cols.map(c => `${c.Field} (${c.Type})`));
    const rows = await db.query('SELECT * FROM candidate_resume');
    console.log('candidate_resume rows:', rows);
  } catch (e) {
    console.log('candidate_resume error:', e.message);
  }

  console.log('\n=== resume columns ===');
  try {
    const cols = await db.query('DESCRIBE resume');
    console.log(cols.map(c => `${c.Field} (${c.Type})`));
    const rows = await db.query('SELECT * FROM resume');
    console.log('resume rows:', rows);
  } catch (e) {
    console.log('resume error:', e.message);
  }

  console.log('\n=== files columns ===');
  try {
    const cols = await db.query('DESCRIBE files');
    console.log(cols.map(c => `${c.Field} (${c.Type})`));
    const rows = await db.query('SELECT * FROM files');
    console.log('files rows count:', rows.length);
    if (rows.length > 0) console.log(rows);
  } catch (e) {
    console.log('files error:', e.message);
  }

  process.exit(0);
}

inspectResumeTables().catch(err => {
  console.error(err);
  process.exit(1);
});
