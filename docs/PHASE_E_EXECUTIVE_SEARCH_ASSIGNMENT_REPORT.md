# Vakancy.in — Phase E: Executive Search & Recruiter Assignment Report

**Execution Status:** Complete & Verified  
**Date:** October 23, 2026  
**Environment:** Canonical Admin Panel (`http://localhost:5174`), Live Backend API (`http://localhost:5002`), MySQL Database (`vakancy_main_db`)  
**Scope Boundary:** Stopped after Phase E. Internal ATS implementation has not been started.

---

## 1. Executive Summary & Objective

Phase E delivers the canonical **Executive Search & Recruitment Enquiries** workflow within the canonical Admin Panel, strictly respecting Vakancy.in's three internal business roles:
- **Admin / Director**
- **BD**
- **Recruiter**

No intermediate or unapproved roles (e.g., HR Executive, Team Lead, Coordinator) were introduced. Furthermore, the existing BD Leads workflow remains completely independent and was not mixed with Executive Search enquiries.

### Key Capabilities Delivered
1. **Director Recruiter Assignment & Reassignment:** Searchable modal allowing Director to assign or reassign any incoming Executive Search enquiry to an active Recruiter, dynamically persisting assignment and updating status from `NEW` to `ASSIGNED`.
2. **Dedicated Recruiter Workspace:** Recruiter accounts (`user.role === 'recruiter'`) have an isolated "Assigned Enquiries (Recruiter Workspace)" view displaying only mandates assigned to them.
3. **5-Section Inspection & Management View:** Complete mandate visibility organized into:
   - Company & Contact (with click-to-call `tel:` and click-to-email `mailto:` integration)
   - Hiring Requirement Specifications (role, openings count, location, full mandate message)
   - Ownership & Workflow Status (assigned recruiter, status selector, follow-up date, recruiter notes)
   - Linked Recruitment Job Mandates (overview of created job requisitions with live status badges)
   - Chronological Follow-Up & Activity History (persisted audit log tracking actor, timestamp, and changes)
4. **Enquiry-to-Job Mandate Conversion:** One-click conversion from enquiry into a job posting via `AdminJobFormModal`, pre-filling company details, contact person, position, openings, and location, setting `JOB.enquiry_id`, source attribution (`EXECUTIVE_SEARCH`), and transitioning enquiry status to `IN_PROGRESS` (never prematurely `RESOLVED`).
5. **Strict RBAC & Privacy Protection:** Backend guarantees that Recruiters cannot inspect or modify enquiries assigned to others (403 `SCOPE_ACCESS_DENIED`), and BD personnel are strictly prohibited from viewing or querying executive search records (403 `PRIVACY_PROTECTION_ACCESS_DENIED`).

---

## 2. Root Cause Analysis of Pre-existing Gaps

Prior to Phase E, an audit of `adminController.js`, `adminRoutes.js`, and `AdminEnquiries.jsx` identified five critical architectural and workflow gaps:

1. **Missing Data Linkage between `JOB` and `EMPLOYER_ENQUIRY`:**
   - The `JOB` table only supported `lead_id` (for BD leads) and `employer_id`, but lacked an explicit `enquiry_id` column.
   - `EMPLOYER_ENQUIRY` had a single `job_id` column, which prevented multiple job mandates from being linked to one overarching executive search client engagement.
2. **Missing History & Linked Jobs Endpoints:**
   - There were no backend routes to fetch chronological `RECRUITMENT_ACTIVITY` audit records or query all jobs associated with a specific enquiry.
3. **Unscoped Frontend Inspection Views:**
   - The enquiry inspection modal was basic, lacked structured sections, did not provide click-to-call or click-to-email shortcuts, and did not display audit history.
4. **Premature Status Resolution on Mandate Creation:**
   - Previous logic in `convertEnquiryToRequirement` attempted to lock the enquiry and had inconsistent status handling without providing full job mandate configuration.
5. **Role Policy Drift:**
   - Remnants of deprecated `tl_coordinator` references lingered in backend scoping logic, conflicting with the canonical 3-role business model.

---

## 3. Database Schema Migration

To support full enquiry-to-job linkage without altering existing records or data integrity, database migration `006_executive_search_enquiry_jobs.js` was created and applied to `vakancy_main_db`:

