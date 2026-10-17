const crypto = require('crypto');
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const cloudName = process.env.CLOUDINARY_CLOUD_NAME.trim();
const apiKey = process.env.CLOUDINARY_API_KEY.trim();
const apiSecret = process.env.CLOUDINARY_API_SECRET.trim();

async function testAxiosUpload() {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const signatureString = 'timestamp=' + timestamp + apiSecret;
    const signature = crypto.createHash('sha1').update(signatureString).digest('hex');

    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', Buffer.from('test data'), { filename: 'test.txt' });
    form.append('api_key', apiKey);
    form.append('timestamp', timestamp);
    form.append('signature', signature);

    console.log('Sending request to Cloudinary...');
    const response = await axios.post(
      'https://api.cloudinary.com/v1_1/' + cloudName + '/raw/upload',
      form,
      { headers: form.getHeaders() }
    );
    console.log('Success:', response.data);
  } catch (error) {
    console.error('Failed with status:', error.response?.status);
    console.error('Response body:', error.response?.data);
  }
}

testAxiosUpload();
