const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, getRow } = require('../database/config');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const validateSettings = [
  body('emailNotifications').optional().isBoolean().withMessage('Email notifications must be a boolean'),
  body('pushNotifications').optional().isBoolean().withMessage('Push notifications must be a boolean'),
  body('marketingEmails').optional().isBoolean().withMessage('Marketing emails must be a boolean'),
  body('theme').optional().isIn(['light', 'dark', 'system']).withMessage('Theme must be light, dark, or system'),
  body('language').optional().isLength({ min: 2, max: 10 }).withMessage('Language must be 2-10 characters'),
  body('timezone').optional().isString().withMessage('Timezone must be a string')
];

// Get user settings
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const settings = await getRow(
    'SELECT * FROM user_settings WHERE user_id = $1',
    [userId]
  );

  if (!settings) {
    // Create default settings if they don't exist
    const result = await query(
      `INSERT INTO user_settings (user_id) VALUES ($1) RETURNING *`,
      [userId]
    );
    const newSettings = result.rows[0];

    res.json({
      emailNotifications: newSettings.email_notifications,
      pushNotifications: newSettings.push_notifications,
      marketingEmails: newSettings.marketing_emails,
      theme: newSettings.theme,
      language: newSettings.language,
      timezone: newSettings.timezone
    });
  } else {
    res.json({
      emailNotifications: settings.email_notifications,
      pushNotifications: settings.push_notifications,
      marketingEmails: settings.marketing_emails,
      theme: settings.theme,
      language: settings.language,
      timezone: settings.timezone
    });
  }
}));

// Update user settings
router.put('/', authenticateToken, validateSettings, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }

  const userId = req.user.id;
  const {
    emailNotifications, pushNotifications, marketingEmails, theme, language, timezone
  } = req.body;

  // Check if settings exist
  const existingSettings = await getRow(
    'SELECT * FROM user_settings WHERE user_id = $1',
    [userId]
  );

  if (!existingSettings) {
    // Create settings if they don't exist
    const result = await query(
      `INSERT INTO user_settings (
        user_id, email_notifications, push_notifications, marketing_emails,
        theme, language, timezone
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        userId,
        emailNotifications !== undefined ? emailNotifications : true,
        pushNotifications !== undefined ? pushNotifications : true,
        marketingEmails !== undefined ? marketingEmails : false,
        theme || 'system',
        language || 'en',
        timezone || 'UTC'
      ]
    );

    const newSettings = result.rows[0];

    res.json({
      emailNotifications: newSettings.email_notifications,
      pushNotifications: newSettings.push_notifications,
      marketingEmails: newSettings.marketing_emails,
      theme: newSettings.theme,
      language: newSettings.language,
      timezone: newSettings.timezone
    });
  } else {
    // Update existing settings
    const result = await query(
      `UPDATE user_settings 
       SET email_notifications = COALESCE($1, email_notifications),
           push_notifications = COALESCE($2, push_notifications),
           marketing_emails = COALESCE($3, marketing_emails),
           theme = COALESCE($4, theme),
           language = COALESCE($5, language),
           timezone = COALESCE($6, timezone),
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $7
       RETURNING *`,
      [emailNotifications, pushNotifications, marketingEmails, theme, language, timezone, userId]
    );

    const updatedSettings = result.rows[0];

    res.json({
      emailNotifications: updatedSettings.email_notifications,
      pushNotifications: updatedSettings.push_notifications,
      marketingEmails: updatedSettings.marketing_emails,
      theme: updatedSettings.theme,
      language: updatedSettings.language,
      timezone: updatedSettings.timezone
    });
  }
}));

module.exports = router; 