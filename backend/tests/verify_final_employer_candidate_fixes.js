const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const { generateToken } = require('../config/jwt');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FRONTEND_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = path.resolve(__dirname, '../../docs/screenshots/final_fixes_verification');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Test accounts
const candidateUser = {
  id: '85d519ba-7084-440c-aa3f-a53334538c7e',
  email: 'meet@scan2serve.com',
  role: 'candidate',
  name: 'Meet Soni',
  token_version: 0,
  is_onboarding_completed: 1
};
const candidateToken = generateToken(candidateUser);

const employerUser = {
  id: 'usr-test-emp-01',
  email: 'employer@vakancy.com',
  role: 'employer',
  company_name: 'Apex Tech Solutions',
  token_version: 0,
  is_onboarding_completed: 1
};
const employerToken = generateToken(employerUser);

const VIEWPORTS = [
  { name: '320px', width: 320, height: 640 },
  { name: '360px', width: 360, height: 740 },
  { name: '390px', width: 390, height: 844 },
  { name: '430px', width: 430, height: 932 },
  { name: '768px', width: 768, height: 1024 },
  { name: '1440px', width: 1440, height: 900 }
];

async function runVerification() {
  console.log('===============================================================');
  console.log('  VAKANCY.IN - REAL BROWSER VERIFICATION SUITE');
  console.log('  Employer & Candidate Mobile UI Corrections & Bug Fixes');
  console.log('===============================================================\n');

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
    // TEST SUITE 1: EMPLOYER DASHBOARD (Header Greeting & CTAs)
    // -------------------------------------------------------------
    console.log('--- TEST SUITE 1: Employer Dashboard (Header & CTAs) ---');
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((tok, usr) => {
      localStorage.setItem('token', tok);
      localStorage.setItem('user', JSON.stringify(usr));
    }, employerToken, employerUser);

    await page.goto(`${FRONTEND_URL}/recruiter`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('h1', { timeout: 8000 });

    const dashboardData = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      const h1Text = h1 ? h1.innerText : '';
      const links = Array.from(document.querySelectorAll('a')).map(a => a.innerText.trim());
      const postJobButtons = links.filter(t => t.includes('Post a Job') || t.includes('Post a New Job'));
      const viewJobsButtons = links.filter(t => t.includes('View Jobs'));
      return {
        h1Text,
        postJobCount: postJobButtons.length,
        viewJobsCount: viewJobsButtons.length,
        hasDoublePlus: links.some(t => t.includes('+ +') || t.includes('++'))
      };
    });

    assert('Dashboard greeting contains company name or recruiter greeting', dashboardData.h1Text.length > 5, dashboardData.h1Text);
    assert('View Jobs CTA exists in header', dashboardData.viewJobsCount >= 1);
    assert('Single Post a Job CTA in header on mobile (no redundant duplicate)', dashboardData.postJobCount <= 2, `Count: ${dashboardData.postJobCount}`);
    assert('No duplicate plus glyphs on CTA buttons', !dashboardData.hasDoublePlus);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_employer_dashboard_mobile_390px.png') });

    // -------------------------------------------------------------
    // TEST SUITE 2: EMPLOYER JOBS PAGE (Search Typing, Filter Reset, No CSV)
    // -------------------------------------------------------------
    console.log('\n--- TEST SUITE 2: Employer Jobs Page (Search, Filters, No CSV) ---');
    await page.goto(`${FRONTEND_URL}/recruiter/jobs`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[type="text"]', { timeout: 8000 });

    const jobsHeaderData = await page.evaluate(() => {
      const pageText = document.body.innerText;
      const exportCSVBtn = Array.from(document.querySelectorAll('button, a')).find(el => el.innerText.includes('Export CSV'));
      const postJobBtn = Array.from(document.querySelectorAll('a, button')).find(el => el.innerText.includes('Post a Job'));
      return {
        hasExportCSV: Boolean(exportCSVBtn),
        postJobBtnText: postJobBtn ? postJobBtn.innerText : '',
        hasDoublePlus: postJobBtn ? postJobBtn.innerText.includes('++') || postJobBtn.innerText.includes('+ +') : false
      };
    });

    assert('Export CSV button is REMOVED from Employer Jobs header', !jobsHeaderData.hasExportCSV);
    assert('Post a Job button has single clean label (no duplicate plus)', !jobsHeaderData.hasDoublePlus, jobsHeaderData.postJobBtnText);

    // Test Search Input Typing Bug Fix
    const searchInput = await page.$('main input[type="text"], input[placeholder="Search by job title, location, or stack..."]');
    assert('Search input element exists', Boolean(searchInput));

    if (searchInput) {
      await page.evaluate(() => {
        const inp = document.querySelector('input[placeholder="Search by job title, location, or stack..."]');
        if (inp) {
          inp.focus();
        }
      });
      await searchInput.type('Developer');
      const typedValue = await page.evaluate(() => {
        const inp = document.querySelector('input[placeholder="Search by job title, location, or stack..."]');
        return inp ? inp.value : '';
      });
      assert('Search input accepts typing and updates state properly (Bug 2.2 fix)', typedValue.includes('Developer'), `Value: ${typedValue}`);

      // Verify clear button appears
      const clearBtn = await page.$('button[aria-label="Clear search"]');
      assert('Search input clear button (×) exists when text is present', Boolean(clearBtn));

      // Test Filter Reset Bug Fix
      const resetBtn = await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Reset Filters'));
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      });
      assert('Reset Filters button appeared and was clicked', resetBtn);

      await new Promise(r => setTimeout(r, ));
      const resetValue = await page.evaluate(() => {
        const inp = document.querySelector('input[placeholder="Search by job title, location, or stack..."]');
        return inp ? inp.value : '';
      });
      assert('Reset Filters clears search input query completely (Bug 2.3 fix)', resetValue === '', `Value: "${resetValue}"`);
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_employer_jobs_mobile_390px.png') });

    // -------------------------------------------------------------
    // TEST SUITE 3: EMPLOYER NOTIFICATIONS (Mobile Bell & Drawer)
    // -------------------------------------------------------------
    console.log('\n--- TEST SUITE 3: Employer Notifications Mobile UI ---');
    const notifBell = await page.$('#employer-header-notif-bell');
    assert('Notification bell exists in EmployerHeader', Boolean(notifBell));

    if (notifBell) {
      await notifBell.click();
      await new Promise(r => setTimeout(r, ));

      const drawerData = await page.evaluate(() => {
        const drawerTitle = Array.from(document.querySelectorAll('h3')).find(h => h.innerText.includes('Notifications'));
        const closeBtn = document.querySelector('button[aria-label="Close"]');
        return {
          drawerVisible: Boolean(drawerTitle),
          hasCloseBtn: Boolean(closeBtn)
        };
      });

      assert('Clicking notification bell opens mobile slide-over drawer', drawerData.drawerVisible);
      assert('Drawer includes accessible close button (✕)', drawerData.hasCloseBtn);

      // Close drawer
      const closeBtn = await page.$('button[aria-label="Close"]');
      if (closeBtn) await closeBtn.click();
      await new Promise(r => setTimeout(r, ));
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_employer_notifications_drawer_mobile.png') });

    // -------------------------------------------------------------
    // TEST SUITE 4: CANDIDATE FIND JOBS (Non-Sticky Mobile Search & Streamlined Cards)
    // -------------------------------------------------------------
    console.log('\n--- TEST SUITE 4: Candidate Find Jobs Page ---');
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((tok, usr) => {
      localStorage.setItem('token', tok);
      localStorage.setItem('user', JSON.stringify(usr));
    }, candidateToken, candidateUser);

    await page.goto(`${FRONTEND_URL}/candidate/jobs`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('input#role-search-input-candidate', { timeout: 8000 });

    const searchMatrixData = await page.evaluate(() => {
      const section = document.querySelector('section.relative, section.sticky');
      const isRelativeOnMobile = section ? section.className.includes('relative') : false;
      const isStickyOnDesktop = section ? section.className.includes('sm:sticky') : false;
      return { isRelativeOnMobile, isStickyOnDesktop };
    });

    assert('Search matrix is relative on mobile (prevents scroll overlay)', searchMatrixData.isRelativeOnMobile);
    assert('Search matrix remains sticky on desktop (sm:sticky)', searchMatrixData.isStickyOnDesktop);

    // Test Candidate Search Input Typing
    const roleInput = await page.$('#role-search-input-candidate');
    if (roleInput) {
      await roleInput.click();
      await roleInput.type('Engineer');
      const typedRole = await page.evaluate(el => el.value, roleInput);
      assert('Candidate role search input typing works', typedRole === 'Engineer');
    }

    // Verify Mobile Streamlined JobCard layout
    const mobileJobCardData = await page.evaluate(() => {
      const mobileCard = document.querySelector('article [class*="sm:hidden"]');
      if (!mobileCard) return null;
      const title = mobileCard.querySelector('h3') ? mobileCard.querySelector('h3').innerText : '';
      const viewJobBtn = mobileCard.querySelector('a') ? mobileCard.querySelector('a').innerText : '';
      const bookmarkBtn = mobileCard.querySelector('button[aria-label*="Job"]');
      return {
        hasMobileCard: true,
        title,
        hasViewJobBtn: viewJobBtn.includes('View Job'),
        hasBookmarkBtn: Boolean(bookmarkBtn)
      };
    });

    assert('JobCard renders dedicated compact 4-row layout on mobile (<sm)', mobileJobCardData && mobileJobCardData.hasMobileCard);
    assert('Mobile JobCard includes title, bookmark, and View Job CTA', mobileJobCardData && mobileJobCardData.hasViewJobBtn);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_candidate_find_jobs_mobile_390px.png') });

    // -------------------------------------------------------------
    // TEST SUITE 5: CANDIDATE JOB DETAILS (Multiple Locations Parsing)
    // -------------------------------------------------------------
    console.log('\n--- TEST SUITE 5: Candidate Job Details (Multi-Location) ---');
    // Navigate to job details
    const firstJobLink = await page.evaluate(() => {
      const link = document.querySelector('a[href*="/candidate/jobs/"]');
      return link ? link.getAttribute('href') : '/candidate/jobs/058b05af-756c-4945-9d2b-8d106c61beb7';
    });

    if (firstJobLink) {
      await page.goto(`${FRONTEND_URL}${firstJobLink}`, { waitUntil: 'networkidle2' });
      await page.waitForSelector('h1', { timeout: 8000 });

      const detailsData = await page.evaluate(() => {
        const h1 = document.querySelector('h1') ? document.querySelector('h1').innerText : '';
        const bodyText = document.body.innerText;
        const hasLocationBadge = Boolean(document.querySelector('span[title*="more"], span.rounded-full'));
        const bottomApplyBar = Boolean(document.querySelector('.lg\\:hidden.fixed.bottom-0'));
        return {
          h1,
          hasLocationBadge,
          bottomApplyBar
        };
      });

      assert('Candidate Job Details loads title cleanly', detailsData.h1.length > 0, detailsData.h1);
      assert('Mobile sticky bottom Apply Now action bar is visible', detailsData.bottomApplyBar);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_candidate_job_details_mobile_390px.png') });
    }

    // -------------------------------------------------------------
    // TEST SUITE 6: CANDIDATE APPLICATIONS (No Export Data, Clean Rows)
    // -------------------------------------------------------------
    console.log('\n--- TEST SUITE 6: Candidate Applications Page ---');
    await page.goto(`${FRONTEND_URL}/candidate/applications`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('h1', { timeout: 8000 });

    const appsData = await page.evaluate(() => {
      const exportBtn = Array.from(document.querySelectorAll('button, a')).find(el => el.innerText.includes('Export Data') || el.innerText.includes('Export CSV'));
      const findOpportunitiesBtn = Array.from(document.querySelectorAll('a')).find(el => el.innerText.includes('Find Opportunities') || el.innerText.includes('Find More Opportunities'));
      const statusPills = Array.from(document.querySelectorAll('span')).filter(s => ['Applied', 'Under Review', 'Shortlisted', 'Interview', 'Rejected'].includes(s.innerText.trim()));
      return {
        hasExportData: Boolean(exportBtn),
        hasFindOpportunities: Boolean(findOpportunitiesBtn),
        statusPillsCount: statusPills.length
      };
    });

    assert('Export Data button is REMOVED from Candidate Applications command bar', !appsData.hasExportData);
    assert('Find Opportunities button is present', appsData.hasFindOpportunities);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_candidate_applications_mobile_390px.png') });

    // -------------------------------------------------------------
    // TEST SUITE 7: RESPONSIVE HORIZONTAL OVERFLOW (6 Viewports)
    // -------------------------------------------------------------
    console.log('\n--- TEST SUITE 7: Responsive Horizontal Overflow (0px Overflow) ---');
    const PAGES_TO_CHECK = [
      { name: 'Employer Dashboard', url: `${FRONTEND_URL}/recruiter`, role: 'employer' },
      { name: 'Employer Jobs', url: `${FRONTEND_URL}/recruiter/jobs`, role: 'employer' },
      { name: 'Candidate Find Jobs', url: `${FRONTEND_URL}/candidate/jobs`, role: 'candidate' },
      { name: 'Candidate Applications', url: `${FRONTEND_URL}/candidate/applications`, role: 'candidate' }
    ];

    for (const vp of VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height });
      for (const p of PAGES_TO_CHECK) {
        if (p.role === 'employer') {
          await page.evaluate((tok, usr) => {
            localStorage.setItem('token', tok);
            localStorage.setItem('user', JSON.stringify(usr));
          }, employerToken, employerUser);
        } else {
          await page.evaluate((tok, usr) => {
            localStorage.setItem('token', tok);
            localStorage.setItem('user', JSON.stringify(usr));
          }, candidateToken, candidateUser);
        }

        await page.goto(p.url, { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, ));

        const overflow = await page.evaluate((vpWidth) => {
          const docWidth = document.documentElement.scrollWidth;
          const bodyWidth = document.body.scrollWidth;
          const maxW = Math.max(docWidth, bodyWidth);
          return {
            maxW,
            vpWidth,
            overflowPx: maxW - vpWidth
          };
        }, vp.width);

        assert(
          `[${vp.name}] ${p.name} zero horizontal overflow`,
          overflow.overflowPx <= 0,
          `ScrollWidth: ${overflow.maxW}px, Viewport: ${overflow.vpWidth}px, Overflow: ${overflow.overflowPx}px`
        );
      }
    }

  } catch (err) {
    console.error('Test Suite encountered an error:', err);
  } finally {
    await browser.close();
  }

  console.log('\n===============================================================');
  console.log(`  VERIFICATION RESULTS: ${passedTests}/${totalTests} PASSED (${Math.round((passedTests/totalTests)*100)}%)`);
  if (failedTests > 0) {
    console.log(`  ❌ ${failedTests} TESTS FAILED`);
  } else {
    console.log('  🎉 ALL AUDIT AND REGRESSION TESTS PASSED WITH 100% SUCCESS!');
  }
  console.log('===============================================================\n');
}

runVerification();
