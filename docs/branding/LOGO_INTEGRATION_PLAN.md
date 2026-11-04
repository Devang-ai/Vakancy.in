# Vakancy.in — Future Logo & Brand Asset Integration Plan

**Document Version:** 1.0  
**Status:** Architecture Prepared • Awaiting Final Official Artwork Assets  
**Primary Objective:** Prepare the Vakancy.in recruitment platform for seamless, zero-downtime brand identity upgrades across public portals, candidate flows, employer workspaces, admin consoles, transactional email templates, and mobile web experiences without altering existing visual stability before asset signoff.

---

## 1. Executive Summary

This architecture plan documents all active touchpoints where the Vakancy.in brand logo, icon mark, and favicon are rendered across the ecosystem. It provides technical specifications for brand designers and developers to ensure asset delivery is standardized, responsive, crisp across high-DPI (Retina) screens, and optimized for dark/light contrast.

A centralized component layer (`BrandLogo.jsx`) has been provisioned in both `frontend` and `admin-frontend` to facilitate instant drop-in replacement when the official asset package is released.

---

## 2. Identified Platform Logo Locations

The table below catalogs every current location where brand identity assets and badges appear:

| Surface / Area | File Location | Background Context | Current Representation |
| :--- | :--- | :--- | :--- |
| **Main Public Navigation** | `frontend/src/components/layout/GuestNavbar.jsx` | Light (`#ffffff` / frosted glass) | Rounded "V" badge + "Vakancy.in" Typography |
| **Public Footer** | `frontend/src/components/layout/GuestLayout.jsx` | Light (`#ffffff` / `#f8fafc`) | 7×7 rounded badge + Typography + ISO badges |
| **Employer Portal Navigation** | `frontend/src/components/employer/EmployerNavbar.jsx` | Light (`#ffffff`) | Employer branded header bar |
| **Employer Workspace Sidebar** | `frontend/src/components/employer/EmployerSidebar.jsx` | Light / Slate border | Workspace logo / organization switch |
| **Candidate Portal Navigation** | `frontend/src/components/candidate/CandidateNavbar.jsx` | Light (`#ffffff`) | Candidate dashboard header |
| **Candidate Portal Sidebar** | `frontend/src/components/candidate/CandidateSidebar.jsx` | Light / Slate | Navigation brand anchor |
| **Admin Portal Header & Sidebar** | `admin-frontend/src/components/layout/AdminLayout.jsx` | Light (`#ffffff`) | Shield mark + "Vakancy.in Admin" title |
| **Auth Pages (Login/Register)** | `frontend/src/pages/auth/LoginPage.jsx`, `RegisterPage.jsx` | Dark & Light split cards | Centered brand mark with portal title |
| **Shared Shortlist Portal** | `frontend/src/pages/executive/ExecutiveSearchShortlistPage.jsx` | Dark Navy (`#020617` / `#0f172a`) | "Vakancy Executive Search" badge & typography |
| **Contact Us Hub** | `frontend/src/pages/guest/ContactPage.jsx` | Dark Hero + Light Form | Official branding + verified communication badge |
| **Browser Favicons** | `frontend/index.html`, `admin-frontend/index.html` | Browser tab & bookmarks | SVG & ICO favicon link |
| **Transactional Email Templates** | `backend/services/emailTemplates.js` | White / Off-white card container | CSS/HTML gradient banner with "Vakancy.in" |
| **Mobile Drawer Navigation** | `GuestNavbar.jsx`, `AdminLayout.jsx` | White sliding drawer | Compact brand header |

---

## 3. Recommended Brand Logo Variants

When producing official brand exports, the design team should provide four core variants:

### Variant A: Primary Horizontal Logo (`logo-horizontal-primary`)
* **Composition:** Brand Icon Mark on the left + "Vakancy.in" wordmark on the right.
* **Usage:** Public navbar, login headers, desktop portal headers.
* **Aspect Ratio:** Approximately `4:1` to `5:1` (e.g. 200px × 44px).

### Variant B: Horizontal Light Mode on Dark (`logo-horizontal-light`)
* **Composition:** Brand Icon Mark + crisp white wordmark with light blue accent.
* **Usage:** Dark hero sections, Executive Search client portal, dark modal headers, dark footer strips.
* **Aspect Ratio:** `4:1` to `5:1`.

### Variant C: Icon-Only Mark (`logo-mark`)
* **Composition:** Isolated monogram or symbol (e.g., stylized "V" or geometric recruitment crest).
* **Usage:** Collapsed sidebars, mobile headers, browser favicons, app shortcuts, candidate dossier badge.
* **Aspect Ratio:** `1:1` square (e.g. 48px × 48px).

### Variant D: Email-Safe PNG Logo (`logo-email-safe`)
* **Composition:** High-resolution PNG with solid/transparent background optimized for Outlook, Gmail, Apple Mail without SVG security blocks.
* **Usage:** Transactional emails (shortlist delivery, OTP verification, enquiry replies, password resets).
* **Dimensions:** 400px width @ 72 DPI (displayed at 200px width in email markup).

---

