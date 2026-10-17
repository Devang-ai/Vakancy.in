const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const aiService = require('../services/aiService');
const { resolveAndValidateJobLocation, resolveSingleLocation } = require('../services/locationService');
const {
  sendEmployerEnquiryConfirmationEmail,
  sendInternalEnquiryAlertEmail
} = require('../services/emailService');
const {
  uploadBufferToCloudinary,
  deleteFromCloudinary
} = require('../services/cloudinaryService');

// Helper to sanitize text fields against basic XSS
const sanitizeText = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/onload=/gi, '')
    .replace(/onerror=/gi, '');
};

// URL validator ensuring http/https protocol and blocking malicious schemes
const validateUrl = (urlStr, fieldName) => {
  if (!urlStr || !urlStr.trim()) return null;
  const str = urlStr.trim();
  const lower = str.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) {
    return `${fieldName} contains invalid or malicious URL scheme.`;
  }
  if (!lower.startsWith('http://') && !lower.startsWith('https://')) {
    return `${fieldName} must begin with http:// or https://`;
  }
  try {
    const parsed = new URL(str);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return `${fieldName} must use HTTP or HTTPS protocol.`;
    }
  } catch (_) {
    return `${fieldName} must be a valid URL.`;
  }
  return null;
};

// Robust social platform URL validator supporting paths, query parameters, trailing slashes
const validateSocialPlatformUrl = (urlStr, platform, fieldName) => {
  if (!urlStr || !urlStr.trim()) return null;
  const str = urlStr.trim();
  const lower = str.toLowerCase();

  if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) {
    return `${fieldName} contains invalid or malicious URL scheme.`;
  }

  let parsed;
  try {
    const urlToParse = (lower.startsWith('http://') || lower.startsWith('https://')) ? str : `https://${str}`;
    parsed = new URL(urlToParse);
  } catch (_) {
    return `Please enter a valid ${fieldName} URL.`;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return `${fieldName} must use HTTP or HTTPS protocol.`;
  }

  const hostname = parsed.hostname.toLowerCase();
  const allowedDomains = {
    linkedin: ['linkedin.com', 'www.linkedin.com'],
    instagram: ['instagram.com', 'www.instagram.com'],
    facebook: ['facebook.com', 'www.facebook.com'],
    twitter: ['twitter.com', 'www.twitter.com', 'x.com', 'www.x.com']
  };

  const validDomains = allowedDomains[platform] || [];
  const isValidHost = validDomains.some(d => hostname === d || hostname.endsWith(`.${d}`));

  if (!isValidHost) {
    return `Please enter a valid ${fieldName} URL from ${platform}.com.`;
  }

  return null;
};

// Strict employer resolution: gets existing employer for user or creates a dedicated one for user. Never returns another user's employer.
const getOrCreateEmployerForUser = async (userId, userRole = 'employer', userName = '') => {
  const employers = await db.query('SELECT * FROM EMPLOYERS WHERE user_id = ?', [userId]);
  if (employers.length > 0) {
    return employers[0];
  }
  
  // Auto-create profile for this specific user
  const id = uuidv4();
  const companyName = userName && userName.trim() ? userName.trim() : 'My Company';
  await db.query(
    `INSERT INTO EMPLOYERS (
      id, user_id, company_name, company_type, industry, location, country, state, city, approval_status
    ) VALUES (?, ?, ?, 'Private Limited Company (Pvt Ltd)', 'Information Technology', 'Bengaluru, India', 'India', 'Karnataka', 'Bengaluru', 'approved')`,
    [id, userId, companyName]
  );
  
  const created = await db.query('SELECT * FROM EMPLOYERS WHERE id = ?', [id]);
  return created.length > 0 ? created[0] : null;
};

const getEmployerProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const employer = await getOrCreateEmployerForUser(userId, req.user.role, req.user.name);

    if (!employer) {
      return res.status(404).json({ success: false, message: 'Employer profile not found.' });
    }

    // Fetch active jobs for this employer
    const jobs = await db.query('SELECT id, title, location, status, min_salary, max_salary, employment_type FROM JOB WHERE employer_id = ?', [employer.id]);
    const activeJobs = jobs.filter(j => j.status === 'open' || j.status === 'active');

    // Fetch active subscription & candidate unlock usage
    let activeSub = null;
    let unlockCount = 0;
    try {
      const subscriptions = await db.query(
        'SELECT es.*, sp.name as plan_name, sp.unlock_limit FROM EMPLOYER_SUBSCRIPTION es JOIN SUBSCRIPTION_PLAN sp ON es.plan_id = sp.id WHERE es.employer_id = ? AND es.status = "active" AND es.end_date >= CURRENT_DATE()',
        [employer.id]
      );
      if (subscriptions.length > 0) {
        activeSub = subscriptions[0];
        const unlocks = await db.query('SELECT COUNT(*) as count FROM CANDIDATE_UNLOCK WHERE subscription_id = ?', [activeSub.id]);
        unlockCount = unlocks.length > 0 ? unlocks[0].count || 0 : 0;
      }
    } catch (_) {}

    res.json({
      success: true,
      employer: {
        ...employer,
        active_jobs_count: activeJobs.length,
        jobs: activeJobs.slice(0, 5),
        active_subscription: activeSub ? {
          ...activeSub,
          unlocks_used: unlockCount,
          unlocks_remaining: Math.max(0, (activeSub.unlock_limit || 0) - unlockCount)
        } : null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching employer profile.', error: error.message });
  }
};

const uploadCompanyLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file uploaded.' });
    }

    if (req.user && req.user.role === 'viewer') {
      return res.status(403).json({ success: false, message: 'Access denied: Viewer role cannot upload company logos.' });
    }

    // Validate MIME type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ success: false, message: 'Invalid image format. Allowed: JPG, PNG, GIF, WEBP, SVG.' });
    }

    const userId = req.user.id;
    const employer = await getOrCreateEmployerForUser(userId, req.user.role, req.user.name);

    if (!employer) {
      return res.status(404).json({ success: false, message: 'Employer profile not found.' });
    }

    // Destroy previous Cloudinary logo asset if replacing
    if (employer.logo_url && employer.logo_url.includes('cloudinary.com')) {
      try {
        const parts = employer.logo_url.split('/');
        const fileWithExt = parts.slice(-2).join('/');
        const publicId = fileWithExt.substring(0, fileWithExt.lastIndexOf('.'));
        if (publicId) await deleteFromCloudinary(publicId, { resource_type: 'image' });
      } catch (_) {}
    }

    const folder = `vakancy/employers/${employer.id}/logo`;
    const safePublicId = `logo_${Date.now()}`;

    // Upload file buffer to Cloudinary
    const cloudinaryResult = await uploadBufferToCloudinary(req.file.buffer, {
      folder,
      public_id: safePublicId,
      resource_type: 'image',
      mime_type: req.file.mimetype
    });

    const fileUrl = cloudinaryResult.secure_url;
    const fileId = uuidv4();

    // Update EMPLOYERS table logo_url
    await db.query('UPDATE EMPLOYERS SET logo_url = ? WHERE id = ?', [fileUrl, employer.id]);

    // Save metadata in FILES table
    try {
      await db.query(
        `INSERT INTO FILES (id, owner_user_id, employer_id, file_type, file_name, mime_type, file_size, cloudinary_asset_id, cloudinary_public_id, resource_type, delivery_type, secure_url, folder)
         VALUES (?, ?, ?, 'logo', ?, ?, ?, ?, ?, 'image', 'upload', ?, ?)`,
        [
          fileId,
          userId,
          employer.id,
          req.file.originalname,
          req.file.mimetype,
          req.file.size,
          cloudinaryResult.asset_id || null,
          cloudinaryResult.public_id,
          fileUrl,
          folder
        ]
      );
    } catch (_) {}

    res.json({
      success: true,
      message: 'Company logo uploaded successfully to Cloudinary.',
      logo_url: fileUrl
    });
  } catch (error) {
    console.error('Error uploading company logo:', error);
    res.status(500).json({ success: false, message: 'Error uploading company logo.' });
  }
};

