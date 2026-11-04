const puppeteer = require('puppeteer-core');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new'
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });

  // Look for hamburger button
  const btn = await page.$('button[aria-label="Toggle navigation menu"]');
  console.log('Hamburger button found:', !!btn);

  if (btn) {
    await btn.click();
    await new Promise(r => setTimeout(r, 600));
  }

  const drawerInfo = await page.evaluate(() => {
    const drawer = document.querySelector('div.fixed.inset-y-0.right-0') || document.querySelector('[role="dialog"]') || document.querySelector('div.fixed.inset-0.z-50');
    if (!drawer) return { found: false };
    const links = Array.from(drawer.querySelectorAll('a')).map(a => ({
      text: a.textContent.trim(),
      href: a.getAttribute('href'),
      visible: a.offsetParent !== null,
      rect: a.getBoundingClientRect()
    }));
    return {
      found: true,
      html: drawer.innerHTML.slice(0, 300),
      links
    };
  });

  console.log('Drawer Info:', JSON.stringify(drawerInfo, null, 2));

  const path = require('path');
  const screenshotPath = path.resolve(__dirname, '../../docs/screenshots/mobile_menu_audit.png');
  await page.screenshot({ path: screenshotPath });
  await browser.close();
})();

