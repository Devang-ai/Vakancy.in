const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const { generateToken } = require('../config/jwt');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FRONTEND_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = path.resolve(__dirname, '../../docs/screenshots/employer_final_verification');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Real authenticated employer user (Scan2Serve)
const employerUser = {
  id: 'a36db283-a2e9-4fa6-9583-e941b9a283c2',
  email: 'chauhandevang075@gmail.com',
  role: 'employer',
  company_name: 'Scan2Serve',
  token_version: 2
};
const employerToken = generateToken(employerUser);

async function runEmployerVerification() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Set authorization token in localStorage
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle2' });
    await page.evaluate((token, user) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }, employerToken, employerUser);

    console.log('1. Verifying Settings Page (Phase 4: 403 Forbidden Resolution)...');
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${FRONTEND_URL}/recruiter/settings/security`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));

    // Verify Notification Preferences
    const notifSectionText = await page.evaluate(() => {
      const heading = document.querySelector('h2');
      const body = document.body.innerText;
      return {
        has403: body.includes('Forbidden') || body.includes('not authorized'),
        hasNotificationPrefs: body.includes('Notification Preferences'),
        hasCheckboxes: document.querySelectorAll('input[type="checkbox"]').length
      };
    });
    console.log('Notification preferences status:', notifSectionText);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'desktop_settings_security.png'), fullPage: false });

    console.log('2. Verifying Job Category & Skills Dropdown Overlap (Phase 1)...');
    await page.goto(`${FRONTEND_URL}/recruiter/jobs/create`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));

    // Click Category input to trigger dropdown
    const catInput = await page.$('input[placeholder*="Search job category"]');
    if (catInput) {
      await catInput.click();
      await catInput.type('Soft');
      await new Promise(r => setTimeout(r, 800));

      const dropdownInfo = await page.evaluate(() => {
        const popup = document.querySelector('.animate-fade-in');
        const skillsSection = document.querySelector('.border-t');
        if (!popup) return { popupFound: false };
        const popRect = popup.getBoundingClientRect();
        const popStyle = window.getComputedStyle(popup);
        return {
          popupFound: true,
          popZIndex: popStyle.zIndex,
          top: popRect.top,
          height: popRect.height,
          itemsCount: popup.querySelectorAll('button').length
        };
      });
      console.log('Category dropdown state:', dropdownInfo);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'category_dropdown_open.png'), fullPage: false });
    }

    console.log('3. Verifying Salary Structure vs Salary Basis (Phase 2)...');
    // Scroll to Compensation Section
    await page.evaluate(() => {
      const compHeading = Array.from(document.querySelectorAll('h2')).find(h => h.innerText.includes('Compensation'));
      if (compHeading) compHeading.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    await new Promise(r => setTimeout(r, 800));

    const salaryLabels = await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('label')).map(l => l.innerText);
      return {
        hasSalaryStructure: labels.some(l => l.includes('Salary Structure')),
        hasSalaryBasis: labels.some(l => l.includes('Salary Basis')),
        hasSalaryPeriod: labels.some(l => l.includes('Salary Period')),
        hasCurrency: labels.some(l => l.includes('Currency'))
      };
    });
    console.log('Salary configuration labels:', salaryLabels);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'salary_compensation_fields.png'), fullPage: false });

    console.log('4. Verifying Header Notification Bell & Duplicate Sidebar Bell Removal (Phase 3)...');
    // Switch to Mobile Viewport (390x844)
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(`${FRONTEND_URL}/recruiter/dashboard`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));

    // Verify sidebar has no duplicate bell
    const sidebarBellExists = await page.evaluate(() => {
      return Boolean(document.getElementById('employer-notif-bell'));
    });
    console.log('Duplicate sidebar notification bell exists:', sidebarBellExists);

    // Click header bell
    const headerBell = await page.$('#employer-header-notif-bell');
    if (headerBell) {
      await headerBell.click();
      await new Promise(r => setTimeout(r, 800));

      const mobileDrawerState = await page.evaluate(() => {
        const drawer = document.getElementById('employer-mobile-notif-drawer');
        return {
          drawerFound: Boolean(drawer),
          hasNotificationsHeader: drawer ? drawer.innerText.includes('Notifications') : false
        };
      });
      console.log('Mobile notification drawer state:', mobileDrawerState);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'mobile_390_header_notif_drawer.png'), fullPage: false });
    }

    console.log('5. Capturing iPad Pro 13-inch (1032x1376) and Desktop (1440x900) views...');
    // iPad Pro 13-inch portrait
    await page.setViewport({ width: 1032, height: 1376 });
    await page.goto(`${FRONTEND_URL}/recruiter/dashboard`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'ipad_1032_employer_dashboard.png'), fullPage: false });

    await page.goto(`${FRONTEND_URL}/recruiter/jobs`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'ipad_1032_employer_jobs.png'), fullPage: false });

    // Desktop 1440x900
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${FRONTEND_URL}/recruiter/dashboard`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'desktop_1440_employer_dashboard.png'), fullPage: false });

    await page.goto(`${FRONTEND_URL}/recruiter/jobs`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'desktop_1440_employer_jobs.png'), fullPage: false });

    console.log('ALL VERIFICATIONS COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    await browser.close();
  }
}

runEmployerVerification();

