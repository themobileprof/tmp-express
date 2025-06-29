const express = require('express');
const { body } = require('express-validator');
const { validationResult } = require('express-validator');
const { getRow, query } = require('../database/config');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user preferences
router.get('/preferences', authenticateToken, asyncHandler(async (req, res) => {
  const settings = await getRow(
    `SELECT theme, language, timezone, email_notifications, push_notifications,
            course_notifications, class_notifications, discussion_notifications,
            marketing_emails, created_at, updated_at
     FROM user_settings 
     WHERE user_id = $1`,
    [req.user.id]
  );

  if (!settings) {
    // Create default settings if none exist
    await query(
      `INSERT INTO user_settings (user_id, theme, language, timezone, 
                                 email_notifications, push_notifications,
                                 course_notifications, class_notifications, 
                                 discussion_notifications, marketing_emails)
       VALUES ($1, 'system', 'en', 'UTC', true, true, true, true, true, false)`,
      [req.user.id]
    );

    res.json({
      theme: 'system',
      language: 'en',
      timezone: 'UTC',
      emailNotifications: true,
      pushNotifications: true,
      courseNotifications: true,
      classNotifications: true,
      discussionNotifications: true,
      marketingEmails: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  } else {
    res.json({
      theme: settings.theme,
      language: settings.language,
      timezone: settings.timezone,
      emailNotifications: settings.email_notifications,
      pushNotifications: settings.push_notifications,
      courseNotifications: settings.course_notifications,
      classNotifications: settings.class_notifications,
      discussionNotifications: settings.discussion_notifications,
      marketingEmails: settings.marketing_emails,
      createdAt: settings.created_at,
      updatedAt: settings.updated_at
    });
  }
}));

// Update user preferences
router.put('/preferences', [
  body('theme').optional().isIn(['light', 'dark', 'system']).withMessage('Theme must be light, dark, or system'),
  body('language').optional().isIn(['en', 'es', 'fr', 'de', 'zh', 'ja']).withMessage('Invalid language code'),
  body('timezone').optional().isString().withMessage('Timezone must be a string'),
  body('emailNotifications').optional().isBoolean().withMessage('Email notifications must be a boolean'),
  body('pushNotifications').optional().isBoolean().withMessage('Push notifications must be a boolean'),
  body('courseNotifications').optional().isBoolean().withMessage('Course notifications must be a boolean'),
  body('classNotifications').optional().isBoolean().withMessage('Class notifications must be a boolean'),
  body('discussionNotifications').optional().isBoolean().withMessage('Discussion notifications must be a boolean'),
  body('marketingEmails').optional().isBoolean().withMessage('Marketing emails must be a boolean')
], authenticateToken, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }

  const {
    theme,
    language,
    timezone,
    emailNotifications,
    pushNotifications,
    courseNotifications,
    classNotifications,
    discussionNotifications,
    marketingEmails
  } = req.body;

  // Check if settings exist
  const existingSettings = await getRow(
    'SELECT id FROM user_settings WHERE user_id = $1',
    [req.user.id]
  );

  if (existingSettings) {
    // Update existing settings
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (theme !== undefined) {
      updateFields.push(`theme = $${paramIndex}`);
      updateValues.push(theme);
      paramIndex++;
    }
    if (language !== undefined) {
      updateFields.push(`language = $${paramIndex}`);
      updateValues.push(language);
      paramIndex++;
    }
    if (timezone !== undefined) {
      updateFields.push(`timezone = $${paramIndex}`);
      updateValues.push(timezone);
      paramIndex++;
    }
    if (emailNotifications !== undefined) {
      updateFields.push(`email_notifications = $${paramIndex}`);
      updateValues.push(emailNotifications);
      paramIndex++;
    }
    if (pushNotifications !== undefined) {
      updateFields.push(`push_notifications = $${paramIndex}`);
      updateValues.push(pushNotifications);
      paramIndex++;
    }
    if (courseNotifications !== undefined) {
      updateFields.push(`course_notifications = $${paramIndex}`);
      updateValues.push(courseNotifications);
      paramIndex++;
    }
    if (classNotifications !== undefined) {
      updateFields.push(`class_notifications = $${paramIndex}`);
      updateValues.push(classNotifications);
      paramIndex++;
    }
    if (discussionNotifications !== undefined) {
      updateFields.push(`discussion_notifications = $${paramIndex}`);
      updateValues.push(discussionNotifications);
      paramIndex++;
    }
    if (marketingEmails !== undefined) {
      updateFields.push(`marketing_emails = $${paramIndex}`);
      updateValues.push(marketingEmails);
      paramIndex++;
    }

    if (updateFields.length > 0) {
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(req.user.id);

      await query(
        `UPDATE user_settings SET ${updateFields.join(', ')} WHERE user_id = $${paramIndex}`,
        updateValues
      );
    }
  } else {
    // Create new settings
    await query(
      `INSERT INTO user_settings (
        user_id, theme, language, timezone, 
        email_notifications, push_notifications,
        course_notifications, class_notifications, 
        discussion_notifications, marketing_emails
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        req.user.id,
        theme || 'system',
        language || 'en',
        timezone || 'UTC',
        emailNotifications !== undefined ? emailNotifications : true,
        pushNotifications !== undefined ? pushNotifications : true,
        courseNotifications !== undefined ? courseNotifications : true,
        classNotifications !== undefined ? classNotifications : true,
        discussionNotifications !== undefined ? discussionNotifications : true,
        marketingEmails !== undefined ? marketingEmails : false
      ]
    );
  }

  // Return updated settings
  const updatedSettings = await getRow(
    `SELECT theme, language, timezone, email_notifications, push_notifications,
            course_notifications, class_notifications, discussion_notifications,
            marketing_emails, created_at, updated_at
     FROM user_settings WHERE user_id = $1`,
    [req.user.id]
  );

  res.json({
    theme: updatedSettings.theme,
    language: updatedSettings.language,
    timezone: updatedSettings.timezone,
    emailNotifications: updatedSettings.email_notifications,
    pushNotifications: updatedSettings.push_notifications,
    courseNotifications: updatedSettings.course_notifications,
    classNotifications: updatedSettings.class_notifications,
    discussionNotifications: updatedSettings.discussion_notifications,
    marketingEmails: updatedSettings.marketing_emails,
    createdAt: updatedSettings.created_at,
    updatedAt: updatedSettings.updated_at
  });
}));

// Get account settings
router.get('/account', authenticateToken, asyncHandler(async (req, res) => {
  const user = await getRow(
    `SELECT email, first_name, last_name, avatar_url, bio, 
            auth_provider, email_verified, created_at, updated_at
     FROM users WHERE id = $1`,
    [req.user.id]
  );

  res.json({
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    avatarUrl: user.avatar_url,
    bio: user.bio,
    authProvider: user.auth_provider,
    emailVerified: user.email_verified,
    createdAt: user.created_at,
    updatedAt: user.updated_at
  });
}));

// Update account settings
router.put('/account', [
  body('firstName').optional().isLength({ min: 1, max: 50 }).withMessage('First name must be between 1 and 50 characters'),
  body('lastName').optional().isLength({ min: 1, max: 50 }).withMessage('Last name must be between 1 and 50 characters'),
  body('bio').optional().isLength({ max: 500 }).withMessage('Bio must be less than 500 characters')
], authenticateToken, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }

  const { firstName, lastName, bio } = req.body;

  const updateFields = [];
  const updateValues = [];
  let paramIndex = 1;

  if (firstName !== undefined) {
    updateFields.push(`first_name = $${paramIndex}`);
    updateValues.push(firstName);
    paramIndex++;
  }
  if (lastName !== undefined) {
    updateFields.push(`last_name = $${paramIndex}`);
    updateValues.push(lastName);
    paramIndex++;
  }
  if (bio !== undefined) {
    updateFields.push(`bio = $${paramIndex}`);
    updateValues.push(bio);
    paramIndex++;
  }

  if (updateFields.length > 0) {
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(req.user.id);

    await query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
      updateValues
    );
  }

  // Return updated user data
  const updatedUser = await getRow(
    `SELECT email, first_name, last_name, avatar_url, bio, 
            auth_provider, email_verified, created_at, updated_at
     FROM users WHERE id = $1`,
    [req.user.id]
  );

  res.json({
    email: updatedUser.email,
    firstName: updatedUser.first_name,
    lastName: updatedUser.last_name,
    avatarUrl: updatedUser.avatar_url,
    bio: updatedUser.bio,
    authProvider: updatedUser.auth_provider,
    emailVerified: updatedUser.email_verified,
    createdAt: updatedUser.created_at,
    updatedAt: updatedUser.updated_at
  });
}));

module.exports = router; 