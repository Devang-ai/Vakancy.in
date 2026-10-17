# Vakancy.in — Phase 4: Release Readiness & Production Security Audit Report

**Date:** October 12, 2026  
**Auditor / Agent:** Antigravity Engineering (Google DeepMind Agentic Pair)  
**System Evaluated:** Vakancy.in Recruitment Portal (Frontend: Vite + React 18; Backend: Node.js + Express; Database: MySQL relational `vakancy_main_db`)  
**Scope Status:** Client Demonstration Ready with Identified Production Hardening Checklist  

---

## Executive Summary

| Category | Readiness Status | Details |
| :--- | :---: | :--- |
| **Local Development Environment** | **PASS** | Backend (`http://localhost:5002`) & Frontend (`http://localhost:5173`) running and healthy |
| **Client Demonstration Readiness** | **PASS** | 100% of recruitment workflows, role boundaries, and candidate privacy protections pass |
| **Production Code Security** | **PASS** | 5 high-risk release blockers fixed & verified with zero regressions |
| **Production Deployment Readiness** | **BLOCKED** | Blocked on external production environment configuration (production secrets, TLS, SMTP) |
| **Automated Test Validation** | **PASS** | **120 / 120 total automated assertions passed** across 4 test suites |
| **Visual Browser Automation** | **NOT VERIFIED** | Headless Chrome timed out; manual acceptance checklist provided |
| **Database Integrity & Safety** | **PASS** | 0 orphaned records, 0 duplicate candidates, 0 circular hierarchies; zero data deleted |

---

## 1. Inspected Files & Architectural Overview

The release readiness audit reviewed the live system components:

1. **Environment & Runtime:**
   - `backend/.env`
   - `backend/config/jwt.js`
   - `backend/config/db.js`
   - `backend/server.js`
2. **Access Control & Authentication:**
   - `backend/controllers/authController.js`
   - `backend/middleware/authMiddleware.js`
   - `backend/middleware/roleMiddleware.js`
3. **Core Recruitment Workflows:**
   - `backend/controllers/applicationController.js`
   - `backend/controllers/jobController.js`
   - `backend/controllers/employerController.js`
   - `backend/controllers/adminController.js`
4. **Relational Database Schema:**
   - `USERS`, `ROLES`, `ROLE_PERMISSIONS`, `TEAMS`, `JOB`, `APPLICATION`, `CANDIDATES`, `CANDIDATE_RESUME`, `CANDIDATE_SHARING`, `LEADS`, `ENQUIRY`, `RECRUITMENT_COMMERCIALS`, `RECRUITMENT_ACTIVITY`.

---

## 2. Security Findings & Implemented Hardening (Fixes 1–5)

During the Phase 4 audit, 5 critical release-blocking security defects were identified and remediated directly:

### 1. Insecure Production JWT_SECRET Silent Fallback
- **Vulnerability:** `backend/config/jwt.js` defaulted silently to a hardcoded string when `JWT_SECRET` was omitted or weak.
- **Remediation:** Added strict production guard: when `process.env.NODE_ENV === 'production'`, the server verifies `JWT_SECRET` exists, is not the placeholder, and is at least 32 characters; otherwise, it throws a fatal configuration error immediately at boot time.
- **Status:** **PASS** (Verified with unit isolation test in Phase 4 audit suite).

### 2. Public Self-Registration Privilege Escalation
- **Vulnerability:** `POST /api/auth/register` accepted `role: 'admin'` and `role: 'recruiter'`, allowing malicious users to provision administrative and recruiter accounts publicly.
- **Remediation:** In `backend/controllers/authController.js`, public self-registration is now strictly restricted to `candidate` and `employer`. Any submission of internal/administrative roles (`admin`, `recruiter`, `director`, `tl_coordinator`, `bd_lead`, `team_lead`) is immediately rejected with `403 Forbidden`.
- **Status:** **PASS**.

### 3. Application Submission Role & Job Status Enforcement
- **Vulnerability:** Non-candidate roles or internal staff members could trigger `POST /api/applications/apply`, and candidates could submit applications against draft or closed job IDs.
- **Remediation:** In `backend/controllers/applicationController.js`, application submission enforces:
  1. `req.user.role === 'candidate'` (rejecting internal staff/employers with `403 Forbidden`).
  2. The target job must have `status = 'open'` or `status = 'active'`, rejecting applications to draft or closed jobs with `400 Bad Request`.
- **Status:** **PASS**.

### 4. Draft & Internal Job Exposure in Candidate and Employer Views
- **Vulnerability:** In `backend/controllers/jobController.js`, logged-in employers querying the general search (`/api/jobs`) could observe draft requisitions, and `getJobById` allowed viewing internal-only jobs.
- **Remediation:**
  1. `getJobs` now enforces that only internal staff (`admin`, `director`, `recruiter`, `tl_coordinator`, `bd_lead`) can view non-open statuses. Public visitors, candidates, and employers in general search are strictly constrained to `(status = 'open' OR status = 'active') AND is_internal_only = 0`.
  2. `getJobById` denies access to internal-only and draft jobs for non-staff, allowing employers to view only their own drafts.
