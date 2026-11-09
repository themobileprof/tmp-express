const crypto = require('crypto');
const axios = require('axios');

// Flutterwave v3 configuration
const flwConfig = {
  publicKey: process.env.FLUTTERWAVE_PUBLIC_KEY,
  secretKey: process.env.FLUTTERWAVE_SECRET_KEY,
  secretHash: process.env.FLUTTERWAVE_SECRET_HASH, // For webhook verification
  version: 'v3'
};

// Validate configuration
if (!flwConfig.publicKey || !flwConfig.secretKey) {
  console.error('⚠️ Missing Flutterwave v3 credentials (FLUTTERWAVE_PUBLIC_KEY, FLUTTERWAVE_SECRET_KEY)');
  throw new Error('Flutterwave v3 credentials required');
}

const baseUrl = 'https://api.flutterwave.com/v3'

// Get Flutterwave v3 secret key (no OAuth in v3)
const getFlutterwaveToken = async () => {
  return flwConfig.secretKey;
};

// Flutterwave sends the dashboard secret hash in the verif-hash header.
const verifyWebhookSignature = (signature) => {
  try {
    if (!flwConfig.secretHash || !signature) {
      return false;
    }

    const expected = Buffer.from(String(flwConfig.secretHash));
    const received = Buffer.from(String(signature));
    if (expected.length !== received.length) {
      return false;
    }
    return crypto.timingSafeEqual(expected, received);
  } catch (error) {
    console.error('Webhook signature verification error:', error.message);
    return false;
  }
};

// Generate unique transaction reference
const generateReference = (prefix = 'TMP') => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const uuid = crypto.randomBytes(4).toString('hex');
  return `${prefix}_${timestamp}_${random}_${uuid}`.toUpperCase();
};

// Format amount for USD (keep 2 decimal places, no x100 needed)
const formatAmount = (amount) => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    throw new Error('Invalid amount: must be a positive number');
  }
  return Math.round(numericAmount * 100) / 100; // 2 decimal places
};

// Parse amount (ensure valid number)
const parseAmount = (amount) => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  if (isNaN(numericAmount) || numericAmount < 0) {
    throw new Error('Invalid amount: must be a non-negative number');
  }
  return numericAmount;
};

// Validate payment method
const validatePaymentMethod = (method) => {
  const validMethods = ['card', 'banktransfer', 'ussd', 'bank_transfer'];
  return validMethods.includes(method);
};

// Get supported payment methods by country
const getSupportedPaymentMethods = (country = 'NG') => {
  const methodsByCountry = {
    NG: ['card', 'banktransfer', 'ussd'],
    GH: ['card', 'mobilemoneyghana'],
    KE: ['card', 'mpesa'],
    ZA: ['card'],
  };
  return methodsByCountry[country] || methodsByCountry['NG'];
};

// Handle Flutterwave API errors
const handleFlutterwaveError = (error) => {
  console.error('Flutterwave API error:', {
    message: error.message,
    code: error.response?.data?.code,
    status: error.response?.status,
    stack: error.stack
  });

  const errorMessages = {
    INVALID_PUBLIC_KEY: 'Payment service configuration error',
    INVALID_SECRET_KEY: 'Payment service configuration error',
    INVALID_TX_REF: 'Invalid payment reference',
    INVALID_AMOUNT: 'Invalid payment amount',
    INVALID_CURRENCY: 'Invalid currency specified',
    INVALID_CUSTOMER: 'Invalid customer information',
    INVALID_PAYMENT_METHOD: 'Unsupported payment method',
    INSUFFICIENT_FUNDS: 'Insufficient funds for payment',
    CARD_DECLINED: 'Card was declined by bank',
    TRANSACTION_FAILED: 'Payment transaction failed',
    NETWORK_ERROR: 'Network error occurred',
    TIMEOUT: 'Payment request timed out'
  };

  const userMessage = errorMessages[error.response?.data?.code] || 'Payment processing error occurred';
  return {
    message: userMessage,
    code: error.response?.data?.code,
    originalError: error.message
  };
};

module.exports = {
  flwConfig,
  baseUrl,
  getFlutterwaveToken,
  verifyWebhookSignature,
  generateReference,
  formatAmount,
  parseAmount,
  validatePaymentMethod,
  getSupportedPaymentMethods,
  handleFlutterwaveError
}; 