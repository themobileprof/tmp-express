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

// Get user dashboard stats
router.get('/:id/dashboard-stats', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const currentUserId = req.user.id;

  // Users can only view their own stats unless they're admin
  if (currentUserId !== id && req.user.role !== 'admin') {
    throw new AppError('Access denied', 403, 'Access Denied');
  }

  // Get enrollment counts
  const enrollmentStats = await getRow(
    `SELECT 
       COUNT(CASE WHEN enrollment_type = 'course' THEN 1 END) as total_enrolled_courses,
       COUNT(CASE WHEN enrollment_type = 'class' THEN 1 END) as total_enrolled_classes,
       COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_enrollments
     FROM enrollments 
     WHERE user_id = $1`,
    [id]
  );

  // Get lesson completion stats
  const lessonStats = await getRow(
    `SELECT 
       COUNT(DISTINCT l.id) as total_lessons,
       COUNT(DISTINCT CASE WHEN lp.user_id = $1 THEN l.id END) as completed_lessons
     FROM lessons l
     JOIN courses c ON l.course_id = c.id
     JOIN enrollments e ON c.id = e.course_id
     LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.user_id = $1
     WHERE e.user_id = $1 AND l.is_published = true`,
    [id]
  );

  // Get study time for current month (mock data for now, would need study_time table)
  const studyTimeThisMonth = 18; // Mock value - would be calculated from study sessions

  res.json({
    totalEnrolledCourses: parseInt(enrollmentStats.total_enrolled_courses) || 0,
    totalEnrolledClasses: parseInt(enrollmentStats.total_enrolled_classes) || 0,
    completedLessons: parseInt(lessonStats.completed_lessons) || 0,
    totalLessons: parseInt(lessonStats.total_lessons) || 0,
    studyTimeThisMonth: studyTimeThisMonth
  });
}));

// Get user enrolled courses (separate endpoint for frontend compatibility)
router.get('/:id/enrolled-courses', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const currentUserId = req.user.id;

  // Users can only view their own enrollments unless they're admin
  if (currentUserId !== id && req.user.role !== 'admin') {
    throw new AppError('Access denied', 403, 'Access Denied');
  }

  const enrolledCourses = await getRows(
    `SELECT e.id, e.course_id, e.progress, e.status, e.enrolled_at, e.completed_at,
            c.title as course_title, c.topic, c.image_url, c.duration,
            u.first_name as instructor_first_name, u.last_name as instructor_last_name,
            s.discount_code, s.discount_type, s.discount_value,
            (SELECT MAX(ta.completed_at) FROM test_attempts ta 
             JOIN tests t ON ta.test_id = t.id 
             WHERE t.course_id = c.id AND ta.user_id = e.user_id) as last_accessed_at
     FROM enrollments e
     JOIN courses c ON e.course_id = c.id
     LEFT JOIN users u ON c.instructor_id = u.id
     LEFT JOIN sponsorships s ON e.sponsorship_id = s.id
     WHERE e.user_id = $1 AND e.enrollment_type = 'course'
     ORDER BY e.enrolled_at DESC`,
    [id]
  );

  res.json(enrolledCourses.map(ec => ({
    id: ec.id,
    courseId: ec.course_id,
    courseTitle: ec.course_title,
    progress: ec.progress,
    status: ec.status,
    enrolledAt: ec.enrolled_at,
    lastAccessedAt: ec.last_accessed_at,
    instructorName: ec.instructor_first_name ? `${ec.instructor_first_name} ${ec.instructor_last_name}` : null,
    topic: ec.topic,
    duration: ec.duration,
    imageUrl: ec.image_url,
    sponsorship: ec.discount_code ? {
      discountCode: ec.discount_code,
      discountType: ec.discount_type,
      discountValue: ec.discount_value
    } : null
  })));
}));

// Get user enrolled classes (separate endpoint for frontend compatibility)
router.get('/:id/enrolled-classes', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const currentUserId = req.user.id;

  // Users can only view their own enrollments unless they're admin
  if (currentUserId !== id && req.user.role !== 'admin') {
    throw new AppError('Access denied', 403, 'Access Denied');
  }

  const enrolledClasses = await getRows(
    `SELECT e.id, e.class_id, e.progress, e.status, e.enrolled_at, e.completed_at,
            cl.title as class_title, cl.topic, cl.type, cl.start_date, cl.end_date, cl.duration, cl.location,
            u.first_name as instructor_first_name, u.last_name as instructor_last_name
     FROM enrollments e
     JOIN classes cl ON e.class_id = cl.id
     LEFT JOIN users u ON cl.instructor_id = u.id
     WHERE e.user_id = $1 AND e.enrollment_type = 'class'
     ORDER BY cl.start_date ASC`,
    [id]
  );

  res.json(enrolledClasses.map(ec => ({
    id: ec.id,
    classId: ec.class_id,
    classTitle: ec.class_title,
    instructorName: ec.instructor_first_name ? `${ec.instructor_first_name} ${ec.instructor_last_name}` : null,
    startDate: ec.start_date,
    endDate: ec.end_date,
    type: ec.type,
    status: ec.status,
    enrolledAt: ec.enrolled_at,
    topic: ec.topic,
    duration: ec.duration,
    location: ec.location
  })));
}));

