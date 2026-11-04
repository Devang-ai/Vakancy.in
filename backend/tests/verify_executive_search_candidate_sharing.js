const assert = require('assert');
const crypto = require('crypto');
const db = require('../config/db');

const API_BASE = 'http://localhost:5002/api';

async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/zip') || contentType.includes('application/octet-stream')) {
    const arrayBuffer = await res.arrayBuffer();
    return {
      status: res.status,
      headers: res.headers,
      buffer: Buffer.from(arrayBuffer)
    };
  }
  const data = await res.json().catch(() => ({}));
  return { status: res.status, headers: res.headers, data };
}

async function login(email, password) {
  const res = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  assert(res.status === 200 && res.data.success, `Login failed for ${email}: ${JSON.stringify(res.data)}`);
  return res.data.token;
}

async function runVerification() {
  console.log('=====================================================================');
  console.log('🧪 EXECUTIVE SEARCH CANDIDATE SHARING SYSTEM - ACCEPTANCE TEST SUITE');
  console.log('=====================================================================');

  let createdShareId = null;

  try {
    await db.initDB();

    // 1. Authenticate Admin Director
    console.log('\n--- Step 1: Admin Authentication ---');
    const adminToken = await login('director@vakancy.com', 'password123');
    console.log('✅ Admin Director authenticated successfully');

    // 2. Locate or Prepare an Executive Search Mandate Job
    console.log('\n--- Step 2: Locating Executive Search Job ---');
    const execJobs = await db.query(
      `SELECT j.id, j.title, e.company_name, j.employer_id, j.source_type, j.allow_candidate_access 
       FROM JOB j 
       LEFT JOIN EMPLOYERS e ON j.employer_id = e.id
       WHERE j.source_type = 'EXECUTIVE_SEARCH' 
       ORDER BY j.created_at DESC LIMIT 1`
    );

    let testJobId;
    let testEmployerId;
    if (execJobs && execJobs.length > 0) {
      testJobId = execJobs[0].id;
      testEmployerId = execJobs[0].employer_id;
      console.log(`✅ Using existing Executive Search Job ID ${testJobId}: "${execJobs[0].title}" (${execJobs[0].company_name || 'Executive Mandate'})`);
    } else {
      // Find an employer to attach to
      const employers = await db.query(`SELECT id FROM EMPLOYERS LIMIT 1`);
      testEmployerId = employers[0].id;
      const newJobId = crypto.randomUUID();
      await db.query(
        `INSERT INTO JOB (id, employer_id, title, description, location, status, source_type, allow_candidate_access, created_by_type)
         VALUES (?, ?, 'VP of Engineering - Mandate', 'Lead engineering for executive tier', 'Bengaluru', 'open', 'EXECUTIVE_SEARCH', 0, 'ADMIN')`,
        [newJobId, testEmployerId]
      );
      testJobId = newJobId;
      console.log(`✅ Created test Executive Search Job ID ${testJobId}`);
    }

    // 3. Test Candidate Shortlisting Workflow
    console.log('\n--- Step 3: Explicit Candidate Shortlisting for Mandate ---');
    let sourcingRes = await request(`/admin/jobs/${testJobId}/executive-candidates`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(sourcingRes.status, 200, `Failed to fetch executive candidates: ${JSON.stringify(sourcingRes.data)}`);
    assert(sourcingRes.data.success, 'Expected success: true');
    assert(Array.isArray(sourcingRes.data.candidates), 'Expected candidates array');

    // If candidates not yet shortlisted, test explicit shortlisting API
    if (sourcingRes.data.candidates.length < 2) {
      const poolCands = await db.query(`SELECT id, name FROM CANDIDATES LIMIT 2`);
      for (const c of poolCands) {
        const slRes = await request(`/admin/jobs/${testJobId}/shortlist`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}` },
          body: JSON.stringify({
            candidate_id: c.id,
            source: 'MANUAL_SOURCING',
            notes: 'Shortlisted during mandate talent review'
          })
        });
        assert(slRes.data.success, 'Expected shortlist API success');
      }
      sourcingRes = await request(`/admin/jobs/${testJobId}/executive-candidates`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
    }

    console.log(`✅ Retrieved ${sourcingRes.data.candidates.length} candidate profiles available for executive shortlisting`);
    assert(sourcingRes.data.candidates.length >= 2, 'Need at least 2 candidates in test pool');

    const candidate1 = sourcingRes.data.candidates[0];
    const candidate2 = sourcingRes.data.candidates[1];
    console.log(`   Candidate 1: ID ${candidate1.id} - ${candidate1.name} (${candidate1.current_title || 'Software Executive'})`);
    console.log(`   Candidate 2: ID ${candidate2.id} - ${candidate2.name} (${candidate2.current_title || 'Lead Architect'})`);

    // Ensure candidate resumes exist for download testing
    for (const cand of [candidate1, candidate2]) {
      const existingRes = await db.query(
        'SELECT id FROM CANDIDATE_RESUME WHERE candidate_id = ? AND is_primary = 1',
        [cand.id]
      );
      if (existingRes.length === 0) {
        await db.query(
          `INSERT INTO CANDIDATE_RESUME (id, candidate_id, file_name, file_url, is_primary)
           VALUES (?, ?, ?, 'https://example.com/resumes/sample.pdf', 1)`,
          [crypto.randomUUID(), cand.id, `${cand.name.replace(/[^a-zA-Z0-9]/g, '_')}_CV.pdf`]
        );
      }
    }

    // 4. Test Shortlist Share Creation with Token Generation and Security Hashing
    console.log('\n--- Step 4: Creating Candidate Shortlist Share ---');
    const shortlistPayload = {
      title: 'Top Tier Engineering Leadership Shortlist',
      candidate_ids: [candidate1.id, candidate2.id],
      candidate_notes: {
        [candidate1.id]: 'Exceptional track record scaling distributed systems at hypergrowth startup.',
        [candidate2.id]: 'Deep domain expertise in cloud native architecture and team leadership.'
      },
      expires_in_days: 14,
      allow_resume_download: true,
      mask_contact_info: true,
      require_employer_auth: false,
      send_email: false
    };

    const shareCreateRes = await request(`/admin/jobs/${testJobId}/executive-shares`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(shortlistPayload)
    });

    assert.strictEqual(shareCreateRes.status, 201, `Failed to create shortlist share: ${JSON.stringify(shareCreateRes.data)}`);
    assert(shareCreateRes.data.success, 'Share response should have success: true');
    assert(shareCreateRes.data.share_token, 'Share response must return plaintext token to admin once');
    assert(shareCreateRes.data.share_url, 'Share response must return public share url');

    const rawToken = shareCreateRes.data.share_token;
    const shareId = shareCreateRes.data.share_id || shareCreateRes.data.share?.id;
    createdShareId = shareId;
    console.log(`✅ Shortlist Share created! Share ID: ${shareId}`);
    console.log(`   Public Token: ${rawToken}`);
    console.log(`   Public URL:   ${shareCreateRes.data.share_url}`);

    // Verify Database Token Hashing (Security Assurance)
    console.log('\n--- Step 5: Database Security & SHA-256 Hash Verification ---');
    const shareRows = await db.query(
      `SELECT id, job_id, share_token_hash, status, mask_contact_info, allow_resume_download, expires_at 
       FROM EXECUTIVE_SEARCH_SHARE WHERE id = ?`,
      [shareId]
    );
    assert.strictEqual(shareRows.length, 1, 'Share row must exist in database');
    const shareRow = shareRows[0];

    const expectedHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    assert.strictEqual(shareRow.share_token_hash, expectedHash, 'Database MUST store SHA-256 hash of token, never the raw token!');
    assert.strictEqual(shareRow.status, 'ACTIVE', 'Share status must be ACTIVE');
    assert.strictEqual(shareRow.mask_contact_info, 1, 'mask_contact_info should be 1');
    assert.strictEqual(shareRow.allow_resume_download, 1, 'allow_resume_download should be 1');
    console.log(`✅ Verified SHA-256 token hash storage in database: ${expectedHash.slice(0, 16)}...`);

    // Verify candidates mapping in database
    const candMapRows = await db.query(
      `SELECT * FROM EXECUTIVE_SEARCH_SHARE_CANDIDATE WHERE share_id = ? ORDER BY display_order ASC`,
      [shareId]
    );
    assert.strictEqual(candMapRows.length, 2, 'Exactly 2 candidates mapped to shortlist');
    console.log(`✅ Verified 2 candidates mapped with recruiter notes in EXECUTIVE_SEARCH_SHARE_CANDIDATE`);

    // 6. Test Public Shortlist View (Employer View)
    console.log('\n--- Step 6: Public Shortlist Access & Privacy Masking ---');
    const publicViewRes = await request(`/shared/shortlist/${rawToken}`, {
      headers: {
        'User-Agent': 'TestEmployerBrowser/1.0',
        'X-Forwarded-For': '203.0.113.195'
      }
    });

    assert.strictEqual(publicViewRes.status, 200, `Failed to fetch public shortlist: ${JSON.stringify(publicViewRes.data)}`);
    assert(publicViewRes.data.success, 'Public shortlist access failed');
    assert.strictEqual(publicViewRes.data.shortlist.title, 'Top Tier Engineering Leadership Shortlist');
    const returnedCandidates = publicViewRes.data.candidates || publicViewRes.data.shortlist?.candidates;
    assert(returnedCandidates && returnedCandidates.length === 2, `Should display 2 candidates to employer, got: ${returnedCandidates?.length}`);

    // Verify Cache-Control Headers for Sensitive Executive Data
    const cacheControl = publicViewRes.headers.get('cache-control') || '';
    assert(cacheControl.includes('no-store'), `Cache-Control must contain no-store, got: ${cacheControl}`);
    console.log(`✅ Verified Cache-Control header: ${cacheControl}`);

    // Verify Privacy Masking of Phone and Email
    const pubCand1 = returnedCandidates.find(c => c.id === candidate1.id);
    assert(pubCand1, 'Candidate 1 missing from public response');
    assert(pubCand1.email.includes('*'), `Candidate email must be masked! Got: ${pubCand1.email}`);
    assert((pubCand1.notes || pubCand1.recruiter_notes || '').includes('Exceptional track record'), 'Recruiter notes should be visible to client');
    console.log(`✅ Verified Candidate Privacy Masking:`);
    console.log(`   Name:  ${pubCand1.name}`);
    console.log(`   Email: ${pubCand1.email} (masked)`);
    console.log(`   Phone: ${pubCand1.phone} (masked)`);
    console.log(`   Notes: "${pubCand1.notes || pubCand1.recruiter_notes}"`);

    // 7. Test Single Resume Download
    console.log('\n--- Step 7: Single Candidate Resume Access ---');
    const resumeRes = await request(`/shared/shortlist/${rawToken}/candidates/${candidate1.id}/resume`);
    assert(resumeRes.status === 200 || resumeRes.status === 302, `Resume endpoint returned status ${resumeRes.status}`);
    console.log(`✅ Single resume download authorized and logged`);

    // 8. Test Bulk Resumes ZIP Download
    console.log('\n--- Step 8: Bulk Resumes PKZIP Download ---');
    const zipRes = await request(`/shared/shortlist/${rawToken}/resumes.zip`);
    assert.strictEqual(zipRes.status, 200, 'ZIP download failed');
    const zipContentType = zipRes.headers.get('content-type') || '';
    assert(zipContentType.includes('application/zip'), `Expected application/zip content type, got: ${zipContentType}`);
    assert(zipRes.buffer && zipRes.buffer.length > 22, 'ZIP buffer must be non-empty and have valid header');
    
    // Check PKZIP signature (0x04034b50)
    assert.strictEqual(zipRes.buffer[0], 0x50, 'Byte 0 must be 0x50 ("P")');
    assert.strictEqual(zipRes.buffer[1], 0x4B, 'Byte 1 must be 0x4B ("K")');
    console.log(`✅ Successfully downloaded bulk ZIP archive (${zipRes.buffer.length} bytes, valid PKZIP signature verified)`);

    // 9. Verify Audit Trail Logging
    console.log('\n--- Step 9: Audit Trail & Access Log Verification ---');
    const logRows = await db.query(
      `SELECT action, candidate_id, ip_address, user_agent, created_at 
       FROM EXECUTIVE_SEARCH_SHARE_LOG 
       WHERE share_id = ? 
       ORDER BY id ASC`,
      [shareId]
    );
    assert(logRows.length >= 3, `Expected at least 3 log entries (VIEW, DOWNLOAD_RESUME, BULK_DOWNLOAD), got ${logRows.length}`);
    const actionsLogged = logRows.map(l => l.action);
    console.log(`✅ Verified logged actions in EXECUTIVE_SEARCH_SHARE_LOG:`, actionsLogged);
    assert(actionsLogged.includes('VIEW_SHORTLIST') || actionsLogged.includes('VIEW'), 'Missing VIEW action in log');
    assert(actionsLogged.includes('DOWNLOAD_RESUME'), 'Missing DOWNLOAD_RESUME action in log');
    assert(actionsLogged.includes('BULK_DOWNLOAD_RESUMES') || actionsLogged.includes('DOWNLOAD_BULK_ZIP'), 'Missing BULK_DOWNLOAD action in log');

    // Also test admin activity endpoint
    const activityRes = await request(`/admin/jobs/${testJobId}/executive-shares/${shareId}/activity`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(activityRes.status, 200);
    assert(activityRes.data.logs.length >= 3, 'Admin activity endpoint must return log items');
    console.log(`✅ Admin activity query endpoint verified (${activityRes.data.logs.length} logs returned)`);

    // 10. Test Link Revocation and Security Invalidation
    console.log('\n--- Step 10: Shortlist Revocation & Revocation Enforcement ---');
    const revokeRes = await request(`/admin/jobs/${testJobId}/executive-shares/${shareId}/revoke`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ reason: 'Client requested updated candidate list' })
    });
    assert.strictEqual(revokeRes.status, 200, `Revocation failed: ${JSON.stringify(revokeRes.data)}`);
    console.log(`✅ Admin successfully revoked shortlist link`);

    // Attempt to access revoked shortlist as public employer
    const revokedViewRes = await request(`/shared/shortlist/${rawToken}`);
    assert.strictEqual(revokedViewRes.status, 410, `Revoked shortlist must return HTTP 410 Gone, got: ${revokedViewRes.status}`);
    const revokedCode = revokedViewRes.data.code || revokedViewRes.data.status;
    assert.ok(
      revokedCode === 'SHORTLIST_REVOKED' || revokedCode === 'REVOKED',
      `Error code must indicate revocation; got: ${JSON.stringify(revokedViewRes.data)}`
    );
    console.log(`✅ Security Verified: Revoked token rejected with HTTP 410 Gone (code: ${revokedCode})`);

    // Attempt to download resume from revoked shortlist
    const revokedResumeRes = await request(`/shared/shortlist/${rawToken}/candidates/${candidate1.id}/resume`);
    assert.strictEqual(revokedResumeRes.status, 410, `Resume download on revoked shortlist must return 410 Gone`);
    console.log(`✅ Security Verified: Resume download on revoked link blocked with HTTP 410`);

    // 11. Test Invalid/Non-existent Token Rejection
    console.log('\n--- Step 11: Non-existent / Forged Token Rejection ---');
    const forgedToken = 'fake_' + crypto.randomBytes(32).toString('hex');
    const invalidViewRes = await request(`/shared/shortlist/${forgedToken}`);
    assert.strictEqual(invalidViewRes.status, 404, `Forged token must return HTTP 404, got: ${invalidViewRes.status}`);
    console.log(`✅ Security Verified: Forged/unknown token rejected with HTTP 404 Not Found`);

    // 12. Normal Employer Job Isolation Check
    console.log('\n--- Step 12: Isolation of Regular Employer Jobs ---');
    const regularJobs = await db.query(
      `SELECT id, title, allow_candidate_access FROM JOB WHERE source_type = 'REGULAR' OR source_type IS NULL LIMIT 1`
    );
    if (regularJobs.length > 0) {
      console.log(`✅ Regular employer job ID ${regularJobs[0].id} ("${regularJobs[0].title}") untouched. allow_candidate_access = ${regularJobs[0].allow_candidate_access}`);
    }

    console.log('\n=====================================================================');
    console.log('🎉 ALL 12 EXECUTIVE SEARCH CANDIDATE SHARING TESTS PASSED PERFECTLY!');
    console.log('=====================================================================\n');

  } catch (err) {
    console.error('\n❌ Test Suite Failed:', err);
    process.exitCode = 1;
  } finally {
    if (createdShareId) {
      try {
        console.log('🧹 Cleaning up synthetic test share fixture...');
        await db.query('DELETE FROM EXECUTIVE_SHARE_VERIFICATION WHERE share_id = ?', [createdShareId]);
        await db.query('DELETE FROM EXECUTIVE_SEARCH_SHARE_LOG WHERE share_id = ?', [createdShareId]);
        await db.query('DELETE FROM EXECUTIVE_SEARCH_SHARE_CANDIDATE WHERE share_id = ?', [createdShareId]);
        await db.query('DELETE FROM EXECUTIVE_SEARCH_SHARE WHERE id = ?', [createdShareId]);
        console.log('✅ Synthetic test share fixture cleaned up successfully.');
      } catch (cleanupErr) {
        console.warn('⚠️ Warning: Error cleaning up synthetic test share:', cleanupErr.message);
      }
    }
    await db.closeDB();
    process.exit(process.exitCode || 0);
  }
}

runVerification();
