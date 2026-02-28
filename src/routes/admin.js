const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, getRow, getRows } = require('../database/config');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const { clearSettingsCache } = require('../utils/systemSettings');
const { sendEmail } = require('../mailer');

const router = express.Router();

// Admin middleware - ensure user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    throw new AppError('Admin access required', 403, 'Forbidden');
  }
  next();
};

// Apply admin middleware to all routes
router.use(authenticateToken, requireAdmin);

// ===== USER MANAGEMENT =====

// Get all users with pagination and filtering
router.get('/users', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, role, search, status } = req.query;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE 1=1';
  const params = [];
  let paramCount = 0;

  if (role) {
    paramCount++;
    whereClause += ` AND u.role = $${paramCount}`;
    params.push(role);
  }

  if (search) {
    paramCount++;
    whereClause += ` AND (u.email ILIKE $${paramCount} OR u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount})`;
    params.push(`%${search}%`);
  }

  if (status === 'active') {
    whereClause += ' AND u.is_active = true';
  } else if (status === 'inactive') {
    whereClause += ' AND u.is_active = false';
  }

  // Get total count
  const countResult = await getRow(
    `SELECT COUNT(*) as total FROM users u ${whereClause}`,
    params
  );
  const total = parseInt(countResult.total);

  // Get users
  const users = await getRows(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.avatar_url, 
            u.created_at, u.is_active, u.auth_provider, u.email_verified,
            COUNT(e.id) as enrollment_count,
            COUNT(c.id) as course_count
     FROM users u
     LEFT JOIN enrollments e ON u.id = e.user_id
     LEFT JOIN courses c ON u.id = c.instructor_id
     ${whereClause}
     GROUP BY u.id
     ORDER BY u.created_at DESC
     LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
    [...params, limit, offset]
  );

  res.json({
    users,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

// Create new user
router.post('/users', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').trim().isLength({ min: 1 }),
  body('lastName').trim().isLength({ min: 1 }),
  body('role').isIn(['student', 'instructor', 'admin', 'sponsor'])
], asyncHandler(async (req, res) => {
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

  const { email, password, firstName, lastName, role } = req.body;

  // Check if user exists
  const existingUser = await getRow('SELECT id FROM users WHERE email = $1', [email]);
  if (existingUser) {
    throw new AppError('User with this email already exists', 409, 'Duplicate Entry');
  }

  // Hash password
  const bcrypt = require('bcryptjs');
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Create user
  const result = await query(
    `INSERT INTO users (email, password_hash, first_name, last_name, role, auth_provider, email_verified)
     VALUES ($1, $2, $3, $4, $5, 'local', true)
     RETURNING id, email, first_name, last_name, role, created_at`,
    [email, passwordHash, firstName, lastName, role]
  );

  const user = result.rows[0];

  // Create default user settings
  await query(
    `INSERT INTO user_settings (user_id) VALUES ($1)`,
    [user.id]
  );

  res.status(201).json({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      createdAt: user.created_at
    }
  });
}));

// Update user
router.put('/users/:id', [
  body('firstName').optional().trim().isLength({ min: 1 }),
  body('lastName').optional().trim().isLength({ min: 1 }),
  body('role').optional().isIn(['student', 'instructor', 'admin', 'sponsor']),
  body('isActive').optional().isBoolean()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }

  const { id } = req.params;
  const { firstName, lastName, role, isActive } = req.body;

  // Check if user exists
  const existingUser = await getRow('SELECT id FROM users WHERE id = $1', [id]);
  if (!existingUser) {
    throw new AppError('User not found', 404, 'User Not Found');
  }

  // Build update query
  const updates = [];
  const params = [];
  let paramCount = 0;

  if (firstName) {
    paramCount++;
    updates.push(`first_name = $${paramCount}`);
    params.push(firstName);
  }

  if (lastName) {
    paramCount++;
    updates.push(`last_name = $${paramCount}`);
    params.push(lastName);
  }

  if (role) {
    paramCount++;
    updates.push(`role = $${paramCount}`);
    params.push(role);
  }

  if (typeof isActive === 'boolean') {
    paramCount++;
    updates.push(`is_active = $${paramCount}`);
    params.push(isActive);
  }

  if (updates.length === 0) {
    throw new AppError('No fields to update', 400, 'No Updates');
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  paramCount++;
  params.push(id);

  const result = await query(
    `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    params
  );

  res.json({
    user: result.rows[0]
  });
}));

// Delete user
router.delete('/users/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if user exists
  const existingUser = await getRow('SELECT id, role FROM users WHERE id = $1', [id]);
  if (!existingUser) {
    throw new AppError('User not found', 404, 'User Not Found');
  }

  // Prevent deletion of the last admin
  if (existingUser.role === 'admin') {
    const adminCount = await getRow('SELECT COUNT(*) as count FROM users WHERE role = $1', ['admin']);
    if (parseInt(adminCount.count) <= 1) {
      throw new AppError('Cannot delete the last admin user', 400, 'Last Admin');
    }
  }

  await query('DELETE FROM users WHERE id = $1', [id]);

  res.json({
    message: 'User deleted successfully'
  });
}));

// Admin: change a user's password
router.put('/users/:id/password', [
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const validationError = new AppError('Validation failed', 400, 'VALIDATION_ERROR');
    validationError.details = errors.array().reduce((acc, error) => { acc[error.param] = error.msg; return acc; }, {});
    throw validationError;
  }

  const { id } = req.params;
  const { password } = req.body;

  // Ensure user exists
  const user = await getRow('SELECT id, auth_provider FROM users WHERE id = $1', [id]);
  if (!user) {
    throw new AppError('User not found', 404, 'User Not Found');
  }

  // Only allow changing password for local-auth users by default
  if (user.auth_provider && user.auth_provider !== 'local') {
    // If admin explicitly requests force, convert the account to local by clearing oauth fields.
    // This is a destructive operation (it removes the OAuth linkage). Require explicit intent.
    if (!req.body.force) {
      throw new AppError('Cannot change password for non-local auth users. To override, include { "force": true } in the request body', 400, 'Invalid Operation');
    }

    // Convert account to local auth: set auth_provider to 'local' and clear OAuth-specific columns
    await query(
      `UPDATE users SET auth_provider = $1, google_id = NULL, google_email = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      ['local', id]
    );
  }

  // Hash new password
  const bcrypt = require('bcryptjs');
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Update password and clear any existing reset tokens
  await query(
    'UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [passwordHash, id]
  );

  // Send notification email to the user informing them of the change
  try {
    const userInfo = await getRow('SELECT email, first_name FROM users WHERE id = $1', [id]);
    if (userInfo && userInfo.email) {
      await sendEmail({
        to: userInfo.email,
        subject: 'Your account password has been changed',
        template: 'notification',
        context: {
          firstName: userInfo.first_name || 'there',
          message: req.body.force ? 'An administrator has converted your account to local sign-in and set a new password for you.' : 'An administrator has updated your account password.'
        }
      });
    }
  } catch (err) {
    console.error('Failed to send password change notification email:', err.message || err);
    // Do not fail the request if email sending fails
  }

  res.json({ message: 'Password updated successfully' });
}));

// ===== COURSE MANAGEMENT =====

// Get all courses with admin details
router.get('/courses', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, instructor, search } = req.query;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE c.deleted_at IS NULL'; // Exclude soft-deleted courses
  const params = [];
  let paramCount = 0;

  if (status) {
    paramCount++;
    whereClause += ` AND c.is_published = $${paramCount}`;
    params.push(status === 'published');
  }

  if (instructor) {
    paramCount++;
    whereClause += ` AND (u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount})`;
    params.push(`%${instructor}%`);
  }

  if (search) {
    paramCount++;
    whereClause += ` AND (c.title ILIKE $${paramCount} OR c.description ILIKE $${paramCount} OR c.topic ILIKE $${paramCount})`;
    params.push(`%${search}%`);
  }

  // Get total count
  const countResult = await getRow(
    `SELECT COUNT(*) as total FROM courses c 
     LEFT JOIN users u ON c.instructor_id = u.id ${whereClause}`,
    params
  );
  const total = parseInt(countResult.total);

  // Get courses
  const courses = await getRows(
    `SELECT c.*, u.first_name as instructor_first_name, u.last_name as instructor_last_name,
            COUNT(DISTINCT e.id) as enrollment_count,
            COUNT(DISTINCT l.id) as lesson_count,
            COUNT(DISTINCT t.id) as test_count
     FROM courses c
     LEFT JOIN users u ON c.instructor_id = u.id
     LEFT JOIN enrollments e ON c.id = e.course_id
     LEFT JOIN lessons l ON c.id = l.course_id
     LEFT JOIN tests t ON c.id = t.course_id
     ${whereClause}
     GROUP BY c.id, u.first_name, u.last_name
     ORDER BY c.created_at DESC
     LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
    [...params, limit, offset]
  );

  res.json({
    courses,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

// Create course
router.post('/courses', [
  body('title').trim().isLength({ min: 1 }).withMessage('Title is required and must not be empty'),
  body('description').trim().isLength({ min: 1 }).withMessage('Description is required and must not be empty'),
  body('topic').trim().isLength({ min: 1 }).withMessage('Topic is required and must not be empty'),
  body('type').isIn(['online', 'offline']).withMessage('Type must be either "online" or "offline"'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a valid number greater than or equal to 0'),
  body('duration').trim().isLength({ min: 1 }).withMessage('Duration is required and must not be empty'),
  body('certification').optional({ values: 'falsy' }).trim().isLength({ min: 1 }).withMessage('Certification must be a non-empty string if provided'),
  body('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced']).withMessage('Difficulty must be beginner, intermediate, or advanced'),
  body('objectives').optional({ values: 'falsy' }).trim().isLength({ min: 1 }).withMessage('Objectives must be a non-empty string if provided'),
  body('prerequisites').optional({ values: 'falsy' }).trim().isLength({ min: 1 }).withMessage('Prerequisites must be a non-empty string if provided'),
  body('syllabus').optional({ values: 'falsy' }).trim().isLength({ min: 1 }).withMessage('Syllabus must be a non-empty string if provided'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('instructorId').optional().custom((value) => {
    if (value === '' || value === null || value === undefined) {
      return true; // Allow empty/null values
    }
    // Check if it's a valid UUID when provided
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      throw new Error('Instructor ID must be a valid UUID if provided');
    }
    return true;
  })
], asyncHandler(async (req, res) => {
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

  const { title, description, topic, type, certification, price, duration, difficulty, objectives, prerequisites, syllabus, tags, instructorId, imageUrl } = req.body;

  // If instructorId is provided, verify the instructor exists
  if (instructorId) {
    const instructor = await getRow(
      'SELECT id, role FROM users WHERE id = $1 AND role = $2',
      [instructorId, 'instructor']
    );
    if (!instructor) {
      throw new AppError('Instructor not found', 404, 'Instructor Not Found');
    }
  }

  const result = await query(
    `INSERT INTO courses (title, description, topic, type, certification, price, duration, difficulty, objectives, prerequisites, syllabus, tags, instructor_id, image_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     RETURNING *`,
    [title, description, topic, type, certification, price, duration, difficulty, objectives, prerequisites, syllabus, tags, instructorId || null, imageUrl]
  );

  res.status(201).json({
    success: true,
    course: result.rows[0]
  });
}));

// Update course
router.put('/courses/:id', [
  body('title').optional().trim().isLength({ min: 1 }),
  body('description').optional().trim().isLength({ min: 1 }),
  body('topic').optional().trim().isLength({ min: 1 }),
  body('type').optional().isIn(['online', 'offline']),
  body('price').optional().isFloat({ min: 0 }),
  body('duration').optional().trim().isLength({ min: 1 }),
  body('certification').optional({ values: 'falsy' }).trim().isLength({ min: 1 }).withMessage('Certification must be a non-empty string if provided'),
  body('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced']),
  body('objectives').optional({ values: 'falsy' }).trim().isLength({ min: 1 }).withMessage('Objectives must be a non-empty string if provided'),
  body('prerequisites').optional({ values: 'falsy' }).trim().isLength({ min: 1 }).withMessage('Prerequisites must be a non-empty string if provided'),
  body('syllabus').optional({ values: 'falsy' }).trim().isLength({ min: 1 }).withMessage('Syllabus must be a non-empty string if provided'),
  body('tags').optional().isArray(),
  body('isPublished').optional().isBoolean(),
  body('instructorId').optional().custom((value) => {
    if (value === '' || value === null || value === undefined) {
      return true; // Allow empty/null values
    }
    // Check if it's a valid UUID when provided
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      throw new Error('Instructor ID must be a valid UUID if provided');
    }
    return true;
  })
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors:', JSON.stringify(errors.array(), null, 2));
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    throw new AppError('Validation failed', 400, 'Validation Error');
  }

  const { id } = req.params;
  const { title, description, topic, type, certification, price, duration, difficulty, objectives, prerequisites, syllabus, tags, imageUrl, isPublished, instructorId } = req.body;

  // Check if course exists
  const existingCourse = await getRow('SELECT id FROM courses WHERE id = $1', [id]);
  if (!existingCourse) {
    throw new AppError('Course not found', 404, 'Course Not Found');
  }

  // If instructorId is provided, verify the instructor exists
  if (instructorId) {
    const instructor = await getRow(
      'SELECT id, role FROM users WHERE id = $1 AND role = $2',
      [instructorId, 'instructor']
    );
    if (!instructor) {
      throw new AppError('Instructor not found', 404, 'Instructor Not Found');
    }
  }

  // Build update query
  const updates = [];
  const params = [];
  let paramCount = 0;

  if (title) {
    paramCount++;
    updates.push(`title = $${paramCount}`);
    params.push(title);
  }

  if (description) {
    paramCount++;
    updates.push(`description = $${paramCount}`);
    params.push(description);
  }

  if (topic) {
    paramCount++;
    updates.push(`topic = $${paramCount}`);
    params.push(topic);
  }

  if (type) {
    paramCount++;
    updates.push(`type = $${paramCount}`);
    params.push(type);
  }

  if (certification !== undefined) {
    paramCount++;
    updates.push(`certification = $${paramCount}`);
    params.push(certification);
  }

  if (price) {
    paramCount++;
    updates.push(`price = $${paramCount}`);
    params.push(price);
  }

  if (duration) {
    paramCount++;
    updates.push(`duration = $${paramCount}`);
    params.push(duration);
  }

  if (difficulty !== undefined) {
    paramCount++;
    updates.push(`difficulty = $${paramCount}`);
    params.push(difficulty);
  }

  if (objectives !== undefined) {
    paramCount++;
    updates.push(`objectives = $${paramCount}`);
    params.push(objectives);
  }

  if (prerequisites !== undefined) {
    paramCount++;
    updates.push(`prerequisites = $${paramCount}`);
    params.push(prerequisites);
  }

  if (syllabus !== undefined) {
    paramCount++;
    updates.push(`syllabus = $${paramCount}`);
    params.push(syllabus);
  }

  if (tags !== undefined) {
    paramCount++;
    updates.push(`tags = $${paramCount}`);
    params.push(tags);
  }

  if (imageUrl !== undefined) {
    paramCount++;
    updates.push(`image_url = $${paramCount}`);
    params.push(imageUrl);
  }

  if (isPublished !== undefined) {
    paramCount++;
    updates.push(`is_published = $${paramCount}`);
    params.push(isPublished);
  }

  if (instructorId !== undefined) {
    paramCount++;
    updates.push(`instructor_id = $${paramCount}`);
    params.push(instructorId || null);
  }

  if (updates.length === 0) {
    throw new AppError('No fields to update', 400, 'No Updates');
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  paramCount++;
  params.push(id);

  const result = await query(
    `UPDATE courses SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    params
  );

  res.json({
    course: result.rows[0]
  });
}));

