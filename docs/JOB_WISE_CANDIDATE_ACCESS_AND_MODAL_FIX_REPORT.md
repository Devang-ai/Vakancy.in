# Vakancy.in — Final Job-Wise Candidate Access & Global Modal Fix Report

**Target Real Employer Account:** Scan2Serve (`chauhandevang075@gmail.com`)  
**Target Employer ID:** `f5a22dce-b8f3-11f1-bdbe-8469936720fe`  
**Director Account:** `director@vakancy.com`  
**Date:** October 23, 2026  
**Status:** ✅ Fully Implemented, Hardened & Verified in Real Chrome

---

## Executive Summary

The candidate access implementation on Vakancy.in has been refactored and aligned with the enterprise recruitment workflow:
1. **Job-Specific Candidate Access as Controlling Permission:** The employer's ability to view applicants for a specific job posting is controlled strictly by `JOB.allow_candidate_access` (governed dynamically by the Director), rather than an employer-wide database permission.
2. **Independent Candidate Talent Database:** The employer-wide Candidate Database module remains completely independent (`EMPLOYERS.candidate_access_enabled`), ensuring company-wide database privileges do not override job requisition controls.
3. **Structured Candidate Profile & Secure Resume Delivery:** When candidate access is active, employers review full structured profiles with real database fields (Candidate name, Candidate ID, Application ID, applied job title, headline, experience, verified skills, location, education history, work history, profile summary, applied date, and recruitment status). Resumes are authorized and streamed via signed Cloudinary delivery URLs (`/api/employers/jobs/:jobId/applicants/:appId/resume`) — preventing raw URL leaks.
4. **Locked Gate & One-Click Callback Flow:** When candidate access is disabled for a job (`allow_candidate_access = 0`), direct applicant dossiers are gated behind a locked card (`#job-candidate-access-locked-card`) offering a single primary **Request Callback** action. The request links the authenticated employer ID, job ID, and user ID into `CALLBACK_REQUEST`, notifies the Director in real time, and locks subsequent submissions into a pending alert state (`#job-callback-pending-alert`) to prevent duplicates.
5. **Global Modal, Sidebar & Header Layering:** Audited and resolved modal layering, clipping, and stacking contexts across both the Employer Portal and Admin Portal using top-level portals (`createPortal(..., document.body)`), high z-index (`z-[9999]`), `100dvh` dynamic viewport sizing, body scroll locking, and accessible keyboard escape handling (`useModalA11y`).
6. **End-to-End Real Browser Verification:** Executed a 10-step automated Chrome verification script against actual MySQL database records and live services, validating every transition without mocked or simulated data.

---

## 1. Root Cause Analysis

Prior to this implementation:
- **Permission Conflation:** The candidate access check on job applicants previously checked employer-wide database enablement (`EMPLOYERS.candidate_access_enabled`) or lacked explicit job-level gating. If an employer had Candidate Database access turned off, they could be locked out of their own direct job applicants, or vice versa.
- **Incomplete Structured Profile:** The employer applicants table lacked a comprehensive structured profile view displaying relational records (verified skills from `CANDIDATE_SKILL`, education records from `CANDIDATE_EDUCATION`, work history from `CANDIDATE_EXPERIENCE`).
- **Resume Delivery Vulnerability:** Direct resume file URLs were vulnerable to unauthenticated scraping or lacked job-scoped multi-tenant authorization checks.
- **Modal Overflow & Stacking Conflicts:** Modal dialogs rendered inside nested DOM wrappers were clipped by parent `overflow-hidden` containers, overlapped by sticky headers (`z-40` / `z-50`) or sidebars (`z-30`), and allowed the underlying page to scroll while open.

---

## 2. Access Model Comparison

| Feature / Dimension | Legacy Implementation | New Job-Wise Architecture |
| :--- | :--- | :--- |
| **Controlling Permission for Job Applicants** | Conflated with company-wide database flag | Strictly `JOB.allow_candidate_access` (per individual job requisition) |
| **Employer Candidate Database Module** | Tied to job applicant permissions | Independent module governed by `EMPLOYERS.candidate_access_enabled` |
| **Applicant Dossier View (Access ON)** | Basic table summary | Full Structured Profile Modal portaled to `document.body` (`z-[9999]`) |
| **Applicant Dossier View (Access OFF)** | Inconsistent redirect / error toast | Professional Locked Card (`#job-candidate-access-locked-card`) with one-click Callback |
| **Duplicate Callback Prevention** | None (could insert multiple rows) | Atomic check on open callbacks (`NEW`, `ASSIGNED`, `IN_PROGRESS`) returning `CALLBACK_PENDING` |
| **Resume Security** | Potential direct Cloudinary URLs | Job-scoped, application-scoped signed Cloudinary delivery URL with activity audit log |
| **Modal Layering & Escape** | Nested DOM elements with z-index clashes | Portaled to `document.body` (`z-[9999]`), `useModalA11y` trap & ESC handler, body scroll locked |

