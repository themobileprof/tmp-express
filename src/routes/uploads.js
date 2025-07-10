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
const uploadPath = (process.env.UPLOAD_PATH || './uploads').trim();
console.log('📁 Upload path:', uploadPath);

const uploadDirs = {
  screenshots: path.resolve(uploadPath, 'screenshots'),
  courseImages: path.resolve(uploadPath, 'course-images'),
  lessonMaterials: path.resolve(uploadPath, 'lesson-materials'),
  userAvatars: path.resolve(uploadPath, 'user-avatars'),
  certificates: path.resolve(uploadPath, 'certificates')
};

console.log('📁 Upload directories:', uploadDirs);

// Ensure main upload directory exists
if (!fs.existsSync(uploadPath)) {
  console.log(`📁 Creating main upload directory: ${uploadPath}`);
  fs.mkdirSync(uploadPath, { recursive: true });
  console.log(`✅ Created main upload directory: ${uploadPath}`);
} else {
  console.log(`✅ Main upload directory already exists: ${uploadPath}`);
}

// Create subdirectories if they don't exist
Object.entries(uploadDirs).forEach(([key, dir]) => {
  console.log(`📁 Creating directory for ${key}: ${dir}`);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  } else {
    console.log(`✅ Directory already exists: ${dir}`);
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
  console.log(`🔧 Creating multer config for ${subfolder}:`, uploadDirs[subfolder]);
  
  return multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        const dest = uploadDirs[subfolder];
        console.log(`📁 Multer destination for ${subfolder}:`, dest);
        cb(null, dest);
      },
      filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
        console.log(`📄 Generated filename:`, uniqueName);
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
  const url = `${baseUrl}/uploads/${subfolder}/${filename}`;
  console.log('🔗 Building URL:', { filename, subfolder, baseUrl, url });
  return url;
};

// POST /api/upload - Upload screenshots/images
router.post('/', authenticateToken, imageUpload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('No file uploaded', 400, 'NO_FILE');
  }

  console.log('📁 File uploaded:', {
    filename: req.file.filename,
    originalName: req.file.originalname,
    destination: req.file.destination,
    path: req.file.path,
    size: req.file.size
  });

  const fileUrl = buildFileUrl(req.file.filename, 'screenshots');
  console.log('🔗 Generated URL:', fileUrl);

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

// GET /api/upload/debug - Debug upload directories (admin only)
router.get('/debug', authenticateToken, asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new AppError('Access denied. Admin only.', 403, 'ACCESS_DENIED');
  }

  const debugInfo = {
    uploadPath,
    uploadDirs,
    env: {
      UPLOAD_PATH: process.env.UPLOAD_PATH,
      API_BASE_URL: process.env.API_BASE_URL
    },
    directories: {}
  };

  // Check each directory
  Object.entries(uploadDirs).forEach(([key, dir]) => {
    const exists = fs.existsSync(dir);
    const isDir = exists ? fs.statSync(dir).isDirectory() : false;
    const files = exists && isDir ? fs.readdirSync(dir) : [];
    
    debugInfo.directories[key] = {
      path: dir,
      exists,
      isDirectory: isDir,
      fileCount: files.length,
      files: files.slice(0, 10) // Show first 10 files
    };
  });

  res.status(200).json({
    success: true,
    data: debugInfo
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