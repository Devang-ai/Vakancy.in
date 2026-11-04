# Vakancy.in — Phase B: BD Leads Backend & Database Implementation Report

**Document Version:** 1.0.0  
**Phase:** Phase B — BD Leads Backend & Database Foundation  
**Status:** COMPLETED & VERIFIED  
**Target Environment:** Isolated Test MySQL Database (`vakancy_test_phase5`)  
**Production / Main Database Impact:** ZERO (Production `vakancy_main_db` completely untouched)  
**Automated Tests:** 58/58 passing (11/11 Phase B suite + 47/47 baseline regression suite)  
**Frontend Builds:** Both `frontend` and `admin-frontend` compile cleanly with zero errors  

---

## 1. Executive Summary

Phase B implements the backend and database architecture for the simplified internal recruitment operations workflow:

```
┌─────────────────┐      1. Basic Info Only     ┌────────────────────────┐
│  BD Specialist  │ ──────────────────────────> │ Shared Recruiter Queue │
└─────────────────┘   (Confirmed Interest)      │  (status: UNCLAIMED)   │
                                                └───────────┬────────────┘
                                                            │
                                        2. Atomic "Take Lead"
                                           (Conditional SQL + Lock)
                                                            ▼
┌─────────────────┐      3. Requirements & Jobs ┌────────────────────────┐
│  Lead Director  │ <────────────────────────── │    Owning Recruiter    │
│  (Reassignment  │                             │  (Exclusive Ownership) │
│   & Oversight)  │                             └────────────────────────┘
└─────────────────┘
```

### Key Principles Enforced
1. **Three Core Internal Operational Roles:** `director`, `bd`, `recruiter`. Historical roles (`bd_lead`, `tl_coordinator`, `main_admin`, `audit_specialist`, `viewer`) remain fully preserved.
2. **Strict Information Boundary:** BD forms collect only basic company, contact, and confirmed hiring interest information. Detailed job requirements, salaries, and candidate workflows remain strictly confined to the recruiter workflow after claiming.
3. **Atomic Ownership:** "Take Lead" uses a conditional database UPDATE inside a transaction (`WHERE id = ? AND status = 'UNCLAIMED' AND claimed_by_recruiter_id IS NULL`). If multiple recruiters race to claim simultaneously, exactly one wins (HTTP 200) and all other contenders receive HTTP 409 Conflict (`LEAD_ALREADY_CLAIMED`).
4. **Candidate & Application Privacy Guard:** BD accounts are strictly restricted from accessing candidate profiles (`/candidates`) or application tracking (`/applications`), returning HTTP 403 Forbidden.
5. **Multiple Jobs per Company Lead:** Jobs store `lead_id` and `client_id`, allowing recruiters to spin off multiple client mandates from a single prospective company lead.
6. **Zero-Fabrication Audit History:** All actions (`CREATE_LEAD`, `TAKE_LEAD`, `UPDATE_LEAD_STATUS`, `REASSIGN_LEAD`, `CONVERT_LEAD_TO_JOB`) write differential audit logs directly to `RECRUITMENT_ACTIVITY` within the database transaction.

---

## 2. Files Changed & Added

