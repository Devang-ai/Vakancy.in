# Vakancy.in — Hostinger Production Deployment & CI/CD Architecture Guide

This guide documents the production deployment architecture, CI/CD automation pipelines, subdomain mappings, database connectivity, and operational procedures for **Vakancy.in**.

---

## 1. Production Architecture Overview

| Component | Public URL | Hostinger Physical Path | Technology |
|---|---|---|---|
| **Main Frontend** (Guest & User Portals) | `https://vakancy.in` | `/home/<user>/domains/vakancy.in/public_html/` | React 18, Vite, Tailwind CSS, Apache/LiteSpeed SPA rewrite |
| **Admin Portal** | `https://vakancy.in/admin` (or `https://admin.vakancy.in`) | `/home/<user>/domains/vakancy.in/public_html/admin/` | React 18, Vite, Lucide Icons, SPA rewrite |
| **Backend API** | `https://api.vakancy.in` (Base: `https://api.vakancy.in/api`) | `/home/<user>/domains/vakancy.in/public_html/api/` | Node.js 20, Express, PM2 Process Manager |
| **Database** | Internal `localhost:3306` | Hostinger Managed MySQL | MySQL 8.x / MariaDB (`u777632951_vakancy`) |
| **Media & File Storage** | Cloudinary CDN | Cloud Storage | Resumes, Company Logos, Verification Attachments |

---

## 2. GitHub Actions CI/CD Pipelines

The repository features two modular, automated GitHub Actions workflows:

### Workflow 1: Frontend & Admin Portal Deployment (`.github/workflows/deploy.yml`)
* **Trigger:** Push to `main` modifying `frontend/**`, `admin-frontend/**`, or `.github/workflows/deploy.yml`, or manual `workflow_dispatch`.
* **Execution Steps:**
  1. Checks out repository and configures Node.js 20.
  2. Injects production environment variables (`VITE_API_URL`, `VITE_API_BASE_URL`, `VITE_GOOGLE_CLIENT_ID`).
  3. Builds `frontend/` into `frontend/dist/`.
  4. Builds `admin-frontend/` into `admin-frontend/dist/`.
  5. Deploys `frontend/dist/` to `public_html/` via FTP.
  6. Deploys `admin-frontend/dist/` to `public_html/admin/` via FTP.
  7. Ensures `.htaccess` rules exist to enable client-side routing (React Router) without 404s.

### Workflow 2: Backend API Automated Deployment (`.github/workflows/deploy-backend.yml`)
* **Trigger:** Push to `main` modifying `backend/**` or `.github/workflows/deploy-backend.yml`, or manual `workflow_dispatch`.
* **Concurrency Control:** `concurrency: production-backend` (`cancel-in-progress: false`) ensures no overlapping deployments corrupt the production environment.
* **Execution Steps:**
  1. Checks out code and configures Node.js 20.
  2. Runs `npm ci` in `backend/` to install dependencies deterministically.
  3. Runs security unit tests (`npm run test:security`).
  4. Runs database safety tests (`npm run test:phase2:safe`).
  5. Runs workflow integrity tests (`npm run test:phase3:safe`).
  6. Deploys backend files to `public_html/api/` via FTP (excluding tests, local scratch files, `.git`, and node_modules).
  7. If SSH credentials are configured (`HOSTINGER_SSH_KEY`), connects to Hostinger over SSH port `65002` to run `npm install --omit=dev` and restarts the PM2 process (`pm2 restart vakancy-api`).
  8. Executes automated health check probe against `https://api.vakancy.in/health`.

---

## 3. Hostinger Server & Subdomain Setup

### 3.1 Subdomain Configuration (hPanel)
1. In Hostinger hPanel, navigate to **Domains ➔ Subdomains**.
2. **Subdomain 1 (Backend API):**
   * Subdomain Name: `api`
   * Folder: `public_html/api`
   * Target URL: `https://api.vakancy.in`
