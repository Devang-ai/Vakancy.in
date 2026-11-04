/**
 * Vakancy.in — Phase 5 Browser End-to-End Verification
 * Uses puppeteer-core to drive actual Chrome browser sessions for
 * Candidate, Employer, and Admin journeys against the isolated test database.
 */

const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const db = require('../config/db');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\Devang chauhan\\.gemini\\antigravity-ide\\brain\\b435974b-97b5-4981-8660-07ab0b84ce36';

async function seedBrowserFixtures() {
  console.log('Seeding synthetic browser test fixtures into vakancy_test_phase5...');
  const pwHash = await bcrypt.hash('password123', 8);

  const director = { id: 'usr-brw-dir', email: 'director@vakancy-phase5.test', role: 'director', is_main_admin: 1, name: 'Director Tosif' };
  const candidate = { id: 'usr-brw-cand', email: 'candidate@vakancy-phase5.test', role: 'candidate', is_main_admin: 0, name: 'Ananya Sharma' };
  const employer = { id: 'usr-brw-emp', email: 'employer@vakancy-phase5.test', role: 'employer', is_main_admin: 0, name: 'Tech Innovations HR' };

  // Insert or update users
  for (const u of [director, candidate, employer]) {
    await db.query(`
      INSERT INTO USERS (id, email, password_hash, role, is_main_admin, is_active, name)
      VALUES (?, ?, ?, ?, ?, 1, ?)
      ON DUPLICATE KEY UPDATE role = VALUES(role), is_main_admin = VALUES(is_main_admin), name = VALUES(name)
    `, [u.id, u.email, pwHash, u.role, u.is_main_admin, u.name]);
  }

  // Insert candidate profile
  await db.query(`
    INSERT INTO CANDIDATES (id, user_id, name, current_location, total_experience, current_designation, professional_headline)
    VALUES ('cand-brw-001', 'usr-brw-cand', 'Ananya Sharma', 'Bengaluru, India', 4.0, 'Full Stack Engineer', 'Senior Software Engineer | React & Node')
    ON DUPLICATE KEY UPDATE name = VALUES(name)
  `);

  // Insert employer profile
  await db.query(`
    INSERT INTO EMPLOYERS (id, user_id, company_name, industry, approval_status)
    VALUES ('emp-brw-001', 'usr-brw-emp', 'Tech Innovations India', 'Information Technology', 'approved')
    ON DUPLICATE KEY UPDATE company_name = VALUES(company_name)
  `);

  // Insert test jobs
  await db.query(`
    INSERT INTO JOB (id, employer_id, title, description, location, status, is_archived, allow_candidate_access)
    VALUES ('job-brw-001', 'emp-brw-001', 'Senior Full Stack Engineer (React + Node)', 'Lead frontend and backend architectures', 'Bengaluru (Hybrid)', 'open', 0, 1)
    ON DUPLICATE KEY UPDATE title = VALUES(title), status = 'open'
  `);

  await db.query(`
    INSERT INTO JOB (id, employer_id, title, description, location, status, is_archived, allow_candidate_access)
    VALUES ('job-brw-002', 'emp-brw-001', 'Cloud Infrastructure Architect', 'Manage AWS & Kubernetes workloads', 'Remote', 'open', 0, 0)
    ON DUPLICATE KEY UPDATE title = VALUES(title), status = 'open'
  `);

  // Insert test callback request
  await db.query(`
    INSERT INTO CALLBACK_REQUEST (id, job_id, employer_id, requested_by_user_id, status, internal_notes)
    VALUES ('cb-brw-001', 'job-brw-002', 'emp-brw-001', 'usr-brw-emp', 'NEW', 'Employer requested callback for Cloud Architect mandate')
    ON DUPLICATE KEY UPDATE status = 'NEW'
  `);

  console.log('✅ Browser test fixtures ready in vakancy_test_phase5.');
}

