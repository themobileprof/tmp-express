const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, getRow, getRows } = require('../database/config');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authenticateToken, authorizeSponsor, authorizeOwnerOrAdmin } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const transporter = require('../mailer');
const { getSystemSetting } = require('../utils/systemSettings');

const router = express.Router();

// Validation middleware
const validateSponsorship = [
  body('courseIds').isArray({ min: 1 }).withMessage('At least one course ID is required'),
  body('courseIds.*').isUUID().withMessage('All course IDs must be valid UUIDs'),
  body('discountType').isIn(['percentage', 'fixed']).withMessage('Discount type must be percentage or fixed'),
  body('discountValue').isFloat({ min: 0 }).withMessage('Discount value must be a positive number'),
  body('maxStudents').isInt({ min: 1 }).withMessage('Maximum students must be at least 1'),
  body('duration').isInt({ min: 1, max: 12 }).withMessage('Duration must be between 1 and 12 months'),
  body('notes').optional().isString().withMessage('Notes must be a string')
];

const validateSponsorshipUsage = [
  body('studentId').isUUID().withMessage('Valid student ID is required'),
  body('courseId').isUUID().withMessage('Valid course ID is required')
];

// Generate unique discount code
const generateDiscountCode = async () => {
  const configuredLength = parseInt(await getSystemSetting('sponsorship_code_length', '10'));
  const codeLength = Number.isFinite(configuredLength) && configuredLength > 0 ? configuredLength : 10;
  let code;
  let isUnique = false;
  
  while (!isUnique) {
    code = 'SPONSOR' + Math.random().toString(36).substring(2, 2 + codeLength).toUpperCase();
    const existing = await getRow('SELECT id FROM sponsorships WHERE discount_code = $1', [code]);
    isUnique = !existing;
  }
  
  return code;
};

// Create new sponsorship
router.post('/', authenticateToken, authorizeSponsor, validateSponsorship, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }

  const { courseIds, discountType, discountValue, maxStudents, duration, notes } = req.body;
  const sponsorId = req.user.id;

  // Verify courses exist
  const courses = await Promise.all(courseIds.map(async (courseId) => {
    const course = await getRow('SELECT id, price FROM courses WHERE id = $1', [courseId]);
    if (!course) {
      throw new AppError(`Course with ID ${courseId} not found`, 404, 'Course Not Found');
    }
    return course;
  }));

  // Validate discount value
  if (discountType === 'percentage' && discountValue > 100) {
    throw new AppError('Percentage discount cannot exceed 100%', 400, 'Invalid Discount');
  }

  // Determine the minimum course price for fixed discount validation
  const minCoursePrice = Math.min(...courses.map(c => c.price));
  if (discountType === 'fixed' && discountValue >= minCoursePrice) {
    throw new AppError('Fixed discount cannot exceed or equal course price', 400, 'Invalid Discount');
  }

  // Calculate dates with cap from settings
  const configuredMaxMonths = parseInt(await getSystemSetting('max_sponsorship_duration_months', '12'));
  const maxMonths = Number.isFinite(configuredMaxMonths) && configuredMaxMonths > 0 ? configuredMaxMonths : 12;
  const cappedDuration = Math.min(duration, maxMonths);
  
  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + cappedDuration);

  // Generate unique discount code
  const discountCode = await generateDiscountCode();

  // Create sponsorship
  const result = await query(
    `INSERT INTO sponsorships (
      sponsor_id, discount_code, discount_type, discount_value,
      max_students, start_date, end_date, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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
    id: sponsorship.id,
    sponsorId: sponsorship.sponsor_id,
    courseIds: courseIds,
    discountCode: sponsorship.discount_code,
    discountType: sponsorship.discount_type,
    discountValue: sponsorship.discount_value,
    maxStudents: sponsorship.max_students,
    studentsUsed: sponsorship.students_used,
    startDate: sponsorship.start_date,
    endDate: sponsorship.end_date,
    status: sponsorship.status,
    completionRate: sponsorship.completion_rate,
    createdAt: sponsorship.created_at
  });
}));

// Get all sponsorships (for sponsor)
router.get('/', authenticateToken, authorizeSponsor, asyncHandler(async (req, res) => {
  const sponsorId = req.user.id;
  const { status, courseId } = req.query;

  let whereClause = 'WHERE sponsor_id = $1';
  let params = [sponsorId];
  let paramIndex = 2;

  if (status) {
    whereClause += ` AND status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (courseId) {
    whereClause += ` AND course_id = $${paramIndex}`;
    params.push(courseId);
  }

  const sponsorships = await getRows(
    `SELECT DISTINCT s.*, 
            array_agg(c.title) as course_titles,
            array_agg(c.price) as course_prices,
            array_agg(c.id) as course_ids
     FROM sponsorships s
     JOIN sponsorship_courses sc ON s.id = sc.sponsorship_id
     JOIN courses c ON sc.course_id = c.id
     ${whereClause}
     GROUP BY s.id
     ORDER BY s.created_at DESC`,
    params
  );

  res.json({
    sponsorships: sponsorships.map(s => ({
      id: s.id,
      courseIds: s.course_ids,
      courseTitles: s.course_titles,
      coursePrices: s.course_prices,
      discountCode: s.discount_code,
      discountType: s.discount_type,
      discountValue: s.discount_value,
      maxStudents: s.max_students,
      studentsUsed: s.students_used,
      remainingSpots: s.max_students - s.students_used,
      startDate: s.start_date,
      endDate: s.end_date,
      status: s.status,
      completionRate: s.completion_rate,
      notes: s.notes,
      createdAt: s.created_at
    }))
  });
}));

