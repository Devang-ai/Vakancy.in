const axios = require('axios');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const { generateToken } = require('../config/jwt');

async function testEmployerPreferences() {
  try {
    const employerUser = {
      id: 'a36db283-a2e9-4fa6-9583-e941b9a283c2',
      email: 'chauhandevang075@gmail.com',
      role: 'employer',
      token_version: 2
    };

    const token = generateToken(employerUser);
    console.log('Generated token for role:', employerUser.role);

    // 1. Fetch notification preferences
    const prefRes = await axios.get('http://localhost:5002/api/notifications/preferences', {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('GET /api/notifications/preferences status:', prefRes.status);
    console.log('Preferences response:', prefRes.data);

    // 2. Update notification preferences
    const updateRes = await axios.put('http://localhost:5002/api/notifications/preferences', {
      stageEmail: true,
      inboundEmail: true,
      digestEmail: false
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('PUT /api/notifications/preferences status:', updateRes.status);
    console.log('Update response:', updateRes.data);
    console.log('VERIFICATION: Employer can access and update preferences without 403 Forbidden!');

  } catch (err) {
    console.error('Error:', err.response ? { status: err.response.status, data: err.response.data } : err.message);
  }
}

testEmployerPreferences();
