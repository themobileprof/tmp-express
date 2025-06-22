const Flutterwave = require('flutterwave-node-v3');
const crypto = require('crypto');

// Lazy initialization of Flutterwave
let flw = null;

const getFlutterwave = () => {
  if (!flw) {
    const publicKey = process.env.FLUTTERWAVE_PUBLIC_KEY;
    const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;
    
    if (!publicKey || !secretKey) {
      console.warn('⚠️  Flutterwave keys not configured - payment features will be disabled');
      return null;
    }
    
    flw = new Flutterwave(publicKey, secretKey);
  }
  return flw;
};

// Verify webhook signature
const verifyWebhookSignature = (payload, signature) => {
  try {
    const secretHash = process.env.FLUTTERWAVE_SECRET_HASH;
    if (!secretHash) {
      console.warn('⚠️  Flutterwave secret hash not configured');
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
  getFlutterwave,
  verifyWebhookSignature,
  generateReference,
  formatAmount,
  parseAmount
}; 