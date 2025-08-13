const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testAPI() {
  try {
    console.log('🧪 Testing API endpoints...\n');

    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check passed:', healthResponse.data);
    console.log('');

    // Test login
    console.log('2. Testing login...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: process.env.LMS_EMAIL || 'admin@example.com',
      password: process.env.LMS_PASSWORD || 'password123'
    });
    console.log('✅ Login successful');
    const token = loginResponse.data.data.tokens.access;
    console.log('');

    // Test course creation with validation error
    console.log('3. Testing course creation with missing fields (should fail)...');
    try {
      await axios.post(`${BASE_URL}/api/admin/courses`, {
        title: 'Test Course'
        // Missing required fields
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Validation error caught correctly');
        console.log('Error details:', error.response.data);
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
    console.log('');

    // Test course creation with valid data
    console.log('4. Testing course creation with valid data...');
    const courseData = {
      title: 'Test Course',
      description: 'A test course for validation',
      topic: 'programming',
      type: 'online',
      price: 0,
      duration: '6 weeks',
      instructorId: '550e8400-e29b-41d4-a716-446655440000', // You'll need a real instructor ID
      certification: 'Test Certification'
    };

    try {
      const courseResponse = await axios.post(`${BASE_URL}/api/admin/courses`, courseData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Course created successfully:', courseResponse.data);
      
      const courseId = courseResponse.data.course.id;
      console.log('');

      // Test lesson creation
      console.log('5. Testing lesson creation...');
      const lessonData = {
        title: 'Test Lesson',
        description: 'A test lesson',
        content: '<p>This is test content</p>',
        durationMinutes: 30,
        status: 'published'
      };

      const lessonResponse = await axios.post(`${BASE_URL}/api/admin/courses/${courseId}/lessons`, lessonData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Lesson created successfully:', lessonResponse.data);

    } catch (error) {
      if (error.response) {
        console.log('❌ Error:', error.response.data);
      } else {
        console.log('❌ Error:', error.message);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testAPI(); 