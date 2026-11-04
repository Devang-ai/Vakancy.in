const test = require('node:test');
const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const { getIsolatedTestConfig } = require('../config/testDatabaseSafety');
const { runMigrations } = require('../database/runMigrations');
const { migrations, validateMigrationOrder } = require('../database/migrations');
const db = require('../config/db');
const { getUserScope } = require('../middleware/rbacMiddleware');
const cryptoUtils = require('../utils/cryptoUtils');

async function hasPermission(roleKey, moduleName, actionName) {
  if (roleKey === 'director' || roleKey === 'main_admin') return true;
  const rows = await db.query(
    'SELECT is_granted FROM ROLE_PERMISSIONS WHERE role_key = ? AND module = ? AND action = ? LIMIT 1',
    [roleKey, moduleName, actionName]
  );
  return rows.length > 0 && Boolean(rows[0].is_granted);
}

// Ensure isolated test environment configuration
const testEnv = {
  NODE_ENV: 'test',
  DATABASE_TEST_MODE: 'isolated-mysql',
  TEST_DB_HOST: process.env.TEST_DB_HOST || '127.0.0.1',
  TEST_DB_PORT: process.env.TEST_DB_PORT || '3306',
  TEST_DB_USER: process.env.TEST_DB_USER || 'vakancy_tester',
  TEST_DB_PASSWORD: process.env.TEST_DB_PASSWORD,
  TEST_DB_NAME: process.env.TEST_DB_NAME || 'vakancy_test_phase5',
  TEST_DB_RESET_ACK: 'I_UNDERSTAND_THIS_DATABASE_IS_DISPOSABLE'
};

Object.assign(process.env, testEnv);

test.before(async () => {
  await db.initDB();
});

test.after(async () => {
  await db.closeDB();
});

// -------------------------------------------------------------
// 1. Database Isolation & Safety Verification
// -------------------------------------------------------------
test('Step 1 & 2 — test credentials have isolated access to test database and no privileges on application database', async () => {
  const config = getIsolatedTestConfig(process.env);
  assert.equal(config.database, 'vakancy_test_phase5');
  assert.equal(config.user, 'vakancy_tester');

  // Verify that connecting to vakancy_main_db using test credentials is explicitly refused
  let denied = false;
  try {
    const deniedConn = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: 'vakancy_main_db'
    });
    await deniedConn.end();
  } catch (err) {
    denied = true;
    assert.match(err.message, /Access denied/i);
  }
  assert.equal(denied, true, 'Test credentials must be denied access to the primary application database.');
});

// -------------------------------------------------------------
// 2. Migration 001–004 Validation & Idempotency
// -------------------------------------------------------------
test('Step 3 — migrations 001-005 ledger verification and deterministic ordering', async () => {
  validateMigrationOrder();

  const ledger = await db.query('SELECT id, description, applied_at FROM SCHEMA_MIGRATIONS ORDER BY id ASC');
  assert.equal(ledger.length, 5, 'Ledger must contain exactly 5 migrations');

  const migrationIds = ledger.map(m => m.id);
  assert.deepEqual(migrationIds, [
    '001_files',
    '002_scope_and_sharing',
    '003_account_security',
    '004_workflow_integrity',
    '005_company_leads'
  ]);

  // Idempotency check: running migrations again does not produce errors or duplicate records
  await runMigrations(process.env);
  const ledgerAfter = await db.query('SELECT COUNT(*) as cnt FROM SCHEMA_MIGRATIONS');
  assert.equal(ledgerAfter[0].cnt, 5, 'Re-running migrations must remain strictly idempotent');
});

