const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { getRow, query } = require('../database/config');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { OAuth2Client } = require('google-auth-library');
const { authenticateToken } = require('../middleware/auth');
const crypto = require('crypto');
const { sendEmail } = require('../mailer');
const { generateCaptcha, validateCaptcha, trackFailedLogin } = require('../middleware/security');

const router = express.Router();

// Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Validation middleware
const validateRegistration = [
  // Preserve Gmail dots to avoid unexpected normalization differences for addresses like "user.name@gmail.com"
  body('email').isEmail().normalizeEmail({ gmail_remove_dots: false, gmail_convert_googlemaildotcom: false }).withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('firstName').trim().isLength({ min: 1 }).withMessage('First name is required'),
  body('lastName').trim().isLength({ min: 1 }).withMessage('Last name is required'),
  body('role').optional().isIn(['student', 'instructor', 'admin', 'sponsor']).withMessage('Invalid role')
];

const validateLogin = [
  // Preserve Gmail dots during normalization so we match stored emails that include dots
  body('email').isEmail().normalizeEmail({ gmail_remove_dots: false, gmail_convert_googlemaildotcom: false }).withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
  body('captchaText').optional().isLength({ min: 1 }).withMessage('CAPTCHA text is required'),
  body('captchaId').optional().isLength({ min: 1 }).withMessage('CAPTCHA ID is required')
];

const validateGoogleAuth = [
  body('token').notEmpty().withMessage('Google token is required'),
  body('firstName').optional().trim().isLength({ min: 1 }).withMessage('First name is required'),
  body('lastName').optional().trim().isLength({ min: 1 }).withMessage('Last name is required'),
  body('role').optional().isIn(['student', 'instructor', 'admin', 'sponsor']).withMessage('Invalid role')
];

// Generate JWT token
const generateToken = (userId, email, role) => {
  return jwt.sign(
    { user_id: userId, email, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

// Verify Google token
const verifyGoogleToken = async (token) => {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    return ticket.getPayload();
  } catch (error) {
    throw new AppError('Invalid Google token', 401, 'Authentication Failed');
  }
};

// Register new user
router.post('/register', validateRegistration, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }

  const { email, password, firstName, lastName, role = 'student' } = req.body;

  // Check if user already exists
  const existingUser = await getRow('SELECT id FROM users WHERE email = $1', [email]);
  if (existingUser) {
    throw new AppError('User with this email already exists', 409, 'Duplicate Entry');
  }

  // Hash password
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Create user
  const result = await query(
    `INSERT INTO users (email, password_hash, first_name, last_name, role, auth_provider, email_verified)
     VALUES ($1, $2, $3, $4, $5, 'local', false)
     RETURNING id, email, first_name, last_name, role, created_at`,
    [email, passwordHash, firstName, lastName, role]
  );

  const user = result.rows[0];

  // Create default user settings
  await query(
    `INSERT INTO user_settings (user_id) VALUES ($1)`,
    [user.id]
  );

  // Generate token
  const token = generateToken(user.id, user.email, user.role);

  res.status(201).json({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      createdAt: user.created_at
    },
    token
  });
}));

