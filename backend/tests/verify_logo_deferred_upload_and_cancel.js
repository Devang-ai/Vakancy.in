const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const { generateToken } = require('../config/jwt');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FRONTEND_URL = 'http://localhost:5173';

// Use isolated test employer usr-test-emp-01 (Apex Tech Solutions)
const employerUser = {
  id: 'usr-test-emp-01',
  email: 'employer@vakancy.com',
  role: 'employer',
  company_name: 'Apex Tech Solutions',
  token_version: 0,
  is_onboarding_completed: 1
};

const token = generateToken(employerUser);

// Create a small dummy png test file if not exists
const testImagePath = path.resolve(__dirname, 'test_logo.png');
if (!fs.existsSync(testImagePath)) {
  const dummyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  fs.writeFileSync(testImagePath, dummyPng);
}

async function verifyLogoUploadAndCancel() {
  console.log('🧪 Verifying Logo Deferred Upload, Local Preview, and Cancel Protection...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  const results = {
    previewBeforeUpload: false,
    cancelPreservedOriginal: false,
    saveSuccessfullyUploaded: false
  };

  try {
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle2' });
    await page.evaluate((jwt, usr) => {
      localStorage.setItem('token', jwt);
      localStorage.setItem('user', JSON.stringify(usr));
    }, token, employerUser);

    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${FRONTEND_URL}/recruiter/company`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));

    // Get original logo
    const initialLogo = await page.evaluate(() => {
      const img = document.querySelector('img[alt="Company Logo Preview"]') || document.querySelector('img[alt="Company Logo"]');
      return img ? img.src : null;
    });
    console.log('Original Logo:', initialLogo ? initialLogo.slice(0, 40) + '...' : 'None');

    // Open Edit Modal
    await page.evaluate(() => {
      const editBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Edit Company Profile'));
      if (editBtn) editBtn.click();
    });
    await new Promise(r => setTimeout(r, 800));

    // Track network calls to /api/employers/profile/logo
    let logoNetworkCalls = 0;
    page.on('request', (req) => {
      if (req.url().includes('/api/employers/profile/logo') && req.method() === 'POST') {
        logoNetworkCalls++;
        console.log('📡 Intercepted logo upload POST request:', req.url());
      }
    });

    // Select file input
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      await fileInput.uploadFile(testImagePath);
      await new Promise(r => setTimeout(r, 600));
    }

    // Check preview in modal
    const previewSrc = await page.evaluate(() => {
      const img = document.querySelector('img[alt="Company Logo Preview"]');
      return img ? img.src : null;
    });

    console.log('Preview after selecting file (should be data:image base64):', previewSrc ? previewSrc.slice(0, 30) + '...' : null);
    console.log('Network upload requests triggered so far (must be 0):', logoNetworkCalls);

    if (previewSrc && previewSrc.startsWith('data:image') && logoNetworkCalls === 0) {
      results.previewBeforeUpload = true;
      console.log('✅ PASS: Local preview rendered without triggering server upload!');
    } else {
      console.error('❌ FAIL: Preview did not show or server request was prematurely sent');
    }

    // Now click Cancel
    await page.evaluate(() => {
      const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Cancel');
      if (cancelBtn) cancelBtn.click();
    });
    await new Promise(r => setTimeout(r, 800));

    console.log('Network calls after Cancel (must remain 0):', logoNetworkCalls);

    // Verify profile page logo is still original
    const logoAfterCancel = await page.evaluate(() => {
      const img = document.querySelector('img[alt="Company Logo Preview"]') || document.querySelector('img[alt="Company Logo"]');
      return img ? img.src : null;
    });

    if (logoNetworkCalls === 0 && logoAfterCancel === initialLogo) {
      results.cancelPreservedOriginal = true;
      console.log('✅ PASS: Cancel cleanly aborted without uploading or mutating original logo!');
    } else {
      console.error('❌ FAIL: Cancel failed to preserve original logo');
    }

    // Reopen modal to verify pending state was reset
    await page.evaluate(() => {
      const editBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Edit Company Profile'));
      if (editBtn) editBtn.click();
    });
    await new Promise(r => setTimeout(r, 800));

    const previewAfterReopen = await page.evaluate(() => {
      const img = document.querySelector('img[alt="Company Logo Preview"]');
      return img ? img.src : null;
    });
    console.log('Modal logo after reopening (must match original):', previewAfterReopen === initialLogo);

    // Close modal
    await page.evaluate(() => {
      const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Cancel');
      if (cancelBtn) cancelBtn.click();
    });

    console.log('\n🎉 Logo Deferred Upload & Cancel Verification:', results);

  } catch (err) {
    console.error('❌ Error in test:', err);
  } finally {
    await browser.close();
  }
}

verifyLogoUploadAndCancel();

