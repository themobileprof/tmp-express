const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, getRow, getRows } = require('../database/config');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authenticateToken, authorizeOwnerOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Helper function to update course progress when lesson is completed
async function updateCourseProgressFromLesson(lessonId, userId) {
  try {
    // Get lesson details
    const lesson = await getRow(
      'SELECT l.*, c.id as course_id FROM lessons l JOIN courses c ON l.course_id = c.id WHERE l.id = $1',
      [lessonId]
    );

    if (!lesson) return;

    // Calculate and update course progress
    const courseProgress = await getRow(
      `SELECT 
         COUNT(DISTINCT l.id) as total_lessons,
         COUNT(DISTINCT CASE WHEN lp.status = 'completed' THEN l.id END) as completed_lessons,
         COUNT(DISTINCT t.id) as total_tests,
         COUNT(DISTINCT CASE WHEN ta.status = 'completed' AND ta.score >= t.passing_score THEN t.id END) as passed_tests
       FROM courses c
       LEFT JOIN lessons l ON c.id = l.course_id AND l.is_published = true
       LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.user_id = $1
       LEFT JOIN tests t ON (t.course_id = c.id OR l.id = t.lesson_id)
       LEFT JOIN test_attempts ta ON t.id = ta.test_id AND ta.user_id = $1
       WHERE c.id = $2`,
      [userId, lesson.course_id]
    );

    // Calculate progress percentage (50% from lessons, 50% from tests)
    const lessonProgress = courseProgress.total_lessons > 0 
      ? (courseProgress.completed_lessons / courseProgress.total_lessons) * 50 
      : 0;
    
    const testProgress = courseProgress.total_tests > 0 
      ? (courseProgress.passed_tests / courseProgress.total_tests) * 50 
      : 0;
    
    const totalProgress = Math.round(lessonProgress + testProgress);

    // Update course enrollment progress
    await query(
      `UPDATE enrollments 
       SET progress = $1,
           status = CASE WHEN $1 >= 100 THEN 'completed' ELSE status END,
           completed_at = CASE WHEN $1 >= 100 THEN CURRENT_TIMESTAMP ELSE completed_at END
       WHERE user_id = $2 AND course_id = $3`,
      [totalProgress, userId, lesson.course_id]
    );
  } catch (error) {
    console.error('Error updating course progress from lesson:', error);
    // Don't throw error to prevent lesson completion from failing
  }
}

// Validation middleware
const validateLesson = [
  body('title').trim().isLength({ min: 1 }).withMessage('Lesson title is required'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('content').optional().isString().withMessage('Content must be a string'),
  body('videoUrl').optional().isURL().withMessage('Video URL must be a valid URL'),
  body('durationMinutes').isInt({ min: 0 }).withMessage('Duration must be a non-negative integer'),
  body('orderIndex').isInt({ min: 0 }).withMessage('Order index must be a non-negative integer')
];

// Get lesson by ID
router.get('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const lesson = await getRow(
    `SELECT l.*, c.title as course_title, c.id as course_id
     FROM lessons l
     JOIN courses c ON l.course_id = c.id
     WHERE l.id = $1`,
    [id]
  );

  if (!lesson) {
    throw new AppError('Lesson not found', 404, 'Lesson Not Found');
  }

  res.json({
    id: lesson.id,
    courseId: lesson.course_id,
    courseTitle: lesson.course_title,
    title: lesson.title,
    description: lesson.description,
    content: lesson.content,
    videoUrl: lesson.video_url,
    durationMinutes: lesson.duration_minutes,
    orderIndex: lesson.order_index,
    isPublished: lesson.is_published,
    createdAt: lesson.created_at,
    updatedAt: lesson.updated_at
  });
}));

// Update lesson
router.put('/:id', authenticateToken, authorizeOwnerOrAdmin('lessons', 'id'), validateLesson, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }

  const { id } = req.params;
  const { title, description, content, videoUrl, durationMinutes, orderIndex, isPublished } = req.body;

  // Verify lesson exists
  const lesson = await getRow('SELECT * FROM lessons WHERE id = $1', [id]);
  if (!lesson) {
    throw new AppError('Lesson not found', 404, 'Lesson Not Found');
  }

  // Update lesson
  const result = await query(
    `UPDATE lessons 
     SET title = COALESCE($1, title),
         description = COALESCE($2, description),
         content = COALESCE($3, content),
         video_url = COALESCE($4, video_url),
         duration_minutes = COALESCE($5, duration_minutes),
         order_index = COALESCE($6, order_index),
         is_published = COALESCE($7, is_published),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $8
     RETURNING *`,
    [title, description, content, videoUrl, durationMinutes, orderIndex, isPublished, id]
  );

  const updatedLesson = result.rows[0];

  res.json({
    id: updatedLesson.id,
    title: updatedLesson.title,
    description: updatedLesson.description,
    content: updatedLesson.content,
    videoUrl: updatedLesson.video_url,
    durationMinutes: updatedLesson.duration_minutes,
    orderIndex: updatedLesson.order_index,
    isPublished: updatedLesson.is_published,
    updatedAt: updatedLesson.updated_at
  });
}));

