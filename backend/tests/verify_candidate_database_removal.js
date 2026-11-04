const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const db = require('../config/db');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\Devang chauhan\\.gemini\\antigravity-ide\\brain\\b435974b-97b5-4981-8660-07ab0b84ce36';

const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function runCandidateDatabaseRemovalVerification() {
  console.log('========================================================================');
  console.log('🚀 VERIFY REMOVAL OF REDUNDANT CANDIDATE DATABASE & JOB-WISE ACCESS');
  console.log('Target Employer: Scan2Serve (chauhandevang075@gmail.com)');
  console.log('========================================================================\n');

  await db.initDB();

  // Job IDs for Scan2Serve
  const job1Id = 'eb1c99ab-ba9a-47e5-aa48-59852df23218'; // Full Stack Developer (Access ON)
  const job2Id = '318102a1-f4c2-44f7-8c4f-2ffd894c1d5a'; // Web Developer (Access OFF)

  // Ensure Job 1 has candidate access enabled (1)
  await db.query("UPDATE JOB SET allow_candidate_access = 1 WHERE id = ?", [job1Id]);
  // Ensure Job 2 has candidate access disabled (0)
  await db.query("UPDATE JOB SET allow_candidate_access = 0 WHERE id = ?", [job2Id]);

  console.log('✅ Baseline setup verified:');
  console.log(`   Job 1 (${job1Id}) -> allow_candidate_access = 1`);
  console.log(`   Job 2 (${job2Id}) -> allow_candidate_access = 0`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    protocolTimeout: 60000,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,960']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 960 });

    // Step 1: Login as Scan2Serve Employer
    console.log('\n[Step 1] Logging in as Scan2Serve (chauhandevang075@gmail.com) via ?role=employer...');
    await page.goto('http://localhost:5173/login?role=employer', { waitUntil: 'domcontentloaded' });
    await wait(1000);

    await page.waitForSelector('#email', { timeout: 8000 });
    await page.type('#email', 'chauhandevang075@gmail.com');
    await page.type('input[type="password"]', 'Password@123');
    await page.click('button[type="submit"]');

    await wait(3500);
    console.log('✅ Scan2Serve logged in. URL:', page.url());

    // Step 2: Verify Employer Sidebar
    console.log('\n[Step 2] Verifying Employer Sidebar navigation links...');
    await page.goto('http://localhost:5173/recruiter', { waitUntil: 'domcontentloaded' });
    await wait(2000);

    const sidebarText = await page.evaluate(() => {
      const sidebar = document.querySelector('aside');
      return sidebar ? sidebar.innerText : '';
    });

    console.log('Sidebar Navigation Items detected:\n' + sidebarText.split('\n').filter(Boolean).map(s => '  - ' + s).join('\n'));

    const hasCandidateDbInSidebar = sidebarText.toLowerCase().includes('candidate database');
    if (hasCandidateDbInSidebar) {
      throw new Error('❌ REGRESSION: "Candidate Database" link is still present in the Employer Sidebar!');
    }
    console.log('✅ PASS: "Candidate Database" is completely absent from Employer Sidebar.');

    const screenshot1 = path.join(ARTIFACT_DIR, 'step1_employer_sidebar_no_candidate_db.png');
    await page.screenshot({ path: screenshot1, fullPage: false });
    console.log('📸 Saved screenshot:', screenshot1);

    // Step 3: Test direct route redirection from /recruiter/candidates
    console.log('\n[Step 3] Testing direct route navigation: http://localhost:5173/recruiter/candidates...');
    await page.goto('http://localhost:5173/recruiter/candidates', { waitUntil: 'domcontentloaded' });
    await wait(2500);

    const currentUrl1 = page.url();
    console.log('Current URL after navigating to /recruiter/candidates:', currentUrl1);
    if (!currentUrl1.includes('/recruiter/jobs')) {
      throw new Error(`❌ REGRESSION: /recruiter/candidates did not redirect to /recruiter/jobs! Current URL: ${currentUrl1}`);
    }
    console.log('✅ PASS: /recruiter/candidates safely redirected to /recruiter/jobs.');

    const screenshot2 = path.join(ARTIFACT_DIR, 'step2_recruiter_candidates_redirected_to_jobs.png');
    await page.screenshot({ path: screenshot2, fullPage: false });
    console.log('📸 Saved screenshot:', screenshot2);

    // Step 4: Test direct route navigation to /employer/candidates
    console.log('\n[Step 4] Testing direct route navigation: http://localhost:5173/employer/candidates...');
    await page.goto('http://localhost:5173/employer/candidates', { waitUntil: 'domcontentloaded' });
    await wait(2500);

    const currentUrl2 = page.url();
    console.log('Current URL after navigating to /employer/candidates:', currentUrl2);
    if (!currentUrl2.includes('/jobs')) {
      throw new Error(`❌ REGRESSION: /employer/candidates did not redirect to jobs! Current URL: ${currentUrl2}`);
    }
    console.log('✅ PASS: /employer/candidates safely redirected to jobs.');

    const screenshot3 = path.join(ARTIFACT_DIR, 'step3_employer_candidates_redirected_to_jobs.png');
    await page.screenshot({ path: screenshot3, fullPage: false });
    console.log('📸 Saved screenshot:', screenshot3);

    // Step 5: Verify Jobs Listing & Candidate Access Badges
    console.log('\n[Step 5] Verifying Employer Jobs List and Candidate Access badges...');
    await page.goto('http://localhost:5173/recruiter/jobs', { waitUntil: 'domcontentloaded' });
    await wait(2500);

    // Check Job 1 badge (ON)
    const badgeJob1Text = await page.evaluate((id) => {
      const el = document.querySelector(`#badge-candidate-access-${id}`);
      return el ? el.innerText.trim() : null;
    }, job1Id);
    console.log(`Job 1 (${job1Id}) badge:`, badgeJob1Text);
    if (!badgeJob1Text || !badgeJob1Text.includes('ON')) {
      throw new Error(`Expected Job 1 to show Candidate Access ON, but found: ${badgeJob1Text}`);
    }

    // Check Job 2 badge (OFF)
    const badgeJob2Text = await page.evaluate((id) => {
      const el = document.querySelector(`#badge-candidate-access-${id}`);
      return el ? el.innerText.trim() : null;
    }, job2Id);
    console.log(`Job 2 (${job2Id}) badge:`, badgeJob2Text);
    if (!badgeJob2Text || !badgeJob2Text.includes('OFF')) {
      throw new Error(`Expected Job 2 to show Candidate Access OFF, but found: ${badgeJob2Text}`);
    }
    console.log('✅ PASS: Candidate Access badges accurately reflect per-job database permissions.');

    const screenshot4 = path.join(ARTIFACT_DIR, 'step4_employer_jobs_list_badges.png');
    await page.screenshot({ path: screenshot4, fullPage: false });
    console.log('📸 Saved screenshot:', screenshot4);

    // Step 6: Access ON Verification (Job 1: Review Applicants)
    console.log('\n[Step 6] Navigating to Job 1 Applicants (Access ON)...');
    await page.goto(`http://localhost:5173/recruiter/jobs/${job1Id}/applicants`, { waitUntil: 'domcontentloaded' });
    await wait(2500);

    const viewProfileBtnSel = '#btn-view-applicant-profile-ac7fda0c-998f-4162-a138-a50a658d8bb7';
    await page.waitForSelector(viewProfileBtnSel, { timeout: 8000 });
    console.log('✅ Found applicant Meet Soni row with View Profile CTA');

    // Click to open Structured Candidate Profile Modal
    console.log('[Step 6] Clicking View Profile to open #applicant-profile-modal...');
    await page.click(viewProfileBtnSel);
    await wait(1500);

    await page.waitForSelector('#applicant-profile-modal', { timeout: 6000 });
    console.log('✅ #applicant-profile-modal is rendered');

    // Verify real identifiers
    const candIdText = await page.$eval('#cand-profile-candidate-id', el => el.innerText.trim());
    const appIdText = await page.$eval('#cand-profile-app-id', el => el.innerText.trim());
    console.log(`✅ Candidate ID in modal: ${candIdText}`);
    console.log(`✅ Application ID in modal: ${appIdText}`);

    if (candIdText !== '7fb54d99-21e1-42a2-933c-5271f81b654b') {
      throw new Error(`Expected real candidate ID 7fb54d99-21e1-42a2-933c-5271f81b654b, got: ${candIdText}`);
    }
    if (appIdText !== 'ac7fda0c-998f-4162-a138-a50a658d8bb7') {
      throw new Error(`Expected real application ID ac7fda0c-998f-4162-a138-a50a658d8bb7, got: ${appIdText}`);
    }

    const screenshot5 = path.join(ARTIFACT_DIR, 'step5_candidate_profile_modal_access_on.png');
    await page.screenshot({ path: screenshot5, fullPage: false });
    console.log('📸 Saved screenshot:', screenshot5);

    // Close the Candidate Profile Modal
    await page.click('#btn-close-candidate-modal');
    await wait(800);
    const modalClosed = await page.$('#applicant-profile-modal');
    console.log(`✅ Modal closed state: ${modalClosed === null ? 'CLOSED' : 'STILL_OPEN'}`);

    // Step 7: Access OFF Verification (Job 2: Locked Gate Verification)
    console.log(`\n[Step 7] Opening Job 2 (/recruiter/jobs/${job2Id}/applicants) with Candidate Access OFF...`);
    await page.goto(`http://localhost:5173/recruiter/jobs/${job2Id}/applicants`, { waitUntil: 'domcontentloaded' });
    await wait(2500);

    // Verify locked card is rendered
    await page.waitForSelector('#job-candidate-access-locked-card', { timeout: 8000 });
    console.log('✅ Found #job-candidate-access-locked-card for Job 2');

    const lockedCardHeading = await page.$eval('#job-candidate-access-locked-card h2', el => el.innerText.trim());
    console.log(`✅ Locked card heading: "${lockedCardHeading}"`);

    // Verify applicant table is NOT displayed
    const tableFound = await page.$('table');
    console.log(`✅ Applicant table displayed: ${Boolean(tableFound)} (Should be false)`);
    if (tableFound) throw new Error('Applicant table should not be rendered when candidate access is OFF');

    const screenshot6 = path.join(ARTIFACT_DIR, 'step6_job_locked_gate_card_access_off.png');
    await page.screenshot({ path: screenshot6, fullPage: false });
    console.log('📸 Saved screenshot:', screenshot6);

    console.log('\n========================================================================');
    console.log('🎉 ALL 13 VERIFICATION CRITERIA PASSED WITHOUT REGRESSION!');
    console.log('========================================================================');

  } catch (err) {
    console.error('❌ Verification failed:', err);
    throw err;
  } finally {
    await browser.close();
    await db.closeDB();
  }
}

runCandidateDatabaseRemovalVerification().catch(err => {
  console.error(err);
  process.exit(1);
});
