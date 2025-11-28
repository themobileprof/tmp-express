const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { createCanvas, loadImage } = require('canvas');

/**
 * Simplified Certificate Generator for TheMobileProf Learning Platform
 * Generates certificate images by overlaying text on background images
 * Uses browser print-to-PDF instead of server-side PDF generation
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
   * Generate a course completion certificate image
   * @param {Object} data - Certificate data
   * @param {string} data.userName - Full name of the recipient
   * @param {string} data.courseTitle - Title of the completed course
   * @param {string} data.instructorName - Name of the course instructor
   * @param {string} data.completionDate - Date of completion (ISO string)
   * @param {string} data.verificationCode - Unique verification code
   * @param {string} data.templateImagePath - Path to background image (optional)
   * @returns {Promise<Object>} - Certificate info with file path and URL
   */
  async generateCourseCertificate(data) {
    const {
      userName,
      courseTitle,
      instructorName,
      completionDate,
      verificationCode,
      templateImagePath
    } = data;

    // Generate unique filename
    const fileName = `certificate-${uuidv4()}.png`;
    const filePath = path.join(this.certificatesDir, fileName);

    // Create canvas (1200x800 for web display, good for print-to-PDF)
    const canvas = createCanvas(1200, 800);
    const ctx = canvas.getContext('2d');

    // If template image is provided, use it as background
    if (templateImagePath && fs.existsSync(templateImagePath)) {
      try {
        const background = await loadImage(templateImagePath);
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
      } catch (error) {
        console.warn('Could not load template image, using default design:', error.message);
        this.drawDefaultBackground(ctx, canvas);
      }
    } else {
      // Use default design
      this.drawDefaultBackground(ctx, canvas);
    }

    // Overlay text on the certificate
    this.overlayCertificateText(ctx, canvas, {
      userName,
      courseTitle,
      instructorName,
      completionDate,
      verificationCode
    });

    // Save as PNG
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(filePath, buffer);

    // Return certificate info
    const certificateUrl = `/uploads/certificates/${fileName}`;

    return {
      filePath,
      fileName,
      certificateUrl,
      verificationCode,
      fileSize: buffer.length,
      width: canvas.width,
      height: canvas.height
    };
  }

  /**
   * Draw default certificate background (fallback)
   */
  drawDefaultBackground(ctx, canvas) {
    const { width, height } = canvas;

    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // Outer border
    ctx.strokeStyle = '#2D3748';
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, width - 40, height - 40);

    // Inner decorative border
    ctx.strokeStyle = '#4A5568';
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 30, width - 60, height - 60);

    // Background gradient effect (simulated)
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, 'rgba(102, 126, 234, 0.1)');
    gradient.addColorStop(1, 'rgba(118, 75, 162, 0.1)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  /**
   * Overlay text on the certificate
   */
  overlayCertificateText(ctx, canvas, data) {
    const { width, height } = canvas;

    // Format completion date
    const completionDate = new Date(data.completionDate);
    const formattedDate = completionDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Set font and text alignment
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Recipient name (large, prominent)
    ctx.fillStyle = '#2D3748';
    ctx.font = 'bold 48px Arial';
    ctx.fillText(data.userName, width / 2, height * 0.35);

    // Course title
    ctx.fillStyle = '#2D3748';
    ctx.font = 'bold 36px Arial';
    ctx.fillText(data.courseTitle, width / 2, height * 0.50);

    // Completion date
    ctx.fillStyle = '#4A5568';
    ctx.font = '24px Arial';
    ctx.fillText(`Completed on ${formattedDate}`, width / 2, height * 0.65);

    // Verification code (bottom)
    ctx.fillStyle = '#718096';
    ctx.font = '18px Arial';
    ctx.fillText(`Verification Code: ${data.verificationCode}`, width / 2, height * 0.85);
  }

  /**
   * Generate a class completion certificate (same as course)
   */
  async generateClassCertificate(data) {
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

    // Validate image dimensions (should be close to 1200x800 or similar aspect ratio)
    try {
      const img = await loadImage(imageBuffer);
      const aspectRatio = img.width / img.height;

      // Target aspect ratio is 1200/800 = 1.5
      if (aspectRatio < 1.2 || aspectRatio > 1.8) {
        console.warn(`Template image aspect ratio ${aspectRatio} may not fit certificate dimensions properly`);
      }

      console.log(`Template image dimensions: ${img.width}x${img.height}, aspect ratio: ${aspectRatio}`);
    } catch (error) {
      console.warn('Could not validate image dimensions:', error.message);
    }

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