---

## 3. Real Database Entities & Test Baseline

All changes were implemented and tested against real database records in `vakancy_main_db`:

### Target Employer: Scan2Serve
- **User ID:** `a36db283-a2e9-4fa6-9583-e941b9a283c2`
- **Email:** `chauhandevang075@gmail.com`
- **Employer ID:** `f5a22dce-b8f3-11f1-bdbe-8469936720fe`
- **Company Name:** `Scan2Serve`
- **Director Account:** `director@vakancy.com` (`usr-director-001`)

### Requisitions Used in Testing
- **Job 1 (Access ON Baseline):** `eb1c99ab-ba9a-47e5-aa48-59852df23218`
  - **Title:** `Full Stack Developer`
  - **Status:** `open`
  - **Candidate Access:** Enabled (`allow_candidate_access = 1`)
  - **Direct Applicant:** `Meet Soni`
    - **Candidate ID:** `7fb54d99-21e1-42a2-933c-5271f81b654b`
    - **Application ID:** `ac7fda0c-998f-4162-a138-a50a658d8bb7`
    - **Primary Resume ID:** `3df3b8ff-0bca-4d93-87c7-1c5160d01c2f` (`DEVANGCHAUHAN6JulyRESUME.pdf`)
    - **Verified Skills:** React, TypeScript, Node.js, Express.js, MySQL, TailwindCSS, etc.
    - **Verified Education:** BCA (GLS University), MSCIT (GLS University)
    - **Verified Experience:** Umang Barot Consultancy (Full Stack Intern), FACT-BYTE (Front-end Internship)
- **Job 2 (Access OFF Baseline):** `318102a1-f4c2-44f7-8c4f-2ffd894c1d5a`
  - **Title:** `Web Developer`
  - **Status:** `open`
  - **Candidate Access:** Restricted (`allow_candidate_access = 0`)
  - **Purpose:** Verification of Locked Gate and One-Click Callback Submission

---

## 4. Key Implementation Details

### A. Backend Architecture (`backend/controllers/employerController.js`)
1. **`getEmployerJobApplicants`:**
   - Multi-tenant tenant verification: `job.employer_id === employer.id || job.client_id === employer.id`.
   - Checks `job.allow_candidate_access`. If `0`, returns HTTP 403 with `code: 'CANDIDATE_ACCESS_DISABLED'`, `candidate_access_allowed: false`, and pending callback metadata if an active request exists.
   - When access is `1`, executes relational queries across `APPLICATION`, `CANDIDATES`, `USERS`, `CANDIDATE_SKILL`, `CANDIDATE_EDUCATION`, `CANDIDATE_EXPERIENCE`, and `CANDIDATE_RESUME`.
   - Contact info is masked for standard applicants; resumes are flagged as `resume_authorized: true`.
2. **`getEmployerJobApplicantResume`:**
   - Dedicated endpoint: `GET /api/employers/jobs/:jobId/applicants/:appId/resume`.
   - Validates employer ownership of the job and `job.allow_candidate_access === 1`.
   - Generates a cryptographically signed Cloudinary delivery URL with `sign_url: true, secure: true`.
   - Records audit event `VIEW_APPLICANT_RESUME` in `RECRUITMENT_ACTIVITY`.
3. **`requestEmployerCallback`:**
   - Validates employer ownership and accepts `callback_reason`.
   - Queries `CALLBACK_REQUEST` for any existing request with status in `('NEW', 'ASSIGNED', 'IN_PROGRESS')` for this employer and job ID. Returns `CALLBACK_PENDING` (HTTP 200) if active, preventing rapid duplicates.
   - On new submission, writes `CALLBACK_REQUEST` with `job_id`, `employer_id`, `requested_by_user_id`, `source = 'JOB_APPLICANTS'`, and creates in-app notifications for platform Directors.