// Login user
router.post('/login', validateLogin, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }

  const { email, password, captchaText, captchaId } = req.body;
  const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';

  // Check for recent failed login attempts (last 15 minutes)
  const recentFailedAttempts = await query(
    `SELECT COUNT(*) as count FROM login_attempts 
     WHERE email = $1 AND success = false AND attempted_at > NOW() - INTERVAL '15 minutes'`,
    [email]
  );

  const failedCount = parseInt(recentFailedAttempts.rows[0].count);

  // Require CAPTCHA after 3 failed attempts
  if (failedCount >= 3) {
    if (!captchaText || !captchaId) {
      // Generate CAPTCHA for the user
      const captcha = generateCaptcha();
      return res.status(429).json({
        error: 'CAPTCHA_REQUIRED',
        message: 'Too many failed login attempts. Please solve the CAPTCHA.',
        captcha: {
          id: captcha.id,
          data: captcha.data // This is the SVG data URL
        }
      });
    }

    // Validate CAPTCHA
    const isValidCaptcha = validateCaptcha(captchaId, captchaText);
    if (!isValidCaptcha) {
      await trackFailedLogin(email, false, clientIP, req.get('User-Agent'));
      throw new AppError('Invalid CAPTCHA', 400, 'Invalid CAPTCHA');
    }
  }

  // Find user
  const user = await getRow(
    'SELECT id, email, password_hash, first_name, last_name, role, is_active, auth_provider FROM users WHERE email = $1',
    [email]
  );

  if (!user || !user.is_active) {
    await trackFailedLogin(email, false, clientIP, req.get('User-Agent'));
    throw new AppError('Invalid email or password', 401, 'Authentication Failed');
  }

  // Check if user is using Google OAuth
  if (user.auth_provider === 'google') {
    await trackFailedLogin(email, false, clientIP, req.get('User-Agent'));
    throw new AppError('Please use Google login for this account', 401, 'Authentication Failed');
  }

  // Check password
  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    await trackFailedLogin(email, false, clientIP, req.get('User-Agent'));
    throw new AppError('Invalid email or password', 401, 'Authentication Failed');
  }

  // Track successful login
  await trackFailedLogin(email, true, clientIP, req.get('User-Agent'));

  // Enforce email verification if required by system setting
  const { getSystemSetting } = require('../utils/systemSettings');
  const emailVerificationRequired = String(await getSystemSetting('email_verification_required', 'true')).toLowerCase() === 'true';
  const userVerification = await getRow('SELECT email_verified FROM users WHERE id = $1', [user.id]);
  if (emailVerificationRequired && !userVerification.email_verified) {
    return res.status(403).json({
      error: 'EMAIL_VERIFICATION_REQUIRED',
      message: 'Please verify your email before logging in.'
    });
  }

  // Generate token
  const token = generateToken(user.id, user.email, user.role);

  res.json({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role
    },
    token
  });
}));

// Google OAuth login/signup
router.post('/google', validateGoogleAuth, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }

  const { token, firstName, lastName, role = 'student' } = req.body;

  // Verify Google token
  const googlePayload = await verifyGoogleToken(token);
  
  const {
    sub: googleId,
    email: googleEmail,
    given_name: googleFirstName,
    family_name: googleLastName,
    picture: googlePicture,
    email_verified: googleEmailVerified
  } = googlePayload;

  // Check if user already exists with Google ID
  let user = await getRow(
    'SELECT id, email, first_name, last_name, role, is_active, auth_provider FROM users WHERE google_id = $1',
    [googleId]
  );

  if (user) {
    // User exists with Google OAuth
    if (!user.is_active) {
      throw new AppError('Account is deactivated', 401, 'Account Deactivated');
    }

    // Generate token for existing user
    const jwtToken = generateToken(user.id, user.email, user.role);

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      },
      token: jwtToken
    });
  }

  // Check if user exists with email but different auth provider
  user = await getRow(
    'SELECT id, email, first_name, last_name, role, is_active, auth_provider FROM users WHERE email = $1',
    [googleEmail]
  );

  if (user) {
    if (user.auth_provider === 'local') {
      // User exists with email/password, link Google account
      await query(
        `UPDATE users 
         SET google_id = $1, google_email = $2, auth_provider = 'google', email_verified = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [googleId, googleEmail, googleEmailVerified, user.id]
      );

      const jwtToken = generateToken(user.id, user.email, user.role);

      return res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role
        },
        token: jwtToken
      });
    } else {
      throw new AppError('Email already associated with another Google account', 409, 'Account Conflict');
    }
  }

  // Create new user with Google OAuth
  const finalFirstName = firstName || googleFirstName;
  const finalLastName = lastName || googleLastName;

  const result = await query(
    `INSERT INTO users (email, first_name, last_name, role, google_id, google_email, auth_provider, email_verified, avatar_url)
     VALUES ($1, $2, $3, $4, $5, $6, 'google', $7, $8)
     RETURNING id, email, first_name, last_name, role, created_at`,
    [googleEmail, finalFirstName, finalLastName, role, googleId, googleEmail, googleEmailVerified, googlePicture]
  );

  const newUser = result.rows[0];

  // Create default user settings
  await query(
    `INSERT INTO user_settings (user_id) VALUES ($1)`,
    [newUser.id]
  );

  // Generate token
  const jwtToken = generateToken(newUser.id, newUser.email, newUser.role);

  res.status(201).json({
    user: {
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.first_name,
      lastName: newUser.last_name,
      role: newUser.role,
      createdAt: newUser.created_at
    },
    token: jwtToken
  });
}));

// Get current user
router.get('/me', asyncHandler(async (req, res) => {
  // This route requires authentication middleware
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    throw new AppError('Access token required', 401, 'Authentication Required');
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  
  const user = await getRow(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.avatar_url, u.bio, 
            u.created_at, u.is_active, u.auth_provider, u.email_verified, us.theme, us.language, us.timezone
     FROM users u
     LEFT JOIN user_settings us ON u.id = us.user_id
     WHERE u.id = $1`,
    [decoded.user_id]
  );

  if (!user || !user.is_active) {
    throw new AppError('User not found or account is inactive', 401, 'Invalid Token');
  }

  res.json({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      avatarUrl: user.avatar_url,
      bio: user.bio,
      createdAt: user.created_at,
      authProvider: user.auth_provider,
      emailVerified: user.email_verified,
      settings: {
        theme: user.theme,
        language: user.language,
        timezone: user.timezone
      }
    }
  });
}));

