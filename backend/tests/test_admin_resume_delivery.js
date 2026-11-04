const axios = require('axios');

const BASE_URL = 'http://localhost:5002/api';

async function runTests() {
  console.log('--- Testing Admin Application Resume Delivery API ---');
  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
    }
  }

  // 1. Director Login
  let adminToken;
  try {
    const dirLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'director@vakancy.com',
      password: 'password123'
    });
    assert(dirLogin.data.success && dirLogin.data.token, 'Director login successful');
    adminToken = dirLogin.data.token;
  } catch (err) {
    console.error('Director login failed:', err.message);
    process.exit(1);
  }

  const appId = 'ac7fda0c-998f-4162-a138-a50a658d8bb7';

  // 2. Unauthenticated request
  try {
    await axios.get(`${BASE_URL}/admin/applications/${appId}/resume`);
    assert(false, 'Unauthenticated request should fail with 401');
  } catch (err) {
    assert(err.response?.status === 401, `Unauthenticated request returns 401 (got ${err.response?.status})`);
  }

  // 3. Authenticated Admin request for historical recovered application
  try {
    const res = await axios.get(`${BASE_URL}/admin/applications/${appId}/resume`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(res.status === 200, `Admin request returns 200 (got ${res.status})`);
    assert(res.data.success === true, 'Response success is true');
    assert(typeof res.data.url === 'string' && res.data.url.length > 10, 'Response contains valid URL');
    assert(res.data.filename === 'DEVANGCHAUHAN6JulyRESUME.pdf', `Filename matches DEVANGCHAUHAN6JulyRESUME.pdf (got ${res.data.filename})`);
    assert(res.data.resume_id === '3df3b8ff-0bca-4d93-87c7-1c5160d01c2f', `Resume ID matches (got ${res.data.resume_id})`);
    console.log('Delivered signed/public resume URL:', res.data.url);

    // 4. Test that the returned URL is reachable over HTTP
    try {
      const fileRes = await axios.get(res.data.url, { responseType: 'arraybuffer' });
      assert(fileRes.status === 200, `Delivered resume URL is reachable with 200 OK (${fileRes.data.length} bytes downloaded)`);
    } catch (fetchErr) {
      assert(false, `Delivered resume URL fetch error: ${fetchErr.message}`);
    }
  } catch (err) {
    console.error('Verbose resume fetch error:', {
      status: err.response?.status,
      data: err.response?.data,
      message: err.message
    });
    assert(false, `Admin resume request error: ${err.response?.data?.message || err.message}`);
  }

  // 5. Non-existent application
  try {
    await axios.get(`${BASE_URL}/admin/applications/00000000-0000-0000-0000-000000000000/resume`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(false, 'Non-existent application should return 404');
  } catch (err) {
    assert(err.response?.status === 404, `Non-existent application returns 404 (got ${err.response?.status})`);
  }

  console.log(`\nResults: ${passed} / ${total} tests passed.`);
  process.exit(passed === total ? 0 : 1);
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
