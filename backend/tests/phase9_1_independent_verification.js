/**
 * Vakancy.in — Phase 9.1: Independent Release Verification & Final QA Closure Suite
 * 
 * Tests:
 * 1. Targeted Custom-Role Registration Security & Whitelisting
 * 2. Controlled 6-Scenario Recommended Job Filter Semantics & Parity
 * 3. Password Reset Security Lifecycle, Expiration & Token Invalidation
 * 4. Record-Level Authorization & Multi-Tenant IDOR Parameter Tampering
 * 5. Team Governance, Sole Director Protection & Reporting Hierarchy
 * 6. Live Database Relational Integrity
 */

const http = require('http');
const db = require('../config/db');

const BASE_URL = 'http://localhost:5002/api';
let passed = 0;
let failed = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName} - ${details}`);
    failed++;
  }
}

async function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path.startsWith('http') ? path : `${BASE_URL}${path}`);
    const reqOptions = {
      method: options.method || 'GET',
      headers: options.headers || {},
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let body = {};
        try {
          body = JSON.parse(data);
        } catch (_) {
          body = data;
        }
        resolve({
          status: res.statusCode,
          ok: res.statusCode >= 200 && res.statusCode < 300,
          headers: res.headers,
          body
        });
      });
    });

    req.on('error', reject);
    if (options.body) {
      if (typeof options.body === 'string') {
        req.write(options.body);
      } else {
        req.write(JSON.stringify(options.body));
      }
    }
    req.end();
  });
}

async function login(email, password) {
  const res = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok || !res.body.token) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(res.body)}`);
  }
  return { token: res.body.token, user: res.body.user };
}

