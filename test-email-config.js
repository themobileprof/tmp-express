#!/usr/bin/env node

/**
 * Email Configuration Test Script
 * Tests the SMTP connection and sends a test email
 */

require('dotenv').config();
const { sendEmail, verifyTransporter } = require('./src/mailer');

async function testEmailConfiguration() {
  console.log('🧪 Testing Email Configuration...\n');
  
  try {
    // Test 1: Verify SMTP connection
    console.log('1️⃣ Testing SMTP connection...');
    await verifyTransporter();
    console.log('✅ SMTP connection successful!\n');
    
    // Test 2: Send test email
    console.log('2️⃣ Sending test email...');
    
    const testEmailData = {
      to: process.env.TEST_EMAIL || 'test@example.com',
      subject: 'TheMobileProf - Email Configuration Test',
      template: 'notification',
      context: {
        firstName: 'Test User',
        message: 'This is a test email to verify that your email configuration is working correctly. If you receive this email, your SMTP settings are properly configured!',
        data: {
          testType: 'configuration',
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'development'
        }
      }
    };
    
    const result = await sendEmail(testEmailData);
    
    console.log('✅ Test email sent successfully!');
    console.log(`📧 Message ID: ${result.messageId}`);
    console.log(`⏱️  Duration: ${result.duration}ms`);
    console.log(`👤 Recipient: ${result.recipient}`);
    
    console.log('\n🎉 Email configuration is working perfectly!');
    console.log('\n📋 Configuration Summary:');
    console.log(`   Host: ${process.env.EMAIL_HOST || 'smtp.mailersend.net'}`);
    console.log(`   Port: ${process.env.EMAIL_PORT || 587}`);
    console.log(`   From: ${process.env.EMAIL_FROM_ADDRESS || 'info@themobileprof.com'}`);
    console.log(`   User: ${process.env.EMAIL_USER}`);
    
  } catch (error) {
    console.error('\n❌ Email configuration test failed!');
    console.error('Error:', error.message);
    
    if (error.code) {
      console.error('Error code:', error.code);
    }
    
    console.log('\n🔧 Troubleshooting Tips:');
    console.log('1. Check your .env file has all required email variables');
    console.log('2. Verify EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS');
    console.log('3. Ensure EMAIL_FROM_ADDRESS is set');
    console.log('4. Check your SMTP credentials are correct');
    console.log('5. Verify your email service allows SMTP access');
    
    process.exit(1);
  }
}

// Run the test
testEmailConfiguration(); 