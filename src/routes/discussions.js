const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, getRow, getRows } = require('../database/config');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authenticateToken, authorizeOwnerOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Get recent discussions (public endpoint) - MUST be before /:id routes
router.get('/recent', asyncHandler(async (req, res) => {
  const { 
    course_id, 
    class_id, 
    author, 
    sort = 'created_at', 
    order = 'desc',
    page = 1,
    limit = 20
  } = req.query;

  let whereConditions = [];
  let params = [];
  let paramIndex = 1;

  // Add filters
  if (course_id) {
    whereConditions.push(`d.course_id = $${paramIndex}`);
    params.push(course_id);
    paramIndex++;
  }

  if (class_id) {
    whereConditions.push(`d.class_id = $${paramIndex}`);
    params.push(class_id);
    paramIndex++;
  }

  if (author) {
    whereConditions.push(`(u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex})`);
    params.push(`%${author}%`);
    paramIndex++;
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  // Validate sort field
  const allowedSortFields = ['created_at', 'title', 'reply_count', 'view_count'];
  const sortField = allowedSortFields.includes(sort) ? sort : 'created_at';
  const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  // Calculate offset
  const offset = (parseInt(page) - 1) * parseInt(limit);

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total
    FROM discussions d
    JOIN users u ON d.author_id = u.id
    LEFT JOIN courses c ON d.course_id = c.id
    LEFT JOIN classes cl ON d.class_id = cl.id
    ${whereClause}
  `;
  
  const countResult = await getRow(countQuery, params);
  const total = parseInt(countResult.total);

  // Get discussions
  const discussionsQuery = `
    SELECT 
      d.id, d.title, d.content, d.created_at, d.updated_at,
      d.reply_count, d.view_count, d.is_pinned, d.is_locked,
      u.id as author_id, u.first_name as author_first_name, 
      u.last_name as author_last_name, u.avatar_url as author_avatar,
      c.id as course_id, c.title as course_title,
      cl.id as class_id, cl.title as class_title,
      (SELECT COUNT(*) FROM discussion_replies dr WHERE dr.discussion_id = d.id) as actual_reply_count
    FROM discussions d
    JOIN users u ON d.author_id = u.id
    LEFT JOIN courses c ON d.course_id = c.id
    LEFT JOIN classes cl ON d.class_id = cl.id
    ${whereClause}
    ORDER BY d.${sortField} ${sortOrder}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  params.push(parseInt(limit), offset);
  const discussions = await getRows(discussionsQuery, params);

  res.json({
    discussions: discussions.map(discussion => ({
      id: discussion.id,
      title: discussion.title,
      content: discussion.content,
      createdAt: discussion.created_at,
      updatedAt: discussion.updated_at,
      replyCount: discussion.actual_reply_count || discussion.reply_count,
      viewCount: discussion.view_count,
      isPinned: discussion.is_pinned,
      isLocked: discussion.is_locked,
      author: {
        id: discussion.author_id,
        firstName: discussion.author_first_name,
        lastName: discussion.author_last_name,
        avatarUrl: discussion.author_avatar
      },
      course: discussion.course_id ? {
        id: discussion.course_id,
        title: discussion.course_title
      } : null,
      class: discussion.class_id ? {
        id: discussion.class_id,
        title: discussion.class_title
      } : null
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
const validateDiscussion = [
  body('title').trim().isLength({ min: 1 }).withMessage('Discussion title is required'),
  body('content').trim().isLength({ min: 10 }).withMessage('Discussion content must be at least 10 characters'),
  body('category').trim().isLength({ min: 1 }).withMessage('Category is required'),
  body('courseId').optional().isUUID().withMessage('Valid course ID is required'),
  body('classId').optional().isUUID().withMessage('Valid class ID is required')
];

const validateReply = [
  body('content').trim().isLength({ min: 1 }).withMessage('Reply content is required'),
  body('parentReplyId').optional().isUUID().withMessage('Valid parent reply ID is required')
];

// Get all discussions
router.get('/', asyncHandler(async (req, res) => {
  const { category, courseId, classId, authorId, limit = 20, offset = 0 } = req.query;

  let whereClause = 'WHERE 1=1';
  let params = [];
  let paramIndex = 1;

  if (category) {
    whereClause += ` AND d.category = $${paramIndex}`;
    params.push(category);
    paramIndex++;
  }

  if (courseId) {
    whereClause += ` AND d.course_id = $${paramIndex}`;
    params.push(courseId);
    paramIndex++;
  }

  if (classId) {
    whereClause += ` AND d.class_id = $${paramIndex}`;
    params.push(classId);
    paramIndex++;
  }

  if (authorId) {
    whereClause += ` AND d.author_id = $${paramIndex}`;
    params.push(authorId);
    paramIndex++;
  }

  const discussions = await getRows(
    `SELECT d.*, u.first_name, u.last_name, u.avatar_url,
            c.title as course_title, cl.title as class_title
     FROM discussions d
     JOIN users u ON d.author_id = u.id
     LEFT JOIN courses c ON d.course_id = c.id
     LEFT JOIN classes cl ON d.class_id = cl.id
     ${whereClause}
     ORDER BY d.is_pinned DESC, d.last_activity_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, parseInt(limit), parseInt(offset)]
  );

  res.json({
    discussions: discussions.map(d => ({
      id: d.id,
      title: d.title,
      content: d.content,
      category: d.category,
      authorId: d.author_id,
      authorName: `${d.first_name} ${d.last_name}`,
      authorAvatar: d.avatar_url,
      courseId: d.course_id,
      courseTitle: d.course_title,
      classId: d.class_id,
      classTitle: d.class_title,
      isPinned: d.is_pinned,
      replyCount: d.reply_count,
      lastActivityAt: d.last_activity_at,
      createdAt: d.created_at
    }))
  });
}));

// Create new discussion
router.post('/', authenticateToken, validateDiscussion, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }

  const { title, content, category, courseId, classId } = req.body;
  const authorId = req.user.id;

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

  // Create discussion
  const result = await query(
    `INSERT INTO discussions (
      title, content, category, author_id, course_id, class_id
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *`,
    [title, content, category, authorId, courseId, classId]
  );

  const discussion = result.rows[0];

  res.status(201).json({
    id: discussion.id,
    title: discussion.title,
    content: discussion.content,
    category: discussion.category,
    authorId: discussion.author_id,
    courseId: discussion.course_id,
    classId: discussion.class_id,
    isPinned: discussion.is_pinned,
    replyCount: discussion.reply_count,
    createdAt: discussion.created_at
  });
}));

// Get discussion by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const discussion = await getRow(
    `SELECT d.*, u.first_name, u.last_name, u.avatar_url,
            c.title as course_title, cl.title as class_title
     FROM discussions d
     JOIN users u ON d.author_id = u.id
     LEFT JOIN courses c ON d.course_id = c.id
     LEFT JOIN classes cl ON d.class_id = cl.id
     WHERE d.id = $1`,
    [id]
  );

  if (!discussion) {
    throw new AppError('Discussion not found', 404, 'Discussion Not Found');
  }

  res.json({
    id: discussion.id,
    title: discussion.title,
    content: discussion.content,
    category: discussion.category,
    authorId: discussion.author_id,
    authorName: `${discussion.first_name} ${discussion.last_name}`,
    authorAvatar: discussion.avatar_url,
    courseId: discussion.course_id,
    courseTitle: discussion.course_title,
    classId: discussion.class_id,
    classTitle: discussion.class_title,
    isPinned: discussion.is_pinned,
    replyCount: discussion.reply_count,
    lastActivityAt: discussion.last_activity_at,
    createdAt: discussion.created_at
  });
}));

// Update discussion
router.put('/:id', authenticateToken, authorizeOwnerOrAdmin('discussions', 'id'), validateDiscussion, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }

  const { id } = req.params;
  const { title, content, category, isPinned } = req.body;

  // Verify discussion exists
  const discussion = await getRow('SELECT * FROM discussions WHERE id = $1', [id]);
  if (!discussion) {
    throw new AppError('Discussion not found', 404, 'Discussion Not Found');
  }

  // Update discussion
  const result = await query(
    `UPDATE discussions 
     SET title = COALESCE($1, title),
         content = COALESCE($2, content),
         category = COALESCE($3, category),
         is_pinned = COALESCE($4, is_pinned),
         last_activity_at = CURRENT_TIMESTAMP
     WHERE id = $5
     RETURNING *`,
    [title, content, category, isPinned, id]
  );

  const updatedDiscussion = result.rows[0];

  res.json({
    id: updatedDiscussion.id,
    title: updatedDiscussion.title,
    content: updatedDiscussion.content,
    category: updatedDiscussion.category,
    isPinned: updatedDiscussion.is_pinned,
    lastActivityAt: updatedDiscussion.last_activity_at
  });
}));

// Delete discussion
router.delete('/:id', authenticateToken, authorizeOwnerOrAdmin('discussions', 'id'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Verify discussion exists
  const discussion = await getRow('SELECT * FROM discussions WHERE id = $1', [id]);
  if (!discussion) {
    throw new AppError('Discussion not found', 404, 'Discussion Not Found');
  }

  await query('DELETE FROM discussions WHERE id = $1', [id]);

  res.json({
    message: 'Discussion deleted successfully'
  });
}));

// Get discussion replies
router.get('/:id/replies', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Verify discussion exists
  const discussion = await getRow('SELECT * FROM discussions WHERE id = $1', [id]);
  if (!discussion) {
    throw new AppError('Discussion not found', 404, 'Discussion Not Found');
  }

  const replies = await getRows(
    `SELECT dr.*, u.first_name, u.last_name, u.avatar_url
     FROM discussion_replies dr
     JOIN users u ON dr.author_id = u.id
     WHERE dr.discussion_id = $1
     ORDER BY dr.created_at ASC`,
    [id]
  );

  res.json({
    replies: replies.map(r => ({
      id: r.id,
      discussionId: r.discussion_id,
      authorId: r.author_id,
      authorName: `${r.first_name} ${r.last_name}`,
      authorAvatar: r.avatar_url,
      content: r.content,
      parentReplyId: r.parent_reply_id,
      createdAt: r.created_at
    }))
  });
}));

// Add reply to discussion
router.post('/:id/replies', authenticateToken, validateReply, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }

  const { id } = req.params;
  const { content, parentReplyId } = req.body;
  const authorId = req.user.id;

  // Verify discussion exists
  const discussion = await getRow('SELECT * FROM discussions WHERE id = $1', [id]);
  if (!discussion) {
    throw new AppError('Discussion not found', 404, 'Discussion Not Found');
  }

  // Verify parent reply exists if provided
  if (parentReplyId) {
    const parentReply = await getRow(
      'SELECT * FROM discussion_replies WHERE id = $1 AND discussion_id = $2',
      [parentReplyId, id]
    );
    if (!parentReply) {
      throw new AppError('Parent reply not found', 404, 'Parent Reply Not Found');
    }
  }

  // Create reply
  const result = await query(
    `INSERT INTO discussion_replies (
      discussion_id, author_id, content, parent_reply_id
    ) VALUES ($1, $2, $3, $4)
    RETURNING *`,
    [id, authorId, content, parentReplyId]
  );

  const reply = result.rows[0];

  // Update discussion reply count and last activity
  await query(
    `UPDATE discussions 
     SET reply_count = reply_count + 1, last_activity_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [id]
  );

  res.status(201).json({
    id: reply.id,
    discussionId: reply.discussion_id,
    authorId: reply.author_id,
    content: reply.content,
    parentReplyId: reply.parent_reply_id,
    createdAt: reply.created_at
  });
}));

module.exports = router; 