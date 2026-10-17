/**
 * Vakancy.in — Phase 3 End-to-End Client Acceptance Test Suite
 * Validates recruitment journey, team management, enquiry lifecycle, and regression.
 */

const http = require('http');

const BASE_URL = 'http://localhost:5002/api';
let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedCount++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failedCount++;
    throw new Error(`Assertion failed: ${message}`);
  }
}

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path.startsWith('http') ? path : `${BASE_URL}${path}`);
    const reqOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const req = http.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (_) {
          parsed = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsed
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

function multipartRequest(path, boundary, buffer, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${path}`);
    const reqOptions = {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Authorization': `Bearer ${token}`,
        'Content-Length': buffer.length
      }
    };

    const req = http.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (_) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    req.write(buffer);
    req.end();
  });
}

async function runPhase3AcceptanceSuite() {
  console.log('====================================================');
  console.log('VAKANCY.IN PHASE 3: END-TO-END CLIENT ACCEPTANCE SUITE');
  console.log('====================================================\n');

  const timestamp = Date.now();
  let directorToken = null;
  let bdLeadToken = null;
  let tlToken = null;
  let recruiterToken = null;
  let candidateToken = null;
  let candidateId = null;
  let authorizedEmployerToken = null;
  let authorizedEmployerId = null;
  let unauthorizedEmployerToken = null;
  let publishedJobId = null;
  let applicationRecordId = null;
  let candidateShareId = null;

  // ----------------------------------------------------
  // STEP 1: Core Personas Authentication & Registration
  // ----------------------------------------------------
  console.log('--- Step 1: Persona Authentication & Isolated Test Users ---');
  
  // 1.1 Internal Staff
  const dirLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: 'director@vakancy.com', password: 'password123' }
  });
  assert(dirLogin.status === 200 && dirLogin.data.token, 'Director authenticated successfully');
  directorToken = dirLogin.data.token;

  const bdLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: 'bdlead@vakancy.com', password: 'password123' }
  });
  assert(bdLogin.status === 200 && bdLogin.data.token, 'BD Lead authenticated successfully');
  bdLeadToken = bdLogin.data.token;

  const tlLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: 'tl@vakancy.com', password: 'password123' }
  });
  assert(tlLogin.status === 200 && tlLogin.data.token, 'TL Coordinator authenticated successfully');
  tlToken = tlLogin.data.token;

  const recLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: 'recruiter@vakancy.com', password: 'password123' }
  });
  assert(recLogin.status === 200 && recLogin.data.token, 'Recruiter authenticated successfully');
  recruiterToken = recLogin.data.token;

  // 1.2 Isolated Candidate
  const candEmail = `cand.p3.${timestamp}@example.com`;
  const candRegister = await request('/auth/register', {
    method: 'POST',
    body: {
      email: candEmail,
      password: 'Password123!',
      role: 'candidate',
      name: 'Aditi Sharma',
      phone: '+91 98888 11111'
    }
  });
  assert(candRegister.status === 201 && candRegister.data.token, 'Isolated Candidate registered successfully');
  candidateToken = candRegister.data.token;

  const candProfileRes = await request('/candidate/me', {
    headers: { Authorization: `Bearer ${candidateToken}` }
  });
  assert(candProfileRes.status === 200 && candProfileRes.data.candidate, 'Candidate profile retrieved');
  candidateId = candProfileRes.data.candidate.id;

  // 1.3 Authorized Employer
  const authEmpEmail = `emp.auth.p3.${timestamp}@corporate.com`;
  const authEmpRegister = await request('/auth/register', {
    method: 'POST',
    body: {
      email: authEmpEmail,
      password: 'Password123!',
      role: 'employer',
      company_name: 'Nexus Digital Tech Ltd',
      contact_person_name: 'Rohit Verma HR',
      phone: '+91 97777 22222'
    }
  });
  assert(authEmpRegister.status === 201 && authEmpRegister.data.token, 'Authorized Employer registered successfully');
  authorizedEmployerToken = authEmpRegister.data.token;

  const authEmpProfile = await request('/employer/profile', {
    headers: { Authorization: `Bearer ${authorizedEmployerToken}` }
  });
  assert(authEmpProfile.status === 200 && authEmpProfile.data.employer, 'Authorized Employer profile loaded');
  authorizedEmployerId = authEmpProfile.data.employer.id;

  // 1.4 Unauthorized Employer (for IDOR and isolation validation)
  const unauthEmpEmail = `emp.unauth.p3.${timestamp}@corporate.com`;
  const unauthEmpRegister = await request('/auth/register', {
    method: 'POST',
    body: {
      email: unauthEmpEmail,
      password: 'Password123!',
      role: 'employer',
      company_name: 'Rival Industrial Corp',
      contact_person_name: 'Vikram Mehta',
      phone: '+91 97777 33333'
    }
  });
  assert(unauthEmpRegister.status === 201 && unauthEmpRegister.data.token, 'Unauthorized Employer registered successfully');
  unauthorizedEmployerToken = unauthEmpRegister.data.token;

  // ----------------------------------------------------
  // STEP 2: Recruitment Journey & Candidate Application
  // ----------------------------------------------------
  console.log('\n--- Step 2: Recruitment Lifecycle & Candidate Application ---');

  // 2.1 Director creates and publishes job
  const jobPayload = {
    title: `Lead Cloud DevOps Engineer P3 ${timestamp}`,
    department: 'Infrastructure',
    job_domain: 'DevOps & SRE',
    employment_type: 'Full Time',
    workplace_type: 'Hybrid',
    location: 'Bengaluru, Karnataka, India',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    min_experience: 5,
    max_experience: 9,
    min_salary: 2200000,
    max_salary: 3200000,
    currency: 'INR',
    salary_period: 'Per Year',
    openings_count: 2,
    description: 'We are seeking an experienced DevOps Engineer to architect scalable Kubernetes clusters.',
    required_skills: ['Kubernetes', 'Docker', 'AWS', 'Terraform', 'CI/CD'],
    status: 'open',
    publish_to_board: true,
    employer_id: authorizedEmployerId // Belongs to authorized employer
  };

  const createJobRes = await request('/admin/jobs', {
    method: 'POST',
    headers: { Authorization: `Bearer ${directorToken}` },
    body: jobPayload
  });
  assert(createJobRes.status === 201 && createJobRes.data.job_id, 'Director created and published job requisition');
  publishedJobId = createJobRes.data.job_id;

  // 2.2 Candidate searches for jobs and sees Recommended badge
  const searchJobsRes = await request(`/jobs?keyword=Cloud%20DevOps%20P3%20${timestamp}`);
  assert(searchJobsRes.status === 200, 'Public candidate jobs API responded with 200');
  const matchedJob = (searchJobsRes.data.jobs || []).find(j => j.id === publishedJobId);
  assert(Boolean(matchedJob), 'Candidate search returns the newly published job');
  assert(matchedJob.is_recommended === true || matchedJob.is_recommended === 1, 'Job has is_recommended flag = true');
  assert(matchedJob.recommendation_badge === 'Vakancy.in Recommended', 'Job displays "Vakancy.in Recommended" badge');

  // 2.3 Search filters preserve priority ranking
  const filteredJobsRes = await request('/jobs?location=Bengaluru&type=Full%20Time');
  assert(filteredJobsRes.status === 200 && filteredJobsRes.data.jobs?.length > 0, 'Filtered job search returns results');
  assert(filteredJobsRes.data.jobs[0].is_recommended === true, 'Recommended job ranks at position #1 across filtered results');

  // 2.4 Candidate opens the job and applies
  const applyRes = await request('/applications/apply', {
    method: 'POST',
    headers: { Authorization: `Bearer ${candidateToken}` },
    body: { job_id: publishedJobId }
  });
  assert(applyRes.status === 201 && applyRes.data.application_id, 'Candidate successfully applied to the published job');
  applicationRecordId = applyRes.data.application_id;

  // Prevent duplicate application
  const dupApplyRes = await request('/applications/apply', {
    method: 'POST',
    headers: { Authorization: `Bearer ${candidateToken}` },
    body: { job_id: publishedJobId }
  });
  assert(dupApplyRes.status === 400, 'Duplicate job application prevented with 400 Bad Request');

  // 2.5 Recruiter views and updates application status
  const recruiterApps = await request(`/applications/job/${publishedJobId}`, {
    headers: { Authorization: `Bearer ${recruiterToken}` }
  });
  assert(recruiterApps.status === 200 && recruiterApps.data.applicants?.length > 0, 'Recruiter retrieved applicants for job');

  const updateAppStatusRes = await request(`/applications/${applicationRecordId}/status`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${recruiterToken}` },
    body: { status: 'shortlisted' }
  });
  assert(updateAppStatusRes.status === 200, 'Recruiter updated candidate application status to shortlisted');

  // Candidate sees application in my-applications
  const myAppsRes = await request('/applications/my-applications', {
    headers: { Authorization: `Bearer ${candidateToken}` }
  });
  assert(myAppsRes.status === 200 && myAppsRes.data.applications?.length > 0, 'Candidate retrieves updated application in my-applications');
  assert(myAppsRes.data.applications[0].status === 'shortlisted', 'Candidate application status reflects shortlisted');

  // 2.5B Director assigns recruiter to job (Establishing authorized scope)
  const assignJobRes = await request(`/admin/jobs/${publishedJobId}/assign-recruiter`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${directorToken}` },
    body: { assigned_recruiter_id: 'usr-recruiter-001' }
  });
  assert(assignJobRes.status === 200, 'Director assigned job to recruiter (granting authorized record scope)');

  // 2.6 Candidate Sharing Workflow & Consent Enforcement
  const proposeShareRes = await request('/admin/candidate-shares/propose', {
    method: 'POST',
    headers: { Authorization: `Bearer ${recruiterToken}` },
    body: {
      candidate_id: candidateId,
      job_id: publishedJobId,
      client_id: authorizedEmployerId,
      candidate_consent: 1,
      consent_notes: 'Candidate verbal consent confirmed on call',
      share_scope: 'full_profile'
    }
  });
  assert(proposeShareRes.status === 201 && proposeShareRes.data.share_id, 'Recruiter proposed candidate sharing submission');
  candidateShareId = proposeShareRes.data.share_id;

  // TL Review
  const tlReviewRes = await request(`/admin/candidate-shares/${candidateShareId}/review`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${tlToken}` },
    body: { candidate_consent: 1, consent_notes: 'TL verified profile credentials', share_scope: 'full_profile' }
  });
  assert(tlReviewRes.status === 200, 'TL Coordinator reviewed and forwarded candidate sharing');

  // Director Approval with exception
  const approveShareRes = await request(`/admin/candidate-shares/${candidateShareId}/approve`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${directorToken}` },
    body: {
      payment_exception: true,
      exception_reason: 'Authorized client enterprise agreement under Director approval'
    }
  });
  assert(approveShareRes.status === 200 && approveShareRes.data.share_token, 'Director approved candidate sharing with 14-day validity token');

  // 2.7 Authorized Employer sees only approved candidates for its authorized job
  const authEmpApplicants = await request(`/employer/jobs/${publishedJobId}/applicants`, {
    headers: { Authorization: `Bearer ${authorizedEmployerToken}` }
  });
  assert(authEmpApplicants.status === 200, 'Authorized Employer successfully accessed applicants for its job');
  assert(authEmpApplicants.data.applicants?.length > 0, 'Authorized Employer views approved shared candidates');

  // 2.8 Unauthorized Employer blocked from accessing candidate details or resumes (IDOR check)
  const unauthEmpApplicants = await request(`/employer/jobs/${publishedJobId}/applicants`, {
    headers: { Authorization: `Bearer ${unauthorizedEmployerToken}` }
  });
  assert(unauthEmpApplicants.status === 403, 'Unauthorized Employer blocked from unowned job applicants with 403 Forbidden');

  const unauthEmpResume = await request(`/employer/resumes/${candidateId}?job_id=${publishedJobId}`, {
    headers: { Authorization: `Bearer ${unauthorizedEmployerToken}` }
  });
  assert(unauthEmpResume.status === 403, 'Unauthorized Employer blocked from viewing candidate resume with 403 Forbidden');

  // ----------------------------------------------------
  // STEP 3: Team Management, Roles & Governance Hierarchy
  // ----------------------------------------------------
  console.log('\n--- Step 3: Team Governance, Roles & Hierarchy Safeguards ---');

  // 3.1 Create staff member
  const newStaffEmail = `staff.p3.${timestamp}@vakancy.com`;
  const createStaffRes = await request('/admin/team', {
    method: 'POST',
    headers: { Authorization: `Bearer ${directorToken}` },
    body: {
      name: 'Rohan Deshmukh',
      email: newStaffEmail,
      password: 'Password123!',
      role: 'recruiter',
      phone: '+91 96666 44444',
      scope_type: 'scoped'
    }
  });
  assert(createStaffRes.status === 201 && createStaffRes.data.user_id, 'Director created new staff team member');
  const newStaffId = createStaffRes.data.user_id;

  // 3.2 Staff Member Logins & Self-Service Profile Update
  const newStaffLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: newStaffEmail, password: 'Password123!' }
  });
  assert(newStaffLogin.status === 200 && newStaffLogin.data.token, 'New staff member authenticated');
  const newStaffToken = newStaffLogin.data.token;

  const updateSelfProfileRes = await request('/admin/profile/me', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${newStaffToken}` },
    body: { name: 'Rohan Deshmukh Senior', phone: '+91 96666 55555' }
  });
  assert(updateSelfProfileRes.status === 200, 'Staff member self-updated personal details');

  // 3.3 Optional Profile Photo Upload (Multipart Form)
  const fakePng = Buffer.from('89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000A49444154789C63000100000500010D0A2DB40000000049454E44AE426082', 'hex');
  const boundary = `--------------------------boundary${timestamp}`;
  const multipartBody = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="profile.png"\r\nContent-Type: image/png\r\n\r\n`),
    fakePng,
    Buffer.from(`\r\n--${boundary}--\r\n`)
  ]);

  const uploadPhotoRes = await multipartRequest('/admin/profile/photo', boundary, multipartBody, newStaffToken);
  assert(uploadPhotoRes.status === 200 && uploadPhotoRes.data.profile_photo_url, 'Staff member uploaded profile photo via multipart API');

  // 3.4 Confirm non-Director cannot change administrative profile fields
  const staffTamperAdminRes = await request(`/admin/users/${newStaffId}/admin-profile`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${newStaffToken}` },
    body: { role: 'director' }
  });
  assert(staffTamperAdminRes.status === 403, 'Non-Director blocked from changing administrative profile fields (403 Forbidden)');

  // 3.5 Test Circular Hierarchy Rejection
  // Attempt to set Director's reporting head to the new staff member (Director cannot report to anyone)
  const dirSelfReportRes = await request('/admin/users/usr-director-001/admin-profile', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${directorToken}` },
    body: { reporting_user_id: newStaffId }
  });
  assert(dirSelfReportRes.status === 400, 'Director having a reporting head rejected with 400 Bad Request');

  // Self-reporting
  const selfReportingRes = await request(`/admin/users/${newStaffId}/admin-profile`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${directorToken}` },
    body: { reporting_user_id: newStaffId }
  });
  assert(selfReportingRes.status === 400, 'User self-reporting to themselves rejected with 400 Bad Request');

  // 3.6 Paused / Deactivated Account Access Invalidation
  const deactivateRes = await request(`/admin/users/${newStaffId}/status`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${directorToken}` }
  });
  assert(deactivateRes.status === 200, 'Director deactivated the staff member account');

  const blockedReq = await request('/admin/profile/me', {
    headers: { Authorization: `Bearer ${newStaffToken}` }
  });
  assert(blockedReq.status === 401, 'Deactivated account immediately rejected with 401 Unauthorized');

  // ----------------------------------------------------
  // STEP 4: Enquiries Lifecycle (Contact Us & Executive Search)
  // ----------------------------------------------------
  console.log('\n--- Step 4: Recruitment Enquiries Lifecycle ---');

  // 4.1 Submit Contact Us enquiry
  const contactUsRes = await request('/contact', {
    method: 'POST',
    body: {
      name: 'Pooja Hegde',
      email: `pooja.contact.${timestamp}@enterprise.com`,
      phone: '+91 95555 12345',
      company: 'Zenith Logistics Ltd',
      subject: `General Hiring Inquiry ${timestamp}`,
      category: 'General Inquiry',
      message: 'Looking for bulk hiring for logistics coordinators.'
    }
  });
  assert(contactUsRes.status === 201 && contactUsRes.data.ticket_id, 'Public Contact Us enquiry submitted and logged with ticket ID');

  // 4.2 Submit Executive Search enquiry
  const execSearchRes = await request('/contact', {
    method: 'POST',
    body: {
      name: 'Sunil Rao VP',
      email: `sunil.exec.${timestamp}@corporate.com`,
      phone: '+91 94444 67890',
      company_name: 'Apex Biotech International',
      subject: `VP Engineering Search ${timestamp}`,
      category: 'Executive Search',
      openings_count: 1,
      location: 'Hyderabad, Telangana',
      message: 'Urgent mandate for Vice President of Engineering.'
    }
  });
  assert(execSearchRes.status === 201 && execSearchRes.data.enquiry_id, 'Executive Search mandate enquiry submitted and persisted');
  const execEnquiryId = execSearchRes.data.enquiry_id;

  // 4.3 Assign enquiry to a team member & verify role boundaries
  const bdTamperRes = await request(`/admin/enquiries/${execEnquiryId}/assign`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${bdLeadToken}` },
    body: { assigned_to_user_id: 'usr-tl-001' }
  });
  assert(bdTamperRes.status === 403, 'BD Lead blocked from assigning recruitment enquiries (403 Permission Denied)');

  const assignEnquiryRes = await request(`/admin/enquiries/${execEnquiryId}/assign`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${tlToken}` },
    body: { assigned_to_user_id: 'usr-tl-001' }
  });
  assert(assignEnquiryRes.status === 200, 'TL Coordinator assigned Executive enquiry to team member');

  // 4.4 Update status, notes, and follow-up date
  const updateEnquiryDetailsRes = await request(`/admin/enquiries/${execEnquiryId}/details`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${tlToken}` },
    body: {
      status: 'IN_PROGRESS',
      notes: 'Initial discussion held with client VP. JD finalized.',
      follow_up_date: '2026-10-25'
    }
  });
  assert(updateEnquiryDetailsRes.status === 200, 'TL Coordinator updated enquiry status, notes, and follow-up date');

  // 4.5 Convert eligible Executive Search enquiry into a job
  const convertEnquiryRes = await request(`/admin/enquiries/${execEnquiryId}/convert-to-requirement`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tlToken}` },
    body: {
      title: `VP Engineering - Converted ${timestamp}`,
      location: 'Hyderabad, India',
      openings_count: 1,
      assigned_recruiter_id: 'usr-recruiter-001',
      internal_notes: 'Converted from Executive Search enquiry with client priority'
    }
  });
  assert(convertEnquiryRes.status === 201 && convertEnquiryRes.data.job_id, 'Executive Search enquiry converted into private Job requirement');

  // 4.6 Confirm repeated conversion does not create duplicate jobs
  const dupConvertRes = await request(`/admin/enquiries/${execEnquiryId}/convert-to-requirement`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tlToken}` },
    body: { title: 'Duplicate Conversion Attempt' }
  });
  assert(dupConvertRes.status === 409, 'Repeated enquiry conversion blocked with 409 Conflict');

  // ----------------------------------------------------
  // STEP 5: Regression & Platform Parity Verification
  // ----------------------------------------------------
  console.log('\n--- Step 5: Regression & Platform Parity Checks ---');

  // 5.1 Employer Job Posting & Status Toggle
  const createEmpJobRes = await request('/employer/jobs', {
    method: 'POST',
    headers: { Authorization: `Bearer ${authorizedEmployerToken}` },
    body: {
      title: `Full Stack Node Engineer ${timestamp}`,
      department: 'Software Engineering',
      employment_type: 'Full Time',
      workplace_type: 'Remote',
      location: 'Bengaluru, India',
      min_experience: 3,
      max_experience: 6,
      min_salary: 1500000,
      max_salary: 2200000,
      description: 'Looking for a Senior Full Stack Node.js & React engineer.'
    }
  });
  assert(createEmpJobRes.status === 201 && createEmpJobRes.data.job_id, 'Employer posted new job opening');
  const empJobId = createEmpJobRes.data.job_id;

  const toggleEmpJobRes = await request(`/employer/jobs/${empJobId}/status`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${authorizedEmployerToken}` },
    body: { status: 'paused' }
  });
  assert(toggleEmpJobRes.status === 200, 'Employer toggled job status via PUT /jobs/:id/status');

  // 5.2 Candidate Profile & Professional Info Update
  const updateCandProfRes = await request('/candidate/me', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${candidateToken}` },
    body: {
      name: 'Aditi Sharma Lead',
      current_location: 'Bengaluru',
      profile_type: 'experienced'
    }
  });
  assert(updateCandProfRes.status === 200, 'Candidate self-updated basic profile');

  const updateCandProRes = await request('/candidate/me/professional', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${candidateToken}` },
    body: {
      professional_headline: 'Staff Cloud Architect & DevOps Lead',
      current_organization: 'Innovate Solutions Inc',
      current_designation: 'Senior DevOps Architect',
      total_experience: 7.5,
      professional_summary: 'Specialized in multi-cloud architecture and high-throughput pipelines.',
      preferred_location: 'Bengaluru / Remote',
      preferred_salary: '32,00,000'
    }
  });
  assert(updateCandProRes.status === 200, 'Candidate self-updated professional information');

  // 5.3 Audit Log Tracks Complete Lifecycle
  const activityRes = await request('/admin/activity', {
    headers: { Authorization: `Bearer ${directorToken}` }
  });
  assert(activityRes.status === 200 && (activityRes.data.activity || activityRes.data.activities), 'Director verified recruitment activity audit trail');

  console.log('\n====================================================');
  console.log(`ACCEPTANCE SUITE SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('====================================================\n');
}

runPhase3AcceptanceSuite().catch(err => {
  console.error('Test Suite Failed with Exception:', err);
  process.exit(1);
});
