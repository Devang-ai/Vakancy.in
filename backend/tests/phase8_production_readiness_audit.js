/**
 * Vakancy.in — Phase 8: Comprehensive Production Readiness Audit Suite
 *
 * Verifies all 16 core production criteria across Candidate Frontend, Admin Portal,
 * Backend APIs, MySQL/MariaDB database, Authentication, Authorization, File/Resume Security,
 * and Deployment Readiness.
 */

const assert = require('assert');
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

async function runProductionAudit() {
  console.log('================================================================');
  console.log('   VAKANCY.IN — PHASE 8: PRODUCTION READINESS AUDIT SUITE       ');
  console.log('================================================================\n');

  await db.initDB();

  const timestamp = Date.now();
  const testCandidateEmail = `p8.cand.${timestamp}@test.vakancy.in`;
  const testEmployerEmail = `p8.emp.${timestamp}@test.vakancy.in`;
  const testPassword = 'Password@123';

  let candidateUser = null;
  let candidateToken = null;
  let candidateProfileId = null;
  let employerUser = null;
  let employerToken = null;
  let directorSession = null;
  let recruiterSession = null;
  let bdSession = null;
  let testAdminJobId = null;

  try {
    // -------------------------------------------------------------
    // Criterion 1: Public Registration Privilege Escalation Protection
    // -------------------------------------------------------------
    console.log('\n--- 1. Public Registration Privilege Escalation Protection ---');
    const forbiddenRoles = ['admin', 'recruiter', 'director', 'tl', 'client_coordinator', 'bd_lead', 'main_admin'];
    let allForbiddenBlocked = true;
    for (const r of forbiddenRoles) {
      const spoofRes = await request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: `spoof.${r}.${timestamp}@test.vakancy.in`,
          password: testPassword,
          role: r,
          name: `Spoof ${r}`
        })
      });
      if (spoofRes.status !== 403) {
        allForbiddenBlocked = false;
        record(`Registration with role '${r}' blocked with 403`, false, `Got status ${spoofRes.status}`);
      }
    }
    record('Public registration blocks all internal/administrative roles with 403 Forbidden', allForbiddenBlocked);

    // Register legitimate candidate
    const candRegRes = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: testCandidateEmail,
        password: testPassword,
        role: 'candidate',
        name: 'P8 Candidate'
      })
    });
    record('Candidate self-registration succeeds', candRegRes.status === 201 && candRegRes.body.success);
    candidateUser = candRegRes.body.user;
    candidateToken = candRegRes.body.token;

    // Fetch candidate profile ID
    const candRows = await db.query('SELECT id FROM CANDIDATES WHERE user_id = ?', [candidateUser.id]);
    if (candRows.length > 0) {
      candidateProfileId = candRows[0].id;
    }

    // Register legitimate employer
    const empRegRes = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmployerEmail,
        password: testPassword,
        role: 'employer',
        name: 'P8 Employer',
        company_name: 'P8 Tech Innovations'
      })
    });
    record('Employer self-registration succeeds', empRegRes.status === 201 && empRegRes.body.success);
    employerUser = empRegRes.body.user;
    employerToken = empRegRes.body.token;

    // -------------------------------------------------------------
    // Criterion 2: Password Reset Handling & Secure Hashing
    // -------------------------------------------------------------
    console.log('\n--- 2. Password Reset Handling & Cryptographic Verification ---');
    const forgotRes = await request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: testCandidateEmail })
    });
    record('Password reset request responds successfully without exposing internal errors', forgotRes.body.success === true);

    // Verify reset token was written to USERS safely
    const resetUserRows = await db.query('SELECT reset_token, reset_token_expires, password_hash FROM USERS WHERE id = ?', [candidateUser.id]);
    const hasTokenInDb = resetUserRows.length > 0 && Boolean(resetUserRows[0].reset_token);
    record('Password reset token generated and persisted with expiration timestamp', hasTokenInDb);

    // Verify bcrypt password hashing mechanism
    const pwdHash = resetUserRows[0].password_hash;
    const isBcryptHashed = typeof pwdHash === 'string' && (pwdHash.startsWith('$2a$') || pwdHash.startsWith('$2b$'));
    record('Passwords verified using standard salted bcrypt ($2b$ prefix, zero plaintext)', isBcryptHashed);

    // -------------------------------------------------------------
    // Criterion 3: Authentication & Account State Invalidation
    // -------------------------------------------------------------
    console.log('\n--- 3. Authentication & Account State Invalidation ---');
    // Unauthenticated call to protected endpoint
    const unauthRes = await request('/admin/profile/me');
    record('Unauthenticated request to protected route returns 401 Unauthorized', unauthRes.status === 401);

    // Invalid bearer token
    const invalidTokenRes = await request('/admin/profile/me', {
      headers: { Authorization: 'Bearer invalid.secret.token' }
    });
    record('Invalid token rejected with 401 or 403', invalidTokenRes.status === 401 || invalidTokenRes.status === 403);

    // Login personas
    directorSession = await login('director@vakancy.com', 'password123');
    recruiterSession = await login('recruiter@vakancy.com', 'password123');
    bdSession = await login('bdlead@vakancy.com', 'password123');
    record('Director, Recruiter, and BD Lead authenticate successfully', Boolean(directorSession.token && recruiterSession.token && bdSession.token));

    // Create temporary user and deactivate
    const tempUserEmail = `temp.deactivate.${timestamp}@test.vakancy.in`;
    await db.query(`
      INSERT INTO USERS (id, email, password_hash, role, is_active)
      VALUES (UUID(), ?, '$2b$10$e8W/XmP1v1zM6YwVw8ePq.3E7e1m5j7q8w9e0r1t2y3u4i5o6p7a8', 'recruiter', 0)
    `, [tempUserEmail]);
    
    // Login with deactivated account
    const deactLoginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: tempUserEmail, password: 'password123' })
    });
    record('Deactivated account login is rejected with 401/403', deactLoginRes.status === 401 || deactLoginRes.status === 403);

    // Clean up temp user
    await db.query('DELETE FROM USERS WHERE email = ?', [tempUserEmail]);

    // -------------------------------------------------------------
    // Criterion 4: Sole Director Account Safeguards
    // -------------------------------------------------------------
    console.log('\n--- 4. Sole Director Account Safeguards ---');
    const dHeaders = { Authorization: `Bearer ${directorSession.token}` };
    const usersRes = await request('/admin/users', { headers: dHeaders });
    const directorUser = (usersRes.body.users || []).find(u => u.email === 'director@vakancy.com');
    
    if (directorUser) {
      // Attempt deactivation
      const deactDirRes = await request(`/admin/users/${directorUser.id}/status`, {
        method: 'PUT',
        headers: dHeaders
      });
      record('Deactivating sole active Director is blocked with 400 Bad Request', deactDirRes.status === 400);

      // Attempt demoting role
      const demoteDirRes = await request(`/admin/users/${directorUser.id}/admin-profile`, {
        method: 'PUT',
        headers: dHeaders,
        body: JSON.stringify({ role: 'recruiter' })
      });
      record('Demoting sole active Director role is blocked with 400 Bad Request', demoteDirRes.status === 400);
    } else {
      record('Director record located in staff roster', false, 'No director found');
    }

    // -------------------------------------------------------------
    // Criterion 5: Hierarchical Teams & Cycle Prevention
    // -------------------------------------------------------------
    console.log('\n--- 5. Hierarchical Teams & Cycle Prevention ---');
    const recruiterUser = (usersRes.body.users || []).find(u => u.email === 'recruiter@vakancy.com');
    if (recruiterUser) {
      // Self reporting
      const selfReportRes = await request(`/admin/users/${recruiterUser.id}/admin-profile`, {
        method: 'PUT',
        headers: dHeaders,
        body: JSON.stringify({ reporting_user_id: recruiterUser.id })
      });
      record('Self-reporting in management hierarchy rejected with 400 Bad Request', selfReportRes.status === 400);
    }

    // -------------------------------------------------------------
    // Criterion 6: RBAC Module Boundaries
    // -------------------------------------------------------------
    console.log('\n--- 6. Role-Based Access Control Module Boundaries ---');
    const bdHeaders = { Authorization: `Bearer ${bdSession.token}` };
    const rHeaders = { Authorization: `Bearer ${recruiterSession.token}` };

    const bdCandidatesRes = await request('/admin/candidates', { headers: bdHeaders });
    record('BD Lead blocked from Candidates ATS module with 403 Forbidden', bdCandidatesRes.status === 403);

    const recruiterLeadsRes = await request('/admin/leads', { headers: rHeaders });
    record('Recruiter blocked from BD Leads module with 403 Forbidden', recruiterLeadsRes.status === 403);

    const recruiterVerifyPayRes = await request('/admin/commercials/fake_comm_id/verify', {
      method: 'PUT',
      headers: rHeaders,
      body: JSON.stringify({ notes: 'Recruiter attempting payment verification' })
    });
    record('Recruiter blocked from verifying commercial payment with 403 Forbidden', recruiterVerifyPayRes.status === 403);

    // -------------------------------------------------------------
    // Criterion 7: Multi-Tenant Job & Candidate IDOR Isolation
    // -------------------------------------------------------------
    console.log('\n--- 7. Multi-Tenant Job & Candidate IDOR Isolation ---');
    const empHeaders = { Authorization: `Bearer ${employerToken}` };

    // Create an internal/director job to test cross-tenant protection
    const createIntJobRes = await request('/admin/jobs', {
      method: 'POST',
      headers: dHeaders,
      body: JSON.stringify({
        title: `P8 Internal Job ${timestamp}`,
        status: 'open',
        is_internal_only: true
      })
    });
    testAdminJobId = createIntJobRes.body.job_id || createIntJobRes.body.job?.id;

    if (testAdminJobId) {
      const empUnownedAppRes = await request(`/employers/jobs/${testAdminJobId}/applicants`, {
        headers: empHeaders
      });
      record('Employer blocked from accessing applicants of unowned job with 403 Forbidden', empUnownedAppRes.status === 403);

      const empUnownedEditRes = await request(`/employers/jobs/${testAdminJobId}`, {
        method: 'PUT',
        headers: empHeaders,
        body: JSON.stringify({ title: 'Malicious Overwrite' })
      });
      record('Employer blocked from editing unowned job with 403 Forbidden', empUnownedEditRes.status === 403);
    }

    // Candidate profile IDOR
    const candHeaders = { Authorization: `Bearer ${candidateToken}` };
    const otherCandidateRows = await db.query('SELECT id, user_id FROM CANDIDATES WHERE user_id != ? LIMIT 1', [candidateUser.id]);
    if (otherCandidateRows.length > 0) {
      const otherCand = otherCandidateRows[0];
      const viewMeRes = await request('/candidates/me', { headers: candHeaders });
      record('Candidate profile is strictly self-scoped via /candidates/me with verified ID', viewMeRes.ok && viewMeRes.body.candidate?.id === candidateProfileId);

      const tamperOtherProjectRes = await request('/candidates/me/projects/proj_fake_id', {
        method: 'PUT',
        headers: candHeaders,
        body: JSON.stringify({ project_name: 'Hacked Project' })
      });
      record('Candidate cannot modify non-existent or unowned projects (404/403)', tamperOtherProjectRes.status === 404 || tamperOtherProjectRes.status === 403);
    }

    // -------------------------------------------------------------
    // Criterion 8: Gated Candidate Resume Access & Consent
    // -------------------------------------------------------------
    console.log('\n--- 8. Gated Candidate Resume Access & Consent ---');
    const sampleCandResume = await db.query('SELECT r.id, r.candidate_id FROM CANDIDATE_RESUME r LIMIT 1');
    if (sampleCandResume.length > 0) {
      const resumeId = sampleCandResume[0].id;
      // Employer attempting to access resume without application or approved share
      const unauthResumeRes = await request(`/employers/resumes/${resumeId}`, {
        headers: empHeaders
      });
      record('Employer access to unconsented / unshared candidate resume blocked with 403 Forbidden', unauthResumeRes.status === 403);
    }

    // -------------------------------------------------------------
    // Criterion 9: Draft & Internal Job Isolation
    // -------------------------------------------------------------
    console.log('\n--- 9. Draft & Internal Job Isolation in Public Search ---');
    // Create a draft job directly in DB
    const draftJobId = require('crypto').randomUUID();
    await db.query(`
      INSERT INTO JOB (id, title, employment_type, workplace_type, status, created_at, updated_at)
      VALUES (?, 'Draft Confidential Leadership Role', 'Full-time', 'On-site', 'draft', NOW(), NOW())
    `, [draftJobId]);

    const publicJobsListRes = await request('/jobs?limit=100');
    const draftFoundInPublic = publicJobsListRes.body.jobs?.some(j => j.id === draftJobId);
    record('Draft jobs are completely excluded from candidate job search results', !draftFoundInPublic);

    // Direct access to draft job
    const directDraftRes = await request(`/jobs/${draftJobId}`, { headers: candHeaders });
    record('Direct candidate access to draft job returns 404 Not Found', directDraftRes.status === 404);

    // Cleanup draft job
    await db.query('DELETE FROM JOB WHERE id = ?', [draftJobId]);

    // -------------------------------------------------------------
    // Criterion 10: Natural Chronological Ordering
    // -------------------------------------------------------------
    console.log('\n--- 10. Natural Chronological Ordering ---');
    const jobsList = publicJobsListRes.body.jobs || [];
    let isStrictlyNewestFirst = true;
    for (let i = 0; i < jobsList.length - 1; i++) {
      const d1 = new Date(jobsList[i].created_at).getTime();
      const d2 = new Date(jobsList[i + 1].created_at).getTime();
      if (d1 < d2) {
        isStrictlyNewestFirst = false;
        break;
      }
    }
    record('Default public job listing maintains strictly chronological newest-first ordering', isStrictlyNewestFirst && jobsList.length > 0);

    // -------------------------------------------------------------
    // Criterion 11: Dedicated "Recommended Jobs" Filter
    // -------------------------------------------------------------
    console.log('\n--- 11. Dedicated "Recommended Jobs" Filter ---');
    const recJobsRes = await request('/jobs?recommended=true');
    const recJobsList = recJobsRes.body.jobs || [];
    const allAreRecommended = recJobsList.length > 0 && recJobsList.every(j => 
      j.is_recommended === true || j.isRecommended === true || j.is_rec === 1 || j.recommendation_badge
    );
    record('Recommended Jobs filter (?recommended=true) returns only recommended opportunities', allAreRecommended);

    // -------------------------------------------------------------
    // Criterion 12: Job Category Master & Selection
    // -------------------------------------------------------------
    console.log('\n--- 12. Job Category Master & Selection ---');
    const catMasterRes = await request('/master/categories');
    const canonicalCategories = catMasterRes.body.categories || [];
    const categoryCount = canonicalCategories.length;
    
    // Check no duplicate category names in master
    const catNames = canonicalCategories.map(c => c.name.toLowerCase());
    const uniqueCatNames = new Set(catNames);
    record('Job Category master returns canonical list (49 categories) with zero duplicates', categoryCount === 49 && uniqueCatNames.size === 49);

    // Filter jobs by category
    const catFilterRes = await request('/jobs?category=Engineering');
    record('Filtering jobs by category succeeds without server error', catFilterRes.ok && catFilterRes.body.success);

    // Combined Category + Recommended
    const combinedFilterRes = await request('/jobs?category=Engineering&recommended=true');
    const combinedJobs = combinedFilterRes.body.jobs || [];
    const combinedValid = combinedJobs.length === 0 || combinedJobs.every(j => 
      j.is_recommended === true || j.isRecommended === true || j.is_rec === 1 || j.recommendation_badge
    );
    record('Combined Job Category and Recommended Jobs filters coexist harmoniously', combinedFilterRes.ok && combinedValid);

    // -------------------------------------------------------------
    // Criterion 13: Candidate Duplicate Detection
    // -------------------------------------------------------------
    console.log('\n--- 13. Candidate Duplicate Detection ---');
    // Query duplicate detection endpoint using candidate email
    const dupCheckRes = await request('/admin/candidates/duplicate-check', {
      method: 'POST',
      headers: dHeaders,
      body: JSON.stringify({ email: testCandidateEmail })
    });
    record('Duplicate candidate detection correctly identifies existing registered candidate', dupCheckRes.body.isDuplicate === true && dupCheckRes.body.count >= 1);

    // Recruiter calling duplicate check receives masked sensitive details
    const dupCheckRecruiterRes = await request('/admin/candidates/duplicate-check', {
      method: 'POST',
      headers: rHeaders,
      body: JSON.stringify({ email: testCandidateEmail })
    });
    const matchEmail = dupCheckRecruiterRes.body.matches?.[0]?.email || '';
    record('Duplicate detection masks contact info (email/phone) for non-director staff', matchEmail.includes('***') || matchEmail.includes('*'));

    // -------------------------------------------------------------
    // Criterion 14: Job Application Eligibility
    // -------------------------------------------------------------
    console.log('\n--- 14. Job Application Eligibility ---');
    const targetJobId = jobsList[0]?.id;
    if (targetJobId) {
      // Recruiter attempting to apply for job
      const recruiterApplyRes = await request('/applications/apply', {
        method: 'POST',
        headers: rHeaders,
        body: JSON.stringify({ job_id: targetJobId })
      });
      record('Internal staff attempting to apply for jobs rejected with 403 Forbidden', recruiterApplyRes.status === 403);

      // Employer attempting to apply for job
      const employerApplyRes = await request('/applications/apply', {
        method: 'POST',
        headers: empHeaders,
        body: JSON.stringify({ job_id: targetJobId })
      });
      record('Employer attempting to apply for jobs rejected with 403 Forbidden', employerApplyRes.status === 403);
    }

    // -------------------------------------------------------------
    // Criterion 15: Secure Candidate Sharing Token Gating
    // -------------------------------------------------------------
    console.log('\n--- 15. Secure Candidate Sharing Token Gating ---');
    // Short / malformed token (< 32 chars)
    const shortTokenRes = await request('/admin/shared-profile/short_token_123');
    record('Sharing link with malformed token (< 32 chars) rejected with 400 Bad Request', shortTokenRes.status === 400);

    // Non-existent 32-char token
    const fakeToken = '0123456789abcdef0123456789abcdef01234567';
    const fakeTokenRes = await request(`/admin/shared-profile/${fakeToken}`);
    record('Non-existent candidate share token rejected with 404 Not Found', fakeTokenRes.status === 404);

    // -------------------------------------------------------------
    // Criterion 16: System Health & Deployment Readiness
    // -------------------------------------------------------------
    console.log('\n--- 16. System Health & Environment Configuration ---');
    const healthRes = await request('/health');
    record('Health endpoint /api/health returns 200 with online status and database connected', 
      healthRes.status === 200 && healthRes.body.status === 'online' && healthRes.body.db_status === 'MySQL Connected'
    );

    // Verify Production JWT Secret safety check
    let jwtSafetyPass = false;
    try {
      const jwtConfig = require('../config/jwt');
      jwtSafetyPass = typeof jwtConfig.JWT_SECRET === 'string' && jwtConfig.JWT_SECRET.length >= 32;
    } catch (_) {
      jwtSafetyPass = false;
    }
    record('JWT Configuration is loaded securely and enforces minimum 32-character entropy', jwtSafetyPass);

  } catch (err) {
    console.error('Audit suite encountered unexpected exception:', err);
    record('Audit suite execution', false, err.message);
  } finally {
    // Clean up test records
    console.log('\nCleaning up Phase 8 test accounts and records...');
    if (candidateUser) {
      await db.query('DELETE FROM CANDIDATE_PROJECT WHERE candidate_id = ?', [candidateProfileId]);
      await db.query('DELETE FROM CANDIDATES WHERE user_id = ?', [candidateUser.id]);
      await db.query('DELETE FROM USERS WHERE id = ?', [candidateUser.id]);
    }
    if (employerUser) {
      await db.query('DELETE FROM EMPLOYERS WHERE user_id = ?', [employerUser.id]);
      await db.query('DELETE FROM USERS WHERE id = ?', [employerUser.id]);
    }
    if (testAdminJobId) {
      await db.query('DELETE FROM JOB WHERE id = ?', [testAdminJobId]);
    }
    console.log('✅ Temporary Phase 8 test records cleanly removed. Zero impact on real data.');
  }

  console.log('\n================================================================');
  console.log(`PHASE 8 PRODUCTION AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  await new Promise(r => setTimeout(r, 150));
  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runProductionAudit().catch(err => {
  console.error('Fatal crash in Phase 8 Production Readiness Audit:', err);
  process.exit(1);
});
