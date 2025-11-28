const { query, getRow, getRows } = require('../database/config');
const certificateGenerator = require('./certificateGenerator');
const { sendEmail } = require('../mailer');
const { notifyCertificateAwarded } = require('./notifications');
const path = require('path');

/**
 * Certificate Awarding Service
 * Handles automatic certificate generation and awarding for course/class completion
 */
class CertificateService {
  /**
   * Check if a user has completed a course and award certificate if eligible
   * @param {string} userId - User ID
   * @param {string} courseId - Course ID
   * @returns {Promise<Object|null>} - Certificate info if awarded, null otherwise
   */
  async checkAndAwardCourseCertificate(userId, courseId) {
    try {
      // Get course and enrollment info
      const courseInfo = await getRow(
        `SELECT c.id, c.title, c.certification, u.first_name, u.last_name, u.email,
                e.progress, e.status, e.completed_at
         FROM courses c
         JOIN enrollments e ON c.id = e.course_id
         JOIN users u ON c.instructor_id = u.id
         WHERE c.id = $1 AND e.user_id = $2 AND e.enrollment_type = 'course'`,
        [courseId, userId]
      );

      if (!courseInfo) {
        console.log(`No enrollment found for user ${userId} in course ${courseId}`);
        return null;
      }

      // Check if course offers certification
      if (!courseInfo.certification) {
        console.log(`Course ${courseId} does not offer certification`);
        return null;
      }

      // Check if user has already been awarded a certificate for this course
      const existingCertificate = await getRow(
        'SELECT id FROM certifications WHERE user_id = $1 AND course_id = $2',
        [userId, courseId]
      );

      if (existingCertificate) {
        console.log(`User ${userId} already has certificate for course ${courseId}`);
        return null;
      }

      // Check if course is completed (progress = 100)
      if (courseInfo.progress !== 100 || courseInfo.status !== 'completed') {
        console.log(`Course ${courseId} not completed yet for user ${userId} (progress: ${courseInfo.progress})`);
        return null;
      }

      // Award certificate
      return await this.awardCourseCertificate(userId, courseId, courseInfo);

    } catch (error) {
      console.error('Error checking course certificate eligibility:', error);
      throw error;
    }
  }

