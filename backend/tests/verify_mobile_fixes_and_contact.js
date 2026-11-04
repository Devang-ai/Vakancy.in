const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outDir = path.resolve(__dirname, '../../docs/screenshots/mobile_fixes');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function runVerification() {
  console.log('--- STARTING VERIFICATION OF MOBILE FIXES & CONTACT REMOVAL ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  let passedAssertions = 0;
  let totalAssertions = 0;

  function assert(condition, message) {
    totalAssertions++;
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passedAssertions++;
    } else {
      console.error(`  [FAIL] ${message}`);
    }
  }

  try {
    // 1. MOBILE HOMEPAGE (390 x 844)
    console.log('\n1. Testing Mobile Homepage (390x844)...');
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Check header navbar for Contact Us
    const navText = await page.evaluate(() => {
      const header = document.querySelector('header');
      return header ? header.innerText : '';
    });
    assert(!navText.includes('Contact Us') && !navText.includes('Contact'), 'Desktop/Header navbar does not contain Contact Us link');

    // Open mobile drawer
    const menuBtn = await page.$('button[aria-label="Toggle navigation menu"]');
    if (menuBtn) {
      await menuBtn.click();
      await new Promise(r => setTimeout(r, 600));

      const drawerText = await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]');
        return dialog ? dialog.innerText : '';
      });
      assert(!drawerText.includes('Contact Us') && !drawerText.includes('Contact'), 'Mobile slide drawer does not contain Contact Us');

      // Close mobile drawer
      const closeBtn = await page.$('button[aria-label="Close menu"]');
      if (closeBtn) {
        await closeBtn.click();
        await new Promise(r => setTimeout(r, 500));
      }
    } else {
      assert(false, 'Mobile menu button found');
    }

    // Check Footer for Contact Us
    const footerText = await page.evaluate(() => {
      const footer = document.querySelector('footer');
      return footer ? footer.innerText : '';
    });
    assert(footerText.includes('Contact Us'), 'Footer contains Contact Us link');

    // Check Featured Jobs on mobile is a horizontal slider / carousel
    const carouselInfo = await page.evaluate(() => {
      const featuredH2 = Array.from(document.querySelectorAll('h2')).find(el => el.textContent.includes('Featured Jobs'));
      if (!featuredH2) return null;
      const section = featuredH2.closest('section');
      if (!section) return null;

      const carousel = section.querySelector('.sm\\:hidden.overflow-x-auto');
      if (!carousel) return null;

      const style = window.getComputedStyle(carousel);
      const isScrollX = style.overflowX === 'auto' || style.overflowX === 'scroll';
      const cards = carousel.querySelectorAll('.snap-center');

      let cardsAreHorizontal = false;
      if (cards.length >= 2) {
        const r1 = cards[0].getBoundingClientRect();
        const r2 = cards[1].getBoundingClientRect();
        cardsAreHorizontal = r2.left > r1.left && Math.abs(r1.top - r2.top) < 20;
      } else if (cards.length === 1) {
        cardsAreHorizontal = true;
      }

      return {
        found: true,
        isScrollX,
        cardCount: cards.length,
        cardsAreHorizontal
      };
    });

    assert(carouselInfo && carouselInfo.found, 'Featured Jobs mobile carousel element exists');
    assert(carouselInfo && carouselInfo.isScrollX, 'Featured Jobs mobile carousel has overflow-x auto/scroll');
    assert(carouselInfo && carouselInfo.cardsAreHorizontal, 'Featured Jobs cards are positioned horizontally (swipeable)');

    // Capture screenshot of mobile Featured Jobs
    await page.evaluate(() => {
      const featuredH2 = Array.from(document.querySelectorAll('h2')).find(el => el.textContent.includes('Featured Jobs'));
      if (featuredH2) featuredH2.scrollIntoView({ behavior: 'instant', block: 'start' });
    });
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: path.join(outDir, 'mobile_390_featured_jobs_carousel.png') });

    // 2. MOBILE FOR EMPLOYERS (390 x 844)
    console.log('\n2. Testing Mobile For Employers (390x844)...');
    await page.goto('http://localhost:5173/for-employers', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1500));

    // Verify no cropped image below hero CTA on mobile
    const heroImageInfo = await page.evaluate(() => {
      const hero = document.querySelector('section');
      if (!hero) return null;
      const leftCol = hero.querySelector('.lg\\:col-span-7');
      if (!leftCol) return null;
      const imgs = leftCol.querySelectorAll('img');
      const visibleImgs = Array.from(imgs).filter(img => {
        const style = window.getComputedStyle(img);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
      return {
        totalImgs: imgs.length,
        visibleImgs: visibleImgs.length
      };
    });

    assert(heroImageInfo && heroImageInfo.visibleImgs === 0, 'No awkwardly cropped image below hero CTA on mobile');

    await page.screenshot({ path: path.join(outDir, 'mobile_390_for_employers_clean_hero.png') });

    // 3. DESKTOP VIEWPORT (1440 x 900)
    console.log('\n3. Testing Desktop Homepage (1440x900)...');
    await page.setViewport({ width: 1440, height: 900, isMobile: false, hasTouch: false });
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1500));

    // Check desktop navbar links
    const desktopNavLinks = await page.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="Main Navigation"]');
      if (!nav) return [];
      return Array.from(nav.querySelectorAll('a')).map(a => a.textContent.trim());
    });
    console.log('   Desktop Nav Links:', desktopNavLinks);
    assert(!desktopNavLinks.includes('Contact Us') && !desktopNavLinks.includes('Contact'), 'Desktop navbar does NOT have Contact Us');
    assert(desktopNavLinks.includes('Home') && desktopNavLinks.includes('Find Jobs') && desktopNavLinks.includes('For Employers') && desktopNavLinks.includes('Executive Search') && desktopNavLinks.includes('About Us'), 'All 5 core navigation links present in desktop navbar');

    // Check desktop Featured Jobs is rendered as grid
    const desktopGridInfo = await page.evaluate(() => {
      const featuredH2 = Array.from(document.querySelectorAll('h2')).find(el => el.textContent.includes('Featured Jobs'));
      if (!featuredH2) return null;
      const section = featuredH2.closest('section');
      if (!section) return null;

      const grid = section.querySelector('.hidden.sm\\:grid');
      if (!grid) return null;
      const style = window.getComputedStyle(grid);
      return {
        found: true,
        display: style.display
      };
    });
    assert(desktopGridInfo && desktopGridInfo.found && desktopGridInfo.display === 'grid', 'Featured jobs displays as multi-column grid on desktop');

    // Desktop screenshot
    await page.screenshot({ path: path.join(outDir, 'desktop_1440_homepage.png') });

    console.log(`\n=================================================`);
    console.log(`VERIFICATION SUMMARY: ${passedAssertions}/${totalAssertions} ASSERTIONS PASSED`);
    console.log(`=================================================`);

  } catch (err) {
    console.error('Test execution failed:', err);
  } finally {
    await browser.close();
  }
}

runVerification();