// Delete course (soft delete)
router.delete('/courses/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { permanent } = req.query; // Allow permanent deletion via query param (dangerous!)

  // Check if course exists and is not already deleted
  const existingCourse = await getRow(
    'SELECT id, title, deleted_at FROM courses WHERE id = $1', 
    [id]
  );
  
  if (!existingCourse) {
    throw new AppError('Course not found', 404, 'Course Not Found');
  }

  if (existingCourse.deleted_at && permanent !== 'true') {
    throw new AppError('Course is already deleted', 400, 'Already Deleted');
  }

  // Soft delete (default - safe)
  if (permanent !== 'true') {
    await query(
      'UPDATE courses SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    res.json({
      message: 'Course soft deleted successfully',
      note: 'Course is hidden but data is preserved. Use restore endpoint to recover.',
      deletedAt: new Date().toISOString()
    });
    return;
  }

  // Permanent deletion (requires explicit permanent=true)
  // Check for dependencies
  const enrollmentCount = await getRow(
    'SELECT COUNT(*) as count FROM enrollments WHERE course_id = $1',
    [id]
  );

  const paymentCount = await getRow(
    'SELECT COUNT(*) as count FROM payments WHERE course_id = $1',
    [id]
  );

  // Build error message for related records
  const issues = [];
  if (enrollmentCount.count > 0) {
    issues.push(`${enrollmentCount.count} enrollment(s)`);
  }
  if (paymentCount.count > 0) {
    issues.push(`${paymentCount.count} payment record(s)`);
  }

  if (issues.length > 0) {
    throw new AppError(
      `Cannot permanently delete course with ${issues.join(' and ')}. These records will be orphaned.`,
      400,
      'Course Has Dependencies'
    );
  }

  // Permanent delete
  await query('DELETE FROM courses WHERE id = $1', [id]);

  res.json({
    message: 'Course permanently deleted',
    warning: 'This action cannot be undone'
  });
}));

// Restore soft-deleted course
router.post('/courses/:id/restore', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if course exists and is deleted
  const course = await getRow(
    'SELECT id, title, deleted_at FROM courses WHERE id = $1',
    [id]
  );

  if (!course) {
    throw new AppError('Course not found', 404, 'Course Not Found');
  }

  if (!course.deleted_at) {
    throw new AppError('Course is not deleted', 400, 'Not Deleted');
  }

  // Restore the course
  await query(
    'UPDATE courses SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
    [id]
  );

  res.json({
    message: 'Course restored successfully',
    courseId: id,
    courseTitle: course.title
  });
}));

// List deleted courses
router.get('/courses/deleted/list', asyncHandler(async (req, res) => {
  const deletedCourses = await query(`
    SELECT 
      id, 
      title, 
      topic,
      instructor_id,
      deleted_at,
      created_at
    FROM courses
    WHERE deleted_at IS NOT NULL
    ORDER BY deleted_at DESC
  `);

  res.json({
    deletedCourses: deletedCourses.rows,
    count: deletedCourses.rows.length
  });
}));

// ===== SYSTEM STATISTICS =====

// Get system overview stats
router.get('/stats/overview', asyncHandler(async (req, res) => {
  // User stats
  const userStats = await getRow(`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN role = 'student' THEN 1 END) as students,
      COUNT(CASE WHEN role = 'instructor' THEN 1 END) as instructors,
      COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
      COUNT(CASE WHEN role = 'sponsor' THEN 1 END) as sponsors,
      COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_this_month
    FROM users
  `);

  // Course stats
  const courseStats = await getRow(`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN is_published = true THEN 1 END) as published,
      COUNT(CASE WHEN is_published = false THEN 1 END) as draft
    FROM courses
  `);

  // Test stats
  const testStats = await getRow(`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN is_published = true THEN 1 END) as published,
      COUNT(CASE WHEN is_published = false THEN 1 END) as draft
    FROM tests
  `);

  // Enrollment stats
  const enrollmentStats = await getRow(`
    SELECT 
      COUNT(*) as total_enrollments,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
      COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress
    FROM enrollments
  `);

  // Sponsorship stats
  const sponsorshipStats = await getRow(`
    SELECT 
      COUNT(*) as total_sponsorships,
      COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
      SUM(students_used) as total_students_helped
    FROM sponsorships
  `);

  res.json({
    users: userStats,
    courses: courseStats,
    tests: testStats,
    enrollments: enrollmentStats,
    sponsorships: sponsorshipStats
  });
}));

// Get detailed user statistics
router.get('/stats/users', asyncHandler(async (req, res) => {
  const { period = '30' } = req.query;

  const userStats = await getRows(`
    SELECT 
      DATE_TRUNC('day', created_at) as date,
      COUNT(*) as new_users,
      COUNT(CASE WHEN role = 'student' THEN 1 END) as new_students,
      COUNT(CASE WHEN role = 'instructor' THEN 1 END) as new_instructors,
      COUNT(CASE WHEN role = 'sponsor' THEN 1 END) as new_sponsors
    FROM users 
    WHERE created_at >= CURRENT_DATE - INTERVAL '${period} days'
    GROUP BY DATE_TRUNC('day', created_at)
    ORDER BY date DESC
  `);

  const roleDistribution = await getRows(`
    SELECT 
      role,
      COUNT(*) as count,
      ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM users), 2) as percentage
    FROM users 
    GROUP BY role
    ORDER BY count DESC
  `);

  const activeUsers = await getRow(`
    SELECT COUNT(DISTINCT user_id) as active_users
    FROM enrollments 
    WHERE enrolled_at >= CURRENT_DATE - INTERVAL '${period} days'
  `);

  res.json({
    dailyStats: userStats,
    roleDistribution: roleDistribution,
    activeUsers: activeUsers.active_users
  });
}));

// Get detailed course statistics
router.get('/stats/courses', asyncHandler(async (req, res) => {
  const courseStats = await getRows(`
    SELECT 
      c.id,
      c.title,
      c.topic,
      c.price,
      c.is_published,
      u.first_name as instructor_first_name,
      u.last_name as instructor_last_name,
      COUNT(DISTINCT e.id) as enrollment_count,
      COUNT(CASE WHEN e.status = 'completed' THEN 1 END) as completion_count,
      ROUND(AVG(ta.score), 2) as average_score,
      COUNT(DISTINCT l.id) as lesson_count,
      COUNT(DISTINCT t.id) as test_count
    FROM courses c
    LEFT JOIN users u ON c.instructor_id = u.id
    LEFT JOIN enrollments e ON c.id = e.course_id
    -- join tests first then test_attempts on the test id to avoid multiplying rows
    LEFT JOIN tests t ON c.id = t.course_id
    LEFT JOIN test_attempts ta ON t.id = ta.test_id
    LEFT JOIN lessons l ON c.id = l.course_id
    GROUP BY c.id, u.first_name, u.last_name
    ORDER BY enrollment_count DESC
  `);

  const topicStats = await getRows(`
    SELECT 
      topic,
      COUNT(*) as course_count,
      AVG(price) as average_price,
      SUM(CASE WHEN is_published = true THEN 1 ELSE 0 END) as published_count
    FROM courses 
    GROUP BY topic
    ORDER BY course_count DESC
  `);

  res.json({
    courseDetails: courseStats,
    topicStats: topicStats
  });
}));

// Get revenue statistics
router.get('/stats/revenue', asyncHandler(async (req, res) => {
  const { period = '30' } = req.query;

  const revenueStats = await getRows(`
    SELECT 
      DATE_TRUNC('day', p.created_at) as date,
      SUM(p.amount) as daily_revenue,
      COUNT(p.id) as transaction_count,
      AVG(p.amount) as average_transaction
    FROM payments p
    WHERE p.status = 'successful' 
      AND p.created_at >= CURRENT_DATE - INTERVAL '${period} days'
    GROUP BY DATE_TRUNC('day', p.created_at)
    ORDER BY date DESC
  `);

  const totalRevenue = await getRow(`
    SELECT 
      SUM(amount) as total_revenue,
      COUNT(*) as total_transactions,
      AVG(amount) as average_transaction
    FROM payments 
    WHERE status = 'successful'
  `);

  const sponsorshipSavings = await getRow(`
    SELECT 
      SUM(su.discount_amount) as total_savings,
      COUNT(su.id) as total_sponsorships_used
    FROM sponsorship_usage su
    JOIN sponsorships s ON su.sponsorship_id = s.id
    WHERE s.status = 'active'
  `);

  res.json({
    dailyRevenue: revenueStats,
    totalRevenue: totalRevenue,
    sponsorshipSavings: sponsorshipSavings
  });
}));

// ===== LESSON MANAGEMENT =====

// Get lessons for a course
router.get('/courses/:courseId/lessons', asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { page = 1, limit = 20, status } = req.query;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE l.course_id = $1 AND l.deleted_at IS NULL';
  const params = [courseId];
  let paramCount = 1;

  if (status) {
    paramCount++;
    whereClause += ` AND l.status = $${paramCount}`;
    params.push(status);
  }

  // Get total count
  const countResult = await getRow(
    `SELECT COUNT(*) as total FROM lessons l ${whereClause}`,
    params
  );
  const total = parseInt(countResult.total);

  // Get lessons
  const lessons = await getRows(
    `SELECT l.*, COUNT(t.id) as test_count
     FROM lessons l
     LEFT JOIN tests t ON l.id = t.lesson_id
     ${whereClause}
     GROUP BY l.id
     ORDER BY l.order_index ASC
     LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
    [...params, limit, offset]
  );

  res.json({
    lessons,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

// Create lesson
router.post('/courses/:courseId/lessons', [
  body('title').trim().isLength({ min: 1 }).withMessage('Title is required and must not be empty'),
  body('description').optional({ values: 'falsy' }).trim().isLength({ min: 1 }).withMessage('Description must be a non-empty string if provided'),
  body('content').optional({ values: 'falsy' }).trim().isLength({ min: 1 }).withMessage('Content must be a non-empty string if provided'),
  body('durationMinutes').isInt({ min: 1 }).withMessage('Duration must be a positive integer')
], asyncHandler(async (req, res) => {
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

  const { courseId } = req.params;
  const { title, description, content, durationMinutes } = req.body;

  // Check if course exists
  const course = await getRow('SELECT id FROM courses WHERE id = $1', [courseId]);
  if (!course) {
    throw new AppError('Course not found', 404, 'Course Not Found');
  }

  // Get next order index
  const orderResult = await getRow(
    'SELECT COALESCE(MAX(order_index), 0) + 1 as next_order FROM lessons WHERE course_id = $1',
    [courseId]
  );
  const orderIndex = orderResult.next_order;

  const result = await query(
    `INSERT INTO lessons (course_id, title, description, content, duration_minutes, order_index, is_published)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [courseId, title, description, content, durationMinutes, orderIndex, true]
  );

  res.status(201).json({
    success: true,
    lesson: result.rows[0]
  });
}));