  /**
   * Award a certificate for course completion
   * @param {string} userId - User ID
   * @param {string} courseId - Course ID
   * @param {Object} courseInfo - Course and enrollment info
   * @returns {Promise<Object>} - Certificate info
   */
  async awardCourseCertificate(userId, courseId, courseInfo) {
    try {
      // Get user info
      const userInfo = await getRow(
        'SELECT first_name, last_name, email FROM users WHERE id = $1',
        [userId]
      );

      if (!userInfo) {
        throw new Error(`User ${userId} not found`);
      }

      const userName = `${userInfo.first_name} ${userInfo.last_name}`;

      // Get default template
      const template = await getRow(
        'SELECT * FROM certificate_templates WHERE is_default = true AND is_active = true LIMIT 1'
      );

      // Generate verification code
      const verificationCode = await this.generateVerificationCode();

      // Generate certificate image using template
      const certificateData = {
        userName,
        courseTitle: courseInfo.title,
        instructorName: `${courseInfo.first_name} ${courseInfo.last_name}`,
        completionDate: courseInfo.completed_at || new Date().toISOString(),
        verificationCode,
        templateImagePath: template ? path.resolve(template.image_path.replace('/uploads/', './uploads/')) : null
      };

      const certificateFile = await certificateGenerator.generateCourseCertificate(certificateData);

      // Save certificate to database
      const certificateResult = await query(
        `INSERT INTO certifications (
          user_id, course_id, certification_name, issuer, issued_date,
          certificate_url, verification_code, status, template_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          userId,
          courseId,
          `${courseInfo.title} - Certificate of Completion`,
          'TheMobileProf Learning Platform',
          new Date().toISOString().split('T')[0], // issued_date as DATE
          certificateFile.certificateUrl,
          verificationCode,
          'issued',
          template ? template.id : null
        ]
      );

      const certificate = certificateResult.rows[0];

      // Send notification email
      await this.sendCertificateEmail(userInfo.email, {
        userName,
        courseTitle: courseInfo.title,
        certificateUrl: certificateFile.certificateUrl,
        verificationCode,
        certificateId: certificate.id
      });

      // Create in-app notification
      await notifyCertificateAwarded(userId, courseInfo.title, certificate.id);

      console.log(`Certificate awarded to user ${userId} for course ${courseId}`);

      return {
        certificateId: certificate.id,
        certificateUrl: certificateFile.certificateUrl,
        verificationCode,
        filePath: certificateFile.filePath
      };

    } catch (error) {
      console.error('Error awarding course certificate:', error);
      throw error;
    }
  }

  /**
   * Check if a user has completed a class and award certificate if eligible
   * @param {string} userId - User ID
   * @param {string} classId - Class ID
   * @returns {Promise<Object|null>} - Certificate info if awarded, null otherwise
   */
  async checkAndAwardClassCertificate(userId, classId) {
    try {
      // Get class and enrollment info
      const classInfo = await getRow(
        `SELECT cl.id, cl.title, cl.certification, u.first_name, u.last_name, u.email,
                e.progress, e.status, e.completed_at
         FROM classes cl
         JOIN enrollments e ON cl.id = e.class_id
         JOIN users u ON cl.instructor_id = u.id
         WHERE cl.id = $1 AND e.user_id = $2 AND e.enrollment_type = 'class'`,
        [classId, userId]
      );

      if (!classInfo) {
        console.log(`No enrollment found for user ${userId} in class ${classId}`);
        return null;
      }

      // Check if class offers certification
      if (!classInfo.certification) {
        console.log(`Class ${classId} does not offer certification`);
        return null;
      }

      // Check if user has already been awarded a certificate for this class
      const existingCertificate = await getRow(
        'SELECT id FROM certifications WHERE user_id = $1 AND class_id = $2',
        [userId, classId]
      );

      if (existingCertificate) {
        console.log(`User ${userId} already has certificate for class ${classId}`);
        return null;
      }

      // Check if class is completed
      if (classInfo.progress !== 100 || classInfo.status !== 'completed') {
        console.log(`Class ${classId} not completed yet for user ${userId} (progress: ${classInfo.progress})`);
        return null;
      }

      // Award certificate
      return await this.awardClassCertificate(userId, classId, classInfo);

    } catch (error) {
      console.error('Error checking class certificate eligibility:', error);
      throw error;
    }
  }

  /**
   * Award a certificate for class completion
   * @param {string} userId - User ID
   * @param {string} classId - Class ID
   * @param {Object} classInfo - Class and enrollment info
   * @returns {Promise<Object>} - Certificate info
   */
  async awardClassCertificate(userId, classId, classInfo) {
    try {
      // Get user info
      const userInfo = await getRow(
        'SELECT first_name, last_name, email FROM users WHERE id = $1',
        [userId]
      );

      if (!userInfo) {
        throw new Error(`User ${userId} not found`);
      }

      const userName = `${userInfo.first_name} ${userInfo.last_name}`;

      // Get default template
      const template = await getRow(
        'SELECT * FROM certificate_templates WHERE is_default = true AND is_active = true LIMIT 1'
      );

      // Generate verification code
      const verificationCode = await this.generateVerificationCode();

      // Generate certificate image using template
      const certificateData = {
        userName,
        classTitle: classInfo.title,
        instructorName: `${classInfo.first_name} ${classInfo.last_name}`,
        completionDate: classInfo.completed_at || new Date().toISOString(),
        verificationCode,
        templateImagePath: template ? path.resolve(template.image_path.replace('/uploads/', './uploads/')) : null
      };

      const certificateFile = await certificateGenerator.generateClassCertificate(certificateData);

      // Save certificate to database
      const certificateResult = await query(
        `INSERT INTO certifications (
          user_id, class_id, certification_name, issuer, issued_date,
          certificate_url, verification_code, status, template_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          userId,
          classId,
          `${classInfo.title} - Certificate of Attendance`,
          'TheMobileProf Learning Platform',
          new Date().toISOString().split('T')[0], // issued_date as DATE
          certificateFile.certificateUrl,
          verificationCode,
          'issued',
          template ? template.id : null
        ]
      );

      const certificate = certificateResult.rows[0];

      // Send notification email
      await this.sendCertificateEmail(userInfo.email, {
        userName,
        courseTitle: classInfo.title,
        certificateUrl: certificateFile.certificateUrl,
        verificationCode,
        certificateId: certificate.id,
        type: 'class'
      });

      // Create in-app notification
      await notifyCertificateAwarded(userId, classInfo.title, certificate.id);

      console.log(`Certificate awarded to user ${userId} for class ${classId}`);

      return {
        certificateId: certificate.id,
        certificateUrl: certificateFile.certificateUrl,
        verificationCode,
        filePath: certificateFile.filePath
      };

    } catch (error) {
      console.error('Error awarding class certificate:', error);
      throw error;
    }
  }

