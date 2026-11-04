const puppeteer = require('puppeteer-core');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FRONTEND_URL = 'http://localhost:5173';
const JWT_SECRET = 'vakancy_super_secret_jwt_key_2026_recruitment_portal';
const SCREENSHOT_DIR = path.join(__dirname, '../../docs/screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function reproduceBug() {
  console.log('--- REPRODUCING CANDIDATE JOB DETAILS ROUTING BUG ---');
  
  const candidateToken = jwt.sign(
    { id: 'a73d8380-c2cc-46bf-bdd0-fb4eb91b6855', email: 'updesh.candidate@gmail.com', role: 'candidate' },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
  const candidateUser = {
    id: 'a73d8380-c2cc-46bf-bdd0-fb4eb91b6855',
    email: 'updesh.candidate@gmail.com',
    role: 'candidate',
    name: 'Updesh Candidate'
  };

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Authenticate candidate
  console.log('1. Setting candidate authentication...');
  await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((tok, usr) => {
    localStorage.setItem('token', tok);
    localStorage.setItem('user', JSON.stringify(usr));
  }, candidateToken, candidateUser);

  // 2. Visit Candidate Dashboard
  console.log('2. Visiting Candidate Dashboard (/candidate/dashboard)...');
  await page.goto(`${FRONTEND_URL}/candidate/dashboard`, { waitUntil: 'networkidle2' });
  const onDashboard = page.url().includes('/candidate/dashboard');
  console.log(`   On dashboard: ${onDashboard} (URL: ${page.url()})`);

  // 3. Navigate to Find Jobs
  console.log('3. Navigating to Candidate Find Jobs (/candidate/jobs)...');
  await page.goto(`${FRONTEND_URL}/candidate/jobs`, { waitUntil: 'networkidle2' });
  console.log(`   On find jobs: (URL: ${page.url()})`);

  // Wait for job cards to render
  await page.waitForSelector('article, .bg-white.rounded-2xl', { timeout: 10000 });
  
  // 4. Click first job card
  console.log('4. Clicking first job card...');
  const firstJobLink = await page.$('article a[href*="/jobs/"], .bg-white.rounded-2xl a[href*="/jobs/"]');
  if (!firstJobLink) {
    throw new Error('No job link found on /candidate/jobs');
  }
  
  const targetHref = await page.evaluate(el => el.getAttribute('href'), firstJobLink);
  console.log(`   Job link target href: ${targetHref}`);
  
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2' }),
    firstJobLink.click()
  ]);

  const afterClickUrl = page.url();
  console.log(`5. After click URL: ${afterClickUrl}`);

  // Check layout state
  const hasCandidateSidebar = await page.evaluate(() => {
    return !!document.querySelector('aside') || !!document.querySelector('nav a[href*="/candidate/dashboard"]');
  });
  const hasGuestNav = await page.evaluate(() => {
    return !!document.querySelector('header nav a[href="/for-employers"]') || !!document.querySelector('a[href="/login"]');
  });

  console.log(`   Has Candidate Sidebar: ${hasCandidateSidebar}`);
  console.log(`   Has Guest Navigation: ${hasGuestNav}`);

  // Capture screenshot of reproduced bug
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'reproduced_bug_guest_job_details.png') });
  console.log(`   Saved screenshot to docs/screenshots/reproduced_bug_guest_job_details.png`);

  await browser.close();

  if (afterClickUrl.includes('/jobs/') && !afterClickUrl.includes('/candidate/jobs/')) {
    console.log('\n>>> BUG SUCCESSFULLY REPRODUCED! <<<');
    console.log(`Candidate was navigating from /candidate/jobs to public guest URL: ${afterClickUrl}`);
    console.log(`Guest navigation visible: ${hasGuestNav}, Candidate sidebar visible: ${hasCandidateSidebar}`);
    return true;
  } else {
    console.log('\n>>> Bug not reproduced; target URL was candidate route: ' + afterClickUrl);
    return false;
  }
}

reproduceBug()
  .then(reproduced => {
    process.exit(reproduced ? 0 : 1);
  })
  .catch(err => {
    console.error('Error during reproduction test:', err);
    process.exit(2);
  });

