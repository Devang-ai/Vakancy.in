require('dotenv').config({ path: './.env' });
const axios = require('axios');
const jwt = require('jsonwebtoken');
const db = require('./config/db');

async function test() {
  await db.initDB();
  try {
    const { v4: uuidv4 } = require('uuid');
    const jId = uuidv4();
    await db.query("INSERT INTO JOB (id, employer_id, title, status, required_skills) VALUES (?, 'emp1', 'Test Job', 'published', '[\"Node.js\"]')", [jId]).catch(()=>null);
    
    const user = await db.query("SELECT id, email, role FROM USERS WHERE role='candidate' LIMIT 1");
    if (user.length === 0) {
      console.log('No candidate user found in real DB');
      process.exit(0);
    }
    const token = jwt.sign({ id: user[0].id, email: user[0].email, role: user[0].role }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1h' });
    const res = await axios.get('http://localhost:5000/api/candidates/me/dashboard', { headers: { Authorization: 'Bearer ' + token } });
    console.log('Success:', res.data);
  } catch (e) {
    console.error('Error:', e.response ? e.response.data : e.message);
  }
  process.exit(0);
}
test();
