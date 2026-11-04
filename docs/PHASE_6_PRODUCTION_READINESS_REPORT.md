# Vakancy.in Phase 6 — Production Readiness & Final Stabilization Report

**Date:** 2026-10-21  
**Verification Level:** Full platform audit, rotated test credentials, production startup validation, health/readiness endpoints, graceful shutdown, npm vulnerability audit, real isolated MySQL integration tests (47/47 passing), browser Puppeteer verification, and production bundle builds (`npm run build`).  
**Production / Main Database State:** The primary application database (`vakancy_main_db`) remains **100% untouched and unmodified**. Migrations 001–004 were verified on the isolated test database and remain staged for scheduled deployment.

---

## Executive Summary

Phase 6 delivers the final stabilization, operational hardening, and production deployment preparation for the Vakancy.in recruitment platform.

Building on the verified baseline established across Phases 0–5:
1. **Secret & Environment Security:** Hardcoded test credentials were eliminated from all test scripts. The test database user (`vakancy_tester`) password was rotated in MariaDB using cryptographically secure random entropy. Root `.gitignore` was updated to explicitly block all SQL backups (`*.sql`) while preserving seeds. Frontend `.env.example` templates were standardized with canonical Admin routing.
2. **CORS & Header Hardening:** `X-Access-Code` was added to allowed CORS headers to support browser-based candidate-sharing dossier retrieval. Helmet security headers, nosniff, frame-ancestors, CSP, and production response sanitization remain strictly enforced.
3. **Operational Reliability:** Implemented production environment validation on startup, active database readiness probes (`/ready`, `/api/ready`), root health endpoints (`/health`, `/api/health`), and POSIX-compliant graceful shutdown (`SIGTERM`, `SIGINT`) with connection pool drainage.
4. **Database Migration Preflight:** Reviewed migrations 001–004 against the existing legacy database schema. Verified that legacy data currently contains **zero duplicate applications** and **zero plaintext reset tokens**. Documented a comprehensive preflight checklist, deployment runbook, and disaster recovery rollback procedure.
5. **Session & Asset Privacy Blueprints:** Evaluated the risks of `localStorage` JWTs and designed a backward-compatible transition blueprint to HttpOnly cookies with CSRF protection. Formulated an operational inventory and migration runbook for historical public Cloudinary resumes without modifying live assets.
6. **Hosting Architecture Assessment:** Evaluated Hostinger hosting tiers. Documented why Hostinger Shared Hosting is inadequate for Node.js daemons and browser automation, providing full production configurations for Hostinger KVM VPS (Systemd, Nginx reverse proxy, MariaDB tuning, and Let's Encrypt SSL).
7. **Complete Regression Passing:** All 47 automated tests passed cleanly. Main frontend built in 13.92s, canonical admin frontend built in 9.47s, backend syntax checks passed with zero errors, and Puppeteer browser verification confirmed end-to-end user flows.

---

## 1. Environment & Secret Security Audit

### Credential Elimination & Rotation
- **Phase 5 Password Rotation:** The temporary test database credentials that appeared in terminal logs during Phase 5 execution were rotated on MariaDB (`ALTER USER 'vakancy_tester'@'localhost' IDENTIFIED BY ...` and `'vakancy_tester'@'127.0.0.1'`).
- **Removal of Hardcoded Fallbacks:** Hardcoded fallback passwords were removed from `backend/tests/phase5_database_integration.test.js`, `backend/tests/phase5_e2e_workflows.test.js`, and `backend/tests/phase5_browser_verification.js`. All test scripts now strictly consume `process.env.TEST_DB_PASSWORD`.
- **Git Ignore Security:**
  - Added `*.sql` and `**/*.sql` (with `!backend/database/seed.sql` exception) to root `.gitignore`.
  - Confirmed `backend/.env`, `backend/.env.*`, `artifacts/`, and `scratch/` are strictly ignored by Git. Zero environment files or SQL backups are tracked.
- **Environment Template Harmonization:**
  - Updated `frontend/.env.example` to document `VITE_ADMIN_APP_URL` (defaults to `https://admin.vakancy.in` in production).
  - Verified `admin-frontend/.env.example` documents `VITE_API_URL`.
  - Verified `backend/.env.example` documents `ALLOWED_ORIGINS`, `JWT_SECRET`, database settings, and service credentials.

### Production Startup Validation
A production environment validator was integrated into `backend/server.js`:
```javascript
function validateProductionEnvironment() {
  if (process.env.NODE_ENV !== 'production') return;

  const errors = [];
  const jwtSecret = process.env.JWT_SECRET || '';
  if (!jwtSecret || jwtSecret.length < 32 || jwtSecret.includes('YOUR_PRODUCTION')) {
    errors.push('JWT_SECRET must be configured with a cryptographically secure key of at least 32 characters in production.');
  }

  const dbPassword = process.env.DB_PASSWORD || '';
  if (!dbPassword || dbPassword.includes('YOUR_PRODUCTION')) {
    errors.push('DB_PASSWORD must be configured with a real production database password.');
  }

  if (errors.length > 0) {
    console.error('❌ [FATAL] Production Environment Validation Failed:');
    errors.forEach(e => console.error(`  - ${e}`));
    throw new Error(`Production environment configuration error: ${errors.join('; ')}`);
  }
}
```
If started in production mode (`NODE_ENV=production`) with template or weak credentials, the server immediately aborts boot and logs descriptive configuration errors.

### CORS & Security Headers
- **CORS Allowed Headers:** Added `X-Access-Code` to `allowedHeaders` in `backend/middleware/securityMiddleware.js` so client browsers can access protected candidate-sharing dossiers without preflight rejection.
- **Security Headers:** Active on all responses:
  - `Content-Security-Policy: default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`
  - `Cross-Origin-Opener-Policy: same-origin`
  - `Cross-Origin-Resource-Policy: same-site`
- **Error Response Masking:** In production (`NODE_ENV=production`), `backend/middleware/errorHandler.js` intercepts all 5xx exceptions and returns `{ success: false, code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected server error occurred.' }`. Stack traces and internal database errors are completely suppressed from client responses.
- **Payment Endpoints:** Payment operations remain safely disabled in code via `paymentUnavailable` middleware, returning `503 PAYMENTS_UNAVAILABLE`.

---

## 2. Database Deployment Readiness & Migration Preflight

### Analysis of Migrations 001–004 vs Existing Schema
Migrations located in `backend/database/migrations/`:
- **`001_files.js`:** Creates `FILES` table for centralized, owner-scoped asset tracking.
- **`002_scope_and_sharing.js`:** Creates `ROLES`, `ROLE_PERMISSIONS`, `TEAMS`, `USER_ASSIGNMENTS`, and `CANDIDATE_SHARING` tables with composite index `uk_role_mod_act (role_key, module, action)`.
- **`003_account_security.js`:** Adds `reset_token_hash`, `reset_token_expires`, `token_version`, and `password_changed_at` columns to `USERS`. Sets legacy plaintext `reset_token` to `NULL`.
- **`004_workflow_integrity.js`:** Enforces duplicate application prevention by creating `uk_application_job_candidate (job_id, candidate_id)` on `APPLICATION`, and creates `CANDIDATE_SHARE_ACCESS_LOG`.

### Historical Data Integrity Audit on Existing Database Copy
A non-destructive read audit of `vakancy_main_db` data (via `vakancy_backup_verify_20261021`) confirmed:
1. **Duplicate Applications:** Exactly `0` duplicate `(job_id, candidate_id)` pairs exist in legacy data. Migration 004 will apply without encountering duplicate constraint aborts.
2. **Plaintext Reset Tokens:** Exactly `0` users currently have an unhashed `reset_token` stored. No live reset requests will be disrupted.
3. **Schema Invariants:** All existing tables use `InnoDB` engine with `utf8mb4` character set.

### Migration Preflight Checklist
Before running migrations on the live production database:
- [ ] **Step 1: Maintenance Window Notification:** Announce brief maintenance window (estimated execution time: < 30 seconds).
- [ ] **Step 2: Take Consistent Cold/Warm Backup:**
  ```powershell
  mysqldump --host=127.0.0.1 --port=3306 --user=root --single-transaction --routines --triggers --result-file="C:\backups\vakancy_pre_migration_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql" vakancy_main_db
  ```
- [ ] **Step 3: Verify Backup File Integrity:** Ensure backup size is non-zero and ends with `-- Dump completed`.
- [ ] **Step 4: Confirm Target Database Identity:** Verify `DB_NAME` is specifically `vakancy_main_db` and credentials have `ALTER`, `CREATE`, `INDEX` privileges.
- [ ] **Step 5: Run Migration Suite:**
  ```bash
  node backend/database/runMigrations.js
  ```
- [ ] **Step 6: Verify Migration Ledger:**
  ```sql
  SELECT id, applied_at FROM _MIGRATIONS ORDER BY id ASC;
  ```
  Expected: 4 rows (`001_files`, `002_scope_and_sharing`, `003_account_security`, `004_workflow_integrity`).
- [ ] **Step 7: Verify Application Health Probe:**
  ```bash
  curl -s http://localhost:5000/ready
  ```
  Expected: `{"status":"ready","database":"connected",...}`.

### Rollback & Disaster Recovery Procedure
If a migration fails or an unexpected application incompatibility occurs after migration:
1. **Stop Application Service:**
   ```bash
   sudo systemctl stop vakancy-backend
   ```
2. **Restore Database from Preflight Backup:**
   ```bash
   mysql -h 127.0.0.1 -P 3306 -u root vakancy_main_db < /backups/vakancy_pre_migration_YYYYMMDD_HHMMSS.sql
   ```
3. **Verify Restored State:**
   ```sql
   USE vakancy_main_db;
   SHOW TABLES;
   ```
4. **Restart Application Service:**
   ```bash
   sudo systemctl start vakancy-backend
   ```

---

## 3. Authentication & Sensitive Data Security

### LocalStorage JWT Risk Analysis & Session Strategy Blueprint
**Current Implementation:**
JWT bearer tokens are stored in browser `localStorage` and sent in the `Authorization: Bearer <token>` header.

**Risks of `localStorage` JWT Storage:**
- Vulnerable to exfiltration via Cross-Site Scripting (XSS). Any third-party script, dependency injection, or unsanitized DOM rendering could access `localStorage.getItem('token')`.

**Recommended Production Session Migration Blueprint (Post-Stabilization):**
Without introducing an untested breaking authentication rewrite during this stabilization phase, the planned architecture for Phase 7 is:
1. **HttpOnly Cookie for Refresh Token:**
   - Server sets an `httpOnly`, `Secure`, `SameSite=Strict` cookie containing a signed, random Refresh Token on login.
   - JavaScript cannot read or extract this cookie.
2. **Short-Lived In-Memory Access Token:**
   - Access Token lifetime reduced to 15 minutes, stored purely in React memory state (not in `localStorage`).
   - On page reload, a silent `/api/auth/refresh` request exchanges the HttpOnly cookie for a fresh in-memory access token.
3. **Session Invalidation via `token_version`:**
   - Migration 003 has already provisioned `token_version INT NOT NULL DEFAULT 0` on `USERS`.
   - When a user changes password, logs out, or is revoked by an admin, `token_version` is incremented, instantly invalidating all active refresh tokens.
4. **Anti-CSRF Protection:**
   - State-changing mutations (`POST`, `PUT`, `DELETE`) require a non-guessable `X-CSRF-Token` header matching a cryptographically signed cookie token.

### Password Reset Token Security
- Reset tokens are generated using 32 bytes of cryptographic randomness (`crypto.randomBytes(32).toString('hex')`).
- Only the SHA-256 hash (`reset_token_hash`) is stored in the database. Plaintext tokens are never stored.
- Tokens strictly expire after 1 hour (`reset_token_expires`).
- Single-use guarantee: upon successful password update, `reset_token_hash` and `reset_token_expires` are cleared to `NULL`, and `token_version` is incremented.

### Historical Public Cloudinary Resume Inventory & Migration Guide
In legacy versions of the application, resume files were uploaded to Cloudinary as public assets (`type: 'upload'`).

**Inventory Procedure (Read-Only):**
Run the following query to identify all historical public resumes:
```sql
SELECT 
    c.id AS candidate_id, 
    c.name, 
    c.resume_url, 
    r.id AS resume_id, 
    r.file_path, 
    r.created_at
FROM CANDIDATES c
LEFT JOIN RESUME r ON c.id = r.candidate_id
WHERE c.resume_url LIKE '%cloudinary.com%' 
   OR r.file_path LIKE '%cloudinary.com%';
```

**Step-by-Step Asset Migration Runbook:**
1. **Asset Migration Script (Cloudinary Admin API):**
   - Iterate over each public asset's `public_id`.
   - Call Cloudinary Admin API `uploader.rename` or update delivery type from `upload` to `authenticated` (or `private`).
2. **Metadata Updating:**
   - Insert corresponding record into `FILES` table with `delivery_type = 'authenticated'` and `access_restricted = 1`.
   - Update `RESUME.file_path` to point to `/api/files/download/:id` rather than the direct Cloudinary CDN URL.
3. **Signed URL Generation:**
   - When an authorized recruiter or approved employer accesses a resume, generate an expiring signed download URL:
     ```javascript
     const signedUrl = cloudinary.utils.private_download_url(publicId, format, {
       expires_at: Math.floor(Date.now() / 1000) + 300 // 5-minute expiry
     });
     ```
   - Candidate direct links and public scraping of historical resumes are eliminated.

---

## 4. Backend Operations & Reliability Hardening

### Health & Readiness Probes
Added standard monitoring endpoints to `backend/server.js`:
- `GET /health` and `GET /api/health`: Immediate liveness check returning HTTP 200 with service metadata.
- `GET /ready` and `GET /api/ready`: Real database readiness check executing `SELECT 1`. Returns HTTP 200 when MySQL is connected, or HTTP 503 when unreachable.

### Graceful Shutdown (Zero-Downtime Drainage)
Handled `SIGTERM` and `SIGINT` signals:
- Stops accepting new incoming HTTP connections.
- Allows existing in-flight HTTP requests to complete.
- Calls `db.closeDB()` to drain and release MySQL pool connections.
- Implements a 10-second unref timeout to prevent process hang if an external resource is unresponsive.

### Database Connection Pooling & Transactions
- Configured connection limits with connection recycling and error handling (`waitForConnections: true, connectionLimit: 10, queueLimit: 0`).
- Multi-table operations wrapped in explicit ACID transactions via `withTransaction(workFn)`.
- Transaction boundaries strictly exclude external HTTP operations (e.g. Resend emails), avoiding connection starvation.

### Multi-Instance Rate Limiting Limitations
- **Current Status:** In-memory sliding window rate limiter (`createRateLimiter` in `securityMiddleware.js`).
- **Limitation:** In-memory maps operate per-process. In a multi-instance or clustered deployment (e.g. behind a load balancer with multiple Node.js PM2/container replicas), rate limits are not shared across processes.
- **Production Recommendation:** For clustered or multi-server deployments, configure Redis-backed rate limiting (`rate-limit-redis`) using an existing Redis instance.

### Email Delivery Reliability & Fallback Handling
- Uses Resend API via [`backend/services/emailService.js`](file:///c:/Users/Devang%20chauhan/OneDrive/Desktop/Vakancy/backend/services/emailService.js).
- If `RESEND_API_KEY` is missing or in test mode, the service gracefully falls back to structured logging without failing the caller.
- Network exceptions during email dispatch are caught and logged as warnings; they do not trigger transaction rollbacks or 500 error responses on core applicant workflows.

---

## 5. Production Deployment Configuration & Hosting Assessment

### Hostinger Hosting Assessment: Shared vs Cloud vs VPS

| Hosting Tier | Node.js Daemon Support | Process Isolation & Memory | Headless Browser (Puppeteer) | Production Recommendation |
|---|---|---|---|---|
| **Hostinger Shared Web Hosting** | ❌ Severely restricted. Uses LiteSpeed Passenger; lacks systemd daemon control; execution timeouts kill long-running processes. | ❌ High risk. CloudLinux memory limits (512MB–1GB) cause frequent OOM kills. | ❌ Unsupported. Missing Linux system libraries for Chromium. | **NOT RECOMMENDED** for Vakancy.in. |
| **Hostinger Cloud Hosting** | ⚠️ Partial. Dedicated RAM/CPU, but still constrained by hPanel/cPanel LiteSpeed Passenger abstraction. | ⚠️ Moderate. More resources, but lacks full OS root control. | ⚠️ Difficult. Installing missing Debian/Ubuntu shared libraries requires root. | **ACCEPTABLE** only for low-traffic static/PHP sites. |
| **Hostinger KVM VPS (Ubuntu 22.04/24.04 LTS)** | ✅ Full root access. Native `systemctl` services, PM2, Docker, or Node.js runtime. | ✅ Full dedicated memory and CPU cores (e.g. KVM 2 / KVM 4). | ✅ Fully supported. Native apt package installation for Chromium dependencies. | **RECOMMENDED** for Vakancy.in production. |

### Recommended Production Topology (Hostinger KVM VPS)
```
                               Internet (HTTPS: 443)
                                         │
                                         ▼
                               Nginx Reverse Proxy
                     ┌───────────────────┴───────────────────┐
                     ▼                                       ▼
       https://vakancy.in (SPA)             https://admin.vakancy.in (SPA)
        /var/www/vakancy/frontend/dist        /var/www/vakancy/admin-frontend/dist
                     │                                       │
                     └───────────────┬───────────────────────┘
                                     │ Proxy: /api/*
                                     ▼
                            Express API (Port 5000)
                             Managed via systemd / PM2
                                     │
                     ┌───────────────┴───────────────┐
                     ▼                               ▼
            MySQL 8 / MariaDB                External Cloud Services
            (127.0.0.1:3306)                 - Resend (Email)
            vakancy_main_db                  - Cloudinary (Media)
```

### Complete Nginx Reverse Proxy Configuration
```nginx
# /etc/nginx/sites-available/vakancy.conf

# 1. Main Public & Candidate/Employer Application
server {
    listen 80;
    server_name vakancy.in www.vakancy.in;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name vakancy.in www.vakancy.in;

    ssl_certificate /etc/letsencrypt/live/vakancy.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vakancy.in/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    root /var/www/vakancy/frontend/dist;
    index index.html;

    # Static SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API Reverse Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 10M;
    }

    # Static assets cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, no-transform";
    }
}

# 2. Canonical Admin Application
server {
    listen 80;
    server_name admin.vakancy.in;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name admin.vakancy.in;

    ssl_certificate /etc/letsencrypt/live/admin.vakancy.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/admin.vakancy.in/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    root /var/www/vakancy/admin-frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 10M;
    }
}
```

### Backend Systemd Service Configuration
```ini
# /etc/systemd/system/vakancy-backend.service
[Unit]
Description=Vakancy.in Node.js API Service
After=network.target mysql.service

[Service]
Type=simple
User=vakancy
WorkingDirectory=/var/www/vakancy/backend
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
EnvironmentFile=/var/www/vakancy/backend/.env
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
```

### Automated Database Backup Script (Cron)
```bash
#!/usr/bin/env bash
# /usr/local/bin/backup-vakancy-db.sh
set -euo pipefail

BACKUP_DIR="/var/backups/mysql/vakancy"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="${BACKUP_DIR}/vakancy_backup_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

# Dump with single transaction and gzip
mysqldump --defaults-extra-file=/etc/mysql/backup.cnf \
  --single-transaction \
  --routines \
  --triggers \
  vakancy_main_db | gzip -9 > "${FILENAME}"

# Retain backups for 30 days
find "${BACKUP_DIR}" -type f -name "vakancy_backup_*.sql.gz" -mtime +30 -delete

echo "Backup created: ${FILENAME}"
```

---

## 6. Final Regression & Verification Results

### Complete Test Suite (47/47 Passing)
- **Phase 1 Security Unit:** 11/11 tests passing.
- **Phase 2 Database Safety:** 5/5 tests passing.
- **Phase 2 Authorization Unit:** 6/6 tests passing.
- **Phase 3 Workflow Unit:** 5/5 tests passing.
- **Phase 4 Frontend Reliability:** 7/7 tests passing.
- **Phase 5 Database Integration:** 10/10 tests passing.
- **Phase 5 E2E Workflows:** 3/3 test suites passing.
- **Total Test Count:** **47 passed, 0 failed, 0 skipped** (Execution time: ~5.3 seconds).

### Reliability Endpoint Verification
- `GET /health` → HTTP 200 `{"status":"online", ...}`
- `GET /ready` → HTTP 200 `{"status":"ready","database":"connected", ...}`
- `validateProductionEnvironment()` → Successfully prevents server boot when `JWT_SECRET` is weak or missing in production mode.

### Production Bundle Builds
- **Main Frontend (`frontend`):** Built cleanly in **13.92s** via Vite. Code-split chunks generated in `dist/assets/`. Zero bundle compilation errors.
- **Admin Frontend (`admin-frontend`):** Built cleanly in **9.47s** via Vite. Code-split chunks generated in `dist/assets/`. Zero bundle compilation errors.

### Browser End-to-End Verification (Puppeteer)
Executed against ports 5173 (`frontend`), 5174 (`admin-frontend`), and 5002 (`backend` on isolated database):
- Candidate Journey: **PASSED** (Navigated jobs catalog, captured screenshot).
- Admin Journey: **PASSED** (Authenticated as Director, browsed jobs & callbacks queues, captured screenshots).
- Employer Journey: **PASSED** (Navigated Employer Dashboard, verified applicant isolation, captured screenshot).
- Visual Artifacts Archived:
  - `phase5_candidate_jobs_browser.png`
  - `phase5_admin_jobs_browser.png`
  - `phase5_admin_callbacks_browser.png`
  - `phase5_employer_dashboard_browser.png`

---

## 7. Production Acceptance Checklist

| Item | Status | Operational Notes |
|---|---|---|
| **CORS & Origin Hardening** | **Verified & Ready** | Exact whitelist enforced; `X-Access-Code` allowed; credentials supported. |
| **Security Headers & Error Sanitization** | **Verified & Ready** | Helmet CSP, nosniff, DENY framing; zero stack traces in production 500s. |
| **Multi-Table Transactions & Rollbacks** | **Verified & Ready** | Applications, ATS moves, shares, and callbacks ACID-protected with rollbacks. |
| **Migrations 001–004 Idempotency** | **Verified & Ready** | Verified on isolated MySQL; zero duplicate conflicts in existing legacy data. |
| **Duplicate Application Prevention** | **Verified & Ready** | Unique constraint `uk_application_job_candidate` active; rejects duplicate inserts. |
| **Production Health & Readiness Probes** | **Verified & Ready** | `/health` and `/ready` probes active with active DB query checks. |
| **Graceful Shutdown & Pool Drainage** | **Verified & Ready** | `SIGTERM` / `SIGINT` signal handlers gracefully close server and pool. |
| **Frontend Production Builds** | **Verified & Ready** | Both React/Vite applications build cleanly without errors. |
| **Live Resend Email Delivery** | **Implemented; Requires Config** | Service implemented with graceful fallback; requires real `RESEND_API_KEY` in production `.env`. |
| **Database Migration on `vakancy_main_db`** | **Requires Approval** | Migrations 001–004 staged and verified; awaits user approval to execute against live DB. |
| **Historical Cloudinary Resume Privacy** | **Documented; Requires Approval** | Runbook prepared; awaits user approval before running Cloudinary asset migration script. |
| **JWT to HttpOnly Cookie Migration** | **Architectured; Postponed** | Comprehensive design documented for Phase 7; existing JWT auth hardened and functional. |
| **Razorpay / Paid Checkouts** | **Intentionally Postponed** | Endpoints fail closed with `503 PAYMENTS_UNAVAILABLE`. |
| **Admin Panel Optional CMS/Banners** | **Intentionally Postponed** | Unsupported phantom routes removed; core recruitment operational modules active. |
| **NPM Audit Vulnerabilities** | **Evaluated; Staged for Maintenance** | Dev-only dependencies (`nodemon`, `vite`, `tailwindcss`) and `react-router` major version update staged for post-launch maintenance window. |

---

## 8. Exact Files Modified in Phase 6

| File | Change Description |
|---|---|
| [`.gitignore`](file:///c:/Users/Devang%20chauhan/OneDrive/Desktop/Vakancy/.gitignore) | Added `*.sql` and `**/*.sql` ignore rules while explicitly preserving `backend/database/seed.sql`. |
| [`frontend/.env.example`](file:///c:/Users/Devang%20chauhan/OneDrive/Desktop/Vakancy/frontend/.env.example) | Added `VITE_ADMIN_APP_URL` documentation for canonical Admin app routing. |
| [`backend/server.js`](file:///c:/Users/Devang%20chauhan/OneDrive/Desktop/Vakancy/backend/server.js) | Added `validateProductionEnvironment()`, `/health` & `/ready` probes, and `SIGTERM`/`SIGINT` graceful shutdown. |
| [`backend/middleware/securityMiddleware.js`](file:///c:/Users/Devang%20chauhan/OneDrive/Desktop/Vakancy/backend/middleware/securityMiddleware.js) | Added `X-Access-Code` to allowed CORS headers for browser-based dossier viewing. |
| [`backend/tests/phase5_database_integration.test.js`](file:///c:/Users/Devang%20chauhan/OneDrive/Desktop/Vakancy/backend/tests/phase5_database_integration.test.js) | Removed hardcoded test credentials; strictly consumes `process.env.TEST_DB_PASSWORD`. |
| [`backend/tests/phase5_e2e_workflows.test.js`](file:///c:/Users/Devang%20chauhan/OneDrive/Desktop/Vakancy/backend/tests/phase5_e2e_workflows.test.js) | Removed hardcoded test credentials; consumes `process.env.TEST_DB_PASSWORD`. |
| [`backend/tests/phase5_browser_verification.js`](file:///c:/Users/Devang%20chauhan/OneDrive/Desktop/Vakancy/backend/tests/phase5_browser_verification.js) | Removed hardcoded test credentials; consumes `process.env.TEST_DB_PASSWORD`. |
| [`docs/PHASE_6_PRODUCTION_READINESS_REPORT.md`](file:///c:/Users/Devang%20chauhan/OneDrive/Desktop/Vakancy/docs/PHASE_6_PRODUCTION_READINESS_REPORT.md) | Created comprehensive Phase 6 Production Readiness Report. |

---

## 9. Next Steps (Deployment Execution Roadmap)

When management approves deployment:
1. **Hostinger VPS Provisioning:** Provision a Hostinger KVM 2 / KVM 4 VPS with Ubuntu 24.04 LTS.
2. **Environment Setup:** Configure Nginx, Node.js 20+, MariaDB 10.11+, and Certbot SSL certificates using the configurations documented in Section 5.
3. **Database Backup & Migration:** Follow the preflight checklist (Section 2) to backup `vakancy_main_db` and execute migrations 001–004.
4. **Environment Secrets:** Populate production secrets in `backend/.env` (`JWT_SECRET`, `DB_PASSWORD`, `RESEND_API_KEY`, `CLOUDINARY_*`).
5. **Start System Services:** Enable and start `vakancy-backend.service` via `systemctl`.
6. **Deploy Frontends:** Copy `frontend/dist` and `admin-frontend/dist` to `/var/www/vakancy/`.
7. **Verification:** Query `https://vakancy.in/api/ready` to confirm production health.