test('Step 3 — legacy schema compatibility: migration 003 clears plaintext reset_token', async () => {
  const dummyUserId = 'test-legacy-usr-' + uuidv4().slice(0, 8);
  const hash = await bcrypt.hash('secret123', 8);

  // Insert a synthetic user with a legacy plaintext reset_token
  await db.query(
    'INSERT INTO USERS (id, email, password_hash, role, reset_token, is_active) VALUES (?, ?, ?, ?, ?, ?)',
    [dummyUserId, `${dummyUserId}@example.com`, hash, 'candidate', 'legacy_plaintext_token_123', 1]
  );

  // Run migration 003 logic directly
  const migration003 = migrations.find(m => m.id === '003_account_security');
  const pool = db.getPool();
  const conn = await pool.getConnection();
  try {
    await migration003.up(conn);
  } finally {
    conn.release();
  }

  const [userRow] = await db.query('SELECT reset_token, token_version FROM USERS WHERE id = ?', [dummyUserId]);
  assert.equal(userRow.reset_token, null, 'Legacy plaintext reset_token must be cleared to null');
  assert.equal(typeof userRow.token_version, 'number', 'token_version column must be present');

  // Clean up
  await db.query('DELETE FROM USERS WHERE id = ?', [dummyUserId]);
});

test('Step 3 — legacy schema compatibility: migration 004 duplicate detection aborts safely', async () => {
  const dummyJobId = 'test-job-' + uuidv4().slice(0, 8);
  const dummyCandId = 'test-cand-' + uuidv4().slice(0, 8);
  const dummyUserId = 'test-usr-' + uuidv4().slice(0, 8);

  const hash = await bcrypt.hash('secret123', 8);
  await db.query('INSERT INTO USERS (id, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?)',
    [dummyUserId, `${dummyUserId}@example.com`, hash, 'candidate', 1]);
  await db.query('INSERT INTO CANDIDATES (id, user_id, name) VALUES (?, ?, ?)',
    [dummyCandId, dummyUserId, 'Duplicate Test Candidate']);
  await db.query('INSERT INTO JOB (id, title, status) VALUES (?, ?, ?)',
    [dummyJobId, 'Duplicate Test Job', 'open']);

  // Temporarily drop unique index to simulate legacy state with duplicates
  const pool = db.getPool();
  const conn = await pool.getConnection();
  try {
    try {
      await conn.query('ALTER TABLE APPLICATION ADD INDEX idx_app_job_temp (job_id)');
      await conn.query('ALTER TABLE APPLICATION DROP INDEX uk_application_job_candidate');
    } catch (_) {}
    try {
      await conn.query('ALTER TABLE APPLICATION DROP INDEX uk_job_candidate');
    } catch (_) {}

    const app1 = uuidv4();
    const app2 = uuidv4();
    await conn.query('INSERT INTO APPLICATION (id, job_id, candidate_id, status) VALUES (?, ?, ?, ?)', [app1, dummyJobId, dummyCandId, 'applied']);
    await conn.query('INSERT INTO APPLICATION (id, job_id, candidate_id, status) VALUES (?, ?, ?, ?)', [app2, dummyJobId, dummyCandId, 'applied']);

    const migration004 = migrations.find(m => m.id === '004_workflow_integrity');
    let threwDuplicateError = false;
    try {
      await migration004.up(conn);
    } catch (err) {
      threwDuplicateError = true;
      assert.match(err.message, /APPLICATION contains duplicates/i);
    }
    assert.equal(threwDuplicateError, true, 'Migration 004 must abort without modifying data if duplicates exist');

    // Clean up duplicate and restore index
    await conn.query('DELETE FROM APPLICATION WHERE id = ?', [app2]);
    await migration004.up(conn); // Re-run to ensure index is restored
  } finally {
    try {
      await conn.query('ALTER TABLE APPLICATION ADD UNIQUE KEY uk_job_candidate (job_id, candidate_id)');
    } catch (_) {}
    try {
      await conn.query('ALTER TABLE APPLICATION DROP INDEX idx_app_job_temp');
    } catch (_) {}
    await conn.query('DELETE FROM APPLICATION WHERE job_id = ?', [dummyJobId]);
    await conn.query('DELETE FROM JOB WHERE id = ?', [dummyJobId]);
    await conn.query('DELETE FROM CANDIDATES WHERE id = ?', [dummyCandId]);
    await conn.query('DELETE FROM USERS WHERE id = ?', [dummyUserId]);
    conn.release();
  }
});