// Update lesson
router.put('/lessons/:id', [
  body('title').optional().trim().isLength({ min: 1 }),
  body('description').optional().trim(),
  body('content').optional().trim(),
  body('videoUrl').optional().trim(),
  body('durationMinutes').optional().isInt({ min: 0 })
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }

  const { id } = req.params;
  const { title, description, content, videoUrl, durationMinutes } = req.body;

  // Check if lesson exists
  const existingLesson = await getRow('SELECT id FROM lessons WHERE id = $1', [id]);
  if (!existingLesson) {
    throw new AppError('Lesson not found', 404, 'Lesson Not Found');
  }

  // Build update query
  const updates = [];
  const params = [];
  let paramCount = 0;

  if (title) {
    paramCount++;
    updates.push(`title = $${paramCount}`);
    params.push(title);
  }

  if (description !== undefined) {
    paramCount++;
    updates.push(`description = $${paramCount}`);
    params.push(description);
  }

  if (content !== undefined) {
    paramCount++;
    updates.push(`content = $${paramCount}`);
    params.push(content);
  }

  if (videoUrl !== undefined) {
    paramCount++;
    updates.push(`video_url = $${paramCount}`);
    params.push(videoUrl);
  }

  if (durationMinutes !== undefined) {
    paramCount++;
    updates.push(`duration_minutes = $${paramCount}`);
    params.push(durationMinutes);
  }

  if (updates.length === 0) {
    throw new AppError('No fields to update', 400, 'No Updates');
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  paramCount++;
  params.push(id);

  const result = await query(
    `UPDATE lessons SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    params
  );

  res.json({
    lesson: result.rows[0]
  });
}));

// Delete lesson
router.delete('/lessons/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { permanent } = req.query;

  // Check if lesson exists
  const lesson = await getRow('SELECT id, title, course_id FROM lessons WHERE id = $1', [id]);
  if (!lesson) {
    throw new AppError('Lesson not found', 404, 'Lesson Not Found');
  }

  // Soft delete (default)
  if (permanent !== 'true') {
    await query(
      'UPDATE lessons SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
    return res.json({
      message: 'Lesson soft deleted successfully',
      note: 'Lesson is hidden but data is preserved. Use restore endpoint to recover.',
      deletedAt: new Date().toISOString()
    });
  }

  // Check dependencies before permanent delete
  const progressCount = await getRow('SELECT COUNT(*)::int as count FROM lesson_progress WHERE lesson_id = $1', [id]);
  const workshopCount = await getRow('SELECT COUNT(*)::int as count FROM lesson_workshops WHERE lesson_id = $1', [id]);
  const testCount = await getRow('SELECT COUNT(*)::int as count FROM tests WHERE lesson_id = $1 AND deleted_at IS NULL', [id]);

  const totalDeps = progressCount.count + workshopCount.count + testCount.count;

  if (totalDeps > 0) {
    throw new AppError(
      `Cannot permanently delete lesson with ${progressCount.count} progress record(s), ${workshopCount.count} workshop(s), and ${testCount.count} test(s).`,
      400,
      'Lesson Has Dependencies'
    );
  }

  await query('DELETE FROM lessons WHERE id = $1', [id]);
  res.json({
    message: 'Lesson permanently deleted',
    warning: 'This action cannot be undone'
  });
}));

// Restore soft-deleted lesson
router.post('/lessons/:id/restore', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const lesson = await getRow('SELECT id, title, deleted_at FROM lessons WHERE id = $1', [id]);
  if (!lesson) {
    throw new AppError('Lesson not found', 404);
  }

  if (!lesson.deleted_at) {
    throw new AppError('Lesson is not deleted', 400, 'Not Deleted');
  }

  await query('UPDATE lessons SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);

  res.json({
    message: 'Lesson restored successfully',
    lessonId: id,
    lessonTitle: lesson.title
  });
}));

// List deleted lessons
router.get('/lessons/deleted/list', asyncHandler(async (req, res) => {
  const deletedLessons = await query(`
    SELECT l.id, l.title, l.course_id, c.title as course_title, l.deleted_at, l.created_at
    FROM lessons l
    LEFT JOIN courses c ON l.course_id = c.id
    WHERE l.deleted_at IS NOT NULL
    ORDER BY l.deleted_at DESC
  `);

  res.json({
    deletedLessons: deletedLessons.rows,
    count: deletedLessons.rows.length
  });
}));

// ===== CONTENT REVIEW =====

// Get all content with review status
router.get('/content/review-list', asyncHandler(async (req, res) => {
  const { reviewed, contentType, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  const results = { lessons: [], testQuestions: [], workshops: [] };

  // Get lessons
  if (!contentType || contentType === 'lessons') {
    const lessonQuery = reviewed !== undefined
      ? `SELECT l.id, l.title, l.course_id, c.title as course_title, l.is_reviewed, l.reviewed_at, l.created_at,
                CONCAT(u.first_name, ' ', u.last_name) as reviewed_by_name
         FROM lessons l
         LEFT JOIN courses c ON l.course_id = c.id
         LEFT JOIN users u ON l.reviewed_by = u.id
         WHERE l.deleted_at IS NULL AND l.is_reviewed = $1
         ORDER BY l.created_at DESC
         LIMIT $2 OFFSET $3`
      : `SELECT l.id, l.title, l.course_id, c.title as course_title, l.is_reviewed, l.reviewed_at, l.created_at,
                CONCAT(u.first_name, ' ', u.last_name) as reviewed_by_name
         FROM lessons l
         LEFT JOIN courses c ON l.course_id = c.id
         LEFT JOIN users u ON l.reviewed_by = u.id
         WHERE l.deleted_at IS NULL
         ORDER BY l.created_at DESC
         LIMIT $1 OFFSET $2`;
    
    const lessonParams = reviewed !== undefined ? [reviewed === 'true', limit, offset] : [limit, offset];
    results.lessons = await getRows(lessonQuery, lessonParams);
  }

  // Get test questions
  if (!contentType || contentType === 'test_questions') {
    const questionQuery = reviewed !== undefined
      ? `SELECT tq.id, tq.question, tq.test_id, t.title as test_title, tq.is_reviewed, tq.reviewed_at, tq.created_at,
                CONCAT(u.first_name, ' ', u.last_name) as reviewed_by_name
         FROM test_questions tq
         JOIN tests t ON tq.test_id = t.id
         LEFT JOIN users u ON tq.reviewed_by = u.id
         WHERE tq.is_reviewed = $1
         ORDER BY tq.created_at DESC
         LIMIT $2 OFFSET $3`
      : `SELECT tq.id, tq.question, tq.test_id, t.title as test_title, tq.is_reviewed, tq.reviewed_at, tq.created_at,
                CONCAT(u.first_name, ' ', u.last_name) as reviewed_by_name
         FROM test_questions tq
         JOIN tests t ON tq.test_id = t.id
         LEFT JOIN users u ON tq.reviewed_by = u.id
         ORDER BY tq.created_at DESC
         LIMIT $1 OFFSET $2`;
    
    const questionParams = reviewed !== undefined ? [reviewed === 'true', limit, offset] : [limit, offset];
    results.testQuestions = await getRows(questionQuery, questionParams);
  }

  // Get workshops
  if (!contentType || contentType === 'workshops') {
    const workshopQuery = reviewed !== undefined
      ? `SELECT lw.id, lw.lesson_id, l.title as lesson_title, lw.is_reviewed, lw.reviewed_at, lw.created_at,
                CONCAT(u.first_name, ' ', u.last_name) as reviewed_by_name
         FROM lesson_workshops lw
         JOIN lessons l ON lw.lesson_id = l.id
         LEFT JOIN users u ON lw.reviewed_by = u.id
         WHERE lw.is_reviewed = $1
         ORDER BY lw.created_at DESC
         LIMIT $2 OFFSET $3`
      : `SELECT lw.id, lw.lesson_id, l.title as lesson_title, lw.is_reviewed, lw.reviewed_at, lw.created_at,
                CONCAT(u.first_name, ' ', u.last_name) as reviewed_by_name
         FROM lesson_workshops lw
         JOIN lessons l ON lw.lesson_id = l.id
         LEFT JOIN users u ON lw.reviewed_by = u.id
         ORDER BY lw.created_at DESC
         LIMIT $1 OFFSET $2`;
    
    const workshopParams = reviewed !== undefined ? [reviewed === 'true', limit, offset] : [limit, offset];
    results.workshops = await getRows(workshopQuery, workshopParams);
  }

  res.json({
    ...results,
    pagination: { page: parseInt(page), limit: parseInt(limit) }
  });
}));

// Mark lesson as reviewed/unreviewed
router.put('/lessons/:id/mark-reviewed', [
  body('isReviewed').isBoolean(),
  body('notes').optional().trim()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }

  const { id } = req.params;
  const { isReviewed, notes } = req.body;

  const lesson = await getRow('SELECT id, title FROM lessons WHERE id = $1', [id]);
  if (!lesson) {
    throw new AppError('Lesson not found', 404, 'Lesson Not Found');
  }

  const result = await query(
    `UPDATE lessons 
     SET is_reviewed = $1,
         reviewed_by = $2,
         reviewed_at = CURRENT_TIMESTAMP,
         review_notes = $3,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $4
     RETURNING *`,
    [isReviewed, req.user.id, notes || null, id]
  );

  res.json({
    success: true,
    message: `Lesson marked as ${isReviewed ? 'reviewed' : 'not reviewed'}`,
    lesson: result.rows[0]
  });
}));

// ===== LESSON WORKSHOP MANAGEMENT (Admin) =====

// Get workshop spec for a lesson
router.get('/lessons/:lessonId/workshop', asyncHandler(async (req, res) => {
  const { lessonId } = req.params;

  // Ensure lesson exists
  const lesson = await getRow('SELECT id, title FROM lessons WHERE id = $1', [lessonId]);
  if (!lesson) {
    throw new AppError('Lesson not found', 404, 'Lesson Not Found');
  }

  const workshop = await getRow(
    'SELECT id, lesson_id, is_enabled, spec, created_at, updated_at FROM lesson_workshops WHERE lesson_id = $1',
    [lessonId]
  );

  res.json({
    lesson: { id: lesson.id, title: lesson.title },
    workshop: workshop || null
  });
}));

// Create or replace workshop spec for a lesson
router.post('/lessons/:lessonId/workshop', [
  body('isEnabled').optional().isBoolean(),
  body('spec').isObject().withMessage('spec must be a JSON object')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorDetails = errors.array().reduce((acc, error) => { acc[error.path] = error.msg; return acc; }, {});
    const validationError = new AppError('Validation failed', 400, 'VALIDATION_ERROR');
    validationError.details = errorDetails;
    throw validationError;
  }

  const { lessonId } = req.params;
  const { isEnabled = false, spec } = req.body;

  // Ensure lesson exists
  const lesson = await getRow('SELECT id FROM lessons WHERE id = $1', [lessonId]);
  if (!lesson) {
    throw new AppError('Lesson not found', 404, 'Lesson Not Found');
  }

  // Store spec as-is (no normalization needed with new format)
  const normalizedSpec = { ...spec };

  // Upsert workshop
  const result = await query(
    `INSERT INTO lesson_workshops (lesson_id, is_enabled, spec)
     VALUES ($1, $2, $3)
     ON CONFLICT (lesson_id)
     DO UPDATE SET is_enabled = EXCLUDED.is_enabled, spec = EXCLUDED.spec, updated_at = CURRENT_TIMESTAMP
     RETURNING id, lesson_id, is_enabled, spec, created_at, updated_at`,
    [lessonId, isEnabled, normalizedSpec]
  );

  res.status(201).json({
    workshop: result.rows[0]
  });
}));

// Update workshop spec partially
router.put('/lessons/:lessonId/workshop', [
  body('isEnabled').optional().isBoolean(),
  body('spec').optional().isObject()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }

  const { lessonId } = req.params;
  const { isEnabled, spec } = req.body;

  // Ensure existing record
  const existing = await getRow('SELECT id, spec FROM lesson_workshops WHERE lesson_id = $1', [lessonId]);
  if (!existing) {
    throw new AppError('Workshop not found for lesson', 404, 'Workshop Not Found');
  }

  const updates = [];
  const params = [];
  let p = 0;
  if (typeof isEnabled === 'boolean') { p++; updates.push(`is_enabled = $${p}`); params.push(isEnabled); }
  if (spec !== undefined) {
    // Store spec as-is (no normalization needed with new format)
    const normalizedSpec = { ...spec };
    p++; updates.push(`spec = $${p}`); params.push(normalizedSpec);
  }
  if (updates.length === 0) {
    throw new AppError('No fields to update', 400, 'No Updates');
  }
  updates.push('updated_at = CURRENT_TIMESTAMP');
  p++; params.push(lessonId);

  const result = await query(
    `UPDATE lesson_workshops SET ${updates.join(', ')} WHERE lesson_id = $${p} RETURNING id, lesson_id, is_enabled, spec, created_at, updated_at`,
    params
  );

  res.json({ workshop: result.rows[0] });
}));

// Delete workshop spec for a lesson
router.delete('/lessons/:lessonId/workshop', asyncHandler(async (req, res) => {
  const { lessonId } = req.params;
  const existing = await getRow('SELECT id FROM lesson_workshops WHERE lesson_id = $1', [lessonId]);
  if (!existing) {
    throw new AppError('Workshop not found for lesson', 404, 'Workshop Not Found');
  }
  await query('DELETE FROM lesson_workshops WHERE lesson_id = $1', [lessonId]);
  res.json({ message: 'Workshop removed for lesson' });
}));

// Mark workshop as reviewed/unreviewed
router.put('/lessons/:lessonId/workshop/mark-reviewed', [
  body('isReviewed').isBoolean(),
  body('notes').optional().trim()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }

  const { lessonId } = req.params;
  const { isReviewed, notes } = req.body;

  const workshop = await getRow('SELECT id FROM lesson_workshops WHERE lesson_id = $1', [lessonId]);
  if (!workshop) {
    throw new AppError('Workshop not found for lesson', 404, 'Workshop Not Found');
  }

  const result = await query(
    `UPDATE lesson_workshops 
     SET is_reviewed = $1,
         reviewed_by = $2,
         reviewed_at = CURRENT_TIMESTAMP,
         review_notes = $3,
         updated_at = CURRENT_TIMESTAMP
     WHERE lesson_id = $4
     RETURNING *`,
    [isReviewed, req.user.id, notes || null, lessonId]
  );

  res.json({
    success: true,
    message: `Workshop marked as ${isReviewed ? 'reviewed' : 'not reviewed'}`,
    workshop: result.rows[0]
  });
}));

// ===== TEST MANAGEMENT =====

// Get test details
router.get('/tests/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const test = await getRow(
    `SELECT t.*, c.title as course_title, l.title as lesson_title
     FROM tests t
     LEFT JOIN courses c ON t.course_id = c.id
     LEFT JOIN lessons l ON t.lesson_id = l.id
     WHERE t.id = $1 AND t.deleted_at IS NULL`,
    [id]
  );

  if (!test) {
    throw new AppError('Test not found', 404, 'Test Not Found');
  }

  // Get questions
  const questions = await query(
    'SELECT * FROM test_questions WHERE test_id = $1 ORDER BY order_index ASC',
    [id]
  );

  // Get attempt statistics
  const attemptStats = await query(
    `SELECT 
       COUNT(*) as total_attempts,
       AVG(score) as average_score,
       COUNT(CASE WHEN score >= passing_score THEN 1 END) as passed_attempts
     FROM test_attempts ta
     JOIN tests t ON ta.test_id = t.id
     WHERE ta.test_id = $1 AND ta.status = 'completed'`,
    [id]
  );

  res.json({
    test,
    questions: questions.rows,
    statistics: attemptStats.rows[0]
  });
}));

// Update test
router.put('/tests/:id', [
  body('title').optional().trim().isLength({ min: 1 }),
  body('description').optional().trim(),
  body('durationMinutes').optional().isInt({ min: 1 }),
  body('passingScore').optional().isInt({ min: 0, max: 100 }),
  body('maxAttempts').optional().isInt({ min: 1 })
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }

  const { id } = req.params;
  const { title, description, durationMinutes, passingScore, maxAttempts } = req.body;

  // Check if test exists
  const existingTest = await getRow('SELECT id FROM tests WHERE id = $1', [id]);
  if (!existingTest) {
    throw new AppError('Test not found', 404, 'Test Not Found');
  }

  // Build update query
  const updates = [];
  const params = [];
  let paramCount = 0;

  if (title) {
    paramCount++;
    updates.push(`title = $${paramCount}`);
    params.push(title);
  }

  if (description !== undefined) {
    paramCount++;
    updates.push(`description = $${paramCount}`);
    params.push(description);
  }

  if (durationMinutes) {
    paramCount++;
    updates.push(`duration_minutes = $${paramCount}`);
    params.push(durationMinutes);
  }

  if (passingScore !== undefined) {
    paramCount++;
    updates.push(`passing_score = $${paramCount}`);
    params.push(passingScore);
  }

  if (maxAttempts) {
    paramCount++;
    updates.push(`max_attempts = $${paramCount}`);
    params.push(maxAttempts);
  }

  if (updates.length === 0) {
    throw new AppError('No fields to update', 400, 'No Updates');
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  paramCount++;
  params.push(id);

  const result = await query(
    `UPDATE tests SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    params
  );

  res.json({
    test: result.rows[0]
  });
}));

