const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const brandDir = path.resolve(__dirname, '../../frontend/public/brand');

async function inspectAssets() {
  const files = fs.readdirSync(brandDir).filter(f => f.endsWith('.png') || f.endsWith('.svg'));
  console.log('Found brand files:', files);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();

  await page.goto('http://localhost:5173/', { waitUntil: 'load' });
  const results = [];

  for (const file of files) {
    const fileUrl = '/brand/' + file;

    const assetInfo = await page.evaluate(async (url, filename) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);

          let imgData;
          try {
            imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          } catch (e) {
            return resolve({
              filename,
              width: img.naturalWidth,
              height: img.naturalHeight,
              aspectRatio: (img.naturalWidth / img.naturalHeight).toFixed(3),
              error: e.message
            });
          }

          const data = imgData.data;
          let transparentPixels = 0;
          let totalPixels = canvas.width * canvas.height;
          let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;

          // Corner pixels
          const corners = [
            { x: 0, y: 0 },
            { x: canvas.width - 1, y: 0 },
            { x: 0, y: canvas.height - 1 },
            { x: canvas.width - 1, y: canvas.height - 1 }
          ];

          const cornerColors = corners.map(c => {
            const idx = (c.y * canvas.width + c.x) * 4;
            return { r: data[idx], g: data[idx+1], b: data[idx+2], a: data[idx+3] };
          });

          // Sample bounding box of non-transparent / visible pixels
          for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
              const idx = (y * canvas.width + x) * 4;
              const a = data[idx + 3];
              if (a < 10) {
                transparentPixels++;
              } else {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }
          }

          const isTransparent = transparentPixels > (totalPixels * 0.05);

          resolve({
            filename,
            width: img.naturalWidth,
            height: img.naturalHeight,
            aspectRatio: (img.naturalWidth / img.naturalHeight).toFixed(3),
            isTransparent,
            transparentPercentage: ((transparentPixels / totalPixels) * 100).toFixed(1) + '%',
            cornerColors,
            contentBox: {
              x: minX,
              y: minY,
              width: maxX - minX + 1,
              height: maxY - minY + 1,
              paddingLeft: minX,
              paddingRight: canvas.width - 1 - maxX,
              paddingTop: minY,
              paddingBottom: canvas.height - 1 - maxY
            }
          });
        };
        img.onerror = (e) => resolve({ filename, error: 'Failed to load' });
        img.src = url;
      });
    }, fileUrl, file);

    results.push(assetInfo);
  }

  console.log('Asset Inspection Results:');
  console.log(JSON.stringify(results, null, 2));

  // Render a visual gallery artifact with all assets on white, gray, and dark navy backgrounds
  const htmlGallery = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Brand Assets Gallery</title>
      <style>
        body { font-family: sans-serif; background: #0b1329; color: #fff; padding: 24px; margin: 0; }
        h1 { margin-bottom: 24px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; }
        .card { background: #16203c; border-radius: 12px; padding: 16px; border: 1px solid #2a375f; }
        .card h3 { margin-top: 0; font-size: 14px; word-break: break-all; color: #38bdf8; }
        .preview-box { border-radius: 8px; padding: 16px; margin-bottom: 12px; display: flex; align-items: center; justify-content: center; min-height: 120px; }
        .preview-box.white { background: #ffffff; }
        .preview-box.checkerboard { background: repeating-conic-gradient(#808080 0% 25%, #fff 0% 50%) 50% / 16px 16px; }
        .preview-box.dark { background: #0f172a; border: 1px solid #334155; }
        img { max-width: 100%; max-height: 90px; object-contain: contain; }
        .meta { font-size: 11px; color: #94a3b8; line-height: 1.5; }
      </style>
    </head>
    <body>
      <h1>Vakancy.in Brand Assets Inspection</h1>
      <div class="grid">
        ${files.map(f => `
          <div class="card">
            <h3>${f}</h3>
            <div class="meta" style="margin-bottom: 8px;">White Background:</div>
            <div class="preview-box white">
              <img src="http://localhost:5173/brand/${f}" alt="${f}" />
            </div>
            <div class="meta" style="margin-bottom: 8px;">Checkerboard (Transparency Check):</div>
            <div class="preview-box checkerboard">
              <img src="http://localhost:5173/brand/${f}" alt="${f}" />
            </div>
            <div class="meta" style="margin-bottom: 8px;">Dark Navy Background:</div>
            <div class="preview-box dark">
              <img src="http://localhost:5173/brand/${f}" alt="${f}" />
            </div>
          </div>
        `).join('')}
      </div>
    </body>
    </html>
  `;

  await page.setContent(htmlGallery, { waitUntil: 'load' });
  await page.setViewport({ width: 1400, height: 1600 });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({
    path: 'C:\\Users\\Devang chauhan\\.gemini\\antigravity\\brain\\02c2a266-8b79-44a2-a258-b53ccd34b3f4\\brand_assets_inspection_gallery.png',
    fullPage: true
  });

  await browser.close();
  return results;
}

inspectAssets().catch(console.error);