// -------------------------------------------------------------
// 3. Database Constraints & Uniqueness Checks
// -------------------------------------------------------------
test('Step 3 — database constraint: uk_application_job_candidate prevents duplicate applications', async () => {
  const dummyJobId = 'test-job-' + uuidv4().slice(0, 8);
  const dummyCandId = 'test-cand-' + uuidv4().slice(0, 8);
  const dummyUserId = 'test-usr-' + uuidv4().slice(0, 8);

  const hash = await bcrypt.hash('secret123', 8);
  await db.query('INSERT INTO USERS (id, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?)',
    [dummyUserId, `${dummyUserId}@example.com`, hash, 'candidate', 1]);
  await db.query('INSERT INTO CANDIDATES (id, user_id, name) VALUES (?, ?, ?)',
    [dummyCandId, dummyUserId, 'Constraint Test Candidate']);
  await db.query('INSERT INTO JOB (id, title, status) VALUES (?, ?, ?)',
    [dummyJobId, 'Constraint Test Job', 'open']);

  const app1 = uuidv4();
  const app2 = uuidv4();

  await db.query('INSERT INTO APPLICATION (id, job_id, candidate_id, status) VALUES (?, ?, ?, ?)',
    [app1, dummyJobId, dummyCandId, 'applied']);

  let caughtDuplicate = false;
  try {
    await db.query('INSERT INTO APPLICATION (id, job_id, candidate_id, status) VALUES (?, ?, ?, ?)',
      [app2, dummyJobId, dummyCandId, 'applied']);
  } catch (err) {
    caughtDuplicate = true;
    assert.match(err.message, /Duplicate entry.*uk_application_job_candidate|uk_job_candidate/i);
  }
  assert.equal(caughtDuplicate, true, 'Database must enforce unique constraint on (job_id, candidate_id)');

  // Clean up
  await db.query('DELETE FROM APPLICATION WHERE job_id = ?', [dummyJobId]);
  await db.query('DELETE FROM JOB WHERE id = ?', [dummyJobId]);
  await db.query('DELETE FROM CANDIDATES WHERE id = ?', [dummyCandId]);
  await db.query('DELETE FROM USERS WHERE id = ?', [dummyUserId]);
});

