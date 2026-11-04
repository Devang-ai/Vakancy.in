const puppeteer = require('puppeteer-core');
const path = require('path');
const axios = require('axios');

const ARTIFACT_DIR = 'C:\\Users\\Devang chauhan\\.gemini\\antigravity-ide\\brain\\00c52c15-9292-4112-9070-2116838752a8';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function capture() {
  const loginRes = await axios.post('http://localhost:5002/api/auth/login', {
    email: 'director@vakancy.com',
    password: 'password123'
  });
  const { token, user } = loginRes.data;

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle2' });

  await page.evaluate((t, u) => {
    localStorage.setItem('token', t);
    localStorage.setItem('user', JSON.stringify(u));
  }, token, user);

  console.log('Navigating to http://localhost:5174/applications ...');
  await page.goto('http://localhost:5174/applications', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  const appPath = path.join(ARTIFACT_DIR, 'admin_applications_current.png');
  await page.screenshot({ path: appPath, fullPage: false });
  console.log('Saved:', appPath);

  // Also check console errors
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

  await browser.close();
}

capture().catch(console.error);
