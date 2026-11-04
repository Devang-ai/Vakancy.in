# Vakancy.in Phase 0: Safe Development Baseline

**Baseline date:** 2026-10-21 (Asia/Calcutta)  
**Repository branch:** `main`  
**HEAD:** `72f3754f9d2ed77e53a15f8a7be28f0790713289`  
**Scope:** Documentation and non-mutating validation only. Phase 1 security implementation has not started.

## 1. Phase 0 implementation plan and status

| Step | Action | Status |
|---|---|---|
| 1 | Capture Git branch, HEAD, modified files, staged files, and untracked files | Completed |
| 2 | Confirm canonical application ownership and existing architecture | Completed |
| 3 | Identify the active database configuration without reading out secret values | Completed |
| 4 | Assess database backup availability and test isolation | Completed |
| 5 | Statically classify test, repair, seed, and diagnostic scripts by side effects | Completed |
| 6 | Validate both frontend builds in temporary directories and check backend syntax | Completed |
| 7 | Document rollback controls and the prioritized Phase 1 security backlog | Completed |
| 8 | Create a baseline branch or commit | Not performed; requires owner review of the pre-existing dirty worktree first |

## 2. Current Git baseline

The repository is tracking `origin/main` with no reported ahead/behind commits. The worktree is not clean:

- 20 tracked files are modified.
- 23 paths are untracked.
- 0 changes are staged.
- The tracked diff is approximately 4,206 insertions and 474 deletions.
- Git reports line-ending normalization warnings on several modified files. No normalization was performed during Phase 0.

### Modified tracked files

```text
admin-frontend/src/App.jsx
admin-frontend/src/components/layout/AdminLayout.jsx
admin-frontend/src/pages/AdminApplications.jsx
admin-frontend/src/pages/AdminDashboard.jsx
admin-frontend/src/pages/AdminEmployers.jsx
admin-frontend/src/pages/AdminJobs.jsx
backend/config/db.js
backend/controllers/adminController.js
backend/controllers/applicationController.js
backend/controllers/employerController.js
backend/controllers/jobController.js
backend/package-lock.json
backend/package.json
backend/routes/adminRoutes.js
backend/routes/applicationRoutes.js
backend/routes/employerRoutes.js
backend/services/emailService.js
backend/tests/automated_recruitment_operations_validation.js
backend/tests/phase3_e2e_client_acceptance_suite.js
frontend/src/pages/employer/EmployerApplicantsPage.jsx
```

### Untracked paths

```text
admin-frontend/src/components/jobs/AdminJobDetailsModal.jsx
admin-frontend/src/components/jobs/AdminJobFormModal.jsx
admin-frontend/src/pages/AdminCallbacks.jsx
backend/tests/audit_module2_comprehensive.js
backend/tests/capture_admin_screens.js
backend/tests/capture_applications.js
backend/tests/capture_dashboard_screenshots.js
backend/tests/check_applications.js
backend/tests/inspect_data.js
backend/tests/inspect_resume_records.js
backend/tests/inspect_resume_tables.js
backend/tests/print_candidate_resumes.js
backend/tests/recover_historical_application.js
backend/tests/run_db_repair.js
backend/tests/run_module2_audit.js
backend/tests/search_app_references.js
backend/tests/test_admin_resume_delivery.js
backend/tests/test_cb_debug.js
backend/tests/test_cloudinary_resumes.js
backend/tests/test_module1_dashboard.js
backend/tests/test_module2_job_management.js
backend/tests/test_recruitment_queue_verification.js
backend/tests/verify_db_clean.js
backend/utils/cryptoUtils.js
```

These are pre-existing changes and must be preserved. Do not use `git reset --hard`, `git clean`, forced checkout, or broad automated formatting. Before a baseline commit is created, the owner should review whether all 43 paths belong to one coherent recruitment/admin change set or need to be separated into intentional commits.

## 3. Canonical applications and deployment ownership