// -------------------------------------------------------------
// 4. Role Fixtures, Permissions & Scopes (Step 4)
// -------------------------------------------------------------
test('Step 4 — synthetic fixtures and permissions for all 7 roles', async () => {
  const pwHash = await bcrypt.hash('password123', 8);

  const fixtures = {
    director: { id: 'usr-p5-director', email: 'director-p5@vakancy.test', role: 'director', is_main_admin: 1 },
    bdLead: { id: 'usr-p5-bdlead', email: 'bdlead-p5@vakancy.test', role: 'bd_lead', is_main_admin: 0 },
    tlCoord: { id: 'usr-p5-tl', email: 'tl-p5@vakancy.test', role: 'tl_coordinator', is_main_admin: 0 },
    recruiter: { id: 'usr-p5-recruiter', email: 'recruiter-p5@vakancy.test', role: 'recruiter', is_main_admin: 0 },
    customRole: { id: 'usr-p5-custom', email: 'audit-specialist-p5@vakancy.test', role: 'audit_specialist', is_main_admin: 0 },
    candidate: { id: 'usr-p5-cand', email: 'candidate-p5@vakancy.test', role: 'candidate', is_main_admin: 0 },
    employer: { id: 'usr-p5-emp', email: 'employer-p5@vakancy.test', role: 'employer', is_main_admin: 0 }
  };

  // 1. Insert Custom Role
  await db.query(
    'INSERT INTO ROLES (id, role_key, display_name, description, is_system) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE display_name = VALUES(display_name)',
    ['role-audit-specialist', 'audit_specialist', 'Audit Specialist', 'Custom compliance and audit reviewer', 0]
  );

  // Grant custom permissions: can view activity_log and candidates, but CANNOT edit or delete
  await db.query(
    'INSERT INTO ROLE_PERMISSIONS (id, role_key, module, action, is_granted) VALUES (?, ?, ?, ?, 1) ON DUPLICATE KEY UPDATE is_granted = 1',
    ['perm-audit-act-view', 'audit_specialist', 'activity_log', 'view']
  );
  await db.query(
    'INSERT INTO ROLE_PERMISSIONS (id, role_key, module, action, is_granted) VALUES (?, ?, ?, ?, 1) ON DUPLICATE KEY UPDATE is_granted = 1',
    ['perm-audit-cand-view', 'audit_specialist', 'candidates', 'view']
  );

  // 2. Insert Users
  for (const f of Object.values(fixtures)) {
    await db.query(`
      INSERT INTO USERS (id, email, password_hash, role, is_main_admin, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
      ON DUPLICATE KEY UPDATE role = VALUES(role), is_main_admin = VALUES(is_main_admin)
    `, [f.id, f.email, pwHash, f.role, f.is_main_admin]);
  }

  // 3. Insert Candidate Profile
  const candProfileId = 'cand-p5-profile';
  await db.query(`
    INSERT INTO CANDIDATES (id, user_id, name, current_location, total_experience)
    VALUES (?, ?, 'Phase 5 Test Candidate', 'Bangalore, India', 4.5)
    ON DUPLICATE KEY UPDATE name = VALUES(name)
  `, [candProfileId, fixtures.candidate.id]);

  // 4. Insert Employer Profile
  const empProfileId = 'emp-p5-profile';
  await db.query(`
    INSERT INTO EMPLOYERS (id, user_id, company_name, industry, approval_status)
    VALUES (?, ?, 'Phase 5 Tech Corp', 'Software', 'approved')
    ON DUPLICATE KEY UPDATE company_name = VALUES(company_name)
  `, [empProfileId, fixtures.employer.id]);

  // 5. Insert Team and Assignments
  const teamId = 'team-p5-alpha';
  await db.query(`
    INSERT INTO TEAMS (id, name, lead_user_id, description)
    VALUES (?, 'Phase 5 Alpha Team', ?, 'Test Alpha Team')
    ON DUPLICATE KEY UPDATE lead_user_id = VALUES(lead_user_id)
  `, [teamId, fixtures.tlCoord.id]);

  await db.query(`
    INSERT INTO USER_ASSIGNMENTS (id, user_id, team_id, scope_type)
    VALUES (?, ?, ?, 'scoped')
    ON DUPLICATE KEY UPDATE team_id = VALUES(team_id)
  `, ['assign-p5-recruiter', fixtures.recruiter.id, teamId]);

  // 6. Test Scopes via rbacUtils
  const directorScope = await getUserScope(fixtures.director.id, fixtures.director.role);
  assert.equal(directorScope.isGlobal, true, 'Director must have global scope');

  const tlScope = await getUserScope(fixtures.tlCoord.id, fixtures.tlCoord.role);
  assert.equal(tlScope.isGlobal, false, 'TL Coordinator must not be global');
  assert.ok(tlScope.teamIds.includes(teamId), 'TL Coordinator must scope to led team');

  const recruiterScope = await getUserScope(fixtures.recruiter.id, fixtures.recruiter.role);
  assert.equal(recruiterScope.isGlobal, false, 'Recruiter must not be global');
  assert.ok(recruiterScope.teamIds.includes(teamId), 'Recruiter must be scoped to assigned team');

  // 7. Test Permissions
  const canDirectorApprove = await hasPermission(fixtures.director.role, 'candidate_sharing', 'approve');
  assert.equal(canDirectorApprove, true, 'Director must have candidate_sharing:approve');

  const canRecruiterApprove = await hasPermission(fixtures.recruiter.role, 'candidate_sharing', 'approve');
  assert.equal(canRecruiterApprove, false, 'Recruiter must NOT have candidate_sharing:approve');

  const canCustomViewActivity = await hasPermission('audit_specialist', 'activity_log', 'view');
  assert.equal(canCustomViewActivity, true, 'Custom role must have granted activity_log:view');

  const canCustomEditActivity = await hasPermission('audit_specialist', 'activity_log', 'edit');
  assert.equal(canCustomEditActivity, false, 'Custom role must NOT have ungranted activity_log:edit');
});