### B. Frontend Architecture
1. **Admin Jobs Management (`admin-frontend/src/pages/AdminJobs.jsx`):**
   - Added `#admin-jobs-search-input` for filtering.
   - Rendered `#btn-toggle-job-candidate-access-${j.id}` toggle switch reflecting `allow_candidate_access`.
   - Invokes `PUT /api/admin/jobs/:id/candidate-access` with optimistic state update.
2. **Employer Jobs Dashboard (`frontend/src/pages/employer/EmployerJobsPage.jsx`):**
   - Rendered Candidate Access badge (`#badge-candidate-access-${job.id}`) displaying `Candidate Access ON` (green) or `Candidate Access OFF` (amber).
   - Rendered `#btn-review-applicants-${job.id}` link leading to applicants review.
   - Portaled Job Details Modal to `document.body` with `z-[9999]` and `useModalA11y`.
3. **Employer Job Applicants Page (`frontend/src/pages/employer/EmployerApplicantsPage.jsx`):**
   - **Candidate Profile Modal:** `#applicant-profile-modal` portaled to `document.body` with `z-[9999]`, dynamic `100dvh` viewport constraints, real candidate identifier `#cand-profile-candidate-id`, application identifier `#cand-profile-app-id`, verified skills badges, education history, work experience, and `#btn-preview-applicant-resume`.
   - **Locked Gate Card:** `#job-candidate-access-locked-card` rendered when `candidate_access_allowed === false`, providing `#job-callback-reason-input` and `#btn-request-job-callback`.
   - **Duplicate Alert:** `#job-callback-pending-alert` displays when an active callback request is detected, disabling duplicate submissions.
   - **Portaled Sub-modals:** Raise Enquiry and Enquiry History modals portaled to `document.body` with `z-[9999]` and `useModalA11y`.

---

## 5. Ten-Step Real Browser Verification Results

The automated Puppeteer test suite (`backend/tests/real_browser_scan2serve_job_wise_candidate_access.js`) verified all 10 steps in real Chrome:

