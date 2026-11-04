const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const ARTIFACT_DIR = 'C:\\Users\\Devang chauhan\\.gemini\\antigravity-ide\\brain\\00c52c15-9292-4112-9070-2116838752a8';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function captureScreens() {
  console.log('Capturing Admin Job Management Screenshots...');

  // 1. Get a fresh Director JWT
  const loginRes = await axios.post('http://localhost:5002/api/auth/login', {
    email: 'director@vakancy.com',
    password: 'password123'
  });
  const { token, user } = loginRes.data;
  console.log('Director token acquired.');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  const page = await browser.newPage();

  // Navigate to login page first to initialize local origin
  await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle2' });

  // Inject token and user into localStorage
  await page.evaluate((t, u) => {
    localStorage.setItem('token', t);
    localStorage.setItem('user', JSON.stringify(u));
  }, token, user);

  // 1. Jobs Listing Page
  console.log('Navigating to http://localhost:5174/jobs ...');
  await page.goto('http://localhost:5174/jobs', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  const jobsListPath = path.join(ARTIFACT_DIR, 'admin_jobs_listing.png');
  await page.screenshot({ path: jobsListPath, fullPage: false });
  console.log(`Saved: ${jobsListPath}`);

  // 2. Open Create Job Modal
  console.log('Opening Create Job modal...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent.includes('Create Job'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  const createModalPath = path.join(ARTIFACT_DIR, 'admin_create_job_modal.png');
  await page.screenshot({ path: createModalPath, fullPage: false });
  console.log(`Saved: ${createModalPath}`);

  // Close Create Job Modal
  await page.evaluate(() => {
    const closeBtn = document.querySelector('button[aria-label="Close"], button.text-slate-400');
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  // 3. Open Job Details Modal
  console.log('Opening Job Details modal...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const viewBtn = buttons.find(b => b.textContent.includes('View') || b.title === 'View Details');
    if (viewBtn) viewBtn.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  const detailsModalPath = path.join(ARTIFACT_DIR, 'admin_job_details_drawer.png');
  await page.screenshot({ path: detailsModalPath, fullPage: false });
  console.log(`Saved: ${detailsModalPath}`);

  // 4. Callbacks Queue Page
  console.log('Navigating to http://localhost:5174/callbacks ...');
  await page.goto('http://localhost:5174/callbacks', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  const callbacksPath = path.join(ARTIFACT_DIR, 'admin_callbacks_queue.png');
  await page.screenshot({ path: callbacksPath, fullPage: false });
  console.log(`Saved: ${callbacksPath}`);

  await browser.close();
  console.log('All screenshots captured successfully!');
}

captureScreens().catch(err => {
  console.error('Error capturing screens:', err);
  process.exit(1);
});
