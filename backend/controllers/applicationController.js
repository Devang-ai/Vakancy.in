const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { sendEmployerApplicationReceivedEmail } = require('../services/emailService');
const { createEmployerNotification } = require('./notificationController');

// Candidate apply for job
const applyForJob = async (req, res) => {
  try {
    const { job_id } = req.body;
    const userId = req.user.id;

    // Security check: Only authenticated candidates can apply for jobs.
    // Staff/employers cannot apply on behalf of candidates.
    if (req.user.role !== 'candidate') {
      return res.status(403).json({
        success: false,
        message: 'Security Policy: Only candidates can apply for jobs directly. Internal staff and employers cannot submit applications on behalf of candidates.'
      });
    }

    if (!job_id) {
      return res.status(400).json({ success: false, message: 'Job ID is required.' });
    }

    // Ensure the job exists and is open for public applications
    const targetJobs = await db.query('SELECT id, status, is_internal_only FROM JOB WHERE id = ?', [job_id]);
    if (targetJobs.length === 0) {
      return res.status(404).json({ success: false, message: 'Job not found.' });
    }

    const targetJob = targetJobs[0];
    if (targetJob.status !== 'open' && targetJob.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Cannot apply for a job that is not actively accepting applications.' });
    }

    const cands = await db.query('SELECT id FROM CANDIDATES WHERE user_id = ?', [userId]);
    if (cands.length === 0) return res.status(404).json({ success: false, message: 'Candidate profile required.' });

    const candidateId = cands[0].id;

    // Check if already applied
    const existing = await db.query('SELECT id FROM APPLICATION WHERE job_id = ? AND candidate_id = ?', [job_id, candidateId]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'You have already applied for this job.' });
    }

    const id = uuidv4();
    await db.query(
      'INSERT INTO APPLICATION (id, job_id, candidate_id, status) VALUES (?, ?, ?, "applied")',
      [id, job_id, candidateId]
    );

    // Also auto-create Candidate Pipeline entry if recruiter/employer manages ATS
    const defaultStage = await db.query("SELECT id FROM ATS_STAGE WHERE name = 'Applied' OR `order` = 1 LIMIT 1");
    if (defaultStage.length > 0) {
      const pipId = uuidv4();
      const recruiterUsers = await db.query('SELECT id FROM USERS WHERE role = "recruiter" LIMIT 1');
      const recruiterId = recruiterUsers.length > 0 ? recruiterUsers[0].id : userId;

      await db.query(
        'INSERT INTO CANDIDATE_PIPELINE (id, candidate_id, job_id, stage_id, recruiter_id) VALUES (?, ?, ?, ?, ?)',
        [pipId, candidateId, job_id, defaultStage[0].id, recruiterId]
      );

      // Log pipeline stage history
      const histId = uuidv4();
      await db.query(
        'INSERT INTO PIPELINE_STAGE_HISTORY (id, pipeline_id, to_stage_id, moved_by, remarks) VALUES (?, ?, ?, ?, "Initial job application submitted by candidate.")',
        [histId, pipId, defaultStage[0].id, userId]
      );
    }

    // Trigger Notification for Candidate
    const notifId = uuidv4();
    await db.query(
      'INSERT INTO NOTIFICATION (id, user_id, type, title, message, reference_type, reference_id) VALUES (?, ?, "application", "Application Submitted", "Your job application has been successfully submitted.", "APPLICATION", ?)',
      [notifId, userId, id]
    );

    // Task 39: Trigger Employer Application Notification Email (Non-blocking & Privacy-Preserving)
    try {
      const jobRows = await db.query('SELECT title, employer_id FROM JOB WHERE id = ?', [job_id]);
      if (jobRows.length > 0 && jobRows[0].employer_id) {
        const empRows = await db.query('SELECT user_id, company_name FROM EMPLOYERS WHERE id = ?', [jobRows[0].employer_id]);
        if (empRows.length > 0 && empRows[0].user_id) {
          const userRows = await db.query('SELECT email FROM USERS WHERE id = ?', [empRows[0].user_id]);
          const employerEmail = userRows.length > 0 ? userRows[0].email : null;
          if (employerEmail) {
            const refCode = `APP-${id.slice(0, 8).toUpperCase()}`;
            sendEmployerApplicationReceivedEmail(employerEmail, {
              jobTitle: jobRows[0].title,
              referenceNumber: refCode,
              appliedAt: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
              jobId: job_id
            }).catch(err => {
              console.warn('⚠️ [Async Email] Employer application notification error:', err.message);
            });
          }
        }
      }
    } catch (emailErr) {
      console.warn('⚠️ [Email Trigger Error] Non-blocking employer application email failed:', emailErr.message);
    }

    // Fire in-app employer notification (non-blocking, no candidate data exposed)
    try {
      const jobRows2 = await db.query('SELECT title, employer_id FROM JOB WHERE id = ?', [job_id]);
      if (jobRows2.length > 0 && jobRows2[0].employer_id) {
        const empRows2 = await db.query('SELECT user_id FROM EMPLOYERS WHERE id = ?', [jobRows2[0].employer_id]);
        if (empRows2.length > 0 && empRows2[0].user_id) {
          const jobTitle = jobRows2[0].title;
          // Count total applications for this job (to decide singular vs. plural message)
          const countRows = await db.query('SELECT COUNT(*) AS total FROM APPLICATION WHERE job_id = ?', [job_id]);
          const totalApps = countRows[0]?.total || 1;
          if (totalApps <= 1) {
            await createEmployerNotification(
              empRows2[0].user_id,
              'new_application',
              'New application received',
              `Someone has applied for your ${jobTitle} position. Our recruitment team will review the application and contact you if further action is required.`,
              'job',
              job_id
            );
          } else {
            await createEmployerNotification(
              empRows2[0].user_id,
              'multiple_applications',
              'New applications received',
              `${totalApps} applications have been received for your ${jobTitle} position. Our recruitment team will review them and coordinate with you as required.`,
              'job',
              job_id
            );
          }
        }
      }
    } catch (notifErr) {
      console.warn('[In-App Notif] Non-blocking employer notification failed:', notifErr.message);
    }

    res.status(201).json({ success: true, message: 'Application submitted successfully.', application_id: id });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error submitting application.', error: error.message });
  }
};

