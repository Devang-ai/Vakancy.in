-- Seed Data for Vakancy Recruitment & Job Portal MVP
USE `vakancy_main_db`;

-- Passwords hash for 'password123': $2a$10$7R6v78V/64P84k2w8oE8fO4lW1eB3jV3pS4vM3rO.0e.dE5y7V.GS (bcrypt hash of 'password123')

-- 1. USERS
INSERT INTO `USERS` (`id`, `email`, `password_hash`, `role`, `phone`, `is_main_admin`, `is_active`) VALUES
('u0000000-0000-0000-0000-000000000001', 'admin@vakancy.com', '$2a$10$4.x9M1t5C1.8wB0B1wX2.e7W7xW7wX7wX7wX7wX7wX7wX7wX7wX7', 'main_admin', '+91 9876543210', 1, 1),
('u0000000-0000-0000-0000-000000000002', 'recruiter@vakancy.com', '$2a$10$4.x9M1t5C1.8wB0B1wX2.e7W7xW7wX7wX7wX7wX7wX7wX7wX7wX7', 'recruiter', '+91 9876543211', 0, 1),
('u0000000-0000-0000-0000-000000000010', 'hrmanager@vakancy.com', '$2a$10$4.x9M1t5C1.8wB0B1wX2.e7W7xW7wX7wX7wX7wX7wX7wX7wX7wX7', 'hr_manager', '+91 9876543220', 0, 1),
('u0000000-0000-0000-0000-000000000011', 'executive@vakancy.com', '$2a$10$4.x9M1t5C1.8wB0B1wX2.e7W7xW7wX7wX7wX7wX7wX7wX7wX7wX7', 'hr_executive', '+91 9876543221', 0, 1),
('u0000000-0000-0000-0000-000000000012', 'viewer@vakancy.com', '$2a$10$4.x9M1t5C1.8wB0B1wX2.e7W7xW7wX7wX7wX7wX7wX7wX7wX7wX7', 'viewer', '+91 9876543222', 0, 1),
('u0000000-0000-0000-0000-000000000003', 'hr@techcorp.com', '$2a$10$4.x9M1t5C1.8wB0B1wX2.e7W7xW7wX7wX7wX7wX7wX7wX7wX7wX7', 'employer', '+91 9876543212', 0, 1),
('u0000000-0000-0000-0000-000000000004', 'hr@fintechlabs.io', '$2a$10$4.x9M1t5C1.8wB0B1wX2.e7W7xW7wX7wX7wX7wX7wX7wX7wX7wX7', 'employer', '+91 9876543213', 0, 1),
('u0000000-0000-0000-0000-000000000005', 'john.doe@gmail.com', '$2a$10$4.x9M1t5C1.8wB0B1wX2.e7W7xW7wX7wX7wX7wX7wX7wX7wX7wX7', 'candidate', '+91 9876543214', 0, 1),
('u0000000-0000-0000-0000-000000000006', 'sarah.connor@yahoo.com', '$2a$10$4.x9M1t5C1.8wB0B1wX2.e7W7xW7wX7wX7wX7wX7wX7wX7wX7wX7', 'candidate', '+91 9876543215', 0, 1),
('u0000000-0000-0000-0000-000000000007', 'alex.executive@gmail.com', '$2a$10$4.x9M1t5C1.8wB0B1wX2.e7W7xW7wX7wX7wX7wX7wX7wX7wX7wX7', 'candidate', '+91 9876543216', 0, 1);

-- 2. CANDIDATES
INSERT INTO `CANDIDATES` (`id`, `user_id`, `name`, `dob`, `current_location`, `profile_type`, `is_premium`) VALUES
('c0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000005', 'John Doe', '1995-06-15', 'Mumbai, India', 'experienced', 1),
('c0000000-0000-0000-0000-000000000002', 'u0000000-0000-0000-0000-000000000006', 'Sarah Connor', '1998-02-20', 'Bengaluru, India', 'fresher', 0),
('c0000000-0000-0000-0000-000000000003', 'u0000000-0000-0000-0000-000000000007', 'Alex Mercer', '1988-11-10', 'Gurugram, India', 'executive', 1);

