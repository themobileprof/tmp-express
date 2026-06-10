const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, getRow, getRows } = require('../database/config');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { sendEmail } = require('../mailer');
const { getSystemSetting } = require('../utils/systemSettings');

const router = express.Router();

const ORGANIZATION_TYPES = [
  'youth_empowerment',
  'education',
  'community_development',
  'faith_based',
  'women_girls',
  'disability_inclusion',
  'other',
];

const TRAINING_TOPICS = [
  'linux_devops',
  'mobile_productivity',
  'python_programming',
  'cloud_computing',
  'cybersecurity',
  'web_development',
  'other',
];

const STATUS_VALUES = ['new', 'reviewed', 'contacted', 'scheduled', 'declined', 'archived'];

function formatLabel(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildSubmissionEmailHtml(submission) {
  const topics = (submission.training_topics || []).map(formatLabel).join(', ') || 'Not specified';
  return `
    <h2>New NGO training interest</h2>
    <p><strong>Organization:</strong> ${submission.organization_name}</p>
    <p><strong>Contact:</strong> ${submission.contact_name} &lt;${submission.contact_email}&gt;</p>
    <p><strong>Phone:</strong> ${submission.contact_phone || '—'}</p>
    <p><strong>Location:</strong> ${[submission.city, submission.country].filter(Boolean).join(', ')}</p>
    <p><strong>Type:</strong> ${formatLabel(submission.organization_type)}</p>
    <p><strong>Website:</strong> ${submission.website || '—'}</p>
    <p><strong>Beneficiaries estimate:</strong> ${submission.beneficiaries_estimate ?? '—'}</p>
    <p><strong>Training topics:</strong> ${topics}</p>
    <p><strong>Availability / preferred dates:</strong><br>${submission.availability_notes || '—'}</p>
    <p><strong>Mission summary:</strong><br>${submission.mission_summary}</p>
    ${submission.message ? `<p><strong>Additional message:</strong><br>${submission.message}</p>` : ''}
    <p><small>Submission ID: ${submission.id}</small></p>
  `;
}

router.post('/', [
  body('organizationName').trim().isLength({ min: 2, max: 255 }),
  body('contactName').trim().isLength({ min: 2, max: 200 }),
  body('contactEmail').isEmail().normalizeEmail(),
  body('contactPhone').optional({ values: 'falsy' }).trim().isLength({ max: 50 }),
  body('country').trim().isLength({ min: 2, max: 100 }),
  body('city').optional({ values: 'falsy' }).trim().isLength({ max: 100 }),
  body('website').optional({ values: 'falsy' }).trim().custom((value) => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol);
    } catch {
      throw new Error('Website must be a valid URL');
    }
  }),
  body('organizationType').isIn(ORGANIZATION_TYPES),
  body('missionSummary').trim().isLength({ min: 20, max: 5000 }),
  body('beneficiariesEstimate').optional({ values: 'falsy' }).isInt({ min: 1, max: 1000000 }),
  body('trainingTopics').optional().isArray({ max: 10 }),
  body('trainingTopics.*').optional().isIn(TRAINING_TOPICS),
  body('availabilityNotes').optional({ values: 'falsy' }).trim().isLength({ max: 2000 }),
  body('message').optional({ values: 'falsy' }).trim().isLength({ max: 3000 }),
  body('websiteUrl').optional().isEmpty(), // honeypot
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorDetails = errors.array().reduce((acc, error) => {
      acc[error.path] = error.msg;
      return acc;
    }, {});
    throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', errorDetails);
  }

  if (req.body.websiteUrl) {
    return res.json({ success: true, message: 'Thank you for your interest.' });
  }

  const {
    organizationName,
    contactName,
    contactEmail,
    contactPhone,
    country,
    city,
    website,
    organizationType,
    missionSummary,
    beneficiariesEstimate,
    trainingTopics = [],
    availabilityNotes,
    message,
  } = req.body;

  const ipAddress = req.ip || req.connection?.remoteAddress || null;
  const userAgent = req.get('user-agent') || null;

  const result = await query(
    `INSERT INTO ngo_interest_submissions (
      organization_name, contact_name, contact_email, contact_phone,
      country, city, website, organization_type, mission_summary,
      beneficiaries_estimate, training_topics, availability_notes, message,
      ip_address, user_agent
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING *`,
    [
      organizationName,
      contactName,
      contactEmail,
      contactPhone || null,
      country,
      city || null,
      website || null,
      organizationType,
      missionSummary,
      beneficiariesEstimate ? parseInt(beneficiariesEstimate, 10) : null,
      trainingTopics,
      availabilityNotes || null,
      message || null,
      ipAddress,
      userAgent,
    ]
  );

  const submission = result.rows[0];

  const notifyEmail = await getSystemSetting('ngo_notification_email', 'info@themobileprof.com');

  try {
    await sendEmail({
      to: notifyEmail,
      subject: `NGO training interest: ${organizationName}`,
      html: buildSubmissionEmailHtml(submission) + `<p>Reply to: <a href="mailto:${contactEmail}">${contactEmail}</a></p>`,
    });

    await sendEmail({
      to: contactEmail,
      subject: 'We received your NGO training interest — TheMobileProf',
      template: 'notification',
      context: {
        firstName: contactName.split(' ')[0],
        message: `Thank you for introducing ${organizationName} to TheMobileProf. We offer complimentary 2-day live training to select NGOs, and your submission is now in our review queue. A member of our team will contact you at ${contactEmail} soon.`,
      },
    });
  } catch (emailError) {
    console.error('NGO submission email failed (submission saved):', emailError.message);
  }

  res.status(201).json({
    success: true,
    message: 'Thank you! Your interest has been submitted. We will contact you shortly.',
    submissionId: submission.id,
  });
}));

module.exports = router;
module.exports.ORGANIZATION_TYPES = ORGANIZATION_TYPES;
module.exports.TRAINING_TOPICS = TRAINING_TOPICS;
module.exports.STATUS_VALUES = STATUS_VALUES;
module.exports.formatLabel = formatLabel;