// Delete test
router.delete('/tests/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { permanent } = req.query;

  // Check if test exists
  const test = await getRow('SELECT id, title FROM tests WHERE id = $1', [id]);
  if (!test) {
    throw new AppError('Test not found', 404, 'Test Not Found');
  }

  // Soft delete (default)
  if (permanent !== 'true') {
    await query(
      'UPDATE tests SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
    return res.json({
      message: 'Test soft deleted successfully',
      note: 'Test is hidden but student attempts are preserved. Use restore endpoint to recover.',
      deletedAt: new Date().toISOString()
    });
  }

  // Check dependencies before permanent delete
  const attemptCount = await getRow('SELECT COUNT(*)::int as count FROM test_attempts WHERE test_id = $1', [id]);
  const questionCount = await getRow('SELECT COUNT(*)::int as count FROM test_questions WHERE test_id = $1', [id]);

  if (attemptCount.count > 0 || questionCount.count > 0) {
    throw new AppError(
      `Cannot permanently delete test with ${attemptCount.count} attempt(s) and ${questionCount.count} question(s).`,
      400,
      'Test Has Dependencies'
    );
  }

  await query('DELETE FROM tests WHERE id = $1', [id]);
  res.json({
    message: 'Test permanently deleted',
    warning: 'This action cannot be undone'
  });
}));

// Restore soft-deleted test
router.post('/tests/:id/restore', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const test = await getRow('SELECT id, title, deleted_at FROM tests WHERE id = $1', [id]);
  if (!test) {
    throw new AppError('Test not found', 404);
  }

  if (!test.deleted_at) {
    throw new AppError('Test is not deleted', 400, 'Not Deleted');
  }

  await query('UPDATE tests SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);

  res.json({
    message: 'Test restored successfully',
    testId: id,
    testTitle: test.title
  });
}));

// List deleted tests
router.get('/tests/deleted/list', asyncHandler(async (req, res) => {
  const deletedTests = await query(`
    SELECT t.id, t.title, t.course_id, c.title as course_title, t.deleted_at, t.created_at
    FROM tests t
    LEFT JOIN courses c ON t.course_id = c.id
    WHERE t.deleted_at IS NOT NULL
    ORDER BY t.deleted_at DESC
  `);

  res.json({
    deletedTests: deletedTests.rows,
    count: deletedTests.rows.length
  });
}));

// Get test questions
router.get('/tests/:id/questions', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const questions = await query(
    'SELECT * FROM test_questions WHERE test_id = $1 ORDER BY order_index ASC',
    [id]
  );

  res.json({
    questions: questions.rows
  });
}));

// Get flags for questions in a test (admin)
router.get('/tests/:id/question-flags', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Ensure test exists
  const test = await getRow('SELECT id FROM tests WHERE id = $1', [id]);
  if (!test) {
    throw new AppError('Test not found', 404, 'Test Not Found');
  }

  // Return flagged questions summary (no per-user flag rows in this model)
  const flaggedQuestions = await query(
    `SELECT q.id as question_id, q.question, q.flag_count, q.last_flagged_at
     FROM test_questions q
     WHERE q.test_id = $1 AND q.flagged = true
     ORDER BY q.last_flagged_at DESC`,
    [id]
  );

  res.json({ flaggedQuestions: flaggedQuestions.rows });
}));

// (Removed) per-flag resolve endpoint — per-question resolve is used instead

// Resolve a question (clear flagged state and mark all related flags resolved) - admin
router.post('/tests/:id/questions/:questionId/resolve', asyncHandler(async (req, res) => {
  const { id, questionId } = req.params;

  // Ensure question exists for the test
  const question = await getRow('SELECT id FROM test_questions WHERE id = $1 AND test_id = $2', [questionId, id]);
  if (!question) {
    throw new AppError('Question not found', 404, 'Question Not Found');
  }

  // Clear the flagged state on the question (do not reset historical count)
  await query('UPDATE test_questions SET flagged = false, last_flagged_at = NULL WHERE id = $1', [questionId]);

  // Note: we do not maintain per-user flag rows in the migration model; clearing
  // the flagged boolean on the question is sufficient for the admin resolve flow.

  res.json({ success: true, message: 'Question resolved: flagged state cleared and flags marked resolved' });
}));

// (Removed) admin test-level flag clearing — per-question flags should be handled via flags table

// (Removed) per-flag delete endpoint — detailed flag rows are not used in this model

// Add question to test
router.post('/tests/:id/questions', [
  body('question').trim().isLength({ min: 1 }).withMessage('Question text is required'),
  body('questionType').isIn(['multiple_choice', 'true_false', 'short_answer']).withMessage('Invalid question type'),
  body('options').optional().isArray().withMessage('Options must be an array if provided'),
  body('correctAnswer').optional().isInt({ min: 0 }).withMessage('Correct answer must be a non-negative integer if provided'),
  body('correctAnswerText').optional({ values: 'falsy' }).trim().isLength({ min: 1 }).withMessage('Correct answer text must be a non-empty string if provided'),
  body('points').optional().isInt({ min: 1 }).withMessage('Points must be at least 1 if provided'),
  body('orderIndex').optional().isInt({ min: 0 }).withMessage('Order index must be a non-negative integer if provided'),
  body('imageUrl').optional({ values: 'falsy' }).trim().isLength({ min: 1 }).withMessage('Image URL must be a non-empty string if provided')
], asyncHandler(async (req, res) => {
  console.log('Request body for question creation:', JSON.stringify(req.body, null, 2));
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors:', JSON.stringify(errors.array(), null, 2));
    const errorDetails = errors.array().reduce((acc, error) => {
      acc[error.path] = error.msg;
      return acc;
    }, {});
    
    const validationError = new AppError('Validation failed', 400, 'VALIDATION_ERROR');
    validationError.details = errorDetails;
    throw validationError;
  }

  const { id } = req.params;
  const { question, questionType, options, correctAnswer, correctAnswerText, points = 1, orderIndex, imageUrl } = req.body;

  // Check if test exists
  const existingTest = await getRow('SELECT id FROM tests WHERE id = $1', [id]);
  if (!existingTest) {
    throw new AppError('Test not found', 404, 'Test Not Found');
  }

  // Validate question type specific requirements
  if (questionType === 'multiple_choice') {
    if (!options || !Array.isArray(options) || options.length < 2) {
      throw new AppError('Multiple choice questions must have at least 2 options', 400, 'Invalid Question');
    }
    if (correctAnswer === undefined || correctAnswer < 0 || correctAnswer >= options.length) {
      throw new AppError('Valid correct answer index is required for multiple choice', 400, 'Invalid Answer');
    }
  } else if (questionType === 'true_false') {
    if (correctAnswer === undefined || ![0, 1].includes(correctAnswer)) {
      throw new AppError('Correct answer must be 0 (false) or 1 (true) for true/false questions', 400, 'Invalid Answer');
    }
  } else if (questionType === 'short_answer') {
    if (!correctAnswerText || correctAnswerText.trim().length === 0) {
      throw new AppError('Correct answer text is required for short answer questions', 400, 'Invalid Answer');
    }
  }

  // Get next order index if not provided
  let finalOrderIndex = orderIndex;
  if (finalOrderIndex === undefined) {
    const orderResult = await query(
      'SELECT COALESCE(MAX(order_index), 0) + 1 as next_order FROM test_questions WHERE test_id = $1',
      [id]
    );
    finalOrderIndex = orderResult.rows[0].next_order;
  }

  const result = await query(
    `INSERT INTO test_questions (test_id, question, question_type, options, correct_answer, correct_answer_text, points, order_index, image_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [id, question, questionType, JSON.stringify(options || []), correctAnswer, correctAnswerText, points, finalOrderIndex, imageUrl]
  );

  res.status(201).json({
    question: result.rows[0]
  });
}));

// Update question
router.put('/tests/:id/questions/:questionId', [
  body('question').optional().trim().isLength({ min: 1 }),
  body('questionType').optional().isIn(['multiple_choice', 'true_false', 'short_answer']),
  body('options').optional().isArray(),
  body('correctAnswer').optional().isInt({ min: 0 }),
  body('correctAnswerText').optional({ values: 'falsy' }).trim().isLength({ min: 1 }).withMessage('Correct answer text must be a non-empty string if provided'),
  body('points').optional().isInt({ min: 1 }),
  body('imageUrl').optional({ values: 'falsy' }).trim().isLength({ min: 1 }).withMessage('Image URL must be a non-empty string if provided')
], asyncHandler(async (req, res) => {
  console.log('Request body for question update:', JSON.stringify(req.body, null, 2));
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors:', JSON.stringify(errors.array(), null, 2));
    const errorDetails = errors.array().reduce((acc, error) => {
      acc[error.path] = error.msg;
      return acc;
    }, {});
    
    const validationError = new AppError('Validation failed', 400, 'VALIDATION_ERROR');
    validationError.details = errorDetails;
    throw validationError;
  }

  const { id, questionId } = req.params;
  const { question, questionType, options, correctAnswer, correctAnswerText, points, imageUrl } = req.body;

  // Check if question exists and belongs to test
  const existingQuestion = await getRow(
    'SELECT id FROM test_questions WHERE id = $1 AND test_id = $2',
    [questionId, id]
  );
  if (!existingQuestion) {
    throw new AppError('Question not found', 404, 'Question Not Found');
  }

  // Build update query
  const updates = [];
  const params = [];
  let paramCount = 0;

  if (question) {
    paramCount++;
    updates.push(`question = $${paramCount}`);
    params.push(question);
  }

  if (questionType) {
    paramCount++;
    updates.push(`question_type = $${paramCount}`);
    params.push(questionType);
  }

  if (options !== undefined) {
    paramCount++;
    updates.push(`options = $${paramCount}`);
    params.push(JSON.stringify(options));
  }

  if (correctAnswer !== undefined) {
    paramCount++;
    updates.push(`correct_answer = $${paramCount}`);
    params.push(correctAnswer);
  }

  if (correctAnswerText !== undefined) {
    paramCount++;
    updates.push(`correct_answer_text = $${paramCount}`);
    params.push(correctAnswerText);
  }

  if (points) {
    paramCount++;
    updates.push(`points = $${paramCount}`);
    params.push(points);
  }

  if (imageUrl !== undefined) {
    paramCount++;
    updates.push(`image_url = $${paramCount}`);
    params.push(imageUrl);
  }

  if (updates.length === 0) {
    throw new AppError('No fields to update', 400, 'No Updates');
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  paramCount++;
  params.push(questionId);

  const result = await query(
    `UPDATE test_questions SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    params
  );

  res.json({
    question: result.rows[0]
  });
}));