// Get current user profile (frontend compatible)
router.get('/profile', authenticateToken, asyncHandler(async (req, res) => {
  const user = await getRow(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.avatar_url, u.bio, 
            u.created_at, u.is_active, u.auth_provider, u.email_verified, us.theme, us.language, us.timezone
     FROM users u
     LEFT JOIN user_settings us ON u.id = us.user_id
     WHERE u.id = $1`,
    [req.user.id]
  );

  if (!user || !user.is_active) {
    throw new AppError('User not found or account is inactive', 401, 'Invalid Token');
  }

  // Return in the format expected by frontend
  res.json({
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    role: user.role,
    profilePicture: user.avatar_url,
    bio: user.bio,
    createdAt: user.created_at,
    authProvider: user.auth_provider,
    emailVerified: user.email_verified,
    settings: {
      theme: user.theme,
      language: user.language,
      timezone: user.timezone
    }
  });
}));

// Refresh token
router.post('/refresh', asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    throw new AppError('Token is required', 400, 'Missing Token');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user still exists and is active
    const user = await getRow(
      'SELECT id, email, role, is_active FROM users WHERE id = $1',
      [decoded.user_id]
    );

    if (!user || !user.is_active) {
      throw new AppError('User not found or account is inactive', 401, 'Invalid Token');
    }

    // Generate new token
    const newToken = generateToken(user.id, user.email, user.role);

    res.json({
      token: newToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      throw new AppError('Invalid or expired token', 401, 'Invalid Token');
    }
    throw error;
  }
}));

// Logout (client-side token removal, but we can track if needed)
router.post('/logout', (req, res) => {
  // In a stateless JWT system, logout is typically handled client-side
  // by removing the token from storage
  res.json({
    message: 'Logged out successfully'
  });
});

// Change password (only for local auth users)
router.post('/change-password', [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    throw new AppError('Access token required', 401, 'Authentication Required');
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const { currentPassword, newPassword } = req.body;

  // Get user with current password and auth provider
  const user = await getRow(
    'SELECT id, password_hash, auth_provider FROM users WHERE id = $1',
    [decoded.user_id]
  );

  if (!user) {
    throw new AppError('User not found', 404, 'User Not Found');
  }

  // Check if user is using Google OAuth
  if (user.auth_provider === 'google') {
    throw new AppError('Password change not available for Google OAuth accounts', 400, 'Invalid Operation');
  }

  // Verify current password
  const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isValidPassword) {
    throw new AppError('Current password is incorrect', 400, 'Invalid Password');
  }

  // Hash new password
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

  // Update password
  await query(
    'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [newPasswordHash, user.id]
  );

  res.json({
    message: 'Password changed successfully'
  });
}));

// Admin login (separate from regular user login)
router.post('/admin/login', [
  body('email').isEmail().normalizeEmail({ gmail_remove_dots: false, gmail_convert_googlemaildotcom: false }).withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
  body('captchaText').optional().isLength({ min: 1 }).withMessage('CAPTCHA text is required'),
  body('captchaId').optional().isLength({ min: 1 }).withMessage('CAPTCHA ID is required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }

  const { email, password, captchaText, captchaId } = req.body;
  const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';

  // Check for recent failed login attempts (last 15 minutes)
  const recentFailedAttempts = await query(
    `SELECT COUNT(*) as count FROM login_attempts 
     WHERE email = $1 AND success = false AND attempted_at > NOW() - INTERVAL '15 minutes'`,
    [email]
  );

  const failedCount = parseInt(recentFailedAttempts.rows[0].count);

  // Require CAPTCHA after 3 failed attempts
  if (failedCount >= 3) {
    if (!captchaText || !captchaId) {
      // Generate CAPTCHA for the user
      const captcha = generateCaptcha();
      return res.status(429).json({
        error: 'CAPTCHA_REQUIRED',
        message: 'Too many failed login attempts. Please solve the CAPTCHA.',
        captcha: {
          id: captcha.id,
          data: captcha.data // This is the SVG data URL
        }
      });
    }

    // Validate CAPTCHA
    const isValidCaptcha = validateCaptcha(captchaId, captchaText);
    if (!isValidCaptcha) {
      await trackFailedLogin(email, false, clientIP, req.get('User-Agent'));
      throw new AppError('Invalid CAPTCHA', 400, 'Invalid CAPTCHA');
    }
  }

  // Find admin user
  const user = await getRow(
    'SELECT id, email, password_hash, first_name, last_name, role, is_active, auth_provider FROM users WHERE email = $1 AND role = $2',
    [email, 'admin']
  );

  if (!user || !user.is_active) {
    await trackFailedLogin(email, false, clientIP, req.get('User-Agent'));
    throw new AppError('Invalid admin credentials', 401, 'Authentication Failed');
  }

  // Check if user is using Google OAuth
  if (user.auth_provider === 'google') {
    await trackFailedLogin(email, false, clientIP, req.get('User-Agent'));
    throw new AppError('Please use Google login for this admin account', 401, 'Authentication Failed');
  }

  // Check password
  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    await trackFailedLogin(email, false, clientIP, req.get('User-Agent'));
    throw new AppError('Invalid admin credentials', 401, 'Authentication Failed');
  }

  // Track successful login
  await trackFailedLogin(email, true, clientIP, req.get('User-Agent'));

  // Generate admin token
  const token = generateToken(user.id, user.email, user.role);

  res.json({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role
    },
    token
  });
}));

// Admin Google OAuth login (for admin accounts that use Google)
router.post('/admin/google', [
  body('token').notEmpty().withMessage('Google token is required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }

  const { token } = req.body;

  // Verify Google token
  const googlePayload = await verifyGoogleToken(token);
  
  const {
    sub: googleId,
    email: googleEmail,
    given_name: googleFirstName,
    family_name: googleLastName,
    picture: googlePicture,
    email_verified: googleEmailVerified
  } = googlePayload;

  // Check if admin user exists with Google ID
  let user = await getRow(
    'SELECT id, email, first_name, last_name, role, is_active, auth_provider FROM users WHERE google_id = $1 AND role = $2',
    [googleId, 'admin']
  );

  if (user) {
    // Admin exists with Google OAuth
    if (!user.is_active) {
      throw new AppError('Admin account is deactivated', 401, 'Account Deactivated');
    }

    // Generate token for existing admin
    const jwtToken = generateToken(user.id, user.email, user.role);

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      },
      token: jwtToken
    });
  }

  // Check if admin exists with email but different auth provider
  user = await getRow(
    'SELECT id, email, first_name, last_name, role, is_active, auth_provider FROM users WHERE email = $1 AND role = $2',
    [googleEmail, 'admin']
  );

  if (user) {
    if (user.auth_provider === 'local') {
      // Admin exists with email/password, link Google account
      await query(
        `UPDATE users 
         SET google_id = $1, google_email = $2, auth_provider = 'google', email_verified = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [googleId, googleEmail, googleEmailVerified, user.id]
      );

      const jwtToken = generateToken(user.id, user.email, user.role);

      return res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role
        },
        token: jwtToken
      });
    } else {
      throw new AppError('Email already associated with another Google account', 409, 'Account Conflict');
    }
  }

  // Admin not found - don't allow creation of admin accounts via Google OAuth
  throw new AppError('Admin account not found. Please contact system administrator.', 401, 'Admin Not Found');
}));

