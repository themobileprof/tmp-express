const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const TEST_TOKEN = process.env.TEST_TOKEN || 'your-test-token-here';

// Create a test image file
const createTestImage = () => {
  const testImagePath = path.join(__dirname, 'test-image.png');
  
  // Create a simple 1x1 PNG image (minimal valid PNG)
  const pngData = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, 0x01, // width: 1
    0x00, 0x00, 0x00, 0x01, // height: 1
    0x08, 0x02, 0x00, 0x00, 0x00, // bit depth, color type, compression, filter, interlace
    0x90, 0x77, 0x53, 0xDE, // CRC
    0x00, 0x00, 0x00, 0x0C, // IDAT chunk length
    0x49, 0x44, 0x41, 0x54, // IDAT
    0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // compressed data
    0xE2, 0x21, 0xBC, 0x33, // CRC
    0x00, 0x00, 0x00, 0x00, // IEND chunk length
    0x49, 0x45, 0x4E, 0x44, // IEND
    0xAE, 0x42, 0x60, 0x82  // CRC
  ]);
  
  fs.writeFileSync(testImagePath, pngData);
  return testImagePath;
};

const testUpload = async (endpoint, fieldName, filePath, description) => {
  try {
    console.log(`\n🧪 Testing ${description}...`);
    
    const form = new FormData();
    form.append(fieldName, fs.createReadStream(filePath));
    
    const response = await axios.post(`${BASE_URL}${endpoint}`, form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    });
    
    console.log(`✅ ${description} - Success!`);
    console.log(`   Response:`, JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.log(`❌ ${description} - Failed!`);
    console.log(`   Error:`, error.response?.data || error.message);
    return null;
  }
};

const testDelete = async (filename, type, description) => {
  try {
    console.log(`\n🧪 Testing ${description}...`);
    
    const response = await axios.delete(`${BASE_URL}/api/upload/${filename}?type=${type}`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    });
    
    console.log(`✅ ${description} - Success!`);
    console.log(`   Response:`, JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.log(`❌ ${description} - Failed!`);
    console.log(`   Error:`, error.response?.data || error.message);
    return null;
  }
};

const testListFiles = async (description) => {
  try {
    console.log(`\n🧪 Testing ${description}...`);
    
    const response = await axios.get(`${BASE_URL}/api/upload/files`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    });
    
    console.log(`✅ ${description} - Success!`);
    console.log(`   Response:`, JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.log(`❌ ${description} - Failed!`);
    console.log(`   Error:`, error.response?.data || error.message);
    return null;
  }
};

const main = async () => {
  console.log('🚀 Starting Upload Endpoint Tests...');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`🔑 Using token: ${TEST_TOKEN.substring(0, 20)}...`);
  
  // Create test image
  const testImagePath = createTestImage();
  console.log(`📁 Created test image: ${testImagePath}`);
  
  try {
    // Test upload endpoints
    const uploadResults = [];
    
    uploadResults.push(await testUpload('/api/upload', 'file', testImagePath, 'Screenshot/Image Upload'));
    uploadResults.push(await testUpload('/uploads/course-image', 'image', testImagePath, 'Course Image Upload'));
    uploadResults.push(await testUpload('/uploads/avatar', 'avatar', testImagePath, 'User Avatar Upload'));
    uploadResults.push(await testUpload('/uploads/certificate', 'certificate', testImagePath, 'Certificate Upload'));
    
    // Test file listing (admin only)
    await testListFiles('List Uploaded Files (Admin Only)');
    
    // Test file deletion (if uploads were successful)
    const successfulUploads = uploadResults.filter(result => result !== null);
    if (successfulUploads.length > 0) {
      const firstUpload = successfulUploads[0];
      if (firstUpload.data && firstUpload.data.filename) {
        await testDelete(firstUpload.data.filename, 'screenshots', 'Delete Uploaded File');
      }
    }
    
    console.log('\n📊 Test Summary:');
    console.log(`   Total upload tests: ${uploadResults.length}`);
    console.log(`   Successful uploads: ${uploadResults.filter(r => r !== null).length}`);
    console.log(`   Failed uploads: ${uploadResults.filter(r => r === null).length}`);
    
  } catch (error) {
    console.error('💥 Test execution failed:', error.message);
  } finally {
    // Clean up test file
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
      console.log(`🗑️  Cleaned up test image: ${testImagePath}`);
    }
  }
};

// Run tests if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testUpload, testDelete, testListFiles }; 