const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, getRow, getRows } = require('../database/config');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authenticateToken, authorizeInstructor, authorizeOwnerOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Browse courses (public endpoint) - MUST be before /:id routes
router.get('/browse', asyncHandler(async (req, res) => {
  const { 
    topic, 
    instructor, 
    level, 
    price_min, 
    price_max, 
    sort = 'created_at', 
    order = 'desc',
    page = 1,
    limit = 12
  } = req.query;

  let whereConditions = ['c.is_published = true'];
  let params = [];
  let paramIndex = 1;

  // Add filters
  if (topic) {
    whereConditions.push(`c.topic ILIKE $${paramIndex}`);
    params.push(`%${topic}%`);
    paramIndex++;
  }

  if (instructor) {
    whereConditions.push(`(u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex})`);
    params.push(`%${instructor}%`);
    paramIndex++;
  }

  if (level) {
    whereConditions.push(`c.level = $${paramIndex}`);
    params.push(level);
    paramIndex++;
  }

  if (price_min) {
    whereConditions.push(`c.price >= $${paramIndex}`);
    params.push(parseFloat(price_min));
    paramIndex++;
  }

  if (price_max) {
    whereConditions.push(`c.price <= $${paramIndex}`);
    params.push(parseFloat(price_max));
    paramIndex++;
  }

  // Validate sort field
  const allowedSortFields = ['created_at', 'title', 'price', 'rating', 'student_count'];
  const sortField = allowedSortFields.includes(sort) ? sort : 'created_at';
  const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  // Calculate offset
  const offset = (parseInt(page) - 1) * parseInt(limit);

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total
    FROM courses c
    JOIN users u ON c.instructor_id = u.id
    WHERE ${whereConditions.join(' AND ')}
  `;
  
  const countResult = await getRow(countQuery, params);
  const total = parseInt(countResult.total);

  // Get courses
  const coursesQuery = `
    SELECT 
      c.id, c.title, c.description, c.topic, c.type, c.price, c.image_url,
      c.duration, c.rating, c.student_count, c.difficulty, c.objectives, 
      c.prerequisites, c.syllabus, c.tags, c.created_at,
      u.id as instructor_id, u.first_name as instructor_first_name, 
      u.last_name as instructor_last_name, u.avatar_url as instructor_avatar,
      (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id AND l.is_published = true) as lesson_count
    FROM courses c
    JOIN users u ON c.instructor_id = u.id
    WHERE ${whereConditions.join(' AND ')}
    ORDER BY c.${sortField} ${sortOrder}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  params.push(parseInt(limit), offset);
  const courses = await getRows(coursesQuery, params);

  res.json({
    courses: courses.map(course => ({
      id: course.id,
      title: course.title,
      description: course.description,
      topic: course.topic,
      type: course.type,
      price: course.price,
      imageUrl: course.image_url,
      duration: course.duration,
      rating: course.rating,
      studentCount: course.student_count,
      difficulty: course.difficulty,
      objectives: course.objectives,
      prerequisites: course.prerequisites,
      syllabus: course.syllabus,
      tags: course.tags,
      lessonCount: course.lesson_count,
      createdAt: course.created_at,
      instructor: {
        id: course.instructor_id,
        firstName: course.instructor_first_name,
        lastName: course.instructor_last_name,
        avatarUrl: course.instructor_avatar
      }
    })),
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit))
    }
  });
}));