3. **Subdomain 2 (Admin Panel):**
   * Subdomain Name: `admin`
   * Folder: `public_html/admin`
   * Target URL: `https://admin.vakancy.in` (and mirrored at `https://vakancy.in/admin`)

### 3.2 SSL Certificates
* In Hostinger hPanel, open **Security ➔ SSL**.
* Ensure **Lifetime Let's Encrypt SSL** is active for:
  - `vakancy.in` & `www.vakancy.in`
  - `api.vakancy.in`
  - `admin.vakancy.in`
* Toggle **Force HTTPS** ON for all domains.

---

## 4. Hostinger Hosting Plan Requirements for Node.js

### 4.1 Plan Capability Analysis
* **Standard / Premium Web Hosting:**
  - Optimized for Apache/LiteSpeed serving PHP and static HTML/React SPAs.
  - Runs inside **CloudLinux CageFS** sandboxes.
  - **Limitation:** In user-level `.htaccess`, the Apache proxy flag `[P]` is disallowed for unprivileged ports (port 5000), which returns `503 Service Unavailable` if an unprivileged reverse proxy is attempted.
* **Business Web Hosting / Cloud Hosting (Recommended):**
  - Includes Hostinger's native **Managed Node.js Application Manager** in hPanel.
  - Hostinger automatically configures the web server reverse proxy to connect `https://api.vakancy.in` directly to the Node.js application port.
  - Provides 1-click startup, restart, environment variable management, and live logs.

### 4.2 Upgrading to Business Web Hosting (1-Click)
1. In Hostinger hPanel, click **Hosting Plan** in the left menu.
2. Select **Upgrade to Business Web Hosting**.
3. Pay only the prorated difference for the remaining billing period.
4. Once upgraded, **Node.js** appears under **Advanced ➔ Node.js** in hPanel.
5. In Node.js settings:
   - Application Root: `public_html/api`
   - Application Startup File: `server.js`
   - Node Version: `20.x`
   - Save & Start.

---

## 5. Environment Variables & Production Secrets

### 5.1 Backend Environment Configuration (`public_html/api/.env`)
Create `/home/<user>/domains/vakancy.in/public_html/api/.env` with the following configuration:

```env
PORT=5000
NODE_ENV=production
TRUST_PROXY=1

# Allowed Origins for CORS
ALLOWED_ORIGINS=https://vakancy.in,https://www.vakancy.in,https://admin.vakancy.in

# Database Settings (Hostinger MySQL)
DB_HOST=localhost
DB_USER=u777632951_supportvakancy
DB_PASSWORD=<CONFIGURED_PRODUCTION_DATABASE_PASSWORD>
DB_NAME=u777632951_vakancy
DB_PORT=3306

# Authentication Secrets (Must be at least 32 characters, cryptographically random)
JWT_SECRET=<CRYPTOGRAPHIC_64_CHAR_HEX_SECRET>
JWT_EXPIRES_IN=7d

# Google OAuth Integration
GOOGLE_CLIENT_ID=15631312508-0r23i2q9aaor4teum3sehvk0j65v3qi9.apps.googleusercontent.com

# Gemini AI API Integration
GEMINI_API_KEY=<GEMINI_API_KEY>

# Razorpay Integration
RAZORPAY_KEY_ID=<RAZORPAY_KEY_ID>
RAZORPAY_KEY_SECRET=<RAZORPAY_KEY_SECRET>

# Cloudinary Storage Settings (Resumes & Logos)
CLOUDINARY_CLOUD_NAME=dqdapj0oe
CLOUDINARY_API_KEY=565267455376261
CLOUDINARY_API_SECRET=<CLOUDINARY_API_SECRET>

# Hostinger SMTP Configuration (Transactional & OTP Email)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=support@vakancy.in
SMTP_PASSWORD=<HOSTINGER_EMAIL_PASSWORD>
EMAIL_FROM="Vakancy Support <support@vakancy.in>"
SUPPORT_EMAIL=support@vakancy.in
INTERNAL_RECRUITMENT_EMAIL=support@vakancy.in

# Resend Fallback Email
RESEND_API_KEY=<RESEND_API_KEY>
FROM_EMAIL=onboarding@resend.dev

# Frontend Base URL
FRONTEND_URL=https://vakancy.in
```

