const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, getRow, getRows } = require('../database/config');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authenticateToken, authorizeInstructor, authorizeOwnerOrAdmin } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Validation middleware
const validateCertification = [
  body('userId').isUUID().withMessage('Valid user ID is required'),
  body('certificationName').trim().isLength({ min: 1 }).withMessage('Certification name is required'),
  body('issuer').trim().isLength({ min: 1 }).withMessage('Issuer is required'),
  body('issuedDate').isISO8601().withMessage('Valid issued date is required'),
  body('expiryDate').optional().isISO8601().withMessage('Valid expiry date is required'),
  body('courseId').optional().isUUID().withMessage('Valid course ID is required'),
  body('classId').optional().isUUID().withMessage('Valid class ID is required'),
  body('certificateUrl').optional().isURL().withMessage('Certificate URL must be a valid URL')
];

// Generate unique verification code
const generateVerificationCode = async () => {
  let code;
  let isUnique = false;
  
  while (!isUnique) {
    code = 'CERT' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const existing = await getRow('SELECT id FROM certifications WHERE verification_code = $1', [code]);
    isUnique = !existing;
  }
  
  return code;
};

// Get all certifications
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const { userId, courseId, classId, status, limit = 20, offset = 0 } = req.query;

  let whereClause = 'WHERE 1=1';
  let params = [];
  let paramIndex = 1;

  if (userId) {
    whereClause += ` AND cert.user_id = $${paramIndex}`;
    params.push(userId);
    paramIndex++;
  }

  if (courseId) {
    whereClause += ` AND cert.course_id = $${paramIndex}`;
    params.push(courseId);
    paramIndex++;
  }

  if (classId) {
    whereClause += ` AND cert.class_id = $${paramIndex}`;
    params.push(classId);
    paramIndex++;
  }

  if (status) {
    whereClause += ` AND cert.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  const certifications = await getRows(
    `SELECT cert.*, u.first_name, u.last_name, u.email,
            c.title as course_title, cl.title as class_title
     FROM certifications cert
     JOIN users u ON cert.user_id = u.id
     LEFT JOIN courses c ON cert.course_id = c.id
     LEFT JOIN classes cl ON cert.class_id = cl.id
     ${whereClause}
     ORDER BY cert.issued_date DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, parseInt(limit), parseInt(offset)]
  );

  res.json({
    certifications: certifications.map(c => ({
      id: c.id,
      userId: c.user_id,
      userName: `${c.first_name} ${c.last_name}`,
      userEmail: c.email,
      certificationName: c.certification_name,
      issuer: c.issuer,
      issuedDate: c.issued_date,
      expiryDate: c.expiry_date,
      certificateUrl: c.certificate_url,
      verificationCode: c.verification_code,
      status: c.status,
      courseId: c.course_id,
      courseTitle: c.course_title,
      classId: c.class_id,
      classTitle: c.class_title,
      createdAt: c.created_at
    }))
  });
}));

