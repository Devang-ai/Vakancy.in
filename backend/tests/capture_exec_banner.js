const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const viewports = [
  { name: 'mobile_390', width: 390, height: 844 },
  { name: 'tablet_768', width: 768, height: 1024 },
  { name: 'ipad_portrait_1032', width: 1032, height: 1376 },
  { name: 'ipad_landscape_1376', width: 1376, height: 1032 },
  { name: 'desktop_1440', width: 1440, height: 900 }
];

const outDir = path.resolve(__dirname, '../../docs/screenshots/executive_search_banner');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new'
  });

  for (const vp of viewports) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:5173/executive-search', { waitUntil: 'networkidle2' });
    
    // Scroll to the banner
    await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h3'));
      const bannerH3 = headings.find(h => h.innerText.includes('Request an Executive Search'));
      if (bannerH3) {
        bannerH3.scrollIntoView({ behavior: 'instant', block: 'center' });
      }
    });
    await new Promise(r => setTimeout(r, 600));

    const filePath = path.join(outDir, `${vp.name}_banner.png`);
    await page.screenshot({ path: filePath, fullPage: false });
    console.log(`Saved screenshot: ${filePath}`);
    await page.close();
  }

  await browser.close();
  console.log('All viewports captured successfully.');
})();

