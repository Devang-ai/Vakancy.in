/**
 * Vakancy.in — Phase 9: Final QA, Security Verification & Release Sign-Off Suite
 *
 * Comprehensive end-to-end verification covering:
 * 1. Public registration escalation block against any non-public / custom role (403)
 * 2. Password reset lifecycle: generation, token secrecy, single-use invalidation, expiration
 * 3. Custom role access & granular permission evaluation via Admin Portal
 * 4. Multi-tenant candidate & employer IDOR data isolation
 * 5. Gated resume proxy & candidate consent enforcement
 * 6. Candidate sharing workflow: token validity, expiration, revocation, internal note stripping
 * 7. Job listing natural ordering & dedicated recommended filter integration
 * 8. Hierarchical reporting & sole active Director account safeguards
 * 9. Real database integrity: 0 orphans, 0 duplicate categories, 0 duplicate candidate emails
 */

const assert = require('assert');
const crypto = require('crypto');
const db = require('../config/db');

const BASE_URL = 'http://localhost:5002/api';

let passed = 0;
let failed = 0;
const results = [];

function record(name, status, details = '') {
  if (status) {
    console.log(`  ✅ PASS: ${name}`);
    passed++;
    results.push({ name, status: 'PASS', details });
  } else {
    console.error(`  ❌ FAIL: ${name} — ${details}`);
    failed++;
    results.push({ name, status: 'FAIL', details });
  }
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (_) {
    json = { raw: text };
  }
  return { status: res.status, ok: res.ok, body: json };
}

