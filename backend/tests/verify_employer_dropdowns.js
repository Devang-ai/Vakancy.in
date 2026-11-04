const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = path.resolve(__dirname, '..', 'docs', 'screenshots');

async function testEmployerCreateJob() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });

  // Inject employer session
  await page.evaluateOnNewDocument(() => {
    const employerUser = {
      id: 888,
      email: 'employer.test@vakancy.in',
      name: 'Tech Corp HR',
      role: 'employer',
      token: 'fake-jwt-token-employer'
    };
    localStorage.setItem('vakancy_user', JSON.stringify(employerUser));
    localStorage.setItem('vakancy_token', 'fake-jwt-token-employer');
  });

  console.log('Navigating to Employer Create Job at 390px...');
  await page.goto('http://localhost:5173/employer/create-job', { waitUntil: 'networkidle2', timeout: 20000 });
  await new Promise(r => setTimeout(r, 800));

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'employer_create_job_390px.png'), fullPage: false });
  console.log('Employer Create Job 390px screenshot captured.');

  // Test Skills Selector dropdown positioning
  const skillsInput = await page.$('input[placeholder*="skill" i]');
  if (skillsInput) {
    console.log('Found skills input, typing "React"...');
    await skillsInput.type('React');
    await new Promise(r => setTimeout(r, 400));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'employer_skills_dropdown_open_390px.png'), fullPage: false });
    console.log('Skills dropdown screenshot captured.');
  } else {
    console.log('Skills input not found directly on step 1 (might be multi-step form).');
  }

  await browser.close();
  console.log('Employer tests complete.');
}

testEmployerCreateJob().catch(err => {
  console.error('Employer test error:', err);
  process.exit(1);
});
