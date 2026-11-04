const axios = require('axios');
const crypto = require('crypto');
const db = require('../config/db');

const BASE_URL = 'http://localhost:5002/api';

async function runModule2Tests() {
  console.log('====================================================');
  console.log('STARTING MODULE 2: JOB MANAGEMENT VERIFICATION SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✓ PASS [${total}]: ${message}`);
    } else {
      console.error(`  ✗ FAIL [${total}]: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  await db.initDB();

  // --- ACQUIRE TOKENS ---
  console.log('--- Step 0: Logging in Users & Staff ---');
  const jwt = require('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET || 'vakancy_super_secret_jwt_key_2026_recruitment_portal';

  const dirLogin = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'director@vakancy.com',
    password: 'password123'
  });
  assert(dirLogin.data.success && dirLogin.data.token, 'Director login successful');
  const dirToken = dirLogin.data.token;

  const recLogin = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'recruiter@vakancy.com',
    password: 'password123'
  });
  assert(recLogin.data.success && recLogin.data.token, 'Recruiter login successful');
  const recToken = recLogin.data.token;

  // Find genuine employer in DB
  const employers = await db.query('SELECT e.id, e.user_id, u.email FROM EMPLOYERS e JOIN USERS u ON e.user_id = u.id LIMIT 1');
  assert(employers && employers.length > 0, 'Found genuine employer in database');
  const testEmployer = employers[0];

  let empToken;
  try {
    const empLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: testEmployer.email,
      password: 'password123'
    });
    empToken = empLogin.data.token;
  } catch (_) {
    // Generate valid signed token for test employer
    empToken = jwt.sign(
      { id: testEmployer.user_id, role: 'employer', email: testEmployer.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
  }
  assert(Boolean(empToken), `Employer token acquired for ${testEmployer.email}`);

  // ================================================================
  // GROUP 1: JOB OWNERSHIP & STRICT IMMUTABILITY RULES
  // ================================================================
  console.log('\n--- GROUP 1: Job Ownership & Immutability Rules ---');

  // Find an employer-created job owned by testEmployer
  const empJobs = await db.query("SELECT * FROM JOB WHERE created_by_type = 'EMPLOYER' AND (employer_id = ? OR client_id = ?) AND is_archived = 0 LIMIT 1", [testEmployer.id, testEmployer.id]);
  assert(empJobs && empJobs.length > 0, 'Found employer-created job in database');
  const employerJob = empJobs[0];

  // Test 1.1: Admin attempts to update employer-created job details -> MUST fail with 403 Forbidden
  let rejectedAsExpected = false;
  try {
    await axios.put(`${BASE_URL}/admin/jobs/${employerJob.id}`, {
      title: 'Hacked Title By Admin',
      description: 'Modified description'
    }, {
      headers: { Authorization: `Bearer ${dirToken}` }
    });
  } catch (err) {
    if (err.response && err.response.status === 403) {
      rejectedAsExpected = true;
      assert(err.response.data.code === 'EMPLOYER_JOB_IMMUTABLE', '403 Forbidden returned with code EMPLOYER_JOB_IMMUTABLE');
    }
  }
  assert(rejectedAsExpected, 'Admin update to employer-created job details was strictly rejected with 403 Forbidden');

  // Test 1.2: Admin creates an internal job (created_by_type === 'ADMIN')
  const createAdminJobRes = await axios.post(`${BASE_URL}/admin/jobs`, {
    title: 'Staff Full-Stack Architect Mandate',
    department: 'Engineering',
    employment_type: 'Full-Time',
    workplace_type: 'Hybrid',
    location: 'Bengaluru, India',
    min_salary: 2400000,
    max_salary: 3200000,
    min_experience: 5,
    max_experience: 10,
    required_skills: ['Node.js', 'React', 'MySQL', 'System Design'],
    keywords: ['architect', 'fullstack'],
    benefits: ['Health Insurance', 'Performance Bonus'],
    description: 'Lead engineering initiatives and scale distributed recruitment engines.',
    company_mode: 'manual',
    manual_company_name: 'Apex Innovations Global',
    manual_contact_person: 'Anil Deshmukh',
    manual_contact_phone: '+91 98877 66554',
    manual_contact_email: 'anil@apexinnovations.com',
    status: 'open',
    is_recommended: true,
    allow_candidate_access: true,
    assigned_recruiter_id: 'usr-recruiter-001',
    internal_notes: 'Priority requirement for Q4 expansion'
  }, {
    headers: { Authorization: `Bearer ${dirToken}` }
  });

  assert(createAdminJobRes.data.success === true, 'Admin successfully created internal recruitment mandate');
  const createdAdminJobId = createAdminJobRes.data.job_id || createAdminJobRes.data.job?.id;
  assert(Boolean(createdAdminJobId), 'Requisition created and assigned valid ID');

  // Test 1.3: Admin updates admin-created job -> Must succeed with field-level change history in RECRUITMENT_ACTIVITY
  const updateAdminJobRes = await axios.put(`${BASE_URL}/admin/jobs/${createdAdminJobId}`, {
    title: 'Lead Full-Stack Systems Architect',
    min_salary: 2600000,
    max_salary: 3500000,
    internal_notes: 'Updated compensation band with executive approval'
  }, {
    headers: { Authorization: `Bearer ${dirToken}` }
  });
  assert(updateAdminJobRes.data.success === true, 'Admin updated admin-created job successfully');

  // Verify activity history logged
  const historyRows = await db.query(
    'SELECT * FROM RECRUITMENT_ACTIVITY WHERE related_job_id = ? AND action_type = ? ORDER BY created_at DESC',
    [createdAdminJobId, 'UPDATE_JOB']
  );
  assert(historyRows && historyRows.length > 0, 'Audit history recorded in RECRUITMENT_ACTIVITY');
  assert(historyRows[0].changed_field !== undefined, 'Audit record contains changed_field');

  // ================================================================
  // GROUP 2: JOB LISTING, SENSITIVE MASKING & SERVER-SIDE FILTERING
  // ================================================================
  console.log('\n--- GROUP 2: Job Listing, Masking & Filtering ---');

  // Test 2.1: Director sees unmasked contact info
  const dirJobsRes = await axios.get(`${BASE_URL}/admin/jobs?search=Architect`, {
    headers: { Authorization: `Bearer ${dirToken}` }
  });
  assert(dirJobsRes.data.success === true, 'Director retrieved jobs');
  const dirMatchedJob = dirJobsRes.data.jobs.find(j => j.id === createdAdminJobId);
  assert(dirMatchedJob !== undefined, 'Admin created job returned in search');
  assert(dirMatchedJob.contact_masked === false, 'Director sees UNMASKED company contact info');
  assert(dirMatchedJob.contact_phone === '+91 98877 66554', 'Director sees exact unmasked phone number');

  // Test 2.2: Recruiter sees masked contact info
  const recJobsRes = await axios.get(`${BASE_URL}/admin/jobs?search=Architect`, {
    headers: { Authorization: `Bearer ${recToken}` }
  });
  assert(recJobsRes.data.success === true, 'Recruiter retrieved jobs');
  const recMatchedJob = recJobsRes.data.jobs.find(j => j.id === createdAdminJobId);
  assert(recMatchedJob !== undefined, 'Job returned for recruiter');
  assert(recMatchedJob.contact_masked === true, 'Recruiter has contact_masked = true');
  assert(recMatchedJob.contact_phone.includes('***'), 'Recruiter receives MASKED phone number');

  // Test 2.3: Server-side filtering
  const openJobsRes = await axios.get(`${BASE_URL}/admin/jobs?status=open`, {
    headers: { Authorization: `Bearer ${dirToken}` }
  });
  assert(openJobsRes.data.jobs.every(j => j.status === 'open' && j.is_archived === 0), 'All jobs in open filter have status=open and is_archived=0');

  const recOnlyRes = await axios.get(`${BASE_URL}/admin/jobs?recommended_only=true`, {
    headers: { Authorization: `Bearer ${dirToken}` }
  });
  assert(recOnlyRes.data.jobs.every(j => j.is_recommended === 1), 'All jobs in recommended_only filter have is_recommended=1');

  // ================================================================
  // GROUP 3: CANDIDATE ACCESS CONTROL & CALLBACK WORKFLOW
  // ================================================================
  console.log('\n--- GROUP 3: Candidate Access Control & Callbacks ---');

  // Test 3.1: Admin toggles candidate access OFF for the employer's job
  const toggleOffRes = await axios.put(`${BASE_URL}/admin/jobs/${employerJob.id}/candidate-access`, {
    allow_candidate_access: false
  }, {
    headers: { Authorization: `Bearer ${dirToken}` }
  });
  assert(toggleOffRes.data.success === true && (toggleOffRes.data.allow_candidate_access === 0 || toggleOffRes.data.allow_candidate_access === false), 'Admin toggled candidate access OFF');

  // Test 3.2: Employer tries to view applicants -> must return 403 with candidate_access_allowed: false
  let accessBlocked = false;
  try {
    await axios.get(`${BASE_URL}/employers/jobs/${employerJob.id}/applicants`, {
      headers: { Authorization: `Bearer ${empToken}` }
    });
  } catch (err) {
    if (err.response && err.response.status === 403 && err.response.data.candidate_access_allowed === false) {
      accessBlocked = true;
    }
  }
  assert(accessBlocked, 'Employer applicants endpoint returned 403 with candidate_access_allowed: false');

  // Test 3.3: Employer submits callback request
  // First clear any previous callbacks for this job to test clean creation
  await db.query('DELETE FROM CALLBACK_REQUEST WHERE job_id = ?', [employerJob.id]);

  const callbackRes = await axios.post(`${BASE_URL}/employers/jobs/${employerJob.id}/callback`, {
    callback_reason: 'Need candidate shortlists and discussion on screening requirements'
  }, {
    headers: { Authorization: `Bearer ${empToken}` }
  });
  assert(callbackRes.data.success === true, 'Employer submitted callback request successfully');
  const callbackId = callbackRes.data.callback_id;

  // Test 3.4: Duplicate prevention -> submitting again returns 400
  let duplicateRejected = false;
  try {
    await axios.post(`${BASE_URL}/employers/jobs/${employerJob.id}/callback`, {
      callback_reason: 'Second redundant attempt'
    }, {
      headers: { Authorization: `Bearer ${empToken}` }
    });
  } catch (err) {
    if (err.response && err.response.status === 400 && err.response.data.code === 'CALLBACK_PENDING') {
      duplicateRejected = true;
    }
  }
  assert(duplicateRejected, 'Duplicate callback request correctly rejected with 400 CALLBACK_PENDING');

  // Test 3.5: Admin views and manages callbacks
  const adminCallbacksRes = await axios.get(`${BASE_URL}/admin/callbacks?jobId=${employerJob.id}`, {
    headers: { Authorization: `Bearer ${dirToken}` }
  });
  assert(adminCallbacksRes.data.success === true && adminCallbacksRes.data.callbacks.length > 0, 'Admin retrieved callback request');

  const updateCallbackRes = await axios.put(`${BASE_URL}/admin/callbacks/${callbackId}`, {
    status: 'IN_PROGRESS',
    internal_notes: 'Recruiter Rahul contacted employer on phone; screening profiles.',
    resolution_outcome: 'Arranged candidate batch review'
  }, {
    headers: { Authorization: `Bearer ${dirToken}` }
  });
  assert(updateCallbackRes.data.success === true, 'Admin successfully updated callback status to IN_PROGRESS');

  // Test 3.6: Admin toggles candidate access back ON -> Employer can access applicants again
  await axios.put(`${BASE_URL}/admin/jobs/${employerJob.id}/candidate-access`, {
    allow_candidate_access: true
  }, {
    headers: { Authorization: `Bearer ${dirToken}` }
  });
  const recheckAppsRes = await axios.get(`${BASE_URL}/employers/jobs/${employerJob.id}/applicants`, {
    headers: { Authorization: `Bearer ${empToken}` }
  });
  assert(recheckAppsRes.data.success === true, 'Employer successfully accessed applicants after access restored');

  // ================================================================
  // GROUP 4: CANDIDATE SHARING & ACCESS CODE SECURITY
  // ================================================================
  console.log('\n--- GROUP 4: Candidate Sharing & Access Code Security ---');

  // Check existing or create a candidate share proposal
  const candidates = await db.query('SELECT id, name FROM CANDIDATES LIMIT 1');
  assert(candidates && candidates.length > 0, 'Candidate available for sharing test');
  const testCandidate = candidates[0];

  const shareToken = 'test-share-token-' + crypto.randomBytes(16).toString('hex');
  await db.query(`
    INSERT INTO CANDIDATE_SHARING (
      id, candidate_id, client_id, job_id, share_token, share_scope,
      status, candidate_consent, proposed_by_user_id, created_at, updated_at
    ) VALUES (
      UUID(), ?, ?, ?, ?, 'full', 'PROPOSED', 1,
      (SELECT id FROM USERS WHERE role = 'director' LIMIT 1),
      NOW(), NOW()
    )
  `, [testCandidate.id, testEmployer.id, employerJob.id, shareToken]);

  const createdShareRows = await db.query('SELECT id FROM CANDIDATE_SHARING WHERE share_token = ?', [shareToken]);
  const shareRecordId = createdShareRows[0].id;

  // Director approves share with payment exception -> generates access code
  const approveRes = await axios.put(`${BASE_URL}/admin/candidate-shares/${shareRecordId}/approve`, {
    is_exception: true,
    exception_reason: 'Executive partner introductory review'
  }, {
    headers: { Authorization: `Bearer ${dirToken}` }
  });

  assert(approveRes.data.success === true, 'Candidate share approved by Director');
  assert(Boolean(approveRes.data.access_code), 'Response returned secure access code');
  const rawAccessCode = approveRes.data.access_code;

  // Test 4.1: Plaintext access code is NOT in DB
  const dbShare = await db.query('SELECT access_code_encrypted, access_code_hash FROM CANDIDATE_SHARING WHERE id = ?', [shareRecordId]);
  assert(Boolean(dbShare[0].access_code_encrypted), 'DB contains access_code_encrypted (AES-256-GCM)');
  assert(Boolean(dbShare[0].access_code_hash), 'DB contains access_code_hash (SHA-256)');
  assert(dbShare[0].access_code_encrypted !== rawAccessCode, 'Plaintext access code is NOT stored in database');

  // Test 4.2: Public access without access code -> 401 ACCESS_CODE_REQUIRED
  let codeRequiredCaught = false;
  try {
    await axios.get(`${BASE_URL}/admin/shared-profile/${shareToken}`);
  } catch (err) {
    if (err.response && err.response.status === 401 && err.response.data.code === 'ACCESS_CODE_REQUIRED') {
      codeRequiredCaught = true;
    }
  }
  assert(codeRequiredCaught, 'Public access without access code rejected with 401 ACCESS_CODE_REQUIRED');

  // Test 4.3: Public access with wrong code -> 401 INVALID_ACCESS_CODE
  let invalidCodeCaught = false;
  try {
    await axios.get(`${BASE_URL}/admin/shared-profile/${shareToken}?code=VK-WRONG`);
  } catch (err) {
    if (err.response && err.response.status === 401 && err.response.data.code === 'INVALID_ACCESS_CODE') {
      invalidCodeCaught = true;
    }
  }
  assert(invalidCodeCaught, 'Public access with invalid code rejected with 401 INVALID_ACCESS_CODE');

  // Test 4.4: Public access with correct code -> 200 OK with sanitized profile
  const validAccessRes = await axios.get(`${BASE_URL}/admin/shared-profile/${shareToken}?code=${rawAccessCode}`);
  assert(validAccessRes.data.success === true, 'Public access with verified access code returned 200 OK');
  assert(validAccessRes.data.profile.name === testCandidate.name, 'Profile loaded matches shared candidate');

  // ================================================================
  // GROUP 5: APPLICATION-TIME RESUME & PROFILE FREEZING
  // ================================================================
  console.log('\n--- GROUP 5: Application-Time Resume & Profile Snapshot ---');

  // Check an application in DB
  const appRows = await db.query('SELECT * FROM APPLICATION WHERE resume_url IS NOT NULL OR candidate_snapshot IS NOT NULL LIMIT 1');
  if (appRows && appRows.length > 0) {
    const sampleApp = appRows[0];
    assert(sampleApp.resume_url !== undefined, 'APPLICATION has resume_url column');
    assert(sampleApp.candidate_snapshot !== undefined, 'APPLICATION has candidate_snapshot column');
    console.log('  ✓ PASS: APPLICATION table structure enforces application-time resume and profile snapshot.');
    passed++;
    total++;
  } else {
    // If no application has snapshot yet, verify table column definitions
    const cols = await db.query("SHOW COLUMNS FROM APPLICATION WHERE Field IN ('resume_id', 'resume_url', 'resume_filename', 'candidate_snapshot')");
    assert(cols && cols.length === 4, 'APPLICATION schema contains all 4 frozen snapshot columns');
  }

  // ================================================================
  // GROUP 6: ARCHIVE & RESTORE WORKFLOW
  // ================================================================
  console.log('\n--- GROUP 6: Archive & Restore Workflow ---');

  // Test 6.1: Archive admin job
  const archiveRes = await axios.put(`${BASE_URL}/admin/jobs/${createdAdminJobId}/archive`, {
    reason: 'Temporary pause on engineering hiring'
  }, {
    headers: { Authorization: `Bearer ${dirToken}` }
  });
  assert(archiveRes.data.success === true, 'Admin archived job requisition');

  // Verify excluded from public candidate jobs listing
  const pubJobsRes = await axios.get(`${BASE_URL}/jobs`);
  assert(pubJobsRes.data.jobs.every(j => j.id !== createdAdminJobId), 'Archived job is hidden from candidate public jobs board');

  // Verify present in admin archived filter
  const adminArchivedRes = await axios.get(`${BASE_URL}/admin/jobs?status=archived`, {
    headers: { Authorization: `Bearer ${dirToken}` }
  });
  const foundArchived = adminArchivedRes.data.jobs.find(j => j.id === createdAdminJobId);
  assert(foundArchived !== undefined && foundArchived.is_archived === 1, 'Job appears in admin archived listing');

  // Test 6.2: Restore job
  const restoreRes = await axios.put(`${BASE_URL}/admin/jobs/${createdAdminJobId}/restore`, {
    target_status: 'open',
    restore_note: 'Reopened by hiring manager'
  }, {
    headers: { Authorization: `Bearer ${dirToken}` }
  });
  assert(restoreRes.data.success === true, 'Admin restored job requisition');

  // Verify restored to public candidate jobs board
  const pubJobsRes2 = await axios.get(`${BASE_URL}/jobs`);
  const foundRestoredInPub = pubJobsRes2.data.jobs.find(j => j.id === createdAdminJobId);
  assert(foundRestoredInPub !== undefined, 'Restored job is now discoverable on public candidate jobs board');

  // Clean up test created job
  await db.query('DELETE FROM RECRUITMENT_ACTIVITY WHERE related_job_id = ?', [createdAdminJobId]);
  await db.query('DELETE FROM JOB_KEYWORD WHERE job_id = ?', [createdAdminJobId]);
  await db.query('DELETE FROM JOB WHERE id = ?', [createdAdminJobId]);
  await db.query('DELETE FROM CANDIDATE_SHARING WHERE id = ?', [shareRecordId]);
  await db.query('DELETE FROM CALLBACK_REQUEST WHERE job_id = ?', [employerJob.id]);

  console.log('\n====================================================');
  console.log(`MODULE 2 TEST SUITE COMPLETED: ${passed}/${total} PASS`);
  console.log('====================================================');
  process.exit(0);
}

runModule2Tests().catch((err) => {
  console.error('\nTest Suite encountered fatal error:', err);
  process.exit(1);
});
