# Vakancy.in Phase 2 — Database Consistency and Integration Safety

**Date:** 2026-10-21  
**Safety status:** code-level work completed; MySQL integration and migrations not executed because no isolated database has been operationally verified.

## Implementation plan and outcome

| Phase | Work | Outcome |
|---|---|---|
| Inspect | Preserve the dirty worktree; inspect Phase 0, schema, startup DDL, request DDL, authorization, resume delivery and dependencies | Completed without reading secret values or connecting to MySQL |
| Isolate | Add a test-only, no-fallback database configuration with reserved-name and destructive-action guards | Implemented; configuration guard unit-tested |
| Migrate | Introduce ordered migrations and stop normal startup/request handlers from changing schema | Implemented in code; migrations intentionally not executed |
| Integrate | Exercise scope rules with synthetic data and prepare database integration boundary | Mock-backed authorization tests passed; real MySQL integration blocked |
| Harden | Fix verified status/scope/private-upload inconsistencies and compatible dependencies | Implemented and validated without business data |

## Database isolation contract

Use `backend/config/test-database.env.example` only as a template in a secret-managed environment. The guard requires all of the following:

- `NODE_ENV=test`
- `DATABASE_TEST_MODE=isolated-mysql`
- explicit `TEST_DB_HOST`, `TEST_DB_USER`, `TEST_DB_PASSWORD`, and `TEST_DB_NAME`
- a database name matching `vakancy_test_*` or `vakancy_ci_test_*`
- an identity different from the configured application database

The application DB variables are never used as test fallbacks. Destructive lifecycle tools must additionally require the exact reset acknowledgement documented in the template. Before enabling them, an operator must independently verify the host, account grants, database identity, and that no real personal data is present. Prefer a dedicated MySQL instance/container and an account restricted to the single disposable schema.

Safe code-level test:

```powershell
Set-Location backend
npm.cmd run test:phase2:safe
```

Migration command (do **not** run until isolation is independently verified):

```powershell
Set-Location backend
npm.cmd run migrate:test
```

## Schema and migration findings

- `database/schema.sql` is a destructive initializer with `DROP TABLE` statements. It is not a migration and must not be run against an existing installation.
- `config/db.js` previously ran many `CREATE`, `ALTER`, seed `INSERT`, and corrective `UPDATE` statements during every API startup. Normal `initDB()` now performs connection verification only. The legacy bootstrap remains preserved in source for decomposition/reference and is not exported or called.
- `controllers/fileController.js` previously created `FILES` during an upload request. That DDL has been removed.
- `database/migrations/` now supplies deterministic IDs, a `SCHEMA_MIGRATIONS` ledger, rerun-safe table creation, and parameterized ledger writes. Migrations `001_files` and `002_scope_and_sharing` cover file metadata and the current permission/team/share boundary.
- The static initializer's `APPLICATION.status` enum omits runtime values. Runtime code currently uses `applied`, `reviewing`, `under_review`, `shortlisted`, `interview`, `selected`, `hired`, `rejected`, and `on_hold`. A dashboard query incorrectly used `in_review`; it now recognizes the existing review values.
- The remaining legacy startup DDL (locations, alerts, callbacks, recruitment activity, job extensions and non-security seed data) still needs conversion to reviewed migrations before the legacy block can be removed. No automatic schema path uses it now.
- Foreign-key addition and enum normalization for existing installations are deferred until an isolated copy exposes orphan counts and current column definitions. Blindly adding constraints could lock tables or fail on historical rows.

## Authorization and API integrity

Implemented:

- Recruiters no longer inherit every assignment belonging to members of the same team. Team aggregation is limited to a user who actually leads the team.
- Direct `JOB.assigned_recruiter_id` work is included in recruiter scope.
- Application status writes require `applications/edit` permission and assignment scope. This allows custom roles only when explicitly granted, while Director/Main Admin retain their intended global behavior.
- Applicant lists and detailed application reads now require assigned job scope for internal users; employer list access retains the existing employer-ownership check and candidates retain self-only detail access.
- Application status values are allowlisted before SQL updates.
- Existing parameterized writes remain parameterized.

Verified with synthetic mock records: recruiter assignment boundaries, TL-led team scope, Director global scope, custom-role deny-by-default, and cross-scope application rejection. Candidate/employer controller paths and consent checks were reviewed statically. Full transaction, duplicate-submission race, pagination, foreign-key and multi-session behavior require isolated MySQL.

## Historical resume inventory and strategy

References are stored in `CANDIDATE_RESUME` (`cloudinary_asset_id`, `cloudinary_public_id`, `file_url`) and in application snapshots (`resume_id`, `resume_url`, `resume_filename`). `FILES` stores the Cloudinary delivery type for newer uploads.

New candidate resume uploads already request Cloudinary `authenticated` delivery. Generic resume/document/application uploads now do the same. Candidate, employer and Admin delivery endpoints remain authenticated and apply owner, employer/share-consent, permission and scope checks.

Historical risk remains: records whose URL contains `/upload/` rather than `/authenticated/` may refer to publicly retrievable assets. Database authorization cannot revoke a leaked direct Cloudinary URL. No live records or Cloudinary assets were queried or modified in Phase 2.

Proposed migration, requiring a verified backup and explicit Cloudinary authorization:

1. Read-only inventory grouped by resource type, delivery type, folder, reference count and missing public ID; report counts only, never filenames or candidate data.
2. Resolve duplicate references and application snapshots to their canonical `CANDIDATE_RESUME` row.
3. Copy each public asset to authenticated delivery with a deterministic migration ID; verify checksum/bytes and signed retrieval.
4. In a transaction, update canonical public ID/delivery metadata and dependent snapshots; retain a protected old-to-new manifest.
5. Exercise candidate, approved employer-share and scoped Admin downloads.
6. Revoke/delete the old public asset only after a rollback window and restoration test.

## Dependency review

Before fixes, npm reported 13 findings: 2 critical, 8 high and 3 moderate. Reachable runtime chains included Express through `proxy-addr`/`qs`; the Razorpay chain through Axios/follow-redirects is currently unreachable because Phase 1 disabled payment endpoints. Nodemon/chokidar/braces are development-only. UUID's advisory affects buffer-based namespace APIs; this code uses random `v4`, so it is not presently reachable.

Compatible overrides updated `proxy-addr` to 2.0.8, `qs` to 6.16.0, `follow-redirects` to 1.16.1 and `brace-expansion` to 2.1.7. Post-update audit reports 4 findings: 0 critical, 3 high (development-only nodemon/chokidar/braces chain) and 1 moderate (`uuid`, unreachable API path). No force upgrade was used. Major upgrades are deferred for regression testing.

## Deferred / Phase 3

1. Provision and independently verify a disposable MySQL/MariaDB instance and restricted account; then run migrations twice and test teardown/recreate.
2. Build the full synthetic relational fixture set and run role/scope/API tests against real constraints and transactions.
3. Convert all remaining legacy startup DDL into small reviewed migrations; validate existing-install preconditions and lock impact.
4. Add transactions and unique-key-backed idempotency where isolated race tests confirm gaps, especially applications and ATS transitions.
5. Execute the historical Cloudinary inventory and authenticated-asset migration only after backup/authorization approval.
6. Plan compatible upgrades for nodemon/chokidar and UUID, then rerun all builds and integration suites.
