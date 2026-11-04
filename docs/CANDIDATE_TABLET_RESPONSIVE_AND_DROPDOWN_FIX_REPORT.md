# Vakancy.in — Candidate Portal Responsive Layout, Guest UI Parity & Modern Dropdown Fix Report

**Generated:** 2026-11-03  
**Status:** ✅ Fully Implemented, Verified & Passing (49/49 Assertions Passed)

---

## Executive Summary

This report documents the resolution of layout inconsistencies, tablet/iPad Pro 13-inch responsive issues, outdated native browser `<select>` dropdowns, and guest-candidate job search UI parity across Vakancy.in.

All 49 automated Puppeteer assertions passed with **zero horizontal overflow**, **zero compilation errors**, **strict preservation of candidate authentication & routes (`/candidate/jobs/:id`)**, and **zero alterations to the production database schema**.

---

## Key Root Causes & Architected Solutions

| Issue Identified | Root Cause | Implemented Solution |
| :--- | :--- | :--- |
| **iPad Pro 13" Portrait (1032px) Crushing Content** | Candidate shell pinned sidebar at `lg:` (1024px), taking 256px and leaving 776px. Inside, 4-column filter grid left only 518px for job cards. | Raised sidebar pinning breakpoint from `lg:` (1024px) to `xl:` (1280px) across `CandidatePortalShell.jsx`, `CandidateSidebar.jsx`, and `CandidateHeader.jsx`. Viewports < 1280px now use drawer navigation, giving pages full width (1032px). |
| **Login / Register Awkward Portrait Display** | Auth pages used `lg:grid-cols-2`. At 1032px portrait, the card split with marketing imagery created narrow columns with massive dead space. | Updated to `xl:grid-cols-2` with `max-w-xl mx-auto`. On viewports < 1280px (including iPad Pro 13" portrait), the card is centered and proportioned. On ≥ 1280px, it cleanly displays the 2-column layout. |
| **Outdated Native `<select>` Dropdowns** | Browser native selects in Profile (`CandidateProfilePage.jsx`), Applications (`CandidateApplicationsPage.jsx`), and Find Jobs (`CandidateFindJobsPage.jsx`). | Enhanced `frontend/src/components/common/CustomDropdown.jsx` with instant client search (`searchable={true}`). Replaced all native selects with modern, accessible custom dropdowns. |
| **Language Selector in Profile** | Outdated native select with no search capability for the 32 real database languages from `/api/master/languages`. | Replaced with `CustomDropdown` featuring `searchable={true}`, instant typeahead search, keyboard accessibility, and clean brand styling (`#00288E`). |
| **Candidate Find Jobs UI Disparity** | Candidate Find Jobs lacked the approved Guest Portal filter design, using outdated checkbox lists and breaking container bounds with negative margins (`-m-4 sm:-m-6 lg:-m-8`). | Restructured `CandidateFindJobsPage.jsx` to adopt the approved Guest Jobs layout (`CustomDropdown` for Location, Experience, Category, plus segmented pill toggles for Job Type & Work Mode), while strictly preserving `/candidate/jobs/:id` detail navigation and bookmarking. |

---

## Detailed Implementation Breakdown

### 1. `frontend/src/components/common/CustomDropdown.jsx`
- Added `searchable` prop (`default: false`) and `searchPlaceholder`.
- When enabled, renders a search input with magnifying glass icon and autoFocus inside the popover.
- Dynamically filters options matching `searchTerm` in real-time.
- Supports full keyboard navigation: `Escape` closes and clears search, `Enter` opens and selects, and outside-clicks dismiss the dropdown.
- Fully styled with Vakancy design tokens (`#00288E` primary, `#F8F9FF` background, rounded-xl borders, subtle shadows).

### 2. Candidate Portal Navigation & Shell (`CandidatePortalShell.jsx`, `CandidateSidebar.jsx`, `CandidateHeader.jsx`)
- Shifted sidebar pinning breakpoint from `lg:` to `xl:`.
- At `1032px` (iPad Pro 13" Portrait) and tablets (`768px`, `820px`), the sidebar is housed in a smooth sliding drawer accessible via the header menu button.
- Main content gains 100% of the display width, eliminating cramped cards and text clipping.
- At `1376px` (iPad Pro 13" Landscape) and desktops (`1440px+`), the sidebar pins at `w-64` with clean content margins (`xl:ml-64`).

### 3. Authentication Layout (`LoginPage.jsx`, `RegisterPage.jsx`)
- Set grid to `xl:grid-cols-2` and card wrapper to `max-w-xl mx-auto xl:mx-0`.
- Centered, comfortable sign-in and registration experience on iPad Pro 13" portrait without awkward split-screen dead space.
- Desktop and iPad Pro landscape maintain the side-by-side editorial layout.

### 4. Candidate Find Jobs (`CandidateFindJobsPage.jsx`)
- Removed disruptive negative margins (`-m-4 sm:-m-6 lg:-m-8`).
- Converted Location, Experience, and Job Category filters to `CustomDropdown`s.
- Converted Job Type and Work Mode filters to segmented pill checkboxes.
- Implemented responsive sidebar filter: hidden on `< 1280px` (opened via `Filters` button into `Drawer.jsx`), and pinned on `xl:col-span-3` (≥ 1280px).
- In the search bar matrix, replaced native experience select with `CustomDropdown`.
- **Strict Route Safety:** Verified that all job detail links target `/candidate/jobs/:id` (preserving logged-in candidate session and actions).

### 5. Candidate Applications (`CandidateApplicationsPage.jsx`)
- Replaced 3 native `<select>` tags (Company, Work Mode, Sort) with `CustomDropdown`.
- Removed clumsy manual SVG overlays.
- Ensured consistent interactive dropdown popovers across viewports.

### 6. Candidate Profile (`CandidateProfilePage.jsx`)
- Replaced Profile Category native select with `CustomDropdown`.
- Replaced Language selector native select with `CustomDropdown` (`searchable={true}`).
- Preserved all 32 real database languages from `GET /api/master/languages`.

---

## Verification Test Results

Automated browser verification executed with Puppeteer (`backend/tests/verify_candidate_ipad_pro_and_dropdowns.js`):

| Test Suite | Assertions | Result | Details |
| :--- | :---: | :---: | :--- |
| **Suite 1: Viewport & Overflow Audit** | 32 | ✅ PASS | Zero horizontal overflow across iPad Pro 13" Portrait (1032x1376), Landscape (1376x1032), Mobile (390x844), and Desktop (1440x900) for 8 core routes. |
| **Suite 2: Searchable Language Selector** | 5 | ✅ PASS | Languages accordion opened, dropdown rendered, typeahead "Guj" filtered to "Gujarati", option selected cleanly. |
| **Suite 3: Applications Modern Dropdowns** | 4 | ✅ PASS | Company, Work Mode, and Sort dropdowns present, Work Mode dropdown opened and selected "Remote". |
| **Suite 4: Find Jobs Parity & Responsiveness** | 7 | ✅ PASS | Portrait: sidebar hidden, drawer button opens filter drawer, results pane > 900px. Landscape: 2-col layout pinned. Candidate detail links strictly `/candidate/jobs/:id`. |
| **Suite 5: Login & Register Proportions** | 1 | ✅ PASS | Login card centered with balanced proportions on iPad Pro 13" Portrait (`width > 440px`, centered within 30px tolerance). |
| **Total** | **49** | **✅ 49/49 PASS** | **100% Success Rate, 0 Failures** |

---

## Visual Verification Artifacts

Screenshots captured and stored in `docs/screenshots/ipad_pro_13_verified/`:
- `ipad_pro_13_portrait_login_centered.png`: Centered login card on iPad Pro 13" portrait.
- `ipad_pro_13_portrait_find_jobs.png`: Clean, full-width job listings on iPad Pro 13" portrait.
- `ipad_pro_13_portrait_find_jobs_drawer_open.png`: Filter drawer opened smoothly on iPad Pro 13" portrait.
- `ipad_pro_13_landscape_find_jobs.png`: Pinned 2-column layout on iPad Pro 13" landscape.
- `language_dropdown_search_active.png`: Searchable language dropdown filtering "Gujarati".
- `applications_workmode_dropdown_open.png`: Modern custom dropdown popover on Applications page.

