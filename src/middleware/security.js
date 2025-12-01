const slowDown = require('express-slow-down');
const svgCaptcha = require('svg-captcha');
const { query, getRow } = require('../database/config');

// Login throttling middleware - exponential delays
const loginThrottling = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 3, // Allow 3 requests per windowMs without delay
  delayMs: (used, req) => {
    // Exponential backoff: 1s, 2s, 4s, 8s, etc.
    const delay = Math.pow(2, used - 3) * 1000;
    return Math.min(delay, 30000); // Cap at 30 seconds
  },
  skipSuccessfulRequests: true, // Don't slow down successful logins
  skipFailedRequests: false, // Slow down failed attempts
  // Use the built-in key generator that handles IPv6 properly
});

// CAPTCHA middleware - require CAPTCHA after failed attempts
const requireCaptchaAfterFailures = (maxFailures = 3) => {
  return async (req, res, next) => {
    const email = req.body?.email;
    if (!email) {
      return next();
    }

    try {
      // Count recent failed login attempts for this email
      const recentFailures = await getRow(
        `SELECT COUNT(*) as count FROM login_attempts
         WHERE email = $1 AND success = false AND attempted_at > NOW() - INTERVAL '15 minutes'`,
        [email]
      );

      const failureCount = parseInt(recentFailures?.count || 0);

      if (failureCount >= maxFailures) {
        // Require CAPTCHA
        const captchaToken = req.body?.captchaToken;
        const captchaText = req.body?.captchaText;

        if (!captchaToken || !captchaText) {
          return res.status(400).json({
            error: 'CAPTCHA_REQUIRED',
            message: 'Too many failed login attempts. Please complete the CAPTCHA.',
            requiresCaptcha: true
          });
        }

        // Verify CAPTCHA (in production, you'd verify against a service like reCAPTCHA)
        // For now, we'll use simple SVG CAPTCHA verification
        const storedCaptcha = req.session?.captchaText;
        if (!storedCaptcha || storedCaptcha !== captchaText) {
          return res.status(400).json({
            error: 'INVALID_CAPTCHA',
            message: 'Invalid CAPTCHA. Please try again.',
            requiresCaptcha: true
          });
        }
      }

      next();
    } catch (error) {
      console.error('CAPTCHA middleware error:', error);
      next(); // Continue without CAPTCHA on error
    }
  };
};

// Generate CAPTCHA and return data
const generateCaptcha = () => {
  const captcha = svgCaptcha.create({
    size: 6,
    noise: 3,
    color: true,
    background: '#f0f0f0'
  });

  const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
  
  // Store CAPTCHA in memory (in production, use Redis)
  if (!global.captchaStore) global.captchaStore = new Map();
  global.captchaStore.set(id, {
    text: captcha.text,
    expires: Date.now() + 5 * 60 * 1000 // 5 minutes
  });

  return {
    id,
    data: captcha.data
  };
};

// Validate CAPTCHA
const validateCaptcha = (id, text) => {
  if (!global.captchaStore) return false;
  
  const captcha = global.captchaStore.get(id);
  if (!captcha) return false;
  
  // Check if expired
  if (Date.now() > captcha.expires) {
    global.captchaStore.delete(id);
    return false;
  }
  
  // Check text
  const isValid = captcha.text.toLowerCase() === text.toLowerCase();
  
  // Clean up used CAPTCHA
  if (isValid) {
    global.captchaStore.delete(id);
  }
  
  return isValid;
};

// Track failed login attempts
const trackFailedLogin = async (email, success, ip, userAgent) => {
  try {
    await query(
      `INSERT INTO login_attempts (email, success, ip_address, user_agent, attempted_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [email, success, ip, userAgent]
    );
  } catch (error) {
    console.error('Failed to track login attempt:', error);
  }
};

// Log login attempts
const logLoginAttempt = async (email, success, ip, userAgent) => {
  try {
    await query(
      `INSERT INTO login_attempts (email, success, ip_address, user_agent, attempted_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [email, success, ip, userAgent]
    );
  } catch (error) {
    console.error('Failed to log login attempt:', error);
  }
};

// Enhanced rate limiter for auth endpoints
const createAuthRateLimiter = (maxRequests = 5, windowMs = 60000) => {
  const attempts = new Map();

  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    for (const [k, timestamps] of attempts.entries()) {
      attempts.set(k, timestamps.filter(t => t > windowStart));
      if (attempts.get(k).length === 0) {
        attempts.delete(k);
      }
    }

    // Get current attempts for this IP
    const userAttempts = attempts.get(key) || [];

    if (userAttempts.length >= maxRequests) {
      const resetTime = Math.ceil((userAttempts[0] + windowMs - now) / 1000);
      return res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: `Too many requests. Try again in ${resetTime} seconds.`,
        retryAfter: resetTime
      });
    }

    // Record this attempt
    userAttempts.push(now);
    attempts.set(key, userAttempts);

    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': maxRequests,
      'X-RateLimit-Remaining': Math.max(0, maxRequests - userAttempts.length - 1),
      'X-RateLimit-Reset': new Date(now + windowMs).toISOString()
    });

    next();
  };
};

module.exports = {
  loginThrottling,
  requireCaptchaAfterFailures,
  generateCaptcha,
  validateCaptcha,
  trackFailedLogin,
  logLoginAttempt,
  createAuthRateLimiter
};