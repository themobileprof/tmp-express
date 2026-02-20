const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, getRow, getRows } = require('../database/config');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authenticateToken, authorizeOwnerOrAdmin } = require('../middleware/auth');
const certificateService = require('../utils/certificateService');

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
         COUNT(DISTINCT CASE WHEN lp.is_completed = true THEN l.id END) as completed_lessons,
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

    // Check for certificate awarding if course is now completed
    if (totalProgress >= 100) {
      try {
        await certificateService.checkAndAwardCourseCertificate(userId, lesson.course_id);
      } catch (error) {
        console.error('Error checking certificate eligibility:', error);
        // Don't throw error to prevent lesson completion from failing
      }
    }
  } catch (error) {
    console.error('Error updating course progress from lesson:', error);
    // Don't throw error to prevent lesson completion from failing
  }
}

// Helper function to check if a lesson is unlocked for a user
async function isLessonUnlocked(lessonId, userId) {
  try {
    // Get lesson details and order
    const lesson = await getRow(
      'SELECT l.*, c.id as course_id FROM lessons l JOIN courses c ON l.course_id = c.id WHERE l.id = $1',
      [lessonId]
    );

    if (!lesson) return false;

    // First lesson is always unlocked
    if (lesson.order_index === 1) return true;

    // Check if previous lesson exists
    const previousLesson = await getRow(
      'SELECT id FROM lessons WHERE course_id = $1 AND order_index = $2',
      [lesson.course_id, lesson.order_index - 1]
    );

    if (!previousLesson) return false;

    // Unlock when previous lesson is completed (either by passing test or forced proceed)
    const prevCompleted = await getRow(
      'SELECT 1 FROM lesson_progress WHERE user_id = $1 AND lesson_id = $2 AND is_completed = true LIMIT 1',
      [userId, previousLesson.id]
    );

    return !!prevCompleted;
  } catch (error) {
    console.error('Error checking lesson unlock status:', error);
    return false;
  }
}

// Helper function to get next unlocked lesson
async function getNextUnlockedLesson(courseId, userId) {
  try {
    const lessons = await getRows(
      'SELECT id, order_index FROM lessons WHERE course_id = $1 AND is_published = true ORDER BY order_index',
      [courseId]
    );

    for (const lesson of lessons) {
      if (await isLessonUnlocked(lesson.id, userId)) {
        return lesson;
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting next unlocked lesson:', error);
    return null;
  }
}

// Helper function to unlock next lesson after test completion
async function unlockNextLesson(courseId, userId) {
  try {
    const currentLesson = await getRow(
      'SELECT order_index FROM lessons WHERE course_id = $1 AND order_index = (SELECT MAX(order_index) FROM lessons WHERE course_id = $1)',
      [courseId]
    );

    if (!currentLesson) return;

    const nextLesson = await getRow(
      'SELECT id FROM lessons WHERE course_id = $1 AND order_index = $2',
      [courseId, currentLesson.order_index + 1]
    );

    if (nextLesson) {
      // The next lesson will be automatically unlocked when the user passes the current lesson's test
      console.log(`Next lesson ${nextLesson.id} will be unlocked after current test completion`);
    }
  } catch (error) {
    console.error('Error unlocking next lesson:', error);
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
  const userId = req.user.id;
  const isAdmin = req.user.role === 'admin';

  // Verify lesson exists
  const lesson = await getRow(
    `SELECT l.*, c.id as course_id, c.title as course_title,
            CONCAT(u.first_name, ' ', u.last_name) as reviewed_by_name
     FROM lessons l
     JOIN courses c ON l.course_id = c.id
     LEFT JOIN users u ON l.reviewed_by = u.id
     WHERE l.id = $1`,
    [id]
  );

  if (!lesson) {
    throw new AppError('Lesson not found', 404, 'Lesson Not Found');
  }

  // Check if user is enrolled in the course (skip for admins)
  if (!isAdmin) {
    const enrollment = await getRow(
      'SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2',
      [userId, lesson.course_id]
    );

    if (!enrollment) {
      throw new AppError('Enrollment required to access lessons', 403, 'ENROLLMENT_REQUIRED', { courseId: lesson.course_id });
    }
  }

  // Check if lesson is unlocked for this user (skip for admins)
  if (!isAdmin) {
    const isUnlocked = await isLessonUnlocked(id, userId);
    
    if (!isUnlocked) {
      // Get previous lesson info for better user experience
      const previousLesson = await getRow(
        'SELECT id, title FROM lessons WHERE course_id = $1 AND order_index = $2',
        [lesson.course_id, lesson.order_index - 1]
      );

      throw new AppError(
        previousLesson 
          ? `Complete the test for "${previousLesson.title}" to unlock this lesson`
          : 'This lesson is not yet available',
        403,
        'Lesson Locked'
      );
    }
  }

  // Get lesson progress
  const progress = await getRow(
    'SELECT * FROM lesson_progress WHERE user_id = $1 AND lesson_id = $2',
    [userId, id]
  );

  // Get associated test info
  const test = await getRow(
    'SELECT id, title, description, duration_minutes, passing_score, max_attempts FROM tests WHERE lesson_id = $1',
    [id]
  );

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
    isUnlocked: true,
    createdAt: lesson.created_at,
    updatedAt: lesson.updated_at,
    reviewStatus: {
      isReviewed: lesson.is_reviewed || false,
      reviewedBy: lesson.reviewed_by,
      reviewedByName: lesson.reviewed_by_name,
      reviewedAt: lesson.reviewed_at,
      reviewNotes: lesson.review_notes
    },
    progress: progress ? {
      isCompleted: progress.is_completed,
      progressPercentage: progress.progress_percentage,
      timeSpentMinutes: progress.time_spent_minutes,
      completedAt: progress.completed_at
    } : null,
    test: test ? {
      id: test.id,
      title: test.title,
      description: test.description,
      durationMinutes: test.duration_minutes,
      passingScore: test.passing_score,
      maxAttempts: test.max_attempts
    } : null
  });
}));

