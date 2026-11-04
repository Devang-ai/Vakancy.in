const db = require('../config/db');

async function inspectRecords() {
  await db.initDB();
  console.log('=== APPLICATION RECORDS ===');
  const apps = await db.query('SELECT * FROM APPLICATION');
  console.log(apps);

  if (apps.length > 0) {
    const candidateId = apps[0].candidate_id;
    console.log('\n=== CANDIDATE RECORD FOR ' + candidateId + ' ===');
    const candidates = await db.query('SELECT * FROM CANDIDATES WHERE id = ?', [candidateId]);
    console.log(candidates[0]);

    console.log('\n=== CANDIDATES TABLE STRUCTURE ===');
    const candCols = await db.query('DESCRIBE CANDIDATES');
    console.log(candCols.map(c => `${c.Field} (${c.Type})`));

    console.log('\n=== APPLICATION TABLE STRUCTURE ===');
    const appCols = await db.query('DESCRIBE APPLICATION');
    console.log(appCols.map(c => `${c.Field} (${c.Type})`));

    // Check all tables in DB
    const allTables = await db.query('SHOW TABLES');
    console.log('\n=== ALL TABLES IN DB ===');
    console.log(allTables.map(t => Object.values(t)[0]));

    // Check if RESUMES table exists
    try {
      const resumes = await db.query('SELECT * FROM RESUMES');
      console.log('\n=== RESUMES TABLE ENTRIES ===');
      console.log(resumes);
    } catch (e) {
      console.log('No RESUMES table:', e.message);
    }

    // Check candidate user
    const [user] = await db.query('SELECT * FROM USERS WHERE id = ?', [candidates[0].user_id]);
    console.log('\n=== USER RECORD ===');
    console.log({ id: user.id, email: user.email, name: user.name, role: user.role });
  }

  process.exit(0);
}

inspectRecords().catch(err => {
  console.error('Inspection error:', err);
  process.exit(1);
});