```
========================================================================
🌐 RUNNING REAL BROWSER SCAN2SERVE JOB-WISE CANDIDATE ACCESS & MODAL FIX
Target Employer: Scan2Serve (chauhandevang075@gmail.com)
Director Account: director@vakancy.com
========================================================================

Connected to the configured MySQL database: vakancy_main_db (schema unchanged).
[Auth] Scan2Serve User ID: a36db283-a2e9-4fa6-9583-e941b9a283c2 Email: chauhandevang075@gmail.com
[Auth] Scan2Serve Employer ID: f5a22dce-b8f3-11f1-bdbe-8469936720fe Company: Scan2Serve
✅ Baseline setup complete:
   Job 1 (eb1c99ab-ba9a-47e5-aa48-59852df23218) - "Full Stack Developer" -> allow_candidate_access = 1
   Job 2 (318102a1-f4c2-44f7-8c4f-2ffd894c1d5a) - "Web Developer" -> allow_candidate_access = 0

[Step 1] Director logs into Admin portal at http://localhost:5174/login...
✅ Director logged in successfully. Current URL: http://localhost:5174/dashboard
[Step 1] Director navigates to Admin Jobs Management (http://localhost:5174/jobs)...
[Step 1] Filtering admin jobs by "Full Stack Developer"...
✅ Found Candidate Access toggle switch for Job 1: #btn-toggle-job-candidate-access-eb1c99ab-ba9a-47e5-aa48-59852df23218

[Step 2] Scan2Serve employer logs into http://localhost:5173/login?role=employer...
✅ Scan2Serve employer logged in. URL: http://localhost:5173/recruiter
[Step 2] Navigating to Employer Jobs Dashboard (http://localhost:5173/recruiter/jobs)...
✅ Verified Job 1 Candidate Access Badge: "Candidate Access ON"
✅ Verified Job 2 Candidate Access Badge: "Candidate Access OFF"

[Step 3] Opening Job 1 Applicants (/recruiter/jobs/eb1c99ab-ba9a-47e5-aa48-59852df23218/applicants)...
✅ Found applicant Meet Soni row with View Profile CTA
[Step 3] Clicking View Profile to open #applicant-profile-modal...
✅ #applicant-profile-modal is rendered
✅ Candidate ID in modal: 7fb54d99-21e1-42a2-933c-5271f81b654b
✅ Application ID in modal: ac7fda0c-998f-4162-a138-a50a658d8bb7
✅ Candidate Profile Modal Layering: { zIndex: '9999', position: 'fixed', bodyOverflow: 'hidden' }

[Step 4] Testing authorized resume endpoint...
✅ Resume Endpoint Response Status: 200
✅ Resume File Name: DEVANGCHAUHAN6JulyRESUME.pdf
✅ Resume Signed URL Valid: true
✅ Modal closed state: CLOSED

[Step 5] Opening Job 2 (/recruiter/jobs/318102a1-f4c2-44f7-8c4f-2ffd894c1d5a/applicants) with Candidate Access OFF...
✅ Found #job-candidate-access-locked-card for Job 2
✅ Locked card heading: "Candidate Access Restricted"
✅ Applicant table displayed: false (Should be false)

[Step 6] Submitting Callback Request for Job 2...
✅ Callback submitted successfully. Alert text: "Callback Request Received! Our Recruitment Director & Lead Recruiter have been notified."
[Step 6] Refreshing Job 2 page to verify duplicate prevention...
✅ Duplicate prevention verified on reload: Alert visible = true

[Step 7] Director navigates to http://localhost:5174/callbacks to review request...
✅ Director Callbacks page contains Scan2Serve: true
✅ Director Callbacks page contains Web Developer / Job: true

[Step 8] Director toggles Candidate Access OFF for Job 1 in Admin Portal...
✅ Clicked Candidate Access toggle for Job 1 in Admin Portal (now OFF)
[Step 8] Employer refreshes Job 1 applicants page...
✅ Job 1 is now dynamically locked for the employer!
[Step 8] Re-enabling Candidate Access for Job 1 in Admin Portal...
✅ Candidate Access re-enabled for Job 1 in Admin Portal

[Step 9] Security test: Employer accesses unauthorized job (058b05af-756c-4945-9d2b-8d106c61beb7)...
✅ Unauthorized Job Access denied properly: true

[Step 10] Returning to Job 1 applicants to verify modal stacking & escape behavior...
✅ Final Modal Stacking Audit: {
  isTopLevelPortal: true,
  zIndex: '9999',
  bodyOverflow: 'hidden',
  position: 'fixed'
}
[Step 10] Testing Escape key closes modal...
✅ Modal closed via ESC: true

========================================================================
🎉 ALL 10 REAL BROWSER VERIFICATION STEPS PASSED SUCCESSFULLY!
========================================================================
```

---

## 6. Verification Artifacts & Visual Proof

The following verified browser screenshots were captured during the automated test execution:

### Step 1: Director Portal — Job Postings & Candidate Access Toggles
![Step 1 Director Jobs Management](C:\Users\Devang chauhan\.gemini\antigravity-ide\brain\b435974b-97b5-4981-8660-07ab0b84ce36\step1_director_jobs_management.png)

### Step 2: Employer Jobs Dashboard — Candidate Access ON vs OFF Badges
![Step 2 Employer Jobs Badges](C:\Users\Devang chauhan\.gemini\antigravity-ide\brain\b435974b-97b5-4981-8660-07ab0b84ce36\step2_employer_jobs_badges.png)

### Step 3: Job 1 Applicants Table (Candidate Access ON)
![Step 3 Job Applicants Table](C:\Users\Devang chauhan\.gemini\antigravity-ide\brain\b435974b-97b5-4981-8660-07ab0b84ce36\step3_job_applicants_table.png)

### Step 3: Structured Candidate Profile Modal (`#applicant-profile-modal`)
![Step 3 Applicant Profile Modal](C:\Users\Devang chauhan\.gemini\antigravity-ide\brain\b435974b-97b5-4981-8660-07ab0b84ce36\step3_applicant_profile_modal.png)

### Step 5: Job 2 Candidate Access Restricted Gate (`#job-candidate-access-locked-card`)
![Step 5 Job Locked Gate](C:\Users\Devang chauhan\.gemini\antigravity-ide\brain\b435974b-97b5-4981-8660-07ab0b84ce36\step5_job_locked_gate.png)

### Step 6: Callback Request Submitted with Duplicate Prevention Alert
![Step 6 Callback Submitted](C:\Users\Devang chauhan\.gemini\antigravity-ide\brain\b435974b-97b5-4981-8660-07ab0b84ce36\step6_callback_submitted.png)

