const express = require('express');
const axios = require('axios');
const { authenticateToken } = require('../middleware/auth');
const { query, getRow } = require('../database/config');

const router = express.Router();

// Helper function to format amount (convert to kobo for Flutterwave)
const formatAmount = (amount) => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    throw new Error('Invalid amount: must be a positive number');
  }
  return Math.round(numericAmount * 100); // Convert to cents for USD
};

// Helper function to parse amount (convert from kobo)
const parseAmount = (amount) => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  if (isNaN(numericAmount) || numericAmount < 0) {
    throw new Error('Invalid amount: must be a non-negative number');
  }
  return numericAmount / 100; // Convert from cents for USD
};

// Helper function to handle Flutterwave errors
const handleFlutterwaveError = (error) => {
  const errorMessage = error.message || 'Payment processing error occurred';
  const errorCode = error.code || 'PAYMENT_ERROR';
  
  // Map common Flutterwave errors to user-friendly messages
  const errorMap = {
    'CARD_DECLINED': 'Card was declined by bank',
    'INSUFFICIENT_FUNDS': 'Insufficient funds on card',
    'EXPIRED_CARD': 'Card has expired',
    'INVALID_CARD': 'Invalid card details',
    'NETWORK_ERROR': 'Network error occurred',
    'TIMEOUT': 'Payment request timed out'
  };

  return {
    message: errorMap[errorCode] || errorMessage,
    code: errorCode,
    details: error.details || {}
  };
};

