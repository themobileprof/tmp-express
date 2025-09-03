#!/usr/bin/env node

/**
 * Email Configuration Test Script
 * Tests the API-based email connection and sends a test email
 */

require('dotenv').config();
const { sendEmail, verifyTransporter } = require('./src/mailer');

async function testEmailConfiguration() {
  console.log('🧪 Testing Email Configuration...\n');
  
  // Check configuration
  const provider = (process.env.EMAIL_PROVIDER || 'brevo').toLowerCase();
  const apiKey = provider === 'brevo' ? process.env.BREVO_API_KEY : process.env.MAILERSEND_API_KEY;
  const fromAddress = process.env.EMAIL_FROM_ADDRESS || 'info@themobileprof.com';
  
  console.log('📋 Current Configuration:');
  console.log(`   Provider: ${provider}`);
  console.log(`   From: ${fromAddress}`);
  console.log(`   API Key: ${apiKey ? `${apiKey.substring(0, 8)}...` : 'NOT SET'}`);
  console.log('');
  
  if (!apiKey) {
    console.error('❌ API Key not found!');
    console.error(`Please set ${provider === 'brevo' ? 'BREVO_API_KEY' : 'MAILERSEND_API_KEY'} in your .env file`);
    process.exit(1);
  }
  
  try {
    // Test 1: Verify API connection
    console.log('1️⃣ Testing email service connection...');
    await verifyTransporter();
    console.log('✅ Email service connection successful!\n');
    
    // Test 2: Send test email
    console.log('2️⃣ Sending test email...');
    
    const testEmailData = {
      to: process.env.TEST_EMAIL || 'test@example.com',
      subject: 'TheMobileProf - Email Configuration Test',
      template: 'notification',
      context: {
        firstName: 'Test User',
        message: `This is a test email to verify that your ${provider} email configuration is working correctly. If you receive this email, your API settings are properly configured!`,
        data: {
          testType: 'configuration',
          provider: provider,
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
    console.log(`   Provider: ${provider}`);
    if (provider === 'brevo') {
      console.log(`   Method: REST API (https://api.brevo.com/v3/smtp/email)`);
    } else {
      console.log(`   Method: SMTP (smtp.mailersend.net:587)`);
    }
    console.log(`   From: ${fromAddress}`);
    console.log(`   API Key: ${apiKey.substring(0, 8)}...`);
    
    console.log('\n💡 To switch providers, update your .env:');
    console.log('   For Brevo: EMAIL_PROVIDER=brevo + BREVO_API_KEY=your-key');
    console.log('   For MailerSend: EMAIL_PROVIDER=mailersend + MAILERSEND_API_KEY=your-key');
    
  } catch (error) {
    console.error('\n❌ Email configuration test failed!');
    console.error('Error:', error.message);
    
    if (error.code) {
      console.error('Error code:', error.code);
    }
    
    if (error.response) {
      console.error('SMTP response:', error.response);
    }
    
    console.log('\n🔧 Troubleshooting Tips:');
    console.log('1. Check your .env file has the correct API key');
    console.log(`2. Verify ${provider === 'brevo' ? 'BREVO_API_KEY' : 'MAILERSEND_API_KEY'} is set correctly`);
    console.log('3. Ensure EMAIL_FROM_ADDRESS is set');
    console.log('4. Check your API key has the correct permissions');
    console.log('5. Verify your sender domain is verified with the provider');
    console.log('6. Check your provider\'s rate limits and quotas');
    
    process.exit(1);
  }
}

// Run the test
testEmailConfiguration(); 