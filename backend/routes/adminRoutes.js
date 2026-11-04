const express = require('express');
const router = express.Router();
const {
  getAdminStats,
  getAllCandidates,
  getCandidateDetails,
  checkCandidateDuplicate,
  addCandidateNote,
  getAllJobs,
  getAdminJobDetails,
  createInternalJob,
  updateInternalJob,
  archiveJob,
  restoreJob,
  toggleCandidateAccess,
  getJobHistory,
  getJobApplicants,
  getAdminApplicationResume,
  assignJobRecruiter,
  updateJobStatus,
  approveJob,
  rejectJob,
  getCallbackRequests,
  updateCallbackRequest,
  generateAdminJobDescription,
  getAllApplications,
  updateApplicationStage,
  getCandidateShares,
  proposeCandidateShare,
  reviewCandidateShare,
  approveCandidateShare,
  revokeCandidateShare,
  getSharedProfileByToken,
  getSharedResumeByToken,
  getAllEmployerEnquiries,
  assignEnquiry,
  updateEnquiryStatus,
  updateEnquiryDetails,
  getEnquiryHistory,
  replyToEnquiryViaEmail,
  getEnquiryCounts,
  getEnquiryLinkedJobs,
  createJobFromEnquiry,
  convertEnquiryToRequirement,
  getRequirementCommercials,
  recordCommercialQuote,
  recordCommercialPayment,
  verifyCommercialPayment,
  rejectCommercialPayment,
  getAllEmployers,
  approveEmployer,
  rejectEmployer,
  toggleEmployerCandidateAccess,
  getAllLeads,
  createLead,
  updateLead,
  handoverLead,
  checkDuplicateCompanyLead,
  createCompanyLead,
  getCompanyLeadsQueue,
  getCompanyLeadDetails,
  claimCompanyLead,
  updateCompanyLeadStatus,
  reassignCompanyLead,
  convertCompanyLeadToJob,
  getAllUsers,
  createEmployee,
  toggleUserStatus,
  updateUserRole,
  getAdminSelfProfile,
  updateAdminSelfProfile,
  uploadAdminProfilePhoto,
  updateAdminUserProfile,
  getTeams,
  createTeam,
  updateTeam,
  reassignTeamMember,
  getTeamPerformance,
  assignJobTeam,
  getRoles,
  getRolePermissions,
  updateRolePermissions,
  createCustomRole,
  getRecruitmentActivity,
  getCategories,
  getSkills,
  getLocations,
  getReports,
  getSettings,
  updateSettings
} = require('../controllers/adminController');

const {
  getJobExecutiveCandidates,
  getJobExecutiveShares,
  createExecutiveShortlistShare,
  revokeExecutiveShortlistShare,
  getExecutiveShortlistActivity,
  addCandidateToShortlist,
  removeCandidateFromShortlist,
  searchCandidatePoolForJob
} = require('../controllers/executiveShareController');
const db = require('../config/db');
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { checkPermission, requireScopedJob, requireScopedApplication } = require('../middleware/rbacMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { createRateLimiter } = require('../middleware/securityMiddleware');

const publicShareLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, limit: 60, code: 'SHARE_LINK_RATE_LIMITED' });
const adminApiLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, limit: 300, code: 'ADMIN_RATE_LIMITED' });

// 1. PUBLIC TOKEN ENDPOINT FOR CLIENT CANDIDATE SHARING (No Auth Required)
router.get('/shared-profile/:token', publicShareLimiter, getSharedProfileByToken);
router.get('/shared-profile/:token/resume', publicShareLimiter, getSharedResumeByToken);

