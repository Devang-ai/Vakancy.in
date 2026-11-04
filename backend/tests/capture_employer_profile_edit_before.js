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
  { name: '320px', width: 320, height: 700 },
  { name: '360px', width: 360, height: 800 },
  { name: '390px', width: 390, height: 844 },
  { name: '430px', width: 430, height: 932 },
  { name: '768px', width: 768, height: 1024 },
  { name: '1440px', width: 1440, height: 900 }
];

async function captureBeforeScreenshots() {
  console.log('🚀 Starting Employer Company Profile Edit UI: BEFORE Capture...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  for (const vp of VIEWPORTS) {
    console.log(`\nCapturing at ${vp.name} (${vp.width}x${vp.height})...`);
    await page.setViewport({ width: vp.width, height: vp.height });

    // Set auth token
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((tok, usr) => {
      localStorage.setItem('token', tok);
      localStorage.setItem('user', JSON.stringify(usr));
      localStorage.setItem('profile', JSON.stringify({ is_onboarding_completed: 1, ...usr }));
    }, employerToken, employerUser);

    // Navigate to company profile
    await page.goto(`${FRONTEND_URL}/recruiter/company`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 600));

    // Click "Edit Company Profile"
    const clicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const editBtn = btns.find(b => b.textContent.includes('Edit Company Profile') || b.textContent.includes('Edit'));
      if (editBtn) {
        editBtn.click();
        return true;
      }
      return false;
    });

    console.log(`Edit button clicked: ${clicked}`);
    await new Promise(r => setTimeout(r, 600));

    // Capture screenshot of the modal open
    const filename = `employer_company_profile_edit_before_${vp.name}.png`;
    const filepath = path.join(SCREENSHOT_DIR, filename);
    await page.screenshot({ path: filepath });
    console.log(`Saved screenshot: ${filename}`);

    // If mobile, also scroll down inside modal body and capture
    if (vp.width <= 430) {
      await page.evaluate(() => {
        const modalForm = document.querySelector('form.overflow-y-auto');
        if (modalForm) modalForm.scrollTop = 300;
      });
      await new Promise(r => setTimeout(r, 300));
      const scrollFilename = `employer_company_profile_edit_before_${vp.name}_scrolled.png`;
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, scrollFilename) });
      console.log(`Saved scrolled screenshot: ${scrollFilename}`);
    }
  }

  await browser.close();
  console.log('✅ BEFORE screenshots captured successfully.');
}

captureBeforeScreenshots().catch(err => {
  console.error('Error capturing before screenshots:', err);
  process.exit(1);
});
