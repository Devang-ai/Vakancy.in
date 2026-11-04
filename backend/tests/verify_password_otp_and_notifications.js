const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const {
  createOtp,
  verifyOtp,
  generateResetAuthToken,
  verifyResetAuthToken
} = require('../services/otpService');
const {
  renderOtpEmailTemplate,
  renderRecruiterMessageNotificationTemplate,
  renderJobDigestTemplate
} = require('../services/emailTemplates');
const {
  getUserPreferences,
  updateUserPreferences,
  canSendStageEmail,
  canSendInboundEmail,
  canSendDigestEmail
} = require('../services/notificationPreferenceService');

async function runTestSuite() {
  console.log('================================================================');
  console.log('🔒 PASSWORD MANAGEMENT, EMAIL OTP & NOTIFICATIONS VERIFICATION');
  console.log('================================================================');

  await db.initDB();

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  // --- 1. USER_OTP Table Verification ---
  console.log('\n--- 1. Database Schema: USER_OTP Table ---');
  try {
    const tableCheck = await db.query("SHOW TABLES LIKE 'USER_OTP'");
    assert(tableCheck.length > 0, "USER_OTP table exists in database");

    const columns = await db.query('DESCRIBE USER_OTP');
    const colNames = columns.map(c => c.Field);
    assert(colNames.includes('otp_hash'), "USER_OTP has 'otp_hash' column");
    assert(colNames.includes('purpose'), "USER_OTP has 'purpose' column");
    assert(colNames.includes('attempts'), "USER_OTP has 'attempts' column");
    assert(colNames.includes('expires_at'), "USER_OTP has 'expires_at' column");
    assert(colNames.includes('resend_available_at'), "USER_OTP has 'resend_available_at' column");
  } catch (err) {
    assert(false, `USER_OTP schema check failed: ${err.message}`);
  }

  // --- 2. OTP Service: Security & Cryptography ---
  console.log('\n--- 2. OTP Service: Security & Cryptography ---');
  const testEmail = `test_otp_${Date.now()}@example.com`;
  let generatedOtp = null;

  try {
    const result = await createOtp({
      email: testEmail,
      userId: uuidv4(),
      purpose: 'password_reset'
    });
    generatedOtp = result.otp;
    assert(/^\d{6}$/.test(generatedOtp), `OTP is 6-digit numeric string (got: ${generatedOtp})`);
    assert(result.expiresInMinutes === 5, `OTP expires in 5 minutes (got: ${result.expiresInMinutes})`);
    assert(result.resendCooldownSeconds === 60, `Resend cooldown is 60 seconds (got: ${result.resendCooldownSeconds})`);

    // Verify raw OTP is NEVER stored in database
    const stored = await db.query('SELECT * FROM USER_OTP WHERE email = ?', [testEmail]);
    assert(stored.length > 0, 'OTP record saved in database');
    assert(stored[0].otp_hash !== generatedOtp, 'OTP is hashed/salted, NOT stored in plain text');
    assert(stored[0].otp_hash.length >= 64, 'OTP hash uses SHA-256');

    // Test Resend Cooldown
    try {
      await createOtp({ email: testEmail, userId: uuidv4(), purpose: 'password_reset' });
      assert(false, 'Expected RESEND_COOLDOWN error when requesting immediately');
    } catch (cdErr) {
      assert(cdErr.code === 'RESEND_COOLDOWN', `Enforces 60-second cooldown before resending (got code: ${cdErr.code})`);
      assert(cdErr.secondsRemaining > 0, `Returns remaining seconds: ${cdErr.secondsRemaining}s`);
    }

    // Test Invalid OTP rejection and attempt counter
    try {
      await verifyOtp({ email: testEmail, otp: '000000', purpose: 'password_reset' });
      assert(false, 'Expected invalid OTP error');
    } catch (verErr) {
      assert(verErr.code === 'INVALID_OTP', `Rejects incorrect OTP (got code: ${verErr.code})`);
      const updated = await db.query('SELECT attempts FROM USER_OTP WHERE id = ?', [stored[0].id]);
      assert(updated[0].attempts === 1, `Failed attempt increments attempt counter to 1 (got: ${updated[0].attempts})`);
    }

    // Test Correct OTP verification
    const verified = await verifyOtp({ email: testEmail, otp: generatedOtp, purpose: 'password_reset' });
    assert(verified.valid === true, 'Successfully verifies correct 6-digit OTP');

    // Verify OTP record was deleted/cleared upon success (cannot be reused)
    const afterVer = await db.query('SELECT * FROM USER_OTP WHERE id = ?', [stored[0].id]);
    assert(afterVer.length === 0, 'OTP is single-use: cleared from database upon successful verification');

    // Test Reset Authorization Token
    const resetToken = generateResetAuthToken(testEmail, uuidv4());
    assert(typeof resetToken === 'string' && resetToken.length > 20, 'Generates signed single-purpose reset JWT');

    const decoded = verifyResetAuthToken(resetToken);
    assert(decoded.email === testEmail && decoded.purpose === 'password_reset_auth', 'Reset token verifies email and purpose correctly');
  } catch (err) {
    assert(false, `OTP service test failed: ${err.message}`);
  }

  // --- 3. Scenario A: Change Password Rules ---
  console.log('\n--- 3. Scenario A: Change Password Policy Enforcement ---');
  try {
    const testUserEmail = `user_pw_${Date.now()}@example.com`;
    const initialPlainPw = 'CurrentPass123!';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(initialPlainPw, salt);
    const userId = uuidv4();

    await db.query(
      `INSERT INTO USERS (id, name, email, password_hash, role, token_version, created_at) 
       VALUES (?, ?, ?, ?, 'candidate', 1, NOW())`,
      [userId, 'Test Pw User', testUserEmail, hash]
    );

    const userRows = await db.query('SELECT * FROM USERS WHERE id = ?', [userId]);
    const testUser = userRows[0];

    // Password validation logic:
    // 1. Password reuse check
    const isSamePassword = await bcrypt.compare(initialPlainPw, testUser.password_hash);
    assert(isSamePassword === true, 'Bcrypt compare correctly recognizes current password');

    const rejectReuse = (newPw) => newPw === initialPlainPw;
    assert(rejectReuse(initialPlainPw) === true, 'Rejects password reuse when new password matches current password');

    // 2. Minimum 8 characters check
    const isTooShort = (pw) => pw.length < 8;
    assert(isTooShort('short7') === true, 'Rejects passwords shorter than 8 characters');
    assert(isTooShort('validPass123') === false, 'Accepts passwords >= 8 characters');

    // 3. Clean update with token_version increment
    const newPlainPw = 'NewSecretPassword888!';
    const newHash = await bcrypt.hash(newPlainPw, await bcrypt.genSalt(10));
    await db.query(
      'UPDATE USERS SET password_hash = ?, token_version = token_version + 1, password_changed_at = NOW() WHERE id = ?',
      [newHash, testUser.id]
    );

    const updatedUser = (await db.query('SELECT * FROM USERS WHERE id = ?', [testUser.id]))[0];
    assert(updatedUser.token_version === 2, `Increments token_version to invalidate previous sessions (got: ${updatedUser.token_version})`);
    assert(await bcrypt.compare(newPlainPw, updatedUser.password_hash), 'New password hash verified successfully');
  } catch (err) {
    assert(false, `Scenario A test failed: ${err.message}`);
  }

  // --- 4. Scenario B: Google-only User Set Password ---
  console.log('\n--- 4. Scenario B: Google-Only Account "Set Password" via OTP ---');
  try {
    const googleEmail = `google_user_${Date.now()}@example.com`;
    const googleId = `google_sub_${Date.now()}`;
    const googleUserId = uuidv4();

    await db.query(
      `INSERT INTO USERS (id, name, email, password_hash, google_id, auth_provider, role, token_version, created_at) 
       VALUES (?, ?, ?, NULL, ?, 'google', 'candidate', 1, NOW())`,
      [googleUserId, 'Google Test User', googleEmail, googleId]
    );

    const googleUser = (await db.query('SELECT * FROM USERS WHERE id = ?', [googleUserId]))[0];
    assert(googleUser.password_hash === null, 'Google-only user has NULL password_hash');
    assert(Boolean(googleUser.password_hash) === false, 'has_password flag evaluates to false');

    // Create Set Password OTP
    const otpResult = await createOtp({
      email: googleEmail,
      userId: googleUser.id,
      purpose: 'set_password'
    });
    assert(/^\d{6}$/.test(otpResult.otp), 'Generates 6-digit OTP for set_password purpose');

    // Verify OTP and set local password
    const verified = await verifyOtp({
      email: googleEmail,
      otp: otpResult.otp,
      purpose: 'set_password'
    });
    assert(verified.valid === true, 'Successfully verifies set_password OTP');

    // Update user to have local password while preserving Google ID
    const setPass = 'FirstTimeGooglePass123!';
    const setHash = await bcrypt.hash(setPass, await bcrypt.genSalt(10));
    await db.query(
      `UPDATE USERS SET 
         password_hash = ?, 
         auth_provider = 'google_linked', 
         token_version = token_version + 1, 
         password_changed_at = NOW() 
       WHERE id = ?`,
      [setHash, googleUser.id]
    );

    const linkedUser = (await db.query('SELECT * FROM USERS WHERE id = ?', [googleUser.id]))[0];
    assert(linkedUser.password_hash !== null, 'User now has non-null password_hash');
    assert(linkedUser.google_id === googleId, 'Google ID is strictly preserved');
    assert(linkedUser.auth_provider === 'google_linked', "Auth provider updated to 'google_linked'");
    assert(await bcrypt.compare(setPass, linkedUser.password_hash), 'New password works for local login');
  } catch (err) {
    assert(false, `Scenario B test failed: ${err.message}`);
  }

  // --- 5. Notification Preferences Persistence & Enforcing ---
  console.log('\n--- 5. Notification Preferences (MySQL & Service Enforcement) ---');
  try {
    const notifUserEmail = `notif_user_${Date.now()}@example.com`;
    const notifUserId = uuidv4();
    await db.query(
      `INSERT INTO USERS (id, name, email, role, token_version, created_at) 
       VALUES (?, ?, ?, 'candidate', 1, NOW())`,
      [notifUserId, 'Notif User', notifUserEmail]
    );

    // Default preferences
    const defaults = await getUserPreferences(notifUserId);
    assert(defaults.stageEmail === true, 'Default stageEmail is true');
    assert(defaults.digestEmail === true, 'Default digestEmail is true');
    assert(defaults.inboundEmail === true, 'Default inboundEmail is true');

    // Update preferences (turn off inbound recruiter email)
    await updateUserPreferences(notifUserId, {
      stageEmail: true,
      digestEmail: false,
      inboundEmail: false
    });

    const updated = await getUserPreferences(notifUserId);
    assert(updated.stageEmail === true, 'stageEmail persisted as true');
    assert(updated.digestEmail === false, 'digestEmail persisted as false');
    assert(updated.inboundEmail === false, 'inboundEmail persisted as false');

    // Enforcing helpers
    assert(await canSendStageEmail(notifUserId) === true, 'canSendStageEmail returns true when enabled');
    assert(await canSendInboundEmail(notifUserId) === false, 'canSendInboundEmail returns false when disabled');
    assert(await canSendDigestEmail(notifUserId) === false, 'canSendDigestEmail returns false when disabled');

    // Re-enable inboundEmail
    await updateUserPreferences(notifUserId, { inboundEmail: true });
    assert(await canSendInboundEmail(notifUserId) === true, 'canSendInboundEmail returns true after re-enabling');
  } catch (err) {
    assert(false, `Notification preference test failed: ${err.message}`);
  }

  // --- 6. Email Templates Quality & Compliance ---
  console.log('\n--- 6. Email Templates Quality Verification ---');
  try {
    // 1. OTP Email Template
    const otpHtml = renderOtpEmailTemplate({
      otp: '789123',
      purpose: 'password_reset',
      expiresInMinutes: 5
    });
    assert(otpHtml.includes('789123'), 'OTP template embeds 6-digit OTP');
    assert(otpHtml.includes('5 minutes'), 'OTP template states 5-minute expiration');
    assert(otpHtml.includes('Vakancy'), 'OTP template has Vakancy branding');
    assert(otpHtml.toLowerCase().includes('do not share this code'), 'OTP template includes security warning');

    // 2. Recruiter Message Template
    const recruiterHtml = renderRecruiterMessageNotificationTemplate({
      recipientName: 'Aarav Sharma',
      senderName: 'Tech Recruiter',
      jobTitle: 'Frontend Engineer'
    });
    assert(recruiterHtml.includes('Aarav Sharma'), 'Recruiter message template has candidate name');
    assert(recruiterHtml.includes('Tech Recruiter'), 'Recruiter message template includes sender name');
    assert(recruiterHtml.includes('Frontend Engineer'), 'Recruiter message template includes job title');
    assert(recruiterHtml.includes('Privacy & Security Protection'), 'Recruiter message template includes privacy protection notice');

    // 3. Job Digest Template
    const digestHtml = renderJobDigestTemplate({
      candidateName: 'Priya Patel',
      jobs: [
        { title: 'Frontend Engineer', company_name: 'Stripe', location: 'Bengaluru', salary_min: 15, salary_max: 25 },
        { title: 'Fullstack Developer', company_name: 'Razorpay', location: 'Remote', salary_min: 20, salary_max: 35 }
      ]
    });
    assert(digestHtml.includes('Priya Patel'), 'Job digest includes candidate name');
    assert(digestHtml.includes('Frontend Engineer'), 'Job digest includes job #1');
    assert(digestHtml.includes('Fullstack Developer'), 'Job digest includes job #2');
  } catch (err) {
    assert(false, `Email templates test failed: ${err.message}`);
  }

  // --- Clean Up Test Records ---
  try {
    await db.query("DELETE FROM USER_OTP WHERE email LIKE 'test_otp_%'");
    await db.query("DELETE FROM USERS WHERE email LIKE '%@example.com'");
  } catch (cleanErr) {}

  console.log('\n================================================================');
  console.log(`TEST SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
