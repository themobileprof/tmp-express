const certificateGenerator = require('./src/utils/certificateGenerator');
const certificateService = require('./src/utils/certificateService');

/**
 * Test script for certificate data generation (client-side Canvas rendering)
 * Tests the new JSON-based certificate system
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

    console.log('📄 Generating course completion certificate data...');
    const certificate = certificateGenerator.generateCourseCertificate(testData);

    console.log('✅ Certificate data generated successfully!');
    console.log('🆔 Certificate ID:', certificate.id);
    console.log('📋 Certificate Type:', certificate.type);
    console.log('🔢 Verification Code:', certificate.data.verificationCode);
    console.log('📅 Issued At:', certificate.issuedAt);
    console.log('🔗 Verification URL:', certificate.verificationUrl);
    
    console.log('\n📄 Certificate Data Structure:');
    console.log(JSON.stringify(certificate, null, 2));
    
    // Validate certificate data structure
    console.log('\n✓ Validating certificate structure...');
    if (!certificate.id) throw new Error('Missing certificate ID');
    if (!certificate.type) throw new Error('Missing certificate type');
    if (!certificate.data) throw new Error('Missing certificate data');
    if (!certificate.data.userName) throw new Error('Missing user name');
    if (!certificate.data.courseTitle) throw new Error('Missing course title');
    if (!certificate.data.verificationCode) throw new Error('Missing verification code');
    if (!certificate.verificationUrl) throw new Error('Missing verification URL');
    console.log('✓ Certificate structure is valid!');

    // Test class certificate
    const classTestData = {
      userName: 'John Doe',
      classTitle: 'Mobile App Architecture Workshop',
      instructorName: 'Jane Smith',
      completionDate: new Date().toISOString(),
      verificationCode: 'CERT456DEF',
      issuer: 'TheMobileProf Learning Platform'
    };

    console.log('\n📄 Generating class attendance certificate data...');
    const classCertificate = certificateGenerator.generateClassCertificate(classTestData);

    console.log('✅ Class certificate data generated successfully!');
    console.log('🆔 Certificate ID:', classCertificate.id);
    console.log('📋 Certificate Type:', classCertificate.type);
    console.log('🔢 Verification Code:', classCertificate.data.verificationCode);
    console.log('📅 Issued At:', classCertificate.issuedAt);
    console.log('🔗 Verification URL:', classCertificate.verificationUrl);
    
    console.log('\n📄 Class Certificate Data Structure:');
    console.log(JSON.stringify(classCertificate, null, 2));
    
    // Validate class certificate data structure
    console.log('\n✓ Validating class certificate structure...');
    if (!classCertificate.id) throw new Error('Missing certificate ID');
    if (!classCertificate.type) throw new Error('Missing certificate type');
    if (!classCertificate.data) throw new Error('Missing certificate data');
    if (!classCertificate.data.userName) throw new Error('Missing user name');
    if (!classCertificate.data.classTitle && !classCertificate.data.courseTitle) throw new Error('Missing class/course title');
    console.log('✓ Class certificate structure is valid!');

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
  console.log('1. ✓ Certificate data generation working correctly');
  console.log('2. Test the /api/certifications/:id/view endpoint for client-side rendering');
  console.log('3. Test the API endpoints for certificate awarding');
  console.log('4. Verify email notifications link to certificate viewer');
  console.log('5. Test certificate verification endpoint');
  console.log('6. Verify Canvas rendering in the browser certificate viewer');
  console.log('\n💡 Certificate system now uses client-side HTML5 Canvas rendering!');
  console.log('   No PDF files are generated - all rendering happens in the browser.');
}

if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testCertificateGeneration, testCertificateService };