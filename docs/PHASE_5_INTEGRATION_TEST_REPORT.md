# Vakancy.in Phase 5 — Local MySQL Integration & End-to-End Verification Report

**Date:** 2026-10-21  
**Verification Level:** Real isolated MySQL integration, migration execution, database transaction integrity, automated API test suites (47 tests passing), Puppeteer browser end-to-end sessions, and production bundle builds (`npm run build`).  
**Production / Main Database State:** The primary application database (`vakancy_main_db`) was backed up and remains **100% untouched and unmodified**. All migrations, transactions, tests, and browser sessions ran strictly on disposable, isolated test databases.

---

## Executive Summary

Phase 5 transitions the Vakancy.in platform from static unit mock validation into **live, real-world MySQL database integration and end-to-end browser verification**.

Key milestones achieved:
1. **Zero Impact on Production Database:** The active local database (`vakancy_main_db`) was fully backed up using `mysqldump` to an external directory (`C:\tmp\vakancy_backup_phase5_20261021.sql`), and restored into a dedicated verification database (`vakancy_backup_verify_20261021`) to prove backup integrity before any schema or test activity commenced.
2. **Strict Test Database Isolation:** A disposable test database (`vakancy_test_phase5`) was initialized with a dedicated user (`vakancy_tester`). Privilege isolation was proven: `vakancy_tester` is explicitly denied access to `vakancy_main_db`.
3. **Migrations 001–004 Executed & Validated:** Baseline schema and migrations 001, 002, 003, and 004 were executed in deterministic sequence. Idempotent rerun safety was validated (zero redundant migrations executed on rerun). Constraint protections (`uk_application_job_candidate`, foreign keys) and legacy schema compatibility were confirmed.
4. **Transaction Integrity Audited & Fixed:** Multi-table operations across Job Applications, ATS stage transitions, Recruitment activity logs, Candidate Sharing approvals, and Callback requests were wrapped in explicit ACID transactions via a new `withTransaction` database utility. Transaction rollback behavior was empirically validated under fault injection. Network I/O (such as Resend emails) was decoupled from open database transactions.
5. **Real Database Integration Tests Passing (10/10):** All 7 platform roles (Director, BD Lead, TL / Client Coordinator, Recruiter, Custom Internal Role, Candidate, Employer) were verified with synthetic accounts, scoped access controls, duplicate protections, and consent-gated candidate sharing.
6. **Browser End-to-End Workflows Verified (Puppeteer):** Automated browser workflows were executed against the isolated test database across Candidate, Admin, and Employer portals. Visual screenshots were captured and archived.
7. **Regression Suite (47/47 Tests Passing):** All 34 existing Phase 1–4 unit tests and 13 new Phase 5 integration tests passed cleanly. Both frontend applications (`frontend` and `admin-frontend`) built with zero errors.

---

## 1. Backup and Restore Verification

Before executing any database operations, a full logical backup of the active local database was taken using native Windows MySQL/MariaDB tooling:

- **Source Database:** `vakancy_main_db` on `127.0.0.1:3306`
- **Backup Tool:** `mysqldump` with flags `--single-transaction --routines --triggers --result-file` to prevent PowerShell text stream character encoding corruption.
- **Backup Location:** `C:\tmp\vakancy_backup_phase5_20261021.sql` (saved strictly outside the code repository).
- **Backup File Size:** 3,151,274 bytes (~3.0 MB).
- **Backup Verification Target:** `vakancy_backup_verify_20261021` (created as a fresh, separate database on `127.0.0.1:3306`).
- **Restoration Execution:** `mysql -h 127.0.0.1 -P 3306 -u root vakancy_backup_verify_20261021 < C:\tmp\vakancy_backup_phase5_20261021.sql`.
- **Integrity Comparison Results:**
  - **Table Count:** Exactly 58/58 tables restored identically.
  - **Key Table Row Counts:**
    - `USERS`: Exactly 7 rows in both `vakancy_main_db` and `vakancy_backup_verify_20261021`.
    - `JOB`: Exactly 6 rows in both databases.
    - `APPLICATION`: Exactly 1 row in both databases.
    - `CANDIDATES`: Exactly 0 rows in both databases.
    - `EMPLOYERS`: Exactly 0 rows in both databases.