// Request password reset
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }
  const { email } = req.body;
  const user = await getRow('SELECT id, email, first_name, auth_provider FROM users WHERE email = $1 AND is_active = true', [email]);
  // Don't reveal whether the email exists or provider type
  if (user && user.auth_provider !== 'google') {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
    await query('UPDATE users SET password_reset_token = $1, password_reset_expires = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3', [token, expiresAt, user.id]);
    const resetUrl = `${process.env.FRONTEND_URL || 'https://themobileprof.com'}/reset-password?token=${token}`;
    await sendEmail({
      to: email,
      subject: 'Reset your password',
      template: 'password-reset',
      context: {
        firstName: user.first_name || 'there',
        data: { resetUrl }
      }
    });
  }
  res.json({ message: 'If that email exists, we have sent password reset instructions.' });
}));

// Reset password with token
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Token is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }
  const { token, newPassword } = req.body;
  const user = await getRow('SELECT id, auth_provider FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW() AND is_active = true', [token]);
  if (!user) {
    throw new AppError('Invalid or expired reset token', 400, 'Invalid Token');
  }
  if (user.auth_provider === 'google') {
    throw new AppError('Password reset not available for Google OAuth accounts', 400, 'Invalid Operation');
  }
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  const newHash = await bcrypt.hash(newPassword, saltRounds);
  await query('UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newHash, user.id]);
  res.json({ message: 'Password has been reset successfully.' });
}));

