const puppeteer = require('puppeteer-core');
const jwt = require('jsonwebtoken');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FRONTEND_URL = 'http://localhost:5173';
const JWT_SECRET = 'vakancy_super_secret_jwt_key_2026_recruitment_portal';

const employerUser = {
  id: 'usr-test-emp-01',
  email: 'employer@vakancy.com',
  role: 'employer',
  company_name: 'Apex Tech Solutions',
  is_onboarding_completed: 1
};

const employerToken = jwt.sign(employerUser, JWT_SECRET, { expiresIn: '4h' });

async function run() {
  console.log('Testing Employer Dashboard render...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', err => {
    pageErrors.push(err.message);
    console.error('Captured Page Error:', err.message);
  });

  await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((tok, usr) => {
    localStorage.setItem('token', tok);
    localStorage.setItem('user', JSON.stringify(usr));
    localStorage.setItem('profile', JSON.stringify({ is_onboarding_completed: 1, ...usr }));
  }, employerToken, employerUser);

  await page.goto(`${FRONTEND_URL}/recruiter`, { waitUntil: 'networkidle2' });

  console.log('Final URL:', page.url());
  console.log('Total Page Errors:', pageErrors.length);
  await browser.close();

  if (pageErrors.some(e => e.includes('Link is not defined'))) {
    console.log('>>> REPRODUCED BUG: ReferenceError: Link is not defined in EmployerFooter! <<<');
  } else {
    console.log('No Link is not defined error.');
  }
}

run().catch(console.error);

