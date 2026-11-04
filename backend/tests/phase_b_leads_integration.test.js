/**
 * Vakancy.in — Phase B: BD Leads Backend Integration & Concurrency Test Suite
 * Validates:
 * 1. BD lead creation with confirmed hiring interest.
 * 2. Shared unclaimed recruiter queue visibility.
 * 3. Atomic "Take Lead" concurrency simulation (race condition test).
 * 4. BD claim denial (BD cannot claim leads).
 * 5. Cross-recruiter mutation prevention (cannot edit another recruiter's lead).
 * 6. Director reassignment authority (and non-director denial).
 * 7. Duplicate company pre-check warning.
 * 8. Multiple jobs linked to a single company lead.
 * 9. BD candidate/application privacy guard (HTTP 403).
 * 10. Audit trail persistence in RECRUITMENT_ACTIVITY.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
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
let bdUserToken, bdUser2Token;
let recruiter1Token, recruiter2Token;
let directorToken;

let bdUserId, bdUser2Id;
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

  // 1. Provision BD User 1
  bdUserId = 'usr-pb-bd1-' + uuidv4().slice(0, 8);
  const bd1Email = `${bdUserId}@test.vakancy.in`;
  await db.query(`
    INSERT INTO USERS (id, email, password_hash, role, name, is_active, is_main_admin)
    VALUES (?, ?, ?, 'bd', 'BD Agent Alex', 1, 0)
  `, [bdUserId, bd1Email, pwHash]);

  // 2. Provision BD User 2
  bdUser2Id = 'usr-pb-bd2-' + uuidv4().slice(0, 8);
  const bd2Email = `${bdUser2Id}@test.vakancy.in`;
  await db.query(`
    INSERT INTO USERS (id, email, password_hash, role, name, is_active, is_main_admin)
    VALUES (?, ?, ?, 'bd', 'BD Agent Beth', 1, 0)
  `, [bdUser2Id, bd2Email, pwHash]);

  // 3. Provision Recruiter 1
  recruiter1Id = 'usr-pb-rec1-' + uuidv4().slice(0, 8);
  const rec1Email = `${recruiter1Id}@test.vakancy.in`;
  await db.query(`
    INSERT INTO USERS (id, email, password_hash, role, name, is_active, is_main_admin)
    VALUES (?, ?, ?, 'recruiter', 'Recruiter Sarah', 1, 0)
  `, [recruiter1Id, rec1Email, pwHash]);

  // 4. Provision Recruiter 2
  recruiter2Id = 'usr-pb-rec2-' + uuidv4().slice(0, 8);
  const rec2Email = `${recruiter2Id}@test.vakancy.in`;
  await db.query(`
    INSERT INTO USERS (id, email, password_hash, role, name, is_active, is_main_admin)
    VALUES (?, ?, ?, 'recruiter', 'Recruiter James', 1, 0)
  `, [recruiter2Id, rec2Email, pwHash]);

  // 5. Provision Director
  directorId = 'usr-pb-dir-' + uuidv4().slice(0, 8);
  const dirEmail = `${directorId}@test.vakancy.in`;
  await db.query(`
    INSERT INTO USERS (id, email, password_hash, role, name, is_active, is_main_admin)
    VALUES (?, ?, ?, 'director', 'Platform Director', 1, 1)
  `, [directorId, dirEmail, pwHash]);

  // Login each user to obtain real JWTs
  const bd1Login = await httpRequest('/api/auth/login', { method: 'POST', body: { email: bd1Email, password: 'TestPass@123' } });
  bdUserToken = bd1Login.data.token;

  const bd2Login = await httpRequest('/api/auth/login', { method: 'POST', body: { email: bd2Email, password: 'TestPass@123' } });
  bdUser2Token = bd2Login.data.token;

  const rec1Login = await httpRequest('/api/auth/login', { method: 'POST', body: { email: rec1Email, password: 'TestPass@123' } });
  recruiter1Token = rec1Login.data.token;

  const rec2Login = await httpRequest('/api/auth/login', { method: 'POST', body: { email: rec2Email, password: 'TestPass@123' } });
  recruiter2Token = rec2Login.data.token;

  const dirLogin = await httpRequest('/api/auth/login', { method: 'POST', body: { email: dirEmail, password: 'TestPass@123' } });
  directorToken = dirLogin.data.token;
});

test.after(async () => {
  if (server) {
    await new Promise(resolve => server.close(resolve));
  }
  // Clean up test users
  await db.query('DELETE FROM USERS WHERE id IN (?, ?, ?, ?, ?)', [bdUserId, bdUser2Id, recruiter1Id, recruiter2Id, directorId]);
  await db.closeDB();
});

// --------------------------------------------------------------------------
// TEST 1: BD Creates Lead with Confirmed Hiring Interest & Basic Info
// --------------------------------------------------------------------------
test('Phase B — BD submits prospective company lead and audit record is created', async () => {
  const companyName = 'Acme Robotics Innovations Pvt Ltd';
  const res = await httpRequest('/api/admin/leads', {
    method: 'POST',
    headers: { Authorization: `Bearer ${bdUserToken}` },
    body: {
      company_name: companyName,
      contact_person_name: 'Dr. Evelyn Reed',
      contact_phone: '+91 98765 43210',
      contact_email: 'hiring@acmerobotics.com',
      city: 'Bangalore',
      website: 'https://www.acmerobotics.com',
      notes: 'Confirmed urgent need for 3 Senior Robotics Engineers',
      confirmed_hiring_interest: true
    }
  });

  assert.equal(res.status, 201, 'Lead creation must succeed with 201 Created');
  assert.equal(res.data.success, true);
  assert.ok(res.data.lead && res.data.lead.id, 'Response must include created lead with ID');
  const leadId = res.data.lead.id;

  // Verify database record
  const [dbLead] = await db.query('SELECT * FROM COMPANY_LEAD WHERE id = ?', [leadId]);
  assert.ok(dbLead, 'Lead must exist in COMPANY_LEAD');
  assert.equal(dbLead.company_name, companyName);
  assert.equal(dbLead.normalized_company_name, 'acme robotics');
  assert.equal(dbLead.normalized_domain, 'acmerobotics.com');
  assert.equal(dbLead.status, 'UNCLAIMED');
  assert.equal(dbLead.claimed_by_recruiter_id, null);
  assert.equal(dbLead.bd_user_id, bdUserId);

  // Verify audit log
  const [activity] = await db.query(
    'SELECT * FROM RECRUITMENT_ACTIVITY WHERE entity_type = "COMPANY_LEAD" AND entity_id = ? AND action_type = "CREATE_LEAD"',
    [leadId]
  );
  assert.ok(activity, 'Audit log must record CREATE_LEAD in RECRUITMENT_ACTIVITY');
  assert.equal(activity.performed_by, bdUserId);
});

// --------------------------------------------------------------------------
// TEST 2: BD Rejects Submission Without Confirmed Hiring Interest
// --------------------------------------------------------------------------
test('Phase B — BD submission is rejected when confirmed_hiring_interest is false', async () => {
  const res = await httpRequest('/api/admin/leads', {
    method: 'POST',
    headers: { Authorization: `Bearer ${bdUserToken}` },
    body: {
      company_name: 'Tentative Ventures Ltd',
      contact_person_name: 'John Doe',
      contact_phone: '+91 99999 88888',
      confirmed_hiring_interest: false
    }
  });

  assert.equal(res.status, 400, 'Must reject unconfirmed lead with HTTP 400');
  assert.equal(res.data.code, 'CONFIRMED_INTEREST_REQUIRED');
});

// --------------------------------------------------------------------------
// TEST 3: Shared Unclaimed Recruiter Queue Visibility
// --------------------------------------------------------------------------
test('Phase B — Recruiters see unclaimed leads in shared queue', async () => {
  const res = await httpRequest('/api/admin/leads/queue?queue=unclaimed', {
    headers: { Authorization: `Bearer ${recruiter1Token}` }
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.success, true);
  assert.ok(Array.isArray(res.data.leads));
  const found = res.data.leads.find(l => l.company_name === 'Acme Robotics Innovations Pvt Ltd');
  assert.ok(found, 'Unclaimed lead must appear in shared recruiter queue');
  assert.equal(found.status, 'UNCLAIMED');
  assert.equal(found.claimed_by_recruiter_id, null);
});

// --------------------------------------------------------------------------
// TEST 4: BD Privacy — BD only sees own submitted leads
// --------------------------------------------------------------------------
test('Phase B — BD Agent only sees leads they submitted and cannot see another BD agent leads', async () => {
  // BD 2 submits a lead
  const bd2LeadRes = await httpRequest('/api/admin/leads', {
    method: 'POST',
    headers: { Authorization: `Bearer ${bdUser2Token}` },
    body: {
      company_name: 'Beta Quantum Labs',
      contact_person_name: 'Dr. Quantum',
      contact_phone: '+91 77777 66666',
      confirmed_hiring_interest: true
    }
  });
  assert.equal(bd2LeadRes.status, 201);
  const bd2LeadId = bd2LeadRes.data.lead.id;

  // BD 1 queries leads
  const bd1ListRes = await httpRequest('/api/admin/leads', {
    headers: { Authorization: `Bearer ${bdUserToken}` }
  });
  assert.equal(bd1ListRes.status, 200);
  const bd1LeadIds = bd1ListRes.data.leads.map(l => l.id);
  assert.ok(!bd1LeadIds.includes(bd2LeadId), 'BD 1 must NOT see lead submitted by BD 2');

  // BD 1 attempting to view BD 2 lead directly -> 403 Forbidden
  const directGetRes = await httpRequest(`/api/admin/leads/${bd2LeadId}`, {
    headers: { Authorization: `Bearer ${bdUserToken}` }
  });
  assert.equal(directGetRes.status, 403, 'BD agent attempting to access another BD lead must be forbidden');
});

// --------------------------------------------------------------------------
// TEST 5: BD Cannot Claim Leads
// --------------------------------------------------------------------------
test('Phase B — BD user is forbidden from claiming leads (HTTP 403 BD_CANNOT_CLAIM_LEADS)', async () => {
  // Create test lead
  const createRes = await httpRequest('/api/admin/leads', {
    method: 'POST',
    headers: { Authorization: `Bearer ${bdUserToken}` },
    body: {
      company_name: 'Zeta Financial Services',
      contact_person_name: 'Mark Miller',
      contact_phone: '+91 91234 56789',
      confirmed_hiring_interest: true
    }
  });
  const testLeadId = createRes.data.lead.id;

  // BD attempts to claim
  const claimRes = await httpRequest(`/api/admin/leads/${testLeadId}/claim`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${bdUserToken}` }
  });

  assert.equal(claimRes.status, 403, 'BD must be rejected with 403');
  assert.ok(['BD_CANNOT_CLAIM_LEADS', 'PERMISSION_DENIED'].includes(claimRes.data.code));

  // Verify lead is still unclaimed in DB
  const [dbLead] = await db.query('SELECT status, claimed_by_recruiter_id FROM COMPANY_LEAD WHERE id = ?', [testLeadId]);
  assert.equal(dbLead.status, 'UNCLAIMED');
  assert.equal(dbLead.claimed_by_recruiter_id, null);
});

// --------------------------------------------------------------------------
// TEST 6: Atomic Ownership — Concurrent "Take Lead" Race Condition Test
// --------------------------------------------------------------------------
test('Phase B — Atomic Claiming: Two simultaneous claims result in exactly 1 winner and 1 HTTP 409 Conflict', async () => {
  // Create fresh unclaimed lead
  const createRes = await httpRequest('/api/admin/leads', {
    method: 'POST',
    headers: { Authorization: `Bearer ${bdUserToken}` },
    body: {
      company_name: 'Concurrent Race Motors Ltd',
      contact_person_name: 'Speedy Singh',
      contact_phone: '+91 98888 77777',
      confirmed_hiring_interest: true
    }
  });
  const raceLeadId = createRes.data.lead.id;

  // Fire both claim requests simultaneously
  const [claim1, claim2] = await Promise.all([
    httpRequest(`/api/admin/leads/${raceLeadId}/claim`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${recruiter1Token}` }
    }),
    httpRequest(`/api/admin/leads/${raceLeadId}/claim`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${recruiter2Token}` }
    })
  ]);

  const statuses = [claim1.status, claim2.status].sort();
  assert.deepEqual(statuses, [200, 409], 'Simultaneous claims must produce exactly one 200 and one 409 Conflict');

  const winner = claim1.status === 200 ? claim1 : claim2;
  const loser = claim1.status === 409 ? claim1 : claim2;

  assert.equal(winner.data.success, true);
  assert.equal(loser.data.success, false);
  assert.equal(loser.data.code, 'LEAD_ALREADY_CLAIMED');

  // Verify DB state: lead is claimed by exactly one recruiter
  const [dbLead] = await db.query('SELECT status, claimed_by_recruiter_id FROM COMPANY_LEAD WHERE id = ?', [raceLeadId]);
  assert.equal(dbLead.status, 'CLAIMED');
  assert.ok([recruiter1Id, recruiter2Id].includes(dbLead.claimed_by_recruiter_id));

  // Verify RECRUITMENT_ACTIVITY: exactly 1 TAKE_LEAD audit row was recorded
  const auditRows = await db.query(
    'SELECT * FROM RECRUITMENT_ACTIVITY WHERE entity_type = "COMPANY_LEAD" AND entity_id = ? AND action_type = "TAKE_LEAD"',
    [raceLeadId]
  );
  assert.equal(auditRows.length, 1, 'Exactly one audit log entry must be written for the successful claim');
  assert.equal(auditRows[0].performed_by, dbLead.claimed_by_recruiter_id);
});

// --------------------------------------------------------------------------
// TEST 7: Cross-Recruiter Mutation Prevention
// --------------------------------------------------------------------------
test('Phase B — Recruiter cannot modify or update a lead claimed by another recruiter', async () => {
  // Create lead claimed by Recruiter 1
  const createRes = await httpRequest('/api/admin/leads', {
    method: 'POST',
    headers: { Authorization: `Bearer ${bdUserToken}` },
    body: {
      company_name: 'Shielded Systems Corp',
      contact_person_name: 'Agent Vance',
      contact_phone: '+91 97777 55555',
      confirmed_hiring_interest: true
    }
  });
  const leadId = createRes.data.lead.id;

  // Recruiter 1 claims it
  const claimRes = await httpRequest(`/api/admin/leads/${leadId}/claim`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${recruiter1Token}` }
  });
  assert.equal(claimRes.status, 200);

  // Recruiter 2 attempts to change status -> 403 NOT_LEAD_OWNER
  const updateRes = await httpRequest(`/api/admin/leads/${leadId}/status`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${recruiter2Token}` },
    body: { status: 'REQUIREMENTS_GATHERED', notes: 'Unauthorized attempt' }
  });
  assert.equal(updateRes.status, 403, 'Cross-recruiter edit must be rejected with 403');
  assert.equal(updateRes.data.code, 'NOT_LEAD_OWNER');

  // Recruiter 1 updates status -> 200 OK
  const validUpdateRes = await httpRequest(`/api/admin/leads/${leadId}/status`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${recruiter1Token}` },
    body: { status: 'REQUIREMENTS_GATHERED', notes: 'Discussed hiring needs with CEO' }
  });
  assert.equal(validUpdateRes.status, 200);

  // Verify status audit log
  const [updateLog] = await db.query(
    'SELECT * FROM RECRUITMENT_ACTIVITY WHERE entity_type = "COMPANY_LEAD" AND entity_id = ? AND action_type = "UPDATE_LEAD_STATUS"',
    [leadId]
  );
  assert.ok(updateLog);
  assert.equal(updateLog.previous_value, 'CLAIMED');
  assert.equal(updateLog.new_value, 'REQUIREMENTS_GATHERED');
  assert.equal(updateLog.performed_by, recruiter1Id);
});

// --------------------------------------------------------------------------
// TEST 8: Director Authority & Controlled Lead Reassignment
// --------------------------------------------------------------------------
test('Phase B — Director can view all leads and reassign lead ownership to another recruiter', async () => {
  // Create lead claimed by Recruiter 1
  const createRes = await httpRequest('/api/admin/leads', {
    method: 'POST',
    headers: { Authorization: `Bearer ${bdUserToken}` },
    body: {
      company_name: 'Apex Semiconductor Pvt Ltd',
      contact_person_name: 'Ravi Kumar',
      contact_phone: '+91 96666 44444',
      confirmed_hiring_interest: true
    }
  });
  const leadId = createRes.data.lead.id;
  await httpRequest(`/api/admin/leads/${leadId}/claim`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${recruiter1Token}` }
  });

  // Non-director (Recruiter 1) attempts reassignment -> 403 Forbidden
  const nonDirReassign = await httpRequest(`/api/admin/leads/${leadId}/reassign`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${recruiter1Token}` },
    body: { new_recruiter_id: recruiter2Id }
  });
  assert.equal(nonDirReassign.status, 403);
  assert.ok(['DIRECTOR_AUTHORITY_REQUIRED', 'PERMISSION_DENIED'].includes(nonDirReassign.data.code));

  // Director performs reassignment
  const dirReassign = await httpRequest(`/api/admin/leads/${leadId}/reassign`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${directorToken}` },
    body: { new_recruiter_id: recruiter2Id, notes: 'Reassigned by Director due to domain expertise' }
  });
  assert.equal(dirReassign.status, 200);
  assert.equal(dirReassign.data.success, true);
  assert.equal(dirReassign.data.new_recruiter_id, recruiter2Id);

  // Verify DB state
  const [dbLead] = await db.query('SELECT claimed_by_recruiter_id, reassigned_by_director_id FROM COMPANY_LEAD WHERE id = ?', [leadId]);
  assert.equal(dbLead.claimed_by_recruiter_id, recruiter2Id);
  assert.equal(dbLead.reassigned_by_director_id, directorId);

  // Verify REASSIGN_LEAD audit log
  const [reassignLog] = await db.query(
    'SELECT * FROM RECRUITMENT_ACTIVITY WHERE entity_type = "COMPANY_LEAD" AND entity_id = ? AND action_type = "REASSIGN_LEAD"',
    [leadId]
  );
  assert.ok(reassignLog);
  assert.equal(reassignLog.previous_value, recruiter1Id);
  assert.equal(reassignLog.new_value, recruiter2Id);
  assert.equal(reassignLog.performed_by, directorId);
});

// --------------------------------------------------------------------------
// TEST 9: Duplicate Company Warning
// --------------------------------------------------------------------------
test('Phase B — Duplicate company check endpoint returns matching leads and warnings', async () => {
  // Create reference lead
  await httpRequest('/api/admin/leads', {
    method: 'POST',
    headers: { Authorization: `Bearer ${bdUserToken}` },
    body: {
      company_name: 'Infosys Technologies Global Ltd',
      contact_person_name: 'Pooja Sharma',
      contact_phone: '+91 95555 33333',
      contact_email: 'careers@infosys.com',
      website: 'https://www.infosys.com',
      confirmed_hiring_interest: true
    }
  });

  // Query pre-check for "Infosys Pvt Ltd"
  const dupNameRes = await httpRequest('/api/admin/leads/check-duplicate?name=Infosys%20Pvt%20Ltd', {
    headers: { Authorization: `Bearer ${bdUserToken}` }
  });
  assert.equal(dupNameRes.status, 200);
  assert.equal(dupNameRes.data.hasDuplicate, true);
  assert.ok(dupNameRes.data.matches.length > 0);
  assert.ok(dupNameRes.data.matches.some(m => m.name.toLowerCase().includes('infosys')));

  // Query pre-check by domain "contact@infosys.com"
  const dupDomainRes = await httpRequest('/api/admin/leads/check-duplicate?email=contact@infosys.com', {
    headers: { Authorization: `Bearer ${bdUserToken}` }
  });
  assert.equal(dupDomainRes.status, 200);
  assert.equal(dupDomainRes.data.hasDuplicate, true);
});

// --------------------------------------------------------------------------
// TEST 10: Multiple Jobs Associated with One Company Lead
// --------------------------------------------------------------------------
test('Phase B — Lead-to-job conversion creates client and supports multiple jobs per company lead', async () => {
  // BD creates lead
  const createRes = await httpRequest('/api/admin/leads', {
    method: 'POST',
    headers: { Authorization: `Bearer ${bdUserToken}` },
    body: {
      company_name: 'CloudScale Infrastructure Solutions',
      contact_person_name: 'Vikram Seth',
      contact_phone: '+91 94444 22222',
      contact_email: 'vikram@cloudscale.io',
      city: 'Hyderabad',
      confirmed_hiring_interest: true
    }
  });
  const leadId = createRes.data.lead.id;

  // Recruiter 1 claims lead
  await httpRequest(`/api/admin/leads/${leadId}/claim`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${recruiter1Token}` }
  });

  // Recruiter 1 converts lead to Job 1: "Senior Cloud Architect"
  const job1Res = await httpRequest(`/api/admin/leads/${leadId}/convert-job`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${recruiter1Token}` },
    body: {
      title: 'Senior Cloud Architect',
      description: 'Lead AWS multi-tenant cloud infrastructure migrations',
      location: 'Hyderabad',
      openings_count: 2,
      min_salary: 2500000,
      max_salary: 3500000
    }
  });
  assert.equal(job1Res.status, 201);
  assert.ok(job1Res.data.data.job_id);
  const job1Id = job1Res.data.data.job_id;
  const clientId = job1Res.data.data.client_id;
  assert.ok(clientId, 'Client record must be generated and linked');

  // Recruiter 1 converts lead to Job 2: "Site Reliability Engineer (SRE)"
  const job2Res = await httpRequest(`/api/admin/leads/${leadId}/convert-job`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${recruiter1Token}` },
    body: {
      title: 'Site Reliability Engineer (SRE)',
      description: 'Kubernetes production telemetry and chaos engineering',
      location: 'Remote',
      openings_count: 3
    }
  });
  assert.equal(job2Res.status, 201);
  const job2Id = job2Res.data.data.job_id;

  // Verify in database: Both jobs point to the same lead_id and client_id
  const jobsInDb = await db.query('SELECT id, title, lead_id, client_id FROM JOB WHERE lead_id = ?', [leadId]);
  assert.equal(jobsInDb.length, 2, 'Exactly 2 jobs must point to this company lead');
  assert.equal(jobsInDb[0].lead_id, leadId);
  assert.equal(jobsInDb[1].lead_id, leadId);
  assert.equal(jobsInDb[0].client_id, clientId);
  assert.equal(jobsInDb[1].client_id, clientId);

  // Verify lead details endpoint returns both jobs
  const leadDetailsRes = await httpRequest(`/api/admin/leads/${leadId}`, {
    headers: { Authorization: `Bearer ${recruiter1Token}` }
  });
  assert.equal(leadDetailsRes.status, 200);
  assert.equal(leadDetailsRes.data.lead.jobs.length, 2);
  const jobTitles = leadDetailsRes.data.lead.jobs.map(j => j.title);
  assert.ok(jobTitles.includes('Senior Cloud Architect'));
  assert.ok(jobTitles.includes('Site Reliability Engineer (SRE)'));

  // Verify CONVERT_LEAD_TO_JOB activity logged
  const convertActivities = await db.query(
    'SELECT * FROM RECRUITMENT_ACTIVITY WHERE entity_type = "COMPANY_LEAD" AND entity_id = ? AND action_type = "CONVERT_LEAD_TO_JOB"',
    [leadId]
  );
  assert.equal(convertActivities.length, 2, 'Two conversion events must be recorded in audit trail');
});

// --------------------------------------------------------------------------
// TEST 11: BD Candidate & Application Privacy Guard
// --------------------------------------------------------------------------
test('Phase B — BD role is strictly blocked from candidate profiles and job applications (HTTP 403)', async () => {
  // BD attempts to view candidates
  const candRes = await httpRequest('/api/admin/candidates', {
    headers: { Authorization: `Bearer ${bdUserToken}` }
  });
  assert.equal(candRes.status, 403, 'BD must receive 403 when trying to access candidate list');
  assert.equal(candRes.data.code, 'PRIVACY_PROTECTION_ACCESS_DENIED');

  // BD attempts to view applications
  const appRes = await httpRequest('/api/admin/applications', {
    headers: { Authorization: `Bearer ${bdUserToken}` }
  });
  assert.equal(appRes.status, 403, 'BD must receive 403 when trying to access application queue');
  assert.equal(appRes.data.code, 'PRIVACY_PROTECTION_ACCESS_DENIED');

  // Recruiter can view candidates
  const recCandRes = await httpRequest('/api/admin/candidates', {
    headers: { Authorization: `Bearer ${recruiter1Token}` }
  });
  assert.equal(recCandRes.status, 200, 'Recruiter must have candidate access');
});
