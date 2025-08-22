const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, getRow, getRows } = require('../database/config');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authenticateToken, authorizeOwnerOrAdmin } = require('../middleware/auth');
const { notifyDiscussionReply } = require('../utils/notifications');

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
  body('lessonId').optional().isUUID().withMessage('Valid lesson ID is required'),
  body('classId').optional().isUUID().withMessage('Valid class ID is required'),
  body('tags').optional().isArray().withMessage('Tags must be an array')
];

const validateReply = [
  body('content').trim().isLength({ min: 1 }).withMessage('Reply content is required'),
  body('parentReplyId').optional().isUUID().withMessage('Valid parent reply ID is required')
];

// Get all discussions
router.get('/', asyncHandler(async (req, res) => {
	const { category, type, courseId, lessonId, classId, authorId, search, tags, sort = 'last_activity_at', order = 'desc', limit = 20, offset = 0 } = req.query;

	let whereClause = 'WHERE 1=1';
	let params = [];
	let paramIndex = 1;

	const effectiveCategory = type || category;
	if (effectiveCategory) {
		whereClause += ` AND d.category = $${paramIndex}`;
		params.push(effectiveCategory);
		paramIndex++;
	}

	if (courseId) {
		whereClause += ` AND d.course_id = $${paramIndex}`;
		params.push(courseId);
		paramIndex++;
	}

	if (lessonId) {
		whereClause += ` AND d.lesson_id = $${paramIndex}`;
		params.push(lessonId);
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

	if (search) {
		whereClause += ` AND (d.title ILIKE $${paramIndex} OR d.content ILIKE $${paramIndex})`;
		params.push(`%${search}%`);
		paramIndex++;
	}

	if (tags) {
		const tagArray = tags.split(',').map(tag => tag.trim());
		whereClause += ` AND d.tags && $${paramIndex}`;
		params.push(tagArray);
		paramIndex++;
	}

	const allowedSortFields = ['created_at', 'title', 'reply_count', 'view_count', 'last_activity_at', 'likes_count'];
	const sortField = allowedSortFields.includes(sort) ? sort : 'last_activity_at';
	const sortOrder = order && order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

	const discussions = await getRows(
		`SELECT d.*, u.first_name, u.last_name, u.avatar_url,
				c.title as course_title, l.title as lesson_title, cl.title as class_title,
				COALESCE((SELECT COUNT(*) FROM discussion_likes dl WHERE dl.discussion_id = d.id), 0) as likes_count
		 FROM discussions d
		 JOIN users u ON d.author_id = u.id
		 LEFT JOIN courses c ON d.course_id = c.id
		 LEFT JOIN lessons l ON d.lesson_id = l.id
		 LEFT JOIN classes cl ON d.class_id = cl.id
		 ${whereClause}
		 ORDER BY d.${sortField} ${sortOrder}
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
			lessonId: d.lesson_id,
			lessonTitle: d.lesson_title,
			classId: d.class_id,
			classTitle: d.class_title,
			tags: d.tags || [],
			isPinned: d.is_pinned,
			replyCount: d.reply_count,
			likesCount: parseInt(d.likes_count) || 0,
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

  const { title, content, category, courseId, lessonId, classId, tags } = req.body;
  const authorId = req.user.id;

  // Verify course/lesson/class exists if provided
  if (courseId) {
    const course = await getRow('SELECT * FROM courses WHERE id = $1', [courseId]);
    if (!course) {
      throw new AppError('Course not found', 404, 'Course Not Found');
    }
  }

  if (lessonId) {
    const lesson = await getRow('SELECT * FROM lessons WHERE id = $1', [lessonId]);
    if (!lesson) {
      throw new AppError('Lesson not found', 404, 'Lesson Not Found');
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
      title, content, category, author_id, course_id, lesson_id, class_id, tags
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [title, content, category, authorId, courseId, lessonId, classId, tags || []]
  );

  const discussion = result.rows[0];

  res.status(201).json({
    id: discussion.id,
    title: discussion.title,
    content: discussion.content,
    category: discussion.category,
    authorId: discussion.author_id,
    courseId: discussion.course_id,
    lessonId: discussion.lesson_id,
    classId: discussion.class_id,
    tags: discussion.tags || [],
    isPinned: discussion.is_pinned,
    replyCount: discussion.reply_count,
    createdAt: discussion.created_at
  });
}));

// Get discussion categories
router.get('/categories', asyncHandler(async (req, res) => {
	const { includeInactive = false } = req.query;
	
	let whereClause = 'WHERE is_active = true';
	let params = [];
	
	if (includeInactive === 'true' || includeInactive === true) {
		whereClause = '';
	}
	
	const categories = await getRows(
		`SELECT id, key, name, description, icon, color, is_active, sort_order, created_at, updated_at
		 FROM discussion_categories
		 ${whereClause}
		 ORDER BY sort_order ASC, name ASC`,
		params
	);

	res.json({ 
		categories: categories.map(c => ({
			id: c.id,
			key: c.key,
			name: c.name,
			description: c.description,
			icon: c.icon,
			color: c.color,
			isActive: c.is_active,
			sortOrder: c.sort_order,
			createdAt: c.created_at,
			updatedAt: c.updated_at
		}))
	});
}));

// Get popular tags
router.get('/tags', asyncHandler(async (req, res) => {
	const { limit = 50 } = req.query;

	const tags = await getRows(
		`SELECT 
			unnest(tags) as tag,
			COUNT(*) as count
		 FROM discussions 
		 WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
		 GROUP BY unnest(tags)
		 ORDER BY count DESC
		 LIMIT $1`,
		[parseInt(limit)]
	);

	res.json({ tags: tags.map(t => ({ tag: t.tag, count: parseInt(t.count) })) });
}));

// ===== ADMIN ENDPOINTS FOR MANAGING CATEGORIES =====

// Create new discussion category (Admin only)
router.post('/categories', authenticateToken, authorizeOwnerOrAdmin('system', 'admin'), [
	body('key').trim().isLength({ min: 1, max: 100 }).withMessage('Category key is required and must be 1-100 characters'),
	body('name').trim().isLength({ min: 1, max: 255 }).withMessage('Category name is required and must be 1-255 characters'),
	body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
	body('icon').optional().trim().isLength({ max: 10 }).withMessage('Icon must be an emoji (max 10 characters)'),
	body('color').optional().trim().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Color must be a valid hex color'),
	body('sortOrder').optional().isInt({ min: 0 }).withMessage('Sort order must be a positive integer'),
	body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
], asyncHandler(async (req, res) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		throw new AppError('Validation failed', 400, 'Validation Error');
	}

	const { key, name, description, icon, color, sortOrder = 0, isActive = true } = req.body;

	// Check if key already exists
	const existing = await getRow('SELECT id FROM discussion_categories WHERE key = $1', [key]);
	if (existing) {
		throw new AppError('Category key already exists', 400, 'Duplicate Category Key');
	}

	const result = await query(
		`INSERT INTO discussion_categories (key, name, description, icon, color, sort_order, is_active)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING *`,
		[key, name, description, icon, color, sortOrder, isActive]
	);

	const category = result.rows[0];
	res.status(201).json({
		id: category.id,
		key: category.key,
		name: category.name,
		description: category.description,
		icon: category.icon,
		color: category.color,
		isActive: category.is_active,
		sortOrder: category.sort_order,
		createdAt: category.created_at,
		updatedAt: category.updated_at
	});
}));

// Update discussion category (Admin only)
router.put('/categories/:id', authenticateToken, authorizeOwnerOrAdmin('system', 'admin'), [
	body('name').optional().trim().isLength({ min: 1, max: 255 }).withMessage('Category name must be 1-255 characters'),
	body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
	body('icon').optional().trim().isLength({ max: 10 }).withMessage('Icon must be an emoji (max 10 characters)'),
	body('color').optional().trim().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Color must be a valid hex color'),
	body('sortOrder').optional().isInt({ min: 0 }).withMessage('Sort order must be a positive integer'),
	body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
], asyncHandler(async (req, res) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		throw new AppError('Validation failed', 400, 'Validation Error');
	}

	const { id } = req.params;
	const { name, description, icon, color, sortOrder, isActive } = req.body;

	// Verify category exists
	const existing = await getRow('SELECT * FROM discussion_categories WHERE id = $1', [id]);
	if (!existing) {
		throw new AppError('Category not found', 404, 'Category Not Found');
	}

	// Update category
	const result = await query(
		`UPDATE discussion_categories 
		 SET name = COALESCE($1, name),
		     description = COALESCE($2, description),
		     icon = COALESCE($3, icon),
		     color = COALESCE($4, color),
		     sort_order = COALESCE($5, sort_order),
		     is_active = COALESCE($6, is_active),
		     updated_at = CURRENT_TIMESTAMP
		 WHERE id = $7
		 RETURNING *`,
		[name, description, icon, color, sortOrder, isActive, id]
	);

	const category = result.rows[0];
	res.json({
		id: category.id,
		key: category.key,
		name: category.name,
		description: category.description,
		icon: category.icon,
		color: category.color,
		isActive: category.is_active,
		sortOrder: category.sort_order,
		createdAt: category.created_at,
		updatedAt: category.updated_at
	});
}));

// Delete discussion category (Admin only)
router.delete('/categories/:id', authenticateToken, authorizeOwnerOrAdmin('system', 'admin'), asyncHandler(async (req, res) => {
	const { id } = req.params;

	// Verify category exists
	const existing = await getRow('SELECT * FROM discussion_categories WHERE id = $1', [id]);
	if (!existing) {
		throw new AppError('Category not found', 404, 'Category Not Found');
	}

	// Check if category is in use
	const usageCount = await getRow(
		'SELECT COUNT(*) as count FROM discussions WHERE category = $1',
		[existing.key]
	);

	if (parseInt(usageCount.count) > 0) {
		throw new AppError(
			`Cannot delete category: ${parseInt(usageCount.count)} discussions are using it`,
			400,
			'Category In Use'
		);
	}

	await query('DELETE FROM discussion_categories WHERE id = $1', [id]);

	res.json({ message: 'Category deleted successfully' });
}));

// Get category usage statistics (Admin only)
router.get('/categories/:id/stats', authenticateToken, authorizeOwnerOrAdmin('system', 'admin'), asyncHandler(async (req, res) => {
	const { id } = req.params;

	// Verify category exists
	const category = await getRow('SELECT * FROM discussion_categories WHERE id = $1', [id]);
	if (!category) {
		throw new AppError('Category not found', 404, 'Category Not Found');
	}

	// Get usage statistics
	const stats = await getRow(
		`SELECT 
			COUNT(*) as total_discussions,
			COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as discussions_last_30_days,
			COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as discussions_last_7_days,
			AVG(reply_count) as avg_replies,
			SUM(view_count) as total_views
		 FROM discussions 
		 WHERE category = $1`,
		[category.key]
	);

	res.json({
		category: {
			id: category.id,
			key: category.key,
			name: category.name
		},
		statistics: {
			totalDiscussions: parseInt(stats.total_discussions) || 0,
			discussionsLast30Days: parseInt(stats.discussions_last_30_days) || 0,
			discussionsLast7Days: parseInt(stats.discussions_last_7_days) || 0,
			averageReplies: parseFloat(stats.avg_replies) || 0,
			totalViews: parseInt(stats.total_views) || 0
		}
	});
}));

// Get discussion by ID
router.get('/:id', asyncHandler(async (req, res) => {
	const { id } = req.params;

	const discussion = await getRow(
		`SELECT d.*, u.first_name, u.last_name, u.avatar_url,
				c.title as course_title, l.title as lesson_title, cl.title as class_title,
				COALESCE((SELECT COUNT(*) FROM discussion_likes dl WHERE dl.discussion_id = d.id), 0) as likes_count
		 FROM discussions d
		 JOIN users u ON d.author_id = u.id
		 LEFT JOIN courses c ON d.course_id = c.id
		 LEFT JOIN lessons l ON d.lesson_id = l.id
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
		lessonId: discussion.lesson_id,
		lessonTitle: discussion.lesson_title,
		classId: discussion.class_id,
		classTitle: discussion.class_title,
		tags: discussion.tags || [],
		isPinned: discussion.is_pinned,
		replyCount: discussion.reply_count,
		likesCount: parseInt(discussion.likes_count) || 0,
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

  // Send notification to discussion author (if not the same user)
  if (discussion.author_id !== authorId) {
    try {
      const author = await getRow(
        'SELECT first_name, last_name FROM users WHERE id = $1',
        [discussion.author_id]
      );
      
      const replierName = await getRow(
        'SELECT first_name, last_name FROM users WHERE id = $1',
        [authorId]
      );

      if (author && replierName) {
        const authorName = `${author.first_name} ${author.last_name}`;
        const replierFullName = `${replierName.first_name} ${replierName.last_name}`;
        
        await notifyDiscussionReply(
          discussion.author_id,
          id,
          discussion.title,
          replierFullName
        );
      }
    } catch (error) {
      console.error('Failed to send discussion reply notification:', error);
      // Don't fail the reply if notification fails
    }
  }

  res.status(201).json({
    id: reply.id,
    discussionId: reply.discussion_id,
    authorId: reply.author_id,
    content: reply.content,
    parentReplyId: reply.parent_reply_id,
    createdAt: reply.created_at
  });
}));

// Like a discussion
router.post('/:id/like', authenticateToken, asyncHandler(async (req, res) => {
	const { id } = req.params;
	const userId = req.user.id;

	// Verify discussion exists
	const discussion = await getRow('SELECT id FROM discussions WHERE id = $1', [id]);
	if (!discussion) {
		throw new AppError('Discussion not found', 404, 'Discussion Not Found');
	}

	// Ensure unique like per user
	const existing = await getRow('SELECT 1 FROM discussion_likes WHERE discussion_id = $1 AND user_id = $2', [id, userId]);
	if (existing) {
		return res.status(200).json({ success: true, liked: true });
	}

	await query(
		`INSERT INTO discussion_likes (discussion_id, user_id) VALUES ($1, $2)`,
		[id, userId]
	);

	// Optionally update cached count
	await query('UPDATE discussions SET like_count = COALESCE(like_count, 0) + 1 WHERE id = $1', [id]).catch(() => {});

	res.json({ success: true, liked: true });
}));

// Unlike a discussion
router.delete('/:id/like', authenticateToken, asyncHandler(async (req, res) => {
	const { id } = req.params;
	const userId = req.user.id;

	// Verify discussion exists
	const discussion = await getRow('SELECT id FROM discussions WHERE id = $1', [id]);
	if (!discussion) {
		throw new AppError('Discussion not found', 404, 'Discussion Not Found');
	}

	const result = await query('DELETE FROM discussion_likes WHERE discussion_id = $1 AND user_id = $2', [id, userId]);
	if (result.rowCount > 0) {
		await query('UPDATE discussions SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0) WHERE id = $1', [id]).catch(() => {});
	}

	res.json({ success: true, liked: false });
}));



module.exports = router; 