| Application | Canonical responsibility | Technology | Default local endpoint | Deployment ownership |
|---|---|---|---|---|
| `frontend/` | Public pages, candidate portal, employer portal, and recruiter-facing employer workflow | React 18, Vite, React Router, Axios, Tailwind | `http://localhost:5173` | Public web application (`vakancy.in` / `www.vakancy.in`) |
| `admin-frontend/` | Internal Admin and recruitment operations | React 18, Vite, React Router, Axios, Tailwind | `http://localhost:5174` | Internal admin web application (`admin.vakancy.in`) |
| `backend/` | Shared REST API, authentication, RBAC, MySQL access, files, email, AI, payments and business workflows | Node.js, Express, MySQL | Manifest default `5000`; existing validation scripts target `5002` | Shared API service |

The main frontend still contains legacy/integrated `/admin` pages. They are not canonical for future internal Admin work. They must remain untouched until route and feature parity with `admin-frontend` is documented; later retirement should use controlled redirects rather than deletion during security work.

The current architecture should be preserved during Phase 1: React/Vite clients, Express route-controller-service organization, JWT/RBAC conventions, and MySQL remain in place. Phase 1 should harden existing boundaries rather than redesign the user interface.

## 4. Database configuration and isolation assessment

### Active configuration

The backend explicitly loads `backend/.env`, then initializes MySQL through `backend/config/db.js`. The active connection is selected with these environment names:

```text
DB_HOST
DB_PORT
DB_USER
DB_PASSWORD
DB_NAME
```

No values were copied into this document or printed during Phase 0. The default database name in code is `vakancy_main_db`, while `.env.example` uses `vakancy_db`; therefore no default should be assumed to identify the real environment.

`db.initDB()` runs when the API starts and performs runtime schema setup/migrations. It fails closed on MySQL connection failure unless `USE_IN_MEMORY_DB=true` is explicitly enabled. Consequently, merely starting the backend against an important database can change schema state and is not a read-only validation action.

### Backup assessment

No verified MySQL backup was found in the repository. The following are not adequate production backups:

- `backend/database/schema.sql` is a schema initializer and contains destructive table-drop statements.
- `backend/database/seed.sql` is seed data, not a database snapshot.
- `backend/tests/clean_snapshot_pre_fake_removal.json` is a test/cleanup snapshot and has not been verified as a complete or restorable MySQL backup.
- `backend/database.sqlite` is zero bytes and is not the active MySQL database.

**Conclusion:** a safe, current, encrypted, restoration-tested database backup has not been demonstrated.

### Test database isolation

No `TEST_DB_HOST`, `TEST_DB_NAME`, dedicated test environment loader, disposable schema provisioner, transaction wrapper, or automatic rollback lifecycle was found. Most integration scripts use the normal backend connection or call a localhost API that uses the normal backend connection.

**Conclusion:** no existing integration test should be considered isolated-test-safe. A separately provisioned MySQL database with distinct least-privilege credentials is required before mutation-capable suites are run.

## 5. Test and script safety classification

Classification is conservative:

- **Read-only/static safe:** does not connect to application data or write project files.
- **Conditionally read-only:** uses `SELECT`, `DESCRIBE`, `SHOW`, GET endpoints, authentication, Cloudinary reads, or produces screenshots; run only against an explicitly non-production environment. Backend startup may still migrate schema.
- **Potentially destructive:** issues POST/PUT/PATCH/DELETE requests, direct DML/DDL, cleanup, repair, seed, credential reset, upload, or source-rewrite operations.
- **Isolated-test-safe:** none currently, because no suite provisions and verifies an isolated database.

### Static-safe validation

| Command/type | Classification | Notes |
|---|---|---|
| `node --check` over backend JavaScript | Read-only/static safe | Parses files without starting the API or connecting to MySQL |
| Frontend Vite builds directed to a unique path under `C:\tmp` | Workspace-safe build | Does not overwrite checked-in `dist/`; it writes temporary build artifacts |
| `git status`, `git diff`, source searches | Read-only/static safe | Use per-command `safe.directory` if Git ownership protection triggers |