// Send verification email (user-initiated)
router.post('/resend-verification', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }
  const { email } = req.body;
  const user = await getRow('SELECT id, email, first_name, email_verified FROM users WHERE email = $1 AND is_active = true', [email]);
  if (!user) return res.json({ message: 'If that email exists, a verification email has been sent.' });
  if (user.email_verified) return res.json({ message: 'Email is already verified.' });

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours
  await query('UPDATE users SET verification_token = $1, verification_token_expires = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3', [token, expiresAt, user.id]);
  const verifyUrl = `${process.env.FRONTEND_URL || 'https://themobileprof.com'}/verify-email?token=${token}`;
  await sendEmail({
    to: email,
    subject: 'Verify your email address',
    template: 'email-verification',
    context: {
      firstName: user.first_name || 'there',
      data: { verifyUrl }
    }
  });
  res.json({ message: 'Verification email sent if the account exists and is unverified.' });
}));

// Verify email with token
router.post('/verify-email', [
  body('token').notEmpty().withMessage('Token is required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }
  const { token } = req.body;
  const user = await getRow('SELECT id FROM users WHERE verification_token = $1 AND verification_token_expires > NOW() AND is_active = true', [token]);
  if (!user) {
    throw new AppError('Invalid or expired verification token', 400, 'Invalid Token');
  }
  await query('UPDATE users SET email_verified = true, verification_token = NULL, verification_token_expires = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);
  res.json({ message: 'Email verified successfully.' });
}));

// Admin: resend verification email for a user by ID
router.post('/admin/users/:id/resend-verification', authenticateToken, asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new AppError('Forbidden', 403, 'Forbidden');
  }
  const user = await getRow('SELECT id, email, first_name, email_verified FROM users WHERE id = $1 AND is_active = true', [req.params.id]);
  if (!user) throw new AppError('User not found', 404, 'Not Found');
  if (user.email_verified) return res.json({ message: 'Email is already verified.' });
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);
  await query('UPDATE users SET verification_token = $1, verification_token_expires = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3', [token, expiresAt, user.id]);
  const verifyUrl = `${process.env.FRONTEND_URL || 'https://themobileprof.com'}/verify-email?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: 'Verify your email address',
    template: 'email-verification',
    context: { 
      firstName: user.first_name || 'there', 
      data: { verifyUrl } 
    }
  });
  res.json({ message: 'Verification email sent.' });
}));

// User-initiated resend for authenticated users (no email in body)
router.post('/me/resend-verification', authenticateToken, asyncHandler(async (req, res) => {
  const user = await getRow('SELECT id, email, first_name, email_verified FROM users WHERE id = $1 AND is_active = true', [req.user.id]);
  if (!user) throw new AppError('User not found', 404, 'Not Found');
  if (user.email_verified) return res.json({ message: 'Email is already verified.' });
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);
  await query('UPDATE users SET verification_token = $1, verification_token_expires = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3', [token, expiresAt, user.id]);
  const verifyUrl = `${process.env.FRONTEND_URL || 'https://themobileprof.com'}/verify-email?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: 'Verify your email address',
    template: 'email-verification',
    context: { 
      firstName: user.first_name || 'there', 
      data: { verifyUrl } 
    }
  });
  res.json({ message: 'Verification email sent.' });
}));

module.exports = router; 