// Update lesson
router.put('/:id', authenticateToken, authorizeOwnerOrAdmin('lessons', 'id'), validateLesson, asyncHandler(async (req, res) => {
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
// NOTE: Lessons are automatically marked complete when tests are passed or force-progressed
// This endpoint only updates progress tracking (time spent, progress percentage)
// It does NOT mark the lesson as complete - only passing the test does that
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

  // Update lesson progress tracking ONLY (not completion status)
  // Completion is handled by test passing or force progression
  await query(
    `INSERT INTO lesson_progress (user_id, lesson_id, progress_percentage, time_spent_minutes)
     VALUES ($1, $2, 100, $3)
     ON CONFLICT (user_id, lesson_id) 
     DO UPDATE SET 
       progress_percentage = 100,
       time_spent_minutes = GREATEST(lesson_progress.time_spent_minutes, $3),
       updated_at = CURRENT_TIMESTAMP`,
    [userId, id, timeSpentMinutes]
  );

  res.json({
    message: 'Lesson progress updated. Complete the test to unlock the next lesson.',
    lessonId: id
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
    isCompleted: progress ? progress.is_completed : false,
    progressPercentage: progress ? progress.progress_percentage : 0,
    timeSpentMinutes: progress ? progress.time_spent_minutes : 0,
    completedAt: progress ? progress.completed_at : null
  });
}));

// Get lesson discussions
router.get('/:id/discussions', asyncHandler(async (req, res) => {
  const { id: lessonId } = req.params;
  const { category, search, sort = 'last_activity_at', order = 'desc', limit = 20, offset = 0 } = req.query;

  // Verify lesson exists
  const lesson = await getRow(
    `SELECT l.id, l.title, c.id as course_id, c.title as course_title 
     FROM lessons l 
     JOIN courses c ON l.course_id = c.id 
     WHERE l.id = $1`,
    [lessonId]
  );
  if (!lesson) {
    throw new AppError('Lesson not found', 404, 'Lesson Not Found');
  }

  let whereClause = 'WHERE d.lesson_id = $1';
  let params = [lessonId];
  let paramIndex = 2;

  if (category) {
    whereClause += ` AND d.category = $${paramIndex}`;
    params.push(category);
    paramIndex++;
  }

  if (search) {
    whereClause += ` AND (d.title ILIKE $${paramIndex} OR d.content ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  const allowedSortFields = ['created_at', 'title', 'last_activity_at', 'reply_count', 'likes_count'];
  const sortField = allowedSortFields.includes(sort) ? sort : 'last_activity_at';
  const sortOrder = order && order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  // Get total count
  const countResult = await getRow(
    `SELECT COUNT(*) as total FROM discussions d ${whereClause}`,
    params
  );
  const total = parseInt(countResult.total);

  // Get discussions
  const discussions = await getRows(
    `SELECT d.*, u.first_name, u.last_name, u.avatar_url,
        COALESCE((SELECT COUNT(*) FROM discussion_likes dl WHERE dl.discussion_id = d.id), 0) as likes_count
     FROM discussions d
     JOIN users u ON d.author_id = u.id
     ${whereClause}
     ORDER BY d.${sortField} ${sortOrder}
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, parseInt(limit), parseInt(offset)]
  );

  res.json({
    lesson: {
      id: lesson.id,
      title: lesson.title,
      courseId: lesson.course_id,
      courseTitle: lesson.course_title
    },
    discussions: discussions.map(d => ({
      id: d.id,
      title: d.title,
      content: d.content,
      category: d.category,
      authorName: `${d.first_name} ${d.last_name}`,
      replyCount: d.reply_count,
      likesCount: parseInt(d.likes_count) || 0,
      lastActivityAt: d.last_activity_at,
      createdAt: d.created_at
    })),
    pagination: {
      page: Math.floor(parseInt(offset) / parseInt(limit)) + 1,
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
}));

module.exports = router; 
 
// ===== Student workshop read-only endpoint =====
// GET /api/lessons/:id/workshop - returns enabled workshop spec if present
router.get('/:id/workshop', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Verify lesson exists
  const lesson = await getRow('SELECT id, title FROM lessons WHERE id = $1', [id]);
  if (!lesson) {
    throw new AppError('Lesson not found', 404, 'Lesson Not Found');
  }

  // Fetch enabled workshop
  const workshop = await getRow(
    `SELECT lw.*, CONCAT(u.first_name, ' ', u.last_name) as reviewed_by_name
     FROM lesson_workshops lw
     LEFT JOIN users u ON lw.reviewed_by = u.id
     WHERE lw.lesson_id = $1`,
    [id]
  );

    if (!workshop || workshop.is_enabled !== true) {
      return res.json({ lesson: { id: lesson.id, title: lesson.title }, workshop: null });
    }

    // Return spec as-is (no normalization needed with new format)
    const spec = workshop.spec || {};

    res.json({
      lesson: { id: lesson.id, title: lesson.title },
      workshop: {
        spec,
        updatedAt: workshop.updated_at,
        reviewStatus: {
          isReviewed: workshop.is_reviewed || false,
          reviewedBy: workshop.reviewed_by,
          reviewedByName: workshop.reviewed_by_name,
          reviewedAt: workshop.reviewed_at,
          reviewNotes: workshop.review_notes
        }
      }
    });
}));