// Validation middleware
const validateCourse = [
  body('title').trim().isLength({ min: 1 }).withMessage('Course title is required'),
  body('description').trim().isLength({ min: 10 }).withMessage('Course description must be at least 10 characters'),
  body('topic').trim().isLength({ min: 1 }).withMessage('Course topic is required'),
  body('type').isIn(['online', 'offline']).withMessage('Course type must be online or offline'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
  body('duration').trim().isLength({ min: 1 }).withMessage('Course duration is required'),
  body('certification').optional().isString().withMessage('Certification must be a string'),
  body('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced']).withMessage('Difficulty must be beginner, intermediate, or advanced'),
  body('objectives').optional().isString().withMessage('Objectives must be a string'),
  body('prerequisites').optional().isString().withMessage('Prerequisites must be a string'),
  body('syllabus').optional().isString().withMessage('Syllabus must be a string'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('imageUrl').optional().isURL().withMessage('Image URL must be a valid URL')
];

const validateEnrollment = [
  body('sponsorshipId').optional().isUUID().withMessage('Valid sponsorship ID is required')
];

// Get all courses
router.get('/', asyncHandler(async (req, res) => {
  const { topic, type, instructorId, isPublished, limit = 20, offset = 0 } = req.query;

  let whereClause = 'WHERE 1=1';
  let params = [];
  let paramIndex = 1;

  if (topic) {
    whereClause += ` AND c.topic ILIKE $${paramIndex}`;
    params.push(`%${topic}%`);
    paramIndex++;
  }

  if (type) {
    whereClause += ` AND c.type = $${paramIndex}`;
    params.push(type);
    paramIndex++;
  }

  if (instructorId) {
    whereClause += ` AND c.instructor_id = $${paramIndex}`;
    params.push(instructorId);
    paramIndex++;
  }

  if (isPublished !== undefined) {
    whereClause += ` AND c.is_published = $${paramIndex}`;
    params.push(isPublished === 'true');
    paramIndex++;
  }

  const courses = await getRows(
    `SELECT c.*, u.first_name as instructor_first_name, u.last_name as instructor_last_name
     FROM courses c
     LEFT JOIN users u ON c.instructor_id = u.id
     ${whereClause}
     ORDER BY c.created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, parseInt(limit), parseInt(offset)]
  );

  res.json({
    courses: courses.map(c => ({
      id: c.id,
      title: c.title,
      description: c.description,
      topic: c.topic,
      type: c.type,
      certification: c.certification,
      price: c.price,
      rating: c.rating,
      studentCount: c.student_count,
      duration: c.duration,
      difficulty: c.difficulty,
      objectives: c.objectives,
      prerequisites: c.prerequisites,
      syllabus: c.syllabus,
      tags: c.tags,
      instructorId: c.instructor_id,
      instructorName: c.instructor_id ? `${c.instructor_first_name} ${c.instructor_last_name}` : null,
      imageUrl: c.image_url,
      isPublished: c.is_published,
      createdAt: c.created_at,
      updatedAt: c.updated_at
    }))
  });
}));

// Create new course
router.post('/', authenticateToken, authorizeInstructor, validateCourse, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }

  const {
    title, description, topic, type, certification, price, duration, difficulty, objectives, prerequisites, syllabus, tags, imageUrl
  } = req.body;
  const instructorId = req.user.id;

  const result = await query(
    `INSERT INTO courses (
      title, description, topic, type, certification, price, duration, 
      difficulty, objectives, prerequisites, syllabus, tags,
      instructor_id, image_url
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *`,
    [title, description, topic, type, certification, price, duration, difficulty, objectives, prerequisites, syllabus, tags, instructorId, imageUrl]
  );

  const course = result.rows[0];

  res.status(201).json({
    id: course.id,
    title: course.title,
    description: course.description,
    topic: course.topic,
    type: course.type,
    certification: course.certification,
    price: course.price,
    duration: course.duration,
    difficulty: course.difficulty,
    objectives: course.objectives,
    prerequisites: course.prerequisites,
    syllabus: course.syllabus,
    tags: course.tags,
    instructorId: course.instructor_id,
    imageUrl: course.image_url,
    isPublished: course.is_published,
    createdAt: course.created_at
  });
}));

// Get course by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const course = await getRow(
    `SELECT c.*, u.first_name as instructor_first_name, u.last_name as instructor_last_name,
            u.avatar_url as instructor_avatar, u.bio as instructor_bio
     FROM courses c
     LEFT JOIN users u ON c.instructor_id = u.id
     WHERE c.id = $1`,
    [id]
  );

  if (!course) {
    throw new AppError('Course not found', 404, 'Course Not Found');
  }

  res.json({
    id: course.id,
    title: course.title,
    description: course.description,
    topic: course.topic,
    type: course.type,
    certification: course.certification,
    price: course.price,
    rating: course.rating,
    studentCount: course.student_count,
    duration: course.duration,
    difficulty: course.difficulty,
    objectives: course.objectives,
    prerequisites: course.prerequisites,
    syllabus: course.syllabus,
    tags: course.tags,
    instructorId: course.instructor_id,
    instructorName: course.instructor_id ? `${course.instructor_first_name} ${course.instructor_last_name}` : null,
    instructorAvatar: course.instructor_avatar,
    instructorBio: course.instructor_bio,
    imageUrl: course.image_url,
    isPublished: course.is_published,
    createdAt: course.created_at,
    updatedAt: course.updated_at
  });
}));

// Update course
router.put('/:id', authenticateToken, authorizeOwnerOrAdmin('courses', 'id'), validateCourse, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }

  const { id } = req.params;
  const {
    title, description, topic, type, certification, price, duration, difficulty, objectives, prerequisites, syllabus, tags, imageUrl, isPublished
  } = req.body;

  // Verify course exists
  const course = await getRow('SELECT * FROM courses WHERE id = $1', [id]);
  if (!course) {
    throw new AppError('Course not found', 404, 'Course Not Found');
  }

  // Update course
  const result = await query(
    `UPDATE courses 
     SET title = COALESCE($1, title),
         description = COALESCE($2, description),
         topic = COALESCE($3, topic),
         type = COALESCE($4, type),
         certification = COALESCE($5, certification),
         price = COALESCE($6, price),
         duration = COALESCE($7, duration),
         difficulty = COALESCE($8, difficulty),
         objectives = COALESCE($9, objectives),
         prerequisites = COALESCE($10, prerequisites),
         syllabus = COALESCE($11, syllabus),
         tags = COALESCE($12, tags),
         image_url = COALESCE($13, image_url),
         is_published = COALESCE($14, is_published),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $15
     RETURNING *`,
    [title, description, topic, type, certification, price, duration, difficulty, objectives, prerequisites, syllabus, tags, imageUrl, isPublished, id]
  );

  const updatedCourse = result.rows[0];

  res.json({
    id: updatedCourse.id,
    title: updatedCourse.title,
    description: updatedCourse.description,
    topic: updatedCourse.topic,
    type: updatedCourse.type,
    certification: updatedCourse.certification,
    price: updatedCourse.price,
    duration: updatedCourse.duration,
    difficulty: updatedCourse.difficulty,
    objectives: updatedCourse.objectives,
    prerequisites: updatedCourse.prerequisites,
    syllabus: updatedCourse.syllabus,
    tags: updatedCourse.tags,
    imageUrl: updatedCourse.image_url,
    isPublished: updatedCourse.is_published,
    updatedAt: updatedCourse.updated_at
  });
}));

// Delete course
router.delete('/:id', authenticateToken, authorizeOwnerOrAdmin('courses', 'id'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if course has enrollments
  const enrollments = await getRow('SELECT id FROM enrollments WHERE course_id = $1 LIMIT 1', [id]);
  if (enrollments) {
    throw new AppError('Cannot delete course that has enrollments', 400, 'Course Has Enrollments');
  }

  await query('DELETE FROM courses WHERE id = $1', [id]);

  res.json({
    message: 'Course deleted successfully'
  });
}));

// Get course lessons
router.get('/:id/lessons', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Verify course exists
  const course = await getRow('SELECT * FROM courses WHERE id = $1', [id]);
  if (!course) {
    throw new AppError('Course not found', 404, 'Course Not Found');
  }

  const lessons = await getRows(
    'SELECT * FROM lessons WHERE course_id = $1 ORDER BY order_index',
    [id]
  );

  res.json({
    lessons: lessons.map(l => ({
      id: l.id,
      title: l.title,
      description: l.description,
      content: l.content,
      videoUrl: l.video_url,
      durationMinutes: l.duration_minutes,
      orderIndex: l.order_index,
      isPublished: l.is_published,
      createdAt: l.created_at
    }))
  });
}));

// Get course tests
router.get('/:id/tests', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Verify course exists
  const course = await getRow('SELECT * FROM courses WHERE id = $1', [id]);
  if (!course) {
    throw new AppError('Course not found', 404, 'Course Not Found');
  }

  const tests = await getRows(
    'SELECT * FROM tests WHERE course_id = $1 ORDER BY order_index',
    [id]
  );

  res.json({
    tests: tests.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      durationMinutes: t.duration_minutes,
      passingScore: t.passing_score,
      maxAttempts: t.max_attempts,
      orderIndex: t.order_index,
      isPublished: t.is_published,
      createdAt: t.created_at
    }))
  });
}));

// Get course enrollments
router.get('/:id/enrollments', authenticateToken, authorizeOwnerOrAdmin('courses', 'id'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Verify course exists
  const course = await getRow('SELECT * FROM courses WHERE id = $1', [id]);
  if (!course) {
    throw new AppError('Course not found', 404, 'Course Not Found');
  }

  const enrollments = await getRows(
    `SELECT e.*, u.first_name, u.last_name, u.email, u.avatar_url
     FROM enrollments e
     JOIN users u ON e.user_id = u.id
     WHERE e.course_id = $1
     ORDER BY e.enrolled_at DESC`,
    [id]
  );

  res.json({
    enrollments: enrollments.map(e => ({
      id: e.id,
      userId: e.user_id,
      userName: `${e.first_name} ${e.last_name}`,
      userEmail: e.email,
      userAvatar: e.avatar_url,
      progress: e.progress,
      status: e.status,
      sponsorshipId: e.sponsorship_id,
      enrolledAt: e.enrolled_at,
      completedAt: e.completed_at
    }))
  });
}));

// Enroll in course
router.post('/:id/enroll', authenticateToken, validateEnrollment, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }

  const { id } = req.params;
  const { sponsorshipId } = req.body;
  const userId = req.user.id;

  // Verify course exists and is published
  const course = await getRow('SELECT * FROM courses WHERE id = $1 AND is_published = true', [id]);
  if (!course) {
    throw new AppError('Course not found or not published', 404, 'Course Not Found');
  }

  // Check if user is already enrolled
  const existingEnrollment = await getRow(
    'SELECT * FROM enrollments WHERE course_id = $1 AND user_id = $2',
    [id, userId]
  );

  if (existingEnrollment) {
    throw new AppError('User is already enrolled in this course', 400, 'Already Enrolled');
  }

  // Verify sponsorship if provided
  if (sponsorshipId) {
    const sponsorship = await getRow(
      'SELECT * FROM sponsorships WHERE id = $1 AND course_id = $2 AND status = $3',
      [sponsorshipId, id, 'active']
    );

    if (!sponsorship) {
      throw new AppError('Invalid or inactive sponsorship', 400, 'Invalid Sponsorship');
    }

    // Check if sponsorship has been used by this user
    const sponsorshipUsage = await getRow(
      'SELECT * FROM sponsorship_usage WHERE sponsorship_id = $1 AND student_id = $2',
      [sponsorshipId, userId]
    );

    if (!sponsorshipUsage) {
      throw new AppError('Sponsorship has not been used by this user', 400, 'Sponsorship Not Used');
    }
  }

  // Create enrollment
  const result = await query(
    `INSERT INTO enrollments (
      user_id, course_id, enrollment_type, sponsorship_id
    ) VALUES ($1, $2, $3, $4)
    RETURNING *`,
    [userId, id, 'course', sponsorshipId]
  );

  const enrollment = result.rows[0];

  // Update course student count
  await query(
    'UPDATE courses SET student_count = student_count + 1 WHERE id = $1',
    [id]
  );

  res.status(201).json({
    id: enrollment.id,
    userId: enrollment.user_id,
    courseId: enrollment.course_id,
    enrollmentType: enrollment.enrollment_type,
    progress: enrollment.progress,
    status: enrollment.status,
    sponsorshipId: enrollment.sponsorship_id,
    enrolledAt: enrollment.enrolled_at
  });
}));

// Update enrollment progress
router.put('/:id/enrollments/:enrollmentId', authenticateToken, asyncHandler(async (req, res) => {
  const { id, enrollmentId } = req.params;
  const { progress, status } = req.body;
  const userId = req.user.id;

  // Verify enrollment exists and belongs to user
  const enrollment = await getRow(
    'SELECT * FROM enrollments WHERE id = $1 AND course_id = $2 AND user_id = $3',
    [enrollmentId, id, userId]
  );

  if (!enrollment) {
    throw new AppError('Enrollment not found', 404, 'Enrollment Not Found');
  }

  // Update enrollment
  const result = await query(
    `UPDATE enrollments 
     SET progress = COALESCE($1, progress),
         status = COALESCE($2, status),
         completed_at = CASE WHEN $2 = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END
     WHERE id = $3
     RETURNING *`,
    [progress, status, enrollmentId]
  );

  const updatedEnrollment = result.rows[0];

  res.json({
    id: updatedEnrollment.id,
    progress: updatedEnrollment.progress,
    status: updatedEnrollment.status,
    completedAt: updatedEnrollment.completed_at
  });
}));

// Get course analytics (admin/instructor only)
router.get('/:id/analytics', authenticateToken, authorizeOwnerOrAdmin('courses', 'id'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Get all test IDs for this course (course-level and lesson-level)
  const testRows = await getRows(
    `SELECT t.id, t.passing_score
     FROM tests t
     LEFT JOIN lessons l ON t.lesson_id = l.id
     WHERE t.course_id = $1 OR l.course_id = $1`,
    [id]
  );
  if (!testRows.length) {
    return res.json({
      totalTests: 0,
      totalAttempts: 0,
      averageScore: 0,
      passRate: 0,
      averageTimeMinutes: 0,
      questionAnalytics: []
    });
  }
  const testIds = testRows.map(t => t.id);
  const passingScores = Object.fromEntries(testRows.map(t => [t.id, t.passing_score]));

  // Aggregate attempts and stats for all those tests
  const stats = await getRow(
    `SELECT 
       COUNT(*) as total_attempts,
       AVG(a.score) as average_score,
       COUNT(CASE WHEN a.score >= t.passing_score THEN 1 END) as passed_attempts,
       AVG(a.time_taken_minutes) as average_time_minutes
     FROM test_attempts a
     JOIN tests t ON a.test_id = t.id
     WHERE a.test_id = ANY($1) AND a.status = 'completed'`,
    [testIds]
  );

  // Calculate pass rate
  const passRate = stats.total_attempts > 0 
    ? Math.round((stats.passed_attempts / stats.total_attempts) * 100 * 10) / 10
    : 0;

  // Efficient question analytics: aggregate per question across all tests in the course
  const questionAnalytics = await getRows(
    `SELECT 
       q.id,
       q.question,
       q.question_type,
       q.points,
       COUNT(taa.id) as total_answers,
       COUNT(CASE WHEN taa.is_correct = true THEN 1 END) as correct_answers,
       ROUND(COUNT(CASE WHEN taa.is_correct = true THEN 1 END) * 100.0 / NULLIF(COUNT(taa.id),0), 1) as correct_rate
     FROM test_questions q
     LEFT JOIN test_attempt_answers taa ON q.id = taa.question_id
     LEFT JOIN test_attempts ta ON taa.attempt_id = ta.id
     WHERE q.test_id = ANY($1) AND ta.status = 'completed'
     GROUP BY q.id, q.question, q.question_type, q.points
     ORDER BY q.id`,
    [testIds]
  );

  res.json({
    totalTests: testIds.length,
    totalAttempts: parseInt(stats.total_attempts) || 0,
    averageScore: Math.round(stats.average_score * 10) / 10 || 0,
    passRate: passRate,
    averageTimeMinutes: Math.round(stats.average_time_minutes * 10) / 10 || 0,
    questionAnalytics: questionAnalytics.map(q => ({
      questionId: q.id,
      question: q.question,
      questionType: q.question_type,
      points: q.points,
      totalAnswers: parseInt(q.total_answers) || 0,
      correctAnswers: parseInt(q.correct_answers) || 0,
      correctRate: parseFloat(q.correct_rate) || 0
    }))
  });
}));

module.exports = router; 