// Delete question
router.delete('/tests/:id/questions/:questionId', asyncHandler(async (req, res) => {
  const { id, questionId } = req.params;

  // Check if question exists and belongs to test
  const existingQuestion = await getRow(
    'SELECT id FROM test_questions WHERE id = $1 AND test_id = $2',
    [questionId, id]
  );
  if (!existingQuestion) {
    throw new AppError('Question not found', 404, 'Question Not Found');
  }

  await query('DELETE FROM test_questions WHERE id = $1', [questionId]);

  res.json({
    message: 'Question deleted successfully'
  });
}));

// Get test results/analytics
router.get('/tests/:id/results', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Get test details
  const test = await getRow(
    `SELECT t.*, c.title as course_title
     FROM tests t
     LEFT JOIN courses c ON t.course_id = c.id
     WHERE t.id = $1`,
    [id]
  );

  if (!test) {
    throw new AppError('Test not found', 404, 'Test Not Found');
  }

  // Get overview statistics
  const overview = await query(
    `SELECT 
       COUNT(*) as total_attempts,
       AVG(score) as average_score,
       COUNT(CASE WHEN score >= $1 THEN 1 END) as passed_attempts,
       ROUND(COUNT(CASE WHEN score >= $1 THEN 1 END) * 100.0 / COUNT(*), 2) as pass_rate,
       AVG(time_taken_minutes) as average_time
     FROM test_attempts 
     WHERE test_id = $2 AND status = 'completed'`,
    [test.passing_score, id]
  );

  // Get student results
  const studentResults = await query(
    `SELECT 
       ta.id,
       u.first_name,
       u.last_name,
       u.email,
       ta.score,
       ta.completed_at,
       ta.time_taken_minutes,
       ta.attempt_number,
       CASE WHEN ta.score >= $1 THEN 'passed' ELSE 'failed' END as status
     FROM test_attempts ta
     JOIN users u ON ta.user_id = u.id
     WHERE ta.test_id = $2 AND ta.status = 'completed'
     ORDER BY ta.completed_at DESC`,
    [test.passing_score, id]
  );

  // Get question analytics
  const questionAnalytics = await query(
    `SELECT 
       tq.id,
       tq.question,
       tq.question_type,
       COUNT(taa.id) as total_answers,
       COUNT(CASE WHEN taa.is_correct = true THEN 1 END) as correct_answers,
       ROUND(COUNT(CASE WHEN taa.is_correct = true THEN 1 END) * 100.0 / COUNT(taa.id), 2) as correct_rate
     FROM test_questions tq
     LEFT JOIN test_attempt_answers taa ON tq.id = taa.question_id
     WHERE tq.test_id = $1
     GROUP BY tq.id, tq.question, tq.question_type
     ORDER BY tq.order_index`,
    [id]
  );

  res.json({
    test,
    overview: overview.rows[0],
    studentResults: studentResults.rows,
    questionAnalytics: questionAnalytics.rows
  });
}));

// Mark test question as reviewed/unreviewed
router.put('/tests/:testId/questions/:questionId/mark-reviewed', [
  body('isReviewed').isBoolean(),
  body('notes').optional().trim()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }

  const { testId, questionId } = req.params;
  const { isReviewed, notes } = req.body;

  const question = await getRow(
    'SELECT id, question FROM test_questions WHERE id = $1 AND test_id = $2',
    [questionId, testId]
  );
  
  if (!question) {
    throw new AppError('Question not found', 404, 'Question Not Found');
  }

  const result = await query(
    `UPDATE test_questions 
     SET is_reviewed = $1,
         reviewed_by = $2,
         reviewed_at = CURRENT_TIMESTAMP,
         review_notes = $3,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $4
     RETURNING *`,
    [isReviewed, req.user.id, notes || null, questionId]
  );

  res.json({
    success: true,
    message: `Question marked as ${isReviewed ? 'reviewed' : 'not reviewed'}`,
    question: result.rows[0]
  });
}));

// Bulk mark questions as reviewed/unreviewed
router.put('/tests/:testId/questions/bulk-mark-reviewed', [
  body('questionIds').isArray().withMessage('questionIds must be an array'),
  body('isReviewed').isBoolean(),
  body('notes').optional().trim()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }

  const { testId } = req.params;
  const { questionIds, isReviewed, notes } = req.body;

  if (questionIds.length === 0) {
    throw new AppError('No question IDs provided', 400, 'Invalid Request');
  }

  const result = await query(
    `UPDATE test_questions 
     SET is_reviewed = $1,
         reviewed_by = $2,
         reviewed_at = CURRENT_TIMESTAMP,
         review_notes = $3,
         updated_at = CURRENT_TIMESTAMP
     WHERE test_id = $4 AND id = ANY($5)
     RETURNING id, question, is_reviewed`,
    [isReviewed, req.user.id, notes || null, testId, questionIds]
  );

  res.json({
    success: true,
    message: `${result.rows.length} question(s) marked as ${isReviewed ? 'reviewed' : 'not reviewed'}`,
    questions: result.rows
  });
}));

// ===== SPONSORSHIP MANAGEMENT =====

// Get all sponsorships with admin details
router.get('/sponsorships', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, sponsor, search } = req.query;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE s.deleted_at IS NULL';
  const params = [];
  let paramCount = 0;

  if (status) {
    paramCount++;
    whereClause += ` AND s.status = $${paramCount}`;
    params.push(status);
  }

  if (sponsor) {
    paramCount++;
    whereClause += ` AND (u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount})`;
    params.push(`%${sponsor}%`);
  }

  if (search) {
    paramCount++;
    whereClause += ` AND (s.discount_code ILIKE $${paramCount} OR u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount})`;
    params.push(`%${search}%`);
  }

  // Get total count
  const countResult = await getRow(
    `SELECT COUNT(DISTINCT s.id) as total FROM sponsorships s 
     LEFT JOIN users u ON s.sponsor_id = u.id
     ${whereClause}`,
    params
  );
  const total = parseInt(countResult.total);

  // Get sponsorships
  const sponsorships = await getRows(
    `SELECT s.*, 
            u.first_name as sponsor_first_name, u.last_name as sponsor_last_name,
            array_agg(DISTINCT c.title) as course_titles,
            array_agg(DISTINCT c.id) as course_ids,
            COUNT(DISTINCT su.id) as usage_count
     FROM sponsorships s
     LEFT JOIN users u ON s.sponsor_id = u.id
     LEFT JOIN sponsorship_courses sc ON s.id = sc.sponsorship_id
     LEFT JOIN courses c ON sc.course_id = c.id
     LEFT JOIN sponsorship_usage su ON s.id = su.sponsorship_id
     ${whereClause}
     GROUP BY s.id, u.first_name, u.last_name
     ORDER BY s.created_at DESC
     LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
    [...params, limit, offset]
  );

  res.json({
    sponsorships,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

// Create sponsorship
router.post('/sponsorships', [
  body('sponsorId').isUUID().withMessage('Valid sponsor ID is required'),
  body('courseIds').isArray({ min: 1 }).withMessage('At least one course ID is required'),
  body('courseIds.*').isUUID().withMessage('All course IDs must be valid UUIDs'),
  body('discountCode').optional().isString().trim().isLength({ min: 3, max: 50 }).withMessage('Discount code must be 3-50 characters'),
  body('discountType').isIn(['percentage', 'fixed']).withMessage('Discount type must be percentage or fixed'),
  body('discountValue').isFloat({ min: 0 }).withMessage('Discount value must be a positive number'),
  body('maxStudents').isInt({ min: 1 }).withMessage('Maximum students must be at least 1'),
  body('startDate').isDate().withMessage('Valid start date is required'),
  body('endDate').isDate().withMessage('Valid end date is required'),
  body('notes').optional().trim().isString().withMessage('Notes must be a string')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors:', errors.array());
    const errorDetails = errors.array().reduce((acc, error) => {
      acc[error.path] = error.msg;
      return acc;
    }, {});
    throw new AppError('Validation failed', 400, 'Validation Error', errorDetails);
  }

  const { sponsorId, courseIds, discountCode: customDiscountCode, discountType, discountValue, maxStudents, startDate, endDate, notes } = req.body;

  // If custom discount code is provided, validate it's unique
  if (customDiscountCode) {
    const existing = await getRow('SELECT id FROM sponsorships WHERE discount_code = $1', [customDiscountCode]);
    if (existing) {
      throw new AppError('Discount code already exists. Please choose a different code.', 409, 'Code Already Exists');
    }
  }

  // Check if sponsor exists and is a sponsor
  const sponsor = await getRow(
    'SELECT id, role FROM users WHERE id = $1 AND role = $2',
    [sponsorId, 'sponsor']
  );
  if (!sponsor) {
    throw new AppError('Sponsor not found', 404, 'Sponsor Not Found');
  }

  // Check if all courses exist
  const courseChecks = await Promise.all(courseIds.map(async (courseId) => {
    const course = await getRow('SELECT id FROM courses WHERE id = $1', [courseId]);
    if (!course) {
      throw new AppError(`Course with ID ${courseId} not found`, 404, 'Course Not Found');
    }
    return course;
  }));

  // Generate unique discount code if not provided
  let discountCode;
  
  if (customDiscountCode) {
    discountCode = customDiscountCode;
  } else {
    const generateDiscountCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < 10; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    let isUnique = false;
    while (!isUnique) {
      discountCode = generateDiscountCode();
      const existing = await getRow('SELECT id FROM sponsorships WHERE discount_code = $1', [discountCode]);
      if (!existing) {
        isUnique = true;
      }
    }
  }

  // Create sponsorship
  const result = await query(
    `INSERT INTO sponsorships (sponsor_id, discount_code, discount_type, discount_value, max_students, start_date, end_date, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [sponsorId, discountCode, discountType, discountValue, maxStudents, startDate, endDate, notes]
  );

  const sponsorship = result.rows[0];

  // Link sponsorship to all courses
  const courseLinkPromises = courseIds.map(async (courseId) => {
    await query(
      `INSERT INTO sponsorship_courses (sponsorship_id, course_id) VALUES ($1, $2)`,
      [sponsorship.id, courseId]
    );
  });

  await Promise.all(courseLinkPromises);

  res.status(201).json({
    sponsorship: {
      ...sponsorship,
      courseIds: courseIds
    }
  });
}));

