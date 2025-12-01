const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, getRow, getRows } = require('../database/config');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authenticateToken, authorizeInstructor, authorizeOwnerOrAdmin } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const certificateService = require('../utils/certificateService');

// Admin middleware - ensure user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    throw new AppError('Admin access required', 403, 'Forbidden');
  }
  next();
};

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
router.post('/', authenticateToken, requireAdmin, validateCertification, asyncHandler(async (req, res) => {
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

  // Format completion date
  const completionDateObj = new Date(certification.issued_date);
  const formattedDate = completionDateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Return data in format expected by certificate-viewer.html
  res.json({
    id: certification.id,
    type: 'course_completion',
    data: {
      userName: `${certification.first_name} ${certification.last_name}`,
      courseTitle: certification.course_title || 'Course',
      classTitle: certification.class_title,
      completionDate: formattedDate,
      verificationCode: certification.verification_code,
      templateImageUrl: certification.certificate_url // May be null for generated certificates
    },
    verificationUrl: `/api/certifications/verify/${certification.verification_code}`,
    issuedAt: certification.issued_date,
    // Include additional metadata for compatibility
    userId: certification.user_id,
    userEmail: certification.email,
    certificationName: certification.certification_name,
    issuer: certification.issuer,
    expiryDate: certification.expiry_date,
    status: certification.status,
    courseId: certification.course_id,
    classId: certification.class_id,
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

// Current user's certifications (alias)
router.get('/my', authenticateToken, asyncHandler(async (req, res) => {
	const userId = req.user.id;
	const certifications = await getRows(
		`SELECT cert.*, co.title as course_title, cl.title as class_title
		 FROM certifications cert
		 LEFT JOIN courses co ON cert.course_id = co.id
		 LEFT JOIN classes cl ON cert.class_id = cl.id
		 WHERE cert.user_id = $1
		 ORDER BY cert.issued_date DESC`,
		[userId]
	);
	res.json({
		certifications: certifications.map(c => ({
			id: c.id,
			title: c.certification_name,
			issuer: c.issuer,
			dateEarned: c.issued_date,
			validUntil: c.expiry_date,
			credentialId: c.verification_code,
			skills: c.skills || null,
			certificateUrl: c.certificate_url,
			course: c.course_id ? { id: c.course_id, title: c.course_title } : null,
			class: c.class_id ? { id: c.class_id, title: c.class_title } : null
		}))
	});
}));

// Download certificate (return file or signed URL)
router.get('/:id/download', authenticateToken, asyncHandler(async (req, res) => {
	const { id } = req.params;
	const userId = req.user.id;

	const cert = await getRow('SELECT * FROM certifications WHERE id = $1', [id]);
	if (!cert) {
		throw new AppError('Certificate not found', 404, 'Certificate Not Found');
	}

	// Authorization: owner or admin
	if (cert.user_id !== userId && req.user.role !== 'admin') {
		throw new AppError('Access denied', 403, 'Access Denied');
	}

	// For now, return the stored URL; future: sign if using cloud storage
	if (cert.certificate_url) {
		return res.json({ url: cert.certificate_url });
	}

	throw new AppError('Certificate file not available', 404, 'File Not Found');
}));

// View certificate page (client-side HTML5 Canvas rendering)
router.get('/:id/view', authenticateToken, asyncHandler(async (req, res) => {
	const { id } = req.params;
	const userId = req.user.id;

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
		throw new AppError('Certificate not found', 404, 'Certificate Not Found');
	}

	// Authorization: owner or admin
	if (certification.user_id !== userId && req.user.role !== 'admin') {
		throw new AppError('Access denied', 403, 'Access Denied');
	}

	// Read the HTML template
	const fs = require('fs');
	const path = require('path');
	const templatePath = path.join(__dirname, '../../docs/certificate-viewer.html');

	if (!fs.existsSync(templatePath)) {
		throw new AppError('Certificate viewer not found', 500, 'Viewer Not Found');
	}

	let html = fs.readFileSync(templatePath, 'utf8');

	res.setHeader('Content-Type', 'text/html');
	res.send(html);
}));

// In-progress certification programs (student-facing)
router.get('/progress', authenticateToken, asyncHandler(async (req, res) => {
	const userId = req.user.id;

	const enrollments = await getRows(
		`SELECT e.id as enrollment_id, e.status, e.progress, e.enrolled_at, e.completed_at,
		        p.id as program_id, p.title, p.level, p.duration
		 FROM certification_program_enrollments e
		 JOIN certification_programs p ON e.program_id = p.id
		 WHERE e.user_id = $1
		 ORDER BY e.enrolled_at DESC`,
		[userId]
	);

	const results = [];
	for (const e of enrollments) {
		const totalModulesRow = await getRow('SELECT COUNT(*)::int as count FROM certification_program_modules WHERE program_id = $1', [e.program_id]);
		const completedModulesRow = await getRow(
			`SELECT COUNT(*)::int as count
			 FROM certification_program_progress pr
			 JOIN certification_program_modules m ON pr.module_id = m.id
			 WHERE pr.enrollment_id = $1 AND pr.is_completed = true`,
			[e.enrollment_id]
		);

		const total = totalModulesRow?.count || 0;
		const completed = completedModulesRow?.count || 0;
		let nextRequirement = null;
		if (total > completed) {
			const nextModule = await getRow(
				`SELECT m.title
				 FROM certification_program_modules m
				 WHERE m.program_id = $1 AND NOT EXISTS (
					 SELECT 1 FROM certification_program_progress pr WHERE pr.module_id = m.id AND pr.enrollment_id = $2 AND pr.is_completed = true
				 )
				 ORDER BY m.order_index ASC
				 LIMIT 1`,
				[e.program_id, e.enrollment_id]
			);
			nextRequirement = nextModule?.title || null;
		}

		results.push({
			programId: e.program_id,
			title: e.title,
			level: e.level,
			duration: e.duration,
			progress: total ? Math.round((completed / total) * 100) : 0,
			nextRequirement,
			estimatedCompletion: null,
			totals: { totalModules: total, completedModules: completed }
		});
	}

	res.json({ programs: results });
}));

// Get certificate statistics (admin only)
router.get('/stats', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const stats = await certificateService.getCertificateStats();
  res.json({
    success: true,
    data: stats
  });
}));

// Manually award certificate (admin only)
router.post('/award', authenticateToken, requireAdmin, [
  body('userId').isUUID().withMessage('Valid user ID is required'),
  body('courseId').optional().isUUID().withMessage('Valid course ID is required'),
  body('classId').optional().isUUID().withMessage('Valid class ID is required'),
  body('certificationName').trim().isLength({ min: 1 }).withMessage('Certification name is required'),
  body('issuer').optional().trim().isLength({ min: 1 }).withMessage('Issuer must be a non-empty string if provided'),
  body('issuedDate').optional().isISO8601().withMessage('Valid issued date is required'),
  body('expiryDate').optional().isISO8601().withMessage('Valid expiry date is required'),
  body('certificateUrl').optional().isURL().withMessage('Certificate URL must be a valid URL')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }

  const certificateData = req.body;
  const result = await certificateService.manuallyAwardCertificate(certificateData);

  res.status(201).json({
    success: true,
    data: result,
    message: 'Certificate awarded successfully'
  });
}));

