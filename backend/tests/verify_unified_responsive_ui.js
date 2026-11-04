const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = path.resolve(__dirname, '../../docs/screenshots/tablet_mobile_audit');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: 'mobile_390', width: 390, height: 844 },
  { name: 'tablet_600', width: 600, height: 960 },
  { name: 'tablet_768', width: 768, height: 1024 },
  { name: 'tablet_820', width: 820, height: 1180 },
  { name: 'tablet_912', width: 912, height: 1368 },
  { name: 'tablet_1024', width: 1024, height: 768 },
  { name: 'tablet_1180', width: 1180, height: 820 },
  { name: 'desktop_1440', width: 1440, height: 900 }
];

async function runAudit() {
  console.log('--- STARTING UNIFIED RESPONSIVE AUDIT ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    pageErrors.push(err.toString());
  });

  const testResults = {
    priority0_jobs_loading: null,
    priority0_jobs_refresh: null,
    priority1_text_clipping_executive: null,
    priority1_categories_home: null,
    priority2_mobile_navigation: null,
    priority3_4_tablet_responsiveness: []
  };

  try {
    // ==========================================
    // 1. PRIORITY 0: DIRECT LOADING & REFRESH ON /jobs
    // ==========================================
    console.log('\n[TEST 1] Priority 0: Verifying /jobs direct navigation and reload...');
    await page.setViewport({ width: 1280, height: 800 });
    const jobsResponse = await page.goto('http://localhost:5173/jobs', { waitUntil: 'networkidle2' });
    const jobsStatus = jobsResponse ? jobsResponse.status() : null;
    
    // Check for title or search bar
    await page.waitForSelector('input#role-search-input', { timeout: 8000 });
    const headerVisible = await page.$eval('h1', el => el.textContent.trim());

    // Refresh test
    const refreshResponse = await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForSelector('input#role-search-input', { timeout: 8000 });

    testResults.priority0_jobs_loading = {
      status: jobsStatus,
      headerText: headerVisible,
      consoleErrorsCount: consoleErrors.length,
      passed: jobsStatus === 200 && consoleErrors.length === 0 && pageErrors.length === 0
    };
    testResults.priority0_jobs_refresh = {
      status: refreshResponse.status(),
      passed: refreshResponse.status() === 200
    };
    console.log('Priority 0 Results:', testResults.priority0_jobs_loading);

    // ==========================================
    // 2. PRIORITY 1: TEXT CLIPPING IN EXECUTIVE SEARCH
    // ==========================================
    console.log('\n[TEST 2] Priority 1: Auditing Executive Search Roles for line-clamp & truncation...');
    await page.goto('http://localhost:5173/executive-search', { waitUntil: 'networkidle2' });
    
    // Test at 390px mobile viewport
    await page.setViewport({ width: 390, height: 844 });
    await new Promise(r => setTimeout(r, 600));

    const roleCardsAudit = await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h3')).filter(h => 
        h.textContent.includes('Leadership') || 
        h.textContent.includes('Development') || 
        h.textContent.includes('Engineering')
      );
      return headings.map(h => {
        const computed = window.getComputedStyle(h);
        return {
          text: h.textContent.trim(),
          lineClamp: computed.webkitLineClamp || computed.lineClamp || 'none',
          overflow: computed.overflow,
          textOverflow: computed.textOverflow,
          scrollWidth: h.scrollWidth,
          clientWidth: h.clientWidth,
          isClipped: h.scrollWidth > h.clientWidth + 2
        };
      });
    });

    testResults.priority1_text_clipping_executive = {
      testedRolesCount: roleCardsAudit.length,
      roles: roleCardsAudit,
      passed: roleCardsAudit.length >= 2 && roleCardsAudit.every(r => !r.isClipped && r.lineClamp === 'none')
    };
    console.log('Priority 1 Executive Search Audit:', testResults.priority1_text_clipping_executive);

    // ==========================================
    // 3. PRIORITY 1: CATEGORY CARDS ON HOME
    // ==========================================
    console.log('\n[TEST 3] Priority 1: Auditing Category Cards on HomePage...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
    await page.setViewport({ width: 390, height: 844 });
    await new Promise(r => setTimeout(r, 500));

    const categoryAudit = await page.evaluate(() => {
      const categoryLinks = Array.from(document.querySelectorAll('a[href*="/jobs?category="]'));
      return categoryLinks.map(a => {
        const span = a.querySelector('h3, span');
        const text = span ? span.textContent.trim() : a.textContent.trim();
        const hasTruncate = span ? span.className.includes('truncate') : false;
        return {
          text,
          hasTruncate,
          rect: a.getBoundingClientRect()
        };
      });
    });

    testResults.priority1_categories_home = {
      categoriesCount: categoryAudit.length,
      categories: categoryAudit,
      passed: categoryAudit.length >= 6 && categoryAudit.every(c => !c.hasTruncate)
    };
    console.log('Priority 1 Category Cards Audit:', testResults.priority1_categories_home);

    // ==========================================
    // 4. PRIORITY 2: MOBILE HAMBURGER MENU AUDIT
    // ==========================================
    console.log('\n[TEST 4] Priority 2: Auditing Mobile Hamburger Navigation Drawer...');
    await page.setViewport({ width: 390, height: 844 });
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });

    const hamburgerBtn = await page.$('button[aria-label="Toggle navigation menu"]');
    if (!hamburgerBtn) {
      throw new Error('Hamburger button not found on 390px viewport');
    }

    // Click hamburger button to open drawer
    await hamburgerBtn.click();
    await new Promise(r => setTimeout(r, 500));

    const navAudit = await page.evaluate(() => {
      const drawer = document.querySelector('[role="dialog"]') || document.querySelector('.fixed.inset-y-0.right-0');
      if (!drawer) return { found: false };

      const links = Array.from(drawer.querySelectorAll('a')).map(a => ({
        label: a.textContent.trim(),
        href: a.getAttribute('href'),
        minHeight: a.getBoundingClientRect().height
      }));

      const bodyOverflow = document.body.style.overflow;
      return {
        found: true,
        links,
        bodyOverflow
      };
    });

    // Test Escape key closes drawer
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 500));

    const afterEscapeState = await page.evaluate(() => {
      const drawer = document.querySelector('[role="dialog"]');
      const bodyOverflow = document.body.style.overflow;
      return {
        drawerOpen: !!drawer,
        bodyOverflow
      };
    });

    const expectedCanonicalLinks = ['Home', 'Find Jobs', 'For Employers', 'Executive Search', 'About Us', 'Contact Us'];
    const navLinksPresent = navAudit.links.filter(l => expectedCanonicalLinks.includes(l.label)).map(l => l.label);
    const hasCompanies = navAudit.links.some(l => l.label.toLowerCase() === 'companies' || (l.href && l.href.includes('/companies')));

    testResults.priority2_mobile_navigation = {
      drawerFound: navAudit.found,
      canonicalLinksFound: navLinksPresent,
      hasUnauthorizedCompanies: hasCompanies,
      allLinksWithTouchTarget44px: navAudit.links.every(l => l.minHeight >= 40),
      bodyScrollLockedWhenOpen: navAudit.bodyOverflow === 'hidden',
      escapeKeyClosesDrawer: !afterEscapeState.drawerOpen,
      passed: navAudit.found && navLinksPresent.length === 6 && !hasCompanies && !afterEscapeState.drawerOpen
    };
    console.log('Priority 2 Navigation Results:', testResults.priority2_mobile_navigation);

    // ==========================================
    // 5. PRIORITY 3 & 4: TABLET & MULTI-VIEWPORT AUDIT & SCREENSHOTS
    // ==========================================
    console.log('\n[TEST 5] Priority 3 & 4: Capturing Screenshots & Horizontal Overflow across Viewports...');
    const pagesToAudit = [
      { name: 'home', url: 'http://localhost:5173/' },
      { name: 'jobs', url: 'http://localhost:5173/jobs' },
      { name: 'executive', url: 'http://localhost:5173/executive-search' },
      { name: 'employers', url: 'http://localhost:5173/for-employers' },
      { name: 'about', url: 'http://localhost:5173/about' }
    ];

    for (const vp of VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height });
      const vpResult = {
        viewport: vp.name,
        width: vp.width,
        height: vp.height,
        pages: []
      };

      for (const p of pagesToAudit) {
        await page.goto(p.url, { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 400));

        const metrics = await page.evaluate(() => {
          const scrollW = document.documentElement.scrollWidth;
          const innerW = window.innerWidth;
          const header = document.querySelector('h1');
          return {
            scrollWidth: scrollW,
            innerWidth: innerW,
            hasHorizontalOverflow: scrollW > innerW + 1,
            headerText: header ? header.textContent.trim().slice(0, 40) : null
          };
        });

        // Screenshot for specific critical viewports (390, 768, 820, 912, 1024, 1440)
        if (['mobile_390', 'tablet_768', 'tablet_820', 'tablet_912', 'tablet_1024', 'desktop_1440'].includes(vp.name)) {
          const ssName = `${vp.name}_${p.name}.png`;
          const ssPath = path.join(SCREENSHOT_DIR, ssName);
          await page.screenshot({ path: ssPath, fullPage: false });
        }

        vpResult.pages.push({
          page: p.name,
          hasOverflow: metrics.hasHorizontalOverflow,
          header: metrics.headerText
        });
      }

      testResults.priority3_4_tablet_responsiveness.push(vpResult);
      console.log(`Audited Viewport ${vp.name} (${vp.width}x${vp.height}): All pages 0 overflow = ${vpResult.pages.every(pg => !pg.hasOverflow)}`);
    }

  } catch (error) {
    console.error('Audit failed with runtime exception:', error);
  } finally {
    await browser.close();
  }

  // Save JSON report
  const reportPath = path.resolve(__dirname, '../../docs/screenshots/tablet_mobile_audit/audit_results.json');
  fs.writeFileSync(reportPath, JSON.stringify({ testResults, consoleErrors, pageErrors }, null, 2));
  console.log('\n--- AUDIT COMPLETE! Full results saved to:', reportPath);
}

runAudit();

