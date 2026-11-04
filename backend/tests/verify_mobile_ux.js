const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = path.resolve(__dirname, '..', 'docs', 'screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: '320px_se', width: 320, height: 568 },
  { name: '360px_android', width: 360, height: 640 },
  { name: '390px_iphone14', width: 390, height: 844 },
  { name: '430px_promax', width: 430, height: 932 },
  { name: '768px_tablet', width: 768, height: 1024 },
  { name: '1440px_desktop', width: 1440, height: 900 }
];

const PAGES_TO_TEST = [
  { route: '/', name: 'homepage' },
  { route: '/for-employers', name: 'for_employers' },
  { route: '/about', name: 'about' }
];

async function runAudit() {
  console.log('Launching Chrome from:', CHROME_PATH);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  const results = {
    pages: [],
    overflows: [],
    foldMetrics: {},
    consoleErrors: []
  };

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Filter out external GSI iframe 403 network logs if unconfigured origin
      if (!text.includes('accounts.google.com') && !text.includes('favicon')) {
        results.consoleErrors.push(`[CONSOLE_ERROR] ${text}`);
      }
    }
  });

  page.on('pageerror', err => {
    results.consoleErrors.push(`[PAGE_ERROR] ${err.toString()}`);
  });

  for (const vp of VIEWPORTS) {
    console.log(`\n=== Testing Viewport: ${vp.name} (${vp.width}x${vp.height}) ===`);
    await page.setViewport({ width: vp.width, height: vp.height });

    for (const p of PAGES_TO_TEST) {
      const url = `http://localhost:5173${p.route}`;
      console.log(`Navigating to ${url}...`);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, 600));

      // Check horizontal overflow
      const overflow = await page.evaluate(() => {
        const docWidth = document.documentElement.scrollWidth;
        const winWidth = window.innerWidth;
        return {
          scrollWidth: docWidth,
          innerWidth: winWidth,
          hasOverflow: docWidth > winWidth
        };
      });

      if (overflow.hasOverflow) {
        results.overflows.push({
          page: p.name,
          viewport: vp.name,
          diff: overflow.scrollWidth - overflow.innerWidth
        });
      }

      // Capture screenshot
      const filename = `${p.name}_${vp.name}.png`;
      const screenshotPath = path.join(SCREENSHOT_DIR, filename);
      await page.screenshot({ path: screenshotPath, fullPage: false });

      // Special metrics for 390x844 on homepage
      if (vp.name === '390px_iphone14' && p.name === 'homepage') {
        const foldData = await page.evaluate(() => {
          const vh = window.innerHeight;
          // Count categories visible without full scroll
          const categoryTiles = Array.from(document.querySelectorAll('a[href*="/jobs?category="]'));
          const visibleTiles = categoryTiles.filter(el => {
            const rect = el.getBoundingClientRect();
            return rect.top >= 0 && rect.top < vh * 2; // within 2 screen folds
          });

          // Check hero search form presence
          const searchForm = document.querySelector('form');
          const searchFormRect = searchForm ? searchForm.getBoundingClientRect() : null;

          return {
            viewportHeight: vh,
            totalCategoryTiles: categoryTiles.length,
            visibleTilesCount: visibleTiles.length,
            searchFormTop: searchFormRect ? searchFormRect.top : null,
            searchFormBottom: searchFormRect ? searchFormRect.bottom : null
          };
        });

        results.foldMetrics = foldData;
        console.log('Homepage 390px fold metrics:', JSON.stringify(foldData, null, 2));
      }
    }
  }

  // Also test candidate portal pages
  console.log('\n=== Testing Candidate Applications & AI Resume Builder ===');
  await page.setViewport({ width: 390, height: 844 });

  // Inject candidate session into localStorage
  await page.evaluate(() => {
    const candidateUser = {
      id: 999,
      email: 'candidate.test@vakancy.in',
      name: 'Devang Chauhan',
      role: 'candidate',
      token: 'fake-jwt-token-for-ui-verification'
    };
    localStorage.setItem('vakancy_user', JSON.stringify(candidateUser));
    localStorage.setItem('vakancy_token', 'fake-jwt-token-for-ui-verification');
  });

  // Candidate applications
  try {
    await page.goto('http://localhost:5173/candidate/applications', { waitUntil: 'networkidle2', timeout: 15000 });
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'candidate_applications_390px.png'), fullPage: false });
    console.log('Candidate applications screenshot captured.');
  } catch (err) {
    console.warn('Candidate applications test warning:', err.message);
  }

  // Candidate AI Resume Builder
  try {
    await page.goto('http://localhost:5173/candidate/ai-resume-builder', { waitUntil: 'networkidle2', timeout: 15000 });
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'candidate_resume_builder_390px.png'), fullPage: false });
    console.log('Candidate AI Resume Builder screenshot captured.');
  } catch (err) {
    console.warn('Candidate AI Resume Builder test warning:', err.message);
  }

  await browser.close();

  console.log('\n================ AUDIT SUMMARY ================');
  console.log('Overflows detected:', results.overflows.length ? results.overflows : 'None (0px horizontal overflow across all viewports)');
  console.log('Page Errors:', results.consoleErrors.length ? results.consoleErrors : 'None');
  console.log('Screenshots saved to:', SCREENSHOT_DIR);
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'audit_results.json'), JSON.stringify(results, null, 2));
}

runAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
