const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vakancy_main_db'
  });

  console.log('--- DATABASE INTEGRITY AUDIT ---');

  // 1. Orphaned records
  const [orphanApps] = await conn.query(`
    SELECT COUNT(*) as c FROM APPLICATION a 
    LEFT JOIN JOB j ON a.job_id = j.id 
    LEFT JOIN CANDIDATES c ON a.candidate_id = c.id 
    WHERE j.id IS NULL OR c.id IS NULL
  `);
  console.log('Orphaned Applications:', orphanApps[0].c);

  const [orphanShares] = await conn.query(`
    SELECT COUNT(*) as c FROM CANDIDATE_SHARING cs 
    LEFT JOIN CANDIDATES c ON cs.candidate_id = c.id 
    WHERE c.id IS NULL
  `);
  console.log('Orphaned Candidate Shares:', orphanShares[0].c);

  // 2. Duplicate candidate emails
  const [dupCandEmails] = await conn.query(`
    SELECT u.email, COUNT(*) as c 
    FROM CANDIDATES c 
    JOIN USERS u ON c.user_id = u.id 
    GROUP BY u.email HAVING c > 1
  `);
  console.log('Duplicate Candidate Emails:', dupCandEmails.length);

  // 3. Hierarchy cycle / invalid reporting heads
  const [selfReporters] = await conn.query('SELECT id, email FROM USERS WHERE reporting_user_id = id');
  console.log('Self-reporting Users:', selfReporters.length);

  const [dirWithHead] = await conn.query("SELECT id, email FROM USERS WHERE role = 'director' AND reporting_user_id IS NOT NULL");
  console.log('Directors with Reporting Head:', dirWithHead.length);

  // 4. Role & Permissions Master consistency
  const [totalRoles] = await conn.query('SELECT COUNT(*) as c FROM ROLES');
  console.log('Total Roles in master:', totalRoles[0].c);

  const [totalPerms] = await conn.query('SELECT COUNT(*) as c FROM ROLE_PERMISSIONS');
  console.log('Total Role Permissions:', totalPerms[0].c);

  // 5. Activity log events
  const [totalActivities] = await conn.query('SELECT COUNT(*) as c FROM RECRUITMENT_ACTIVITY');
  console.log('Total Activity Log Events:', totalActivities[0].c);

  // 6. Job provenance
  const [jobProvenance] = await conn.query(`
    SELECT created_by_type, COUNT(*) as count 
    FROM JOB 
    GROUP BY created_by_type
  `);
  console.log('Job Provenance:', jobProvenance);

  await conn.end();
})();
