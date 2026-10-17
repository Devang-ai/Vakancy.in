# Implementation Plan: Employer Workspace Improvements

## 1. Fix Excessive Top Spacing
**Action:** Remove or adjust the `pt-16` / `pt-24` padding on the main `<main>` container in `EmployerDashboardPage.jsx` and any other pages where it might be causing excessive gap below the newly sticky `<header>`.
**Files:** `frontend/src/pages/employer/EmployerDashboardPage.jsx` (and check others if needed).

## 2. Employer Header Account Display
**Action:** Update `EmployerHeader.jsx` to dynamically display the actual company identity:
- Use `profile?.company_name || user?.name || 'Employer Account'` for the name.
- Check for `profile?.company_logo` or `profile?.logo_url` to render an `<img>` tag instead of the initial if available.
- Fallback to the first letter of the company name if no logo exists.

## 3. Account Dropdown & Help Section
**Action:** Clean up the dropdown in `EmployerHeader.jsx`:
- Remove extra irrelevant links.
- Structure it as: `Company Profile`, `Change Password`, `Help & Support`, `Logout`.
- The `Help & Support` will be a `mailto:help@vakancy.in` link.

## 4. Change Password Flow
**Action:** 
- Frontend: Create a simple `/recruiter/settings/security` or `/recruiter/change-password` page with a form (Current Password, New Password, Confirm New Password).
- Backend: Implement a securely validated route `POST /api/auth/change-password` in `authRoutes.js` and `authController.js` to handle authenticated password changes using bcrypt.

## 5. Forgot Password Flow
**Action:** 
- Frontend: Ensure there is a `/forgot-password` and `/reset-password` flow in the public routes (outside of the authenticated workspace).
- Backend: Verify or implement `POST /api/auth/forgot-password` and `POST /api/auth/reset-password`. It should generate a token (with expiration), simulate sending an email (log or return OTP in dev), and securely reset the password without requiring the old one.

## 6. Footer / Legal Links
**Action:** Ensure the employer workspace footer (where present, e.g., Dashboard or Jobs list bottom) is clean and only contains Privacy Policy, Terms & Conditions, and Help & Support links.

## 7. Validation
- Run `npm run build` after changes.
- Ensure the header visually matches the requested screenshot exactly.
- Test the backend authentication APIs securely.
