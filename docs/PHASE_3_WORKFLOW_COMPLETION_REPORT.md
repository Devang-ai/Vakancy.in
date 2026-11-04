# Vakancy.in Phase 3 — Existing Workflow Completion and Reliability

**Date:** 2026-10-21  
**Verification level:** code, unit/mock tests and production builds. No configured MySQL data, migration, live email recipient, or Cloudinary asset was touched.

## 1. Inspection and classification

| Workflow | Initial classification | Phase 3 outcome |
|---|---|---|
| Candidate/employer/internal login and registration | Fully implemented with Phase 1 controls | Preserved; regression tests pass |
| Forgot/reset password | Broken/insecure | Hashed random tokens, expiry, atomic single use, email link integration and JWT generation invalidation implemented; DB migration and live delivery unverified |
| Candidate application creation | Partially implemented | Resume ownership validation, race-resistant unique migration, duplicate response, snapshot preservation and assigned-recruiter pipeline behavior fixed |
| ATS stage processing | Partially implemented | Canonical transitions, invalid-transition rejection, scoped writes, audit values, candidate notifications, filtering and bounded pagination implemented |
| Candidate application UI | Partially implemented | Loading/error/empty behavior corrected and consent wording aligned |
| Candidate sharing | Broken against postponed-payment scope | Removed commercial/payment activation dependency; consent, approval, expiry, revocation and share scopes retained |
| Employer resume access | Broken | Application ownership alone no longer grants resume access; approved, consented, unexpired sharing is required |
| Public shared profiles | Partially implemented | Field scope enforced, direct stored resume URL removed, short-lived authorized resume endpoint and access audit added |
| Application/enquiry email | Partially implemented | Candidate submission confirmation, stage update, public enquiry confirmation and internal enquiry alert integrations completed |
| Contact and executive enquiries | Partially implemented | Existing validation/deduplication preserved; email integrations completed after successful persistence |
| Recruitment callbacks | Partially implemented | Existing creation/deduplication/activity preserved; update scope, assignee validation and employer notification added |
| Leads/follow-ups | Fully implemented for current Phase 3 scope | Existing module preserved; no Admin-module redesign performed |
| Payment/checkout/unlocks | Intentionally unavailable | Phase 1 lockdown preserved; no paid feature implemented |
| MySQL relational end-to-end verification | Blocked by infrastructure | No isolated database or verified restorable backup available |

## 2. Confirmed defects fixed

- Reset tokens were stored and queried as plaintext and returned as `_devToken`. Tokens are now 256-bit random values, only SHA-256 hashes are stored, and API responses never contain them.
- Reset and password-change operations did not invalidate existing JWTs. `token_version` is now embedded in tokens and checked on every authenticated request.
- Reset consumption was race-prone. The final update repeats hash and expiry predicates and requires exactly one affected row.
- The frontend expected a development reset token. It now consumes the emailed `resetToken` query parameter and shows a neutral “check your email” state.
- Candidate-share approval still required commercial-payment verification or an exception. That activation path has been removed; payment fields no longer control candidate sharing.
- Employer resume access accepted ownership of any application without explicit candidate consent. It now requires an approved, unexpired, consented share for that employer/job.
- Public candidate sharing returned stored `file_url` values. It now returns metadata plus an authorized short-lived resume endpoint.
- `summary_only` shares loaded detailed experience, education, projects and skills. These sections are now limited by `share_scope`.
- Team application stages accepted arbitrary jumps. A canonical state-transition model now rejects invalid and terminal-state transitions.
- Application submission selected the first recruiter in the database. Pipelines are now created only for the recruiter explicitly assigned to the job.
- An invalid cross-candidate `resume_id` silently fell back to another resume. It now fails with `INVALID_RESUME_ASSOCIATION`.
- Duplicate application checks had a race window. Migration `004` adds a reviewed unique constraint after refusing to proceed if historical duplicates exist; runtime duplicate-key errors return HTTP 409.
- Admin application updates retried a second endpoint after every error, including permission and validation failures. Fallback now occurs only for HTTP 404/405.
- Admin API errors discarded status/code information and did not clear invalid sessions. Status/code preservation and 401 cleanup were added.
- Callback updates lacked record scope and assignee validation. Both are now enforced.

## 3. Files added

- `backend/services/passwordResetService.js`
- `backend/utils/applicationWorkflow.js`
- `backend/database/migrations/003_account_security.js`
- `backend/database/migrations/004_workflow_integrity.js`
- `backend/tests/phase3_workflow_unit.test.js`
- `docs/PHASE_3_WORKFLOW_COMPLETION_REPORT.md`

## 4. Files modified in Phase 3