// 2. PROTECTED ADMIN ROUTES: Require Authenticated Internal Role (System or Director-Defined Custom Roles)
const authorizeInternalStaff = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  const userRole = (req.user.role || '').toLowerCase();
  const SYSTEM_INTERNAL_ROLES = ['director', 'bd', 'bd_lead', 'tl_coordinator', 'recruiter', 'admin', 'main_admin'];

  if (SYSTEM_INTERNAL_ROLES.includes(userRole)) {
    return next();
  }

  // Check if role is a Director-defined custom role registered in ROLES master table
  try {
    const roles = await db.query('SELECT role_key FROM ROLES WHERE role_key = ? LIMIT 1', [userRole]);
    if (roles && roles.length > 0) {
      return next();
    }
  } catch (_) {}

  return res.status(403).json({
    success: false,
    message: `Forbidden. Role '${userRole}' is not authorized to access internal administrative resources.`
  });
};

router.use(adminApiLimiter);
router.use(authenticateToken);
router.use(authorizeInternalStaff);

// 3. DASHBOARD
router.get('/stats', checkPermission('dashboard', 'view'), getAdminStats);

// 4. CANDIDATES
router.get('/candidates', checkPermission('candidates', 'view'), getAllCandidates);
router.get('/candidates/:id', checkPermission('candidates', 'view'), getCandidateDetails);
router.post('/candidates/duplicate-check', checkPermission('candidates', 'view'), checkCandidateDuplicate);
router.post('/candidates/:id/notes', checkPermission('candidates', 'edit'), addCandidateNote);

// 5. JOBS & RECRUITMENT REQUISITIONS
router.get('/jobs', checkPermission('jobs', 'view'), getAllJobs);
router.get('/jobs/:id', checkPermission('jobs', 'view'), requireScopedJob, getAdminJobDetails);
router.post('/jobs', checkPermission('jobs', 'create'), createInternalJob);
router.post('/jobs/generate-jd', checkPermission('jobs', 'create'), generateAdminJobDescription);
router.put('/jobs/:id', checkPermission('jobs', 'edit'), requireScopedJob, updateInternalJob);
router.put('/jobs/:id/archive', checkPermission('jobs', 'edit'), requireScopedJob, archiveJob);
router.put('/jobs/:id/restore', checkPermission('jobs', 'edit'), requireScopedJob, restoreJob);
router.put('/jobs/:id/candidate-access', checkPermission('jobs', 'edit'), requireScopedJob, toggleCandidateAccess);
router.get('/jobs/:id/history', checkPermission('jobs', 'view'), requireScopedJob, getJobHistory);
router.get('/jobs/:id/applicants', checkPermission('applications', 'view'), requireScopedJob, getJobApplicants);
router.put('/jobs/:id/status', checkPermission('jobs', 'edit'), requireScopedJob, updateJobStatus);
router.put('/jobs/:id/approve', checkPermission('jobs', 'approve'), requireScopedJob, approveJob);
router.put('/jobs/:id/reject', checkPermission('jobs', 'approve'), requireScopedJob, rejectJob);
router.put('/jobs/:id/assign-recruiter', checkPermission('jobs', 'edit'), requireScopedJob, assignJobRecruiter);
router.put('/jobs/:id/assign-team', checkPermission('jobs', 'assign'), assignJobTeam);

// Executive Search Candidate Shortlist Sharing
router.get('/jobs/:id/executive-candidates', checkPermission('applications', 'view'), requireScopedJob, getJobExecutiveCandidates);
router.get('/jobs/:id/shortlist', checkPermission('applications', 'view'), requireScopedJob, getJobExecutiveCandidates);
router.post('/jobs/:id/shortlist', checkPermission('applications', 'edit'), requireScopedJob, addCandidateToShortlist);
router.delete('/jobs/:id/shortlist/:candidateId', checkPermission('applications', 'edit'), requireScopedJob, removeCandidateFromShortlist);
router.get('/jobs/:id/candidate-pool', checkPermission('applications', 'view'), requireScopedJob, searchCandidatePoolForJob);
router.get('/jobs/:id/executive-shares', checkPermission('applications', 'view'), requireScopedJob, getJobExecutiveShares);
router.post('/jobs/:id/executive-shares', checkPermission('applications', 'create'), requireScopedJob, createExecutiveShortlistShare);
router.post('/jobs/:id/executive-shares/:shareId/revoke', checkPermission('applications', 'edit'), requireScopedJob, revokeExecutiveShortlistShare);
router.put('/jobs/:id/executive-shares/:shareId/revoke', checkPermission('applications', 'edit'), requireScopedJob, revokeExecutiveShortlistShare);
router.get('/jobs/:id/executive-shares/:shareId/activity', checkPermission('applications', 'view'), requireScopedJob, getExecutiveShortlistActivity);

