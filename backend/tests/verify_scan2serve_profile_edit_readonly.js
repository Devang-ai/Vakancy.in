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

// Actual Scan2Serve employer account (READ-ONLY INSPECTION - STRICTLY NO WRITES)
const scan2serveUser = {
  id: 'a36db283-a2e9-4fa6-9583-e941b9a283c2',
  email: 'chauhandevang075@gmail.com',
  role: 'employer',
  company_name: 'Scan2Serve',
  token_version: 1,
  is_onboarding_completed: 1
};

const token = generateToken(scan2serveUser);

async function inspectScan2ServeProfileEdit() {
  console.log('🔍 Running Read-Only Scan2Serve Company Profile Edit Inspection...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  const results = {
    viewports: {},
    prefilledFields: {},
    passed: false
  };

  try {
    // 1. Authenticate in localStorage
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle2' });
    await page.evaluate((jwt, usr) => {
      localStorage.setItem('token', jwt);
      localStorage.setItem('user', JSON.stringify(usr));
    }, token, scan2serveUser);

    // 2. Test at 1440px Desktop Viewport
    console.log('🖥️ Testing 1440px Desktop Viewport...');
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${FRONTEND_URL}/recruiter/company`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));

    // Open Edit Profile modal
    await page.evaluate(() => {
      const editBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Edit Company Profile'));
      if (editBtn) editBtn.click();
    });
    await new Promise(r => setTimeout(r, 800));

    // Capture 1440px screenshot
    const shot1440 = path.join(SCREENSHOT_DIR, 'scan2serve_company_profile_edit_readonly_1440px.png');
    await page.screenshot({ path: shot1440, fullPage: false });
    console.log('📸 Captured 1440px:', shot1440);

    // Inspect prefilled values using accurate DOM IDs
    const fieldValues = await page.evaluate(() => {
      const getVal = (id) => {
        const el = document.getElementById(id);
        return el ? el.value : null;
      };
      const logoImg = document.querySelector('img[alt="Company Logo Preview"]');
      const dialog = document.querySelector('[role="dialog"]');
      const bounding = dialog ? dialog.getBoundingClientRect() : null;

      // Location fields inside DependentLocationSelector
      const allInputs = Array.from(dialog.querySelectorAll('input[type="text"]'));
      const countryVal = allInputs.find(i => i.value === 'India')?.value || null;
      const stateVal = allInputs.find(i => i.value === 'Gujarat')?.value || null;
      const cityVal = allInputs.find(i => i.value === 'Ahmedabad')?.value || null;

      return {
        company_name: getVal('field-company_name'),
        company_type: getVal('field-company_type'),
        industry: getVal('field-industry'),
        country: countryVal,
        state: stateVal,
        city: cityVal,
        address: getVal('field-address'),
        pincode: getVal('field-pincode'),
        company_size: getVal('field-company_size'),
        about: getVal('field-about'),
        founded_year: getVal('field-founded_year'),
        official_email: getVal('field-official_email'),
        official_phone: getVal('field-official_phone'),
        contact_person_name: getVal('field-contact_person_name'),
        contact_person_designation: getVal('field-contact_person_designation'),
        linkedin_url: getVal('field-linkedin_url'),
        hasLogo: !!(logoImg && logoImg.src && logoImg.src.startsWith('data:image')),
        dialogWidth: bounding ? bounding.width : null,
        dialogHeight: bounding ? bounding.height : null
      };
    });

    results.prefilledFields = fieldValues;
    console.log('📋 Scan2Serve Prefilled Values:', JSON.stringify(fieldValues, null, 2));

    // Close modal via Cancel (strictly no writes)
    await page.evaluate(() => {
      const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Cancel');
      if (cancelBtn) cancelBtn.click();
    });
    await new Promise(r => setTimeout(r, 500));

    // 3. Test at 390px Mobile Viewport
    console.log('📱 Testing 390px Mobile Viewport...');
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(`${FRONTEND_URL}/recruiter/company`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));

    // Open Edit Profile modal
    await page.evaluate(() => {
      const editBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Edit Company Profile'));
      if (editBtn) editBtn.click();
    });
    await new Promise(r => setTimeout(r, 800));

    const shot390 = path.join(SCREENSHOT_DIR, 'scan2serve_company_profile_edit_readonly_390px.png');
    await page.screenshot({ path: shot390, fullPage: false });
    console.log('📸 Captured 390px:', shot390);

    // Check mobile drawer metrics
    const mobileMetrics = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      const bounding = dialog ? dialog.getBoundingClientRect() : null;
      const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Cancel');
      const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Save Changes');
      const cancelBounding = cancelBtn ? cancelBtn.getBoundingClientRect() : null;
      const saveBounding = saveBtn ? saveBtn.getBoundingClientRect() : null;

      return {
        width: bounding ? bounding.width : null,
        height: bounding ? bounding.height : null,
        cancelVisible: cancelBounding ? cancelBounding.bottom <= window.innerHeight : false,
        saveVisible: saveBounding ? saveBounding.bottom <= window.innerHeight : false
      };
    });

    results.viewports['390px'] = mobileMetrics;
    console.log('📱 390px Mobile Metrics:', mobileMetrics);

    // Close without saving
    await page.evaluate(() => {
      const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Cancel');
      if (cancelBtn) cancelBtn.click();
    });
    await new Promise(r => setTimeout(r, 500));

    // Assertions
    const expected = {
      company_name: 'Scan2Serve',
      industry: 'Food & Beverage',
      country: 'India',
      state: 'Gujarat',
      city: 'Ahmedabad',
      pincode: '382470',
      company_size: '1–10',
      about: 'We Provide Scan to order Systems For Foodparks and Cafes!',
      founded_year: '2018',
      official_email: 'chauhandevang075@gmail.com',
      contact_person_name: 'Devang Chauhan',
      hasLogo: true
    };

    let allMatched = true;
    for (const [k, v] of Object.entries(expected)) {
      if (fieldValues[k] !== v) {
        console.error(`❌ Mismatch for ${k}: expected "${v}", got "${fieldValues[k]}"`);
        allMatched = false;
      } else {
        console.log(`✅ Verified ${k}: "${fieldValues[k]}"`);
      }
    }

    results.passed = allMatched;
    console.log(`\n🎉 Overall Scan2Serve Read-Only Inspection Verdict: ${allMatched ? 'PASS' : 'FAIL'}`);

    fs.writeFileSync(
      path.join(SCREENSHOT_DIR, 'scan2serve_readonly_inspection_results.json'),
      JSON.stringify(results, null, 2)
    );

  } catch (err) {
    console.error('❌ Error during inspection:', err);
  } finally {
    await browser.close();
  }
}

inspectScan2ServeProfileEdit();