// Update sponsorship
router.put('/sponsorships/:id', [
  body('discountType').optional().isIn(['percentage', 'fixed']),
  body('discountValue').optional().isFloat({ min: 0 }),
  body('maxStudents').optional().isInt({ min: 1 }),
  body('startDate').optional().isDate(),
  body('endDate').optional().isDate(),
  body('status').optional().isIn(['active', 'paused', 'expired', 'completed']),
  body('notes').optional().trim()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }

  const { id } = req.params;
  const { discountType, discountValue, maxStudents, startDate, endDate, status, notes } = req.body;

  // Check if sponsorship exists
  const existingSponsorship = await getRow('SELECT id FROM sponsorships WHERE id = $1', [id]);
  if (!existingSponsorship) {
    throw new AppError('Sponsorship not found', 404, 'Sponsorship Not Found');
  }

  // Build update query
  const updates = [];
  const params = [];
  let paramCount = 0;

  if (discountType) {
    paramCount++;
    updates.push(`discount_type = $${paramCount}`);
    params.push(discountType);
  }

  if (discountValue !== undefined) {
    paramCount++;
    updates.push(`discount_value = $${paramCount}`);
    params.push(discountValue);
  }

  if (maxStudents) {
    paramCount++;
    updates.push(`max_students = $${paramCount}`);
    params.push(maxStudents);
  }

  if (startDate) {
    paramCount++;
    updates.push(`start_date = $${paramCount}`);
    params.push(startDate);
  }

  if (endDate) {
    paramCount++;
    updates.push(`end_date = $${paramCount}`);
    params.push(endDate);
  }

  if (status) {
    paramCount++;
    updates.push(`status = $${paramCount}`);
    params.push(status);
  }

  if (notes !== undefined) {
    paramCount++;
    updates.push(`notes = $${paramCount}`);
    params.push(notes);
  }

  if (updates.length === 0) {
    throw new AppError('No fields to update', 400, 'No Updates');
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  paramCount++;
  params.push(id);

  const result = await query(
    `UPDATE sponsorships SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    params
  );

  res.json({
    sponsorship: result.rows[0]
  });
}));

// Update sponsorship status
router.put('/sponsorships/:id/status', [
  body('status')
    .isIn(['active', 'paused', 'expired', 'completed'])
    .withMessage('Status must be one of active, paused, expired, completed')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorDetails = errors.array().reduce((acc, error) => {
      acc[error.path] = error.msg;
      return acc;
    }, {});
    throw new AppError('Validation failed', 400, 'Validation Error', errorDetails);
  }

  const { id } = req.params;
  const { status } = req.body;

  // Check if sponsorship exists
  const existingSponsorship = await getRow('SELECT id FROM sponsorships WHERE id = $1', [id]);
  if (!existingSponsorship) {
    throw new AppError('Sponsorship not found', 404, 'Sponsorship Not Found');
  }

  const result = await query(
    'UPDATE sponsorships SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
    [status, id]
  );

  res.json({
    sponsorship: result.rows[0]
  });
}));

// Delete sponsorship
router.delete('/sponsorships/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { permanent } = req.query;

  // Check if sponsorship exists
  const sponsorship = await getRow('SELECT id, discount_code FROM sponsorships WHERE id = $1', [id]);
  if (!sponsorship) {
    throw new AppError('Sponsorship not found', 404, 'Sponsorship Not Found');
  }

  // Soft delete (STRONGLY RECOMMENDED for financial records)
  if (permanent !== 'true') {
    await query(
      'UPDATE sponsorships SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
    return res.json({
      message: 'Sponsorship soft deleted successfully',
      note: 'Sponsorship is hidden but financial records are preserved for audit compliance.',
      deletedAt: new Date().toISOString(),
      warning: 'Permanent deletion of financial records is not recommended.'
    });
  }

  // Permanent delete - check dependencies
  const usageCount = await getRow('SELECT COUNT(*)::int as count FROM sponsorship_usage WHERE sponsorship_id = $1', [id]);
  const paymentCount = await getRow('SELECT COUNT(*)::int as count FROM payments WHERE sponsorship_id = $1', [id]);
  const courseCount = await getRow('SELECT COUNT(*)::int as count FROM sponsorship_courses WHERE sponsorship_id = $1', [id]);

  const totalDeps = usageCount.count + paymentCount.count + courseCount.count;

  if (totalDeps > 0) {
    throw new AppError(
      `Cannot permanently delete sponsorship with ${usageCount.count} usage record(s), ${paymentCount.count} payment(s), and ${courseCount.count} linked course(s). Financial records must be retained for audit purposes.`,
      400,
      'Sponsorship Has Dependencies'
    );
  }

  await query('DELETE FROM sponsorships WHERE id = $1', [id]);
  res.json({
    message: 'Sponsorship permanently deleted',
    warning: 'This action cannot be undone. Ensure this complies with financial record retention policies.'
  });
}));

// Restore soft-deleted sponsorship
router.post('/sponsorships/:id/restore', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const sponsorship = await getRow('SELECT id, discount_code, deleted_at FROM sponsorships WHERE id = $1', [id]);
  if (!sponsorship) {
    throw new AppError('Sponsorship not found', 404);
  }

  if (!sponsorship.deleted_at) {
    throw new AppError('Sponsorship is not deleted', 400, 'Not Deleted');
  }

  await query('UPDATE sponsorships SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);

  res.json({
    message: 'Sponsorship restored successfully',
    sponsorshipId: id,
    discountCode: sponsorship.discount_code
  });
}));

// List deleted sponsorships
router.get('/sponsorships/deleted/list', asyncHandler(async (req, res) => {
  const deletedSponsorships = await query(`
    SELECT id, discount_code, sponsor_id, deleted_at, created_at
    FROM sponsorships
    WHERE deleted_at IS NOT NULL
    ORDER BY deleted_at DESC
  `);

  res.json({
    deletedSponsorships: deletedSponsorships.rows,
    count: deletedSponsorships.rows.length
  });
}));

// Get sponsorship usage
router.get('/sponsorships/:id/usage', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if sponsorship exists
  const sponsorship = await getRow('SELECT id FROM sponsorships WHERE id = $1', [id]);
  if (!sponsorship) {
    throw new AppError('Sponsorship not found', 404, 'Sponsorship Not Found');
  }

  const usage = await query(
    `SELECT su.*, u.first_name, u.last_name, u.email
     FROM sponsorship_usage su
     JOIN users u ON su.student_id = u.id
     WHERE su.sponsorship_id = $1
     ORDER BY su.used_at DESC`,
    [id]
  );

  res.json({
    usage: usage.rows
  });
}));

// ===== CLASS MANAGEMENT =====

// Get all classes with admin details
router.get('/classes', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, instructor, search } = req.query;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE c.deleted_at IS NULL'; // Exclude soft-deleted classes
  const params = [];
  let paramCount = 0;

  if (status) {
    paramCount++;
    whereClause += ` AND c.status = $${paramCount}`;
    params.push(status);
  }

  if (instructor) {
    paramCount++;
    whereClause += ` AND (u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount})`;
    params.push(`%${instructor}%`);
  }

  if (search) {
    paramCount++;
    whereClause += ` AND (c.title ILIKE $${paramCount} OR c.description ILIKE $${paramCount})`;
    params.push(`%${search}%`);
  }

  // Get total count
  const countResult = await getRow(
    `SELECT COUNT(*) as total FROM classes c 
     LEFT JOIN users u ON c.instructor_id = u.id ${whereClause}`,
    params
  );
  const total = parseInt(countResult.total);

  // Get classes
  const classes = await getRows(
    `SELECT c.*, 
            u.first_name as instructor_first_name, u.last_name as instructor_last_name,
            COUNT(e.id) as enrollment_count,
            COUNT(CASE WHEN e.status = 'completed' THEN 1 END) as completion_count
     FROM classes c
     LEFT JOIN users u ON c.instructor_id = u.id
     LEFT JOIN enrollments e ON c.id = e.class_id
     ${whereClause}
     GROUP BY c.id, u.first_name, u.last_name
     ORDER BY c.start_date DESC
     LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
    [...params, limit, offset]
  );

  res.json({
    classes,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

// Create class
router.post('/classes', [
  body('title').trim().isLength({ min: 1 }),
  body('description').trim().isLength({ min: 1 }),
  body('topic').trim().isLength({ min: 1 }),
  body('type').isIn(['online', 'offline']),
  body('price').isFloat({ min: 0 }),
  body('duration').trim().isLength({ min: 1 }),
  body('instructorId').isUUID(),
  body('startDate').isDate(),
  body('endDate').isDate(),
  body('maxStudents').isInt({ min: 1 }),
  body('location').optional().trim(),
  body('meetingLink').optional().trim()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }

  const { title, description, topic, type, price, duration, instructorId, startDate, endDate, maxStudents, location, meetingLink } = req.body;

  // Check if instructor exists and is an instructor
  const instructor = await getRow(
    'SELECT id, role FROM users WHERE id = $1 AND role = $2',
    [instructorId, 'instructor']
  );
  if (!instructor) {
    throw new AppError('Instructor not found', 404, 'Instructor Not Found');
  }

  const result = await query(
    `INSERT INTO classes (title, description, topic, type, price, duration, instructor_id, start_date, end_date, max_students, location, meeting_link)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [title, description, topic, type, price, duration, instructorId, startDate, endDate, maxStudents, location, meetingLink]
  );

  res.status(201).json({
    class: result.rows[0]
  });
}));

// Update class
router.put('/classes/:id', [
  body('title').optional().trim().isLength({ min: 1 }),
  body('description').optional().trim().isLength({ min: 1 }),
  body('topic').optional().trim().isLength({ min: 1 }),
  body('type').optional().isIn(['online', 'offline']),
  body('price').optional().isFloat({ min: 0 }),
  body('duration').optional().trim().isLength({ min: 1 }),
  body('startDate').optional().isDate(),
  body('endDate').optional().isDate(),
  body('maxStudents').optional().isInt({ min: 1 }),
  body('location').optional().trim(),
  body('meetingLink').optional().trim(),
  body('isPublished').optional().isBoolean()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }

  const { id } = req.params;
  const { title, description, topic, type, price, duration, startDate, endDate, maxStudents, location, meetingLink, isPublished } = req.body;

  // Check if class exists
  const existingClass = await getRow('SELECT id FROM classes WHERE id = $1', [id]);
  if (!existingClass) {
    throw new AppError('Class not found', 404, 'Class Not Found');
  }

  // Build update query
  const updates = [];
  const params = [];
  let paramCount = 0;

  if (title) {
    paramCount++;
    updates.push(`title = $${paramCount}`);
    params.push(title);
  }

  if (description) {
    paramCount++;
    updates.push(`description = $${paramCount}`);
    params.push(description);
  }

  if (topic) {
    paramCount++;
    updates.push(`topic = $${paramCount}`);
    params.push(topic);
  }

  if (type) {
    paramCount++;
    updates.push(`type = $${paramCount}`);
    params.push(type);
  }

  if (price !== undefined) {
    paramCount++;
    updates.push(`price = $${paramCount}`);
    params.push(price);
  }

  if (duration) {
    paramCount++;
    updates.push(`duration = $${paramCount}`);
    params.push(duration);
  }

  if (startDate) {
    paramCount++;
    updates.push(`start_date = $${paramCount}`);
    params.push(startDate);
  }

  if (endDate) {
    paramCount++;
    updates.push(`end_date = $${paramCount}`);
    params.push(endDate);
  }

  if (maxStudents) {
    paramCount++;
    updates.push(`max_students = $${paramCount}`);
    params.push(maxStudents);
  }

  if (location !== undefined) {
    paramCount++;
    updates.push(`location = $${paramCount}`);
    params.push(location);
  }

  if (meetingLink !== undefined) {
    paramCount++;
    updates.push(`meeting_link = $${paramCount}`);
    params.push(meetingLink);
  }

  if (typeof isPublished === 'boolean') {
    paramCount++;
    updates.push(`is_published = $${paramCount}`);
    params.push(isPublished);
  }

  if (updates.length === 0) {
    throw new AppError('No fields to update', 400, 'No Updates');
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  paramCount++;
  params.push(id);

  const result = await query(
    `UPDATE classes SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    params
  );

  res.json({
    class: result.rows[0]
  });
}));

// Delete class (soft delete)
router.delete('/classes/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { permanent } = req.query; // Allow permanent deletion via query param (dangerous!)

  // Check if class exists and is not already deleted
  const existingClass = await getRow(
    'SELECT id, title, deleted_at FROM classes WHERE id = $1',
    [id]
  );

  if (!existingClass) {
    throw new AppError('Class not found', 404, 'Class Not Found');
  }

  if (existingClass.deleted_at && permanent !== 'true') {
    throw new AppError('Class is already deleted', 400, 'Already Deleted');
  }

  // Soft delete (default - safe)
  if (permanent !== 'true') {
    await query(
      'UPDATE classes SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    res.json({
      message: 'Class soft deleted successfully',
      note: 'Class is hidden but data is preserved. Use restore endpoint to recover.',
      deletedAt: new Date().toISOString()
    });
    return;
  }

  // Permanent deletion (requires explicit permanent=true)
  // Check for dependencies
  const enrollmentCount = await getRow(
    'SELECT COUNT(*) as count FROM enrollments WHERE class_id = $1',
    [id]
  );

  const paymentCount = await getRow(
    'SELECT COUNT(*) as count FROM payments WHERE class_id = $1',
    [id]
  );

  // Build error message for related records
  const issues = [];
  if (enrollmentCount.count > 0) {
    issues.push(`${enrollmentCount.count} enrollment(s)`);
  }
  if (paymentCount.count > 0) {
    issues.push(`${paymentCount.count} payment record(s)`);
  }

  if (issues.length > 0) {
    throw new AppError(
      `Cannot permanently delete class with ${issues.join(' and ')}. These records will be orphaned.`,
      400,
      'Class Has Dependencies'
    );
  }

  // Permanent delete
  await query('DELETE FROM classes WHERE id = $1', [id]);

  res.json({
    message: 'Class permanently deleted',
    warning: 'This action cannot be undone'
  });
}));

// Restore soft-deleted class
router.post('/classes/:id/restore', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if class exists and is deleted
  const classItem = await getRow(
    'SELECT id, title, deleted_at FROM classes WHERE id = $1',
    [id]
  );

  if (!classItem) {
    throw new AppError('Class not found', 404, 'Class Not Found');
  }

  if (!classItem.deleted_at) {
    throw new AppError('Class is not deleted', 400, 'Not Deleted');
  }

  // Restore the class
  await query(
    'UPDATE classes SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
    [id]
  );

  res.json({
    message: 'Class restored successfully',
    classId: id,
    classTitle: classItem.title
  });
}));

// List deleted classes
router.get('/classes/deleted/list', asyncHandler(async (req, res) => {
  const deletedClasses = await query(`
    SELECT 
      id, 
      title, 
      topic,
      instructor_id,
      deleted_at,
      created_at
    FROM classes
    WHERE deleted_at IS NOT NULL
    ORDER BY deleted_at DESC
  `);

  res.json({
    deletedClasses: deletedClasses.rows,
    count: deletedClasses.rows.length
  });
}));

// Get class enrollments
router.get('/classes/:id/enrollments', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if class exists
  const classData = await getRow('SELECT id FROM classes WHERE id = $1', [id]);
  if (!classData) {
    throw new AppError('Class not found', 404, 'Class Not Found');
  }

  const enrollments = await query(
    `SELECT e.*, u.first_name, u.last_name, u.email, u.role
     FROM enrollments e
     JOIN users u ON e.user_id = u.id
     WHERE e.class_id = $1
     ORDER BY e.enrolled_at DESC`,
    [id]
  );

  res.json({
    enrollments: enrollments.rows
  });
}));

// ===== DISCUSSION MANAGEMENT =====

