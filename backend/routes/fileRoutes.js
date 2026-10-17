const express = require('express');
const router = express.Router();
const {
  uploadFile,
  getFileById,
  downloadFile,
  deleteFile
} = require('../controllers/fileController');
const { authenticateToken } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post('/upload', authenticateToken, upload.single('file'), uploadFile);
router.get('/:id', authenticateToken, getFileById);
router.get('/:id/download', authenticateToken, downloadFile);
router.delete('/:id', authenticateToken, deleteFile);

module.exports = router;
