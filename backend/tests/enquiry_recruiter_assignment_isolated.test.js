const test = require('node:test');
const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const { getIsolatedTestConfig } = require('../config/testDatabaseSafety');

// Set isolated test environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_TEST_MODE = 'isolated-mysql';
process.env.TEST_DB_HOST = process.env.TEST_DB_HOST || '127.0.0.1';
process.env.TEST_DB_PORT = process.env.TEST_DB_PORT || '3306';
process.env.TEST_DB_USER = process.env.TEST_DB_USER || 'vakancy_tester';
process.env.TEST_DB_NAME = process.env.TEST_DB_NAME || 'vakancy_test_phase5';
process.env.TEST_DB_RESET_ACK = 'I_UNDERSTAND_THIS_DATABASE_IS_DISPOSABLE';

let dbConn;

test.before(async () => {
  const config = getIsolatedTestConfig(process.env);
  dbConn = await mysql.createConnection(config);
});

test.after(async () => {
  if (dbConn) {
    await dbConn.end();
  }
});

test('Enquiry Recruiter Assignment Isolated Suite', async (t) => {

  const testSuffix = Date.now().toString().slice(-6);
  const directorId = uuidv4();
  const recruiter1Id = uuidv4();
  const recruiter2Id = uuidv4();
  const bdId = uuidv4();
  const enquiryId = uuidv4();
  const passwordHash = await bcrypt.hash('password123', 10);

  await t.test('1. Setup isolated test users & permissions in isolated test DB', async () => {
    // Clean up any test users from prior runs if matching email
    await dbConn.query('DELETE FROM users WHERE email LIKE ?', [`%${testSuffix}@vakancy.test%`]);

    // Insert Director
    await dbConn.query(
      `INSERT INTO users (id, email, password_hash, role, name, is_main_admin, is_active)
       VALUES (?, ?, ?, 'director', 'Test Director', 1, 1)`,
      [directorId, `director.${testSuffix}@vakancy.test`, passwordHash]
    );

    // Insert Recruiter 1
    await dbConn.query(
      `INSERT INTO users (id, email, password_hash, role, name, is_main_admin, is_active)
       VALUES (?, ?, ?, 'recruiter', 'Recruiter Alpha', 0, 1)`,
      [recruiter1Id, `recruiter.alpha.${testSuffix}@vakancy.test`, passwordHash]
    );

    // Insert Recruiter 2
    await dbConn.query(
      `INSERT INTO users (id, email, password_hash, role, name, is_main_admin, is_active)
       VALUES (?, ?, ?, 'recruiter', 'Recruiter Beta', 0, 1)`,
      [recruiter2Id, `recruiter.beta.${testSuffix}@vakancy.test`, passwordHash]
    );

    // Insert BD User
    await dbConn.query(
      `INSERT INTO users (id, email, password_hash, role, name, is_main_admin, is_active)
       VALUES (?, ?, ?, 'bd', 'BD Executive', 0, 1)`,
      [bdId, `bd.${testSuffix}@vakancy.test`, passwordHash]
    );

    const [users] = await dbConn.query('SELECT id, role, is_active FROM users WHERE id IN (?, ?, ?, ?)', [
      directorId, recruiter1Id, recruiter2Id, bdId
    ]);
    assert.equal(users.length, 4, 'All 4 test users must be inserted');
  });

  await t.test('2. Insert an unassigned Executive Search Enquiry', async () => {
    await dbConn.query(
      `INSERT INTO employer_enquiry (
        id, contact_name, contact_email, contact_phone, company_name,
        subject, message, openings_count, location, status,
        enquiry_type, source, assigned_to_user_id
      ) VALUES (
        ?, 'Dr. Hitesh Patel', 'hitesh@biocorp.com', '+91 9988776655', 'BioCorp Pharma',
        'VP Quality Assurance & Regulatory', 'Need an executive with 15+ years experience in US FDA compliance.',
        1, 'Ahmedabad / Mumbai', 'NEW',
        'Executive Search', 'EXECUTIVE_SERVICE', NULL
      )`,
      [enquiryId]
    );

    const [enq] = await dbConn.query('SELECT * FROM employer_enquiry WHERE id = ?', [enquiryId]);
    assert.ok(enq.length > 0, 'Enquiry record must exist');
    assert.equal(enq[0].assigned_to_user_id, null, 'Enquiry must initially be unassigned');
    assert.equal(enq[0].status, 'NEW');
  });

  await t.test('3. Query active recruiters eligible for assignment', async () => {
    const [recruiters] = await dbConn.query(
      "SELECT id, name, email, role, is_active FROM users WHERE role = 'recruiter' AND is_active = 1 AND email LIKE ?",
      [`%${testSuffix}@vakancy.test%`]
    );
    assert.equal(recruiters.length, 2, 'Should find exactly 2 active test recruiters');
    assert.ok(recruiters.every(r => r.role === 'recruiter' && r.is_active === 1));

    // Verify BD user is NOT in the recruiter list
    assert.ok(!recruiters.some(r => r.id === bdId), 'BD user must not be present in recruiter list');
  });

  await t.test('4. Assign Enquiry to Recruiter Alpha by Director with audit logging', async () => {
    // Simulate assignEnquiry backend logic
    const [existing] = await dbConn.query('SELECT id, assigned_to_user_id, status FROM employer_enquiry WHERE id = ?', [enquiryId]);
    assert.ok(existing.length > 0);

    const [assignee] = await dbConn.query('SELECT id, name, email, role FROM users WHERE id = ? AND is_active = 1', [recruiter1Id]);
    assert.equal(assignee[0].role, 'recruiter');

    await dbConn.query(
      'UPDATE employer_enquiry SET assigned_to_user_id = ?, status = CASE WHEN status = "NEW" THEN "ASSIGNED" ELSE status END WHERE id = ?',
      [recruiter1Id, enquiryId]
    );

    const activityId = uuidv4();
    await dbConn.query(
      `INSERT INTO recruitment_activity (
        id, performed_by, action_type, entity_type, entity_id, related_enquiry_id,
        changed_field, previous_value, new_value, description
      ) VALUES (?, ?, 'ASSIGN_ENQUIRY', 'ENQUIRY', ?, ?, 'assigned_to_user_id', 'unassigned', ?, ?)`,
      [activityId, directorId, enquiryId, enquiryId, recruiter1Id, `Assigned recruitment enquiry to ${assignee[0].name}`]
    );

    // Verify DB update
    const [updated] = await dbConn.query('SELECT assigned_to_user_id, status FROM employer_enquiry WHERE id = ?', [enquiryId]);
    assert.equal(updated[0].assigned_to_user_id, recruiter1Id);
    assert.equal(updated[0].status, 'ASSIGNED');

    // Verify activity log
    const [logs] = await dbConn.query(
      'SELECT action_type, entity_id, new_value, description FROM recruitment_activity WHERE id = ?',
      [activityId]
    );
    assert.equal(logs.length, 1);
    assert.equal(logs[0].action_type, 'ASSIGN_ENQUIRY');
    assert.equal(logs[0].entity_id, enquiryId);
    assert.equal(logs[0].new_value, recruiter1Id);
  });

  await t.test('5. Reassign Enquiry to Recruiter Beta with REASSIGN_ENQUIRY audit log', async () => {
    const [existing] = await dbConn.query('SELECT id, assigned_to_user_id, status FROM employer_enquiry WHERE id = ?', [enquiryId]);
    const previousAssigneeId = existing[0].assigned_to_user_id;
    assert.equal(previousAssigneeId, recruiter1Id);

    const [newAssignee] = await dbConn.query('SELECT id, name, email, role FROM users WHERE id = ? AND is_active = 1', [recruiter2Id]);
    assert.equal(newAssignee[0].role, 'recruiter');

    const isReassignment = Boolean(previousAssigneeId && previousAssigneeId !== recruiter2Id);
    assert.ok(isReassignment, 'Must detect as reassignment');

    await dbConn.query(
      'UPDATE employer_enquiry SET assigned_to_user_id = ? WHERE id = ?',
      [recruiter2Id, enquiryId]
    );

    const activityId = uuidv4();
    await dbConn.query(
      `INSERT INTO recruitment_activity (
        id, performed_by, action_type, entity_type, entity_id, related_enquiry_id,
        changed_field, previous_value, new_value, description
      ) VALUES (?, ?, 'REASSIGN_ENQUIRY', 'ENQUIRY', ?, ?, 'assigned_to_user_id', ?, ?, ?)`,
      [activityId, directorId, enquiryId, enquiryId, previousAssigneeId, recruiter2Id, `Reassigned recruitment enquiry to ${newAssignee[0].name}`]
    );

    // Verify DB update
    const [updated] = await dbConn.query('SELECT assigned_to_user_id FROM employer_enquiry WHERE id = ?', [enquiryId]);
    assert.equal(updated[0].assigned_to_user_id, recruiter2Id);

    // Verify activity log
    const [logs] = await dbConn.query(
      'SELECT action_type, previous_value, new_value FROM recruitment_activity WHERE id = ?',
      [activityId]
    );
    assert.equal(logs[0].action_type, 'REASSIGN_ENQUIRY');
    assert.equal(logs[0].previous_value, recruiter1Id);
    assert.equal(logs[0].new_value, recruiter2Id);
  });

  await t.test('6. Recruiter Scope: Assigned Recruiter Beta sees enquiry, Recruiter Alpha does not', async () => {
    // Recruiter Beta query (where assigned_to_user_id = recruiter2Id)
    const [betaEnquiries] = await dbConn.query(
      'SELECT id, subject, assigned_to_user_id FROM employer_enquiry WHERE assigned_to_user_id = ?',
      [recruiter2Id]
    );
    assert.ok(betaEnquiries.some(e => e.id === enquiryId), 'Recruiter Beta must see their assigned enquiry');

    // Recruiter Alpha query (where assigned_to_user_id = recruiter1Id)
    const [alphaEnquiries] = await dbConn.query(
      'SELECT id, subject, assigned_to_user_id FROM employer_enquiry WHERE assigned_to_user_id = ?',
      [recruiter1Id]
    );
    assert.ok(!alphaEnquiries.some(e => e.id === enquiryId), 'Recruiter Alpha must NOT see unassigned/reassigned enquiry');
  });

  await t.test('7. Clean up test data from isolated DB', async () => {
    await dbConn.query('DELETE FROM recruitment_activity WHERE related_enquiry_id = ?', [enquiryId]);
    await dbConn.query('DELETE FROM employer_enquiry WHERE id = ?', [enquiryId]);
    await dbConn.query('DELETE FROM users WHERE id IN (?, ?, ?, ?)', [directorId, recruiter1Id, recruiter2Id, bdId]);
  });
});