### Conditionally read-only diagnostics

These scripts contain only database inspection, GET-style API validation, authentication, or remote-file reads in the inspected version. They must not be run against production, and outputs may contain personal data:

```text
backend/check_jobs.js
backend/check_job_schema.js
backend/check_schema.js
backend/test_mysql.js
backend/test_cloudinary.js
backend/test_delivery.js
backend/scripts/checkNames.js
backend/tests/category_selection_validation.js
backend/tests/check_applications.js
backend/tests/inspect_data.js
backend/tests/inspect_db_integrity.js
backend/tests/inspect_resume_records.js
backend/tests/inspect_resume_tables.js
backend/tests/phase6_1_jobcard_regression.js
backend/tests/phase6_job_listing_validation.js
backend/tests/phase7_recommended_filter_validation.js
backend/tests/print_candidate_resumes.js
backend/tests/run_module2_audit.js
backend/tests/search_app_references.js
backend/tests/test_admin_resume_delivery.js
backend/tests/test_cloudinary_resumes.js
backend/tests/test_module1_dashboard.js
```

The three capture scripts authenticate and create screenshot/artifact files. They are conditionally read-only with respect to business data but are not filesystem read-only:

```text
backend/tests/capture_admin_screens.js
backend/tests/capture_applications.js
backend/tests/capture_dashboard_screenshots.js
```

### Mutation-capable or potentially destructive test suites

Do not run these until an isolated test database and disposable test accounts are verified:

```text
backend/test_auth_regression.js
backend/test_axios_cloudinary.js
backend/test_basic_auth.js
backend/test_dashboard.js
backend/scratch_test_insert.js
backend/scratch_test_save.js
backend/tests/audit_module2_comprehensive.js
backend/tests/automated_recruitment_operations_validation.js
backend/tests/phase3_e2e_client_acceptance_suite.js
backend/tests/phase4_release_security_audit.js
backend/tests/phase8_production_readiness_audit.js
backend/tests/phase9_1_independent_verification.js
backend/tests/phase9_final_qa_release_signoff.js
backend/tests/recover_historical_application.js
backend/tests/run_db_repair.js
backend/tests/security_and_authorization_audit.js
backend/tests/test_cb_debug.js
backend/tests/test_module2_job_management.js
backend/tests/test_recruitment_queue_verification.js
backend/tests/verify_db_clean.js
```

These suites create users/jobs/applications, alter stages and jobs, modify sharing/callback records, or perform direct cleanup. Cleanup code does not make a suite production-safe: interruption or a failed assertion can leave partial records, and broad cleanup criteria can remove non-test data.

### Administrative, seed, repair, cleanup and source-rewrite scripts

Treat the following categories as potentially destructive and never include them in ordinary validation commands:

- Schema/data mutation: `backend/add_github_url.js`, `backend/fix_schema.js`, `backend/patch_db.js`, `backend/seed_*.js`, `backend/scripts/cleanDB.js`, `backend/scripts/dedupCities.js`, `backend/scripts/importLocationMaster.js`.
- Credentials/data changes: `backend/reset_pass.cjs`, `backend/update_auth.cjs`.
- Root database helpers: `query.js`, `query_tables.js`, `test_mysql.js`, `test_query.cjs`, `test_query.py`, `test_skill_db.js`, and `test_skills.js` must be considered environment-sensitive even when currently SELECT-only.
- Root `fix_*`, `patch_*`, `replace_*`, `clean_*`, `cleanup_*`, `remove_*`, and `add_*` scripts are one-off source or database transformation utilities. They are not tests and may overwrite application files or inject database-changing code.

Before any of these scripts is reused, it needs an explicit target, a dry-run mode where applicable, a diff review, and an environment guard that refuses production.

## 6. Safe build and validation commands

