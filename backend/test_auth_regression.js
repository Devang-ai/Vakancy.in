const { initDB, query } = require('./config/db');
const { register, login } = require('./controllers/authController');

function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
  return res;
}

async function runTests() {
  console.log('--- Starting Vakancy Auth System Regression Tests ---');
  await initDB();

  const testEmailA = `test_employer_${Date.now()}@example.com`;
  const testEmailB = `test_candidate_${Date.now()}@example.com`;
  const password = 'SecretPassword123!';

  // Clean up any test accounts if they existed
  await query('DELETE FROM USERS WHERE email IN (?, ?)', [testEmailA.toLowerCase(), testEmailB.toLowerCase()]);

  // Test 1: Employer registers with email A
  console.log('\n[TEST 1] Employer registers with email A...');
  {
    const req = {
      body: {
        email: testEmailA,
        password,
        role: 'employer',
        name: 'Acme Corp Admin',
        phone: '9876543210'
      }
    };
    const res = createMockRes();
    await register(req, res);
    console.assert(res.statusCode === 201, `Expected 201, got ${res.statusCode}: ${JSON.stringify(res.body)}`);
    console.assert(res.body.success === true, 'Expected success === true');
    console.assert(res.body.user.role === 'employer', 'Expected user.role === employer');
    console.assert(!!res.body.token, 'Expected token to be returned');
    console.log('✅ PASS: Employer registered with email A.');
  }

  // Test 2: Candidate registration with email A is blocked
  console.log('\n[TEST 2] Candidate registration with email A is blocked...');
  {
    const req = {
      body: {
        email: testEmailA,
        password,
        role: 'candidate',
        name: 'Imposter Candidate'
      }
    };
    const res = createMockRes();
    await register(req, res);
    console.assert(res.statusCode === 409, `Expected 409, got ${res.statusCode}`);
    console.assert(res.body.success === false, 'Expected success === false');
    console.assert(res.body.code === 'ACCOUNT_ROLE_CONFLICT', `Expected ACCOUNT_ROLE_CONFLICT, got ${res.body.code}`);
    console.assert(
      res.body.message === 'This email is already registered as an Employer. Please use a different email for Candidate registration.',
      `Unexpected message: ${res.body.message}`
    );
    console.log('✅ PASS: Candidate registration blocked with message:', res.body.message);
  }

  // Test 3: Candidate login with email A is blocked
  console.log('\n[TEST 3] Candidate login with email A is blocked...');
  {
    const req = {
      body: {
        email: testEmailA,
        password,
        role: 'candidate'
      }
    };
    const res = createMockRes();
    await login(req, res);
    console.assert(res.statusCode === 403, `Expected 403, got ${res.statusCode}`);
    console.assert(res.body.success === false, 'Expected success === false');
    console.assert(res.body.code === 'ACCOUNT_ROLE_CONFLICT', `Expected ACCOUNT_ROLE_CONFLICT, got ${res.body.code}`);
    console.assert(!res.body.token, 'Expected NO token issued');
    console.assert(
      res.body.message === 'You cannot login with this email. This email is registered as an Employer.',
      `Unexpected message: ${res.body.message}`
    );
    console.log('✅ PASS: Candidate login blocked without token. Message:', res.body.message);
  }

  // Test 4: Employer login with email A succeeds
  console.log('\n[TEST 4] Employer login with email A succeeds...');
  {
    const req = {
      body: {
        email: testEmailA,
        password,
        role: 'employer'
      }
    };
    const res = createMockRes();
    await login(req, res);
    console.assert(res.statusCode === 200, `Expected 200, got ${res.statusCode}`);
    console.assert(res.body.success === true, 'Expected success === true');
    console.assert(!!res.body.token, 'Expected auth token issued');
    console.assert(res.body.user.role === 'employer', 'Expected user.role === employer');
    console.log('✅ PASS: Employer login succeeded with valid token.');
  }

  // Test 5: Employer account data remains intact
  console.log('\n[TEST 5] Employer account data remains intact...');
  {
    const users = await query('SELECT * FROM USERS WHERE LOWER(email) = ?', [testEmailA.toLowerCase()]);
    console.assert(users.length === 1, 'Expected exactly 1 user');
    console.assert(users[0].role === 'employer', `Expected role still employer, got ${users[0].role}`);
    const employers = await query('SELECT * FROM EMPLOYERS WHERE user_id = ?', [users[0].id]);
    console.assert(employers.length === 1, 'Expected employer profile intact');
    console.log('✅ PASS: Employer account and profile data fully intact.');
  }

  // Test 6: Candidate registers with email B
  console.log('\n[TEST 6] Candidate registers with email B...');
  {
    const req = {
      body: {
        email: testEmailB,
        password,
        role: 'candidate',
        name: 'Jane Doe',
        phone: '9123456789'
      }
    };
    const res = createMockRes();
    await register(req, res);
    console.assert(res.statusCode === 201, `Expected 201, got ${res.statusCode}`);
    console.assert(res.body.success === true, 'Expected success === true');
    console.assert(res.body.user.role === 'candidate', 'Expected user.role === candidate');
    console.assert(!!res.body.token, 'Expected token issued');
    console.log('✅ PASS: Candidate registered with email B.');
  }

  // Test 7: Employer registration with email B is blocked
  console.log('\n[TEST 7] Employer registration with email B is blocked...');
  {
    const req = {
      body: {
        email: testEmailB,
        password,
        role: 'employer',
        name: 'Fake Employer'
      }
    };
    const res = createMockRes();
    await register(req, res);
    console.assert(res.statusCode === 409, `Expected 409, got ${res.statusCode}`);
    console.assert(res.body.success === false, 'Expected success === false');
    console.assert(res.body.code === 'ACCOUNT_ROLE_CONFLICT', `Expected ACCOUNT_ROLE_CONFLICT, got ${res.body.code}`);
    console.assert(
      res.body.message === 'This email is already registered as a Candidate. Please use a different email for Employer registration.',
      `Unexpected message: ${res.body.message}`
    );
    console.log('✅ PASS: Employer registration blocked with message:', res.body.message);
  }

  // Test 8: Employer login with email B is blocked
  console.log('\n[TEST 8] Employer login with email B is blocked...');
  {
    const req = {
      body: {
        email: testEmailB,
        password,
        role: 'employer'
      }
    };
    const res = createMockRes();
    await login(req, res);
    console.assert(res.statusCode === 403, `Expected 403, got ${res.statusCode}`);
    console.assert(res.body.success === false, 'Expected success === false');
    console.assert(res.body.code === 'ACCOUNT_ROLE_CONFLICT', `Expected ACCOUNT_ROLE_CONFLICT, got ${res.body.code}`);
    console.assert(!res.body.token, 'Expected NO token issued');
    console.assert(
      res.body.message === 'You cannot login with this email. This email is registered as a Candidate.',
      `Unexpected message: ${res.body.message}`
    );
    console.log('✅ PASS: Employer login blocked without token. Message:', res.body.message);
  }

  // Test 9: Candidate login with email B succeeds
  console.log('\n[TEST 9] Candidate login with email B succeeds...');
  {
    const req = {
      body: {
        email: testEmailB,
        password,
        role: 'candidate'
      }
    };
    const res = createMockRes();
    await login(req, res);
    console.assert(res.statusCode === 200, `Expected 200, got ${res.statusCode}`);
    console.assert(res.body.success === true, 'Expected success === true');
    console.assert(!!res.body.token, 'Expected auth token issued');
    console.assert(res.body.user.role === 'candidate', 'Expected user.role === candidate');
    console.log('✅ PASS: Candidate login succeeded with valid token.');
  }

  // Test 10: Candidate account data remains intact
  console.log('\n[TEST 10] Candidate account data remains intact...');
  {
    const users = await query('SELECT * FROM USERS WHERE LOWER(email) = ?', [testEmailB.toLowerCase()]);
    console.assert(users.length === 1, 'Expected exactly 1 user');
    console.assert(users[0].role === 'candidate', `Expected role still candidate, got ${users[0].role}`);
    const candidates = await query('SELECT * FROM CANDIDATES WHERE user_id = ?', [users[0].id]);
    console.assert(candidates.length === 1, 'Expected candidate profile intact');
    console.log('✅ PASS: Candidate account and profile data fully intact.');
  }

  // Test 11: Email case variations treated as same email
  console.log('\n[TEST 11] Email case variations treated as same email...');
  {
    const upperEmailA = testEmailA.toUpperCase();
    const req = {
      body: {
        email: upperEmailA,
        password,
        role: 'candidate' // Wrong role with uppercase email
      }
    };
    const res = createMockRes();
    await login(req, res);
    console.assert(res.statusCode === 403, `Expected 403, got ${res.statusCode}`);
    console.assert(res.body.code === 'ACCOUNT_ROLE_CONFLICT', 'Expected ACCOUNT_ROLE_CONFLICT');
    console.assert(
      res.body.message === 'You cannot login with this email. This email is registered as an Employer.',
      `Unexpected message: ${res.body.message}`
    );
    console.log('✅ PASS: Uppercase email correctly identified and role conflict enforced.');
  }

  // Test 12: Whitespace variations treated as same email
  console.log('\n[TEST 12] Whitespace variations treated as same email...');
  {
    const whitespaceEmailA = `   ${testEmailA}   `;
    const req = {
      body: {
        email: whitespaceEmailA,
        password,
        role: 'candidate'
      }
    };
    const res = createMockRes();
    await login(req, res);
    console.assert(res.statusCode === 403, `Expected 403, got ${res.statusCode}`);
    console.assert(res.body.code === 'ACCOUNT_ROLE_CONFLICT', 'Expected ACCOUNT_ROLE_CONFLICT');
    console.assert(
      res.body.message === 'You cannot login with this email. This email is registered as an Employer.',
      `Unexpected message: ${res.body.message}`
    );
    console.log('✅ PASS: Email with whitespace correctly trimmed and normalized.');
  }

  // Test 13: Password validation continues to work
  console.log('\n[TEST 13] Password validation continues to work...');
  {
    const req = {
      body: {
        email: testEmailA,
        password: 'wrong_password_xyz',
        role: 'employer'
      }
    };
    const res = createMockRes();
    await login(req, res);
    console.assert(res.statusCode === 401, `Expected 401, got ${res.statusCode}`);
    console.assert(res.body.message === 'Invalid credentials.', `Unexpected: ${res.body.message}`);
    console.log('✅ PASS: Wrong password returns 401 Invalid credentials.');
  }

  // Cleanup test users
  await query('DELETE FROM CANDIDATES WHERE user_id IN (SELECT id FROM USERS WHERE email IN (?, ?))', [testEmailA.toLowerCase(), testEmailB.toLowerCase()]);
  await query('DELETE FROM EMPLOYERS WHERE user_id IN (SELECT id FROM USERS WHERE email IN (?, ?))', [testEmailA.toLowerCase(), testEmailB.toLowerCase()]);
  await query('DELETE FROM USERS WHERE email IN (?, ?)', [testEmailA.toLowerCase(), testEmailB.toLowerCase()]);

  console.log('\n==================================================');
  console.log('🎉 ALL 13 CORE REGRESSION TESTS PASSED SUCCESSFULLY!');
  console.log('==================================================\n');
  process.exit(0);
}

runTests().catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
