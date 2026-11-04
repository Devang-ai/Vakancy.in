const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = 'C:\\Users\\Devang chauhan\\.gemini\\antigravity-ide\\brain\\b435974b-97b5-4981-8660-07ab0b84ce36';

async function runBrowserTest() {
  console.log('🚀 Starting Real Browser Phase E Verification...');

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  try {
    // 1. Log in as Director
    console.log('[1/7] Logging in as Director at http://localhost:5174/admin/login...');
    await page.goto('http://localhost:5174/admin/login', { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', 'director@vakancy.com');
    await page.type('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    // 2. Navigate to Contact Enquiries / Executive Search
    console.log('[2/7] Navigating to http://localhost:5174/enquiries...');
    await page.goto('http://localhost:5174/enquiries', { waitUntil: 'networkidle2' });
    await page.waitForSelector('table');
    await new Promise(r => setTimeout(r, 1000));

    // Capture Director Enquiries Table
    const screen1 = path.join(ARTIFACTS_DIR, 'phase_e_director_enquiries_table.png');
    await page.screenshot({ path: screen1, fullPage: false });
    console.log('📸 Captured:', screen1);

    // 3. Open Assign Recruiter Modal
    console.log('[3/7] Opening Recruiter Assignment Modal...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('Assign Recruiter') || b.textContent.includes('Reassign'));
      if (btn) btn.click();
    });
    await page.waitForSelector('#btn-confirm-enquiry-assign', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 800));

    // Capture Assignment Modal
    const screen2 = path.join(ARTIFACTS_DIR, 'phase_e_director_assign_modal.png');
    await page.screenshot({ path: screen2, fullPage: false });
    console.log('📸 Captured:', screen2);

    // Select recruiter and confirm
    await page.evaluate(() => {
      const radios = document.querySelectorAll('input[type="radio"]');
      if (radios.length > 0) radios[0].click();
    });
    await new Promise(r => setTimeout(r, 400));
    await page.click('#btn-confirm-enquiry-assign');
    await new Promise(r => setTimeout(r, 1500));

    const screen3 = path.join(ARTIFACTS_DIR, 'phase_e_director_enquiry_assigned_refreshed.png');
    await page.screenshot({ path: screen3, fullPage: false });
    console.log('📸 Captured:', screen3);

    // 4. Log out and log in as Recruiter
    console.log('[4/7] Logging out and logging in as Recruiter (recruiter@vakancy.com)...');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', 'recruiter@vakancy.com');
    await page.type('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    // 5. Navigate to Recruiter Workspace: Assigned Enquiries
    console.log('[5/7] Navigating to Recruiter Workspace at http://localhost:5174/enquiries...');
    await page.goto('http://localhost:5174/enquiries', { waitUntil: 'networkidle2' });
    await page.waitForSelector('table');
    await new Promise(r => setTimeout(r, 1000));

    const screen4 = path.join(ARTIFACTS_DIR, 'phase_e_recruiter_workspace_view.png');
    await page.screenshot({ path: screen4, fullPage: false });
    console.log('📸 Captured:', screen4);

    // 6. Open Inspect & Manage Modal
    console.log('[6/7] Opening Inspect & Manage Modal...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('Inspect & Manage'));
      if (btn) btn.click();
    });
    await page.waitForSelector('h4', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 1200));

    const screen5 = path.join(ARTIFACTS_DIR, 'phase_e_inspect_manage_5_sections.png');
    await page.screenshot({ path: screen5, fullPage: false });
    console.log('📸 Captured:', screen5);

    // 7. Click "Create Job from Enquiry"
    console.log('[7/7] Clicking "Create Job from Enquiry" to launch prefilled job form...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('Create Job from Enquiry'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1500));

    const screen6 = path.join(ARTIFACTS_DIR, 'phase_e_prefilled_job_mandate_modal.png');
    await page.screenshot({ path: screen6, fullPage: false });
    console.log('📸 Captured:', screen6);

    console.log('🎉 Browser verification completed successfully!');
  } catch (err) {
    console.error('❌ Browser testing error:', err);
  } finally {
    await browser.close();
  }
}

runBrowserTest();