// Get specific sponsorship
router.get('/:id', authenticateToken, authorizeOwnerOrAdmin('sponsorships'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const sponsorship = await getRow(
    `SELECT s.*, 
            array_agg(c.title) as course_titles,
            array_agg(c.price) as course_prices,
            array_agg(c.id) as course_ids,
            array_agg(c.description) as course_descriptions,
            u.first_name as sponsor_first_name, u.last_name as sponsor_last_name
     FROM sponsorships s
     JOIN sponsorship_courses sc ON s.id = sc.sponsorship_id
     JOIN courses c ON sc.course_id = c.id
     JOIN users u ON s.sponsor_id = u.id
     WHERE s.id = $1
     GROUP BY s.id, u.first_name, u.last_name`,
    [id]
  );

  if (!sponsorship) {
    throw new AppError('Sponsorship not found', 404, 'Sponsorship Not Found');
  }

  res.json({
    id: sponsorship.id,
    sponsorId: sponsorship.sponsor_id,
    sponsorName: `${sponsorship.sponsor_first_name} ${sponsorship.sponsor_last_name}`,
    courseIds: sponsorship.course_ids,
    courseTitles: sponsorship.course_titles,
    coursePrices: sponsorship.course_prices,
    courseDescriptions: sponsorship.course_descriptions,
    discountCode: sponsorship.discount_code,
    discountType: sponsorship.discount_type,
    discountValue: sponsorship.discount_value,
    maxStudents: sponsorship.max_students,
    studentsUsed: sponsorship.students_used,
    remainingSpots: sponsorship.max_students - sponsorship.students_used,
    startDate: sponsorship.start_date,
    endDate: sponsorship.end_date,
    status: sponsorship.status,
    completionRate: sponsorship.completion_rate,
    notes: sponsorship.notes,
    createdAt: sponsorship.created_at
  });
}));

// Update sponsorship
router.put('/:id', authenticateToken, authorizeOwnerOrAdmin('sponsorships'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  // Verify sponsorship exists and belongs to user
  const sponsorship = await getRow('SELECT * FROM sponsorships WHERE id = $1', [id]);
  if (!sponsorship) {
    throw new AppError('Sponsorship not found', 404, 'Sponsorship Not Found');
  }

  // Update sponsorship
  const result = await query(
    `UPDATE sponsorships 
     SET status = COALESCE($1, status), 
         notes = COALESCE($2, notes),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $3
     RETURNING *`,
    [status, notes, id]
  );

  const updatedSponsorship = result.rows[0];

  res.json({
    id: updatedSponsorship.id,
    status: updatedSponsorship.status,
    notes: updatedSponsorship.notes,
    updatedAt: updatedSponsorship.updated_at
  });
}));

// Delete sponsorship
router.delete('/:id', authenticateToken, authorizeOwnerOrAdmin('sponsorships'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if sponsorship has been used
  const usage = await getRow('SELECT id FROM sponsorship_usage WHERE sponsorship_id = $1 LIMIT 1', [id]);
  if (usage) {
    throw new AppError('Cannot delete sponsorship that has been used', 400, 'Sponsorship In Use');
  }

  await query('DELETE FROM sponsorships WHERE id = $1', [id]);

  res.json({
    message: 'Sponsorship deleted successfully'
  });
}));