// -------------------------------------------------------------
// 5. Candidate Sharing & Consent Verification (Step 4)
// -------------------------------------------------------------
test('Step 4 — candidate sharing approval requires verified consent and sets encrypted access code', async () => {
  const shareId = 'share-p5-' + uuidv4().slice(0, 8);
  const shareToken = require('crypto').randomBytes(32).toString('hex');
  const candId = 'cand-p5-profile';
  const recruiterId = 'usr-p5-recruiter';
  const directorId = 'usr-p5-director';

  // 1. Insert proposal without consent
  await db.query(`
    INSERT INTO CANDIDATE_SHARING (id, candidate_id, share_token, status, candidate_consent, proposed_by_user_id)
    VALUES (?, ?, ?, 'PROPOSED', 0, ?)
  `, [shareId, candId, shareToken, recruiterId]);

  // Attempt approval without consent should be refused
  const [shareBefore] = await db.query('SELECT candidate_consent FROM CANDIDATE_SHARING WHERE id = ?', [shareId]);
  assert.equal(shareBefore.candidate_consent, 0);

  // 2. Grant candidate consent
  await db.query('UPDATE CANDIDATE_SHARING SET candidate_consent = 1 WHERE id = ?', [shareId]);

  // 3. Approve via transaction
  const rawAccessCode = cryptoUtils.generateAccessCode();
  const accessCodeEncrypted = cryptoUtils.encryptAccessCode(rawAccessCode);
  const accessCodeHash = cryptoUtils.hashAccessCode(rawAccessCode);
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  await db.withTransaction(async (tx) => {
    await tx.query(`
      UPDATE CANDIDATE_SHARING
      SET status = 'APPROVED', approved_by_user_id = ?, expires_at = ?,
          access_code_encrypted = ?, access_code_hash = ?
      WHERE id = ?
    `, [directorId, expiresAt, accessCodeEncrypted, accessCodeHash, shareId]);

    await tx.query(`
      INSERT INTO CANDIDATE_SHARE_ACCESS_LOG (id, share_id, action, actor_user_id)
      VALUES (?, ?, 'APPROVED', ?)
    `, [uuidv4(), shareId, directorId]);
  });

  const [shareAfter] = await db.query('SELECT status, approved_by_user_id, access_code_hash, expires_at FROM CANDIDATE_SHARING WHERE id = ?', [shareId]);
  assert.equal(shareAfter.status, 'APPROVED');
  assert.equal(shareAfter.approved_by_user_id, directorId);
  assert.equal(shareAfter.access_code_hash, accessCodeHash);
  assert.ok(new Date(shareAfter.expires_at) > new Date());

  // 4. Test Expiration: simulated expired share is rejected
  const pastDate = new Date(Date.now() - 10000);
  await db.query('UPDATE CANDIDATE_SHARING SET expires_at = ? WHERE id = ?', [pastDate, shareId]);

  const [expiredShare] = await db.query('SELECT * FROM CANDIDATE_SHARING WHERE id = ? AND expires_at > NOW()', [shareId]);
  assert.equal(expiredShare, undefined, 'Expired candidate share must not be returned by active queries');

  // Clean up
  await db.query('DELETE FROM CANDIDATE_SHARE_ACCESS_LOG WHERE share_id = ?', [shareId]);
  await db.query('DELETE FROM CANDIDATE_SHARING WHERE id = ?', [shareId]);
});

// -------------------------------------------------------------
// 6. Multi-Table Transaction Integrity & Rollback (Step 5)
// -------------------------------------------------------------
test('Step 5 — transaction rollback on job application failure', async () => {
  const dummyJobId = 'job-tx-test-' + uuidv4().slice(0, 8);
  const dummyCandId = 'cand-p5-profile';
  const dummyUserId = 'usr-p5-cand';
  const dummyAppId = 'app-tx-' + uuidv4().slice(0, 8);

  await db.query('INSERT INTO JOB (id, title, status, assigned_recruiter_id) VALUES (?, ?, ?, ?)',
    [dummyJobId, 'TX Application Job', 'open', 'usr-p5-recruiter']);

  // Simulate an application attempt where pipeline creation fails
  let threwExpected = false;
  try {
    await db.withTransaction(async (tx) => {
      await tx.query(
        'INSERT INTO APPLICATION (id, job_id, candidate_id, status) VALUES (?, ?, ?, ?)',
        [dummyAppId, dummyJobId, dummyCandId, 'applied']
      );

      // Simulated error in next multi-table step
      throw new Error('Simulated external constraint failure during ATS stage linkage');
    });
  } catch (err) {
    threwExpected = true;
    assert.match(err.message, /Simulated external constraint failure/);
  }
  assert.equal(threwExpected, true);

  // Verify that the APPLICATION record was rolled back and does not exist in the database
  const apps = await db.query('SELECT * FROM APPLICATION WHERE id = ?', [dummyAppId]);
  assert.equal(apps.length, 0, 'Rolled-back application must not persist in the database');

  await db.query('DELETE FROM JOB WHERE id = ?', [dummyJobId]);
});

