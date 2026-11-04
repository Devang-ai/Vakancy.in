const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACTS_DIR = 'C:\\Users\\Devang chauhan\\.gemini\\antigravity-ide\\brain\\00c52c15-9292-4112-9070-2116838752a8';

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('Logging in via API to obtain Director credentials...');
  const loginRes = await axios.post('http://localhost:5002/api/auth/login', {
    email: 'director@vakancy.com',
    password: 'password123'
  });

  const { token, user } = loginRes.data;
  console.log('Director token acquired.');

  console.log('Launching headless Chrome with remote debugging on port 9222...');
  const chromeProcess = spawn(CHROME_PATH, [
    '--headless',
    '--disable-gpu',
    '--remote-debugging-port=9222',
    '--window-size=1440,1200',
    '--hide-scrollbars',
    'about:blank'
  ]);

  await wait(2000);

  // Fetch WebSocket debugger URL from Chrome
  const versionRes = await axios.get('http://127.0.0.1:9222/json/version');
  const wsUrl = versionRes.data.webSocketDebuggerUrl;
  console.log('Connected to Chrome DevTools Protocol at:', wsUrl);

  const ws = new WebSocket(wsUrl);
  let id = 1;
  const pending = new Map();

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = id++;
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    }
  };

  await new Promise(resolve => ws.onopen = resolve);
  console.log('WebSocket handshake established.');

  // Create new target / tab
  const { targetId } = await send('Target.createTarget', { url: 'http://localhost:5174/login' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });

  function sendSession(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = id++;
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, sessionId, method, params }));
    });
  }

  await sendSession('Page.enable');
  await sendSession('Runtime.enable');
  await sendSession('DOM.enable');

  await wait(1500);

  // Set localStorage credentials
  console.log('Injecting auth tokens into localStorage...');
  await sendSession('Runtime.evaluate', {
    expression: `
      localStorage.setItem('token', ${JSON.stringify(token)});
      localStorage.setItem('user', ${JSON.stringify(JSON.stringify(user))});
    `
  });

  // Navigate to Dashboard
  console.log('Navigating to http://localhost:5174/dashboard ...');
  await sendSession('Page.navigate', { url: 'http://localhost:5174/dashboard' });
  await wait(3000);

  // Capture desktop screenshot
  console.log('Capturing Desktop Overview screenshot (1440x1200)...');
  const shot1 = await sendSession('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'dashboard_desktop_overview.png'), Buffer.from(shot1.data, 'base64'));
  console.log('Saved: dashboard_desktop_overview.png');

  // Capture full page screenshot
  console.log('Capturing Full Scroll screenshot...');
  const metrics = await sendSession('Page.getLayoutMetrics');
  const contentHeight = Math.ceil(metrics.contentSize.height);
  await sendSession('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: contentHeight,
    deviceScaleFactor: 1,
    mobile: false
  });
  await wait(500);
  const shotFull = await sendSession('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'dashboard_full_scroll.png'), Buffer.from(shotFull.data, 'base64'));
  console.log('Saved: dashboard_full_scroll.png');

  // Reset viewport and test clicking 'Last 7 Days' filter
  console.log('Testing filter button: clicking "Last 7 Days"...');
  await sendSession('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1200,
    deviceScaleFactor: 1,
    mobile: false
  });
  await sendSession('Runtime.evaluate', {
    expression: `
      const btns = Array.from(document.querySelectorAll('button'));
      const sevenDaysBtn = btns.find(b => b.textContent.includes('Last 7 Days'));
      if (sevenDaysBtn) sevenDaysBtn.click();
    `
  });
  await wait(1500);
  const shotFilter = await sendSession('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'dashboard_filter_7d.png'), Buffer.from(shotFilter.data, 'base64'));
  console.log('Saved: dashboard_filter_7d.png');

  // Test clicking 'Active Jobs' card
  console.log('Testing navigation click: Active Jobs card -> /jobs?status=open');
  await sendSession('Runtime.evaluate', {
    expression: `
      const links = Array.from(document.querySelectorAll('a'));
      const activeJobsLink = links.find(a => a.getAttribute('href') === '/jobs?status=open');
      if (activeJobsLink) activeJobsLink.click();
    `
  });
  await wait(1500);
  const urlCheck1 = await sendSession('Runtime.evaluate', { expression: 'window.location.href' });
  console.log('Current URL after clicking Active Jobs:', urlCheck1.result.value);
  const shotNavJobs = await sendSession('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'nav_active_jobs.png'), Buffer.from(shotNavJobs.data, 'base64'));
  console.log('Saved: nav_active_jobs.png');

  // Navigate back to Dashboard and click 'Shortlisted' pipeline stage
  console.log('Navigating back to /dashboard...');
  await sendSession('Page.navigate', { url: 'http://localhost:5174/dashboard' });
  await wait(2000);

  console.log('Testing navigation click: Shortlisted pipeline card -> /applications?status=shortlisted');
  await sendSession('Runtime.evaluate', {
    expression: `
      const links = Array.from(document.querySelectorAll('a'));
      const shortLink = links.find(a => a.getAttribute('href') === '/applications?status=shortlisted');
      if (shortLink) shortLink.click();
    `
  });
  await wait(1500);
  const urlCheck2 = await sendSession('Runtime.evaluate', { expression: 'window.location.href' });
  console.log('Current URL after clicking Shortlisted:', urlCheck2.result.value);
  const shotNavShort = await sendSession('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'nav_shortlisted.png'), Buffer.from(shotNavShort.data, 'base64'));
  console.log('Saved: nav_shortlisted.png');

  // Test Mobile Viewport (375x812)
  console.log('Testing Mobile Viewport (375x812) on /dashboard...');
  await sendSession('Page.navigate', { url: 'http://localhost:5174/dashboard' });
  await wait(2000);
  await sendSession('Emulation.setDeviceMetricsOverride', {
    width: 375,
    height: 812,
    deviceScaleFactor: 2,
    mobile: true
  });
  await wait(1000);
  const shotMobile = await sendSession('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'dashboard_mobile_375.png'), Buffer.from(shotMobile.data, 'base64'));
  console.log('Saved: dashboard_mobile_375.png');

  // Clean up
  chromeProcess.kill();
  console.log('Chrome process terminated. All visual artifacts captured successfully.');
  process.exit(0);
}

run().catch(err => {
  console.error('Capture script error:', err);
  process.exit(1);
});
