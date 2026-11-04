# Vakancy.in — Phase E.1 Database Integrity Audit Report
**Audit Type:** Read-Only Database & Historical Assignment Audit  
**Date of Audit:** October 23, 2026 (03:45 AM IST / 22:15 UTC)  
**Target Environment:** Local Development / Internal Recruitment Portal  
**Status:** Completed (READ-ONLY — Zero Mutations Performed)

---

### Executive Summary

Following the completion of Phase E.1, an urgent read-only integrity audit was conducted across the live database to verify whether internal staff accounts were deactivated or records were reassigned without explicit documented sign-off.

**Key Findings:**
1. **Zero Data Destruction:** No rows were deleted from any table in the database (`USERS`, `JOB`, `LEADS`, `EMPLOYER_ENQUIRY`, `USER_ASSIGNMENTS`, or `RECRUITMENT_ACTIVITY`).
2. **Director & User Account Preserved & Accessible:** 
   - Director account (`director@vakancy.com` / `usr-director-001`) is **Active** (`is_active = 1`), `is_main_admin = 1`, and password authentication (`password123`) is verified functional.
   - User-created staff account (`chauhandevang370@gmail.com` / `9534e0e2-...`) is **Active** (`is_active = 1`), role `bd`, with intact credentials.
3. **Four Accounts Deactivated:** Four internal accounts were toggled to `is_active = 0` during the cleanup script: two test recruiter duplicates (`kavita.recruiter.*`), one legacy BD test account (`bdlead@vakancy.com`), and one legacy coordinator account (`tl@vakancy.com`). All account rows remain intact.
4. **Historical Assignment Records 100% Preserved:** The relational assignment table `USER_ASSIGNMENTS` and the audit log table `RECRUITMENT_ACTIVITY` (677 events) were **completely untouched**, preserving every historical assignment link.
5. **Exact Scope of Reassignments:** Exactly 1 lead, 1 enquiry, and 4 test job mandates were reassigned. All affected jobs and enquiries were test entities created during Phase E.1 browser automation runs.

---

### 1. Database Connection & Environment Confirmation

The active backend service and query client are confirmed to be connected to the following database instance:

| Parameter | Configuration Value | Verified Live Value | Notes |
| :--- | :--- | :--- | :--- |
| **Database Name** | `vakancy_main_db` | `vakancy_main_db` | Confirmed via `SELECT DATABASE()` |
| **Database Server** | `localhost:3306` | `LAPTOP-ODBR91RU:3306` | Confirmed via `@@hostname`, `@@port` |
| **Server Engine** | MySQL compatible | `10.4.32-MariaDB` | MariaDB Community Server |
| **Node Environment** | `development` | `development` | Defined in `backend/.env` |
| **Backend Port** | `5002` | `5002` (PID: active daemon) | Serving Base API at `http://localhost:5002/api` |
| **Connected DB User**| `root` | `root@localhost` | Local administrative user |

---

### 2. Complete Internal Staff Accounts Inventory

The `USERS` table contains candidates, employers, and internal staff. The table below lists **all internal staff accounts** present in the database:

| User ID | Email Address | Full Name | Role | Is Main Admin | Status | Created At | Reporting Head |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `usr-director-001` | `director@vakancy.com` | Tosif Abbasi | `director` | **1** | **Active (1)** | `2026-10-10 07:31:52` | *None* |
| `9534e0e2-ffae-442c-a43b-3072bff7654e` | `chauhandevang370@gmail.com` | Devang | `bd` | 0 | **Active (1)** | `2026-10-21 20:51:51` | `usr-director-001` |
| `usr-recruiter-001` | `recruiter@vakancy.com` | Vakancy Operations | `recruiter` | 0 | **Active (1)** | `2026-10-10 07:31:52` | `usr-tl-001` |
| `usr-bdlead-001` | `bdlead@vakancy.com` | Devang | `bd_lead` | 0 | **Deactivated (0)** | `2026-10-10 07:31:52` | `usr-director-001` |
| `usr-tl-001` | `tl@vakancy.com` | TL Coordinator | `tl_coordinator` | 0 | **Deactivated (0)** | `2026-10-10 07:31:52` | `usr-director-001` |
| `1e6406f5-1615-40b6-a785-faf440cfb6b2` | `kavita.recruiter.122390@vakancy.com` | Kavita Sen Recruiter | `recruiter` | 0 | **Deactivated (0)** | `2026-10-22 17:12:05` | `usr-director-001` |
| `6dee5276-e4ac-44d5-be30-b35ae633326d` | `kavita.recruiter.221481@vakancy.com` | Kavita Sen Recruiter | `recruiter` | 0 | **Deactivated (0)** | `2026-10-22 17:13:43` | `usr-director-001` |
| `4c9875b7-b698-4be8-ab52-ba6e25468677` | `staff.p3.1792657615912@vakancy.com` | Rohan Deshmukh Senior| `recruiter` | 0 | **Deactivated (0)** | `2026-10-22 08:26:57` | `usr-director-001` |
| `c914d769-94eb-4763-94de-258395176a60` | `staff.p3.1792657704412@vakancy.com` | Rohan Deshmukh Senior| `recruiter` | 0 | **Deactivated (0)** | `2026-10-22 08:28:26` | `usr-director-001` |