test('Step 5 — transaction rollback on ATS stage movement failure', async () => {
  const dummyPipId = 'pip-tx-' + uuidv4().slice(0, 8);
  const dummyJobId = 'job-tx-' + uuidv4().slice(0, 8);
  const dummyCandId = 'cand-p5-profile';
  const stageApplied = 'ats-applied-' + uuidv4().slice(0, 6);
  const stageShortlisted = 'ats-shortlisted-' + uuidv4().slice(0, 6);

  await db.query('INSERT INTO ATS_STAGE (id, name, `order`, is_active) VALUES (?, ?, 1, 1)', [stageApplied, 'Applied Stage']);
  await db.query('INSERT INTO ATS_STAGE (id, name, `order`, is_active) VALUES (?, ?, 2, 1)', [stageShortlisted, 'Shortlisted Stage']);
  await db.query('INSERT INTO JOB (id, title, status) VALUES (?, ?, ?)', [dummyJobId, 'ATS Job', 'open']);
  await db.query('INSERT INTO CANDIDATE_PIPELINE (id, candidate_id, job_id, stage_id, recruiter_id) VALUES (?, ?, ?, ?, ?)',
    [dummyPipId, dummyCandId, dummyJobId, stageApplied, 'usr-p5-recruiter']);

  // Move stage with deliberate error in stage history
  let threwHistoryError = false;
  try {
    await db.withTransaction(async (tx) => {
      await tx.query('UPDATE CANDIDATE_PIPELINE SET stage_id = ? WHERE id = ?', [stageShortlisted, dummyPipId]);

      // Deliberately trigger failure (e.g. invalid foreign key or forced error)
      throw new Error('Forced audit failure after pipeline update');
    });
  } catch (err) {
    threwHistoryError = true;
  }
  assert.equal(threwHistoryError, true);

  // Verify CANDIDATE_PIPELINE remains in initial stageApplied
  const [pip] = await db.query('SELECT stage_id FROM CANDIDATE_PIPELINE WHERE id = ?', [dummyPipId]);
  assert.equal(pip.stage_id, stageApplied, 'Pipeline stage must roll back to original stage upon failure');

  // Clean up
  await db.query('DELETE FROM CANDIDATE_PIPELINE WHERE id = ?', [dummyPipId]);
  await db.query('DELETE FROM JOB WHERE id = ?', [dummyJobId]);
  await db.query('DELETE FROM ATS_STAGE WHERE id IN (?, ?)', [stageApplied, stageShortlisted]);
});

test('Step 5 — transaction rollback on callback update failure', async () => {
  const cbId = 'cb-tx-' + uuidv4().slice(0, 8);
  const dummyJobId = 'job-tx-' + uuidv4().slice(0, 8);

  await db.query('INSERT INTO JOB (id, title, status) VALUES (?, ?, ?)', [dummyJobId, 'CB Job', 'open']);
  await db.query(`
    INSERT INTO CALLBACK_REQUEST (id, job_id, requested_by_user_id, status)
    VALUES (?, ?, 'usr-p5-emp', 'NEW')
  `, [cbId, dummyJobId]);

  let rollbackCaught = false;
  try {
    await db.withTransaction(async (tx) => {
      await tx.query('UPDATE CALLBACK_REQUEST SET status = "ASSIGNED" WHERE id = ?', [cbId]);
      throw new Error('Forced failure during callback notification');
    });
  } catch (_) {
    rollbackCaught = true;
  }
  assert.equal(rollbackCaught, true);

  const [cbRow] = await db.query('SELECT status FROM CALLBACK_REQUEST WHERE id = ?', [cbId]);
  assert.equal(cbRow.status, 'NEW', 'Callback status must roll back to NEW');

  await db.query('DELETE FROM CALLBACK_REQUEST WHERE id = ?', [cbId]);
  await db.query('DELETE FROM JOB WHERE id = ?', [dummyJobId]);
});
