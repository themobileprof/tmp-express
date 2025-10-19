const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, getRow, getRows } = require('../database/config');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authenticateToken, authorizeInstructor, authorizeOwnerOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const validateOpportunity = [
  body('courseId').isUUID().withMessage('Valid course ID is required'),
  body('targetStudents').isInt({ min: 1 }).withMessage('Target students must be at least 1'),
  body('fundingGoal').isFloat({ min: 0 }).withMessage('Funding goal must be a non-negative number'),
  body('urgency').isIn(['low', 'medium', 'high']).withMessage('Urgency must be low, medium, or high'),
  body('demographics').optional().isString().withMessage('Demographics must be a string'),
  body('impactDescription').optional().isString().withMessage('Impact description must be a string')
];

// Get all sponsorship opportunities
router.get('/', asyncHandler(async (req, res) => {
  const { isActive, urgency, limit = 20, offset = 0 } = req.query;

  let whereClause = 'WHERE so.is_active = true AND so.deleted_at IS NULL';
  let params = [];
  let paramIndex = 1;

  if (isActive !== undefined) {
    whereClause = `WHERE so.is_active = $${paramIndex} AND so.deleted_at IS NULL`;
    params.push(isActive === 'true');
    paramIndex++;
  }

  if (urgency) {
    whereClause += ` AND so.urgency = $${paramIndex}`;
    params.push(urgency);
    paramIndex++;
  }

  const opportunities = await getRows(
    `SELECT so.*, c.title as course_title, c.description as course_description, 
            c.duration as course_duration, c.topic as course_topic,
            u.first_name as instructor_first_name, u.last_name as instructor_last_name,
            u.avatar_url as instructor_avatar
     FROM sponsorship_opportunities so
     JOIN courses c ON so.course_id = c.id
     LEFT JOIN users u ON c.instructor_id = u.id
     ${whereClause}
     ORDER BY so.urgency DESC, so.created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, parseInt(limit), parseInt(offset)]
  );

  res.json({
    opportunities: opportunities.map(o => ({
      id: o.id,
      courseId: o.course_id,
      courseName: o.course_title,
      courseDescription: o.course_description,
      courseDuration: o.course_duration,
      courseTopic: o.course_topic,
      instructor: o.instructor_first_name ? `${o.instructor_first_name} ${o.instructor_last_name}` : null,
      instructorAvatar: o.instructor_avatar,
      targetStudents: o.target_students,
      fundingGoal: o.funding_goal,
      fundingRaised: o.funding_raised,
      fundingProgress: o.funding_goal > 0 ? ((o.funding_raised / o.funding_goal) * 100).toFixed(2) : 0,
      urgency: o.urgency,
      demographics: o.demographics,
      impactDescription: o.impact_description,
      isActive: o.is_active,
      createdAt: o.created_at,
      updatedAt: o.updated_at
    }))
  });
}));

// Create new sponsorship opportunity
router.post('/', authenticateToken, authorizeInstructor, validateOpportunity, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }

  const { courseId, targetStudents, fundingGoal, urgency, demographics, impactDescription } = req.body;

  // Verify course exists
  const course = await getRow('SELECT * FROM courses WHERE id = $1', [courseId]);
  if (!course) {
    throw new AppError('Course not found', 404, 'Course Not Found');
  }

  // Check if user is admin or the course instructor
  if (req.user.role !== 'admin' && course.instructor_id !== req.user.id) {
    throw new AppError('Access denied - only admins or course instructors can create sponsorship opportunities', 403, 'Access Denied');
  }

  // Check if opportunity already exists for this course
  const existingOpportunity = await getRow(
    'SELECT * FROM sponsorship_opportunities WHERE course_id = $1 AND is_active = true AND deleted_at IS NULL',
    [courseId]
  );

  if (existingOpportunity) {
    throw new AppError('Active sponsorship opportunity already exists for this course', 400, 'Opportunity Exists');
  }

  // Create opportunity
  const result = await query(
    `INSERT INTO sponsorship_opportunities (
      course_id, target_students, funding_goal, urgency, demographics, impact_description
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *`,
    [courseId, targetStudents, fundingGoal, urgency, demographics, impactDescription]
  );

  const opportunity = result.rows[0];

  res.status(201).json({
    id: opportunity.id,
    courseId: opportunity.course_id,
    targetStudents: opportunity.target_students,
    fundingGoal: opportunity.funding_goal,
    fundingRaised: opportunity.funding_raised,
    urgency: opportunity.urgency,
    demographics: opportunity.demographics,
    impactDescription: opportunity.impact_description,
    isActive: opportunity.is_active,
    createdAt: opportunity.created_at
  });
}));

// Get specific opportunity
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const opportunity = await getRow(
    `SELECT so.*, c.title as course_title, c.description as course_description,
            c.duration as course_duration, c.topic as course_topic, c.price as course_price,
            u.first_name as instructor_first_name, u.last_name as instructor_last_name,
            u.avatar_url as instructor_avatar, u.bio as instructor_bio
     FROM sponsorship_opportunities so
     JOIN courses c ON so.course_id = c.id
     LEFT JOIN users u ON c.instructor_id = u.id
     WHERE so.id = $1 AND so.deleted_at IS NULL`,
    [id]
  );

  if (!opportunity) {
    throw new AppError('Sponsorship opportunity not found', 404, 'Opportunity Not Found');
  }

  res.json({
    id: opportunity.id,
    courseId: opportunity.course_id,
    courseName: opportunity.course_title,
    courseDescription: opportunity.course_description,
    courseDuration: opportunity.course_duration,
    courseTopic: opportunity.course_topic,
    coursePrice: opportunity.course_price,
    instructor: opportunity.instructor_first_name ? `${opportunity.instructor_first_name} ${opportunity.instructor_last_name}` : null,
    instructorAvatar: opportunity.instructor_avatar,
    instructorBio: opportunity.instructor_bio,
    targetStudents: opportunity.target_students,
    fundingGoal: opportunity.funding_goal,
    fundingRaised: opportunity.funding_raised,
    fundingProgress: opportunity.funding_goal > 0 ? 
      ((opportunity.funding_raised / opportunity.funding_goal) * 100).toFixed(2) : 0,
    urgency: opportunity.urgency,
    demographics: opportunity.demographics,
    impactDescription: opportunity.impact_description,
    isActive: opportunity.is_active,
    createdAt: opportunity.created_at,
    updatedAt: opportunity.updated_at
  });
}));

// Update opportunity
router.put('/:id', authenticateToken, authorizeOwnerOrAdmin('sponsorship_opportunities', 'id'), validateOpportunity, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }

  const { id } = req.params;
  const { targetStudents, fundingGoal, urgency, demographics, impactDescription, isActive } = req.body;

  // Verify opportunity exists
  const opportunity = await getRow('SELECT * FROM sponsorship_opportunities WHERE id = $1 AND deleted_at IS NULL', [id]);
  if (!opportunity) {
    throw new AppError('Sponsorship opportunity not found', 404, 'Opportunity Not Found');
  }

  // Update opportunity
  const result = await query(
    `UPDATE sponsorship_opportunities 
     SET target_students = COALESCE($1, target_students),
         funding_goal = COALESCE($2, funding_goal),
         urgency = COALESCE($3, urgency),
         demographics = COALESCE($4, demographics),
         impact_description = COALESCE($5, impact_description),
         is_active = COALESCE($6, is_active),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $7
     RETURNING *`,
    [targetStudents, fundingGoal, urgency, demographics, impactDescription, isActive, id]
  );

  const updatedOpportunity = result.rows[0];

  res.json({
    id: updatedOpportunity.id,
    targetStudents: updatedOpportunity.target_students,
    fundingGoal: updatedOpportunity.funding_goal,
    fundingRaised: updatedOpportunity.funding_raised,
    urgency: updatedOpportunity.urgency,
    demographics: updatedOpportunity.demographics,
    impactDescription: updatedOpportunity.impact_description,
    isActive: updatedOpportunity.is_active,
    updatedAt: updatedOpportunity.updated_at
  });
}));

// Delete opportunity
router.delete('/:id', authenticateToken, authorizeOwnerOrAdmin('sponsorship_opportunities', 'id'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { permanent } = req.query;

  // Verify opportunity exists
  const opportunity = await getRow('SELECT id, title, deleted_at FROM sponsorship_opportunities WHERE id = $1', [id]);
  if (!opportunity) {
    throw new AppError('Sponsorship opportunity not found', 404, 'Opportunity Not Found');
  }

  // Soft delete (default)
  if (permanent !== 'true') {
    await query(
      'UPDATE sponsorship_opportunities SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
    return res.json({
      message: 'Sponsorship opportunity soft deleted successfully',
      note: 'Opportunity is hidden but contributions are preserved. Use restore endpoint to recover.',
      deletedAt: new Date().toISOString()
    });
  }

  // Check dependencies before permanent delete
  const contributionCount = await getRow(
    'SELECT COUNT(*)::int as count FROM sponsorship_contributions WHERE opportunity_id = $1',
    [id]
  );

  if (contributionCount.count > 0) {
    throw new AppError(
      `Cannot permanently delete opportunity with ${contributionCount.count} contribution(s).`,
      400,
      'Opportunity Has Dependencies'
    );
  }

  await query('DELETE FROM sponsorship_opportunities WHERE id = $1', [id]);

  res.json({
    message: 'Sponsorship opportunity permanently deleted',
    warning: 'This action cannot be undone'
  });
}));

// Restore soft-deleted opportunity
router.post('/:id/restore', authenticateToken, authorizeOwnerOrAdmin('sponsorship_opportunities', 'id'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const opportunity = await getRow('SELECT id, title, deleted_at FROM sponsorship_opportunities WHERE id = $1', [id]);
  if (!opportunity) {
    throw new AppError('Sponsorship opportunity not found', 404);
  }

  if (!opportunity.deleted_at) {
    throw new AppError('Opportunity is not deleted', 400, 'Not Deleted');
  }

  await query('UPDATE sponsorship_opportunities SET deleted_at = NULL WHERE id = $1', [id]);

  res.json({
    message: 'Sponsorship opportunity restored successfully',
    opportunityId: id,
    opportunityTitle: opportunity.title
  });
}));

// List deleted opportunities
router.get('/deleted/list', authenticateToken, asyncHandler(async (req, res) => {
  const deletedOpportunities = await query(`
    SELECT o.id, o.title, o.created_by, u.first_name, u.last_name, o.deleted_at, o.created_at
    FROM sponsorship_opportunities o
    LEFT JOIN users u ON o.created_by = u.id
    WHERE o.deleted_at IS NOT NULL
    ORDER BY o.deleted_at DESC
  `);

  res.json({
    deletedOpportunities: deletedOpportunities.rows,
    count: deletedOpportunities.rows.length
  });
}));

// Contribute to opportunity
router.post('/:id/contribute', authenticateToken, [
  body('amount').isFloat({ min: 0.01 }).withMessage('Contribution amount must be greater than 0'),
  body('message').optional().isString().withMessage('Message must be a string')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }

  const { id } = req.params;
  const { amount, message } = req.body;
  const contributorId = req.user.id;

  // Verify opportunity exists and is active
  const opportunity = await getRow(
    'SELECT * FROM sponsorship_opportunities WHERE id = $1 AND is_active = true AND deleted_at IS NULL',
    [id]
  );

  if (!opportunity) {
    throw new AppError('Sponsorship opportunity not found or inactive', 404, 'Opportunity Not Found');
  }

  // Check if funding goal has been reached
  if (opportunity.funding_raised >= opportunity.funding_goal) {
    throw new AppError('Funding goal has already been reached', 400, 'Goal Reached');
  }

  // Update funding raised
  const newFundingRaised = Math.min(opportunity.funding_raised + amount, opportunity.funding_goal);
  await query(
    'UPDATE sponsorship_opportunities SET funding_raised = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [newFundingRaised, id]
  );

  // Here you would typically integrate with a payment processor
  // For now, we'll just return success

  res.json({
    success: true,
    amount,
    newFundingRaised,
    message: 'Contribution recorded successfully'
  });
}));

module.exports = router; 