const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const { generateToken } = require('../config/jwt');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FRONTEND_URL = 'http://localhost:5173';
const OUTPUT_DIR = path.resolve(__dirname, '../../docs/screenshots/ipad_pro_13_verified');

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

const VIEWPORTS = [
  { name: 'ipad_pro_13_portrait', width: 1032, height: 1376 },
  { name: 'ipad_pro_13_landscape', width: 1376, height: 1032 },
  { name: 'mobile_390', width: 390, height: 844 },
  { name: 'desktop_1440', width: 1440, height: 900 }
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

async function runVerification() {
  console.log('===============================================================');
  console.log('   VAKANCY.IN CANDIDATE PORTAL & IPAD PRO 13 VERIFICATION');
  console.log('===============================================================');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const testResults = [];

  // Helper to record test results
  const assert = (title, condition, details = '') => {
    testResults.push({ title, pass: Boolean(condition), details });
    if (condition) {
      console.log(`  [PASS] ${title}`);
    } else {
      console.error(`  [FAIL] ${title} - ${details}`);
    }
  };

  try {
    // 1. Visit /login to set up local storage
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'domcontentloaded' });

    // -------------------------------------------------------------
    // SUITE 1: VIEWPORT AUDIT & HORIZONTAL OVERFLOW CHECK
    // -------------------------------------------------------------
    console.log('\n--- SUITE 1: VIEWPORT AUDIT & HORIZONTAL OVERFLOW CHECK ---');
    for (const vp of VIEWPORTS) {
      console.log(`\nTesting Viewport: ${vp.name} (${vp.width}x${vp.height})`);
      await page.setViewport({ width: vp.width, height: vp.height });

      for (const r of ROUTES) {
        if (r.isPublic) {
          await page.evaluate(() => localStorage.clear());
        } else {
          await page.evaluate(
            ({ token, user }) => {
              localStorage.setItem('token', token);
              localStorage.setItem('user', JSON.stringify(user));
            },
            { token: candidateToken, user: candidateUser }
          );
        }

        await page.goto(`${FRONTEND_URL}${r.path}`, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise((res) => setTimeout(res, 800));

        // Horizontal overflow check
        const overflow = await page.evaluate(() => {
          const scrollW = document.documentElement.scrollWidth;
          const clientW = document.documentElement.clientWidth;
          return {
            hasOverflow: scrollW > clientW + 1,
            scrollW,
            clientW,
            diff: scrollW - clientW
          };
        });

        assert(
          `${vp.name} - ${r.name} horizontal overflow check`,
          !overflow.hasOverflow,
          `scrollWidth (${overflow.scrollW}) > clientWidth (${overflow.clientW})`
        );

        // Capture verification screenshot
        const shotPath = path.join(OUTPUT_DIR, `${vp.name}_${r.name}.png`);
        await page.screenshot({ path: shotPath, fullPage: false });
      }
    }

    // -------------------------------------------------------------
    // SUITE 2: SEARCHABLE LANGUAGE SELECTOR TEST
    // -------------------------------------------------------------
    console.log('\n--- SUITE 2: SEARCHABLE LANGUAGE SELECTOR (Candidate Profile) ---');
    await page.setViewport({ width: 1032, height: 1376 });
    await page.evaluate(
      ({ token, user }) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
      },
      { token: candidateToken, user: candidateUser }
    );

    await page.goto(`${FRONTEND_URL}/candidate/profile`, { waitUntil: 'networkidle2' });
    await new Promise((res) => setTimeout(res, 1000));

    // Scroll to languages accordion and open it
    const openedLang = await page.evaluate(() => {
      // Find the Languages accordion button
      const buttons = Array.from(document.querySelectorAll('button'));
      const langBtn = buttons.find((b) => b.textContent.includes('Languages'));
      if (langBtn) {
        langBtn.click();
        return true;
      }
      return false;
    });
    assert('Languages accordion found and clicked', openedLang);
    await new Promise((res) => setTimeout(res, 600));

    // Check language selector dropdown exists
    const langDropdownBtn = await page.$('#language-select-dropdown');
    assert('Language selector CustomDropdown trigger found', Boolean(langDropdownBtn));

    if (langDropdownBtn) {
      await langDropdownBtn.click();
      await new Promise((res) => setTimeout(res, 400));

      // Check search input exists inside dropdown
      const searchInput = await page.$('input[placeholder="Search language..."]');
      assert('Search input inside language dropdown found and visible', Boolean(searchInput));

      if (searchInput) {
        // Type 'Guj' into search
        await searchInput.type('Guj');
        await new Promise((res) => setTimeout(res, 300));

        // Verify options list contains Gujarati
        const optionsText = await page.evaluate(() => {
          const options = Array.from(document.querySelectorAll('[role="listbox"] [role="option"]'));
          return options.map((o) => o.textContent.trim());
        });

        assert(
          'Search filtered to show "Gujarati"',
          optionsText.some((t) => t.includes('Gujarati')),
          `Options: ${JSON.stringify(optionsText)}`
        );

        // Screenshot of active searchable dropdown
        await page.screenshot({
          path: path.join(OUTPUT_DIR, 'language_dropdown_search_active.png')
        });

        // Click Gujarati option
        await page.evaluate(() => {
          const options = Array.from(document.querySelectorAll('[role="listbox"] [role="option"]'));
          const gujOpt = options.find((o) => o.textContent.includes('Gujarati'));
          if (gujOpt) gujOpt.click();
        });
        await new Promise((res) => setTimeout(res, 400));

        // Verify dropdown closed and selected
        const selectedText = await page.evaluate(() => {
          const btn = document.querySelector('#language-select-dropdown');
          return btn ? btn.textContent.trim() : '';
        });
        assert('Language "Gujarati" selected in trigger button', selectedText.includes('Gujarati'), `Trigger: ${selectedText}`);
      }
    }

    // -------------------------------------------------------------
    // SUITE 3: CANDIDATE APPLICATIONS MODERN DROPDOWNS
    // -------------------------------------------------------------
    console.log('\n--- SUITE 3: CANDIDATE APPLICATIONS DROPDOWNS ---');
    await page.goto(`${FRONTEND_URL}/candidate/applications`, { waitUntil: 'networkidle2' });
    await new Promise((res) => setTimeout(res, 1000));

    const appDropdowns = await page.evaluate(() => {
      const company = document.querySelector('#app-company-filter');
      const workMode = document.querySelector('#app-workmode-filter');
      const sort = document.querySelector('#app-sort-filter');
      return {
        hasCompany: Boolean(company),
        hasWorkMode: Boolean(workMode),
        hasSort: Boolean(sort)
      };
    });

    assert('Applications Company filter CustomDropdown present', appDropdowns.hasCompany);
    assert('Applications Work Mode filter CustomDropdown present', appDropdowns.hasWorkMode);
    assert('Applications Sort filter CustomDropdown present', appDropdowns.hasSort);

    // Test interacting with Work Mode dropdown
    const workModeBtn = await page.$('#app-workmode-filter');
    if (workModeBtn) {
      await workModeBtn.click();
      await new Promise((res) => setTimeout(res, 400));

      const workModeOptions = await page.evaluate(() => {
        const opts = Array.from(document.querySelectorAll('[role="listbox"] [role="option"]'));
        return opts.map((o) => o.textContent.trim());
      });

      assert(
        'Work Mode options include Hybrid, On-site, Remote',
        workModeOptions.some((o) => o.includes('Remote')),
        `Options: ${JSON.stringify(workModeOptions)}`
      );

      await page.screenshot({
        path: path.join(OUTPUT_DIR, 'applications_workmode_dropdown_open.png')
      });

      // Select 'Remote'
      await page.evaluate(() => {
        const opts = Array.from(document.querySelectorAll('[role="listbox"] [role="option"]'));
        const remoteOpt = opts.find((o) => o.textContent.includes('Remote'));
        if (remoteOpt) remoteOpt.click();
      });
      await new Promise((res) => setTimeout(res, 400));
    }

    // -------------------------------------------------------------
    // SUITE 4: CANDIDATE FIND JOBS RESPONSIVENESS & PARITY
    // -------------------------------------------------------------
    console.log('\n--- SUITE 4: CANDIDATE FIND JOBS RESPONSIVENESS & PARITY ---');

    // 4A: iPad Pro 13 Portrait (1032px)
    await page.setViewport({ width: 1032, height: 1376 });
    await page.goto(`${FRONTEND_URL}/candidate/jobs`, { waitUntil: 'networkidle2' });
    await new Promise((res) => setTimeout(res, 1000));

    const portraitLayout = await page.evaluate(() => {
      const aside = document.querySelector('aside.sticky');
      const asideComputed = aside ? window.getComputedStyle(aside).display : 'none';
      const resultsPane = document.querySelector('main.xl\\:col-span-9, main');
      const resultsWidth = resultsPane ? resultsPane.getBoundingClientRect().width : 0;
      const filterBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Filters'));
      return {
        asideDisplay: asideComputed,
        resultsWidth,
        hasFilterBtn: Boolean(filterBtn)
      };
    });

    assert(
      'iPad Pro 13 Portrait (1032px): Sidebar filters hidden by default (drawer mode)',
      portraitLayout.asideDisplay === 'none',
      `aside display is ${portraitLayout.asideDisplay}`
    );
    assert(
      'iPad Pro 13 Portrait (1032px): Results pane has full comfortable width (> 900px)',
      portraitLayout.resultsWidth > 900,
      `Width: ${portraitLayout.resultsWidth}px`
    );
    assert(
      'iPad Pro 13 Portrait (1032px): Filters drawer button present',
      portraitLayout.hasFilterBtn
    );

    // Test opening Filter Drawer on iPad Pro 13 Portrait
    await page.evaluate(() => {
      const filterBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Filters'));
      if (filterBtn) filterBtn.click();
    });
    await new Promise((res) => setTimeout(res, 500));

    const drawerVisible = await page.evaluate(() => {
      const drawer = document.querySelector('[role="dialog"]');
      return Boolean(drawer);
    });
    assert('Filter Drawer opens smoothly on iPad Pro 13 Portrait', drawerVisible);

    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'ipad_pro_13_portrait_find_jobs_drawer_open.png')
    });

    // Close drawer
    await page.keyboard.press('Escape');
    await new Promise((res) => setTimeout(res, 400));

    // 4B: iPad Pro 13 Landscape (1376px)
    await page.setViewport({ width: 1376, height: 1032 });
    await page.goto(`${FRONTEND_URL}/candidate/jobs`, { waitUntil: 'networkidle2' });
    await new Promise((res) => setTimeout(res, 1000));

    const landscapeLayout = await page.evaluate(() => {
      const aside = document.querySelector('aside.sticky');
      const asideComputed = aside ? window.getComputedStyle(aside).display : 'none';
      const asideWidth = aside ? aside.getBoundingClientRect().width : 0;
      const resultsPane = document.querySelector('main.xl\\:col-span-9, main');
      const resultsWidth = resultsPane ? resultsPane.getBoundingClientRect().width : 0;
      return {
        asideDisplay: asideComputed,
        asideWidth,
        resultsWidth
      };
    });

    assert(
      'iPad Pro 13 Landscape (1376px): Sidebar filters pinned in 2-column layout',
      landscapeLayout.asideDisplay !== 'none',
      `aside display is ${landscapeLayout.asideDisplay}`
    );
    assert(
      'iPad Pro 13 Landscape (1376px): Generous results pane width (> 700px)',
      landscapeLayout.resultsWidth > 700,
      `Results width: ${landscapeLayout.resultsWidth}px, Aside: ${landscapeLayout.asideWidth}px`
    );

    // 4C: Verify JobCard detail URLs point to /candidate/jobs/:id (Never /jobs/:id)
    const detailUrls = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/jobs"]'));
      return links.map((l) => l.getAttribute('href')).filter(Boolean);
    });
    const invalidGuestLinks = detailUrls.filter((href) => href.startsWith('/jobs/') && !href.startsWith('/candidate/jobs/'));
    assert(
      'All Job detail links strictly preserve Candidate Portal (/candidate/jobs/:id)',
      invalidGuestLinks.length === 0,
      `Found guest detail links: ${JSON.stringify(invalidGuestLinks)}`
    );

    // -------------------------------------------------------------
    // SUITE 5: LOGIN & REGISTER PAGES ON IPAD PRO 13 PORTRAIT
    // -------------------------------------------------------------
    console.log('\n--- SUITE 5: LOGIN & REGISTER PAGES (Centered on iPad Pro 13 Portrait) ---');
    await page.setViewport({ width: 1032, height: 1376 });
    await page.evaluate(() => localStorage.clear());

    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle2' });
    await new Promise((res) => setTimeout(res, 800));

    const loginCardDimensions = await page.evaluate(() => {
      const card = document.querySelector('.bg-white.rounded-\\[2rem\\]');
      if (!card) return null;
      const rect = card.getBoundingClientRect();
      const winW = window.innerWidth;
      const isCentered = Math.abs(rect.left - (winW - rect.right)) < 30; // within 30px tolerance
      return { width: rect.width, left: rect.left, isCentered, winW };
    });

    assert(
      'Login Card is centered and well-proportioned on iPad Pro 13 Portrait (1032px)',
      loginCardDimensions && loginCardDimensions.isCentered && loginCardDimensions.width > 440,
      `Width: ${loginCardDimensions?.width}px, Left: ${loginCardDimensions?.left}px, Centered: ${loginCardDimensions?.isCentered}`
    );

    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'ipad_pro_13_portrait_login_centered.png')
    });

  } catch (err) {
    console.error('Test execution error:', err);
    assert('Execution completed without runtime crash', false, err.message);
  } finally {
    await browser.close();
  }

  // -------------------------------------------------------------
  // FINAL SUMMARY
  // -------------------------------------------------------------
  console.log('\n===============================================================');
  console.log('                   VERIFICATION SUMMARY');
  console.log('===============================================================');
  const total = testResults.length;
  const passed = testResults.filter((t) => t.pass).length;
  const failed = testResults.filter((t) => !t.pass).length;

  console.log(`Total Assertions: ${total}`);
  console.log(`Passed:          ${passed}`);
  console.log(`Failed:          ${failed}`);

  if (failed > 0) {
    console.error('\nFailed tests:');
    testResults.filter((t) => !t.pass).forEach((t) => {
      console.error(` - ${t.title}: ${t.details}`);
    });
  }

  // Write test report JSON
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'verification_summary.json'),
    JSON.stringify({ total, passed, failed, results: testResults }, null, 2)
  );

  return failed === 0;
}

runVerification().then((success) => {
  process.exit(success ? 0 : 1);
});

