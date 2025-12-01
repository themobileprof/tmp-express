const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Lightweight Certificate Generator for TheMobileProf Learning Platform
 * Generates certificate data for client-side rendering
 * No server-side image generation - eliminates heavy dependencies
 */
class CertificateGenerator {
  constructor() {
    this.certificatesDir = path.join(process.env.UPLOAD_PATH || './uploads', 'certificates');
    this.templatesDir = path.join(process.env.UPLOAD_PATH || './uploads', 'certificate-templates');

    // Ensure directories exist
    if (!fs.existsSync(this.certificatesDir)) {
      fs.mkdirSync(this.certificatesDir, { recursive: true });
    }
    if (!fs.existsSync(this.templatesDir)) {
      fs.mkdirSync(this.templatesDir, { recursive: true });
    }
  }

  /**
   * Generate certificate data for client-side rendering
   * @param {Object} data - Certificate data
   * @returns {Object} - Certificate data object for frontend
   */
  generateCourseCertificate(data) {
    const {
      userName,
      courseTitle,
      instructorName,
      completionDate,
      verificationCode,
      templateImagePath
    } = data;

    // Format completion date
    const completionDateObj = new Date(completionDate);
    const formattedDate = completionDateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Generate unique certificate ID
    const certificateId = uuidv4();

    // Return data for client-side generation
    return {
      id: certificateId,
      type: 'course_completion',
      data: {
        userName,
        courseTitle,
        instructorName,
        completionDate: formattedDate,
        verificationCode,
        templateImageUrl: templateImagePath ? `/uploads/certificate-templates/${path.basename(templateImagePath)}` : null
      },
      verificationUrl: `/api/certifications/verify/${verificationCode}`,
      issuedAt: new Date().toISOString()
    };
  }

  /**
   * Generate a class completion certificate (same structure)
   */
  generateClassCertificate(data) {
    return this.generateCourseCertificate({
      ...data,
      courseTitle: data.classTitle || data.courseTitle
    });
  }

  /**
   * Upload and validate a certificate template image
   */
  async uploadTemplateImage(imageBuffer, fileName) {
    const templateFileName = `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}${path.extname(fileName)}`;
    const templatePath = path.join(this.templatesDir, templateFileName);

    // Save the template image
    fs.writeFileSync(templatePath, imageBuffer);

    const templateUrl = `/uploads/certificate-templates/${templateFileName}`;

    return {
      templatePath,
      templateUrl,
      fileName: templateFileName
    };
  }

  /**
   * Clean up old certificate files (optional maintenance function)
   */
  async cleanupOldCertificates(daysOld = 365) {
    const files = fs.readdirSync(this.certificatesDir);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    let deletedCount = 0;
    for (const file of files) {
      const filePath = path.join(this.certificatesDir, file);
      const stats = fs.statSync(filePath);

      if (stats.mtime < cutoffDate) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    }

    return deletedCount;
  }
}

module.exports = new CertificateGenerator();