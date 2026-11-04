const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FRONTEND_URL = 'http://localhost:5173';
const OUTPUT_DIR = path.resolve(__dirname, '../../docs/screenshots/option_c_before');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: 'mobile_390', width: 390, height: 844 },
  { name: 'tablet_768', width: 768, height: 1024 },
  { name: 'ipad_pro_13_portrait_1032', width: 1032, height: 1376 },
  { name: 'ipad_pro_13_landscape_1376', width: 1376, height: 1032 },
  { name: 'desktop_1440', width: 1440, height: 900 }
];

const PAGES = [
  { name: 'home', path: '/' },
  { name: 'for_employers', path: '/for-employers' },
  { name: 'about', path: '/about' },
  { name: 'executive_search', path: '/executive-search' }
];

async function captureBefore() {
  console.log('--- CAPTURING BEFORE SCREENSHOTS FOR OPTION C ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  for (const vp of VIEWPORTS) {
    console.log(`\nViewport: ${vp.name} (${vp.width}x${vp.height})`);
    await page.setViewport({ width: vp.width, height: vp.height });

    for (const p of PAGES) {
      await page.goto(`${FRONTEND_URL}${p.path}`, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise((res) => setTimeout(res, 600));

      const shotPath = path.join(OUTPUT_DIR, `${vp.name}_${p.name}.png`);
      await page.screenshot({ path: shotPath, fullPage: false });
      console.log(`  Saved: ${path.basename(shotPath)}`);
    }
  }

  await browser.close();
  console.log('\n--- COMPLETED CAPTURING BEFORE SCREENSHOTS ---');
}

captureBefore().catch(console.error);

