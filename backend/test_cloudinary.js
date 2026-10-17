const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME.trim(),
  api_key: process.env.CLOUDINARY_API_KEY.trim(),
  api_secret: process.env.CLOUDINARY_API_SECRET.trim(),
  secure: true
});

console.log('Cloud name configured:', process.env.CLOUDINARY_CLOUD_NAME);

async function testUpload() {
  const dummyBuffer = Buffer.from('%PDF-1.4\\n%\\xE2\\xE3\\xCF\\xD3\\n1 0 obj\\n<</Type/Catalog/Pages 2 0 R>>\\nendobj\\n2 0 obj\\n<</Type/Pages/Count 1/Kids[3 0 R]>>\\nendobj\\n3 0 obj\\n<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>/Contents 4 0 R>>\\nendobj\\n4 0 obj\\n<</Length 21>>\\nstream\\nBT /F1 24 Tf 100 700 Td (Hello World) Tj ET\\nendstream\\nendobj\\nxref\\n0 5\\n0000000000 65535 f\\n0000000015 00000 n\\n0000000060 00000 n\\n0000000111 00000 n\\n0000000199 00000 n\\ntrailer\\n<</Size 5/Root 1 0 R>>\\nstartxref\\n271\\n%%EOF\\n', 'binary');

  console.log('Testing upload as raw...');
  try {
    const resRaw = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: 'raw', public_id: 'test_raw_' + Date.now(), folder: 'vakancy/candidates/123/resumes', overwrite: true, invalidate: true },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(dummyBuffer);
    });
    console.log('RAW Upload success!', resRaw.secure_url);
  } catch (err) {
    console.error('RAW Upload failed with 403. Extracting exact details:');
    console.error('Message:', err.message);
    console.error('HTTP code:', err.http_code);
    console.error('Name:', err.name);
    if (err.error) console.error('Inner error:', err.error);
  }

  console.log('\nTesting upload as auto...');
  try {
    const resAuto = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: 'auto', public_id: 'test_auto_' + Date.now() },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(dummyBuffer);
    });
    console.log('AUTO Upload success!', resAuto.secure_url);
  } catch (err) {
    console.error('AUTO Upload failed.');
    console.error('Message:', err.message);
  }
}

testUpload();
