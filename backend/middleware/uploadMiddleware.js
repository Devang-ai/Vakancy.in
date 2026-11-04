const path = require('path');
const multer = require('multer');

const storage = multer.memoryStorage();

const PURPOSES = {
  resume: {
    maxSize: 2 * 1024 * 1024,
    types: ['pdf']
  },
  logo: {
    maxSize: 3 * 1024 * 1024,
    types: ['jpeg', 'png', 'webp']
  },
  profile_photo: {
    maxSize: 3 * 1024 * 1024,
    types: ['jpeg', 'png', 'webp']
  },
  attachment: {
    maxSize: 5 * 1024 * 1024,
    types: ['pdf', 'docx', 'jpeg', 'png', 'webp']
  }
};

const MIME_TO_TYPE = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp'
};

const EXTENSIONS = {
  pdf: ['.pdf'],
  docx: ['.docx'],
  jpeg: ['.jpg', '.jpeg'],
  png: ['.png'],
  webp: ['.webp']
};

const detectFileType = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  if (buffer.subarray(0, 5).toString('ascii') === '%PDF-') return 'pdf';
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg';
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
  if (buffer[0] === 0x50 && buffer[1] === 0x4b && [0x03, 0x05, 0x07].includes(buffer[2]) && [0x04, 0x06, 0x08].includes(buffer[3])) {
    const archiveText = buffer.toString('latin1');
    if (archiveText.includes('[Content_Types].xml') && archiveText.includes('word/')) return 'docx';
  }
  return null;
};

const createUpload = (purpose = 'attachment') => {
  const policy = PURPOSES[purpose];
  if (!policy) throw new Error(`Unknown upload purpose: ${purpose}`);

  return multer({
    storage,
    limits: { fileSize: policy.maxSize, files: 1, fields: 20, parts: 25 },
    fileFilter(req, file, cb) {
      const claimedType = MIME_TO_TYPE[String(file.mimetype || '').toLowerCase()];
      const extension = path.extname(file.originalname || '').toLowerCase();
      if (!claimedType || !policy.types.includes(claimedType) || !EXTENSIONS[claimedType].includes(extension)) {
        const error = new Error(`Invalid ${purpose} file type.`);
        error.status = 400;
        error.code = 'UNSUPPORTED_FILE_TYPE';
        return cb(error, false);
      }
      return cb(null, true);
    }
  });
};

const validateUploadedFile = (purpose = 'attachment') => {
  const policy = PURPOSES[purpose];
  if (!policy) throw new Error(`Unknown upload purpose: ${purpose}`);

  return (req, res, next) => {
    if (!req.file) {
      return res.status(400).json({ success: false, code: 'FILE_REQUIRED', message: 'A file is required.' });
    }

    const detectedType = detectFileType(req.file.buffer);
    const claimedType = MIME_TO_TYPE[String(req.file.mimetype || '').toLowerCase()];
    const extension = path.extname(req.file.originalname || '').toLowerCase();

    if (!detectedType || detectedType !== claimedType || !policy.types.includes(detectedType) || !EXTENSIONS[detectedType].includes(extension)) {
      return res.status(400).json({
        success: false,
        code: 'FILE_CONTENT_MISMATCH',
        message: 'The file content does not match an allowed file type.'
      });
    }

    if (detectedType === 'pdf') {
      const pdfText = req.file.buffer.toString('latin1');
      if (/\/(JavaScript|JS|OpenAction|Launch|EmbeddedFile)\b/i.test(pdfText)) {
        return res.status(400).json({
          success: false,
          code: 'UNSAFE_PDF_CONTENT',
          message: 'PDFs containing active or embedded content are not allowed.'
        });
      }
    }

    if (req.file.size > policy.maxSize) {
      return res.status(413).json({ success: false, code: 'FILE_TOO_LARGE', message: `The ${purpose} file is too large.` });
    }

    req.file.detectedType = detectedType;
    next();
  };
};

const defaultUpload = createUpload('attachment');
defaultUpload.forPurpose = createUpload;
defaultUpload.validate = validateUploadedFile;
defaultUpload.detectFileType = detectFileType;
defaultUpload.policies = PURPOSES;

module.exports = defaultUpload;
