const db = require('../config/db');
const {
  smtpHost,
  smtpPort,
  smtpSecure,
  smtpUser,
  emailFrom,
  isSimulationMode,
  verifySmtpConnection
} = require('../config/smtp');
const {
  sendEmailNotification,
  sendPasswordResetEmail,
  sendCandidateWelcomeEmail,
  sendEmployerWelcomeEmail,
  sendCandidateApplicationConfirmationEmail,
  sendEmployerApplicationReceivedEmail
} = require('../services/emailService');
const {
  renderPasswordResetTemplate,
  renderCandidateWelcomeTemplate,
  renderEmployerWelcomeTemplate,
  renderCandidateApplicationTemplate,
  renderApplicationReceivedTemplate,
  renderApplicationStageTemplate
} = require('../services/emailTemplates');

async function runSmtpSuite() {
  console.log('====================================================');
  console.log('📧 HOSTINGER SMTP & TRANSACTIONAL EMAIL TEST SUITE');
  console.log('====================================================');

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

  async function postJson(path, body) {
    const res = await fetch(`http://localhost:5002${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }

  // --- 1. SMTP Configuration Verification ---
  console.log('\n--- 1. Hostinger SMTP Configuration ---');
  assert(smtpHost === 'smtp.hostinger.com', `Host is smtp.hostinger.com (got: ${smtpHost})`);
  assert(smtpPort === 465, `Port is 465 SSL/TLS (got: ${smtpPort})`);
  assert(smtpSecure === true, `Secure is true (got: ${smtpSecure})`);
  assert(smtpUser === 'support@vakancy.in', `User is support@vakancy.in (got: ${smtpUser})`);
  assert(emailFrom.includes('support@vakancy.in'), `From address includes support@vakancy.in (got: ${emailFrom})`);
  assert(isSimulationMode === true, 'Safe simulation active while SMTP_PASSWORD is placeholder (Prevents unsolicited live emails during test)');

  const connReport = await verifySmtpConnection();
  assert(connReport.ready === true, `Safe connection check returns ready: true (${connReport.message})`);

  // --- 2. HTML Email Templates & Privacy Guarantees ---
  console.log('\n--- 2. Vakancy-Branded HTML Email Templates ---');
  
  // 2.1 Password reset template
  const pwdHtml = renderPasswordResetTemplate({ resetUrl: 'https://vakancy.in/login?resetToken=test-token-123', expiresInMinutes: 60 });
  assert(pwdHtml.includes('https://vakancy.in/login?resetToken=test-token-123'), 'Password reset template contains reset URL');
  assert(pwdHtml.includes('60 minutes'), 'Password reset template contains 60-minute expiry notice');
  assert(pwdHtml.includes('Vakancy'), 'Password reset template includes Vakancy branding');

  // 2.2 Candidate welcome template
  const candWelcomeHtml = renderCandidateWelcomeTemplate({ name: 'Rohan Sharma', portalUrl: 'https://vakancy.in/candidate/dashboard' });
  assert(candWelcomeHtml.includes('Rohan Sharma'), 'Candidate welcome template includes candidate name');
  assert(candWelcomeHtml.includes('AI Resume Studio'), 'Candidate welcome template mentions AI Resume Studio');
  assert(candWelcomeHtml.includes('https://vakancy.in/candidate/dashboard'), 'Candidate welcome template has dashboard link');

  // 2.3 Employer welcome template
  const empWelcomeHtml = renderEmployerWelcomeTemplate({ name: 'Priya Mehta', companyName: 'Nexus Global', portalUrl: 'https://vakancy.in/recruiter' });
  assert(empWelcomeHtml.includes('Priya Mehta'), 'Employer welcome template includes contact person name');
  assert(empWelcomeHtml.includes('Nexus Global'), 'Employer welcome template includes company name');
  assert(empWelcomeHtml.includes('ATS Pipeline Board'), 'Employer welcome template mentions ATS Pipeline');

  // 2.4 Candidate job application confirmation
  const candAppHtml = renderCandidateApplicationTemplate({
    jobTitle: 'Senior React Developer',
    companyName: 'TechCorp India',
    referenceNumber: 'APP-99887766',
    appliedAt: '23/10/2026, 10:30 PM',
    dashboardUrl: 'https://vakancy.in/candidate/applications'
  });
  assert(candAppHtml.includes('Senior React Developer'), 'Application confirmation template has job title');
  assert(candAppHtml.includes('TechCorp India'), 'Application confirmation template has company name');
  assert(candAppHtml.includes('APP-99887766'), 'Application confirmation template has reference number');

  // 2.5 Employer notification: ZERO Candidate PII Guarantee
  const empNotifHtml = renderApplicationReceivedTemplate({
    jobTitle: 'Senior React Developer',
    applicationRef: 'APP-99887766',
    appliedAt: '23/10/2026, 10:30 PM',
    dashboardUrl: 'https://vakancy.in/recruiter/jobs/job-123/applicants'
  });
  assert(empNotifHtml.includes('Senior React Developer'), 'Employer alert includes job title');
  assert(empNotifHtml.includes('APP-99887766'), 'Employer alert includes application reference');
  assert(!empNotifHtml.includes('Rohan Sharma'), 'Employer alert strictly omits candidate name');
  assert(!empNotifHtml.includes('@gmail.com'), 'Employer alert strictly omits candidate personal email');

  // --- 3. Deduplication Engine ---
  console.log('\n--- 3. Notification Deduplication Engine ---');
  const testDedupEmail = `dedup.test.${Date.now()}@vakancy.test`;
  const send1 = await sendEmailNotification({
    to: testDedupEmail,
    subject: 'Unique Test Subject For Dedup',
    html: '<p>Test email body</p>',
    templateType: 'TEST_TEMPLATE'
  });
  assert(send1.success === true, 'First email send succeeds');

  const send2 = await sendEmailNotification({
    to: testDedupEmail,
    subject: 'Unique Test Subject For Dedup',
    html: '<p>Test email body</p>',
    templateType: 'TEST_TEMPLATE'
  });
  assert(send2.deduplicated === true, 'Immediate identical second email is suppressed by deduplication engine');

  // --- 4. Registration Welcome Email Dispatch ---
  console.log('\n--- 4. Registration Welcome Email Dispatch ---');
  const testCandEmail = `cand.welcome.${Date.now()}@example.com`;
  const candReg = await postJson('/api/auth/register', {
    name: 'Aarav Patel',
    email: testCandEmail,
    phone: '9898989898',
    password: 'Password123!Safe',
    role: 'candidate'
  });
  assert(candReg.status === 201, `Candidate registration succeeds with 201 (got ${candReg.status})`);

  // Allow short async processing tick
  await new Promise(r => setTimeout(r, 600));

  const candLogs = await db.query(
    'SELECT * FROM EMAIL_LOGS WHERE recipient_email = ? ORDER BY sent_at DESC LIMIT 1',
    [testCandEmail]
  );
  assert(candLogs.length > 0, 'EMAIL_LOGS record generated for candidate welcome email');
  assert(candLogs[0]?.template_type === 'WELCOME_CANDIDATE', `Candidate log has template_type WELCOME_CANDIDATE (got: ${candLogs[0]?.template_type})`);

  // Employer registration welcome email
  const testEmpEmail = `emp.welcome.${Date.now()}@example.com`;
  const empReg = await postJson('/api/auth/register', {
    name: 'Vikram Seth',
    email: testEmpEmail,
    phone: '9797979797',
    password: 'Password123!Safe',
    role: 'employer',
    company_name: 'Apex Solutions'
  });
  assert(empReg.status === 201, `Employer registration succeeds with 201 (got ${empReg.status})`);

  await new Promise(r => setTimeout(r, 600));

  const empLogs = await db.query(
    'SELECT * FROM EMAIL_LOGS WHERE recipient_email = ? ORDER BY sent_at DESC LIMIT 1',
    [testEmpEmail]
  );
  assert(empLogs.length > 0, 'EMAIL_LOGS record generated for employer welcome email');
  assert(empLogs[0]?.template_type === 'WELCOME_EMPLOYER', `Employer log has template_type WELCOME_EMPLOYER (got: ${empLogs[0]?.template_type})`);

  // --- 5. Forgot Password Security & Single-Use Tokens ---
  console.log('\n--- 5. Password Reset Security & Single-Use Tokens ---');

  // 5.1 Non-enumeration check on unknown email
  const unknownEmailRes = await postJson('/api/auth/forgot-password', {
    email: 'nonexistent.user.999@vakancy.in'
  });
  assert(unknownEmailRes.status === 200, 'Forgot password for non-existent email returns 200 (prevents user enumeration)');
  assert(unknownEmailRes.data.message.includes('If the email is registered'), 'Generic non-enumerating message returned');

  // 5.2 Request reset for real registered candidate
  const knownEmailRes = await postJson('/api/auth/forgot-password', {
    email: testCandEmail
  });
  assert(knownEmailRes.status === 200, 'Forgot password for registered candidate returns 200');
  assert(knownEmailRes.data.message === unknownEmailRes.data.message, 'Message is identical for registered vs non-registered user (zero leakage)');

  // 5.3 Verify cryptographic token hash and expiration in DB
  const [userDb] = await db.query(
    'SELECT id, reset_token_hash, reset_token_expires FROM USERS WHERE email = ?',
    [testCandEmail]
  );
  assert(!!userDb?.reset_token_hash, 'Single-use reset_token_hash is populated in USERS table');
  assert(new Date(userDb?.reset_token_expires) > new Date(), 'reset_token_expires is in the future');

  // 5.4 Reject invalid reset token
  const invalidResetRes = await postJson('/api/auth/reset-password', {
    token: 'completely-bogus-token-12345',
    newPassword: 'BrandNewSecurePassword123!'
  });
  assert(invalidResetRes.status === 400, `Rejects invalid reset token with 400 (got ${invalidResetRes.status})`);

  // 5.5 Single-use enforcement via direct token reset test
  const { createResetToken, hashResetToken } = require('../services/passwordResetService');
  const freshTokenObj = createResetToken();
  await db.query(
    'UPDATE USERS SET reset_token_hash = ?, reset_token_expires = ? WHERE id = ?',
    [freshTokenObj.tokenHash, freshTokenObj.expiresAt, userDb.id]
  );

  const validResetRes = await postJson('/api/auth/reset-password', {
    token: freshTokenObj.token,
    newPassword: 'BrandNewSecurePassword123!'
  });
  assert(validResetRes.status === 200 && validResetRes.data.success, 'Valid reset token successfully changes password');

  // Verify token was cleared from database (single-use)
  const [postResetUser] = await db.query(
    'SELECT reset_token_hash, reset_token_expires FROM USERS WHERE id = ?',
    [userDb.id]
  );
  assert(postResetUser.reset_token_hash === null, 'reset_token_hash is set to NULL immediately after use (single-use)');

  // Attempting to reuse the exact same token must fail
  const reuseResetRes = await postJson('/api/auth/reset-password', {
    token: freshTokenObj.token,
    newPassword: 'AnotherPassword999!'
  });
  assert(reuseResetRes.status === 400, 'Reusing previously consumed token is rejected with 400 (anti-replay)');

  // 5.6 Test login with the newly set password
  const newLoginRes = await postJson('/api/auth/login', {
    identifier: testCandEmail,
    password: 'BrandNewSecurePassword123!',
    role: 'candidate'
  });
  assert(newLoginRes.status === 200 && newLoginRes.data.success, 'Login succeeds with new password');

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSmtpSuite().catch(err => {
  console.error('Fatal SMTP test error:', err);
  process.exit(1);
});
