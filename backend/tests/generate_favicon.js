const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function generateFavicon() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:5173/', { waitUntil: 'load' });

  // Generate 32x32, 48x48, 180x180, 192x192 favicons from trimmed V-symbol
  const icons = await page.evaluate(async () => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        // First find bounding box of non-transparent pixels
        const cTemp = document.createElement('canvas');
        cTemp.width = img.naturalWidth;
        cTemp.height = img.naturalHeight;
        const ctxTemp = cTemp.getContext('2d');
        ctxTemp.drawImage(img, 0, 0);

        const imgData = ctxTemp.getImageData(0, 0, cTemp.width, cTemp.height);
        const data = imgData.data;
        let minX = cTemp.width, minY = cTemp.height, maxX = 0, maxY = 0;

        for (let y = 0; y < cTemp.height; y++) {
          for (let x = 0; x < cTemp.width; x++) {
            const idx = (y * cTemp.width + x) * 4;
            if (data[idx + 3] > 10) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        const contentW = maxX - minX + 1;
        const contentH = maxY - minY + 1;

        function createIcon(size) {
          const c = document.createElement('canvas');
          c.width = size;
          c.height = size;
          const ctx = c.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Fit content into size with 6% margin
          const padding = size * 0.06;
          const targetW = size - (padding * 2);
          const targetH = size - (padding * 2);
          const scale = Math.min(targetW / contentW, targetH / contentH);

          const drawW = contentW * scale;
          const drawH = contentH * scale;
          const drawX = (size - drawW) / 2;
          const drawY = (size - drawH) / 2;

          ctx.drawImage(img, minX, minY, contentW, contentH, drawX, drawY, drawW, drawH);
          return c.toDataURL('image/png');
        }

        resolve({
          icon32: createIcon(32),
          icon48: createIcon(48),
          icon180: createIcon(180),
          icon192: createIcon(192)
        });
      };
      img.src = '/brand/vakancy-v-symbol.png';
    });
  });

  await browser.close();

  function saveBase64(dataUrl, destPath) {
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(destPath, Buffer.from(base64Data, 'base64'));
    console.log('Saved:', destPath);
  }

  const pubDir = path.resolve(__dirname, '../../frontend/public');
  saveBase64(icons.icon32, path.join(pubDir, 'favicon.png'));
  saveBase64(icons.icon32, path.join(pubDir, 'favicon-32x32.png'));
  saveBase64(icons.icon48, path.join(pubDir, 'favicon-48x48.png'));
  saveBase64(icons.icon180, path.join(pubDir, 'apple-touch-icon.png'));
  saveBase64(icons.icon192, path.join(pubDir, 'favicon-192x192.png'));

  // Also copy favicon.png to favicon.ico so browsers requesting /favicon.ico receive valid icon
  fs.copyFileSync(path.join(pubDir, 'favicon-32x32.png'), path.join(pubDir, 'favicon.ico'));
  console.log('Favicon generation complete.');
}

generateFavicon().catch(console.error);

