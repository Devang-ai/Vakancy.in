# Vakancy.in — Recruitment Team Hierarchy & Executive Candidate Shortlisting Report

## 1. Executive Summary

This report documents the resolution of the **Admin Share Button Crash** and the design and implementation of the **Recruitment Team Hierarchy** and **Explicit Candidate Shortlisting** systems for the Vakancy.in platform.

All changes were implemented following strict non-destructive database principles, backward-compatibility guidelines, robust server-side RBAC scoping, and verified through comprehensive end-to-end acceptance test suites.

---

## 2. Task 1 — Admin Share Button Crash Fix & Architecture

### 2.1 Root Cause
In `admin-frontend/src/components/jobs/AdminJobDetailsModal.jsx`, a Refresh button was introduced in the **Candidate Shortlist & Sharing** tab at line 941:
```jsx
<button
  type="button"
  onClick={() => fetchExecutiveShortlistData(jobId)}
  className="..."
  title="Refresh candidate shortlist"
>
  <RefreshCw className="w-3 h-3" />
</button>
```
However, `RefreshCw` was not included in the `lucide-react` import statement at the top of `AdminJobDetailsModal.jsx`. When an administrator clicked the Share / Shortlist tab or the Share action button in `AdminJobs.jsx`, the React runtime encountered:
```
Uncaught ReferenceError: RefreshCw is not defined
    at AdminJobDetailsModal.jsx:941
```
This unhandled ReferenceError halted component rendering, freezing the modal dialog and requiring a manual page refresh.

### 2.2 Fix Applied
1. Added `RefreshCw` to the `lucide-react` import list in `AdminJobDetailsModal.jsx`.
2. Verified with `npm run build` in `admin-frontend`, which completed with exit code `0` and bundled `refresh-cw-BdjjnoxX.js`.

---

## 3. Explicit Candidate Shortlisting System

### 3.1 Architecture & Problem Solved
Previously, generating a shortlist for an Executive Search mandate could inadvertently expose candidate profiles simply because they applied to the job or appeared in general search. Under the new architecture:
- **No Automatic Inclusion:** Merely applying to an executive mandate does **not** put a candidate into the client-facing shortlist.
- **Explicit Recruiter/Admin Action:** Candidates must be explicitly shortlisted by an authorized user (`director`, `main_admin`, `admin`, or assigned `recruiter`).
- **Talent Pool Sourcing:** Recruiters and Administrators can search the broader Vakancy candidate pool directly within the job modal and explicitly source talent for the mandate.
- **Dedicated Mandate Shortlist Table:**
  ```sql
  CREATE TABLE IF NOT EXISTS EXECUTIVE_SEARCH_MANDATE_CANDIDATE (
    id VARCHAR(36) PRIMARY KEY,
    job_id VARCHAR(36) NOT NULL,
    candidate_id VARCHAR(36) NOT NULL,
    application_id VARCHAR(36) DEFAULT NULL,
    shortlisted_by VARCHAR(36) NOT NULL,
    source ENUM('APPLICANT', 'MANUAL_SOURCING', 'HEADHUNTED') DEFAULT 'APPLICANT',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_job_candidate (job_id, candidate_id)
  );
  ```
- **Guarded Link Generation:** The client sharing link generation form is completely separate from the shortlist table. Generating a link is disabled if 0 candidates are selected.

### 3.2 Endpoints Implemented in Backend
- `GET /api/admin/jobs/:id/executive-candidates` — Returns explicitly shortlisted candidates for the job requisition.
- `POST /api/admin/jobs/:id/shortlist` — Explicitly shortlists a candidate (from applicant ATS or manual sourcing).
- `DELETE /api/admin/jobs/:id/shortlist/:candidateId` — Removes a candidate from the mandate shortlist.
- `GET /api/admin/jobs/:id/candidate-pool` — Searches candidate pool by name, skills, title, or location for talent sourcing.

---

## 4. Recruitment Team Hierarchy Implementation

### 4.1 Hierarchy Model
A three-tiered organizational structure was established:

$$\text{DIRECTOR} \longrightarrow \text{TEAM\_MANAGER} \ (\text{or } \texttt{tl\_coordinator}) \longrightarrow \text{RECRUITER}$$

```
                ┌──────────────────────────────────┐
                │             DIRECTOR             │
                │ (Full Org Visibility & Creation) │
                └─────────────────┬────────────────┘
                                  │
         ┌────────────────────────┴────────────────────────┐
         │                                                 │
         ▼                                                 ▼
┌──────────────────────────────┐          ┌──────────────────────────────┐
│        TEAM MANAGER 1        │          │        TEAM MANAGER 2        │
│        (Team Alpha)          │          │         (Team Beta)          │
└──────────────┬───────────────┘          └──────────────┬───────────────┘
               │                                         │
        ┌──────┴──────┐                           ┌──────┴──────┐
        ▼             ▼                           ▼             ▼
   RECRUITER 1   RECRUITER 2                 RECRUITER 3   RECRUITER 4
```

