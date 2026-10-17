const express = require('express');
const router = express.Router();
const {
  getAdminStats,
  getAllCandidates,
  getCandidateDetails,
  checkCandidateDuplicate,
  addCandidateNote,
  getAllJobs,
  createInternalJob,
  updateInternalJob,
  assignJobRecruiter,
  updateJobStatus,
  approveJob,
  rejectJob,
  getAllApplications,
  updateApplicationStage,
  getCandidateShares,
  proposeCandidateShare,
  reviewCandidateShare,
  approveCandidateShare,
  revokeCandidateShare,
  getSharedProfileByToken,
  getAllEmployerEnquiries,
  assignEnquiry,
  updateEnquiryStatus,
  updateEnquiryDetails,
  convertEnquiryToRequirement,
  getRequirementCommercials,
  recordCommercialQuote,
  recordCommercialPayment,
  verifyCommercialPayment,
  rejectCommercialPayment,
  getAllEmployers,
  approveEmployer,
  rejectEmployer,
  getAllLeads,
  createLead,
  updateLead,
  handoverLead,
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
const db = require('../config/db');
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { checkPermission } = require('../middleware/rbacMiddleware');
const upload = require('../middleware/uploadMiddleware');

// 1. PUBLIC TOKEN ENDPOINT FOR CLIENT CANDIDATE SHARING (No Auth Required)
router.get('/shared-profile/:token', getSharedProfileByToken);

// 2. PROTECTED ADMIN ROUTES: Require Authenticated Internal Role (System or Director-Defined Custom Roles)
const authorizeInternalStaff = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  const userRole = (req.user.role || '').toLowerCase();
  const SYSTEM_INTERNAL_ROLES = ['director', 'bd_lead', 'tl_coordinator', 'recruiter', 'admin', 'main_admin'];

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
router.post('/jobs', checkPermission('jobs', 'create'), createInternalJob);
router.put('/jobs/:id', checkPermission('jobs', 'edit'), updateInternalJob);
router.put('/jobs/:id/status', checkPermission('jobs', 'edit'), updateJobStatus);
router.put('/jobs/:id/approve', checkPermission('jobs', 'approve'), approveJob);
router.put('/jobs/:id/reject', checkPermission('jobs', 'approve'), rejectJob);
router.put('/jobs/:id/assign-recruiter', checkPermission('jobs', 'edit'), assignJobRecruiter);

// 6. APPLICATIONS & RECRUITMENT STAGES
router.get('/applications', checkPermission('applications', 'view'), getAllApplications);
router.put('/applications/:id/stage', checkPermission('applications', 'edit'), updateApplicationStage);

// 7. CANDIDATE SHARING & CLIENT APPROVAL
router.get('/candidate-shares', checkPermission('candidate_sharing', 'view'), getCandidateShares);
router.post('/candidate-shares/propose', checkPermission('candidate_sharing', 'create'), proposeCandidateShare);
router.put('/candidate-shares/:id/review', checkPermission('candidate_sharing', 'edit'), reviewCandidateShare);
router.put('/candidate-shares/:id/approve', checkPermission('candidate_sharing', 'approve'), approveCandidateShare);
router.put('/candidate-shares/:id/revoke', checkPermission('candidate_sharing', 'edit'), revokeCandidateShare);

// 8. RECRUITMENT ENQUIRIES (Contact Us & Executive Service)
router.get('/enquiries', checkPermission('enquiries', 'view'), getAllEmployerEnquiries);
router.put('/enquiries/:id/assign', checkPermission('enquiries', 'assign'), assignEnquiry);
router.put('/enquiries/:id/status', checkPermission('enquiries', 'edit'), updateEnquiryStatus);
router.put('/enquiries/:id/details', checkPermission('enquiries', 'edit'), updateEnquiryDetails);
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

// 10. LEADS MANAGEMENT (BD Lead Pipeline)
router.get('/leads', checkPermission('leads', 'view'), getAllLeads);
router.post('/leads', checkPermission('leads', 'create'), createLead);
router.put('/leads/:id', checkPermission('leads', 'edit'), updateLead);
router.post('/leads/:id/handover', checkPermission('leads', 'edit'), handoverLead);

// 11. TEAM MANAGEMENT & USER ASSIGNMENTS
router.get('/profile/me', getAdminSelfProfile);
router.put('/profile/me', updateAdminSelfProfile);
router.post('/profile/photo', upload.single('photo'), uploadAdminProfilePhoto);
router.post('/profile/me/photo', upload.single('photo'), uploadAdminProfilePhoto);
router.get('/users', checkPermission('team', 'view'), getAllUsers);
router.get('/team', checkPermission('team', 'view'), getAllUsers);
router.post('/team', checkPermission('team', 'create'), createEmployee);
router.put('/users/:id/admin-profile', checkPermission('team', 'edit'), updateAdminUserProfile);
router.put('/users/:id/status', checkPermission('team', 'edit'), toggleUserStatus);
router.put('/users/:id/role', checkPermission('team', 'edit'), updateUserRole);
router.get('/teams', checkPermission('team', 'view'), getTeams);
router.post('/teams', checkPermission('team', 'create'), createTeam);

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