// Create new certification
router.post('/', authenticateToken, authorizeInstructor, validateCertification, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }

  const {
    userId, certificationName, issuer, issuedDate, expiryDate, courseId, classId, certificateUrl
  } = req.body;

  // Verify user exists
  const user = await getRow('SELECT * FROM users WHERE id = $1', [userId]);
  if (!user) {
    throw new AppError('User not found', 404, 'User Not Found');
  }

  // Verify course/class exists if provided
  if (courseId) {
    const course = await getRow('SELECT * FROM courses WHERE id = $1', [courseId]);
    if (!course) {
      throw new AppError('Course not found', 404, 'Course Not Found');
    }
  }

  if (classId) {
    const classData = await getRow('SELECT * FROM classes WHERE id = $1', [classId]);
    if (!classData) {
      throw new AppError('Class not found', 404, 'Class Not Found');
    }
  }

  // Generate verification code
  const verificationCode = await generateVerificationCode();

  // Create certification
  const result = await query(
    `INSERT INTO certifications (
      user_id, course_id, class_id, certification_name, issuer, issued_date,
      expiry_date, certificate_url, verification_code
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [userId, courseId, classId, certificationName, issuer, issuedDate, expiryDate, certificateUrl, verificationCode]
  );

  const certification = result.rows[0];

  res.status(201).json({
    id: certification.id,
    userId: certification.user_id,
    courseId: certification.course_id,
    classId: certification.class_id,
    certificationName: certification.certification_name,
    issuer: certification.issuer,
    issuedDate: certification.issued_date,
    expiryDate: certification.expiry_date,
    certificateUrl: certification.certificate_url,
    verificationCode: certification.verification_code,
    status: certification.status,
    createdAt: certification.created_at
  });
}));

// Get certification by ID
router.get('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const certification = await getRow(
    `SELECT cert.*, u.first_name, u.last_name, u.email,
            c.title as course_title, cl.title as class_title
     FROM certifications cert
     JOIN users u ON cert.user_id = u.id
     LEFT JOIN courses c ON cert.course_id = c.id
     LEFT JOIN classes cl ON cert.class_id = cl.id
     WHERE cert.id = $1`,
    [id]
  );

  if (!certification) {
    throw new AppError('Certification not found', 404, 'Certification Not Found');
  }

  res.json({
    id: certification.id,
    userId: certification.user_id,
    userName: `${certification.first_name} ${certification.last_name}`,
    userEmail: certification.email,
    certificationName: certification.certification_name,
    issuer: certification.issuer,
    issuedDate: certification.issued_date,
    expiryDate: certification.expiry_date,
    certificateUrl: certification.certificate_url,
    verificationCode: certification.verification_code,
    status: certification.status,
    courseId: certification.course_id,
    courseTitle: certification.course_title,
    classId: certification.class_id,
    classTitle: certification.class_title,
    createdAt: certification.created_at
  });
}));

// Update certification
router.put('/:id', authenticateToken, authorizeOwnerOrAdmin('certifications', 'id'), validateCertification, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }

  const { id } = req.params;
  const {
    certificationName, issuer, issuedDate, expiryDate, certificateUrl, status
  } = req.body;

  // Verify certification exists
  const certification = await getRow('SELECT * FROM certifications WHERE id = $1', [id]);
  if (!certification) {
    throw new AppError('Certification not found', 404, 'Certification Not Found');
  }

  // Update certification
  const result = await query(
    `UPDATE certifications 
     SET certification_name = COALESCE($1, certification_name),
         issuer = COALESCE($2, issuer),
         issued_date = COALESCE($3, issued_date),
         expiry_date = COALESCE($4, expiry_date),
         certificate_url = COALESCE($5, certificate_url),
         status = COALESCE($6, status)
     WHERE id = $7
     RETURNING *`,
    [certificationName, issuer, issuedDate, expiryDate, certificateUrl, status, id]
  );

  const updatedCertification = result.rows[0];

  res.json({
    id: updatedCertification.id,
    certificationName: updatedCertification.certification_name,
    issuer: updatedCertification.issuer,
    issuedDate: updatedCertification.issued_date,
    expiryDate: updatedCertification.expiry_date,
    certificateUrl: updatedCertification.certificate_url,
    status: updatedCertification.status
  });
}));

// Delete certification
router.delete('/:id', authenticateToken, authorizeOwnerOrAdmin('certifications', 'id'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Verify certification exists
  const certification = await getRow('SELECT * FROM certifications WHERE id = $1', [id]);
  if (!certification) {
    throw new AppError('Certification not found', 404, 'Certification Not Found');
  }

  await query('DELETE FROM certifications WHERE id = $1', [id]);

  res.json({
    message: 'Certification deleted successfully'
  });
}));

// Verify certification by code
router.get('/verify/:code', asyncHandler(async (req, res) => {
  const { code } = req.params;

  const certification = await getRow(
    `SELECT cert.*, u.first_name, u.last_name,
            c.title as course_title, cl.title as class_title
     FROM certifications cert
     JOIN users u ON cert.user_id = u.id
     LEFT JOIN courses c ON cert.course_id = c.id
     LEFT JOIN classes cl ON cert.class_id = cl.id
     WHERE cert.verification_code = $1`,
    [code]
  );

  if (!certification) {
    return res.json({
      valid: false,
      message: 'Certification not found'
    });
  }

  // Check if certification is expired
  const isExpired = certification.expiry_date && new Date() > new Date(certification.expiry_date);

  res.json({
    valid: !isExpired && certification.status === 'issued',
    certification: {
      id: certification.id,
      userName: `${certification.first_name} ${certification.last_name}`,
      certificationName: certification.certification_name,
      issuer: certification.issuer,
      issuedDate: certification.issued_date,
      expiryDate: certification.expiry_date,
      status: certification.status,
      courseTitle: certification.course_title,
      classTitle: certification.class_title,
      isExpired
    }
  });
}));

module.exports = router; 