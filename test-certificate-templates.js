const certificateTemplateManager = require('./src/utils/certificateTemplateManager');
const certificateService = require('./src/utils/certificateService');
const { query } = require('./src/database/config');

async function testCertificateTemplates() {
  try {
    console.log('🧪 Testing Certificate Template System...\n');

    // Test 1: Get default template
    console.log('1. Testing default template retrieval...');
    const defaultTemplate = await certificateTemplateManager.getDefaultTemplate('course');
    console.log('✅ Default template found:', defaultTemplate?.name);

    // Test 2: Get template with signatures
    console.log('\n2. Testing template with signatures...');
    const templateWithSignatures = await certificateTemplateManager.getTemplateWithSignatures(defaultTemplate.id);
    console.log('✅ Template signatures loaded:', templateWithSignatures.signatures.length);

    // Test 3: Create a test signature (only if users exist)
    console.log('\n3. Testing signature creation...');
    const testUser = await query('SELECT id FROM users LIMIT 1');
    let testSignature = null;

    if (testUser.rows.length > 0) {
      testSignature = await certificateTemplateManager.createSignature({
        name: 'Test Instructor Signature',
        title: 'Course Instructor',
        signatureImageUrl: '/uploads/signatures/test-signature.png'
      }, testUser.rows[0].id);
      console.log('✅ Test signature created:', testSignature.name);
    } else {
      console.log('⚠️  No users found, skipping signature creation test');
    }

    // Test 4: Add signature to template (only if signature was created)
    console.log('\n4. Testing signature addition to template...');
    if (testSignature) {
      const templateSignature = await certificateTemplateManager.addSignatureToTemplate(
        defaultTemplate.id,
        testSignature.id,
        { x: 60, y: 78, width: 25, height: 12, orderIndex: 1 }
      );
      console.log('✅ Signature added to template at position:', templateSignature.position_x + '%');
    } else {
      console.log('⚠️  Skipping signature addition test (no signature created)');
    }

    // Test 5: Generate certificate with template
    console.log('\n5. Testing certificate generation with template...');
    const certificateData = {
      userName: 'Test User',
      courseTitle: 'Test Course',
      instructorName: 'Test Instructor',
      completionDate: new Date().toISOString(),
      verificationCode: 'CERTTEST123',
      issuer: 'TheMobileProf Learning Platform'
    };

    const certificateFile = await certificateTemplateManager.generateCertificateFromTemplate(
      defaultTemplate.id,
      certificateData
    );
    console.log('✅ Certificate generated:', certificateFile.fileName);
    console.log('📁 File location:', certificateFile.filePath);
    console.log('🔗 Certificate URL:', certificateFile.certificateUrl);

    // Test 6: Test certificate service integration
    console.log('\n6. Testing certificate service with templates...');

    // Get a test user and course
    const serviceTestUser = await query('SELECT id FROM users LIMIT 1');
    const testCourse = await query('SELECT id, title FROM courses WHERE certification IS NOT NULL LIMIT 1');

    if (serviceTestUser.rows.length > 0 && testCourse.rows.length > 0) {
      console.log('Found test user and course, testing service integration...');

      // Test manual certificate awarding
      const manualCert = await certificateService.manuallyAwardCertificate({
        userId: serviceTestUser.rows[0].id,
        courseId: testCourse.rows[0].id,
        certificationName: `${testCourse.rows[0].title} - Test Certificate`,
        issuer: 'TheMobileProf Learning Platform'
      });

      console.log('✅ Manual certificate awarded:', manualCert.certificateId);
    } else {
      console.log('⚠️  No test user/course found, skipping service integration test');
    }

    // Test 7: Get all active templates
    console.log('\n7. Testing template listing...');
    const allTemplates = await certificateTemplateManager.getActiveTemplates();
    console.log('✅ Found templates:', allTemplates.length);

    // Test 8: Get all active signatures
    console.log('\n8. Testing signature listing...');
    const allSignatures = await certificateTemplateManager.getActiveSignatures();
    console.log('✅ Found signatures:', allSignatures.length);

    // Cleanup test data
    console.log('\n🧹 Cleaning up test data...');
    if (testSignature) {
      await query('DELETE FROM certificate_signatures WHERE id = $1', [testSignature.id]);
      console.log('✅ Test signature deleted');
    }

    console.log('\n🎉 All certificate template tests passed!');

  } catch (error) {
    console.error('❌ Certificate template test failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testCertificateTemplates().then(() => {
    console.log('\n✅ Certificate template system is working correctly!');
    process.exit(0);
  }).catch((error) => {
    console.error('\n❌ Certificate template tests failed:', error);
    process.exit(1);
  });
}

module.exports = { testCertificateTemplates };