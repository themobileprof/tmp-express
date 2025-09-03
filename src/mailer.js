const nodemailer = require('nodemailer');
const axios = require('axios');
const { query } = require('./database/config');

// Determine provider and configuration
const EMAIL_PROVIDER = (process.env.EMAIL_PROVIDER || 'brevo').toLowerCase();

function resolveTransportOptions() {
  if (EMAIL_PROVIDER === 'brevo' && process.env.BREVO_API_KEY) {
    // Use Brevo API key
    return {
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER || 'your-email@domain.com', // Can be any email
        pass: process.env.BREVO_API_KEY,
      },
    };
  }

  if (EMAIL_PROVIDER === 'mailersend' && process.env.MAILERSEND_API_KEY) {
    // Use MailerSend API key
    return {
      host: 'smtp.mailersend.net',
      port: 587,
      secure: false,
  auth: {
        user: process.env.EMAIL_USER || 'your-email@domain.com', // Can be any email
        pass: process.env.MAILERSEND_API_KEY,
      },
    };
  }

  if (EMAIL_PROVIDER === 'zoho') {
    // Zoho Mail SMTP using user/pass (use app-specific password if 2FA)
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error("For EMAIL_PROVIDER=zoho, please set EMAIL_USER and EMAIL_PASS in your environment variables.");
    }
    return {
      host: process.env.EMAIL_HOST || 'smtp.zoho.com',
      port: parseInt(process.env.EMAIL_PORT || '587', 10),
      secure: false, // STARTTLS on 587
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    };
  }

  // If no API key, throw error
  const requiredKey = EMAIL_PROVIDER === 'brevo' ? 'BREVO_API_KEY' : (EMAIL_PROVIDER === 'mailersend' ? 'MAILERSEND_API_KEY' : 'EMAIL_USER/EMAIL_PASS');
  throw new Error(`EMAIL_PROVIDER is set to '${EMAIL_PROVIDER}' but required credentials (${requiredKey}) are not configured.`);
}

// Configure transporter with selected provider
const transporter = nodemailer.createTransport(resolveTransportOptions());

// Verify transporter configuration
const verifyTransporter = async () => {
  try {
    if (EMAIL_PROVIDER === 'brevo' && process.env.BREVO_API_KEY) {
      // Test Brevo REST API
      console.log('🔍 Testing Brevo REST API connection...');
      const response = await axios.get('https://api.brevo.com/v3/account', {
        headers: {
          'api-key': process.env.BREVO_API_KEY,
        },
      });
      console.log('✅ Brevo REST API connection verified successfully');
      console.log(`📧 Provider: ${EMAIL_PROVIDER} (REST API)`);
      console.log(`📧 From: ${process.env.EMAIL_FROM_ADDRESS || 'info@themobileprof.com'}`);
      console.log(`🔑 Using Brevo API Key (${process.env.BREVO_API_KEY.substring(0, 8)}...)`);
      console.log(`🏢 Account: ${response.data.email}`);
    } else {
      // Test SMTP connection for MailerSend or fallback
      await transporter.verify();
      console.log('✅ SMTP connection verified successfully');
      console.log(`📧 Provider: ${EMAIL_PROVIDER} (SMTP)`);
      console.log(`📧 From: ${process.env.EMAIL_FROM_ADDRESS || 'info@themobileprof.com'}`);
      if (EMAIL_PROVIDER === 'mailersend') {
        console.log(`🏠 Host: smtp.mailersend.net`);
        console.log(`🔑 Using MailerSend API Key (${process.env.MAILERSEND_API_KEY.substring(0, 8)}...)`);
      } else if (EMAIL_PROVIDER === 'zoho') {
        console.log(`🏠 Host: ${process.env.EMAIL_HOST || 'smtp.zoho.com'}`);
        console.log(`👤 User: ${process.env.EMAIL_USER || '(not set)'}`);
      }
      console.log(`🔌 Port: 587`);
    }
  } catch (error) {
    console.error('❌ Email service connection failed:', error.message);
    if (error.response) {
      console.error('❌ API response:', error.response.data);
    }
    throw error;
  }
};

/**
 * Send email via Brevo REST API
 */
const sendEmailViaBrevoAPI = async (emailData, emailId) => {
  const apiKey = process.env.BREVO_API_KEY;
  const fromAddress = emailData.from || process.env.EMAIL_FROM_ADDRESS || 'info@themobileprof.com';
  
  const payload = {
    sender: { email: fromAddress },
    to: [{ email: emailData.to }],
    subject: emailData.subject,
    htmlContent: emailData.html || generateEmailHTML(emailData),
    textContent: emailData.text || generateEmailText(emailData),
  };

  const response = await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
  },
});

  return {
    messageId: response.data.messageId,
    success: true
  };
};

/**
 * Send email via SMTP (for MailerSend or Brevo fallback)
 */
const sendEmailViaSMTP = async (emailData, emailId) => {
  const mailOptions = {
    from: emailData.from || process.env.EMAIL_FROM_ADDRESS || 'info@themobileprof.com',
    to: emailData.to,
    subject: emailData.subject,
    html: emailData.html || generateEmailHTML(emailData),
    text: emailData.text || generateEmailText(emailData),
  };

  const result = await transporter.sendMail(mailOptions);
  return {
    messageId: result.messageId,
    success: true
  };
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
    console.log(`📧 [${emailId}] (${EMAIL_PROVIDER}) Sending → ${emailData.to}`);
    console.log(`📧 [${emailId}] Subject: ${emailData.subject}`);
    console.log(`📧 [${emailId}] From: ${emailData.from || process.env.EMAIL_FROM_ADDRESS || 'info@themobileprof.com'}`);

    let result;
    
    // Choose sending method based on provider
    if (EMAIL_PROVIDER === 'brevo' && process.env.BREVO_API_KEY) {
      console.log(`📧 [${emailId}] Using Brevo REST API`);
      result = await sendEmailViaBrevoAPI(emailData, emailId);
    } else {
      console.log(`📧 [${emailId}] Using SMTP`);
      result = await sendEmailViaSMTP(emailData, emailId);
    }
    
    const duration = Date.now() - startTime;
    
    // Log successful send
    console.log(`✅ [${emailId}] (${EMAIL_PROVIDER}) Sent in ${duration}ms`);
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
    console.error(`❌ [${emailId}] (${EMAIL_PROVIDER}) Send failed after ${duration}ms`);
    console.error(`❌ [${emailId}] Error: ${error.message}`);
    console.error(`❌ [${emailId}] Recipient: ${emailData.to}`);
    console.error(`❌ [${emailId}] Subject: ${emailData.subject}`);
    
    if (error.code) {
      console.error(`❌ [${emailId}] Error code: ${error.code}`);
    }
    
    if (error.response) {
      console.error(`❌ [${emailId}] API response: ${JSON.stringify(error.response.data)}`);
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