// Get current user's enrolled courses (for frontend /enrollments/courses endpoint)
router.get('/enrollments/courses', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const enrolledCourses = await getRows(
    `SELECT e.id, e.course_id, e.progress, e.status, e.enrolled_at, e.completed_at,
            c.title as course_title, c.topic, c.image_url, c.duration,
            u.first_name as instructor_first_name, u.last_name as instructor_last_name,
            s.discount_code, s.discount_type, s.discount_value,
            (SELECT MAX(ta.completed_at) FROM test_attempts ta 
             JOIN tests t ON ta.test_id = t.id 
             WHERE t.course_id = c.id AND ta.user_id = e.user_id) as last_accessed_at
     FROM enrollments e
     JOIN courses c ON e.course_id = c.id
     LEFT JOIN users u ON c.instructor_id = u.id
     LEFT JOIN sponsorships s ON e.sponsorship_id = s.id
     WHERE e.user_id = $1 AND e.enrollment_type = 'course'
     ORDER BY e.enrolled_at DESC`,
    [userId]
  );

  res.json(enrolledCourses.map(ec => ({
    id: ec.id,
    courseId: ec.course_id,
    courseTitle: ec.course_title,
    progress: ec.progress,
    status: ec.status,
    enrolledAt: ec.enrolled_at,
    lastAccessedAt: ec.last_accessed_at,
    instructorName: ec.instructor_first_name ? `${ec.instructor_first_name} ${ec.instructor_last_name}` : null,
    topic: ec.topic,
    duration: ec.duration,
    imageUrl: ec.image_url,
    sponsorship: ec.discount_code ? {
      discountCode: ec.discount_code,
      discountType: ec.discount_type,
      discountValue: ec.discount_value
    } : null
  })));
}));

// Get current user's enrolled classes (for frontend /enrollments/classes endpoint)
router.get('/enrollments/classes', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const enrolledClasses = await getRows(
    `SELECT e.id, e.class_id, e.progress, e.status, e.enrolled_at, e.completed_at,
            cl.title as class_title, cl.topic, cl.type, cl.start_date, cl.end_date, cl.duration, cl.location,
            u.first_name as instructor_first_name, u.last_name as instructor_last_name
     FROM enrollments e
     JOIN classes cl ON e.class_id = cl.id
     LEFT JOIN users u ON cl.instructor_id = u.id
     WHERE e.user_id = $1 AND e.enrollment_type = 'class'
     ORDER BY cl.start_date ASC`,
    [userId]
  );

  res.json(enrolledClasses.map(ec => ({
    id: ec.id,
    classId: ec.class_id,
    classTitle: ec.class_title,
    instructorName: ec.instructor_first_name ? `${ec.instructor_first_name} ${ec.instructor_last_name}` : null,
    startDate: ec.start_date,
    endDate: ec.end_date,
    type: ec.type,
    status: ec.status,
    enrolledAt: ec.enrolled_at,
    topic: ec.topic,
    duration: ec.duration,
    location: ec.location
  })));
}));

// Get current user's dashboard stats (for frontend /users/dashboard-stats endpoint)
router.get('/dashboard-stats', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Get enrollment counts
  const enrollmentStats = await getRow(
    `SELECT 
       COUNT(CASE WHEN enrollment_type = 'course' THEN 1 END) as total_enrolled_courses,
       COUNT(CASE WHEN enrollment_type = 'class' THEN 1 END) as total_enrolled_classes,
       COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_enrollments
     FROM enrollments 
     WHERE user_id = $1`,
    [userId]
  );

  // Get lesson completion stats
  const lessonStats = await getRow(
    `SELECT 
       COUNT(DISTINCT l.id) as total_lessons,
       COUNT(DISTINCT CASE WHEN lp.user_id = $1 THEN l.id END) as completed_lessons
     FROM lessons l
     JOIN courses c ON l.course_id = c.id
     JOIN enrollments e ON c.id = e.course_id
     LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.user_id = $1
     WHERE e.user_id = $1 AND l.is_published = true`,
    [userId]
  );

  // Get study time for current month (mock data for now, would need study_time table)
  const studyTimeThisMonth = 18; // Mock value - would be calculated from study sessions

  res.json({
    totalEnrolledCourses: parseInt(enrollmentStats.total_enrolled_courses) || 0,
    totalEnrolledClasses: parseInt(enrollmentStats.total_enrolled_classes) || 0,
    completedLessons: parseInt(lessonStats.completed_lessons) || 0,
    totalLessons: parseInt(lessonStats.total_lessons) || 0,
    studyTimeThisMonth: studyTimeThisMonth
  });
}));

module.exports = router; 