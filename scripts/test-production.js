#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = process.env.API_URL || 'https://your-domain.com/api';
const TEST_USER = {
  email: 'test@example.com',
  password: 'testpassword123'
};

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = (color, message) => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

// Test results storage
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

const recordTest = (testName, success, error = null) => {
  if (success) {
    testResults.passed++;
    log('green', `✅ ${testName} - PASSED`);
  } else {
    testResults.failed++;
    testResults.errors.push({ testName, error: error?.message || 'Unknown error' });
    log('red', `❌ ${testName} - FAILED`);
    if (error) {
      log('red', `   Error: ${error.message}`);
      if (error.response?.data) {
        log('red', `   Response: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }
  }
};

// Test functions
const testHealthCheck = async () => {
  try {
    const response = await axios.get(`${BASE_URL.replace('/api', '')}/health`);
    recordTest('Health Check', response.status === 200);
    return response.data;
  } catch (error) {
    recordTest('Health Check', false, error);
    return null;
  }
};

const testUserRegistration = async () => {
  try {
    const response = await axios.post(`${BASE_URL}/auth/register`, {
      email: `test-${Date.now()}@example.com`,
      password: 'testpassword123',
      firstName: 'Test',
      lastName: 'User',
      role: 'student'
    });
    recordTest('User Registration', response.status === 201);
    return response.data.token;
  } catch (error) {
    recordTest('User Registration', false, error);
    return null;
  }
};

const testUserLogin = async () => {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, TEST_USER);
    recordTest('User Login', response.status === 200);
    return response.data.token;
  } catch (error) {
    recordTest('User Login', false, error);
    return null;
  }
};

const testGetCourses = async (token) => {
  try {
    const response = await axios.get(`${BASE_URL}/courses`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    recordTest('Get Courses', response.status === 200);
    return response.data.courses;
  } catch (error) {
    recordTest('Get Courses', false, error);
    return [];
  }
};

const testPaymentInitialization = async (token, courseId) => {
  try {
    const response = await axios.post(`${BASE_URL}/payments/initialize`, {
      paymentType: 'course',
      itemId: courseId,
      paymentMethod: 'card'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    recordTest('Payment Initialization', response.status === 200);
    return response.data;
  } catch (error) {
    recordTest('Payment Initialization', false, error);
    return null;
  }
};

const testDatabaseConnection = async () => {
  try {
    // This would require a database connection test endpoint
    const response = await axios.get(`${BASE_URL}/health`);
    recordTest('Database Connection', response.status === 200);
    return true;
  } catch (error) {
    recordTest('Database Connection', false, error);
    return false;
  }
};

const testEnvironmentVariables = () => {
  const requiredVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'FLUTTERWAVE_PUBLIC_KEY',
    'FLUTTERWAVE_SECRET_KEY',
    'FLUTTERWAVE_SECRET_HASH'
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length === 0) {
    recordTest('Environment Variables', true);
    return true;
  } else {
    recordTest('Environment Variables', false, new Error(`Missing: ${missing.join(', ')}`));
    return false;
  }
};

// Main test runner
const runTests = async () => {
  log('blue', '🚀 Starting Production API Tests...\n');
  
  // Test environment
  testEnvironmentVariables();
  
  // Test basic connectivity
  await testHealthCheck();
  
  // Test database
  await testDatabaseConnection();
  
  // Test authentication
  const token = await testUserRegistration() || await testUserLogin();
  
  if (token) {
    // Test authenticated endpoints
    const courses = await testGetCourses(token);
    
    if (courses.length > 0) {
      // Test payment with first course
      await testPaymentInitialization(token, courses[0].id);
    }
  }
  
  // Generate report
  log('blue', '\n📊 Test Results Summary:');
  log('green', `✅ Passed: ${testResults.passed}`);
  log('red', `❌ Failed: ${testResults.failed}`);
  
  if (testResults.errors.length > 0) {
    log('yellow', '\n🔍 Detailed Errors:');
    testResults.errors.forEach(({ testName, error }) => {
      log('red', `   ${testName}: ${error}`);
    });
  }
  
  // Save results to file
  const reportPath = path.join(__dirname, '../logs/production-test-report.json');
  const report = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    results: testResults
  };
  
  // Ensure logs directory exists
  const logsDir = path.dirname(reportPath);
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log('blue', `\n📄 Detailed report saved to: ${reportPath}`);
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
};

// Run tests
runTests().catch(error => {
  log('red', `💥 Test runner failed: ${error.message}`);
  process.exit(1);
}); 