const assert = require('assert');

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
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function login(email, password) {
  const res = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  assert(res.status === 200 && res.data.success, `Login failed for ${email}: ${JSON.stringify(res.data)}`);
  return res.data.token;
}

async function runTests() {
  console.log('===============================================================');
  console.log('🧪 Starting Phase E: Executive Search & Recruiter Assignment Validation');
  console.log('===============================================================');

  // 1. Authenticate Actors
  console.log('\n--- 1. Authenticating Roles ---');
  const directorToken = await login('director@vakancy.com', 'password123');
  console.log('✅ Director authenticated');

  const recruiter1Token = await login('recruiter@vakancy.com', 'password123');
  console.log('✅ Recruiter 1 (Vakancy Operations Specialist) authenticated');

  const recruiter2Token = await login('kavita.recruiter.122390@vakancy.com', 'password123');
  console.log('✅ Recruiter 2 (Kavita Sen) authenticated');

  const bdToken = await login('bdlead@vakancy.com', 'password123');
  console.log('✅ BD User (Devang) authenticated');

  // Create an isolated test Executive Search enquiry for this test run
  console.log('\n--- Setting up Isolated Test Enquiry ---');
  const timestamp = Date.now();
  const testCompany = `Apex Aerospace Mandate ${timestamp}`;
  const testContact = `Vikramaditya Rao ${timestamp}`;
  const testEmail = `vikram.${timestamp}@apexaero.com`;
  const testPhone = `+9198765${String(timestamp).slice(-5)}`;
  const testSubject = `Chief Technology Officer (CTO)`;
  
  // Submit enquiry via public contact / executive search API
  const submitRes = await request('/contact', {
    method: 'POST',
    body: JSON.stringify({
      name: testContact,
      email: testEmail,
      phone: testPhone,
      company_name: testCompany,
      subject: testSubject,
      category: 'EXECUTIVE_SEARCH',
      openings_count: 2,
      location: 'Bengaluru / Hybrid',
      message: 'Urgent mandate for Series B aerospace tech startup. Looking for 15+ years experience.'
    })
  });
  assert(submitRes.status === 200 || submitRes.status === 201, `Failed to submit test enquiry: ${JSON.stringify(submitRes.data)}`);
  console.log('✅ Created test executive search enquiry for', testCompany);

  // Scenario 1: Executive Search enquiry appears in Admin
  console.log('\n--- Scenario 1: Executive Search Enquiry in Admin Table ---');
  const dirEnqRes = await request('/admin/enquiries?search=' + encodeURIComponent(testCompany), {
    headers: { Authorization: `Bearer ${directorToken}` }
  });
  assert(dirEnqRes.status === 200 && dirEnqRes.data.success, 'Director failed to fetch enquiries');
  const testEnq = dirEnqRes.data.enquiries.find(e => e.company_name === testCompany || e.contact_email === testEmail);
  assert(testEnq, `Test enquiry not found in Director enquiry list`);
  console.log(`✅ Scenario 1 Passed: Enquiry #${testEnq.id} found in Admin. Status: ${testEnq.status}`);
  assert(testEnq.status === 'NEW', 'Newly created enquiry should have status NEW');

  // Scenario 2 & 3: Director assigns enquiry to active Recruiter 1
  console.log('\n--- Scenario 2 & 3: Director Assigns Enquiry to Recruiter 1 ---');
  const assignRes = await request(`/admin/enquiries/${testEnq.id}/assign`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${directorToken}` },
    body: JSON.stringify({ assigned_to_user_id: 'usr-recruiter-001' })
  });
  assert(assignRes.status === 200 && assignRes.data.success, `Assignment failed: ${JSON.stringify(assignRes.data)}`);
  console.log('✅ Assignment API response:', assignRes.data.message);

  // Verify assigned recruiter name appears in enquiry details and status is ASSIGNED
  const assignedCheckRes = await request(`/admin/enquiries?search=${encodeURIComponent(testCompany)}`, {
    headers: { Authorization: `Bearer ${directorToken}` }
  });
  const updatedEnq = assignedCheckRes.data.enquiries.find(e => e.id === testEnq.id);
  assert(updatedEnq.assigned_to_user_id === 'usr-recruiter-001', 'Assigned user ID mismatch');
  assert(updatedEnq.assigned_to_name, 'Assigned recruiter name must be returned');
  assert(updatedEnq.status === 'ASSIGNED', `Status should have transitioned to ASSIGNED (got ${updatedEnq.status})`);
  console.log(`✅ Scenario 2 & 3 Passed: Enquiry assigned to '${updatedEnq.assigned_to_name}'. Status is '${updatedEnq.status}'`);

  // Scenario 4: Recruiter 1 logs in and sees the assigned enquiry
  console.log('\n--- Scenario 4: Recruiter 1 Sees Assigned Enquiry in Workspace ---');
  const r1ListRes = await request('/admin/enquiries', {
    headers: { Authorization: `Bearer ${recruiter1Token}` }
  });
  assert(r1ListRes.status === 200 && r1ListRes.data.success, 'Recruiter 1 failed to fetch enquiries');
  const r1Found = r1ListRes.data.enquiries.find(e => e.id === testEnq.id);
  assert(r1Found, 'Recruiter 1 must see their assigned enquiry');
  assert(r1Found.contact_email === testEmail, 'Assigned recruiter must see unmasked contact email');
  assert(r1Found.contact_phone === testPhone, 'Assigned recruiter must see unmasked contact phone');
  console.log(`✅ Scenario 4 Passed: Recruiter 1 successfully sees assigned enquiry with full contact details`);

  // Scenario 5: Another recruiter (Recruiter 2) cannot see or modify it
  console.log('\n--- Scenario 5: Recruiter 2 Cannot Access or Modify Recruiter 1 Enquiry ---');
  const r2ListRes = await request('/admin/enquiries', {
    headers: { Authorization: `Bearer ${recruiter2Token}` }
  });
  assert(r2ListRes.status === 200 && r2ListRes.data.success, 'Recruiter 2 failed to fetch enquiries');
  const r2Found = r2ListRes.data.enquiries.find(e => e.id === testEnq.id);
  assert(!r2Found, 'Recruiter 2 must NOT see another recruiter\'s private assigned enquiry');

  // Attempt direct status update by Recruiter 2 on Recruiter 1's enquiry
  const r2TamperRes = await request(`/admin/enquiries/${testEnq.id}/status`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${recruiter2Token}` },
    body: JSON.stringify({ status: 'RESOLVED' })
  });
  assert(r2TamperRes.status === 403, `Recruiter 2 should be forbidden from modifying enquiry (got ${r2TamperRes.status})`);
  assert(r2TamperRes.data.code === 'SCOPE_ACCESS_DENIED', `Expected SCOPE_ACCESS_DENIED (got ${r2TamperRes.data.code})`);

  // Attempt direct history access by Recruiter 2
  const r2HistoryRes = await request(`/admin/enquiries/${testEnq.id}/history`, {
    headers: { Authorization: `Bearer ${recruiter2Token}` }
  });
  assert(r2HistoryRes.status === 403, `Recruiter 2 should be forbidden from viewing history (got ${r2HistoryRes.status})`);
  console.log(`✅ Scenario 5 Passed: Recruiter 2 strictly isolated with 403 SCOPE_ACCESS_DENIED`);

  // Scenario 6 & 7: Recruiter 1 adds a follow-up note and updates status to IN_PROGRESS
  console.log('\n--- Scenario 6 & 7: Recruiter 1 Adds Follow-up Note & Updates Status ---');
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const updateDetailsRes = await request(`/admin/enquiries/${testEnq.id}/details`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${recruiter1Token}` },
    body: JSON.stringify({
      status: 'IN_PROGRESS',
      notes: 'Spoke with Mr. Rao regarding CTO role. Candidate requirements confirmed: aerospace background, 15+ years experience, Bengaluru base.',
      follow_up_date: nextWeek
    })
  });
  assert(updateDetailsRes.status === 200 && updateDetailsRes.data.success, `Failed to update details: ${JSON.stringify(updateDetailsRes.data)}`);
  console.log(`✅ Scenario 6 & 7 Passed: Recruiter 1 recorded follow-up notes and set status to IN_PROGRESS`);

  // Scenario 8: Director sees updated history in RECRUITMENT_ACTIVITY
  console.log('\n--- Scenario 8: Director Views Full Activity Audit History ---');
  const historyRes = await request(`/admin/enquiries/${testEnq.id}/history`, {
    headers: { Authorization: `Bearer ${directorToken}` }
  });
  assert(historyRes.status === 200 && historyRes.data.success, 'Failed to fetch enquiry history');
  const history = historyRes.data.history;
  assert(history.length >= 2, `Expected at least 2 activity entries, got ${history.length}`);
  const assignEvent = history.find(h => h.action_type === 'ASSIGN_ENQUIRY');
  const noteEvent = history.find(h => h.action_type === 'ADD_ENQUIRY_NOTE');
  const statusEvent = history.find(h => h.action_type === 'UPDATE_ENQUIRY_STATUS' && h.new_value === 'IN_PROGRESS');
  assert(assignEvent, 'Missing ASSIGN_ENQUIRY audit log');
  assert(noteEvent, 'Missing ADD_ENQUIRY_NOTE audit log');
  assert(statusEvent, 'Missing UPDATE_ENQUIRY_STATUS audit log');
  console.log(`✅ Scenario 8 Passed: Complete chronological audit logs verified (${history.length} events logged with actor/timestamp)`);

  // Scenario 9: Recruiter 1 creates Job from Enquiry
  console.log('\n--- Scenario 9: Recruiter 1 Creates Job from Enquiry ---');
  const createJobRes = await request(`/admin/enquiries/${testEnq.id}/create-job`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${recruiter1Token}` },
    body: JSON.stringify({
      title: 'Chief Technology Officer (Aerospace Systems)',
      openings_count: 1,
      location: 'Bengaluru, Karnataka',
      manual_company_name: testCompany,
      manual_contact_person: testContact,
      manual_contact_phone: testPhone,
      manual_contact_email: testEmail,
      department: 'Engineering & Technology',
      job_domain: 'Aerospace & Defense',
      employment_type: 'Full-Time',
      workplace_type: 'Hybrid',
      seniority_level: 'Director / Executive',
      min_experience: 15,
      max_experience: 25,
      min_salary: 4500000,
      max_salary: 7000000,
      required_skills: ['Avionics', 'System Architecture', 'Aerospace Engineering', 'Team Leadership'],
      description: 'Lead next-generation aerospace defense tech division.',
      status: 'open'
    })
  });
  assert(createJobRes.status === 201 && createJobRes.data.success, `Failed to create job from enquiry: ${JSON.stringify(createJobRes.data)}`);
  const createdJobId = createJobRes.data.job_id;
  console.log(`✅ Scenario 9 Passed: Job Requisition created with ID: ${createdJobId}`);

  // Scenario 10: Linked Job appears in Enquiry Details & Enquiry status remains IN_PROGRESS
  console.log('\n--- Scenario 10: Verify Linked Job and Enquiry Integrity ---');
  const linkedJobsRes = await request(`/admin/enquiries/${testEnq.id}/jobs`, {
    headers: { Authorization: `Bearer ${recruiter1Token}` }
  });
  assert(linkedJobsRes.status === 200 && linkedJobsRes.data.success, 'Failed to fetch linked jobs');
  assert(linkedJobsRes.data.jobs.length >= 1, 'Expected at least 1 linked job');
  const linked = linkedJobsRes.data.jobs.find(j => j.id === createdJobId);
  assert(linked, 'Created job not found in enquiry linked jobs list');
  assert(linked.source_type === 'EXECUTIVE_SEARCH', 'Source type must be EXECUTIVE_SEARCH');
  console.log(`✅ Linked job verified: "${linked.title}" (Status: ${linked.status}, Source: ${linked.source_type})`);

  // Verify enquiry status was NOT marked RESOLVED solely because of job creation
  const postJobEnqCheck = await request(`/admin/enquiries?search=${encodeURIComponent(testCompany)}`, {
    headers: { Authorization: `Bearer ${directorToken}` }
  });
  const postJobEnq = postJobEnqCheck.data.enquiries.find(e => e.id === testEnq.id);
  assert(postJobEnq.status === 'IN_PROGRESS', `Enquiry status should remain IN_PROGRESS, got: ${postJobEnq.status}`);
  assert(postJobEnq.linked_jobs_count >= 1, `Enquiry linked_jobs_count should be >= 1 (got ${postJobEnq.linked_jobs_count})`);
  console.log(`✅ Scenario 10 Passed: Enquiry remains '${postJobEnq.status}', linked_jobs_count = ${postJobEnq.linked_jobs_count}`);

  // Scenario 11: BD Cannot Access Executive Search Enquiries
  console.log('\n--- Scenario 11: BD Role Privacy Boundary Verification ---');
  const bdEnqRes = await request('/admin/enquiries', {
    headers: { Authorization: `Bearer ${bdToken}` }
  });
  assert(bdEnqRes.status === 403, `BD should receive 403 Forbidden for enquiries (got ${bdEnqRes.status})`);
  assert(bdEnqRes.data.code === 'PRIVACY_PROTECTION_ACCESS_DENIED', `Expected PRIVACY_PROTECTION_ACCESS_DENIED (got ${bdEnqRes.data.code})`);
  console.log(`✅ Scenario 11 Passed: BD role receives 403 PRIVACY_PROTECTION_ACCESS_DENIED when attempting to access enquiries`);

  // Scenario 12: Existing BD Leads and Employer Portal functionality intact
  console.log('\n--- Scenario 12: BD Leads and Employer Portal Stability ---');
  const bdLeadsRes = await request('/admin/leads', {
    headers: { Authorization: `Bearer ${bdToken}` }
  });
  assert(bdLeadsRes.status === 200 && bdLeadsRes.data.success, 'BD user failed to fetch BD leads');
  console.log(`✅ BD Leads functional: ${bdLeadsRes.data.leads ? bdLeadsRes.data.leads.length : 0} leads returned`);

  const publicJobsRes = await request('/jobs');
  assert(publicJobsRes.status === 200, 'Public jobs endpoint failed');
  console.log('✅ Public job portal functional');

  console.log('\n===============================================================');
  console.log('🎉 ALL 12 PHASE E ACCEPTANCE SCENARIOS PASSED SUCCESSFULLY');
  console.log('===============================================================');
}

runTests().catch((err) => {
  console.error('\n❌ TEST FAILURE:', err);
  process.exit(1);
});
