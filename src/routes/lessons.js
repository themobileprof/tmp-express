const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, getRow, getRows } = require('../database/config');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authenticateToken, authorizeOwnerOrAdmin } = require('../middleware/auth');

const router = express.Router();

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

module.exports = router; 