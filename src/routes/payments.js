const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { getRow, query, getRows } = require('../database/config');
const { getSystemSetting } = require('../utils/systemSettings');
const { notifyPaymentSuccess } = require('../utils/notifications');
const {
  generateReference,
  formatAmount,
  parseAmount,
  validatePaymentMethod,
  getFlutterwaveToken,
  verifyWebhookSignature,
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

  // Handle sponsorship code (parseAmount allows $0 free courses; formatAmount rejects <= 0)
  const basePrice = parseAmount(item.price);
  let finalAmount = basePrice > 0 ? formatAmount(basePrice) : 0;
  let sponsorshipDetails = null;
  let discountAmount = 0;

  if (sponsorshipCode) {
    const sponsorship = await getRow(
      `SELECT s.*, c.title as course_title, c.price as course_price
       FROM sponsorships s
       JOIN sponsorship_courses sc ON s.id = sc.sponsorship_id
       JOIN courses c ON sc.course_id = c.id
       WHERE s.discount_code = $1 AND s.status = 'active' AND c.id = $2`,
      [sponsorshipCode, itemId]
    );

    if (!sponsorship) {
      return res.status(400).json({ 
        error: 'Invalid sponsorship code',
        message: 'Sponsorship code (' + sponsorshipCode + ') is invalid or not applicable for this course'
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
  const frontendUrl = process.env.FRONTEND_URL || 'https://lms.themobileprof.com';
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

  // For 100% discounts, mark payment as successful and proceed to verification flow
  if (finalAmount === 0) {
    console.log('Free enrollment detected, marking payment as successful:', { reference, paymentId: payment.id });
    
    // Update payment status to successful immediately
    await query('UPDATE payments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', ['successful', payment.id]);

    // If a sponsorship code was applied, record usage (idempotent)
    if (sponsorshipCode) {
      try {
        const sponsorship = await getRow(
          `SELECT s.* FROM sponsorships s
           JOIN sponsorship_courses sc ON s.id = sc.sponsorship_id
           WHERE s.discount_code = $1 AND s.status = 'active' AND sc.course_id = $2`,
          [sponsorshipCode, paymentType === 'course' ? itemId : null]
        );
        if (sponsorship) {
          const existingUsage = await getRow(
            'SELECT id FROM sponsorship_usage WHERE sponsorship_id = $1 AND student_id = $2',
            [sponsorship.id, userId]
          );
          if (!existingUsage) {
            // Enforce capacity
            if (sponsorship.students_used < sponsorship.max_students) {
              await query(
                `INSERT INTO sponsorship_usage (
                  sponsorship_id, student_id, course_id, original_price, discount_amount, final_price, used_at
                ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
                [
                  sponsorship.id,
                  userId,
                  paymentType === 'course' ? itemId : null,
                  item.price,
                  discountAmount,
                  finalAmount
                ]
              );
              await query('UPDATE sponsorships SET students_used = students_used + 1 WHERE id = $1', [sponsorship.id]);
            }
          }
        }
      } catch (err) {
        console.error('Error recording sponsorship usage for free enrollment:', err);
      }
    }

    // Create enrollment immediately
    try {
      if (paymentType === 'course') {
        await query(
          `INSERT INTO enrollments (user_id, course_id, enrollment_type, sponsorship_id) VALUES ($1, $2, 'course', $3)`,
          [
            userId,
            itemId,
            sponsorshipCode ? (await getRow('SELECT id FROM sponsorships WHERE discount_code = $1', [sponsorshipCode]))?.id : null
          ]
        );
        await query('UPDATE courses SET student_count = student_count + 1 WHERE id = $1', [itemId]);
      } else if (paymentType === 'class') {
        await query(
          `INSERT INTO enrollments (user_id, class_id, enrollment_type, sponsorship_id) VALUES ($1, $2, 'class', $3)`,
          [
            userId,
            itemId,
            sponsorshipCode ? (await getRow('SELECT id FROM sponsorships WHERE discount_code = $1', [sponsorshipCode]))?.id : null
          ]
        );
        await query('UPDATE classes SET available_slots = available_slots - 1 WHERE id = $1', [itemId]);
      }
    } catch (err) {
      console.error('Error creating enrollment for free enrollment:', err);
    }
    
    // Return success with special flag for frontend to handle
    res.json({
      success: true,
      message: 'Free enrollment completed successfully',
      data: {
        payment_id: payment.id,
        reference,
        checkout_url: null,
        original_amount: item.price,
        final_amount: finalAmount,
        discount_amount: discountAmount,
        currency: 'USD',
        payment_type: paymentType,
        sponsorship: sponsorshipDetails,
        is_free_enrollment: true,
        requires_verification: false
      }
    });
    return;
  }

  console.log('Initializing Flutterwave v3 payment:', { reference, finalAmount, paymentId: payment.id });

  // Get secret key
  const accessToken = await getFlutterwaveToken();

  // Get system settings for payment customization
  const siteDescription = await getSystemSetting('site_description', 'TheMobileProf LMS');
  const supportEmail = await getSystemSetting('support_email', 'support@themobileprof.com');

  // Initialize payment
  let response;
  try {
    response = await axios.post(
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
        title: siteDescription,
        description: itemDescription,
        logo: 'https://themobileprof.com/assets/logo.jpg'
      },
      // Course prices are USD. Flutterwave rejects bank_transfer/mobile_money
      // (the accepted names are banktransfer and country-specific mobile-money codes),
      // and those local methods do not apply to a USD checkout.
      payment_options: 'card',
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
  } catch (error) {
    const providerMessage = error.response?.data?.message;
    console.error('Flutterwave initialize failed:', {
      message: providerMessage || error.message,
      errors: error.response?.data?.errors
    });
    throw new AppError(providerMessage || 'Payment initialization failed', 502, 'PAYMENT_PROVIDER_ERROR');
  }

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

const parsePaymentMetadata = (metadata) => {
  if (!metadata) return {};
  if (typeof metadata === 'string') {
    try {
      return JSON.parse(metadata);
    } catch {
      return {};
    }
  }
  return metadata;
};

const amountsMatch = (expected, actual) => {
  const left = Number(expected);
  const right = Number(actual);
  return Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) < 0.01;
};

const enrollForPayment = async (payment) => {
  const meta = parsePaymentMetadata(payment.metadata);
  let sponsorshipId = null;

  if (meta.sponsorshipCode) {
    try {
      const sponsorship = await getRow(
        'SELECT id, students_used, max_students FROM sponsorships WHERE discount_code = $1',
        [meta.sponsorshipCode]
      );
      if (sponsorship) {
        sponsorshipId = sponsorship.id;
        const existingUsage = await getRow(
          'SELECT id FROM sponsorship_usage WHERE sponsorship_id = $1 AND student_id = $2',
          [sponsorship.id, payment.user_id]
        );
        if (!existingUsage && sponsorship.students_used < sponsorship.max_students) {
          await query(
            `INSERT INTO sponsorship_usage (
              sponsorship_id, student_id, course_id, original_price,
              discount_amount, final_price, used_at
            ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
            [
              sponsorship.id,
              payment.user_id,
              payment.payment_type === 'course' ? payment.course_id : null,
              meta.originalPrice ?? payment.amount,
              meta.discountAmount ?? 0,
              meta.finalPrice ?? payment.amount
            ]
          );
          await query('UPDATE sponsorships SET students_used = students_used + 1 WHERE id = $1', [sponsorship.id]);
        }
      }
    } catch (sponsorshipError) {
      console.error('Error recording sponsorship usage:', sponsorshipError.message);
    }
  }

  if (payment.payment_type === 'course' && payment.course_id) {
    const inserted = await getRow(
      `INSERT INTO enrollments (user_id, course_id, enrollment_type, sponsorship_id)
       SELECT $1, $2, 'course', $3
       WHERE NOT EXISTS (
         SELECT 1 FROM enrollments WHERE user_id = $1 AND course_id = $2
       )
       RETURNING id`,
      [payment.user_id, payment.course_id, sponsorshipId]
    );
    if (inserted) {
      await query('UPDATE courses SET student_count = student_count + 1 WHERE id = $1', [payment.course_id]);
    }
    return;
  }

  if (payment.payment_type === 'class' && payment.class_id) {
    const inserted = await getRow(
      `INSERT INTO enrollments (user_id, class_id, enrollment_type, sponsorship_id)
       SELECT $1, $2, 'class', $3
       WHERE NOT EXISTS (
         SELECT 1 FROM enrollments WHERE user_id = $1 AND class_id = $2
       )
       RETURNING id`,
      [payment.user_id, payment.class_id, sponsorshipId]
    );
    if (inserted) {
      await query('UPDATE classes SET available_slots = GREATEST(available_slots - 1, 0) WHERE id = $1', [payment.class_id]);
    }
  }
};

const notifyEnrollment = async (payment) => {
  try {
    let itemTitle = 'Course';
    if (payment.payment_type === 'course') {
      const course = await getRow('SELECT title FROM courses WHERE id = $1', [payment.course_id]);
      itemTitle = course?.title || 'Course';
    } else {
      const classData = await getRow('SELECT title FROM classes WHERE id = $1', [payment.class_id]);
      itemTitle = classData?.title || 'Class';
    }
    await notifyPaymentSuccess(payment.user_id, payment.id, payment.amount, itemTitle);
  } catch (error) {
    console.error('Failed to send payment success notification:', error.message);
  }
};

const fetchFlutterwaveTransaction = async ({ reference, transactionId }) => {
  const accessToken = await getFlutterwaveToken();
  const headers = { Authorization: `Bearer ${accessToken}` };
  const url = transactionId
    ? `${baseUrl}/transactions/${encodeURIComponent(transactionId)}/verify`
    : `${baseUrl}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`;

  try {
    const response = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;
    console.error('Flutterwave verify failed:', { status, message });
    if (status === 404) return null;
    throw new AppError(message || 'Payment verification failed', 502, 'PAYMENT_PROVIDER_ERROR');
  }
};

const verifiedPaymentResponse = (payment) => ({
  success: true,
  message: 'Payment verified and enrollment completed',
  payment: {
    id: payment.id,
    amount: payment.amount,
    status: 'successful',
    transactionId: payment.flutterwave_transaction_id || null
  }
});

// GET /api/payments/verify/:reference
router.get('/verify/:reference', authenticateToken, asyncHandler(async (req, res) => {
  const { reference } = req.params;
  const transactionId = typeof req.query.transaction_id === 'string' ? req.query.transaction_id : undefined;
  const userId = req.user.id;

  if (!reference) {
    return res.status(400).json({ success: false, error: 'Invalid Reference', message: 'Payment reference is required' });
  }

  const payment = await getRow(
    'SELECT * FROM payments WHERE flutterwave_reference = $1 AND user_id = $2',
    [reference, userId]
  );

  if (!payment) {
    return res.status(404).json({ success: false, error: 'Payment not found', code: 'PAYMENT_NOT_FOUND' });
  }

  if (Number(payment.amount) === 0 || payment.status === 'successful') {
    await enrollForPayment(payment);
    return res.json(verifiedPaymentResponse(payment));
  }

  const flw = await fetchFlutterwaveTransaction({ reference, transactionId });
  const tx = flw?.data;
  if (!tx || flw.status !== 'success') {
    return res.status(409).json({
      success: false,
      message: 'Payment is still processing',
      code: 'PENDING'
    });
  }

  if (tx.tx_ref && tx.tx_ref !== reference) {
    return res.status(400).json({ success: false, message: 'Payment reference mismatch', code: 'VERIFICATION_FAILED' });
  }

  const currency = String(tx.currency || '').toUpperCase();
  const expectedCurrency = String(payment.currency || 'USD').toUpperCase();
  if (currency !== expectedCurrency || !amountsMatch(payment.amount, tx.amount)) {
    console.error('Payment verification amount mismatch:', {
      reference,
      expectedAmount: payment.amount,
      actualAmount: tx.amount,
      expectedCurrency,
      actualCurrency: currency
    });
    return res.status(400).json({ success: false, message: 'Payment amount mismatch', code: 'VERIFICATION_FAILED' });
  }

  if (tx.status !== 'successful') {
    if (tx.status === 'failed' || tx.status === 'cancelled') {
      await query(
        'UPDATE payments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND status <> $3',
        [tx.status === 'cancelled' ? 'cancelled' : 'failed', payment.id, 'successful']
      );
      return res.status(400).json({ success: false, message: 'Payment was not completed', code: 'VERIFICATION_FAILED' });
    }
    return res.status(409).json({ success: false, message: 'Payment is still processing', code: 'PENDING' });
  }

  const transactionRef = String(tx.id);
  const updated = await getRow(
    `UPDATE payments
     SET status = 'successful', flutterwave_transaction_id = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2 AND status <> 'successful'
     RETURNING *`,
    [transactionRef, payment.id]
  );

  const settled = updated || { ...payment, status: 'successful', flutterwave_transaction_id: transactionRef };
  await enrollForPayment(settled);
  if (updated) {
    await notifyEnrollment(settled);
  }

  res.json(verifiedPaymentResponse(settled));
}));

// POST /api/payments/webhook
router.post('/webhook', asyncHandler(async (req, res) => {
  const signature = req.headers['verif-hash'];
  if (!verifyWebhookSignature(signature)) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  const data = req.body?.data && typeof req.body.data === 'object' ? req.body.data : req.body;
  const txRef = data?.tx_ref;
  const status = data?.status;
  const transactionId = data?.id || data?.transaction_id;

  if (!txRef || !status) {
    return res.status(400).json({ error: 'Missing required webhook data' });
  }

  console.log('Webhook received:', { txRef, status, transactionId });

  const payment = await getRow(
    'SELECT * FROM payments WHERE flutterwave_reference = $1',
    [txRef]
  );

  if (!payment) {
    console.log('Payment not found for webhook:', txRef);
    return res.status(404).json({ error: 'Payment not found' });
  }

  if (status === 'successful' && payment.status !== 'successful') {
    const currency = String(data.currency || payment.currency || '').toUpperCase();
    const expectedCurrency = String(payment.currency || 'USD').toUpperCase();
    if ((data.amount != null && !amountsMatch(payment.amount, data.amount)) || (data.currency && currency !== expectedCurrency)) {
      console.error('Webhook amount mismatch:', { txRef, expected: payment.amount, got: data.amount });
      return res.status(400).json({ error: 'Amount mismatch' });
    }

    const updated = await getRow(
      `UPDATE payments
       SET status = 'successful', flutterwave_transaction_id = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND status <> 'successful'
       RETURNING *`,
      [transactionId ? String(transactionId) : null, payment.id]
    );
    if (updated) {
      await enrollForPayment(updated);
      await notifyEnrollment(updated);
    }
  }

  res.json({ status: 'success' });
}));

// GET /api/payments/user
router.get('/user', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { limit = 20, offset = 0 } = req.query;

  const payments = await getRows(
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