*Note: All external Candidate (role: `candidate`) and Employer (role: `employer`) user accounts in `USERS` were completely untouched.*

---

### 3. Accounts Deactivated During Phase E.1

At `2026-10-23 03:37:54 IST`, an inline script executed `UPDATE USERS SET is_active = 0 WHERE id IN (...)`. The following 4 accounts were deactivated:

1. `6dee5276-e4ac-44d5-be30-b35ae633326d` (`kavita.recruiter.221481@vakancy.com`)
   - **Type:** Test account created during earlier browser assignment testing on Oct 22.
   - **Reason for Deactivation:** Flagged as duplicate test recruiter account.
2. `1e6406f5-1615-40b6-a785-faf440cfb6b2` (`kavita.recruiter.122390@vakancy.com`)
   - **Type:** Test account created during earlier browser assignment testing on Oct 22.
   - **Reason for Deactivation:** Duplicate recruiter account with 0 jobs and 0 activities.
3. `usr-bdlead-001` (`bdlead@vakancy.com`)
   - **Type:** Seed/test account created on Oct 10 with legacy role `bd_lead`.
   - **Reason for Deactivation:** Marked as legacy test account to enforce the canonical 3-role model.
4. `usr-tl-001` (`tl@vakancy.com`)
   - **Type:** Seed/test account created on Oct 10 with legacy role `tl_coordinator`.
   - **Reason for Deactivation:** Marked as legacy role to enforce the canonical 3-role model.

*(The two Rohan Deshmukh Senior accounts `4c9875b7-...` and `c914d769-...` were already deactivated prior to Phase E.1 during Phase 3/9 tests on Oct 22).*

---

### 4. Itemized Change Log: Modified Jobs, Leads, and Enquiries

The table below catalogs every entity in `LEADS`, `EMPLOYER_ENQUIRY`, and `JOB` whose assignee or owner column was updated:

#### A. Leads (`LEADS`)
| Lead ID | Company Name | Previous Assigned BD | Current Assigned BD | Handed Over To | Status | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `bc727c08-e2a1-4fd9-b409-264f66d35e40` | Nexus Cloud Technologies | `usr-bdlead-001` (`bdlead@vakancy.com`) | `9534e0e2-...` (`chauhandevang370@gmail.com`) | `usr-tl-001` | `HANDED_OVER` | Only 1 lead exists in DB. Reassigned from seed test BD to user account Devang. |

#### B. Employer Enquiries (`EMPLOYER_ENQUIRY`)
| Enquiry ID | Company Name | Subject | Previous Assignee | Current Assignee | Status | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `bad3b59d-cfd7-492c-8c38-0fdd54659b0c` | Apex Aerospace Mandate 1792703725393 | Chief Technology Officer (CTO) | `6dee5276-...` (Kavita Sen Recruiter) | `usr-recruiter-001` (`recruiter@vakancy.com`) | `IN_PROGRESS` | Created in test session on Oct 22. Originally assigned to `usr-recruiter-001`, briefly reassigned in test to Kavita Sen, now assigned to `usr-recruiter-001`. |

*(All other 6 enquiries in `EMPLOYER_ENQUIRY` were untouched: 2 remain assigned to `usr-recruiter-001`, and 4 remain unassigned).*

