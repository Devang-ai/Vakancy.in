require('dotenv').config();
const db = require('./config/db');

async function checkJobs() {
  const jobs = await db.query('SELECT id, title, job_domain, department, required_skills, description FROM JOB');
  console.log('Total Jobs in MySQL:', jobs.length);
  jobs.forEach((j, i) => {
    console.log(`[${i + 1}] ID: ${j.id} | Title: ${j.title} | Category: ${j.job_domain} | Department: ${j.department}`);
    console.log(`    Skills: ${j.required_skills}`);
  });
  process.exit(0);
}

checkJobs().catch(e => { console.error(e); process.exit(1); });