// Callbacks
router.get('/callbacks', checkPermission('callbacks', 'view'), getCallbackRequests);
router.put('/callbacks/:id', checkPermission('callbacks', 'edit'), updateCallbackRequest);

// 6. APPLICATIONS & RECRUITMENT STAGES
router.get('/applications', checkPermission('applications', 'view'), getAllApplications);
router.get('/applications/:id/resume', checkPermission('applications', 'view'), requireScopedApplication, getAdminApplicationResume);
router.put('/applications/:id/stage', checkPermission('applications', 'edit'), requireScopedApplication, updateApplicationStage);

// 7. CANDIDATE SHARING & CLIENT APPROVAL
router.get('/candidate-shares', checkPermission('candidate_sharing', 'view'), getCandidateShares);
router.post('/candidate-shares/propose', checkPermission('candidate_sharing', 'create'), proposeCandidateShare);
router.put('/candidate-shares/:id/review', checkPermission('candidate_sharing', 'edit'), reviewCandidateShare);
router.put('/candidate-shares/:id/approve', checkPermission('candidate_sharing', 'approve'), approveCandidateShare);
router.post('/candidate-shares/:id/approve', checkPermission('candidate_sharing', 'approve'), approveCandidateShare);
router.put('/candidate-shares/:id/revoke', checkPermission('candidate_sharing', 'edit'), revokeCandidateShare);
router.post('/candidate-shares/:id/revoke', checkPermission('candidate_sharing', 'edit'), revokeCandidateShare);

// 8. RECRUITMENT ENQUIRIES (Contact Us & Executive Service)
router.get('/enquiries/counts', checkPermission('enquiries', 'view'), getEnquiryCounts);
router.get('/enquiries', checkPermission('enquiries', 'view'), getAllEmployerEnquiries);
router.get('/enquiries/:id/history', checkPermission('enquiries', 'view'), getEnquiryHistory);
router.get('/enquiries/:id/jobs', checkPermission('enquiries', 'view'), getEnquiryLinkedJobs);
router.post('/enquiries/:id/reply', checkPermission('enquiries', 'edit'), replyToEnquiryViaEmail);
router.put('/enquiries/:id/assign', checkPermission('enquiries', 'assign'), assignEnquiry);
router.put('/enquiries/:id/status', checkPermission('enquiries', 'edit'), updateEnquiryStatus);
router.put('/enquiries/:id/details', checkPermission('enquiries', 'edit'), updateEnquiryDetails);
router.post('/enquiries/:id/create-job', checkPermission('jobs', 'create'), createJobFromEnquiry);
router.post('/enquiries/:id/convert-to-requirement', checkPermission('enquiries', 'edit'), convertEnquiryToRequirement);

// 9. COMMERCIALS & PAYMENT TRACKING
router.get('/commercials', checkPermission('jobs', 'view'), getRequirementCommercials);
router.post('/commercials/quote', checkPermission('jobs', 'edit'), recordCommercialQuote);
router.post('/commercials/:id/payment', checkPermission('jobs', 'edit'), recordCommercialPayment);
router.put('/commercials/:id/verify', checkPermission('jobs', 'approve'), verifyCommercialPayment);
router.put('/commercials/:id/reject', checkPermission('jobs', 'approve'), rejectCommercialPayment);

// 9. EMPLOYERS & CLIENTS
router.get('/employers', checkPermission('employers', 'view'), getAllEmployers);
router.put('/employers/:id/approve', checkPermission('employers', 'approve'), approveEmployer);
router.put('/employers/:id/reject', checkPermission('employers', 'approve'), rejectEmployer);
router.put('/employers/:id/candidate-access', checkPermission('employers', 'edit'), toggleEmployerCandidateAccess);