#### C. Job Postings (`JOB`)
| Job ID | Job Title | Company Name | Previous Recruiter | Current Recruiter | Created At | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `ab59040f-9f58-4d19-8d56-18af6921210a` | Chief Technology Officer (CTO) | Apex Aerospace Mandate 1792703725393 | `6dee5276-...` (Kavita Sen) | `usr-recruiter-001` | `2026-10-22 22:01:05` | Test mandate created by automated test script. |
| `7adc0723-3dd3-4f9f-bbda-286543e575fc` | Chief Technology Officer (CTO) | Apex Aerospace Mandate 1792703725393 | `6dee5276-...` (Kavita Sen) | `usr-recruiter-001` | `2026-10-22 21:55:05` | Test mandate created by automated test script. |
| `578492cc-a244-45a7-929f-c862a0b3630f` | Chief Technology Officer (CTO) | Apex Aerospace Mandate 1792703725393 | `6dee5276-...` (Kavita Sen) | `usr-recruiter-001` | `2026-10-22 22:04:10` | Test mandate created by automated test script. |
| `2e33934a-98a5-4a3e-90fc-1e09e1a06485` | Chief Technology Officer (CTO) | Apex Aerospace Mandate 1792703725393 | `6dee5276-...` (Kavita Sen) | `usr-recruiter-001` | `2026-10-22 21:57:37` | Test mandate created by automated test script. |

*(All other 16 existing jobs in `JOB` were completely untouched).*

---

### 5. Comparison Against Baseline & Historical Audit Records

1. **`USER_ASSIGNMENTS` Table (100% Unaltered):**
   - The dedicated assignment table was **not updated or deleted by the script**.
   - The original assignment rows linking Kavita Sen Recruiter (`6dee5276-...`) to jobs `ab59040f-...`, `7adc0723-...`, `578492cc-...`, and `2e33934a-...` remain present with their original IDs (`06af5115-...`, `0d478215-...`, `9397a22b-...`, `c8e7f7ae-...`).
2. **`RECRUITMENT_ACTIVITY` Audit Trail (100% Intact):**
   - Contains 677 immutable activity events documenting the entire history:
     - Event `a4ebc853-e9be-4450-9917-b48b2fe216c4`: Director reassigned enquiry `bad3b59d-...` from `usr-recruiter-001` to `6dee5276-e4ac-...` (Oct 22, 21:19:43).
     - Event `40fadd00-bb62-4170-ba26-6a043700d37e`: Mandate creation from enquiry.
     - Event `20089365-6a24-4b07-a847-9150b9dd50dc`: Mandate creation from enquiry.
3. **Repository Seed Files:**
   - `backend/database/seed.sql` defines the original baseline seed data (Director `usr-director-001`, Recruiter `usr-recruiter-001`, BD Lead `usr-bdlead-001`, TL `usr-tl-001`).

---

### 6. Preservation of Historical Records

- **Did any deletion occur?**  
  **No.** Zero rows were deleted from `USERS`, `JOB`, `LEADS`, `EMPLOYER_ENQUIRY`, `USER_ASSIGNMENTS`, `APPLICATIONS`, or `CANDIDATES`.
- **Was historical data overwritten?**  
  The direct foreign key columns `JOB.assigned_recruiter_id`, `EMPLOYER_ENQUIRY.assigned_to_user_id`, and `LEADS.assigned_bd_user_id` were updated to active staff IDs, but the relational audit history in `USER_ASSIGNMENTS` and `RECRUITMENT_ACTIVITY` was untouched. As a result, exact historical attribution is fully reconstructible.

---

### 7. Accessibility Verification of Director and User Accounts

Live read-only verification was executed for both critical administrative accounts:

#### A. Director Account (`usr-director-001`)
- **Email:** `director@vakancy.com`
- **Name:** Tosif Abbasi
- **Role:** `director`
- **Main Admin Flag:** `is_main_admin = 1`
- **Active Status:** `is_active = 1`
- **Credential Validation:** Password hash verified matching `password123` via `bcrypt.compare`.
- **Status:** **Fully Accessible & Operable.**

#### B. User-Created Staff Account (`9534e0e2-ffae-442c-a43b-3072bff7654e`)
- **Email:** `chauhandevang370@gmail.com`
- **Name:** Devang
- **Role:** `bd`
- **Main Admin Flag:** `is_main_admin = 0`
- **Active Status:** `is_active = 1`
- **Reporting Line:** Reports to `usr-director-001`
- **Status:** **Fully Accessible & Operable.**