### 4.2 Non-Destructive Database Schema (`0011_recruitment_team_hierarchy.sql`)
1. **Added hierarchy columns to `USER` table:**
   - `manager_id VARCHAR(36)`: Self-referencing FK to `USER.id` (`ON DELETE SET NULL`)
   - `team_id VARCHAR(36)`: Foreign key linking user to their assigned recruitment team
2. **Added mandate routing column to `JOB` table:**
   - `assigned_team_id VARCHAR(36)`: Allows Directors to allocate mandates directly to teams for internal delegation
3. **Created `TEAM_ASSIGNMENT_HISTORY` table:**
   - Comprehensive audit logging for all recruiter movements, reassignments, and manager changes.
4. **Seed Role Permissions:**
   - Added `team_manager` and updated `tl_coordinator` permissions in `ROLES` and `ROLE_PERMISSIONS` with appropriate resource-level actions (`team/view`, `team/manage`, `jobs/scoped_view`, `candidates/scoped_view`).

### 4.3 Backend RBAC & Data Isolation Enforcement
- **Hierarchy-Aware `requireScopedJob`:**
  - `director` / `admin`: Full visibility across all mandates.
  - `team_manager` / `tl_coordinator`: Access granted if the job is assigned to their `team_id`, OR if `assigned_recruiter_id` is a member reporting to them.
  - `recruiter`: Access strictly restricted to jobs where `assigned_recruiter_id = req.user.id`.
- **Circular Hierarchy Prevention:**
  - Prevents assigning a manager to report to one of their subordinate recruiters or to themselves.
- **Immediate Scope Invalidation on Reassignment:**
  - When a Director reassigns a recruiter from Manager A to Manager B, Manager A immediately loses visibility and assignment rights to that recruiter.
- **Team Manager Authority Guard:**
  - Team Managers cannot escalate privileges or create users with roles above `recruiter` (enforced with HTTP 403).

### 4.4 Frontend: Admin Team Management UI (`AdminTeamMembers.jsx`)
Enhanced `admin-frontend/src/pages/AdminTeamMembers.jsx` with:
- **Hierarchical Tree View:** Visual breakdown of Directors, Team Managers, Teams, and reporting Recruiters.
- **Team Performance & Overview Metrics:** Cards displaying Total Members, Active Teams, Managers, Recruiters, and Mandates.
- **Direct Reassignment Modal:** Seamless interface for Directors to reassign recruiters between managers with instant feedback.
- **Team Scoped Filtering:** Team Managers accessing the page automatically see only their team roster.

---

## 5. Verification & Test Results

### 5.1 Test Suite 1: Executive Search Candidate Sharing (`verify_executive_search_candidate_sharing.js`)
All 12 acceptance test stages executed against MySQL:
1. Admin Director authentication: **PASSED**
2. Locating Executive Search Job: **PASSED**
3. Explicit candidate shortlisting: **PASSED**
4. Creating candidate shortlist share token: **PASSED**
5. Database SHA-256 hash storage verification: **PASSED**
6. Public shortlist access & PII contact masking: **PASSED**
7. Single candidate resume access: **PASSED**
8. Bulk resumes PKZIP download with signature validation: **PASSED**
9. Audit trail & access log verification: **PASSED**
10. Shortlist revocation & 410 Gone enforcement: **PASSED**
11. Unknown / forged token rejection (404): **PASSED**
12. Isolation of regular employer jobs: **PASSED**

### 5.2 Test Suite 2: Recruitment Team Hierarchy (`verify_team_hierarchy.js`)
All 10 hierarchical test stages executed:
1. Director authentication: **PASSED**
2. Director creates Team Managers: **PASSED**
3. Director creates Teams: **PASSED**
4. Director assigns Recruiters to Managers: **PASSED**
5. Team Manager isolation & role creation guard (403): **PASSED**
6. Mandate allocation & external team assignment block: **PASSED**
7. Recruiter job scoping & 403 access denial for unassigned recruiters: **PASSED**
8. Recruiter reassignment, audit trail & immediate scope revocation: **PASSED**
9. Circular reporting validation & rejection (400): **PASSED**
10. Team performance metrics calculation: **PASSED**

### 5.3 Frontend Build Verification
`npm run build` in `admin-frontend`:
```
✓ 1587 modules transformed.
✓ built in 4.69s (Exit code: 0)
```
Zero errors, all chunks generated cleanly.
