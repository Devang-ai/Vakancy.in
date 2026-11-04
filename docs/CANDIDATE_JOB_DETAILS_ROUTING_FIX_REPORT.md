# Vakancy.in — Critical Candidate Portal Routing & Authenticated Job Details Fix Report

**Date:** October 30, 2026  
**Environment:** Local Development (`frontend` port 5173, `backend` port 5002, MySQL `vakancy_main_db`)  
**Scope:** Fix routing, layout context, session persistence, and job details presentation for logged-in Candidates while preserving public Guest and Employer portal functionality.

---

## 1. Reproduced Bug

### Step-by-Step Reproduction
1. Log in as an authenticated candidate (`role: "candidate"`).
2. Navigate: **Candidate Dashboard (`/candidate/dashboard`)** → **Find Jobs (`/candidate/jobs`)**.
3. Click on any job card (either the job title or the "View Job" CTA).
4. **Failure Observed:**
   - The application navigated to the public guest route `/jobs/:id` instead of `/candidate/jobs/:id`.
   - The page rendered with `GuestLayout`, displaying the public navigation header ("For Employers", "Sign In", public footer).
   - The authenticated Candidate layout (`CandidatePortalShell`), including the Candidate sidebar, candidate header, notification counters, and breadcrumbs disappeared.
   - Clicking browser Back returned to `/candidate/jobs`, where the candidate user was still authenticated in `AuthContext` and `localStorage`, proving this was a routing/layout-context bug rather than a session failure.

---

## 2. Exact Root Cause

Detailed investigation revealed four interrelated root causes:

1. **Hardcoded Public Paths in `JobCard.jsx`:**
   The shared `<JobCard />` component used in `CandidateFindJobsPage.jsx` had hardcoded `<Link to={`/jobs/${id}`}>` in four places (search variant title, search variant CTA, default compact title, default compact CTA). When rendered inside `/candidate/jobs`, it always emitted links to `/jobs/:id` instead of respecting the Candidate Portal namespace.

2. **Absence of Role-Aware Context Handshake in Guest Details:**
   When an authenticated candidate opened a public URL (`/jobs/:id`) directly or via an external link, `JobDetailsPage.jsx` did not inspect the candidate authentication state to seamlessly hand off to `/candidate/jobs/:id`.

3. **Inversion & Crash in `CandidateJobDetailsPage.jsx`:**
   In `CandidateJobDetailsPage.jsx`, lines 118–136 had `if (loading)` incorrectly rendering the static "Requisition Not Found" UI. Furthermore, there was no separate `if (!job)` condition, causing an immediate runtime null-dereference crash when attempting to access `job.company` if the requisition was missing.

4. **Missing Route Alias in `App.jsx`:**
   Singular `/candidate/job/:id` routes were unhandled and defaulted to `/candidate/dashboard`, risking broken links if internal or external references used singular `job`.

---

## 3. Routes & Components Affected

| Component | Route / Path | Role / Layout | Impact Prior to Fix | Status After Fix |
| :--- | :--- | :--- | :--- | :--- |
| `JobCard.jsx` | Shared component | Context-dependent | Hardcoded `to="/jobs/:id"`, breaking Candidate portal | Dynamically computes `/candidate/jobs/:id` in candidate context |
| `CandidateFindJobsPage.jsx` | `/candidate/jobs` | Candidate (`CandidatePortalShell`) | Rendered job cards that navigated out of portal | Passes explicit `detailUrl` and uses context-aware cards |
| `CandidateJobDetailsPage.jsx` | `/candidate/jobs/:id` | Candidate (`CandidatePortalShell`) | Erroneous loading screen, missing Back action & similar jobs | Full parity: spinner, error guard, "Back to Jobs", Similar Jobs |
| `App.jsx` | `/candidate/jobs/:id` & `/candidate/job/:id` | Candidate (`ProtectedRoute`) | Missing singular `/candidate/job/:id` alias | Added `/candidate/job/:id` alias route |
| `JobDetailsPage.jsx` | `/jobs/:id` | Guest (`GuestLayout`) | Kept authenticated candidates in Guest layout | Automatically redirects logged-in candidates to `/candidate/jobs/:id` |

---

## 4. Files Changed