// Delete lesson
router.delete('/:id', authenticateToken, authorizeOwnerOrAdmin('lessons', 'id'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Verify lesson exists
  const lesson = await getRow('SELECT * FROM lessons WHERE id = $1', [id]);
  if (!lesson) {
    throw new AppError('Lesson not found', 404, 'Lesson Not Found');
  }

  await query('DELETE FROM lessons WHERE id = $1', [id]);

  res.json({
    message: 'Lesson deleted successfully'
  });
}));

// Get tests for a lesson
router.get('/:id/tests', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Verify lesson exists
  const lesson = await getRow('SELECT * FROM lessons WHERE id = $1', [id]);
  if (!lesson) {
    throw new AppError('Lesson not found', 404, 'Lesson Not Found');
  }

  // Get all tests for this lesson
  const tests = await getRows(
    `SELECT t.*, 
            COUNT(tq.id) as question_count,
            COUNT(ta.id) as attempt_count
     FROM tests t
     LEFT JOIN test_questions tq ON t.id = tq.test_id
     LEFT JOIN test_attempts ta ON t.id = ta.test_id
     WHERE t.lesson_id = $1
     GROUP BY t.id
     ORDER BY t.order_index ASC`,
    [id]
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
      createdAt: t.created_at,
      updatedAt: t.updated_at
    }))
  });
}));

// Mark lesson as completed for user
router.post('/:id/complete', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { timeSpentMinutes = 0 } = req.body;

  // Verify lesson exists and user is enrolled in the course
  const lesson = await getRow(
    `SELECT l.*, c.id as course_id 
     FROM lessons l 
     JOIN courses c ON l.course_id = c.id
     JOIN enrollments e ON c.id = e.course_id
     WHERE l.id = $1 AND e.user_id = $2 AND l.is_published = true`,
    [id, userId]
  );

  if (!lesson) {
    throw new AppError('Lesson not found or you are not enrolled in this course', 404, 'Lesson Not Found');
  }

  // Update or insert lesson progress
  await query(
    `INSERT INTO lesson_progress (user_id, lesson_id, status, completed_at, progress_percentage, time_spent_minutes)
     VALUES ($1, $2, 'completed', CURRENT_TIMESTAMP, 100, $3)
     ON CONFLICT (user_id, lesson_id) 
     DO UPDATE SET 
       status = 'completed',
       completed_at = CURRENT_TIMESTAMP,
       progress_percentage = 100,
       time_spent_minutes = $3,
       updated_at = CURRENT_TIMESTAMP`,
    [userId, id, timeSpentMinutes]
  );

  // Update course progress
  await updateCourseProgressFromLesson(id, userId);

  res.json({
    message: 'Lesson marked as completed',
    lessonId: id,
    completedAt: new Date().toISOString()
  });
}));

// Get lesson progress for user
router.get('/:id/progress', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  // Verify lesson exists and user is enrolled in the course
  const lesson = await getRow(
    `SELECT l.*, c.id as course_id 
     FROM lessons l 
     JOIN courses c ON l.course_id = c.id
     JOIN enrollments e ON c.id = e.course_id
     WHERE l.id = $1 AND e.user_id = $2`,
    [id, userId]
  );

  if (!lesson) {
    throw new AppError('Lesson not found or you are not enrolled in this course', 404, 'Lesson Not Found');
  }

  // Get lesson progress
  const progress = await getRow(
    'SELECT * FROM lesson_progress WHERE user_id = $1 AND lesson_id = $2',
    [userId, id]
  );

  res.json({
    lessonId: id,
    isCompleted: progress ? progress.status === 'completed' : false,
    progressPercentage: progress ? progress.progress_percentage : 0,
    timeSpentMinutes: progress ? progress.time_spent_minutes : 0,
    completedAt: progress ? progress.completed_at : null
  });
}));

module.exports = router; 