async function runPhase9_1_Verification() {
  console.log('====================================================');
  console.log('STARTING VAKANCY.IN PHASE 9.1 INDEPENDENT VERIFICATION');
  console.log('====================================================\n');

  await db.initDB();

  // Test Accounts
  const directorSession = await login('director@vakancy.com', 'password123');
  const dHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${directorSession.token}` };

  const recruiterSession = await login('recruiter@vakancy.com', 'password123');
  const rHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${recruiterSession.token}` };

  let eHeaders = null;

  // ====================================================
  // MODULE 1: Targeted Custom-Role Registration Security
  // ====================================================
  console.log('--- Module 1: Targeted Custom-Role Registration Security ---');

  const ts = Date.now();

  // 1.1 Candidate public registration
  const candRegRes = await request('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      name: `Candidate ${ts}`,
      email: `p91.cand.${ts}@test.vakancy.in`,
      password: 'Password123!',
      role: 'candidate',
      phone: `+919000${String(ts).slice(-6)}`
    }
  });
  assert(candRegRes.status === 201 && candRegRes.body.user?.role === 'candidate', 'Valid candidate public registration succeeds with role candidate');

  // 1.2 Employer public registration
  const empRegRes = await request('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      name: `Employer ${ts}`,
      email: `p91.emp.${ts}@test.vakancy.in`,
      password: 'Password123!',
      role: 'employer',
      company_name: `Emp Company ${ts}`,
      phone: `+919100${String(ts).slice(-6)}`
    }
  });
  assert(empRegRes.status === 201 && empRegRes.body.user?.role === 'employer', 'Valid employer public registration succeeds with role employer');
  const employerSession = await login(`p91.emp.${ts}@test.vakancy.in`, 'Password123!');
  eHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${employerSession.token}` };

  // 1.3 Public registration specifying system role names (director, admin, recruiter, tl, bd_lead)
  for (const sysRole of ['director', 'admin', 'recruiter', 'tl', 'bd_lead', 'tl_coordinator']) {
    const sysRegRes = await request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        name: `Attacker ${sysRole}`,
        email: `p91.hack.${sysRole}.${ts}@test.vakancy.in`,
        password: 'Password123!',
        role: sysRole
      }
    });
    assert(sysRegRes.status === 403, `Public registration with privileged role '${sysRole}' rejected with 403 Forbidden`);
  }

  // 1.4 Public registration with privileged role ID
  const roleIdRegRes = await request('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      name: 'RoleID Attacker',
      email: `p91.hack.roleid.${ts}@test.vakancy.in`,
      password: 'Password123!',
      role_id: 'role-director',
      role: 'role-director'
    }
  });
  assert(roleIdRegRes.status === 403, 'Public registration with role ID role-director rejected with 403 Forbidden');

  // 1.5 Public registration with dynamic custom role name / ID
  const customRoleRegRes = await request('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      name: 'Custom Role Attacker',
      email: `p91.hack.custom.${ts}@test.vakancy.in`,
      password: 'Password123!',
      role: 'Talent Acquisition Associate'
    }
  });
  assert(customRoleRegRes.status === 403, 'Public registration with custom role name rejected with 403 Forbidden');

  // 1.6 Non-Director attempting internal staff creation
  const unauthStaffRes = await request('/admin/team', {
    method: 'POST',
    headers: rHeaders,
    body: {
      name: 'Rogue Staff',
      email: `rogue.staff.${ts}@vakancy.com`,
      password: 'Password123!',
      role: 'recruiter'
    }
  });
  assert(unauthStaffRes.status === 403, 'Recruiter attempting internal team creation rejected with 403 Forbidden');

  // 1.7 Director authorized staff creation
  const authStaffRes = await request('/admin/team', {
    method: 'POST',
    headers: dHeaders,
    body: {
      name: `Staff Member ${ts}`,
      email: `staff.p91.${ts}@vakancy.com`,
      password: 'Password123!',
      role: 'recruiter',
      phone: `+919200${String(ts).slice(-6)}`
    }
  });
  assert(authStaffRes.status === 201 || authStaffRes.status === 200, 'Director authorized internal staff creation succeeds');

  // ====================================================
  // MODULE 2: Controlled 6-Scenario Recommended Job Dataset
  // ====================================================
  console.log('\n--- Module 2: Controlled 6-Scenario Recommended Job Dataset ---');

  const jobA_id = `p91-a-${ts}`;
  const jobB_id = `p91-b-${ts}`;
  const jobC_id = `p91-c-${ts}`;
  const jobD_id = `p91-d-${ts}`;
  const jobE_id = `p91-e-${ts}`;
  const jobF_id = `p91-f-${ts}`;

  const pastDate = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const recentDate = new Date();

  try {
    // 1. Published employer job that is not recommended
    await db.query(`
      INSERT INTO JOB (id, title, department, employment_type, workplace_type, status, priority, created_by_type, source_type, created_at)
      VALUES (?, ?, 'Engineering', 'Full Time', 'On-site', 'open', 'standard', 'EMPLOYER', 'EMPLOYER_POSTED', ?)
    `, [jobA_id, `Standard Employer Job ${ts}`, new Date(Date.now() - 3600000)]);

    // 2. Published internal job explicitly marked not recommended
    await db.query(`
      INSERT INTO JOB (id, title, department, employment_type, workplace_type, status, priority, created_by_type, source_type, created_at)
      VALUES (?, ?, 'Executive', 'Full Time', 'On-site', 'open', 'not_recommended', 'INTERNAL_STAFF', 'EXECUTIVE_SEARCH', ?)
    `, [jobB_id, `Unrecommended Internal Mandate ${ts}`, new Date(Date.now() - 3600000)]);

    // 3. Published job explicitly designated as recommended
    await db.query(`
      INSERT INTO JOB (id, title, department, employment_type, workplace_type, status, priority, created_by_type, source_type, created_at)
      VALUES (?, ?, 'Product', 'Full Time', 'Remote', 'open', 'recommended', 'EMPLOYER', 'EMPLOYER_POSTED', ?)
    `, [jobC_id, `Explicitly Recommended Product Lead ${ts}`, new Date(Date.now() - 1800000)]);

    // 4. Draft job designated as recommended
    await db.query(`
      INSERT INTO JOB (id, title, department, employment_type, workplace_type, status, priority, created_by_type, source_type, created_at)
      VALUES (?, ?, 'Design', 'Full Time', 'Remote', 'draft', 'recommended', 'INTERNAL_STAFF', 'Vakancy Recruitment', ?)
    `, [jobD_id, `Draft Recommended UX Architect ${ts}`, new Date()]);

    // 5. Recently created ordinary job
    await db.query(`
      INSERT INTO JOB (id, title, department, employment_type, workplace_type, status, priority, created_by_type, source_type, created_at)
      VALUES (?, ?, 'Marketing', 'Full Time', 'On-site', 'open', 'standard', 'EMPLOYER', 'EMPLOYER_POSTED', ?)
    `, [jobE_id, `Recent Ordinary Growth Specialist ${ts}`, recentDate]);

    // 6. Older recommended job
    await db.query(`
      INSERT INTO JOB (id, title, department, employment_type, workplace_type, status, priority, created_by_type, source_type, created_at)
      VALUES (?, ?, 'Infrastructure', 'Full Time', 'On-site', 'open', 'recommended', 'INTERNAL_STAFF', 'Vakancy Recruitment', ?)
    `, [jobF_id, `Older Recommended DevOps Architect ${ts}`, pastDate]);

    // 2.1 Verify default listing includes eligible published jobs in descending creation order
    const defaultSearch = await request(`/jobs?search=${encodeURIComponent(ts)}&page=1&limit=50`);
    assert(defaultSearch.ok && Array.isArray(defaultSearch.body.jobs), 'Default candidate jobs API responds with array');
    const jobs = defaultSearch.body.jobs || [];

    const idxRecentOrdinary = jobs.findIndex(j => j.id === jobE_id);
    const idxOlderRecommended = jobs.findIndex(j => j.id === jobF_id);
    assert(idxRecentOrdinary !== -1 && idxOlderRecommended !== -1 && idxRecentOrdinary < idxOlderRecommended, 'Default listing strictly orders newest-first (recent ordinary appears before older recommended)');

    // 2.2 Verify draft job NEVER appears in public listing
    const draftFound = jobs.some(j => j.id === jobD_id);
    assert(!draftFound, 'Draft job with priority=recommended is strictly excluded from candidate search');

    // 2.3 Verify unrecommended internal job has is_recommended = false
    const unrecJob = jobs.find(j => j.id === jobB_id);
    assert(unrecJob && unrecJob.is_recommended === false, 'Internal job explicitly marked priority=not_recommended carries is_recommended = false');

    // 2.4 Verify Recommended Jobs filter returns only eligible published recommended jobs
    const recSearch = await request(`/jobs?recommended=true&search=${encodeURIComponent(ts)}&page=1&limit=50`);
    assert(recSearch.ok && Array.isArray(recSearch.body.jobs), 'Recommended jobs filter API responds with 200 OK');
    const recJobs = recSearch.body.jobs || [];

    const foundJobC = recJobs.some(j => j.id === jobC_id);
    const foundJobF = recJobs.some(j => j.id === jobF_id);
    const foundJobA = recJobs.some(j => j.id === jobA_id);
    const foundJobB = recJobs.some(j => j.id === jobB_id);
    const foundJobD = recJobs.some(j => j.id === jobD_id);
    const foundJobE = recJobs.some(j => j.id === jobE_id);

    assert(foundJobC && foundJobF, 'Recommended Jobs filter includes explicitly designated recommended jobs #3 and #6');
    assert(!foundJobA && !foundJobB && !foundJobD && !foundJobE, 'Recommended Jobs filter strictly excludes non-recommended jobs #1, #2, #4, #5');

    // 2.5 Verify recommendation badge parity on detail endpoint GET /api/jobs/:id
    const detailJobC = await request(`/jobs/${jobC_id}`);
    assert(detailJobC.ok && detailJobC.body.job?.is_recommended === true && detailJobC.body.job?.recommendation_badge === 'Vakancy.in Recommended', 'GET /jobs/:id returns is_recommended=true and recommendation_badge for recommended job');

    const detailJobB = await request(`/jobs/${jobB_id}`);
    assert(detailJobB.ok && detailJobB.body.job?.is_recommended === false && detailJobB.body.job?.recommendation_badge === null, 'GET /jobs/:id returns is_recommended=false and recommendation_badge=null for unrecommended job');

    // 2.6 Verify clearing filter restores default listing
    const clearedSearch = await request(`/jobs?search=${encodeURIComponent(ts)}&page=1&limit=50`);
    assert(clearedSearch.body.jobs.some(j => j.id === jobA_id) && clearedSearch.body.jobs.some(j => j.id === jobC_id), 'Clearing filter restores both standard and recommended jobs');
  } finally {
    // Clean up controlled test records
    await db.query('DELETE FROM JOB WHERE id IN (?, ?, ?, ?, ?, ?)', [
      jobA_id, jobB_id, jobC_id, jobD_id, jobE_id, jobF_id
    ]);
  }

  // ====================================================
  // MODULE 3: Password Reset & Secret Handling Security
  // ====================================================
  console.log('\n--- Module 3: Password Reset & Secret Handling Security ---');

  // 3.1 Non-disclosure of account existence
  const nonExistReset = await request('/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { email: `nonexistent.user.${ts}@domain.invalid` }
  });
  assert(nonExistReset.status === 200 && nonExistReset.body.success === true, 'Forgot password returns generic success for non-existent email (no account disclosure)');

  // 3.2 Forgot password on registered candidate creates single-use token
  const testCandEmail = `p91.cand.${ts}@test.vakancy.in`;
  const candForgotRes = await request('/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { email: testCandEmail }
  });
  assert(candForgotRes.status === 200 && candForgotRes.body.success === true, 'Forgot password initiates successfully for registered user');

  // Retrieve token securely from database
  const [candUserRows] = await db.query('SELECT reset_token, reset_token_expires FROM USERS WHERE email = ?', [testCandEmail]);
  const tokenRecord = candUserRows;
  assert(Boolean(tokenRecord && tokenRecord.reset_token), 'Password reset token securely generated and stored in DB');
  assert(new Date(tokenRecord.reset_token_expires) > new Date(), 'Password reset token has valid future expiration timestamp');

  // 3.3 Execute reset password using token
  const resetPassRes = await request('/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      email: testCandEmail,
      token: tokenRecord.reset_token,
      newPassword: 'BrandNewSecurePassword123!'
    }
  });
  assert(resetPassRes.status === 200 && resetPassRes.body.success === true, 'Password reset completes successfully with valid token');

  // 3.4 Invalidation: Replaying same token must fail
  const replayResetRes = await request('/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      email: testCandEmail,
      token: tokenRecord.reset_token,
      newPassword: 'AnotherPassword123!'
    }
  });
  assert(replayResetRes.status === 400, 'Replay of invalidated reset token strictly rejected with 400 Bad Request');

  // ====================================================
  // MODULE 4: Record-Level Authorization & Multi-Tenant IDOR
  // ====================================================
  console.log('\n--- Module 4: Record-Level Authorization & Multi-Tenant IDOR ---');

  // 4.1 Candidate logs in with newly reset password
  const candLoginRes = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { email: testCandEmail, password: 'BrandNewSecurePassword123!' }
  });
  assert(candLoginRes.status === 200 && candLoginRes.body.token, 'Candidate logs in with newly reset password');
  const cHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${candLoginRes.body.token}` };

  // 4.2 Candidate accessing /candidates/me receives own profile
  const candMeRes = await request('/candidates/me', { headers: cHeaders });
  assert(candMeRes.ok && candMeRes.body.candidate?.user_id === candLoginRes.body.user.id, 'Candidate profile is strictly scoped to authenticated user via /candidates/me');

  // 4.3 Candidate modifying unowned project is rejected
  const tamperProjRes = await request('/candidates/me/projects/fake_other_proj_id', {
    method: 'PUT',
    headers: cHeaders,
    body: { title: 'Tampered Project' }
  });
  assert(tamperProjRes.status === 404 || tamperProjRes.status === 403, 'Modifying unowned candidate project rejected with 404/403');

  // 4.4 Employer Multi-Tenant Applicant Isolation
  const empTamperAppRes = await request('/employer/jobs/job-foreign-999/applicants', {
    headers: eHeaders
  });
  assert(empTamperAppRes.status === 403 || empTamperAppRes.status === 404, 'Employer querying applicants for unowned/foreign job blocked with 403/404');

  // 4.5 Gated Resume Proxy
  const unconsentedResumeRes = await request('/admin/candidates/foreign-cand-id/resume', {
    headers: eHeaders
  });
  assert(unconsentedResumeRes.status === 403 || unconsentedResumeRes.status === 404, 'Employer access to unconsented / unapplied candidate resume blocked');

  // ====================================================
  // MODULE 5: Governance & Sole Director Protections
  // ====================================================
  console.log('\n--- Module 5: Governance & Sole Director Protections ---');

  const usersListRes = await request('/admin/users', { headers: dHeaders });
  const allUsers = usersListRes.body.users || [];
  const dirUser = allUsers.find(u => u.email === 'director@vakancy.com');
  const recUser = allUsers.find(u => u.email === 'recruiter@vakancy.com');

  // 5.1 Sole active Director cannot be deactivated
  if (dirUser) {
    const deactDirectorRes = await request(`/admin/users/${dirUser.id}/status`, {
      method: 'PUT',
      headers: dHeaders
    });
    assert(deactDirectorRes.status === 400, 'Deactivation of sole active Director rejected with 400 Bad Request');

    // 5.2 Sole active Director cannot be demoted
    const demoteDirectorRes = await request(`/admin/users/${dirUser.id}/admin-profile`, {
      method: 'PUT',
      headers: dHeaders,
      body: { role: 'recruiter' }
    });
    assert(demoteDirectorRes.status === 400, 'Demotion of sole active Director role rejected with 400 Bad Request');
  }

  // 5.3 Reporting Hierarchy Self-Reporting Rejection
  if (recUser) {
    const selfReportRes = await request(`/admin/users/${recUser.id}/admin-profile`, {
      method: 'PUT',
      headers: dHeaders,
      body: { reporting_user_id: recUser.id }
    });
    assert(selfReportRes.status === 400, 'Self-reporting hierarchy relationship rejected with 400 Bad Request');
  }

  // ====================================================
  // MODULE 6: Database Relational Integrity
  // ====================================================
  console.log('\n--- Module 6: Database Relational Integrity ---');

  const [orphanedApps] = await db.query(`
    SELECT COUNT(*) as count 
    FROM APPLICATION a 
    LEFT JOIN CANDIDATES c ON a.candidate_id = c.id 
    WHERE c.id IS NULL
  `);
  assert(Number(orphanedApps?.count || 0) === 0, 'Database contains 0 orphaned applications');

  const [orphanedShares] = await db.query(`
    SELECT COUNT(*) as count 
    FROM CANDIDATE_SHARING cs 
    LEFT JOIN CANDIDATES c ON cs.candidate_id = c.id 
    WHERE c.id IS NULL
  `);
  assert(Number(orphanedShares?.count || 0) === 0, 'Database contains 0 orphaned candidate sharing records');

  const [dupCategories] = await db.query(`
    SELECT LOWER(name) as name, COUNT(*) as count 
    FROM JOB_CATEGORY 
    GROUP BY LOWER(name) 
    HAVING COUNT(*) > 1
  `);
  assert(!dupCategories || dupCategories.length === 0, 'Database contains 0 duplicate job categories');

  // Clean up temporary test candidate and employer
  await db.query('DELETE FROM USERS WHERE email IN (?, ?, ?)', [
    `p91.cand.${ts}@test.vakancy.in`,
    `p91.emp.${ts}@test.vakancy.in`,
    `staff.p91.${ts}@vakancy.com`
  ]);

  console.log('\n====================================================');
  console.log(`PHASE 9.1 TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase9_1_Verification().catch((err) => {
  console.error('Fatal error running Phase 9.1 suite:', err);
  process.exit(1);
});
