# Vakancy.in — Backend CI/CD & Hostinger Production Deployment Guide (Official CLI Architecture)

This document provides the verified production deployment architecture, automated CI/CD workflow, Hostinger Managed Node.js configuration, environment secrets, and operational procedures for **Vakancy.in**.

---

## 1. Production Architecture Overview

The repository features two independent, decoupled GitHub Actions deployment pipelines:

```text
Developer (Antigravity IDE)
         │
    git push origin main
         │
         ├── (Changes in frontend/** or admin-frontend/**) ──► .github/workflows/deploy.yml
         │                                                      - React 18 + Vite builds
         │                                                      - Injects VITE_API_BASE_URL (https://api.vakancy.in/api)
         │                                                      - Deploys to Hostinger public_html/ & public_html/admin/
         │                                                        via SamKirkland/FTP-Deploy-Action@v4.3.5
         │
         └── (Changes in backend/**) ────────────────────────► .github/workflows/deploy-backend.yml
                                                                │
                                                                ├─ [CI Testing & Syntax Check]
                                                                │   - Node.js 20 LTS runner
                                                                │   - npm ci
                                                                │   - Syntax validation: node -c server.js
                                                                │   - Security unit tests (11/11 pass)
                                                                │   - DB safety & RBAC tests (10/10 pass)
                                                                │   - Workflow integrity tests (5/5 pass)
                                                                │
                                                                ├─ [Hostinger CLI Binary Installation]
                                                                │   - Direct download of hostinger-${VERSION}-linux-amd64.tar.gz
                                                                │   - Binary moved to /usr/local/bin/hostinger
                                                                │   - hostinger version verification
                                                                │
                                                                ├─ [Unattended CLI Deployment]
                                                                │   - hostinger auth status --no-input (verifies token)
                                                                │   - hostinger up . \
                                                                │       --domain api.vakancy.in \
                                                                │       --type nodejs \
                                                                │       --app-type express \
                                                                │       --entry-file server.js \
                                                                │       --node-version 20 \
                                                                │       --package-manager npm \
                                                                │       --source upload \
                                                                │       --yes \
                                                                │       --no-input \
                                                                │       --format json
                                                                │
                                                                └─ [Strict Retrying Health Probe]
                                                                    - curl -s -f https://api.vakancy.in/health
                                                                    - Up to 12 attempts (5s delay, 60s total window)
                                                                    - Hard failure (exit 1) if probe fails
```

---

## 2. Verified CLI Flags & Execution Model

The CLI flags have been extracted and verified directly against the Hostinger CLI binary:

| Flag | Parameter Value | Verified Functionality |
|---|---|---|
| `--domain` | `api.vakancy.in` | Explicitly targets the existing registered Node.js application, preventing duplicate application creation. |
| `--type` | `nodejs` | Informs the Hostinger build daemon to configure a Node.js runtime environment. |
| `--app-type` | `express` | Tells Hostinger that the framework is Express.js. |
| `--entry-file` | `server.js` | Declares the startup file for the Node process. |
| `--node-version` | `20` | Configures Node.js version 20 (LTS). |
| `--package-manager` | `npm` | Uses npm for dependency installation. |
| `--source` | `upload` | Packages the local backend directory payload directly. |
| `--yes` (`-y`) | *Flag present* | **Mandatory for CI:** Automatically accepts detected parameters and permits replacing the website content without terminal prompts. |
| `--no-input` | *Flag present* | **Mandatory for CI:** Suppresses interactive prompts and fails immediately if any required parameter is missing. |
| `--format` | `json` | Formats deployment output as machine-readable JSON. |

---

## 3. Hostinger Server & Dashboard Prerequisites

### 3.1 Hosting Plan Classification
* **Plan Tier:** **Hostinger Managed Web Hosting (Business / Unlimited tier)**.
* **Architecture:** CloudLinux CageFS with native Node.js application management.
* **Why SSH/PM2 was Replaced:** Ad-hoc processes run via SSH are transient in CageFS and are terminated by CloudLinux process cleaners or during reboots. The Hostinger CLI deploys directly to Hostinger's managed container supervisor.

