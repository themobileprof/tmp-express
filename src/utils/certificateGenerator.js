const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const puppeteer = require('puppeteer');
const templateEngine = require('./templateEngine');

/**
 * Certificate Generator using Puppeteer + HTML Templates
 * Generates PDF certificates from HTML templates with professional design
 */
class CertificateGenerator {
  constructor() {
    this.certificatesDir = path.join(process.env.UPLOAD_PATH || './uploads', 'certificates');
    this.templatesDir = path.join(__dirname, '../templates/certificates');
    
    // Ensure directories exist
    if (!fs.existsSync(this.certificatesDir)) {
      fs.mkdirSync(this.certificatesDir, { recursive: true });
    }
    
    // Browser instance (reuse for performance)
    this.browser = null;
  }
  
  /**
   * Get or create browser instance
   */
  async getBrowser() {
    if (!this.browser || !this.browser.isConnected()) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });
    }
    return this.browser;
  }
  
  /**
   * Load HTML template
   */
  loadTemplate(templateName = 'default-certificate') {
    const templatePath = path.join(this.templatesDir, `${templateName}.html`);
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found: ${templateName}`);
    }
    return fs.readFileSync(templatePath, 'utf8');
  }
  
  /**
   * Generate certificate PDF from HTML template
   */
  async generateCertificatePDF(data, templateName = 'default-certificate') {
    const {
      userName,
      courseTitle,
      classTitle,
      instructorName,
      completionDate,
      verificationCode,
      issuer = 'TheMobileProf Learning Platform',
      signatures = []
    } = data;
    
    // Format completion date
    const completionDateObj = new Date(completionDate);
    const formattedDate = completionDateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Load and render template
    const template = this.loadTemplate(templateName);
    const html = templateEngine.render(template, {
      userName,
      courseTitle: courseTitle || classTitle,
      instructorName,
      completionDate: formattedDate,
      verificationCode,
      issuer,
      signatures: signatures.length > 0 ? signatures : null
    });
    
    // Generate unique filename
    const fileName = `certificate-${uuidv4()}.pdf`;
    const filePath = path.join(this.certificatesDir, fileName);
    
    // Generate PDF with Puppeteer
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    
    try {
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      await page.pdf({
        path: filePath,
        format: 'A4',
        landscape: true,
        printBackground: true,
        preferCSSPageSize: true
      });
      
      await page.close();
      
      const certificateUrl = `/uploads/certificates/${fileName}`;
      const fileSize = fs.statSync(filePath).size;
      
      console.log(`✓ Certificate PDF generated: ${fileName} (${fileSize} bytes)`);
      
      return {
        fileName,
        filePath,
        certificateUrl,
        verificationCode,
        fileSize
      };
      
    } catch (error) {
      await page.close();
      throw error;
    }
  }
  
  /**
   * Generate course completion certificate
   */
  async generateCourseCertificate(data) {
    return await this.generateCertificatePDF(data, 'default-certificate');
  }
  
  /**
   * Generate class attendance certificate
   */
  async generateClassCertificate(data) {
    return await this.generateCertificatePDF(data, 'default-certificate');
  }
  
  /**
   * Clean up browser instance
   */
  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
  
  /**
   * Clean up old certificate files
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

// Create singleton instance
const generator = new CertificateGenerator();

// Cleanup on process exit
process.on('SIGINT', async () => {
  await generator.cleanup();
  process.exit();
});

process.on('SIGTERM', async () => {
  await generator.cleanup();
  process.exit();
});

module.exports = generator;