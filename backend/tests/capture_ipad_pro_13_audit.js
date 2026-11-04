const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const { generateToken } = require('../config/jwt');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FRONTEND_URL = 'http://localhost:5173';
const OUTPUT_DIR = path.resolve(__dirname, '../../docs/screenshots/ipad_pro_13_audit');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
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

const IPAD_VIEWPORTS = [
  { name: 'ipad_pro_13_portrait', width: 1032, height: 1376 },
  { name: 'ipad_pro_13_landscape', width: 1376, height: 1032 }
];

const ROUTES = [
  { name: 'login', path: '/login', isPublic: true },
  { name: 'register', path: '/register?role=candidate', isPublic: true },
  { name: 'dashboard', path: '/candidate/dashboard' },
  { name: 'find_jobs', path: '/candidate/jobs' },
  { name: 'applications', path: '/candidate/applications' },
  { name: 'saved_jobs', path: '/candidate/saved' },
  { name: 'profile', path: '/candidate/profile' },
  { name: 'ai_builder', path: '/candidate/ai-builder' }
];

async function captureAudit() {
  console.log('--- CAPTURING IPAD PRO 13-INCH SCREENSHOTS ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'domcontentloaded' });

  for (const vp of IPAD_VIEWPORTS) {
    console.log(`\nTesting ${vp.name} (${vp.width}x${vp.height})...`);
    await page.setViewport({ width: vp.width, height: vp.height });

    for (const r of ROUTES) {
      if (r.isPublic) {
        await page.evaluate(() => localStorage.clear());
      } else {
        await page.evaluate((tok, usr) => {
          localStorage.setItem('token', tok);
          localStorage.setItem('user', JSON.stringify(usr));
        }, candidateToken, candidateUser);
      }

      await page.goto(`${FRONTEND_URL}${r.path}`, { waitUntil: 'networkidle2' });
      await new Promise(res => setTimeout(res, 500));

      const overflow = await page.evaluate(() => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          hasOverflow: document.documentElement.scrollWidth > window.innerWidth
        };
      });

      const ssPath = path.join(OUTPUT_DIR, `${vp.name}_${r.name}.png`);
      await page.screenshot({ path: ssPath, fullPage: false });
      console.log(`  [${r.name.padEnd(14)}] ${overflow.hasOverflow ? 'OVERFLOW!' : 'OK'} (doc: ${overflow.scrollWidth}px, win: ${overflow.innerWidth}px) -> ${path.basename(ssPath)}`);
    }
  }

  await browser.close();
  console.log('\n--- IPAD PRO 13-INCH CAPTURE COMPLETE ---');
}

captureAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
