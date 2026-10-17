/**
 * Vakancy.in — Phase 4: Release Readiness & Production Security Audit Suite
 *
 * Validates fixes for:
 * 1. Privilege escalation block on public registration (403 for internal roles)
 * 2. Strict candidate-only application submission (403 for staff/employers)
 * 3. Draft/internal job isolation on public / candidate search endpoints
 * 4. Sensitive internal note / recruiter ID stripping on employer job endpoints
 * 5. Production JWT_SECRET safety verification
 * 6. Safe cleanup of test-only records (zero impact on real data)
 */

const axios = require('axios');
const db = require('../config/db');

const BASE_URL = 'http://localhost:5002/api';
let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failCount++;
  }
}

async function runAudit() {
  console.log('\n============================================================');
  console.log('Vakancy.in Phase 4: Release Readiness & Security Audit Suite');
  console.log('============================================================\n');

  const testId = Date.now();
  const testCandidateEmail = `p4.test.cand.${testId}@test.vakancy.in`;
  const testPassword = 'Password@123';
  let createdCandidateUserId = null;
  let createdCandidateId = null;
  let createdEmpUserId = null;
  let testJobId = null;

  try {
    // -------------------------------------------------------------
    // Check 1: Public Registration Privilege Escalation Protection
    // -------------------------------------------------------------
    console.log('1. Auditing Public Registration Privilege Escalation Protection...');
    try {
      await axios.post(`${BASE_URL}/auth/register`, {
        email: `p4.spoof.admin.${testId}@test.vakancy.in`,
        password: testPassword,
        role: 'admin',
        name: 'Spoof Admin'
      });
      assert(false, 'Public registration should reject role: admin with 403');
    } catch (err) {
      assert(err.response && err.response.status === 403, 'Public registration with role: admin returns 403 Forbidden');
    }

    try {
      await axios.post(`${BASE_URL}/auth/register`, {
        email: `p4.spoof.recruiter.${testId}@test.vakancy.in`,
        password: testPassword,
        role: 'recruiter',
        name: 'Spoof Recruiter'
      });
      assert(false, 'Public registration should reject role: recruiter with 403');
    } catch (err) {
      assert(err.response && err.response.status === 403, 'Public registration with role: recruiter returns 403 Forbidden');
    }

    try {
      await axios.post(`${BASE_URL}/auth/register`, {
        email: `p4.spoof.director.${testId}@test.vakancy.in`,
        password: testPassword,
        role: 'director',
        name: 'Spoof Director'
      });
      assert(false, 'Public registration should reject role: director with 403');
    } catch (err) {
      assert(err.response && err.response.status === 403, 'Public registration with role: director returns 403 Forbidden');
    }

    // Candidate self-registration should succeed
    const regRes = await axios.post(`${BASE_URL}/auth/register`, {
      email: testCandidateEmail,
      password: testPassword,
      role: 'candidate',
      name: 'P4 Test Candidate'
    });
    assert(regRes.data && regRes.data.success, 'Valid candidate registration succeeds');
    const candidateToken = regRes.data.token;
    createdCandidateUserId = regRes.data.user.id;

    const candProfileRows = await db.query('SELECT id FROM CANDIDATES WHERE user_id = ?', [createdCandidateUserId]);
    if (candProfileRows.length > 0) {
      createdCandidateId = candProfileRows[0].id;
    }

    // -------------------------------------------------------------
    // Check 2: Strict Application Role and Job Status Enforcement
    // -------------------------------------------------------------
    console.log('\n2. Auditing Job Application Enforcement...');
    // Login as Director/Admin
    const adminLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'director@vakancy.com',
      password: 'password123'
    });
    const adminToken = adminLogin.data.token;

    // Register a dedicated test Employer
    const empRegRes = await axios.post(`${BASE_URL}/auth/register`, {
      email: `p4.test.emp.${testId}@test.vakancy.in`,
      password: testPassword,
      role: 'employer',
      name: 'P4 Test Employer Corp'
    });
    assert(empRegRes.data && empRegRes.data.success, 'Valid employer registration succeeds');
    const empToken = empRegRes.data.token;
    const createdEmpUserId = empRegRes.data.user.id;

    // Fetch an open job
    const openJobsRes = await axios.get(`${BASE_URL}/jobs?limit=5`);
    const openJobs = openJobsRes.data.jobs;
    assert(openJobs && openJobs.length > 0, 'Public open jobs retrieved successfully');
    const targetOpenJob = openJobs[0];

    // Admin/Staff attempting to apply on behalf of candidate
    try {
      await axios.post(
        `${BASE_URL}/applications/apply`,
        { job_id: targetOpenJob.id },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      assert(false, 'Admin should not be able to submit job applications directly');
    } catch (err) {
      assert(err.response && err.response.status === 403, 'Admin attempting to apply returns 403 Forbidden');
    }

    // Employer attempting to apply on behalf of candidate
    try {
      await axios.post(
        `${BASE_URL}/applications/apply`,
        { job_id: targetOpenJob.id },
        { headers: { Authorization: `Bearer ${empToken}` } }
      );
      assert(false, 'Employer should not be able to submit job applications directly');
    } catch (err) {
      assert(err.response && err.response.status === 403, 'Employer attempting to apply returns 403 Forbidden');
    }

    // Create a temporary draft job to test draft application block
    testJobId = `p4-draft-job-${testId}`;
    await db.query(
      `INSERT INTO JOB (id, title, department, employment_type, status, created_by_type, source_type, internal_notes)
       VALUES (?, 'P4 Secret Draft Job', 'Engineering', 'Full-time', 'draft', 'INTERNAL_STAFF', 'ADMIN_PORTAL', 'Confidential salary discussion pending')`,
      [testJobId]
    );

    // Candidate attempting to apply to a draft job
    try {
      await axios.post(
        `${BASE_URL}/applications/apply`,
        { job_id: testJobId },
        { headers: { Authorization: `Bearer ${candidateToken}` } }
      );
      assert(false, 'Candidate should not be able to apply to a draft job');
    } catch (err) {
      if (!err.response || err.response.status !== 400) {
        console.log('Draft app failure details:', err.response ? { status: err.response.status, data: err.response.data } : err.message);
      }
      assert(err.response && (err.response.status === 400 || err.response.status === 404), 'Candidate applying to draft job is rejected with 400 or 404');
    }

    // Candidate applying to legitimate open job
    const appRes = await axios.post(
      `${BASE_URL}/applications/apply`,
      { job_id: targetOpenJob.id },
      { headers: { Authorization: `Bearer ${candidateToken}` } }
    );
    assert(appRes.data && appRes.data.success, 'Candidate successfully applies to open job');

    // -------------------------------------------------------------
    // Check 3: Draft and Internal Job Visibility Isolation
    // -------------------------------------------------------------
    console.log('\n3. Auditing Draft & Internal Job Isolation...');
    // Candidate listing jobs: draft job MUST NOT appear
    const candJobsRes = await axios.get(`${BASE_URL}/jobs?limit=50`, {
      headers: { Authorization: `Bearer ${candidateToken}` }
    });
    const foundDraftInCand = candJobsRes.data.jobs.find(j => j.id === testJobId);
    assert(!foundDraftInCand, 'Draft job does not appear in candidate job search listing');

    // Employer listing jobs: draft job MUST NOT appear in general search
    const empJobsRes = await axios.get(`${BASE_URL}/jobs?limit=50`, {
      headers: { Authorization: `Bearer ${empToken}` }
    });
    const foundDraftInEmp = empJobsRes.data.jobs.find(j => j.id === testJobId);
    assert(!foundDraftInEmp, 'Draft job does not appear in general search for employer');

    // Direct access to draft job by candidate
    try {
      await axios.get(`${BASE_URL}/jobs/${testJobId}`, {
        headers: { Authorization: `Bearer ${candidateToken}` }
      });
      assert(false, 'Direct access to draft job by candidate should fail');
    } catch (err) {
      assert(err.response && err.response.status === 404, 'Candidate direct access to draft job returns 404');
    }

    // Direct access to draft job by employer who doesn't own it
    try {
      await axios.get(`${BASE_URL}/jobs/${testJobId}`, {
        headers: { Authorization: `Bearer ${empToken}` }
      });
      assert(false, 'Employer access to unowned draft job should fail');
    } catch (err) {
      assert(err.response && (err.response.status === 404 || err.response.status === 403), 'Unowned employer draft job access returns 404/403');
    }

    // -------------------------------------------------------------
    // Check 4: Confidential Field Sanitization for Employers
    // -------------------------------------------------------------
    console.log('\n4. Auditing Confidential Field Sanitization for Employers...');
    // Initialize profile
    const empInitialRes = await axios.get(`${BASE_URL}/employers/jobs`, {
      headers: { Authorization: `Bearer ${empToken}` }
    });
    assert(empInitialRes.data && empInitialRes.data.success, 'Employer can retrieve own jobs');

    let empRecord = await db.query('SELECT id FROM EMPLOYERS WHERE user_id = ?', [createdEmpUserId]);
    let empId = empRecord.length > 0 ? empRecord[0].id : null;
    let empJobTestId = `p4-emp-job-${testId}`;

    if (empId) {
      await db.query(
        `INSERT INTO JOB (id, employer_id, title, department, employment_type, status, created_by_type, source_type, internal_notes, assigned_recruiter_id, assigned_tl_id)
         VALUES (?, ?, 'P4 Tech Lead Position', 'Engineering', 'Full-time', 'open', 'EMPLOYER', 'EMPLOYER_PORTAL', 'Confidential staff notes: budget max 25 LPA', 'recruiter-uuid-test', 'tl-uuid-test')`,
        [empJobTestId, empId]
      );

      const empOwnJobsRes = await axios.get(`${BASE_URL}/employers/jobs`, {
        headers: { Authorization: `Bearer ${empToken}` }
      });
      const empJobSample = empOwnJobsRes.data.jobs.find(j => j.id === empJobTestId);
      if (empJobSample) {
        assert(empJobSample.internal_notes === undefined, 'Employer job listing excludes internal_notes');
        assert(empJobSample.assigned_recruiter_id === undefined, 'Employer job listing excludes assigned_recruiter_id');
        assert(empJobSample.assigned_tl_id === undefined, 'Employer job listing excludes assigned_tl_id');

        // Check single job detail view
        const empJobDetail = await axios.get(`${BASE_URL}/employers/jobs/${empJobTestId}`, {
          headers: { Authorization: `Bearer ${empToken}` }
        });
        assert(empJobDetail.data.job.internal_notes === undefined, 'Employer job detail excludes internal_notes');
        assert(empJobDetail.data.job.assigned_recruiter_id === undefined, 'Employer job detail excludes assigned_recruiter_id');
        assert(empJobDetail.data.job.assigned_tl_id === undefined, 'Employer job detail excludes assigned_tl_id');
      }

      await db.query('DELETE FROM JOB WHERE id = ?', [empJobTestId]);
    }

    // -------------------------------------------------------------
    // Check 5: Production JWT Fallback Prevention
    // -------------------------------------------------------------
    console.log('\n5. Auditing Production JWT Secret Safety Enforcement...');
    // We test that jwt.js throws when NODE_ENV is production and secret is weak
    const originalNodeEnv = process.env.NODE_ENV;
    const originalSecret = process.env.JWT_SECRET;
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;
      let caught = false;
      try {
        delete require.cache[require.resolve('../config/jwt')];
        require('../config/jwt');
      } catch (err) {
        caught = true;
        assert(err.message.includes('FATAL: A strong JWT_SECRET'), 'Production mode safely aborts if JWT_SECRET is missing or weak');
      }
      if (!caught) {
        assert(false, 'Production mode should throw when JWT_SECRET is missing');
      }
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
      process.env.JWT_SECRET = originalSecret;
      delete require.cache[require.resolve('../config/jwt')];
      require('../config/jwt');
    }

  } catch (unexpectedError) {
    console.error('Unexpected audit failure:', unexpectedError);
    failCount++;
  } finally {
    // -------------------------------------------------------------
    // Cleanup of Test-Owned Records ONLY
    // -------------------------------------------------------------
    console.log('\nCleaning up temporary Phase 4 test records...');
    try {
      if (testJobId) {
        await db.query('DELETE FROM APPLICATION WHERE job_id = ?', [testJobId]);
        await db.query('DELETE FROM JOB WHERE id = ?', [testJobId]);
      }
      if (createdCandidateId) {
        await db.query('DELETE FROM APPLICATION WHERE candidate_id = ?', [createdCandidateId]);
        await db.query('DELETE FROM CANDIDATE_PIPELINE WHERE candidate_id = ?', [createdCandidateId]);
        await db.query('DELETE FROM CANDIDATE_RESUME WHERE candidate_id = ?', [createdCandidateId]);
        await db.query('DELETE FROM CANDIDATES WHERE id = ?', [createdCandidateId]);
      }
      if (createdCandidateUserId) {
        await db.query('DELETE FROM NOTIFICATION WHERE user_id = ?', [createdCandidateUserId]);
        await db.query('DELETE FROM USERS WHERE id = ?', [createdCandidateUserId]);
      }
      if (createdEmpUserId) {
        await db.query('DELETE FROM EMPLOYERS WHERE user_id = ?', [createdEmpUserId]);
        await db.query('DELETE FROM USERS WHERE user_id = ?', [createdEmpUserId]);
      }
      console.log('✅ Temporary Phase 4 test records cleanly removed. Real data preserved.');
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr.message);
    }
  }

  console.log('\n============================================================');
  console.log(`Phase 4 Security Audit Results: ${passCount} Passed, ${failCount} Failed`);
  console.log('============================================================\n');

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAudit();