### 5.2 GitHub Repository Secrets (`Settings ➔ Secrets and variables ➔ Actions`)

| Secret Name | Purpose | Example / Required Format |
|---|---|---|
| `HOSTINGER_FTP_SERVER` | IP address or hostname of Hostinger FTP server | `46.202.161.94` (Do NOT include `ftp://`) |
| `HOSTINGER_FTP_USERNAME` | FTP username created in Hostinger | `u777632951.vakancy.in` |
| `HOSTINGER_FTP_PASSWORD` | Password for Hostinger FTP account | Configured in Hostinger FTP Accounts |
| `HOSTINGER_SSH_KEY` | Private ED25519 or RSA SSH key for remote PM2 execution | Contents of `id_ed25519` private key |
| `HOSTINGER_SSH_PORT` | SSH port configured by Hostinger | `65002` |
| `HOSTINGER_SSH_USER` | SSH username | `u777632951` |

---

## 6. Single-Page Application (SPA) Rewrite Rules (`.htaccess`)

To prevent HTTP 404 errors when users refresh deep links on `https://vakancy.in` or `https://vakancy.in/admin`, the following rules are placed in `public_html/.htaccess` and `public_html/admin/.htaccess`:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

---

## 7. Testing & Verification Procedure

### 7.1 Automated Testing Before Deployment
Run the safe test suites locally prior to pushing:
```bash
cd backend
npm run test:security
npm run test:phase2:safe
npm run test:phase3:safe
```

### 7.2 Post-Deployment Health Check Probes
1. **Frontend Health:**
   ```bash
   curl -I https://vakancy.in
   # Expected: HTTP/1.1 200 OK
   ```
2. **Backend API Health Probe:**
   ```bash
   curl -s https://api.vakancy.in/health
   # Expected response:
   # {"status":"online","app":"Vakancy Recruitment Portal API","db_status":"MySQL Connected"}
   ```
3. **Database Readiness Probe:**
   ```bash
   curl -s https://api.vakancy.in/ready
   # Expected response:
   # {"status":"ready","database":"connected"}
   ```

---

## 8. Rollback and Disaster Recovery

### 8.1 Automated Rollback (Git-Based)
If a faulty commit was deployed to production:
1. Revert the commit locally:
   ```bash
   git revert HEAD
   git push origin main
   ```
2. The GitHub Actions pipeline will automatically test, build, and deploy the previous working version.

### 8.2 Manual Instant Rollback via Hostinger Backups
Hostinger automatically creates daily backups:
1. In Hostinger hPanel, go to **Files ➔ Backups**.
2. Under **Files backups**, select the domain `vakancy.in` and choose the backup date/time.
3. Click **Restore files** to instantly roll back to that snapshot.
4. Under **Database backups**, select database `u777632951_vakancy` and restore if database state was affected.

---

## 9. Security Best Practices Checklist

* [x] Database credentials and JWT secrets are stored exclusively in `.env` and are never committed to version control.
* [x] CORS policies are strictly enforced (`ALLOWED_ORIGINS` explicitly lists `vakancy.in`, `www.vakancy.in`, `admin.vakancy.in`; wildcards are rejected).
* [x] Uploads validate magic file bytes (MIME sniffing prevention) and stream directly to Cloudinary.
* [x] Rate limiting is active on all `/api` endpoints (window: 15 minutes, limit: 600 requests) with dedicated strict limits on authentication and OTP endpoints.
* [x] FTP Deploy Actions specify `dangerous-clean-slate: false` to ensure existing production files (e.g. `.env`, `admin/`, `uploads/`) are never deleted during deployment.