### Step 7: Director Callbacks Queue with Real Scan2Serve Mandate
![Step 7 Director Callbacks Queue](C:\Users\Devang chauhan\.gemini\antigravity-ide\brain\b435974b-97b5-4981-8660-07ab0b84ce36\step7_director_callbacks_queue.png)

### Step 8: Dynamic Admin Lock Toggled OFF for Job 1
![Step 8 Director Disabled Job 1](C:\Users\Devang chauhan\.gemini\antigravity-ide\brain\b435974b-97b5-4981-8660-07ab0b84ce36\step8_director_disabled_job1.png)

### Step 8: Employer Refresh Immediately Receives Locked State
![Step 8 Job 1 Dynamically Locked](C:\Users\Devang chauhan\.gemini\antigravity-ide\brain\b435974b-97b5-4981-8660-07ab0b84ce36\step8_job1_now_locked.png)

### Step 9: Multi-Tenant Security Isolation (Unauthorized Job ID 403 Forbidden)
![Step 9 Unauthorized Job Access Denied](C:\Users\Devang chauhan\.gemini\antigravity-ide\brain\b435974b-97b5-4981-8660-07ab0b84ce36\step9_unauthorized_job_access_denied.png)

### Step 10: Modal Layering (`z-[9999]`), Stacking Context & ESC Key Dismissal
![Step 10 Modal Stacking Verified](C:\Users\Devang chauhan\.gemini\antigravity-ide\brain\b435974b-97b5-4981-8660-07ab0b84ce36\step10_modal_stacking_verified.png)

---

## 7. Modified Files Summary

| File | Changes Made |
| :--- | :--- |
| `backend/controllers/employerController.js` | Enforced `job.allow_candidate_access` in `getEmployerJobApplicants`. Implemented `getEmployerJobApplicantResume` with Cloudinary signed delivery URLs. Enhanced `requestEmployerCallback` with duplicate prevention and `source = 'JOB_APPLICANTS'`. |
| `backend/routes/employerRoutes.js` | Added route `GET /jobs/:jobId/applicants/:appId/resume` with role authorization. |
| `admin-frontend/src/pages/AdminJobs.jsx` | Added `#admin-jobs-search-input` and `#btn-toggle-job-candidate-access-${j.id}` toggle switch. |
| `frontend/src/pages/employer/EmployerJobsPage.jsx` | Added Candidate Access badge (`#badge-candidate-access-${job.id}`) and Review CTA (`#btn-review-applicants-${job.id}`). Portaled Job Details modal to `document.body` with `z-[9999]` and `useModalA11y`. |
| `frontend/src/pages/employer/EmployerApplicantsPage.jsx` | Added Structured Candidate Profile Modal (`#applicant-profile-modal`) portaled to `document.body` with `z-[9999]`, verified skills, education, work experience, profile summary, and preview resume button. Added Locked Gate Card (`#job-candidate-access-locked-card`) and Callback Pending Alert (`#job-callback-pending-alert`). Portaled Enquiry and Enquiry History modals with `z-[9999]`. |
| `frontend/src/pages/employer/CandidateDatabase.jsx` | Upgraded Candidate Profile Modal to use `createPortal(..., document.body)`, `z-[9999]`, dynamic `100dvh` sizing, and `useModalA11y`. |
| `backend/tests/real_browser_scan2serve_job_wise_candidate_access.js` | 10-step real Chrome verification script testing Director toggling, employer access ON, profile modal, signed resume delivery, locked state, duplicate prevention, callback queue, dynamic locking, and multi-tenant isolation. |

---

## 8. Conclusion & Sign-Off

The Job-Wise Candidate Access permission model is fully functioning and verified in real Chrome:
- **Scan2Serve Requisitions:** When Candidate Access is ON, the employer views full applicant dossiers and streams authenticated signed resumes. When Candidate Access is OFF, a clean locked state with one-click callback is displayed, preventing duplicates.
- **Independence:** Employer-wide Candidate Database access remains completely decoupled and unaffected.
- **Layering & UX:** All modals escape parent stacking contexts via `createPortal(..., document.body)`, layer at `z-[9999]`, constrain cleanly within `100dvh`, lock body scrolling, and respond to the Escape key.
- **Release Verification:** 10/10 automated browser tests passed with 0 errors.
