const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { getUserScope } = require('../middleware/rbacMiddleware');
const {
  uploadBufferToCloudinary,
  deleteFromCloudinary,
  generateSignedUrl
} = require('../services/cloudinaryService');

/**
 * Check if employer is authorized to access a candidate's file
 */
const isEmployerAuthorizedForCandidateFile = async (employerUserId, candidateId, applicationId = null) => {
  try {
    // 1. Get employer record
    const employers = await db.query('SELECT id FROM EMPLOYERS WHERE user_id = ?', [employerUserId]);
    if (!employers || employers.length === 0) return false;
    const employerId = employers[0].id;

    // 2. Check if candidate applied to any job posted by this employer
    const jobApps = await db.query(
      'SELECT a.id FROM APPLICATION a JOIN JOB j ON a.job_id = j.id WHERE a.candidate_id = ? AND j.employer_id = ?',
      [candidateId, employerId]
    );
    if (jobApps && jobApps.length > 0) return true;

    // 3. Candidate sharing requires explicit consent and an approved, unexpired share.
    const shares = await db.query(`
      SELECT cs.id FROM CANDIDATE_SHARING cs
      LEFT JOIN JOB j ON cs.job_id = j.id
      WHERE cs.candidate_id = ? AND cs.status = 'APPROVED' AND cs.candidate_consent = 1
        AND (cs.expires_at IS NULL OR cs.expires_at > CURRENT_TIMESTAMP)
        AND (cs.client_id = ? OR j.employer_id = ? OR j.client_id = ?)
      LIMIT 1
    `, [candidateId, employerId, employerId, employerId]);
    if (shares && shares.length > 0) return true;

    return false;
  } catch (err) {
    console.error('Error verifying employer candidate file access authorization:', err);
    return false;
  }
};

const hasPermission = async (role, moduleName, actionName) => {
  const rows = await db.query(
    'SELECT is_granted FROM ROLE_PERMISSIONS WHERE role_key = ? AND module = ? AND action = ? LIMIT 1',
    [role, moduleName, actionName]
  );
  return Boolean(rows?.[0]?.is_granted);
};

const isInternalAuthorizedForFile = async (user, file) => {
  const role = String(user.role || '').toLowerCase();
  if (role === 'director' || role === 'main_admin' || user.is_main_admin === 1) return true;
  if (!await hasPermission(role, 'applications', 'view')) return false;

  const scope = await getUserScope(user.id, role);
  if (scope.isGlobal && role === 'admin') return true;

  let jobId = null;
  if (file.application_id) {
    const applications = await db.query('SELECT job_id, candidate_id FROM APPLICATION WHERE id = ? LIMIT 1', [file.application_id]);
    if (!applications.length || (file.candidate_id && String(applications[0].candidate_id) !== String(file.candidate_id))) return false;
    jobId = applications[0].job_id;
  } else if (file.candidate_id) {
    const applications = await db.query('SELECT job_id FROM APPLICATION WHERE candidate_id = ?', [file.candidate_id]);
    return applications.some((application) => scope.jobIds.includes(application.job_id));
  }

  return Boolean(jobId && scope.jobIds.includes(jobId));
};

const validateUploadAssociations = async (user, associations) => {
  const role = String(user.role || '').toLowerCase();
  const { candidate_id, employer_id, application_id } = associations;

  if (!candidate_id && !employer_id && !application_id) return true;

  if (role === 'candidate') {
    const candidates = await db.query('SELECT id FROM CANDIDATES WHERE user_id = ? LIMIT 1', [user.id]);
    const ownCandidateId = candidates?.[0]?.id;
    if (candidate_id && String(candidate_id) !== String(ownCandidateId)) return false;
    if (employer_id) return false;
    if (application_id) {
      const apps = await db.query('SELECT id FROM APPLICATION WHERE id = ? AND candidate_id = ? LIMIT 1', [application_id, ownCandidateId]);
      if (!apps.length) return false;
    }
    return true;
  }

  if (role === 'employer') {
    const employers = await db.query('SELECT id FROM EMPLOYERS WHERE user_id = ? LIMIT 1', [user.id]);
    const ownEmployerId = employers?.[0]?.id;
    if (employer_id && String(employer_id) !== String(ownEmployerId)) return false;
    if (candidate_id) return false;
    if (application_id) {
      const apps = await db.query(`
        SELECT a.id FROM APPLICATION a JOIN JOB j ON a.job_id = j.id
        WHERE a.id = ? AND j.employer_id = ? LIMIT 1
      `, [application_id, ownEmployerId]);
      if (!apps.length) return false;
    }
    return true;
  }

  return isInternalAuthorizedForFile(user, { candidate_id, employer_id, application_id });
};

