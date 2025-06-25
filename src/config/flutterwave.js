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

// Verify webhook signature
const verifyWebhookSignature = (payload, signature) => {
  try {
    const secretHash = process.env.FLUTTERWAVE_SECRET_HASH;
    if (!secretHash) {
      console.warn('Flutterwave secret hash not set. Webhook verification disabled.');
      return false;
    }
    
    const hash = crypto
      .createHmac('sha512', secretHash)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return hash === signature;
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return false;
  }
};

// Generate unique reference
const generateReference = (prefix = 'TMP') => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${prefix}_${timestamp}_${random}`.toUpperCase();
};

// Format amount for Flutterwave (in kobo)
const formatAmount = (amount) => {
  return Math.round(amount * 100); // Convert to kobo
};

// Parse amount from Flutterwave (from kobo)
const parseAmount = (amount) => {
  return amount / 100; // Convert from kobo
};

module.exports = {
  flw,
  verifyWebhookSignature,
  generateReference,
  formatAmount,
  parseAmount
}; 