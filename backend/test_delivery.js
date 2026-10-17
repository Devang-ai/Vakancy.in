const cloudinary = require('cloudinary').v2;
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

cloudinary.config({
  cloud_name: (process.env.CLOUDINARY_CLOUD_NAME || '').trim(),
  api_key: (process.env.CLOUDINARY_API_KEY || '').trim(),
  api_secret: (process.env.CLOUDINARY_API_SECRET || '').trim(),
  secure: true
});

async function testDelivery() {
  try {
    // 1. Upload a valid test PDF as image/authenticated
    const userPublicId = 'vakancy/candidates/7fb54d99-21e1-42a2-933c-5271f81b654b/resumes/resume_1790601468228';
    
    // 2. Generate signed URL
    const signedUrl = cloudinary.utils.url(userPublicId, {
      type: 'authenticated',
      resource_type: 'image',
      sign_url: true,
      secure: true,
      format: 'pdf'
    });
    
    console.log('Signed URL:', signedUrl);
    
    // 3. Fetch URL to see response headers and body
    console.log('Fetching signed URL...');
    const response = await axios.get(signedUrl, { responseType: 'arraybuffer', validateStatus: () => true });
    
    console.log('HTTP Status:', response.status);
    console.log('Content-Type:', response.headers['content-type']);
    console.log('Content-Disposition:', response.headers['content-disposition']);
    console.log('X-Cld-Error:', response.headers['x-cld-error']);
    
    if (response.status !== 200) {
      console.log('Error Body:', response.data.toString('utf8'));
    } else {
      console.log('Success Body Size:', response.data.length);
    }
  } catch (err) {
    console.error('Test Failed:', err.message);
  }
}

testDelivery();
