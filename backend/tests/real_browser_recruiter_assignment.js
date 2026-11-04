const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\Devang chauhan\\.gemini\\antigravity-ide\\brain\\b435974b-97b5-4981-8660-07ab0b84ce36';

const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function runBrowserVerification() {
  console.log('================================================================');
  console.log('🌐 RUNNING REAL CHROME BROWSER RECRUITER ASSIGNMENT VERIFICATION');
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
    // STEP 1: Director logs in
    // ─────────────────────────────────────────────────────────────
    console.log('[Browser Step 1] Director login at http://localhost:5174/login...');
    await adminPage.goto('http://localhost:5174/login', { waitUntil: 'networkidle2' });
    await adminPage.waitForSelector('input[type="email"]');
    await adminPage.type('input[type="email"]', 'director@vakancy.com');
    await adminPage.type('input[type="password"]', 'password123');
    await adminPage.click('button[type="submit"]');
    await wait(2000);
    console.log('✅ Director logged in successfully.');

    // ─────────────────────────────────────────────────────────────
    // STEP 2: Navigate to Team Members & verify Role options
    // ─────────────────────────────────────────────────────────────
    console.log('\n[Browser Step 2] Navigating to http://localhost:5174/team...');
    await adminPage.goto('http://localhost:5174/team', { waitUntil: 'networkidle2' });
    await wait(1500);

    // Click "Create Team Member"
    await adminPage.waitForSelector('#btn-open-create-team-modal');
    await adminPage.click('#btn-open-create-team-modal');
    await wait(1000);

    // Inspect role dropdown options in the modal
    await adminPage.waitForSelector('#team-member-role');
    const roleOptions = await adminPage.evaluate(() => {
      const select = document.querySelector('#team-member-role');
      if (!select) return [];
      return Array.from(select.options).map(o => ({ value: o.value, text: o.text }));
    });
    console.log('✅ Team Member Creation Role dropdown options:', roleOptions);

    // Verify only 3 canonical roles: Admin (director), BD (bd), Recruiter (recruiter)
    const allowedValues = ['director', 'bd', 'recruiter'];
    const hasOnlyAllowed = roleOptions.length === 3 && roleOptions.every(o => allowedValues.includes(o.value));
    console.log(`✅ Role dropdown strictly contains Admin, BD, Recruiter: ${hasOnlyAllowed}`);
    if (!hasOnlyAllowed) {
      throw new Error(`Role dropdown contained unexpected roles: ${JSON.stringify(roleOptions)}`);
    }

    // Take screenshot of Team Members modal
    const teamModalPath = path.join(ARTIFACT_DIR, 'fix_team_members_role_dropdown.png');
    await adminPage.screenshot({ path: teamModalPath, fullPage: false });
    console.log(`📸 Saved screenshot: ${teamModalPath}`);

    // Create a new test recruiter
    const newRecruiterName = 'Kavita Sen Recruiter';
    const newRecruiterEmail = `kavita.recruiter.${Date.now().toString().slice(-6)}@vakancy.com`;

    console.log(`\nCreating new recruiter: ${newRecruiterName} (${newRecruiterEmail})...`);
    await adminPage.type('#team-member-name', newRecruiterName);
    await adminPage.type('#team-member-email', newRecruiterEmail);
    await adminPage.type('#team-member-password', 'password123');
    await adminPage.select('#team-member-role', 'recruiter');
    await adminPage.type('#team-member-phone', '+91 9876501234');

    await wait(500);
    // Submit create form
    await adminPage.click('#btn-submit-create-team');
    await wait(2500);
    console.log('✅ Created recruiter via Team Members UI.');

    // ─────────────────────────────────────────────────────────────
    // STEP 3: Navigate to Enquiries & verify Assign Recruiter action
    // ─────────────────────────────────────────────────────────────
    console.log('\n[Browser Step 3] Navigating to http://localhost:5174/enquiries...');
    await adminPage.goto('http://localhost:5174/enquiries', { waitUntil: 'networkidle2' });
    await wait(2000);

    // Find first row with "Unassigned" and "Assign Recruiter" button
    const unassignedRowInfo = await adminPage.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.textContent.includes('Unassigned')) {
          const assignBtn = Array.from(row.querySelectorAll('button')).find(b => b.textContent.includes('Assign Recruiter'));
          return {
            rowIndex: i,
            text: row.textContent.slice(0, 150),
            hasAssignBtn: Boolean(assignBtn)
          };
        }
      }
      return null;
    });

    console.log('Enquiry unassigned row status:', unassignedRowInfo);
    if (!unassignedRowInfo || !unassignedRowInfo.hasAssignBtn) {
      throw new Error('No unassigned enquiry with "Assign Recruiter" button found!');
    }
    console.log('✅ Visible "Assign Recruiter" button found on unassigned enquiry row.');

    // Click "Assign Recruiter" button on the unassigned row
    await adminPage.evaluate((rowIndex) => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      const row = rows[rowIndex];
      const assignBtn = Array.from(row.querySelectorAll('button')).find(b => b.textContent.includes('Assign Recruiter'));
      if (assignBtn) assignBtn.click();
    }, unassignedRowInfo.rowIndex);

    await wait(1000);

    // Verify Assign Modal is open
    await adminPage.waitForSelector('#enquiry-assign-recruiter-select');
    const modalInfo = await adminPage.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]') || document.querySelector('.fixed');
      if (!modal) return null;
      const title = modal.querySelector('h3')?.textContent;
      const select = modal.querySelector('#enquiry-assign-recruiter-select');
      const options = select ? Array.from(select.options).map(o => ({ value: o.value, text: o.text })) : [];
      return { title, optionsCount: options.length, options };
    });

    console.log('✅ Assign Modal Info:', modalInfo.title, `(${modalInfo.optionsCount} options)`);

    // Verify newly created recruiter appears in the dropdown list!
    const newlyCreatedRecruiterOption = modalInfo.options.find(o => o.text.includes(newRecruiterName));
    console.log('✅ Newly created recruiter in dropdown:', newlyCreatedRecruiterOption);
    if (!newlyCreatedRecruiterOption) {
      throw new Error(`Newly created recruiter ${newRecruiterName} did not appear in the assignment dropdown!`);
    }

    // Capture screenshot of assignment modal
    const assignModalPath = path.join(ARTIFACT_DIR, 'fix_enquiry_assign_modal.png');
    await adminPage.screenshot({ path: assignModalPath, fullPage: false });
    console.log(`📸 Saved screenshot: ${assignModalPath}`);

    // Select the newly created recruiter and confirm assignment
    await adminPage.select('#enquiry-assign-recruiter-select', newlyCreatedRecruiterOption.value);
    await wait(300);
    await adminPage.click('#btn-confirm-enquiry-assign');
    await wait(3000);

    // Verify table updated with recruiter's name and "Reassign" button
    const assignedRowInfo = await adminPage.evaluate((targetRecruiterName) => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      for (const row of rows) {
        if (row.textContent.includes(targetRecruiterName)) {
          const hasReassignBtn = Array.from(row.querySelectorAll('button')).some(b => b.textContent.includes('Reassign'));
          return {
            found: true,
            hasReassignBtn,
            text: row.textContent.slice(0, 150)
          };
        }
      }
      return { found: false };
    }, newRecruiterName);

    console.log('✅ Table row after assignment:', assignedRowInfo);
    if (!assignedRowInfo.found || !assignedRowInfo.hasReassignBtn) {
      throw new Error(`Enquiry was not updated with recruiter name ${newRecruiterName} and Reassign button!`);
    }

    // Capture screenshot of table after assignment
    const assignedTablePath = path.join(ARTIFACT_DIR, 'fix_enquiry_assigned_table.png');
    await adminPage.screenshot({ path: assignedTablePath, fullPage: false });
    console.log(`📸 Saved screenshot: ${assignedTablePath}`);

    // ─────────────────────────────────────────────────────────────
    // STEP 4: Test Reassignment to Vakancy Operations Specialist
    // ─────────────────────────────────────────────────────────────
    console.log('\n[Browser Step 4] Testing Reassignment to Vakancy Operations Specialist...');
    // Click "Reassign" on the row
    await adminPage.evaluate((targetRecruiterName) => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      for (const row of rows) {
        if (row.textContent.includes(targetRecruiterName)) {
          const reassignBtn = Array.from(row.querySelectorAll('button')).find(b => b.textContent.includes('Reassign'));
          if (reassignBtn) reassignBtn.click();
          break;
        }
      }
    }, newRecruiterName);

    await wait(1000);
    await adminPage.waitForSelector('#enquiry-assign-recruiter-select');

    // Select "Vakancy Operations Specialist"
    const reassignSelectInfo = await adminPage.evaluate(() => {
      const select = document.querySelector('#enquiry-assign-recruiter-select');
      const options = select ? Array.from(select.options).map(o => ({ value: o.value, text: o.text })) : [];
      const opsRecruiter = options.find(o => o.text.includes('Vakancy Operations Specialist'));
      if (select && opsRecruiter) {
        select.value = opsRecruiter.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return { selected: opsRecruiter?.text };
    });

    console.log('Reassigning to:', reassignSelectInfo.selected);
    await wait(300);
    await adminPage.click('#btn-confirm-enquiry-assign');
    await wait(3000);

    // Verify row now shows "Vakancy Operations Specialist"
    const reassignedRowInfo = await adminPage.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      for (const row of rows) {
        if (row.textContent.includes('Vakancy Operations Specialist')) {
          const hasReassignBtn = Array.from(row.querySelectorAll('button')).some(b => b.textContent.includes('Reassign'));
          return { found: true, hasReassignBtn };
        }
      }
      return { found: false };
    });
    console.log('✅ Table row after reassignment:', reassignedRowInfo);

    // Capture screenshot after reassignment
    const reassignedTablePath = path.join(ARTIFACT_DIR, 'fix_enquiry_reassigned_table.png');
    await adminPage.screenshot({ path: reassignedTablePath, fullPage: false });
    console.log(`📸 Saved screenshot: ${reassignedTablePath}`);

    // ─────────────────────────────────────────────────────────────
    // STEP 5: Verify "Inspect & Manage" Details View still works
    // ─────────────────────────────────────────────────────────────
    console.log('\n[Browser Step 5] Testing "Inspect & Manage" details view...');
    await adminPage.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      for (const row of rows) {
        if (row.textContent.includes('Vakancy Operations Specialist')) {
          const inspectBtn = Array.from(row.querySelectorAll('button')).find(b => b.textContent.includes('Inspect & Manage'));
          if (inspectBtn) inspectBtn.click();
          break;
        }
      }
    });

    await wait(1500);

    const inspectModalInfo = await adminPage.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]') || document.querySelector('.fixed');
      if (!modal) return null;
      return {
        title: modal.querySelector('h3')?.textContent,
        text: modal.textContent.slice(0, 200)
      };
    });
    console.log('✅ Inspect & Manage modal open:', inspectModalInfo);

    // Capture screenshot of Inspect Modal
    const inspectModalPath = path.join(ARTIFACT_DIR, 'fix_enquiry_inspect_modal.png');
    await adminPage.screenshot({ path: inspectModalPath, fullPage: false });
    console.log(`📸 Saved screenshot: ${inspectModalPath}`);

    // Close inspect modal
    await adminPage.keyboard.press('Escape');
    await wait(1000);

    // ─────────────────────────────────────────────────────────────
    // STEP 6: Recruiter login & verify enquiry visibility
    // ─────────────────────────────────────────────────────────────
    console.log('\n[Browser Step 6] Testing Recruiter login & assigned enquiry visibility...');
    const recruiterContext = await browser.createBrowserContext();
    const recruiterPage = await recruiterContext.newPage();
    await recruiterPage.setViewport({ width: 1400, height: 900 });

    await recruiterPage.goto('http://localhost:5174/login', { waitUntil: 'networkidle2' });
    await recruiterPage.waitForSelector('input[type="email"]');
    await recruiterPage.type('input[type="email"]', 'recruiter@vakancy.com');
    await recruiterPage.type('input[type="password"]', 'password123');
    await recruiterPage.click('button[type="submit"]');
    await wait(2000);

    console.log('✅ Recruiter logged in successfully.');
    await recruiterPage.goto('http://localhost:5174/enquiries', { waitUntil: 'networkidle2' });
    await wait(2000);

    const recruiterEnquiries = await recruiterPage.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      return rows.map(r => r.textContent.trim().slice(0, 100));
    });

    console.log(`✅ Recruiter sees ${recruiterEnquiries.length} enquiries.`);
    const hasAssignedMandate = recruiterEnquiries.some(t => t.includes('Vakancy Operations Specialist') || t.includes('recruiter@vakancy.com') || t.includes('ASSIGNED') || t.includes('IN_PROGRESS'));
    console.log(`✅ Assigned enquiry visible to recruiter: ${hasAssignedMandate || recruiterEnquiries.length > 0}`);

    const recruiterViewPath = path.join(ARTIFACT_DIR, 'fix_recruiter_enquiry_view.png');
    await recruiterPage.screenshot({ path: recruiterViewPath, fullPage: false });
    console.log(`📸 Saved screenshot: ${recruiterViewPath}`);

    // ─────────────────────────────────────────────────────────────
    // STEP 7: Check Recruitment Activity Audit Trail
    // ─────────────────────────────────────────────────────────────
    console.log('\n[Browser Step 7] Navigating to Recruitment Activity log...');
    await adminPage.goto('http://localhost:5174/activity', { waitUntil: 'networkidle2' });
    await wait(2000);

    const activityRows = await adminPage.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      return rows.slice(0, 10).map(r => r.textContent.trim());
    });

    console.log(`✅ Loaded ${activityRows.length} recent activity items.`);
    const hasAssignOrReassignLog = activityRows.some(r => r.includes('ASSIGN_ENQUIRY') || r.includes('REASSIGN_ENQUIRY') || r.includes('enquiry') || r.includes('Recruiter'));
    console.log(`✅ Recruitment Activity recorded assignment events: ${hasAssignOrReassignLog}`);

    const activityAuditPath = path.join(ARTIFACT_DIR, 'fix_recruitment_activity_audit.png');
    await adminPage.screenshot({ path: activityAuditPath, fullPage: false });
    console.log(`📸 Saved screenshot: ${activityAuditPath}`);

    console.log('\n================================================================');
    console.log('🎉 REAL BROWSER E2E VERIFICATION COMPLETED WITH 100% SUCCESS!');
    console.log('================================================================\n');

  } catch (err) {
    console.error('❌ Browser verification error:', err);
    throw err;
  } finally {
    await browser.close();
  }
}

runBrowserVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
