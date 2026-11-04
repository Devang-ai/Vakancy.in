const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const { generateToken } = require('../config/jwt');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FRONTEND_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = path.resolve(__dirname, '../../docs/screenshots/storyboard_after');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Test Users
const candidateUser = {
  id: '85d519ba-7084-440c-aa3f-a53334538c7e',
  email: 'meet@scan2serve.com',
  role: 'candidate',
  name: 'Meet Soni',
  token_version: 0,
  is_onboarding_completed: 1
};
const candidateToken = generateToken(candidateUser);

const employerUser = {
  id: 'usr-test-emp-01',
  email: 'employer@vakancy.com',
  role: 'employer',
  company_name: 'Apex Tech Solutions',
  token_version: 0,
  is_onboarding_completed: 1
};
const employerToken = generateToken(employerUser);

const VIEWPORTS = [
  { name: '320px', width: 320, height: 640 },
  { name: '360px', width: 360, height: 740 },
  { name: '390px', width: 390, height: 844 },
  { name: '430px', width: 430, height: 932 },
  { name: '768px', width: 768, height: 1024 },
  { name: '1440px', width: 1440, height: 900 }
];

const PAGES_TO_TEST = [
  // Guest
  { id: 'guest_home', path: '/', role: 'guest' },
  { id: 'guest_jobs', path: '/jobs', role: 'guest' },
  { id: 'guest_for_employers', path: '/for-employers', role: 'guest' },
  { id: 'guest_executive_search', path: '/executive-search', role: 'guest' },
  { id: 'guest_about', path: '/about', role: 'guest' },

  // Candidate
  { id: 'candidate_dashboard', path: '/candidate/dashboard', role: 'candidate' },
  { id: 'candidate_jobs', path: '/candidate/jobs', role: 'candidate' },
  { id: 'candidate_applications', path: '/candidate/applications', role: 'candidate' },
  { id: 'candidate_profile', path: '/candidate/profile', role: 'candidate' },
  { id: 'candidate_resume', path: '/candidate/ai-builder', role: 'candidate' },

  // Employer
  { id: 'employer_dashboard', path: '/recruiter', role: 'employer' },
  { id: 'employer_jobs', path: '/recruiter/jobs', role: 'employer' },
  { id: 'employer_create_job', path: '/recruiter/jobs/create', role: 'employer' },
  { id: 'employer_profile', path: '/recruiter/company-profile', role: 'employer' }
];

async function runVerification() {
  console.log('🚀 Running Comprehensive Storyboard Mobile UI Verification & Screenshot Capture...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  const results = [];

  let currentAuth = null;
  const setAuth = async (role) => {
    if (currentAuth === role) return;
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'domcontentloaded' });
    if (role === 'candidate') {
      await page.evaluate((tok, usr) => {
        localStorage.clear();
        localStorage.setItem('token', tok);
        localStorage.setItem('user', JSON.stringify(usr));
      }, candidateToken, candidateUser);
    } else if (role === 'employer') {
      await page.evaluate((tok, usr) => {
        localStorage.clear();
        localStorage.setItem('token', tok);
        localStorage.setItem('user', JSON.stringify(usr));
      }, employerToken, employerUser);
    } else {
      await page.evaluate(() => localStorage.clear());
    }
    currentAuth = role;
  };

  for (const pageDef of PAGES_TO_TEST) {
    console.log(`\nTesting page [${pageDef.id}]: ${pageDef.path} (${pageDef.role})`);
    await setAuth(pageDef.role);

    for (const vp of VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto(`${FRONTEND_URL}${pageDef.path}`, { waitUntil: 'domcontentloaded' });
      await new Promise(r => setTimeout(r, 600));

      const overflow = await page.evaluate(() => {
        const scrollW = document.documentElement.scrollWidth;
        const clientW = window.innerWidth;
        return {
          scrollWidth: scrollW,
          clientWidth: clientW,
          hasOverflow: scrollW > clientW,
          overflowPx: Math.max(0, scrollW - clientW)
        };
      });

      const pass = !overflow.hasOverflow;
      results.push({
        page: pageDef.id,
        path: pageDef.path,
        role: pageDef.role,
        viewport: vp.name,
        width: vp.width,
        overflowPx: overflow.overflowPx,
        passed: pass
      });

      // Capture screenshot at 390px and 1440px
      if (vp.width === 390 || vp.width === 1440) {
        const shotFile = path.join(SCREENSHOT_DIR, `${pageDef.id}_${vp.name}.png`);
        await page.screenshot({ path: shotFile, fullPage: false });
      }

      const statusIcon = pass ? '✅' : '❌';
      console.log(`  ${statusIcon} ${vp.name.padEnd(8)}: scrollW=${overflow.scrollWidth}, clientW=${overflow.clientWidth}, overflow=${overflow.overflowPx}px`);
    }
  }

  await browser.close();

  // Save report JSON
  const summaryPath = path.resolve(__dirname, '../../docs/storyboard_mobile_test_results.json');
  fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2), 'utf8');

  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  console.log(`\n==================================================`);
  console.log(`📊 Storyboard Mobile Verification: ${passed}/${total} checks PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log(`📁 Screenshots saved to: docs/screenshots/storyboard_after/`);
  console.log(`📁 Test report saved to: docs/storyboard_mobile_test_results.json`);
  console.log(`==================================================\n`);
}

runVerification().catch(err => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});

