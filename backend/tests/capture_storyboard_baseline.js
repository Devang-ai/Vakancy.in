const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const { generateToken } = require('../config/jwt');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FRONTEND_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = path.resolve(__dirname, '../../docs/screenshots/storyboard_baseline');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Candidate User (Real populated candidate from MySQL: Meet Soni)
const candidateUser = {
  id: '85d519ba-7084-440c-aa3f-a53334538c7e',
  email: 'meet@scan2serve.com',
  role: 'candidate',
  name: 'Meet Soni',
  token_version: 0,
  is_onboarding_completed: 1
};
const candidateToken = generateToken(candidateUser);

// Employer User
const employerUser = {
  id: 'usr-test-emp-01',
  email: 'employer@vakancy.com',
  role: 'employer',
  company_name: 'Apex Tech Solutions',
  token_version: 0,
  is_onboarding_completed: 1
};
const employerToken = generateToken(employerUser);

async function captureBaseline() {
  console.log('📸 Capturing Storyboard Baseline Mobile Screenshots (390px)...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });

  const capture = async (name, url, setupFn) => {
    try {
      if (setupFn) await setupFn(page);
      await page.goto(`${FRONTEND_URL}${url}`, { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 1200));
      const shotPath = path.join(SCREENSHOT_DIR, `${name}_390px.png`);
      await page.screenshot({ path: shotPath, fullPage: false });
      console.log(`✅ Saved ${name}: ${shotPath}`);
    } catch (err) {
      console.error(`❌ Failed ${name}:`, err.message);
    }
  };

  try {
    // 1. Guest Screens
    console.log('\n--- Guest Screens ---');
    await capture('guest_home', '/', async (p) => {
      await p.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle2' });
      await p.evaluate(() => localStorage.clear());
    });
    await capture('guest_find_jobs', '/jobs');
    await capture('guest_for_employers', '/for-employers');
    await capture('guest_executive_search', '/executive-search');
    await capture('guest_about', '/about');

    // 2. Candidate Screens
    console.log('\n--- Candidate Screens ---');
    const authCandidate = async (p) => {
      await p.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle2' });
      await p.evaluate((tok, usr) => {
        localStorage.setItem('token', tok);
        localStorage.setItem('user', JSON.stringify(usr));
      }, candidateToken, candidateUser);
    };

    await capture('candidate_dashboard', '/candidate/dashboard', authCandidate);
    await capture('candidate_find_jobs', '/candidate/jobs');
    await capture('candidate_applications', '/candidate/applications');
    await capture('candidate_saved_jobs', '/candidate/saved-jobs');
    await capture('candidate_profile', '/candidate/profile');
    await capture('candidate_resume', '/candidate/resume-builder');

    // 3. Employer Screens
    console.log('\n--- Employer Screens ---');
    const authEmployer = async (p) => {
      await p.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle2' });
      await p.evaluate((tok, usr) => {
        localStorage.setItem('token', tok);
        localStorage.setItem('user', JSON.stringify(usr));
      }, employerToken, employerUser);
    };

    await capture('employer_dashboard', '/recruiter/dashboard', authEmployer);
    await capture('employer_jobs', '/recruiter/jobs');
    await capture('employer_create_job', '/recruiter/jobs/create');
    await capture('employer_company_profile', '/recruiter/company');

  } finally {
    await browser.close();
  }
}

captureBaseline();
