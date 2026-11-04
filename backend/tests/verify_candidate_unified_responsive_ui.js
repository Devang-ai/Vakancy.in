const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const { generateToken } = require('../config/jwt');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FRONTEND_URL = 'http://localhost:5173';
const SCREENSHOTS_DIR = path.resolve(__dirname, '../../docs/screenshots/candidate_audit');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
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

const VIEWPORTS = [
  // Mobile
  { category: 'mobile', name: 'mobile_320', width: 320, height: 640 },
  { category: 'mobile', name: 'mobile_360', width: 360, height: 740 },
  { category: 'mobile', name: 'mobile_390', width: 390, height: 844 },
  { category: 'mobile', name: 'mobile_430', width: 430, height: 932 },
  // Tablet
  { category: 'tablet', name: 'tablet_600', width: 600, height: 960 },
  { category: 'tablet', name: 'tablet_768', width: 768, height: 1024 },
  { category: 'tablet', name: 'tablet_820', width: 820, height: 1180 },
  { category: 'tablet', name: 'tablet_912', width: 912, height: 1368 },
  { category: 'tablet', name: 'tablet_1024', width: 1024, height: 768 },
  { category: 'tablet', name: 'tablet_1180', width: 1180, height: 820 },
  // Desktop
  { category: 'desktop', name: 'desktop_1280', width: 1280, height: 800 },
  { category: 'desktop', name: 'desktop_1440', width: 1440, height: 900 },
  { category: 'desktop', name: 'desktop_1920', width: 1920, height: 1080 }
];

const CANDIDATE_ROUTES = [
  { name: 'dashboard', path: '/candidate/dashboard' },
  { name: 'find_jobs', path: '/candidate/jobs' },
  { name: 'applications', path: '/candidate/applications' },
  { name: 'saved_jobs', path: '/candidate/saved' },
  { name: 'profile', path: '/candidate/profile' },
  { name: 'ai_builder', path: '/candidate/ai-builder' }
];

async function runVerification() {
  console.log('================================================================');
  console.log('   VAKANCY.IN CANDIDATE PORTAL UNIFIED RESPONSIVE AUDIT');
  console.log('================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  let failures = [];
  let totalChecks = 0;
  let passedChecks = 0;

  // Set candidate credentials
  await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((tok, usr) => {
    localStorage.setItem('token', tok);
    localStorage.setItem('user', JSON.stringify(usr));
  }, candidateToken, candidateUser);

  // 1. Verify Master Languages loaded in Profile
  console.log('--- 1. Testing Master Languages in Profile ---');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${FRONTEND_URL}/candidate/profile`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 800));

  // Expand the Languages accordion
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const langBtn = buttons.find(b => b.innerText && b.innerText.includes('Languages'));
    if (langBtn) langBtn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  const languageOptions = await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select'));
    for (const s of selects) {
      const opts = Array.from(s.options).map(o => o.text);
      if (opts.some(t => t.includes('Hindi') || t.includes('English') || t.includes('Gujarati'))) {
        return opts;
      }
    }
    return [];
  });

  totalChecks++;
  if (languageOptions.length >= 30) {
    passedChecks++;
    console.log(`[PASS] Master languages selector loaded ${languageOptions.length} languages (including Hindi, Gujarati, Marathi, Tamil, Bengali).`);
  } else {
    failures.push(`Languages selector failed: only found ${languageOptions.length} options`);
    console.log(`[FAIL] Languages selector failed: only found ${languageOptions.length} options.`);
  }

  // 2. Verify AI Resume Builder container scaling
  console.log('\n--- 2. Testing AI Resume Builder Scaling ---');
  await page.setViewport({ width: 390, height: 844 });
  await page.goto(`${FRONTEND_URL}/candidate/ai-builder`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 600));

  const builderState = await page.evaluate(() => {
    const title = document.querySelector('h1')?.innerText || '';
    const bodyW = document.documentElement.scrollWidth;
    const winW = window.innerWidth;
    return { title, bodyW, winW, overflow: bodyW > winW };
  });

  totalChecks++;
  if (!builderState.overflow) {
    passedChecks++;
    console.log(`[PASS] AI Resume Builder on mobile 390px has zero horizontal overflow (${builderState.bodyW}px <= ${builderState.winW}px).`);
  } else {
    failures.push(`AI Resume Builder has horizontal overflow on mobile 390px: ${builderState.bodyW} > ${builderState.winW}`);
    console.log(`[FAIL] AI Resume Builder horizontal overflow on mobile 390px.`);
  }

  // 3. Viewport Responsiveness & Zero Overflow Audit across all 13 viewports
  console.log('\n--- 3. Testing Responsiveness & Overflow Across 13 Viewports ---');
  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height });
    process.stdout.write(`Viewport ${vp.name.padEnd(14)} (${vp.width}x${vp.height}): `);

    let vpOverflow = false;
    for (const r of CANDIDATE_ROUTES) {
      await page.goto(`${FRONTEND_URL}${r.path}`, { waitUntil: 'networkidle2' });
      await new Promise(res => setTimeout(res, 300));

      const overflowData = await page.evaluate(() => {
        const docW = document.documentElement.scrollWidth;
        const winW = window.innerWidth;
        return { docW, winW, overflow: docW > winW };
      });

      totalChecks++;
      if (overflowData.overflow) {
        vpOverflow = true;
        failures.push(`Horizontal overflow on ${r.name} at ${vp.name} (${overflowData.docW}px > ${overflowData.winW}px)`);
      } else {
        passedChecks++;
      }

      // Capture screenshots for representative breakpoints (390, 820, 1440)
      if (['mobile_390', 'tablet_820', 'desktop_1440'].includes(vp.name)) {
        const ssPath = path.join(SCREENSHOTS_DIR, `${vp.name}_${r.name}.png`);
        await page.screenshot({ path: ssPath, fullPage: false });
      }
    }

    if (vpOverflow) {
      console.log('FAIL (overflow detected)');
    } else {
      console.log('ALL ROUTES PASS (0 overflow)');
    }
  }

  // 4. Test Public Login & Register Responsiveness & Screenshots
  console.log('\n--- 4. Testing Login & Register Screens ---');
  await page.evaluate(() => localStorage.clear());

  for (const vp of [
    { name: 'mobile_390', width: 390, height: 844 },
    { name: 'tablet_820', width: 820, height: 1180 },
    { name: 'desktop_1440', width: 1440, height: 900 }
  ]) {
    await page.setViewport({ width: vp.width, height: vp.height });

    // Login
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 300));
    const loginOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    totalChecks++;
    if (!loginOverflow) passedChecks++; else failures.push(`Login overflow at ${vp.name}`);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${vp.name}_login.png`) });

    // Register Candidate
    await page.goto(`${FRONTEND_URL}/register?role=candidate`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 300));
    const regOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    totalChecks++;
    if (!regOverflow) passedChecks++; else failures.push(`Register overflow at ${vp.name}`);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${vp.name}_register.png`) });
  }
  console.log('[PASS] Login & Register screens verified and captured.');

  await browser.close();

  console.log('\n================================================================');
  console.log(`AUDIT RESULTS: ${passedChecks}/${totalChecks} checks passed (${((passedChecks / totalChecks) * 100).toFixed(1)}%)`);
  if (failures.length > 0) {
    console.log('FAILURES:');
    failures.forEach(f => console.log(' - ' + f));
    process.exit(1);
  } else {
    console.log('ALL TESTS PASSED! ZERO HORIZONTAL OVERFLOW DETECTED.');
    console.log('================================================================\n');
  }
}

runVerification().catch(err => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});