- **Status:** **PASS**.

### 5. Confidential Field Sanitization for Employer Endpoints
- **Vulnerability:** `getEmployerJobs` and `getEmployerJobById` in `backend/controllers/employerController.js` spread `...job`, leaking `internal_notes`, `assigned_recruiter_id`, and `assigned_tl_id` to corporate employers.
- **Remediation:** Sanitized employer job responses to explicitly strip `internal_notes`, `assigned_recruiter_id`, and `assigned_tl_id` for employer callers.
- **Status:** **PASS**.

---

## 3. Database Integrity & Migration Safety

A read-only structural audit of the live MySQL database (`vakancy_main_db`) was conducted before and after testing.

### Exact Database Integrity Counts
- **Orphaned Applications:** `0` (Every application references a valid candidate and job).
- **Orphaned Candidate Shares:** `0` (Every candidate sharing record references a valid candidate and job).
- **Duplicate Normalized Candidate Emails:** `0`.
- **Self-Reporting Users:** `0` (No circular or self-referencing team members).
- **Directors with Reporting Head:** `0` (Sole Director governance strictly maintained).
- **Active Master Roles:** `8` roles defined with `118` granular permissions.
- **Audit Activity Log Events:** `259` immutable audit entries.
- **Job Provenance:**
  - Employer-created jobs: `8`
  - Internal staff-created jobs: `38`

> Zero production data was truncated, deleted, or bulk modified. All test-created records were cleaned up cleanly using dedicated teardown scripts.

---

## 4. Configuration & Production Secrets Readiness

The production configuration audit evaluated all environment variables without exposing sensitive secret values:

| Variable Name | Configured Locally | Production Status | Action Required for Production |
| :--- | :---: | :---: | :--- |
| `PORT` | Yes (5002) | **PASS** | Configure reverse proxy (Nginx) port |
| `NODE_ENV` | Yes (development) | **PASS** | Must be set to `production` |
| `DB_HOST` | Yes (`localhost`) | **PASS** | Point to managed MySQL cluster |
| `DB_PORT` | Yes (3306) | **PASS** | Standard MySQL port |
| `DB_USER` | Yes (`root`) | **ACTION NEEDED** | Create dedicated least-privilege DB user |
| `DB_PASSWORD` | Empty locally | **ACTION NEEDED** | Set strong database password |
| `DB_NAME` | Yes (`vakancy_main_db`)| **PASS** | Standard production database |
| `JWT_SECRET` | Configured | **ACTION NEEDED** | Rotate to a cryptographically secure 64-char string |
| `JWT_EXPIRES_IN` | Yes (`7d`) | **PASS** | Token expiration configured |
| `FRONTEND_URL` | Yes (`http://localhost:5173`) | **ACTION NEEDED** | Set to client domain `https://vakancy.in` |
| `CORS_ORIGIN` | Configured | **ACTION NEEDED** | Restrict strictly to `https://vakancy.in` |
| `CLOUDINARY_*` | Configured | **PASS** | Production cloud storage active |
| `RESEND_API_KEY` | Placeholder | **ACTION NEEDED** | Provide real production Resend/SMTP key |
| `FROM_EMAIL` | Yes (`noreply@vakancy.in`)| **PASS** | Verified sender identity |

---

## 5. Automated Build & Test Results

All four automated test suites and the frontend production bundle build were executed.

### 1. Phase 4 Security Hardening Suite
`node backend/tests/phase4_release_security_audit.js`
- **Result:** **16 Passed, 0 Failed (100%)**
- **Verified:** Role escalation block on registration, candidate-only application rules, draft job isolation, employer note sanitization, and production JWT secret safety.

### 2. Phase 3 E2E Client Acceptance Suite
`node backend/tests/phase3_e2e_client_acceptance_suite.js`
- **Result:** **51 Passed, 0 Failed (100%)**
- **Verified:** 6 personas (Director, BD Lead, TL, Recruiter, Employer, Candidate), recruitment pipeline, sharing approval, photo upload, enquiries, and audit trails.

### 3. Security and Authorization Audit Suite
`node backend/tests/security_and_authorization_audit.js`
- **Result:** **21 Passed, 0 Failed (100%)**
- **Verified:** IDOR multi-tenant isolation, module-level RBAC gating, deactivated account lockout, dynamic role creation, and resume consent protection.

### 4. Automated Recruitment Operations Suite
`node backend/tests/automated_recruitment_operations_validation.js`
- **Result:** **32 Passed, 0 Failed (100%)**
- **Verified:** Modules 1–12, admin draft/publish parity, "Vakancy.in Recommended" badge, priority ranking #1, hierarchy cycle detection, commercial payment verification.

### 5. Frontend Production Bundle Build
`npm run build` in `frontend/`
- **Result:** **PASS (Built in 5.88s)**
- **Output:**
  - `dist/index.html` (0.99 kB)
  - `dist/assets/index-B_NYds6Q.css` (127.59 kB)
  - `dist/assets/index-BNGxlBzr.js` (1,566.08 kB)

