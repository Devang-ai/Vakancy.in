const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FRONTEND_URL = 'http://localhost:5173';
const OUTPUT_DIR = path.resolve(__dirname, '../../docs/screenshots/option_c_after');

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

async function verifyAndCaptureAfter() {
  console.log('===============================================================');
  console.log('   OPTION C — BALANCED IMAGE INTEGRATION VERIFICATION');
  console.log('===============================================================');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const testResults = [];

  const assert = (title, condition, details = '') => {
    testResults.push({ title, pass: Boolean(condition), details });
    if (condition) {
      console.log(`  [PASS] ${title}`);
    } else {
      console.error(`  [FAIL] ${title} - ${details}`);
    }
  };

  try {
    for (const vp of VIEWPORTS) {
      console.log(`\nTesting Viewport: ${vp.name} (${vp.width}x${vp.height})`);
      await page.setViewport({ width: vp.width, height: vp.height });

      for (const p of PAGES) {
        await page.goto(`${FRONTEND_URL}${p.path}`, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise((res) => setTimeout(res, 600));

        // Horizontal overflow check
        const overflow = await page.evaluate(() => {
          const scrollW = document.documentElement.scrollWidth;
          const clientW = document.documentElement.clientWidth;
          return {
            hasOverflow: scrollW > clientW + 1,
            scrollW,
            clientW
          };
        });

        assert(
          `${vp.name} - ${p.name} zero horizontal overflow`,
          !overflow.hasOverflow,
          `scrollWidth (${overflow.scrollW}) > clientWidth (${overflow.clientW})`
        );

        // Capture after screenshot
        const shotPath = path.join(OUTPUT_DIR, `${vp.name}_${p.name}.png`);
        await page.screenshot({ path: shotPath, fullPage: false });
      }
    }

    // Targeted DOM feature checks
    console.log('\n--- TARGETED FEATURE CHECKS ---');

    // 1. Homepage callout
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${FRONTEND_URL}/`, { waitUntil: 'networkidle2' });
    const homeCalloutImg = await page.evaluate(() => {
      const banner = Array.from(document.querySelectorAll('div')).find((d) =>
        d.textContent.includes('Build a stronger team with Vakancy.in')
      );
      if (!banner) return false;
      const img = banner.querySelector('img[src="/images/employer_dashboard.jpg"]');
      return Boolean(img);
    });
    assert('Homepage: Employer Callout contains subtle background image with overlay', homeCalloutImg);

    // 2. For Employers: Compact image on mobile below CTA
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(`${FRONTEND_URL}/for-employers`, { waitUntil: 'networkidle2' });
    const mobileEmployerImg = await page.evaluate(() => {
      const img = document.querySelector('.lg\\:hidden img[src="/images/employer_dashboard.jpg"]');
      if (!img) return false;
      const rect = img.getBoundingClientRect();
      return rect.height > 50 && rect.height <= 220;
    });
    assert('For Employers: Compact well-cropped image visible on mobile (height <= 220px)', mobileEmployerImg);

    // 3. About Us: Introduction image
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${FRONTEND_URL}/about`, { waitUntil: 'networkidle2' });
    const aboutIntroImg = await page.evaluate(() => {
      const whoWeAre = Array.from(document.querySelectorAll('div')).find((d) =>
        d.textContent.includes('Who We Are') && d.textContent.includes('Vakancy.in is a recruitment platform')
      );
      if (!whoWeAre) return false;
      const img = whoWeAre.querySelector('img[src="/images/recruitment_office.jpg"]');
      return Boolean(img);
    });
    assert('About Us: Clean compact workspace image present in Who We Are section', aboutIntroImg);

    // 4. Executive Search: Subtle background in request banner
    await page.goto(`${FRONTEND_URL}/executive-search`, { waitUntil: 'networkidle2' });
    const execBannerImg = await page.evaluate(() => {
      const banner = Array.from(document.querySelectorAll('div')).find((d) =>
        d.textContent.includes('Request an Executive Search') && d.textContent.includes('Share your hiring requirement')
      );
      if (!banner) return false;
      const img = banner.querySelector('img[src="/images/executive_meeting.jpg"]');
      return Boolean(img);
    });
    assert('Executive Search: Subtle compact visual integrated in Request Search banner', execBannerImg);

  } catch (err) {
    console.error('Error during verification:', err);
    assert('Verification execution completed without crash', false, err.message);
  } finally {
    await browser.close();
  }

  console.log('\n===============================================================');
  console.log('                   VERIFICATION SUMMARY');
  console.log('===============================================================');
  const total = testResults.length;
  const passed = testResults.filter((t) => t.pass).length;
  const failed = testResults.filter((t) => !t.pass).length;

  console.log(`Total Assertions: ${total}`);
  console.log(`Passed:          ${passed}`);
  console.log(`Failed:          ${failed}`);

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'option_c_verification_summary.json'),
    JSON.stringify({ total, passed, failed, results: testResults }, null, 2)
  );

  return failed === 0;
}

verifyAndCaptureAfter().then((success) => {
  process.exit(success ? 0 : 1);
});