// Candidate list my applications
const getMyApplications = async (req, res) => {
  try {
    const cands = await db.query('SELECT id FROM CANDIDATES WHERE user_id = ?', [req.user.id]);
    if (cands.length === 0) return res.status(404).json({ success: false, message: 'Candidate not found.' });

    const candidateId = cands[0].id;
    const apps = await db.query('SELECT * FROM APPLICATION WHERE candidate_id = ? ORDER BY applied_at DESC', [candidateId]);

    const enriched = await Promise.all(apps.map(async (app) => {
      const jobs = await db.query(
        'SELECT title, location, employer_id, client_id, min_salary, max_salary, currency, salary_period, workplace_type, employment_type FROM JOB WHERE id = ?',
        [app.job_id]
      );
      let jobInfo = jobs.length > 0 ? jobs[0] : null;
      let companyName = 'Partner Company';
      let companyLogo = null;

      if (jobInfo) {
        if (jobInfo.employer_id) {
          const emps = await db.query('SELECT company_name, logo_url FROM EMPLOYERS WHERE id = ?', [jobInfo.employer_id]);
          if (emps.length > 0) {
            companyName = emps[0].company_name;
            companyLogo = emps[0].logo_url || null;
          }
        } else if (jobInfo.client_id) {
          const cls = await db.query('SELECT name FROM CLIENT WHERE id = ?', [jobInfo.client_id]);
          if (cls.length > 0) companyName = cls[0].name;
        }
      }

      return {
        ...app,
        job_title: jobInfo ? jobInfo.title : 'Unknown Job',
        job_location: jobInfo ? jobInfo.location : '',
        company_name: companyName,
        company_logo: companyLogo,
        min_salary: jobInfo ? jobInfo.min_salary : null,
        max_salary: jobInfo ? jobInfo.max_salary : null,
        currency: jobInfo ? jobInfo.currency : 'INR',
        salary_period: jobInfo ? jobInfo.salary_period : 'Per Year',
        workplace_type: jobInfo ? jobInfo.workplace_type : 'On-site',
        employment_type: jobInfo ? jobInfo.employment_type : 'Full Time'
      };
    }));

    res.json({ success: true, applications: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching applications.', error: error.message });
  }
};

// Employer / Recruiter list applicants for a job (Privacy-Preserving & Multi-Tenant Isolated)
const getApplicantsForJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Verify job exists
    const jobs = await db.query('SELECT * FROM JOB WHERE id = ?', [jobId]);
    if (jobs.length === 0) {
      return res.status(404).json({ success: false, message: 'Job not found.' });
    }
    const job = jobs[0];

    // Multi-tenant check for employers/staff
    if (userRole === 'employer') {
      const employers = await db.query('SELECT id FROM EMPLOYERS WHERE user_id = ?', [userId]);
      if (employers.length === 0) {
        return res.status(403).json({ success: false, message: 'Access denied: Employer profile required.' });
      }
      const employer = employers[0];
      const isOwner = (job.employer_id && String(job.employer_id) === String(employer.id)) ||
                      (job.client_id && String(job.client_id) === String(employer.id));
      if (!isOwner) {
        return res.status(403).json({ success: false, message: 'Access denied: You can only view applicants for your own jobs.' });
      }
    } else {
      const isStaff = ['admin', 'main_admin', 'director', 'recruiter', 'tl_coordinator', 'hr_manager', 'hr_executive', 'viewer'].includes(userRole);
      if (!isStaff) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
    }

    const apps = await db.query('SELECT id, job_id, status, applied_at FROM APPLICATION WHERE job_id = ? ORDER BY applied_at DESC', [jobId]);

    // Format privacy-preserving safe records (NO candidate contact/profile leakage!)
    const safeApplicants = apps.map((app, index) => {
      const refSuffix = app.id.replace(/-/g, '').substring(0, 6).toUpperCase();
      return {
        id: app.id,
        reference_number: `APP-${refSuffix || String(index + 1).padStart(4, '0')}`,
        job_id: app.job_id,
        job_title: job.title,
        status: app.status || 'applied',
        applied_at: app.applied_at
      };
    });

    res.json({
      success: true,
      count: safeApplicants.length,
      job: {
        id: job.id,
        title: job.title,
        department: job.department || 'General',
        location: job.location || 'Hybrid'
      },
      applicants: safeApplicants
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching applicants.', error: error.message });
  }
};

// Get Single Application by ID (Multi-Tenant & Candidate Ownership Isolated)
const getApplicationById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const apps = await db.query('SELECT * FROM APPLICATION WHERE id = ?', [id]);
    if (apps.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }
    const app = apps[0];

    // Candidate ownership isolation
    if (userRole === 'candidate') {
      const cands = await db.query('SELECT id FROM CANDIDATES WHERE user_id = ?', [userId]);
      if (cands.length === 0 || app.candidate_id !== cands[0].id) {
        return res.status(403).json({ success: false, message: 'Access denied: You can only view your own applications.' });
      }
    } else if (userRole === 'employer') {
      // Employers must use privacy-preserving /job/:jobId endpoint
      return res.status(403).json({ success: false, message: 'Access denied: Direct candidate application inspection is restricted.' });
    }

    // Enrich with job info
    const jobs = await db.query('SELECT title, location, employer_id, client_id FROM JOB WHERE id = ?', [app.job_id]);
    let jobInfo = jobs.length > 0 ? jobs[0] : null;
    let companyName = 'Partner Company';
    if (jobInfo) {
      if (jobInfo.employer_id) {
        const emps = await db.query('SELECT company_name FROM EMPLOYERS WHERE id = ?', [jobInfo.employer_id]);
        if (emps.length > 0) companyName = emps[0].company_name;
      } else if (jobInfo.client_id) {
        const cls = await db.query('SELECT name FROM CLIENT WHERE id = ?', [jobInfo.client_id]);
        if (cls.length > 0) companyName = cls[0].name;
      }
    }

    // Enrich with candidate details for authorized internal staff inspection
    const cands = await db.query('SELECT * FROM CANDIDATES WHERE id = ?', [app.candidate_id]);
    let candInfo = cands.length > 0 ? cands[0] : {};
    let userInfo = {};
    if (candInfo.user_id) {
      const usrs = await db.query('SELECT email, phone FROM USERS WHERE id = ?', [candInfo.user_id]);
      if (usrs.length > 0) userInfo = usrs[0];
    }

    const exp = await db.query('SELECT organization, designation, from_date, to_date FROM CANDIDATE_EXPERIENCE WHERE candidate_id = ? ORDER BY from_date DESC', [app.candidate_id]);
    const edu = await db.query('SELECT degree, institution, field_of_study, pass_out_year FROM CANDIDATE_EDUCATION WHERE candidate_id = ?', [app.candidate_id]);
    const skills = await db.query('SELECT skill_name FROM CANDIDATE_SKILL WHERE candidate_id = ?', [app.candidate_id]);
    const resumes = await db.query('SELECT file_url FROM RESUME WHERE candidate_id = ? LIMIT 1', [app.candidate_id]);

    const refSuffix = (app.id || '').replace(/-/g, '').substring(0, 6).toUpperCase();

    res.json({
      success: true,
      application: {
        ...app,
        reference_number: `APP-${refSuffix || '1000'}`,
        candidate_name: candInfo.name || 'Candidate',
        candidate_email: userInfo.email || 'candidate@vacancy.in',
        candidate_phone: userInfo.phone || 'Not Disclosed',
        current_location: candInfo.current_location || 'Not Specified',
        profile_type: candInfo.profile_type || 'STANDARD',
        resume_url: resumes.length > 0 ? resumes[0].file_url : null,
        experience: exp || [],
        education: edu || [],
        skills: (skills || []).map(s => s.skill_name),
        job_title: jobInfo ? jobInfo.title : 'Unknown Job',
        job_location: jobInfo ? jobInfo.location : '',
        company_name: companyName
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching application.', error: error.message });
  }
};

// Update Application Status (Restricted to Vacancy.in Internal Recruitment Operations)
const updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userRole = req.user.role;

    if (userRole === 'viewer') {
      return res.status(403).json({ success: false, message: 'Access denied: Viewer role is read-only.' });
    }

    // Neither candidates nor employers can manipulate recruitment status
    if (userRole === 'employer' || userRole === 'candidate') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Candidate recruitment status is managed exclusively by the Vacancy.in recruitment team.'
      });
    }

    await db.query('UPDATE APPLICATION SET status = ? WHERE id = ?', [status, id]);

    // Automatically trigger Candidate Notification & Recruitment Activity Audit
    try {
      const { logActivity } = require('./adminController');
      const appRows = await db.query('SELECT candidate_id, job_id FROM APPLICATION WHERE id = ?', [id]);
      if (appRows.length > 0) {
        const jobId = appRows[0].job_id;
        const candRows = await db.query('SELECT user_id FROM CANDIDATES WHERE id = ?', [appRows[0].candidate_id]);
        const jobRows = await db.query('SELECT title FROM JOB WHERE id = ?', [jobId]);
        if (candRows.length > 0 && candRows[0].user_id) {
          const candUserId = candRows[0].user_id;
          const jobTitle = jobRows.length > 0 ? jobRows[0].title : 'Job Opening';
          const readableStatus = String(status).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          const notifId = uuidv4();
          await db.query(
            'INSERT INTO NOTIFICATION (id, user_id, type, title, message, reference_type, reference_id, is_read) VALUES (?, ?, "application_status", ?, ?, "APPLICATION", ?, 0)',
            [notifId, candUserId, `Application ${readableStatus}`, `Your application for ${jobTitle} is now ${readableStatus}.`, id]
          );
        }

        let actionType = 'application_status_changed';
        const lowerStatus = String(status).toLowerCase();
        if (lowerStatus === 'shortlisted') actionType = 'candidate_shortlisted';
        else if (lowerStatus === 'interview') actionType = 'candidate_moved_to_interview';
        else if (lowerStatus === 'selected') actionType = 'candidate_selected';
        else if (lowerStatus === 'rejected') actionType = 'candidate_rejected';
        else if (lowerStatus.includes('review')) actionType = 'application_reviewed';

        await logActivity({
          performed_by: req.user.id,
          action_type: actionType,
          entity_type: 'APPLICATION',
          entity_id: id,
          related_job_id: jobId,
          related_application_id: id,
          description: `Staff member (${req.user.email}) changed application status to '${status}'`
        });
      }
    } catch (notifErr) {
      console.warn('⚠️ [Activity/Notification Trigger Warning]:', notifErr.message);
    }

    res.json({ success: true, message: 'Application status updated.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating application status.', error: error.message });
  }
};

module.exports = {
  applyForJob,
  getMyApplications,
  getApplicationById,
  getApplicantsForJob,
  updateApplicationStatus
};