// 10. LEADS MANAGEMENT (BD -> Recruiter Workflow)
router.get('/leads/check-duplicate', checkPermission('leads', 'create'), checkDuplicateCompanyLead);
router.get('/leads/queue', checkPermission('leads', 'view'), getCompanyLeadsQueue);
router.get('/leads', checkPermission('leads', 'view'), getCompanyLeadsQueue);
router.get('/leads/:id', checkPermission('leads', 'view'), getCompanyLeadDetails);
router.post('/leads', checkPermission('leads', 'create'), createCompanyLead);
router.post('/leads/:id/claim', checkPermission('leads', 'claim'), claimCompanyLead);
router.put('/leads/:id/status', checkPermission('leads', 'edit'), updateCompanyLeadStatus);
router.put('/leads/:id', checkPermission('leads', 'edit'), updateCompanyLeadStatus);
router.post('/leads/:id/reassign', checkPermission('leads', 'reassign'), reassignCompanyLead);
router.post('/leads/:id/convert-job', checkPermission('jobs', 'create'), convertCompanyLeadToJob);
router.post('/leads/:id/handover', checkPermission('leads', 'edit'), handoverLead);

// 11. TEAM MANAGEMENT & USER ASSIGNMENTS
router.get('/profile/me', getAdminSelfProfile);
router.put('/profile/me', updateAdminSelfProfile);
router.post('/profile/photo', upload.forPurpose('profile_photo').single('photo'), upload.validate('profile_photo'), uploadAdminProfilePhoto);
router.post('/profile/me/photo', upload.forPurpose('profile_photo').single('photo'), upload.validate('profile_photo'), uploadAdminProfilePhoto);
router.get('/users', checkPermission('team', 'view'), getAllUsers);
router.get('/team', checkPermission('team', 'view'), getAllUsers);
router.get('/team-members', checkPermission('team', 'view'), getAllUsers);
router.post('/team', checkPermission('team', 'create'), createEmployee);
router.post('/team-members', checkPermission('team', 'create'), createEmployee);
router.put('/team-members/:id/reassign', checkPermission('team', 'edit'), reassignTeamMember);
router.put('/users/:id/reassign', checkPermission('team', 'edit'), reassignTeamMember);
router.put('/users/:id/assign-manager', checkPermission('team', 'edit'), reassignTeamMember);
router.put('/users/:id/admin-profile', checkPermission('team', 'edit'), updateAdminUserProfile);
router.put('/users/:id/status', checkPermission('team', 'edit'), toggleUserStatus);
router.put('/users/:id/role', checkPermission('team', 'edit'), updateUserRole);
router.get('/teams', checkPermission('team', 'view'), getTeams);
router.post('/teams', checkPermission('team', 'create'), createTeam);
router.put('/teams/:id', checkPermission('team', 'edit'), updateTeam);
router.get('/teams/performance', checkPermission('team', 'view'), getTeamPerformance);
router.get('/teams/:id/performance', checkPermission('team', 'view'), getTeamPerformance);

// 12. ROLES & PERMISSIONS CONFIGURATION
router.get('/roles', checkPermission('roles', 'view'), getRoles);
router.post('/roles', checkPermission('roles', 'create'), createCustomRole);
router.get('/permissions', checkPermission('roles', 'view'), getRolePermissions);
router.put('/permissions', checkPermission('roles', 'edit'), updateRolePermissions);

// 13. AUDIT & ACTIVITY LOG
router.get('/activity', checkPermission('activity_log', 'view'), getRecruitmentActivity);

// 14. MASTER DATA CATALOGS & REPORTS
router.get('/categories', getCategories);
router.get('/skills', getSkills);
router.get('/locations', getLocations);
router.get('/reports', checkPermission('reports', 'view'), getReports);
router.get('/settings', checkPermission('settings', 'view'), getSettings);
router.put('/settings', checkPermission('settings', 'edit'), updateSettings);

module.exports = router;