---

### 8. Identification of Unintended Reassignment or Loss of Ownership

1. **Lead `bc727c08-...` (Nexus Cloud Technologies):**
   - Originally assigned to `usr-bdlead-001` (Devang / `bdlead@vakancy.com`).
   - Reassigned to `9534e0e2-...` (Devang / `chauhandevang370@gmail.com`).
   - **Assessment:** Ownership remained with Devang, but was shifted from the test seed account to the personal email account.
2. **Four Test Jobs (`ab59040f-...`, `7adc0723-...`, `578492cc-...`, `2e33934a-...`):**
   - These were created during Phase E.1 automated test executions of the "Convert Enquiry to Job" workflow.
   - Reassigned to `usr-recruiter-001` (`recruiter@vakancy.com`).
   - **Assessment:** These were test records generated by automated test iterations, not client/production mandates.
3. **Enquiry `bad3b59d-...` (Apex Aerospace):**
   - Created in test script on Oct 22. Assigned to `usr-recruiter-001`.
   - **Assessment:** Test enquiry; now points to canonical active recruiter.

---

### 9. Recommended Corrective Actions (For User Decision)

Per instructions, **no corrective actions have been applied**. The user may choose from the following options:

#### Option A: Keep Current State (Recommended)
- **Action:** No database changes.
- **Result:** Keeps the 3 canonical accounts active (`director@vakancy.com`, `recruiter@vakancy.com`, `chauhandevang370@gmail.com`). Deactivated test accounts remain inactive in `USERS` table with history preserved.

#### Option B: Full Reversion of Accounts & Assignments
- **Action:**
  1. Reactivate the 4 accounts:
     ```sql
     UPDATE USERS SET is_active = 1 WHERE id IN (
       '6dee5276-e4ac-44d5-be30-b35ae633326d',
       '1e6406f5-1615-40b6-a785-faf440cfb6b2',
       'usr-bdlead-001',
       'usr-tl-001'
     );
     ```
  2. Restore original `assigned_bd_user_id` on Lead `bc727c08-...`:
     ```sql
     UPDATE LEADS SET assigned_bd_user_id = 'usr-bdlead-001' WHERE id = 'bc727c08-e2a1-4fd9-b409-264f66d35e40';
     ```
  3. Restore original `assigned_recruiter_id` on the 4 test jobs back to `6dee5276-...`:
     ```sql
     UPDATE JOB SET assigned_recruiter_id = '6dee5276-e4ac-44d5-be30-b35ae633326d' WHERE id IN (
       'ab59040f-9f58-4d19-8d56-18af6921210a',
       '7adc0723-3dd3-4f9f-bbda-286543e575fc',
       '578492cc-a244-45a7-929f-c862a0b3630f',
       '2e33934a-98a5-4a3e-90fc-1e09e1a06485'
     );
     ```
  4. Restore enquiry `bad3b59d-...` assignment to `6dee5276-...`:
     ```sql
     UPDATE EMPLOYER_ENQUIRY SET assigned_to_user_id = '6dee5276-e4ac-44d5-be30-b35ae633326d' WHERE id = 'bad3b59d-cfd7-492c-8c38-0fdd54659b0c';
     ```

#### Option C: Partial Reversion (Reactivate Accounts Only)
- **Action:** Reactivate `kavita.recruiter.*`, `bdlead@vakancy.com`, and `tl@vakancy.com` (`is_active = 1`) without modifying current assignments.

---

### Audit Sign-off
- [x] Read-only integrity audit executed.
- [x] Exact database confirmed: `vakancy_main_db` on `LAPTOP-ODBR91RU:3306`.
- [x] All 9 internal staff accounts itemized with IDs, roles, status, and creation dates.
- [x] All 4 deactivated accounts identified.
- [x] Every modified job (4), lead (1), and enquiry (1) itemized.
- [x] Verified `USER_ASSIGNMENTS` and `RECRUITMENT_ACTIVITY` preserved.
- [x] Director and user-created account access verified.
- [x] Zero mutations executed during audit.
- [x] Awaiting explicit user instruction before any corrective action.