| File Path | Nature of Change | Description |
|---|---|---|
| [005_company_leads.js](file:///c:/Users/Devang%20chauhan/OneDrive/Desktop/Vakancy/backend/database/migrations/005_company_leads.js) | **New File** | Staged database migration creating `COMPANY_LEAD` table, adding `lead_id` to `JOB`, and seeding `bd` role & permissions. |
| [index.js](file:///c:/Users/Devang%20chauhan/OneDrive/Desktop/Vakancy/backend/database/migrations/index.js) | **Modified** | Registered `005_company_leads` in migrations ledger while preserving deterministic ordering. |
| [companyNormalization.js](file:///c:/Users/Devang%20chauhan/OneDrive/Desktop/Vakancy/backend/utils/companyNormalization.js) | **New File** | Corporate entity name and web domain normalization utility for duplicate detection. |
| [leadsController.js](file:///c:/Users/Devang%20chauhan/OneDrive/Desktop/Vakancy/backend/controllers/leadsController.js) | **New File** | Production controller handling lead creation, queue filtering, atomic claiming, status progression, Director reassignment, and job conversion. |
| [adminController.js](file:///c:/Users/Devang%20chauhan/OneDrive/Desktop/Vakancy/backend/controllers/adminController.js) | **Modified** | Imported and re-exported `leadsController` handlers; aliased legacy methods to new handlers. |
| [adminRoutes.js](file:///c:/Users/Devang%20chauhan/OneDrive/Desktop/Vakancy/backend/routes/adminRoutes.js) | **Modified** | Mounted lead endpoints with RBAC middleware; added `bd` to `SYSTEM_INTERNAL_ROLES`. |
| [rbacMiddleware.js](file:///c:/Users/Devang%20chauhan/OneDrive/Desktop/Vakancy/backend/middleware/rbacMiddleware.js) | **Modified** | Implemented privacy guard rejecting BD access to candidate and application modules. |
| [.env](file:///c:/Users/Devang%20chauhan/OneDrive/Desktop/Vakancy/backend/.env) | **Modified** | Added `TEST_DB_HOST=127.0.0.1` and `TEST_DB_PORT=3306` to prevent reliance on defaults. |
| [phase_b_leads_integration.test.js](file:///c:/Users/Devang%20chauhan/OneDrive/Desktop/Vakancy/backend/tests/phase_b_leads_integration.test.js) | **New File** | 11 comprehensive automated tests covering all Phase B workflows and concurrency race conditions. |
| [phase2_database_safety.test.js](file:///c:/Users/Devang%20chauhan/OneDrive/Desktop/Vakancy/backend/tests/phase2_database_safety.test.js) | **Modified** | Updated migration ledger assertion to include `005_company_leads`. |
| [phase5_database_integration.test.js](file:///c:/Users/Devang%20chauhan/OneDrive/Desktop/Vakancy/backend/tests/phase5_database_integration.test.js) | **Modified** | Updated ledger verification to include 5 migrations and verify idempotency. |

---

## 3. Database Schema & Migration Details

### Migration: `005_company_leads`

Executed against isolated test database `vakancy_test_phase5`.

#### 1. `COMPANY_LEAD` Table Structure

```sql
CREATE TABLE IF NOT EXISTS COMPANY_LEAD (
  id VARCHAR(36) PRIMARY KEY,
  bd_user_id VARCHAR(36) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  normalized_company_name VARCHAR(255) NOT NULL,
  contact_person_name VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(50) NOT NULL,
  contact_email VARCHAR(255) NULL,
  city VARCHAR(100) NULL,
  website VARCHAR(255) NULL,
  normalized_domain VARCHAR(255) NULL,
  notes TEXT NULL,
  confirmed_hiring_interest TINYINT(1) NOT NULL DEFAULT 1,
  status ENUM(
    'UNCLAIMED',
    'CLAIMED',
    'CONTACTED',
    'REQUIREMENTS_GATHERED',
    'CONVERTED_TO_JOB',
    'DROPPED'
  ) NOT NULL DEFAULT 'UNCLAIMED',
  claimed_by_recruiter_id VARCHAR(36) NULL,
  claimed_at TIMESTAMP NULL,
  reassigned_by_director_id VARCHAR(36) NULL,
  reassigned_at TIMESTAMP NULL,
  client_id VARCHAR(36) NULL,
  drop_reason VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_cl_bd (bd_user_id),
  INDEX idx_cl_status (status),
  INDEX idx_cl_recruiter (claimed_by_recruiter_id),
  INDEX idx_cl_client (client_id),
  INDEX idx_cl_norm_name (normalized_company_name),
  INDEX idx_cl_norm_domain (normalized_domain),
  INDEX idx_cl_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### 2. `JOB` Table Enhancement (Multiple Jobs per Lead)
```sql
ALTER TABLE JOB ADD COLUMN lead_id VARCHAR(36) NULL AFTER client_id;
ALTER TABLE JOB ADD INDEX idx_job_lead_id (lead_id);
```

#### 3. Role & Permission Seeding
- Seeded `bd` role into `ROLES` with `is_system = 1`.
- Seeded `leads:create`, `leads:view`, `dashboard:view` for `bd` in `ROLE_PERMISSIONS`.
- Seeded `leads:view`, `leads:claim`, `leads:edit`, `leads:convert`, `jobs:create`, `jobs:view`, `jobs:edit`, `candidates:view`, `candidates:create`, `candidates:edit`, `applications:view`, `applications:edit`, `dashboard:view` for `recruiter` in `ROLE_PERMISSIONS`.

---

## 4. Backend Endpoints Implemented

All endpoints are mounted under `/api/admin` and require internal staff authentication.

### 1. `GET /api/admin/leads/check-duplicate`
- **Permission:** `checkPermission('leads', 'create')`
- **Query Parameters:** `name`, `website`, `email`
- **Description:** Real-time pre-check querying `COMPANY_LEAD`, `CLIENT`, and `EMPLOYERS`. Normalizes names (stripping corporate suffixes like `pvt ltd`, `technologies`, `corp`) and web domains. Returns potential duplicates and existing claimant information.

### 2. `POST /api/admin/leads`
- **Permission:** `checkPermission('leads', 'create')`
- **Request Body:**
  ```json
  {
    "company_name": "Acme Robotics Innovations Pvt Ltd",
    "contact_person_name": "Dr. Evelyn Reed",
    "contact_phone": "+91 98765 43210",
    "contact_email": "hiring@acmerobotics.com",
    "city": "Bangalore",
    "website": "https://www.acmerobotics.com",
    "notes": "Urgent requirement for senior robotics engineers",
    "confirmed_hiring_interest": true
  }
  ```
- **Description:** Validates mandatory fields and confirmed hiring interest. Computes normalized name and domain. Inserts into `COMPANY_LEAD` with `status = 'UNCLAIMED'`. Logs `CREATE_LEAD` audit event.

### 3. `GET /api/admin/leads/queue` & `GET /api/admin/leads`
- **Permission:** `checkPermission('leads', 'view')`
- **Query Parameters:** `queue` (`unclaimed`, `claimed`, `my`), `status`, `search`, `bd_user_id`, `recruiter_id`
- **Scoping Enforced:**
  - **BD:** Strictly sees only their own submitted leads (`cl.bd_user_id = req.user.id`).
  - **Recruiter:** Sees shared unclaimed queue (`queue=unclaimed`) or own claimed leads (`queue=my` / `queue=claimed`).
  - **Director:** Full global oversight across all leads, BD agents, and recruiters.
- **Includes:** BD agent details, claimed recruiter details, linked client name, and count of jobs created (`jobs_count`).

### 4. `GET /api/admin/leads/:id`
- **Permission:** `checkPermission('leads', 'view')`
- **Scoping Enforced:** Returns 403 if a BD user attempts to view another BD user's lead, or if a recruiter attempts to view a lead claimed by another recruiter (unless Director).
- **Includes:** Full lead details, linked jobs list (`SELECT * FROM JOB WHERE lead_id = ?`), and recruitment activity history (`SELECT * FROM RECRUITMENT_ACTIVITY WHERE entity_type = 'COMPANY_LEAD' AND entity_id = ?`).

### 5. `POST /api/admin/leads/:id/claim` (Atomic "Take Lead")
- **Permission:** `checkPermission('leads', 'claim')`
- **Role Enforcement:** Rejects BD users with HTTP 403 (`BD_CANNOT_CLAIM_LEADS`).
- **Atomic Concurrency:** Executes conditional update in a database transaction:
  ```sql
  UPDATE COMPANY_LEAD 
  SET claimed_by_recruiter_id = ?, claimed_at = CURRENT_TIMESTAMP, status = 'CLAIMED' 
  WHERE id = ? AND status = 'UNCLAIMED' AND claimed_by_recruiter_id IS NULL;
  ```
- **Conflict Handling:** If `affectedRows === 0`, returns HTTP 409 Conflict (`LEAD_ALREADY_CLAIMED`).
- **Audit:** If `affectedRows === 1`, writes `TAKE_LEAD` audit event inside the same transaction.

### 6. `PUT /api/admin/leads/:id/status`
- **Permission:** `checkPermission('leads', 'edit')`
- **Ownership Enforcement:** Only the owning recruiter (`claimed_by_recruiter_id === req.user.id`) or Director can update status. Other recruiters receive HTTP 403 (`NOT_LEAD_OWNER`).
- **Allowed Statuses:** `CLAIMED`, `CONTACTED`, `REQUIREMENTS_GATHERED`, `CONVERTED_TO_JOB`, `DROPPED`.
- **Validation:** If `status === 'DROPPED'`, `drop_reason` is mandatory.
- **Audit:** Writes `UPDATE_LEAD_STATUS` audit record noting `previous_value` and `new_value`.

### 7. `POST /api/admin/leads/:id/reassign`
- **Authority:** Director only (`isDirector`). Non-director calls return HTTP 403 (`DIRECTOR_AUTHORITY_REQUIRED`).
- **Request Body:** `{ "new_recruiter_id": "...", "notes": "..." }`
- **Description:** Verifies target user is an active recruiter. Updates `claimed_by_recruiter_id`, `reassigned_by_director_id`, and `reassigned_at`. Writes `REASSIGN_LEAD` audit event with previous and new recruiter IDs.

### 8. `POST /api/admin/leads/:id/convert-job`
- **Permission:** `checkPermission('jobs', 'create')`
- **Ownership Enforcement:** Owning recruiter or Director only.
- **Description:** Converts lead to a job mandate. Automatically links or provisions a `CLIENT` entity from the lead's company info. Creates a `JOB` row with `lead_id = lead.id` and `client_id = client.id`. Can be called multiple times for the same company lead to associate multiple job mandates.

---

## 5. Security & Permission Matrix

| Role | Module | Action | Backend Enforcement | Behavior |
|---|---|---|---|---|
| **BD** (`bd`) | `leads` | `create` | `checkPermission('leads', 'create')` | Allowed to submit prospective company leads |
| **BD** (`bd`) | `leads` | `view` | Scoped Query (`WHERE bd_user_id = ?`) | Views only own submitted leads and their progress |
| **BD** (`bd`) | `leads` | `claim` | Route & Controller Guard | Rejected with **HTTP 403** (`BD_CANNOT_CLAIM_LEADS`) |
| **BD** (`bd`) | `candidates` | `view` | Privacy Guard in `rbacMiddleware` | Rejected with **HTTP 403** (`PRIVACY_PROTECTION_ACCESS_DENIED`) |
| **BD** (`bd`) | `applications` | `view` | Privacy Guard in `rbacMiddleware` | Rejected with **HTTP 403** (`PRIVACY_PROTECTION_ACCESS_DENIED`) |
| **BD** (`bd`) | `jobs` | `create` | `checkPermission('jobs', 'create')` | Rejected with **HTTP 403** (`PERMISSION_DENIED`) |
| **Recruiter** (`recruiter`) | `leads` | `view` | Scoped Query | Views shared unclaimed queue and own claimed leads |
| **Recruiter** (`recruiter`) | `leads` | `claim` | `checkPermission('leads', 'claim')` + Atomic Tx | Claims ownership if lead is unclaimed; returns 409 if claimed |
| **Recruiter** (`recruiter`) | `leads` | `edit` | Controller Ownership Guard | Allowed on owned leads; rejected with **HTTP 403** (`NOT_LEAD_OWNER`) on others' leads |
| **Recruiter** (`recruiter`) | `leads` | `reassign` | Director Guard | Rejected with **HTTP 403** (`DIRECTOR_AUTHORITY_REQUIRED`) |
| **Recruiter** (`recruiter`) | `jobs` | `create` | `checkPermission('jobs', 'create')` | Converts owned lead to job mandate |
| **Director** (`director`) | *All* | *All* | Global Bypass (`isGlobal = true`) | Global lead visibility, edit authority, and reassignment control |

---

## 6. Persisted Audit Trail Verification

All lifecycle actions record structured audit rows in `RECRUITMENT_ACTIVITY` using the active database transaction:

| Action Type | Entity Type | Actor (`performed_by`) | Field Changed | Previous Value | New Value | Description Example |
|---|---|---|---|---|---|---|
| `CREATE_LEAD` | `COMPANY_LEAD` | BD User ID | `status` | `null` | `UNCLAIMED` | "Created new BD company lead: Acme Robotics Innovations Pvt Ltd (Dr. Evelyn Reed)" |
| `TAKE_LEAD` | `COMPANY_LEAD` | Recruiter User ID | `claimed_by_recruiter_id` | `null` | Recruiter User ID | "Recruiter claimed ownership of lead: Acme Robotics Innovations Pvt Ltd" |
| `UPDATE_LEAD_STATUS` | `COMPANY_LEAD` | Recruiter User ID | `status` | `CLAIMED` | `REQUIREMENTS_GATHERED` | "Updated follow-up status of Acme Robotics Innovations Pvt Ltd to 'REQUIREMENTS_GATHERED'" |
| `REASSIGN_LEAD` | `COMPANY_LEAD` | Director User ID | `claimed_by_recruiter_id` | Previous Recruiter ID | New Recruiter ID | "Director reassigned lead 'Apex Semiconductor Pvt Ltd' to Recruiter James" |
| `CONVERT_LEAD_TO_JOB` | `COMPANY_LEAD` | Recruiter User ID | `status` | `REQUIREMENTS_GATHERED` | `CONVERTED_TO_JOB` | "Created job mandate 'Senior Cloud Architect' linked to lead 'CloudScale Infrastructure Solutions'" |

---

## 7. Automated Test Suite Results

### A. Phase B Test Suite (`phase_b_leads_integration.test.js`)
All 11 tests passed cleanly:
1. `Phase B — BD submits prospective company lead and audit record is created` (PASS)
2. `Phase B — BD submission is rejected when confirmed_hiring_interest is false` (PASS)
3. `Phase B — Recruiters see unclaimed leads in shared queue` (PASS)
4. `Phase B — BD Agent only sees leads they submitted and cannot see another BD agent leads` (PASS)
5. `Phase B — BD user is forbidden from claiming leads (HTTP 403 BD_CANNOT_CLAIM_LEADS)` (PASS)
6. `Phase B — Atomic Claiming: Two simultaneous claims result in exactly 1 winner and 1 HTTP 409 Conflict` (PASS)
7. `Phase B — Recruiter cannot modify or update a lead claimed by another recruiter` (PASS)
8. `Phase B — Director can view all leads and reassign lead ownership to another recruiter` (PASS)
9. `Phase B — Duplicate company check endpoint returns matching leads and warnings` (PASS)
10. `Phase B — Lead-to-job conversion creates client and supports multiple jobs per company lead` (PASS)
11. `Phase B — BD role is strictly blocked from candidate profiles and job applications (HTTP 403)` (PASS)

### B. Complete Platform Regression Suite
Total tests run: **58 passed, 0 failed, 0 skipped** (Execution time: ~3.25 seconds).

- **Phase 1 Security Unit:** 11/11 tests passing.
- **Phase 2 Database Safety:** 5/5 tests passing.
- **Phase 2 Authorization Unit:** 6/6 tests passing.
- **Phase 3 Workflow Unit:** 5/5 tests passing.
- **Phase 4 Frontend Reliability:** 7/7 tests passing.
- **Phase 5 Database Integration:** 10/10 tests passing.
- **Phase 5 E2E Workflows:** 3/3 tests passing.
- **Phase B BD Leads Integration:** 11/11 tests passing.

---

## 8. Remaining Work & Technical Handoff for Frontend Phase C

The backend foundation is complete, verified, and ready for frontend integration. As requested by the user, **no frontend modifications were made during Phase B**.

### Technical Handoff for Phase C:
1. **Admin Layout Navigation (`admin-frontend/src/components/layout/AdminLayout.jsx`):**
   - Add `"Company Leads"` (`/leads`, Lucide icon `Building2`) to the Core Operations navigation group for `bd`, `recruiter`, and `director` roles.
   - Update `getRoleLabel()` to display `"Business Development (BD)"`, `"Recruiter"`, `"Platform Director"`.
2. **Dedicated Operations Page (`admin-frontend/src/pages/AdminLeads.jsx`):**
   - **For BD Role:**
     - Streamlined "New Lead Entry" form (basic company & contact info + mandatory confirmed interest toggle).
     - Integrated real-time duplicate pre-check calling `/api/admin/leads/check-duplicate`.
     - "My Submitted Leads" table displaying progress and assigned recruiter.
   - **For Recruiter Role:**
     - "Shared Unclaimed Queue" tab with prominent "Take Lead" button.
     - "My Claimed Leads" tab showing owned leads with status progression buttons (`CONTACTED`, `REQUIREMENTS_GATHERED`, `CONVERTED_TO_JOB`, `DROPPED`).
     - "Convert to Job" modal pre-populating company info and creating the linked client mandate.
   - **For Director Role:**
     - Global view of all leads across all agents with status badges.
     - "Reassign Recruiter" modal invoking `/api/admin/leads/:id/reassign`.
3. **Application Routing (`admin-frontend/src/App.jsx`):**
   - Register route `<Route path="/leads" element={<AdminLeads />} />`.