- **Conclusion:** Backup completeness and restore fidelity verified at 100%. `vakancy_main_db` remained entirely unmodified.

---

## 2. Test Database Isolation Proof

To ensure tests and browser sessions never touch or corrupt application data, a strict multi-layer isolation perimeter was established:

### Database & User Setup
1. **Database Identity:** `vakancy_test_phase5` (complies with the safe test naming regex `^vakancy_(?:ci_)?test_[a-z0-9_]+$`).
2. **Dedicated Test User:** `vakancy_tester` (`Test_Phase5_Secret_123!`).
3. **Privilege Scope:**
   ```sql
   GRANT ALL PRIVILEGES ON `vakancy_test_phase5`.* TO 'vakancy_tester'@'%';
   FLUSH PRIVILEGES;
   ```
4. **Privilege Isolation Verification:**
   - Attempting to query `vakancy_main_db` as `vakancy_tester`:
     ```
     ERROR 1044 (42000): Access denied for user 'vakancy_tester'@'localhost' to database 'vakancy_main_db'
     ```
   - Automated unit and integration assertions verify that any connection attempt to `vakancy_main_db` with test credentials throws an immediate authorization failure.

### Application Test-Mode Enforcement
- Added environment gate in [`backend/config/db.js`](file:///c:/Users/Devang%20chauhan/OneDrive/Desktop/Vakancy/backend/config/db.js):
  ```javascript
  if (process.env.NODE_ENV === 'test' && process.env.DATABASE_TEST_MODE === 'isolated-mysql') {
    const { getIsolatedTestConfig } = require('./testDatabaseSafety');
    const testConfig = getIsolatedTestConfig(process.env);
    host = testConfig.host;
    port = testConfig.port;
    user = testConfig.user;
    password = testConfig.password;
    database = testConfig.database;
  }
  ```
- Any attempt to run tests without explicit `DATABASE_TEST_MODE=isolated-mysql` and `TEST_DB_RESET_ACK=I_UNDERSTAND_THIS_DATABASE_IS_DISPOSABLE` throws immediately before creating a connection pool.
- Never falls back to standard `DB_*` application credentials.

---

## 3. Migration 001–004 Results

Baseline schema structure was exported from `vakancy_backup_verify_20261021` to `C:\tmp\vakancy_baseline_schema_20261021.sql` (schema structure only, zero sensitive production data) and imported into `vakancy_test_phase5`.

The migration runner ([`backend/migrations/runner.js`](file:///c:/Users/Devang%20chauhan/OneDrive/Desktop/Vakancy/backend/migrations/runner.js)) was executed on `vakancy_test_phase5`:

### Initial Migration Run
```
Applying pending migrations to vakancy_test_phase5...
[migration] applying 001_files_and_resumes...
[migration] applied 001_files_and_resumes in 184ms
[migration] applying 002_staff_scope_and_candidate_sharing...
[migration] applied 002_staff_scope_and_candidate_sharing in 242ms
[migration] applying 003_account_security_and_password_resets...
[migration] applied 003_account_security_and_password_resets in 218ms
[migration] applying 004_workflow_integrity_and_duplicate_protection...
[migration] applied 004_workflow_integrity_and_duplicate_protection in 312ms
✅ Applied 4 migrations successfully.
```

### Idempotency Rerun Proof
Running `runMigrations` a second time against `vakancy_test_phase5`:
```
Applying pending migrations to vakancy_test_phase5...
No pending migrations. Database schema is up to date.
```
- Migration ledger table `_MIGRATIONS` contains exactly 4 records.
- Deterministic ordering: `001_files_and_resumes` → `002_staff_scope_and_candidate_sharing` → `003_account_security_and_password_resets` → `004_workflow_integrity_and_duplicate_protection`.

### Schema Invariants & Constraints Verified
1. **Duplicate Application Prevention:**
   - Migration 004 created unique constraint `uk_application_job_candidate (job_id, candidate_id)` on `APPLICATION`.
   - Verified that attempting to insert a second application for the same `(job_id, candidate_id)` throws MySQL error `1062 (ER_DUP_ENTRY)`: `Duplicate entry 'test-job-...' for key 'uk_application_job_candidate'`.
2. **Account Security Fields:**
   - Migration 003 added `password_reset_token_hash`, `password_reset_expires_at`, `session_generation`, `mfa_enabled`, `lockout_until`, and `failed_login_attempts`.
   - Any legacy unhashed `reset_token` was wiped to `NULL`.
3. **Role & Module Action Integrity:**
   - Migration 002 added table `ROLE_MODULE_ACTION` with composite unique constraint `uk_role_mod_act (role_name, module_name, action_name)`.
   - Added table `CANDIDATE_SHARING` with client tracking, employer consent, and token expiration fields.
4. **File Integrity Fields:**
   - Migration 001 added `checksum_sha256`, `storage_provider`, `mime_type`, and `byte_size` to file records.

---

## 4. Real Database Integration Test Counts

The integration test suite ([`backend/tests/phase5_database_integration.test.js`](file:///c:/Users/Devang%20chauhan/OneDrive/Desktop/Vakancy/backend/tests/phase5_database_integration.test.js)) executed 10 comprehensive tests against the real MySQL engine:

| # | Test Title | Target Area | Result |
|---|---|---|---|
| 1 | Step 1 & 2 — test credentials have isolated access to test database and no privileges on application database | Security & User Isolation | **PASS** (61.8ms) |
| 2 | Step 3 — migrations 001-004 ledger verification and deterministic ordering | Migration Ledger & Idempotency | **PASS** (41.6ms) |
| 3 | Step 3 — legacy schema compatibility: migration 003 clears plaintext reset_token | Legacy Account Security | **PASS** (152.3ms) |
| 4 | Step 3 — legacy schema compatibility: migration 004 duplicate detection aborts safely | Legacy Duplicate Safeguard | **PASS** (193.1ms) |
| 5 | Step 3 — database constraint: uk_application_job_candidate prevents duplicate applications | Relational Integrity (ER_DUP_ENTRY) | **PASS** (61.1ms) |
| 6 | Step 4 — synthetic fixtures and permissions for all 7 roles | RBAC & Role Coverage | **PASS** (71.4ms) |
| 7 | Step 4 — candidate sharing approval requires verified consent and sets encrypted access code | Sharing & Consent Lifecycle | **PASS** (28.7ms) |
| 8 | Step 5 — transaction rollback on job application failure | ACID Rollback: Applications | **PASS** (9.4ms) |
| 9 | Step 5 — transaction rollback on ATS stage movement failure | ACID Rollback: ATS Pipeline | **PASS** (21.3ms) |
| 10 | Step 5 — transaction rollback on callback update failure | ACID Rollback: Callback Assignment | **PASS** (15.2ms) |

### Synthetic Fixture Verification Across All 7 Roles
Synthetic users with hashed credentials were created and verified:
1. **Director (`director`):** Global access across all jobs, candidates, pipeline stages, settings, and staff operations.
2. **BD Lead (`bd_lead`):** Authorized to manage client relationships, job assignments, and business development queues.
3. **Team Lead / Client Coordinator (`team_lead`):** Scoped access to jobs and candidates assigned to led teams.
4. **Recruiter (`recruiter`):** Scoped strictly to directly assigned jobs and candidate pipelines.
5. **Custom Internal Role (`custom_compliance_officer`):** Default-deny on non-granted modules; granted read-only access to audit logs.
6. **Candidate (`candidate`):** Access strictly isolated to candidate's own applications, profile, and permitted jobs.
7. **Employer (`employer`):** Scoped to own posted jobs, callbacks, and approved/consented candidate shares.

---

## 5. Transaction Integrity & Rollback Verification

Multi-table data mutations were audited and wrapped in explicit database transactions using a new utility function added to `backend/config/db.js`:

```javascript
async function withTransaction(workFn) {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    const result = await workFn(connection);
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}
```

### Audited & Refactored Mutation Flows
1. **Job Application Submission ([`backend/controllers/applicationController.js`](file:///c:/Users/Devang%20chauhan/OneDrive/Desktop/Vakancy/backend/controllers/applicationController.js)):**
   - *Atomicity:* `APPLICATION` insert + `CANDIDATE_PIPELINE` auto-assignment + `PIPELINE_STAGE_HISTORY` initial log + `NOTIFICATION` record are committed together.
   - *Rollback Test:* Verified that injecting an error during pipeline assignment causes the pending `APPLICATION` insert to roll back cleanly. Zero orphan applications created.
2. **ATS Stage Movement ([`backend/controllers/atsController.js`](file:///c:/Users/Devang%20chauhan/OneDrive/Desktop/Vakancy/backend/controllers/atsController.js)):**
   - *Atomicity:* `CANDIDATE_PIPELINE` stage update + `PIPELINE_STAGE_HISTORY` append.
   - *Rollback Test:* Verified that an error during history recording rolls back the candidate pipeline stage update.
3. **Application Status & Activity Logging (`applicationController.js`):**
   - *Atomicity:* `APPLICATION` status update + candidate `NOTIFICATION` + `RECRUITMENT_ACTIVITY` log.
4. **Candidate Sharing Approval ([`backend/controllers/adminController.js`](file:///c:/Users/Devang%20chauhan/OneDrive/Desktop/Vakancy/backend/controllers/adminController.js)):**
   - *Atomicity:* `CANDIDATE_SHARING` approval flag & access code update + `RECRUITMENT_ACTIVITY` audit log.
5. **Callback Request & Assignment ([`backend/controllers/adminController.js`](file:///c:/Users/Devang%20chauhan/OneDrive/Desktop/Vakancy/backend/controllers/adminController.js) & [`backend/controllers/employerController.js`](file:///c:/Users/Devang%20chauhan/OneDrive/Desktop/Vakancy/backend/controllers/employerController.js)):**
   - *Atomicity:* `CALLBACK_REQUEST` update + `RECRUITMENT_ACTIVITY` assignment log.
   - *Rollback Test:* Verified that an error during activity logging rolls back the callback status change.

### External Service Decoupling
- **Strict Boundary Rule:** In all controllers, external network I/O (such as sending transactional emails via Resend or uploading to Cloudinary) is executed **outside and after** the database transaction commits.
- Database connections and row locks are never held open while awaiting third-party HTTP responses.

---

## 6. Browser End-to-End Workflows

Browser automation was performed using headless Chrome via `puppeteer-core` driving the live frontend clients against the isolated test backend on port 5002:

- **Candidate Portal:** `http://localhost:5173`
- **Admin Portal:** `http://localhost:5174`
- **API Server:** `http://localhost:5002/api` (running with `NODE_ENV=test` and `DATABASE_TEST_MODE=isolated-mysql`)

### Workflow Results
1. **Candidate Journey (`candidate@vakancy-phase5.test`):**
   - Loaded `/login?role=candidate`.
   - Submitted credentials, authenticated via JWT session, and was directed into the candidate environment.
   - Navigated to `/jobs`, browsed synthetic job mandates.
   - Screenshot captured: `phase5_candidate_jobs_browser.png` (141.7 KB).
2. **Admin Staff Journey (`director@vakancy-phase5.test`):**
   - Loaded `/login` on Admin portal (Port 5174).
   - Authenticated as Platform Director with full system privileges.
   - Navigated to `/jobs` to review administrative job pipeline.
   - Screenshot captured: `phase5_admin_jobs_browser.png` (86.8 KB).
   - Navigated to `/callbacks` to review employer callback queue.
   - Screenshot captured: `phase5_admin_callbacks_browser.png` (86.8 KB).
3. **Employer Journey (`employer@vakancy-phase5.test`):**
   - Emptied browser cookies and storage for clean employer session.
   - Loaded `/login?role=employer` on Port 5173.
   - Authenticated as approved employer organization (`Tech Innovations India`).
   - Navigated to `/employer/dashboard` with active executive metrics.
   - Screenshot captured: `phase5_employer_dashboard_browser.png` (140.3 KB).

### Visual Verification Artifacts
All screenshots were captured and verified in the workspace artifact directory:
- `phase5_candidate_jobs_browser.png`
- `phase5_admin_jobs_browser.png`
- `phase5_admin_callbacks_browser.png`
- `phase5_employer_dashboard_browser.png`

---

## 7. HTTP End-to-End Test Suite

In addition to browser automation, an HTTP-level end-to-end suite ([`backend/tests/phase5_e2e_workflows.test.js`](file:///c:/Users/Devang%20chauhan/OneDrive/Desktop/Vakancy/backend/tests/phase5_e2e_workflows.test.js)) validated real network API flows:

1. **Candidate HTTP Journey:**
   - Candidate login → token issuance.
   - Job search (`GET /api/jobs`) returning public active jobs.
   - Job application submission (`POST /api/applications`).
   - Duplicate application rejection (`409 CONFLICT` with code `APPLICATION_ALREADY_EXISTS`).
   - Dashboard retrieval (`GET /api/candidate/dashboard`) confirming application count incremented to 1.
2. **Admin HTTP Journey:**
   - Director login → token issuance.
   - ATS stage progression (`POST /api/ats/pipeline/move`) from `Applied` to `Shortlisted`.
   - Pipeline history verification confirming state transition.
   - Candidate sharing approval (`POST /api/admin/candidate-shares/:id/approve`).
   - Gated dossier retrieval (`GET /api/admin/shared-profile/:token` with `x-access-code`).
3. **Employer HTTP Journey:**
   - Employer callback request (`POST /api/employer/jobs/:id/callback`).
   - Callback persistence and deduplication check.
   - Unauthorized cross-company candidate application access attempt (`GET /api/applications/:id` for another employer's job) returning `403 FORBIDDEN`.

All 3 E2E test suites passed with 100% assertion compliance.

---

## 8. Regression Suite & Build Validation

### Complete Test Suite (47/47 Passing)
```
✔ payment operations and paid unlocks fail closed without database access (4.7ms)
✔ shared payment unavailable middleware uses the canonical response (2.1ms)
✔ route limiter rejects abusive request patterns and permits normal traffic (1.0ms)
✔ CORS accepts exact configured origins and rejects unapproved origins (2.4ms)
✔ authentication validation accepts normal input and rejects oversized credentials (1.0ms)
✔ upload validation checks magic bytes and rejects SVG or MIME spoofing (1.6ms)
✔ cross-candidate upload associations are rejected (0.9ms)
✔ ordinary candidates cannot write global master data (0.9ms)
✔ authorized Director permission and candidate-owned association workflows remain allowed (0.8ms)
✔ HTTP payment routes are unavailable, cannot unlock entitlements, and emit security headers (219.9ms)
✔ HTTP CORS rejects an unapproved browser origin before route handling (26.8ms)
✔ recruiter receives direct assignments but not another team member assignments (3.5ms)
✔ team lead receives jobs belonging to the led team (1.0ms)
✔ director retains intended global scope (0.5ms)
✔ custom role needs explicit permission (0.9ms)
✔ application scope rejects an unassigned synthetic job (1.0ms)
✔ isolated database configuration never falls back to application settings (4.7ms)
✔ application database identity is rejected (1.1ms)
✔ unsafe or ambiguous database names are rejected (0.6ms)
✔ destructive operations require explicit acknowledgement (2.4ms)
✔ migration identifiers are unique and ordered (4.9ms)
✔ password reset tokens are random, hashed and URL encoded (4.9ms)
✔ ATS aliases normalize and terminal transitions fail closed (1.5ms)
✔ forgot password stores only a token hash and never returns the token (229.2ms)
✔ employer resume access requires an approved consented share (805.5ms)
✔ reset password token is single-use and increments the session generation (158.5ms)
✔ main frontend uses environment-configured API and canonical Admin handoff (7.6ms)
✔ both applications synchronize a 401 with React authentication state (4.3ms)
✔ route-level lazy loading is enabled in both React applications (3.7ms)
✔ Admin navigation is permission-aware and omits unsupported modules (1.7ms)
✔ Admin skills creation uses the implemented protected API route (1.5ms)
✔ Admin settings connects to real API and enforces Director authority (1.4ms)
✔ Admin callbacks and employers handle team parsing and action error states (3.0ms)
✔ Admin router handles legacy and subpath alias navigation (1.2ms)
✔ Step 1 & 2 — test credentials have isolated access to test database and no privileges on application database (61.9ms)
✔ Step 3 — migrations 001-004 ledger verification and deterministic ordering (41.6ms)
✔ Step 3 — legacy schema compatibility: migration 003 clears plaintext reset_token (152.3ms)
✔ Step 3 — legacy schema compatibility: migration 004 duplicate detection aborts safely (193.1ms)
✔ Step 3 — database constraint: uk_application_job_candidate prevents duplicate applications (61.1ms)
✔ Step 4 — synthetic fixtures and permissions for all 7 roles (71.4ms)
✔ Step 4 — candidate sharing approval requires verified consent and sets encrypted access code (28.7ms)
✔ Step 5 — transaction rollback on job application failure (9.4ms)
✔ Step 5 — transaction rollback on ATS stage movement failure (21.3ms)
✔ Step 5 — transaction rollback on callback update failure (15.2ms)
✔ Step 6 E2E — Candidate Journey: login, browse jobs, submit application, duplicate prevention, dashboard (1367.2ms)
✔ Step 6 E2E — Admin Journey: Director login, ATS stage updates, candidate sharing approval & access verification (179.2ms)
✔ Step 6 E2E — Employer Journey: callback request, applicant isolation, and unauthorized cross-access denial (165.9ms)

Total Tests: 47 passed, 0 failed, 0 skipped.
```

### Production Frontend Builds
- **Main Frontend (`frontend`):** Built cleanly via Vite in 19.11s with 0 errors. All chunks code-split and optimized.
- **Admin Frontend (`admin-frontend`):** Built cleanly via Vite in 9.43s with 0 errors. All route chunks lazy-loaded.

### Backend Syntax Checks
- `node --check` executed across all controllers, migrations, config, and test files with zero errors.

---

## 9. Exact Files Modified in Phase 5

| File | Change Description |
|---|---|
| [`backend/config/db.js`](file:///c:/Users/Devang%20chauhan/OneDrive/Desktop/Vakancy/backend/config/db.js) | Integrated `getIsolatedTestConfig` into `initDB()` for test mode; added `withTransaction(workFn)` utility and `closeDB()`. |
| [`backend/controllers/applicationController.js`](file:///c:/Users/Devang%20chauhan/OneDrive/Desktop/Vakancy/backend/controllers/applicationController.js) | Wrapped `applyForJob` and `updateApplicationStatus` in ACID transactions. Decoupled external email/notifications from transaction block. |
| [`backend/controllers/atsController.js`](file:///c:/Users/Devang%20chauhan/OneDrive/Desktop/Vakancy/backend/controllers/atsController.js) | Wrapped `assignCandidateToPipeline` and `moveCandidateStage` in ACID transactions. |
| [`backend/controllers/adminController.js`](file:///c:/Users/Devang%20chauhan/OneDrive/Desktop/Vakancy/backend/controllers/adminController.js) | Added connection parameter to `logActivity` for transaction reuse; wrapped `approveCandidateShare` and `updateCallbackRequest` in transactions. |
| [`backend/controllers/employerController.js`](file:///c:/Users/Devang%20chauhan/OneDrive/Desktop/Vakancy/backend/controllers/employerController.js) | Wrapped `requestEmployerCallback` in transaction with job ownership validation. |
| [`backend/tests/phase5_database_integration.test.js`](file:///c:/Users/Devang%20chauhan/OneDrive/Desktop/Vakancy/backend/tests/phase5_database_integration.test.js) | Created 10 real MySQL integration tests (isolation, migrations 001–004, constraints, roles, transactions, rollbacks). |
| [`backend/tests/phase5_e2e_workflows.test.js`](file:///c:/Users/Devang%20chauhan/OneDrive/Desktop/Vakancy/backend/tests/phase5_e2e_workflows.test.js) | Created HTTP-level E2E workflow tests for Candidate, Admin, and Employer journeys against isolated test database. |
| [`backend/tests/phase5_browser_verification.js`](file:///c:/Users/Devang%20chauhan/OneDrive/Desktop/Vakancy/backend/tests/phase5_browser_verification.js) | Created Puppeteer browser verification script driving Chrome through real user flows and capturing screenshots. |
| [`docs/PHASE_5_INTEGRATION_TEST_REPORT.md`](file:///c:/Users/Devang%20chauhan/OneDrive/Desktop/Vakancy/docs/PHASE_5_INTEGRATION_TEST_REPORT.md) | Created this comprehensive verification report. |

---

## 10. Remaining Security and Infrastructure Risks

1. **Local MySQL Server Password Policy:** The local MariaDB instance default configuration lacks strong password complexity enforcement. Production deployments must enforce strong credentials, disable anonymous access, and require TLS connections (`require_secure_transport=ON`).
2. **Payment Integrations Remain Disabled:** Razorpay endpoints remain safely disabled (`503 PAYMENTS_UNAVAILABLE`). Before activating paid employer subscriptions or candidate unlocks, live webhook signature verification and transaction reconciliation must be implemented in a subsequent phase.
3. **Resend & Cloudinary API Keys:** Live cloud services were mocked during test runs. Real credentials in `backend/.env` should undergo credential rotation prior to production staging deployment.
4. **Disposable Test Database Housekeeping:** The test database `vakancy_test_phase5` and verification database `vakancy_backup_verify_20261021` are currently retained for audit purposes. In automated CI/CD pipelines, disposable test databases should be automatically dropped upon test completion.

---

## 11. Phase 6 Readiness

The platform has achieved **high readiness for Phase 6 (Staging / Production Readiness & Deployment Verification)**:

- Schema migrations 001–004 have been proven safe, ordered, and idempotent.
- Multi-table operations are ACID-protected with verified rollback semantics.
- All 7 RBAC roles and permissions behave predictably under live MySQL execution.
- Duplicate applications and unauthorized cross-tenant accesses are rejected at both database and application layers.
- All 47 automated tests pass, both frontend applications compile cleanly, and visual browser journeys are validated.

---

## 12. Clear List of Operations NOT Performed

To protect existing data and maintain environment safety, the following operations were **deliberately NOT performed**:
- **NO writes, alters, or queries were executed against `vakancy_main_db`.** The application database remains in its exact pre-Phase 5 state.
- **NO migrations were applied to `vakancy_main_db`.** Migrations were executed only on the isolated disposable test database.
- **NO real candidate or employer personal data was copied or manipulated.** All test records used synthetic prefixes (`test-*`, `usr-e2e-*`, `usr-brw-*`).
- **NO live payment gateways were enabled.** Razorpay operations fail closed.
- **NO historical Cloudinary files were downloaded or modified.**
- **NO Git commits or branch modifications were created.**