/**
 * Upload File to Cloudinary & Save Metadata
 */
const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    if (req.user && req.user.role === 'viewer') {
      return res.status(403).json({ success: false, message: 'Access denied: Viewer role cannot upload files.' });
    }

    const { file_type = 'general', candidate_id, employer_id, application_id } = req.body;
    const userId = req.user.id;

    const associationsAuthorized = await validateUploadAssociations(req.user, { candidate_id, employer_id, application_id });
    if (!associationsAuthorized) {
      return res.status(403).json({
        success: false,
        code: 'FILE_ASSOCIATION_FORBIDDEN',
        message: 'You are not authorized to associate a file with the supplied record.'
      });
    }

    // Determine Cloudinary folder structure
    let folder = 'vakancy/general';
    let resourceType = 'auto';

    if (file_type === 'logo' || req.file.mimetype.startsWith('image/')) {
      resourceType = 'image';
      if (employer_id) {
        folder = `vakancy/employers/${employer_id}/logo`;
      } else {
        folder = `vakancy/users/${userId}/images`;
      }
    } else if (file_type === 'resume' || file_type === 'document') {
      resourceType = 'raw';
      if (candidate_id) {
        folder = `vakancy/candidates/${candidate_id}/resumes`;
      } else {
        folder = `vakancy/users/${userId}/documents`;
      }
    } else if (application_id) {
      folder = `vakancy/applications/${application_id}`;
    }

    const safePublicId = `${Date.now()}_${Math.round(Math.random() * 1e6)}`;

    const isPrivateDocument = Boolean(candidate_id || application_id || ['resume', 'document'].includes(file_type));

    // Sensitive documents use authenticated delivery. Public upload URLs are
    // acceptable only for non-sensitive assets such as company logos.
    const cloudinaryResult = await uploadBufferToCloudinary(req.file.buffer, {
      folder,
      public_id: safePublicId,
      resource_type: resourceType,
      type: isPrivateDocument ? 'authenticated' : 'upload'
    });

    const fileId = uuidv4();
    const secureUrl = cloudinaryResult.secure_url;
    const publicId = cloudinaryResult.public_id;
    const assetId = cloudinaryResult.asset_id || null;

    // Insert metadata record into FILES
    await db.query(
      `INSERT INTO FILES (id, owner_user_id, candidate_id, employer_id, application_id, file_type, file_name, mime_type, file_size, cloudinary_asset_id, cloudinary_public_id, resource_type, delivery_type, secure_url, folder)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fileId,
        userId,
        candidate_id || null,
        employer_id || null,
        application_id || null,
        file_type,
        req.file.originalname,
        req.file.mimetype,
        req.file.size,
        assetId,
        publicId,
        resourceType,
        cloudinaryResult.type || 'upload',
        secureUrl,
        folder
      ]
    );

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully to Cloudinary.',
      file: {
        id: fileId,
        file_name: req.file.originalname,
        mime_type: req.file.mimetype,
        file_size: req.file.size,
        file_type,
        access: isPrivateDocument ? 'authenticated' : 'owner'
      }
    });
  } catch (error) {
    console.error('Upload API error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to upload file. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get File Metadata by ID with Authorization Check
 */
const getFileById = async (req, res) => {
  try {
    const { id } = req.params;
    const files = await db.query('SELECT * FROM FILES WHERE id = ?', [id]);

    if (!files || files.length === 0) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }

    const file = files[0];
    const userRole = req.user.role;
    const userId = req.user.id;

    // Authorization check
    let authorized = false;
    if (file.owner_user_id === userId) {
      authorized = true;
    } else if (userRole === 'employer' && file.candidate_id) {
      authorized = await isEmployerAuthorizedForCandidateFile(userId, file.candidate_id, file.application_id);
    } else {
      authorized = await isInternalAuthorizedForFile(req.user, file);
    }

    if (!authorized) {
      return res.status(403).json({ success: false, message: 'Unauthorized file access.' });
    }

    // Do NOT expose Cloudinary API secrets
    delete file.cloudinary_asset_id;
    delete file.cloudinary_public_id;
    delete file.secure_url;
    delete file.folder;

    res.json({
      success: true,
      file
    });
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({ success: false, message: 'Error retrieving file metadata.' });
  }
};

/**
 * Download / Secure View Access with Signed Expiry URL
 */
const downloadFile = async (req, res) => {
  try {
    const { id } = req.params;
    const files = await db.query('SELECT * FROM FILES WHERE id = ?', [id]);

    if (!files || files.length === 0) {
      return res.status(404).json({ success: false, message: 'File record not found.' });
    }

    const file = files[0];
    const userRole = req.user.role;
    const userId = req.user.id;

    let authorized = false;
    if (file.owner_user_id === userId) {
      authorized = true;
    } else if (userRole === 'employer' && file.candidate_id) {
      authorized = await isEmployerAuthorizedForCandidateFile(userId, file.candidate_id, file.application_id);
    } else {
      authorized = await isInternalAuthorizedForFile(req.user, file);
    }

    if (!authorized) {
      return res.status(403).json({ success: false, message: 'Unauthorized file download access.' });
    }

    // Generate expiring signed URL for document delivery
    const signedUrl = generateSignedUrl(file.cloudinary_public_id, {
      resource_type: file.resource_type || 'raw',
      type: file.delivery_type || 'upload',
      expires_in: 3600 // 1 hour expiry
    });

    if (!signedUrl && (file.candidate_id || file.application_id || ['resume', 'document'].includes(file.file_type))) {
      return res.status(503).json({ success: false, message: 'Secure file delivery is temporarily unavailable.' });
    }

    res.json({
      success: true,
      download_url: signedUrl || file.secure_url,
      file_name: file.file_name,
      mime_type: file.mime_type
    });
  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({ success: false, message: 'Error accessing file download.' });
  }
};

/**
 * Delete File from Database & Cloudinary
 */
const deleteFile = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user && req.user.role === 'viewer') {
      return res.status(403).json({ success: false, message: 'Access denied: Viewer role cannot delete files.' });
    }

    const files = await db.query('SELECT * FROM FILES WHERE id = ?', [id]);
    if (!files || files.length === 0) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }

    const file = files[0];
    const userRole = req.user.role;
    const userId = req.user.id;

    let authorized = false;
    if (file.owner_user_id === userId) {
      authorized = true;
    } else if (userRole === 'director' || userRole === 'main_admin' || req.user.is_main_admin === 1) {
      authorized = true;
    }

    if (!authorized) {
      return res.status(403).json({ success: false, message: 'Unauthorized file deletion attempt.' });
    }

    // 1. Delete from Cloudinary
    await deleteFromCloudinary(file.cloudinary_public_id, { resource_type: file.resource_type });

    // 2. Delete database reference
    await db.query('DELETE FROM FILES WHERE id = ?', [id]);

    res.json({ success: true, message: 'File deleted successfully.' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ success: false, message: 'Error deleting file.' });
  }
};

module.exports = {
  uploadFile,
  getFileById,
  downloadFile,
  deleteFile,
  __test: {
    validateUploadAssociations,
    isInternalAuthorizedForFile
  }
};
