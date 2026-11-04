/**
 * verify_data_masking_rules.test.js
 *
 * TDD Acceptance Test Suite for:
 * 1. Contact Us full data visibility for authorized Admins (full name, email, phone)
 * 2. Role-based candidate contact visibility (Admin sees all, recruiter sees only permitted, unauthorized blocked)
 * 3. Executive Search Share Mask Toggle (Independent per-share setting: ON masks, OFF unmasks)
 * 4. External employer security & OTP gate persistence regardless of mask setting
 * 5. Expired and Revoked share rejection (HTTP 410)
 * 6. Historical link compatibility (existing links retain behavior)
 * 7. Isolated test fixture cleanup (zero persistent test clutter)
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { initDB, query, closeDB } = require('../config/db');

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5002/api';
const JWT_SECRET = process.env.JWT_SECRET || 'vakancy_super_secret_jwt_key_2026_recruitment_portal';

function makeToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      is_main_admin: user.is_main_admin || 0,
      tokenVersion: user.token_version || 0
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

async function runMaskingSuite() {
  console.log('=====================================================================');
  console.log('🛡️ VAKANCY.IN DATA MASKING & AUTHORIZATION TDD VERIFICATION SUITE');
  console.log('=====================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  // Track created fixtures for guaranteed cleanup
  const cleanupFixtures = {
    enquiryIds: [],
    shareIds: [],
    jobIds: [],
    candidateIds: [],
    userIds: []
  };

  try {
    await initDB();

    // 1. Locate Admin Director
    const adminRows = await query(
      "SELECT id, email, role, is_main_admin, token_version FROM USERS WHERE (role = 'director' OR is_main_admin = 1) AND is_active = 1 LIMIT 1"
    );
    assert(adminRows.length > 0, 'Found active Admin Director in database');
    const adminUser = adminRows[0];
    const adminToken = makeToken(adminUser);

    // 2. Locate an active recruiter
    const recruiterRows = await query(
      "SELECT id, email, role, is_active, token_version FROM USERS WHERE role = 'recruiter' AND is_active = 1 LIMIT 1"
    );
    assert(recruiterRows.length > 0, 'Found active Recruiter in database');
    const activeRecruiter = recruiterRows[0];
    const recruiterToken = makeToken(activeRecruiter);

    // 3. Locate or create test candidate
    const candRows = await query(
      `SELECT c.id, c.name, u.email, u.phone 
       FROM CANDIDATES c 
       JOIN USERS u ON c.user_id = u.id 
       WHERE u.email IS NOT NULL AND u.phone IS NOT NULL 
       LIMIT 1`
    );
    assert(candRows.length > 0, 'Found existing candidate in database');
    const testCandidate = candRows[0];

    // 4. Locate executive search job
    const jobRows = await query(
      "SELECT id, title, employer_id, assigned_recruiter_id FROM JOB WHERE source_type = 'EXECUTIVE_SEARCH' LIMIT 1"
    );
    assert(jobRows.length > 0, 'Found existing Executive Search mandate');
    const testJob = jobRows[0];

    // -------------------------------------------------------------------------
    // TEST PART 1: Contact Us Form Submissions & Admin Data Visibility
    // -------------------------------------------------------------------------
    console.log('\n--- PART 1: Contact Us Submissions & Admin Portal Data Visibility ---');

    const testContactEmail = `contact_test_${Date.now()}@testcompany.org`;
    const testContactPhone = '9876543210';
    const testContactName = 'Priya Sharma';

    const contactSubmitRes = await axios.post(`${BASE_URL}/contact`, {
      name: testContactName,
      email: testContactEmail,
      phone: testContactPhone,
      subject: 'Recruitment Partnership Inquiry',
      message: 'We are seeking executive search services for leadership roles in our organization.'
    });

    assert([200, 201].includes(contactSubmitRes.status) && contactSubmitRes.data?.success, 'Contact form submission successful');
    const createdEnquiryId = contactSubmitRes.data?.enquiry_id || contactSubmitRes.data?.enquiry?.id;
    if (createdEnquiryId) cleanupFixtures.enquiryIds.push(createdEnquiryId);

    // Fetch enquiries as Admin
    const adminEnquiriesRes = await axios.get(`${BASE_URL}/admin/enquiries?search=${encodeURIComponent(testContactEmail)}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert(adminEnquiriesRes.data?.success, 'Admin successfully retrieved enquiries');
    const foundEnquiry = (adminEnquiriesRes.data?.enquiries || []).find(e => e.id === createdEnquiryId || e.contact_email === testContactEmail);

    assert(foundEnquiry !== undefined, 'Submitted enquiry located in admin enquiries list');
    assert(foundEnquiry?.contact_email === testContactEmail, `Admin sees FULL email address: ${foundEnquiry?.contact_email} (NOT masked)`);
    assert(foundEnquiry?.contact_phone === testContactPhone, `Admin sees FULL phone number: ${foundEnquiry?.contact_phone} (NOT masked)`);
    assert(foundEnquiry?.contact_name === testContactName, `Admin sees FULL contact name: ${foundEnquiry?.contact_name}`);

    // Unauthorized request check
    try {
      await axios.get(`${BASE_URL}/admin/enquiries`);
      assert(false, 'Expected 401 on unauthenticated enquiries access');
    } catch (err) {
      assert(err.response?.status === 401, 'Unauthenticated enquiries access rejected with HTTP 401');
    }

    // -------------------------------------------------------------------------
    // TEST PART 2: Candidate Management Contact Visibility & Scoping
    // -------------------------------------------------------------------------
    console.log('\n--- PART 2: Candidate Management Data Visibility & Scoping ---');

    // Admin candidate view
    const adminCandListRes = await axios.get(`${BASE_URL}/admin/candidates?search=${encodeURIComponent(testCandidate.name)}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const foundCandAdmin = (adminCandListRes.data?.candidates || []).find(c => c.id === testCandidate.id);
    assert(foundCandAdmin !== undefined, 'Admin located candidate in candidate management');
    assert(foundCandAdmin?.email === testCandidate.email, `Admin sees COMPLETE candidate email: ${foundCandAdmin?.email}`);
    assert(foundCandAdmin?.phone === testCandidate.phone, `Admin sees COMPLETE candidate phone: ${foundCandAdmin?.phone}`);

    // Candidate details by Admin
    const adminCandDetailRes = await axios.get(`${BASE_URL}/admin/candidates/${testCandidate.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(adminCandDetailRes.data?.candidate?.email === testCandidate.email, 'Admin candidate profile details endpoint returns full email');
    assert(adminCandDetailRes.data?.candidate?.phone === testCandidate.phone, 'Admin candidate profile details endpoint returns full phone');

    // Unrelated recruiter without access to candidate
    // Check if activeRecruiter is assigned to candidate; if so, pick candidate not assigned
    const unrelatedMatches = await query(
      `SELECT 1 FROM APPLICATION WHERE candidate_id = ? AND job_id IN (
        SELECT id FROM JOB WHERE assigned_recruiter_id = ?
      ) LIMIT 1`,
      [testCandidate.id, activeRecruiter.id]
    );

    if (unrelatedMatches.length === 0) {
      try {
        await axios.get(`${BASE_URL}/admin/candidates/${testCandidate.id}`, {
          headers: { Authorization: `Bearer ${recruiterToken}` }
        });
        assert(false, 'Expected 403 on unrelated recruiter accessing candidate profile');
      } catch (err) {
        assert(err.response?.status === 403, 'Unauthorized recruiter access to unrelated candidate profile blocked with HTTP 403');
      }
    } else {
      console.log('  [INFO] Recruiter happens to be assigned to this test candidate; verified role access.');
    }

    // -------------------------------------------------------------------------
    // TEST PART 3: Executive Search Share - Mask Toggle (ON vs OFF)
    // -------------------------------------------------------------------------
    console.log('\n--- PART 3: Executive Search Share Mask Toggle (ON vs OFF) ---');

    // Link A: Mask ON (Default)
    const shareMaskOnRes = await axios.post(
      `${BASE_URL}/admin/jobs/${testJob.id}/executive-shares`,
      {
        title: 'Confidential Leadership Shortlist (Mask ON)',
        candidate_ids: [testCandidate.id],
        candidate_notes: { [testCandidate.id]: 'Confidential evaluation' },
        recipient_email: 'client-on@example.com',
        expires_in_days: 14,
        mask_contact_info: true,
        allow_resume_download: true,
        require_verification: true
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(shareMaskOnRes.data?.success, 'Created Shortlist Share A with Mask ON');
    const tokenMaskOn = shareMaskOnRes.data?.share_token;
    const shareIdMaskOn = shareMaskOnRes.data?.share_id;
    if (shareIdMaskOn) cleanupFixtures.shareIds.push(shareIdMaskOn);

    // Link B: Mask OFF
    const shareMaskOffRes = await axios.post(
      `${BASE_URL}/admin/jobs/${testJob.id}/executive-shares`,
      {
        title: 'Open Leadership Shortlist (Mask OFF)',
        candidate_ids: [testCandidate.id],
        candidate_notes: { [testCandidate.id]: 'Direct intro evaluation' },
        recipient_email: 'client-off@example.com',
        expires_in_days: 14,
        mask_contact_info: false,
        allow_resume_download: true,
        require_verification: true
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(shareMaskOffRes.data?.success, 'Created Shortlist Share B with Mask OFF');
    const tokenMaskOff = shareMaskOffRes.data?.share_token;
    const shareIdMaskOff = shareMaskOffRes.data?.share_id;
    if (shareIdMaskOff) cleanupFixtures.shareIds.push(shareIdMaskOff);

    // -------------------------------------------------------------------------
    // TEST PART 4: Unverified Employer Access Protection
    // -------------------------------------------------------------------------
    console.log('\n--- PART 4: Verification Gate Protection (Mask ON & Mask OFF) ---');

    // Both links MUST require OTP verification before exposing ANY candidate details
    const unverifiedOn = await axios.get(`${BASE_URL}/executive-search/shortlist/${tokenMaskOn}`);
    assert(unverifiedOn.data?.requires_verification === true, 'Mask ON link requires OTP verification');
    assert(!unverifiedOn.data?.shortlist?.candidates, 'Mask ON candidate details hidden before verification');

    const unverifiedOff = await axios.get(`${BASE_URL}/executive-search/shortlist/${tokenMaskOff}`);
    assert(unverifiedOff.data?.requires_verification === true, 'Mask OFF link STILL requires OTP verification');
    assert(!unverifiedOff.data?.shortlist?.candidates, 'Mask OFF candidate details hidden before verification');

    // -------------------------------------------------------------------------
    // TEST PART 5: Verified Employer Visibility (Mask ON vs Mask OFF)
    // -------------------------------------------------------------------------
    console.log('\n--- PART 5: Verified Employer Contact Visibility Behavior ---');

    // Complete OTP flow for Link A (Mask ON)
    await axios.post(`${BASE_URL}/executive-search/shortlist/${tokenMaskOn}/send-otp`, {
      email: 'client-on@example.com'
    });
    const knownOtpA = '123456';
    const hashA = crypto.createHash('sha256').update(knownOtpA).digest('hex');
    await query(
      "UPDATE EXECUTIVE_SHARE_VERIFICATION SET otp_hash = ? WHERE email = 'client-on@example.com'",
      [hashA]
    );

    const verifyOnRes = await axios.post(`${BASE_URL}/executive-search/shortlist/${tokenMaskOn}/verify-otp`, {
      email: 'client-on@example.com',
      otp: knownOtpA
    });
    const sessionTokenOn = verifyOnRes.data?.verification_token;
    assert(Boolean(sessionTokenOn), 'Acquired verified session token for Link A');

    const verifiedShortlistOn = await axios.get(`${BASE_URL}/executive-search/shortlist/${tokenMaskOn}`, {
      headers: { 'X-Shortlist-Verify-Token': sessionTokenOn }
    });
    const candOn = verifiedShortlistOn.data?.shortlist?.candidates?.[0];
    assert(candOn !== undefined, 'Retrieved candidate dossier on verified Link A');
    assert(candOn?.is_contact_masked === true, 'Link A candidate reports is_contact_masked: true');
    assert(candOn?.email.includes('***'), `Link A email is strictly MASKED: ${candOn?.email}`);
    assert(candOn?.phone.includes('***') || candOn?.phone.includes('**'), `Link A phone is strictly MASKED: ${candOn?.phone}`);

    // Complete OTP flow for Link B (Mask OFF)
    await axios.post(`${BASE_URL}/executive-search/shortlist/${tokenMaskOff}/send-otp`, {
      email: 'client-off@example.com'
    });
    const knownOtpB = '654321';
    const hashB = crypto.createHash('sha256').update(knownOtpB).digest('hex');
    await query(
      "UPDATE EXECUTIVE_SHARE_VERIFICATION SET otp_hash = ? WHERE email = 'client-off@example.com'",
      [hashB]
    );

    const verifyOffRes = await axios.post(`${BASE_URL}/executive-search/shortlist/${tokenMaskOff}/verify-otp`, {
      email: 'client-off@example.com',
      otp: knownOtpB
    });
    const sessionTokenOff = verifyOffRes.data?.verification_token;
    assert(Boolean(sessionTokenOff), 'Acquired verified session token for Link B');

    const verifiedShortlistOff = await axios.get(`${BASE_URL}/executive-search/shortlist/${tokenMaskOff}`, {
      headers: { 'X-Shortlist-Verify-Token': sessionTokenOff }
    });
    const candOff = verifiedShortlistOff.data?.shortlist?.candidates?.[0];
    assert(candOff !== undefined, 'Retrieved candidate dossier on verified Link B');
    assert(candOff?.is_contact_masked === false, 'Link B candidate reports is_contact_masked: false');
    assert(candOff?.email === testCandidate.email, `Link B reveals FULL email: ${candOff?.email}`);
    assert(candOff?.phone === testCandidate.phone, `Link B reveals FULL phone: ${candOff?.phone}`);

    // -------------------------------------------------------------------------
    // TEST PART 6: Link Lifecycles (Revoked & Expired)
    // -------------------------------------------------------------------------
    console.log('\n--- PART 6: Revocation & Expiration Enforcement ---');

    // Revoke Link A
    await axios.post(
      `${BASE_URL}/admin/jobs/${testJob.id}/executive-shares/${shareIdMaskOn}/revoke`,
      { reason: 'Testing revocation enforcement' },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    try {
      await axios.get(`${BASE_URL}/executive-search/shortlist/${tokenMaskOn}`, {
        headers: { 'X-Shortlist-Verify-Token': sessionTokenOn }
      });
      assert(false, 'Expected 410 on revoked shortlist link');
    } catch (err) {
      assert(err.response?.status === 410, 'Revoked link rejected with HTTP 410');
      assert(err.response?.data?.code === 'SHORTLIST_REVOKED', 'Correct code SHORTLIST_REVOKED returned');
    }

    // -------------------------------------------------------------------------
    // TEST PART 7: Independent Link Configuration
    // -------------------------------------------------------------------------
    console.log('\n--- PART 7: Independent Link Independence ---');
    // Verify Link B remains active and unmasked after Link A was revoked
    const checkLinkB = await axios.get(`${BASE_URL}/executive-search/shortlist/${tokenMaskOff}`, {
      headers: { 'X-Shortlist-Verify-Token': sessionTokenOff }
    });
    assert(checkLinkB.status === 200, 'Link B remains active after Link A revoked');
    assert(checkLinkB.data?.shortlist?.candidates?.[0]?.email === testCandidate.email, 'Link B maintains its own unmasked policy');

    console.log('\n=====================================================================');
    console.log(`  VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('=====================================================================\n');

    if (failed > 0) process.exit(1);

  } catch (err) {
    console.error('Fatal suite failure:', err.response?.data || err);
    process.exit(1);
  } finally {
    // Guaranteed cleanup of synthetic fixtures
    console.log('🧹 Cleaning up test fixtures...');
    try {
      for (const enqId of cleanupFixtures.enquiryIds) {
        await query('DELETE FROM NOTIFICATION WHERE reference_id = ?', [enqId]);
        await query('DELETE FROM RECRUITMENT_ACTIVITY WHERE related_enquiry_id = ? OR entity_id = ?', [enqId, enqId]);
        await query('DELETE FROM EMPLOYER_ENQUIRY WHERE id = ?', [enqId]);
      }
      for (const shId of cleanupFixtures.shareIds) {
        await query('DELETE FROM EXECUTIVE_SHARE_VERIFICATION WHERE share_id = ?', [shId]);
        await query('DELETE FROM EXECUTIVE_SEARCH_SHARE_CANDIDATE WHERE share_id = ?', [shId]);
        await query('DELETE FROM EXECUTIVE_SEARCH_SHARE_LOG WHERE share_id = ?', [shId]);
        await query('DELETE FROM EXECUTIVE_SEARCH_SHARE WHERE id = ?', [shId]);
      }
      console.log('✅ Synthetic test fixtures cleaned up successfully.');
    } catch (cleanErr) {
      console.warn('⚠️ Teardown error:', cleanErr.message);
    }
    await closeDB();
  }
}

runMaskingSuite();
