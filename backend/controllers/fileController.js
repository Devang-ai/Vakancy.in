const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
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

    // 3. Check if candidate is unlocked/shared via candidate unlock or pipeline share
    const unlocks = await db.query(
      'SELECT cu.id FROM CANDIDATE_UNLOCK cu JOIN EMPLOYER_SUBSCRIPTION es ON cu.subscription_id = es.id WHERE cu.candidate_id = ? AND es.employer_id = ?',
      [candidateId, employerId]
    );
    if (unlocks && unlocks.length > 0) return true;

    return false;
  } catch (err) {
    console.error('Error verifying employer candidate file access authorization:', err);
    return false;
  }
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

    // Upload buffer to Cloudinary
    const cloudinaryResult = await uploadBufferToCloudinary(req.file.buffer, {
      folder,
      public_id: safePublicId,
      resource_type: resourceType
    });

    const fileId = uuidv4();
    const secureUrl = cloudinaryResult.secure_url;
    const publicId = cloudinaryResult.public_id;
    const assetId = cloudinaryResult.asset_id || null;

    // Ensure FILES table exists before insertion
    await db.query(`
      CREATE TABLE IF NOT EXISTS \`FILES\` (
        \`id\` VARCHAR(36) PRIMARY KEY,
        \`owner_user_id\` VARCHAR(36) NOT NULL,
        \`candidate_id\` VARCHAR(36),
        \`employer_id\` VARCHAR(36),
        \`application_id\` VARCHAR(36),
        \`file_type\` VARCHAR(50) NOT NULL,
        \`file_name\` VARCHAR(255) NOT NULL,
        \`mime_type\` VARCHAR(100) NOT NULL,
        \`file_size\` INT NOT NULL,
        \`cloudinary_asset_id\` VARCHAR(255),
        \`cloudinary_public_id\` VARCHAR(255) NOT NULL,
        \`resource_type\` VARCHAR(50) DEFAULT 'auto',
        \`delivery_type\` VARCHAR(50) DEFAULT 'upload',
        \`secure_url\` TEXT NOT NULL,
        \`folder\` VARCHAR(255),
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

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
        secure_url: secureUrl,
        cloudinary_public_id: publicId
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
    if (userRole === 'admin' || userRole === 'main_admin' || userRole === 'recruiter' || userRole === 'hr_manager' || userRole === 'hr_executive') {
      authorized = true;
    } else if (file.owner_user_id === userId) {
      authorized = true;
    } else if (userRole === 'employer' && file.candidate_id) {
      authorized = await isEmployerAuthorizedForCandidateFile(userId, file.candidate_id, file.application_id);
    }

    if (!authorized) {
      return res.status(403).json({ success: false, message: 'Unauthorized file access.' });
    }

    // Do NOT expose Cloudinary API secrets
    delete file.cloudinary_asset_id;

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
    if (userRole === 'admin' || userRole === 'main_admin' || userRole === 'recruiter' || userRole === 'hr_manager' || userRole === 'hr_executive') {
      authorized = true;
    } else if (file.owner_user_id === userId) {
      authorized = true;
    } else if (userRole === 'employer' && file.candidate_id) {
      authorized = await isEmployerAuthorizedForCandidateFile(userId, file.candidate_id, file.application_id);
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
    if (userRole === 'admin' || userRole === 'main_admin' || userRole === 'recruiter' || userRole === 'hr_manager') {
      authorized = true;
    } else if (file.owner_user_id === userId) {
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
  deleteFile
};
