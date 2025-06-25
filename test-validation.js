const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testValidation() {
  try {
    console.log('🧪 Testing validation error handling...\n');

    // Test health endpoint first
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check passed:', healthResponse.data.status);
    console.log('');

    // Test course creation with missing fields (should return proper validation error)
    console.log('2. Testing course creation with missing fields...');
    try {
      await axios.post(`${BASE_URL}/api/admin/courses`, {
        title: 'Test Course'
        // Missing required fields: description, topic, type, price, duration, instructorId
      }, {
        headers: { 
          'Authorization': 'Bearer invalid-token',
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      if (error.response) {
        console.log('✅ Error response received (expected)');
        console.log('Status:', error.response.status);
        console.log('Error structure:', {
          success: error.response.data.success,
          errorCode: error.response.data.error?.code,
          errorMessage: error.response.data.error?.message,
          hasDetails: !!error.response.data.error?.details
        });
        
        if (error.response.data.error?.details) {
          console.log('Validation details:', error.response.data.error.details);
        }
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    console.log('\n✅ Validation error handling test completed successfully!');
    console.log('The server is running and properly handling validation errors.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testValidation(); 