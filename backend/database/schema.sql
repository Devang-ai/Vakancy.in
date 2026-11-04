SET FOREIGN_KEY_CHECKS = 0;

/* MySQL Schema for Vakancy Recruitment & Job Portal MVP */

/* Based strictly on Finalized ERD */

/* 1. USERS */

CREATE TABLE IF NOT EXISTS `USERS` (

  `id` VARCHAR(36) PRIMARY KEY,

  `email` VARCHAR(255) NOT NULL UNIQUE,

  `password_hash` VARCHAR(255) NOT NULL,

  `role` ENUM('candidate', 'employer', 'recruiter', 'admin', 'main_admin', 'hr_manager', 'hr_executive', 'viewer') NOT NULL,

  `phone` VARCHAR(50),

  `is_main_admin` BOOLEAN DEFAULT FALSE,

  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  `is_active` BOOLEAN DEFAULT TRUE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* 2. CANDIDATES */

CREATE TABLE IF NOT EXISTS `CANDIDATES` (

  `id` VARCHAR(36) PRIMARY KEY,

  `user_id` VARCHAR(36) NOT NULL,

  `name` VARCHAR(255) NOT NULL,

  `dob` DATE,

  `current_location` VARCHAR(255),

  `profile_type` ENUM('fresher', 'experienced', 'executive') DEFAULT 'experienced',

  `professional_headline` VARCHAR(150),

  `current_organization` VARCHAR(150),

  `current_designation` VARCHAR(100),

  `total_experience` DECIMAL(4,1) DEFAULT 0,

  `professional_summary` TEXT,

  `preferred_location` VARCHAR(255),

  `preferred_salary` VARCHAR(255),

  `is_premium` BOOLEAN DEFAULT FALSE,

  `onboarding_step` INT DEFAULT 1,

  `is_onboarding_completed` BOOLEAN DEFAULT FALSE,

  `portfolio_url` VARCHAR(255),

  `linkedin_url` VARCHAR(255),

  `facebook_url` VARCHAR(255),

  `instagram_url` VARCHAR(255),

  `twitter_url` VARCHAR(255),

  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (`user_id`) REFERENCES `USERS`(`id`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* 2.1 CANDIDATE_PROJECT */

CREATE TABLE IF NOT EXISTS `CANDIDATE_PROJECT` (

  `id` VARCHAR(36) PRIMARY KEY,

  `candidate_id` VARCHAR(36) NOT NULL,

  `project_name` VARCHAR(255) NOT NULL,

  `role` VARCHAR(255),

  `description` TEXT,

  `technologies` VARCHAR(500),

  `start_date` DATE,

  `end_date` DATE,

  `project_url` VARCHAR(255),

  `github_url` VARCHAR(255),

  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (`candidate_id`) REFERENCES `CANDIDATES`(`id`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* 3. CANDIDATE_EXPERIENCE */

CREATE TABLE IF NOT EXISTS `CANDIDATE_EXPERIENCE` (

  `id` VARCHAR(36) PRIMARY KEY,

  `candidate_id` VARCHAR(36) NOT NULL,

  `organization` VARCHAR(255) NOT NULL,

  `designation` VARCHAR(255) NOT NULL,

  `from_date` DATE NOT NULL,

  `to_date` DATE,

  `is_currently_working` BOOLEAN DEFAULT FALSE,

  `reason_for_leaving` VARCHAR(255),

  `key_achievements` TEXT,

  FOREIGN KEY (`candidate_id`) REFERENCES `CANDIDATES`(`id`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* 4. CANDIDATE_EDUCATION */

CREATE TABLE IF NOT EXISTS `CANDIDATE_EDUCATION` (

  `id` VARCHAR(36) PRIMARY KEY,

  `candidate_id` VARCHAR(36) NOT NULL,

  `degree` VARCHAR(255) NOT NULL,

  `institution` VARCHAR(255) NOT NULL,

  `specialization` VARCHAR(150),

  `year` INT NOT NULL,

  `cgpa` DECIMAL(5,2),

  FOREIGN KEY (`candidate_id`) REFERENCES `CANDIDATES`(`id`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* CANDIDATE_SKILL moved below SKILL master */

/* 6. CANDIDATE_EXEC_DETAILS */

CREATE TABLE IF NOT EXISTS `CANDIDATE_EXEC_DETAILS` (

  `id` VARCHAR(36) PRIMARY KEY,

  `candidate_id` VARCHAR(36) NOT NULL UNIQUE,

  `team_size` INT DEFAULT 0,

  `reporting_to` VARCHAR(255),

  `passport_number` VARCHAR(100),

  `passport_expiry` DATE,

  `notice_period` VARCHAR(100),

  `current_ctc` DECIMAL(15,2),

  `expected_ctc` DECIMAL(15,2),

  FOREIGN KEY (`candidate_id`) REFERENCES `CANDIDATES`(`id`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* 7. CANDIDATE_RESUME */

CREATE TABLE IF NOT EXISTS `CANDIDATE_RESUME` (

  `id` VARCHAR(36) PRIMARY KEY,

  `candidate_id` VARCHAR(36) NOT NULL,

  `resume_title` VARCHAR(255) NOT NULL,

  `file_name` VARCHAR(255),

  `cloudinary_asset_id` VARCHAR(255),

  `cloudinary_public_id` VARCHAR(255),

  `file_url` TEXT NOT NULL,

  `file_type` VARCHAR(50),

  `file_size` INT,

  `is_primary` BOOLEAN DEFAULT FALSE,

  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (`candidate_id`) REFERENCES `CANDIDATES`(`id`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* 8. CANDIDATE_TAG */

CREATE TABLE IF NOT EXISTS `CANDIDATE_TAG` (

  `id` VARCHAR(36) PRIMARY KEY,

  `candidate_id` VARCHAR(36) NOT NULL,

  `tag` VARCHAR(100) NOT NULL,

  FOREIGN KEY (`candidate_id`) REFERENCES `CANDIDATES`(`id`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* 9. PREMIUM_PROFILE */

CREATE TABLE IF NOT EXISTS `PREMIUM_PROFILE` (

  `id` VARCHAR(36) PRIMARY KEY,

  `candidate_id` VARCHAR(36) NOT NULL,

  `start_date` DATE NOT NULL,

  `end_date` DATE NOT NULL,

  `status` ENUM('active', 'expired', 'cancelled') DEFAULT 'active',

  FOREIGN KEY (`candidate_id`) REFERENCES `CANDIDATES`(`id`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* 10. EMPLOYERS */

CREATE TABLE IF NOT EXISTS `EMPLOYERS` (

  `id` VARCHAR(36) PRIMARY KEY,

  `user_id` VARCHAR(36) NOT NULL,

  `company_name` VARCHAR(255) NOT NULL,

  `company_type` VARCHAR(100),

  `industry` VARCHAR(255),

  `website` VARCHAR(255),

  `country` VARCHAR(100),

  `state` VARCHAR(100),

  `city` VARCHAR(100),

  `address` TEXT,

  `pincode` VARCHAR(20),

  `location` VARCHAR(255),

  `company_size` VARCHAR(100),

  `about` TEXT,

  `tagline` VARCHAR(255),

  `logo_url` MEDIUMTEXT,

  `founded_year` VARCHAR(10),

  `official_email` VARCHAR(255),

  `official_phone` VARCHAR(50),

  `alt_phone` VARCHAR(50),

  `contact_person_name` VARCHAR(255),

  `contact_person_designation` VARCHAR(255),

  `contact_person_email` VARCHAR(255),

  `contact_person_phone` VARCHAR(50),

  `contact_email` VARCHAR(255),

  `contact_phone` VARCHAR(50),

  `linkedin_url` VARCHAR(255),

  `instagram_url` VARCHAR(255),

  `facebook_url` VARCHAR(255),

  `twitter_url` VARCHAR(255),

  `culture` TEXT,

  `perks` TEXT,

  `approval_status` ENUM('pending', 'approved', 'rejected') DEFAULT 'approved',

  `is_onboarding_completed` BOOLEAN DEFAULT FALSE,

  `onboarding_step` INT DEFAULT 1,

  FOREIGN KEY (`user_id`) REFERENCES `USERS`(`id`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* 11. CLIENT */

CREATE TABLE IF NOT EXISTS `CLIENT` (

  `id` VARCHAR(36) PRIMARY KEY,

  `name` VARCHAR(255) NOT NULL,

  `industry` VARCHAR(255),

  `contact_info` TEXT

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* 12. JOB */

CREATE TABLE IF NOT EXISTS `JOB` (

  `id` VARCHAR(36) PRIMARY KEY,

  `employer_id` VARCHAR(36),

  `client_id` VARCHAR(36),

  `title` VARCHAR(255) NOT NULL,

  `department` VARCHAR(100) DEFAULT 'General',

  `job_domain` VARCHAR(100) DEFAULT 'General',

  `keywords` TEXT,

  `employment_type` VARCHAR(100) DEFAULT 'Full Time',

  `workplace_type` VARCHAR(100) DEFAULT 'On-site',

  `seniority_level` VARCHAR(100) DEFAULT 'Mid Level',

  `openings_count` INT DEFAULT 1,

  `priority` VARCHAR(50) DEFAULT 'standard',

  `country` VARCHAR(100),

  `state` VARCHAR(100),

  `city` VARCHAR(100),

  `locality` VARCHAR(255),

  `location` VARCHAR(255) NOT NULL,

  `min_experience` DECIMAL(4,1) DEFAULT 0,

  `max_experience` DECIMAL(4,1) DEFAULT 0,

  `fresher_allowed` BOOLEAN DEFAULT FALSE,

  `min_qualification` VARCHAR(100),

  `degree` VARCHAR(100),

  `specialization` VARCHAR(100),

  `required_skills` TEXT,

  `description` TEXT,

  `responsibilities` TEXT,

  `requirements` TEXT,

  `benefits` TEXT,

  `screening_questions` TEXT,

  `status` ENUM('open', 'closed', 'draft') DEFAULT 'draft',

  `application_deadline` DATE,

  `notice_period` VARCHAR(100),

  `hiring_manager` VARCHAR(255),

  `min_salary` DECIMAL(15,2),

  `max_salary` DECIMAL(15,2),

  `salary_period` VARCHAR(50) DEFAULT 'Per Year',

  `currency` VARCHAR(10) DEFAULT 'INR',

  `salary_type` VARCHAR(50) DEFAULT 'CTC',

  `created_by_user_id` VARCHAR(36),

  `created_by_type` VARCHAR(50) DEFAULT 'EMPLOYER',

  `source_type` VARCHAR(50) DEFAULT 'EMPLOYER_POSTED',

  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  `category_id` VARCHAR(36) NULL,
  `priority` VARCHAR(50) DEFAULT 'standard',
  `is_recommended` TINYINT(1) DEFAULT 0,
  `allow_candidate_access` TINYINT(1) DEFAULT 1,
  `is_internal_only` TINYINT(1) DEFAULT 0,
  `is_archived` TINYINT(1) DEFAULT 0,
  `archive_reason` TEXT NULL,
  `archived_at` TIMESTAMP NULL,
  `restored_at` TIMESTAMP NULL,
  `restore_note` TEXT NULL,
  `manual_company_name` VARCHAR(255) NULL,
  `manual_contact_person` VARCHAR(255) NULL,
  `manual_contact_phone` VARCHAR(50) NULL,
  `manual_contact_email` VARCHAR(255) NULL,
  `manual_company_website` VARCHAR(255) NULL,
  `last_updated_by_user_id` VARCHAR(36) NULL,
  `lead_id` VARCHAR(36) NULL,
  `enquiry_id` VARCHAR(36) NULL,

  FOREIGN KEY (`employer_id`) REFERENCES `EMPLOYERS`(`id`) ON DELETE SET NULL,

  FOREIGN KEY (`client_id`) REFERENCES `CLIENT`(`id`) ON DELETE SET NULL

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* 13. APPLICATION */

CREATE TABLE IF NOT EXISTS `APPLICATION` (

  `id` VARCHAR(36) PRIMARY KEY,

  `job_id` VARCHAR(36) NOT NULL,

  `candidate_id` VARCHAR(36) NOT NULL,

  `status` ENUM('applied', 'reviewing', 'shortlisted', 'rejected', 'hired') DEFAULT 'applied',

  `applied_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY `uk_job_candidate` (`job_id`, `candidate_id`),

  FOREIGN KEY (`job_id`) REFERENCES `JOB`(`id`) ON DELETE CASCADE,

  FOREIGN KEY (`candidate_id`) REFERENCES `CANDIDATES`(`id`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* 14. ATS_STAGE */

CREATE TABLE IF NOT EXISTS `ATS_STAGE` (

  `id` VARCHAR(36) PRIMARY KEY,

  `name` VARCHAR(100) NOT NULL,

  `description` VARCHAR(255),

  `order` INT NOT NULL,

  `is_active` BOOLEAN DEFAULT TRUE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* 15. CANDIDATE_PIPELINE */

CREATE TABLE IF NOT EXISTS `CANDIDATE_PIPELINE` (

  `id` VARCHAR(36) PRIMARY KEY,

  `candidate_id` VARCHAR(36) NOT NULL,

  `job_id` VARCHAR(36),

  `client_id` VARCHAR(36),

  `stage_id` VARCHAR(36) NOT NULL,

  `recruiter_id` VARCHAR(36) NOT NULL,

  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY `uk_cand_job` (`candidate_id`, `job_id`),

  FOREIGN KEY (`candidate_id`) REFERENCES `CANDIDATES`(`id`) ON DELETE CASCADE,

  FOREIGN KEY (`job_id`) REFERENCES `JOB`(`id`) ON DELETE SET NULL,

  FOREIGN KEY (`client_id`) REFERENCES `CLIENT`(`id`) ON DELETE SET NULL,

  FOREIGN KEY (`stage_id`) REFERENCES `ATS_STAGE`(`id`) ON DELETE CASCADE,

  FOREIGN KEY (`recruiter_id`) REFERENCES `USERS`(`id`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* 16. CANDIDATE_NOTE */

CREATE TABLE IF NOT EXISTS `CANDIDATE_NOTE` (

  `id` VARCHAR(36) PRIMARY KEY,

  `candidate_id` VARCHAR(36) NOT NULL,

  `author_id` VARCHAR(36) NOT NULL,

  `pipeline_id` VARCHAR(36),

  `note` TEXT NOT NULL,

  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (`candidate_id`) REFERENCES `CANDIDATES`(`id`) ON DELETE CASCADE,

  FOREIGN KEY (`author_id`) REFERENCES `USERS`(`id`) ON DELETE CASCADE,

  FOREIGN KEY (`pipeline_id`) REFERENCES `CANDIDATE_PIPELINE`(`id`) ON DELETE SET NULL

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* 17. PIPELINE_STAGE_HISTORY */

CREATE TABLE IF NOT EXISTS `PIPELINE_STAGE_HISTORY` (

  `id` VARCHAR(36) PRIMARY KEY,

  `pipeline_id` VARCHAR(36) NOT NULL,

  `from_stage_id` VARCHAR(36),

  `to_stage_id` VARCHAR(36) NOT NULL,

  `moved_by` VARCHAR(36) NOT NULL,

  `moved_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  `remarks` TEXT,

  FOREIGN KEY (`pipeline_id`) REFERENCES `CANDIDATE_PIPELINE`(`id`) ON DELETE CASCADE,

  FOREIGN KEY (`from_stage_id`) REFERENCES `ATS_STAGE`(`id`) ON DELETE SET NULL,

  FOREIGN KEY (`to_stage_id`) REFERENCES `ATS_STAGE`(`id`) ON DELETE CASCADE,

  FOREIGN KEY (`moved_by`) REFERENCES `USERS`(`id`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* 18. SUBSCRIPTION_PLAN */

CREATE TABLE IF NOT EXISTS `SUBSCRIPTION_PLAN` (

  `id` VARCHAR(36) PRIMARY KEY,

  `name` VARCHAR(255) NOT NULL,

  `price` DECIMAL(10,2) NOT NULL,

  `unlock_limit` INT NOT NULL,

  `duration_days` INT NOT NULL,

  `is_active` BOOLEAN DEFAULT TRUE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* 19. EMPLOYER_SUBSCRIPTION */

CREATE TABLE IF NOT EXISTS `EMPLOYER_SUBSCRIPTION` (

  `id` VARCHAR(36) PRIMARY KEY,

  `employer_id` VARCHAR(36) NOT NULL,

  `plan_id` VARCHAR(36) NOT NULL,

  `start_date` DATE NOT NULL,

  `end_date` DATE NOT NULL,

  `status` ENUM('active', 'expired', 'cancelled') DEFAULT 'active',

  FOREIGN KEY (`employer_id`) REFERENCES `EMPLOYERS`(`id`) ON DELETE CASCADE,

  FOREIGN KEY (`plan_id`) REFERENCES `SUBSCRIPTION_PLAN`(`id`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* 20. CANDIDATE_UNLOCK */

CREATE TABLE IF NOT EXISTS `CANDIDATE_UNLOCK` (

  `id` VARCHAR(36) PRIMARY KEY,

  `employer_id` VARCHAR(36) NOT NULL,

  `candidate_id` VARCHAR(36) NOT NULL,

  `subscription_id` VARCHAR(36) NOT NULL,

  `unlocked_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  `expires_at` DATETIME NOT NULL,

  FOREIGN KEY (`employer_id`) REFERENCES `EMPLOYERS`(`id`) ON DELETE CASCADE,

  FOREIGN KEY (`candidate_id`) REFERENCES `CANDIDATES`(`id`) ON DELETE CASCADE,

  FOREIGN KEY (`subscription_id`) REFERENCES `EMPLOYER_SUBSCRIPTION`(`id`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* 21. PAYMENT */

CREATE TABLE IF NOT EXISTS `PAYMENT` (

  `id` VARCHAR(36) PRIMARY KEY,

  `user_id` VARCHAR(36) NOT NULL,

  `subscription_id` VARCHAR(36),

  `premium_profile_id` VARCHAR(36),

  `unlock_id` VARCHAR(36),

  `amount` DECIMAL(10,2) NOT NULL,

  `payment_type` ENUM('employer_subscription', 'candidate_premium', 'candidate_unlock') NOT NULL,

  `status` ENUM('pending', 'completed', 'failed') DEFAULT 'pending',

  `razorpay_txn_id` VARCHAR(255),

  `paid_at` TIMESTAMP NULL,

  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (`user_id`) REFERENCES `USERS`(`id`) ON DELETE CASCADE,

  FOREIGN KEY (`subscription_id`) REFERENCES `EMPLOYER_SUBSCRIPTION`(`id`) ON DELETE SET NULL,

  FOREIGN KEY (`premium_profile_id`) REFERENCES `PREMIUM_PROFILE`(`id`) ON DELETE SET NULL,

  FOREIGN KEY (`unlock_id`) REFERENCES `CANDIDATE_UNLOCK`(`id`) ON DELETE SET NULL

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* 22. AI_REQUEST */

CREATE TABLE IF NOT EXISTS `AI_REQUEST` (

  `id` VARCHAR(36) PRIMARY KEY,

  `user_id` VARCHAR(36) NOT NULL,

  `type` ENUM('resume_builder', 'jd_generator') NOT NULL,

  `status` ENUM('pending', 'completed', 'failed') DEFAULT 'pending',

  `input_reference` TEXT,

  `output` TEXT,

  `model` VARCHAR(100) DEFAULT 'gemini-1.5-flash',

  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (`user_id`) REFERENCES `USERS`(`id`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* 23. NOTIFICATION */

CREATE TABLE IF NOT EXISTS `NOTIFICATION` (

  `id` VARCHAR(36) PRIMARY KEY,

  `user_id` VARCHAR(36) NOT NULL,

  `type` VARCHAR(100) NOT NULL,

  `title` VARCHAR(255) NOT NULL,

  `message` TEXT NOT NULL,

  `reference_type` VARCHAR(100),

  `reference_id` VARCHAR(36),

  `is_read` BOOLEAN DEFAULT FALSE,

  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (`user_id`) REFERENCES `USERS`(`id`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* 24. JOB_QUESTION */

CREATE TABLE IF NOT EXISTS `JOB_QUESTION` (

  `id` VARCHAR(36) PRIMARY KEY,

  `job_id` VARCHAR(36) NOT NULL,

  `question_text` TEXT NOT NULL,

  `question_type` VARCHAR(50) DEFAULT 'short_text',

  `options` TEXT,

  `is_required` BOOLEAN DEFAULT TRUE,

  `is_knockout` BOOLEAN DEFAULT FALSE,

  `ideal_answer` VARCHAR(255),

  `order_index` INT DEFAULT 0,

  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (`job_id`) REFERENCES `JOB`(`id`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* 25. EMPLOYER_ENQUIRY */

CREATE TABLE IF NOT EXISTS `EMPLOYER_ENQUIRY` (

  `id` VARCHAR(36) PRIMARY KEY,

  `employer_id` VARCHAR(36) NOT NULL,

  `job_id` VARCHAR(36) NOT NULL,

  `application_id` VARCHAR(36) NOT NULL,

  `enquiry_type` VARCHAR(100) NOT NULL,

  `message` TEXT,

  `status` ENUM('new', 'in_progress', 'resolved') DEFAULT 'new',

  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (`employer_id`) REFERENCES `EMPLOYERS`(`id`) ON DELETE CASCADE,

  FOREIGN KEY (`job_id`) REFERENCES `JOB`(`id`) ON DELETE CASCADE,

  FOREIGN KEY (`application_id`) REFERENCES `APPLICATION`(`id`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* 26. JOB_CATEGORY */

CREATE TABLE IF NOT EXISTS `JOB_CATEGORY` (

  `id` VARCHAR(36) PRIMARY KEY,

  `name` VARCHAR(255) NOT NULL,

  `slug` VARCHAR(255) NOT NULL UNIQUE,

  `icon` VARCHAR(100) DEFAULT 'Briefcase',

  `description` TEXT,

  `is_active` BOOLEAN DEFAULT TRUE,

  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* 27. SKILL */

CREATE TABLE IF NOT EXISTS `SKILL` (

  `id` VARCHAR(36) PRIMARY KEY,

  `name` VARCHAR(255) NOT NULL UNIQUE,

  `category` VARCHAR(100) DEFAULT 'General',

  `is_active` BOOLEAN DEFAULT TRUE,

  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* 27.5 CANDIDATE_SKILL */

CREATE TABLE IF NOT EXISTS `CANDIDATE_SKILL` (

  `id` VARCHAR(36) PRIMARY KEY,

  `candidate_id` VARCHAR(36) NOT NULL,

  `skill_id` VARCHAR(36) NOT NULL,

  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (`candidate_id`) REFERENCES `CANDIDATES`(`id`) ON DELETE CASCADE,

  FOREIGN KEY (`skill_id`) REFERENCES `SKILL`(`id`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* 27.6 LANGUAGE */

CREATE TABLE IF NOT EXISTS `LANGUAGE` (

  `id` VARCHAR(36) PRIMARY KEY,

  `name` VARCHAR(100) NOT NULL UNIQUE,

  `is_active` BOOLEAN DEFAULT TRUE,

  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* 27.7 CANDIDATE_LANGUAGE */

CREATE TABLE IF NOT EXISTS `CANDIDATE_LANGUAGE` (

  `id` VARCHAR(36) PRIMARY KEY,

  `candidate_id` VARCHAR(36) NOT NULL,

  `language_id` VARCHAR(36) NOT NULL,

  `can_understand` BOOLEAN DEFAULT FALSE,

  `can_speak` BOOLEAN DEFAULT FALSE,

  `can_read` BOOLEAN DEFAULT FALSE,

  `can_write` BOOLEAN DEFAULT FALSE,

  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (`candidate_id`) REFERENCES `CANDIDATES`(`id`) ON DELETE CASCADE,

  FOREIGN KEY (`language_id`) REFERENCES `LANGUAGE`(`id`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* 28. LOCATION */

CREATE TABLE IF NOT EXISTS `LOCATION` (

  `id` VARCHAR(36) PRIMARY KEY,

  `name` VARCHAR(255) NOT NULL,

  `state` VARCHAR(100),

  `country` VARCHAR(100) DEFAULT 'India',

  `is_active` BOOLEAN DEFAULT TRUE,

  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* 29. BANNER */

CREATE TABLE IF NOT EXISTS `BANNER` (

  `id` VARCHAR(36) PRIMARY KEY,

  `title` VARCHAR(255) NOT NULL,

  `subtitle` TEXT,

  `image_url` TEXT,

  `link_url` TEXT,

  `position` INT DEFAULT 1,

  `is_active` BOOLEAN DEFAULT TRUE,

  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* 30. CMS_PAGE */

CREATE TABLE IF NOT EXISTS `CMS_PAGE` (

  `id` VARCHAR(36) PRIMARY KEY,

  `slug` VARCHAR(255) NOT NULL UNIQUE,

  `title` VARCHAR(255) NOT NULL,

  `content` LONGTEXT,

  `meta_title` VARCHAR(255),

  `meta_description` TEXT,

  `is_published` BOOLEAN DEFAULT TRUE,

  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* 31. PLATFORM_SETTING */

CREATE TABLE IF NOT EXISTS `PLATFORM_SETTING` (

  `id` VARCHAR(36) PRIMARY KEY,

  `setting_key` VARCHAR(100) NOT NULL UNIQUE,

  `setting_value` TEXT,

  `description` VARCHAR(255),

  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* 32. RECRUITMENT_ACTIVITY */

CREATE TABLE IF NOT EXISTS `RECRUITMENT_ACTIVITY` (

  `id` VARCHAR(36) PRIMARY KEY,

  `performed_by` VARCHAR(36) NOT NULL,

  `action_type` VARCHAR(100) NOT NULL,

  `entity_type` VARCHAR(100),

  `entity_id` VARCHAR(36),

  `related_job_id` VARCHAR(36),

  `related_application_id` VARCHAR(36),

  `related_enquiry_id` VARCHAR(36),

  `description` TEXT NOT NULL,

  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (`performed_by`) REFERENCES `USERS`(`id`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* 33. JOB_SKILL */

CREATE TABLE IF NOT EXISTS `JOB_SKILL` (

  `id` VARCHAR(36) PRIMARY KEY,

  `job_id` VARCHAR(36) NOT NULL,

  `skill_name` VARCHAR(100) NOT NULL,

  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (`job_id`) REFERENCES `JOB`(`id`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* 34. FILES */

CREATE TABLE IF NOT EXISTS `FILES` (

  `id` VARCHAR(36) PRIMARY KEY,

  `owner_user_id` VARCHAR(36) NOT NULL,

  `candidate_id` VARCHAR(36),

  `employer_id` VARCHAR(36),

  `application_id` VARCHAR(36),

  `file_type` VARCHAR(50) NOT NULL,

  `file_name` VARCHAR(255) NOT NULL,

  `mime_type` VARCHAR(100) NOT NULL,

  `file_size` INT NOT NULL,

  `cloudinary_asset_id` VARCHAR(255),

  `cloudinary_public_id` VARCHAR(255) NOT NULL,

  `resource_type` VARCHAR(50) DEFAULT 'auto',

  `delivery_type` VARCHAR(50) DEFAULT 'upload',

  `secure_url` TEXT NOT NULL,

  `folder` VARCHAR(255),

  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (`owner_user_id`) REFERENCES `USERS`(`id`) ON DELETE CASCADE,

  FOREIGN KEY (`candidate_id`) REFERENCES `CANDIDATES`(`id`) ON DELETE CASCADE,

  FOREIGN KEY (`employer_id`) REFERENCES `EMPLOYERS`(`id`) ON DELETE CASCADE,

  FOREIGN KEY (`application_id`) REFERENCES `APPLICATION`(`id`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* 35. BENEFIT_MASTER */

CREATE TABLE IF NOT EXISTS `BENEFIT_MASTER` (

  `id` VARCHAR(36) PRIMARY KEY,

  `name` VARCHAR(255) NOT NULL UNIQUE,

  `category` VARCHAR(100) DEFAULT 'General',

  `is_active` TINYINT(1) DEFAULT 1,

  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* 36. JOB_BENEFIT */

CREATE TABLE IF NOT EXISTS `JOB_BENEFIT` (

  `id` VARCHAR(36) PRIMARY KEY,

  `job_id` VARCHAR(36) NOT NULL,

  `benefit_id` VARCHAR(36) NULL,

  `benefit_name` VARCHAR(255) NOT NULL,

  `is_custom` TINYINT(1) DEFAULT 0,

  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX `idx_jb_job_id` (`job_id`),

  INDEX `idx_jb_benefit_name` (`benefit_name`),

  FOREIGN KEY (`job_id`) REFERENCES `JOB`(`id`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