- `backend/config/jwt.js`
- `backend/middleware/authMiddleware.js`
- `backend/controllers/authController.js`
- `backend/controllers/applicationController.js`
- `backend/controllers/adminController.js`
- `backend/controllers/employerController.js`
- `backend/controllers/contactController.js`
- `backend/routes/adminRoutes.js`
- `backend/services/emailService.js`
- `backend/services/emailTemplates.js`
- `backend/database/migrations/index.js`
- `backend/tests/phase2_database_safety.test.js`
- `backend/package.json`
- `frontend/src/pages/guest/LoginPage.jsx`
- `frontend/src/pages/candidate/CandidateApplicationReviewPage.jsx`
- `frontend/src/pages/candidate/CandidateApplicationsPage.jsx`
- `admin-frontend/src/services/api.js`
- `admin-frontend/src/pages/AdminApplications.jsx`

These changes were applied on top of a pre-existing dirty worktree. No commit, reset, clean, checkout, or file deletion was performed.

## 5. Unapplied migrations

### `003_account_security`

Adds `USERS.reset_token_hash`, `token_version`, `password_changed_at`, and `reset_token_expires` when absent. It clears legacy plaintext reset tokens only when that legacy column exists.

### `004_workflow_integrity`

Adds the `(job_id, candidate_id)` application uniqueness key and `CANDIDATE_SHARE_ACCESS_LOG`. It deliberately stops before changing schema if duplicate applications already exist.

Neither migration was run. Until migration `003` is applied to a reviewed environment, the new password-reset workflow is **blocked at runtime** because required columns may be absent. Until migration `004` is applied, database-level duplicate prevention and share-access persistence remain unverified.

## 6. Notifications and email

Implemented integrations:

- Password reset link.
- Candidate application confirmation.
- Candidate application-stage update.
- Existing privacy-preserving employer application notification.
- Public/executive enquiry confirmation.
- Internal recruitment enquiry alert.
- Callback status in-app update.
- Existing candidate and employer in-app notifications were preserved.

Email calls occur only after the corresponding primary record write succeeds. Provider attempts use the existing `EMAIL_LOGS` mechanism. No live email was sent in validation. Resend credentials, sender verification, delivery, bounce handling and production reset URL configuration remain **unverified**.

## 7. Validation results

Safe automated suites:

- Phase 1 security: 11 tests passed.
- Phase 2 database-safety/authorization: 10 tests passed.
- Phase 3 workflow unit/mocks: 5 tests passed.
- Total safe tests: 26 passed, 0 failed.

Phase 3 tests cover reset token entropy/hash/URL handling, non-disclosure, single use, session-generation increment SQL behavior, ATS aliases/transitions, and employer resume denial without consented sharing.

Additional validation:

- Backend JavaScript syntax: passed.
- Main frontend production build: passed; the existing approximately 1.59 MB chunk-size advisory remains.
- Admin frontend production build: passed.
- Build output was directed to isolated paths under `C:\tmp`; checked-in `dist` directories were not used.

No database-aware legacy tests, migrations, repair scripts, live API server or Cloudinary tests were executed.

## 8. Remaining blockers and unverified behavior

- Migrations and relational behavior have not been tested against MySQL/MariaDB.
- Candidate application creation still spans several records without a verified transaction. The unique constraint prevents duplicate applications but application/pipeline/history/notification atomicity needs isolated-DB testing and transaction conversion.
- Existing installations may contain duplicate applications or orphaned relationships that block constraints.
- Password reset cannot function on an installation until migration `003` is safely applied.
- Share access logging is best-effort until migration `004` is applied.
- Historical public Cloudinary resume assets remain subject to the Phase 2 inventory/migration blocker.
- Public share access-code attempts use route limiting, but durable per-share failed-attempt tracking is not yet implemented.
- Live email delivery and production `APP_URL` are unverified.
- Interview scheduling has existing schema/UI paths, but a complete calendar/reminder lifecycle was not database-tested.
- Multi-record enquiry conversion and callback notification delivery remain non-transactional.

## 9. Phase 4 and later Admin Panel work

1. Provision a disposable MySQL/MariaDB instance and apply migrations `001`–`004` twice.
2. Run synthetic candidate/employer/internal-role workflows with real transactions, constraints and concurrent duplicate submissions.
3. Convert application creation, ATS stage/history/notifications, enquiry conversion and callback updates to explicit transactions based on integration results.
4. Verify Resend sender/domain, reset URL, delivery logs and safe test recipients.
5. Complete the authorized historical Cloudinary migration.
6. Add durable share-access risk events and failed-code throttling.
7. Handle the dedicated Leads, Executive Service and broader Admin Panel improvements as separate modules without redesigning current workflows.
