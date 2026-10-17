const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

// Configure Cloudinary from environment variables
cloudinary.config({
  cloud_name: (process.env.CLOUDINARY_CLOUD_NAME || '').trim(),
  api_key: (process.env.CLOUDINARY_API_KEY || '').trim(),
  api_secret: (process.env.CLOUDINARY_API_SECRET || '').trim(),
  secure: true
});

/**
 * Check if real Cloudinary credentials are fully configured in environment
 */
const isCloudinaryConfigured = () => {
  const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || '').trim();
  const apiKey = (process.env.CLOUDINARY_API_KEY || '').trim();
  const apiSecret = (process.env.CLOUDINARY_API_SECRET || '').trim();

  const isPlaceholder = (val) => {
    if (!val) return true;
    const lower = val.toLowerCase();
    return (
      lower.includes('sample_') ||
      lower.includes('your_') ||
      lower.includes('placeholder') ||
      lower.includes('vakancy_cloud')
    );
  };

  return (
    cloudName.length > 0 &&
    apiKey.length > 0 &&
    apiSecret.length > 0 &&
    !isPlaceholder(cloudName) &&
    !isPlaceholder(apiKey) &&
    !isPlaceholder(apiSecret)
  );
};

/**
 * Upload buffer to Cloudinary
 * @param {Buffer} buffer - File buffer from multer memoryStorage
 * @param {Object} options - Upload options (folder, public_id, resource_type, type, format, mime_type)
 * @returns {Promise<Object>} Upload result from Cloudinary or local data-URL fallback
 */
const uploadBufferToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    if (!isCloudinaryConfigured()) {
      console.warn('⚠️ Cloudinary keys not configured in backend/.env or using sample placeholders. Using local media fallback.');
      
      const mockPublicId = `${options.folder || 'vakancy/uploads'}/${options.public_id || Date.now()}`;
      const mime = options.mime_type || 'image/png';
      
      // Generate inline data URL if buffer is an image for immediate local UI preview
      let fallbackUrl = `https://res.cloudinary.com/demo/image/upload/v1234567890/${mockPublicId}`;
      if (buffer && (options.resource_type === 'image' || mime.startsWith('image/'))) {
        fallbackUrl = `data:${mime};base64,${buffer.toString('base64')}`;
      }

      return resolve({
        asset_id: `fallback-asset-${Date.now()}`,
        public_id: mockPublicId,
        secure_url: fallbackUrl,
        resource_type: options.resource_type || 'auto',
        type: options.type || 'upload',
        format: options.format || 'png',
        bytes: buffer ? buffer.length : 0,
        is_fallback: true
      });
    }

    const defaultOptions = {
      resource_type: options.resource_type || 'auto',
      folder: options.folder || 'vakancy/general',
      overwrite: true,
      invalidate: true,
      ...options
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      defaultOptions,
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    if (buffer) {
      Readable.from(buffer).pipe(uploadStream);
    } else {
      reject(new Error('No file buffer provided for Cloudinary upload.'));
    }
  });
};

/**
 * Delete asset from Cloudinary
 * @param {string} publicId - Cloudinary public_id
 * @param {Object} options - Options (resource_type)
 */
const deleteFromCloudinary = async (publicId, options = {}) => {
  if (!publicId || !isCloudinaryConfigured()) return { result: 'ok_fallback' };
  try {
    const resourceType = options.resource_type || 'image';
    return await cloudinary.uploader.destroy(publicId, { resource_type: resourceType, invalidate: true });
  } catch (err) {
    console.error(`Error deleting Cloudinary asset ${publicId}:`, err.message);
    return null;
  }
};

/**
 * Generate secure signed URL for private/authenticated asset delivery
 * @param {string} publicId - Cloudinary public_id
 * @param {Object} options - Options (resource_type, type, expires_in)
 */
const generateSignedUrl = (publicId, options = {}) => {
  if (!publicId) return '';
  
  const resourceType = options.resource_type || 'raw';
  const type = options.type || 'upload';
  const expiresIn = options.expires_in || 3600; // 1 hour default

  if (!isCloudinaryConfigured()) {
    return `https://res.cloudinary.com/demo/${resourceType}/${type}/${publicId}`;
  }

  // Generate private signed URL with expiration
  return cloudinary.url(publicId, {
    resource_type: resourceType,
    type: type,
    sign_url: true,
    expires_at: Math.floor(Date.now() / 1000) + expiresIn
  });
};

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
  uploadBufferToCloudinary,
  deleteFromCloudinary,
  generateSignedUrl
};