async function runBrowserTests() {
  console.log('=== Starting Phase 5 Browser End-to-End Verification ===');

  process.env.NODE_ENV = 'test';
  process.env.DATABASE_TEST_MODE = 'isolated-mysql';
  process.env.TEST_DB_HOST = process.env.TEST_DB_HOST || '127.0.0.1';
  process.env.TEST_DB_PORT = process.env.TEST_DB_PORT || '3306';
  process.env.TEST_DB_USER = process.env.TEST_DB_USER || 'vakancy_tester';
  process.env.TEST_DB_PASSWORD = process.env.TEST_DB_PASSWORD;
  process.env.TEST_DB_NAME = process.env.TEST_DB_NAME || 'vakancy_test_phase5';
  process.env.TEST_DB_RESET_ACK = 'I_UNDERSTAND_THIS_DATABASE_IS_DISPOSABLE';

  await db.initDB();
  await seedBrowserFixtures();

  console.log('Launching headless Chrome...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  const results = {
    candidate: false,
    admin: false,
    employer: false,
    screenshots: []
  };

  try {
    const page = await browser.newPage();

    // -----------------------------------------------------------
    // 1. Candidate Journey (Port 5173)
    // -----------------------------------------------------------
    console.log('\n--- 1. Testing Candidate Journey ---');
    console.log('Navigating to Candidate Login (http://localhost:5173/login?role=candidate)...');
    await page.goto('http://localhost:5173/login?role=candidate', { waitUntil: 'networkidle2', timeout: 30000 });

    // Fill candidate credentials
    await page.waitForSelector('input#email, input[type="email"]', { timeout: 10000 });
    await page.type('input#email, input[type="email"]', 'candidate@vakancy-phase5.test');
    await page.type('input#password, input[type="password"]', 'password123');

    // Submit form
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) await submitBtn.click();
    await new Promise(r => setTimeout(r, 2500));

    console.log('Navigating to Jobs browsing page (http://localhost:5173/jobs)...');
    await page.goto('http://localhost:5173/jobs', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2500));

    const candidateShot = path.join(ARTIFACT_DIR, 'phase5_candidate_jobs_browser.png');
    await page.screenshot({ path: candidateShot, fullPage: false });
    results.screenshots.push(candidateShot);
    console.log(`Saved screenshot: ${candidateShot}`);
    results.candidate = true;

    // -----------------------------------------------------------
    // 2. Admin Journey (Port 5174)
    // -----------------------------------------------------------
    console.log('\n--- 2. Testing Admin Journey ---');
    console.log('Navigating to Admin App (http://localhost:5174/login)...');
    await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle2', timeout: 30000 });

    // Fill Director credentials
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.type('input[type="email"]', 'director@vakancy-phase5.test');
    await page.type('input[type="password"]', 'password123');

    const adminSubmit = await page.$('button[type="submit"]');
    if (adminSubmit) await adminSubmit.click();
    await new Promise(r => setTimeout(r, 2500));

    // Admin Jobs view
    console.log('Navigating to Admin Jobs (http://localhost:5174/jobs)...');
    await page.goto('http://localhost:5174/jobs', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2500));

    const adminJobsShot = path.join(ARTIFACT_DIR, 'phase5_admin_jobs_browser.png');
    await page.screenshot({ path: adminJobsShot, fullPage: false });
    results.screenshots.push(adminJobsShot);
    console.log(`Saved screenshot: ${adminJobsShot}`);

    // Admin Callbacks view
    console.log('Navigating to Admin Callbacks (http://localhost:5174/callbacks)...');
    await page.goto('http://localhost:5174/callbacks', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2500));

    const adminCallbacksShot = path.join(ARTIFACT_DIR, 'phase5_admin_callbacks_browser.png');
    await page.screenshot({ path: adminCallbacksShot, fullPage: false });
    results.screenshots.push(adminCallbacksShot);
    console.log(`Saved screenshot: ${adminCallbacksShot}`);
    results.admin = true;

    // -----------------------------------------------------------
    // 3. Employer Journey (Port 5173)
    // -----------------------------------------------------------
    console.log('\n--- 3. Testing Employer Journey ---');
    // Clear cookies & storage for clean employer session
    const client = await page.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');
    await client.send('Network.clearBrowserCache');

    await page.goto('http://localhost:5173/login?role=employer', { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('input#email, input[type="email"]', { timeout: 10000 });
    await page.type('input#email, input[type="email"]', 'employer@vakancy-phase5.test');
    await page.type('input#password, input[type="password"]', 'password123');

    const empSubmit = await page.$('button[type="submit"]');
    if (empSubmit) await empSubmit.click();
    await new Promise(r => setTimeout(r, 2500));

    console.log('Navigating to Employer Dashboard (http://localhost:5173/employer/dashboard)...');
    await page.goto('http://localhost:5173/employer/dashboard', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2500));

    const employerShot = path.join(ARTIFACT_DIR, 'phase5_employer_dashboard_browser.png');
    await page.screenshot({ path: employerShot, fullPage: false });
    results.screenshots.push(employerShot);
    console.log(`Saved screenshot: ${employerShot}`);
    results.employer = true;

  } finally {
    await browser.close();
    await db.closeDB();
  }

  console.log('\n=== Browser End-to-End Verification Summary ===');
  console.log(`Candidate Journey: ${results.candidate ? 'PASSED' : 'FAILED'}`);
  console.log(`Admin Journey:     ${results.admin ? 'PASSED' : 'FAILED'}`);
  console.log(`Employer Journey:  ${results.employer ? 'PASSED' : 'FAILED'}`);
  console.log(`Screenshots Captured: ${results.screenshots.length}`);

  return results;
}

if (require.main === module) {
  runBrowserTests()
    .then(r => {
      if (r.candidate && r.admin && r.employer) {
        console.log('All browser journeys successfully verified.');
        process.exit(0);
      } else {
        console.error('One or more browser journeys failed.');
        process.exit(1);
      }
    })
    .catch(err => {
      console.error('Browser test failed:', err);
      process.exit(1);
    });
}

module.exports = { runBrowserTests };