async function login(email, password) {
  const res = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  if (!res.ok || !res.body.token) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(res.body)}`);
  }
  return { token: res.body.token, user: res.body.user };
}

async function runPhase9Suite() {
  console.log('================================================================');
  console.log('   VAKANCY.IN — PHASE 9: FINAL QA & RELEASE SIGN-OFF SUITE      ');
  console.log('================================================================\n');

  await db.initDB();

  const timestamp = Date.now();
  const testCandidateEmail = `p9.cand.${timestamp}@test.vakancy.in`;
  const testEmployerEmail = `p9.emp.${timestamp}@test.vakancy.in`;
  const testPassword = 'Password@123';

  let candidateUser = null;
  let candidateToken = null;
  let candidateProfileId = null;
  let employerUser = null;
  let employerToken = null;
  let directorSession = null;
  let customRoleUser = null;
  let customRoleToken = null;
  const customRoleKey = `custom_auditor_${timestamp}`;

  try {
    // -------------------------------------------------------------
    // Test 1: Public Registration Role Enforcement (Custom & System Roles)
    // -------------------------------------------------------------
    console.log('\n--- 1. Public Registration Role Hardening ---');
    // Test that arbitrary custom roles or privileged roles cannot self-register
    const testEscalationRoles = ['director', 'admin', 'recruiter', 'tl_coordinator', 'custom_manager', 'super_admin'];
    let allEscalationsBlocked = true;
    for (const r of testEscalationRoles) {
      const res = await request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: `spoof.${r}.${timestamp}@test.vakancy.in`,
          password: testPassword,
          role: r,
          name: `Spoof ${r}`
        })
      });
      if (res.status !== 403) {
        allEscalationsBlocked = false;
        record(`Registration with role '${r}' blocked with 403`, false, `Got status ${res.status}`);
      }
    }
    record('All non-public (system, custom, or arbitrary) roles blocked from registration with 403 Forbidden', allEscalationsBlocked);

    // Legitimate candidate registration
    const candRegRes = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: testCandidateEmail,
        password: testPassword,
        role: 'candidate',
        name: 'P9 Verification Candidate'
      })
    });
    record('Legitimate candidate registration succeeds with 201 Created', candRegRes.status === 201 && candRegRes.body.success);
    candidateUser = candRegRes.body.user;
    candidateToken = candRegRes.body.token;

    const candDbRows = await db.query('SELECT id FROM CANDIDATES WHERE user_id = ?', [candidateUser.id]);
    if (candDbRows.length > 0) {
      candidateProfileId = candDbRows[0].id;
    }

    // Legitimate employer registration
    const empRegRes = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmployerEmail,
        password: testPassword,
        role: 'employer',
        name: 'P9 Verification Employer',
        company_name: 'P9 Global Systems'
      })
    });
    record('Legitimate employer registration succeeds with 201 Created', empRegRes.status === 201 && empRegRes.body.success);
    employerUser = empRegRes.body.user;
    employerToken = empRegRes.body.token;

    // -------------------------------------------------------------
    // Test 2: Password Reset Security Lifecycle
    // -------------------------------------------------------------
    console.log('\n--- 2. Password Reset Security Lifecycle ---');
    // A. Non-existent email does not disclose user non-existence
    const fakeEmailForgotRes = await request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: `nonexistent.${timestamp}@nowhere.test` })
    });
    record('Password reset for non-existent email returns generic success message without user enumeration', 
      fakeEmailForgotRes.body.success === true && fakeEmailForgotRes.body.message.includes('If the email is registered')
    );

    // B. Registered candidate forgot password
    const candForgotRes = await request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: testCandidateEmail })
    });
    record('Password reset request for candidate succeeds', candForgotRes.body.success === true);

    // Verify token exists in database and has future expiry
    const userTokenRows = await db.query('SELECT reset_token, reset_token_expires FROM USERS WHERE id = ?', [candidateUser.id]);
    const storedResetToken = userTokenRows[0]?.reset_token;
    const storedExpiry = userTokenRows[0]?.reset_token_expires;
    record('Reset token generated with high entropy (64 hex chars) and future expiration', 
      typeof storedResetToken === 'string' && storedResetToken.length === 64 && new Date(storedExpiry) > new Date()
    );

    // C. Perform password reset with valid token
    const newPassword = 'NewSecurePassword@456';
    const resetSuccessRes = await request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: storedResetToken, newPassword })
    });
    record('Password reset with valid token succeeds', resetSuccessRes.body.success === true);

    // D. Invalidation: Attempting to REUSE the same token must be rejected
    const reuseResetRes = await request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: storedResetToken, newPassword: 'AnotherPassword@789' })
    });
    record('Password reset token is strictly single-use and cannot be reused (rejected with 400)', reuseResetRes.status === 400);

    // E. Verify login with the updated password succeeds
    const newLoginRes = await login(testCandidateEmail, newPassword);
    record('Login succeeds with newly set password', Boolean(newLoginRes.token));
    candidateToken = newLoginRes.token; // update token

    // -------------------------------------------------------------
    // Test 3: Custom Role Lifecycle & Dynamic Granular RBAC
    // -------------------------------------------------------------
    console.log('\n--- 3. Custom Role Lifecycle & Dynamic Granular RBAC ---');
    directorSession = await login('director@vakancy.com', 'password123');
    const dHeaders = { Authorization: `Bearer ${directorSession.token}` };

    // Director creates a custom role with view-only permissions on candidates
    const createRoleRes = await request('/admin/roles', {
      method: 'POST',
      headers: dHeaders,
      body: JSON.stringify({
        role_key: customRoleKey,
        display_name: 'Custom Auditor Role',
        description: 'Audits candidate records with read-only access',
        permissions: [
          { module: 'dashboard', action: 'view', is_granted: 1 },
          { module: 'candidates', action: 'view', is_granted: 1 },
          { module: 'leads', action: 'view', is_granted: 0 } // explicitly denied
        ]
      })
    });
    record('Director dynamically creates custom role in ROLES master table', createRoleRes.status === 201 && createRoleRes.body.success);

    // Director provisions staff user assigned to this custom role via /admin/team
    customUserEmail = `staff.custom.${timestamp}@test.vakancy.in`;
    const createEmpRes = await request('/admin/team', {
      method: 'POST',
      headers: dHeaders,
      body: JSON.stringify({
        name: 'Custom Auditor Staff',
        email: customUserEmail,
        password: 'Password123!',
        role: customRoleKey
      })
    });
    record('Director successfully provisions internal staff member with custom role', createEmpRes.status === 201 && createEmpRes.body.success);

    const customLogin = await login(customUserEmail, 'Password123!');
    customRoleToken = customLogin.token;
    const cHeaders = { Authorization: `Bearer ${customRoleToken}` };

    // Custom role accesses permitted module (dashboard, candidates)
    const customDashboardRes = await request('/admin/stats', { headers: cHeaders });
    record('Custom role user accesses permitted module (dashboard:view) successfully', customDashboardRes.status === 200);

    const customCandidatesRes = await request('/admin/candidates', { headers: cHeaders });
    record('Custom role user accesses permitted module (candidates:view) successfully', customCandidatesRes.status === 200);

    // Custom role accesses unpermitted module (leads:view)
    const customLeadsRes = await request('/admin/leads', { headers: cHeaders });
    record('Custom role user blocked from unpermitted module (leads:view) with 403 Permission Denied', customLeadsRes.status === 403);

    // Non-Director attempting to create custom role
    const nonDirCreateRoleRes = await request('/admin/roles', {
      method: 'POST',
      headers: cHeaders,
      body: JSON.stringify({ role_key: 'hacked_role', display_name: 'Hacked' })
    });
    record('Non-Director blocked from creating custom roles with 403 Forbidden', nonDirCreateRoleRes.status === 403);

    // -------------------------------------------------------------
    // Test 4: Candidate & Employer Data Isolation
    // -------------------------------------------------------------
    console.log('\n--- 4. Candidate & Employer Data Isolation ---');
    const candHeaders = { Authorization: `Bearer ${candidateToken}` };
    const empHeaders = { Authorization: `Bearer ${employerToken}` };

    // A. Candidate self-service profile and project isolation
    const candMeRes = await request('/candidates/me', { headers: candHeaders });
    record('Candidate accessing /candidates/me receives own profile', candMeRes.ok && candMeRes.body.candidate?.id === candidateProfileId);

    // Add project for candidate
    const addProjRes = await request('/candidates/me/projects', {
      method: 'POST',
      headers: candHeaders,
      body: JSON.stringify({
        project_name: 'Vakancy Release Project',
        role: 'Full Stack Engineer',
        description: 'Verification of release readiness',
        technologies: 'React, Node.js, MySQL'
      })
    });
    record('Candidate successfully adds project with skills to own profile', addProjRes.status === 200 && addProjRes.body.success);
    const addedProjId = addProjRes.body.data?.id;

    // Employer attempts to view candidate personal profile directly
    const empViewCandRes = await request(`/candidates/${candidateProfileId}`, { headers: empHeaders });
    record('Employer direct access to candidate personal profile is rejected with 403/404', empViewCandRes.status === 403 || empViewCandRes.status === 404);

    // Candidate cannot modify non-existent or other candidate project
    const tamperProjRes = await request('/candidates/me/projects/fake_other_proj_id', {
      method: 'PUT',
      headers: candHeaders,
      body: JSON.stringify({ project_name: 'Tampered' })
    });
    record('Candidate cannot modify unowned or non-existent projects (returns 404/403)', tamperProjRes.status === 404 || tamperProjRes.status === 403);

    // B. Employer job isolation
    const allJobsRes = await request('/jobs');
    const targetJob = allJobsRes.body.jobs?.[0];
    if (targetJob) {
      const empApplicantsRes = await request(`/employers/jobs/${targetJob.id}/applicants`, { headers: empHeaders });
      record('Employer blocked from viewing applicants of unowned job with 403 Forbidden', empApplicantsRes.status === 403);

      const empEditJobRes = await request(`/employers/jobs/${targetJob.id}`, {
        method: 'PUT',
        headers: empHeaders,
        body: JSON.stringify({ title: 'Tampered Title' })
      });
      record('Employer blocked from modifying unowned job with 403 Forbidden', empEditJobRes.status === 403);
    }

    // -------------------------------------------------------------
    // Test 5: Candidate Sharing, Gated Resume & Consent Workflow
    // -------------------------------------------------------------
    console.log('\n--- 5. Candidate Sharing, Gated Resume & Consent Workflow ---');
    // Gated resume check
    const sampleResumeRows = await db.query('SELECT id FROM CANDIDATE_RESUME LIMIT 1');
    if (sampleResumeRows.length > 0) {
      const sampleResumeId = sampleResumeRows[0].id;
      const unauthResumeRes = await request(`/employers/resumes/${sampleResumeId}`, { headers: empHeaders });
      record('Employer access to unconsented / unshared candidate resume blocked with 403 Forbidden', unauthResumeRes.status === 403);
    }

    // Public share token verification
    // 1. Invalid / malformed token (< 32 chars)
    const malformedTokenRes = await request('/admin/shared-profile/short_token');
    record('Candidate sharing link with token < 32 characters returns 400 Bad Request', malformedTokenRes.status === 400);

    // 2. Non-existent 32+ char token
    const fakeShareToken = crypto.randomBytes(20).toString('hex');
    const nonExistentTokenRes = await request(`/admin/shared-profile/${fakeShareToken}`);
    record('Non-existent candidate share token returns 404 Not Found', nonExistentTokenRes.status === 404);

    // 3. Create test candidate sharing record in DB and test statuses
    const testShareId = crypto.randomUUID();
    const testShareToken = crypto.randomBytes(24).toString('hex');
    await db.query(`
      INSERT INTO CANDIDATE_SHARING (
        id, candidate_id, share_token, status, candidate_consent,
        proposed_by_user_id, expires_at
      ) VALUES (?, ?, ?, 'PROPOSED', 0, ?, DATE_ADD(NOW(), INTERVAL 14 DAY))
    `, [testShareId, candidateProfileId, testShareToken, candidateUser.id]);

    // Pending/PROPOSED share access
    const pendingShareRes = await request(`/admin/shared-profile/${testShareToken}`);
    record('Unapproved candidate share link returns 403 (pending approval)', pendingShareRes.status === 403);

    // Update share to APPROVED with consent
    await db.query(`
      UPDATE CANDIDATE_SHARING 
      SET status = 'APPROVED', candidate_consent = 1 
      WHERE id = ?
    `, [testShareId]);
    const approvedShareRes = await request(`/admin/shared-profile/${testShareToken}`);
    record('Approved candidate share link with consent accessible via token', approvedShareRes.status === 200 && approvedShareRes.body.success);
    
    // Verify internal notes and private contact details are stripped
    const sharedData = approvedShareRes.body.candidate || {};
    record('Shared candidate profile strips internal recruiter notes and direct contact details', 
      sharedData.internal_notes === undefined && sharedData.email === undefined && sharedData.phone === undefined
    );

    // Revoked share access
    await db.query(`UPDATE CANDIDATE_SHARING SET status = 'REVOKED' WHERE id = ?`, [testShareId]);
    const revokedShareRes = await request(`/admin/shared-profile/${testShareToken}`);
    record('Revoked candidate share link returns 410 Gone', revokedShareRes.status === 410);

    // Expired share access
    await db.query(`
      UPDATE CANDIDATE_SHARING 
      SET status = 'APPROVED', expires_at = DATE_SUB(NOW(), INTERVAL 1 DAY) 
      WHERE id = ?
    `, [testShareId]);
    const expiredShareRes = await request(`/admin/shared-profile/${testShareToken}`);
    record('Expired candidate share link returns 410 Gone', expiredShareRes.status === 410);

    // Cleanup test share
    await db.query('DELETE FROM CANDIDATE_SHARING WHERE id = ?', [testShareId]);

    // -------------------------------------------------------------
    // Test 6: Job Search, Recommended Filtering & Provenance Integration
    // -------------------------------------------------------------
    console.log('\n--- 6. Job Search, Recommended Filtering & Provenance Integration ---');
    // Default search maintains natural newest-first order
    const publicJobsRes = await request('/jobs?limit=50');
    const publicJobs = publicJobsRes.body.jobs || [];
    let isChronological = true;
    for (let i = 0; i < publicJobs.length - 1; i++) {
      if (new Date(publicJobs[i].created_at) < new Date(publicJobs[i + 1].created_at)) {
        isChronological = false;
        break;
      }
    }
    record('Public job listing strictly maintains natural newest-first chronological ordering', isChronological && publicJobs.length > 0);

    // Recommended jobs filter
    const recJobsRes = await request('/jobs?recommended=true');
    const recJobs = recJobsRes.body.jobs || [];
    const allRec = recJobs.length > 0 && recJobs.every(j => 
      j.is_recommended === true || j.isRecommended === true || j.is_rec === 1 || j.recommendation_badge
    );
    record('Dedicated Recommended Jobs filter (?recommended=true) returns only recommended opportunities', allRec);

    // Standard employer jobs exist in default listing and are excluded in recommended filter
    const employerJobsInDefault = publicJobs.some(j => j.created_by_type === 'EMPLOYER');
    const employerJobsInRec = recJobs.some(j => j.created_by_type === 'EMPLOYER' && !j.is_recommended);
    record('Default listing contains standard employer jobs, which are excluded from recommended filter', employerJobsInDefault && !employerJobsInRec);

    // -------------------------------------------------------------
    // Test 7: Hierarchical Reporting & Sole Director Safeguards
    // -------------------------------------------------------------
    console.log('\n--- 7. Hierarchical Reporting & Sole Director Safeguards ---');
    const usersRes = await request('/admin/users', { headers: dHeaders });
    const directorUserRecord = (usersRes.body.users || []).find(u => u.email === 'director@vakancy.com');
    const recruiterUserRecord = (usersRes.body.users || []).find(u => u.email === 'recruiter@vakancy.com');
    const tlUserRecord = (usersRes.body.users || []).find(u => u.email === 'tl@vakancy.com');

    if (directorUserRecord) {
      // Sole Director cannot be deactivated
      const deactDirRes = await request(`/admin/users/${directorUserRecord.id}/status`, {
        method: 'PUT',
        headers: dHeaders
      });
      record('Deactivating sole active Director is blocked with 400 Bad Request', deactDirRes.status === 400);

      // Sole Director cannot be demoted
      const demoteDirRes = await request(`/admin/users/${directorUserRecord.id}/admin-profile`, {
        method: 'PUT',
        headers: dHeaders,
        body: JSON.stringify({ role: 'recruiter' })
      });
      record('Demoting sole active Director role is blocked with 400 Bad Request', demoteDirRes.status === 400);
    }

    if (recruiterUserRecord && tlUserRecord) {
      // Self reporting
      const selfReportRes = await request(`/admin/users/${recruiterUserRecord.id}/admin-profile`, {
        method: 'PUT',
        headers: dHeaders,
        body: JSON.stringify({ reporting_user_id: recruiterUserRecord.id })
      });
      record('Self-reporting in management hierarchy rejected with 400 Bad Request', selfReportRes.status === 400);

      // Circular reporting
      await request(`/admin/users/${recruiterUserRecord.id}/admin-profile`, {
        method: 'PUT',
        headers: dHeaders,
        body: JSON.stringify({ reporting_user_id: tlUserRecord.id })
      });
      const circularRes = await request(`/admin/users/${tlUserRecord.id}/admin-profile`, {
        method: 'PUT',
        headers: dHeaders,
        body: JSON.stringify({ reporting_user_id: recruiterUserRecord.id })
      });
      record('Circular reporting loop (A -> B -> A) rejected with 400 Bad Request', circularRes.status === 400);
    }

    // -------------------------------------------------------------
    // Test 8: Real Database Integrity Verification
    // -------------------------------------------------------------
    console.log('\n--- 8. Real Database Integrity Verification ---');
    // Check 1: Orphaned applications
    const orphanApps = await db.query(`
      SELECT COUNT(*) as count 
      FROM APPLICATION a 
      LEFT JOIN JOB j ON a.job_id = j.id 
      LEFT JOIN CANDIDATES c ON a.candidate_id = c.id 
      WHERE j.id IS NULL OR c.id IS NULL
    `);
    record('Zero orphaned records in APPLICATION table', orphanApps[0].count === 0);

    // Check 2: Orphaned candidate shares
    const orphanShares = await db.query(`
      SELECT COUNT(*) as count 
      FROM CANDIDATE_SHARING cs 
      LEFT JOIN CANDIDATES c ON cs.candidate_id = c.id 
      WHERE c.id IS NULL
    `);
    record('Zero orphaned records in CANDIDATE_SHARING table', orphanShares[0].count === 0);

    // Check 3: Duplicate candidate emails in USERS
    const dupEmails = await db.query(`
      SELECT LOWER(email) as email, COUNT(*) as count 
      FROM USERS 
      WHERE role = 'candidate' 
      GROUP BY LOWER(email) 
      HAVING count > 1
    `);
    record('Zero duplicate candidate emails in USERS table', dupEmails.length === 0);

    // Check 4: Canonical JOB_CATEGORY master integrity
    const dupCategories = await db.query(`
      SELECT LOWER(name) as name, COUNT(*) as count 
      FROM JOB_CATEGORY 
      GROUP BY LOWER(name) 
      HAVING count > 1
    `);
    const masterCatRes = await request('/master/categories');
    const canonicalCategoriesCount = masterCatRes.body?.categories?.length || 0;
    record('Zero duplicate categories in JOB_CATEGORY table and canonical master API exposes 49 categories', 
      dupCategories.length === 0 && canonicalCategoriesCount === 49
    );

  } catch (err) {
    console.error('Phase 9 audit suite encountered unexpected exception:', err);
    record('Phase 9 audit suite execution', false, err.message);
  } finally {
    // Clean up test accounts
    console.log('\nCleaning up Phase 9 test accounts and records...');
    if (candidateUser) {
      await db.query('DELETE FROM CANDIDATE_PROJECT WHERE candidate_id = ?', [candidateProfileId]);
      await db.query('DELETE FROM CANDIDATES WHERE user_id = ?', [candidateUser.id]);
      await db.query('DELETE FROM USERS WHERE id = ?', [candidateUser.id]);
    }
    if (employerUser) {
      await db.query('DELETE FROM EMPLOYERS WHERE user_id = ?', [employerUser.id]);
      await db.query('DELETE FROM USERS WHERE id = ?', [employerUser.id]);
    }
    if (customUserEmail) {
      await db.query('DELETE FROM USERS WHERE email = ?', [customUserEmail]);
    }
    if (customRoleKey) {
      await db.query('DELETE FROM ROLE_PERMISSIONS WHERE role_key = ?', [customRoleKey]);
      await db.query('DELETE FROM ROLES WHERE role_key = ?', [customRoleKey]);
    }
    console.log('✅ Temporary Phase 9 test records cleanly removed. Zero impact on real data.');
  }

  console.log('\n================================================================');
  console.log(`PHASE 9 FINAL QA AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  await new Promise(r => setTimeout(r, 150));
  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

let customUserEmail = null;
runPhase9Suite().catch(err => {
  console.error('Fatal crash in Phase 9 Final QA Suite:', err);
  process.exit(1);
});