// POST /api/payments/initialize
router.post('/initialize', authenticateToken, async (req, res) => {
  const { paymentType, itemId, paymentMethod } = req.body;
  const userId = req.user.id;

  try {
    // Validate payment type
    if (!['course', 'class'].includes(paymentType)) {
      return res.status(400).json({ error: 'Invalid payment type' });
    }

    // Get item details
    let item, itemDescription;
    if (paymentType === 'course') {
      item = await getRow('SELECT * FROM courses WHERE id = $1 AND is_published = true', [itemId]);
      itemDescription = `Payment for ${item.title} course`;
    } else {
      item = await getRow('SELECT * FROM classes WHERE id = $1 AND is_published = true', [itemId]);
      itemDescription = `Payment for ${item.title} class`;
    }

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Check if already enrolled
    const existingEnrollment = await getRow(
      `SELECT * FROM enrollments WHERE user_id = $1 AND ${paymentType}_id = $2`,
      [userId, itemId]
    );

    if (existingEnrollment) {
      return res.status(409).json({ error: 'Already enrolled in this item' });
    }

    // Generate unique reference
    const reference = `TMP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${Math.random().toString(36).substr(2, 8)}`;

    // Debug logging for amount
    console.log('Price debug:', { 
      price: item.price, 
      priceType: typeof item.price, 
      priceValue: item.price 
    });

    // Create payment record
    const payment = await getRow(
      `INSERT INTO payments (user_id, ${paymentType}_id, payment_type, amount, currency, flutterwave_reference, payment_method, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        userId, itemId, paymentType, item.price, 'USD', reference, paymentMethod || 'card',
        JSON.stringify({
          itemTitle: item.title,
          itemDescription: itemDescription,
          userEmail: req.user.email,
          userName: `${req.user.first_name} ${req.user.last_name}`
        })
      ]
    );

    // Build redirect URL
    const redirectUrl = `${req.protocol}://${req.get('host')}/payment/callback?reference=${reference}`;

    console.log('Initializing Flutterwave Standard v3.0.0 payment:', {
      reference,
      amount: item.price,
      paymentId: payment.id,
      paymentMethod
    });

    // Initialize Flutterwave payment
    const response = await axios.post(
      'https://api.flutterwave.com/v3/payments',
      {
        tx_ref: reference,
        amount: formatAmount(item.price),
        currency: 'USD',
        redirect_url: redirectUrl,
        customer: {
          email: req.user.email,
          phone_number: req.user.phone || '',
          name: `${req.user.first_name} ${req.user.last_name}`
        },
        customizations: {
          title: 'TheMobileProf LMS',
          description: itemDescription,
          logo: 'https://themobileprof.com/assets/logo.jpg'
        },
        payment_options: 'card, ussd, banktransfer, mobilemoneyghana, mpesa',
        meta: {
          payment_id: payment.id,
          user_id: userId,
          item_id: itemId,
          payment_type: paymentType
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Flutterwave Standard v3.0.0 response:', {
      status: response.data.status,
      message: response.data.message,
      reference
    });

    if (response.data.status === 'success') {
      // Update payment with hosted link
      await query(
        'UPDATE payments SET flutterwave_reference = $1, status = $2 WHERE id = $3',
        ['hosted_link', 'pending', payment.id]
      );

      res.json({
        success: true,
        message: 'Payment initialized successfully',
        data: {
          payment_id: payment.id,
          reference: reference,
          flutterwave_reference: 'hosted_link',
          checkout_url: response.data.data.link,
          amount: parseAmount(formatAmount(item.price)),
          currency: 'USD',
          payment_type: paymentType
        }
      });
    } else {
      throw new Error(response.data.message || 'Payment initialization failed');
    }

  } catch (error) {
    console.error('Payment initialization error:', error);
    
    // Update payment status to failed
    if (payment) {
      await query(
        'UPDATE payments SET status = $1, error_message = $2 WHERE id = $3',
        ['failed', error.message, payment.id]
      );
    }

    const errorInfo = handleFlutterwaveError(error);
    res.status(500).json({
      error: 'Payment Error',
      message: errorInfo.message,
      code: errorInfo.code,
      details: errorInfo.details
    });
  }
});

// GET /api/payments/methods
router.get('/methods', async (req, res) => {
  const { country = 'NG' } = req.query;

  const supportedMethods = {
    'NG': ['card', 'bank_transfer', 'ussd', 'mobile_money', 'qr_code'],
    'GH': ['card', 'bank_transfer', 'mobile_money', 'gh_mobile_money'],
    'KE': ['card', 'bank_transfer', 'mobile_money', 'mpesa'],
    'UG': ['card', 'bank_transfer', 'mobile_money', 'ug_mobile_money'],
    'CM': ['card', 'bank_transfer', 'mobile_money', 'franc_mobile_money'],
    'ET': ['card', 'bank_transfer', 'mobile_money', 'emalipay']
  };

  const methods = supportedMethods[country] || supportedMethods['NG'];

  res.json({
    country: country,
    supportedMethods: methods,
    message: `Payment methods available for ${country}`
  });
});

// GET /api/payments/verify/:reference (Primary Verification - Frontend SDK)
router.get('/verify/:reference', authenticateToken, async (req, res) => {
  const { reference } = req.params;
  const userId = req.user.id;

  try {
    // Get payment record
    const payment = await getRow(
      'SELECT * FROM payments WHERE flutterwave_reference = $1 AND user_id = $2',
      [reference, userId]
    );

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Primary verification with Flutterwave
    const response = await axios.get(
      `https://api.flutterwave.com/v3/transactions/${reference}/verify`,
      {
        headers: {
          Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`
        }
      }
    );

    if (response.data.status === 'success' && response.data.data.status === 'successful') {
      // Update payment status
      await query(
        'UPDATE payments SET status = $1, flutterwave_transaction_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        ['successful', response.data.data.id, payment.id]
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

      console.log('Payment verified successfully (Primary Verification):', {
        paymentId: payment.id,
        reference: reference,
        transactionId: response.data.data.id,
        verificationMethod: 'frontend_sdk'
      });

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

  } catch (error) {
    console.error('Payment verification error:', error);
    
    const errorInfo = handleFlutterwaveError(error);
    res.status(400).json({
      error: 'Payment Error',
      message: errorInfo.message,
      code: errorInfo.code,
      details: {
        paymentId: payment?.id,
        reference: reference,
        suggestedAction: 'try_alternative_payment_method'
      }
    });
  }
});

// GET /api/payments/user (User Payment History)
router.get('/user', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { limit = 20, offset = 0 } = req.query;

  try {
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
  } catch (error) {
    console.error('Error fetching user payments:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

// GET /api/payments/:id (Get Payment Details)
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
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
  } catch (error) {
    console.error('Error fetching payment details:', error);
    res.status(500).json({ error: 'Failed to fetch payment details' });
  }
});

// POST /api/payments/webhook (Backup Verification)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const event = JSON.parse(req.body.toString());
    console.log('Webhook received:', event);

    if (event.event === 'charge.completed' && event.data.status === 'successful') {
      const txRef = event.data.tx_ref;
      const transactionId = event.data.id;

      // Find payment by reference
      const payment = await getRow(
        'SELECT * FROM payments WHERE flutterwave_reference = $1',
        [txRef]
      );

      if (payment && payment.status === 'pending') {
        // Update payment status
        await query(
          'UPDATE payments SET status = $1, flutterwave_transaction_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
          ['successful', transactionId, payment.id]
        );

        // Create enrollment
        const userId = payment.user_id;
        if (payment.payment_type === 'course') {
          await query(
            `INSERT INTO enrollments (user_id, course_id, enrollment_type)
             VALUES ($1, $2, 'course')`,
            [userId, payment.course_id]
          );

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

          await query(
            'UPDATE classes SET available_slots = available_slots - 1 WHERE id = $1',
            [payment.class_id]
          );
        }

        console.log('Payment processed successfully via webhook (Backup Verification):', {
          paymentId: payment.id,
          reference: txRef,
          transactionId: transactionId,
          verificationMethod: 'webhook'
        });
      }
    }

    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Admin endpoints (if needed)
// GET /api/admin/payments (Admin Payment History)
router.get('/admin/payments', authenticateToken, async (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { page = 1, limit = 20, status, paymentMethod, search } = req.query;
  const offset = (page - 1) * limit;

  try {
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND p.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (paymentMethod) {
      whereClause += ` AND p.payment_method = $${paramIndex}`;
      params.push(paymentMethod);
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex} OR p.flutterwave_reference ILIKE $${paramIndex})`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
      paramIndex += 3;
    }

    const payments = await query(
      `SELECT p.*, u.first_name, u.last_name, u.email, c.title as course_title, cl.title as class_title
       FROM payments p
       LEFT JOIN users u ON p.user_id = u.id
       LEFT JOIN courses c ON p.course_id = c.id
       LEFT JOIN classes cl ON p.class_id = cl.id
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total
       FROM payments p
       LEFT JOIN users u ON p.user_id = u.id
       ${whereClause}`,
      params
    );

    const total = parseInt(countResult[0].total);
    const pages = Math.ceil(total / limit);

    res.json({
      payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages
      }
    });
  } catch (error) {
    console.error('Error fetching admin payments:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

// GET /api/admin/payments/stats (Admin Payment Statistics)
router.get('/admin/payments/stats', authenticateToken, async (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { period = 30 } = req.query;

  try {
    // Get overview stats
    const overviewResult = await query(
      `SELECT 
        COUNT(*) as total_payments,
        SUM(amount) as total_revenue,
        COUNT(CASE WHEN status = 'successful' THEN 1 END) as successful_payments,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payments,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payments,
        AVG(amount) as average_payment
       FROM payments
       WHERE created_at >= NOW() - INTERVAL '${period} days'`
    );

    // Get method breakdown
    const methodBreakdown = await query(
      `SELECT 
        payment_method,
        COUNT(*) as count,
        SUM(amount) as total_amount
       FROM payments
       WHERE created_at >= NOW() - INTERVAL '${period} days'
       GROUP BY payment_method`
    );

    // Get daily stats
    const dailyStats = await query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as payment_count,
        SUM(amount) as daily_revenue
       FROM payments
       WHERE created_at >= NOW() - INTERVAL '${period} days'
       GROUP BY DATE(created_at)
       ORDER BY date DESC`
    );

    const overview = overviewResult[0];

    res.json({
      overview,
      methodBreakdown,
      dailyStats
    });
  } catch (error) {
    console.error('Error fetching payment statistics:', error);
    res.status(500).json({ error: 'Failed to fetch payment statistics' });
  }
});

module.exports = router; 