// Get all discussions with admin details
router.get('/discussions', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type, author, search } = req.query;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE d.deleted_at IS NULL';
  const params = [];
  let paramCount = 0;

  if (type) {
    paramCount++;
    whereClause += ` AND d.type = $${paramCount}`;
    params.push(type);
  }

  if (author) {
    paramCount++;
    whereClause += ` AND (u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount})`;
    params.push(`%${author}%`);
  }

  if (search) {
    paramCount++;
    whereClause += ` AND (d.title ILIKE $${paramCount} OR d.content ILIKE $${paramCount})`;
    params.push(`%${search}%`);
  }

  // Get total count
  const countResult = await getRow(
    `SELECT COUNT(*) as total FROM discussions d 
     LEFT JOIN users u ON d.author_id = u.id ${whereClause}`,
    params
  );
  const total = parseInt(countResult.total);

  // Get discussions
  const discussions = await getRows(
    `SELECT d.*, 
            u.first_name as author_first_name, u.last_name as author_last_name,
            c.title as course_title,
            cl.title as class_title,
            COUNT(dr.id) as reply_count
     FROM discussions d
     LEFT JOIN users u ON d.author_id = u.id
     LEFT JOIN courses c ON d.course_id = c.id
     LEFT JOIN classes cl ON d.class_id = cl.id
     LEFT JOIN discussion_replies dr ON d.id = dr.discussion_id
     ${whereClause}
     GROUP BY d.id, u.first_name, u.last_name, c.title, cl.title
     ORDER BY d.created_at DESC
     LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
    [...params, limit, offset]
  );

  res.json({
    discussions,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

// Update discussion
router.put('/discussions/:id', [
  body('title').optional().trim().isLength({ min: 1 }),
  body('content').optional().trim().isLength({ min: 1 }),
  body('isPinned').optional().isBoolean(),
  body('isLocked').optional().isBoolean()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }

  const { id } = req.params;
  const { title, content, isPinned, isLocked } = req.body;

  // Check if discussion exists
  const existingDiscussion = await getRow('SELECT id FROM discussions WHERE id = $1', [id]);
  if (!existingDiscussion) {
    throw new AppError('Discussion not found', 404, 'Discussion Not Found');
  }

  // Build update query
  const updates = [];
  const params = [];
  let paramCount = 0;

  if (title) {
    paramCount++;
    updates.push(`title = $${paramCount}`);
    params.push(title);
  }

  if (content) {
    paramCount++;
    updates.push(`content = $${paramCount}`);
    params.push(content);
  }

  if (typeof isPinned === 'boolean') {
    paramCount++;
    updates.push(`is_pinned = $${paramCount}`);
    params.push(isPinned);
  }

  if (typeof isLocked === 'boolean') {
    paramCount++;
    updates.push(`is_locked = $${paramCount}`);
    params.push(isLocked);
  }

  if (updates.length === 0) {
    throw new AppError('No fields to update', 400, 'No Updates');
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  paramCount++;
  params.push(id);

  const result = await query(
    `UPDATE discussions SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    params
  );

  res.json({
    discussion: result.rows[0]
  });
}));

// Delete discussion
router.delete('/discussions/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { permanent } = req.query;

  // Check if discussion exists
  const discussion = await getRow('SELECT id, title FROM discussions WHERE id = $1', [id]);
  if (!discussion) {
    throw new AppError('Discussion not found', 404, 'Discussion Not Found');
  }

  // Soft delete (default)
  if (permanent !== 'true') {
    await query(
      'UPDATE discussions SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
    return res.json({
      message: 'Discussion soft deleted successfully',
      note: 'Discussion is hidden but replies are preserved. Use restore endpoint to recover.',
      deletedAt: new Date().toISOString()
    });
  }

  // Check dependencies before permanent delete
  const replyCount = await getRow('SELECT COUNT(*)::int as count FROM discussion_replies WHERE discussion_id = $1', [id]);
  const likeCount = await getRow('SELECT COUNT(*)::int as count FROM discussion_likes WHERE discussion_id = $1', [id]);

  if (replyCount.count > 0 || likeCount.count > 0) {
    throw new AppError(
      `Cannot permanently delete discussion with ${replyCount.count} reply(ies) and ${likeCount.count} like(s).`,
      400,
      'Discussion Has Dependencies'
    );
  }

  await query('DELETE FROM discussions WHERE id = $1', [id]);
  res.json({
    message: 'Discussion permanently deleted',
    warning: 'This action cannot be undone'
  });
}));

// Restore soft-deleted discussion
router.post('/discussions/:id/restore', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const discussion = await getRow('SELECT id, title, deleted_at FROM discussions WHERE id = $1', [id]);
  if (!discussion) {
    throw new AppError('Discussion not found', 404);
  }

  if (!discussion.deleted_at) {
    throw new AppError('Discussion is not deleted', 400, 'Not Deleted');
  }

  await query('UPDATE discussions SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);

  res.json({
    message: 'Discussion restored successfully',
    discussionId: id,
    discussionTitle: discussion.title
  });
}));

// List deleted discussions
router.get('/discussions/deleted/list', asyncHandler(async (req, res) => {
  const deletedDiscussions = await query(`
    SELECT d.id, d.title, d.author_id, u.name as author_name, d.deleted_at, d.created_at
    FROM discussions d
    LEFT JOIN users u ON d.author_id = u.id
    WHERE d.deleted_at IS NOT NULL
    ORDER BY d.deleted_at DESC
  `);

  res.json({
    deletedDiscussions: deletedDiscussions.rows,
    count: deletedDiscussions.rows.length
  });
}));

// Get discussion replies
router.get('/discussions/:id/replies', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if discussion exists
  const discussion = await getRow('SELECT id FROM discussions WHERE id = $1', [id]);
  if (!discussion) {
    throw new AppError('Discussion not found', 404, 'Discussion Not Found');
  }

  const replies = await query(
    `SELECT dr.*, u.first_name, u.last_name, u.email, u.role
     FROM discussion_replies dr
     JOIN users u ON dr.author_id = u.id
     WHERE dr.discussion_id = $1
     ORDER BY dr.created_at ASC`,
    [id]
  );

  res.json({
    replies: replies.rows
  });
}));

// Delete discussion reply
router.delete('/discussions/:id/replies/:replyId', asyncHandler(async (req, res) => {
  const { id, replyId } = req.params;

  // Check if reply exists and belongs to discussion
  const existingReply = await getRow(
    'SELECT id FROM discussion_replies WHERE id = $1 AND discussion_id = $2',
    [replyId, id]
  );
  if (!existingReply) {
    throw new AppError('Reply not found', 404, 'Reply Not Found');
  }

  await query('DELETE FROM discussion_replies WHERE id = $1', [replyId]);

  res.json({
    message: 'Reply deleted successfully'
  });
}));

// ===== CERTIFICATION MANAGEMENT =====

// Get all certifications with admin details
router.get('/certifications', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, student, search } = req.query;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE 1=1';
  const params = [];
  let paramCount = 0;

  if (status) {
    paramCount++;
    whereClause += ` AND c.status = $${paramCount}`;
    params.push(status);
  }

  if (student) {
    paramCount++;
    whereClause += ` AND (u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount})`;
    params.push(`%${student}%`);
  }

  if (search) {
    paramCount++;
    whereClause += ` AND (c.title ILIKE $${paramCount} OR c.issuer_name ILIKE $${paramCount})`;
    params.push(`%${search}%`);
  }

  // Get total count
  const countResult = await getRow(
    `SELECT COUNT(*) as total FROM certifications c 
     LEFT JOIN users u ON c.student_id = u.id ${whereClause}`,
    params
  );
  const total = parseInt(countResult.total);

  // Get certifications
  const certifications = await getRows(
    `SELECT c.*, 
            u.first_name as student_first_name, u.last_name as student_last_name,
            u.email as student_email
     FROM certifications c
     LEFT JOIN users u ON c.student_id = u.id
     ${whereClause}
     ORDER BY c.issued_at DESC
     LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
    [...params, limit, offset]
  );

  res.json({
    certifications,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

// Create certification
router.post('/certifications', [
  body('studentId').isUUID(),
  body('title').trim().isLength({ min: 1 }),
  body('description').optional().trim(),
  body('issuerName').trim().isLength({ min: 1 }),
  body('issueDate').isDate(),
  body('expiryDate').optional().isDate(),
  body('certificateUrl').optional().trim(),
  body('verificationCode').optional().trim()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }

  const { studentId, title, description, issuerName, issueDate, expiryDate, certificateUrl, verificationCode } = req.body;

  // Check if student exists
  const student = await getRow('SELECT id FROM users WHERE id = $1', [studentId]);
  if (!student) {
    throw new AppError('Student not found', 404, 'Student Not Found');
  }

  // Generate verification code if not provided
  const finalVerificationCode = verificationCode || Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

  const result = await query(
    `INSERT INTO certifications (student_id, title, description, issuer_name, issued_at, expiry_date, certificate_url, verification_code, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
     RETURNING *`,
    [studentId, title, description, issuerName, issueDate, expiryDate, certificateUrl, finalVerificationCode]
  );

  res.status(201).json({
    certification: result.rows[0]
  });
}));

// Update certification
router.put('/certifications/:id', [
  body('title').optional().trim().isLength({ min: 1 }),
  body('description').optional().trim(),
  body('issuerName').optional().trim().isLength({ min: 1 }),
  body('issueDate').optional().isDate(),
  body('expiryDate').optional().isDate(),
  body('certificateUrl').optional().trim(),
  body('status').optional().isIn(['active', 'expired', 'revoked'])
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }

  const { id } = req.params;
  const { title, description, issuerName, issueDate, expiryDate, certificateUrl, status } = req.body;

  // Check if certification exists
  const existingCertification = await getRow('SELECT id FROM certifications WHERE id = $1', [id]);
  if (!existingCertification) {
    throw new AppError('Certification not found', 404, 'Certification Not Found');
  }

  // Build update query
  const updates = [];
  const params = [];
  let paramCount = 0;

  if (title) {
    paramCount++;
    updates.push(`title = $${paramCount}`);
    params.push(title);
  }

  if (description !== undefined) {
    paramCount++;
    updates.push(`description = $${paramCount}`);
    params.push(description);
  }

  if (issuerName) {
    paramCount++;
    updates.push(`issuer_name = $${paramCount}`);
    params.push(issuerName);
  }

  if (issueDate) {
    paramCount++;
    updates.push(`issued_at = $${paramCount}`);
    params.push(issueDate);
  }

  if (expiryDate !== undefined) {
    paramCount++;
    updates.push(`expiry_date = $${paramCount}`);
    params.push(expiryDate);
  }

  if (certificateUrl !== undefined) {
    paramCount++;
    updates.push(`certificate_url = $${paramCount}`);
    params.push(certificateUrl);
  }

  if (status) {
    paramCount++;
    updates.push(`status = $${paramCount}`);
    params.push(status);
  }

  if (updates.length === 0) {
    throw new AppError('No fields to update', 400, 'No Updates');
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  paramCount++;
  params.push(id);

  const result = await query(
    `UPDATE certifications SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    params
  );

  res.json({
    certification: result.rows[0]
  });
}));

// Delete certification
router.delete('/certifications/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if certification exists
  const existingCertification = await getRow('SELECT id FROM certifications WHERE id = $1', [id]);
  if (!existingCertification) {
    throw new AppError('Certification not found', 404, 'Certification Not Found');
  }

  await query('DELETE FROM certifications WHERE id = $1', [id]);

  res.json({
    message: 'Certification deleted successfully'
  });
}));

// ===== SYSTEM SETTINGS =====

// Get system settings
router.get('/settings', asyncHandler(async (req, res) => {
  const settings = await query('SELECT * FROM system_settings ORDER BY key');
  
  // Convert to key-value object
  const settingsObject = {};
  settings.rows.forEach(row => {
    settingsObject[row.key] = row.value;
  });

  res.json({
    settings: settingsObject
  });
}));

// Update system settings
router.put('/settings', [
  body('settings').isObject()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }

  const { settings } = req.body;

  // Update each setting
  for (const [key, value] of Object.entries(settings)) {
    await query(
      `INSERT INTO system_settings (key, value, updated_at) 
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (key) 
       DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP`,
      [key, value]
    );
  }

  // Clear settings cache after update
  clearSettingsCache();

  res.json({
    message: 'Settings updated successfully'
  });
}));

// ===== PAYMENT MANAGEMENT =====

