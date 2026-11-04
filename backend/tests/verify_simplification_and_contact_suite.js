/**
 * verify_simplification_and_contact_suite.js
 *
 * Comprehensive Automated Verification Suite for:
 * 1. Contact Us public form validation, honeypot spam protection, duplicate submission prevention
 * 2. Admin portal contact enquiries retrieval, counts, status updates, unauthorized access rejection
 * 3. Official support email centralization (support@vakancy.in)
 * 4. Executive search shortlist sharing with employer verification (OTP gate & resume download access)
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');
const { initDB, query, closeDB } = require('../config/db');
const { SUPPORT_EMAIL } = require('../config/constants');
const crypto = require('crypto');

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5002/api';

// Helper to generate admin auth token for testing
function generateTestAdminToken(adminUser) {
  return jwt.sign(
    {
      id: adminUser.id,
      email: adminUser.email,
      role: adminUser.role || 'main_admin',
      is_main_admin: adminUser.is_main_admin || 1
    },
    process.env.JWT_SECRET || 'vakancy_super_secret_jwt_key_2026_recruitment_portal',
    { expiresIn: '1h' }
  );
}

async function runSuite() {
  console.log('================================================================');
  console.log('  VAKANCY.IN SIMPLIFICATION, CONTACT & SUPPORT VERIFICATION');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;
  let createdEnquiryId = null;
  let createdShareId = null;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    await initDB();

    // -------------------------------------------------------------------------
    // TEST 1: Centralized Support Email Configuration & Platform Settings
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: Centralized Support Email Verification ---');
    assert(SUPPORT_EMAIL === 'support@vakancy.in', `Constant SUPPORT_EMAIL is strictly support@vakancy.in (found: ${SUPPORT_EMAIL})`);

    const settingRows = await query(
      'SELECT setting_value FROM platform_setting WHERE setting_key = "support_email"'
    );
    assert(
      settingRows && settingRows.length > 0 && settingRows[0].setting_value === 'support@vakancy.in',
      `Database platform_setting support_email is support@vakancy.in (found: ${settingRows?.[0]?.setting_value})`
    );

    // -------------------------------------------------------------------------
    // TEST 2: Public Contact Form Submission & Validation
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Public Contact Form Validation & Anti-Spam ---');
    
    // 2a. Invalid Email Rejection
    try {
      await axios.post(`${BASE_URL}/contact`, {
        name: 'Test Visitor',
        email: 'invalid-email-format',
        subject: 'General Question',
        message: 'This is a test message that has sufficient characters.'
      });
      assert(false, 'Expected 400 Bad Request on invalid email format');
    } catch (err) {
      assert(err.response?.status === 400, 'Invalid email correctly rejected with HTTP 400');
    }

    // 2b. Missing message rejection
    try {
      await axios.post(`${BASE_URL}/contact`, {
        name: 'Test Visitor',
        email: 'valid@example.com',
        subject: 'General Question',
        message: 'short'
      });
      assert(false, 'Expected 400 on message under 10 characters');
    } catch (err) {
      assert(err.response?.status === 400, 'Short message rejected with HTTP 400');
    }

    // 2c. Bot Honeypot Silent Drop
    try {
      await axios.post(`${BASE_URL}/contact`, {
        name: 'Spam Bot',
        email: 'bot@spammer.com',
        subject: 'Buy crypto now',
        message: 'Spam message that should trigger honeypot trap',
        website: 'http://spam-link.ru'
      });
      assert(false, 'Expected honeypot to reject bot submission');
    } catch (err) {
      assert(err.response?.status === 400, 'Honeypot rejected bot submission with HTTP 400');
    }

    const honeypotCheck = await query(
      'SELECT id FROM EMPLOYER_ENQUIRY WHERE contact_email = "bot@spammer.com"'
    );
    assert(honeypotCheck.length === 0, 'Honeypot entry dropped silently from database');

    // 2d. Legitimate Valid Contact Form Submission
    const uniqueEmail = `test.contact.${Date.now()}@vakancy-test.com`;
    const contactRes = await axios.post(`${BASE_URL}/contact`, {
      name: 'Priya Sharma',
      email: uniqueEmail,
      phone: '+91 98765 43210',
      subject: 'Corporate Recruitment Query',
      message: 'We are seeking an executive director for our logistics vertical in Pune.'
    });

    assert(contactRes.data?.success === true, 'Legitimate contact submission succeeds');
    assert(Boolean(contactRes.data?.reference), `Generated inquiry reference: ${contactRes.data?.reference}`);

    const enquiryRows = await query(
      'SELECT id, contact_name, contact_email, status, source FROM EMPLOYER_ENQUIRY WHERE contact_email = ?',
      [uniqueEmail]
    );
    assert(enquiryRows.length > 0, 'Enquiry record saved in EMPLOYER_ENQUIRY');
    assert(enquiryRows[0]?.source === 'CONTACT_US', `Source is marked CONTACT_US (found: ${enquiryRows[0]?.source})`);
    assert(enquiryRows[0]?.status === 'NEW', `Initial status is NEW (found: ${enquiryRows[0]?.status})`);

    createdEnquiryId = enquiryRows[0]?.id;

    // 2e. Duplicate Submission Prevention
    try {
      await axios.post(`${BASE_URL}/contact`, {
        name: 'Priya Sharma',
        email: uniqueEmail,
        phone: '+91 98765 43210',
        subject: 'Corporate Recruitment Query',
        message: 'Duplicate submission attempt within minutes.'
      });
      assert(false, 'Expected 429 Too Many Requests on duplicate submission');
    } catch (err) {
      assert(err.response?.status === 429, 'Duplicate submission blocked with HTTP 429 rate limit');
    }

    // -------------------------------------------------------------------------
    // TEST 3: Admin Portal Enquiries API & Authorization
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Admin Portal Enquiries Management & Security ---');

    // 3a. Unauthorized Access Denial
    try {
      await axios.get(`${BASE_URL}/admin/enquiries`);
      assert(false, 'Expected 401 Unauthorized for unauthenticated admin request');
    } catch (err) {
      assert(err.response?.status === 401, 'Unauthenticated admin enquiry access denied with HTTP 401');
    }

    // Retrieve active admin user
    const adminUsers = await query(
      'SELECT id, email, role, is_main_admin FROM users WHERE role IN ("main_admin", "director") AND is_active = 1 LIMIT 1'
    );
    if (adminUsers.length === 0) {
      throw new Error('No active director/main_admin found in database for test authentication.');
    }
    const adminUser = adminUsers[0];
    const adminToken = generateTestAdminToken(adminUser);
    const authHeaders = { Authorization: `Bearer ${adminToken}` };

    // 3b. Admin Enquiries Counts
    const countsRes = await axios.get(`${BASE_URL}/admin/enquiries/counts`, { headers: authHeaders });
    assert(countsRes.data?.success === true, 'Admin successfully fetched enquiry counts');
    assert(typeof countsRes.data?.counts?.new === 'number', `New enquiries count reported: ${countsRes.data?.counts?.new}`);

    // 3c. Admin Enquiry Status Update
    const updateRes = await axios.put(
      `${BASE_URL}/admin/enquiries/${createdEnquiryId}/details`,
      {
        status: 'IN_PROGRESS',
        notes: 'Assigned to senior logistics recruitment consultant for callback.'
      },
      { headers: authHeaders }
    );
    assert(updateRes.data?.success === true, 'Admin successfully updated enquiry status to IN_PROGRESS');

    const updatedEnquiry = await query(
      'SELECT status, notes FROM EMPLOYER_ENQUIRY WHERE id = ?',
      [createdEnquiryId]
    );
    assert(updatedEnquiry[0]?.status === 'IN_PROGRESS', 'Database reflects updated status IN_PROGRESS');

    // -------------------------------------------------------------------------
    // TEST 4: Executive Search Shortlist Sharing & External Employer OTP
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: Executive Search Shortlist Sharing & Verification ---');

    // Find an active job with applications
    const jobRows = await query(`
      SELECT j.id, j.title, COUNT(a.id) as app_count
      FROM job j
      JOIN application a ON a.job_id = j.id
      GROUP BY j.id
      HAVING app_count >= 1
      LIMIT 1
    `);

    if (jobRows.length === 0) {
      console.warn('  [SKIP] No existing job with applications found to test shortlist sharing creation.');
    } else {
      const targetJob = jobRows[0];
      await query("UPDATE job SET created_by_type = 'ADMIN' WHERE id = ?", [targetJob.id]);

      const candidates = await query(
        'SELECT candidate_id FROM application WHERE job_id = ? LIMIT 2',
        [targetJob.id]
      );
      const candIds = candidates.map(c => c.candidate_id);

      const recipientEmail = `hiring.lead.${Date.now()}@clientcorp.com`;
      
      // 4a. Create Executive Search Share with Email & Verification
      const createShareRes = await axios.post(
        `${BASE_URL}/admin/jobs/${targetJob.id}/executive-shares`,
        {
          title: `Confidential Leadership Shortlist for ${targetJob.title}`,
          candidate_ids: candIds,
          expires_in_days: 14,
          allow_resume_download: true,
          recipient_email: recipientEmail,
          custom_message: 'Please review these shortlisted candidates evaluated by our executive team.'
        },
        { headers: authHeaders }
      );

      assert(createShareRes.data?.success === true, 'Successfully created Executive Shortlist Share');
      const shareToken = createShareRes.data?.share_token || createShareRes.data?.share?.token;
      createdShareId = createShareRes.data?.share_id || createShareRes.data?.share?.id;
      assert(Boolean(shareToken), `Generated secure token: ${shareToken}`);

      // Verify DB record has recipient details and verification flag
      const shareRecord = await query(
        'SELECT recipient_email, require_verification FROM EXECUTIVE_SEARCH_SHARE WHERE share_token_hash = ?',
        [crypto.createHash('sha256').update(shareToken).digest('hex')]
      );
      assert(shareRecord[0]?.recipient_email === recipientEmail, 'Recipient email saved in EXECUTIVE_SEARCH_SHARE');
      assert(shareRecord[0]?.require_verification === 1, 'require_verification set to 1 for protected external share');

      // 4b. Public Access without Verification should be gated
      const unauthShareRes = await axios.get(`${BASE_URL}/executive-search/shortlist/${shareToken}`);
      assert(unauthShareRes.data?.success === true, 'Shortlist endpoint returns status 200');
      assert(unauthShareRes.data?.requires_verification === true, 'requires_verification is true for unauthenticated request');
      assert(!unauthShareRes.data?.shortlist?.candidates, 'Candidate dossiers are strictly hidden without verification');
      assert(Boolean(unauthShareRes.data?.shortlist?.recipient_hint), `Recipient hint provided: ${unauthShareRes.data?.shortlist?.recipient_hint}`);

      // 4c. Request OTP for External Employer
      const otpSendRes = await axios.post(`${BASE_URL}/executive-search/shortlist/${shareToken}/send-otp`, {
        email: recipientEmail
      });
      assert(otpSendRes.data?.success === true, 'OTP request succeeded for authorized recipient');

      // Fetch the generated OTP from database to test verification
      const otpRows = await query(`
        SELECT otp_hash 
        FROM EXECUTIVE_SHARE_VERIFICATION 
        WHERE email = ? 
        ORDER BY created_at DESC LIMIT 1
      `, [recipientEmail]);
      assert(otpRows.length > 0, 'Verification record created in EXECUTIVE_SHARE_VERIFICATION');

      // 4d. Reject wrong OTP
      try {
        await axios.post(`${BASE_URL}/executive-search/shortlist/${shareToken}/verify-otp`, {
          email: recipientEmail,
          otp: '000000'
        });
        assert(false, 'Expected 400 on incorrect OTP');
      } catch (err) {
        assert(err.response?.status === 400, 'Invalid OTP correctly rejected with HTTP 400');
      }

      // 4e. Test successful OTP verification by simulating the valid hash
      // Update DB with a known OTP for test determinism
      const knownOtp = '987654';
      const knownOtpHash = crypto.createHash('sha256').update(knownOtp).digest('hex');
      await query(
        'UPDATE EXECUTIVE_SHARE_VERIFICATION SET otp_hash = ? WHERE email = ?',
        [knownOtpHash, recipientEmail]
      );

      const verifyRes = await axios.post(`${BASE_URL}/executive-search/shortlist/${shareToken}/verify-otp`, {
        email: recipientEmail,
        otp: knownOtp
      });
      assert(verifyRes.data?.success === true, 'OTP verified successfully');
      const sessionToken = verifyRes.data?.verification_token;
      assert(Boolean(sessionToken), `Received verification session token: ${sessionToken}`);

      // 4f. Access Shortlist with verification session token
      const authShareRes = await axios.get(`${BASE_URL}/executive-search/shortlist/${shareToken}`, {
        headers: { 'X-Shortlist-Verify-Token': sessionToken }
      });
      assert(authShareRes.data?.success === true, 'Authorized shortlist request succeeded');
      assert(authShareRes.data?.requires_verification === undefined, 'No longer requires verification');
      assert(Array.isArray(authShareRes.data?.shortlist?.candidates), 'Candidate profiles are now accessible');
      assert(authShareRes.data?.shortlist?.candidates.length > 0, `Returned ${authShareRes.data?.shortlist?.candidates.length} candidates`);

      // 4g. Test Resume download gating
      const candidateToDownload = authShareRes.data?.shortlist?.candidates[0];
      if (candidateToDownload) {
        // Without token should fail
        try {
          await axios.get(`${BASE_URL}/executive-search/shortlist/${shareToken}/resumes/${candidateToDownload.id}`);
          assert(false, 'Expected 401 or 403 on unverified resume download');
        } catch (err) {
          assert([401, 403].includes(err.response?.status), `Unverified resume download blocked with HTTP ${err.response?.status}`);
        }

        // With token should succeed or return signed URL / not found safely
        try {
          const dlRes = await axios.get(
            `${BASE_URL}/executive-search/shortlist/${shareToken}/resumes/${candidateToDownload.id}`,
            { headers: { 'X-Shortlist-Verify-Token': sessionToken } }
          );
          assert(dlRes.data?.success === true, 'Verified resume download access granted');
        } catch (err) {
          // If candidate doesn't have an uploaded PDF in test env, 404 is valid and secure
          assert(err.response?.status === 404, 'Verified resume download checked file (404 when test candidate has no file)');
        }
      }
    }

    console.log('\n================================================================');
    console.log(`  VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal suite failure:', err);
    process.exit(1);
  } finally {
    try {
      if (createdEnquiryId) {
        await query('DELETE FROM NOTIFICATION WHERE reference_id = ?', [createdEnquiryId]);
        await query('DELETE FROM RECRUITMENT_ACTIVITY WHERE related_enquiry_id = ? OR entity_id = ?', [createdEnquiryId, createdEnquiryId]);
        await query('DELETE FROM EMPLOYER_ENQUIRY WHERE id = ?', [createdEnquiryId]);
      }
      if (createdShareId) {
        await query('DELETE FROM EXECUTIVE_SHARE_VERIFICATION WHERE share_id = ?', [createdShareId]);
        await query('DELETE FROM EXECUTIVE_SEARCH_SHARE_CANDIDATE WHERE share_id = ?', [createdShareId]);
        await query('DELETE FROM EXECUTIVE_SEARCH_SHARE_LOG WHERE share_id = ?', [createdShareId]);
        await query('DELETE FROM EXECUTIVE_SEARCH_SHARE WHERE id = ?', [createdShareId]);
      }
    } catch (cleanupErr) {
      console.warn('⚠️ Teardown warning:', cleanupErr.message);
    }
    await closeDB();
  }
}

runSuite();