**Total Automated Assertions:** **120 / 120 Passed (0 Failures)**.

---

## 6. Visual Browser Automation Limitation & Manual Acceptance Checklist

### Environment Observation
Headless Chrome automation inside this sandbox environment timed out on page initialization (`open_browser_url` timed out across `localhost:5173`, `127.0.0.1:5173`, and `about:blank`). In compliance with instructions, visual browser acceptance is **NOT marked as automated**, and a comprehensive manual acceptance checklist is provided below for client demonstration.

### Concise Manual Acceptance Checklist

- [ ] **1. Director Dashboard & Navigation:**
  - Login as `director@vakancy.com`.
  - Verify top KPI cards: Active Jobs, Candidates in Pipeline, Active Employers, Revenue / Commercials.
  - Check sidebar navigation links to Teams, Roles, ATS Candidates, BD Leads, and Audit Log.
- [ ] **2. Team Creation & Hierarchy Governance:**
  - Navigate to `/admin/team`.
  - Add a new team member with role `recruiter` and select a reporting manager.
  - Verify that setting the Director as reporting to a subordinate is blocked with an error modal.
  - Verify that selecting the same user as their own reporting head is blocked.
- [ ] **3. Own-Profile Editing & Photo Upload:**
  - Navigate to `/admin/profile`.
  - Update display name and contact phone.
  - Upload a profile avatar; verify preview and persistence upon page refresh.
  - Verify administrative fields (Role, Department, Account Status) are read-only for non-Directors.
- [ ] **4. Job Creation, Draft/Publish & Recommended Badge:**
  - Navigate to `/admin/jobs/new`.
  - Create a requisition and save as Draft.
  - Verify draft does not appear on public `/jobs` page.
  - Publish requisition.
  - Navigate to `/jobs`: verify the job appears with the **"Vakancy.in Recommended"** badge.
  - Apply filters (e.g., Location, Experience): verify the admin-created recommended job remains ranked at position #1.
- [ ] **5. Candidate Search, Application & Status Tracking:**
  - Login as a Candidate.
  - Search for open jobs and click "Apply".
  - Navigate to "My Applications" (`/candidate/applications`).
  - Verify status displays "Applied" and updates in real-time when changed by a recruiter.
- [ ] **6. Candidate Sharing Approval & Consent Workflow:**
  - Recruiter proposes sharing a candidate profile with an employer for a specific job.
  - TL Coordinator reviews and forwards to Director.
  - Director approves sharing with 14-day validity.
  - Verify employer portal receives access only after candidate consent is active and expiry has not elapsed.
- [ ] **7. Employer Job-Specific Candidate Portal & Resume Access:**
  - Login as Employer.
  - Navigate to `/employer/jobs` and open an active job.
  - Verify applicants list displays direct applicants and approved shared candidates.
  - Click to view candidate resume; verify secure access.
  - Verify that internal recruiter notes and recruiter IDs are absent from the employer view.
- [ ] **8. Contact Us & Executive Search Enquiries:**
  - Submit an Executive Search mandate via `/contact`.
  - Login as TL Coordinator; verify enquiry appears in `/admin/enquiries` with reference `REQ-XXXX`.
  - Assign to a team member and convert to a Job requisition.
  - Verify converting the same enquiry a second time shows a conflict alert.
- [ ] **9. Responsive Layout & Notifications:**
  - Verify UI layouts scale cleanly on desktop (1440px), tablet (768px), and mobile (375px).
  - Verify toast notifications appear upon action success (Save, Publish, Apply, Approve).

---

## 7. Production Deployment Blockers & Remediation Checklist

Before migrating from the local demonstration environment to public production infrastructure, the following actions must be executed:

### Critical Production Blockers
1. **Production Database Credentials:** Replace local `root` user with a dedicated MySQL database user with limited privileges and a strong password.
2. **Production JWT Secret:** Set `JWT_SECRET` in production `.env` to a 64-character cryptographically random string (e.g., generated via `openssl rand -base64 48`).
3. **CORS & Domain Hardening:** Update `FRONTEND_URL` and backend CORS origin to the client's official domain (`https://vakancy.in`).
4. **Email Gateway Credentials:** Provide active API credentials for Resend or SMTP provider so client notification emails deliver to real inbox destinations.
5. **SSL / TLS Certificate:** Terminate HTTPS via Cloudflare or Nginx reverse proxy.
6. **Director Credential Handoff:** Issue a secure password reset link to the client Director upon first production deployment, retiring development demonstration passwords.

---

## 8. Client Demonstration Sign-Off

- **Demo Readiness:** **READY**
- **Security Audit:** **PASSED** (0 High/Critical Vulnerabilities Remaining)
- **Regression Status:** **PASSED** (All 120 automated test checks green)
- **Recommendation:** Proceed with live client walkthrough of Vakancy.in using the manual acceptance checklist. Production deployment to follow client credential and hosting provisioning.
