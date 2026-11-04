const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new'
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173/executive-search', { waitUntil: 'networkidle2' });
  await page.evaluate(() => window.scrollTo(0, 500));
  await new Promise(r => setTimeout(r, 600));

  const result = await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll('h3'));
    const bannerH3 = headings.find(h => h.innerText.includes('Request an Executive Search'));
    if (!bannerH3) return { foundH3: false };
    const card = bannerH3.closest('.rounded-3xl');
    const p = card ? card.querySelector('p') : null;
    const badge = card ? card.querySelector('.inline-flex') : null;
    const btn = card ? card.querySelector('a') : null;
    return {
      foundH3: true,
      h3Text: bannerH3.innerText,
      h3Color: window.getComputedStyle(bannerH3).color,
      pText: p ? p.innerText : null,
      pColor: p ? window.getComputedStyle(p).color : null,
      cardBg: card ? window.getComputedStyle(card).backgroundColor : null,
      cardBgImage: card ? window.getComputedStyle(card).backgroundImage : null,
      badgeText: badge ? badge.innerText : null,
      badgeColor: badge ? window.getComputedStyle(badge).color : null,
      btnText: btn ? btn.innerText : null
    };
  });

  console.log('Banner Check:', result);
  await browser.close();
})();
