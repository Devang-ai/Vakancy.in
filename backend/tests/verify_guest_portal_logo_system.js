const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outDir = path.resolve(__dirname, '../../docs/screenshots/logo_integration');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const VIEWPORTS = [
  { name: 'mobile_320', width: 320, height: 640, isMobile: true },
  { name: 'mobile_360', width: 360, height: 740, isMobile: true },
  { name: 'mobile_390', width: 390, height: 844, isMobile: true },
  { name: 'mobile_430', width: 430, height: 932, isMobile: true },
  { name: 'tablet_768', width: 768, height: 1024, isMobile: true },
  { name: 'tablet_820', width: 820, height: 1180, isMobile: true },
  { name: 'ipad_pro_1032', width: 1032, height: 1376, isMobile: false },
  { name: 'ipad_pro_1376', width: 1376, height: 1032, isMobile: false },
  { name: 'desktop_1440', width: 1440, height: 900, isMobile: false },
  { name: 'desktop_1920', width: 1920, height: 1080, isMobile: false }
];

async function runLogoVerification() {
  console.log('=== STARTING COMPLETE GUEST PORTAL LOGO INTEGRATION TEST ===');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  let passed = 0;
  let failed = 0;

  function assert(cond, msg) {
    if (cond) {
      console.log(`  [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${msg}`);
      failed++;
    }
  }

  try {
    // 1. TEST FAVICON
    console.log('\n--- 1. Testing Favicon & HTML Head Branding ---');
    await page.goto('http://localhost:5173/', { waitUntil: 'load' });
    const faviconHref = await page.evaluate(() => {
      const icon = document.querySelector('link[rel="icon"]');
      return icon ? icon.getAttribute('href') : null;
    });
    assert(faviconHref !== null && faviconHref.includes('favicon'), `Favicon configured in index.html: ${faviconHref}`);

    // Verify favicon file exists
    const fav32 = path.resolve(__dirname, '../../frontend/public/favicon-32x32.png');
    assert(fs.existsSync(fav32), 'favicon-32x32.png exists in frontend/public');

    // 2. TEST RESPONSIVE HEADER LOGO ACROSS ALL 10 VIEWPORTS
    console.log('\n--- 2. Testing Responsive Header Logo Across 10 Viewports ---');
    for (const vp of VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height, isMobile: vp.isMobile, deviceScaleFactor: 2 });
      await page.goto('http://localhost:5173/', { waitUntil: 'load' });
      await new Promise(r => setTimeout(r, 600));

      const logoData = await page.evaluate(() => {
        const header = document.querySelector('header');
        if (!header) return null;
        const img = header.querySelector('picture img, a[aria-label="Vakancy.in Homepage"] img');
        if (!img) return null;
        const currentSrc = img.currentSrc || img.src;
        const naturalW = img.naturalWidth;
        const naturalH = img.naturalHeight;
        const rect = img.getBoundingClientRect();
        return {
          currentSrc,
          naturalW,
          naturalH,
          renderedW: rect.width,
          renderedH: rect.height,
          aspect: (rect.width / rect.height).toFixed(2),
          naturalAspect: (naturalW / naturalH).toFixed(2)
        };
      });

      assert(logoData !== null, `[${vp.name} (${vp.width}px)] Header logo rendered`);
      if (logoData) {
        if (vp.width < 768) {
          assert(
            logoData.currentSrc.includes('symbol-v') || logoData.currentSrc.includes('v-symbol'),
            `[${vp.name}] Correctly loads Standalone V symbol on mobile (<768px)`
          );
          assert(
            Math.abs(parseFloat(logoData.aspect) - 1.0) < 0.25,
            `[${vp.name}] V Symbol aspect ratio ~1:1 preserved without distortion (${logoData.aspect})`
          );
        } else {
          assert(
            logoData.currentSrc.includes('horizontal') || logoData.currentSrc.includes('wordmark'),
            `[${vp.name}] Correctly loads Horizontal wordmark on tablet/desktop (>=768px)`
          );
          assert(
            Math.abs(parseFloat(logoData.aspect) - 3.0) < 0.5,
            `[${vp.name}] Horizontal wordmark aspect ratio ~3:1 preserved without distortion (${logoData.aspect})`
          );
        }

        // Capture screenshot of header
        await page.screenshot({
          path: path.join(outDir, `header_${vp.name}.png`),
          clip: { x: 0, y: 0, width: vp.width, height: 110 }
        });
      }
    }

    // 3. TEST MOBILE DRAWER WITH FULL HORIZONTAL LOGO (390px)
    console.log('\n--- 3. Testing Mobile Drawer Header Logo ---');
    await page.setViewport({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 });
    await page.goto('http://localhost:5173/', { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 600));

    const hamburgerBtn = await page.$('button[aria-label="Toggle navigation menu"]');
    assert(hamburgerBtn !== null, 'Mobile hamburger button exists');
    if (hamburgerBtn) {
      await hamburgerBtn.click();
      await new Promise(r => setTimeout(r, 500));

      const drawerLogo = await page.evaluate(() => {
        const drawer = document.querySelector('[role="dialog"]');
        if (!drawer) return null;
        const img = drawer.querySelector('img');
        if (!img) return null;
        const rect = img.getBoundingClientRect();
        return {
          src: img.currentSrc || img.src,
          width: rect.width,
          height: rect.height,
          aspect: (rect.width / rect.height).toFixed(2)
        };
      });

      assert(drawerLogo !== null, 'Mobile drawer opened and contains logo');
      if (drawerLogo) {
        assert(
          drawerLogo.src.includes('horizontal') || drawerLogo.src.includes('wordmark'),
          `Mobile drawer header displays full horizontal wordmark: ${drawerLogo.src}`
        );
        assert(
          Math.abs(parseFloat(drawerLogo.aspect) - 3.0) < 0.5,
          `Drawer logo aspect ratio preserved without clipping: ${drawerLogo.aspect}`
        );
      }

      await page.screenshot({
        path: path.join(outDir, 'mobile_drawer_open_390.png')
      });

      // Close drawer
      const closeBtn = await page.$('button[aria-label="Close menu"]');
      if (closeBtn) await closeBtn.click();
      await new Promise(r => setTimeout(r, 400));
    }

    // 4. TEST FOOTER LOGO
    console.log('\n--- 4. Testing Footer Logo ---');
    await page.setViewport({ width: 1440, height: 900, isMobile: false, deviceScaleFactor: 1 });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(r => setTimeout(r, 600));

    const footerLogo = await page.evaluate(() => {
      const footer = document.querySelector('footer');
      if (!footer) return null;
      const img = footer.querySelector('img');
      if (!img) return null;
      const rect = img.getBoundingClientRect();
      return {
        src: img.currentSrc || img.src,
        width: rect.width,
        height: rect.height,
        aspect: (rect.width / rect.height).toFixed(2)
      };
    });

    assert(footerLogo !== null, 'Footer contains logo');
    if (footerLogo) {
      assert(
        footerLogo.src.includes('horizontal') || footerLogo.src.includes('wordmark'),
        `Footer displays approved horizontal wordmark: ${footerLogo.src}`
      );
      assert(
        Math.abs(parseFloat(footerLogo.aspect) - 3.0) < 0.5,
        `Footer logo maintains natural 3:1 aspect ratio: ${footerLogo.aspect}`
      );
    }
    await page.screenshot({
      path: path.join(outDir, 'footer_desktop_1440.png')
    });

    // 5. TEST PAGES (Find Jobs, For Employers, Executive Search, About Us, Login, Register)
    console.log('\n--- 5. Testing Guest Pages Integration & Consistency ---');
    const pagesToTest = [
      { name: 'find_jobs', path: '/jobs' },
      { name: 'for_employers', path: '/for-employers' },
      { name: 'executive_search', path: '/executive-search' },
      { name: 'about_us', path: '/about' },
      { name: 'login', path: '/login' },
      { name: 'register', path: '/register' }
    ];

    for (const p of pagesToTest) {
      await page.goto(`http://localhost:5173${p.path}`, { waitUntil: 'load' });
      await new Promise(r => setTimeout(r, 800));

      // Check header logo
      const headerImg = await page.$('header picture img, header a[aria-label="Vakancy.in Homepage"] img');
      assert(headerImg !== null, `[${p.name}] Header logo present on ${p.path}`);

      // Check for login / register card logo
      if (p.name === 'login' || p.name === 'register') {
        const formLogo = await page.evaluate(() => {
          const card = document.querySelector('main');
          if (!card) return false;
          const imgs = card.querySelectorAll('img');
          for (const img of imgs) {
            if (img.src.includes('horizontal') || img.src.includes('wordmark')) return true;
          }
          return false;
        });
        assert(formLogo, `[${p.name}] Auth card displays approved Vakancy wordmark above form`);
      }

      // Check about us globe symbol
      if (p.name === 'about_us') {
        const globeLogo = await page.evaluate(() => {
          const imgs = document.querySelectorAll('img');
          for (const img of imgs) {
            if (img.src.includes('globe')) return true;
          }
          return false;
        });
        assert(globeLogo, '[about_us] About Us central ecosystem hub features approved Vakancy Globe symbol');
      }

      await page.screenshot({
        path: path.join(outDir, `page_${p.name}_1440.png`)
      });
    }

    // 6. TEST CLICKING LOGO NAVIGATES TO HOME
    console.log('\n--- 6. Testing Logo Click Navigation ---');
    await page.goto('http://localhost:5173/about', { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 500));
    assert(page.url().includes('/about'), 'Initially on /about page');

    const logoLink = await page.$('header a[aria-label="Vakancy.in Homepage"]');
    assert(logoLink !== null, 'Header logo link exists');
    if (logoLink) {
      await logoLink.click();
      await new Promise(r => setTimeout(r, 800));
      const currentUrl = page.url();
      assert(
        currentUrl === 'http://localhost:5173/' || currentUrl === 'http://localhost:5173',
        `Clicking logo navigated to homepage: ${currentUrl}`
      );
    }

  } catch (err) {
    console.error('Test run error:', err);
    failed++;
  } finally {
    await browser.close();
  }

  console.log(`\n=== TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`);
  return { passed, failed };
}

runLogoVerification().then(res => {
  if (res.failed > 0) process.exit(1);
});

