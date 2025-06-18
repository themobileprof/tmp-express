const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, getRow, getRows } = require('../database/config');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const validateUserUpdate = [
  body('firstName').optional().trim().isLength({ min: 1 }).withMessage('First name cannot be empty'),
  body('lastName').optional().trim().isLength({ min: 1 }).withMessage('Last name cannot be empty'),
  body('bio').optional().isString().withMessage('Bio must be a string'),
  body('avatarUrl').optional().isURL().withMessage('Avatar URL must be a valid URL')
];

// Get user by ID
router.get('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const currentUserId = req.user.id;

  // Users can only view their own profile unless they're admin
  if (currentUserId !== id && req.user.role !== 'admin') {
    throw new AppError('Access denied', 403, 'Access Denied');
  }

  const user = await getRow(
    `SELECT u.*, us.theme, us.language, us.timezone
     FROM users u
     LEFT JOIN user_settings us ON u.id = us.user_id
     WHERE u.id = $1`,
    [id]
  );

  if (!user) {
    throw new AppError('User not found', 404, 'User Not Found');
  }

  res.json({
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    role: user.role,
    avatarUrl: user.avatar_url,
    bio: user.bio,
    isActive: user.is_active,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
    settings: {
      theme: user.theme,
      language: user.language,
      timezone: user.timezone
    }
  });
}));

// Update user profile
router.put('/:id', authenticateToken, validateUserUpdate, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }

  const { id } = req.params;
  const { firstName, lastName, bio, avatarUrl } = req.body;
  const currentUserId = req.user.id;

  // Users can only update their own profile unless they're admin
  if (currentUserId !== id && req.user.role !== 'admin') {
    throw new AppError('Access denied', 403, 'Access Denied');
  }

  // Verify user exists
  const user = await getRow('SELECT * FROM users WHERE id = $1', [id]);
  if (!user) {
    throw new AppError('User not found', 404, 'User Not Found');
  }

  // Update user
  const result = await query(
    `UPDATE users 
     SET first_name = COALESCE($1, first_name),
         last_name = COALESCE($2, last_name),
         bio = COALESCE($3, bio),
         avatar_url = COALESCE($4, avatar_url),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $5
     RETURNING *`,
    [firstName, lastName, bio, avatarUrl, id]
  );

  const updatedUser = result.rows[0];

  res.json({
    id: updatedUser.id,
    firstName: updatedUser.first_name,
    lastName: updatedUser.last_name,
    bio: updatedUser.bio,
    avatarUrl: updatedUser.avatar_url,
    updatedAt: updatedUser.updated_at
  });
}));

// Delete user (admin only)
router.delete('/:id', authenticateToken, authorizeAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Verify user exists
  const user = await getRow('SELECT * FROM users WHERE id = $1', [id]);
  if (!user) {
    throw new AppError('User not found', 404, 'User Not Found');
  }

  // Check if user has any enrollments or other related data
  const enrollments = await getRow('SELECT id FROM enrollments WHERE user_id = $1 LIMIT 1', [id]);
  if (enrollments) {
    throw new AppError('Cannot delete user with enrollments', 400, 'User Has Enrollments');
  }

  await query('DELETE FROM users WHERE id = $1', [id]);

  res.json({
    message: 'User deleted successfully'
  });
}));

// Get user enrollments
router.get('/:id/enrollments', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const currentUserId = req.user.id;

  // Users can only view their own enrollments unless they're admin
  if (currentUserId !== id && req.user.role !== 'admin') {
    throw new AppError('Access denied', 403, 'Access Denied');
  }

  const enrollments = await getRows(
    `SELECT e.*, 
            c.title as course_title, c.topic as course_topic, c.image_url as course_image,
            cl.title as class_title, cl.topic as class_topic,
            s.discount_code, s.discount_type, s.discount_value
     FROM enrollments e
     LEFT JOIN courses c ON e.course_id = c.id
     LEFT JOIN classes cl ON e.class_id = cl.id
     LEFT JOIN sponsorships s ON e.sponsorship_id = s.id
     WHERE e.user_id = $1
     ORDER BY e.enrolled_at DESC`,
    [id]
  );

  res.json({
    enrollments: enrollments.map(e => ({
      id: e.id,
      enrollmentType: e.enrollment_type,
      progress: e.progress,
      status: e.status,
      enrolledAt: e.enrolled_at,
      completedAt: e.completed_at,
      course: e.course_id ? {
        id: e.course_id,
        title: e.course_title,
        topic: e.course_topic,
        imageUrl: e.course_image
      } : null,
      class: e.class_id ? {
        id: e.class_id,
        title: e.class_title,
        topic: e.class_topic
      } : null,
      sponsorship: e.sponsorship_id ? {
        id: e.sponsorship_id,
        discountCode: e.discount_code,
        discountType: e.discount_type,
        discountValue: e.discount_value
      } : null
    }))
  });
}));

