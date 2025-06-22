const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, getRow, getRows } = require('../database/config');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const { 
  getFlutterwave, 
  verifyWebhookSignature, 
  generateReference, 
  formatAmount, 
  parseAmount 
} = require('../config/flutterwave');

const router = express.Router();

// Validation middleware
const validatePaymentInitiation = [
  body('paymentType').isIn(['course', 'class']).withMessage('Payment type must be course or class'),
  body('itemId').isUUID().withMessage('Valid item ID is required'),
  body('paymentMethod').optional().isIn(['card', 'bank_transfer', 'ussd', 'mobile_money', 'qr_code']).withMessage('Invalid payment method')
];

const validateWebhook = [
  body('event').isString().withMessage('Event is required'),
  body('data').isObject().withMessage('Data object is required')
];

// Initialize payment
router.post('/initialize', authenticateToken, validatePaymentInitiation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }

  const { paymentType, itemId, paymentMethod } = req.body;
  const userId = req.user.id;

  // Get item details (course or class)
  let item, itemTitle, itemDescription;
  
  if (paymentType === 'course') {
    item = await getRow('SELECT * FROM courses WHERE id = $1 AND is_published = true', [itemId]);
    if (!item) {
      throw new AppError('Course not found or not published', 404, 'Course Not Found');
    }
    itemTitle = item.title;
    itemDescription = `Payment for ${item.title} course`;
  } else {
    item = await getRow('SELECT * FROM classes WHERE id = $1 AND is_published = true', [itemId]);
    if (!item) {
      throw new AppError('Class not found or not published', 404, 'Class Not Found');
    }
    itemTitle = item.title;
    itemDescription = `Payment for ${item.title} class`;
  }

  // Check if user is already enrolled
  const existingEnrollment = await getRow(
    `SELECT * FROM enrollments WHERE user_id = $1 AND ${paymentType}_id = $2`,
    [userId, itemId]
  );

  if (existingEnrollment) {
    throw new AppError(`User is already enrolled in this ${paymentType}`, 400, 'Already Enrolled');
  }

  // Check if class has available slots
  if (paymentType === 'class' && item.available_slots <= 0) {
    throw new AppError('Class is full', 400, 'Class Full');
  }

  // Generate unique reference
  const reference = generateReference();

  // Create payment record
  const paymentResult = await query(
    `INSERT INTO payments (
      user_id, ${paymentType}_id, payment_type, amount, currency, 
      flutterwave_reference, payment_method, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [
      userId, 
      itemId, 
      paymentType, 
      item.price, 
      'NGN', 
      reference, 
      paymentMethod || null,
      JSON.stringify({
        itemTitle,
        itemDescription,
        userEmail: req.user.email,
        userName: `${req.user.first_name} ${req.user.last_name}`
      })
    ]
  );

  const payment = paymentResult.rows[0];

  // Initialize Flutterwave payment
  const paymentData = {
    tx_ref: reference,
    amount: formatAmount(item.price),
    currency: 'NGN',
    redirect_url: `${process.env.FRONTEND_URL}/payment/verify`,
    customer: {
      email: req.user.email,
      name: `${req.user.first_name} ${req.user.last_name}`,
      phone_number: req.user.phone || ''
    },
    customizations: {
      title: 'TheMobileProf LMS',
      description: itemDescription,
      logo: process.env.LOGO_URL || 'https://themobileprof.com/assets/logo.jpg'
    },
    meta: {
      payment_id: payment.id,
      user_id: userId,
      item_id: itemId,
      payment_type: paymentType
    }
  };

  try {
    const flw = getFlutterwave();
    if (!flw) {
      throw new AppError('Payment service not configured', 503, 'Service Unavailable');
    }
    
    const response = await flw.Charge.card(paymentData);
    
    if (response.status === 'success') {
      res.json({
        success: true,
        paymentId: payment.id,
        reference: reference,
        authorizationUrl: response.data.link,
        paymentData: response.data
      });
    } else {
      throw new AppError('Payment initialization failed', 400, 'Payment Error');
    }
  } catch (error) {
    // Update payment status to failed
    await query(
      'UPDATE payments SET status = $1, error_message = $2 WHERE id = $3',
      ['failed', error.message, payment.id]
    );

    throw new AppError('Payment initialization failed', 400, 'Payment Error');
  }
}));

// Verify payment
router.get('/verify/:reference', authenticateToken, asyncHandler(async (req, res) => {
  const { reference } = req.params;
  const userId = req.user.id;

  // Get payment record
  const payment = await getRow(
    'SELECT * FROM payments WHERE flutterwave_reference = $1 AND user_id = $2',
    [reference, userId]
  );

  if (!payment) {
    throw new AppError('Payment not found', 404, 'Payment Not Found');
  }

  // Verify with Flutterwave
  try {
    const flw = getFlutterwave();
    if (!flw) {
      throw new AppError('Payment service not configured', 503, 'Service Unavailable');
    }
    
    const response = await flw.Transaction.verify({ tx_ref: reference });
    
    if (response.status === 'success' && response.data.status === 'successful') {
      // Update payment status
      await query(
        'UPDATE payments SET status = $1, flutterwave_transaction_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        ['successful', response.data.id, payment.id]
      );

      // Create enrollment
      if (payment.payment_type === 'course') {
        await query(
          `INSERT INTO enrollments (user_id, course_id, enrollment_type)
           VALUES ($1, $2, 'course')`,
          [userId, payment.course_id]
        );

        // Update course student count
        await query(
          'UPDATE courses SET student_count = student_count + 1 WHERE id = $1',
          [payment.course_id]
        );
      } else {
        await query(
          `INSERT INTO enrollments (user_id, class_id, enrollment_type)
           VALUES ($1, $2, 'class')`,
          [userId, payment.class_id]
        );

        // Update class available slots
        await query(
          'UPDATE classes SET available_slots = available_slots - 1 WHERE id = $1',
          [payment.class_id]
        );
      }

      res.json({
        success: true,
        message: 'Payment verified and enrollment completed',
        payment: {
          id: payment.id,
          amount: payment.amount,
          status: 'successful',
          transactionId: response.data.id
        }
      });
    } else {
      // Update payment status to failed
      await query(
        'UPDATE payments SET status = $1, error_message = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        ['failed', 'Payment verification failed', payment.id]
      );

      res.json({
        success: false,
        message: 'Payment verification failed',
        payment: {
          id: payment.id,
          status: 'failed'
        }
      });
    }
  } catch (error) {
    // Update payment status to failed
    await query(
      'UPDATE payments SET status = $1, error_message = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      ['failed', error.message, payment.id]
    );

    throw new AppError('Payment verification failed', 400, 'Payment Error');
  }
}));

// Webhook handler
router.post('/webhook', validateWebhook, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Invalid webhook data', 400, 'Validation Error');
  }

  const { event, data } = req.body;
  const signature = req.headers['verif-hash'];

  // Verify webhook signature
  if (!verifyWebhookSignature(req.body, signature)) {
    throw new AppError('Invalid webhook signature', 401, 'Unauthorized');
  }

  // Log webhook
  await query(
    'INSERT INTO payment_webhooks (flutterwave_reference, webhook_data) VALUES ($1, $2)',
    [data.tx_ref, JSON.stringify(req.body)]
  );

  // Process webhook based on event
  if (event === 'charge.completed' && data.status === 'successful') {
    const payment = await getRow(
      'SELECT * FROM payments WHERE flutterwave_reference = $1',
      [data.tx_ref]
    );

    if (payment && payment.status === 'pending') {
      // Update payment status
      await query(
        'UPDATE payments SET status = $1, flutterwave_transaction_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        ['successful', data.id, payment.id]
      );

      // Create enrollment
      if (payment.payment_type === 'course') {
        await query(
          `INSERT INTO enrollments (user_id, course_id, enrollment_type)
           VALUES ($1, $2, 'course')`,
          [payment.user_id, payment.course_id]
        );

        // Update course student count
        await query(
          'UPDATE courses SET student_count = student_count + 1 WHERE id = $1',
          [payment.course_id]
        );
      } else {
        await query(
          `INSERT INTO enrollments (user_id, class_id, enrollment_type)
           VALUES ($1, $2, 'class')`,
          [payment.user_id, payment.class_id]
        );

        // Update class available slots
        await query(
          'UPDATE classes SET available_slots = available_slots - 1 WHERE id = $1',
          [payment.class_id]
        );
      }

      // Mark webhook as processed
      await query(
        'UPDATE payment_webhooks SET processed = true, processed_at = CURRENT_TIMESTAMP WHERE flutterwave_reference = $1',
        [data.tx_ref]
      );
    }
  }

  res.json({ status: 'success' });
}));

// Get user payments
router.get('/user', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { limit = 20, offset = 0 } = req.query;

  const payments = await getRows(
    `SELECT p.*, 
            c.title as course_title, c.topic as course_topic,
            cl.title as class_title, cl.topic as class_topic
     FROM payments p
     LEFT JOIN courses c ON p.course_id = c.id
     LEFT JOIN classes cl ON p.class_id = cl.id
     WHERE p.user_id = $1
     ORDER BY p.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, parseInt(limit), parseInt(offset)]
  );

  res.json({
    payments: payments.map(p => ({
      id: p.id,
      paymentType: p.payment_type,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      paymentMethod: p.payment_method,
      reference: p.flutterwave_reference,
      transactionId: p.flutterwave_transaction_id,
      course: p.course_id ? {
        id: p.course_id,
        title: p.course_title,
        topic: p.course_topic
      } : null,
      class: p.class_id ? {
        id: p.class_id,
        title: p.class_title,
        topic: p.class_topic
      } : null,
      createdAt: p.created_at,
      updatedAt: p.updated_at
    }))
  });
}));

// Get payment by ID
router.get('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const payment = await getRow(
    `SELECT p.*, 
            c.title as course_title, c.topic as course_topic,
            cl.title as class_title, cl.topic as class_topic
     FROM payments p
     LEFT JOIN courses c ON p.course_id = c.id
     LEFT JOIN classes cl ON p.class_id = cl.id
     WHERE p.id = $1 AND p.user_id = $2`,
    [id, userId]
  );

  if (!payment) {
    throw new AppError('Payment not found', 404, 'Payment Not Found');
  }

  res.json({
    id: payment.id,
    paymentType: payment.payment_type,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    paymentMethod: payment.payment_method,
    reference: payment.flutterwave_reference,
    transactionId: payment.flutterwave_transaction_id,
    errorMessage: payment.error_message,
    course: payment.course_id ? {
      id: payment.course_id,
      title: payment.course_title,
      topic: payment.course_topic
    } : null,
    class: payment.class_id ? {
      id: payment.class_id,
      title: payment.class_title,
      topic: payment.class_topic
    } : null,
    metadata: payment.metadata,
    createdAt: payment.created_at,
    updatedAt: payment.updated_at
  });
}));

module.exports = router; 