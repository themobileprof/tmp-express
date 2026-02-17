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
  const baseStyles = `
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      line-height: 1.6; 
      color: #333; 
      margin: 0; 
      padding: 0; 
      background-color: #f4f4f4; 
    }
    .email-container { 
      max-width: 600px; 
      margin: 0 auto; 
      background-color: #ffffff;
      box-shadow: 0 0 20px rgba(0,0,0,0.1);
    }
    .header { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white; 
      padding: 30px 20px; 
      text-align: center; 
    }
    .header h1 { 
      margin: 0; 
      font-size: 28px; 
      font-weight: 300;
    }
    .content { 
      padding: 40px 30px; 
      background: #ffffff; 
    }
    .content h2 { 
      color: #333; 
      margin-top: 0; 
      font-size: 24px;
      font-weight: 400;
    }
    .content p { 
      margin-bottom: 20px; 
      font-size: 16px;
      color: #555;
    }
    .button { 
      display: inline-block; 
      padding: 15px 30px; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white; 
      text-decoration: none; 
      border-radius: 8px; 
      font-weight: 600;
      font-size: 16px;
      margin: 20px 0;
      transition: transform 0.2s ease;
    }
    .button:hover { 
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    .footer { 
      padding: 30px 20px; 
      text-align: center; 
      font-size: 14px; 
      color: #888; 
      background-color: #f8f9fa;
      border-top: 1px solid #e9ecef;
    }
    .footer p { 
      margin: 5px 0; 
    }
    .footer a { 
      color: #667eea; 
      text-decoration: none; 
    }
    .security-note { 
      background-color: #fff3cd; 
      border: 1px solid #ffeaa7; 
      border-radius: 6px; 
      padding: 15px; 
      margin: 20px 0; 
      color: #856404;
      font-size: 14px;
    }
    .divider { 
      height: 1px; 
      background: linear-gradient(to right, transparent, #ddd, transparent); 
      margin: 30px 0; 
    }
    @media only screen and (max-width: 600px) {
      .email-container { margin: 0; }
      .content { padding: 30px 20px; }
      .header { padding: 20px 15px; }
    }
  `;

  // Password Reset Template
  if (emailData.template === 'password-reset') {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password - TheMobileProf</title>
        <style>${baseStyles}</style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>🔐 Password Reset</h1>
          </div>
          <div class="content">
            <h2>Hello ${emailData.context?.firstName || 'there'}!</h2>
            <p>We received a request to reset your password for your TheMobileProf account. If you made this request, click the button below to reset your password:</p>
            
            <div style="text-align: center;">
              <a href="${emailData.context?.data?.resetUrl}" class="button">Reset My Password</a>
            </div>
            
            <div class="security-note">
              <strong>⚠️ Security Notice:</strong> This link will expire in 1 hour for your security. If you didn't request this password reset, please ignore this email and your password will remain unchanged.
            </div>
            
            <div class="divider"></div>
            
            <p>If the button above doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 14px;">
              ${emailData.context?.data?.resetUrl}
            </p>
          </div>
          <div class="footer">
            <p><strong>TheMobileProf Learning Platform</strong></p>
            <p>This email was sent because a password reset was requested for your account.</p>
            <p>If you have any questions, please contact our support team.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Email Verification Template
  if (emailData.template === 'email-verification') {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email - TheMobileProf</title>
        <style>${baseStyles}</style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>📧 Verify Your Email</h1>
          </div>
          <div class="content">
            <h2>Welcome to TheMobileProf, ${emailData.context?.firstName || 'there'}!</h2>
            <p>Thank you for joining our learning platform. To complete your registration and access all features, please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center;">
              <a href="${emailData.context?.data?.verifyUrl}" class="button">Verify My Email</a>
            </div>
            
            <div class="security-note">
              <strong>💡 What happens next?</strong> Once verified, you'll have full access to all courses, be able to track your progress, and receive important updates about your learning journey.
            </div>
            
            <div class="divider"></div>
            
            <p>If the button above doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 14px;">
              ${emailData.context?.data?.verifyUrl}
            </p>
          </div>
          <div class="footer">
            <p><strong>TheMobileProf Learning Platform</strong></p>
            <p>Ready to start your mobile development journey? Verify your email to get started!</p>
            <p>This verification link will expire in 24 hours.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Certificate Awarded Template
  if (emailData.template === 'certificate-awarded') {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Certificate Awarded - TheMobileProf</title>
        <style>${baseStyles}</style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>🎉 Certificate Awarded!</h1>
          </div>
          <div class="content">
            <h2>Congratulations ${emailData.context?.firstName || 'there'}!</h2>
            <p>You have successfully completed your learning journey and earned an official certificate. This is a significant achievement that demonstrates your commitment to professional development.</p>
            
            <div style="background-color: #f0f9ff; border: 2px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #1e40af; margin-top: 0;">🏆 Certificate Details</h3>
              <p style="margin: 5px 0;"><strong>Course/Class:</strong> ${emailData.context?.data?.courseTitle || 'Your Completed Course'}</p>
              <p style="margin: 5px 0;"><strong>Verification Code:</strong> <code style="background: #e0f2fe; padding: 2px 6px; border-radius: 3px;">${emailData.context?.data?.verificationCode}</code></p>
              <p style="margin: 5px 0;"><strong>Issued:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            
            <div style="text-align: center;">
              <a href="${emailData.context?.data?.certificateViewUrl}" class="button" style="margin-right: 10px;">🎓 View Certificate</a>
              <a href="${emailData.context?.data?.verifyUrl}" class="button" style="background: #10b981; margin-left: 10px;">✅ Verify Certificate</a>
            </div>
            
            <div class="security-note">
              <strong>🔒 Certificate Security:</strong> Your certificate includes a unique verification code that can be used to confirm its authenticity. Keep this code safe as it serves as proof of your achievement.
            </div>
            
            <div class="divider"></div>
            
            <p><strong>What can you do with your certificate?</strong></p>
            <ul style="padding-left: 20px;">
              <li>Add it to your professional portfolio or resume</li>
              <li>Share it on LinkedIn and other professional networks</li>
              <li>Use it to demonstrate your skills to employers</li>
              <li>Verify its authenticity using the verification code</li>
            </ul>
            
            <p>We commend your dedication to learning and wish you continued success in your professional journey!</p>
          </div>
          <div class="footer">
            <p><strong>TheMobileProf Learning Platform</strong></p>
            <p>Empowering mobile developers worldwide through quality education</p>
            <p>Questions about your certificate? Contact our support team.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Generic Notification Template (fallback)
  if (emailData.template === 'notification') {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${emailData.subject} - TheMobileProf</title>
        <style>${baseStyles}</style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>📱 TheMobileProf</h1>
          </div>
          <div class="content">
            <h2>${emailData.subject}</h2>
            <p>Hello ${emailData.context?.firstName || 'there'},</p>
            <p>${emailData.context?.message || emailData.message}</p>
            ${emailData.context?.data?.resetUrl ? `
              <div style="text-align: center;">
                <a href="${emailData.context.data.resetUrl}" class="button">Take Action</a>
              </div>
            ` : ''}
            ${emailData.context?.data?.verifyUrl ? `
              <div style="text-align: center;">
                <a href="${emailData.context.data.verifyUrl}" class="button">Verify Email</a>
              </div>
            ` : ''}
          </div>
          <div class="footer">
            <p><strong>TheMobileProf Learning Platform</strong></p>
            <p>Empowering mobile developers worldwide</p>
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
      <style>${baseStyles}</style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>📱 TheMobileProf</h1>
        </div>
        <div class="content">
          <h2>${emailData.subject}</h2>
          <p>${emailData.message || emailData.context?.message || ''}</p>
        </div>
        <div class="footer">
          <p><strong>TheMobileProf Learning Platform</strong></p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate text email content
 */
const generateEmailText = (emailData) => {
  // Password Reset Text Template
  if (emailData.template === 'password-reset') {
    return `
TheMobileProf - Password Reset Request

Hello ${emailData.context?.firstName || 'there'}!

We received a request to reset your password for your TheMobileProf account.

To reset your password, please click this link:
${emailData.context?.data?.resetUrl}

IMPORTANT SECURITY NOTICE:
- This link will expire in 1 hour for your security
- If you didn't request this password reset, please ignore this email
- Your password will remain unchanged if you don't click the link

If you have any questions, please contact our support team.

---
TheMobileProf Learning Platform
This email was sent because a password reset was requested for your account.
    `;
  }

  // Email Verification Text Template
  if (emailData.template === 'email-verification') {
    return `
TheMobileProf - Email Verification

Welcome to TheMobileProf, ${emailData.context?.firstName || 'there'}!

Thank you for joining our learning platform. To complete your registration and access all features, please verify your email address.

Click this link to verify your email:
${emailData.context?.data?.verifyUrl}

What happens next?
Once verified, you'll have full access to all courses, be able to track your progress, and receive important updates about your learning journey.

This verification link will expire in 24 hours.

---
TheMobileProf Learning Platform
Ready to start your mobile development journey? Verify your email to get started!
    `;
  }

  // Generic Notification Text Template
  if (emailData.template === 'notification') {
    return `
TheMobileProf Notification

${emailData.subject}

Hello ${emailData.context?.firstName || 'there'},

${emailData.context?.message || emailData.message}

${emailData.context?.data?.resetUrl ? `Action Required: ${emailData.context.data.resetUrl}` : ''}
${emailData.context?.data?.verifyUrl ? `Verify Email: ${emailData.context.data.verifyUrl}` : ''}

---
TheMobileProf Learning Platform
Empowering mobile developers worldwide
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
  verifyTransporter,
  generateEmailHTML,
  generateEmailText
}; 