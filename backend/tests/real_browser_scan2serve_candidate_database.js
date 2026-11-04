const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const db = require('../config/db');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\Devang chauhan\\.gemini\\antigravity-ide\\brain\\b435974b-97b5-4981-8660-07ab0b84ce36';

const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function runScan2ServeVerification() {
  console.log('================================================================');
  console.log('🌐 RUNNING REAL BROWSER SCAN2SERVE CANDIDATE DATABASE VERIFICATION');
  console.log('Target account: Scan2Serve (chauhandevang075@gmail.com)');
  console.log('================================================================\n');

  await db.initDB();

  // 1. Authenticated User & Employer ID Identification
  const [userRow] = await db.query(
    "SELECT id, email, role, phone, is_active FROM USERS WHERE email = 'chauhandevang075@gmail.com'"
  );
  if (!userRow) throw new Error('Scan2Serve user chauhandevang075@gmail.com not found in USERS table');
  console.log('[Auth Check] Logged-in employer authenticated user ID:', userRow.id, 'Email:', userRow.email);

  const [empRow] = await db.query(
    "SELECT id, user_id, company_name, official_email, contact_email, candidate_access_enabled FROM EMPLOYERS WHERE user_id = ?",
    [userRow.id]
  );
  if (!empRow) throw new Error(`No employer record found for user_id ${userRow.id}`);
  console.log('[Auth Check] Exact Scan2Serve Employer record:', {
    id: empRow.id,
    user_id: empRow.user_id,
    company_name: empRow.company_name,
    official_email: empRow.official_email,
    candidate_access_enabled: empRow.candidate_access_enabled
  });

  const scan2serveEmpId = empRow.id;

  // Step 0: Ensure starting baseline has access OFF so we can verify the Director toggle turning it ON
  console.log('\n[Setup] Setting baseline candidate_access_enabled = 0 for Scan2Serve...');
  await db.query("UPDATE EMPLOYERS SET candidate_access_enabled = 0 WHERE id = ?", [scan2serveEmpId]);
  console.log('✅ Baseline set: candidate_access_enabled = 0\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,900']
  });

  try {
    // ─────────────────────────────────────────────────────────────
    // STEP 1: Director logs into Admin Portal & Enables Scan2Serve Access
    // ─────────────────────────────────────────────────────────────
    console.log('[Step 1] Director logs into Admin portal at http://localhost:5174/login...');
    const adminPage = await browser.newPage();
    await adminPage.setViewport({ width: 1400, height: 900 });

    adminPage.on('console', msg => {
      if (msg.type() === 'error' || msg.text().includes('candidate')) {
        console.log('[Admin Console]', msg.type(), msg.text());
      }
    });

    await adminPage.goto('http://localhost:5174/login', { waitUntil: 'networkidle2' });
    await adminPage.waitForSelector('input[type="email"]');
    await adminPage.type('input[type="email"]', 'director@vakancy.com');
    await adminPage.type('input[type="password"]', 'password123');
    await adminPage.click('button[type="submit"]');
    await wait(3000);
    console.log(`✅ Director logged in. URL: ${adminPage.url()}`);

    console.log('[Step 2] Navigating to Admin Employers list at http://localhost:5174/employers...');
    await adminPage.goto('http://localhost:5174/employers', { waitUntil: 'networkidle2' });
    await wait(2000);

    // Search for Scan2Serve
    console.log('[Step 3] Searching for Scan2Serve in Admin Employers...');
    await adminPage.waitForSelector('input[placeholder*="Search"]');
    await adminPage.type('input[placeholder*="Search"]', 'Scan2Serve');
    await wait(1000);

    // Check Scan2Serve toggle button
    const toggleSelector = `#btn-toggle-candidate-access-${scan2serveEmpId}`;
    await adminPage.waitForSelector(toggleSelector, { timeout: 10000 });
    const initialToggleText = await adminPage.$eval(toggleSelector, el => el.innerText.trim());
    console.log(`✅ Scan2Serve toggle button located. Current text: "${initialToggleText}"`);

    // Click toggle to turn Access ON
    console.log('[Step 4] Director clicking Candidate DB Access toggle to turn ON...');
    await adminPage.click(toggleSelector);
    await wait(2500);

    // Verify DB updated
    const [dbCheckOn] = await db.query(
      "SELECT candidate_access_enabled FROM EMPLOYERS WHERE id = ?",
      [scan2serveEmpId]
    );
    console.log(`✅ Database verify: EMPLOYERS.candidate_access_enabled = ${dbCheckOn.candidate_access_enabled} (Expected 1)`);
    if (dbCheckOn.candidate_access_enabled !== 1) {
      throw new Error('Database candidate_access_enabled failed to update to 1');
    }

    const updatedToggleText = await adminPage.$eval(toggleSelector, el => el.innerText.trim());
    console.log(`✅ Admin button text after toggle: "${updatedToggleText}"`);

    const ssAdminOn = path.join(ARTIFACT_DIR, 'fix_admin_scan2serve_access_toggled_on.png');
    await adminPage.screenshot({ path: ssAdminOn, fullPage: true });
    console.log(`📸 Screenshot saved: ${ssAdminOn}`);

    // ─────────────────────────────────────────────────────────────
    // STEP 2: Scan2Serve Employer logs in & verifies Candidate Profiles
    // ─────────────────────────────────────────────────────────────
    console.log('\n[Step 5] Scan2Serve employer login at http://localhost:5173/login?role=employer...');
    const employerPage = await browser.newPage();
    await employerPage.setViewport({ width: 1400, height: 900 });

    employerPage.on('console', msg => {
      if (msg.type() === 'error' || msg.text().includes('CandidateDatabase')) {
        console.log('[Employer Console]', msg.type(), msg.text());
      }
    });

    let apiResponseStatus = null;
    let apiResponseBody = null;
    employerPage.on('response', async res => {
      if (res.url().includes('/api/employers/candidate-database')) {
        apiResponseStatus = res.status();
        try {
          apiResponseBody = await res.json();
          console.log(`[Employer Network] GET /api/employers/candidate-database => HTTP ${apiResponseStatus}`);
          console.log(`[Employer Network] access_enabled: ${apiResponseBody.access_enabled}, candidate count: ${apiResponseBody.candidates ? apiResponseBody.candidates.length : 0}`);
        } catch (_) {}
      }
    });

    await employerPage.goto('http://localhost:5173/login?role=employer', { waitUntil: 'networkidle2' });
    await employerPage.waitForSelector('#email');
    await employerPage.type('#email', 'chauhandevang075@gmail.com');
    await employerPage.type('input[type="password"]', 'Password@123');
    await employerPage.click('button[type="submit"]');
    await wait(3500);
    console.log(`✅ Scan2Serve employer logged in. URL: ${employerPage.url()}`);

    console.log('[Step 6] Navigating to http://localhost:5173/recruiter/candidates (Access ON)...');
    await employerPage.goto('http://localhost:5173/recruiter/candidates', { waitUntil: 'networkidle2' });
    await wait(3000);

    // Verify unlocked view
    await employerPage.waitForSelector('#candidate-database-unlocked-view', { timeout: 10000 });
    console.log('✅ Unlocked view #candidate-database-unlocked-view is visible.');

    // Verify candidates are rendered
    const candidateCards = await employerPage.$$('[id^="candidate-card-"]');
    console.log(`✅ Candidate cards rendered: ${candidateCards.length}`);
    if (candidateCards.length === 0) {
      throw new Error('No candidate cards rendered for Scan2Serve with access enabled!');
    }

    // Verify candidate details on the first card (Meet Soni or Aditi Sharma Lead)
    const cardTexts = await employerPage.$$eval('[id^="candidate-card-"]', cards =>
      cards.map(c => ({
        id: c.id,
        text: c.innerText.replace(/\n+/g, ' ')
      }))
    );
    console.log('Rendered candidates summary:');
    cardTexts.forEach((c, idx) => console.log(`  [${idx + 1}] ${c.id}: ${c.text.substring(0, 120)}...`));

    // Verify skills pills
    const skillPillCount = await employerPage.$$eval('.candidate-skill-pill', pills => pills.length);
    console.log(`✅ Total candidate verified skill pills displayed: ${skillPillCount}`);

    const ssEmpUnlocked = path.join(ARTIFACT_DIR, 'fix_candidate_database_scan2serve_unlocked.png');
    await employerPage.screenshot({ path: ssEmpUnlocked, fullPage: true });
    console.log(`📸 Screenshot saved: ${ssEmpUnlocked}`);

    // ─────────────────────────────────────────────────────────────
    // STEP 3: Click View Profile on Candidate Card
    // ─────────────────────────────────────────────────────────────
    console.log('\n[Step 7] Testing View Profile modal on candidate card...');
    const viewProfileBtn = await employerPage.$('[id^="btn-view-candidate-profile-"]');
    if (!viewProfileBtn) throw new Error('View Profile button not found on candidate card');

    const btnId = await employerPage.evaluate(el => el.id, viewProfileBtn);
    console.log(`Clicking View Profile button: #${btnId}`);
    await viewProfileBtn.click();
    await wait(1500);

    await employerPage.waitForSelector('#candidate-profile-modal', { timeout: 5000 });
    const modalVisible = await employerPage.$('#candidate-profile-modal');
    if (!modalVisible) throw new Error('Candidate profile modal did not appear!');

    const modalTitle = await employerPage.$eval('#candidate-profile-modal-title', el => el.innerText.trim());
    console.log(`✅ Candidate Profile Modal opened successfully for: "${modalTitle}"`);

    const ssEmpModal = path.join(ARTIFACT_DIR, 'fix_candidate_profile_scan2serve_modal.png');
    await employerPage.screenshot({ path: ssEmpModal });
    console.log(`📸 Screenshot saved: ${ssEmpModal}`);

    // Close modal
    await employerPage.click('#btn-close-candidate-modal');
    await wait(1000);
    console.log('✅ Candidate Profile Modal closed.');

    // ─────────────────────────────────────────────────────────────
    // STEP 4: Director Disables Access (Access OFF)
    // ─────────────────────────────────────────────────────────────
    console.log('\n[Step 8] Director toggling Scan2Serve access OFF...');
    await adminPage.bringToFront();
    await adminPage.click(toggleSelector);
    await wait(2500);

    const [dbCheckOff] = await db.query(
      "SELECT candidate_access_enabled FROM EMPLOYERS WHERE id = ?",
      [scan2serveEmpId]
    );
    console.log(`✅ Database verify: EMPLOYERS.candidate_access_enabled = ${dbCheckOff.candidate_access_enabled} (Expected 0)`);
    if (dbCheckOff.candidate_access_enabled !== 0) {
      throw new Error('Database candidate_access_enabled failed to update to 0');
    }

    const ssAdminOff = path.join(ARTIFACT_DIR, 'fix_admin_scan2serve_access_toggled_off.png');
    await adminPage.screenshot({ path: ssAdminOff, fullPage: true });
    console.log(`📸 Screenshot saved: ${ssAdminOff}`);

    // ─────────────────────────────────────────────────────────────
    // STEP 5: Scan2Serve Employer sees Locked Screen
    // ─────────────────────────────────────────────────────────────
    console.log('\n[Step 9] Scan2Serve employer reloads Candidate Database (Access OFF)...');
    await employerPage.bringToFront();
    await employerPage.reload({ waitUntil: 'networkidle2' });
    await wait(2500);

    await employerPage.waitForSelector('#candidate-database-locked-card', { timeout: 10000 });
    const lockedCardVisible = await employerPage.$('#candidate-database-locked-card');
    if (!lockedCardVisible) throw new Error('Locked card not visible in Access OFF state');

    console.log('✅ Locked card #candidate-database-locked-card is displayed.');

    // Verify no unlocked cards
    const unlockedView = await employerPage.$('#candidate-database-unlocked-view');
    if (unlockedView) throw new Error('Unlocked view should not be present when access is OFF!');

    const ssEmpLocked = path.join(ARTIFACT_DIR, 'fix_candidate_database_scan2serve_locked.png');
    await employerPage.screenshot({ path: ssEmpLocked, fullPage: true });
    console.log(`📸 Screenshot saved: ${ssEmpLocked}`);

    // ─────────────────────────────────────────────────────────────
    // STEP 6: Re-enable Access to Preserve Working State for User
    // ─────────────────────────────────────────────────────────────
    console.log('\n[Step 10] Re-enabling access to preserve working state for Scan2Serve account...');
    await adminPage.bringToFront();
    await adminPage.click(toggleSelector);
    await wait(2500);

    const [dbCheckFinal] = await db.query(
      "SELECT candidate_access_enabled FROM EMPLOYERS WHERE id = ?",
      [scan2serveEmpId]
    );
    console.log(`✅ Database verify: EMPLOYERS.candidate_access_enabled = ${dbCheckFinal.candidate_access_enabled} (Final ON)`);

    await employerPage.bringToFront();
    await employerPage.reload({ waitUntil: 'networkidle2' });
    await wait(2500);
    await employerPage.waitForSelector('#candidate-database-unlocked-view', { timeout: 10000 });

    const ssEmpFinal = path.join(ARTIFACT_DIR, 'fix_candidate_database_scan2serve_final_on.png');
    await employerPage.screenshot({ path: ssEmpFinal, fullPage: true });
    console.log(`📸 Final Screenshot saved: ${ssEmpFinal}`);

    console.log('\n================================================================');
    console.log('🎉 ALL END-TO-END SCAN2SERVE BROWSER VERIFICATIONS PASSED');
    console.log('================================================================\n');

  } finally {
    await browser.close();
  }
}

runScan2ServeVerification().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
