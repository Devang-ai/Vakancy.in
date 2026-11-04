const axios = require('axios');
const db = require('../config/db');

async function test() {
  await db.initDB();
  const dirRes = await axios.post('http://localhost:5002/api/auth/login', {
    email: 'director@vakancy.com',
    password: 'password123'
  });
  const dirToken = dirRes.data.token;

  const [empJob] = await db.query("SELECT * FROM JOB WHERE created_by_type = 'EMPLOYER' AND employer_id IS NOT NULL LIMIT 1");
  console.log('empJob:', empJob.id, empJob.employer_id);

  // Clear callbacks for this job
  await db.query('DELETE FROM CALLBACK_REQUEST WHERE job_id = ?', [empJob.id]);

  // Create callback via employer endpoint
  const jwt = require('jsonwebtoken');
  const [uRow] = await db.query("SELECT * FROM USERS WHERE email = 'chauhandevang075@gmail.com'");
  const empToken = jwt.sign(
    { id: uRow.id, email: uRow.email, role: 'employer', name: uRow.name },
    process.env.JWT_SECRET || 'vakancy_super_secret_jwt_key_2026_recruitment_portal'
  );

  const cbRes = await axios.post(`http://localhost:5002/api/employers/jobs/${empJob.id}/callback`, {
    reason: 'Debug test',
    preferred_time: 'Now',
    contact_phone: '+91 9999988888'
  }, {
    headers: { Authorization: `Bearer ${empToken}` }
  });
  console.log('cbRes status:', cbRes.status, cbRes.data);

  const dbCbs = await db.query('SELECT * FROM CALLBACK_REQUEST WHERE job_id = ?', [empJob.id]);
  console.log('DB callbacks:', dbCbs);

  const adminCbs = await axios.get('http://localhost:5002/api/admin/callbacks', {
    headers: { Authorization: `Bearer ${dirToken}` }
  });
  console.log('adminCbs data:', adminCbs.data);

  // Clean up
  await db.query('DELETE FROM CALLBACK_REQUEST WHERE job_id = ?', [empJob.id]);
  process.exit(0);
}

test().catch(e => {
  console.error('Error:', e.response ? e.response.data : e.message);
  process.exit(1);
});
