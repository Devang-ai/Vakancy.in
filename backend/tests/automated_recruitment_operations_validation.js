/**
 * Comprehensive Automated Validation Script for Vakancy.in
 * Modules 1 through 12 End-to-End Verification
 */

const BASE_URL = 'http://localhost:5002/api';

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

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName} - ${details}`);
    failedTests++;
  }
}

async function runSuite() {
  console.log('====================================================');
  console.log('STARTING VAKANCY.IN RECRUITMENT OPERATIONS TEST SUITE');
  console.log('====================================================\n');

  try {
    // 1. Authenticate Personas
    console.log('Step 1: Authenticating Core Personas...');
    const directorSession = await login('director@vakancy.com', 'password123');
    const dHeaders = { Authorization: `Bearer ${directorSession.token}` };
    assert(Boolean(directorSession.token), 'Director Tosif Abbasi logged in successfully');

    const bdSession = await login('bdlead@vakancy.com', 'password123');
    const bdHeaders = { Authorization: `Bearer ${bdSession.token}` };
    assert(Boolean(bdSession.token), 'BD Lead logged in successfully');

    const recruiterSession = await login('recruiter@vakancy.com', 'password123');
    const rHeaders = { Authorization: `Bearer ${recruiterSession.token}` };
    assert(Boolean(recruiterSession.token), 'Recruiter logged in successfully');

    // 2. Module 1: Admin Job Posting Parity
    console.log('\nStep 2: Testing Module 1 - Admin Job Posting Parity...');
    const uniqueTitle = `Senior Enterprise Solutions Architect ${Date.now()}`;
    const testAdminJobPayload = {
      title: uniqueTitle,
      department: 'Engineering',
      job_domain: 'Cloud Architecture',
      employment_type: 'Full Time',
      workplace_type: 'Hybrid',
      country: 'India',
      state: 'Karnataka',
      city: 'Bengaluru',
      locality: 'Indiranagar',
      seniority_level: 'director_lead',
      fresher_allowed: false,
      min_qualification: 'Master of Technology (M.Tech)',
      degree: 'M.Tech',
      specialization: 'Computer Science',
      notice_period: '30_days',
      salary_period: 'annual',
      salary_type: 'fixed_only',
      min_salary: 3500000,
      max_salary: 5500000,
      salary_currency: 'INR',
      is_salary_negotiable: true,
      openings_count: 2,
      skills: ['Microservices', 'System Design', 'Kubernetes', 'Golang'],
      keywords: ['Cloud', 'High Throughput', 'Architecture'],
      description: 'Lead high throughput distributed systems across enterprise platforms.',
      status: 'draft',
      internal_notes: 'Confidential executive search mandate'
    };

    const createJobRes = await request('/admin/jobs', {
      method: 'POST',
      headers: dHeaders,
      body: JSON.stringify(testAdminJobPayload)
    });
    assert(createJobRes.status === 201 && createJobRes.body.job_id, 'Admin created draft requisition with full employer fields');
    const testJobId = createJobRes.body.job_id;

    // Verify it is excluded from Candidate Search while in 'draft'
    const candidateSearchDraft = await request(`/jobs?search=${encodeURIComponent(uniqueTitle)}`);
    const draftFound = (candidateSearchDraft.body.jobs || []).some(j => j.id === testJobId);
    assert(!draftFound, 'Module 1/2 Safeguard: Draft admin job is excluded from candidate search');

    // Update job to 'open' status and test update parity
    const updateJobRes = await request(`/admin/jobs/${testJobId}`, {
      method: 'PUT',
      headers: dHeaders,
      body: JSON.stringify({
        ...testAdminJobPayload,
        title: uniqueTitle,
        status: 'open',
        publish_to_board: true,
        locality: 'Koramangala 4th Block'
      })
    });
    assert(updateJobRes.ok, 'Admin updated requisition and published to open status via PUT /api/admin/jobs/:id');

    // 3. Module 2: Unified Job Listing & "Vakancy.in Recommended" Ranking
    console.log('\nStep 3: Testing Module 2 - Unified Listing & Recommended Ranking...');
    const candidateSearchOpen = await request('/jobs?page=1&limit=20');
    assert(candidateSearchOpen.ok && Array.isArray(candidateSearchOpen.body.jobs), 'Candidate jobs search API returns results');
    const jobsList = candidateSearchOpen.body.jobs || [];

    const foundAdminJob = jobsList.find(j => j.id === testJobId);
    assert(Boolean(foundAdminJob), 'Published Admin job is returned in candidate search results');
    if (foundAdminJob) {
      assert(foundAdminJob.is_recommended === true, 'Admin job has is_recommended flag = true');
      assert(foundAdminJob.recommendation_badge === 'Vakancy.in Recommended', 'Admin job has recommendation_badge = "Vakancy.in Recommended"');
    }

    // Verify top ranking: The top returned job must be an internal/recommended job
    if (jobsList.length > 0) {
      const topJob = jobsList[0];
      const isTopInternal = topJob.created_by_type === 'INTERNAL_STAFF' ||
        ['EXECUTIVE_SEARCH', 'Vakancy Recruitment'].includes(topJob.source_type) ||
        topJob.is_recommended === true;
      assert(isTopInternal, `Top ranked job (#1: "${topJob.title}") is an internal/recommended job`);
    }

    // 4. Module 3: Sole Director Account Safeguards
    console.log('\nStep 4: Testing Module 3 - Sole Director Account Safeguards...');
    const usersRes = await request('/admin/users', { headers: dHeaders });
    const directorUser = (usersRes.body.users || []).find(u => u.email === 'director@vakancy.com');
    assert(Boolean(directorUser), 'Director Tosif Abbasi located in staff directory');

    // Attempt to deactivate the sole active Director
    const deactSoleDirectorRes = await request(`/admin/users/${directorUser.id}/status`, {
      method: 'PUT',
      headers: dHeaders
    });
    assert(deactSoleDirectorRes.status === 400, 'Deactivating sole active Director correctly rejected with 400 Bad Request');

    // Attempt to demote sole Director's role to recruiter
    const demoteSoleDirectorRes = await request(`/admin/users/${directorUser.id}/admin-profile`, {
      method: 'PUT',
      headers: dHeaders,
      body: JSON.stringify({ role: 'recruiter' })
    });
    assert(demoteSoleDirectorRes.status === 400, 'Demoting sole active Director role correctly rejected with 400 Bad Request');

    // 5. Module 4: Hierarchical Reporting & Circular Cycle Prevention
    console.log('\nStep 4B: Testing Module 4 - Hierarchical Teams & Cycle Prevention...');
    const recruiterUser = (usersRes.body.users || []).find(u => u.email === 'recruiter@vakancy.com');
    const tlUser = (usersRes.body.users || []).find(u => u.email === 'tl@vakancy.com');

    // Test Self-Reporting rejection
    if (recruiterUser) {
      const selfReportRes = await request(`/admin/users/${recruiterUser.id}/admin-profile`, {
        method: 'PUT',
        headers: dHeaders,
        body: JSON.stringify({ reporting_user_id: recruiterUser.id })
      });
      assert(selfReportRes.status === 400, 'Self-reporting correctly blocked with 400 Bad Request');
    }

    // Test Circular Loop Detection (Recruiter -> TL, then TL -> Recruiter)
    if (recruiterUser && tlUser) {
      // Step A: Set Recruiter to report to TL
      await request(`/admin/users/${recruiterUser.id}/admin-profile`, {
        method: 'PUT',
        headers: dHeaders,
        body: JSON.stringify({ reporting_user_id: tlUser.id })
      });

      // Step B: Try setting TL to report to Recruiter (creates circle: TL -> Recruiter -> TL)
      const circularRes = await request(`/admin/users/${tlUser.id}/admin-profile`, {
        method: 'PUT',
        headers: dHeaders,
        body: JSON.stringify({ reporting_user_id: recruiterUser.id })
      });
      assert(circularRes.status === 400, 'Circular reporting cycle correctly detected and rejected with 400');
    }

    // 6. Module 5: Self-Service vs Director Administrative Profile Boundaries
    console.log('\nStep 5: Testing Module 5 - Self-Service Profile Boundaries...');
    // Recruiter updates their own personal profile
    const recruiterSelfProfileRes = await request('/admin/profile/me', {
      method: 'PUT',
      headers: rHeaders,
      body: JSON.stringify({
        name: 'Vakancy Operations Specialist',
        phone: '+91 99887 76655'
      })
    });
    assert(recruiterSelfProfileRes.ok, 'Staff member can self-update personal details (name, phone) via /api/admin/profile/me');

    // Recruiter tries to edit administrative role via Director-only endpoint
    const recruiterTamperRes = await request(`/admin/users/${recruiterUser.id}/admin-profile`, {
      method: 'PUT',
      headers: rHeaders,
      body: JSON.stringify({ role: 'director' })
    });
    assert(recruiterTamperRes.status === 403, 'Non-Director tampering with administrative profile correctly blocked with 403 Forbidden');

    // 7. Module 6: Employer Candidate Access for Specific Jobs & RBAC Gating
    console.log('\nStep 6: Testing Module 6 - Employer Candidate Gated Access & IDOR Protection...');
    // Gating check: unauthenticated / non-employer role cannot query employer applicants endpoint
    const unauthApplicantsRes = await request('/employers/jobs/any-job-id/applicants');
    assert(unauthApplicantsRes.status === 401 || unauthApplicantsRes.status === 403, 'Unauthenticated access to employer applicants gated with 401/403');

    // Director and internal staff can view candidate shares and proposal pipeline
    const sharesRes = await request('/admin/candidate-shares', { headers: dHeaders });
    assert(sharesRes.ok && Array.isArray(sharesRes.body.shares), 'Internal staff can manage candidate sharing governance pipeline');

    // 8. Module 7: Contact Us & Executive Search Enquiry Lifecycle
    console.log('\nStep 7: Testing Module 7 - Enquiry Creation & Conversion...');
    const testEnquiryPayload = {
      name: 'Aditya Singhania',
      email: `aditya.test.${Date.now()}@singhaniacorp.com`,
      phone: '+91 98200 12345',
      company_name: 'Singhania Global Tech',
      subject: `VP of Infrastructure & Security (Mandate ${Date.now()})`,
      message: 'Need an executive search for our next-gen cloud security infrastructure.',
      openings_count: 1,
      source: 'EXECUTIVE_SERVICE',
      category: 'EXECUTIVE_SEARCH'
    };

    const submitEnqRes = await request('/contact/enquire', {
      method: 'POST',
      body: JSON.stringify(testEnquiryPayload)
    });
    assert(submitEnqRes.status === 201 && submitEnqRes.body.reference.startsWith('REQ-'), 'Executive search enquiry logged with REQ-XXXX reference number');
    const createdEnquiryId = submitEnqRes.body.enquiry_id;

    // Test Anti-Duplicate Protection within 3 minutes
    const duplicateEnqRes = await request('/contact/enquire', {
      method: 'POST',
      body: JSON.stringify(testEnquiryPayload)
    });
    assert(duplicateEnqRes.status === 429, 'Immediate duplicate enquiry submission blocked with 429 Too Many Requests');

    // Admin converts enquiry to requirement
    const convertEnqRes = await request(`/admin/enquiries/${createdEnquiryId}/convert-to-requirement`, {
      method: 'POST',
      headers: dHeaders,
      body: JSON.stringify({
        title: testEnquiryPayload.subject,
        location: 'Mumbai / Hybrid',
        openings_count: 1
      })
    });
    assert(convertEnqRes.ok, 'Admin converted executive enquiry to job requisition');

    // Attempt duplicate conversion of the same enquiry
    const duplicateConvertRes = await request(`/admin/enquiries/${createdEnquiryId}/convert-to-requirement`, {
      method: 'POST',
      headers: dHeaders,
      body: JSON.stringify({
        title: testEnquiryPayload.subject
      })
    });
    assert(duplicateConvertRes.status === 409, 'Duplicate conversion of the same enquiry correctly prevented with 409 Conflict');

    // 9. Module 8: Commercials & Payment Verification
    console.log('\nStep 8: Testing Module 8 - Commercials & Payment Verification...');
    const quoteRes = await request('/admin/commercials/quote', {
      method: 'POST',
      headers: dHeaders,
      body: JSON.stringify({
        job_id: testJobId,
        quoted_amount: 250000.00,
        currency: 'INR',
        notes: 'Executive retained recruitment fee (20% advance)'
      })
    });
    assert(quoteRes.status === 201 && quoteRes.body.commercial_id, 'Admin recorded commercial quote into RECRUITMENT_COMMERCIALS');
    const commercialId = quoteRes.body.commercial_id;

    // Record payment receipt
    const recordPayRes = await request(`/admin/commercials/${commercialId}/payment`, {
      method: 'POST',
      headers: dHeaders,
      body: JSON.stringify({
        transaction_ref: 'HDFC-UTR-8982390192',
        notes: 'Wire transfer confirmed by finance'
      })
    });
    assert(recordPayRes.ok, 'Commercial payment receipt recorded');

    // Non-director (Recruiter) tries to verify payment
    const recruiterVerifyRes = await request(`/admin/commercials/${commercialId}/verify`, {
      method: 'PUT',
      headers: rHeaders,
      body: JSON.stringify({ notes: 'Recruiter attempting verification' })
    });
    assert(recruiterVerifyRes.status === 403, 'Recruiter payment verification blocked with 403 (Director-only action)');

    // Director verifies payment
    const directorVerifyRes = await request(`/admin/commercials/${commercialId}/verify`, {
      method: 'PUT',
      headers: dHeaders,
      body: JSON.stringify({ notes: 'Approved by Tosif Abbasi (Director)' })
    });
    assert(directorVerifyRes.ok, 'Director successfully verified commercial payment');

    // 10. Module 10: Recruitment Activity Audit Log
    console.log('\nStep 9: Testing Module 10 - Recruitment Activity Audit Log...');
    const statsRes = await request('/admin/stats', { headers: dHeaders });
    assert(statsRes.ok && statsRes.body.stats, 'Dashboard returns live DB metrics');

    const activityRes = await request('/admin/activity', { headers: dHeaders });
    const activities = activityRes.body.activities || activityRes.body.activity || [];
    assert(activities.length > 0, `Audit log contains ${activities.length} recorded actions`);

    const hasConvertLog = activities.some(a => a.action_type === 'CONVERT_ENQUIRY_TO_REQUIREMENT');
    assert(hasConvertLog, 'RECRUITMENT_ACTIVITY tracks CONVERT_ENQUIRY_TO_REQUIREMENT');

    const hasVerifyLog = activities.some(a => a.action_type === 'VERIFY_COMMERCIAL_PAYMENT');
    assert(hasVerifyLog, 'RECRUITMENT_ACTIVITY tracks VERIFY_COMMERCIAL_PAYMENT');

    console.log('\n====================================================');
    console.log(`TEST SUITE COMPLETE: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log('====================================================');

    if (failedTests > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during test suite:', err);
    process.exit(1);
  }
}

runSuite();
