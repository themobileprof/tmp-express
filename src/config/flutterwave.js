const crypto = require('crypto');
const axios = require('axios');

const TOKEN_URL = 'https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token';
const baseUrl = (process.env.FLUTTERWAVE_BASE_URL || 'https://f4bexperience.flutterwave.com').replace(/\/$/, '');

const flwConfig = {
  clientId: process.env.FLUTTERWAVE_CLIENT_ID,
  clientSecret: process.env.FLUTTERWAVE_CLIENT_SECRET,
  secretHash: process.env.FLUTTERWAVE_SECRET_HASH,
  version: 'v4'
};

let cachedToken = { value: null, expiresAt: 0 };
let fxCache = { ngnPerUsd: null, at: 0 };

class FlutterwaveError extends Error {
  constructor(message, statusCode = 502) {
    super(message);
    this.statusCode = statusCode;
    this.error = 'PAYMENT_PROVIDER_ERROR';
  }
}

const providerMessage = (error) => {
  const data = error.response?.data;
  const validation = data?.error?.validation_errors?.[0];
  return validation?.message || data?.error?.message || data?.message || error.message || 'Payment request failed';
};

const getFlutterwaveToken = async () => {
  if (cachedToken.value && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value;
  }
  if (!flwConfig.clientId || !flwConfig.clientSecret) {
    throw new FlutterwaveError('Flutterwave v4 credentials are not configured', 500);
  }

  try {
    const body = new URLSearchParams({
      client_id: flwConfig.clientId,
      client_secret: flwConfig.clientSecret,
      grant_type: 'client_credentials'
    });
    const response = await axios.post(TOKEN_URL, body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    const token = response.data?.access_token;
    const expiresIn = Number(response.data?.expires_in) || 600;
    if (!token) {
      throw new FlutterwaveError('Flutterwave did not return an access token');
    }
    cachedToken = {
      value: token,
      expiresAt: Date.now() + Math.max(30, expiresIn - 60) * 1000
    };
    return token;
  } catch (error) {
    if (error instanceof FlutterwaveError) throw error;
    console.error('Flutterwave auth failed:', providerMessage(error));
    throw new FlutterwaveError(providerMessage(error));
  }
};

const flwHeaders = (token, idempotencyKey) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  Accept: 'application/json',
  'X-Trace-Id': crypto.randomUUID(),
  'X-Idempotency-Key': idempotencyKey || crypto.randomUUID()
});

const flwRequest = async (method, path, body, idempotencyKey) => {
  const token = await getFlutterwaveToken();
  try {
    const response = await axios({
      method,
      url: `${baseUrl}${path}`,
      data: body,
      headers: flwHeaders(token, idempotencyKey)
    });
    if (response.data?.status && response.data.status !== 'success') {
      throw new FlutterwaveError(response.data.message || 'Payment request failed');
    }
    return response.data;
  } catch (error) {
    if (error instanceof FlutterwaveError) throw error;
    console.error('Flutterwave request failed:', { path, message: providerMessage(error) });
    throw new FlutterwaveError(providerMessage(error));
  }
};

const timingSafeStringEqual = (left, right) => {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

// v4 signs the raw body with HMAC-SHA256 (base64) in flutterwave-signature.
// Some dashboard setups still send the secret hash itself.
const verifyWebhookSignature = (rawBody, signature) => {
  try {
    if (!flwConfig.secretHash || !signature) return false;
    if (timingSafeStringEqual(signature, flwConfig.secretHash)) return true;
    if (!rawBody) return false;
    const hmac = crypto.createHmac('sha256', String(flwConfig.secretHash)).update(rawBody).digest('base64');
    return timingSafeStringEqual(signature, hmac);
  } catch (error) {
    console.error('Webhook signature verification error:', error.message);
    return false;
  }
};

const generateReference = () => {
  const stamp = Date.now().toString(36);
  const rand = crypto.randomBytes(8).toString('hex');
  return `tmp-${stamp}-${rand}`.slice(0, 42);
};

const formatAmount = (amount) => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    throw new Error('Invalid amount: must be a positive number');
  }
  return Math.round(numericAmount * 100) / 100;
};

