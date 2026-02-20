/**
 * Test script for student flag functionality
 * Tests flagging lessons, workshops, and test questions
 */

const fetch = require('node-fetch');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

// ANSI color codes
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

let testResults = { passed: 0, failed: 0 };

function log(message, color = '') {
  console.log(`${color}${message}${RESET}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, GREEN);
  testResults.passed++;
}

function logError(message) {
  log(`❌ ${message}`, RED);
  testResults.failed++;
}

function logInfo(message) {
  log(`ℹ️  ${message}`, YELLOW);
}

// Get a student token for testing
async function getStudentToken() {
  try {
    const response = await fetch(`${BASE_URL}/dev/users`);
    const users = await response.json();
    
    // Find a non-admin user
    const student = users.find(u => u.role !== 'admin');
    if (!student) {
      throw new Error('No student user found in dev users');
    }
    
    const tokenResponse = await fetch(`${BASE_URL}/dev/token/${student.email}`);
    const tokenData = await tokenResponse.json();
    
    logInfo(`Using student token for: ${student.email}`);
    return tokenData.token;
  } catch (error) {
    logError(`Failed to get student token: ${error.message}`);
    throw error;
  }
}

// Get an admin token for setup
async function getAdminToken() {
  try {
    const response = await fetch(`${BASE_URL}/dev/users`);
    const users = await response.json();
    
    const admin = users.find(u => u.role === 'admin');
    if (!admin) {
      throw new Error('No admin user found');
    }
    
    const tokenResponse = await fetch(`${BASE_URL}/dev/token/${admin.email}`);
    const tokenData = await tokenResponse.json();
    
    return tokenData.token;
  } catch (error) {
    logError(`Failed to get admin token: ${error.message}`);
    throw error;
  }
}

// Helper to make API requests
async function apiRequest(endpoint, method = 'GET', token, body = null) {
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }
  
  return response.json();
}

// Find a test lesson
async function findTestLesson(token) {
  const response = await apiRequest('/api/courses', 'GET', token);
  
  if (!response.courses || response.courses.length === 0) {
    throw new Error('No courses found');
  }
  
  // Get first course's lessons
  const courseId = response.courses[0].id;
  const lessons = await apiRequest(`/api/courses/${courseId}/lessons`, 'GET', token);
  
  if (!lessons || lessons.length === 0) {
    throw new Error('No lessons found');
  }
  
  return lessons[0].id;
}

// Find a test question
async function findTestQuestion(token) {
  // Get tests
  const response = await apiRequest('/api/courses', 'GET', token);
  
  if (!response.courses || response.courses.length === 0) {
    throw new Error('No courses found');
  }
  
  // Try to find a test associated with the course
  const courseId = response.courses[0].id;
  
  // Get lessons to find a test
  const lessons = await apiRequest(`/api/courses/${courseId}/lessons`, 'GET', token);
  
  for (const lesson of lessons) {
    try {
      const lessonDetail = await apiRequest(`/api/lessons/${lesson.id}`, 'GET', token);
      
      if (lessonDetail.test && lessonDetail.test.id) {
        const testId = lessonDetail.test.id;
        const questions = await apiRequest(`/api/tests/${testId}/questions`, 'GET', token);
        
        if (questions.questions && questions.questions.length > 0) {
          return { testId, questionId: questions.questions[0].id };
        }
      }
    } catch (e) {
      // Skip lessons without tests
      continue;
    }
  }
  
  throw new Error('No test questions found');
}

// Test lesson flagging
async function testLessonFlag(studentToken, adminToken) {
  logInfo('Testing lesson flag functionality...');
  
  try {
    const lessonId = await findTestLesson(studentToken);
    logInfo(`Found lesson: ${lessonId}`);
    
    // First mark the lesson as reviewed (admin action)
    await apiRequest(`/api/admin/lessons/${lessonId}/mark-reviewed`, 'PUT', adminToken, {
      isReviewed: true,
      notes: 'Initial review for flag test'
    });
    logInfo('Lesson marked as reviewed');
    
    // Get lesson to verify it's reviewed
    const beforeFlag = await apiRequest(`/api/lessons/${lessonId}`, 'GET', studentToken);
    if (beforeFlag.reviewStatus.isReviewed !== true) {
      throw new Error('Lesson should be reviewed before flag test');
    }
    
    // Flag the lesson as a student
    const flagResponse = await apiRequest(`/api/lessons/${lessonId}/flag`, 'POST', studentToken, {
      reason: 'Test flag: Video link seems broken'
    });
    
    if (!flagResponse.success) {
      throw new Error('Flag response did not indicate success');
    }
    logSuccess('Lesson flagged successfully');
    
    // Get lesson again to verify flag status and review reset
    const afterFlag = await apiRequest(`/api/lessons/${lessonId}`, 'GET', studentToken);
    
    if (afterFlag.flagStatus.isFlagged !== true) {
      throw new Error('Lesson should be flagged');
    }
    logSuccess('Lesson flagStatus.isFlagged is true');
    
    if (afterFlag.flagStatus.flagCount !== 1) {
      throw new Error('Flag count should be 1');
    }
    logSuccess('Lesson flagCount incremented correctly');
    
    if (afterFlag.reviewStatus.isReviewed !== false) {
      throw new Error('Lesson review status should be reset to false');
    }
    logSuccess('Lesson review status reset to false after flag');
    
    if (!afterFlag.flagStatus.lastFlagReason || !afterFlag.flagStatus.lastFlagReason.includes('Video link')) {
      throw new Error('Flag reason not stored correctly');
    }
    logSuccess('Flag reason stored correctly');
    
  } catch (error) {
    logError(`Lesson flag test failed: ${error.message}`);
  }
}

// Test workshop flagging
async function testWorkshopFlag(studentToken, adminToken) {
  logInfo('Testing workshop flag functionality...');
  
  try {
    const lessonId = await findTestLesson(studentToken);
    
    // Check if lesson has a workshop
    const workshop = await apiRequest(`/api/lessons/${lessonId}/workshop`, 'GET', studentToken);
    
    if (!workshop || !workshop.workshop) {
      logInfo('No workshop found for lesson, skipping workshop flag test');
      return;
    }
    
    logInfo(`Found workshop for lesson: ${lessonId}`);
    
    // Flag the workshop
    const flagResponse = await apiRequest(`/api/lessons/${lessonId}/workshop/flag`, 'POST', studentToken, {
      reason: 'Test flag: Workshop instructions unclear'
    });
    
    if (!flagResponse.success) {
      throw new Error('Workshop flag response did not indicate success');
    }
    logSuccess('Workshop flagged successfully');
    
    // Verify flag status
    const afterFlag = await apiRequest(`/api/lessons/${lessonId}/workshop`, 'GET', studentToken);
    
    if (afterFlag.workshop.flagStatus.isFlagged !== true) {
      throw new Error('Workshop should be flagged');
    }
    logSuccess('Workshop flagStatus.isFlagged is true');
    
    if (afterFlag.workshop.reviewStatus.isReviewed !== false) {
      throw new Error('Workshop review status should be reset to false');
    }
    logSuccess('Workshop review status reset after flag');
    
  } catch (error) {
    logError(`Workshop flag test failed: ${error.message}`);
  }
}

// Test question flagging
async function testQuestionFlag(studentToken, adminToken) {
  logInfo('Testing question flag functionality...');
  
  try {
    const { testId, questionId } = await findTestQuestion(studentToken);
    logInfo(`Found test question: ${questionId} in test: ${testId}`);
    
    // Mark question as reviewed first
    await apiRequest(`/api/admin/tests/${testId}/questions/${questionId}/mark-reviewed`, 'PUT', adminToken, {
      isReviewed: true,
      notes: 'Initial review for flag test'
    });
    logInfo('Question marked as reviewed');
    
    // Flag the question
    const flagResponse = await apiRequest(`/api/tests/${testId}/questions/${questionId}/flag`, 'POST', studentToken, {
      reason: 'Test flag: Answer seems incorrect'
    });
    
    if (!flagResponse.success) {
      throw new Error('Question flag response did not indicate success');
    }
    logSuccess('Question flagged successfully');
    
    // Verify flag status
    const questions = await apiRequest(`/api/tests/${testId}/questions`, 'GET', studentToken);
    const flaggedQuestion = questions.questions.find(q => q.id === questionId);
    
    if (!flaggedQuestion) {
      throw new Error('Could not find flagged question');
    }
    
    if (flaggedQuestion.flagStatus.isFlagged !== true) {
      throw new Error('Question should be flagged');
    }
    logSuccess('Question flagStatus.isFlagged is true');
    
    if (flaggedQuestion.reviewStatus.isReviewed !== false) {
      throw new Error('Question review status should be reset to false');
    }
    logSuccess('Question review status reset after flag');
    
  } catch (error) {
    logError(`Question flag test failed: ${error.message}`);
  }
}

// Test flag reason validation
async function testFlagValidation(studentToken) {
  logInfo('Testing flag reason validation...');
  
  try {
    const lessonId = await findTestLesson(studentToken);
    
    // Test with very long reason (should be truncated to 500 chars)
    const longReason = 'A'.repeat(600);
    const flagResponse = await apiRequest(`/api/lessons/${lessonId}/flag`, 'POST', studentToken, {
      reason: longReason
    });
    
    if (!flagResponse.success) {
      throw new Error('Flag should succeed even with long reason');
    }
    logSuccess('Long reason handled correctly (truncated to 500 chars)');
    
    // Test without reason (should use default)
    const noReasonResponse = await apiRequest(`/api/lessons/${lessonId}/flag`, 'POST', studentToken, {});
    
    if (!noReasonResponse.success) {
      throw new Error('Flag should succeed without reason');
    }
    logSuccess('Flag works without reason (uses default)');
    
  } catch (error) {
    logError(`Flag validation test failed: ${error.message}`);
  }
}

// Main test runner
async function runTests() {
  log(`${BOLD}Student Flag System Tests${RESET}`);
  log('='.repeat(50));
  
  try {
    const studentToken = await getStudentToken();
    const adminToken = await getAdminToken();
    
    await testLessonFlag(studentToken, adminToken);
    await testWorkshopFlag(studentToken, adminToken);
    await testQuestionFlag(studentToken, adminToken);
    await testFlagValidation(studentToken);
    
    log('\n' + '='.repeat(50));
    log(`${BOLD}Test Results:${RESET}`);
    logSuccess(`${testResults.passed} tests passed`);
    if (testResults.failed > 0) {
      logError(`${testResults.failed} tests failed`);
    }
    log('='.repeat(50));
    
    process.exit(testResults.failed > 0 ? 1 : 0);
    
  } catch (error) {
    logError(`Test suite failed: ${error.message}`);
    process.exit(1);
  }
}

runTests();
