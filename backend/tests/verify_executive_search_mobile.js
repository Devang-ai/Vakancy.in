const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outDir = 'C:\\Users\\Devang chauhan\\.gemini\\antigravity\\brain\\02c2a266-8b79-44a2-a258-b53ccd34b3f4';

async function capture() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();

  // 1. iPhone 16 Pro Max (440 x 956)
  console.log('Capturing iPhone 16 Pro Max (440x956)...');
  await page.setViewport({ width: 440, height: 956, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await page.goto('http://localhost:5173/executive-search', { waitUntil: 'load', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  // Scroll to "Our Services" and Mandate banner
  await page.evaluate(() => {
    const el = document.querySelector('h2');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await new Promise(r => setTimeout(r, 1000));

  await page.screenshot({
    path: path.join(outDir, 'mobile_iphone16promax_440_executive_search.png')
  });

  // Also take full card view specifically
  await page.evaluate(() => {
    window.scrollBy(0, 350);
  });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({
    path: path.join(outDir, 'mobile_iphone16promax_440_banner_focus.png')
  });

  // 2. Standard Mobile (390 x 844)
  console.log('Capturing Mobile 390x844...');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await page.evaluate(() => {
    const el = document.querySelector('h2');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
    window.scrollBy(0, 300);
  });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({
    path: path.join(outDir, 'mobile_390_executive_search.png')
  });

  // 3. Desktop 1440x900 to ensure desktop was NOT broken
  console.log('Capturing Desktop 1440x900...');
  await page.setViewport({ width: 1440, height: 900, isMobile: false, hasTouch: false, deviceScaleFactor: 1 });
  await page.evaluate(() => {
    const el = document.querySelector('h2');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
    window.scrollBy(0, 200);
  });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({
    path: path.join(outDir, 'desktop_1440_executive_search_reverified.png')
  });

  console.log('All screenshots captured successfully.');
  await browser.close();
}

capture().catch(err => {
  console.error('Error during capture:', err);
  process.exit(1);
});

