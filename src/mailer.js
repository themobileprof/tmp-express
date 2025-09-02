const nodemailer = require('nodemailer');
const { query } = require('./database/config');

// Configure transporter with your SMTP settings
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.mailersend.net',
  port: parseInt(process.env.EMAIL_PORT, 10) || 587,
  secure: false, // TLS is used, but not SSL (secure: false for port 587)
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false, // Accept self-signed certs (optional, for dev)
  },
});

// Verify transporter configuration
const verifyTransporter = async () => {
  try {
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully');
    console.log(`📧 Email configured for: ${process.env.EMAIL_FROM_ADDRESS || 'info@themobileprof.com'}`);
    console.log(`🏠 SMTP Host: ${process.env.EMAIL_HOST || 'smtp.mailersend.net'}`);
    console.log(`🔌 SMTP Port: ${process.env.EMAIL_PORT || 587}`);
  } catch (error) {
    console.error('❌ SMTP connection failed:', error);
    throw error;
  }
};

/**
 * Send email with comprehensive logging
 * @param {Object} emailData - Email data object
 * @param {string} emailData.to - Recipient email
 * @param {string} emailData.subject - Email subject
 * @param {string} emailData.template - Template name (optional)
 * @param {Object} emailData.context - Template context (optional)
 * @param {string} emailData.html - HTML content (optional)
 * @param {string} emailData.text - Text content (optional)
 * @param {string} emailData.from - From email (optional, defaults to EMAIL_FROM_ADDRESS)
 */
const sendEmail = async (emailData) => {
  const startTime = Date.now();
  const emailId = Math.random().toString(36).substr(2, 9);
  
  try {
    // Log email attempt
    console.log(`📧 [${emailId}] Starting email send to: ${emailData.to}`);
    console.log(`📧 [${emailId}] Subject: ${emailData.subject}`);
    console.log(`📧 [${emailId}] From: ${emailData.from || process.env.EMAIL_FROM_ADDRESS || 'info@themobileprof.com'}`);

    // Prepare email options
    const mailOptions = {
      from: emailData.from || process.env.EMAIL_FROM_ADDRESS || 'info@themobileprof.com',
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html || generateEmailHTML(emailData),
      text: emailData.text || generateEmailText(emailData),
    };

    // Send email
    const result = await transporter.sendMail(mailOptions);
    
    const duration = Date.now() - startTime;
    
    // Log successful send
    console.log(`✅ [${emailId}] Email sent successfully in ${duration}ms`);
    console.log(`✅ [${emailId}] Message ID: ${result.messageId}`);
    console.log(`✅ [${emailId}] Recipient: ${emailData.to}`);
    
    // Log to database
    await logEmailToDatabase({
      emailId,
      recipientEmail: emailData.to,
      subject: emailData.subject,
      template: emailData.template,
      messageId: result.messageId,
      status: 'sent',
      duration,
      errorMessage: null
    });
    
    return {
      success: true,
      messageId: result.messageId,
      emailId,
      duration,
      recipient: emailData.to
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Log error details
    console.error(`❌ [${emailId}] Email send failed after ${duration}ms`);
    console.error(`❌ [${emailId}] Error: ${error.message}`);
    console.error(`❌ [${emailId}] Recipient: ${emailData.to}`);
    console.error(`❌ [${emailId}] Subject: ${emailData.subject}`);
    
    if (error.code) {
      console.error(`❌ [${emailId}] Error code: ${error.code}`);
    }
    
    if (error.response) {
      console.error(`❌ [${emailId}] SMTP response: ${error.response}`);
    }
    
    // Log error to database
    await logEmailToDatabase({
      emailId,
      recipientEmail: emailData.to,
      subject: emailData.subject,
      template: emailData.template,
      messageId: null,
      status: 'failed',
      duration,
      errorMessage: error.message
    });
    
    throw error;
  }
};

/**
 * Log email send attempt to database
 */
const logEmailToDatabase = async (logData) => {
  try {
    await query(
      `INSERT INTO email_logs (
        email_id, recipient_email, subject, template, message_id, 
        status, error_message, duration_ms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        logData.emailId,
        logData.recipientEmail,
        logData.subject,
        logData.template,
        logData.messageId,
        logData.status,
        logData.errorMessage,
        logData.duration
      ]
    );
  } catch (error) {
    console.error('Failed to log email to database:', error);
    // Don't throw error to avoid breaking email sending
  }
};

/**
 * Generate HTML email content
 */
const generateEmailHTML = (emailData) => {
  if (emailData.template === 'notification') {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${emailData.subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3B82F6; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .button { display: inline-block; padding: 10px 20px; background: #3B82F6; color: white; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>TheMobileProf</h1>
          </div>
          <div class="content">
            <h2>${emailData.subject}</h2>
            <p>Hello ${emailData.context?.firstName || 'there'},</p>
            <p>${emailData.context?.message || emailData.message}</p>
            ${emailData.context?.data ? `<p><strong>Details:</strong> ${JSON.stringify(emailData.context.data)}</p>` : ''}
          </div>
          <div class="footer">
            <p>This email was sent from TheMobileProf Learning Platform</p>
            ${emailData.context?.unsubscribeUrl ? `<p><a href="${emailData.context.unsubscribeUrl}">Unsubscribe</a></p>` : ''}
          </div>
        </div>
      </body>
      </html>
    `;
  }
  
  // Default HTML template
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${emailData.subject}</title>
    </head>
    <body>
      <h1>${emailData.subject}</h1>
      <p>${emailData.message || emailData.context?.message || ''}</p>
    </body>
    </html>
  `;
};

/**
 * Generate text email content
 */
const generateEmailText = (emailData) => {
  if (emailData.template === 'notification') {
    return `
TheMobileProf Notification

${emailData.subject}

Hello ${emailData.context?.firstName || 'there'},

${emailData.context?.message || emailData.message}

${emailData.context?.data ? `Details: ${JSON.stringify(emailData.context.data)}` : ''}

---
This email was sent from TheMobileProf Learning Platform
${emailData.context?.unsubscribeUrl ? `Unsubscribe: ${emailData.context.unsubscribeUrl}` : ''}
    `;
  }
  
  return emailData.message || emailData.context?.message || emailData.subject;
};

// Initialize transporter verification on startup
verifyTransporter().catch(console.error);

module.exports = {
  transporter,
  sendEmail,
  verifyTransporter
}; 