  /**
   * Generate unique verification code for certificates
   * @returns {Promise<string>} - Unique verification code
   */
  async generateVerificationCode() {
    let code;
    let isUnique = false;

    while (!isUnique) {
      code = 'CERT' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const existing = await getRow('SELECT id FROM certifications WHERE verification_code = $1', [code]);
      isUnique = !existing;
    }

    return code;
  }

  /**
   * Send certificate award email notification
   * @param {string} email - Recipient email
   * @param {Object} data - Email data
   */
  async sendCertificateEmail(email, data) {
    try {
      const certificateType = data.type === 'class' ? 'class attendance' : 'course completion';

      await sendEmail({
        to: email,
        subject: `🎉 Congratulations! Your Certificate is Ready`,
        template: 'certificate-awarded',
        context: {
          firstName: data.userName.split(' ')[0],
          message: `Congratulations! You have successfully completed "${data.courseTitle}" and earned your certificate of ${certificateType}.`,
          data: {
            certificateUrl: `${process.env.BASE_URL || 'https://themobileprof.com'}${data.certificateUrl}`,
            verificationCode: data.verificationCode,
            verifyUrl: `${process.env.BASE_URL || 'https://themobileprof.com'}/verify/${data.verificationCode}`
          }
        }
      });

      console.log(`Certificate email sent to ${email} for certificate ${data.certificateId}`);
    } catch (error) {
      console.error('Error sending certificate email:', error);
      // Don't throw error to prevent certificate awarding from failing
    }
  }

  /**
   * Manually award a certificate (admin function)
   * @param {Object} certificateData - Certificate data
   * @returns {Promise<Object>} - Certificate info
   */
  async manuallyAwardCertificate(certificateData) {
    const {
      userId,
      courseId,
      classId,
      certificationName,
      issuer = 'TheMobileProf Learning Platform',
      issuedDate = new Date().toISOString().split('T')[0],
      expiryDate,
      certificateUrl
    } = certificateData;

    // Validate required fields
    if (!userId || (!courseId && !classId)) {
      throw new Error('userId and either courseId or classId are required');
    }

    // Generate verification code
    const verificationCode = await this.generateVerificationCode();

    // Save certificate to database
    const result = await query(
      `INSERT INTO certifications (
        user_id, course_id, class_id, certification_name, issuer, issued_date,
        expiry_date, certificate_url, verification_code, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        userId,
        courseId || null,
        classId || null,
        certificationName,
        issuer,
        issuedDate,
        expiryDate || null,
        certificateUrl || null,
        verificationCode,
        'issued'
      ]
    );

    const certificate = result.rows[0];

    // Get user info for notification
    const userInfo = await getRow(
      'SELECT first_name, last_name, email FROM users WHERE id = $1',
      [userId]
    );

    if (userInfo) {
      // Send notification email
      await this.sendCertificateEmail(userInfo.email, {
        userName: `${userInfo.first_name} ${userInfo.last_name}`,
        courseTitle: certificationName,
        certificateUrl: certificateUrl || certificate.certificate_url,
        verificationCode,
        certificateId: certificate.id
      });

      // Create in-app notification
      await notifyCertificateAwarded(userId, certificationName, certificate.id);
    }

    return {
      certificateId: certificate.id,
      verificationCode,
      certificateUrl: certificate.certificate_url
    };
  }

  /**
   * Get certificate statistics
   * @returns {Promise<Object>} - Certificate statistics
   */
  async getCertificateStats() {
    const stats = await getRows(`
      SELECT
        COUNT(*) as total_certificates,
        COUNT(CASE WHEN course_id IS NOT NULL THEN 1 END) as course_certificates,
        COUNT(CASE WHEN class_id IS NOT NULL THEN 1 END) as class_certificates,
        COUNT(CASE WHEN status = 'issued' THEN 1 END) as active_certificates,
        COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_certificates,
        COUNT(CASE WHEN status = 'revoked' THEN 1 END) as revoked_certificates
      FROM certifications
    `);

    return stats[0];
  }
}

module.exports = new CertificateService();