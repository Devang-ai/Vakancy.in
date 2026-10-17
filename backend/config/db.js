const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

let pool = null;
let isUsingFallback = false;

// In-memory relational store fallback if MySQL server is offline
const memoryDb = {
  USERS: [],
  CANDIDATES: [],
  CANDIDATE_EXPERIENCE: [],
  CANDIDATE_EDUCATION: [],
  CANDIDATE_SKILL: [],
  CANDIDATE_EXEC_DETAILS: [],
  RESUME: [],
  CANDIDATE_TAG: [],
  PREMIUM_PROFILE: [],
  EMPLOYERS: [],
  CLIENT: [],
  JOB: [],
  APPLICATION: [],
  ATS_STAGE: [],
  CANDIDATE_PIPELINE: [],
  CANDIDATE_NOTE: [],
  PIPELINE_STAGE_HISTORY: [],
  SUBSCRIPTION_PLAN: [],
  EMPLOYER_SUBSCRIPTION: [],
  CANDIDATE_UNLOCK: [],
  PAYMENT: [],
  AI_REQUEST: [],
  NOTIFICATION: [],
  JOB_QUESTION: [],
  EMPLOYER_ENQUIRY: [],
  JOB_ALERT: [],
  NOTIFICATION_PREFERENCE: [],
  JOB_CATEGORY: [],
  SKILL: [],
  LOCATION: [],
  BANNER: [],
  CMS_PAGE: [],
  PLATFORM_SETTING: [],
  BENEFIT_MASTER: [],
  RECRUITMENT_ACTIVITY: [],
  JOB_KEYWORD: [],
  JOB_LOCATION: [],
  COUNTRY: [],
  STATE_REGION: [],
  CITY: [],
  SAVED_JOBS: []
};

const { relationalSeed } = require('../database/seedLocationData');

