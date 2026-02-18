const certificateGenerator = require('./src/utils/certificateGenerator');
const certificateService = require('./src/utils/certificateService');

/**
 * Test script for certificate PDF generation using Puppeteer + HTML templates
 * Tests the new PDF-based certificate system
 * Run with: node test-certificates.js
 */

async function testCertificateGeneration() {
  console.log('🧪 Testing Certificate Generation...\n');

  try {
    // Test data
    const testData = {
      userName: 'John Doe',
      courseTitle: 'Advanced React Development',
      instructorName: 'Jane Smith',
      completionDate: new Date().toISOString(),
      verificationCode: 'CERT123ABC',
      issuer: 'TheMobileProf Learning Platform'
    };

    console.log('📄 Generating course completion certificate PDF...');
    const certificate = await certificateGenerator.generateCourseCertificate(testData);

    console.log('✅ Certificate PDF generated successfully!');
    console.log('📁 File Path:', certificate.filePath);
    console.log('🔗 Certificate URL:', certificate.certificateUrl);
    console.log('🔢 Verification Code:', certificate.verificationCode);
    console.log('📏 File Size:', certificate.fileSize, 'bytes');
    console.log('📄 File Name:', certificate.fileName);
    
    // Validate certificate file exists
    const fs = require('fs');
    if (fs.existsSync(certificate.filePath)) {
      console.log('✓ Certificate file exists on disk\n');
    } else {
      throw new Error('Certificate file was not created!');
    }

    // Test class certificate
    const classTestData = {
      userName: 'John Doe',
      classTitle: 'Mobile App Architecture Workshop',
      instructorName: 'Jane Smith',
      completionDate: new Date().toISOString(),
      verificationCode: 'CERT456DEF',
      issuer: 'TheMobileProf Learning Platform'
    };

    console.log('\n📄 Generating class attendance certificate PDF...');
    const classCertificate = await certificateGenerator.generateClassCertificate(classTestData);

    console.log('✅ Class certificate PDF generated successfully!');
    console.log('📁 File Path:', classCertificate.filePath);
    console.log('🔗 Certificate URL:', classCertificate.certificateUrl);
    console.log('🔢 Verification Code:', classCertificate.verificationCode);
    console.log('📏 File Size:', classCertificate.fileSize, 'bytes');
    console.log('📄 File Name:', classCertificate.fileName);
    
    // Validate certificate file exists
    if (fs.existsSync(classCertificate.filePath)) {
      console.log('✓ Certificate file exists on disk\n');
    } else {
      throw new Error('Class certificate file was not created!');
    }

    console.log('🎉 All certificate generation tests passed!');

  } catch (error) {
    console.error('❌ Certificate generation test failed:', error);
    process.exit(1);
  }
}

async function testCertificateService() {
  console.log('\n🧪 Testing Certificate Service...\n');

  try {
    // Test verification code generation
    console.log('🔢 Testing verification code generation...');
    const code1 = await certificateService.generateVerificationCode();
    const code2 = await certificateService.generateVerificationCode();

    console.log('✅ Code 1:', code1);
    console.log('✅ Code 2:', code2);
    console.log('✅ Codes are unique:', code1 !== code2);

    // Test statistics
    console.log('\n📊 Testing certificate statistics...');
    const stats = await certificateService.getCertificateStats();
    console.log('✅ Certificate stats:', stats);

    console.log('\n🎉 Certificate service tests passed!');

  } catch (error) {
    console.error('❌ Certificate service test failed:', error);
    process.exit(1);
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting Certificate System Tests\n');

  await testCertificateGeneration();
  await testCertificateService();

  console.log('\n🎊 All tests completed successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. ✓ Certificate PDF generation working correctly with Puppeteer');
  console.log('2. Check the uploads/certificates/ directory for generated PDFs');
  console.log('3. Test the API endpoints for certificate awarding');
  console.log('4. Verify email notifications include PDF download links');
  console.log('5. Test certificate verification endpoint');
  console.log('6. Customize HTML templates in src/templates/certificates/');
  console.log('\n💡 Certificate system now uses Puppeteer + HTML templates!');
  console.log('   Professional PDF certificates generated server-side.');
  console.log('   Easy to customize - just edit HTML/CSS templates!');
}

if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testCertificateGeneration, testCertificateService };