- **Migration File:** [`backend/database/migrations/006_executive_search_enquiry_jobs.js`](file:///c:/Users/Devang%20chauhan/OneDrive/Desktop/Vakancy/backend/database/migrations/006_executive_search_enquiry_jobs.js)
- **Database Table:** `JOB`
- **Changes Applied:**
  - Added `enquiry_id VARCHAR(36) NULL` column.
  - Added index `idx_job_enquiry_id` on `JOB(enquiry_id)`.
  - Ensured dynamic permissions in `ROLE_PERMISSIONS` for `recruiter` (`view`, `edit`) and `director` (`view`, `edit`, `create`, `delete`, `assign`, `approve`, `export`, `share`).

---

## 4. Files Changed

| Component / Layer | File Path | Summary of Modifications |
|---|---|---|
| **Database Migration** | [`backend/database/migrations/006_executive_search_enquiry_jobs.js`](file:///c:/Users/Devang%20chauhan/OneDrive/Desktop/Vakancy/backend/database/migrations/006_executive_search_enquiry_jobs.js) | Added `enquiry_id` column and index to `JOB` table; seeded canonical permissions. |
| **Migration Registry** | [`backend/database/migrations/index.js`](file:///c:/Users/Devang%20chauhan/OneDrive/Desktop/Vakancy/backend/database/migrations/index.js) | Registered migration 006 for automatic startup execution. |
| **RBAC Middleware** | [`backend/middleware/rbacMiddleware.js`](file:///c:/Users/Devang%20chauhan/OneDrive/Desktop/Vakancy/backend/middleware/rbacMiddleware.js) | Added `enquiries` to BD privacy barrier; BD role returns 403 `PRIVACY_PROTECTION_ACCESS_DENIED`. |
| **Backend Controller** | [`backend/controllers/adminController.js`](file:///c:/Users/Devang%20chauhan/OneDrive/Desktop/Vakancy/backend/controllers/adminController.js) | Enhanced `getAllEmployerEnquiries` with `linked_jobs_count`; added Director enforcement in `assignEnquiry`; updated `updateEnquiryStatus` and `updateEnquiryDetails` with field-level activity logging; added `getEnquiryHistory`, `getEnquiryLinkedJobs`, and `createJobFromEnquiry`. |
| **Backend Routes** | [`backend/routes/adminRoutes.js`](file:///c:/Users/Devang%20chauhan/OneDrive/Desktop/Vakancy/backend/routes/adminRoutes.js) | Registered `GET /enquiries/:id/history`, `GET /enquiries/:id/jobs`, and `POST /enquiries/:id/create-job`. |
| **Job Form Modal** | [`admin-frontend/src/components/jobs/AdminJobFormModal.jsx`](file:///c:/Users/Devang%20chauhan/OneDrive/Desktop/Vakancy/admin-frontend/src/components/jobs/AdminJobFormModal.jsx) | Added `fromEnquiry` prop; pre-fills company name, contact person, phone, email, title, openings, location, description, notes; submits to `/admin/enquiries/:id/create-job`; elevated backdrop to `z-[9999]`. |
| **Enquiries Page** | [`admin-frontend/src/pages/AdminEnquiries.jsx`](file:///c:/Users/Devang%20chauhan/OneDrive/Desktop/Vakancy/admin-frontend/src/pages/AdminEnquiries.jsx) | Complete rewrite implementing Director Assign/Reassign modal with search filter, Recruiter Workspace view, click-to-call/click-to-email shortcuts, 5-section Inspect modal, linked jobs listing, and activity history. |
| **Automated Tests** | [`backend/tests/verify_executive_search_workflow.js`](file:///c:/Users/Devang%20chauhan/OneDrive/Desktop/Vakancy/backend/tests/verify_executive_search_workflow.js) | End-to-end integration test validating all 12 Phase E acceptance scenarios. |
| **Browser Tests** | [`backend/tests/browser_phase_e_verification.js`](file:///c:/Users/Devang%20chauhan/OneDrive/Desktop/Vakancy/backend/tests/browser_phase_e_verification.js) | Real Chrome browser automation driving Director and Recruiter flows and capturing artifacts. |

---

## 5. APIs Used and Added

### 1. `GET /api/admin/enquiries`
- **Access:** Director (all enquiries), Recruiter (own assigned enquiries only), BD (Blocked - 403).
- **Features:** Supports search by company/contact/role, status filtering (`NEW`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`), source filtering, contact masking for unauthorized staff, and returns `linked_jobs_count`.

### 2. `PUT /api/admin/enquiries/:id/assign`
- **Access:** Director only.
- **Payload:** `{ "assigned_to_user_id": "<recruiter_uuid>" }`.
- **Validation:** Verifies target user is an active recruiter (`role === 'recruiter'` and `is_active === 1`).
- **Effect:** Sets `assigned_to_user_id`; transitions status from `NEW` to `ASSIGNED`; writes `ASSIGN_ENQUIRY` or `REASSIGN_ENQUIRY` audit log to `RECRUITMENT_ACTIVITY`.

### 3. `PUT /api/admin/enquiries/:id/status`
- **Access:** Director (any enquiry), Assigned Recruiter (own enquiry only).
- **Payload:** `{ "status": "IN_PROGRESS" }`.
- **Effect:** Updates status; writes `UPDATE_ENQUIRY_STATUS` log with previous and new values.

### 4. `PUT /api/admin/enquiries/:id/details`
- **Access:** Director (any enquiry), Assigned Recruiter (own enquiry only).
- **Payload:** `{ "status": "IN_PROGRESS", "notes": "...", "follow_up_date": "YYYY-MM-DD" }`.
- **Effect:** Updates notes, next follow-up date, and workflow status; logs audit entries with `related_enquiry_id`.

### 5. `GET /api/admin/enquiries/:id/history` *(New)*
- **Access:** Director, Assigned Recruiter.
- **Returns:** Chronological array of all `RECRUITMENT_ACTIVITY` records tied to the enquiry (actor name, email, role, action type, description, timestamp, field changes).

### 6. `GET /api/admin/enquiries/:id/jobs` *(New)*
- **Access:** Director, Assigned Recruiter.
- **Returns:** Array of all `JOB` records where `JOB.enquiry_id = :id` or `JOB.id = enquiry.job_id`, including title, department, location, status, openings count, and assigned recruiter.

### 7. `POST /api/admin/enquiries/:id/create-job` *(New)*
- **Access:** Director, Assigned Recruiter.
- **Payload:** Full job requisition payload from `AdminJobFormModal`.
- **Duplicate Prevention:** Checks for identical job title created for the same enquiry within the preceding 15 seconds.
- **Effect:**
  - Creates row in `JOB` with `enquiry_id = :id` and `source_type = 'EXECUTIVE_SEARCH'`.
  - Links primary `EMPLOYER_ENQUIRY.job_id` if currently null.
  - Transitions enquiry status from `NEW` / `ASSIGNED` to `IN_PROGRESS` (never marks `RESOLVED`).
  - Creates `USER_ASSIGNMENTS` entry for recruiter job scoping.
  - Writes `CONVERT_ENQUIRY_TO_JOB` audit record.

---

## 6. Authorization & RBAC Verification Matrix

| Action | Director (`director@vakancy.com`) | Assigned Recruiter (`recruiter@vakancy.com`) | Other Recruiter (`kavita.recruiter...`) | BD (`bdlead@vakancy.com`) | Backend Verification |
|---|:---:|:---:|:---:|:---:|---|
| **View All Enquiries** | Allowed | Denied | Denied | Blocked (403) | `getAllEmployerEnquiries` scopes by `assigned_to_user_id` unless Director |
| **View Assigned Enquiries** | Allowed | Allowed (Own) | Allowed (Own) | Blocked (403) | Recruiter query includes `WHERE assigned_to_user_id = ?` |
| **Assign / Reassign Recruiter** | Allowed | Denied (403) | Denied (403) | Blocked (403) | Verified via `checkPermission('enquiries', 'assign')` & controller check |
| **Update Assigned Enquiry Details** | Allowed | Allowed | Denied (403) | Blocked (403) | Scoped check: `enq.assigned_to_user_id === userId` |
| **Add Follow-Up Notes** | Allowed | Allowed | Denied (403) | Blocked (403) | Logged to `RECRUITMENT_ACTIVITY` |
| **Create Job from Enquiry** | Allowed | Allowed | Denied (403) | Blocked (403) | Checked in `createJobFromEnquiry` |
| **View Activity History** | Allowed | Allowed (Own) | Denied (403) | Blocked (403) | Checked in `getEnquiryHistory` |
| **BD Privacy Guard** | N/A | N/A | N/A | Blocked (403) | Middleware returns `PRIVACY_PROTECTION_ACCESS_DENIED` |

---

## 7. Enquiry-to-Job Mandate Conversion Results

Testing confirmed complete adherence to the Phase 6 specifications:
1. **No Automatic Employer Account Created:** The job mandate is created with `manual_company_name`, `manual_contact_person`, `manual_contact_phone`, and `manual_contact_email`. No unverified employer user account is generated.
2. **Dual-Key Data Linkage:** The created job stores `JOB.enquiry_id = enquiry.id`, and `EMPLOYER_ENQUIRY.job_id` points to the primary mandate while maintaining full support for multiple mandates.
3. **Attribution:** The job mandate stores `source_type = 'EXECUTIVE_SEARCH'` and `created_by_type = 'ADMIN'`.
4. **Duplicate Prevention:** Rapid-click duplicate job mandate creation is prevented via a 15-second timestamp and title guard.
5. **Multiple Distinct Mandates Supported:** Because `JOB.enquiry_id` points to `EMPLOYER_ENQUIRY.id`, a single executive search engagement can generate multiple distinct job requisitions (e.g., CTO, VP Engineering).
6. **Status Lifecycle Integrity:** Creating a job mandate transitions an enquiry from `NEW` or `ASSIGNED` to `IN_PROGRESS`. It is **never automatically set to `RESOLVED`**, ensuring active recruitment follow-up continues until hiring is finalized.

---

## 8. Real Browser Verification Evidence

Real Google Chrome browser automation was executed against the running Admin frontend (`http://localhost:5174`) and API backend (`http://localhost:5002`) using Puppeteer. Six visual artifacts were captured and verified:

### 1. Director Overview Table
![Director Overview Table](file:///C:/Users/Devang%20chauhan/.gemini/antigravity-ide/brain/b435974b-97b5-4981-8660-07ab0b84ce36/phase_e_director_enquiries_table.png)
- **File:** `phase_e_director_enquiries_table.png`
- **Features Demonstrated:** Complete company information, contact details with clickable email and phone links, openings count, location, source badge ("Executive Search"), status badges, assigned recruiter name, follow-up dates, and distinct "Assign Recruiter" / "Reassign" action buttons.

### 2. Director Recruiter Assignment Modal
![Director Assignment Modal](file:///C:/Users/Devang%20chauhan/.gemini/antigravity-ide/brain/b435974b-97b5-4981-8660-07ab0b84ce36/phase_e_director_assign_modal.png)
- **File:** `phase_e_director_assign_modal.png`
- **Features Demonstrated:** Clean modal backdrop (`z-[9999]`), enquiry context summary card, searchable recruiter filter input ("Search recruiter by name or email..."), radio selection showing only verified active recruiters with names and emails, and "Confirm Reassignment" button.

### 3. Refreshed Director Table with Persisted Assignment
![Refreshed Table](file:///C:/Users/Devang%20chauhan/.gemini/antigravity-ide/brain/b435974b-97b5-4981-8660-07ab0b84ce36/phase_e_director_enquiry_assigned_refreshed.png)
- **File:** `phase_e_director_enquiry_assigned_refreshed.png`
- **Features Demonstrated:** Instant table refresh reflecting the assigned recruiter's canonical name ("Vakancy Operations Specialist"), updated status badge, and transition of the action button to "Reassign".

### 4. Recruiter Workspace View
![Recruiter Workspace View](file:///C:/Users/Devang%20chauhan/.gemini/antigravity-ide/brain/b435974b-97b5-4981-8660-07ab0b84ce36/phase_e_recruiter_workspace_view.png)
- **File:** `phase_e_recruiter_workspace_view.png`
- **Features Demonstrated:** Dedicated header "Assigned Enquiries (Recruiter Workspace)" with "My Workspace" pill badge. Shows only enquiries assigned to the logged-in recruiter. Unassigned and other recruiters' mandates are strictly omitted.

### 5. 5-Section Inspect & Manage Modal
![Inspect and Manage Modal](file:///C:/Users/Devang%20chauhan/.gemini/antigravity-ide/brain/b435974b-97b5-4981-8660-07ab0b84ce36/phase_e_inspect_manage_5_sections.png)
- **File:** `phase_e_inspect_manage_5_sections.png`
- **Features Demonstrated:**
  1. *Section 1 (Company & Contact):* Company name, contact person, click-to-email (`mailto:`), click-to-call (`tel:`).
  2. *Section 2 (Hiring Requirement):* Position, openings count, location, full submitted mandate description.
  3. *Section 3 (Ownership & Status):* Enquiry status dropdown, assigned recruiter indicator, date picker for next follow-up, recruiter notes textarea.
  4. *Section 4 (Linked Job Mandates):* Overview of linked job requisitions with "Create Job from Enquiry" CTA.
  5. *Section 5 (Follow-up & Activity History):* Chronological timeline of events, actor attributions, and timestamps.

### 6. Pre-filled Job Mandate Form Modal
![Prefilled Job Form](file:///C:/Users/Devang%20chauhan/.gemini/antigravity-ide/brain/b435974b-97b5-4981-8660-07ab0b84ce36/phase_e_prefilled_job_mandate_modal.png)
- **File:** `phase_e_prefilled_job_mandate_modal.png`
- **Features Demonstrated:** Invoked directly from the enquiry details modal with title "Create Mandate: [Company Name]", pre-filling job title, openings count, location, description, and internal notes. Submitting saves the mandate linked to `JOB.enquiry_id`.

---

## 9. Automated Regression & Test Verification

### 1. Phase E End-to-End Suite (`verify_executive_search_workflow.js`)
Executed with real isolated MySQL records against live backend services:
```
===============================================================
🧪 Starting Phase E: Executive Search & Recruiter Assignment Validation
===============================================================
--- 1. Authenticating Roles ---
✅ Director authenticated
✅ Recruiter 1 (Vakancy Operations Specialist) authenticated
✅ Recruiter 2 (Kavita Sen) authenticated
✅ BD User (Devang) authenticated

--- Setting up Isolated Test Enquiry ---
✅ Created test executive search enquiry for Apex Aerospace Mandate 1792703725393

--- Scenario 1: Executive Search Enquiry in Admin Table ---
✅ Scenario 1 Passed: Enquiry #bad3b59d-cfd7-492c-8c38-0fdd54659b0c found in Admin. Status: NEW

--- Scenario 2 & 3: Director Assigns Enquiry to Recruiter 1 ---
✅ Assignment API response: Enquiry successfully assigned to Vakancy Operations Specialist.
✅ Scenario 2 & 3 Passed: Enquiry assigned to 'Vakancy Operations Specialist'. Status is 'ASSIGNED'

--- Scenario 4: Recruiter 1 Sees Assigned Enquiry in Workspace ---
✅ Scenario 4 Passed: Recruiter 1 successfully sees assigned enquiry with full contact details

--- Scenario 5: Recruiter 2 Cannot Access or Modify Recruiter 1 Enquiry ---
✅ Scenario 5 Passed: Recruiter 2 strictly isolated with 403 SCOPE_ACCESS_DENIED

--- Scenario 6 & 7: Recruiter 1 Adds Follow-up Note & Updates Status ---
✅ Scenario 6 & 7 Passed: Recruiter 1 recorded follow-up notes and set status to IN_PROGRESS

--- Scenario 8: Director Views Full Activity Audit History ---
✅ Scenario 8 Passed: Complete chronological audit logs verified (4 events logged with actor/timestamp)

--- Scenario 9: Recruiter 1 Creates Job from Enquiry ---
✅ Scenario 9 Passed: Job Requisition created with ID: 9ff3fe57-ce39-411a-860c-4e469dd4fb63

--- Scenario 10: Verify Linked Job and Enquiry Integrity ---
✅ Linked job verified: "Chief Technology Officer (Aerospace Systems)" (Status: open, Source: EXECUTIVE_SEARCH)
✅ Scenario 10 Passed: Enquiry remains 'IN_PROGRESS', linked_jobs_count = 1

--- Scenario 11: BD Role Privacy Boundary Verification ---
✅ Scenario 11 Passed: BD role receives 403 PRIVACY_PROTECTION_ACCESS_DENIED when attempting to access enquiries

--- Scenario 12: BD Leads and Employer Portal Stability ---
✅ BD Leads functional: 0 leads returned
✅ Public job portal functional

===============================================================
🎉 ALL 12 PHASE E ACCEPTANCE SCENARIOS PASSED SUCCESSFULLY
===============================================================
```

### 2. Candidate Database Removal & Job-Wise Access Regression (`verify_candidate_database_removal.js`)
- Result: **All 13 criteria passed without regression.**
- Verified that Scan2Serve employer portal has no "Candidate Database" link and job-wise candidate access remains strictly enforced.

### 3. Production Frontend Builds
- `admin-frontend`: `npm run build` completed in 4.79s with 0 errors.
- `frontend`: `npm run build` completed in 6.69s with 0 errors.

---

## 10. Remaining Limitations & Boundaries

1. **Email Service Configuration:** When creating enquiries or converting mandates, transactional email delivery alerts via Resend require an active internet connection and valid Resend API key. If the external API times out, the backend gracefully catches the network exception and continues database operations without blocking the user.
2. **Historical Migrations Untouched:** No destructive alterations were performed on legacy application data or pre-existing enquiries.
3. **Phase Boundary:** As instructed, implementation has stopped at Phase E. Internal ATS candidate pipeline and stage transitions have **not** been started.