// Get payment history
router.get('/payments', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, paymentMethod, search } = req.query;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE 1=1';
  const params = [];
  let paramCount = 0;

  if (status) {
    paramCount++;
    whereClause += ` AND p.status = $${paramCount}`;
    params.push(status);
  }

  if (paymentMethod) {
    paramCount++;
    whereClause += ` AND p.payment_method = $${paramCount}`;
    params.push(paymentMethod);
  }

  if (search) {
    paramCount++;
    whereClause += ` AND (u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount} OR p.transaction_id ILIKE $${paramCount})`;
    params.push(`%${search}%`);
  }

  // Get total count
  const countResult = await getRow(
    `SELECT COUNT(*) as total FROM payments p 
     LEFT JOIN users u ON p.user_id = u.id ${whereClause}`,
    params
  );
  const total = parseInt(countResult.total);

  // Get payments
  const payments = await getRows(
    `SELECT p.*, 
            u.first_name, u.last_name, u.email,
            c.title as course_title,
            cl.title as class_title
     FROM payments p
     LEFT JOIN users u ON p.user_id = u.id
     LEFT JOIN courses c ON p.course_id = c.id
     LEFT JOIN classes cl ON p.class_id = cl.id
     ${whereClause}
     ORDER BY p.created_at DESC
     LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
    [...params, limit, offset]
  );

  res.json({
    payments,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

// Get payment statistics
router.get('/payments/stats', asyncHandler(async (req, res) => {
  const { period = '30' } = req.query;

  const paymentStats = await getRow(`
    SELECT 
      COUNT(*) as total_payments,
      SUM(CASE WHEN status = 'successful' THEN amount ELSE 0 END) as total_revenue,
      COUNT(CASE WHEN status = 'successful' THEN 1 END) as successful_payments,
      COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payments,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payments,
      AVG(CASE WHEN status = 'successful' THEN amount END) as average_payment
    FROM payments 
    WHERE created_at >= CURRENT_DATE - INTERVAL '${period} days'
  `);

  const methodStats = await getRows(`
    SELECT 
      payment_method,
      COUNT(*) as count,
      SUM(amount) as total_amount
    FROM payments 
    WHERE status = 'successful' AND created_at >= CURRENT_DATE - INTERVAL '${period} days'
    GROUP BY payment_method
    ORDER BY total_amount DESC
  `);

  const dailyStats = await getRows(`
    SELECT 
      DATE_TRUNC('day', created_at) as date,
      COUNT(*) as payment_count,
      SUM(CASE WHEN status = 'successful' THEN amount ELSE 0 END) as daily_revenue
    FROM payments 
    WHERE created_at >= CURRENT_DATE - INTERVAL '${period} days'
    GROUP BY DATE_TRUNC('day', created_at)
    ORDER BY date DESC
  `);

  res.json({
    overview: paymentStats,
    methodBreakdown: methodStats,
    dailyStats: dailyStats
  });
}));

// Create a new test for a lesson (admin only)
router.post('/lessons/:lessonId/tests', asyncHandler(async (req, res) => {
  const { lessonId } = req.params;
  const { title, description, durationMinutes, passingScore, maxAttempts, questions } = req.body;

  // Cap maxAttempts by system setting if configured
  const { getSystemSetting } = require('../utils/systemSettings');
  const configuredMaxAttempts = parseInt(await getSystemSetting('max_test_attempts', '3'));
  const maxAllowedAttempts = Number.isFinite(configuredMaxAttempts) && configuredMaxAttempts > 0 ? configuredMaxAttempts : 3;
  const effectiveMaxAttempts = Math.min(maxAttempts, maxAllowedAttempts);

  // Validate required fields
  if (!title || !durationMinutes || !passingScore || !maxAttempts) {
    throw new AppError('Missing required fields: title, durationMinutes, passingScore, and maxAttempts are required', 400, 'VALIDATION_ERROR');
  }

  // Validate questions array if provided
  if (questions && !Array.isArray(questions)) {
    throw new AppError('Questions must be an array', 400, 'VALIDATION_ERROR');
  }

  // Check that the lesson exists
  const lesson = await getRow('SELECT id, course_id FROM lessons WHERE id = $1', [lessonId]);
  if (!lesson) throw new AppError('Lesson not found', 404, 'Lesson Not Found');

  // Insert the test
  const testResult = await query(
    `INSERT INTO tests (course_id, lesson_id, title, description, duration_minutes, passing_score, max_attempts, order_index, is_published)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [lesson.course_id, lessonId, title, description, durationMinutes, passingScore, effectiveMaxAttempts, 0, true]
  );
  const test = testResult.rows[0];

  // Insert questions if provided
  const insertedQuestions = [];
  if (questions && questions.length > 0) {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question || !q.questionType || q.points === undefined || q.orderIndex === undefined) {
        throw new AppError('Each question must have question, questionType, points, and orderIndex', 400, 'VALIDATION_ERROR');
      }
    
    // Handle options JSON properly
    let optionsJson = null;
    if (q.options) {
      try {
        // If options is already an array, stringify it
        if (Array.isArray(q.options)) {
          optionsJson = JSON.stringify(q.options);
        } else if (typeof q.options === 'string') {
          // If it's a string, try to parse it to validate JSON
          JSON.parse(q.options);
          optionsJson = q.options;
        } else {
          // For any other type, stringify it
          optionsJson = JSON.stringify(q.options);
        }
      } catch (error) {
        throw new AppError(`Invalid JSON format for question ${i + 1} options: ${error.message}`, 400, 'VALIDATION_ERROR');
      }
    }
    
    const result = await query(
      `INSERT INTO test_questions (test_id, question, question_type, options, correct_answer, points, order_index, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [test.id, q.question, q.questionType, optionsJson, q.correctAnswer, q.points, q.orderIndex, q.imageUrl || null]
    );
    insertedQuestions.push(result.rows[0]);
    }
  }

  res.status(201).json({
    test,
    questions: insertedQuestions
  });
}));

// Get tests for a lesson (admin only)
router.get('/lessons/:lessonId/tests', asyncHandler(async (req, res) => {
  const { lessonId } = req.params;

  // Verify lesson exists
  const lesson = await getRow('SELECT * FROM lessons WHERE id = $1', [lessonId]);
  if (!lesson) {
    throw new AppError('Lesson not found', 404, 'Lesson Not Found');
  }

  // Get all tests for this lesson with additional statistics
  const tests = await getRows(
    `SELECT t.*, 
            COUNT(DISTINCT tq.id) as question_count,
            COUNT(DISTINCT ta.id) as attempt_count,
            AVG(ta.score) as average_score,
            COUNT(CASE WHEN ta.score >= t.passing_score THEN 1 END) as passed_attempts
     FROM tests t
     LEFT JOIN test_questions tq ON t.id = tq.test_id
     LEFT JOIN test_attempts ta ON t.id = ta.test_id AND ta.status = 'completed'
     WHERE t.lesson_id = $1
     GROUP BY t.id
     ORDER BY t.order_index ASC`,
    [lessonId]
  );

  res.json({
    lesson: {
      id: lesson.id,
      title: lesson.title,
      courseId: lesson.course_id
    },
    tests: tests.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      durationMinutes: t.duration_minutes,
      passingScore: t.passing_score,
      maxAttempts: t.max_attempts,
      orderIndex: t.order_index,
      isPublished: t.is_published,
      questionCount: parseInt(t.question_count),
      attemptCount: parseInt(t.attempt_count),
      averageScore: t.average_score ? parseFloat(t.average_score) : null,
      passedAttempts: parseInt(t.passed_attempts),
      createdAt: t.created_at,
      updatedAt: t.updated_at
    }))
  });
}));

// Get a single system setting
router.get('/settings/:key', asyncHandler(async (req, res) => {
  const { key } = req.params;
  const result = await getRow('SELECT * FROM system_settings WHERE key = $1', [key]);
  if (!result) {
    return res.status(404).json({ error: 'Setting not found' });
  }
  res.json(result);
}));

// Create a new system setting
router.post('/settings', [
  body('key').isString().isLength({ min: 1 }),
  body('value').optional()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }
  const { key, value } = req.body;
  // Check if exists
  const exists = await getRow('SELECT 1 FROM system_settings WHERE key = $1', [key]);
  if (exists) {
    return res.status(409).json({ error: 'Setting already exists' });
  }
  await query('INSERT INTO system_settings (key, value) VALUES ($1, $2)', [key, value]);
  clearSettingsCache();
  res.status(201).json({ message: 'Setting created' });
}));

// Update a single system setting
router.put('/settings/:key', [
  body('value').isString()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }
  const { key } = req.params;
  const { value } = req.body;
  const result = await query(
    `UPDATE system_settings SET value = $1, updated_at = CURRENT_TIMESTAMP WHERE key = $2 RETURNING *`,
    [value, key]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Setting not found' });
  }
  clearSettingsCache();
  res.json({ message: 'Setting updated', setting: result.rows[0] });
}));

// Delete a system setting
router.delete('/settings/:key', asyncHandler(async (req, res) => {
  const { key } = req.params;
  const result = await query('DELETE FROM system_settings WHERE key = $1 RETURNING *', [key]);
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Setting not found' });
  }
  clearSettingsCache();
  res.json({ message: 'Setting deleted' });
}));

// ===== DISCUSSION CATEGORIES MANAGEMENT =====

// Create new discussion category
router.post('/discussions/categories', [
  body('key').isString().isLength({ min: 1, max: 50 }).matches(/^[a-z0-9_-]+$/),
  body('name').isString().isLength({ min: 1, max: 100 }),
  body('description').optional().isString().isLength({ max: 500 }),
  body('icon').isString().isLength({ min: 1, max: 10 }),
  body('color').optional().isString().isLength({ min: 3, max: 7 }).matches(/^#[0-9A-Fa-f]{3,6}$/),
  body('sortOrder').optional().isInt({ min: 0 }),
  body('isActive').optional().isBoolean()
], asyncHandler(async (req, res) => {
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

  const { key, name, description, icon, color = '#6B7280', sortOrder = 0, isActive = true } = req.body;

  // Check if key already exists
  const existing = await getRow('SELECT id FROM discussion_categories WHERE key = $1', [key]);
  if (existing) {
    throw new AppError('Category key already exists', 409, 'DUPLICATE_KEY');
  }

  const result = await query(
    `INSERT INTO discussion_categories (key, name, description, icon, color, sort_order, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [key, name, description, icon, color, sortOrder, isActive]
  );

  const category = result.rows[0];
  res.status(201).json({
    message: 'Discussion category created successfully',
    category: {
      id: category.id,
      key: category.key,
      name: category.name,
      description: category.description,
      icon: category.icon,
      color: category.color,
      sortOrder: category.sort_order,
      isActive: category.is_active,
      createdAt: category.created_at,
      updatedAt: category.updated_at
    }
  });
}));

// Update discussion category
router.put('/discussions/categories/:id', [
  body('name').optional().isString().isLength({ min: 1, max: 100 }),
  body('description').optional().isString().isLength({ max: 500 }),
  body('icon').optional().isString().isLength({ min: 1, max: 10 }),
  body('color').optional().isString().isLength({ min: 3, max: 7 }).matches(/^#[0-9A-Fa-f]{3,6}$/),
  body('sortOrder').optional().isInt({ min: 0 }),
  body('isActive').optional().isBoolean()
], asyncHandler(async (req, res) => {
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
  const { name, description, icon, color, sortOrder, isActive } = req.body;

  // Check if category exists
  const existing = await getRow('SELECT * FROM discussion_categories WHERE id = $1', [id]);
  if (!existing) {
    throw new AppError('Discussion category not found', 404, 'NOT_FOUND');
  }

  // Build update query dynamically
  const updates = [];
  const values = [];
  let paramCount = 0;

  if (name !== undefined) {
    paramCount++;
    updates.push(`name = $${paramCount}`);
    values.push(name);
  }
  if (description !== undefined) {
    paramCount++;
    updates.push(`description = $${paramCount}`);
    values.push(description);
  }
  if (icon !== undefined) {
    paramCount++;
    updates.push(`icon = $${paramCount}`);
    values.push(icon);
  }
  if (color !== undefined) {
    paramCount++;
    updates.push(`color = $${paramCount}`);
    values.push(color);
  }
  if (sortOrder !== undefined) {
    paramCount++;
    updates.push(`sort_order = $${paramCount}`);
    values.push(sortOrder);
  }
  if (isActive !== undefined) {
    paramCount++;
    updates.push(`is_active = $${paramCount}`);
    values.push(isActive);
  }

  if (updates.length === 0) {
    throw new AppError('No fields to update', 400, 'NO_UPDATES');
  }

  paramCount++;
  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  const result = await query(
    `UPDATE discussion_categories SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    values
  );

  const category = result.rows[0];
  res.json({
    message: 'Discussion category updated successfully',
    category: {
      id: category.id,
      key: category.key,
      name: category.name,
      description: category.description,
      icon: category.icon,
      color: category.color,
      sortOrder: category.sort_order,
      isActive: category.is_active,
      createdAt: category.created_at,
      updatedAt: category.updated_at
    }
  });
}));

// Delete discussion category
router.delete('/discussions/categories/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if category exists
  const existing = await getRow('SELECT * FROM discussion_categories WHERE id = $1', [id]);
  if (!existing) {
    throw new AppError('Discussion category not found', 404, 'NOT_FOUND');
  }

  // Check if category is being used by any discussions
  const usageCount = await getRow(
    'SELECT COUNT(*) as count FROM discussions WHERE category = $1',
    [existing.key]
  );

  if (parseInt(usageCount.count) > 0) {
    throw new AppError(
      `Cannot delete category: ${parseInt(usageCount.count)} discussion(s) are using this category`,
      409,
      'CATEGORY_IN_USE'
    );
  }

  await query('DELETE FROM discussion_categories WHERE id = $1', [id]);

  res.json({
    message: 'Discussion category deleted successfully'
  });
}));

// Get discussion category statistics
router.get('/discussions/categories/:id/stats', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if category exists
  const category = await getRow('SELECT * FROM discussion_categories WHERE id = $1', [id]);
  if (!category) {
    throw new AppError('Discussion category not found', 404, 'NOT_FOUND');
  }

  // Get usage statistics
  const stats = await getRow(
    `SELECT 
      COUNT(*) as total_discussions,
      COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as discussions_this_week,
      COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as discussions_this_month,
      AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as avg_hours_to_last_activity
     FROM discussions 
     WHERE category = $1`,
    [category.key]
  );

  res.json({
    category: {
      id: category.id,
      key: category.key,
      name: category.name,
      icon: category.icon,
      color: category.color
    },
    stats: {
      totalDiscussions: parseInt(stats.total_discussions),
      discussionsThisWeek: parseInt(stats.discussions_this_week),
      discussionsThisMonth: parseInt(stats.discussions_this_month),
      avgHoursToLastActivity: stats.avg_hours_to_last_activity ? parseFloat(stats.avg_hours_to_last_activity) : null
    }
  });
}));

module.exports = router; 