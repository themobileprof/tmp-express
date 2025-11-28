const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, getRow, getRows } = require('../database/config');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authenticateToken, authorizeOwnerOrAdmin } = require('../middleware/auth');

// Admin middleware - ensure user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    throw new AppError('Admin access required', 403, 'Forbidden');
  }
  next();
};
const certificateGenerator = require('../utils/certificateGenerator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Configure multer for template image uploads
const templateUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(process.env.UPLOAD_PATH || './uploads', 'certificate-templates');
      require('fs').mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueName = `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    }
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Validation middleware
const validateTemplate = [
  body('name').trim().isLength({ min: 1 }).withMessage('Template name is required'),
  body('isDefault').optional().isBoolean().withMessage('isDefault must be a boolean')
];

// Get all active templates
router.get('/templates', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const templates = await getRows(
    'SELECT * FROM certificate_templates WHERE is_active = true ORDER BY is_default DESC, created_at DESC'
  );

  res.json({
    templates: templates.map(template => ({
      id: template.id,
      name: template.name,
      imagePath: template.image_path,
      imageUrl: template.image_path,
      isDefault: template.is_default,
      isActive: template.is_active,
      createdAt: template.created_at,
      updatedAt: template.updated_at
    }))
  });
}));

// Get template by ID
router.get('/templates/:id', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const template = await getRow('SELECT * FROM certificate_templates WHERE id = $1', [id]);

  if (!template) {
    throw new AppError('Template not found', 404, 'Template Not Found');
  }

  res.json({
    template: {
      id: template.id,
      name: template.name,
      imagePath: template.image_path,
      imageUrl: template.image_path,
      isDefault: template.is_default,
      isActive: template.is_active,
      createdAt: template.created_at,
      updatedAt: template.updated_at
    }
  });
}));

// Upload new template image
router.post('/upload-template', authenticateToken, requireAdmin, templateUpload.single('templateImage'), validateTemplate, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorDetails = errors.array().reduce((acc, error) => {
      acc[error.path] = error.msg;
      return acc;
    }, {});
    const validationError = new AppError('Validation failed', 400, 'VALIDATION_ERROR');
    validationError.details = errorDetails;
    throw validationError;
  }

  if (!req.file) {
    throw new AppError('Template image is required', 400, 'Template Image Required');
  }

  const { name, isDefault = false } = req.body;
  const imagePath = `/uploads/certificate-templates/${req.file.filename}`;

  // If setting as default, unset other defaults
  if (isDefault) {
    await query('UPDATE certificate_templates SET is_default = false WHERE is_default = true');
  }

  // Insert new template
  const result = await query(
    `INSERT INTO certificate_templates (name, image_path, is_default, is_active)
     VALUES ($1, $2, $3, true)
     RETURNING *`,
    [name, imagePath, isDefault]
  );

  const template = result.rows[0];

  res.status(201).json({
    template: {
      id: template.id,
      name: template.name,
      imagePath: template.image_path,
      imageUrl: template.image_path,
      isDefault: template.is_default,
      isActive: template.is_active,
      createdAt: template.created_at
    }
  });
}));

// Update template
router.put('/templates/:id', authenticateToken, requireAdmin, validateTemplate, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorDetails = errors.array().reduce((acc, error) => {
      acc[error.path] = error.msg;
      return acc;
    }, {});
    const validationError = new AppError('Validation failed', 400, 'VALIDATION_ERROR');
    validationError.details = errorDetails;
    throw validationError;
  }

  const { id } = req.params;
  const { name, isDefault } = req.body;

  // Check if template exists
  const existingTemplate = await getRow('SELECT * FROM certificate_templates WHERE id = $1', [id]);
  if (!existingTemplate) {
    throw new AppError('Template not found', 404, 'Template Not Found');
  }

  // If setting as default, unset other defaults
  if (isDefault) {
    await query('UPDATE certificate_templates SET is_default = false WHERE is_default = true AND id != $1', [id]);
  }

  // Update template
  const updateFields = [];
  const updateValues = [];
  let paramIndex = 1;

  if (name !== undefined) {
    updateFields.push(`name = $${paramIndex++}`);
    updateValues.push(name);
  }
  if (isDefault !== undefined) {
    updateFields.push(`is_default = $${paramIndex++}`);
    updateValues.push(isDefault);
  }

  updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

  const updateQuery = `UPDATE certificate_templates SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
  updateValues.push(id);

  const result = await query(updateQuery, updateValues);
  const updatedTemplate = result.rows[0];

  res.json({
    template: {
      id: updatedTemplate.id,
      name: updatedTemplate.name,
      imagePath: updatedTemplate.image_path,
      imageUrl: updatedTemplate.image_path,
      isDefault: updatedTemplate.is_default,
      isActive: updatedTemplate.is_active,
      updatedAt: updatedTemplate.updated_at
    }
  });
}));

// Delete template
router.delete('/templates/:id', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if template exists
  const template = await getRow('SELECT * FROM certificate_templates WHERE id = $1', [id]);
  if (!template) {
    throw new AppError('Template not found', 404, 'Template Not Found');
  }

  if (template.is_default) {
    throw new AppError('Cannot delete default template', 400, 'Cannot Delete Default Template');
  }

  // Check if template is used by any certificates
  const usageCount = await getRow('SELECT COUNT(*) as count FROM certifications WHERE template_id = $1', [id]);
  if (usageCount.count > 0) {
    throw new AppError('Cannot delete template that is being used by certificates', 400, 'Template In Use');
  }

  // Delete the image file
  try {
    const imagePath = path.resolve(template.image_path.replace('/uploads/', './uploads/'));
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  } catch (error) {
    console.warn('Could not delete template image file:', error.message);
  }

  // Delete from database
  await query('DELETE FROM certificate_templates WHERE id = $1', [id]);

  res.json({
    message: 'Template deleted successfully'
  });
}));

// Preview template (generate sample certificate)
router.post('/templates/:id/preview', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { sampleData } = req.body;

  const template = await getRow('SELECT * FROM certificate_templates WHERE id = $1 AND is_active = true', [id]);
  if (!template) {
    throw new AppError('Template not found', 404, 'Template Not Found');
  }

  // Use sample data or defaults
  const previewData = {
    userName: sampleData?.userName || 'John Doe',
    courseTitle: sampleData?.courseTitle || 'Sample Course',
    instructorName: sampleData?.instructorName || 'Jane Smith',
    completionDate: sampleData?.completionDate || new Date().toISOString(),
    verificationCode: 'CERTPREVIEW'
  };

  const templateImagePath = path.resolve(template.image_path.replace('/uploads/', './uploads/'));
  const certificateFile = await certificateGenerator.generateCourseCertificate({
    ...previewData,
    templateImagePath
  });

  res.json({
    previewUrl: certificateFile.certificateUrl,
    fileName: certificateFile.fileName,
    fileSize: certificateFile.fileSize
  });
}));

// Get default template
router.get('/default-template', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const template = await getRow(
    'SELECT * FROM certificate_templates WHERE is_default = true AND is_active = true LIMIT 1'
  );

  if (!template) {
    return res.json({ template: null });
  }

  res.json({
    template: {
      id: template.id,
      name: template.name,
      imagePath: template.image_path,
      imageUrl: template.image_path,
      isDefault: template.is_default,
      isActive: template.is_active,
      createdAt: template.created_at,
      updatedAt: template.updated_at
    }
  });
}));

module.exports = router;