1. **`frontend/src/components/common/JobCard.jsx`:**
   - Imported `useLocation` from `react-router-dom` and `useAuth` from `../../context/AuthContext`.
   - Added `detailUrl` prop with dynamic resolution:
     ```javascript
     const getJobDetailUrl = () => {
       if (detailUrl) {
         return typeof detailUrl === 'function' ? detailUrl(id, job) : `${detailUrl}/${id}`;
       }
       const isCandidateContext =
         routerLocation.pathname.startsWith('/candidate') ||
         (user && user.role === 'candidate' && !routerLocation.pathname.startsWith('/recruiter') && !routerLocation.pathname.startsWith('/employer'));

       return isCandidateContext ? `/candidate/jobs/${id}` : `/jobs/${id}`;
     };
     ```
   - Updated all 4 `<Link to="...">` instances to use `to={jobLink}`.

2. **`frontend/src/pages/candidate/CandidateFindJobsPage.jsx`:**
   - Added explicit `detailUrl={(jobId) => `/candidate/jobs/${jobId}`}` on `<JobCard />` instances for defense-in-depth.

3. **`frontend/src/pages/candidate/CandidateJobDetailsPage.jsx`:**
   - Fixed `if (loading)` to render an animated loading spinner and message.
   - Added separate `if (!job)` guard rendering the "Requisition Not Found" card with a "Browse Open Jobs" link.
   - Added a clear "Back to Jobs" action button alongside breadcrumbs.
   - Added "Similar Opportunities" recommendation cards in the right sidebar.
   - Added experience, vacancy, and salary fallbacks to the requisition metadata band.

4. **`frontend/src/pages/guest/JobDetailsPage.jsx`:**
   - Added an automatic redirect for authenticated candidates visiting public job URLs:
     ```javascript
     useEffect(() => {
       if (!authLoading && user && user.role === 'candidate') {
         navigate(`/candidate/jobs/${id}${window.location.search}${window.location.hash}`, { replace: true });
       }
     }, [user, authLoading, id, navigate]);
     ```

5. **`frontend/src/App.jsx`:**
   - Added `<Route path="/candidate/job/:id" element={<ProtectedRoute requiredRole="candidate"><CandidateJobDetailsPage /></ProtectedRoute>} />` alias.

---

## 5. Candidate vs Guest Navigation Behavior Matrix

| User Context | Starting Point | Action | Destination URL | Layout & Chrome Rendered |
| :--- | :--- | :--- | :--- | :--- |
| **Logged-in Candidate** | `/candidate/jobs` | Clicks Job Title or "View Job" | `/candidate/jobs/:id` | `CandidatePortalShell` (Sidebar, Header, Breadcrumbs intact) |
| **Logged-in Candidate** | Direct Link / Shared URL | Opens `/jobs/:id` | `/candidate/jobs/:id` (auto-redirect) | `CandidatePortalShell` (Seamless transition into portal) |
| **Logged-in Candidate** | `/candidate/jobs/:id` | Clicks "Back to Jobs" | `/candidate/jobs` | `CandidatePortalShell` |
| **Logged-in Candidate** | `/candidate/jobs/:id` | Clicks a "Similar Opportunity" | `/candidate/jobs/:otherId` | `CandidatePortalShell` |
| **Logged-in Candidate** | `/candidate/jobs/:id` | Clicks "Apply Now" | `/candidate/jobs/:id/apply` | Candidate Application Wizard |
| **Guest User** | `/jobs` | Clicks Job Title or "View Job" | `/jobs/:id` | `GuestLayout` (Public navbar, public footer) |
| **Guest User** | Direct Link / Shared URL | Opens `/jobs/:id` | `/jobs/:id` | `GuestLayout` (Public data accessible, no candidate leak) |
| **Guest User** | `/jobs/:id` | Clicks "Apply" | Opens Auth Modal | Modal prompts Login / Register with redirect URL |
| **Employer User** | `/recruiter/jobs` | Views Jobs | `/recruiter/jobs` | `EmployerLayout` (Never routed to Candidate portal) |

---

## 6. Screenshots Captured

The automated test suite captured full-resolution screenshots stored in `docs/screenshots/`:

| File | Viewport | Description |
| :--- | :--- | :--- |
| `reproduced_bug_guest_job_details.png` | 1440px | Demonstrates original bug: candidate routed to `/jobs/:id` with missing sidebar |
| `01_candidate_job_details_desktop.png` | 1440px | Fixed Candidate Job Details rendered inside `CandidatePortalShell` |
| `02_guest_job_details_desktop.png` | 1440px | Public Guest Job Details rendered inside `GuestLayout` for guests |
| `03_candidate_job_details_mobile_390px.png` | 390px | Responsive Candidate Job Details at 390px (no horizontal overflow) |
| `04_candidate_mobile_drawer_open.png` | 390px | Mobile navigation drawer open on 390px viewport |

---

## 7. Browser Back / Forward Verification

Browser history was explicitly tested via Puppeteer automation:
1. Candidate navigated: `/candidate/jobs` → `/candidate/jobs/:id`.
2. Execution of `page.goBack()` returned strictly to `/candidate/jobs`.
3. Candidate remained logged in, sidebar was visible, and previous search state was preserved.
4. Execution of `page.goForward()` returned to `/candidate/jobs/:id`.
5. Candidate session and requisition details were completely retained.

---

## 8. Authentication & Session Persistence Verification

- **Direct URL Access:** Visiting `/candidate/jobs/:id` directly restored `user` and `token` from `localStorage`, verified through `/auth/me`, and displayed the requisition details without triggering logout.
- **Page Refresh:** Refreshing `/candidate/jobs/:id` displayed the new non-blocking loading spinner, preserved the JWT token, and successfully re-rendered the candidate portal without error.
- **Unauthenticated Protection:** Visiting `/candidate/jobs` or `/candidate/jobs/:id` without a valid token redirected immediately to `/login?returnUrl=...`.
- **Role Isolation:** Employer accounts accessing `/jobs/:id` remain on the public view and cannot accidentally access candidate-only workflows.

---

## 9. Comprehensive Acceptance Test Results

An automated end-to-end verification suite was created in `backend/tests/verify_candidate_job_routing_comprehensive.js`.

```
========================================================================
   VAKANCY.IN CANDIDATE JOB DETAILS ROUTING ACCEPTANCE TEST SUITE      
========================================================================

[Case 11] ✅ PASS - Unauthenticated access to protected Candidate routes redirected to login
[Case 1]  ✅ PASS - Candidate login -> Find Jobs -> Select Job navigates to /candidate/jobs/:id
[Case 2]  ✅ PASS - Candidate layout remains visible (Candidate Sidebar present, Guest Navbar absent)
[Case 3]  ✅ PASS - Correct selected job data appears (Title, JD, Apply button, Breadcrumb)
[Case 4]  ✅ PASS - Candidate can return to Find Jobs via Back to Jobs action
[Case 5]  ✅ PASS - Browser Back returns to /candidate/jobs and Forward returns to Candidate Job Details
[Case 6]  ✅ PASS - Candidate Dashboard job links point to /candidate/jobs/:id
[Case 7]  ✅ PASS - Saved Jobs links point strictly to /candidate/jobs/:id
[Case 8]  ✅ PASS - Recommended Jobs navigation targets /candidate/jobs/:id
[Case 9]  ✅ PASS - Related Jobs remain in authenticated Candidate Portal layout
[Case 10] ✅ PASS - Direct Candidate Job Details URL persists session and loads properly on refresh
[Case 12] ✅ PASS - Guest Job Details (/jobs/:id) uses public layout with guest navigation and zero candidate leaks
[Case 13] ✅ PASS - Employer portal maintains distinct layout and does not route to Candidate screens
[Case 14] ✅ PASS - Mobile responsiveness and Candidate drawer verified across 320px to 1440px with no horizontal overflow
[Case 15] ✅ PASS - Zero critical browser console errors during candidate job navigation flows

========================================================================
                          TEST SUITE SUMMARY                            
========================================================================
Passed: 15/15 acceptance criteria
🎉 ALL 15 ACCEPTANCE CASES PASSED!
```

### Production Build Verification
`npm run build` in `frontend` completed cleanly:
```
vite v5.4.21 building for production...
✓ 1644 modules transformed.
✓ built in 8.10s
```

---

## 10. Database Safety Confirmation

- **No Schema Changes:** The `vakancy_main_db` schema was untouched.
- **No Test Job Creation:** Testing utilized existing test accounts and live requisitions.
- **No Data Deletions:** Zero destructive SQL was executed.

---

## 11. Unresolved Issues

None. All 15 acceptance criteria pass, production build succeeds with zero errors, and all portal contexts (Candidate, Guest, Employer) function as intended.