// Load seed data into memoryDb
function loadMemorySeed() {
  const seedPath = path.join(__dirname, '../database/seed.sql');
  if (fs.existsSync(seedPath)) {
    const sqlContent = fs.readFileSync(seedPath, 'utf8');
    const statements = sqlContent
      .split(';')
      .map(s => s.replace(/--.*$/gm, '').trim())
      .filter(s => s.toUpperCase().startsWith('INSERT INTO'));
    
    statements.forEach(stmt => {
      const match = stmt.match(/INSERT\s+INTO\s+[`]?(\w+)[`]?\s*\(([^)]+)\)\s*VALUES\s*([\s\S]+)/i);
      if (match) {
        const table = match[1].toUpperCase();
        const columns = match[2].split(',').map(c => c.trim().replace(/`/g, ''));
        const valuesRaw = match[3];
        
        // Parse rows respecting quoted strings and parentheses
        const rows = [];
        let inQuote = false;
        let depth = 0;
        let currentRow = '';

        for (let i = 0; i < valuesRaw.length; i++) {
          const ch = valuesRaw[i];
          if (ch === "'" && valuesRaw[i - 1] !== '\\') {
            inQuote = !inQuote;
          }
          if (!inQuote) {
            if (ch === '(') {
              depth++;
              if (depth === 1) {
                currentRow = '';
                continue;
              }
            } else if (ch === ')') {
              depth--;
              if (depth === 0) {
                rows.push(currentRow);
                currentRow = '';
                continue;
              }
            }
          }
          if (depth > 0) {
            currentRow += ch;
          }
        }

        rows.forEach(rowStr => {
          // Parse individual values separated by commas outside quotes
          const vals = [];
          let currentVal = '';
          let valInQuote = false;
          for (let j = 0; j < rowStr.length; j++) {
            const char = rowStr[j];
            if (char === "'" && rowStr[j - 1] !== '\\') {
              valInQuote = !valInQuote;
            }
            if (char === ',' && !valInQuote) {
              vals.push(currentVal);
              currentVal = '';
            } else {
              currentVal += char;
            }
          }
          vals.push(currentVal);

          const rowVals = vals.map(v => {
            let clean = v.trim();
            if (clean.startsWith("'") && clean.endsWith("'")) return clean.slice(1, -1);
            if (clean.toUpperCase() === 'NULL') return null;
            if (clean === '1' || clean.toUpperCase() === 'TRUE') return 1;
            if (clean === '0' || clean.toUpperCase() === 'FALSE') return 0;
            if (!isNaN(clean) && clean !== '') return Number(clean);
            return clean;
          });

          const obj = {};
          columns.forEach((col, idx) => {
            obj[col] = rowVals[idx] !== undefined ? rowVals[idx] : null;
          });

          if (memoryDb[table]) {
            if (!memoryDb[table].some(item => item.id === obj.id)) {
              memoryDb[table].push(obj);
            }
          }
        });
      }
    });

    // Populate relational location seed in memoryDb
    if (memoryDb.COUNTRY.length === 0) {
      memoryDb.COUNTRY = [...relationalSeed.countries];
      memoryDb.STATE_REGION = [...relationalSeed.states];
      memoryDb.CITY = [...relationalSeed.cities];
    }
    console.log('⚡ [DB Fallback] In-memory database store initialized with seed data.');
  }
}

async function initDB() {
  console.log('Starting Vakancy server database initialization...');
  console.log('Connecting to MySQL...');

  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || 3306;
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '';
  const database = process.env.DB_NAME || 'vakancy_main_db';

  try {
    pool = mysql.createPool({
      host,
      user,
      password,
      database,
      port,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    const connection = await pool.getConnection();
    console.log('✅ Connected to MySQL database successfully.');
    console.log(`Database: ${database} (${host}:${port})`);

    // Ensure category_id column exists on JOB table
    try {
      const [cols] = await connection.query("SHOW COLUMNS FROM `JOB` LIKE 'category_id'");
      if (!cols || cols.length === 0) {
        await connection.query("ALTER TABLE `JOB` ADD COLUMN `category_id` VARCHAR(36) AFTER `job_domain`");
        console.log('✅ Added category_id column to JOB table.');
      }
    } catch (e) {
      console.warn('Notice checking category_id column on JOB:', e.message);
    }

    // Ensure JOB_KEYWORD table exists for normalized search/filtering
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`JOB_KEYWORD\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`job_id\` VARCHAR(36) NOT NULL,
          \`keyword\` VARCHAR(255) NOT NULL,
          \`normalized_keyword\` VARCHAR(255) NOT NULL,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX \`idx_job_id\` (\`job_id\`),
          INDEX \`idx_normalized_keyword\` (\`normalized_keyword\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      console.log('✅ Ensured JOB_KEYWORD table is present.');
    } catch (e) {
      console.warn('Notice checking JOB_KEYWORD table:', e.message);
    }

    // Ensure COUNTRY, STATE_REGION, and CITY relational location tables exist
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`COUNTRY\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`name\` VARCHAR(100) NOT NULL UNIQUE,
          \`iso_code\` VARCHAR(10),
          \`iso3_code\` VARCHAR(10),
          \`status\` TINYINT(1) DEFAULT 1,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`STATE_REGION\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`country_id\` VARCHAR(36) NOT NULL,
          \`name\` VARCHAR(100) NOT NULL,
          \`type\` VARCHAR(50) DEFAULT 'State',
          \`code\` VARCHAR(20),
          \`status\` TINYINT(1) DEFAULT 1,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX \`idx_st_country_id\` (\`country_id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`CITY\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`country_id\` VARCHAR(36) NOT NULL,
          \`state_region_id\` VARCHAR(36) NOT NULL,
          \`name\` VARCHAR(100) NOT NULL,
          \`status\` TINYINT(1) DEFAULT 1,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX \`idx_ct_country_id\` (\`country_id\`),
          INDEX \`idx_ct_state_id\` (\`state_region_id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`JOB_LOCATION\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`job_id\` VARCHAR(36) NOT NULL,
          \`country_id\` VARCHAR(36),
          \`state_region_id\` VARCHAR(36),
          \`city_id\` VARCHAR(36),
          \`country\` VARCHAR(100),
          \`state\` VARCHAR(100),
          \`city\` VARCHAR(100),
          \`locality\` VARCHAR(255),
          \`location_text\` VARCHAR(255) NOT NULL,
          \`is_primary\` TINYINT(1) DEFAULT 0,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX \`idx_jl_job_id\` (\`job_id\`),
          INDEX \`idx_jl_country_id\` (\`country_id\`),
          INDEX \`idx_jl_state_id\` (\`state_region_id\`),
          INDEX \`idx_jl_city_id\` (\`city_id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // Seed relational locations per table if empty
      const [cntRows] = await connection.query('SELECT COUNT(*) as cnt FROM COUNTRY');
      if (!cntRows || cntRows[0].cnt === 0) {
        for (const c of relationalSeed.countries) {
          await connection.query('INSERT IGNORE INTO COUNTRY (id, name, iso_code, iso3_code, status) VALUES (?, ?, ?, ?, 1)', [c.id, c.name, c.iso_code, c.iso3_code]);
        }
      }

      const [stRows] = await connection.query('SELECT COUNT(*) as cnt FROM STATE_REGION');
      if (!stRows || stRows[0].cnt === 0) {
        for (const s of relationalSeed.states) {
          await connection.query('INSERT IGNORE INTO STATE_REGION (id, country_id, name, type, code, status) VALUES (?, ?, ?, ?, ?, 1)', [s.id, s.country_id, s.name, s.type, s.code]);
        }
      }

      const [ctRows] = await connection.query('SELECT COUNT(*) as cnt FROM CITY');
      if (!ctRows || ctRows[0].cnt === 0) {
        for (const ct of relationalSeed.cities) {
          await connection.query('INSERT IGNORE INTO CITY (id, country_id, state_region_id, name, status) VALUES (?, ?, ?, ?, 1)', [ct.id, ct.country_id, ct.state_region_id, ct.name]);
        }
      }
      console.log('✅ Checked and verified relational COUNTRY, STATE_REGION, and CITY tables.');
    } catch (e) {
      console.warn('Notice checking/seeding relational location tables:', e.message);
    }

    // Ensure BENEFIT_MASTER and JOB_BENEFIT relational tables exist
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`BENEFIT_MASTER\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`name\` VARCHAR(255) NOT NULL UNIQUE,
          \`category\` VARCHAR(100) DEFAULT 'General',
          \`is_active\` TINYINT(1) DEFAULT 1,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`JOB_BENEFIT\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`job_id\` VARCHAR(36) NOT NULL,
          \`benefit_id\` VARCHAR(36) NULL,
          \`benefit_name\` VARCHAR(255) NOT NULL,
          \`is_custom\` TINYINT(1) DEFAULT 0,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX \`idx_jb_job_id\` (\`job_id\`),
          INDEX \`idx_jb_benefit_name\` (\`benefit_name\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

            await connection.query(`
        CREATE TABLE IF NOT EXISTS \`NOTIFICATION\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`user_id\` VARCHAR(36) NOT NULL,
          \`type\` VARCHAR(50) NOT NULL,
          \`title\` VARCHAR(255) NOT NULL,
          \`message\` TEXT NOT NULL,
          \`reference_type\` VARCHAR(50) NULL,
          \`reference_id\` VARCHAR(36) NULL,
          \`is_read\` TINYINT(1) DEFAULT 0,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX \`idx_notif_user_id\` (\`user_id\`),
          INDEX \`idx_notif_created_at\` (\`created_at\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`NOTIFICATION_PREFERENCE\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`user_id\` VARCHAR(36) NOT NULL UNIQUE,
          \`stageWhatsapp\` TINYINT(1) DEFAULT 0,
          \`stageEmail\` TINYINT(1) DEFAULT 1,
          \`stageSms\` TINYINT(1) DEFAULT 0,
          \`inboundWhatsapp\` TINYINT(1) DEFAULT 0,
          \`inboundEmail\` TINYINT(1) DEFAULT 1,
          \`digestWhatsapp\` TINYINT(1) DEFAULT 0,
          \`digestEmail\` TINYINT(1) DEFAULT 1,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX \`idx_notif_pref_user_id\` (\`user_id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`JOB_ALERT\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`user_id\` VARCHAR(36) NOT NULL,
          \`title\` VARCHAR(255) NOT NULL,
          \`location\` VARCHAR(255) NULL,
          \`salary\` VARCHAR(255) NULL,
          \`frequency\` VARCHAR(50) DEFAULT 'daily',
          \`is_active\` TINYINT(1) DEFAULT 1,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX \`idx_ja_user_id\` (\`user_id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`SAVED_JOBS\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`candidate_id\` VARCHAR(36) NOT NULL,
          \`job_id\` VARCHAR(36) NOT NULL,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX \`idx_saved_jobs_candidate\` (\`candidate_id\`),
          INDEX \`idx_saved_jobs_job\` (\`job_id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

const INITIAL_BENEFITS = [
        'Health Insurance',
        'Paid Leave',
        'Performance Bonus',
        'Work From Home',
        'Flexible Hours',
        'Provident Fund',
        'Travel Allowance',
        'Meal Allowance',
        'ESOPs / Equity',
        'Life Insurance',
        'Parental Leave',
        'Wellness & Therapy Support',
        'Learning & Development Allowance'
      ];

      for (const bName of INITIAL_BENEFITS) {
        const bId = 'bm-' + bName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        await connection.query(
          'INSERT IGNORE INTO BENEFIT_MASTER (id, name, category, is_active) VALUES (?, ?, ?, 1)',
          [bId, bName, 'Standard']
        );
      }
      console.log('✅ Checked and verified BENEFIT_MASTER and JOB_BENEFIT tables.');
    } catch (e) {
      console.warn('Notice checking/seeding BENEFIT_MASTER and JOB_BENEFIT tables:', e.message);
    }

    // Ensure RBAC & Recruitment tables exist
    try {
      // 1. Ensure USERS role column can hold dynamic roles (director, bd_lead, tl_coordinator, recruiter, etc.)
      try {
        await connection.query("ALTER TABLE `USERS` MODIFY COLUMN `role` VARCHAR(50) NOT NULL");
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE `USERS` ADD COLUMN `name` VARCHAR(255) NULL");
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE `USERS` ADD COLUMN `reporting_user_id` VARCHAR(36) NULL");
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE `USERS` ADD COLUMN `profile_photo_url` VARCHAR(500) NULL");
      } catch (_) {}

      // 2. ROLES Master Table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`ROLES\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`role_key\` VARCHAR(50) NOT NULL UNIQUE,
          \`display_name\` VARCHAR(100) NOT NULL,
          \`description\` TEXT,
          \`is_system\` TINYINT(1) DEFAULT 0,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 3. ROLE_PERMISSIONS Matrix Table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`ROLE_PERMISSIONS\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`role_key\` VARCHAR(50) NOT NULL,
          \`module\` VARCHAR(50) NOT NULL,
          \`action\` VARCHAR(50) NOT NULL,
          \`is_granted\` TINYINT(1) DEFAULT 1,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY \`uk_role_mod_act\` (\`role_key\`, \`module\`, \`action\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 4. TEAMS Table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`TEAMS\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`name\` VARCHAR(100) NOT NULL UNIQUE,
          \`lead_user_id\` VARCHAR(36) NULL,
          \`description\` TEXT,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 5. USER_ASSIGNMENTS (Team membership & client/job scope)
      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`USER_ASSIGNMENTS\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`user_id\` VARCHAR(36) NOT NULL,
          \`team_id\` VARCHAR(36) NULL,
          \`assigned_client_id\` VARCHAR(36) NULL,
          \`assigned_job_id\` VARCHAR(36) NULL,
          \`scope_type\` VARCHAR(50) DEFAULT 'scoped',
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX \`idx_ua_user\` (\`user_id\`),
          INDEX \`idx_ua_team\` (\`team_id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 6. LEADS Table (BD Lead pipeline)
      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`LEADS\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`company_name\` VARCHAR(255) NOT NULL,
          \`contact_person\` VARCHAR(255) NOT NULL,
          \`email\` VARCHAR(255) NOT NULL,
          \`phone\` VARCHAR(50) NULL,
          \`industry\` VARCHAR(100) NULL,
          \`location\` VARCHAR(255) NULL,
          \`source\` VARCHAR(100) DEFAULT 'Direct',
          \`status\` VARCHAR(50) DEFAULT 'NEW',
          \`notes\` TEXT NULL,
          \`follow_up_date\` DATE NULL,
          \`assigned_bd_user_id\` VARCHAR(36) NULL,
          \`handed_over_to_user_id\` VARCHAR(36) NULL,
          \`handover_notes\` TEXT NULL,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX \`idx_lead_status\` (\`status\`),
          INDEX \`idx_lead_bd\` (\`assigned_bd_user_id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 7. CANDIDATE_SHARING Table (Workflow: Propose -> TL Review -> Director Approve + Candidate Consent -> Token)
      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`CANDIDATE_SHARING\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`candidate_id\` VARCHAR(36) NOT NULL,
          \`client_id\` VARCHAR(36) NULL,
          \`job_id\` VARCHAR(36) NULL,
          \`share_token\` VARCHAR(64) NOT NULL UNIQUE,
          \`status\` VARCHAR(50) DEFAULT 'PROPOSED',
          \`candidate_consent\` TINYINT(1) DEFAULT 0,
          \`consent_notes\` VARCHAR(255) NULL,
          \`proposed_by_user_id\` VARCHAR(36) NOT NULL,
          \`tl_reviewed_by_user_id\` VARCHAR(36) NULL,
          \`approved_by_user_id\` VARCHAR(36) NULL,
          \`share_scope\` TEXT NULL,
          \`expires_at\` TIMESTAMP NULL,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX \`idx_share_candidate\` (\`candidate_id\`),
          INDEX \`idx_share_token\` (\`share_token\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 8. Safely enhance EMPLOYER_ENQUIRY for Contact Us & Executive Service enquiries
      try {
        await connection.query("ALTER TABLE `EMPLOYER_ENQUIRY` MODIFY COLUMN `employer_id` VARCHAR(36) NULL");
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE `EMPLOYER_ENQUIRY` MODIFY COLUMN `job_id` VARCHAR(36) NULL");
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE `EMPLOYER_ENQUIRY` MODIFY COLUMN `application_id` VARCHAR(36) NULL");
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE `EMPLOYER_ENQUIRY` MODIFY COLUMN `status` VARCHAR(50) DEFAULT 'NEW'");
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE `EMPLOYER_ENQUIRY` ADD COLUMN `assigned_to_user_id` VARCHAR(36) NULL AFTER `status`");
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE `EMPLOYER_ENQUIRY` ADD COLUMN `contact_name` VARCHAR(255) NULL");
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE `EMPLOYER_ENQUIRY` ADD COLUMN `contact_email` VARCHAR(255) NULL");
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE `EMPLOYER_ENQUIRY` ADD COLUMN `contact_phone` VARCHAR(50) NULL");
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE `EMPLOYER_ENQUIRY` ADD COLUMN `company_name` VARCHAR(255) NULL");
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE `EMPLOYER_ENQUIRY` ADD COLUMN `subject` VARCHAR(255) NULL");
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE `EMPLOYER_ENQUIRY` ADD COLUMN `openings_count` INT NULL");
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE `EMPLOYER_ENQUIRY` ADD COLUMN `location` VARCHAR(255) NULL");
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE `EMPLOYER_ENQUIRY` ADD COLUMN `notes` TEXT NULL");
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE `EMPLOYER_ENQUIRY` ADD COLUMN `follow_up_date` DATE NULL");
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE `EMPLOYER_ENQUIRY` ADD COLUMN `source` VARCHAR(50) DEFAULT 'EMPLOYER_PORTAL'");
      } catch (_) {}

      // 9. Safely enhance JOB for Private Executive Search & Assignments
      try {
        await connection.query("ALTER TABLE `JOB` ADD COLUMN `is_internal_only` TINYINT(1) DEFAULT 0");
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE `JOB` ADD COLUMN `assigned_recruiter_id` VARCHAR(36) NULL");
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE `JOB` ADD COLUMN `internal_notes` TEXT NULL");
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE `JOB` ADD COLUMN `category_id` VARCHAR(36) NULL");
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE `JOB` ADD COLUMN `seniority_level` VARCHAR(100) DEFAULT 'Mid Level'");
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE `JOB` ADD COLUMN `fresher_allowed` TINYINT(1) DEFAULT 0");
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE `JOB` ADD COLUMN `min_qualification` VARCHAR(100) NULL");
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE `JOB` ADD COLUMN `degree` VARCHAR(100) NULL");
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE `JOB` ADD COLUMN `specialization` VARCHAR(100) NULL");
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE `JOB` ADD COLUMN `notice_period` VARCHAR(100) NULL");
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE `JOB` ADD COLUMN `salary_period` VARCHAR(50) DEFAULT 'Per Year'");
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE `JOB` ADD COLUMN `salary_type` VARCHAR(50) DEFAULT 'CTC'");
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE `JOB` ADD COLUMN `application_deadline` DATE NULL");
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE `JOB` ADD COLUMN `benefits` TEXT NULL");
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE `JOB` ADD COLUMN `keywords` TEXT NULL");
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE `JOB` ADD COLUMN `country` VARCHAR(100) NULL");
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE `JOB` ADD COLUMN `state` VARCHAR(100) NULL");
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE `JOB` ADD COLUMN `city` VARCHAR(100) NULL");
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE `JOB` ADD COLUMN `locality` VARCHAR(255) NULL");
      } catch (_) {}

      // 10. RECRUITMENT_COMMERCIALS Table (Quoted charges, payments, Director verification)
      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`RECRUITMENT_COMMERCIALS\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`client_id\` VARCHAR(36) NULL,
          \`job_id\` VARCHAR(36) NULL,
          \`enquiry_id\` VARCHAR(36) NULL,
          \`quoted_amount\` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
          \`currency\` VARCHAR(10) DEFAULT 'INR',
          \`commercial_status\` VARCHAR(50) DEFAULT 'QUOTED',
          \`payment_status\` VARCHAR(50) DEFAULT 'NOT_QUOTED',
          \`payment_received_at\` TIMESTAMP NULL,
          \`transaction_ref\` VARCHAR(255) NULL,
          \`notes\` TEXT NULL,
          \`created_by_user_id\` VARCHAR(36) NOT NULL,
          \`verified_by_user_id\` VARCHAR(36) NULL,
          \`verified_at\` TIMESTAMP NULL,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX \`idx_rc_client\` (\`client_id\`),
          INDEX \`idx_rc_job\` (\`job_id\`),
          INDEX \`idx_rc_status\` (\`payment_status\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 11. Safely enhance CANDIDATE_SHARING for commercial payment gating
      try {
        await connection.query("ALTER TABLE `CANDIDATE_SHARING` ADD COLUMN `payment_verified` TINYINT(1) DEFAULT 0");
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE `CANDIDATE_SHARING` ADD COLUMN `payment_exception_approved` TINYINT(1) DEFAULT 0");
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE `CANDIDATE_SHARING` ADD COLUMN `payment_exception_reason` VARCHAR(255) NULL");
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE `CANDIDATE_SHARING` ADD COLUMN `payment_exception_by_user_id` VARCHAR(36) NULL");
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE `USERS` ADD COLUMN `reset_token` VARCHAR(255) NULL");
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE `USERS` ADD COLUMN `reset_token_expires` DATETIME NULL");
      } catch (_) {}

      // 9. Seed the 4 Initial Roles
      const INITIAL_ROLES = [
        { key: 'director', name: 'Director (Main Admin)', desc: 'Full authority across all modules, final candidate sharing approval, permission configuration', sys: 1 },
        { key: 'bd_lead', name: 'BD Lead', desc: 'Manage business development leads, follow-ups, contact history, and handover to TL Coordinator', sys: 1 },
        { key: 'tl_coordinator', name: 'TL / Client Coordinator', desc: 'Oversee assigned clients, allocate recruitment tasks, track interviews, manage enquiries and coordinate candidate submissions', sys: 1 },
        { key: 'recruiter', name: 'Recruiter', desc: 'Source and screen candidates for assigned jobs, log candidate activity, submit recommendations for review', sys: 1 }
      ];

      for (const r of INITIAL_ROLES) {
        await connection.query(
          'INSERT INTO ROLES (id, role_key, display_name, description, is_system) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE display_name = VALUES(display_name), description = VALUES(description)',
          ['role-' + r.key, r.key, r.name, r.desc, r.sys]
        );
      }

      // 10. Seed Permissions for the 4 Initial Roles
      const ALL_MODULES = [
        'dashboard', 'candidates', 'jobs', 'applications', 'candidate_sharing',
        'enquiries', 'employers', 'leads', 'team', 'roles', 'activity_log'
      ];
      const ALL_ACTIONS = ['view', 'create', 'edit', 'delete', 'assign', 'approve', 'share', 'export'];

      // Director has all permissions
      for (const mod of ALL_MODULES) {
        for (const act of ALL_ACTIONS) {
          await connection.query(
            'INSERT IGNORE INTO ROLE_PERMISSIONS (id, role_key, module, action, is_granted) VALUES (?, ?, ?, ?, 1)',
            ['perm-dir-' + mod + '-' + act, 'director', mod, act]
          );
        }
      }

      // BD Lead permissions
      const BD_PERMS = [
        { mod: 'dashboard', act: 'view' },
        { mod: 'leads', act: 'view' },
        { mod: 'leads', act: 'create' },
        { mod: 'leads', act: 'edit' },
        { mod: 'leads', act: 'assign' },
        { mod: 'activity_log', act: 'view' }
      ];
      for (const p of BD_PERMS) {
        await connection.query(
          'INSERT IGNORE INTO ROLE_PERMISSIONS (id, role_key, module, action, is_granted) VALUES (?, ?, ?, ?, 1)',
          ['perm-bd-' + p.mod + '-' + p.act, 'bd_lead', p.mod, p.act]
        );
      }

      // TL Coordinator permissions
      const TL_PERMS = [
        { mod: 'dashboard', act: 'view' },
        { mod: 'candidates', act: 'view' },
        { mod: 'candidates', act: 'edit' },
        { mod: 'jobs', act: 'view' },
        { mod: 'jobs', act: 'assign' },
        { mod: 'applications', act: 'view' },
        { mod: 'applications', act: 'edit' },
        { mod: 'candidate_sharing', act: 'view' },
        { mod: 'candidate_sharing', act: 'edit' },
        { mod: 'enquiries', act: 'view' },
        { mod: 'enquiries', act: 'edit' },
        { mod: 'enquiries', act: 'assign' },
        { mod: 'employers', act: 'view' },
        { mod: 'activity_log', act: 'view' }
      ];
      for (const p of TL_PERMS) {
        await connection.query(
          'INSERT IGNORE INTO ROLE_PERMISSIONS (id, role_key, module, action, is_granted) VALUES (?, ?, ?, ?, 1)',
          ['perm-tl-' + p.mod + '-' + p.act, 'tl_coordinator', p.mod, p.act]
        );
      }

      // Recruiter permissions
      const REC_PERMS = [
        { mod: 'dashboard', act: 'view' },
        { mod: 'candidates', act: 'view' },
        { mod: 'candidates', act: 'create' },
        { mod: 'candidates', act: 'edit' },
        { mod: 'jobs', act: 'view' },
        { mod: 'applications', act: 'view' },
        { mod: 'applications', act: 'edit' },
        { mod: 'candidate_sharing', act: 'view' },
        { mod: 'candidate_sharing', act: 'create' },
        { mod: 'activity_log', act: 'view' }
      ];
      for (const p of REC_PERMS) {
        await connection.query(
          'INSERT IGNORE INTO ROLE_PERMISSIONS (id, role_key, module, action, is_granted) VALUES (?, ?, ?, ?, 1)',
          ['perm-rec-' + p.mod + '-' + p.act, 'recruiter', p.mod, p.act]
        );
      }

      // 11. Seed Baseline Team Accounts for all 4 Roles (Dev/Test only)
      if (process.env.NODE_ENV !== 'production') {
        const bcrypt = require('bcryptjs');
        const seedHash = await bcrypt.hash('password123', 10);

        const SEED_STAFF = [
          { id: 'usr-director-001', email: 'director@vakancy.com', role: 'director', phone: '+91 98765 00001', is_main_admin: 1, name: 'Tosif Abbasi', reporting_user_id: null },
          { id: 'usr-bdlead-001', email: 'bdlead@vakancy.com', role: 'bd_lead', phone: '+91 98765 00002', is_main_admin: 0, name: 'Devang', reporting_user_id: 'usr-director-001' },
          { id: 'usr-tl-001', email: 'tl@vakancy.com', role: 'tl_coordinator', phone: '+91 98765 00003', is_main_admin: 0, name: 'TL Coordinator', reporting_user_id: 'usr-director-001' },
          { id: 'usr-recruiter-001', email: 'recruiter@vakancy.com', role: 'recruiter', phone: '+91 98765 00004', is_main_admin: 0, name: 'Recruiter', reporting_user_id: 'usr-tl-001' }
        ];

        for (const s of SEED_STAFF) {
          const [existing] = await connection.query('SELECT id, name, reporting_user_id FROM USERS WHERE LOWER(email) = ?', [s.email]);
          if (!existing || existing.length === 0) {
            await connection.query(
              'INSERT INTO USERS (id, email, password_hash, role, phone, is_main_admin, is_active, name, reporting_user_id) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)',
              [s.id, s.email, seedHash, s.role, s.phone, s.is_main_admin, s.name, s.reporting_user_id]
            );
          } else {
            // Populate name or initial reporting head if not already set
            await connection.query(
              'UPDATE USERS SET name = COALESCE(NULLIF(name, ""), ?) WHERE id = ?',
              [s.name, existing[0].id]
            );
            if (s.reporting_user_id) {
              await connection.query(
                'UPDATE USERS SET reporting_user_id = COALESCE(reporting_user_id, ?) WHERE id = ? AND (reporting_user_id IS NULL OR reporting_user_id = "")',
                [s.reporting_user_id, existing[0].id]
              );
            }
          }
        }
      }

      // Seed a default team
      await connection.query(
        'INSERT IGNORE INTO TEAMS (id, name, lead_user_id, description) VALUES (?, ?, ?, ?)',
        ['team-core-alpha', 'Core Recruitment Alpha', 'usr-tl-001', 'Primary executive search and technical recruitment team']
      );

      await connection.query(
        'INSERT IGNORE INTO USER_ASSIGNMENTS (id, user_id, team_id, scope_type) VALUES (?, ?, ?, ?)',
        ['seed-recruiter-team-assignment', 'usr-recruiter-001', 'team-core-alpha', 'scoped']
      );

      console.log('✅ Checked and verified RBAC tables (ROLES, ROLE_PERMISSIONS, TEAMS, USER_ASSIGNMENTS, LEADS, CANDIDATE_SHARING) and seeded 4 roles.');
    } catch (e) {
      console.warn('Notice checking/seeding RBAC tables:', e.message);
    }

    connection.release();
    isUsingFallback = false;
    return true;
  } catch (err) {
    console.error(`❌ [FATAL] MySQL connection failed (${err.message}).`);
    console.error('Check DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, and DB_NAME in backend/.env file.');

    if (process.env.USE_IN_MEMORY_DB === 'true') {
      console.warn('⚠️ Explicit opt-in USE_IN_MEMORY_DB=true is enabled. Switching to In-Memory fallback.');
      isUsingFallback = true;
      loadMemorySeed();
      return false;
    }

    throw new Error(`MySQL Connection Failure: ${err.message}`);
  }
}

// Universal query function compatible with MySQL driver
async function query(sql, params = []) {
  if (!isUsingFallback && pool) {
    try {
      const [rows] = await pool.query(sql, params);
      return rows;
    } catch (err) {
      console.error('MySQL Query Error:', err.message);
      throw err;
    }
  }

  // Handle fallback in-memory query evaluation
  return executeInMemoryQuery(sql, params);
}

// In-Memory SQL Evaluator for fallback
function executeInMemoryQuery(sql, params = []) {
  const cleanSql = sql.trim().replace(/\s+/g, ' ');
  const upperSql = cleanSql.toUpperCase();

  // SELECT query parsing
  if (upperSql.startsWith('SELECT')) {
    const tableMatch = cleanSql.match(/FROM `?(\w+)`?/i);
    if (!tableMatch) return [];
    const tableName = tableMatch[1].toUpperCase();
    const tableData = memoryDb[tableName] || [];

    let results = [...tableData];

    // Simple WHERE matching for equality/IN
    const whereMatch = cleanSql.match(/WHERE (.+?)(?:ORDER BY|LIMIT|$)/i);
    if (whereMatch) {
      const whereClause = whereMatch[1];
      // Support both AND / OR basic where clauses
      results = results.filter(row => {
        if (whereClause.includes(' OR ')) {
          const orParts = whereClause.split(/\s+OR\s+/i);
          return orParts.some((part, pIdx) => {
            const m = part.match(/(?:LOWER\(`?(\w+)`?\)|`?(\w+)`?)\s*=\s*(\?|'[^\']+'|\d+)/i);
            if (m) {
              const col = m[1] || m[2];
              let val = m[3];
              if (val === '?') {
                val = params[pIdx];
              } else if (val.startsWith("'") && val.endsWith("'")) {
                val = val.slice(1, -1);
              }
              const isLower = part.toUpperCase().includes('LOWER(');
              if (isLower) {
                return String(row[col] || '').toLowerCase() === String(val || '').toLowerCase();
              }
              return String(row[col]) === String(val);
            }
            return false;
          });
        }

        if (whereClause.includes('=')) {
          let paramIdx = 0;
          const parts = whereClause.split(/\s+AND\s+/i);
          return parts.every(part => {
            const m = part.match(/(?:LOWER\(`?(\w+)`?\)|`?(\w+)`?)\s*=\s*(\?|'[^\']+'|\d+)/i);
            if (m) {
              const col = m[1] || m[2];
              let val = m[3];
              if (val === '?') {
                val = params[paramIdx++];
              } else if (val.startsWith("'") && val.endsWith("'")) {
                val = val.slice(1, -1);
              }
              const isLower = part.toUpperCase().includes('LOWER(');
              if (isLower) {
                return String(row[col] || '').toLowerCase() === String(val || '').toLowerCase();
              }
              return String(row[col]) === String(val);
            }
            return true;
          });
        }
        return true;
      });
    }

    return results;
  }

  // INSERT query parsing
  if (upperSql.startsWith('INSERT INTO')) {
    const match = cleanSql.match(/INSERT INTO `?(\w+)`?\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
    if (match) {
      const tableName = match[1].toUpperCase();
      const cols = match[2].split(',').map(c => c.trim().replace(/`/g, ''));
      const valTokens = match[3].split(',').map(v => v.trim());
      const obj = {};
      let paramIdx = 0;
      cols.forEach((col, i) => {
        const token = valTokens[i];
        if (token === '?') {
          obj[col] = params[paramIdx++] !== undefined ? params[paramIdx - 1] : null;
        } else if (token !== undefined) {
          let cleanVal = token;
          if ((cleanVal.startsWith("'") && cleanVal.endsWith("'")) || (cleanVal.startsWith('"') && cleanVal.endsWith('"'))) {
            cleanVal = cleanVal.slice(1, -1);
          } else if (!isNaN(cleanVal) && cleanVal !== '') {
            cleanVal = Number(cleanVal);
          }
          obj[col] = cleanVal;
        } else {
          obj[col] = params[paramIdx++] !== undefined ? params[paramIdx - 1] : null;
        }
      });

      if (!obj.created_at) {
        obj.created_at = new Date().toISOString();
      }

      if (memoryDb[tableName]) {
        memoryDb[tableName].unshift(obj);
      }
      return { affectedRows: 1, insertId: obj.id };
    }
  }

  // UPDATE query parsing
  if (upperSql.startsWith('UPDATE')) {
    const match = cleanSql.match(/UPDATE `?(\w+)`?\s+SET\s+(.+?)\s+WHERE\s+`?(\w+)`?\s*=\s*\?/i);
    if (match) {
      const tableName = match[1].toUpperCase();
      const setClause = match[2];
      const whereCol = match[3];
      const targetVal = params[params.length - 1];

      const setAssignments = setClause.split(',').map(s => s.trim().split(/\s*=\s*/)[0].replace(/`/g, ''));
      const tableData = memoryDb[tableName] || [];
      let updatedCount = 0;

      tableData.forEach(row => {
        if (String(row[whereCol]) === String(targetVal)) {
          setAssignments.forEach((col, idx) => {
            row[col] = params[idx];
          });
          updatedCount++;
        }
      });
      return { affectedRows: updatedCount };
    }
  }

  // DELETE query parsing
  if (upperSql.startsWith('DELETE FROM')) {
    const match = cleanSql.match(/DELETE FROM `?(\w+)`?\s+WHERE\s+`?(\w+)`?\s*=\s*\?/i);
    if (match) {
      const tableName = match[1].toUpperCase();
      const col = match[2];
      const val = params[0];

      if (memoryDb[tableName]) {
        const initialLen = memoryDb[tableName].length;
        memoryDb[tableName] = memoryDb[tableName].filter(row => String(row[col]) !== String(val));
        return { affectedRows: initialLen - memoryDb[tableName].length };
      }
    }
  }

  return [];
}

// Database initialization managed by server startup
module.exports = {
  query,
  initDB,
  memoryDb,
  isFallback: () => isUsingFallback
};