-- 3. CANDIDATE_EXPERIENCE
INSERT INTO `CANDIDATE_EXPERIENCE` (`id`, `candidate_id`, `organization`, `designation`, `from_date`, `to_date`, `reason_for_leaving`) VALUES
('exp00000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Infosys Tech', 'Senior Full Stack Developer', '2021-03-01', NULL, 'Looking for high-impact role'),
('exp00000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'Wipro Digital', 'Frontend Developer', '2019-01-10', '2021-02-28', 'Career growth'),
('exp00000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', 'Global Cloud Solutions', 'VP of Engineering', '2018-05-01', NULL, 'Open to C-level executive roles');

-- 4. CANDIDATE_EDUCATION
INSERT INTO `CANDIDATE_EDUCATION` (`id`, `candidate_id`, `degree`, `institution`, `year`) VALUES
('edu00000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'B.Tech Computer Science', 'IIT Bombay', 2017),
('edu00000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'B.E Information Technology', 'VTU Bengaluru', 2022),
('edu00000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', 'M.Tech Software Systems', 'BITS Pilani', 2010);

-- 5. CANDIDATE_SKILL
INSERT INTO `CANDIDATE_SKILL` (`id`, `candidate_id`, `skill_name`) VALUES
('skl00000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'React.js'),
('skl00000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'Node.js'),
('skl00000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'MySQL'),
('skl00000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000002', 'JavaScript'),
('skl00000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000002', 'Tailwind CSS'),
('skl00000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000003', 'Engineering Leadership'),
('skl00000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000003', 'System Architecture');

-- 6. CANDIDATE_EXEC_DETAILS
INSERT INTO `CANDIDATE_EXEC_DETAILS` (`id`, `candidate_id`, `team_size`, `reporting_to`, `passport_number`, `passport_expiry`, `notice_period`, `current_ctc`, `expected_ctc`) VALUES
('exec0000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 45, 'CEO / Board', 'Z9876543', '2030-05-20', '30 Days', 4500000.00, 6000000.00);

-- 7. RESUME
INSERT INTO `RESUME` (`id`, `candidate_id`, `file_url`, `is_primary`, `uploaded_by`) VALUES
('res00000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', '/uploads/resumes/john_doe_resume.pdf', 1, 'candidate'),
('res00000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', '/uploads/resumes/sarah_connor_resume.pdf', 1, 'candidate'),
('res00000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', '/uploads/resumes/alex_mercer_cv.pdf', 1, 'candidate');

-- 8. CANDIDATE_TAG
INSERT INTO `CANDIDATE_TAG` (`id`, `candidate_id`, `tag`) VALUES
('tag00000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Top Talent'),
('tag00000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'Immediate Joiner'),
('tag00000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', 'Executive VP');

-- 9. PREMIUM_PROFILE
INSERT INTO `PREMIUM_PROFILE` (`id`, `candidate_id`, `start_date`, `end_date`, `status`) VALUES
('prem0000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', '2026-01-01', '2026-12-31', 'active'),
('prem0000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', '2026-02-01', '2027-02-01', 'active');

-- -- 10. EMPLOYERS
INSERT INTO `EMPLOYERS` (`id`, `user_id`, `company_name`, `industry`, `website`, `approval_status`) VALUES
('emp00000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000003', 'TechCorp Solutions', 'Information Technology', 'https://techcorp.com', 'approved'),
('emp00000-0000-0000-0000-000000000002', 'u0000000-0000-0000-0000-000000000004', 'FinTech Labs', 'Financial Technology', 'https://fintechlabs.io', 'approved');

-- 11. CLIENT
INSERT INTO `CLIENT` (`id`, `name`, `industry`, `contact_info`) VALUES
('cli00000-0000-0000-0000-000000000001', 'Acme Global Ventures', 'Investment Banking', 'contact@acmeglobal.com | +1 800 555 0199'),
('cli00000-0000-0000-0000-000000000002', 'NexGen Health Tech', 'Healthcare AI', 'hr@nexgenhealth.org | +91 80 4455 6677');

-- 12. ATS_STAGE
INSERT INTO `ATS_STAGE` (`id`, `name`, `description`, `order`, `is_active`) VALUES
('ats00000-0000-0000-0000-000000000001', 'Applied', 'Candidate submitted application', 1, 1),
('ats00000-0000-0000-0000-000000000002', 'Shortlisted', 'Profile matched basic requirements', 2, 1),
('ats00000-0000-0000-0000-000000000003', 'Screening', 'Initial recruiter phone screen call', 3, 1),
('ats00000-0000-0000-0000-000000000004', 'Interview', 'Technical & Culture round interview', 4, 1),
('ats00000-0000-0000-0000-000000000005', 'Selected', 'Offer extended & accepted', 5, 1),
('ats00000-0000-0000-0000-000000000006', 'Rejected', 'Application not progressing', 6, 1);

-- 13. JOB
INSERT INTO `JOB` (`id`, `employer_id`, `client_id`, `title`, `description`, `location`, `status`) VALUES
('job00000-0000-0000-0000-000000000001', 'emp00000-0000-0000-0000-000000000001', NULL, 'Senior Full Stack Engineer (React + Node)', 'We are hiring a Senior Full Stack Engineer to lead our core web team. Requirements: 4+ yrs React, Node.js, Express, MySQL.', 'Mumbai (Hybrid)', 'open'),
('job00000-0000-0000-0000-000000000002', 'emp00000-0000-0000-0000-000000000002', NULL, 'Backend Developer (Node.js & Microservices)', 'Build high frequency trading engines & backend APIs. 3+ yrs Node.js, Redis, MySQL.', 'Bengaluru (Remote)', 'open'),
('job00000-0000-0000-0000-000000000003', NULL, 'cli00000-0000-0000-0000-000000000001', 'VP of Engineering / CTO', 'Executive search role for Acme Global Ventures. Lead 50+ engineering team.', 'Gurugram', 'open');

-- 14. APPLICATION
INSERT INTO `APPLICATION` (`id`, `job_id`, `candidate_id`, `status`) VALUES
('app00000-0000-0000-0000-000000000001', 'job00000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'shortlisted'),
('app00000-0000-0000-0000-000000000002', 'job00000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'applied');

-- 15. CANDIDATE_PIPELINE
INSERT INTO `CANDIDATE_PIPELINE` (`id`, `candidate_id`, `job_id`, `client_id`, `stage_id`, `recruiter_id`) VALUES
('pip00000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'job00000-0000-0000-0000-000000000001', NULL, 'ats00000-0000-0000-0000-000000000002', 'u0000000-0000-0000-0000-000000000002'),
('pip00000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', 'job00000-0000-0000-0000-000000000003', 'cli00000-0000-0000-0000-000000000001', 'ats00000-0000-0000-0000-000000000004', 'u0000000-0000-0000-0000-000000000002');

-- 16. CANDIDATE_NOTE
INSERT INTO `CANDIDATE_NOTE` (`id`, `candidate_id`, `author_id`, `pipeline_id`, `note`) VALUES
('note0000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000002', 'pip00000-0000-0000-0000-000000000001', 'Excellent communication skills and strong React/Node experience. Recommended for interview.'),
('note0000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', 'u0000000-0000-0000-0000-000000000002', 'pip00000-0000-0000-0000-000000000002', 'Executive candidate with 15+ years experience. Client Acme Global requested 2nd round interview.');

-- 17. PIPELINE_STAGE_HISTORY
INSERT INTO `PIPELINE_STAGE_HISTORY` (`id`, `pipeline_id`, `from_stage_id`, `to_stage_id`, `moved_by`, `remarks`) VALUES
('his00000-0000-0000-0000-000000000001', 'pip00000-0000-0000-0000-000000000001', 'ats00000-0000-0000-0000-000000000001', 'ats00000-0000-0000-0000-000000000002', 'u0000000-0000-0000-0000-000000000002', 'Resume reviewed and approved by recruiter.'),
('his00000-0000-0000-0000-000000000002', 'pip00000-0000-0000-0000-000000000002', 'ats00000-0000-0000-0000-000000000003', 'ats00000-0000-0000-0000-000000000004', 'u0000000-0000-0000-0000-000000000002', 'Screening call passed. Scheduled executive interview with client.');

-- 18. SUBSCRIPTION_PLAN
INSERT INTO `SUBSCRIPTION_PLAN` (`id`, `name`, `price`, `unlock_limit`, `duration_days`, `is_active`) VALUES
('plan0000-0000-0000-0000-000000000001', 'Starter Employer', 4999.00, 20, 30, 1),
('plan0000-0000-0000-0000-000000000002', 'Growth Enterprise', 14999.00, 100, 90, 1),
('plan0000-0000-0000-0000-000000000003', 'Executive Search Unlimited', 39999.00, 500, 365, 1);

-- 19. EMPLOYER_SUBSCRIPTION
INSERT INTO `EMPLOYER_SUBSCRIPTION` (`id`, `employer_id`, `plan_id`, `start_date`, `end_date`, `status`) VALUES
('esub0000-0000-0000-0000-000000000001', 'emp00000-0000-0000-0000-000000000001', 'plan0000-0000-0000-0000-000000000002', '2026-01-01', '2026-04-01', 'active');

-- 20. CANDIDATE_UNLOCK
INSERT INTO `CANDIDATE_UNLOCK` (`id`, `employer_id`, `candidate_id`, `subscription_id`, `unlocked_at`, `expires_at`) VALUES
('unl00000-0000-0000-0000-000000000001', 'emp00000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'esub0000-0000-0000-0000-000000000001', CURRENT_TIMESTAMP, '2026-04-01 00:00:00');

-- 21. PAYMENT
INSERT INTO `PAYMENT` (`id`, `user_id`, `subscription_id`, `premium_profile_id`, `unlock_id`, `amount`, `payment_type`, `status`, `razorpay_txn_id`, `paid_at`) VALUES
('pay00000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000003', 'esub0000-0000-0000-0000-000000000001', NULL, NULL, 14999.00, 'employer_subscription', 'completed', 'pay_Nkx1234567890', CURRENT_TIMESTAMP);

-- 22. AI_REQUEST
INSERT INTO `AI_REQUEST` (`id`, `user_id`, `type`, `status`, `input_reference`, `output`, `model`) VALUES
('air00000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000005', 'resume_builder', 'completed', 'Job title: Senior Full Stack Developer', 'Enhanced professional summary: Results-driven Senior Full Stack Developer with 5+ years of experience building scalable web apps using React, Node.js, and MySQL...', 'gemini-1.5-flash');

-- 23. NOTIFICATION
INSERT INTO `NOTIFICATION` (`id`, `user_id`, `type`, `title`, `message`, `reference_type`, `reference_id`) VALUES
('not00000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000005', 'application_status', 'Application Shortlisted', 'Your application for Senior Full Stack Engineer at TechCorp Solutions has been shortlisted!', 'APPLICATION', 'app00000-0000-0000-0000-000000000001'),
('not00000-0000-0000-0000-000000000002', 'u0000000-0000-0000-0000-000000000003', 'subscription', 'Subscription Active', 'Your Growth Enterprise subscription plan is active until 01-Apr-2026.', 'EMPLOYER_SUBSCRIPTION', 'esub0000-0000-0000-0000-000000000001');

-- 26. JOB_CATEGORY
INSERT INTO `JOB_CATEGORY` (`id`, `name`, `slug`, `icon`, `description`, `is_active`) VALUES
('cat00000-0000-0000-0000-000000000001', 'Software Engineering', 'software-engineering', 'Code', 'Full stack, backend, frontend, devops & software development roles', 1),
('cat00000-0000-0000-0000-000000000002', 'Data Science & AI', 'data-science-ai', 'Database', 'Machine learning, data analytics, AI engineering & business intelligence', 1),
('cat00000-0000-0000-0000-000000000003', 'Product & Design', 'product-design', 'Layout', 'Product management, UI/UX design & user research', 1),
('cat00000-0000-0000-0000-000000000004', 'Sales & Marketing', 'sales-marketing', 'TrendingUp', 'Growth marketing, enterprise sales, B2B business development', 1),
('cat00000-0000-0000-0000-000000000005', 'Finance & Accounting', 'finance-accounting', 'DollarSign', 'Corporate finance, auditing, accounting & financial planning', 1);

-- 27. SKILL
INSERT INTO `SKILL` (`id`, `name`, `category`, `is_active`) VALUES
('skl00000-0000-0000-0000-000000000010', 'React.js', 'Frontend', 1),
('skl00000-0000-0000-0000-000000000011', 'Node.js', 'Backend', 1),
('skl00000-0000-0000-0000-000000000012', 'Python', 'Backend', 1),
('skl00000-0000-0000-0000-000000000013', 'MySQL', 'Database', 1),
('skl00000-0000-0000-0000-000000000014', 'TypeScript', 'Frontend', 1),
('skl00000-0000-0000-0000-000000000015', 'Docker', 'DevOps', 1);

-- 28. LOCATION
INSERT INTO `LOCATION` (`id`, `name`, `state`, `country`, `is_active`) VALUES
('loc00000-0000-0000-0000-000000000001', 'Mumbai', 'Maharashtra', 'India', 1),
('loc00000-0000-0000-0000-000000000002', 'Bengaluru', 'Karnataka', 'India', 1),
('loc00000-0000-0000-0000-000000000003', 'Gurugram', 'Haryana', 'India', 1),
('loc00000-0000-0000-0000-000000000004', 'Hyderabad', 'Telangana', 'India', 1),
('loc00000-0000-0000-0000-000000000005', 'Pune', 'Maharashtra', 'India', 1);

-- 29. BANNER
INSERT INTO `BANNER` (`id`, `title`, `subtitle`, `image_url`, `link_url`, `position`, `is_active`) VALUES
('ban00000-0000-0000-0000-000000000001', 'Pan-India Hiring Drive 2026', 'Connect with 500+ verified top tech employers', '', '/jobs', 1, 1),
('ban00000-0000-0000-0000-000000000002', 'Executive Search Portal', 'Direct recruitment desk for C-level & VP engineering roles', '', '/executive-search', 2, 1);

-- 30. CMS_PAGE
INSERT INTO `CMS_PAGE` (`id`, `slug`, `title`, `content`, `meta_title`, `meta_description`, `is_published`) VALUES
('cms00000-0000-0000-0000-000000000001', 'about-us', 'About Vacancy.in', 'Vacancy.in is India\'s premier recruitment platform connecting high-impact talent with verified employers.', 'About Vacancy.in - Premier Recruitment Portal', 'Learn about Vacancy.in mission, values, and leadership.', 1),
('cms00000-0000-0000-0000-000000000002', 'privacy-policy', 'Privacy Policy', 'Your privacy is paramount. Candidate personal contact details are kept strictly confidential.', 'Privacy Policy - Vacancy.in', 'Read how Vacancy.in protects your personal information.', 1),
('cms00000-0000-0000-0000-000000000003', 'terms-of-service', 'Terms of Service', 'Terms governing platform usage for candidates, employers, and partners.', 'Terms of Service - Vacancy.in', 'Official terms and conditions for Vacancy.in platform.', 1);

-- 31. PLATFORM_SETTING
INSERT INTO `PLATFORM_SETTING` (`id`, `setting_key`, `setting_value`, `description`) VALUES
('set00000-0000-0000-0000-000000000001', 'site_name', 'Vacancy.in Recruitment Platform', 'Public site name'),
('set00000-0000-0000-0000-000000000002', 'support_email', 'support@vacancy.in', 'Official support contact email'),
('set00000-0000-0000-0000-000000000003', 'require_job_approval', 'false', 'Require admin approval before new jobs become active'),
('set00000-0000-0000-0000-000000000004', 'maintenance_mode', 'false', 'Enable maintenance mode for non-admin users');

-- 32. RECRUITMENT_ACTIVITY
INSERT INTO `RECRUITMENT_ACTIVITY` (`id`, `performed_by`, `action_type`, `entity_type`, `entity_id`, `related_job_id`, `related_application_id`, `related_enquiry_id`, `description`) VALUES
('act00000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000002', 'application_reviewed', 'APPLICATION', 'app00000-0000-0000-0000-000000000001', 'job00000-0000-0000-0000-000000000001', 'app00000-0000-0000-0000-000000000001', NULL, 'Reviewed candidate application for Senior Full Stack Engineer'),
('act00000-0000-0000-0000-000000000002', 'u0000000-0000-0000-0000-000000000002', 'candidate_shortlisted', 'APPLICATION', 'app00000-0000-0000-0000-000000000001', 'job00000-0000-0000-0000-000000000001', 'app00000-0000-0000-0000-000000000001', NULL, 'Shortlisted John Doe for Senior Full Stack Engineer at TechCorp Solutions'),
('act00000-0000-0000-0000-000000000003', 'u0000000-0000-0000-0000-000000000001', 'team_member_created', 'USER', 'u0000000-0000-0000-0000-000000000010', NULL, NULL, NULL, 'Main Admin created team member account hrmanager@vakancy.com with role HR Manager');


