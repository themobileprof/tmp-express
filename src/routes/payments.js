const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { getRow, query } = require('../database/config');
const {
  generateReference,
  formatAmount,
  validatePaymentMethod,
  handleFlutterwaveError,
  getFlutterwaveToken,
  getSupportedPaymentMethods,
  baseUrl
} = require('../config/flutterwave');

const router = express.Router();

// POST /api/payments/initialize
router.post('/initialize', authenticateToken, asyncHandler(async (req, res) => {
  const { paymentType, itemId, paymentMethod, sponsorshipCode, callbackUrl } = req.body;
  const userId = req.user.id;

  // Validate payment type
  if (!['course', 'class'].includes(paymentType)) {
    return res.status(400).json({ error: 'Invalid payment type' });
  }

  // Validate payment method
  if (paymentMethod && !validatePaymentMethod(paymentMethod)) {
    return res.status(400).json({ error: 'Unsupported payment method' });
  }

  // Validate callback URL if provided
  if (callbackUrl) {
    try {
      new URL(callbackUrl);
    } catch {
      return res.status(400).json({ error: 'Invalid callback URL format' });
    }
  }

  // Get item details
  let item, itemDescription;
  if (paymentType === 'course') {
    item = await getRow('SELECT * FROM courses WHERE id = $1 AND is_published = true', [itemId]);
    itemDescription = `Payment for ${item?.title} course`;
  } else {
    item = await getRow('SELECT * FROM classes WHERE id = $1 AND is_published = true', [itemId]);
    itemDescription = `Payment for ${item?.title} class`;
  }

  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }

  // Check for existing enrollment
  const existingEnrollment = await getRow(
    `SELECT * FROM enrollments WHERE user_id = $1 AND ${paymentType}_id = $2`,
    [userId, itemId]
  );
  if (existingEnrollment) {
    return res.status(409).json({ error: 'Already enrolled in this item' });
  }

  // Handle sponsorship code
  let finalAmount = formatAmount(item.price);
  let sponsorshipDetails = null;
  let discountAmount = 0;

  if (sponsorshipCode) {
    const sponsorship = await getRow(
      `SELECT s.*, c.title as course_title, c.price as course_price
       FROM sponsorships s
       JOIN courses c ON s.course_id = c.id
       WHERE s.discount_code = $1 AND s.status = 'active'`,
      [sponsorshipCode]
    );

    if (!sponsorship || sponsorship.course_id !== itemId) {
      return res.status(400).json({ 
        error: 'Invalid sponsorship code',
        message: 'Sponsorship code is invalid or not applicable'
      });
    }

    const now = new Date();
    const isExpired = now < new Date(sponsorship.start_date) || now > new Date(sponsorship.end_date);
    const isFull = sponsorship.students_used >= sponsorship.max_students;
    if (isExpired || isFull) {
      return res.status(400).json({ 
        error: 'Invalid sponsorship code',
        message: 'Sponsorship code has expired or reached its limit'
      });
    }

    if (sponsorship.discount_type === 'percentage') {
      discountAmount = (item.price * sponsorship.discount_value) / 100;
      finalAmount = item.price - discountAmount;
    } else {
      discountAmount = sponsorship.discount_value;
      finalAmount = item.price - discountAmount;
    }

    if (finalAmount < 0) {
      finalAmount = 0;
      discountAmount = item.price;
    }

    sponsorshipDetails = {
      id: sponsorship.id,
      discountCode: sponsorship.discount_code,
      discountType: sponsorship.discount_type,
      discountValue: sponsorship.discount_value,
      discountAmount,
      originalPrice: item.price,
      finalPrice: finalAmount
    };
  }

  // Generate unique reference
  const reference = generateReference('TMP');

  // Build redirect URL
  const frontendUrl = process.env.FRONTEND_URL || 'https://themobileprof.com';
  const redirectUrl = callbackUrl 
    ? `${callbackUrl}?tx_ref=${reference}&payment_id=${uuidv4()}`
    : `${frontendUrl}/payment/callback?tx_ref=${reference}&payment_id=${uuidv4()}`;

  // Create payment record
  const payment = await getRow(
    `INSERT INTO payments (user_id, ${paymentType}_id, payment_type, amount, currency, flutterwave_reference, payment_method, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      userId, itemId, paymentType, finalAmount, 'USD', reference, paymentMethod || 'card',
      JSON.stringify({
        itemTitle: item.title,
        itemDescription,
        userEmail: req.user.email,
        userName: `${req.user.firstName} ${req.user.lastName}`,
        originalPrice: item.price,
        finalPrice: finalAmount,
        discountAmount,
        sponsorshipCode,
        sponsorshipDetails
      })
    ]
  );

  if (!payment) {
    throw new Error('Failed to create payment record');
  }

  console.log('Initializing Flutterwave v3 payment:', { reference, finalAmount, paymentId: payment.id });

  // Get secret key
  const accessToken = await getFlutterwaveToken();

  // Initialize payment
  const response = await axios.post(
    `${baseUrl}/payments`,
    {
      tx_ref: reference,
      amount: finalAmount,
      currency: 'USD',
      redirect_url: redirectUrl,
      customer: {
        email: req.user.email,
        name: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'Customer'
      },
      customizations: {
        title: 'TheMobileProf LMS',
        description: itemDescription,
        logo: 'https://themobileprof.com/assets/logo.jpg'
      },
      payment_options: getSupportedPaymentMethods('NG').join(','),
      meta: {
        payment_id: payment.id,
        user_id: userId,
        item_id: itemId,
        payment_type: paymentType,
        sponsorship_code: sponsorshipCode
      }
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  console.log('Flutterwave response:', { status: response.data.status, message: response.data.message });

  if (response.data.status === 'success') {
    await query('UPDATE payments SET status = $1 WHERE id = $2', ['pending', payment.id]);
    res.json({
      success: true,
      message: 'Payment initialized successfully',
      data: {
        payment_id: payment.id,
        reference,
        checkout_url: response.data.data.link,
        original_amount: item.price,
        final_amount: finalAmount,
        discount_amount: discountAmount,
        currency: 'USD',
        payment_type: paymentType,
        sponsorship: sponsorshipDetails
      }
    });
  } else {
    throw new Error(response.data.message || 'Payment initialization failed');
  }
}));

// GET /api/payments/verify/:reference
router.get('/verify/:reference', authenticateToken, asyncHandler(async (req, res) => {
  const { reference } = req.params;
  const userId = req.user.id;

  if (!reference) {
    return res.status(400).json({ error: 'Invalid Reference', message: 'Payment reference is required' });
  }

  const payment = await getRow(
    'SELECT * FROM payments WHERE flutterwave_reference = $1 AND user_id = $2',
    [reference, userId]
  );

  if (!payment) {
    return res.status(404).json({ error: 'Payment not found' });
  }

  const accessToken = await getFlutterwaveToken();
  const response = await axios.get(
    `${baseUrl}/transactions/verify_by_reference?tx_ref=${reference}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (response.data.status === 'success' && response.data.data.status === 'successful') {
    await query(
      'UPDATE payments SET status = $1, flutterwave_transaction_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      ['successful', response.data.data.id, payment.id]
    );

    if (payment.metadata?.sponsorshipCode) {
      try {
        const sponsorship = await getRow(
          'SELECT * FROM sponsorships WHERE discount_code = $1',
          [payment.metadata.sponsorshipCode]
        );
        if (sponsorship) {
          await query(
            `INSERT INTO sponsorship_usage (
              sponsorship_id, student_id, course_id, original_price, 
              discount_amount, final_price, used_at
            ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
            [
              sponsorship.id, userId, payment.course_id || payment.class_id,
              payment.metadata.originalPrice, payment.metadata.discountAmount, payment.metadata.finalPrice
            ]
          );
          await query('UPDATE sponsorships SET students_used = students_used + 1 WHERE id = $1', [sponsorship.id]);
        }
      } catch (sponsorshipError) {
        console.error('Error recording sponsorship usage:', sponsorshipError);
      }
    }

    if (payment.payment_type === 'course') {
      await query(
        `INSERT INTO enrollments (user_id, course_id, enrollment_type) VALUES ($1, $2, 'course')`,
        [userId, payment.course_id]
      );
      await query('UPDATE courses SET student_count = student_count + 1 WHERE id = $1', [payment.course_id]);
    } else {
      await query(
        `INSERT INTO enrollments (user_id, class_id, enrollment_type) VALUES ($1, $2, 'class')`,
        [userId, payment.class_id]
      );
      await query('UPDATE classes SET available_slots = available_slots - 1 WHERE id = $1', [payment.class_id]);
    }

    res.json({
      success: true,
      message: 'Payment verified and enrollment completed',
      payment: {
        id: payment.id,
        amount: payment.amount,
        status: 'successful',
        transactionId: response.data.data.id
      }
    });
  } else {
    throw new Error('Payment verification failed');
  }
}));

// POST /api/payments/webhook
router.post('/webhook', asyncHandler(async (req, res) => {
  const signature = req.headers['verif-hash'];
  if (!verifyWebhookSignature(req.body, signature)) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  const { tx_ref, status, transaction_id } = req.body;
  if (!tx_ref || !status) {
    return res.status(400).json({ error: 'Missing required webhook data' });
  }

  console.log('Webhook received:', { tx_ref, status, transaction_id });

  const payment = await getRow(
    'SELECT * FROM payments WHERE flutterwave_reference = $1',
    [tx_ref]
  );

  if (!payment) {
    console.log('Payment not found for webhook:', tx_ref);
    return res.status(404).json({ error: 'Payment not found' });
  }

  if (status === 'successful' && payment.status !== 'successful') {
    await query(
      'UPDATE payments SET status = $1, flutterwave_transaction_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      ['successful', transaction_id, payment.id]
    );
    console.log('Payment status updated via webhook:', { paymentId: payment.id, status, transaction_id });
  }

  res.json({ status: 'success' });
}));

// GET /api/payments/user
router.get('/user', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { limit = 20, offset = 0 } = req.query;

  const payments = await query(
    `SELECT p.*, c.title as course_title, cl.title as class_title
     FROM payments p
     LEFT JOIN courses c ON p.course_id = c.id
     LEFT JOIN classes cl ON p.class_id = cl.id
     WHERE p.user_id = $1
     ORDER BY p.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  res.json({ payments });
}));

// GET /api/payments/:id
router.get('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const payment = await getRow(
    `SELECT p.*, c.title as course_title, cl.title as class_title
     FROM payments p
     LEFT JOIN courses c ON p.course_id = c.id
     LEFT JOIN classes cl ON p.class_id = cl.id
     WHERE p.id = $1 AND p.user_id = $2`,
    [id, userId]
  );

  if (!payment) {
    return res.status(404).json({ error: 'Payment not found' });
  }

  res.json(payment);
}));

module.exports = router; 