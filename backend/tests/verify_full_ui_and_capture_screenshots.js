const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const { generateToken } = require('../config/jwt');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FRONTEND_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = path.resolve(__dirname, '../../docs/screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const candidateUser = {
  id: 'c46fdf97-98b1-409a-85f8-d1447821923a',
  email: 'princysheth185@gmail.com',
  role: 'candidate',
  name: 'Princy Sheth',
  token_version: 2,
  is_onboarding_completed: 1
};

const employerUser = {
  id: 'usr-test-emp-01',
  email: 'employer@vakancy.com',
  role: 'employer',
  company_name: 'Apex Tech Solutions',
  token_version: 0,
  is_onboarding_completed: 1
};

const candidateToken = generateToken(candidateUser);
const employerToken = generateToken(employerUser);

const VIEWPORTS = [
  { name: 'mobile-small', width: 320, height: 700 },
  { name: 'mobile-standard', width: 360, height: 800 },
  { name: 'mobile-modern', width: 390, height: 844 },
  { name: 'mobile-large', width: 430, height: 932 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop-laptop', width: 1366, height: 768 },
  { name: 'desktop-widescreen', width: 1440, height: 900 }
];

async function runVerification() {
  console.log('Starting Complete UI Verification & Screenshot Capture...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
    console.error('Page Error Encountered:', err.message);
  });

  const testResults = [];

  async function checkPage(title, url, role = 'guest', viewportsToTest = VIEWPORTS) {
    console.log(`\nTesting [${title}] at ${url} (role: ${role})...`);
    
    // Set authentication state
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'domcontentloaded' });
    if (role === 'candidate') {
      await page.evaluate((tok, usr) => {
        localStorage.setItem('token', tok);
        localStorage.setItem('user', JSON.stringify(usr));
        localStorage.setItem('profile', JSON.stringify({ is_onboarding_completed: 1, ...usr }));
      }, candidateToken, candidateUser);
    } else if (role === 'employer') {
      await page.evaluate((tok, usr) => {
        localStorage.setItem('token', tok);
        localStorage.setItem('user', JSON.stringify(usr));
        localStorage.setItem('profile', JSON.stringify({ is_onboarding_completed: 1, ...usr }));
      }, employerToken, employerUser);
    } else {
      await page.evaluate(() => {
        localStorage.clear();
      });
    }

    for (const vp of viewportsToTest) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto(`${FRONTEND_URL}${url}`, { waitUntil: 'networkidle2', timeout: 15000 }).catch(e => {
        console.warn(`Timeout waiting for networkidle on ${url}, continuing...`);
      });

      // Allow animations to settle
      await new Promise(r => setTimeout(r, 600));

      // 1. Horizontal overflow check
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      // 2. Unprofessional content checks on public pages
      let forbiddenContentFound = [];
      if (role === 'guest') {
        const textContent = await page.evaluate(() => document.body.innerText);
        if (textContent.includes('All Systems Operational')) forbiddenContentFound.push('All Systems Operational');
        if (textContent.includes('ISO 9001:2015')) forbiddenContentFound.push('ISO 9001:2015');
        if (textContent.includes('Verified Agency')) forbiddenContentFound.push('Verified Agency');
      }

      // 3. Screenshot
      const screenshotFilename = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${vp.name}.png`;
      const screenshotPath = path.join(SCREENSHOT_DIR, screenshotFilename);
      await page.screenshot({ path: screenshotPath, fullPage: false });

      testResults.push({
        page: title,
        url,
        role,
        viewport: vp.name,
        width: vp.width,
        height: vp.height,
        hasHorizontalOverflow: overflow,
        forbiddenContentFound,
        screenshot: screenshotFilename
      });

      if (overflow) {
        console.error(`  [FAIL] Horizontal overflow detected on ${title} (${vp.name} ${vp.width}x${vp.height})!`);
      } else {
        console.log(`  [PASS] ${title} (${vp.name}): No overflow. Screenshot saved.`);
      }

      if (forbiddenContentFound.length > 0) {
        console.error(`  [FAIL] Forbidden marketing badge found: ${forbiddenContentFound.join(', ')}`);
      }
    }
  }

  try {
    // 1. PUBLIC GUEST PAGES
    await checkPage('Guest_Home', '/');
    await checkPage('Guest_Jobs', '/jobs');
    await checkPage('Guest_ForEmployers', '/for-employers');
    await checkPage('Guest_ExecutiveSearch', '/executive-search');
    await checkPage('Guest_AboutUs', '/about-us');
    await checkPage('Guest_PrivacyPolicy', '/privacy-policy');

    // Test /pricing redirection
    console.log('\nTesting /pricing redirection...');
    await page.goto(`${FRONTEND_URL}/pricing`, { waitUntil: 'networkidle2' });
    const pricingRedirectUrl = page.url();
    console.log('Redirect destination for /pricing:', pricingRedirectUrl);
    if (pricingRedirectUrl.includes('/for-employers')) {
      console.log('  [PASS] /pricing redirected cleanly to /for-employers');
    } else {
      console.error('  [FAIL] /pricing did not redirect to /for-employers, reached:', pricingRedirectUrl);
    }

    // 2. CANDIDATE PORTAL PAGES
    await checkPage('Candidate_Dashboard', '/candidate/dashboard', 'candidate');
    await checkPage('Candidate_FindJobs', '/candidate/jobs', 'candidate');
    await checkPage('Candidate_SavedJobs', '/candidate/saved', 'candidate');
    await checkPage('Candidate_Applications', '/candidate/applications', 'candidate');
    await checkPage('Candidate_Profile', '/candidate/profile', 'candidate');
    await checkPage('Candidate_AIResumeBuilder', '/candidate/ai-builder', 'candidate');
    await checkPage('Candidate_Settings', '/candidate/settings', 'candidate');

    // Candidate Job Details with dynamic job lookup
    console.log('\nTesting Candidate Job Details page...');
    await page.goto(`${FRONTEND_URL}/candidate/jobs`, { waitUntil: 'networkidle2' });
    const firstJobId = await page.evaluate(() => {
      const link = document.querySelector('a[href^="/candidate/jobs/"]');
      if (link) {
        const parts = link.getAttribute('href').split('/');
        return parts[parts.length - 1];
      }
      return null;
    });

    if (firstJobId) {
      console.log('Found Job ID for Candidate Job Details test:', firstJobId);
      await checkPage('Candidate_JobDetails', `/candidate/jobs/${firstJobId}`, 'candidate');
    } else {
      console.log('No job link found on candidate jobs list, testing with sample id 1');
      await checkPage('Candidate_JobDetails', `/candidate/jobs/1`, 'candidate');
    }

    // 3. EMPLOYER PORTAL PAGES
    await checkPage('Employer_Dashboard', '/recruiter', 'employer');
    await checkPage('Employer_Jobs', '/recruiter/jobs', 'employer');
    await checkPage('Employer_CreateJob', '/recruiter/jobs/create', 'employer');
    await checkPage('Employer_CompanyProfile', '/recruiter/company', 'employer');

    // Summary
    console.log('\n=========================================');
    console.log('VERIFICATION SUMMARY');
    console.log('=========================================');
    console.log('Total Viewports Tested per Page:', VIEWPORTS.length);
    console.log('Total Screen Tests:', testResults.length);
    console.log('Runtime Page Errors:', pageErrors.length);
    if (pageErrors.length > 0) {
      console.error('Captured Errors:', pageErrors);
    }

    const overflowCount = testResults.filter(r => r.hasHorizontalOverflow).length;
    console.log('Horizontal Overflow Failures:', overflowCount);

    const forbiddenCount = testResults.filter(r => r.forbiddenContentFound.length > 0).length;
    console.log('Forbidden Content Failures:', forbiddenCount);

    // Save json test report
    fs.writeFileSync(
      path.join(SCREENSHOT_DIR, 'verification_results.json'),
      JSON.stringify({ testResults, pageErrors, summary: { total: testResults.length, overflowCount, forbiddenCount, errorCount: pageErrors.length } }, null, 2)
    );

    console.log(`Saved screenshot test report to docs/screenshots/verification_results.json`);

  } finally {
    await browser.close();
  }
}

runVerification().catch(err => {
  console.error('Fatal Verification Error:', err);
  process.exit(1);
});

