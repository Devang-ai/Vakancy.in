const db = require('../config/db');

async function getDatabaseSnapshot() {
  await db.initDB();
  const dbInfo = await db.query('SELECT DATABASE() as db, @@hostname as host');
  
  const tables = [
    'USERS', 
    'JOB', 
    'APPLICATION', 
    'LEADS', 
    'EMPLOYER_ENQUIRY', 
    'CALLBACK_REQUEST', 
    'EMPLOYERS', 
    'CANDIDATES', 
    'USER_ASSIGNMENTS', 
    'RECRUITMENT_ACTIVITY'
  ];

  const counts = {};
  for (const t of tables) {
    const res = await db.query(`SELECT COUNT(*) as cnt FROM ${t}`);
    counts[t] = Number(res[0].cnt);
  }

  const staff = await db.query("SELECT id, email, name, role, is_active FROM USERS WHERE role NOT IN ('candidate', 'employer') ORDER BY created_at ASC");

  return {
    database: dbInfo[0].db,
    host: dbInfo[0].host,
    timestamp: new Date().toISOString(),
    counts,
    staff
  };
}

if (require.main === module) {
  getDatabaseSnapshot().then(snap => {
    console.log(JSON.stringify(snap, null, 2));
    process.exit(0);
  }).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { getDatabaseSnapshot };
