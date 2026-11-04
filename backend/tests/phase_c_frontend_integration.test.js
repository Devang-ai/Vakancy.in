/**
 * Vakancy.in — Phase C: BD Leads Admin Frontend & Workflow Integration Test Suite
 * Validates:
 * 1. BD creates lead and sees it in My Submitted Leads.
 * 2. Recruiter sees lead in Shared Queue (unclaimed).
 * 3. Recruiter 1 successfully claims it via Take Lead.
 * 4. Recruiter 2 cannot claim it (HTTP 409 Conflict).
 * 5. Recruiter updates follow-up status (CONTACTED, REQUIREMENTS_GATHERED).
 * 6. Director reassigns lead to another recruiter.
 * 7. BD is strictly forbidden from viewing candidate profiles and applications.
 * 8. Linked job creation works through AdminJobFormModal payload contract:
 *    - Full job specs persisted
 *    - Status transitions to CONVERTED_TO_JOB
 *    - lead_id and client_id linked
 *    - PERSISTED RECRUITMENT_ACTIVITY audit recorded
 * 9. Duplicate pre-check returns warning matches.
 * 10. Frontend architecture & code invariants:
 *    - Route registered in App.jsx
 *    - Sidebar navigation item in AdminLayout.jsx
 *    - Role labels configured
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const db = require('../config/db');
const { app } = require('../server');

let server;
let baseUrl;

function httpRequest(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`);
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
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (_) {
          json = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

// User credentials and tokens
let bdUserToken;
let recruiter1Token, recruiter2Token;
let directorToken;

let bdUserId;
let recruiter1Id, recruiter2Id;
let directorId;

test.before(async () => {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_TEST_MODE = 'isolated-mysql';
  process.env.TEST_DB_HOST = process.env.TEST_DB_HOST || '127.0.0.1';
  process.env.TEST_DB_PORT = process.env.TEST_DB_PORT || '3306';
  process.env.TEST_DB_USER = process.env.TEST_DB_USER || 'vakancy_tester';
  process.env.TEST_DB_PASSWORD = process.env.TEST_DB_PASSWORD;
  process.env.TEST_DB_NAME = process.env.TEST_DB_NAME || 'vakancy_test_phase5';
  process.env.TEST_DB_RESET_ACK = 'I_UNDERSTAND_THIS_DATABASE_IS_DISPOSABLE';

  await db.initDB();

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  const pwHash = await bcrypt.hash('TestPass@123', 8);

  // 1. Provision BD User
  bdUserId = 'usr-pc-bd-' + uuidv4().slice(0, 8);
  const bdEmail = `${bdUserId}@test.vakancy.in`;
  await db.query(`
    INSERT INTO USERS (id, email, password_hash, role, name, is_active, is_main_admin)
    VALUES (?, ?, ?, 'bd', 'BD Specialist Priya', 1, 0)
  `, [bdUserId, bdEmail, pwHash]);

  // 2. Provision Recruiter 1
  recruiter1Id = 'usr-pc-rec1-' + uuidv4().slice(0, 8);
  const rec1Email = `${recruiter1Id}@test.vakancy.in`;
  await db.query(`
    INSERT INTO USERS (id, email, password_hash, role, name, is_active, is_main_admin)
    VALUES (?, ?, ?, 'recruiter', 'Recruiter Rahul', 1, 0)
  `, [recruiter1Id, rec1Email, pwHash]);

  // 3. Provision Recruiter 2
  recruiter2Id = 'usr-pc-rec2-' + uuidv4().slice(0, 8);
  const rec2Email = `${recruiter2Id}@test.vakancy.in`;
  await db.query(`
    INSERT INTO USERS (id, email, password_hash, role, name, is_active, is_main_admin)
    VALUES (?, ?, ?, 'recruiter', 'Recruiter Ananya', 1, 0)
  `, [recruiter2Id, rec2Email, pwHash]);

  // 4. Provision Director
  directorId = 'usr-pc-dir-' + uuidv4().slice(0, 8);
  const dirEmail = `${directorId}@test.vakancy.in`;
  await db.query(`
    INSERT INTO USERS (id, email, password_hash, role, name, is_active, is_main_admin)
    VALUES (?, ?, ?, 'director', 'Platform Director', 1, 1)
  `, [directorId, dirEmail, pwHash]);

  // Login each user to obtain real JWTs
  const bdLogin = await httpRequest('/api/auth/login', { method: 'POST', body: { email: bdEmail, password: 'TestPass@123' } });
  bdUserToken = bdLogin.data.token;

  const rec1Login = await httpRequest('/api/auth/login', { method: 'POST', body: { email: rec1Email, password: 'TestPass@123' } });
  recruiter1Token = rec1Login.data.token;

  const rec2Login = await httpRequest('/api/auth/login', { method: 'POST', body: { email: rec2Email, password: 'TestPass@123' } });
  recruiter2Token = rec2Login.data.token;

  const dirLogin = await httpRequest('/api/auth/login', { method: 'POST', body: { email: dirEmail, password: 'TestPass@123' } });
  directorToken = dirLogin.data.token;
});

let sharedTestLeadId;

test('Phase C — 1. BD creates lead and sees it in My Submitted Leads', async () => {
  const companyName = 'Quantix Robotics Technologies Pvt Ltd ' + uuidv4().slice(0, 4);

  const res = await httpRequest('/api/admin/leads', {
    method: 'POST',
    headers: { Authorization: `Bearer ${bdUserToken}` },
    body: {
      company_name: companyName,
      contact_person_name: 'Dr. Vikram Malhotra',
      contact_phone: '+91 98111 22334',
      contact_email: 'hiring@quantixrobotics.io',
      city: 'Pune',
      website: 'https://quantixrobotics.io',
      notes: 'Immediate opening for 3 Computer Vision specialists with ROS experience.',
      confirmed_hiring_interest: true
    }
  });

  assert.equal(res.status, 201);
  assert.equal(res.data.success, true);
  assert.ok(res.data.lead && res.data.lead.id);
  assert.equal(res.data.lead.status, 'UNCLAIMED');

  sharedTestLeadId = res.data.lead.id;

  // Verify BD sees it in their leads list
  const listRes = await httpRequest('/api/admin/leads', {
    headers: { Authorization: `Bearer ${bdUserToken}` }
  });
  assert.equal(listRes.status, 200);
  assert.equal(listRes.data.success, true);
  const found = listRes.data.leads.find(l => l.id === sharedTestLeadId);
  assert.ok(found, 'Lead must be visible in BD list');
  assert.equal(found.company_name, companyName);
  assert.equal(found.status, 'UNCLAIMED');
});

test('Phase C — 2. Recruiter sees lead in Shared Queue (unclaimed)', async () => {
  const queueRes = await httpRequest('/api/admin/leads?queue=unclaimed', {
    headers: { Authorization: `Bearer ${recruiter1Token}` }
  });

  assert.equal(queueRes.status, 200);
  assert.equal(queueRes.data.success, true);
  const found = queueRes.data.leads.find(l => l.id === sharedTestLeadId);
  assert.ok(found, 'Lead must be visible in Recruiter Shared Queue');
  assert.equal(found.status, 'UNCLAIMED');
  assert.equal(found.claimed_by_recruiter_id, null);
  assert.ok(found.bd_user_name, 'BD Submitter name must be populated');
});

test('Phase C — 3. Recruiter 1 successfully claims lead via Take Lead', async () => {
  const claimRes = await httpRequest(`/api/admin/leads/${sharedTestLeadId}/claim`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${recruiter1Token}` }
  });

  assert.equal(claimRes.status, 200);
  assert.equal(claimRes.data.success, true);

  // Verify it appears in Recruiter 1's "My Leads"
  const myLeadsRes = await httpRequest('/api/admin/leads?queue=my', {
    headers: { Authorization: `Bearer ${recruiter1Token}` }
  });
  assert.equal(myLeadsRes.status, 200);
  const found = myLeadsRes.data.leads.find(l => l.id === sharedTestLeadId);
  assert.ok(found, 'Lead must appear in Recruiter 1 My Leads');
  assert.equal(found.status, 'CLAIMED');
  assert.equal(found.claimed_by_recruiter_id, recruiter1Id);
});

test('Phase C — 4. Recruiter 2 cannot claim already claimed lead (HTTP 409 Conflict)', async () => {
  const claimRes = await httpRequest(`/api/admin/leads/${sharedTestLeadId}/claim`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${recruiter2Token}` }
  });

  assert.equal(claimRes.status, 409);
  assert.equal(claimRes.data.success, false);
  assert.equal(claimRes.data.code, 'LEAD_ALREADY_CLAIMED');
});

test('Phase C — 5. Recruiter 1 updates follow-up status', async () => {
  // Update to CONTACTED
  const res1 = await httpRequest(`/api/admin/leads/${sharedTestLeadId}/status`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${recruiter1Token}` },
    body: {
      status: 'CONTACTED',
      notes: 'Initial discovery call completed. Client requested detailed profile specifications.'
    }
  });
  assert.equal(res1.status, 200);
  assert.equal(res1.data.lead.status, 'CONTACTED');

  // Update to REQUIREMENTS_GATHERED
  const res2 = await httpRequest(`/api/admin/leads/${sharedTestLeadId}/status`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${recruiter1Token}` },
    body: {
      status: 'REQUIREMENTS_GATHERED',
      notes: 'Hiring budget confirmed: 25-35 LPA. 3 openings for Lead Vision Engineer.'
    }
  });
  assert.equal(res2.status, 200);
  assert.equal(res2.data.lead.status, 'REQUIREMENTS_GATHERED');
});

test('Phase C — 6. Director reassigns lead to Recruiter 2', async () => {
  const reassignRes = await httpRequest(`/api/admin/leads/${sharedTestLeadId}/reassign`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${directorToken}` },
    body: {
      new_recruiter_id: recruiter2Id,
      notes: 'Reassigned to Ananya for domain expertise in robotics.'
    }
  });

  assert.equal(reassignRes.status, 200);
  assert.equal(reassignRes.data.success, true);
  assert.equal(reassignRes.data.new_recruiter_id, recruiter2Id);
});

test('Phase C — 7. BD role is strictly forbidden from candidate profiles and applications', async () => {
  const candRes = await httpRequest('/api/admin/candidates', {
    headers: { Authorization: `Bearer ${bdUserToken}` }
  });
  assert.equal(candRes.status, 403);

  const appRes = await httpRequest('/api/admin/applications', {
    headers: { Authorization: `Bearer ${bdUserToken}` }
  });
  assert.equal(appRes.status, 403);
});

test('Phase C — 8. Lead-to-job conversion works with full AdminJobFormModal payload', async () => {
  // Full payload structured exactly as produced by AdminJobFormModal.jsx
  const fullJobPayload = {
    title: 'Lead Computer Vision Engineer',
    category_id: null,
    department: 'Autonomous Systems',
    job_domain: 'Robotics & AI',
    employment_type: 'full-time',
    workplace_type: 'onsite',
    location: 'Pune',
    city: 'Pune',
    min_salary: 2500000,
    max_salary: 3500000,
    salary_currency: 'INR',
    salary_period: 'yearly',
    is_salary_negotiable: true,
    min_experience: 5,
    max_experience: 10,
    openings_count: 3,
    required_skills: ['ROS2', 'PyTorch', 'C++', 'OpenCV', 'SLAM'],
    keywords: ['Computer Vision', 'Robotics', 'Autonomous'],
    education_qualification: "Bachelor's / Master's in Robotics or CS",
    job_description: 'Architect and deploy production computer vision pipelines for autonomous mobile robots.',
    responsibilities: 'Lead camera-lidar sensor fusion team and optimize edge inferences.',
    benefits: ['Health Insurance', 'Performance Bonus', 'Stock Options']
  };

  const convertRes = await httpRequest(`/api/admin/leads/${sharedTestLeadId}/convert-job`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${recruiter2Token}` },
    body: fullJobPayload
  });

  assert.equal(convertRes.status, 201);
  assert.equal(convertRes.data.success, true);
  assert.ok(convertRes.data.data && convertRes.data.data.job_id);
  assert.equal(convertRes.data.data.lead_id, sharedTestLeadId);
  assert.ok(convertRes.data.data.client_id, 'Client entity must be created and linked');
  assert.equal(convertRes.data.data.title, 'Lead Computer Vision Engineer');

  // Verify full lead details endpoint returns linked job and recruitment activity
  const detailsRes = await httpRequest(`/api/admin/leads/${sharedTestLeadId}`, {
    headers: { Authorization: `Bearer ${recruiter2Token}` }
  });
  assert.equal(detailsRes.status, 200);
  assert.equal(detailsRes.data.lead.status, 'CONVERTED_TO_JOB');
  assert.ok(detailsRes.data.lead.jobs.length >= 1, 'Linked jobs array must contain created job');
  assert.equal(detailsRes.data.lead.jobs[0].title, 'Lead Computer Vision Engineer');

  // Verify RECRUITMENT_ACTIVITY contains CONVERT_LEAD_TO_JOB
  const convertActivity = detailsRes.data.lead.activity_history.find(a => a.action_type === 'CONVERT_LEAD_TO_JOB');
  assert.ok(convertActivity, 'Audit trail must include CONVERT_LEAD_TO_JOB');
});

test('Phase C — 9. Duplicate company pre-check returns warnings', async () => {
  const checkRes = await httpRequest('/api/admin/leads/check-duplicate?name=Quantix%20Robotics', {
    headers: { Authorization: `Bearer ${bdUserToken}` }
  });

  assert.equal(checkRes.status, 200);
  assert.equal(checkRes.data.success, true);
  assert.ok(checkRes.data.matches && checkRes.data.matches.length > 0);
  assert.ok(checkRes.data.matches.some(m => m.name.includes('Quantix Robotics')));
});

test('Phase C — 10. Frontend Architecture Invariants', () => {
  const appPath = path.resolve(__dirname, '../../admin-frontend/src/App.jsx');
  const layoutPath = path.resolve(__dirname, '../../admin-frontend/src/components/layout/AdminLayout.jsx');
  const leadsPagePath = path.resolve(__dirname, '../../admin-frontend/src/pages/AdminLeads.jsx');
  const jobModalPath = path.resolve(__dirname, '../../admin-frontend/src/components/jobs/AdminJobFormModal.jsx');

  assert.ok(fs.existsSync(appPath), 'App.jsx must exist');
  assert.ok(fs.existsSync(layoutPath), 'AdminLayout.jsx must exist');
  assert.ok(fs.existsSync(leadsPagePath), 'AdminLeads.jsx must exist');
  assert.ok(fs.existsSync(jobModalPath), 'AdminJobFormModal.jsx must exist');

  const appContent = fs.readFileSync(appPath, 'utf8');
  assert.match(appContent, /AdminLeads/, 'App.jsx must import AdminLeads');
  assert.match(appContent, /path="\/leads"/, 'App.jsx must register /leads route');

  const layoutContent = fs.readFileSync(layoutPath, 'utf8');
  assert.match(layoutContent, /to:\s*'\/leads'/, 'AdminLayout.jsx must contain /leads nav link');
  assert.match(layoutContent, /module:\s*'leads'/, 'AdminLayout.jsx must assign module leads to /leads');
  assert.match(layoutContent, /'Platform Director'/, 'AdminLayout.jsx must support director role label');
  assert.match(layoutContent, /'Business Development/, 'AdminLayout.jsx must support bd role label');
  assert.match(layoutContent, /'Recruiter'/, 'AdminLayout.jsx must support recruiter role label');

  const leadsContent = fs.readFileSync(leadsPagePath, 'utf8');
  assert.match(leadsContent, /AdminJobFormModal/, 'AdminLeads.jsx must reuse canonical AdminJobFormModal');
  assert.match(leadsContent, /check-duplicate/, 'AdminLeads.jsx must pre-check duplicates');
  assert.match(leadsContent, /confirmed_hiring_interest/, 'AdminLeads.jsx must validate confirmed_hiring_interest');
  assert.match(leadsContent, /LEAD_ALREADY_CLAIMED|already been claimed/, 'AdminLeads.jsx must handle 409 conflict');
  assert.match(leadsContent, /tel:\$\{lead\.contact_phone\}/, 'AdminLeads.jsx must provide click-to-call link');

  const jobModalContent = fs.readFileSync(jobModalPath, 'utf8');
  assert.match(jobModalContent, /fromLead/, 'AdminJobFormModal must support fromLead prop');
  assert.match(jobModalContent, /\/admin\/leads\/\$\{fromLead\.id\}\/convert-job/, 'AdminJobFormModal must submit to lead conversion endpoint when fromLead is present');
});

test('Phase C — 11. Regression: BD submits lead without email (email optional) and granular field validation', async () => {
  // A. Submit without email — must succeed
  const noEmailLeadPayload = {
    company_name: 'Starlight Media Pvt Ltd',
    contact_person_name: 'Anita Verma',
    contact_phone: '+91 99887 76655',
    notes: 'Urgent expansion for creative production team',
    confirmed_hiring_interest: true
  };

  const createRes = await httpRequest('/api/admin/leads', {
    method: 'POST',
    headers: { Authorization: `Bearer ${bdUserToken}` },
    body: noEmailLeadPayload
  });

  assert.equal(createRes.status, 201, `Expected 201 Created, got ${createRes.status}: ${JSON.stringify(createRes.data)}`);
  assert.equal(createRes.data.success, true);
  const newLeadId = createRes.data.lead?.id || createRes.data.id;
  assert.ok(newLeadId, 'Response should contain new lead id');

  // Verify in DB directly
  const [dbLead] = await db.query('SELECT * FROM COMPANY_LEAD WHERE id = ?', [newLeadId]);
  assert.ok(dbLead, 'Lead must exist in COMPANY_LEAD table');
  assert.equal(dbLead.company_name, 'Starlight Media Pvt Ltd');
  assert.equal(dbLead.contact_person_name, 'Anita Verma');
  assert.equal(dbLead.contact_phone, '+91 99887 76655');
  assert.equal(dbLead.contact_email, null, 'contact_email must be NULL when omitted');
  assert.equal(dbLead.confirmed_hiring_interest, 1);

  // B. Validation: Missing company name
  const noCompRes = await httpRequest('/api/admin/leads', {
    method: 'POST',
    headers: { Authorization: `Bearer ${bdUserToken}` },
    body: {
      contact_person_name: 'Anita Verma',
      contact_phone: '+91 99887 76655',
      confirmed_hiring_interest: true
    }
  });
  assert.equal(noCompRes.status, 400);
  assert.equal(noCompRes.data.message, 'Company name is required.');

  // C. Validation: Missing contact person
  const noContactRes = await httpRequest('/api/admin/leads', {
    method: 'POST',
    headers: { Authorization: `Bearer ${bdUserToken}` },
    body: {
      company_name: 'Some Corp',
      contact_phone: '+91 99887 76655',
      confirmed_hiring_interest: true
    }
  });
  assert.equal(noContactRes.status, 400);
  assert.equal(noContactRes.data.message, 'Contact person name is required.');

  // D. Validation: Missing contact phone
  const noPhoneRes = await httpRequest('/api/admin/leads', {
    method: 'POST',
    headers: { Authorization: `Bearer ${bdUserToken}` },
    body: {
      company_name: 'Some Corp',
      contact_person_name: 'Anita Verma',
      confirmed_hiring_interest: true
    }
  });
  assert.equal(noPhoneRes.status, 400);
  assert.equal(noPhoneRes.data.message, 'Contact phone is required.');

  // E. Validation: Missing confirmed_hiring_interest
  const noConfirmRes = await httpRequest('/api/admin/leads', {
    method: 'POST',
    headers: { Authorization: `Bearer ${bdUserToken}` },
    body: {
      company_name: 'Some Corp',
      contact_person_name: 'Anita Verma',
      contact_phone: '+91 99887 76655',
      confirmed_hiring_interest: false
    }
  });
  assert.equal(noConfirmRes.status, 400);
  assert.equal(noConfirmRes.data.code, 'CONFIRMED_INTEREST_REQUIRED');
});

test.after(() => {
  if (server) {
    server.close();
  }
  setTimeout(() => process.exit(0), 200);
});
