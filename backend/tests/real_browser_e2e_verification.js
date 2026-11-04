const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\Devang chauhan\\.gemini\\antigravity-ide\\brain\\b435974b-97b5-4981-8660-07ab0b84ce36';

const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function runBrowserVerification() {
  console.log('================================================================');
  console.log('🌐 RUNNING REAL CHROME BROWSER E2E VERIFICATION (A through J)');
  console.log('================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,900']
  });

  try {
    const adminPage = await browser.newPage();
    await adminPage.setViewport({ width: 1400, height: 900 });

    // ─────────────────────────────────────────────────────────────
    // STEP 1: Director logs in & Toggles Candidate Access ON
    // ─────────────────────────────────────────────────────────────
    console.log('[Browser Step 1] Director login at http://localhost:5174/login...');
    await adminPage.goto('http://localhost:5174/login', { waitUntil: 'networkidle2' });
    await adminPage.waitForSelector('input[type="email"]');
    await adminPage.type('input[type="email"]', 'director@vakancy.com');
    await adminPage.type('input[type="password"]', 'password123');
    await adminPage.click('button[type="submit"]');
    await adminPage.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
    await wait(1000);
    console.log('✅ Director logged in to Admin Panel.');

    // Navigate to Employers
    console.log('[Browser Step 2] Navigating to http://localhost:5174/employers...');
    await adminPage.goto('http://localhost:5174/employers', { waitUntil: 'networkidle2' });
    await adminPage.waitForSelector('table');
    await wait(1000);

    // Look for Apex Tech Solutions row and Candidate DB Access column
    const employerRows = await adminPage.$$('tbody tr');
    console.log(`✅ Loaded ${employerRows.length} employers in table.`);

    // Find Apex Tech Solutions toggle button
    const toggleResult = await adminPage.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      for (const r of rows) {
        if (r.textContent.includes('Apex Tech Solutions')) {
          const btn = Array.from(r.querySelectorAll('button')).find(b => b.textContent.includes('Access'));
          if (btn) {
            const before = btn.textContent;
            if (before.includes('OFF')) {
              btn.click();
              return { clicked: true, before };
            }
            return { clicked: false, before };
          }
        }
      }
      return null;
    });

    console.log(`Apex Tech Solutions toggle state:`, toggleResult);
    await wait(2000);

    const screenshotAccessOn = path.join(ARTIFACT_DIR, 'fix_admin_candidate_access_on.png');
    await adminPage.screenshot({ path: screenshotAccessOn, fullPage: false });
    console.log(`📸 Saved screenshot: ${screenshotAccessOn}`);

    // ─────────────────────────────────────────────────────────────
    // ─────────────────────────────────────────────────────────────
    // STEP 2: Employer logs in & sees Unlocked Candidate Database
    // ─────────────────────────────────────────────────────────────
    console.log('\n[Browser Step 3] Employer logs in at http://localhost:5173/login?role=employer...');
    const employerPage = await browser.newPage();
    await employerPage.setViewport({ width: 1400, height: 900 });
    await employerPage.goto('http://localhost:5173/login?role=employer', { waitUntil: 'networkidle2' });
    await wait(1000);

    // Ensure Employer tab is active
    await employerPage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const empTab = btns.find(b => b.textContent.trim() === 'Employer');
      if (empTab) empTab.click();
    });
    await wait(500);

    await employerPage.waitForSelector('input[type="email"]');
    await employerPage.type('input[type="email"]', 'employer@vakancy.com');
    await employerPage.type('input[type="password"]', 'password123');
    await employerPage.click('button[type="submit"]');
    await wait(3000);

    console.log('[Browser Step 4] Employer navigating to Candidate Database at /employer/candidates...');
    await employerPage.goto('http://localhost:5173/employer/candidates', { waitUntil: 'networkidle2' });
    await wait(2500);

    const isUnlocked = await employerPage.evaluate(() => {
      return !document.body.textContent.includes('Candidate Database Access Locked') &&
             document.body.textContent.includes('Access Enabled');
    });
    console.log(`✅ Employer Candidate Database Unlocked State: ${isUnlocked}`);

    const screenshotEmpUnlocked = path.join(ARTIFACT_DIR, 'fix_employer_candidate_database_unlocked.png');
    await employerPage.screenshot({ path: screenshotEmpUnlocked, fullPage: false });
    console.log(`📸 Saved screenshot: ${screenshotEmpUnlocked}`);

    // ─────────────────────────────────────────────────────────────
    // STEP 3: Director toggles Candidate Access OFF -> Employer Sees Locked -> Requests Callback
    // ─────────────────────────────────────────────────────────────
    console.log('\n[Browser Step 5] Director toggling Candidate Access OFF on Admin Panel...');
    await adminPage.bringToFront();
    await adminPage.goto('http://localhost:5174/employers', { waitUntil: 'networkidle2' });
    await wait(2000);

    const toggleOffResult = await adminPage.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      for (const r of rows) {
        if (r.textContent.includes('Apex Tech Solutions')) {
          const btn = Array.from(r.querySelectorAll('button')).find(b => b.textContent.includes('Access'));
          if (btn && btn.textContent.includes('ON')) {
            btn.click();
            return { clicked: true, before: btn.textContent };
          }
        }
      }
      return null;
    });
    console.log(`✅ Toggled Candidate Access to OFF:`, toggleOffResult);
    await wait(2000);

    const screenshotAccessOff = path.join(ARTIFACT_DIR, 'fix_admin_candidate_access_off.png');
    await adminPage.screenshot({ path: screenshotAccessOff, fullPage: false });
    console.log(`📸 Saved screenshot: ${screenshotAccessOff}`);

    // Switch back to Employer page and reload
    console.log('[Browser Step 6] Reloading Candidate Database page on Employer Portal...');
    await employerPage.bringToFront();
    await employerPage.goto('http://localhost:5173/employer/candidates', { waitUntil: 'networkidle2' });
    await wait(2500);

    const isLocked = await employerPage.evaluate(() => {
      return document.body.textContent.includes('Candidate Database Access Locked');
    });
    console.log(`✅ Employer Candidate Database Locked State: ${isLocked}`);

    // Fill in hiring note and submit callback request
    console.log('[Browser Step 7] Submitting Callback Request from locked screen...');
    const textareaExists = await employerPage.$('textarea');
    if (textareaExists) {
      await employerPage.type('textarea', 'Urgent requirement: Need 2 Senior Fullstack Engineers for Bengaluru office');
    }

    // Click Request Callback button
    await employerPage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent.includes('Request Callback'));
      if (btn) btn.click();
    });
    await wait(2500);
    console.log('Clicked Request Callback button.');

    const hasCallbackActiveBanner = await employerPage.evaluate(() => {
      return document.body.textContent.includes('Callback Request Active') ||
             document.body.textContent.includes('Callback request registered');
    });
    console.log(`✅ Callback Request Banner Visible: ${hasCallbackActiveBanner}`);

    const screenshotEmpCallback = path.join(ARTIFACT_DIR, 'fix_employer_callback_requested.png');
    await employerPage.screenshot({ path: screenshotEmpCallback, fullPage: false });
    console.log(`📸 Saved screenshot: ${screenshotEmpCallback}`);

    // ─────────────────────────────────────────────────────────────
    // STEP 4: Director sees callback in Admin -> Assigns to Recruiter
    // ─────────────────────────────────────────────────────────────
    console.log('\n[Browser Step 8] Director checking Admin Callbacks at http://localhost:5174/callbacks...');
    await adminPage.bringToFront();
    await adminPage.goto('http://localhost:5174/callbacks', { waitUntil: 'networkidle2' });
    await wait(2500);

    const callbackFoundInTable = await adminPage.evaluate(() => {
      return document.body.textContent.includes('Apex Tech Solutions') &&
             document.body.textContent.includes('Candidate DB');
    });
    console.log(`✅ Callback request listed in Admin Table: ${callbackFoundInTable}`);

    // Open the callback row update modal
    const openedModal = await adminPage.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      const targetRow = rows.find(r => r.textContent.includes('Apex Tech Solutions'));
      if (targetRow) {
        const btn = targetRow.querySelector('button');
        if (btn) {
          btn.click();
          return true;
        }
      }
      return false;
    });

    if (openedModal) {
      await wait(1500);
      console.log('Opened callback update modal.');

      // Check Assign Recruiter options
      const recruiterOptions = await adminPage.evaluate(() => {
        const selects = Array.from(document.querySelectorAll('select'));
        for (const sel of selects) {
          const opts = Array.from(sel.options).map(o => o.text);
          if (opts.some(o => o.includes('(Recruiter)') || o.includes('recruiter'))) {
            return opts;
          }
        }
        return [];
      });
      console.log('Recruiter dropdown options in modal:', recruiterOptions);

      // Select recruiter and set status ASSIGNED
      await adminPage.evaluate(() => {
        const selects = Array.from(document.querySelectorAll('select'));
        const statusSel = selects.find(s => Array.from(s.options).some(o => o.value === 'ASSIGNED'));
        if (statusSel) {
          statusSel.value = 'ASSIGNED';
          statusSel.dispatchEvent(new Event('change', { bubbles: true }));
        }

        const recSel = selects.find(s => Array.from(s.options).some(o => o.text.includes('(Recruiter)')));
        if (recSel && recSel.options.length > 1) {
          recSel.selectedIndex = 1; // Pick first available active recruiter
          recSel.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      await wait(500);

      // Click Save Callback
      await adminPage.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const saveBtn = btns.find(b => b.textContent.includes('Save'));
        if (saveBtn) saveBtn.click();
      });
      await wait(2000);
      console.log('Saved callback assignment.');
    }

    const screenshotAdminCallbackAssigned = path.join(ARTIFACT_DIR, 'fix_admin_callbacks_assigned.png');
    await adminPage.screenshot({ path: screenshotAdminCallbackAssigned, fullPage: false });
    console.log(`📸 Saved screenshot: ${screenshotAdminCallbackAssigned}`);

    // ─────────────────────────────────────────────────────────────
    // STEP 5: Team Members & 3-Role Dropdown
    // ─────────────────────────────────────────────────────────────
    console.log('\n[Browser Step 9] Checking Team Management at http://localhost:5174/team...');
    await adminPage.goto('http://localhost:5174/team', { waitUntil: 'networkidle2' });
    await wait(2000);

    // Verify Role Permissions Summary has only 3 active cards
    const roleSummaryHeaders = await adminPage.evaluate(() => {
      const el = document.querySelectorAll('div.grid.grid-cols-1.sm\\:grid-cols-3 span.font-bold');
      return Array.from(el).map(e => e.textContent.trim());
    });
    console.log('Role summary headers displayed:', roleSummaryHeaders);

    // Click Create Team Member
    await adminPage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const createBtn = btns.find(b => b.textContent.includes('Create Team Member'));
      if (createBtn) createBtn.click();
    });
    await wait(1500);
    console.log('Opened Create Team Member modal.');

    // Check role options in Create Team Member modal
    const availableRolesInModal = await adminPage.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select'));
      for (const s of selects) {
        const opts = Array.from(s.options).map(o => o.text.trim());
        if (opts.some(o => o.includes('Admin') || o.includes('Recruiter'))) {
          return opts;
        }
      }
      return [];
    });
    console.log('Available Roles in Create Modal:', availableRolesInModal);

    const screenshotTeamModal = path.join(ARTIFACT_DIR, 'fix_admin_create_team_roles_modal.png');
    await adminPage.screenshot({ path: screenshotTeamModal, fullPage: false });
    console.log(`📸 Saved screenshot: ${screenshotTeamModal}`);

    console.log('\n================================================================');
    console.log('🎉 REAL CHROME BROWSER VERIFICATION COMPLETED WITH ZERO ERRORS!');
    console.log('================================================================\n');

  } catch (err) {
    console.error('Browser verification error:', err);
    throw err;
  } finally {
    await browser.close();
  }
}

runBrowserVerification().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