## 4. Required Dimensions & Format Specifications

| Asset Name | Target Resolution (@1x) | Retina Resolution (@2x / @3x) | Format | Background | Max File Size |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `logo-horizontal-dark.svg` | Vector | Vector | SVG 1.1 | Transparent | < 25 KB |
| `logo-horizontal-light.svg` | Vector | Vector | SVG 1.1 | Transparent | < 25 KB |
| `logo-horizontal-dark.png` | 240 × 56 px | 480 × 112 px / 720 × 168 px | PNG-24 (Alpha) | Transparent | < 70 KB |
| `logo-horizontal-light.png` | 240 × 56 px | 480 × 112 px / 720 × 168 px | PNG-24 (Alpha) | Transparent | < 70 KB |
| `logo-mark.svg` | Vector | Vector | SVG 1.1 | Transparent | < 15 KB |
| `logo-mark.png` | 64 × 64 px | 128 × 128 px / 192 × 192 px | PNG-24 (Alpha) | Transparent | < 30 KB |
| `favicon.ico` | Multi-size ICO | 16, 32, 48 px | ICO | Transparent | < 20 KB |
| `apple-touch-icon.png` | 180 × 180 px | 180 × 180 px | PNG-24 | Solid White/Blue | < 40 KB |
| `favicon-32x32.png` | 32 × 32 px | 32 × 32 px | PNG-24 | Transparent | < 10 KB |
| `favicon-16x16.png` | 16 × 16 px | 16 × 16 px | PNG-24 | Transparent | < 5 KB |
| `email-header-logo.png` | 240 × 60 px | 480 × 120 px | PNG-24 | Transparent | < 50 KB |

---

## 5. Suggested Central Asset Directory Structure

All visual brand assets should reside in designated public directories for immediate CDN caching and static resolution:

```
Vakancy/
├── frontend/
│   └── public/
│       └── brand/
│           ├── logo-horizontal-dark.svg
│           ├── logo-horizontal-dark.png
│           ├── logo-horizontal-dark@2x.png
│           ├── logo-horizontal-light.svg
│           ├── logo-horizontal-light.png
│           ├── logo-horizontal-light@2x.png
│           ├── logo-mark.svg
│           ├── logo-mark.png
│           ├── favicon.ico
│           ├── favicon-16x16.png
│           ├── favicon-32x32.png
│           └── apple-touch-icon.png
├── admin-frontend/
│   └── public/
│       └── brand/
│           ├── admin-logo-horizontal.svg
│           ├── admin-logo-horizontal.png
│           ├── admin-logo-mark.svg
│           └── favicon.ico
└── backend/
    └── public/
        └── email-assets/
            └── logo-email.png
```

---

## 6. Centralized Component Integration Architecture

A shared component `BrandLogo.jsx` has been placed in:
- `frontend/src/components/common/BrandLogo.jsx`
- `admin-frontend/src/components/common/BrandLogo.jsx`

### Code Interface

```jsx
import BrandLogo from '../components/common/BrandLogo';

// 1. Standard Header Logo
<BrandLogo variant="default" size="md" to="/" />

// 2. Light Variant for Dark Navbar or Hero Banner
<BrandLogo variant="light" size="lg" to="/" />

// 3. Mark Only for Collapsed Sidebar or Mobile Drawer
<BrandLogo variant="mark-only" size="sm" to="/" />

// 4. Admin Portal Identity
<BrandLogo variant="default" size="md" to="/dashboard" showPortalTag={true} />
```

When official SVG assets are copied into `/public/brand/`, switching `BrandLogo.jsx` to render `<img src="/brand/logo-horizontal-dark.svg" ... />` requires altering only one file per frontend.

---

## 7. Email Template Branding Integration

In `backend/services/emailTemplates.js`, email headers currently use HTML/CSS styling. When the public CDN or production domain is live with the email logo asset:

```html
<!-- Transactional Email Header Snippet -->
<div style="background-color: #0f172a; padding: 24px 32px; text-align: left; border-top-left-radius: 12px; border-top-right-radius: 12px;">
  <img 
    src="https://vakancy.in/brand/email-header-logo.png" 
    alt="Vakancy.in" 
    width="160" 
    height="40" 
    style="display: block; border: 0; outline: none; text-decoration: none;"
  />
</div>
```

---

## 8. Verification Checklist for Final Asset Handoff

Before deploying new brand assets to production:
- [ ] SVG files are sanitized (no embedded scripts, malicious entities, or foreign namespaces).
- [ ] All vectors use paths rather than live uninstalled system fonts.
- [ ] Contrast ratio between typography and light background (`#ffffff`) meets WCAG AA standard (≥ 4.5:1).
- [ ] Contrast ratio between typography and dark background (`#0f172a`) meets WCAG AA standard (≥ 4.5:1).
- [ ] High-DPI screens render sharp edges without pixelation at 125%, 150%, and 200% OS scaling.
- [ ] Favicon renders clearly at 16×16 on Chrome, Edge, Safari, and Firefox tab bars.
- [ ] Mobile navigation height is constrained to $\le 64\text{px}$ without vertical layout shifting.
