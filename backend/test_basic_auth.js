const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const FormData = require('form-data');

dotenv.config({ path: path.join(__dirname, '.env') });

const cloudName = process.env.CLOUDINARY_CLOUD_NAME.trim();
const apiKey = process.env.CLOUDINARY_API_KEY.trim();
const apiSecret = process.env.CLOUDINARY_API_SECRET.trim();

async function testBasicAuthUpload() {
  try {
    const form = new FormData();
    form.append('file', Buffer.from('test image content'), { filename: 'test.jpg' });

    console.log('Sending Basic Auth request to Cloudinary...');
    const response = await axios.post(
      'https://api.cloudinary.com/v1_1/' + cloudName + '/raw/upload',
      form,
      {
        headers: form.getHeaders(),
        auth: {
          username: apiKey,
          password: apiSecret
        }
      }
    );
    console.log('Success:', response.data.secure_url);
  } catch (error) {
    console.error('Failed with status:', error.response?.status);
    console.error('Response body:', JSON.stringify(error.response?.data, null, 2));
    if (error.response?.headers) {
      console.error('X-Cld-Error:', error.response.headers['x-cld-error']);
    }
  }
}

testBasicAuthUpload();