// Use sponsorship code
router.post('/:id/use', authenticateToken, validateSponsorshipUsage, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }

  const { id } = req.params;
  const { studentId, courseId } = req.body;

  // Verify sponsorship exists and is active
  const sponsorship = await getRow(
    `SELECT s.*, c.price as course_price, c.title as course_title
     FROM sponsorships s
     JOIN sponsorship_courses sc ON s.id = sc.sponsorship_id
     JOIN courses c ON sc.course_id = c.id
     WHERE s.id = $1 AND s.status = 'active' AND c.id = $2`,
    [id, courseId]
  );

  if (!sponsorship) {
    throw new AppError('Sponsorship not found or inactive for this course', 404, 'Sponsorship Not Found');
  }

  // Verify course matches (no longer needed since we filter by courseId in the query above)
  // if (sponsorship.course_id !== courseId) {
  //   throw new AppError('Sponsorship is not valid for this course', 400, 'Invalid Course');
  // }

  // Check if sponsorship is still valid
  const now = new Date();
  if (now < new Date(sponsorship.start_date) || now > new Date(sponsorship.end_date)) {
    throw new AppError('Sponsorship is not currently active', 400, 'Sponsorship Expired');
  }

  // Check if student has already used this sponsorship
  const existingUsage = await getRow(
    'SELECT id FROM sponsorship_usage WHERE sponsorship_id = $1 AND student_id = $2',
    [id, studentId]
  );

  if (existingUsage) {
    throw new AppError('Student has already used this sponsorship', 400, 'Already Used');
  }

  // Check if sponsorship has reached maximum students
  if (sponsorship.students_used >= sponsorship.max_students) {
    throw new AppError('Sponsorship has reached maximum number of students', 400, 'Sponsorship Full');
  }

  // Calculate discount
  const originalPrice = sponsorship.course_price;
  let discountAmount = 0;
  let finalPrice = originalPrice;

  if (sponsorship.discount_type === 'percentage') {
    discountAmount = (originalPrice * sponsorship.discount_value) / 100;
    finalPrice = originalPrice - discountAmount;
  } else {
    discountAmount = sponsorship.discount_value;
    finalPrice = originalPrice - discountAmount;
  }

  // Ensure final price is not negative
  if (finalPrice < 0) {
    finalPrice = 0;
    discountAmount = originalPrice;
  }

  // Record usage
  await query(
    `INSERT INTO sponsorship_usage (
      sponsorship_id, student_id, original_price, discount_amount, final_price
    ) VALUES ($1, $2, $3, $4, $5)`,
    [id, studentId, originalPrice, discountAmount, finalPrice]
  );

  // Update sponsorship usage count
  await query(
    'UPDATE sponsorships SET students_used = students_used + 1 WHERE id = $1',
    [id]
  );

  res.json({
    success: true,
    originalPrice,
    discountAmount,
    finalPrice,
    message: 'Sponsorship code applied successfully'
  });
}));

// Validate sponsorship code
router.get('/code/:discountCode', asyncHandler(async (req, res) => {
  const { discountCode } = req.params;

  const sponsorship = await getRow(
    `SELECT s.*, 
            array_agg(c.title) as course_titles,
            array_agg(c.price) as course_prices,
            array_agg(c.id) as course_ids
     FROM sponsorships s
     JOIN sponsorship_courses sc ON s.id = sc.sponsorship_id
     JOIN courses c ON sc.course_id = c.id
     WHERE s.discount_code = $1 AND s.status = 'active'
     GROUP BY s.id`,
    [discountCode]
  );

  if (!sponsorship) {
    return res.json({
      valid: false,
      message: 'Invalid or inactive sponsorship code'
    });
  }

  // Check if sponsorship is still valid
  const now = new Date();
  const isExpired = now < new Date(sponsorship.start_date) || now > new Date(sponsorship.end_date);
  const isFull = sponsorship.students_used >= sponsorship.max_students;

  res.json({
    valid: !isExpired && !isFull,
    sponsorship: {
      id: sponsorship.id,
      courseNames: sponsorship.course_titles,
      coursePrices: sponsorship.course_prices,
      courseIds: sponsorship.course_ids,
      discountType: sponsorship.discount_type,
      discountValue: sponsorship.discount_value,
      maxStudents: sponsorship.max_students,
      studentsUsed: sponsorship.students_used,
      remainingSpots: sponsorship.max_students - sponsorship.students_used,
      startDate: sponsorship.start_date,
      endDate: sponsorship.end_date,
      isExpired,
      isFull
    }
  });
}));

