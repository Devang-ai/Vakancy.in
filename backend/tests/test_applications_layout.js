const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const { generateToken } = require('../config/jwt');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outDir = path.resolve(__dirname, '../../docs/screenshots/applications_fixed');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const candidateUser = {
  id: '85d519ba-7084-440c-aa3f-a53334538c7e',
  email: 'meet@scan2serve.com',
  role: 'candidate',
  name: 'Meet Soni',
  token_version: 0,
  is_onboarding_completed: 1
};
const candidateToken = generateToken(candidateUser);

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: 'new' });
  const page = await browser.newPage();
  
  // Set auth
  await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate((tok, usr) => {
    localStorage.setItem('token', tok);
    localStorage.setItem('user', JSON.stringify(usr));
  }, candidateToken, candidateUser);

  for (const vp of [
    { name: 'desktop_1440', w: 1440, h: 900 },
    { name: 'tablet_1032_ipad_pro', w: 1032, h: 1376 },
    { name: 'tablet_768', w: 768, h: 1024 },
    { name: 'mobile_390', w: 390, h: 844 }
  ]) {
    await page.setViewport({ width: vp.w, height: vp.h });
    await page.goto('http://localhost:5173/candidate/applications', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    const res = await page.evaluate(() => {
      const searchInput = document.querySelector('#pipelineSearch');
      const sr = searchInput ? searchInput.getBoundingClientRect() : null;
      const dropdowns = Array.from(document.querySelectorAll('button[aria-haspopup="listbox"]'));
      return {
        searchTop: sr ? Math.round(sr.top) : null,
        searchW: sr ? Math.round(sr.width) : null,
        dropdowns: dropdowns.map(d => ({
          text: d.innerText.trim(),
          top: Math.round(d.getBoundingClientRect().top),
          left: Math.round(d.getBoundingClientRect().left),
          w: Math.round(d.getBoundingClientRect().width)
        }))
      };
    });
    console.log(`VIEWPORT ${vp.name} (${vp.w}x${vp.h}):`, JSON.stringify(res, null, 2));
    await page.screenshot({ path: path.join(outDir, `${vp.name}_applications.png`) });
  }

  await browser.close();
  console.log('Screenshots captured in docs/screenshots/applications_fixed/');
})();
