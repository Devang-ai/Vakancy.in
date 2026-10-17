const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { uploadBufferToCloudinary, deleteFromCloudinary } = require('../services/cloudinaryService');

// ==========================================
// CANDIDATE PROFILE & PROFESSIONAL INFO
// ==========================================

const getCandidateProfile = async (req, res) => {
  try {
    const candidateId = req.params.id || (req.user && req.user.role === 'candidate' ? req.user.id : null);
    if (!candidateId) return res.status(400).json({ success: false, message: 'Candidate ID required.' });

    let dbCandidateId = candidateId;
    if (req.user && req.user.role === 'candidate' && !req.params.id) {
       const c = await db.query('SELECT id FROM CANDIDATES WHERE user_id = ?', [req.user.id]);
       if (c.length === 0) return res.status(404).json({ success: false, message: 'Candidate profile not found.' });
       dbCandidateId = c[0].id;
    }

    const candidates = await db.query('SELECT *, DATE_FORMAT(dob, "%Y-%m-%d") as dob FROM CANDIDATES WHERE id = ?', [dbCandidateId]);
    if (candidates.length === 0) {
      return res.status(404).json({ success: false, message: 'Candidate profile not found.' });
    }
    const candidate = candidates[0];

    // Ownership check
    if (req.user && req.user.role === 'candidate' && candidate.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only view your own candidate profile.' });
    }
    if (req.user && req.user.role === 'employer') {
      return res.status(403).json({ success: false, message: 'Access denied: Employers cannot access candidate personal profiles directly.' });
    }

    // Get relations
    const projects = await db.query('SELECT * FROM CANDIDATE_PROJECT WHERE candidate_id = ? ORDER BY start_date DESC', [dbCandidateId]);
      const experience = await db.query('SELECT * FROM CANDIDATE_EXPERIENCE WHERE candidate_id = ? ORDER BY from_date DESC', [dbCandidateId]);
    const education = await db.query('SELECT * FROM CANDIDATE_EDUCATION WHERE candidate_id = ? ORDER BY year DESC', [dbCandidateId]);

    if (projects.length > 0) {
      const allSkills = await db.query('SELECT id, name FROM SKILL');
      const skillMap = {};
      allSkills.forEach(s => skillMap[s.id] = s.name);
      
      projects.forEach(p => {
        let techArr = [];
        try { techArr = JSON.parse(p.technologies); } catch { techArr = p.technologies ? p.technologies.split(',') : []; }
        if (Array.isArray(techArr)) {
          const namesArr = techArr.map(id => skillMap[id] || id);
          p.technologies = JSON.stringify(namesArr);
        }
      });
    }
    const skills = await db.query('SELECT s.id, s.name FROM CANDIDATE_SKILL cs JOIN SKILL s ON cs.skill_id = s.id WHERE cs.candidate_id = ?', [dbCandidateId]);
    const languages = await db.query('SELECT l.name, cl.* FROM CANDIDATE_LANGUAGE cl JOIN LANGUAGE l ON cl.language_id = l.id WHERE cl.candidate_id = ?', [dbCandidateId]);
    const resumes = await db.query('SELECT * FROM CANDIDATE_RESUME WHERE candidate_id = ? ORDER BY is_primary DESC', [dbCandidateId]);
    const applications = await db.query('SELECT a.*, j.title, e.company_name FROM APPLICATION a JOIN JOB j ON a.job_id = j.id LEFT JOIN EMPLOYERS e ON j.employer_id = e.id WHERE a.candidate_id = ? ORDER BY a.applied_at DESC', [dbCandidateId]);

    const users = await db.query('SELECT email, phone FROM USERS WHERE id = ?', [candidate.user_id]);

    const { calculateProfileCompletion } = require('../utils/profileCompletion');
    const savedJobsCountRes = await db.query('SELECT COUNT(*) as c FROM SAVED_JOBS WHERE candidate_id = ?', [dbCandidateId]);
    const savedCount = Number(savedJobsCountRes[0]?.c || 0);
    const notifCountRes = await db.query('SELECT COUNT(*) as c FROM NOTIFICATION WHERE user_id = ? AND is_read = 0', [candidate.user_id]);
    const unreadNotifCount = Number(notifCountRes[0]?.c || 0);

    const completion = calculateProfileCompletion({
      ...candidate,
      projects,
      experience,
      education,
      skills,
      languages,
      resumes
    });

    res.json({
      success: true,
      candidate: {
        ...candidate,
        user_info: users.length > 0 ? users[0] : null,
        projects,
        experience,
        education,
        skills,
        languages,
        resumes,
        applications
      },
      completion,
      counts: {
        applications: applications.length,
        saved: savedCount,
        notifications: unreadNotifCount,
        resumes: resumes.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
};

const updateCandidateProfile = async (req, res) => {
  try {
    const { name, dob, current_location, profile_type } = req.body;
    const candidates = await db.query('SELECT id FROM CANDIDATES WHERE user_id = ?', [req.user.id]);
    if (candidates.length === 0) return res.status(404).json({ success: false, message: 'Candidate not found.' });

    await db.query(
      'UPDATE CANDIDATES SET name = ?, dob = ?, current_location = ?, profile_type = ? WHERE id = ?',
      [name, dob || null, current_location, profile_type || 'experienced', candidates[0].id]
    );
    res.json({ success: true, message: 'Profile updated successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating profile.', error: error.message });
  }
};

const updateProfessionalInfo = async (req, res) => {
  try {
    const { professional_headline, current_organization, current_designation, total_experience, professional_summary, preferred_location, preferred_salary } = req.body;
    const candidates = await db.query('SELECT id FROM CANDIDATES WHERE user_id = ?', [req.user.id]);
    if (candidates.length === 0) return res.status(404).json({ success: false, message: 'Candidate not found.' });

    await db.query(
      'UPDATE CANDIDATES SET professional_headline=?, current_organization=?, current_designation=?, total_experience=?, professional_summary=?, preferred_location=?, preferred_salary=? WHERE id = ?',
      [professional_headline, current_organization, current_designation, total_experience || 0, professional_summary, preferred_location, preferred_salary, candidates[0].id]
    );
    res.json({ success: true, message: 'Professional information updated.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating professional info.', error: error.message });
  }
};

// ==========================================
// EXPERIENCE & EDUCATION
// ==========================================

const updateExperience = async (req, res) => {
  try {
    const candidateId = await getCandidateId(req.user.id);
    if (!candidateId) return res.status(404).json({ success: false, message: 'Candidate not found.' });

    const expId = req.params.id;
    let { organization, designation, from_date, to_date, reason_for_leaving } = req.body;
    
    if (!from_date) from_date = null;
    if (!to_date) to_date = null;

    await db.query(
      'UPDATE CANDIDATE_EXPERIENCE SET organization=?, designation=?, from_date=?, to_date=?, reason_for_leaving=? WHERE id=? AND candidate_id=?',
      [organization, designation, from_date, to_date, reason_for_leaving, expId, candidateId]
    );
    res.json({ success: true, message: 'Experience updated.' });
  } catch (error) {
    console.error('updateExperience error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

const updateEducation = async (req, res) => {
  try {
    const candidateId = await getCandidateId(req.user.id);
    if (!candidateId) return res.status(404).json({ success: false, message: 'Candidate not found.' });

    const eduId = req.params.id;
    let { degree, institution, year, cgpa } = req.body;
    
    if (!year) year = null;
    if (!cgpa) cgpa = null;

    await db.query(
      'UPDATE CANDIDATE_EDUCATION SET degree=?, institution=?, year=?, cgpa=? WHERE id=? AND candidate_id=?',
      [degree, institution, year, cgpa, eduId, candidateId]
    );
    res.json({ success: true, message: 'Education updated.' });
  } catch (error) {
    console.error('updateEducation error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

const addExperience = async (req, res) => {
  try {
    const { organization, designation, from_date, to_date, is_currently_working, reason_for_leaving, key_achievements } = req.body;
    const candidates = await db.query('SELECT id FROM CANDIDATES WHERE user_id = ?', [req.user.id]);
    if (candidates.length === 0) return res.status(404).json({ success: false, message: 'Candidate not found.' });
    
    // Business logic: if currently working, to_date is null
    const finalToDate = is_currently_working ? null : to_date;

    const id = uuidv4();
    await db.query(
      'INSERT INTO CANDIDATE_EXPERIENCE (id, candidate_id, organization, designation, from_date, to_date, is_currently_working, reason_for_leaving, key_achievements) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, candidates[0].id, organization, designation, from_date, finalToDate, is_currently_working ? 1 : 0, reason_for_leaving, key_achievements]
    );
    res.status(201).json({ success: true, message: 'Experience added.', id });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error adding experience.', error: error.message });
  }
};

const deleteExperience = async (req, res) => {
  try {
    const candidates = await db.query('SELECT id FROM CANDIDATES WHERE user_id = ?', [req.user.id]);
    if (candidates.length === 0) return res.status(404).json({ success: false, message: 'Candidate not found.' });
    await db.query('DELETE FROM CANDIDATE_EXPERIENCE WHERE id = ? AND candidate_id = ?', [req.params.id, candidates[0].id]);
    res.json({ success: true, message: 'Experience record deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting experience.', error: error.message });
  }
};

const addEducation = async (req, res) => {
  try {
    const { degree, institution, specialization, year, cgpa } = req.body;
    const candidates = await db.query('SELECT id FROM CANDIDATES WHERE user_id = ?', [req.user.id]);
    if (candidates.length === 0) return res.status(404).json({ success: false, message: 'Candidate not found.' });

    const id = uuidv4();
    await db.query(
      'INSERT INTO CANDIDATE_EDUCATION (id, candidate_id, degree, institution, specialization, year, cgpa) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, candidates[0].id, degree, institution, specialization, Number(year), cgpa]
    );
    res.status(201).json({ success: true, message: 'Education added.', id });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error adding education.', error: error.message });
  }
};

const deleteEducation = async (req, res) => {
  try {
    const candidates = await db.query('SELECT id FROM CANDIDATES WHERE user_id = ?', [req.user.id]);
    if (candidates.length === 0) return res.status(404).json({ success: false, message: 'Candidate not found.' });
    await db.query('DELETE FROM CANDIDATE_EDUCATION WHERE id = ? AND candidate_id = ?', [req.params.id, candidates[0].id]);
    res.json({ success: true, message: 'Education record deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting education.', error: error.message });
  }
};

// ==========================================
// SKILLS & LANGUAGES
// ==========================================


const updateSkills = async (req, res) => {
  try {
    const { skills } = req.body;
    const candidates = await db.query('SELECT id FROM CANDIDATES WHERE user_id = ?', [req.user.id]);
    if (candidates.length === 0) return res.status(404).json({ success: false, message: 'Candidate not found.' });
    const candidateId = candidates[0].id;

    let skillsArr = Array.isArray(skills) ? skills : [];
    skillsArr = skillsArr.filter(Boolean);

    let validSkills = [];
    if (skillsArr.length > 0) {
      const allSkills = await db.query('SELECT id, name FROM SKILL');
      const allSkillsLower = allSkills.map(s => s.name.toLowerCase());
      
      const invalidSkills = skillsArr.filter(s => !allSkillsLower.includes(s.toLowerCase()));
      
      if (invalidSkills.length > 0) {
        return res.status(400).json({ success: false, message: `The following skills are not in the master list: ${invalidSkills.join(', ')}` });
      }

      const uniqueSkills = [...new Set(skillsArr.map(s => s.toLowerCase()))];
      for (const us of uniqueSkills) {
        const found = allSkills.find(s => s.name.toLowerCase() === us);
        if (found) validSkills.push(found);
      }
    }

    // Only delete after validation succeeds
    await db.query('DELETE FROM CANDIDATE_SKILL WHERE candidate_id = ?', [candidateId]);

    if (validSkills.length > 0) {

      for (const validSkill of validSkills) {
        const relId = require('crypto').randomUUID();
        await db.query('INSERT INTO CANDIDATE_SKILL (id, candidate_id, skill_id) VALUES (?, ?, ?)', [relId, candidateId, validSkill.id]);
      }
    }

    res.json({ success: true, message: 'Skills updated successfully' });
  } catch (error) {
    console.error('updateSkills error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

const addSkill = async (req, res) => {
  try {
    const { skill_name } = req.body;
    const candidates = await db.query('SELECT id FROM CANDIDATES WHERE user_id = ?', [req.user.id]);
    if (candidates.length === 0) return res.status(404).json({ success: false, message: 'Candidate not found.' });
    const candidateId = candidates[0].id;

    // Find or create skill
    let skills = await db.query('SELECT id FROM SKILL WHERE LOWER(name) = ?', [skill_name.toLowerCase()]);
    if (skills.length === 0) {
      return res.status(400).json({ success: false, message: `Skill '${skill_name}' does not exist in the master list.` });
    }
    const skillId = skills[0].id;

    // Check duplicate relationship
    const rel = await db.query('SELECT id FROM CANDIDATE_SKILL WHERE candidate_id = ? AND skill_id = ?', [candidateId, skillId]);
    if (rel.length > 0) return res.status(400).json({ success: false, message: 'Skill already added.' });

    const id = uuidv4();
    await db.query('INSERT INTO CANDIDATE_SKILL (id, candidate_id, skill_id) VALUES (?, ?, ?)', [id, candidateId, skillId]);
    res.status(201).json({ success: true, message: 'Skill added.', id });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error adding skill.', error: error.message });
  }
};

const deleteSkill = async (req, res) => {
  try {
    const candidates = await db.query('SELECT id FROM CANDIDATES WHERE user_id = ?', [req.user.id]);
    if (candidates.length === 0) return res.status(404).json({ success: false, message: 'Candidate not found.' });
    await db.query('DELETE FROM CANDIDATE_SKILL WHERE id = ? AND candidate_id = ?', [req.params.id, candidates[0].id]);
    res.json({ success: true, message: 'Skill deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting skill.', error: error.message });
  }
};

const addLanguage = async (req, res) => {
  try {
    const { language_name, can_understand, can_speak, can_read, can_write } = req.body;
    const candidates = await db.query('SELECT id FROM CANDIDATES WHERE user_id = ?', [req.user.id]);
    if (candidates.length === 0) return res.status(404).json({ success: false, message: 'Candidate not found.' });
    const candidateId = candidates[0].id;

    if (!can_understand && !can_speak && !can_read && !can_write) {
      return res.status(400).json({ success: false, message: 'Select at least one proficiency.' });
    }

    let langs = await db.query('SELECT id FROM LANGUAGE WHERE LOWER(name) = ?', [language_name.toLowerCase()]);
    if (langs.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid language selection.' });
    }
    const langId = langs[0].id;

    // Check for duplicate
    const existing = await db.query('SELECT id FROM CANDIDATE_LANGUAGE WHERE candidate_id = ? AND language_id = ?', [candidateId, langId]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Language already added.' });
    }

    const id = uuidv4();
    await db.query(
      'INSERT INTO CANDIDATE_LANGUAGE (id, candidate_id, language_id, can_understand, can_speak, can_read, can_write) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, candidateId, langId, can_understand?1:0, can_speak?1:0, can_read?1:0, can_write?1:0]
    );
    res.status(201).json({ success: true, message: 'Language added.', id });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error adding language.', error: error.message });
  }
};

const deleteLanguage = async (req, res) => {
  try {
    const candidates = await db.query('SELECT id FROM CANDIDATES WHERE user_id = ?', [req.user.id]);
    if (candidates.length === 0) return res.status(404).json({ success: false, message: 'Candidate not found.' });
    await db.query('DELETE FROM CANDIDATE_LANGUAGE WHERE id = ? AND candidate_id = ?', [req.params.id, candidates[0].id]);
    res.json({ success: true, message: 'Language deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting language.', error: error.message });
  }
};

// ==========================================
// RESUMES
// ==========================================

const uploadResume = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
    
    // Server-side validation: must be PDF only
    const validMimeTypes = ['application/pdf'];
    if (!validMimeTypes.includes(req.file.mimetype) || !req.file.originalname.toLowerCase().endsWith('.pdf')) {
      return res.status(400).json({ success: false, message: 'Invalid file type. Only PDF files are allowed.' });
    }
    
    // Size check < 2MB
    if (req.file.size > 2 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: 'Resume file must be 2 MB or smaller.' });
    }
    
    const candidates = await db.query('SELECT id FROM CANDIDATES WHERE user_id = ?', [req.user.id]);
    if (candidates.length === 0) return res.status(404).json({ success: false, message: 'Candidate profile not found.' });
    const candidateId = candidates[0].id;

    // Max 3 resumes check
    const existingResumes = await db.query('SELECT id, resume_title, file_name, is_primary, created_at FROM CANDIDATE_RESUME WHERE candidate_id = ? ORDER BY created_at DESC', [candidateId]);
    if (existingResumes.length >= 3) {
      return res.status(400).json({
        success: false,
        code: 'RESUME_LIMIT_REACHED',
        message: 'You can have up to 3 resumes. Delete an existing resume to upload a new one.',
        resumes: existingResumes
      });
    }

    const folder = `vakancy/candidates/${candidateId}/resumes`;
    const safePublicId = `resume_${Date.now()}`;

    const { cloudinary } = require('../services/cloudinaryService');
    const runtimeConfig = cloudinary.config();
    console.log('--- RUNTIME CLOUDINARY CONFIG ---');
    console.log('Cloud Name:', runtimeConfig.cloud_name);
    console.log('API Key:', runtimeConfig.api_key);
    console.log('API Secret exists?', !!runtimeConfig.api_secret);
    console.log('File Size:', req.file.size);
    console.log('File Mime:', req.file.mimetype);
    console.log('---------------------------------');

    // Upload as 'image' resource type so Cloudinary handles PDF correctly for browser preview.
    // Use 'authenticated' type to restrict public delivery of sensitive resumes.
    const cloudinaryResult = await uploadBufferToCloudinary(req.file.buffer, { 
      folder, 
      public_id: safePublicId, 
      resource_type: 'image',
      type: 'authenticated',
      format: req.file.mimetype === 'application/pdf' ? 'pdf' : undefined
    });
    
    const isPrimary = (await db.query('SELECT id FROM CANDIDATE_RESUME WHERE candidate_id = ?', [candidateId])).length === 0 ? 1 : 0;
    
    let originalName = req.file.originalname || 'My Resume';
    // Sanitize title
    let title = originalName;
    const lastDot = originalName.lastIndexOf('.');
    if (lastDot > 0) title = originalName.substring(0, lastDot);
    title = title.replace(/[^a-zA-Z0-9 _-]/g, '').trim() || 'Resume';

    const id = uuidv4();
    await db.query(
      'INSERT INTO CANDIDATE_RESUME (id, candidate_id, resume_title, file_name, cloudinary_asset_id, cloudinary_public_id, file_url, file_type, file_size, is_primary) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, candidateId, title, req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, ''), cloudinaryResult.asset_id || null, cloudinaryResult.public_id, cloudinaryResult.secure_url, req.file.mimetype, req.file.size, isPrimary]
    );

    res.status(201).json({ success: true, message: 'Resume uploaded successfully.', resume: { id, file_url: cloudinaryResult.secure_url } });
  } catch (error) {
    console.error('Resume Upload Error:', error);
    res.status(500).json({ success: false, message: 'Error uploading resume. Check server logs for details.' });
  }
};

const setPrimaryResume = async (req, res) => {
  try {
    const resumeId = req.params.id;
    const candidates = await db.query('SELECT id FROM CANDIDATES WHERE user_id = ?', [req.user.id]);
    if (candidates.length === 0) return res.status(404).json({ success: false, message: 'Candidate not found.' });
    
    // Set all to false, then target to true
    await db.query('UPDATE CANDIDATE_RESUME SET is_primary = 0 WHERE candidate_id = ?', [candidates[0].id]);
    await db.query('UPDATE CANDIDATE_RESUME SET is_primary = 1 WHERE id = ? AND candidate_id = ?', [resumeId, candidates[0].id]);
    
    res.json({ success: true, message: 'Primary resume updated.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating resume.' });
  }
};

const deleteResume = async (req, res) => {
  try {
    const resumeId = req.params.id;
    const candidates = await db.query('SELECT id FROM CANDIDATES WHERE user_id = ?', [req.user.id]);
    if (candidates.length === 0) return res.status(404).json({ success: false, message: 'Candidate not found.' });
    const candidateId = candidates[0].id;
    
    const resumeToDelete = await db.query('SELECT is_primary, cloudinary_public_id, file_url FROM CANDIDATE_RESUME WHERE id = ? AND candidate_id = ?', [resumeId, candidateId]);
    if (resumeToDelete.length === 0) return res.status(404).json({ success: false, message: 'Resume not found.' });

    const resume = resumeToDelete[0];
    const wasPrimary = resume.is_primary;
    
    // Delete from Cloudinary
    if (resume.cloudinary_public_id) {
      const { deleteFromCloudinary } = require('../services/cloudinaryService');
      const resourceType = resume.file_url && resume.file_url.includes('/raw/upload/') ? 'raw' : 'image';
      await deleteFromCloudinary(resume.cloudinary_public_id, { resource_type: resourceType }).catch(console.error);
    }
    
    await db.query('DELETE FROM CANDIDATE_RESUME WHERE id = ? AND candidate_id = ?', [resumeId, candidateId]);

    if (wasPrimary) {
      const remaining = await db.query('SELECT id FROM CANDIDATE_RESUME WHERE candidate_id = ? ORDER BY created_at DESC LIMIT 1', [candidateId]);
      if (remaining.length > 0) {
        await db.query('UPDATE CANDIDATE_RESUME SET is_primary = 1 WHERE id = ?', [remaining[0].id]);
      }
    }

    res.json({ success: true, message: 'Resume deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting resume.' });
  }
};

const viewResume = async (req, res) => {
  try {
    const resumeId = req.params.id;
    const candidates = await db.query('SELECT id FROM CANDIDATES WHERE user_id = ?', [req.user.id]);
    if (candidates.length === 0) return res.status(404).json({ success: false, message: 'Candidate not found.' });
    const candidateId = candidates[0].id;

    const resumes = await db.query('SELECT * FROM CANDIDATE_RESUME WHERE id = ? AND candidate_id = ?', [resumeId, candidateId]);
    if (resumes.length === 0) return res.status(404).json({ success: false, message: 'Resume not found or access denied.' });

    const resume = resumes[0];
    const { cloudinary } = require('../services/cloudinaryService');

    const resourceType = resume.file_url.includes('/raw/upload/') ? 'raw' : 'image';
    const deliveryType = resume.file_url.includes('/authenticated/') ? 'authenticated' : 'upload';
    
    let deliveryUrl = resume.file_url;
    
    if (deliveryType === 'authenticated') {
      deliveryUrl = cloudinary.utils.url(resume.cloudinary_public_id, {
        type: 'authenticated',
        resource_type: resourceType,
        sign_url: true,
        secure: true,
        format: resourceType === 'image' ? 'pdf' : undefined
      });
    } else if (resourceType === 'image' && !resume.file_url.endsWith('.pdf')) {
      // For old non-authenticated image PDFs, ensure the URL ends with .pdf
      deliveryUrl = cloudinary.utils.url(resume.cloudinary_public_id, {
        type: 'upload',
        resource_type: 'image',
        secure: true,
        format: 'pdf'
      });
    }

    res.json({ success: true, url: deliveryUrl });
  } catch(error) {
    console.error('View Resume Error:', error);
    res.status(500).json({ success: false, message: 'Error viewing resume.' });
  }
};

const updateOnboardingStep = async (req, res) => {
  try {
    const { onboarding_step, is_onboarding_completed } = req.body;
    const candidates = await db.query('SELECT id FROM CANDIDATES WHERE user_id = ?', [req.user.id]);
    if (candidates.length === 0) return res.status(404).json({ success: false, message: 'Candidate not found.' });
    
    await db.query(
      'UPDATE CANDIDATES SET onboarding_step = ?, is_onboarding_completed = ? WHERE id = ?',
      [onboarding_step, is_onboarding_completed ? 1 : 0, candidates[0].id]
    );
    res.json({ success: true, message: 'Onboarding step updated.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating onboarding step.', error: error.message });
  }
};




const getCandidateId = async (userId) => {
  const candidates = await db.query('SELECT id FROM CANDIDATES WHERE user_id = ?', [userId]);
  return candidates.length > 0 ? candidates[0].id : null;
};

const validateProjectSkills = async (skillsRaw) => {
  if (!skillsRaw) return '[]';
  let skillsArr = [];
  if (Array.isArray(skillsRaw)) {
    skillsArr = skillsRaw;
  } else if (typeof skillsRaw === 'string') {
    try {
      const parsed = JSON.parse(skillsRaw);
      skillsArr = Array.isArray(parsed) ? parsed : skillsRaw.split(',').map(s => s.trim());
    } catch {
      skillsArr = skillsRaw.split(',').map(s => s.trim());
    }
  }
  skillsArr = skillsArr.filter(Boolean);
  if (skillsArr.length === 0) return '[]';

  const allSkills = await db.query('SELECT id, name FROM SKILL');
  const lowerSkillsArr = skillsArr.map(s => s.toLowerCase());
  const validSkills = allSkills.filter(s => lowerSkillsArr.includes(s.name.toLowerCase()));
  
  return JSON.stringify(validSkills.map(s => s.id));
};

const addProject = async (req, res) => {
  try {
    const candidateId = await getCandidateId(req.user.id);
    if (!candidateId) return res.status(404).json({ success: false, message: 'Candidate not found.' });

    const { project_name, role, description, technologies, start_date, end_date, project_url, github_url } = req.body;
    if (!project_name) return res.status(400).json({ success: false, message: 'Project Name is required.' });

      const validTechnologies = await validateProjectSkills(technologies);

    const id = require('crypto').randomUUID();
    await db.query(
      'INSERT INTO CANDIDATE_PROJECT (id, candidate_id, project_name, role, description, technologies, start_date, end_date, project_url, github_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, candidateId, project_name, role, description, validTechnologies, start_date, end_date, project_url, github_url]
    );

    res.json({ success: true, message: 'Project added successfully', data: { id, project_name } });
  } catch (error) {
    console.error('addProject error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

const updateProject = async (req, res) => {
  try {
    const candidateId = await getCandidateId(req.user.id);
    if (!candidateId) return res.status(404).json({ success: false, message: 'Candidate not found.' });

    const projectId = req.params.id;
    const { project_name, role, description, technologies, start_date, end_date, project_url, github_url } = req.body;

      const validTechnologies = await validateProjectSkills(technologies);

    const existing = await db.query('SELECT * FROM CANDIDATE_PROJECT WHERE id = ? AND candidate_id = ?', [projectId, candidateId]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Project not found.' });

    await db.query(
      'UPDATE CANDIDATE_PROJECT SET project_name = ?, role = ?, description = ?, technologies = ?, start_date = ?, end_date = ?, project_url = ?, github_url = ? WHERE id = ? AND candidate_id = ?',
      [project_name, role, description, validTechnologies, start_date, end_date, project_url, github_url, projectId, candidateId]
    );

    res.json({ success: true, message: 'Project updated successfully' });
  } catch (error) {
    console.error('updateProject error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

const deleteProject = async (req, res) => {
  try {
    const candidateId = await getCandidateId(req.user.id);
    if (!candidateId) return res.status(404).json({ success: false, message: 'Candidate not found.' });

    const projectId = req.params.id;
    await db.query('DELETE FROM CANDIDATE_PROJECT WHERE id = ? AND candidate_id = ?', [projectId, candidateId]);
    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    console.error('deleteProject error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

const updateAdditionalInfo = async (req, res) => {
  try {
    const candidateId = await getCandidateId(req.user.id);
    if (!candidateId) return res.status(404).json({ success: false, message: 'Candidate not found.' });

    const { portfolio_url, linkedin_url, facebook_url, instagram_url, twitter_url, github_url } = req.body;

    await db.query(
      'UPDATE CANDIDATES SET portfolio_url = ?, linkedin_url = ?, facebook_url = ?, instagram_url = ?, twitter_url = ?, github_url = ? WHERE id = ?',
      [portfolio_url, linkedin_url, facebook_url, instagram_url, twitter_url, github_url, candidateId]
    );
    
    res.json({ success: true, message: 'Additional info updated successfully' });
  } catch (error) {
    console.error('updateAdditionalInfo error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

const getResumes = async (req, res) => {
  try {
    const candidateId = req.user.id;
    const c = await db.query('SELECT id FROM CANDIDATES WHERE user_id = ?', [candidateId]);
    if (c.length === 0) return res.status(404).json({ success: false, message: 'Candidate not found.' });
    const dbCandidateId = c[0].id;

    const resumes = await db.query('SELECT * FROM CANDIDATE_RESUME WHERE candidate_id = ? ORDER BY is_primary DESC, created_at DESC', [dbCandidateId]);
    
    res.json({
      success: true,
      data: resumes
    });
  } catch (error) {
    console.error('Error fetching resumes:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch resumes.', error: error.message });
  }
};


const getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get candidate ID and real profile info
    const cRes = await db.query(
      'SELECT *, DATE_FORMAT(dob, "%Y-%m-%d") as dob FROM CANDIDATES WHERE user_id = ?',
      [userId]
    );
    if (cRes.length === 0) return res.status(404).json({ success: false, message: 'Candidate not found.' });
    const candidate = cRes[0];
    const candidateId = candidate.id;

    // Candidate display name from real CANDIDATES record or user email
    const name = candidate.name || (req.user.email ? req.user.email.split('@')[0] : 'Candidate');
    const headline = candidate.professional_headline || candidate.current_designation || '';
    const location = candidate.current_location || 'India';

    // Get candidate records for deterministic profile completion
    const [projects, experience, education, skills, languages, resumes] = await Promise.all([
      db.query('SELECT * FROM CANDIDATE_PROJECT WHERE candidate_id = ?', [candidateId]),
      db.query('SELECT * FROM CANDIDATE_EXPERIENCE WHERE candidate_id = ?', [candidateId]),
      db.query('SELECT * FROM CANDIDATE_EDUCATION WHERE candidate_id = ?', [candidateId]),
      db.query('SELECT s.id, s.name FROM CANDIDATE_SKILL cs JOIN SKILL s ON cs.skill_id = s.id WHERE cs.candidate_id = ?', [candidateId]),
      db.query('SELECT l.name, cl.* FROM CANDIDATE_LANGUAGE cl JOIN LANGUAGE l ON cl.language_id = l.id WHERE cl.candidate_id = ?', [candidateId]),
      db.query('SELECT * FROM CANDIDATE_RESUME WHERE candidate_id = ?', [candidateId])
    ]);

    const { calculateProfileCompletion } = require('../utils/profileCompletion');
    const completion = calculateProfileCompletion({
      ...candidate,
      projects,
      experience,
      education,
      skills,
      languages,
      resumes
    });

    // Get Active Applications count and status breakdown
    const appStats = await db.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status IN ('applied', 'in_review') THEN 1 ELSE 0 END) as underReview,
        SUM(CASE WHEN status = 'shortlisted' THEN 1 ELSE 0 END) as shortlisted,
        SUM(CASE WHEN status = 'interview' THEN 1 ELSE 0 END) as interview,
        SUM(CASE WHEN status = 'selected' THEN 1 ELSE 0 END) as selected,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
      FROM APPLICATION 
      WHERE candidate_id = ?
    `, [candidateId]);
    const applicationCount = Number(appStats[0]?.total || 0);

    // Get Saved Jobs count
    const savedJobs = await db.query('SELECT COUNT(*) as c FROM SAVED_JOBS WHERE candidate_id = ?', [candidateId]);
    const savedCount = Number(savedJobs[0]?.c || 0);

    // Get Unread Notifications count
    const notifCount = await db.query('SELECT COUNT(*) as c FROM NOTIFICATION WHERE user_id = ? AND is_read = 0', [userId]);
    const unreadNotifications = Number(notifCount[0]?.c || 0);

    // Get Recent Applications for this candidate only
    const recentApps = await db.query(`
      SELECT 
        a.id, 
        a.status, 
        a.applied_at as date, 
        a.applied_at, 
        j.title as job_title, 
        j.title, 
        COALESCE(e.company_name, 'Hiring Organization') as company_name, 
        COALESCE(e.company_name, 'Hiring Organization') as company
      FROM APPLICATION a
      JOIN JOB j ON a.job_id = j.id
      LEFT JOIN EMPLOYERS e ON j.employer_id = e.id
      WHERE a.candidate_id = ?
      ORDER BY a.applied_at DESC
      LIMIT 5
    `, [candidateId]);

    // Get Recent Open Jobs
    const openJobsRaw = await db.query(`
      SELECT 
        j.id, 
        j.title, 
        COALESCE(e.company_name, 'Vakancy Employer') as company_name, 
        COALESCE(e.company_name, 'Vakancy Employer') as company, 
        e.logo_url as companyLogo, 
        j.location, 
        j.employment_type as employmentType, 
        j.employment_type, 
        j.workplace_type as workplaceMode, 
        j.min_salary, 
        j.max_salary, 
        j.currency, 
        j.required_skills, 
        j.created_at
      FROM JOB j
      LEFT JOIN EMPLOYERS e ON j.employer_id = e.id
      WHERE j.status = 'published'
      ORDER BY j.created_at DESC
      LIMIT 5
    `);

    const openJobs = openJobsRaw.map(j => {
      let salaryRange = 'Competitive';
      if (j.min_salary !== null && j.max_salary !== null) {
        const curr = j.currency === 'USD' ? '$' : '₹';
        salaryRange = `${curr}${Number(j.min_salary).toLocaleString()} - ${curr}${Number(j.max_salary).toLocaleString()}`;
      }
      let skills = [];
      if (typeof j.required_skills === 'string') {
        try {
          const parsed = JSON.parse(j.required_skills);
          skills = Array.isArray(parsed) ? parsed : [];
        } catch {
          skills = j.required_skills.split(',').map(s => s.trim()).filter(Boolean);
        }
      } else if (Array.isArray(j.required_skills)) {
        skills = j.required_skills;
      }
      return {
        ...j,
        salaryRange,
        skills
      };
    });

    res.json({
      success: true,
      data: {
        candidate: {
          name,
          headline,
          location
        },
        completion: {
          percentage: completion.percentage,
          missing: completion.missing
        },
        counts: {
          applications: applicationCount,
          saved: savedCount,
          notifications: unreadNotifications,
          underReview: Number(appStats[0]?.underReview || 0),
          shortlisted: Number(appStats[0]?.shortlisted || 0),
          interview: Number(appStats[0]?.interview || 0),
          selected: Number(appStats[0]?.selected || 0),
          rejected: Number(appStats[0]?.rejected || 0)
        },
        recentApplications: recentApps,
        recommendedJobs: openJobs
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ success: false, message: 'Failed to load dashboard data.' });
  }
};

// ==========================================
// SAVED JOBS API
// ==========================================

const getSavedJobs = async (req, res) => {
  try {
    const userId = req.user.id;
    const cRes = await db.query('SELECT id FROM CANDIDATES WHERE user_id = ?', [userId]);
    if (cRes.length === 0) return res.status(404).json({ success: false, message: 'Candidate not found.' });
    const candidateId = cRes[0].id;

    // Get all saved jobs with details
    const savedJobs = await db.query(`
      SELECT 
        sj.id as savedJobId,
        j.id as jobId,
        j.title as jobTitle,
        COALESCE(e.company_name, 'Hiring Organization') as companyName,
        j.location as location,
        j.employment_type as employmentType,
        COALESCE(j.workplace_type, 'onsite') as workplaceMode,
        j.min_experience as expMin,
        j.max_experience as expMax,
        j.min_salary as salMin,
        j.max_salary as salMax,
        j.currency as currency,
        j.application_deadline as applicationDeadline,
        j.status as jobStatus,
        sj.created_at as savedAt,
        (SELECT status FROM APPLICATION WHERE candidate_id = ? AND job_id = j.id LIMIT 1) as applicationStatus
      FROM SAVED_JOBS sj
      JOIN JOB j ON sj.job_id = j.id
      LEFT JOIN EMPLOYERS e ON j.employer_id = e.id
      WHERE sj.candidate_id = ?
      ORDER BY sj.created_at DESC
    `, [candidateId, candidateId]);

    const results = savedJobs.map(job => {
      let isExpiring = false;
      let deadline = null;
      if (job.applicationDeadline) {
        deadline = new Date(job.applicationDeadline);
        const diffDays = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 7) {
          isExpiring = true;
        }
      }

      let expRange = '';
      if (job.expMin !== null && job.expMax !== null) expRange = `${job.expMin} - ${job.expMax} Yrs`;
      else if (job.expMin !== null) expRange = `${job.expMin}+ Yrs`;

      let salRange = '';
      if (job.salMin !== null && job.salMax !== null) {
         let curr = job.currency === 'USD' ? '$' : '₹';
         salRange = `${curr}${job.salMin} - ${curr}${job.salMax}`;
      }

      return {
        id: job.savedJobId,
        jobId: job.jobId,
        role: job.jobTitle,
        company: job.companyName,
        location: job.location,
        type: job.employmentType,
        workplaceMode: job.workplaceMode,
        experience: expRange,
        salary: salRange,
        deadline: deadline,
        status: job.jobStatus,
        savedTime: new Date(job.savedAt).toLocaleDateString(),
        applied: !!job.applicationStatus,
        applicationStatus: job.applicationStatus || null,
        isExpiring: isExpiring,
        skills: []
      };
    });

    res.json({ success: true, savedJobs: results });
  } catch (error) {
    console.error('Error fetching saved jobs:', error);
    res.status(500).json({ success: false, message: 'Failed to load saved jobs.' });
  }
};


const addSavedJob = async (req, res) => {
  try {
    const userId = req.user.id;
    const job_id = req.body.job_id || req.body.jobId;

    const cands = await db.query('SELECT id FROM CANDIDATES WHERE user_id = ?', [userId]);
    if (cands.length === 0) return res.status(404).json({ success: false, message: 'Candidate profile required.' });
    const candidateId = cands[0].id;

    const existing = await db.query('SELECT id FROM SAVED_JOBS WHERE candidate_id = ? AND job_id = ?', [candidateId, job_id]);
    if (existing.length > 0) {
      return res.json({ success: true, message: 'Job already saved' });
    }

    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();
    await db.query('INSERT INTO SAVED_JOBS (id, candidate_id, job_id) VALUES (?, ?, ?)', [id, candidateId, job_id]);

    res.json({ success: true, message: 'Job saved successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error saving job', error: err.message });
  }
};

const removeSavedJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;
    const cRes = await db.query('SELECT id FROM CANDIDATES WHERE user_id = ?', [userId]);
    if (cRes.length === 0) return res.status(404).json({ success: false, message: 'Candidate not found.' });
    const candidateId = cRes[0].id;

    await db.query('DELETE FROM SAVED_JOBS WHERE (id = ? OR job_id = ?) AND candidate_id = ?', [jobId, jobId, candidateId]);
    res.json({ success: true, message: 'Job removed from saved list.' });
  } catch (error) {
    console.error('Error removing saved job:', error);
    res.status(500).json({ success: false, message: 'Failed to remove saved job.' });
  }
};

const generateAiResume = async (req, res) => {
  try {
    const userId = req.user.id;
    const cRes = await db.query('SELECT *, DATE_FORMAT(dob, "%Y-%m-%d") as dob FROM CANDIDATES WHERE user_id = ?', [userId]);
    if (cRes.length === 0) return res.status(404).json({ success: false, message: 'Candidate not found.' });
    const candidate = cRes[0];
    const candidateId = candidate.id;

    const [projects, experience, education, skills, languages, users] = await Promise.all([
      db.query('SELECT * FROM CANDIDATE_PROJECT WHERE candidate_id = ? ORDER BY start_date DESC', [candidateId]),
      db.query('SELECT * FROM CANDIDATE_EXPERIENCE WHERE candidate_id = ? ORDER BY from_date DESC', [candidateId]),
      db.query('SELECT * FROM CANDIDATE_EDUCATION WHERE candidate_id = ? ORDER BY year DESC', [candidateId]),
      db.query('SELECT s.id, s.name FROM CANDIDATE_SKILL cs JOIN SKILL s ON cs.skill_id = s.id WHERE cs.candidate_id = ?', [candidateId]),
      db.query('SELECT l.name, cl.* FROM CANDIDATE_LANGUAGE cl JOIN LANGUAGE l ON cl.language_id = l.id WHERE cl.candidate_id = ?', [candidateId]),
      db.query('SELECT email, phone FROM USERS WHERE id = ?', [userId])
    ]);

    const fullProfile = {
      ...candidate,
      user_info: users[0] || null,
      projects,
      experience,
      education,
      skills,
      languages
    };

    const { generateAtsResume } = require('../services/aiService');
    const { createResumePdfBuffer } = require('../services/pdfService');

    const aiResult = await generateAtsResume(fullProfile);
    if (!aiResult.isValid || aiResult.error) {
      return res.status(503).json({
        success: false,
        message: aiResult.message || 'AI Resume Builder is temporarily unavailable. Please try again later.'
      });
    }

    const structuredData = aiResult.data;
    const pdfBuffer = await createResumePdfBuffer(structuredData);
    const pdfBase64 = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;

    res.json({
      success: true,
      message: 'ATS-friendly resume generated successfully.',
      structuredData,
      pdfBase64
    });
  } catch (error) {
    console.error('Error generating AI resume:', error);
    res.status(500).json({
      success: false,
      message: 'AI Resume Builder is temporarily unavailable. Please try again later.'
    });
  }
};

const saveAiResume = async (req, res) => {
  try {
    const userId = req.user.id;
    const { resume_title, pdf_base64 } = req.body;

    if (!resume_title || !resume_title.trim()) {
      return res.status(400).json({ success: false, message: 'Resume Title is required.' });
    }
    if (!pdf_base64) {
      return res.status(400).json({ success: false, message: 'Generated PDF content is required.' });
    }

    const cRes = await db.query('SELECT id, name FROM CANDIDATES WHERE user_id = ?', [userId]);
    if (cRes.length === 0) return res.status(404).json({ success: false, message: 'Candidate not found.' });
    const candidateId = cRes[0].id;

    // Check maximum 3 resumes
    const existingResumes = await db.query(
      'SELECT id, resume_title, file_name, is_primary, created_at FROM CANDIDATE_RESUME WHERE candidate_id = ? ORDER BY created_at DESC',
      [candidateId]
    );

    if (existingResumes.length >= 3) {
      return res.status(400).json({
        success: false,
        code: 'RESUME_LIMIT_REACHED',
        message: 'You can have up to 3 resumes. Please remove an existing resume to save this new resume.',
        resumes: existingResumes
      });
    }

    // Decode base64
    const base64Data = pdf_base64.replace(/^data:application\/pdf;base64,/, '');
    const pdfBuffer = Buffer.from(base64Data, 'base64');

    if (pdfBuffer.length > 2 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: 'Generated resume PDF exceeds the 2 MB limit.' });
    }

    const cleanTitle = resume_title.trim().replace(/[^a-zA-Z0-9 _-]/g, '') || 'AI Generated Resume';
    const fileName = `${cleanTitle.toLowerCase().replace(/\s+/g, '_')}.pdf`;

    const folder = `vakancy/candidates/${candidateId}/resumes`;
    const safePublicId = `resume_ai_${Date.now()}`;

    const { uploadBufferToCloudinary } = require('../services/cloudinaryService');
    const cloudinaryResult = await uploadBufferToCloudinary(pdfBuffer, {
      folder,
      public_id: safePublicId,
      resource_type: 'image',
      type: 'authenticated',
      format: 'pdf',
      mime_type: 'application/pdf'
    });

    const isPrimary = existingResumes.length === 0 ? 1 : 0;
    const { v4: uuidv4 } = require('uuid');
    const resumeId = uuidv4();

    await db.query(
      'INSERT INTO CANDIDATE_RESUME (id, candidate_id, resume_title, file_name, cloudinary_asset_id, cloudinary_public_id, file_url, file_type, file_size, is_primary) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        resumeId,
        candidateId,
        cleanTitle,
        fileName,
        cloudinaryResult.asset_id || null,
        cloudinaryResult.public_id,
        cloudinaryResult.secure_url,
        'application/pdf',
        pdfBuffer.length,
        isPrimary
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Resume saved successfully to your profile.',
      resume: {
        id: resumeId,
        resume_title: cleanTitle,
        file_name: fileName,
        file_url: cloudinaryResult.secure_url,
        is_primary: isPrimary
      }
    });
  } catch (error) {
    console.error('Error saving AI resume:', error);
    res.status(500).json({ success: false, message: 'Failed to save resume: ' + error.message, stack: error.stack });
  }
};

module.exports = {
  addSavedJob,
  getSavedJobs,
  removeSavedJob,
  getDashboard,
  getResumes,
  addProject,
  updateProject,
  deleteProject,
  updateAdditionalInfo,
  getCandidateProfile,
  updateCandidateProfile,
  updateProfessionalInfo,
  updateExperience,
  updateEducation,
  addExperience,
  deleteExperience,
  addEducation,
  deleteEducation,
  updateSkills,
  addSkill,
  deleteSkill,
  addLanguage,
  deleteLanguage,
  uploadResume,
  viewResume,
  setPrimaryResume,
  deleteResume,
  updateOnboardingStep,
  generateAiResume,
  saveAiResume
};
