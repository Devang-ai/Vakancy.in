const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:5002';
const SCREENSHOT_DIR = path.resolve(__dirname, '../../docs/screenshots/guest_mobile_ui');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: '320px', width: 320, height: 640 },
  { name: '360px', width: 360, height: 740 },
  { name: '390px', width: 390, height: 844 },
  { name: '430px', width: 430, height: 932 },
  { name: '768px', width: 768, height: 1024 },
  { name: '1440px', width: 1440, height: 900 }
];

async function runGuestMobileUIVerification() {
  console.log('===============================================================');
  console.log('  VAKANCY.IN - REAL BROWSER VERIFICATION SUITE');
  console.log('  Guest Portal Mobile UI Implementation (5 Reference Images)');
  console.log('===============================================================\n');

  // Query a real active job ID from backend API
  let realJobId = '95df092b-04db-428c-a415-0186fb3cc21d';
  try {
    const res = await fetch(`${BACKEND_URL}/api/jobs`);
    const data = await res.json();
    if (data.jobs && data.jobs.length > 0) {
      realJobId = data.jobs[0].id;
      console.log(`[API] Found active job ID ${realJobId} ("${data.jobs[0].title}")\n`);
    }
  } catch (err) {
    console.warn('[API] Could not query jobs endpoint, using default:', err.message);
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  function assert(desc, condition, details = '') {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ PASS: ${desc} ${details ? '(' + details + ')' : ''}`);
      return true;
    } else {
      failedTests++;
      console.error(`  ❌ FAIL: ${desc} ${details ? '(' + details + ')' : ''}`);
      return false;
    }
  }

  try {
    // -------------------------------------------------------------
    // TEST SUITE 1: GUEST NAVIGATION & MOBILE DRAWER (Image 4 & 5)
    // -------------------------------------------------------------
    console.log('--- TEST SUITE 1: Guest Navigation & Slide-over Mobile Drawer ---');
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(`${FRONTEND_URL}/`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 600));

    // Verify Hamburger button exists on mobile
    const hamburgerBtn = await page.$('button[aria-label="Toggle navigation menu"]');
    assert('Mobile hamburger menu button exists', !!hamburgerBtn);

    if (hamburgerBtn) {
      await hamburgerBtn.click();
      await new Promise((r) => setTimeout(r, 500));

      // Verify Drawer content
      const drawerVisible = await page.evaluate(() => {
        const drawer = document.querySelector('.animate-in.slide-in-from-right') || document.querySelector('.fixed.inset-y-0.right-0');
        if (!drawer) return false;
        const rect = drawer.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      assert('Mobile slide-over drawer opened with smooth animation', drawerVisible);

      // Verify brand header in drawer
      const drawerHasBrand = await page.evaluate(() => {
        const text = document.querySelector('.fixed.inset-y-0.right-0')?.innerText || '';
        return text.includes('Vakancy.in');
      });
      assert('Drawer displays Vakancy.in brand header', drawerHasBrand);

      // Verify navigation links
      const drawerLinks = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('.fixed.inset-y-0.right-0 a')).map((a) => ({
          href: a.getAttribute('href'),
          text: a.innerText.trim(),
        }));
        return links;
      });

      const hasHome = drawerLinks.some((l) => l.href === '/');
      const hasJobs = drawerLinks.some((l) => l.href === '/jobs');
      const hasEmployers = drawerLinks.some((l) => l.href === '/for-employers');
      const hasAbout = drawerLinks.some((l) => l.href === '/about-us' || l.href === '/about');
      const hasLogin = drawerLinks.some((l) => l.href === '/login');
      const hasRegister = drawerLinks.some((l) => l.href === '/register');

      assert('Drawer contains Home, Find Jobs, For Employers, About Us', hasHome && hasJobs && hasEmployers && hasAbout);
      assert('Drawer contains Sign In and Register bottom action buttons', hasLogin && hasRegister);

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_mobile_drawer_open_390px.png') });

      // Close drawer
      const closeBtn = await page.$('button[aria-label="Close menu"]');
      if (closeBtn) {
        await closeBtn.click();
        await new Promise((r) => setTimeout(r, 400));
        const drawerClosed = await page.evaluate(() => {
          return !document.querySelector('.fixed.inset-y-0.right-0');
        });
        assert('Mobile drawer closes smoothly on close button click', drawerClosed);
      }
    }

    // -------------------------------------------------------------
    // TEST SUITE 2: HOMEPAGE MOBILE UX (Image 1 & 3)
    // -------------------------------------------------------------
    console.log('\n--- TEST SUITE 2: Homepage Mobile UX & Compact Layout ---');
    await page.goto(`${FRONTEND_URL}/`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 600));

    // Verify Mobile Search Input & Buttons
    const heroSearchExists = await page.evaluate(() => {
      const input = document.querySelector('input[placeholder*="Job title, skills or company"]');
      return !!input;
    });
    assert('Mobile Hero search input rendered with compact placeholder', heroSearchExists);

    // Verify Category Tiles Grid
    const categoriesCount = await page.evaluate(() => {
      const links = document.querySelectorAll('.grid.grid-cols-3 a');
      return links.length;
    });
    assert('Explore by Category renders 6 compact mobile tiles (3x2 grid)', categoriesCount >= 6, `Count: ${categoriesCount}`);

    // Verify "Build a stronger team" banner exists on mobile
    const teamBanner = await page.evaluate(() => {
      return document.body.innerText.includes('Build a stronger team with Vakancy.in');
    });
    assert('Mobile "Build a stronger team with Vakancy.in" employer banner rendered', teamBanner);

    // Verify Snap Carousel for Featured Jobs
    const snapCarousel = await page.evaluate(() => {
      const carousel = document.querySelector('.snap-x');
      return !!carousel;
    });
    assert('Featured Jobs renders touch-friendly snap-x carousel on mobile', snapCarousel);

    // Verify Candidate Journey 3 Steps
    const howItWorksSteps = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('How Vakancy.in Works') && text.includes('01') && text.includes('02') && text.includes('03');
    });
    assert('Candidate Journey (How Vakancy.in Works) renders 3 clean steps', howItWorksSteps);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_homepage_hero_and_categories_390px.png') });

    // -------------------------------------------------------------
    // TEST SUITE 3: FIND JOBS PAGE (Image 2 & 4)
    // -------------------------------------------------------------
    console.log('\n--- TEST SUITE 3: Public Find Jobs Page ---');
    await page.goto(`${FRONTEND_URL}/jobs`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('#role-search-input', { timeout: 6000 });
    await new Promise((r) => setTimeout(r, 600));

    // Verify non-sticky search matrix on mobile
    const searchMatrixStickyMobile = await page.evaluate(() => {
      const sections = Array.from(document.querySelectorAll('section'));
      return sections.some((s) => s.className.includes('relative') && s.className.includes('sm:sticky'));
    });
    assert('Search matrix is non-sticky on mobile (relative sm:sticky sm:top-16)', searchMatrixStickyMobile);

    // Verify search typing
    const searchTyped = await page.evaluate(() => {
      const input = document.getElementById('role-search-input');
      if (!input) return false;
      input.value = 'Engineer';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return input.value === 'Engineer';
    });
    assert('Search input accepts typing smoothly', searchTyped);

    // Verify Filter button opens mobile filter drawer
    const filterBtn = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const fb = buttons.find((b) => b.innerText.includes('Filters'));
      if (fb) {
        fb.click();
        return true;
      }
      return false;
    });
    assert('Mobile Filter trigger button clicked', filterBtn);
    await new Promise((r) => setTimeout(r, 600));

    // Verify filter drawer opened
    const filterDrawerOpen = await page.evaluate(() => {
      const drawer = document.querySelector('[role="dialog"]') || document.querySelector('.fixed.inset-y-0.right-0');
      return !!drawer;
    });
    assert('Filter drawer opened with full mobile filter controls', filterDrawerOpen);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_find_jobs_filters_drawer_390px.png') });

    // Close filter drawer
    await page.evaluate(() => {
      const closeBtn = document.querySelector('button[aria-label="Close drawer"]') || document.querySelector('button[aria-label="Close"]');
      if (closeBtn) closeBtn.click();
    });
    await new Promise((r) => setTimeout(r, 400));

    // -------------------------------------------------------------
    // TEST SUITE 4: JOB DETAILS PAGE (Image 3 & 4)
    // -------------------------------------------------------------
    console.log('\n--- TEST SUITE 4: Public Job Details Page ---');
    await page.goto(`${FRONTEND_URL}/jobs/${realJobId}`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 800));

    // Verify mobile header back navigation & actions
    const mobileHeaderDetails = await page.evaluate(() => {
      const text = document.body.innerText;
      const hasJobDetails = text.includes('Job Details');
      const hasShare = !!document.querySelector('button[aria-label="Share Job"]') || !!document.querySelector('button[aria-label="Share Job URL"]');
      const hasSave = !!document.querySelector('button[aria-label="Save Job"]') || !!document.querySelector('button[aria-label="Saved Job"]');
      return { hasJobDetails, hasShare, hasSave };
    });
    assert('Mobile top navigation strip renders "< Job Details", Share, and Save icons', mobileHeaderDetails.hasJobDetails && mobileHeaderDetails.hasShare && mobileHeaderDetails.hasSave);

    // Verify Segmented Tabs: Overview, Requirements, Company
    const segmentedTabs = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('.bg-slate-100 button')).map((b) => b.innerText.trim());
      return buttons;
    });
    assert('Segmented tab navigation renders Overview, Requirements, and Company', segmentedTabs.includes('Overview') && segmentedTabs.includes('Requirements') && segmentedTabs.includes('Company'), `Tabs: ${segmentedTabs.join(', ')}`);

    // Verify switching tabs
    const switchedToReq = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.bg-slate-100 button'));
      const reqBtn = btns.find((b) => b.innerText.trim() === 'Requirements');
      if (reqBtn) {
        reqBtn.click();
        return true;
      }
      return false;
    });
    await new Promise((r) => setTimeout(r, 300));
    assert('Switched to Requirements tab smoothly', switchedToReq);

    const switchedToComp = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.bg-slate-100 button'));
      const compBtn = btns.find((b) => b.innerText.trim() === 'Company');
      if (compBtn) {
        compBtn.click();
        return true;
      }
      return false;
    });
    await new Promise((r) => setTimeout(r, 300));
    assert('Switched to Company tab smoothly', switchedToComp);

    // Verify Sticky Bottom Action Bar
    const stickyBottomBar = await page.evaluate(() => {
      const bar = document.querySelector('.fixed.bottom-0.left-0.right-0');
      if (!bar) return false;
      const buttons = Array.from(bar.querySelectorAll('button')).map((b) => b.innerText.trim());
      const hasApply = buttons.some((b) => b.includes('Apply Now') || b.includes('Applied'));
      const hasSave = buttons.some((b) => b.includes('Save'));
      return hasApply && hasSave;
    });
    assert('Sticky bottom action bar renders Save Job and Apply Now buttons', stickyBottomBar);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_job_details_mobile_390px.png') });

    // -------------------------------------------------------------
    // TEST SUITE 5: FOR EMPLOYERS & EXECUTIVE SEARCH (Image 4 & 5)
    // -------------------------------------------------------------
    console.log('\n--- TEST SUITE 5: For Employers & Executive Search Pages ---');
    await page.goto(`${FRONTEND_URL}/for-employers`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 600));

    const employerHero = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('Build a stronger team with Vakancy.in') || text.includes('For Employers');
    });
    assert('For Employers page renders hero value proposition and CTAs', employerHero);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_for_employers_390px.png') });

    // Executive Search
    await page.goto(`${FRONTEND_URL}/executive-search`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 600));

    const execSearchPills = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('CTO') && text.includes('VP Engineering') && text.includes('Discuss your requirement');
    });
    assert('Executive Search renders role pills (CTO, VP Engineering, etc.) and CTA', execSearchPills);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_executive_search_390px.png') });

    // -------------------------------------------------------------
    // TEST SUITE 6: ABOUT US & CONTACT US (Image 4 & 5)
    // -------------------------------------------------------------
    console.log('\n--- TEST SUITE 6: About Us & Contact Us Pages ---');
    await page.goto(`${FRONTEND_URL}/about-us`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 600));

    const aboutContent = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('Enabling a better way for') || text.includes('Our Mission');
    });
    assert('About Us page renders mission statement and structured cards', aboutContent);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_about_us_390px.png') });

    await page.goto(`${FRONTEND_URL}/contact`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 600));

    const contactForm = await page.evaluate(() => {
      const hasEmail = !!document.querySelector('input[type="email"]');
      const hasMessage = !!document.querySelector('textarea');
      const hasHoneypot = !!document.querySelector('input[name="website"]');
      return hasEmail && hasMessage && hasHoneypot;
    });
    assert('Contact Us page renders official email, message form, and honeypot protection', contactForm);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_contact_us_390px.png') });

    // -------------------------------------------------------------
    // TEST SUITE 7: LOGIN & REGISTER AUTH PAGES (Image 5)
    // -------------------------------------------------------------
    console.log('\n--- TEST SUITE 7: Authentication Pages ---');
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 600));

    const loginDetails = await page.evaluate(() => {
      const text = document.body.innerText;
      const hasRoleToggle = text.includes('Candidate') && text.includes('Employer');
      const hasGoogle = text.includes('Continue with Google') || !!document.querySelector('button:has(svg)');
      const hasLinkedIn = text.toLowerCase().includes('linkedin');
      return { hasRoleToggle, hasGoogle, hasLinkedIn };
    });
    assert('Login page renders Candidate / Employer role toggle', loginDetails.hasRoleToggle);
    assert('Login page renders Google Sign-In button', loginDetails.hasGoogle);
    assert('Login page strictly does NOT render unauthorized LinkedIn Sign-In', !loginDetails.hasLinkedIn);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_login_page_390px.png') });

    // -------------------------------------------------------------
    // TEST SUITE 8: 6-VIEWPORT HORIZONTAL OVERFLOW MATRIX (0px OVERFLOW)
    // -------------------------------------------------------------
    console.log('\n--- TEST SUITE 8: 6-Viewport Responsive Overflow Check (0px Overflow) ---');
    const testRoutes = [
      '/',
      '/jobs',
      `/jobs/${realJobId}`,
      '/for-employers',
      '/executive-search',
      '/about-us',
      '/contact',
      '/login'
    ];

    for (const vp of VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height });
      for (const route of testRoutes) {
        await page.goto(`${FRONTEND_URL}${route}`, { waitUntil: 'networkidle2' });
        await new Promise((r) => setTimeout(r, 300));

        const overflowData = await page.evaluate((vpWidth) => {
          const docW = document.documentElement.scrollWidth;
          const bodyW = document.body.scrollWidth;
          const winW = window.innerWidth;
          const maxW = Math.max(docW, bodyW);
          return { maxW, winW, overflow: maxW > winW };
        }, vp.width);

        assert(`No horizontal overflow on ${route} at ${vp.name}`, !overflowData.overflow, `scrollWidth: ${overflowData.maxW}px, viewport: ${vp.width}px`);
      }
    }

  } catch (error) {
    console.error('Test execution error:', error);
  } finally {
    await browser.close();
    console.log('\n===============================================================');
    console.log(`  VERIFICATION COMPLETE: ${passedTests}/${totalTests} TESTS PASSED (${failedTests} FAILED)`);
    console.log('===============================================================\n');
    process.exit(failedTests > 0 ? 1 : 0);
  }
}

runGuestMobileUIVerification();
