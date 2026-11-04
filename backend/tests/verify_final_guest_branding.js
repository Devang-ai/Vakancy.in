const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outDir = path.resolve(__dirname, '../../docs/screenshots/final_branding');
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

async function runVerification() {
  console.log('=== STARTING FINAL GUEST PORTAL BRANDING & AUTH CLEANUP VERIFICATION ===');
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
    // 1. DESKTOP HEADER & FOOTER CHECK (1440px)
    console.log('\n--- 1. Testing Desktop Header & Footer Logo Mapping (1440px) ---');
    await page.setViewport({ width: 1440, height: 900, isMobile: false, deviceScaleFactor: 1 });
    await page.goto('http://localhost:5173/', { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 800));

    // Check desktop header logo
    const headerLogo = await page.evaluate(() => {
      const header = document.querySelector('header');
      if (!header) return null;
      const img = header.querySelector('picture img, a[aria-label="Vakancy.in Homepage"] img');
      if (!img) return null;
      const rect = img.getBoundingClientRect();
      return {
        src: img.currentSrc || img.src,
        width: rect.width,
        height: rect.height,
        aspect: (rect.width / rect.height).toFixed(2)
      };
    });

    assert(headerLogo !== null, 'Desktop header logo rendered');
    assert(
      headerLogo && (headerLogo.src.includes('global-logo') || headerLogo.src.includes('vakancy-global-logo')),
      `Desktop header uses approved Globe + Vakancy.in logo: ${headerLogo?.src}`
    );
    assert(
      headerLogo && Math.abs(parseFloat(headerLogo.aspect) - 1.33) < 0.2,
      `Desktop header logo maintains 4:3 natural aspect ratio without distortion (${headerLogo?.aspect})`
    );

    await page.screenshot({
      path: path.join(outDir, 'desktop_homepage_header_1440.png'),
      clip: { x: 0, y: 0, width: 1440, height: 110 }
    });

    // Check desktop footer logo
    await page.evaluate(() => {
      const footer = document.querySelector('footer');
      if (footer) footer.scrollIntoView();
    });
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

    assert(footerLogo !== null, 'Desktop footer logo rendered');
    assert(
      footerLogo && (footerLogo.src.includes('global-logo') || footerLogo.src.includes('vakancy-global-logo')),
      `Desktop footer uses approved Globe + Vakancy.in logo: ${footerLogo?.src}`
    );
    assert(
      footerLogo && Math.abs(parseFloat(footerLogo.aspect) - 1.33) < 0.2,
      `Desktop footer logo maintains 4:3 natural aspect ratio (${footerLogo?.aspect})`
    );

    await page.screenshot({
      path: path.join(outDir, 'desktop_footer_1440.png')
    });

    // 2. MOBILE HEADER & FOOTER CHECK (390px iPhone)
    console.log('\n--- 2. Testing Mobile Header & Footer Logo Mapping (390px) ---');
    await page.setViewport({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 });
    await page.goto('http://localhost:5173/', { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 800));

    // Check mobile header logo: MUST BE compact V symbol
    const mobileHeaderLogo = await page.evaluate(() => {
      const header = document.querySelector('header');
      if (!header) return null;
      const img = header.querySelector('picture img, a[aria-label="Vakancy.in Homepage"] img');
      if (!img) return null;
      const rect = img.getBoundingClientRect();
      return {
        src: img.currentSrc || img.src,
        width: rect.width,
        height: rect.height,
        aspect: (rect.width / rect.height).toFixed(2)
      };
    });

    assert(mobileHeaderLogo !== null, 'Mobile header logo rendered');
    assert(
      mobileHeaderLogo && (mobileHeaderLogo.src.includes('symbol-v') || mobileHeaderLogo.src.includes('v-symbol')),
      `Mobile header preserves approved compact V symbol: ${mobileHeaderLogo?.src}`
    );
    assert(
      mobileHeaderLogo && Math.abs(parseFloat(mobileHeaderLogo.aspect) - 1.0) < 0.2,
      `Mobile header logo maintains 1:1 square aspect ratio (${mobileHeaderLogo?.aspect})`
    );

    await page.screenshot({
      path: path.join(outDir, 'mobile_header_390.png'),
      clip: { x: 0, y: 0, width: 390, height: 100 }
    });

    // Check mobile footer logo: MUST BE full Globe + Vakancy.in logo
    await page.evaluate(() => {
      const footer = document.querySelector('footer');
      if (footer) footer.scrollIntoView();
    });
    await new Promise(r => setTimeout(r, 600));

    const mobileFooterLogo = await page.evaluate(() => {
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

    assert(mobileFooterLogo !== null, 'Mobile footer logo rendered');
    assert(
      mobileFooterLogo && (mobileFooterLogo.src.includes('global-logo') || mobileFooterLogo.src.includes('vakancy-global-logo')),
      `Mobile footer correctly displays full Globe + Vakancy.in logo: ${mobileFooterLogo?.src}`
    );
    assert(
      mobileFooterLogo && Math.abs(parseFloat(mobileFooterLogo.aspect) - 1.33) < 0.2,
      `Mobile footer logo maintains natural 4:3 aspect ratio without distortion (${mobileFooterLogo?.aspect})`
    );

    await page.screenshot({
      path: path.join(outDir, 'mobile_footer_390.png')
    });

    // 3. RESPONSIVE MATRIX (All 10 Viewports)
    console.log('\n--- 3. Testing Responsive Viewports Matrix (10 Viewports) ---');
    for (const vp of VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height, isMobile: vp.isMobile, deviceScaleFactor: 2 });
      await page.goto('http://localhost:5173/', { waitUntil: 'load' });
      await new Promise(r => setTimeout(r, 400));

      const res = await page.evaluate(() => {
        const headerImg = document.querySelector('header picture img, header a[aria-label="Vakancy.in Homepage"] img');
        return headerImg ? (headerImg.currentSrc || headerImg.src) : '';
      });

      if (vp.width < 768) {
        assert(
          res.includes('symbol-v') || res.includes('v-symbol'),
          `[${vp.name} (${vp.width}px)] Header correctly shows compact V symbol`
        );
      } else {
        assert(
          res.includes('global-logo') || res.includes('vakancy-global-logo'),
          `[${vp.name} (${vp.width}px)] Header correctly shows full Globe + Vakancy.in logo`
        );
      }
    }

    // 4. AUTHENTICATION PAGES (Sign In & Sign Up) & REMOVAL OF TEST ACCOUNTS
    console.log('\n--- 4. Testing Sign In (/login) Form Branding & Test Account Removal ---');
    // Desktop Sign In
    await page.setViewport({ width: 1440, height: 900, isMobile: false, deviceScaleFactor: 1 });
    await page.goto('http://localhost:5173/login', { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 600));

    const loginAudit = await page.evaluate(() => {
      const card = document.querySelector('form')?.closest('.bg-white');
      const img = card ? card.querySelector('img') : null;
      const pageText = document.body.innerText;
      const hasTestAccountText = /test account|quick fill|demo account/i.test(pageText);

      return {
        cardLogoSrc: img ? (img.currentSrc || img.src) : null,
        cardLogoW: img ? img.getBoundingClientRect().width : 0,
        cardLogoH: img ? img.getBoundingClientRect().height : 0,
        hasTestAccountText
      };
    });

    assert(
      loginAudit.cardLogoSrc && (loginAudit.cardLogoSrc.includes('wordmark') || loginAudit.cardLogoSrc.includes('horizontal')),
      `Sign In card displays approved V-wordmark: ${loginAudit.cardLogoSrc}`
    );
    assert(
      !loginAudit.cardLogoSrc?.includes('global'),
      'Sign In card does NOT use the Globe version'
    );
    assert(
      loginAudit.cardLogoH >= 38,
      `Sign In logo is moderately increased and readable (height: ${loginAudit.cardLogoH}px)`
    );
    assert(
      !loginAudit.hasTestAccountText,
      'Test Account / Quick Fill UI completely REMOVED from /login'
    );

    await page.screenshot({
      path: path.join(outDir, 'signin_desktop_1440.png')
    });

    // Mobile Sign In
    await page.setViewport({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 });
    await page.goto('http://localhost:5173/login', { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 600));

    await page.screenshot({
      path: path.join(outDir, 'signin_mobile_390.png')
    });

    // Desktop Sign Up
    console.log('\n--- 5. Testing Sign Up (/register) Form Branding ---');
    await page.setViewport({ width: 1440, height: 900, isMobile: false, deviceScaleFactor: 1 });
    await page.goto('http://localhost:5173/register', { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 600));

    const registerAudit = await page.evaluate(() => {
      const card = document.querySelector('.bg-white.rounded-\\[2rem\\]');
      const img = card ? card.querySelector('img') : null;
      const pageText = document.body.innerText;
      const hasTestAccountText = /test account|quick fill|demo account/i.test(pageText);

      return {
        cardLogoSrc: img ? (img.currentSrc || img.src) : null,
        cardLogoH: img ? img.getBoundingClientRect().height : 0,
        hasTestAccountText
      };
    });

    assert(
      registerAudit.cardLogoSrc && (registerAudit.cardLogoSrc.includes('wordmark') || registerAudit.cardLogoSrc.includes('horizontal')),
      `Sign Up card displays approved V-wordmark: ${registerAudit.cardLogoSrc}`
    );
    assert(
      !registerAudit.cardLogoSrc?.includes('global'),
      'Sign Up card does NOT use the Globe version'
    );
    assert(
      !registerAudit.hasTestAccountText,
      'No test account UI on /register'
    );

    await page.screenshot({
      path: path.join(outDir, 'signup_desktop_1440.png')
    });

    // Mobile Sign Up
    await page.setViewport({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 });
    await page.goto('http://localhost:5173/register', { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 600));

    await page.screenshot({
      path: path.join(outDir, 'signup_mobile_390.png')
    });

    // 5. LEGAL & CONTACT FOOTER SCREENSHOTS
    console.log('\n--- 6. Capturing Contact & Legal Page Footers ---');
    await page.setViewport({ width: 1440, height: 900, isMobile: false, deviceScaleFactor: 1 });

    // Contact
    await page.goto('http://localhost:5173/contact', { waitUntil: 'load' });
    await page.evaluate(() => {
      const footer = document.querySelector('footer');
      if (footer) footer.scrollIntoView();
    });
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({
      path: path.join(outDir, 'contact_footer_1440.png')
    });

    // Privacy
    await page.goto('http://localhost:5173/privacy-policy', { waitUntil: 'load' });
    await page.evaluate(() => {
      const footer = document.querySelector('footer');
      if (footer) footer.scrollIntoView();
    });
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({
      path: path.join(outDir, 'privacy_footer_1440.png')
    });

    // Terms
    await page.goto('http://localhost:5173/terms-and-conditions', { waitUntil: 'load' });
    await page.evaluate(() => {
      const footer = document.querySelector('footer');
      if (footer) footer.scrollIntoView();
    });
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({
      path: path.join(outDir, 'terms_footer_1440.png')
    });

  } catch (err) {
    console.error('Test error:', err);
    failed++;
  } finally {
    await browser.close();
  }

  console.log(`\n=== FINAL BRANDING VERIFICATION: ${passed} PASSED, ${failed} FAILED ===\n`);
  return { passed, failed };
}

runVerification().then(res => {
  if (res.failed > 0) process.exit(1);
});