The following commands require the existing `node_modules`; they do not install or update dependencies.

### Main frontend

Standard project build (writes `frontend/dist`):

```powershell
Set-Location frontend
npm.cmd run build
```

Preferred baseline validation (writes outside the repository; choose a new path each run):

```powershell
Set-Location frontend
npm.cmd run build -- --outDir C:\tmp\vakancy-main-<unique-id> --emptyOutDir false
```

### Admin frontend

Standard project build (writes `admin-frontend/dist`):

```powershell
Set-Location admin-frontend
npm.cmd run build
```

Preferred baseline validation:

```powershell
Set-Location admin-frontend
npm.cmd run build -- --outDir C:\tmp\vakancy-admin-<unique-id> --emptyOutDir false
```

### Backend

There is currently no `test` script in `backend/package.json`. Do not use `npm test` as evidence of backend correctness. The safe static syntax check is:

```powershell
Get-ChildItem backend -Recurse -File -Filter *.js |
  Where-Object { $_.FullName -notmatch '\\node_modules\\' } |
  ForEach-Object { node --check $_.FullName }
```

Do not use `npm start`, `npm run dev`, `node server.js`, or database-aware test scripts for a read-only baseline because server startup invokes `initDB()` and can apply schema changes.

### Phase 0 validation results

- Main frontend production build: passed.
- Admin frontend production build: passed.
- Backend JavaScript syntax: passed with 0 failures.
- Main frontend warning: the main generated JavaScript chunk is approximately 1.59 MB minified, above Vite's 500 kB advisory threshold. This is a performance backlog item, not a Phase 0 failure.
- No database-connected tests were executed.
- No dependencies were installed or updated.

## 7. Rollback strategy

### Code rollback

1. Do not begin Phase 1 until the owner reviews the 20 modified and 23 untracked paths listed above.
2. Preserve the current state as an owner-approved baseline commit before security changes. If the changes represent different features, split them into reviewed commits without rewriting file contents.
3. After that baseline is accepted, create a dedicated Phase 1 branch from the accepted commit. This Phase 0 task intentionally did not create the branch or commit.
4. Keep Phase 1 commits small and grouped by security control: payment, rate limiting/headers, uploads, authorization, and error handling.
5. Revert a faulty Phase 1 change with `git revert <commit>`; do not use `git reset --hard` or delete untracked files.
6. For emergency recovery of uncommitted Phase 1 work, first export an explicit patch and copy newly created files to a timestamped workspace backup. Confirm the paths before any restore operation.

### Database rollback

1. Identify the exact database host and database name through an approved operational channel; never infer them from code defaults.
2. Before the first migration, take an encrypted `mysqldump` using credentials supplied interactively or by a protected option file. Do not put credentials on the command line or in documentation.
3. Record database server version, migration version, dump timestamp, dump checksum, and row counts for critical tables.
4. Restore the dump into a separate disposable database and run integrity checks before declaring the backup valid.
5. Prefer forward-compatible, versioned migrations. Each migration must have a reviewed rollback or compensating migration and a precondition check.
6. Take a new verified backup immediately before payment/auth schema changes.
7. If rollback is needed, stop writes, preserve forensic logs, apply the reviewed compensating migration or restore into a new database, validate it, and switch connection configuration through the deployment system. Do not run ad hoc repair scripts against production.

Example backup command shape (placeholders only):

```powershell
mysqldump --defaults-extra-file=<protected-client-config> --single-transaction --routines --triggers --databases <database-name> --result-file=<encrypted-or-protected-backup-path>
```

## 8. Phase 1 security implementation checklist

No item below was implemented in Phase 0.

### P0 — Payment integrity and entitlement safety

