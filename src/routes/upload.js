const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

// Ensure upload directories exist
const uploadPath = process.env.UPLOAD_PATH || './uploads';
const uploadDirs = {
  screenshots: path.join(uploadPath, 'screenshots'),
  courseImages: path.join(uploadPath, 'course-images'),
  lessonMaterials: path.join(uploadPath, 'lesson-materials'),
  userAvatars: path.join(uploadPath, 'user-avatars'),
  certificates: path.join(uploadPath, 'certificates')
};

// Create directories if they don't exist
Object.values(uploadDirs).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// File type validation
const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const allowedDocumentTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg'];

// File size limits (in bytes)
const maxFileSizes = {
  image: 5 * 1024 * 1024, // 5MB
  document: 10 * 1024 * 1024, // 10MB
  video: 500 * 1024 * 1024 // 500MB
};

// Multer configuration for different upload types
const createMulterConfig = (allowedTypes, maxSize, subfolder) => {
  return multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, uploadDirs[subfolder]);
      },
      filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
      }
    }),
    fileFilter: (req, file, cb) => {
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new AppError(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`, 400, 'INVALID_FILE_TYPE'), false);
      }
    },
    limits: {
      fileSize: maxSize
    }
  });
};

// Multer instances
const imageUpload = createMulterConfig(allowedImageTypes, maxFileSizes.image, 'screenshots');
const courseImageUpload = createMulterConfig(allowedImageTypes, maxFileSizes.image, 'courseImages');
const lessonMaterialUpload = createMulterConfig([...allowedImageTypes, ...allowedDocumentTypes, ...allowedVideoTypes], maxFileSizes.document, 'lessonMaterials');
const avatarUpload = createMulterConfig(allowedImageTypes, maxFileSizes.image, 'userAvatars');
const certificateUpload = createMulterConfig([...allowedImageTypes, ...allowedDocumentTypes], maxFileSizes.document, 'certificates');

// Helper function to build file URL
const buildFileUrl = (filename, subfolder) => {
  const baseUrl = process.env.API_BASE_URL || 'https://api.themobileprof.com';
  return `${baseUrl}/uploads/${subfolder}/${filename}`;
};

// POST /api/upload - Upload screenshots/images
router.post('/', authenticateToken, imageUpload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('No file uploaded', 400, 'NO_FILE');
  }

  const fileUrl = buildFileUrl(req.file.filename, 'screenshots');

  res.status(200).json({
    success: true,
    message: 'File uploaded successfully',
    data: {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      url: fileUrl
    }
  });
}));

// POST /uploads/course-image - Upload course image
router.post('/course-image', authenticateToken, courseImageUpload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('No image file uploaded', 400, 'NO_FILE');
  }

  const imageUrl = buildFileUrl(req.file.filename, 'course-images');

  res.status(200).json({
    success: true,
    message: 'Course image uploaded successfully',
    data: {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      imageUrl: imageUrl
    }
  });
}));

// POST /uploads/lesson-material - Upload lesson material
router.post('/lesson-material', authenticateToken, lessonMaterialUpload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('No file uploaded', 400, 'NO_FILE');
  }

  const fileUrl = buildFileUrl(req.file.filename, 'lesson-materials');

  res.status(200).json({
    success: true,
    message: 'Lesson material uploaded successfully',
    data: {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      fileUrl: fileUrl
    }
  });
}));

// POST /uploads/avatar - Upload user avatar
router.post('/avatar', authenticateToken, avatarUpload.single('avatar'), asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('No avatar file uploaded', 400, 'NO_FILE');
  }

  const avatarUrl = buildFileUrl(req.file.filename, 'user-avatars');

  res.status(200).json({
    success: true,
    message: 'Avatar uploaded successfully',
    data: {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      avatarUrl: avatarUrl
    }
  });
}));

// POST /uploads/certificate - Upload certificate
router.post('/certificate', authenticateToken, certificateUpload.single('certificate'), asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('No certificate file uploaded', 400, 'NO_FILE');
  }

  const certificateUrl = buildFileUrl(req.file.filename, 'certificates');

  res.status(200).json({
    success: true,
    message: 'Certificate uploaded successfully',
    data: {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      certificateUrl: certificateUrl
    }
  });
}));

// DELETE /api/upload/:filename - Delete uploaded file
router.delete('/:filename', authenticateToken, asyncHandler(async (req, res) => {
  const { filename } = req.params;
  const { type } = req.query; // screenshots, course-images, lesson-materials, user-avatars, certificates

  if (!type || !uploadDirs[type]) {
    throw new AppError('Invalid file type specified', 400, 'INVALID_FILE_TYPE');
  }

  const filePath = path.join(uploadDirs[type], filename);

  if (!fs.existsSync(filePath)) {
    throw new AppError('File not found', 404, 'FILE_NOT_FOUND');
  }

  // Only allow users to delete their own files or admins to delete any file
  // This is a basic check - you might want to store file ownership in the database
  if (req.user.role !== 'admin') {
    // For now, we'll allow deletion but you might want to add ownership checks
    console.log(`User ${req.user.id} deleting file: ${filename}`);
  }

  fs.unlinkSync(filePath);

  res.status(200).json({
    success: true,
    message: 'File deleted successfully'
  });
}));

// GET /api/upload/files - List uploaded files (admin only)
router.get('/files', authenticateToken, asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new AppError('Access denied. Admin only.', 403, 'ACCESS_DENIED');
  }

  const { type } = req.query;
  const files = [];

  if (type && uploadDirs[type]) {
    // List files of specific type
    const dirPath = uploadDirs[type];
    if (fs.existsSync(dirPath)) {
      const fileList = fs.readdirSync(dirPath);
      files.push(...fileList.map(filename => ({
        filename,
        type,
        url: buildFileUrl(filename, type),
        path: path.join(dirPath, filename)
      })));
    }
  } else {
    // List all files from all directories
    Object.entries(uploadDirs).forEach(([type, dirPath]) => {
      if (fs.existsSync(dirPath)) {
        const fileList = fs.readdirSync(dirPath);
        files.push(...fileList.map(filename => ({
          filename,
          type,
          url: buildFileUrl(filename, type),
          path: path.join(dirPath, filename)
        })));
      }
    });
  }

  res.status(200).json({
    success: true,
    data: {
      files,
      total: files.length
    }
  });
}));

module.exports = router; 