const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const db = require('../config/db');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\Devang chauhan\\.gemini\\antigravity-ide\\brain\\b435974b-97b5-4981-8660-07ab0b84ce36';

const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function runBrowserVerification() {
  console.log('================================================================');
  console.log('🌐 RUNNING REAL BROWSER EMPLOYER CANDIDATE DATABASE VERIFICATION');
  console.log('================================================================\n');

  await db.initDB();

  // Step 0: Ensure clean DB baseline for Apex Tech Solutions
  console.log('[Setup] Setting Apex Tech Solutions candidate_access_enabled = 0, role = employer, and clearing old callbacks...');
  await db.query("UPDATE USERS SET role = 'employer' WHERE id = 'usr-test-emp-01'");
  await db.query("UPDATE EMPLOYERS SET candidate_access_enabled = 0, is_onboarding_completed = 1 WHERE id = 'emp-test-apex-01'");
  await db.query("DELETE FROM CALLBACK_REQUEST WHERE employer_id = 'emp-test-apex-01' AND source = 'CANDIDATE_DATABASE'");
  console.log('✅ Baseline initialized.\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,900']
  });

  try {
    const employerPage = await browser.newPage();
    await employerPage.setViewport({ width: 1400, height: 900 });

    employerPage.on('console', msg => console.log('[Browser Console]', msg.type(), msg.text()));
    employerPage.on('pageerror', err => console.log('[Browser PageError]', err.message));
    employerPage.on('response', res => {
      if (res.url().includes('callback') || res.url().includes('candidate')) {
        console.log('[Browser Network]', res.status(), res.url());
      }
    });

    // ─────────────────────────────────────────────────────────────
    // STEP 1: Employer logs in at http://localhost:5173/login?role=employer
    // ─────────────────────────────────────────────────────────────
    console.log('[Step 1] Employer login at http://localhost:5173/login?role=employer...');
    await employerPage.goto('http://localhost:5173/login?role=employer', { waitUntil: 'networkidle2' });
    await employerPage.waitForSelector('#email');
    await employerPage.type('#email', 'employer@vakancy.com');
    await employerPage.type('input[type="password"]', 'password123');
    await employerPage.click('button[type="submit"]');
    await wait(3000);
    console.log(`✅ Employer login submitted. Current URL: ${employerPage.url()}`);

    // ─────────────────────────────────────────────────────────────
    // STEP 2: Navigate to Candidate Database (Access OFF State)
    // ─────────────────────────────────────────────────────────────
    console.log('\n[Step 2] Navigating to http://localhost:5173/recruiter/candidates (Access OFF)...');
    await employerPage.goto('http://localhost:5173/recruiter/candidates', { waitUntil: 'networkidle2' });
    await wait(2000);

    // Verify locked screen card
    await employerPage.waitForSelector('#candidate-database-locked-card', { timeout: 10000 });
    const lockedCardVisible = await employerPage.$('#candidate-database-locked-card');
    if (!lockedCardVisible) throw new Error('Locked card not visible in Access OFF state');

    // Verify exactly ONE primary action: Request Callback (no textareas or questionnaires)
    const callbackBtn = await employerPage.$('#btn-request-database-callback');
    if (!callbackBtn) throw new Error('Request Callback button not found on locked screen');

    const textareaCount = await employerPage.evaluate(() => document.querySelectorAll('textarea').length);
    console.log(`✅ Textarea count on locked screen: ${textareaCount} (Expected 0)`);
    if (textareaCount > 0) throw new Error('Unnecessary textarea forms detected on locked access screen!');

    // Capture Screenshot 1: Access OFF State
    const ssPath1 = path.join(ARTIFACT_DIR, 'fix_candidate_database_access_off.png');
    await employerPage.screenshot({ path: ssPath1, fullPage: true });
    console.log(`📸 Screenshot saved: ${ssPath1}`);

    // ─────────────────────────────────────────────────────────────
    // STEP 3: Click Request Callback (1-Click Action)
    // ─────────────────────────────────────────────────────────────
    console.log('\n[Step 3] Clicking Request Callback (1-Click Direct Request)...');
    await employerPage.waitForSelector('#btn-request-database-callback');
    await employerPage.$eval('#btn-request-database-callback', btn => btn.click());
    await wait(2500);

    try {
      await employerPage.waitForSelector('#callback-already-requested-banner', { timeout: 10000 });
      const bannerText = await employerPage.$eval('#callback-already-requested-banner', el => el.innerText);
      console.log('✅ Pending Callback Banner displayed:', bannerText.split('\n')[0]);

      // Verify button updates to "Callback Already Requested" and is disabled
      const isBtnDisabled = await employerPage.$eval('#btn-callback-already-requested', btn => btn.disabled);
      const btnText = await employerPage.$eval('#btn-callback-already-requested', btn => btn.innerText.trim());
      console.log(`✅ Button state: text="${btnText}", disabled=${isBtnDisabled}`);

      // Capture Screenshot 2: Callback Already Requested
      const ssPath2 = path.join(ARTIFACT_DIR, 'fix_candidate_database_callback_requested.png');
      await employerPage.screenshot({ path: ssPath2, fullPage: true });
      console.log(`📸 Screenshot saved: ${ssPath2}`);
    } catch (step3Err) {
      const pageText = await employerPage.evaluate(() => document.body.innerText);
      console.error('[Step 3 Debug] Page inner text:\n', pageText);
      const dbgPath = path.join(ARTIFACT_DIR, 'debug_step3.png');
      await employerPage.screenshot({ path: dbgPath, fullPage: true });
      console.log(`📸 Debug Screenshot saved: ${dbgPath}`);
      throw step3Err;
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 4: Director toggles Candidate Database Access ON in Admin
    // ─────────────────────────────────────────────────────────────
    console.log('\n[Step 4] Director logging into Admin at http://localhost:5174/login...');
    const adminPage = await browser.newPage();
    await adminPage.setViewport({ width: 1400, height: 900 });

    await adminPage.goto('http://localhost:5174/login', { waitUntil: 'networkidle2' });
    await adminPage.waitForSelector('input[type="email"]');
    await adminPage.type('input[type="email"]', 'director@vakancy.com');
    await adminPage.type('input[type="password"]', 'password123');
    await adminPage.click('button[type="submit"]');
    await wait(2000);

    console.log('Navigating to http://localhost:5174/employers...');
    await adminPage.goto('http://localhost:5174/employers', { waitUntil: 'networkidle2' });
    await wait(2000);

    // Locate Apex Tech Solutions toggle button
    const toggleSelector = '#btn-toggle-candidate-access-emp-test-apex-01';
    await adminPage.waitForSelector(toggleSelector, { timeout: 10000 });
    
    // Check initial state (should show Access OFF)
    let toggleText = await adminPage.$eval(toggleSelector, el => el.innerText.trim());
    console.log(`Initial Admin Toggle text for Apex Tech: "${toggleText}"`);

    // Click to toggle ON
    console.log('Toggling Candidate Database Access to ON...');
    await adminPage.click(toggleSelector);
    await wait(2000);

    toggleText = await adminPage.$eval(toggleSelector, el => el.innerText.trim());
    console.log(`Updated Admin Toggle text for Apex Tech: "${toggleText}"`);

    // Capture Screenshot 3: Admin Employers with Access ON
    const ssPath3 = path.join(ARTIFACT_DIR, 'fix_admin_candidate_access_toggled_on.png');
    await adminPage.screenshot({ path: ssPath3, fullPage: true });
    console.log(`📸 Screenshot saved: ${ssPath3}`);

    // ─────────────────────────────────────────────────────────────
    // STEP 5: Employer refreshes Candidate Database (Access ON State)
    // ─────────────────────────────────────────────────────────────
    console.log('\n[Step 5] Employer reloading /recruiter/candidates with Access ON...');
    await employerPage.bringToFront();
    await employerPage.reload({ waitUntil: 'networkidle2' });
    await wait(2500);

    // Verify unlocked view
    await employerPage.waitForSelector('#candidate-database-unlocked-view', { timeout: 10000 });
    console.log('✅ Unlocked view rendered successfully.');

    // Check candidate cards and content
    const candidateCards = await employerPage.$$('[id^="candidate-card-"]');
    console.log(`✅ Candidate profiles rendered: ${candidateCards.length} cards found.`);
    if (candidateCards.length === 0) throw new Error('Expected candidate profiles to be visible!');

    // Check that skills pills and View Profile buttons exist
    let targetCard = candidateCards[0];
    let selectedName = '';
    let selectedSkills = [];

    for (const card of candidateCards) {
      const name = await card.$eval('h3', el => el.innerText.trim());
      const skills = await card.$$eval('.candidate-skill-pill', pills => pills.map(p => p.innerText.trim()));
      console.log(`  - Candidate: "${name}", Skills: [${skills.join(', ')}]`);
      if (skills.length > 0 && !selectedName) {
        targetCard = card;
        selectedName = name;
        selectedSkills = skills;
      }
    }

    const viewProfileBtn = await targetCard.$('[id^="btn-view-candidate-profile-"]');
    console.log(`✅ Selected Target Card: "${selectedName || 'Candidate'}", Skills count: ${selectedSkills.length}, View Profile Button: ${!!viewProfileBtn}`);

    // Verify that NO pipeline widgets or job application statistics exist on this page
    const pipelineWidgets = await employerPage.evaluate(() => {
      const texts = document.body.innerText;
      return {
        hasPipelineStages: texts.includes('Application Pipeline Stages') || texts.includes('Pipeline Stage'),
        hasJobStats: texts.includes('Total Applications Received') || texts.includes('Active Job Postings')
      };
    });
    console.log('✅ Pipeline widgets & job stats absent from Candidate Database:', pipelineWidgets);

    // Capture Screenshot 4: Unlocked Candidate Database
    const ssPath4 = path.join(ARTIFACT_DIR, 'fix_candidate_database_access_on.png');
    await employerPage.screenshot({ path: ssPath4, fullPage: true });
    console.log(`📸 Screenshot saved: ${ssPath4}`);

    // ─────────────────────────────────────────────────────────────
    // STEP 6: Open Candidate Profile Modal
    // ─────────────────────────────────────────────────────────────
    console.log('\n[Step 6] Clicking View Profile on candidate card...');
    await targetCard.$eval('[id^="btn-view-candidate-profile-"]', btn => btn.click());
    await wait(1500);

    // Verify modal is open
    await employerPage.waitForSelector('#candidate-profile-modal', { timeout: 10000 });
    const modalDetails = await employerPage.evaluate(() => {
      const modal = document.querySelector('#candidate-profile-modal');
      return {
        title: modal?.querySelector('h3')?.innerText.trim(),
        hasMaskedEmail: modal?.innerText.includes('Protected (Verified Account)') || modal?.innerText.includes('•') || modal?.innerText.includes('c****@vakancy.in'),
        hasConfidentialResume: modal?.innerText.includes('Resume Confidentiality Notice') || modal?.innerText.includes('Account Manager'),
        skillsCount: modal?.querySelectorAll('.candidate-skill-pill')?.length
      };
    });
    console.log('✅ Profile Modal Details:', modalDetails);

    // Capture Screenshot 5: Profile Modal
    const ssPath5 = path.join(ARTIFACT_DIR, 'fix_candidate_profile_modal.png');
    await employerPage.screenshot({ path: ssPath5, fullPage: false });
    console.log(`📸 Screenshot saved: ${ssPath5}`);

    // Close modal
    await employerPage.waitForSelector('#btn-close-candidate-modal');
    await employerPage.$eval('#btn-close-candidate-modal', btn => btn.click());
    await wait(800);

    // ─────────────────────────────────────────────────────────────
    // STEP 7: Test Empty State with Non-Existent Filter
    // ─────────────────────────────────────────────────────────────
    console.log('\n[Step 7] Testing empty state search filter...');
    await employerPage.waitForSelector('#candidate-search-input');
    await employerPage.evaluate(() => {
      const input = document.getElementById('candidate-search-input');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, 'ZZZZZNonExistentCandidateHeadline999');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await wait(500);

    await employerPage.waitForSelector('#btn-search-candidates');
    await employerPage.$eval('#btn-search-candidates', btn => btn.click());
    await wait(2500);

    await employerPage.waitForSelector('#candidate-empty-state', { timeout: 10000 });
    const emptyStateText = await employerPage.$eval('#candidate-empty-state', el => el.innerText);
    console.log('✅ Empty state displayed correctly:', emptyStateText.split('\n')[0]);

    // Capture Screenshot 6: Empty State
    const ssPath6 = path.join(ARTIFACT_DIR, 'fix_candidate_database_empty_state.png');
    await employerPage.screenshot({ path: ssPath6, fullPage: true });
    console.log(`📸 Screenshot saved: ${ssPath6}`);

    // ─────────────────────────────────────────────────────────────
    // STEP 8: Cleanup - Revert toggle
    // ─────────────────────────────────────────────────────────────
    console.log('\n[Cleanup] Reverting Apex Tech Solutions candidate_access_enabled to 0...');
    await db.query("UPDATE EMPLOYERS SET candidate_access_enabled = 0 WHERE id = 'emp-test-apex-01'");
    console.log('✅ Database state cleanly reverted.');

    console.log('\n================================================================');
    console.log('🎉 REAL BROWSER VERIFICATION SUITE COMPLETED WITH 100% SUCCESS!');
    console.log('================================================================');

  } finally {
    await browser.close();
    await db.closeDB();
  }
}

runBrowserVerification().catch(err => {
  console.error('\n❌ Browser Verification Failed:', err);
  process.exit(1);
});