const updateEmployerProfile = async (req, res) => {
  try {
    const {
      company_name,
      company_type,
      industry,
      company_size,
      website,
      country,
      state,
      city,
      address,
      pincode,
      location,
      about,
      tagline,
      founded_year,
      official_email,
      official_phone,
      alt_phone,
      contact_person_name,
      contact_person_designation,
      contact_person_email,
      contact_person_phone,
      contact_email,
      contact_phone,
      linkedin_url,
      instagram_url,
      facebook_url,
      twitter_url,
      logo_url,
      culture,
      perks
    } = req.body;
    const userId = req.user.id;

    // Server-side validation
    if (company_name !== undefined && (!company_name || !company_name.trim())) {
      return res.status(400).json({ success: false, message: 'Company name is required.' });
    }

    const webErr = validateUrl(website, 'Company Website');
    if (webErr) return res.status(400).json({ success: false, message: webErr });

    const linkErr = validateSocialPlatformUrl(linkedin_url, 'linkedin', 'LinkedIn URL');
    if (linkErr) return res.status(400).json({ success: false, message: linkErr });

    const instaErr = validateSocialPlatformUrl(instagram_url, 'instagram', 'Instagram URL');
    if (instaErr) return res.status(400).json({ success: false, message: instaErr });

    const fbErr = validateSocialPlatformUrl(facebook_url, 'facebook', 'Facebook URL');
    if (fbErr) return res.status(400).json({ success: false, message: fbErr });

    const twitErr = validateSocialPlatformUrl(twitter_url, 'twitter', 'Twitter / X URL');
    if (twitErr) return res.status(400).json({ success: false, message: twitErr });

    // Validate email formats if provided
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (official_email && official_email.trim() && !emailPattern.test(official_email.trim())) {
      return res.status(400).json({ success: false, message: 'Invalid official email address format.' });
    }
    if (contact_person_email && contact_person_email.trim() && !emailPattern.test(contact_person_email.trim())) {
      return res.status(400).json({ success: false, message: 'Invalid contact person email format.' });
    }

    const employer = await getOrCreateEmployerForUser(userId, req.user.role, req.user.name);
    if (!employer) {
      return res.status(404).json({ success: false, message: 'Employer profile not found.' });
    }

    const updatedCompanyName = company_name !== undefined ? sanitizeText(company_name.trim()) : employer.company_name;
    const updatedCompanyType = company_type !== undefined ? sanitizeText(company_type.trim()) : (employer.company_type || '');
    const updatedIndustry = industry !== undefined ? sanitizeText(industry.trim()) : (employer.industry || '');
    const updatedWebsite = website !== undefined ? website.trim() : (employer.website || '');
    const updatedCountry = country !== undefined ? sanitizeText(country.trim()) : (employer.country || '');
    const updatedState = state !== undefined ? sanitizeText(state.trim()) : (employer.state || '');
    const updatedCity = city !== undefined ? sanitizeText(city.trim()) : (employer.city || '');
    const updatedAddress = address !== undefined ? sanitizeText(address.trim()) : (employer.address || '');
    const updatedPincode = pincode !== undefined ? sanitizeText(pincode.trim()) : (employer.pincode || '');
    const updatedLocation = location !== undefined ? sanitizeText(location.trim()) : (employer.location || [updatedCity, updatedState, updatedCountry].filter(Boolean).join(', '));
    const updatedCompanySize = company_size !== undefined ? sanitizeText(company_size.trim()) : (employer.company_size || '');
    const updatedAbout = about !== undefined ? sanitizeText(about.trim()) : (employer.about || '');
    const updatedTagline = tagline !== undefined ? sanitizeText(tagline.trim()) : (employer.tagline || '');
    const updatedLogoUrl = logo_url !== undefined ? logo_url.trim() : (employer.logo_url || '');
    const updatedFoundedYear = founded_year !== undefined ? sanitizeText(String(founded_year).trim()) : (employer.founded_year || '');
    const updatedOfficialEmail = official_email !== undefined ? official_email.trim() : (employer.official_email || employer.contact_email || '');
    const updatedOfficialPhone = official_phone !== undefined ? sanitizeText(official_phone.trim()) : (employer.official_phone || employer.contact_phone || '');
    const updatedAltPhone = alt_phone !== undefined ? sanitizeText(alt_phone.trim()) : (employer.alt_phone || '');
    const updatedContactPersonName = contact_person_name !== undefined ? sanitizeText(contact_person_name.trim()) : (employer.contact_person_name || '');
    const updatedContactPersonDesignation = contact_person_designation !== undefined ? sanitizeText(contact_person_designation.trim()) : (employer.contact_person_designation || '');
    const updatedContactPersonEmail = contact_person_email !== undefined ? contact_person_email.trim() : (employer.contact_person_email || '');
    const updatedContactPersonPhone = contact_person_phone !== undefined ? sanitizeText(contact_person_phone.trim()) : (employer.contact_person_phone || '');
    const updatedContactEmail = contact_email !== undefined ? contact_email.trim() : (updatedOfficialEmail || employer.contact_email || '');
    const updatedContactPhone = contact_phone !== undefined ? sanitizeText(contact_phone.trim()) : (updatedOfficialPhone || employer.contact_phone || '');
    const updatedLinkedinUrl = linkedin_url !== undefined ? linkedin_url.trim() : (employer.linkedin_url || '');
    const updatedInstagramUrl = instagram_url !== undefined ? instagram_url.trim() : (employer.instagram_url || '');
    const updatedFacebookUrl = facebook_url !== undefined ? facebook_url.trim() : (employer.facebook_url || '');
    const updatedTwitterUrl = twitter_url !== undefined ? twitter_url.trim() : (employer.twitter_url || '');
    const updatedCulture = culture !== undefined ? (typeof culture === 'string' ? culture : JSON.stringify(culture)) : (employer.culture || '');
    const updatedPerks = perks !== undefined ? (typeof perks === 'string' ? perks : JSON.stringify(perks)) : (employer.perks || '');

    await db.query(
      `UPDATE EMPLOYERS SET
        company_name = ?, company_type = ?, industry = ?, website = ?,
        country = ?, state = ?, city = ?, address = ?, pincode = ?, location = ?,
        company_size = ?, about = ?, tagline = ?, logo_url = ?, founded_year = ?,
        official_email = ?, official_phone = ?, alt_phone = ?,
        contact_person_name = ?, contact_person_designation = ?, contact_person_email = ?, contact_person_phone = ?,
        contact_email = ?, contact_phone = ?,
        linkedin_url = ?, instagram_url = ?, facebook_url = ?, twitter_url = ?,
        culture = ?, perks = ?
      WHERE id = ?`,
      [
        updatedCompanyName, updatedCompanyType, updatedIndustry, updatedWebsite,
        updatedCountry, updatedState, updatedCity, updatedAddress, updatedPincode, updatedLocation,
        updatedCompanySize, updatedAbout, updatedTagline, updatedLogoUrl, updatedFoundedYear,
        updatedOfficialEmail, updatedOfficialPhone, updatedAltPhone,
        updatedContactPersonName, updatedContactPersonDesignation, updatedContactPersonEmail, updatedContactPersonPhone,
        updatedContactEmail, updatedContactPhone,
        updatedLinkedinUrl, updatedInstagramUrl, updatedFacebookUrl, updatedTwitterUrl,
        updatedCulture, updatedPerks,
        employer.id
      ]
    );

    const refreshed = await db.query('SELECT * FROM EMPLOYERS WHERE id = ?', [employer.id]);

    res.json({
      success: true,
      message: 'Employer profile updated successfully.',
      employer: refreshed[0]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating employer profile.', error: error.message });
  }
};

const getEmployerDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const employer = await getOrCreateEmployerForUser(userId, req.user.role, req.user.name);

    if (!employer) {
      return res.status(404).json({ success: false, message: 'Employer not found.' });
    }

    const employerId = employer.id;

    // Retrieve jobs posted strictly by this employer
    const jobs = await db.query('SELECT * FROM JOB WHERE employer_id = ?', [employerId]);
    const totalJobs = jobs.length;
    const activeJobs = jobs.filter(j => j.status === 'open' || j.status === 'active').length;
    const inactiveJobs = jobs.filter(j => j.status === 'closed' || j.status === 'inactive' || j.status === 'draft').length;

    const jobIds = jobs.map(j => j.id);
    let totalApplicants = 0;
    let recentApplications = [];

    // Retrieve applications for these jobs
    let allApps = [];
    try {
      allApps = await db.query('SELECT * FROM APPLICATION');
    } catch (_) {}

    if (jobIds.length > 0) {
      const employerApps = allApps.filter(a => jobIds.includes(a.job_id));
      totalApplicants = employerApps.length;

      // Sort by applied_at desc and take top 10
      employerApps.sort((a, b) => new Date(b.applied_at || 0) - new Date(a.applied_at || 0));
      const recentSlice = employerApps.slice(0, 10);

      // STRICT PRIVACY: Return ONLY privacy-safe application metadata. ZERO candidate PII!
      recentApplications = recentSlice.map((app) => {
        const job = jobs.find(j => j.id === app.job_id);
        const refSuffix = app.id.replace(/-/g, '').substring(0, 6).toUpperCase();
        return {
          id: app.id,
          reference_number: `APP-${refSuffix}`,
          job_id: app.job_id,
          job_title: job?.title || 'Job Opening',
          status: app.status || 'applied',
          applied_at: app.applied_at || app.created_at || new Date().toISOString()
        };
      });
    }

    // Retrieve total enquiries raised by this employer
    let enquiriesCount = 0;
    try {
      const allEnquiries = await db.query('SELECT id FROM EMPLOYER_ENQUIRY WHERE employer_id = ?', [employerId]);
      enquiriesCount = allEnquiries ? allEnquiries.length : 0;
    } catch (_) {
      enquiriesCount = 0;
    }

    // Enrich jobs with applicant count
    const jobsWithCounts = jobs.map(job => {
      const count = allApps.filter(a => a.job_id === job.id).length;
      return {
        ...job,
        applicant_count: count
      };
    });

    res.json({
      success: true,
      employer: {
        id: employer.id,
        company_name: employer.company_name,
        industry: employer.industry,
        website: employer.website,
        logo_url: employer.logo_url,
        is_onboarding_completed: employer.is_onboarding_completed ? true : false,
        onboarding_step: employer.onboarding_step || 1
      },
      stats: {
        total_jobs: totalJobs,
        active_jobs: activeJobs,
        inactive_jobs: inactiveJobs,
        total_applicants: totalApplicants,
        enquiries_count: enquiriesCount
      },
      active_jobs: jobsWithCounts,
      recent_applications: recentApplications
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching dashboard stats.', error: error.message });
  }
};

const getEmployerJobs = async (req, res) => {
  try {
    const userId = req.user.id;
    const employer = await getOrCreateEmployerForUser(userId, req.user.role, req.user.name);

    if (!employer) {
      return res.status(404).json({ success: false, message: 'Employer not found.' });
    }

    const employerId = employer.id;
    const { status, search, work_mode } = req.query;

    // Retrieve jobs posted strictly by this employer (multi-tenant isolation)
    let jobs = await db.query('SELECT * FROM JOB WHERE employer_id = ?', [employerId]);

    // Calculate stats before query filtering
    const totalJobs = jobs.length;
    const activeJobs = jobs.filter(j => j.status === 'open' || j.status === 'active').length;
    const drafts = jobs.filter(j => j.status === 'draft').length;
    const closed = jobs.filter(j => j.status === 'closed' || j.status === 'inactive').length;

    // Retrieve all applications for this employer's jobs
    let allApps = [];
    try {
      allApps = await db.query('SELECT * FROM APPLICATION');
    } catch (_) {}

    const jobIds = jobs.map(j => j.id);
    const employerApps = allApps.filter(a => jobIds.includes(a.job_id));
    const totalApplicants = employerApps.length;

    // Filters
    if (status && status !== 'all') {
      if (status === 'active') {
        jobs = jobs.filter(j => j.status === 'open' || j.status === 'active');
      } else if (status === 'closed' || status === 'inactive') {
        jobs = jobs.filter(j => j.status === 'closed' || j.status === 'inactive');
      } else if (status === 'draft') {
        jobs = jobs.filter(j => j.status === 'draft');
      }
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      jobs = jobs.filter(j =>
        (j.title && j.title.toLowerCase().includes(q)) ||
        (j.description && j.description.toLowerCase().includes(q)) ||
        (j.location && j.location.toLowerCase().includes(q))
      );
    }

    if (work_mode && work_mode !== 'all') {
      const mode = work_mode.toLowerCase();
      jobs = jobs.filter(j => (j.location && j.location.toLowerCase().includes(mode)) || (j.employment_type && j.employment_type.toLowerCase().includes(mode)));
    }

    // Enrich jobs with applicant counts & shortlisted counts
    const enrichedJobs = jobs.map(job => {
      const appsForJob = allApps.filter(a => a.job_id === job.id);
      const shortlisted = appsForJob.filter(a => a.status === 'shortlisted').length;
      const newApps = appsForJob.filter(a => !a.status || a.status === 'applied').length;

      const safeJob = { ...job };
      delete safeJob.internal_notes;
      delete safeJob.assigned_recruiter_id;
      delete safeJob.assigned_tl_id;

      return {
        ...safeJob,
        status: job.status === 'open' ? 'active' : (job.status === 'closed' ? 'inactive' : job.status),
        applicant_count: appsForJob.length,
        shortlisted_count: shortlisted,
        new_applicants_count: newApps,
        company_name: employer.company_name
      };
    });

    res.json({
      success: true,
      employer: {
        id: employer.id,
        company_name: employer.company_name,
        logo_url: employer.logo_url
      },
      stats: {
        total: totalJobs,
        active: activeJobs,
        drafts: drafts,
        closed: closed,
        total_applicants: totalApplicants
      },
      jobs: enrichedJobs
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching employer jobs.', error: error.message });
  }
};

const toggleEmployerJobStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const jobId = req.params.id;
    const { status } = req.body;

    const employer = await getOrCreateEmployerForUser(userId, req.user.role, req.user.name);
    if (!employer) {
      return res.status(404).json({ success: false, message: 'Employer not found.' });
    }

    // Check if the job exists
    const jobs = await db.query('SELECT * FROM JOB WHERE id = ?', [jobId]);
    if (jobs.length === 0) {
      return res.status(404).json({ success: false, message: 'Job not found.' });
    }

    const job = jobs[0];

    // Multi-tenant authorization check: Job MUST belong to this employer!
    const isOwner = (job.employer_id && String(job.employer_id) === String(employer.id)) ||
                    (job.client_id && String(job.client_id) === String(employer.id));
    const isStaffAdmin = ['admin', 'main_admin', 'director', 'recruiter', 'tl_coordinator'].includes(req.user.role);

    if (!isOwner && !isStaffAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only manage your own jobs.' });
    }

    // Determine target status
    let newStatus = status;
    if (!newStatus) {
      newStatus = (job.status === 'open' || job.status === 'active') ? 'closed' : 'open';
    } else {
      newStatus = (newStatus === 'active') ? 'open' : (newStatus === 'inactive' ? 'closed' : newStatus);
    }

    await db.query('UPDATE JOB SET status = ? WHERE id = ?', [newStatus, jobId]);

    const updated = await db.query('SELECT * FROM JOB WHERE id = ?', [jobId]);

    res.json({
      success: true,
      message: `Job marked as ${newStatus === 'open' ? 'active' : 'inactive'}.`,
      job: {
        ...updated[0],
        status: updated[0].status === 'open' ? 'active' : (updated[0].status === 'closed' ? 'inactive' : updated[0].status)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating job status.', error: error.message });
  }
};

// Helper to sync skills into JOB_SKILL relational model
const syncJobSkills = async (jobId, skillsArray) => {
  if (!Array.isArray(skillsArray) || skillsArray.length === 0) return;
  try {
    await db.query('DELETE FROM JOB_SKILL WHERE job_id = ?', [jobId]);
    for (const skillName of skillsArray) {
      if (typeof skillName === 'string' && skillName.trim()) {
        const cleanSkill = skillName.trim();
        const skillId = uuidv4();
        await db.query(
          'INSERT INTO JOB_SKILL (id, job_id, skill_name) VALUES (?, ?, ?)',
          [skillId, jobId, cleanSkill]
        );
      }
    }
  } catch (_) {}
};

// Helper to sync keywords into JOB_KEYWORD relational table for normalized search/filtering
const syncJobKeywords = async (jobId, keywordsArray) => {
  if (!jobId) return;
  try {
    await db.query('DELETE FROM JOB_KEYWORD WHERE job_id = ?', [jobId]);
    if (!Array.isArray(keywordsArray) || keywordsArray.length === 0) return;

    const seen = new Set();
    for (const rawKw of keywordsArray) {
      if (typeof rawKw !== 'string') continue;
      const trimmed = sanitizeText(rawKw.trim());
      if (!trimmed) continue;
      const normalized = trimmed.toLowerCase();

      if (!seen.has(normalized)) {
        seen.add(normalized);
        const kwId = uuidv4();
        await db.query(
          'INSERT INTO JOB_KEYWORD (id, job_id, keyword, normalized_keyword) VALUES (?, ?, ?, ?)',
          [kwId, jobId, trimmed, normalized]
        );
      }
    }
  } catch (e) {
    console.warn('Notice syncing JOB_KEYWORD table:', e.message);
  }
};

// Helper to sync locations into JOB_LOCATION relational table for multi-location hub support
const syncJobLocations = async (jobId, locationsInput, primaryLocData = {}) => {
  if (!jobId) return;
  try {
    await db.query('DELETE FROM JOB_LOCATION WHERE job_id = ?', [jobId]);

    let locList = [];
    if (Array.isArray(locationsInput) && locationsInput.length > 0) {
      locList = locationsInput;
    } else if (typeof locationsInput === 'string' && locationsInput.trim()) {
      locList = locationsInput.split(';').map(s => s.trim()).filter(Boolean);
    }

    if (locList.length === 0 && (primaryLocData.city || primaryLocData.state || primaryLocData.country || primaryLocData.location)) {
      locList = [{
        country: primaryLocData.country,
        state: primaryLocData.state,
        city: primaryLocData.city,
        locality: primaryLocData.locality,
        location_text: primaryLocData.location || [primaryLocData.locality, primaryLocData.city, primaryLocData.state, primaryLocData.country].filter(Boolean).join(', ')
      }];
    }

    for (let i = 0; i < locList.length; i++) {
      const rawLoc = locList[i];
      const locObj = typeof rawLoc === 'string' ? { location_text: rawLoc } : (rawLoc || {});
      const res = await resolveSingleLocation(locObj);
      const locId = uuidv4();
      const locText = typeof rawLoc === 'string' ? rawLoc : (locObj.location_text || [res.locality, res.city, res.state, res.country].filter(s => s && s !== 'Not specified').join(', '));

      await db.query(
        `INSERT INTO JOB_LOCATION (id, job_id, country_id, state_region_id, city_id, country, state, city, locality, location_text, is_primary)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          locId,
          jobId,
          res.country_id || null,
          res.state_region_id || null,
          res.city_id || null,
          res.country || null,
          res.state || null,
          res.city || null,
          res.locality || null,
          locText,
          i === 0 ? 1 : 0
        ]
      );
    }
  } catch (e) {
    console.warn('Notice syncing JOB_LOCATION table:', e.message);
  }
};

// Helper to sync benefits into JOB_BENEFIT relational table
const syncJobBenefits = async (jobId, benefitsInput) => {
  if (!jobId) return;
  try {
    await db.query('DELETE FROM JOB_BENEFIT WHERE job_id = ?', [jobId]);
    if (!benefitsInput) return;

    let benefitNames = [];
    if (Array.isArray(benefitsInput)) {
      benefitNames = benefitsInput;
    } else if (typeof benefitsInput === 'string' && benefitsInput.trim()) {
      try {
        const parsed = JSON.parse(benefitsInput);
        if (Array.isArray(parsed)) benefitNames = parsed;
        else benefitNames = benefitsInput.split(',').map(s => s.trim());
      } catch (_) {
        benefitNames = benefitsInput.split(',').map(s => s.trim());
      }
    }

    if (benefitNames.length === 0) return;

    // Load active master benefits for ID lookup
    let masterMap = new Map();
    try {
      const masterRows = await db.query('SELECT id, name FROM BENEFIT_MASTER WHERE is_active = 1');
      for (const m of masterRows) {
        masterMap.set(m.name.toLowerCase().trim(), m.id);
      }
    } catch (_) {}

    const seen = new Set();
    for (const rawName of benefitNames) {
      if (typeof rawName !== 'string') continue;
      const cleanName = sanitizeText(rawName.trim());
      if (!cleanName) continue;
      const lower = cleanName.toLowerCase();
      if (seen.has(lower)) continue;
      seen.add(lower);

      const benefitId = masterMap.get(lower) || null;
      const isCustom = benefitId ? 0 : 1;
      const jbId = uuidv4();

      await db.query(
        'INSERT INTO JOB_BENEFIT (id, job_id, benefit_id, benefit_name, is_custom) VALUES (?, ?, ?, ?, ?)',
        [jbId, jobId, benefitId, cleanName, isCustom]
      );
    }
  } catch (e) {
    console.warn('Notice syncing JOB_BENEFIT table:', e.message);
  }
};

// Create a new employer job requisition
const createEmployerJob = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      title,
      department,
      job_domain,
      category_id,
      keywords,
      employment_type,
      workplace_type,
      seniority_level,
      openings_count,
      priority,
      country,
      state,
      city,
      locality,
      location,
      min_experience,
      max_experience,
      fresher_allowed,
      min_qualification,
      degree,
      specialization,
      required_skills,
      application_deadline,
      notice_period,
      hiring_manager,
      min_salary,
      max_salary,
      salary_period,
      currency,
      salary_type,
      benefits,
      description,
      status
    } = req.body;

    if (Array.isArray(category_id)) {
      return res.status(400).json({ success: false, message: 'Only a single Job Category can be selected.' });
    }

    let finalCategoryId = null;
    let finalJobDomain = sanitizeText(job_domain || 'General');

    if (category_id !== undefined && category_id !== null && category_id !== '') {
      let dbCat = [];
      try {
        dbCat = await db.query('SELECT id, name FROM JOB_CATEGORY WHERE id = ?', [category_id]);
      } catch (_) {}

      if (dbCat.length > 0) {
        finalCategoryId = dbCat[0].id;
        finalJobDomain = dbCat[0].name;
      } else if (typeof category_id === 'string' && (category_id.startsWith('cat') || category_id.length >= 8)) {
        finalCategoryId = category_id;
        if (job_domain && job_domain.trim()) {
          finalJobDomain = sanitizeText(job_domain.trim());
        }
      } else {
        return res.status(400).json({ success: false, message: 'Invalid Job Category selected.' });
      }
    }

    // Server-side validations
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Job title is required.' });
    }

    if (!department || !department.trim()) {
      return res.status(400).json({ success: false, message: 'Department is required.' });
    }

    const finalLocation = location || [city, state, country].filter(Boolean).join(', ');
    if (!finalLocation || !finalLocation.trim()) {
      return res.status(400).json({ success: false, message: 'Work location is required.' });
    }

    const minExp = min_experience != null ? Number(min_experience) : 0;
    const maxExp = max_experience != null ? Number(max_experience) : 0;
    if (isNaN(minExp) || isNaN(maxExp) || minExp < 0 || maxExp < 0) {
      return res.status(400).json({ success: false, message: 'Experience values must be valid non-negative numbers.' });
    }
    if (minExp > maxExp) {
      return res.status(400).json({ success: false, message: 'Minimum experience cannot exceed maximum experience.' });
    }

    const minSal = min_salary != null && min_salary !== '' ? Number(min_salary) : null;
    const maxSal = max_salary != null && max_salary !== '' ? Number(max_salary) : null;
    if ((minSal != null && (isNaN(minSal) || minSal < 0)) || (maxSal != null && (isNaN(maxSal) || maxSal < 0))) {
      return res.status(400).json({ success: false, message: 'Salary amounts must be valid non-negative numbers.' });
    }
    if (minSal != null && maxSal != null && minSal > maxSal) {
      return res.status(400).json({ success: false, message: 'Minimum salary cannot exceed maximum salary.' });
    }

    // Resolve employer profile strictly from authenticated user context
    const employer = await getOrCreateEmployerForUser(userId, req.user.role, req.user.name);
    if (!employer) {
      return res.status(404).json({ success: false, message: 'Employer profile not found for authenticated user.' });
    }

    const id = uuidv4();
    const finalStatus = status || 'draft';
    const finalDesc = description && description.trim() ? sanitizeText(description) : 'Role details and scope to be configured in Step 2.';
    const finalOpenings = openings_count ? Math.max(1, parseInt(openings_count, 10)) : 1;
    
    // Parse keywords with case-insensitive duplicate prevention
    let parsedKeywordsArray = [];
    if (Array.isArray(keywords)) {
      parsedKeywordsArray = keywords;
    } else if (typeof keywords === 'string' && keywords.trim()) {
      try {
        const parsed = JSON.parse(keywords);
        if (Array.isArray(parsed)) parsedKeywordsArray = parsed;
        else parsedKeywordsArray = keywords.split(',').map(s => s.trim());
      } catch (_) {
        parsedKeywordsArray = keywords.split(',').map(s => s.trim());
      }
    }
    const seenKw = new Set();
    const cleanKeywords = [];
    for (const kw of parsedKeywordsArray) {
      if (typeof kw !== 'string') continue;
      const trimmed = sanitizeText(kw.trim());
      if (!trimmed) continue;
      const lower = trimmed.toLowerCase();
      if (!seenKw.has(lower)) {
        seenKw.add(lower);
        cleanKeywords.push(trimmed);
      }
    }
    const finalKeywords = JSON.stringify(cleanKeywords);

    let parsedSkillsArray = [];
    if (Array.isArray(required_skills)) {
      parsedSkillsArray = required_skills;
    } else if (typeof required_skills === 'string') {
      try { parsedSkillsArray = JSON.parse(required_skills); } catch (_) { parsedSkillsArray = required_skills.split(',').map(s => s.trim()); }
    }
    const finalSkills = JSON.stringify(parsedSkillsArray);

    let parsedBenefitsArray = [];
    if (Array.isArray(benefits)) {
      parsedBenefitsArray = benefits;
    } else if (typeof benefits === 'string' && benefits.trim()) {
      try {
        const parsed = JSON.parse(benefits);
        if (Array.isArray(parsed)) parsedBenefitsArray = parsed;
        else parsedBenefitsArray = benefits.split(',').map(s => s.trim());
      } catch (_) {
        parsedBenefitsArray = benefits.split(',').map(s => s.trim());
      }
    }
    const seenBen = new Set();
    const cleanBenefits = [];
    for (const b of parsedBenefitsArray) {
      if (typeof b !== 'string') continue;
      const trimmed = sanitizeText(b.trim());
      if (!trimmed) continue;
      const lower = trimmed.toLowerCase();
      if (!seenBen.has(lower)) {
        seenBen.add(lower);
        cleanBenefits.push(trimmed);
      }
    }
    const finalBenefits = JSON.stringify(cleanBenefits);

    await db.query(
      `INSERT INTO JOB (
        id, employer_id, title, description, location, status,
        department, job_domain, category_id, keywords, employment_type, workplace_type,
        seniority_level, openings_count, priority,
        country, state, city, locality,
        min_experience, max_experience, fresher_allowed,
        min_qualification, degree, specialization, required_skills,
        min_salary, max_salary, salary_period, currency, salary_type,
        benefits, application_deadline, notice_period, hiring_manager,
        created_by_user_id, created_by_type, source_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        employer.id,
        sanitizeText(title.trim()),
        finalDesc,
        sanitizeText(finalLocation.trim()),
        finalStatus,
        sanitizeText(department || 'General'),
        finalJobDomain,
        finalCategoryId,
        finalKeywords,
        employment_type || 'Full Time',
        workplace_type || 'On-site',
        seniority_level || 'Mid Level',
        finalOpenings,
        priority || 'standard',
        country || 'India',
        state || null,
        city || null,
        locality || null,
        minExp,
        maxExp,
        fresher_allowed ? 1 : 0,
        min_qualification || null,
        degree || null,
        specialization || null,
        finalSkills,
        minSal,
        maxSal,
        salary_period || 'Per Year',
        currency || 'INR',
        salary_type || 'CTC',
        finalBenefits,
        application_deadline || null,
        notice_period || '30 Days',
        hiring_manager || null,
        userId,
        'EMPLOYER',
        'EMPLOYER_POSTED'
      ]
    );

    // Sync relational skills, keywords, benefits, and multi-location hubs
    await syncJobKeywords(id, cleanKeywords);
    await syncJobSkills(id, parsedSkillsArray);
    await syncJobBenefits(id, cleanBenefits);
    await syncJobLocations(id, req.body.selected_locations || req.body.location, {
      country: country,
      state: state,
      city: city,
      locality: locality,
      location: finalLocation
    });

    const createdRows = await db.query('SELECT * FROM JOB WHERE id = ?', [id]);
    const createdJob = createdRows.length > 0 ? createdRows[0] : null;

    res.status(201).json({
      success: true,
      message: 'Job requisition draft created successfully.',
      job_id: id,
      job: createdJob
    });
  } catch (error) {
    console.error('Error creating employer job:', error);
    res.status(500).json({ success: false, message: 'Error creating job.', error: error.message });
  }
};

// Update an existing employer job (Basic Details / Step 1)
const updateEmployerJob = async (req, res) => {
  try {
    const userId = req.user.id;
    const jobId = req.params.id;
    const {
      title,
      department,
      job_domain,
      category_id,
      keywords,
      employment_type,
      workplace_type,
      seniority_level,
      openings_count,
      priority,
      country,
      state,
      city,
      locality,
      location,
      min_experience,
      max_experience,
      fresher_allowed,
      min_qualification,
      degree,
      specialization,
      required_skills,
      application_deadline,
      notice_period,
      hiring_manager,
      min_salary,
      max_salary,
      salary_period,
      currency,
      salary_type,
      benefits,
      description,
      status
    } = req.body;

    const employer = await getOrCreateEmployerForUser(userId, req.user.role, req.user.name);
    if (!employer) {
      return res.status(404).json({ success: false, message: 'Employer profile not found.' });
    }

    // Check if job exists
    const existingJobs = await db.query('SELECT * FROM JOB WHERE id = ?', [jobId]);
    if (existingJobs.length === 0) {
      return res.status(404).json({ success: false, message: 'Job not found.' });
    }

    const job = existingJobs[0];

    // Multi-tenant authorization check
    const isOwner = (job.employer_id && String(job.employer_id) === String(employer.id)) ||
                    (job.client_id && String(job.client_id) === String(employer.id));
    const isStaffAdmin = ['admin', 'main_admin', 'director', 'recruiter', 'tl_coordinator'].includes(req.user.role);

    if (!isOwner && !isStaffAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only edit your own jobs.' });
    }

    // Category Master Validation
    if (Array.isArray(category_id)) {
      return res.status(400).json({ success: false, message: 'Only a single Job Category can be selected.' });
    }

    let finalCategoryId = job.category_id || null;
    let finalJobDomain = sanitizeText(job_domain || job.job_domain || 'General');

    if (category_id !== undefined && category_id !== null && category_id !== '') {
      let dbCat = [];
      try {
        dbCat = await db.query('SELECT id, name FROM JOB_CATEGORY WHERE id = ?', [category_id]);
      } catch (_) {}

      if (dbCat.length > 0) {
        finalCategoryId = dbCat[0].id;
        finalJobDomain = dbCat[0].name;
      } else if (typeof category_id === 'string' && (category_id.startsWith('cat') || category_id.length >= 8)) {
        finalCategoryId = category_id;
        if (job_domain && job_domain.trim()) {
          finalJobDomain = sanitizeText(job_domain.trim());
        }
      } else {
        return res.status(400).json({ success: false, message: 'Invalid Job Category selected.' });
      }
    } else if (category_id === null) {
      finalCategoryId = null;
    }

    // Server-side validation
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Job title is required.' });
    }

    const finalLocation = location || [city, state, country].filter(Boolean).join(', ') || job.location;
    if (!finalLocation || !finalLocation.trim()) {
      return res.status(400).json({ success: false, message: 'Work location is required.' });
    }

    const minExp = min_experience != null ? Number(min_experience) : (job.min_experience || 0);
    const maxExp = max_experience != null ? Number(max_experience) : (job.max_experience || 0);
    if (isNaN(minExp) || isNaN(maxExp) || minExp < 0 || maxExp < 0) {
      return res.status(400).json({ success: false, message: 'Experience values must be valid non-negative numbers.' });
    }
    if (minExp > maxExp) {
      return res.status(400).json({ success: false, message: 'Minimum experience cannot exceed maximum experience.' });
    }

    const minSal = min_salary != null && min_salary !== '' ? Number(min_salary) : job.min_salary;
    const maxSal = max_salary != null && max_salary !== '' ? Number(max_salary) : job.max_salary;
    if ((minSal != null && (isNaN(minSal) || minSal < 0)) || (maxSal != null && (isNaN(maxSal) || maxSal < 0))) {
      return res.status(400).json({ success: false, message: 'Salary amounts must be valid non-negative numbers.' });
    }
    if (minSal != null && maxSal != null && minSal > maxSal) {
      return res.status(400).json({ success: false, message: 'Minimum salary cannot exceed maximum salary.' });
    }

    const finalOpenings = openings_count ? Math.max(1, parseInt(openings_count, 10)) : (job.openings_count || 1);
    const finalDesc = description !== undefined ? sanitizeText(description) : job.description;
    const finalStatus = status || job.status || 'draft';
    
    // Parse keywords if provided
    let parsedKeywordsArray = [];
    const shouldUpdateKeywords = keywords !== undefined;
    if (shouldUpdateKeywords) {
      if (Array.isArray(keywords)) {
        parsedKeywordsArray = keywords;
      } else if (typeof keywords === 'string' && keywords.trim()) {
        try {
          const parsed = JSON.parse(keywords);
          if (Array.isArray(parsed)) parsedKeywordsArray = parsed;
          else parsedKeywordsArray = keywords.split(',').map(s => s.trim());
        } catch (_) {
          parsedKeywordsArray = keywords.split(',').map(s => s.trim());
        }
      }
      const seenKw = new Set();
      const cleanKeywords = [];
      for (const kw of parsedKeywordsArray) {
        if (typeof kw !== 'string') continue;
        const trimmed = sanitizeText(kw.trim());
        if (!trimmed) continue;
        const lower = trimmed.toLowerCase();
        if (!seenKw.has(lower)) {
          seenKw.add(lower);
          cleanKeywords.push(trimmed);
        }
      }
      parsedKeywordsArray = cleanKeywords;
    }
    const finalKeywords = shouldUpdateKeywords ? JSON.stringify(parsedKeywordsArray) : (job.keywords || '[]');

    let parsedSkillsArray = [];
    if (required_skills !== undefined) {
      if (Array.isArray(required_skills)) parsedSkillsArray = required_skills;
      else if (typeof required_skills === 'string') {
        try { parsedSkillsArray = JSON.parse(required_skills); } catch (_) { parsedSkillsArray = required_skills.split(',').map(s => s.trim()); }
      }
    }
    const finalSkills = required_skills !== undefined ? JSON.stringify(parsedSkillsArray) : (job.required_skills || '[]');

    let parsedBenefitsArray = [];
    const shouldUpdateBenefits = benefits !== undefined;
    if (shouldUpdateBenefits) {
      if (Array.isArray(benefits)) {
        parsedBenefitsArray = benefits;
      } else if (typeof benefits === 'string' && benefits.trim()) {
        try {
          const parsed = JSON.parse(benefits);
          if (Array.isArray(parsed)) parsedBenefitsArray = parsed;
          else parsedBenefitsArray = benefits.split(',').map(s => s.trim());
        } catch (_) {
          parsedBenefitsArray = benefits.split(',').map(s => s.trim());
        }
      }
      const seenBen = new Set();
      const cleanBenefits = [];
      for (const b of parsedBenefitsArray) {
        if (typeof b !== 'string') continue;
        const trimmed = sanitizeText(b.trim());
        if (!trimmed) continue;
        const lower = trimmed.toLowerCase();
        if (!seenBen.has(lower)) {
          seenBen.add(lower);
          cleanBenefits.push(trimmed);
        }
      }
      parsedBenefitsArray = cleanBenefits;
    }
    const finalBenefits = shouldUpdateBenefits ? JSON.stringify(parsedBenefitsArray) : job.benefits;

    await db.query(
      `UPDATE JOB SET
        title = ?, description = ?, location = ?, status = ?,
        department = ?, job_domain = ?, category_id = ?, keywords = ?, employment_type = ?, workplace_type = ?,
        seniority_level = ?, openings_count = ?, priority = ?,
        country = ?, state = ?, city = ?, locality = ?,
        min_experience = ?, max_experience = ?, fresher_allowed = ?,
        min_qualification = ?, degree = ?, specialization = ?, required_skills = ?,
        min_salary = ?, max_salary = ?, salary_period = ?, currency = ?, salary_type = ?,
        benefits = ?, application_deadline = ?, notice_period = ?, hiring_manager = ?
      WHERE id = ?`,
      [
        sanitizeText(title.trim()),
        finalDesc,
        sanitizeText(finalLocation.trim()),
        finalStatus,
        sanitizeText(department || job.department || 'General'),
        finalJobDomain,
        finalCategoryId,
        finalKeywords,
        employment_type || job.employment_type || 'Full Time',
        workplace_type || job.workplace_type || 'On-site',
        seniority_level || job.seniority_level || 'Mid Level',
        finalOpenings,
        priority || job.priority || 'standard',
        country || job.country || 'India',
        state || job.state || null,
        city || job.city || null,
        locality || job.locality || null,
        minExp,
        maxExp,
        fresher_allowed !== undefined ? (fresher_allowed ? 1 : 0) : job.fresher_allowed,
        min_qualification || job.min_qualification || null,
        degree || job.degree || null,
        specialization || job.specialization || null,
        finalSkills,
        minSal,
        maxSal,
        salary_period || job.salary_period || 'Per Year',
        currency || job.currency || 'INR',
        salary_type || job.salary_type || 'CTC',
        finalBenefits,
        application_deadline !== undefined ? application_deadline : job.application_deadline,
        notice_period || job.notice_period || '30 Days',
        hiring_manager !== undefined ? hiring_manager : job.hiring_manager,
        jobId
      ]
    );

    if (shouldUpdateKeywords) {
      await syncJobKeywords(jobId, parsedKeywordsArray);
    }
    if (required_skills !== undefined) {
      await syncJobSkills(jobId, parsedSkillsArray);
    }
    if (shouldUpdateBenefits) {
      await syncJobBenefits(jobId, parsedBenefitsArray);
    }
    await syncJobLocations(jobId, req.body.selected_locations || req.body.location, {
      country: country || job.country,
      state: state || job.state,
      city: city || job.city,
      locality: locality || job.locality,
      location: finalLocation
    });

    const updatedRows = await db.query('SELECT * FROM JOB WHERE id = ?', [jobId]);

    res.json({
      success: true,
      message: 'Job requisition updated successfully.',
      job_id: jobId,
      job: updatedRows.length > 0 ? updatedRows[0] : null
    });
  } catch (error) {
    console.error('Error updating employer job:', error);
    res.status(500).json({ success: false, message: 'Error updating job.', error: error.message });
  }
};

const getEmployerJobById = async (req, res) => {
  try {
    const userId = req.user.id;
    const jobId = req.params.id;

    const employer = await getOrCreateEmployerForUser(userId, req.user.role, req.user.name);
    if (!employer) {
      return res.status(404).json({ success: false, message: 'Employer profile not found.' });
    }

    const jobs = await db.query('SELECT * FROM JOB WHERE id = ?', [jobId]);
    if (jobs.length === 0) {
      return res.status(404).json({ success: false, message: 'Job not found.' });
    }

    const job = jobs[0];

    // Multi-tenant authorization check
    const isOwner = (job.employer_id && String(job.employer_id) === String(employer.id)) ||
                    (job.client_id && String(job.client_id) === String(employer.id));
    const isStaffAdmin = ['admin', 'main_admin', 'director', 'recruiter', 'tl_coordinator'].includes(req.user.role);

    if (!isOwner && !isStaffAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only view your own jobs.' });
    }

    let parsedResp = job.responsibilities;
    let parsedReqs = job.requirements;
    let parsedKeywords = job.keywords;

    try {
      if (typeof parsedResp === 'string' && (parsedResp.startsWith('[') || parsedResp.startsWith('{'))) {
        parsedResp = JSON.parse(parsedResp);
      }
    } catch (_) {}

    try {
      if (typeof parsedReqs === 'string' && (parsedReqs.startsWith('[') || parsedReqs.startsWith('{'))) {
        parsedReqs = JSON.parse(parsedReqs);
      }
    } catch (_) {}

    let benefitsList = [];
    try {
      const dbBenefits = await db.query('SELECT benefit_name FROM JOB_BENEFIT WHERE job_id = ? ORDER BY created_at ASC', [jobId]);
      if (dbBenefits && dbBenefits.length > 0) {
        benefitsList = dbBenefits.map(b => b.benefit_name);
      }
    } catch (_) {}

    if (benefitsList.length === 0 && job.benefits) {
      try {
        const parsed = JSON.parse(job.benefits);
        if (Array.isArray(parsed)) benefitsList = parsed;
        else benefitsList = job.benefits.split(',').map(s => s.trim()).filter(Boolean);
      } catch (_) {
        benefitsList = job.benefits.split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    let keywordsList = [];
    try {
      const dbKw = await db.query('SELECT keyword FROM JOB_KEYWORD WHERE job_id = ?', [jobId]);
      if (dbKw && dbKw.length > 0) {
        keywordsList = dbKw.map(k => k.keyword);
      }
    } catch (_) {}

    if (keywordsList.length === 0 && job.keywords) {
      try {
        if (typeof job.keywords === 'string' && job.keywords.trim()) {
          const jsonParsed = JSON.parse(job.keywords);
          if (Array.isArray(jsonParsed)) keywordsList = jsonParsed;
          else keywordsList = job.keywords.split(',').map(s => s.trim()).filter(Boolean);
        }
      } catch (_) {
        if (typeof job.keywords === 'string') {
          keywordsList = job.keywords.split(',').map(s => s.trim()).filter(Boolean);
        }
      }
    }
    if (!Array.isArray(keywordsList)) {
      keywordsList = [];
    }

    let skillsList = [];
    try {
      const dbSkills = await db.query('SELECT skill_name FROM JOB_SKILL WHERE job_id = ?', [jobId]);
      if (dbSkills && dbSkills.length > 0) {
        skillsList = dbSkills.map(s => s.skill_name);
      }
    } catch (_) {}
    if (skillsList.length === 0 && job.required_skills) {
      try {
        const parsed = JSON.parse(job.required_skills);
        if (Array.isArray(parsed)) skillsList = parsed;
        else skillsList = job.required_skills.split(',').map(s => s.trim()).filter(Boolean);
      } catch (_) {
        skillsList = job.required_skills.split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    let questions = await db.query('SELECT * FROM JOB_QUESTION WHERE job_id = ? ORDER BY order_index ASC', [jobId]);
    if ((!questions || questions.length === 0) && job.screening_questions) {
      try {
        const parsed = typeof job.screening_questions === 'string' ? JSON.parse(job.screening_questions) : job.screening_questions;
        if (Array.isArray(parsed)) questions = parsed;
      } catch (_) {}
    }

    let locationsList = [];
    try {
      const dbLocs = await db.query('SELECT * FROM JOB_LOCATION WHERE job_id = ? ORDER BY is_primary DESC, created_at ASC', [jobId]);
      if (dbLocs && dbLocs.length > 0) {
        locationsList = dbLocs.map(l => l.location_text);
      }
    } catch (_) {}

    if (locationsList.length === 0 && job.location) {
      locationsList = job.location.split(';').map(s => s.trim()).filter(Boolean);
    }

    let companyName = '';
    if (job.employer_id) {
      try {
        const empRows = await db.query('SELECT company_name FROM EMPLOYERS WHERE id = ?', [job.employer_id]);
        if (empRows.length > 0) companyName = empRows[0].company_name;
      } catch (_) {}
    }
    if (!companyName && employer) {
      companyName = employer.company_name;
    }

    const safeJob = { ...job };
    if (!isStaffAdmin) {
      delete safeJob.internal_notes;
      delete safeJob.assigned_recruiter_id;
      delete safeJob.assigned_tl_id;
    }

    res.json({
      success: true,
      job: {
        ...safeJob,
        company_name: companyName,
        locations: locationsList,
        keywords: keywordsList,
        required_skills: skillsList,
        responsibilities: parsedResp,
        requirements: parsedReqs,
        benefits: benefitsList,
        screening_questions: questions || []
      }
    });
  } catch (error) {
    console.error('Error fetching employer job by id:', error);
    res.status(500).json({ success: false, message: 'Error retrieving job details.', error: error.message });
  }
};

const generateEmployerJobDescription = async (req, res) => {
  try {
    const userId = req.user.id;
    const targetJobId = req.params.id || req.body.job_id || req.body.jobId;

    let employer = null;
    try {
      employer = await getOrCreateEmployerForUser(userId, req.user.role, req.user.name);
    } catch (_) {}

    let jobRecord = null;
    if (targetJobId && targetJobId !== 'draft-job') {
      try {
        const jobs = await db.query('SELECT * FROM JOB WHERE id = ?', [targetJobId]);
        if (jobs.length > 0) {
          jobRecord = jobs[0];
          if (employer && jobRecord.employer_id && String(jobRecord.employer_id) !== String(employer.id) && req.user.role !== 'admin') {
            return res.status(403).json({
              success: false,
              message: 'Access denied: You can only generate descriptions for your own jobs.'
            });
          }
        }
      } catch (err) {
        console.warn('Notice loading job for AI generation:', err.message);
      }
    }

    // 1. Database-driven Location Resolution & Hierarchy Validation
    const locRes = await resolveAndValidateJobLocation(jobRecord || req.body);
    if (!locRes.isValid) {
      return res.status(400).json({
        success: false,
        message: locRes.message
      });
    }

    // 2. Category Resolution from JOB_CATEGORY table or jobRecord
    let categoryName = req.body.category || req.body.job_domain || (jobRecord ? jobRecord.job_domain : 'General');
    if (jobRecord && jobRecord.category_id) {
      try {
        const catRows = await db.query('SELECT name FROM JOB_CATEGORY WHERE id = ?', [jobRecord.category_id]);
        if (catRows.length > 0) {
          categoryName = catRows[0].name;
        }
      } catch (_) {}
    }

    // 3. Skills Loading from Relational JOB_SKILL or jobRecord
    let skillsList = req.body.skills || [];
    if ((!skillsList || skillsList.length === 0) && targetJobId && targetJobId !== 'draft-job') {
      try {
        const relSkills = await db.query('SELECT skill_name FROM JOB_SKILL WHERE job_id = ?', [targetJobId]);
        if (relSkills && relSkills.length > 0) {
          skillsList = relSkills.map(s => s.skill_name);
        }
      } catch (_) {}
    }
    if ((!skillsList || skillsList.length === 0) && jobRecord && jobRecord.required_skills) {
      try {
        const parsed = JSON.parse(jobRecord.required_skills);
        if (Array.isArray(parsed)) skillsList = parsed;
        else skillsList = jobRecord.required_skills.split(',').map(s => s.trim()).filter(Boolean);
      } catch (_) {
        skillsList = jobRecord.required_skills.split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    // 4. Benefits Loading from Relational JOB_BENEFIT, jobRecord, or request
    let benefitsList = req.body.benefits || [];
    if ((!benefitsList || benefitsList.length === 0) && targetJobId && targetJobId !== 'draft-job') {
      try {
        const relBenefits = await db.query('SELECT benefit_name FROM JOB_BENEFIT WHERE job_id = ? ORDER BY created_at ASC', [targetJobId]);
        if (relBenefits && relBenefits.length > 0) {
          benefitsList = relBenefits.map(b => b.benefit_name);
        }
      } catch (_) {}
    }
    if ((!benefitsList || benefitsList.length === 0) && jobRecord && jobRecord.benefits) {
      try {
        const parsed = JSON.parse(jobRecord.benefits);
        if (Array.isArray(parsed)) benefitsList = parsed;
        else benefitsList = jobRecord.benefits.split(',').map(s => s.trim()).filter(Boolean);
      } catch (_) {
        benefitsList = jobRecord.benefits.split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    const title = req.body.title || (jobRecord ? jobRecord.title : '') || 'Professional Role';
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Job title is required for AI generation.' });
    }

    let companyName = req.body.company_name || req.body.companyName || '';
    if (!companyName && employer && employer.company_name && employer.company_name !== 'Pending Company Profile') {
      companyName = employer.company_name;
    }
    if (!companyName && jobRecord && jobRecord.employer_id) {
      try {
        const empRows = await db.query('SELECT company_name FROM EMPLOYERS WHERE id = ?', [jobRecord.employer_id]);
        if (empRows.length > 0 && empRows[0].company_name && empRows[0].company_name !== 'Pending Company Profile') {
          companyName = empRows[0].company_name;
        }
      } catch (_) {}
    }
    if (!companyName || companyName === 'Pending Company Profile') {
      companyName = 'Scan2Serve';
    }

    const jobDetails = {
      title: title.trim(),
      company_name: companyName,
      companyName: companyName,
      department: req.body.department || (jobRecord ? jobRecord.department : 'General'),
      job_domain: categoryName,
      category: categoryName,
      location: locRes.formattedText,
      locationText: locRes.formattedText,
      workplace_type: req.body.workplace_type || (jobRecord ? jobRecord.workplace_type : 'On-site'),
      employment_type: req.body.employment_type || (jobRecord ? jobRecord.employment_type : 'Full-time Permanent'),
      seniority_level: req.body.seniority_level || (jobRecord ? jobRecord.seniority_level : 'Mid Level'),
      min_experience: jobRecord ? jobRecord.min_experience : null,
      max_experience: jobRecord ? jobRecord.max_experience : null,
      skills: skillsList,
      benefits: benefitsList
    };

    const reqId = uuidv4();
    const inputRef = JSON.stringify({
      job_id: targetJobId,
      title: jobDetails.title,
      category: jobDetails.job_domain,
      department: jobDetails.department,
      location: jobDetails.location
    });

    try {
      await db.query(
        'INSERT INTO AI_REQUEST (id, user_id, type, status, input_reference, model) VALUES (?, ?, "jd_generator", "pending", ?, "gemini-1.5-flash")',
        [reqId, userId, inputRef]
      );
    } catch (_) {}

    const aiRes = await aiService.generateJobDescription(jobDetails);

    if (!aiRes || aiRes.isValid === false) {
      try {
        await db.query(
          'UPDATE AI_REQUEST SET status = "failed", output = ?, model = ? WHERE id = ?',
          [aiRes?.message || aiRes?.error || 'AI generation failed', aiRes?.model || 'gemini', reqId]
        );
      } catch (_) {}

      return res.status(422).json({
        success: false,
        error: true,
        message: aiRes?.message || 'AI job description generation is currently unavailable.',
        error_code: aiRes?.errorCode || 'AI_GENERATION_FAILED',
        is_simulated: false,
        source: 'GEMINI'
      });
    }

    let structuredData = null;
    if (aiRes && aiRes.structuredData) {
      structuredData = aiRes.structuredData;
    } else if (aiRes && aiRes.text) {
      try {
        const cleaned = aiRes.text.replace(/```json/gi, '').replace(/```/g, '').trim();
        structuredData = JSON.parse(cleaned);
      } catch (_) {}
    }

    // STRICT SCHEMATIC AI OUTPUT VALIDATION
    const isResponsibilitiesValid = structuredData && Array.isArray(structuredData.responsibilities) && structuredData.responsibilities.length >= 3;
    const isRequirementsValid = structuredData && Array.isArray(structuredData.requirements) && structuredData.requirements.length >= 3;
    const isOverviewValid = structuredData && typeof structuredData.overview === 'string' && structuredData.overview.trim().length >= 20;

    if (!structuredData || !isResponsibilitiesValid || !isRequirementsValid || !isOverviewValid) {
      try {
        await db.query(
          'UPDATE AI_REQUEST SET status = "failed", output = ? WHERE id = ?',
          ['Incomplete structured output generated', reqId]
        );
      } catch (_) {}

      return res.status(422).json({
        success: false,
        message: 'AI returned an incomplete structured job description. Please try generating again.',
        error_code: 'INCOMPLETE_AI_RESPONSE'
      });
    }

    const isSimulated = typeof aiRes === 'object' && aiRes.is_simulated !== undefined ? aiRes.is_simulated : false;
    const modelUsed = typeof aiRes === 'object' && aiRes.model ? aiRes.model : 'gemini-1.5-flash';
    const outputSource = aiRes && aiRes.source ? aiRes.source : (isSimulated ? 'FALLBACK' : 'GEMINI');
    const outputText = JSON.stringify(structuredData);

    try {
      await db.query(
        'UPDATE AI_REQUEST SET status = "completed", output = ?, model = ? WHERE id = ?',
        [outputText, modelUsed, reqId]
      );
    } catch (_) {}

    return res.json({
      success: true,
      data: structuredData,
      job_description: outputText,
      is_simulated: isSimulated,
      source: outputSource,
      model: modelUsed,
      request_id: reqId,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating AI JD:', error.message);
    return res.status(500).json({
      success: false,
      message: 'AI generation is temporarily unavailable. Please try again.',
      error: error.message
    });
  }
};

const updateEmployerJobDescription = async (req, res) => {
  try {
    const userId = req.user.id;
    const jobId = req.params.id;
    const {
      title,
      description,
      responsibilities,
      requirements,
      required_skills,
      skills,
      benefits,
      status
    } = req.body;

    const employer = await getOrCreateEmployerForUser(userId, req.user.role, req.user.name);
    if (!employer) {
      return res.status(404).json({ success: false, message: 'Employer profile not found.' });
    }

    const existingJobs = await db.query('SELECT * FROM JOB WHERE id = ?', [jobId]);
    if (existingJobs.length === 0) {
      return res.status(404).json({ success: false, message: 'Job not found.' });
    }

    const job = existingJobs[0];

    // Multi-tenant authorization check
    if (job.employer_id && String(job.employer_id) !== String(employer.id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied: You can only edit your own jobs.' });
    }

    const finalTitle = title !== undefined && title.trim() ? sanitizeText(title.trim()) : job.title;
    const finalDesc = description !== undefined ? sanitizeText(description) : job.description;
    const finalResp = typeof responsibilities === 'object' ? JSON.stringify(responsibilities) : (responsibilities !== undefined ? responsibilities : job.responsibilities);
    const finalReqs = typeof requirements === 'object' ? JSON.stringify(requirements) : (requirements !== undefined ? requirements : job.requirements);
    const finalBenefits = typeof benefits === 'object' ? JSON.stringify(benefits) : (benefits !== undefined ? benefits : job.benefits);
    const finalStatus = status || job.status || 'draft';

    const skillInput = required_skills !== undefined ? required_skills : skills;
    let parsedSkillsArray = [];
    if (Array.isArray(skillInput)) {
      parsedSkillsArray = skillInput;
    } else if (typeof skillInput === 'string' && skillInput.trim()) {
      try {
        const p = JSON.parse(skillInput);
        if (Array.isArray(p)) parsedSkillsArray = p;
        else parsedSkillsArray = skillInput.split(',').map(s => s.trim()).filter(Boolean);
      } catch (_) {
        parsedSkillsArray = skillInput.split(',').map(s => s.trim()).filter(Boolean);
      }
    } else if (job.required_skills) {
      try {
        const p = JSON.parse(job.required_skills);
        if (Array.isArray(p)) parsedSkillsArray = p;
        else parsedSkillsArray = job.required_skills.split(',').map(s => s.trim()).filter(Boolean);
      } catch (_) {
        parsedSkillsArray = job.required_skills.split(',').map(s => s.trim()).filter(Boolean);
      }
    }
    const finalSkillsJson = JSON.stringify(parsedSkillsArray);

    await db.query(
      `UPDATE JOB SET
        title = ?, description = ?, responsibilities = ?, requirements = ?, required_skills = ?, benefits = ?, status = ?
      WHERE id = ?`,
      [
        finalTitle,
        finalDesc,
        finalResp,
        finalReqs,
        finalSkillsJson,
        finalBenefits,
        finalStatus,
        jobId
      ]
    );

    if (parsedSkillsArray.length > 0) {
      try {
        await syncJobSkills(jobId, parsedSkillsArray);
      } catch (err) {
        console.warn('⚠️ Skill sync warning:', err.message);
      }
    }

    const updatedRows = await db.query('SELECT * FROM JOB WHERE id = ?', [jobId]);

    res.json({
      success: true,
      message: 'Job description saved successfully.',
      job_id: jobId,
      job: updatedRows[0]
    });
  } catch (error) {
    console.error('Error updating job description:', error);
    res.status(500).json({ success: false, message: 'Error saving job description.', error: error.message });
  }
};

const getEmployerJobQuestions = async (req, res) => {
  try {
    const userId = req.user.id;
    const jobId = req.params.id;

    const employer = await getOrCreateEmployerForUser(userId, req.user.role, req.user.name);
    if (!employer) {
      return res.status(404).json({ success: false, message: 'Employer profile not found.' });
    }

    const existingJobs = await db.query('SELECT * FROM JOB WHERE id = ?', [jobId]);
    if (!existingJobs || existingJobs.length === 0) {
      return res.status(404).json({ success: false, message: 'Job not found.' });
    }

    const job = existingJobs[0];

    // Multi-tenant authorization check: strictly verify ownership
    if (String(job.employer_id) !== String(employer.id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied: You can only view questions for your own jobs.' });
    }

    let questions = [];
    try {
      const dbQuestions = await db.query('SELECT * FROM JOB_QUESTION WHERE job_id = ? ORDER BY order_index ASC', [jobId]);
      if (Array.isArray(dbQuestions)) {
        questions = dbQuestions;
      }
    } catch (dbErr) {
      console.warn('JOB_QUESTION query failed, continuing with fallback:', dbErr.message);
    }

    if (questions.length === 0 && job.screening_questions) {
      try {
        const parsed = typeof job.screening_questions === 'string' ? JSON.parse(job.screening_questions) : job.screening_questions;
        if (Array.isArray(parsed)) {
          questions = parsed;
        }
      } catch (_) {}
    }

    res.json({
      success: true,
      job_id: jobId,
      job_title: job.title,
      department: job.department,
      job_domain: job.job_domain,
      questions: questions || []
    });
  } catch (error) {
    console.error('Error fetching job questions:', error);
    res.status(500).json({ success: false, message: 'Error fetching screening questions.', error: error.message });
  }
};

const updateEmployerJobQuestions = async (req, res) => {
  try {
    const userId = req.user.id;
    const jobId = req.params.id;
    const { questions } = req.body;

    if (!Array.isArray(questions)) {
      return res.status(400).json({ success: false, message: 'Questions must be an array.' });
    }

    const employer = await getOrCreateEmployerForUser(userId, req.user.role, req.user.name);
    if (!employer) {
      return res.status(404).json({ success: false, message: 'Employer profile not found.' });
    }

    const existingJobs = await db.query('SELECT * FROM JOB WHERE id = ?', [jobId]);
    if (existingJobs.length === 0) {
      return res.status(404).json({ success: false, message: 'Job not found.' });
    }

    const job = existingJobs[0];

    // Multi-tenant authorization check: strictly verify ownership
    if (String(job.employer_id) !== String(employer.id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied: You can only modify questions for your own jobs.' });
    }

    const formattedQuestions = questions.map((q, idx) => ({
      id: (q.id && q.id.length === 36) ? q.id : uuidv4(),
      job_id: jobId,
      question_text: sanitizeText((q.question_text || q.text || '').trim()),
      question_type: q.question_type || q.type || 'short_text',
      options: typeof q.options === 'object' ? JSON.stringify(q.options) : (q.options || '[]'),
      is_required: q.is_required !== undefined ? (q.is_required ? 1 : 0) : 1,
      is_knockout: q.is_knockout ? 1 : 0,
      ideal_answer: q.ideal_answer || null,
      order_index: idx
    }));

    await db.query('DELETE FROM JOB_QUESTION WHERE job_id = ?', [jobId]);

    for (const q of formattedQuestions) {
      await db.query(
        `INSERT INTO JOB_QUESTION (id, job_id, question_text, question_type, options, is_required, is_knockout, ideal_answer, order_index)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          q.id,
          q.job_id,
          q.question_text,
          q.question_type,
          q.options,
          q.is_required,
          q.is_knockout,
          q.ideal_answer,
          q.order_index
        ]
      );
    }

    await db.query(
      'UPDATE JOB SET screening_questions = ? WHERE id = ?',
      [JSON.stringify(formattedQuestions), jobId]
    );

    res.json({
      success: true,
      message: 'Screening questions saved successfully.',
      job_id: jobId,
      questions_count: formattedQuestions.length,
      questions: formattedQuestions
    });
  } catch (error) {
    console.error('Error saving screening questions:', error);
    res.status(500).json({ success: false, message: 'Error saving screening questions.', error: error.message, stack: error.stack });
  }
};

const publishEmployerJob = async (req, res) => {
  try {
    const userId = req.user.id;
    const jobId = req.params.id;

    const employer = await getOrCreateEmployerForUser(userId, req.user.role, req.user.name);
    if (!employer) {
      return res.status(404).json({ success: false, message: 'Employer profile not found.' });
    }

    const existingJobs = await db.query('SELECT * FROM JOB WHERE id = ?', [jobId]);
    if (existingJobs.length === 0) {
      return res.status(404).json({ success: false, message: 'Job not found.' });
    }

    const job = existingJobs[0];

    // Multi-tenant authorization check
    const isOwner = (job.employer_id && String(job.employer_id) === String(employer.id)) ||
                    (job.client_id && String(job.client_id) === String(employer.id));
    const isStaffAdmin = ['admin', 'main_admin', 'director', 'recruiter', 'tl_coordinator'].includes(req.user.role);

    if (!isOwner && !isStaffAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only publish your own jobs.' });
    }

    // Validate server-side minimum publish requirements
    const validationErrors = [];
    if (!job.title || !job.title.trim()) {
      validationErrors.push('Job title is required.');
    }
    if (!job.location || !job.location.trim()) {
      validationErrors.push('Work location is required.');
    }
    if (!job.description || !job.description.trim() || job.description.trim().length < 20) {
      validationErrors.push('Job description / role overview must be provided (min 20 chars).');
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot publish job due to incomplete requirements.',
        errors: validationErrors
      });
    }

    // Update status to 'open' and set published_at timestamp server-side
    const nowIso = new Date().toISOString();
    await db.query('UPDATE JOB SET status = ?, updated_at = ? WHERE id = ?', ['open', nowIso, jobId]);

    const updatedRows = await db.query('SELECT * FROM JOB WHERE id = ?', [jobId]);

    res.json({
      success: true,
      message: 'Job published successfully and is now active on Vacancy.in!',
      job_id: jobId,
      job: {
        ...updatedRows[0],
        status: 'open'
      }
    });
  } catch (error) {
    console.error('Error publishing job:', error);
    res.status(500).json({ success: false, message: 'Error publishing job.', error: error.message });
  }
};

const getEmployerJobApplicants = async (req, res) => {
  try {
    const userId = req.user.id;
    const jobId = req.params.id;

    const employer = await getOrCreateEmployerForUser(userId, req.user.role, req.user.name);
    if (!employer) {
      return res.status(404).json({ success: false, message: 'Employer profile not found.' });
    }

    const jobs = await db.query('SELECT * FROM JOB WHERE id = ?', [jobId]);
    if (jobs.length === 0) {
      return res.status(404).json({ success: false, message: 'Job posting not found.' });
    }

    const job = jobs[0];

    // Multi-tenant authorization check
    const isOwner = (job.employer_id && String(job.employer_id) === String(employer.id)) ||
                    (job.client_id && String(job.client_id) === String(employer.id));
    const isStaffAdmin = ['admin', 'main_admin', 'director', 'recruiter', 'tl_coordinator'].includes(req.user.role);

    if (!isOwner && !isStaffAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only view applicants for your own jobs.' });
    }

    // 1. Fetch direct applicants
    const apps = await db.query(`
      SELECT 
        a.id, a.job_id, a.candidate_id, a.status, a.applied_at,
        c.name as candidate_name, c.professional_headline, c.current_location,
        c.total_experience, c.profile_type,
        u.email as candidate_email, u.phone as candidate_phone,
        r.id as resume_id, r.resume_title, r.file_name as resume_file_name
      FROM APPLICATION a
      JOIN CANDIDATES c ON a.candidate_id = c.id
      JOIN USERS u ON c.user_id = u.id
      LEFT JOIN CANDIDATE_RESUME r ON c.id = r.candidate_id AND r.is_primary = 1
      WHERE a.job_id = ?
      ORDER BY a.applied_at DESC
    `, [jobId]);

    // 2. Fetch approved candidates shared specifically for this job (Module 6)
    // Requires status = 'APPROVED' and candidate_consent = 1
    const shared = await db.query(`
      SELECT 
        cs.id as share_id, cs.job_id, cs.candidate_id, cs.status as share_status,
        cs.candidate_consent, cs.created_at as shared_at,
        c.name as candidate_name, c.professional_headline, c.current_location,
        c.total_experience, c.profile_type,
        u.email as candidate_email, u.phone as candidate_phone,
        r.id as resume_id, r.resume_title, r.file_name as resume_file_name
      FROM CANDIDATE_SHARING cs
      JOIN CANDIDATES c ON cs.candidate_id = c.id
      JOIN USERS u ON c.user_id = u.id
      LEFT JOIN CANDIDATE_RESUME r ON c.id = r.candidate_id AND r.is_primary = 1
      WHERE cs.job_id = ? AND cs.status = 'APPROVED' AND cs.candidate_consent = 1
        AND (cs.expires_at IS NULL OR cs.expires_at > CURRENT_TIMESTAMP)
      ORDER BY cs.created_at DESC
    `, [jobId]);

    let enquiries = [];
    try {
      enquiries = await db.query('SELECT id, application_id, status, enquiry_type, created_at FROM EMPLOYER_ENQUIRY WHERE job_id = ?', [jobId]);
    } catch (_) {
      enquiries = [];
    }

    const enquiriesByApp = {};
    enquiries.forEach(enq => {
      if (!enquiriesByApp[enq.application_id]) enquiriesByApp[enq.application_id] = [];
      enquiriesByApp[enq.application_id].push(enq);
    });

    const safeApplicants = apps.map((app, index) => {
      const appEnquiries = enquiriesByApp[app.id] || [];
      const refSuffix = app.id.replace(/-/g, '').substring(0, 6).toUpperCase();
      const referenceNumber = `APP-${refSuffix || String(index + 1).padStart(4, '0')}`;

      return {
        id: app.id,
        candidate_id: app.candidate_id,
        candidate_name: app.candidate_name,
        professional_headline: app.professional_headline,
        current_location: app.current_location,
        total_experience: app.total_experience,
        profile_type: app.profile_type,
        candidate_email: app.candidate_email,
        candidate_phone: app.candidate_phone,
        resume_id: app.resume_id,
        reference_number: referenceNumber,
        source: 'DIRECT_APPLICATION',
        job_id: app.job_id,
        job_title: job.title,
        status: app.status || 'applied',
        applied_at: app.applied_at || new Date().toISOString(),
        enquiries_count: appEnquiries.length,
        has_active_enquiry: appEnquiries.some(e => e.status === 'new' || e.status === 'in_progress'),
        latest_enquiry: appEnquiries.length > 0 ? appEnquiries[0] : null
      };
    });

    const safeSharedCandidates = shared.map((s, index) => {
      const refSuffix = s.share_id.replace(/-/g, '').substring(0, 6).toUpperCase();
      const referenceNumber = `REC-${refSuffix || String(index + 1).padStart(4, '0')}`;

      return {
        id: s.share_id,
        candidate_id: s.candidate_id,
        candidate_name: s.candidate_name,
        professional_headline: s.professional_headline,
        current_location: s.current_location,
        total_experience: s.total_experience,
        profile_type: s.profile_type,
        candidate_email: s.candidate_email,
        candidate_phone: s.candidate_phone,
        resume_id: s.resume_id,
        reference_number: referenceNumber,
        source: 'VAKANCY_RECOMMENDED',
        job_id: s.job_id,
        job_title: job.title,
        status: 'recommended',
        applied_at: s.shared_at || new Date().toISOString(),
        enquiries_count: 0,
        has_active_enquiry: false,
        latest_enquiry: null
      };
    });

    const combinedList = [...safeApplicants, ...safeSharedCandidates];

    const metrics = {
      total: combinedList.length,
      direct_applicants: apps.length,
      shared_approved: shared.length,
      new_received: combinedList.filter(a => a.status === 'applied' || a.status === 'recommended').length,
      under_review: combinedList.filter(a => a.status === 'reviewing' || a.status === 'screening').length,
      shortlisted: combinedList.filter(a => a.status === 'shortlisted').length,
      interview: combinedList.filter(a => a.status === 'interview').length,
      selected: combinedList.filter(a => a.status === 'hired' || a.status === 'selected').length,
      enquiries_total: enquiries.length
    };

    res.json({
      success: true,
      job: {
        id: job.id,
        title: job.title,
        department: job.department || 'General',
        job_domain: job.job_domain || 'General',
        location: job.location || 'Hybrid',
        workplace_type: job.workplace_type || 'On-site',
        employment_type: job.employment_type || 'Full-time Permanent',
        status: job.status
      },
      metrics,
      applicants: combinedList,
      shared_candidates: safeSharedCandidates
    });
  } catch (error) {
    console.error('Error fetching job applicants:', error);
    res.status(500).json({ success: false, message: 'Error retrieving applicants list.', error: error.message });
  }
};

const getEmployerCandidateResume = async (req, res) => {
  try {
    const userId = req.user.id;
    const resumeId = req.params.id;
    const employer = await getOrCreateEmployerForUser(userId, req.user.role, req.user.name);
    if (!employer) return res.status(404).json({ success: false, message: 'Employer profile not found.' });

    let resumes = await db.query('SELECT * FROM CANDIDATE_RESUME WHERE id = ? OR candidate_id = ? ORDER BY is_primary DESC LIMIT 1', [resumeId, resumeId]);
    let targetCandidateId = resumes.length > 0 ? resumes[0].candidate_id : resumeId;

    // Multi-tenant check: Has this candidate applied to ANY job belonging to this employer,
    // OR has this candidate been approved & shared with this employer for an authorized job?
    const appCheck = await db.query(`
      SELECT a.id FROM APPLICATION a
      JOIN JOB j ON a.job_id = j.id
      WHERE a.candidate_id = ? AND (j.employer_id = ? OR j.client_id = ?)
    `, [targetCandidateId, employer.id, employer.id]);

    const shareCheck = await db.query(`
      SELECT cs.id FROM CANDIDATE_SHARING cs
      LEFT JOIN JOB j ON cs.job_id = j.id
      WHERE cs.candidate_id = ? AND cs.status = 'APPROVED' AND cs.candidate_consent = 1
        AND (cs.expires_at IS NULL OR cs.expires_at > CURRENT_TIMESTAMP)
        AND (cs.client_id = ? OR j.employer_id = ? OR j.client_id = ?)
    `, [targetCandidateId, employer.id, employer.id, employer.id]);

    if (appCheck.length === 0 && shareCheck.length === 0 && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: You do not have authorization to view this candidate resume.'
      });
    }

    if (resumes.length === 0) {
      return res.status(404).json({ success: false, message: 'Resume not found.' });
    }

    const resume = resumes[0];

    if (resume.file_url) {
      return res.json({
        success: true,
        file_url: resume.file_url,
        file_name: resume.file_name || 'candidate_resume.pdf'
      });
    }
    res.status(404).json({ success: false, message: 'Resume file not available.' });
  } catch (error) {
    console.error('getEmployerCandidateResume error:', error);
    res.status(500).json({ success: false, message: 'Error retrieving resume.', error: error.message });
  }
};

const createEmployerApplicationEnquiry = async (req, res) => {
  try {
    const userId = req.user.id;
    const applicationId = req.params.id;
    const { enquiry_type, message } = req.body;

    if (!enquiry_type || !enquiry_type.trim()) {
      return res.status(400).json({ success: false, message: 'Enquiry type / reason is required.' });
    }

    const employer = await getOrCreateEmployerForUser(userId, req.user.role, req.user.name);
    if (!employer) {
      return res.status(404).json({ success: false, message: 'Employer profile not found.' });
    }

    const apps = await db.query('SELECT * FROM APPLICATION WHERE id = ?', [applicationId]);
    if (apps.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    const app = apps[0];

    const jobs = await db.query('SELECT * FROM JOB WHERE id = ?', [app.job_id]);
    if (jobs.length === 0) {
      return res.status(404).json({ success: false, message: 'Associated job not found.' });
    }

    const job = jobs[0];

    if (job.employer_id && String(job.employer_id) !== String(employer.id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied: You can only raise enquiries for your own applicants.' });
    }

    const enquiryId = uuidv4();
    const cleanType = sanitizeText(enquiry_type.trim());
    const cleanMsg = message ? sanitizeText(message.trim()) : '';
    const nowIso = new Date().toISOString();

    const existingEnquiries = await db.query(
      'SELECT id, created_at FROM EMPLOYER_ENQUIRY WHERE application_id = ? AND enquiry_type = ?',
      [app.id, cleanType]
    );
    if (existingEnquiries && existingEnquiries.length > 0) {
      const recent = existingEnquiries[existingEnquiries.length - 1];
      if (recent && recent.created_at) {
        const diffMs = Date.now() - new Date(recent.created_at).getTime();
        if (diffMs < 5000) {
          return res.status(429).json({ success: false, message: 'An identical enquiry was just submitted. Please wait a moment.' });
        }
      }
    }

    await db.query(
      `INSERT INTO EMPLOYER_ENQUIRY (
        id, employer_id, job_id, application_id, enquiry_type, message, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [enquiryId, employer.id, job.id, app.id, cleanType, cleanMsg, 'new', nowIso]
    );

    try {
       const notifId = uuidv4();
       const adminUsers = await db.query('SELECT id FROM USERS WHERE role = "admin" LIMIT 1');
       const adminUserId = adminUsers.length > 0 ? adminUsers[0].id : userId;
       await db.query(
         'INSERT INTO NOTIFICATION (id, user_id, type, title, message, reference_type, reference_id) VALUES (?, ?, "employer_enquiry", "New Employer Candidate Enquiry", ?, "EMPLOYER_ENQUIRY", ?)',
         [notifId, adminUserId, `Employer ${employer.company_name || 'Partner'} submitted an enquiry for job "${job.title}".`, enquiryId]
       );
    } catch (_) {}

    try {
      const userRows = await db.query('SELECT email FROM USERS WHERE id = ?', [userId]);
      const employerEmail = userRows.length > 0 ? userRows[0].email : null;
      const enquiryRef = `ENQ-${enquiryId.slice(0, 8).toUpperCase()}`;
      const applicationRef = `APP-${app.id.slice(0, 8).toUpperCase()}`;
      const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

      if (employerEmail) {
        sendEmployerEnquiryConfirmationEmail(employerEmail, {
          enquiryRef,
          jobTitle: job.title,
          applicationRef,
          enquiryType: cleanType,
          message: cleanMsg,
          submittedAt: timestamp
        }).catch(err => {
          console.warn('⚠️ [Async Email] Employer enquiry confirmation email error:', err.message);
        });
      }

      sendInternalEnquiryAlertEmail({
        enquiryRef,
        employerName: employer.company_name,
        employerEmail: employerEmail || 'N/A',
        jobTitle: job.title,
        applicationRef,
        enquiryType: cleanType,
        message: cleanMsg,
        submittedAt: timestamp
      }).catch(err => {
        console.warn('⚠️ [Async Email] Internal enquiry alert email error:', err.message);
      });
    } catch (emailErr) {
      console.warn('⚠️ [Email Trigger Error] Non-blocking enquiry emails failed:', emailErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Enquiry submitted to Vacancy.in recruitment team successfully. Our team will contact you shortly.',
      enquiry_id: enquiryId,
      enquiry: {
        id: enquiryId,
        employer_id: employer.id,
        job_id: job.id,
        application_id: app.id,
        enquiry_type: cleanType,
        message: cleanMsg,
        status: 'new'
      }
    });
  } catch (error) {
    console.error('Error creating employer enquiry:', error);
    res.status(500).json({ success: false, message: 'Error submitting enquiry.', error: error.message });
  }
};

const getEmployerApplicationEnquiries = async (req, res) => {
  try {
    const userId = req.user.id;
    const applicationId = req.params.id;

    const employer = await getOrCreateEmployerForUser(userId, req.user.role, req.user.name);
    if (!employer) {
      return res.status(404).json({ success: false, message: 'Employer profile not found.' });
    }

    const apps = await db.query('SELECT * FROM APPLICATION WHERE id = ?', [applicationId]);
    if (apps.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    const app = apps[0];
    const jobs = await db.query('SELECT * FROM JOB WHERE id = ?', [app.job_id]);
    if (jobs.length === 0) {
      return res.status(404).json({ success: false, message: 'Associated job not found.' });
    }

    const job = jobs[0];
    if (job.employer_id && String(job.employer_id) !== String(employer.id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied: You can only view enquiries for your own applicants.' });
    }

    const enquiries = await db.query(
      'SELECT * FROM EMPLOYER_ENQUIRY WHERE application_id = ? ORDER BY created_at DESC',
      [applicationId]
    );

    res.json({
      success: true,
      enquiries: enquiries || []
    });
  } catch (error) {
    console.error('Error fetching enquiries:', error);
    res.status(500).json({ success: false, message: 'Error fetching enquiries.', error: error.message });
  }
};

const updateEmployerOnboarding = async (req, res) => {
  try {
    const userId = req.user.id;
    const { step, is_complete, ...data } = req.body;
    const employer = await getOrCreateEmployerForUser(userId, req.user.role, req.user.name);

    if (!employer) {
      return res.status(404).json({ success: false, message: 'Employer profile not found.' });
    }

    const currentStep = step != null ? Number(step) : (employer.onboarding_step || 1);
    const nextStep = is_complete ? 5 : Math.min(5, Math.max(1, currentStep));
    const isCompleted = is_complete ? 1 : 0;

    const company_name = data.company_name !== undefined ? sanitizeText(data.company_name.trim()) : employer.company_name;
    const company_type = data.company_type !== undefined ? sanitizeText(data.company_type.trim()) : (employer.company_type || '');
    const industry = data.industry !== undefined ? sanitizeText(data.industry.trim()) : (employer.industry || '');
    const website = data.website !== undefined ? data.website.trim() : (employer.website || '');
    const company_size = data.company_size !== undefined ? sanitizeText(data.company_size.trim()) : (employer.company_size || '');
    const about = data.about !== undefined ? sanitizeText(data.about.trim()) : (employer.about || '');
    const logo_url = data.logo_url !== undefined ? data.logo_url.trim() : (employer.logo_url || '');
    const founded_year = data.founded_year !== undefined ? sanitizeText(String(data.founded_year).trim()) : (employer.founded_year || '');

    const country = data.country !== undefined ? sanitizeText(data.country.trim()) : (employer.country || '');
    const state = data.state !== undefined ? sanitizeText(data.state.trim()) : (employer.state || '');
    const city = data.city !== undefined ? sanitizeText(data.city.trim()) : (employer.city || '');
    const address = data.address !== undefined ? sanitizeText(data.address.trim()) : (employer.address || '');
    const pincode = data.pincode !== undefined ? sanitizeText(data.pincode.trim()) : (employer.pincode || '');
    const location = [city, state, country].filter(Boolean).join(', ') || employer.location;

    const contact_person_name = data.contact_person_name !== undefined ? sanitizeText(data.contact_person_name.trim()) : (employer.contact_person_name || '');
    const contact_person_designation = data.contact_person_designation !== undefined ? sanitizeText(data.contact_person_designation.trim()) : (employer.contact_person_designation || '');
    const official_email = data.official_email !== undefined ? data.official_email.trim() : (employer.official_email || '');
    const official_phone = data.official_phone !== undefined ? sanitizeText(data.official_phone.trim()) : (employer.official_phone || '');
    const alt_phone = data.alt_phone !== undefined ? sanitizeText(data.alt_phone.trim()) : (employer.alt_phone || '');

    const linkedin_url = data.linkedin_url !== undefined ? data.linkedin_url.trim() : (employer.linkedin_url || '');
    const instagram_url = data.instagram_url !== undefined ? data.instagram_url.trim() : (employer.instagram_url || '');
    const facebook_url = data.facebook_url !== undefined ? data.facebook_url.trim() : (employer.facebook_url || '');
    const twitter_url = data.twitter_url !== undefined ? data.twitter_url.trim() : (employer.twitter_url || '');

    const webErr = validateUrl(website, 'Company Website');
    if (webErr) return res.status(400).json({ success: false, message: webErr });
    const linkErr = validateSocialPlatformUrl(linkedin_url, 'linkedin', 'LinkedIn URL');
    if (linkErr) return res.status(400).json({ success: false, message: linkErr });
    const instaErr = validateSocialPlatformUrl(instagram_url, 'instagram', 'Instagram URL');
    if (instaErr) return res.status(400).json({ success: false, message: instaErr });
    const fbErr = validateSocialPlatformUrl(facebook_url, 'facebook', 'Facebook URL');
    if (fbErr) return res.status(400).json({ success: false, message: fbErr });
    const twitErr = validateSocialPlatformUrl(twitter_url, 'twitter', 'Twitter / X URL');
    if (twitErr) return res.status(400).json({ success: false, message: twitErr });

    await db.query(
      `UPDATE EMPLOYERS SET
        company_name = ?, company_type = ?, industry = ?, website = ?, company_size = ?, about = ?, logo_url = ?, founded_year = ?,
        country = ?, state = ?, city = ?, address = ?, pincode = ?, location = ?,
        contact_person_name = ?, contact_person_designation = ?, official_email = ?, official_phone = ?, alt_phone = ?,
        linkedin_url = ?, instagram_url = ?, facebook_url = ?, twitter_url = ?,
        onboarding_step = ?, is_onboarding_completed = ?
      WHERE id = ?`,
      [
        company_name, company_type, industry, website, company_size, about, logo_url, founded_year,
        country, state, city, address, pincode, location,
        contact_person_name, contact_person_designation, official_email, official_phone, alt_phone,
        linkedin_url, instagram_url, facebook_url, twitter_url,
        nextStep, isCompleted,
        employer.id
      ]
    );

    const refreshed = await db.query('SELECT * FROM EMPLOYERS WHERE id = ?', [employer.id]);

    res.json({
      success: true,
      message: isCompleted ? 'Company profile onboarding completed successfully!' : 'Onboarding step saved.',
      employer: refreshed[0]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating onboarding profile.', error: error.message });
  }
};

module.exports = {
  getEmployerProfile,
  uploadCompanyLogo,
  updateEmployerProfile,
  updateEmployerOnboarding,
  getEmployerDashboardStats,
  getEmployerJobs,
  getEmployerJobById,
  toggleEmployerJobStatus,
  createEmployerJob,
  updateEmployerJob,
  generateEmployerJobDescription,
  updateEmployerJobDescription,
  getEmployerJobQuestions,
  updateEmployerJobQuestions,
  publishEmployerJob,
  getEmployerJobApplicants,
  getEmployerCandidateResume,
  createEmployerApplicationEnquiry,
  getEmployerApplicationEnquiries
};
