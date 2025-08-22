const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, getRow, getRows } = require('../database/config');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authenticateToken, authorizeInstructor, authorizeOwnerOrAdmin } = require('../middleware/auth');
const { notifyClassEnrollment } = require('../utils/notifications');

const router = express.Router();

// Get upcoming classes (public endpoint) - MUST be before /:id routes
router.get('/upcoming', asyncHandler(async (req, res) => {
  const { 
    topic, 
    instructor, 
    type, 
    start_date, 
    end_date,
    sort = 'start_date', 
    order = 'asc',
    page = 1,
    limit = 12
  } = req.query;

  let whereConditions = ['cl.start_date > CURRENT_TIMESTAMP'];
  let params = [];
  let paramIndex = 1;

  // Add filters
  if (topic) {
    whereConditions.push(`cl.topic ILIKE $${paramIndex}`);
    params.push(`%${topic}%`);
    paramIndex++;
  }

  if (instructor) {
    whereConditions.push(`(u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex})`);
    params.push(`%${instructor}%`);
    paramIndex++;
  }

  if (type) {
    whereConditions.push(`cl.type = $${paramIndex}`);
    params.push(type);
    paramIndex++;
  }

  if (start_date) {
    whereConditions.push(`cl.start_date >= $${paramIndex}`);
    params.push(start_date);
    paramIndex++;
  }

  if (end_date) {
    whereConditions.push(`cl.start_date <= $${paramIndex}`);
    params.push(end_date);
    paramIndex++;
  }

  // Validate sort field
  const allowedSortFields = ['start_date', 'title', 'price', 'available_slots'];
  const sortField = allowedSortFields.includes(sort) ? sort : 'start_date';
  const sortOrder = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

  // Calculate offset
  const offset = (parseInt(page) - 1) * parseInt(limit);

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total
    FROM classes cl
    JOIN users u ON cl.instructor_id = u.id
    WHERE ${whereConditions.join(' AND ')}
  `;
  
  const countResult = await getRow(countQuery, params);
  const total = parseInt(countResult.total);

  // Get classes
  const classesQuery = `
    SELECT 
      cl.id, cl.title, cl.description, cl.topic, cl.type, cl.price,
      cl.start_date, cl.end_date, cl.duration, cl.location, cl.available_slots,
      cl.total_slots, cl.created_at,
      u.id as instructor_id, u.first_name as instructor_first_name, 
      u.last_name as instructor_last_name, u.avatar_url as instructor_avatar
    FROM classes cl
    JOIN users u ON cl.instructor_id = u.id
    WHERE ${whereConditions.join(' AND ')}
    ORDER BY cl.${sortField} ${sortOrder}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  params.push(parseInt(limit), offset);
  const classes = await getRows(classesQuery, params);

  res.json({
    classes: classes.map(cls => ({
      id: cls.id,
      title: cls.title,
      description: cls.description,
      topic: cls.topic,
      type: cls.type,
      price: cls.price,
      startDate: cls.start_date,
      endDate: cls.end_date,
      duration: cls.duration,
      location: cls.location,
      availableSlots: cls.available_slots,
      totalSlots: cls.total_slots,
      createdAt: cls.created_at,
      instructor: {
        id: cls.instructor_id,
        firstName: cls.instructor_first_name,
        lastName: cls.instructor_last_name,
        avatarUrl: cls.instructor_avatar
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
const validateClass = [
	body('title').trim().isLength({ min: 1 }).withMessage('Class title is required'),
	body('description').trim().isLength({ min: 10 }).withMessage('Class description must be at least 10 characters'),
	body('topic').trim().isLength({ min: 1 }).withMessage('Class topic is required'),
	body('type').isIn(['online', 'hybrid']).withMessage('Class type must be online or hybrid'),
	body('startDate').isISO8601().withMessage('Valid start date is required'),
	body('endDate').optional().isISO8601().withMessage('Valid end date is required'),
	body('duration').trim().isLength({ min: 1 }).withMessage('Class duration is required'),
	body('price').isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
	body('availableSlots').isInt({ min: 1 }).withMessage('Available slots must be at least 1'),
	body('totalSlots').isInt({ min: 1 }).withMessage('Total slots must be at least 1'),
	body('location').optional().isString().withMessage('Location must be a string')
];

// Allow optional sponsorshipId during enrollment
const validateClassEnrollment = [
	body('sponsorshipId').optional().isUUID().withMessage('Valid sponsorship ID is required')
];

// Get all classes
router.get('/', asyncHandler(async (req, res) => {
	const { topic, type, instructorId, isPublished, priceMin, priceMax, search, sort = 'start_date', order = 'asc', limit = 20, offset = 0 } = req.query;

	let whereClause = 'WHERE 1=1';
	let params = [];
	let paramIndex = 1;

	if (topic) {
		whereClause += ` AND cl.topic ILIKE $${paramIndex}`;
		params.push(`%${topic}%`);
		paramIndex++;
	}

	if (type) {
		whereClause += ` AND cl.type = $${paramIndex}`;
		params.push(type);
		paramIndex++;
	}

	if (instructorId) {
		whereClause += ` AND cl.instructor_id = $${paramIndex}`;
		params.push(instructorId);
		paramIndex++;
	}

	if (isPublished !== undefined) {
		whereClause += ` AND cl.is_published = $${paramIndex}`;
		params.push(isPublished === 'true');
		paramIndex++;
	}

	if (priceMin) {
		whereClause += ` AND cl.price >= $${paramIndex}`;
		params.push(parseFloat(priceMin));
		paramIndex++;
	}

	if (priceMax) {
		whereClause += ` AND cl.price <= $${paramIndex}`;
		params.push(parseFloat(priceMax));
		paramIndex++;
	}

	if (search) {
		whereClause += ` AND (cl.title ILIKE $${paramIndex} OR cl.description ILIKE $${paramIndex})`;
		params.push(`%${search}%`);
		paramIndex++;
	}

	const allowedSortFields = ['start_date', 'title', 'price', 'available_slots', 'created_at'];
	const sortField = allowedSortFields.includes(sort) ? sort : 'start_date';
	const sortOrder = order && order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

	const classes = await getRows(
		`SELECT cl.*, u.first_name as instructor_first_name, u.last_name as instructor_last_name
		 FROM classes cl
		 JOIN users u ON cl.instructor_id = u.id
		 ${whereClause}
		 ORDER BY cl.${sortField} ${sortOrder}
		 LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
		[...params, parseInt(limit), parseInt(offset)]
	);

	res.json({
		classes: classes.map(c => ({
			id: c.id,
			title: c.title,
			description: c.description,
			topic: c.topic,
			type: c.type,
			startDate: c.start_date,
			endDate: c.end_date,
			duration: c.duration,
			price: c.price,
			instructorId: c.instructor_id,
			instructorName: `${c.instructor_first_name} ${c.instructor_last_name}`,
			availableSlots: c.available_slots,
			totalSlots: c.total_slots,
			location: c.location,
			isPublished: c.is_published,
			createdAt: c.created_at,
			updatedAt: c.updated_at
		}))
	});
}));

// Create new class
router.post('/', authenticateToken, authorizeInstructor, validateClass, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }

  const {
    title, description, topic, type, startDate, endDate, duration, price, availableSlots, totalSlots, location
  } = req.body;
  const instructorId = req.user.id;

  // Validate slots
  if (availableSlots > totalSlots) {
    throw new AppError('Available slots cannot exceed total slots', 400, 'Invalid Slots');
  }

  const result = await query(
    `INSERT INTO classes (
      title, description, topic, type, start_date, end_date, duration, price,
      instructor_id, available_slots, total_slots, location
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *`,
    [title, description, topic, type, startDate, endDate, duration, price, instructorId, availableSlots, totalSlots, location]
  );

  const newClass = result.rows[0];

  res.status(201).json({
    id: newClass.id,
    title: newClass.title,
    description: newClass.description,
    topic: newClass.topic,
    type: newClass.type,
    startDate: newClass.start_date,
    endDate: newClass.end_date,
    duration: newClass.duration,
    price: newClass.price,
    instructorId: newClass.instructor_id,
    availableSlots: newClass.available_slots,
    totalSlots: newClass.total_slots,
    location: newClass.location,
    isPublished: newClass.is_published,
    createdAt: newClass.created_at
  });
}));

// Get class by ID
router.get('/:id', asyncHandler(async (req, res) => {
	const { id } = req.params;

	const classData = await getRow(
		`SELECT cl.*, u.first_name as instructor_first_name, u.last_name as instructor_last_name,
				u.avatar_url as instructor_avatar, u.bio as instructor_bio
		 FROM classes cl
		 JOIN users u ON cl.instructor_id = u.id
		 WHERE cl.id = $1`,
		[id]
	);

	if (!classData) {
		throw new AppError('Class not found', 404, 'Class Not Found');
	}

	// Get associated courses
	const courses = await getRows(
		`SELECT c.id, c.title, c.topic, c.duration, cc.order_index
		 FROM class_courses cc
		 JOIN courses c ON cc.course_id = c.id
		 WHERE cc.class_id = $1
		 ORDER BY cc.order_index`,
		[id]
	);

	res.json({
		id: classData.id,
		title: classData.title,
		description: classData.description,
		topic: classData.topic,
		type: classData.type,
		startDate: classData.start_date,
		endDate: classData.end_date,
		duration: classData.duration,
		price: classData.price,
		instructorId: classData.instructor_id,
		instructorName: `${classData.instructor_first_name} ${classData.instructor_last_name}`,
		instructorAvatar: classData.instructor_avatar,
		instructorBio: classData.instructor_bio,
		availableSlots: classData.available_slots,
		totalSlots: classData.total_slots,
		location: classData.location,
		isPublished: classData.is_published,
		createdAt: classData.created_at,
		updatedAt: classData.updated_at,
		courses: courses.map(c => ({
			id: c.id,
			title: c.title,
			topic: c.topic,
			duration: c.duration,
			orderIndex: c.order_index
		}))
	});
}));

// Distinct topics for filters
router.get('/topics', asyncHandler(async (req, res) => {
	const rows = await getRows(`SELECT DISTINCT topic FROM classes WHERE topic IS NOT NULL AND topic <> '' ORDER BY topic ASC`);
	res.json({ topics: rows.map(r => r.topic) });
}));

// Update class
router.put('/:id', authenticateToken, authorizeOwnerOrAdmin('classes', 'id'), validateClass, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }

  const { id } = req.params;
  const {
    title, description, topic, type, startDate, endDate, duration, price, availableSlots, totalSlots, location, isPublished
  } = req.body;

  // Verify class exists
  const classData = await getRow('SELECT * FROM classes WHERE id = $1', [id]);
  if (!classData) {
    throw new AppError('Class not found', 404, 'Class Not Found');
  }

  // Update class
  const result = await query(
    `UPDATE classes 
     SET title = COALESCE($1, title),
         description = COALESCE($2, description),
         topic = COALESCE($3, topic),
         type = COALESCE($4, type),
         start_date = COALESCE($5, start_date),
         end_date = COALESCE($6, end_date),
         duration = COALESCE($7, duration),
         price = COALESCE($8, price),
         available_slots = COALESCE($9, available_slots),
         total_slots = COALESCE($10, total_slots),
         location = COALESCE($11, location),
         is_published = COALESCE($12, is_published),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $13
     RETURNING *`,
    [title, description, topic, type, startDate, endDate, duration, price, availableSlots, totalSlots, location, isPublished, id]
  );

  const updatedClass = result.rows[0];

  res.json({
    id: updatedClass.id,
    title: updatedClass.title,
    description: updatedClass.description,
    topic: updatedClass.topic,
    type: updatedClass.type,
    startDate: updatedClass.start_date,
    endDate: updatedClass.end_date,
    duration: updatedClass.duration,
    price: updatedClass.price,
    availableSlots: updatedClass.available_slots,
    totalSlots: updatedClass.total_slots,
    location: updatedClass.location,
    isPublished: updatedClass.is_published,
    updatedAt: updatedClass.updated_at
  });
}));

// Delete class
router.delete('/:id', authenticateToken, authorizeOwnerOrAdmin('classes', 'id'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if class has enrollments
  const enrollments = await getRow('SELECT id FROM enrollments WHERE class_id = $1 LIMIT 1', [id]);
  if (enrollments) {
    throw new AppError('Cannot delete class that has enrollments', 400, 'Class Has Enrollments');
  }

  await query('DELETE FROM classes WHERE id = $1', [id]);

  res.json({
    message: 'Class deleted successfully'
  });
}));

// Get class enrollments
router.get('/:id/enrollments', authenticateToken, authorizeOwnerOrAdmin('classes', 'id'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Verify class exists
  const classData = await getRow('SELECT * FROM classes WHERE id = $1', [id]);
  if (!classData) {
    throw new AppError('Class not found', 404, 'Class Not Found');
  }

  const enrollments = await getRows(
    `SELECT e.*, u.first_name, u.last_name, u.email, u.avatar_url
     FROM enrollments e
     JOIN users u ON e.user_id = u.id
     WHERE e.class_id = $1
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
      enrolledAt: e.enrolled_at,
      completedAt: e.completed_at
    }))
  });
}));

// Enroll in class
router.post('/:id/enroll', authenticateToken, validateClassEnrollment, asyncHandler(async (req, res) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		throw new AppError('Validation failed', 400, 'Validation Error');
	}

	const { id } = req.params;
	const { sponsorshipId } = req.body;
	const userId = req.user.id;

	// Verify class exists and is published
	const classData = await getRow('SELECT * FROM classes WHERE id = $1 AND is_published = true', [id]);
	if (!classData) {
		throw new AppError('Class not found or not published', 404, 'Class Not Found');
	}

	// Check if class has available slots
	if (classData.available_slots <= 0) {
		throw new AppError('Class is full', 400, 'Class Full');
	}

	// Check if user is already enrolled
	const existingEnrollment = await getRow(
		'SELECT * FROM enrollments WHERE class_id = $1 AND user_id = $2',
		[id, userId]
	);

	if (existingEnrollment) {
		throw new AppError('User is already enrolled in this class', 400, 'Already Enrolled');
	}

	// If sponsorship provided, verify it is active and applicable to one of the class courses and used by this user
	let sponsorshipIdToSave = null;
	if (sponsorshipId) {
		const sponsorship = await getRow(
			'SELECT * FROM sponsorships WHERE id = $1 AND status = $2',
			[sponsorshipId, 'active']
		);
		if (!sponsorship) {
			throw new AppError('Invalid or inactive sponsorship', 400, 'Invalid Sponsorship');
		}

		// Verify the sponsorship course is part of this class (via class_courses)
		const mapping = await getRow(
			'SELECT 1 FROM class_courses WHERE class_id = $1 AND course_id = $2 LIMIT 1',
			[id, sponsorship.course_id]
		);
		if (!mapping) {
			throw new AppError('Sponsorship is not applicable to this class', 400, 'Invalid Sponsorship Mapping');
		}

		// Verify usage by this user
		const usage = await getRow(
			'SELECT 1 FROM sponsorship_usage WHERE sponsorship_id = $1 AND student_id = $2',
			[sponsorshipId, userId]
		);
		if (!usage) {
			throw new AppError('Sponsorship has not been used by this user', 400, 'Sponsorship Not Used');
		}

		sponsorshipIdToSave = sponsorshipId;
	}

	// Create enrollment
	const result = await query(
		`INSERT INTO enrollments (
			user_id, class_id, enrollment_type, sponsorship_id
		) VALUES ($1, $2, $3, $4)
		RETURNING *`,
		[userId, id, 'class', sponsorshipIdToSave]
	);

	const enrollment = result.rows[0];

	// Update available slots
	await query(
		'UPDATE classes SET available_slots = available_slots - 1 WHERE id = $1',
		[id]
	);

	// Send enrollment notification
	try {
		await notifyClassEnrollment(userId, id, classData.title);
	} catch (error) {
		console.error('Failed to send class enrollment notification:', error);
		// Don't fail the enrollment if notification fails
	}

	res.status(201).json({
		id: enrollment.id,
		userId: enrollment.user_id,
		classId: enrollment.class_id,
		enrollmentType: enrollment.enrollment_type,
		progress: enrollment.progress,
		status: enrollment.status,
		sponsorshipId: enrollment.sponsorship_id,
		enrolledAt: enrollment.enrolled_at
	});
}));

module.exports = router; 