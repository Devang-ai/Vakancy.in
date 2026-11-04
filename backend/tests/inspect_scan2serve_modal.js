const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const { generateToken } = require('../config/jwt');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FRONTEND_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = path.resolve(__dirname, '../../docs/screenshots');

const scan2serveUser = {
  id: 'a36db283-a2e9-4fa6-9583-e941b9a283c2',
  email: 'chauhandevang075@gmail.com',
  role: 'employer',
  company_name: 'Scan2Serve',
  token_version: 1,
  is_onboarding_completed: 1
};

const token = generateToken(scan2serveUser);

async function inspectScan2ServeModalDOM() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  try {
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle2' });
    await page.evaluate((jwt, usr) => {
      localStorage.setItem('token', jwt);
      localStorage.setItem('user', JSON.stringify(usr));
    }, token, scan2serveUser);

    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${FRONTEND_URL}/recruiter/company`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));

    // Open modal
    await page.evaluate(() => {
      const editBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Edit Company Profile'));
      if (editBtn) editBtn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    const domInspection = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]');
      if (!modal) return { error: 'Modal not found' };

      const inputs = Array.from(modal.querySelectorAll('input, select, textarea')).map(el => ({
        tag: el.tagName,
        id: el.id,
        name: el.name,
        type: el.type,
        value: el.value
      }));

      const logo = modal.querySelector('img[alt="Company Logo Preview"]');

      return {
        inputs,
        logoSrc: logo ? logo.src.slice(0, 50) + '...' : null
      };
    });

    console.log('DOM Inspection:', JSON.stringify(domInspection, null, 2));

  } finally {
    await browser.close();
  }
}

inspectScan2ServeModalDOM();