// Check certificate eligibility for a user and course/class
router.get('/eligibility/:userId', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { courseId, classId } = req.query;

  if (!courseId && !classId) {
    throw new AppError('Either courseId or classId must be provided', 400, 'Missing Parameter');
  }

  let result = null;

  if (courseId) {
    result = await certificateService.checkAndAwardCourseCertificate(userId, courseId);
  } else if (classId) {
    result = await certificateService.checkAndAwardClassCertificate(userId, classId);
  }

  if (result) {
    res.json({
      success: true,
      eligible: true,
      certificate: result,
      message: 'Certificate awarded successfully'
    });
  } else {
    res.json({
      success: true,
      eligible: false,
      message: 'User is not eligible for certificate or already has one'
    });
  }
}));

// Bulk certificate operations (admin only)
router.post('/bulk-award', authenticateToken, requireAdmin, [
  body('certificates').isArray({ min: 1 }).withMessage('Certificates array is required'),
  body('certificates.*.userId').isUUID().withMessage('Valid user ID is required for each certificate'),
  body('certificates.*.certificationName').trim().isLength({ min: 1 }).withMessage('Certification name is required for each certificate')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }

  const { certificates } = req.body;
  const results = [];
  const processingErrors = [];

  for (const certData of certificates) {
    try {
      const result = await certificateService.manuallyAwardCertificate(certData);
      results.push({
        userId: certData.userId,
        certificationName: certData.certificationName,
        certificateId: result.certificateId,
        verificationCode: result.verificationCode
      });
    } catch (error) {
      processingErrors.push({
        userId: certData.userId,
        certificationName: certData.certificationName,
        error: error.message
      });
    }
  }

  res.json({
    success: true,
    data: {
      awarded: results,
      errors: processingErrors,
      summary: {
        total: certificates.length,
        successful: results.length,
        failed: processingErrors.length
      }
    }
  });
}));

module.exports = router; 