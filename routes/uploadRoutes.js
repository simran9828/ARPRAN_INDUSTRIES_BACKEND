import express from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { requireAdmin, logActivity } from '../auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Ensure upload directory exists inside backend/uploads so it is statically accessible immediately
const uploadDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage configuration with sanitized unique filenames
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path.basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-');
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E6)}`;
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  }
});

// File filter validation
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    // Images
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: JPG, PNG, WEBP, SVG, PDF, DOC, DOCX`));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB limit
  fileFilter
});

// Upload Single File Endpoint
router.post('/upload', requireAdmin, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const publicUrl = `/uploads/${req.file.filename}`;
    const fileType = req.file.mimetype.startsWith('image/') ? 'image' : 'document';

    logActivity(
      req.admin.email, 
      'UPLOAD_FILE', 
      `Uploaded ${fileType}: ${req.file.originalname} -> ${publicUrl}`, 
      req
    );

    return res.json({
      success: true,
      url: publicUrl,
      fileName: req.file.originalname,
      storedName: req.file.filename,
      size: req.file.size,
      mimeType: req.file.mimetype,
      fileType
    });
  });
});

export default router;
