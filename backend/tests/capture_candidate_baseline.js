const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const { generateToken } = require('../config/jwt');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FRONTEND_URL = 'http://localhost:5173';
const BASELINE_DIR = path.resolve(__dirname, '../../docs/screenshots/candidate_baseline');

if (!fs.existsSync(BASELINE_DIR)) {
  fs.mkdirSync(BASELINE_DIR, { recursive: true });
}

// Test candidate user (Meet Soni)
const candidateUser = {
  id: '85d519ba-7084-440c-aa3f-a53334538c7e',
  email: 'meet@scan2serve.com',
  role: 'candidate',
  name: 'Meet Soni',
  token_version: 0,
  is_onboarding_completed: 1
};
const candidateToken = generateToken(candidateUser);

const ROUTES = [
  { name: 'dashboard', path: '/candidate/dashboard' },
  { name: 'find_jobs', path: '/candidate/jobs' },
  { name: 'applications', path: '/candidate/applications' },
  { name: 'saved_jobs', path: '/candidate/saved' },
  { name: 'profile', path: '/candidate/profile' },
  { name: 'ai_builder', path: '/candidate/ai-builder' }
];

const VIEWPORTS = [
  { name: 'desktop_1440', width: 1440, height: 900 },
  { name: 'tablet_820', width: 820, height: 1180 },
  { name: 'mobile_390', width: 390, height: 844 }
];

async function captureBaseline() {
  console.log('--- CAPTURING CANDIDATE PORTAL BASELINE ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // 1. Authenticate candidate in localStorage
  await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((tok, usr) => {
    localStorage.setItem('token', tok);
    localStorage.setItem('user', JSON.stringify(usr));
  }, candidateToken, candidateUser);

  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height });
    console.log(`\nViewport: ${vp.name} (${vp.width}x${vp.height})`);

    for (const r of ROUTES) {
      const url = `${FRONTEND_URL}${r.path}`;
      await page.goto(url, { waitUntil: 'networkidle2' });
      await new Promise(res => setTimeout(res, 500));

      const ssPath = path.join(BASELINE_DIR, `${vp.name}_${r.name}.png`);
      await page.screenshot({ path: ssPath, fullPage: false });
      console.log(`Saved baseline: ${vp.name}_${r.name}.png`);
    }
  }

  // Also capture Login & Register at mobile
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.setViewport({ width: 390, height: 844 });
  await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle2' });
  await page.screenshot({ path: path.join(BASELINE_DIR, 'mobile_390_login.png') });
  await page.goto(`${FRONTEND_URL}/register?role=candidate`, { waitUntil: 'networkidle2' });
  await page.screenshot({ path: path.join(BASELINE_DIR, 'mobile_390_register.png') });

  await browser.close();
  console.log('--- BASELINE CAPTURE COMPLETE ---');
}

captureBaseline().catch(err => {
  console.error('Error capturing baseline:', err);
  process.exit(1);
});

