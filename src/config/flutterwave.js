const Flutterwave = require('flutterwave-node-v3');
const crypto = require('crypto');

// Initialize Flutterwave only if environment variables are present
let flw = null;
if (process.env.FLUTTERWAVE_PUBLIC_KEY && process.env.FLUTTERWAVE_SECRET_KEY) {
  flw = new Flutterwave(
    process.env.FLUTTERWAVE_PUBLIC_KEY,
    process.env.FLUTTERWAVE_SECRET_KEY
  );
} else {
  console.warn('Flutterwave environment variables not set. Payment processing will be disabled.');
}

// Verify webhook signature using SHA512
const verifyWebhookSignature = (payload, signature) => {
  try {
    const secretHash = process.env.FLUTTERWAVE_SECRET_HASH;
    if (!secretHash) {
      console.warn('Flutterwave secret hash not set. Webhook verification disabled.');
      return false;
    }
    
    if (!signature) {
      console.warn('Webhook signature missing');
      return false;
    }
    
    const hash = crypto
      .createHmac('sha512', secretHash)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    const isValid = hash === signature;
    
    if (!isValid) {
      console.error('Webhook signature verification failed:', {
        expected: hash,
        received: signature
      });
    }
    
    return isValid;
  } catch (error) {
    console.error('Webhook signature verification error:', error);
    return false;
  }
};

// Generate unique reference with better uniqueness
const generateReference = (prefix = 'TMP') => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const uuid = require('crypto').randomBytes(4).toString('hex');
  return `${prefix}_${timestamp}_${random}_${uuid}`.toUpperCase();
};

// Format amount for Flutterwave (in kobo)
const formatAmount = (amount) => {
  if (typeof amount !== 'number' || amount <= 0) {
    throw new Error('Invalid amount: must be a positive number');
  }
  return Math.round(amount * 100); // Convert to kobo
};

// Parse amount from Flutterwave (from kobo)
const parseAmount = (amount) => {
  if (typeof amount !== 'number' || amount < 0) {
    throw new Error('Invalid amount: must be a non-negative number');
  }
  return amount / 100; // Convert from kobo
};

// Validate payment method
const validatePaymentMethod = (method) => {
  const validMethods = [
    'card',
    'bank_transfer', 
    'ussd',
    'mobile_money',
    'qr_code',
    'barter',
    'mpesa',
    'gh_mobile_money',
    'ug_mobile_money',
    'franc_mobile_money',
    'emalipay'
  ];
  
  return validMethods.includes(method);
};

// Get supported payment methods for a country
const getSupportedPaymentMethods = (country = 'NG') => {
  const methodsByCountry = {
    'NG': ['card', 'bank_transfer', 'ussd', 'mobile_money', 'qr_code'],
    'GH': ['card', 'bank_transfer', 'mobile_money', 'gh_mobile_money'],
    'UG': ['card', 'bank_transfer', 'mobile_money', 'ug_mobile_money'],
    'KE': ['card', 'bank_transfer', 'mobile_money', 'mpesa'],
    'ZA': ['card', 'bank_transfer', 'mobile_money'],
    'TZ': ['card', 'bank_transfer', 'mobile_money'],
    'CM': ['card', 'bank_transfer', 'mobile_money', 'franc_mobile_money'],
    'ET': ['card', 'bank_transfer', 'mobile_money', 'emalipay']
  };
  
  return methodsByCountry[country] || methodsByCountry['NG'];
};

// Handle Flutterwave API errors
const handleFlutterwaveError = (error) => {
  console.error('Flutterwave API error:', {
    message: error.message,
    code: error.code,
    status: error.status,
    stack: error.stack
  });

  // Map common Flutterwave errors to user-friendly messages
  const errorMessages = {
    'INVALID_PUBLIC_KEY': 'Payment service configuration error',
    'INVALID_SECRET_KEY': 'Payment service configuration error',
    'INVALID_TX_REF': 'Invalid payment reference',
    'INVALID_AMOUNT': 'Invalid payment amount',
    'INVALID_CURRENCY': 'Invalid currency specified',
    'INVALID_CUSTOMER': 'Invalid customer information',
    'INVALID_PAYMENT_METHOD': 'Unsupported payment method',
    'INSUFFICIENT_FUNDS': 'Insufficient funds for payment',
    'CARD_DECLINED': 'Card was declined by bank',
    'TRANSACTION_FAILED': 'Payment transaction failed',
    'NETWORK_ERROR': 'Network error occurred',
    'TIMEOUT': 'Payment request timed out'
  };

  const userMessage = errorMessages[error.code] || 'Payment processing error occurred';
  
  return {
    message: userMessage,
    code: error.code,
    originalError: error.message
  };
};

module.exports = {
  flw,
  verifyWebhookSignature,
  generateReference,
  formatAmount,
  parseAmount,
  validatePaymentMethod,
  getSupportedPaymentMethods,
  handleFlutterwaveError
}; 