// Get user certifications
router.get('/:id/certifications', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const currentUserId = req.user.id;

  // Users can only view their own certifications unless they're admin
  if (currentUserId !== id && req.user.role !== 'admin') {
    throw new AppError('Access denied', 403, 'Access Denied');
  }

  const certifications = await getRows(
    `SELECT c.*, 
            co.title as course_title, co.topic as course_topic,
            cl.title as class_title, cl.topic as class_topic
     FROM certifications cert
     LEFT JOIN courses co ON cert.course_id = co.id
     LEFT JOIN classes cl ON cert.class_id = cl.id
     WHERE cert.user_id = $1
     ORDER BY cert.issued_date DESC`,
    [id]
  );

  res.json({
    certifications: certifications.map(c => ({
      id: c.id,
      certificationName: c.certification_name,
      issuer: c.issuer,
      issuedDate: c.issued_date,
      expiryDate: c.expiry_date,
      certificateUrl: c.certificate_url,
      verificationCode: c.verification_code,
      status: c.status,
      course: c.course_id ? {
        id: c.course_id,
        title: c.course_title,
        topic: c.course_topic
      } : null,
      class: c.class_id ? {
        id: c.class_id,
        title: c.class_title,
        topic: c.class_topic
      } : null
    }))
  });
}));

// Get user test attempts
router.get('/:id/test-attempts', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const currentUserId = req.user.id;

  // Users can only view their own test attempts unless they're admin
  if (currentUserId !== id && req.user.role !== 'admin') {
    throw new AppError('Access denied', 403, 'Access Denied');
  }

  const attempts = await getRows(
    `SELECT ta.*, t.title as test_title, c.title as course_title
     FROM test_attempts ta
     JOIN tests t ON ta.test_id = t.id
     JOIN courses c ON t.course_id = c.id
     WHERE ta.user_id = $1
     ORDER BY ta.started_at DESC`,
    [id]
  );

  res.json({
    attempts: attempts.map(a => ({
      id: a.id,
      testTitle: a.test_title,
      courseTitle: a.course_title,
      attemptNumber: a.attempt_number,
      score: a.score,
      totalQuestions: a.total_questions,
      correctAnswers: a.correct_answers,
      status: a.status,
      startedAt: a.started_at,
      completedAt: a.completed_at,
      timeTakenMinutes: a.time_taken_minutes
    }))
  });
}));

// Get user discussions
router.get('/:id/discussions', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const currentUserId = req.user.id;

  // Users can only view their own discussions unless they're admin
  if (currentUserId !== id && req.user.role !== 'admin') {
    throw new AppError('Access denied', 403, 'Access Denied');
  }

  const discussions = await getRows(
    `SELECT d.*, c.title as course_title, cl.title as class_title
     FROM discussions d
     LEFT JOIN courses c ON d.course_id = c.id
     LEFT JOIN classes cl ON d.class_id = cl.id
     WHERE d.author_id = $1
     ORDER BY d.created_at DESC`,
    [id]
  );

  res.json({
    discussions: discussions.map(d => ({
      id: d.id,
      title: d.title,
      content: d.content,
      category: d.category,
      isPinned: d.is_pinned,
      replyCount: d.reply_count,
      lastActivityAt: d.last_activity_at,
      createdAt: d.created_at,
      course: d.course_id ? {
        id: d.course_id,
        title: d.course_title
      } : null,
      class: d.class_id ? {
        id: d.class_id,
        title: d.class_title
      } : null
    }))
  });
}));

module.exports = router; 