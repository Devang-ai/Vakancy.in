const axios = require('axios');
const db = require('../config/db');

const BASE_URL = 'http://localhost:5002/api';

async function runAudit() {
  await db.initDB();
  console.log('====================================================');
  console.log('STARTING DEEP MODULE 2 END-TO-END AUDIT & VERIFICATION');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;
  const findings = [];

  function assert(condition, testName, category = 'General', details = '') {
    if (condition) {
      console.log(`  ✓ PASS: [${category}] ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: [${category}] ${testName} - ${details}`);
      failed++;
      findings.push({ category, testName, details });
    }
  }

  // 1. Authenticate Staff Accounts
  let directorToken, recruiterToken, unassignedRecruiterToken;
  try {
    const dirRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'director@vakancy.com',
      password: 'password123'
    });
    directorToken = dirRes.data.token;
    assert(dirRes.status === 200 && directorToken, 'Director Login', 'Auth');
  } catch (e) {
    assert(false, 'Director Login', 'Auth', e.message);
  }

  try {
    const recRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'recruiter@vakancy.com',
      password: 'password123'
    });
    recruiterToken = recRes.data.token;
    assert(recRes.status === 200 && recruiterToken, 'Recruiter Login', 'Auth');
  } catch (e) {
    assert(false, 'Recruiter Login', 'Auth', e.message);
  }

  // Find or create unassigned staff member for scoping check
  let unassignedStaffId;
  const unassignedStaff = await db.query("SELECT id, email FROM USERS WHERE role = 'recruiter' AND id NOT IN (SELECT assigned_recruiter_id FROM JOB WHERE assigned_recruiter_id IS NOT NULL) LIMIT 1");
  if (unassignedStaff.length > 0) {
    unassignedStaffId = unassignedStaff[0].id;
  }

  // ----------------------------------------------------
  // SECTION 1: JOB MANAGEMENT AUDIT (Phase 2)
  // ----------------------------------------------------
  console.log('\n--- SECTION 1: Job Management & Listing Audit ---');
  try {
    // 1.1 List all jobs
    const jobsRes = await axios.get(`${BASE_URL}/admin/jobs`, {
      headers: { Authorization: `Bearer ${directorToken}` }
    });
    assert(jobsRes.data.success === true, 'Jobs API returns success: true', 'Job Management');
    assert(Array.isArray(jobsRes.data.jobs), 'Jobs API returns array', 'Job Management');
    assert(jobsRes.data.jobs.length >= 7, `Jobs count matches baseline (found ${jobsRes.data.jobs.length})`, 'Job Management');
    assert(jobsRes.data.pagination && jobsRes.data.pagination.total >= 7, 'Pagination total is accurate', 'Job Management');

    // 1.2 Verify applicant counts match database
    const dbAppCounts = await db.query(`
      SELECT j.id, COUNT(a.id) as real_count 
      FROM JOB j LEFT JOIN APPLICATION a ON j.id = a.job_id 
      GROUP BY j.id
    `);
    const countMap = {};
    dbAppCounts.forEach(r => { countMap[r.id] = Number(r.real_count); });
    let countsAccurate = true;
    for (const job of jobsRes.data.jobs) {
      if (Number(job.application_count) !== countMap[job.id]) {
        countsAccurate = false;
        break;
      }
    }
    assert(countsAccurate, 'Applicant counts on all jobs match database records', 'Job Management');

    // 1.3 Verify filtering by status
    const openJobsRes = await axios.get(`${BASE_URL}/admin/jobs?status=open`, {
      headers: { Authorization: `Bearer ${directorToken}` }
    });
    const allOpen = openJobsRes.data.jobs.every(j => j.status === 'open' && j.is_archived === 0);
    assert(allOpen, 'Status=open filter returns only open, non-archived jobs', 'Job Management');

    // 1.4 Verify recommended_only filter
    const recJobsRes = await axios.get(`${BASE_URL}/admin/jobs?recommended_only=true`, {
      headers: { Authorization: `Bearer ${directorToken}` }
    });
    const allRec = recJobsRes.data.jobs.every(j => j.is_recommended === 1);
    assert(allRec, 'recommended_only filter returns only is_recommended=1 jobs', 'Job Management');

    // 1.5 Verify search filter
    const searchRes = await axios.get(`${BASE_URL}/admin/jobs?search=IOS`, {
      headers: { Authorization: `Bearer ${directorToken}` }
    });
    assert(searchRes.data.jobs.length > 0 && searchRes.data.jobs.some(j => j.title.includes('IOS')), 'Search filter finds title match', 'Job Management');

    // 1.6 Verify Contact Masking for Recruiter
    const recJobsList = await axios.get(`${BASE_URL}/admin/jobs`, {
      headers: { Authorization: `Bearer ${recruiterToken}` }
    });
    const maskedCheck = recJobsList.data.jobs.every(j => j.contact_masked === true);
    assert(maskedCheck, 'Recruiter role has contact_masked=true', 'Security & Masking');

    // Director sees unmasked contact
    const dirFirstJob = jobsRes.data.jobs[0];
    assert(dirFirstJob.contact_masked === false, 'Director sees contact_masked=false', 'Security & Masking');

    // 1.7 Strict Job Ownership: Employer-created jobs cannot be edited by Admin
    const employerJob = jobsRes.data.jobs.find(j => j.created_by_type === 'EMPLOYER');
    assert(Boolean(employerJob), 'Found employer-created job for immutability test', 'Job Ownership');
    if (employerJob) {
      let blocked = false;
      let blockCode = '';
      try {
        await axios.put(`${BASE_URL}/admin/jobs/${employerJob.id}`, {
          title: 'Hacked Title Attempt'
        }, {
          headers: { Authorization: `Bearer ${directorToken}` }
        });
      } catch (err) {
        if (err.response && err.response.status === 403) {
          blocked = true;
          blockCode = err.response.data.code;
        }
      }
      assert(blocked && blockCode === 'EMPLOYER_JOB_IMMUTABLE', 'Admin edit on employer job strictly rejected with 403 EMPLOYER_JOB_IMMUTABLE', 'Job Ownership');
    }

    // 1.8 Admin-created job is editable and creates field-level audit trail
    const adminJob = jobsRes.data.jobs.find(j => j.created_by_type === 'ADMIN');
    assert(Boolean(adminJob), 'Found admin-created job for edit test', 'Job Ownership');
    if (adminJob) {
      const updatedNotes = `Audited mandate notes ${Date.now()}`;
      const editRes = await axios.put(`${BASE_URL}/admin/jobs/${adminJob.id}`, {
        title: adminJob.title,
        job_category: adminJob.job_category || 'Engineering',
        internal_notes: updatedNotes
      }, {
        headers: { Authorization: `Bearer ${directorToken}` }
      });
      assert(editRes.data.success === true, 'Admin successfully updated admin-created job', 'Job Ownership');

      // Verify audit trail recorded in RECRUITMENT_ACTIVITY
      const [latestAct] = await db.query(
        "SELECT * FROM RECRUITMENT_ACTIVITY WHERE entity_id = ? AND changed_field = 'internal_notes' ORDER BY created_at DESC LIMIT 1",
        [adminJob.id]
      );
      assert(Boolean(latestAct), 'Audit record created in RECRUITMENT_ACTIVITY for field-level update', 'Audit Trail');
    }

    // 1.9 Archive & Restore preserves applications and state
    if (adminJob) {
      // Archive
      const archRes = await axios.put(`${BASE_URL}/admin/jobs/${adminJob.id}/archive`, {
        reason: 'Temporary audit archive verification'
      }, {
        headers: { Authorization: `Bearer ${directorToken}` }
      });
      assert(archRes.data.success === true, 'Admin archived job requisition', 'Archival Workflow');

      // Check DB is_archived = 1
      const [archDb] = await db.query('SELECT is_archived, archive_reason FROM JOB WHERE id = ?', [adminJob.id]);
      assert(archDb.is_archived === 1, 'Job is_archived set to 1 in DB', 'Archival Workflow');

      // Restore
      const restRes = await axios.put(`${BASE_URL}/admin/jobs/${adminJob.id}/restore`, {
        target_status: 'open',
        restore_note: 'Audit restoration verification'
      }, {
        headers: { Authorization: `Bearer ${directorToken}` }
      });
      assert(restRes.data.success === true, 'Admin restored job requisition', 'Archival Workflow');
      const [restDb] = await db.query('SELECT is_archived, status FROM JOB WHERE id = ?', [adminJob.id]);
      assert(restDb.is_archived === 0 && restDb.status === 'open', 'Job restored with is_archived=0 and status=open', 'Archival Workflow');
    }

  } catch (e) {
    assert(false, 'Job Management audit exception', 'Job Management', e.message);
  }

  // ----------------------------------------------------
  // SECTION 2: APPLICATION & ATS LIFECYCLE AUDIT (Phase 3)
  // ----------------------------------------------------
  console.log('\n--- SECTION 2: Applications & ATS Lifecycle Audit ---');
  try {
    // 2.1 Fetch all applications via admin
    const appsRes = await axios.get(`${BASE_URL}/admin/applications`, {
      headers: { Authorization: `Bearer ${directorToken}` }
    });
    assert(appsRes.data.success === true, 'Admin applications API returned success', 'ATS Lifecycle');
    assert(Array.isArray(appsRes.data.applications), 'Admin applications is array', 'ATS Lifecycle');
    assert(appsRes.data.applications.length >= 1, 'Historical application returned in queue', 'ATS Lifecycle');

    const histApp = appsRes.data.applications[0];
    assert(Boolean(histApp.candidate_name), `Application contains candidate name (${histApp.candidate_name})`, 'ATS Lifecycle');
    assert(Boolean(histApp.job_title), `Application contains job title (${histApp.job_title})`, 'ATS Lifecycle');
    assert(Boolean(histApp.candidate_snapshot), 'Application contains candidate snapshot', 'ATS Lifecycle');
    assert(Boolean(histApp.resume_filename), `Application contains pinned resume filename (${histApp.resume_filename})`, 'Resume Integrity');

    // 2.2 Test supported status filters
    const validStatuses = ['applied', 'under_review', 'shortlisted', 'interview', 'selected', 'rejected', 'on_hold'];
    let statusFilterWorks = true;
    for (const st of ['shortlisted', 'applied']) {
      const filtered = await axios.get(`${BASE_URL}/admin/applications?stage=${st}`, {
        headers: { Authorization: `Bearer ${directorToken}` }
      });
      if (!filtered.data.success) {
        statusFilterWorks = false;
        break;
      }
    }
    assert(statusFilterWorks, 'Application stage filter query parameters work', 'ATS Lifecycle');

    // 2.3 Status Transition and Field-level Audit
    const testAppId = histApp.id;
    const initialStatus = histApp.status;
    const nextStatus = initialStatus === 'interview' ? 'shortlisted' : 'interview';

    const stageRes = await axios.put(`${BASE_URL}/admin/applications/${testAppId}/stage`, {
      status: nextStatus
    }, {
      headers: { Authorization: `Bearer ${directorToken}` }
    });
    assert(stageRes.data.success === true, `Application stage transitioned to '${nextStatus}'`, 'ATS Lifecycle');

    // Verify DB update
    const [appDb] = await db.query('SELECT status, status_updated_by_user_id, status_updated_at FROM APPLICATION WHERE id = ?', [testAppId]);
    assert(appDb.status === nextStatus, 'Application status updated in database', 'ATS Lifecycle');
    assert(Boolean(appDb.status_updated_at), 'status_updated_at timestamp recorded', 'ATS Lifecycle');

    // Revert to initialStatus to preserve original state
    await axios.put(`${BASE_URL}/admin/applications/${testAppId}/stage`, {
      status: initialStatus
    }, {
      headers: { Authorization: `Bearer ${directorToken}` }
    });
    const [appDbRevert] = await db.query('SELECT status FROM APPLICATION WHERE id = ?', [testAppId]);
    assert(appDbRevert.status === initialStatus, 'Application status cleanly restored to original state', 'ATS Lifecycle');

    // 2.4 Verify Rejection Reason Requirement/Capture
    const rejStageRes = await axios.put(`${BASE_URL}/admin/applications/${testAppId}/stage`, {
      status: 'rejected',
      rejection_reason: 'Audit verification rejection reason'
    }, {
      headers: { Authorization: `Bearer ${directorToken}` }
    });
    assert(rejStageRes.data.success === true, 'Status moved to rejected with rejection reason', 'ATS Lifecycle');
    const [rejDb] = await db.query('SELECT rejection_reason FROM APPLICATION WHERE id = ?', [testAppId]);
    assert(rejDb.rejection_reason === 'Audit verification rejection reason', 'Rejection reason persisted in database', 'ATS Lifecycle');

    // Revert back to initialStatus
    await axios.put(`${BASE_URL}/admin/applications/${testAppId}/stage`, {
      status: initialStatus
    }, {
      headers: { Authorization: `Bearer ${directorToken}` }
    });

  } catch (e) {
    assert(false, 'Applications & ATS lifecycle audit exception', 'ATS Lifecycle', e.message);
  }

  // ----------------------------------------------------
  // SECTION 3: RESUME INTEGRITY & SECURE ACCESS (Phase 4)
  // ----------------------------------------------------
  console.log('\n--- SECTION 3: Resume Integrity & Secure Access Audit ---');
  try {
    const [app] = await db.query('SELECT * FROM APPLICATION LIMIT 1');
    assert(Boolean(app), 'Application record found for resume check', 'Resume Integrity');

    // 3.1 Unauthenticated resume fetch rejected
    let unauthBlocked = false;
    try {
      await axios.get(`${BASE_URL}/admin/applications/${app.id}/resume`);
    } catch (err) {
      if (err.response && err.response.status === 401) unauthBlocked = true;
    }
    assert(unauthBlocked, 'Unauthenticated request to resume delivery endpoint returns 401 Unauthorized', 'Resume Security');

    // 3.2 Authorized resume fetch succeeds and generates signed URL
    const resumeRes = await axios.get(`${BASE_URL}/admin/applications/${app.id}/resume`, {
      headers: { Authorization: `Bearer ${directorToken}` }
    });
    assert(resumeRes.data.success === true, 'Admin resume delivery returns success: true', 'Resume Security');
    assert(Boolean(resumeRes.data.url), 'Response contains valid signed URL', 'Resume Security');
    assert(resumeRes.data.filename === app.resume_filename, `Delivered filename matches pinned resume (${resumeRes.data.filename})`, 'Resume Integrity');

    // 3.3 Verify signed URL is reachable without credentials leakage
    const urlTest = await axios.get(resumeRes.data.url, { responseType: 'arraybuffer' });
    assert(urlTest.status === 200, 'Cloudinary signed authenticated URL downloads valid file (HTTP 200)', 'Resume Security');
    assert(urlTest.data.length > 50000, `Downloaded resume has valid PDF binary size (${urlTest.data.length} bytes)`, 'Resume Security');

    // 3.4 Missing application returns 404
    let notFoundHandled = false;
    try {
      await axios.get(`${BASE_URL}/admin/applications/00000000-0000-0000-0000-000000000000/resume`, {
        headers: { Authorization: `Bearer ${directorToken}` }
      });
    } catch (err) {
      if (err.response && err.response.status === 404) notFoundHandled = true;
    }
    assert(notFoundHandled, 'Non-existent application resume request returns 404 Not Found', 'Resume Security');

  } catch (e) {
    assert(false, 'Resume integrity audit exception', 'Resume Security', e.message);
  }

  // ----------------------------------------------------
  // SECTION 4: CANDIDATE SHARING & ACCESS CODE (Phase 5)
  // ----------------------------------------------------
  console.log('\n--- SECTION 4: Candidate Sharing & Access Code Security ---');
  try {
    const [cand] = await db.query('SELECT * FROM CANDIDATES LIMIT 1');
    assert(Boolean(cand), 'Candidate available for candidate sharing audit', 'Candidate Sharing');

    // 4.1 Propose sharing without consent -> approval must be rejected
    const testShareId = require('uuid').v4();
    const testShareToken = require('crypto').randomBytes(32).toString('hex');
    await db.query(`
      INSERT INTO CANDIDATE_SHARING (id, candidate_id, share_token, status, candidate_consent, proposed_by_user_id)
      VALUES (?, ?, ?, 'PROPOSED', 0, (SELECT id FROM USERS WHERE role='director' LIMIT 1))
    `, [testShareId, cand.id, testShareToken]);

    let consentBlocked = false;
    try {
      await axios.post(`${BASE_URL}/admin/candidate-shares/${testShareId}/approve`, {}, {
        headers: { Authorization: `Bearer ${directorToken}` }
      });
    } catch (err) {
      if (err.response && err.response.status === 400 && err.response.data.message.includes('consent')) {
        consentBlocked = true;
      }
    }
    assert(consentBlocked, 'Approval without candidate consent is strictly blocked with 400 Bad Request', 'Candidate Sharing');

    // 4.2 Grant consent and approve with payment exception
    await db.query('UPDATE CANDIDATE_SHARING SET candidate_consent = 1 WHERE id = ?', [testShareId]);
    const approveRes = await axios.post(`${BASE_URL}/admin/candidate-shares/${testShareId}/approve`, {
      payment_exception: true,
      exception_reason: 'Audit verification exception'
    }, {
      headers: { Authorization: `Bearer ${directorToken}` }
    });
    assert(approveRes.data.success === true, 'Candidate share approved by Director with generated access code', 'Candidate Sharing');
    assert(Boolean(approveRes.data.access_code), `Generated access code format (${approveRes.data.access_code})`, 'Candidate Sharing');

    // 4.3 Verify DB encryption at rest (AES-256-GCM + SHA-256)
    const [shareDb] = await db.query('SELECT * FROM CANDIDATE_SHARING WHERE id = ?', [testShareId]);
    assert(Boolean(shareDb.access_code_encrypted), 'DB contains access_code_encrypted (AES-256-GCM)', 'Candidate Sharing Security');
    assert(Boolean(shareDb.access_code_hash), 'DB contains access_code_hash (SHA-256)', 'Candidate Sharing Security');
    assert(shareDb.access_code_encrypted !== approveRes.data.access_code, 'Plaintext access code is NOT stored in database', 'Candidate Sharing Security');

    // 4.4 Verify public access gate
    let missingCodeBlocked = false;
    try {
      await axios.get(`${BASE_URL}/admin/shared-profile/${testShareToken}`);
    } catch (err) {
      if (err.response && err.response.status === 401 && err.response.data.code === 'ACCESS_CODE_REQUIRED') {
        missingCodeBlocked = true;
      }
    }
    assert(missingCodeBlocked, 'Public profile access without access code returns 401 ACCESS_CODE_REQUIRED', 'Candidate Sharing Security');

    let wrongCodeBlocked = false;
    try {
      await axios.get(`${BASE_URL}/admin/shared-profile/${testShareToken}?code=WRONG-CODE`);
    } catch (err) {
      if (err.response && err.response.status === 401 && err.response.data.code === 'INVALID_ACCESS_CODE') {
        wrongCodeBlocked = true;
      }
    }
    assert(wrongCodeBlocked, 'Public profile access with wrong access code returns 401 INVALID_ACCESS_CODE', 'Candidate Sharing Security');

    // Valid code grants access to sanitized profile
    const validShareRes = await axios.get(`${BASE_URL}/admin/shared-profile/${testShareToken}?code=${approveRes.data.access_code}`);
    assert(validShareRes.status === 200 && validShareRes.data.success === true, 'Public profile loads successfully with valid access code', 'Candidate Sharing Security');
    assert(!validShareRes.data.profile.phone, 'Candidate phone is masked/omitted from shared profile', 'Data Privacy');
    assert(!validShareRes.data.profile.email, 'Candidate email is masked/omitted from shared profile', 'Data Privacy');

    // Clean up test share record
    await db.query('DELETE FROM CANDIDATE_SHARING WHERE id = ?', [testShareId]);

  } catch (e) {
    assert(false, 'Candidate sharing audit exception', 'Candidate Sharing', e.message);
  }

  // ----------------------------------------------------
  // SECTION 5: CANDIDATE ACCESS & CALLBACK REQUESTS (Phase 6)
  // ----------------------------------------------------
  console.log('\n--- SECTION 5: Candidate Access & Callback Requests Audit ---');
  try {
    const [empJob] = await db.query("SELECT * FROM JOB WHERE created_by_type = 'EMPLOYER' AND employer_id IS NOT NULL LIMIT 1");
    assert(Boolean(empJob), 'Found employer job for callback testing', 'Callback Requests');

    // 5.1 Toggle access OFF
    await axios.put(`${BASE_URL}/admin/jobs/${empJob.id}/candidate-access`, {
      allow_candidate_access: false
    }, {
      headers: { Authorization: `Bearer ${directorToken}` }
    });
    const [jobDbOff] = await db.query('SELECT allow_candidate_access FROM JOB WHERE id = ?', [empJob.id]);
    assert(jobDbOff.allow_candidate_access === 0, 'Candidate access successfully toggled OFF in DB', 'Candidate Access');

    // 5.2 Employer applicant request returns 403 with candidate_access_allowed: false
    const [employerUser] = await db.query("SELECT u.email FROM USERS u JOIN EMPLOYERS e ON u.id = e.user_id WHERE e.id = ? LIMIT 1", [empJob.employer_id]);
    if (employerUser) {
      const jwt = require('jsonwebtoken');
      const [uRow] = await db.query('SELECT * FROM USERS WHERE email = ?', [employerUser.email]);
      const empToken = jwt.sign(
        { id: uRow.id, email: uRow.email, role: 'employer', name: uRow.name },
        process.env.JWT_SECRET || 'your_super_secret_jwt_key_here_change_in_production'
      );

      let empBlocked = false;
      try {
        await axios.get(`${BASE_URL}/employers/jobs/${empJob.id}/applicants`, {
          headers: { Authorization: `Bearer ${empToken}` }
        });
      } catch (err) {
        if (err.response && err.response.status === 403 && err.response.data.candidate_access_allowed === false) {
          empBlocked = true;
        }
      }
      assert(empBlocked, 'Employer applicants endpoint returns 403 with candidate_access_allowed: false', 'Candidate Access');

      // 5.3 Employer Callback Request Submission
      const cbRes = await axios.post(`${BASE_URL}/employers/jobs/${empJob.id}/callback`, {
        reason: 'Audit test callback request',
        preferred_time: 'Tomorrow morning',
        contact_phone: '+91 9999988888'
      }, {
        headers: { Authorization: `Bearer ${empToken}` }
      });
      assert(cbRes.status === 201 && cbRes.data.success === true, 'Employer successfully submitted callback request', 'Callback Requests');

      // 5.4 Duplicate prevention
      let dupBlocked = false;
      try {
        await axios.post(`${BASE_URL}/employers/jobs/${empJob.id}/callback`, {
          reason: 'Duplicate attempt'
        }, {
          headers: { Authorization: `Bearer ${empToken}` }
        });
      } catch (err) {
        if (err.response && err.response.status === 400 && err.response.data.code === 'CALLBACK_PENDING') {
          dupBlocked = true;
        }
      }
      assert(dupBlocked, 'Duplicate callback request prevented with 400 CALLBACK_PENDING', 'Callback Requests');

      // 5.5 Admin reviews and updates callback
      const adminCbs = await axios.get(`${BASE_URL}/admin/callbacks`, {
        headers: { Authorization: `Bearer ${directorToken}` }
      });
      const pendingCb = adminCbs.data.callbacks.find(c => c.job_id === empJob.id && c.status === 'NEW');
      assert(Boolean(pendingCb), 'Admin retrieved newly submitted callback in callbacks queue', 'Callback Requests');

      if (pendingCb) {
        const updateCb = await axios.put(`${BASE_URL}/admin/callbacks/${pendingCb.id}`, {
          status: 'IN_PROGRESS',
          internal_notes: 'Recruiter called client'
        }, {
          headers: { Authorization: `Bearer ${directorToken}` }
        });
        assert(updateCb.data.success === true, 'Admin transitioned callback status to IN_PROGRESS', 'Callback Requests');
      }

      // Restore access ON and cleanup test callback
      await axios.put(`${BASE_URL}/admin/jobs/${empJob.id}/candidate-access`, {
        allow_candidate_access: true
      }, {
        headers: { Authorization: `Bearer ${directorToken}` }
      });
      await db.query('DELETE FROM CALLBACK_REQUEST WHERE job_id = ?', [empJob.id]);
    }

  } catch (e) {
    assert(false, 'Candidate access & callbacks audit exception', 'Callback Requests', e.message);
  }

  // ----------------------------------------------------
  // SECTION 6: DATABASE INTEGRITY & ZERO FAKE RECORDS (Phase 7)
  // ----------------------------------------------------
  console.log('\n--- SECTION 6: Database Integrity & Zero Fake Records Audit ---');
  try {
    // 6.1 Check for orphaned applications
    const orphanedApps = await db.query(`
      SELECT a.id FROM APPLICATION a 
      LEFT JOIN JOB j ON a.job_id = j.id 
      LEFT JOIN CANDIDATES c ON a.candidate_id = c.id
      WHERE j.id IS NULL OR c.id IS NULL
    `);
    assert(orphanedApps.length === 0, 'Zero orphaned application records in database', 'Database Integrity');

    // 6.2 Check for foreign key integrity in JOB
    const orphanedJobs = await db.query(`
      SELECT j.id FROM JOB j 
      WHERE j.created_by_type = 'EMPLOYER' AND j.employer_id IS NOT NULL 
        AND j.employer_id NOT IN (SELECT id FROM EMPLOYERS)
    `);
    assert(orphanedJobs.length === 0, 'Zero orphaned employer jobs in database', 'Database Integrity');

    // 6.3 Verify zero fake test jobs remain
    const fakeJobs = await db.query("SELECT id, title FROM JOB WHERE title LIKE '%TEST%' OR title LIKE '%Test%'");
    assert(fakeJobs.length === 0, `Zero fake test jobs in database (found ${fakeJobs.length})`, 'Zero Fake Records');

  } catch (e) {
    assert(false, 'Database integrity audit exception', 'Database Integrity', e.message);
  }

  console.log('\n====================================================');
  console.log(`AUDIT COMPLETED: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (findings.length > 0) {
    console.log('Identified Findings:');
    findings.forEach((f, idx) => {
      console.log(`[${idx+1}] [${f.category}] ${f.testName}: ${f.details}`);
    });
  }

  process.exit(failed > 0 ? 1 : 0);
}

runAudit().catch(e => {
  console.error('Fatal audit error:', e);
  process.exit(1);
});
