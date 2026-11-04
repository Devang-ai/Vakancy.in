const path = require('path');
const puppeteer = require(path.resolve('backend/node_modules/puppeteer-core'));
const { generateToken } = require(path.resolve(__dirname, '../config/jwt'));
const dotenv = require(path.resolve('backend/node_modules/dotenv'));
const fs = require('fs');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const JWT_SECRET = process.env.JWT_SECRET || 'vakancy_super_secret_jwt_key_2026_recruitment_portal';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = path.resolve(__dirname, '..', '..', 'docs', 'screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runRegressionSuite() {
  console.log('🚀 Launching Puppeteer Regression Suite for Vakancy.in Final UI Polish...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  const report = {
    timestamp: new Date().toISOString(),
    tests: []
  };

  try {
    // 1. TEST FOOTER SCROLL RESTORATION
    console.log('\n--- 1. Testing Footer Scroll Restoration ---');
    await page.setViewport({ width: 390, height: 844 });
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
    
    // Scroll down to the footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(r => setTimeout(r, 400));
    const scrolledY = await page.evaluate(() => window.scrollY);
    console.log(`Scrolled to bottom of HomePage: scrollY = ${scrolledY}px`);

    // Click "About Us" in footer
    const aboutFooterLink = await page.$('footer a[href="/about"]');
    if (aboutFooterLink) {
      await Promise.all([
        aboutFooterLink.click(),
        new Promise(r => setTimeout(r, 600))
      ]);
      const newScrollY = await page.evaluate(() => window.scrollY);
      const isTop = newScrollY < 50;
      console.log(`Navigated to /about: scrollY = ${newScrollY}px (Passed: ${isTop})`);
      report.tests.push({ name: 'Footer Scroll Restoration', passed: isTop, scrollY: newScrollY });
    }

    // 2. TEST JOB CARD METADATA & HEIGHT CONSISTENCY
    console.log('\n--- 2. Testing JobCard Metadata & Consistency ---');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
    const cardData = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.sm\\:hidden .snap-center'));
      const compensationLabels = Array.from(document.querySelectorAll('*')).filter(el => 
        el.children.length === 0 && el.textContent.trim().toUpperCase() === 'COMPENSATION'
      );
      const salaryLabels = Array.from(document.querySelectorAll('*')).filter(el => 
        el.children.length === 0 && el.textContent.trim().toUpperCase() === 'SALARY'
      );
      const heights = cards.map(c => c.getBoundingClientRect().height);
      const minHeight = heights.length ? Math.min(...heights) : 0;
      const maxHeight = heights.length ? Math.max(...heights) : 0;
      return {
        cardCount: cards.length,
        compensationCount: compensationLabels.length,
        salaryCount: salaryLabels.length,
        minHeight,
        maxHeight,
        heightDiff: maxHeight - minHeight
      };
    });
    console.log('Featured Job Card Data:', cardData);
    report.tests.push({
      name: 'JobCard Salary Label',
      passed: cardData.compensationCount === 0 && cardData.salaryCount > 0,
      details: cardData
    });

    // 3. TEST JOB DETAILS VISIBLE JOB ID BADGE
    console.log('\n--- 3. Testing Job Details UI (Job ID hidden) ---');
    await page.goto('http://localhost:5173/jobs', { waitUntil: 'networkidle2' });
    const firstJobLink = await page.$('a[href^="/jobs/"]');
    if (firstJobLink) {
      const href = await page.evaluate(el => el.getAttribute('href'), firstJobLink);
      await page.goto(`http://localhost:5173${href}`, { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 500));
      const hasVisibleJobIdBadge = await page.evaluate(() => {
        const textElements = Array.from(document.querySelectorAll('span, p, div'));
        return textElements.some(el => el.children.length === 0 && /^Job ID:\s*\d+/i.test(el.textContent.trim()));
      });
      console.log(`Visible Job ID Badge found: ${hasVisibleJobIdBadge} (Expected: false)`);
      report.tests.push({ name: 'Hide Visible Job ID', passed: !hasVisibleJobIdBadge });
    }

    // 4. TEST CANDIDATE PROFILE AVATAR & RESUME FILENAME
    console.log('\n--- 4. Testing Candidate Profile Avatar & Resumes ---');
    const candUser = {
      id: 'c46fdf97-98b1-409a-85f8-d1447821923a',
      name: 'Princy Sheth',
      email: 'princysheth185@gmail.com',
      role: 'candidate',
      token_version: 2
    };
    const candToken = generateToken(candUser);

    await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
    await page.evaluate((tok, usr) => {
      localStorage.setItem('token', tok);
      localStorage.setItem('user', JSON.stringify(usr));
    }, candToken, candUser);

    await page.goto('http://localhost:5173/candidate/profile', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));

    const avatarMetrics = await page.evaluate(() => {
      const avatar = document.querySelector('div.bg-gradient-to-br.from-\\[\\#00288e\\]');
      if (!avatar) return null;
      const rect = avatar.getBoundingClientRect();
      const style = window.getComputedStyle(avatar);
      return {
        width: rect.width,
        height: rect.height,
        isCircular: style.borderRadius === '50%' || style.borderRadius === '9999px',
        isSquare: Math.abs(rect.width - rect.height) < 2
      };
    });
    console.log('Candidate Avatar Metrics:', avatarMetrics);
    report.tests.push({
      name: 'Circular Candidate Avatar',
      passed: avatarMetrics ? (avatarMetrics.isCircular && avatarMetrics.isSquare) : false,
      metrics: avatarMetrics
    });

    // 5. TEST PRIVACY POLICY THIRD PARTY SERVICES
    console.log('\n--- 5. Testing Privacy Policy Third Party Services ---');
    await page.goto('http://localhost:5173/privacy-policy', { waitUntil: 'networkidle2' });
    const privacyContent = await page.evaluate(() => {
      const thirdPartiesSection = document.getElementById('third-parties');
      if (!thirdPartiesSection) return { hasSection: false };
      const text = thirdPartiesSection.textContent;
      return {
        hasSection: true,
        mentionsResend: /resend/i.test(text),
        mentionsHostinger: /hostinger|hosting/i.test(text)
      };
    });
    console.log('Privacy Policy Third Parties Section:', privacyContent);
    report.tests.push({
      name: 'Privacy Policy Provider Accuracy',
      passed: privacyContent.hasSection && !privacyContent.mentionsResend && privacyContent.mentionsHostinger,
      details: privacyContent
    });

  } catch (err) {
    console.error('Error during regression suite:', err);
    report.error = err.message;
  } finally {
    await browser.close();
  }

  console.log('\n================ REGRESSION RUN SUMMARY ================');
  console.log(JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'phase11_baseline_report.json'), JSON.stringify(report, null, 2));
}

runRegressionSuite().catch(console.error);