const parseAmount = (amount) => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  if (isNaN(numericAmount) || numericAmount < 0) {
    throw new Error('Invalid amount: must be a non-negative number');
  }
  return numericAmount;
};

const validatePaymentMethod = (method) => {
  const validMethods = ['card', 'banktransfer', 'ussd', 'bank_transfer'];
  return validMethods.includes(method);
};

// Live USD to NGN quote. The naira figure comes from Flutterwave, not a rate in this file.
const quoteUsdToNgn = async (usdAmount) => {
  const amount = formatAmount(usdAmount);
  const data = await flwRequest('post', '/transfers/rates', {
    source: { currency: 'NGN' },
    destination: { currency: 'USD', amount }
  });
  const ngn = Number(data?.data?.source?.amount);
  if (!Number.isFinite(ngn) || ngn <= 0) {
    throw new FlutterwaveError('Currency quote did not include a naira amount');
  }
  return {
    amount: Math.round(ngn * 100) / 100,
    rateId: data.data.id || null
  };
};

const getNgnPerUsd = async () => {
  if (fxCache.ngnPerUsd && Date.now() - fxCache.at < 10 * 60 * 1000) {
    return fxCache.ngnPerUsd;
  }
  const quote = await quoteUsdToNgn(1);
  fxCache = { ngnPerUsd: quote.amount, at: Date.now() };
  return quote.amount;
};

const findCustomerId = async (email) => {
  const listed = await flwRequest('get', `/customers?email=${encodeURIComponent(email)}`);
  const rows = Array.isArray(listed?.data) ? listed.data : [];
  return rows.find((row) => row.email === email)?.id || rows[0]?.id || null;
};

const createDirectCharge = async ({ reference, amount, customer }) => {
  const name = String(customer.name || 'Customer').trim().split(/\s+/);
  const customerBody = {
    email: customer.email,
    name: {
      first: name[0] || 'Customer',
      last: name.slice(1).join(' ') || 'Customer'
    }
  };

  let customerId = null;
  try {
    const created = await flwRequest('post', '/customers', customerBody, `cus-${reference}`);
    customerId = created.data?.id || null;
  } catch (error) {
    customerId = await findCustomerId(customer.email);
    if (!customerId) throw error;
  }

  const account = await flwRequest('post', '/virtual-accounts', {
    reference,
    customer_id: customerId,
    amount,
    currency: 'NGN',
    account_type: 'dynamic',
    expiry: 3600,
    narration: 'TheMobileProf'
  }, reference);
  const data = account.data || {};

  return {
    status: 'success',
    data: {
      id: data.id,
      amount: Number(data.amount) || amount,
      currency: data.currency || 'NGN',
      reference: data.reference || reference,
      next_action: {
        type: 'requires_bank_transfer',
        requires_bank_transfer: {
          account_number: data.account_number,
          account_bank_name: data.account_bank_name,
          account_expiration_datetime: data.account_expiration_datetime,
          note: data.note || 'Transfer the exact amount to this account.'
        }
      }
    }
  };
};

const fetchCharge = async ({ chargeId, reference }) => {
  if (chargeId && String(chargeId).startsWith('chg_')) {
    return flwRequest('get', `/charges/${encodeURIComponent(chargeId)}`);
  }

  const query = chargeId && String(chargeId).startsWith('van_')
    ? `virtual_account_id=${encodeURIComponent(chargeId)}`
    : `reference=${encodeURIComponent(reference)}`;
  const listed = await flwRequest('get', `/charges?${query}`);
  const rows = Array.isArray(listed?.data) ? listed.data : [];
  const match = rows.find((row) => !reference || row.reference === reference) || null;
  return match ? { status: 'success', data: match } : null;
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
  quoteUsdToNgn,
  getNgnPerUsd,
  createDirectCharge,
  fetchCharge
};
