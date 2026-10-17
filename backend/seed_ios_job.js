require('dotenv').config();
const db = require('./config/db');

async function seedJob() {
  await db.initDB();
  const jobId = 'CB5FC95D-D744-4F58-85D1-D6C39F74197A';
  
  // Check if employer exists
  let emps = await db.query('SELECT id FROM EMPLOYERS LIMIT 1');
  let employerId;
  if (emps.length > 0) {
    employerId = emps[0].id;
  } else {
    // Check users
    let users = await db.query('SELECT id FROM USERS WHERE role = "employer" LIMIT 1');
    let userId;
    if (users.length > 0) {
      userId = users[0].id;
    } else {
      userId = 'test-user-id';
      await db.query('INSERT IGNORE INTO USERS (id, email, password_hash, role, is_email_verified) VALUES (?, "employer@test.com", "hash", "employer", 1)', [userId]);
    }
    employerId = 'test-employer-id';
    await db.query('INSERT IGNORE INTO EMPLOYERS (id, user_id, company_name) VALUES (?, ?, "TechCorp Solutions")', [employerId, userId]);
  }

  const skillsArr = JSON.stringify(['React Native', 'MySQL', 'Node.js', 'Express.js']);

  await db.query(
    `INSERT INTO JOB (
      id, employer_id, title, description, location, status,
      department, job_domain, employment_type, workplace_type,
      seniority_level, openings_count, min_experience, max_experience,
      required_skills
    ) VALUES (?, ?, 'IOS DEVELOPER', 'Role details and scope to be configured in Step 2.', 'Bengaluru, KA', 'draft', 'Mobile App Development', 'Mobile App Development', 'Full-time Permanent', 'On-site', 'Mid Level', 2, 2, 5, ?)
    ON DUPLICATE KEY UPDATE title = 'IOS DEVELOPER', job_domain = 'Mobile App Development', department = 'Mobile App Development', required_skills = ?`,
    [jobId, employerId, skillsArr, skillsArr]
  );

  console.log('✅ Successfully seeded iOS Developer job in MySQL DB with ID:', jobId);
  process.exit(0);
}

seedJob().catch(e => { console.error('Seed error:', e); process.exit(1); });
