/**
 * Security and Authorization Audit Suite for Vakancy.in
 * Validates role boundaries, data scoping, multi-tenant IDOR protection,
 * deactivated account protection, custom role action gates, and sharing controls.
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

async function runSecurityAudit() {
  console.log('====================================================');
  console.log('STARTING VAKANCY.IN SECURITY & AUTHORIZATION AUDIT');
  console.log('====================================================\n');

  try {
    // 1. Authenticate Personas
    console.log('Test 1: Authenticating Internal Staff & Operational Roles...');
    const directorSession = await login('director@vakancy.com', 'password123');
    const dHeaders = { Authorization: `Bearer ${directorSession.token}` };

    const bdSession = await login('bdlead@vakancy.com', 'password123');
    const bdHeaders = { Authorization: `Bearer ${bdSession.token}` };

    const tlSession = await login('tl@vakancy.com', 'password123');
    const tlHeaders = { Authorization: `Bearer ${tlSession.token}` };

    const recruiterSession = await login('recruiter@vakancy.com', 'password123');
    const rHeaders = { Authorization: `Bearer ${recruiterSession.token}` };

    assert(Boolean(directorSession.token), 'Director authentication successful');
    assert(Boolean(bdSession.token), 'BD Lead authentication successful');
    assert(Boolean(tlSession.token), 'TL Coordinator authentication successful');
    assert(Boolean(recruiterSession.token), 'Recruiter authentication successful');

    // 2. Role Boundaries: Recruitment Operations Modules
    console.log('\nTest 2: Role-Based Access Control Module Boundaries...');
    // BD Lead attempting to access candidate management module (not permitted in RBAC)
    const bdCandidatesRes = await request('/admin/candidates', { headers: bdHeaders });
    assert(bdCandidatesRes.status === 403, 'BD Lead blocked from candidate ATS database (403 Permission Denied)');

    // Recruiter attempting to access BD Leads pipeline (not permitted in RBAC)
    const recruiterLeadsRes = await request('/admin/leads', { headers: rHeaders });
    assert(recruiterLeadsRes.status === 403, 'Recruiter blocked from BD Leads module (403 Permission Denied)');

    // Recruiter attempting to access Employer management module (not permitted in RBAC)
    const recruiterEmployersRes = await request('/admin/employers', { headers: rHeaders });
    assert(recruiterEmployersRes.status === 403, 'Recruiter blocked from corporate employer management (403)');

    // 3. Custom Roles & Dynamic Permission Enforcement
    console.log('\nTest 3: Dynamic Custom Roles & Permission Matrix...');
    const customRoleKey = `audit_role_${Date.now()}`;
    const createRoleRes = await request('/admin/roles', {
      method: 'POST',
      headers: dHeaders,
      body: JSON.stringify({
        role_key: customRoleKey,
        display_name: 'Auditor Specialist',
        description: 'Read-only audit inspector role'
      })
    });
    assert(createRoleRes.status === 201, 'Director can dynamically create custom roles into ROLES master table');

    // Non-Director attempting to create custom role
    const nonDirectorRoleRes = await request('/admin/roles', {
      method: 'POST',
      headers: rHeaders,
      body: JSON.stringify({
        role_key: 'hacker_role',
        display_name: 'Unauthorized Role'
      })
    });
    assert(nonDirectorRoleRes.status === 403, 'Non-Director blocked from creating custom roles (403)');

    // 4. Data Scoping & Unassigned Job Isolation
    console.log('\nTest 4: Record-Level Isolation & Least-Privilege Scoping...');
    // Create an unassigned test candidate to verify scoping
    // Candidate details query by recruiter without job scope
    const randomCandidateId = 'cnd-confidential-isolated-999';
    const recruiterDirectCandRes = await request(`/admin/candidates/${randomCandidateId}`, { headers: rHeaders });
    assert(recruiterDirectCandRes.status === 403, 'Recruiter querying unassigned candidate profile denied with 403 (Scope Violation)');

    // 5. Multi-Tenant IDOR Protection on Employer Endpoints
    console.log('\nTest 5: Multi-Tenant Job & Applicant Ownership Hardening...');
    // Create an admin internal job (employer_id = null)
    const internalJobRes = await request('/admin/jobs', {
      method: 'POST',
      headers: dHeaders,
      body: JSON.stringify({
        title: `Confidential Mandate ${Date.now()}`,
        status: 'open',
        is_internal_only: true
      })
    });
    const internalJobId = internalJobRes.body.job_id;

    // Create a temporary employer user to test cross-tenant isolation
    const tempEmployerEmail = `test.emp.${Date.now()}@corporate.com`;
    await request('/admin/team', {
      method: 'POST',
      headers: dHeaders,
      body: JSON.stringify({
        email: tempEmployerEmail,
        password: 'Password123!',
        role: 'employer',
        name: 'Independent Corp'
      })
    });
    const empLogin = await login(tempEmployerEmail, 'Password123!');
    const empHeaders = { Authorization: `Bearer ${empLogin.token}` };

    // Employer attempts to view applicants for an internal admin job (employer_id = null)
    const empViewInternalJobApps = await request(`/employers/jobs/${internalJobId}/applicants`, { headers: empHeaders });
    assert(empViewInternalJobApps.status === 403, 'Employer viewing applicants of unowned/internal job blocked (403 Access Denied)');

    // Employer attempts to edit an unowned job
    const empEditInternalJob = await request(`/employers/jobs/${internalJobId}`, {
      method: 'PUT',
      headers: empHeaders,
      body: JSON.stringify({ title: 'Tampered Title' })
    });
    assert(empEditInternalJob.status === 403, 'Employer editing unowned job blocked with 403 (IDOR Protection)');

    // Employer attempts to toggle status of unowned job
    const empToggleInternalJob = await request(`/employers/jobs/${internalJobId}/status`, {
      method: 'PUT',
      headers: empHeaders,
      body: JSON.stringify({ status: 'closed' })
    });
    assert(empToggleInternalJob.status === 403, 'Employer toggling status of unowned job blocked with 403 (IDOR Protection)');

    // Employer attempts to publish unowned job
    const empPublishInternalJob = await request(`/employers/jobs/${internalJobId}/publish`, {
      method: 'POST',
      headers: empHeaders
    });
    assert(empPublishInternalJob.status === 403, 'Employer publishing unowned job blocked with 403 (IDOR Protection)');

    // 6. Resume Access, Candidate Consent & Expiration Enforcement
    console.log('\nTest 6: Gated Resume Proxy & Consent Verification...');
    // Direct attempt to fetch resume file for unauthorized candidate
    const empResumeRes = await request(`/employers/resumes/res-unauthorized-001`, { headers: empHeaders });
    assert(empResumeRes.status === 403 || empResumeRes.status === 404, 'Employer access to unconsented / unapplied candidate resume blocked');

    // 7. Protected API Access on Deactivated Accounts
    console.log('\nTest 7: Deactivated & Paused Account Invalidation...');
    // Create temporary staff user to test deactivation
    const tempStaffEmail = `staff.temp.${Date.now()}@vakancy.com`;
    const createStaffRes = await request('/admin/team', {
      method: 'POST',
      headers: dHeaders,
      body: JSON.stringify({
        email: tempStaffEmail,
        password: 'Password123!',
        role: 'recruiter',
        name: 'Temporary Staff'
      })
    });
    const tempStaffSession = await login(tempStaffEmail, 'Password123!');
    const tempStaffHeaders = { Authorization: `Bearer ${tempStaffSession.token}` };

    // Verify account works before deactivation
    const preDeactRes = await request('/admin/profile/me', { headers: tempStaffHeaders });
    assert(preDeactRes.ok, 'Active staff account can access profile');

    // Deactivate the staff account via Director API
    const allUsersRes = await request('/admin/users', { headers: dHeaders });
    const tempUserObj = (allUsersRes.body.users || []).find(u => u.email === tempStaffEmail);
    assert(Boolean(tempUserObj), 'Temporary staff account located');

    const toggleRes = await request(`/admin/users/${tempUserObj.id}/status`, {
      method: 'PUT',
      headers: dHeaders
    });
    assert(toggleRes.ok, 'Director successfully deactivated temporary staff account');

    // Now test accessing protected endpoint with the existing valid JWT token
    const postDeactRes = await request('/admin/profile/me', { headers: tempStaffHeaders });
    assert(postDeactRes.status === 401, 'Deactivated account immediately rejected with 401 on protected routes');

    // 8. Administrative Tampering & Governance Guards
    console.log('\nTest 8: Governance Tampering & Sole Director Safeguards...');
    // Recruiter attempts to modify administrative role of another user
    const tamperRoleRes = await request(`/admin/users/${directorSession.user.id}/admin-profile`, {
      method: 'PUT',
      headers: rHeaders,
      body: JSON.stringify({ role: 'recruiter' })
    });
    assert(tamperRoleRes.status === 403, 'Recruiter forbidden from modifying administrative roles (403)');

    // BD Lead attempts to verify commercial payment
    const fakeCommId = 'comm-test-999';
    const bdVerifyPayRes = await request(`/admin/commercials/${fakeCommId}/verify`, {
      method: 'PUT',
      headers: bdHeaders,
      body: JSON.stringify({ notes: 'BD attempt' })
    });
    assert(bdVerifyPayRes.status === 403, 'Non-Director blocked from verifying commercial payment (403)');

    console.log('\n====================================================');
    console.log(`SECURITY AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during security audit:', err);
    process.exit(1);
  }
}

runSecurityAudit();
