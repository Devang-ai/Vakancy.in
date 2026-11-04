const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const { generateToken } = require('../config/jwt');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FRONTEND_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = path.resolve(__dirname, '../../docs/screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Isolated test employer
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
  { name: '320px', width: 320, height: 700 },
  { name: '360px', width: 360, height: 800 },
  { name: '390px', width: 390, height: 844 },
  { name: '430px', width: 430, height: 932 },
  { name: '768px', width: 768, height: 1024 },
  { name: '1440px', width: 1440, height: 900 }
];

async function runEmployerEditVerification() {
  console.log('🚀 Launching Employer Company Profile Edit UI Verification & Capture Suite...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  const testResults = {
    timestamp: new Date().toISOString(),
    viewports: [],
    validationTest: null,
    cancelTest: null,
    persistenceTest: null
  };

  try {
    // 1. VIEWPORT AFTER SCREENSHOT CAPTURE & OVERFLOW CHECK
    for (const vp of VIEWPORTS) {
      console.log(`\n--- Testing Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
      await page.setViewport({ width: vp.width, height: vp.height });

      await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'domcontentloaded' });
      await page.evaluate((tok, usr) => {
        localStorage.setItem('token', tok);
        localStorage.setItem('user', JSON.stringify(usr));
        localStorage.setItem('profile', JSON.stringify({ is_onboarding_completed: 1, ...usr }));
      }, employerToken, employerUser);

      await page.goto(`${FRONTEND_URL}/recruiter/company`, { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 600));

      // Click "Edit Company Profile"
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const editBtn = btns.find(b => b.textContent.includes('Edit Company Profile'));
        if (editBtn) editBtn.click();
      });

      await new Promise(r => setTimeout(r, 600));

      // Modal metrics check
      const modalMetrics = await page.evaluate(() => {
        const dialog = document.querySelector('div[role="dialog"] > div');
        if (!dialog) return null;
        const rect = dialog.getBoundingClientRect();
        const logoPreview = document.querySelector('#section-identity img, #section-identity div.rounded-xl');
        let isLogoSquare = false;
        if (logoPreview) {
          const lRect = logoPreview.getBoundingClientRect();
          isLogoSquare = Math.abs(lRect.width - lRect.height) < 4;
        }
        return {
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          top: Math.round(rect.top),
          bottom: Math.round(rect.bottom),
          left: Math.round(rect.left),
          isLogoSquare,
          hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth
        };
      });

      console.log(`Modal Metrics at ${vp.name}:`, modalMetrics);

      // Capture AFTER screenshot with modal open
      const filename = `employer_company_profile_edit_after_${vp.name}.png`;
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, filename) });
      console.log(`Saved AFTER screenshot: ${filename}`);

      // Scroll modal body down and capture scrolled view
      await page.evaluate(() => {
        const modalForm = document.querySelector('form#employer-profile-edit-form');
        if (modalForm) modalForm.scrollTop = 450;
      });
      await new Promise(r => setTimeout(r, 300));
      const scrollFilename = `employer_company_profile_edit_after_${vp.name}_scrolled.png`;
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, scrollFilename) });
      console.log(`Saved AFTER scrolled screenshot: ${scrollFilename}`);

      testResults.viewports.push({
        viewport: vp.name,
        width: vp.width,
        height: vp.height,
        metrics: modalMetrics,
        passed: modalMetrics && !modalMetrics.hasHorizontalOverflow && modalMetrics.top >= 0
      });

      // Close modal
      await page.evaluate(() => {
        const closeBtn = document.querySelector('button[aria-label="Close modal"]');
        if (closeBtn) closeBtn.click();
      });
      await new Promise(r => setTimeout(r, 400));
    }

    // 2. VALIDATION TEST
    console.log('\n--- 2. Testing Form Validation & Required Fields ---');
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${FRONTEND_URL}/recruiter/company`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 500));

    // Open modal
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const editBtn = btns.find(b => b.textContent.includes('Edit Company Profile'));
      if (editBtn) editBtn.click();
    });
    await new Promise(r => setTimeout(r, 600));

    // Clear company_name via native setter to trigger React onChange
    await page.evaluate(() => {
      const input = document.getElementById('field-company_name');
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(input, '');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await new Promise(r => setTimeout(r, 200));

    // Click Save Changes button
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const submitBtn = btns.find(b => b.textContent.includes('Save Changes'));
      if (submitBtn) submitBtn.click();
    });
    await new Promise(r => setTimeout(r, 500));

    const validationResult = await page.evaluate(() => {
      const errorMsg = document.querySelector('p.text-\\[\\#ba1a1a\\]');
      const dialogStillOpen = !!document.querySelector('div[role="dialog"]');
      return {
        hasErrorMsg: !!errorMsg && errorMsg.textContent.includes('Company name is required'),
        errorText: errorMsg ? errorMsg.textContent.trim() : null,
        dialogStillOpen
      };
    });

    console.log('Validation Test Result:', validationResult);
    testResults.validationTest = {
      passed: validationResult.hasErrorMsg && validationResult.dialogStillOpen,
      details: validationResult
    };

    // Close modal via Cancel
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const cancelBtn = btns.find(b => b.textContent.trim() === 'Cancel');
      if (cancelBtn) cancelBtn.click();
    });
    await new Promise(r => setTimeout(r, 400));

    // 3. CANCEL TEST (Discards Unsaved Changes)
    console.log('\n--- 3. Testing Cancel Action (Discards Unsaved Changes) ---');
    // Reopen modal
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const editBtn = btns.find(b => b.textContent.includes('Edit Company Profile'));
      if (editBtn) editBtn.click();
    });
    await new Promise(r => setTimeout(r, 600));

    const initialTagline = await page.evaluate(() => {
      const input = document.getElementById('field-tagline');
      return input ? input.value : '';
    });

    // Type a dummy tagline via keyboard
    await page.click('#field-tagline', { clickCount: 3 });
    await page.keyboard.type('Temporary Discarded Tagline');
    await new Promise(r => setTimeout(r, 200));

    // Click Cancel
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const cancelBtn = btns.find(b => b.textContent.trim() === 'Cancel');
      if (cancelBtn) cancelBtn.click();
    });
    await new Promise(r => setTimeout(r, 400));

    // Reopen and check if discarded
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const editBtn = btns.find(b => b.textContent.includes('Edit Company Profile'));
      if (editBtn) editBtn.click();
    });
    await new Promise(r => setTimeout(r, 600));

    const afterCancelTagline = await page.evaluate(() => {
      const input = document.getElementById('field-tagline');
      return input ? input.value : '';
    });

    const cancelPassed = afterCancelTagline === initialTagline;
    console.log(`Cancel Test Result: Discarded correctly? ${cancelPassed} (Tagline: "${afterCancelTagline}")`);
    testResults.cancelTest = {
      passed: cancelPassed,
      initialTagline,
      afterCancelTagline
    };

    // 4. SAVE & PERSISTENCE TEST (Isolated Employer)
    console.log('\n--- 4. Testing Save & DB Persistence (Isolated Employer) ---');
    const newTestTagline = `Innovating Enterprise Cloud - Verified ${Date.now().toString().slice(-4)}`;
    
    // Fill new tagline via keyboard
    await page.click('#field-tagline', { clickCount: 3 });
    await page.keyboard.press('Backspace');
    await page.keyboard.type(newTestTagline);
    await new Promise(r => setTimeout(r, 200));

    // Click Save Changes button
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const submitBtn = btns.find(b => b.textContent.includes('Save Changes'));
      if (submitBtn) submitBtn.click();
    });
    await new Promise(r => setTimeout(r, 1800));

    // Verify modal closed and page displays updated tagline
    const pageTextAfterSave = await page.evaluate(() => document.body.innerText);
    const saveReflectedOnPage = pageTextAfterSave.includes(newTestTagline);
    console.log(`Immediate update reflected on page: ${saveReflectedOnPage}`);

    // Refresh browser to verify DB persistence
    console.log('Reloading page to test server/database persistence...');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 1200));

    const pageTextAfterReload = await page.evaluate(() => document.body.innerText);
    const persistencePassed = pageTextAfterReload.includes(newTestTagline);
    console.log(`Persisted in database after page reload: ${persistencePassed}`);

    testResults.persistenceTest = {
      passed: persistencePassed,
      savedTagline: newTestTagline,
      saveReflectedOnPage,
      persistedAfterReload: persistencePassed
    };

  } catch (err) {
    console.error('Error during Employer Edit UI verification:', err);
    testResults.error = err.message;
  } finally {
    await browser.close();
  }

  console.log('\n================ VERIFICATION SUMMARY ================');
  console.log(JSON.stringify(testResults, null, 2));
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'employer_company_profile_edit_results.json'), JSON.stringify(testResults, null, 2));
}

runEmployerEditVerification().catch(err => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