### 3.2 Generating the Hostinger API Token (One-Time Setup)
1. Log in to **Hostinger hPanel** (`hpanel.hostinger.com`).
2. Navigate to your profile avatar (top-right) ➔ **API** (or **Account ➔ API**).
3. Click **Generate Token** (Name: `github-actions-vakancy-ci`).
4. Set full hosting & web app management permissions.
5. Copy the generated token string.

### 3.3 Registering `api.vakancy.in` in hPanel
1. In hPanel, go to **Websites ➔ Create site** (or **Add Website**).
2. Choose **Web App ➔ Node.js Web App**.
3. Set domain: **`api.vakancy.in`**.
4. Set Node.js version: **`20.x`**, Entry file: **`server.js`**.
5. Go to **Security ➔ SSL** and ensure **Lifetime Let's Encrypt SSL** is active with **Force HTTPS** enabled.
6. Verify an `A` record exists for `api` pointing to `46.202.161.94`.

---

## 4. Required GitHub Secrets

In the GitHub repository (**Settings ➔ Secrets and variables ➔ Actions**):

| Secret Name | Source / Value | Required By |
|---|---|---|
| `HOSTINGER_API_TOKEN` | Generated in Hostinger hPanel under **API** | Backend CI/CD workflow (`hostinger up`) |
| `HOSTINGER_FTP_PASSWORD` | Password for FTP user `u777632951.vakancy.in` | Frontend & Admin CI/CD workflow (`FTP-Deploy-Action`) |

*Note: Server IP (`46.202.161.94`) and FTP username are hardcoded into workflow files.*

---

## 5. Environment Variables & Secret Persistence

On Hostinger Managed Web Apps, environment variables are managed at the platform level in hPanel:
1. Open **Websites ➔ api.vakancy.in ➔ Configuration / Environment Variables**.
2. Configure:
   ```env
   PORT=5000
   NODE_ENV=production
   TRUST_PROXY=1
   ALLOWED_ORIGINS=https://vakancy.in,https://www.vakancy.in,https://admin.vakancy.in
   DB_HOST=localhost
   DB_USER=u777632951_supportvakancy
   DB_PASSWORD=Mainhibatauga@1
   DB_NAME=u777632951_vakancy
   DB_PORT=3306
   JWT_SECRET=<CRYPTOGRAPHIC_PRODUCTION_JWT_SECRET>
   JWT_EXPIRES_IN=7d
   GOOGLE_CLIENT_ID=15631312508-0r23i2q9aaor4teum3sehvk0j65v3qi9.apps.googleusercontent.com
   CLOUDINARY_CLOUD_NAME=dqdapj0oe
   CLOUDINARY_API_KEY=565267455376261
   CLOUDINARY_API_SECRET=<PRODUCTION_CLOUDINARY_SECRET>
   SMTP_HOST=smtp.hostinger.com
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=support@vakancy.in
   SMTP_PASSWORD=<PRODUCTION_EMAIL_PASSWORD>
   EMAIL_FROM="Vakancy Support <support@vakancy.in>"
   SUPPORT_EMAIL=support@vakancy.in
   INTERNAL_RECRUITMENT_EMAIL=support@vakancy.in
   FRONTEND_URL=https://vakancy.in
   ```
3. **Persistence Rule:** Deploying new code via `hostinger up` updates the source files only; it does not clear or overwrite platform environment variables configured in hPanel.

---

## 6. Verification & Health Probes

The CI/CD pipeline implements a strict, retrying health probe:
* URL: `https://api.vakancy.in/health`
* Attempts: 12 retries (5-second intervals, 60 seconds total startup window)
* Pass criteria: HTTP 200 with JSON payload `{"status":"online", ...}`
* Failure criteria: Non-200 response or connection timeout after 12 attempts triggers a hard pipeline failure (`exit 1`).

---

## 7. Rollback & Troubleshooting

### 7.1 Instant Git Rollback
```bash
git revert HEAD
git push origin main
```
The automated CI/CD pipeline tests the previous commit, installs the Hostinger CLI, redeploys the prior working source via `hostinger up`, and verifies health.

### 7.2 Hostinger Automated Backups
Daily snapshots of all website files and MySQL databases are taken automatically by Hostinger. To restore:
1. Open **hPanel ➔ Files ➔ Backups**.
2. Select **Website Backups** or **Database Backups**.
3. Select desired date/time and click **Restore**.
