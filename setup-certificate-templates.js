const certificateTemplateManager = require('./src/utils/certificateTemplateManager');
const { query } = require('./src/database/config');
const fs = require('fs');
const path = require('path');

/**
 * Demo script showing how to set up certificate templates with signatures
 */
async function setupCertificateTemplates() {
  try {
    console.log('🎨 Setting up Certificate Template System Demo...\n');

    // Get admin user (create one if needed for demo)
    let adminUser = await query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['admin']);

    if (adminUser.rows.length === 0) {
      console.log('⚠️  No admin user found. Creating demo admin user...');
      adminUser = await query(`
        INSERT INTO users (email, password_hash, first_name, last_name, role, email_verified)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [
        'admin@demo.com',
        '$2b$10$dummy.hash.for.demo.purposes.only',
        'Demo',
        'Admin',
        'admin',
        true
      ]);
      console.log('✅ Demo admin user created');
    }

    const adminUserId = adminUser.rows[0].id;

    // Create a sample signature image (simple text-based for demo)
    console.log('\n1. Creating sample signature...');

    // For demo purposes, we'll create a placeholder signature
    // In real usage, you'd upload actual signature images
    const signaturesDir = path.join(process.env.UPLOAD_PATH || './uploads', 'signatures');
    if (!fs.existsSync(signaturesDir)) {
      fs.mkdirSync(signaturesDir, { recursive: true });
    }

    // Create a simple text file as placeholder (in real app, this would be an image)
    const signaturePath = path.join(signaturesDir, 'demo-signature.txt');
    fs.writeFileSync(signaturePath, 'Demo Signature - John Doe\nCourse Instructor');

    const signatureImageUrl = '/uploads/signatures/demo-signature.txt';

    const signature = await certificateTemplateManager.createSignature({
      name: 'John Doe - Course Instructor',
      title: 'Course Instructor',
      signatureImageUrl
    }, adminUserId);

    console.log('✅ Sample signature created:', signature.name);

    // Get the default template
    console.log('\n2. Getting default template...');
    const defaultTemplate = await certificateTemplateManager.getDefaultTemplate('course');
    console.log('✅ Default template found:', defaultTemplate.name);

    // Add signature to template
    console.log('\n3. Adding signature to template...');
    const templateSignature = await certificateTemplateManager.addSignatureToTemplate(
      defaultTemplate.id,
      signature.id,
      {
        x: 50,    // Center horizontally
        y: 78,    // Position near bottom
        width: 25, // 25% of page width
        height: 8, // 8% of page height
        orderIndex: 0
      }
    );

    console.log('✅ Signature added to template at position:', `${templateSignature.position_x}% x ${templateSignature.position_y}%`);

    // Generate a demo certificate
    console.log('\n4. Generating demo certificate with signature...');
    const certificateData = {
      userName: 'Demo Student',
      courseTitle: 'Introduction to Certificate Templates',
      instructorName: 'John Doe',
      completionDate: new Date().toISOString(),
      verificationCode: 'CERTDEMO123',
      issuer: 'TheMobileProf Learning Platform'
    };

    const certificate = await certificateTemplateManager.generateCertificateFromTemplate(
      defaultTemplate.id,
      certificateData
    );

    console.log('✅ Demo certificate generated!');
    console.log('📄 File:', certificate.fileName);
    console.log('🔗 URL:', certificate.certificateUrl);
    console.log('📏 Size:', certificate.fileSize, 'bytes');

    // Show template with signatures
    console.log('\n5. Template configuration:');
    const templateWithSignatures = await certificateTemplateManager.getTemplateWithSignatures(defaultTemplate.id);
    console.log('📋 Template:', templateWithSignatures.name);
    console.log('🎨 Signatures:', templateWithSignatures.signatures.length);
    templateWithSignatures.signatures.forEach((sig, index) => {
      console.log(`   ${index + 1}. ${sig.name} (${sig.title}) at ${sig.position.x}%, ${sig.position.y}%`);
    });

    console.log('\n🎉 Certificate template setup complete!');
    console.log('\n📖 Next steps:');
    console.log('1. Upload real signature images via /api/certificate-templates/signatures');
    console.log('2. Customize template layouts via /api/certificate-templates/templates');
    console.log('3. Create additional templates for different certificate types');
    console.log('4. Test automatic certificate awarding with course completion');

  } catch (error) {
    console.error('❌ Demo setup failed:', error);
    console.error('Error details:', error.message);
  }
}

// Run demo if this file is executed directly
if (require.main === module) {
  setupCertificateTemplates().then(() => {
    console.log('\n✅ Demo completed successfully!');
    process.exit(0);
  }).catch((error) => {
    console.error('\n❌ Demo failed:', error);
    process.exit(1);
  });
}

module.exports = { setupCertificateTemplates };