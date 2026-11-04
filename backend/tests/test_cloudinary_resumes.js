const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { cloudinary } = require('../services/cloudinaryService');
const axios = require('axios');

async function testCloudinaryAccess() {
  const publicId1 = 'vakancy/candidates/7fb54d99-21e1-42a2-933c-5271f81b654b/resumes/resume_1790601955850';
  const publicId2 = 'vakancy/candidates/7fb54d99-21e1-42a2-933c-5271f81b654b/resumes/resume_ai_1790928617409';

  console.log('Generating signed URLs...');
  const url1 = cloudinary.utils.url(publicId1, {
    type: 'authenticated',
    resource_type: 'image',
    sign_url: true,
    secure: true,
    format: 'pdf'
  });
  console.log('URL 1:', url1);

  const url2 = cloudinary.utils.url(publicId2, {
    type: 'authenticated',
    resource_type: 'image',
    sign_url: true,
    secure: true,
    format: 'pdf'
  });
  console.log('URL 2:', url2);

  console.log('Testing HTTP GET on URL 1...');
  try {
    const res1 = await axios.get(url1, { responseType: 'arraybuffer' });
    console.log(`URL 1 Status: ${res1.status}, Size: ${res1.data.length} bytes, Type: ${res1.headers['content-type']}`);
  } catch (e) {
    console.log('URL 1 fetch failed:', e.response?.status, e.message);
  }

  console.log('Testing HTTP GET on URL 2...');
  try {
    const res2 = await axios.get(url2, { responseType: 'arraybuffer' });
    console.log(`URL 2 Status: ${res2.status}, Size: ${res2.data.length} bytes, Type: ${res2.headers['content-type']}`);
  } catch (e) {
    console.log('URL 2 fetch failed:', e.response?.status, e.message);
  }

  process.exit(0);
}

testCloudinaryAccess().catch(console.error);