// Get sponsorship statistics
router.get('/:id/stats', authenticateToken, authorizeOwnerOrAdmin('sponsorships'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Get sponsorship details
  const sponsorship = await getRow(
    `SELECT s.*, 
            array_agg(c.title) as course_titles
     FROM sponsorships s
     JOIN sponsorship_courses sc ON s.id = sc.sponsorship_id
     JOIN courses c ON sc.course_id = c.id
     WHERE s.id = $1
     GROUP BY s.id`,
    [id]
  );

  if (!sponsorship) {
    throw new AppError('Sponsorship not found', 404, 'Sponsorship Not Found');
  }

  // Get usage statistics
  const usageStats = await getRow(
    `SELECT 
       COUNT(*) as total_usage,
       SUM(discount_amount) as total_discount_given,
       AVG(final_price) as average_final_price
     FROM sponsorship_usage
     WHERE sponsorship_id = $1`,
    [id]
  );

  // Get monthly usage
  const monthlyStats = await getRows(
    `SELECT 
       DATE_TRUNC('month', used_at) as month,
       COUNT(*) as students_enrolled
     FROM sponsorship_usage
     WHERE sponsorship_id = $1
     GROUP BY DATE_TRUNC('month', used_at)
     ORDER BY month DESC
     LIMIT 12`,
    [id]
  );

  res.json({
    sponsorship: {
      id: sponsorship.id,
      courseTitle: sponsorship.course_titles.join(', '), // Display all course titles
      discountCode: sponsorship.discount_code,
      discountType: sponsorship.discount_type,
      discountValue: sponsorship.discount_value,
      maxStudents: sponsorship.max_students,
      studentsUsed: sponsorship.students_used,
      completionRate: sponsorship.completion_rate,
      status: sponsorship.status
    },
    stats: {
      totalUsage: parseInt(usageStats.total_usage) || 0,
      totalDiscountGiven: parseFloat(usageStats.total_discount_given) || 0,
      averageFinalPrice: parseFloat(usageStats.average_final_price) || 0,
      utilizationRate: sponsorship.max_students > 0 ? 
        ((sponsorship.students_used / sponsorship.max_students) * 100).toFixed(2) : 0
    },
    monthlyStats: monthlyStats.map(stat => ({
      month: stat.month,
      studentsEnrolled: parseInt(stat.students_enrolled)
    }))
  });
}));

// Send sponsorship details via email
router.post('/:id/email', authenticateToken, authorizeOwnerOrAdmin('sponsorships'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { recipientEmail, isForRecipient, customMessage } = req.body;

  if (!recipientEmail) {
    throw new AppError('Recipient email is required', 400, 'Validation Error');
  }

  // Get sponsorship details
  const sponsorship = await getRow(
    `SELECT s.*, 
            array_agg(c.title) as course_titles,
            array_agg(c.description) as course_descriptions,
            array_agg(c.price) as course_prices
     FROM sponsorships s
     JOIN sponsorship_courses sc ON s.id = sc.sponsorship_id
     JOIN courses c ON sc.course_id = c.id
     WHERE s.id = $1
     GROUP BY s.id`,
    [id]
  );

  if (!sponsorship) {
    throw new AppError('Sponsorship not found', 404, 'Sponsorship Not Found');
  }

  // Get system settings for email
  const siteDescription = await getSystemSetting('site_description', 'TheMobileProf LMS');
  const supportEmail = await getSystemSetting('support_email', 'support@themobileprof.com');

  // Compose email
  const courseTitles = sponsorship.course_titles.join(', ');
  const subject = isForRecipient
    ? `You've received a sponsorship for ${courseTitles}!`
    : `Sponsorship details for ${courseTitles}`;

  // Build course details HTML
  const courseDetailsHtml = sponsorship.course_titles.map((title, index) => `
    <li><strong>Course ${index + 1}:</strong> ${title}</li>
    <li><strong>Description:</strong> ${sponsorship.course_descriptions[index]}</li>
    <li><strong>Price:</strong> $${sponsorship.course_prices[index]}</li>
  `).join('');

  const message = `
    <h2>${subject}</h2>
    <p>${customMessage || ''}</p>
    <ul>
      ${courseDetailsHtml}
      <li><strong>Discount Code:</strong> ${sponsorship.discount_code}</li>
      <li><strong>Discount Type:</strong> ${sponsorship.discount_type}</li>
      <li><strong>Discount Value:</strong> ${sponsorship.discount_value}</li>
      <li><strong>Max Students:</strong> ${sponsorship.max_students}</li>
      <li><strong>Valid Until:</strong> ${new Date(sponsorship.end_date).toLocaleDateString()}</li>
    </ul>
    <p>To use this sponsorship, enroll in any of the courses above and enter the discount code above.</p>
    <p>If you have any questions, please contact us at ${supportEmail}.</p>
  `;

  // Send email
  await transporter.sendMail({
    from: process.env.EMAIL_FROM_ADDRESS,
    to: recipientEmail,
    subject,
    html: message,
  });

  res.json({
    success: true,
    message: 'Sponsorship details sent successfully'
  });
}));

module.exports = router; 