- [ ] Fail payment verification closed when any Razorpay verification field or server secret is missing.
- [ ] Resolve amount, currency, payment type, plan, and duration from server-side product/plan records; never trust client-provided prices.
- [ ] Verify payment ownership (`payment.user_id === req.user.id`) and bind the payment record to the exact Razorpay order.
- [ ] Validate order ID, payment ID, signature, captured status, amount, and currency before fulfillment.
- [ ] Remove production fallback order/payment IDs and prevent entitlement activation after provider failure.
- [ ] Make verification idempotent and prevent replay or double entitlement creation.
- [ ] Wrap payment completion and entitlement activation in a database transaction.
- [ ] Add signed Razorpay webhook reconciliation with event-id deduplication and audit logging.
- [ ] Add isolated tests for forged signatures, missing signatures, cross-user payment IDs, underpayment, replay, provider failure, and concurrent verification.

### P0 — Abuse prevention and authentication hardening

- [ ] Add narrowly scoped rate limits to login, registration, forgot/reset password, contact, payment, upload, and AI endpoints.
- [ ] Validate required production environment variables and reject insecure/missing JWT and provider configuration at startup.
- [ ] Stop returning internal exception details in production responses.
- [ ] Connect forgot-password to the existing email service; store only a hash of reset tokens.
- [ ] Invalidate applicable sessions/tokens after password reset, password change, deactivation, and privilege changes.
- [ ] Define the migration path from `localStorage` bearer tokens to Secure, HttpOnly, SameSite cookies or a short-lived access-token/rotating-refresh-token design.

### P0 — Upload and record-association controls

- [ ] Validate actual file signatures instead of trusting client MIME headers.
- [ ] Disallow SVG by default or sanitize and serve it with a safe content disposition and CSP.
- [ ] Apply endpoint-specific allowlists for resumes, logos, profile photos, and general documents.
- [ ] Authorize every supplied candidate, employer, application, and job association against the authenticated principal.
- [ ] Add malware scanning/quarantine design and prevent direct public delivery before approval.
- [ ] Test file IDOR, association spoofing, polyglot files, oversized payloads, and malicious filenames.

### P1 — Authorization and HTTP hardening

- [ ] Centralize canonical roles and permission decisions used by SQL, backend middleware, and both frontends.
- [ ] Restrict skill/benefit and other global master-data writes to explicit permissions.
- [ ] Review every parameterized resource endpoint for ownership/tenant checks.
- [ ] Add Helmet with an application-compatible CSP and other standard response headers.
- [ ] Make CORS fail closed when production environment/origin configuration is absent or invalid.
- [ ] Add parameter-pollution protection and centralized request validation.
- [ ] Reduce health output to operationally necessary information and add separate readiness/liveness behavior.

### P1 — Database and verification foundation required by security work

- [ ] Create a dedicated, disposable MySQL test database with separate credentials and a hard refusal guard for production-like names/hosts.
- [ ] Move runtime/request-time DDL into ordered versioned migrations.
- [ ] Add a deterministic seed and teardown lifecycle for security tests.
- [ ] Convert existing mutation-capable suites to unique test fixtures and transaction/cleanup guarantees.
- [ ] Add `lint`, `test`, `test:integration`, and CI-safe scripts without changing application behavior.
- [ ] Keep `frontend/` and `admin-frontend/` visual design unchanged while security controls are introduced.

## 9. Completed versus recommended actions

### Completed in Phase 0

- Captured and documented the current branch, HEAD, dirty worktree, and all changed paths.
- Confirmed canonical application ownership.
- Identified MySQL configuration inputs without exposing values.
- Confirmed that no verified backup or isolated test database is presently demonstrated.
- Classified existing scripts conservatively by side effect.
- Built both frontend applications into temporary directories.
- Checked all backend JavaScript syntax.
- Created this documentation file only.

### Recommended; not performed

- Review and preserve the pre-existing worktree in owner-approved commit(s).
- Create the Phase 1 branch after baseline approval.
- Provision and verify a separate test database.
- Create and restoration-test a real MySQL backup.
- Implement the Phase 1 checklist.
- Add dependencies only after documenting the exact control they provide and obtaining approval.

