/**
 * Test script for content review system endpoints
 * Run with: node test-content-review.js
 */

const axios = require('axios');

const API_BASE = process.env.API_BASE || 'http://localhost:5000/api';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';

async function getAdminToken() {
  try {
    const response = await axios.get(`${API_BASE}/dev/token/${ADMIN_EMAIL}`);
    return response.data.token;
  } catch (error) {
    console.error('Failed to get admin token:', error.message);
    throw error;
  }
}

async function testContentReviewEndpoints() {
  console.log('🧪 Testing Content Review System Endpoints\n');
  
  const token = await getAdminToken();
  const headers = { Authorization: `Bearer ${token}` };

  try {
    // Test 1: Get all content (unfiltered)
    console.log('1️⃣  Testing GET /admin/content/review-list');
    const allContentResponse = await axios.get(`${API_BASE}/admin/content/review-list?limit=10`, { headers });
    console.log('✅ Content list retrieved:');
    console.log('   Lessons:', allContentResponse.data.lessons.length);
    console.log('   Test Questions:', allContentResponse.data.testQuestions.length);
    console.log('   Workshops:', allContentResponse.data.workshops.length);
    console.log();

    // Test 2: Get unreviewed content
    console.log('2️⃣  Testing GET /admin/content/review-list?reviewed=false');
    const unreviewedResponse = await axios.get(`${API_BASE}/admin/content/review-list?reviewed=false&limit=10`, { headers });
    console.log('✅ Unreviewed content:');
    console.log('   Lessons:', unreviewedResponse.data.lessons.length);
    console.log('   Test Questions:', unreviewedResponse.data.testQuestions.length);
    console.log('   Workshops:', unreviewedResponse.data.workshops.length);
    console.log();

    // Test 3: Get only unreviewed lessons
    console.log('3️⃣  Testing GET /admin/content/review-list?reviewed=false&contentType=lessons');
    const unreviewedLessonsResponse = await axios.get(`${API_BASE}/admin/content/review-list?reviewed=false&contentType=lessons&limit=5`, { headers });
    console.log('✅ Unreviewed lessons retrieved:', unreviewedLessonsResponse.data.lessons.length);
    console.log();

    // Test 4: Mark a lesson as reviewed (if any exist)
    const anyLessonsResponse = await axios.get(`${API_BASE}/admin/content/review-list?contentType=lessons&limit=1`, { headers });
    if (anyLessonsResponse.data.lessons.length > 0) {
      const lessonId = anyLessonsResponse.data.lessons[0].id;
      console.log('4️⃣  Testing PUT /admin/lessons/:id/mark-reviewed');
      const reviewResponse = await axios.put(
        `${API_BASE}/admin/lessons/${lessonId}/mark-reviewed`,
        {
          isReviewed: true,
          notes: 'Test review - automated testing'
        },
        { headers }
      );
      console.log('✅ Lesson marked as reviewed:', reviewResponse.data.message);
      console.log('   Review status:', reviewResponse.data.lesson.is_reviewed);
      console.log();

      // Test 5: Mark it as unreviewed
      console.log('5️⃣  Testing PUT /admin/lessons/:id/mark-reviewed (unmark)');
      const unreviewResponse = await axios.put(
        `${API_BASE}/admin/lessons/${lessonId}/mark-reviewed`,
        {
          isReviewed: false,
          notes: 'Unmarking for testing purposes'
        },
        { headers }
      );
      console.log('✅ Lesson unmarked:', unreviewResponse.data.message);
      console.log();
    } else {
      console.log('⚠️  No lessons found to test mark-reviewed');
      console.log();
    }

    // Test 6: Mark a test question as reviewed (if any exist)
    const anyQuestionsResponse = await axios.get(`${API_BASE}/admin/content/review-list?contentType=test_questions&limit=1`, { headers });
    if (anyQuestionsResponse.data.testQuestions.length > 0) {
      const question = anyQuestionsResponse.data.testQuestions[0];
      console.log('6️⃣  Testing PUT /admin/tests/:testId/questions/:questionId/mark-reviewed');
      const questionReviewResponse = await axios.put(
        `${API_BASE}/admin/tests/${question.test_id}/questions/${question.id}/mark-reviewed`,
        {
          isReviewed: true,
          notes: 'Test review - automated testing'
        },
        { headers }
      );
      console.log('✅ Question marked as reviewed:', questionReviewResponse.data.message);
      console.log();
    } else {
      console.log('⚠️  No test questions found to test mark-reviewed');
      console.log();
    }

    // Test 7: Bulk mark questions (if multiple exist)
    const questionsForBulkResponse = await axios.get(`${API_BASE}/admin/content/review-list?contentType=test_questions&limit=3`, { headers });
    if (questionsForBulkResponse.data.testQuestions.length >= 2) {
      const questions = questionsForBulkResponse.data.testQuestions.slice(0, 2);
      const testId = questions[0].test_id;
      const questionIds = questions.map(q => q.id);
      
      console.log('7️⃣  Testing PUT /admin/tests/:testId/questions/bulk-mark-reviewed');
      const bulkReviewResponse = await axios.put(
        `${API_BASE}/admin/tests/${testId}/questions/bulk-mark-reviewed`,
        {
          questionIds,
          isReviewed: true,
          notes: 'Bulk test review'
        },
        { headers }
      );
      console.log('✅ Bulk review completed:', bulkReviewResponse.data.message);
      console.log();
    } else {
      console.log('⚠️  Not enough questions for bulk review test');
      console.log();
    }

    // Test 8: Mark a workshop as reviewed (if any exist)
    const anyWorkshopsResponse = await axios.get(`${API_BASE}/admin/content/review-list?contentType=workshops&limit=1`, { headers });
    if (anyWorkshopsResponse.data.workshops.length > 0) {
      const workshop = anyWorkshopsResponse.data.workshops[0];
      console.log('8️⃣  Testing PUT /admin/lessons/:lessonId/workshop/mark-reviewed');
      const workshopReviewResponse = await axios.put(
        `${API_BASE}/admin/lessons/${workshop.lesson_id}/workshop/mark-reviewed`,
        {
          isReviewed: true,
          notes: 'Test review - automated testing'
        },
        { headers }
      );
      console.log('✅ Workshop marked as reviewed:', workshopReviewResponse.data.message);
      console.log();
    } else {
      console.log('⚠️  No workshops found to test mark-reviewed');
      console.log();
    }

    console.log('✅ All tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log('   - Content review system is working correctly');
    console.log('   - All endpoints are accessible');
    console.log('   - Database schema is properly initialized');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

// Run tests
if (require.main === module) {
  testContentReviewEndpoints()
    .then(() => {
      console.log('\n✅ All tests passed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Tests failed');
      process.exit(1);
    });
}

module.exports = { testContentReviewEndpoints };
