const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { query, getRow, getRows } = require('../database/config');

/**
 * Certificate Template Manager
 * Manages certificate templates and signature integration
 */
class CertificateTemplateManager {
  constructor() {
    this.certificatesDir = path.join(process.env.UPLOAD_PATH || './uploads', 'certificates');
    this.signaturesDir = path.join(process.env.UPLOAD_PATH || './uploads', 'signatures');

    // Ensure directories exist
    if (!fs.existsSync(this.certificatesDir)) {
      fs.mkdirSync(this.certificatesDir, { recursive: true });
    }
    if (!fs.existsSync(this.signaturesDir)) {
      fs.mkdirSync(this.signaturesDir, { recursive: true });
    }
  }

  /**
   * Get default template for a given type
   */
  async getDefaultTemplate(templateType = 'course') {
    const template = await getRow(
      'SELECT * FROM certificate_templates WHERE template_type = $1 AND is_default = true AND is_active = true',
      [templateType]
    );

    if (!template) {
      // Fallback to any active template of this type
      const fallbackTemplate = await getRow(
        'SELECT * FROM certificate_templates WHERE template_type = $1 AND is_active = true ORDER BY created_at LIMIT 1',
        [templateType]
      );
      return fallbackTemplate;
    }

    return template;
  }

  /**
   * Get template with signatures
   */
  async getTemplateWithSignatures(templateId) {
    const template = await getRow(
      'SELECT * FROM certificate_templates WHERE id = $1 AND is_active = true',
      [templateId]
    );

    if (!template) return null;

    // Get associated signatures
    const signatures = await getRows(`
      SELECT ts.*, cs.name, cs.title, cs.signature_image_url
      FROM template_signatures ts
      JOIN certificate_signatures cs ON ts.signature_id = cs.id
      WHERE ts.template_id = $1 AND cs.is_active = true
      ORDER BY ts.order_index
    `, [templateId]);

    return {
      ...template,
      signatures: signatures.map(sig => ({
        id: sig.signature_id,
        name: sig.name,
        title: sig.title,
        imageUrl: sig.signature_image_url,
        position: {
          x: parseFloat(sig.position_x),
          y: parseFloat(sig.position_y)
        },
        size: {
          width: parseFloat(sig.width),
          height: parseFloat(sig.height)
        },
        orderIndex: sig.order_index
      }))
    };
  }

  /**
   * Generate certificate using template
   */
  async generateCertificateFromTemplate(templateId, data) {
    const template = await this.getTemplateWithSignatures(templateId);
    if (!template) {
      throw new Error('Template not found or inactive');
    }

    const {
      userName,
      courseTitle,
      classTitle,
      instructorName,
      completionDate,
      verificationCode,
      issuer = 'TheMobileProf Learning Platform'
    } = data;

    // Generate unique filename
    const fileName = `certificate-${uuidv4()}.pdf`;
    const filePath = path.join(this.certificatesDir, fileName);

    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 50
    });

    // Pipe to file
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Apply template styling
    this.applyTemplateStyling(doc, template);

    // Draw certificate content using template layout
    await this.drawTemplatedContent(doc, template, {
      userName,
      courseTitle,
      classTitle,
      instructorName,
      completionDate,
      verificationCode,
      issuer
    });

    // Finalize PDF
    doc.end();

    // Wait for file to be written
    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    // Return certificate info
    const certificateUrl = `/uploads/certificates/${fileName}`;

    return {
      filePath,
      fileName,
      certificateUrl,
      verificationCode,
      templateId,
      fileSize: fs.statSync(filePath).size
    };
  }

  /**
   * Apply template styling to PDF document
   */
  applyTemplateStyling(doc, template) {
    const { width, height } = doc.page;

    // Set background color
    if (template.background_color && template.background_color !== '#FFFFFF') {
      doc.rect(0, 0, width, height)
         .fill(template.background_color);
    }

    // Draw decorative elements if specified in layout
    if (template.layout_data?.decorativeElements) {
      this.drawDecorativeElements(doc, template.layout_data.decorativeElements);
    }

    // Set default font
    if (template.font_family) {
      doc.font(template.font_family);
    }
  }

  /**
   * Draw decorative elements
   */
  drawDecorativeElements(doc, elements) {
    const { width, height } = doc.page;

    elements.forEach(element => {
      const { type, x, y, width: w, height: h, color, opacity = 1 } = element;

      switch (type) {
        case 'circle':
          doc.circle(width * (x / 100), height * (y / 100), Math.max(w, h) / 2)
             .fillOpacity(opacity)
             .fill(color || '#667EEA');
          break;
        case 'rectangle':
          doc.rect(width * (x / 100), height * (y / 100), width * (w / 100), height * (h / 100))
             .fillOpacity(opacity)
             .fill(color || '#667EEA');
          break;
      }
    });
  }

  /**
   * Draw certificate content using template layout
   */
  async drawTemplatedContent(doc, template, data) {
    const { width, height } = doc.page;
    const layout = template.layout_data;

    // Helper function to get position
    const getPosition = (element) => ({
      x: width * (element.x / 100),
      y: height * (element.y / 100)
    });

    // Title
    if (layout.title) {
      const pos = getPosition(layout.title);
      doc.fontSize(layout.title.fontSize || 36)
         .fillColor(template.accent_color || '#1A202C')
         .text('CERTIFICATE OF COMPLETION', pos.x, pos.y, {
           align: layout.title.align || 'center',
           width: layout.title.width ? width * (layout.title.width / 100) : width
         });
    }

    // Subtitle
    if (layout.subtitle) {
      const pos = getPosition(layout.subtitle);
      doc.fontSize(layout.subtitle.fontSize || 16)
         .fillColor(template.text_color || '#4A5568')
         .text('This certifies that', pos.x, pos.y, {
           align: layout.subtitle.align || 'center',
           width: layout.subtitle.width ? width * (layout.subtitle.width / 100) : width
         });
    }

    // Recipient name
    if (layout.recipientName) {
      const pos = getPosition(layout.recipientName);
      doc.fontSize(layout.recipientName.fontSize || 32)
         .fillColor(template.accent_color || '#2D3748')
         .text(data.userName, pos.x, pos.y, {
           align: layout.recipientName.align || 'center',
           width: layout.recipientName.width ? width * (layout.recipientName.width / 100) : width
         });
    }

    // Completion text
    if (layout.completionText) {
      const pos = getPosition(layout.completionText);
      const completionText = data.courseTitle
        ? 'has successfully completed the course'
        : 'has successfully attended and completed the class';

      doc.fontSize(layout.completionText.fontSize || 16)
         .fillColor(template.text_color || '#4A5568')
         .text(completionText, pos.x, pos.y, {
           align: layout.completionText.align || 'center',
           width: layout.completionText.width ? width * (layout.completionText.width / 100) : width
         });
    }

    // Course/Class title
    if (layout.courseTitle && data.courseTitle) {
      const pos = getPosition(layout.courseTitle);
      doc.fontSize(layout.courseTitle.fontSize || 24)
         .fillColor(template.accent_color || '#2D3748')
         .text(`"${data.courseTitle}"`, pos.x, pos.y, {
           align: layout.courseTitle.align || 'center',
           width: layout.courseTitle.width ? width * (layout.courseTitle.width / 100) : width
         });
    } else if (layout.classTitle && data.classTitle) {
      const pos = getPosition(layout.classTitle);
      doc.fontSize(layout.classTitle.fontSize || 24)
         .fillColor(template.accent_color || '#2D3748')
         .text(`"${data.classTitle}"`, pos.x, pos.y, {
           align: layout.classTitle.align || 'center',
           width: layout.classTitle.width ? width * (layout.classTitle.width / 100) : width
         });
    }

    // Issuer
    if (layout.issuer) {
      const pos = getPosition(layout.issuer);
      doc.fontSize(layout.issuer.fontSize || 14)
         .fillColor(template.text_color || '#4A5568')
         .text(`Awarded by ${data.issuer}`, pos.x, pos.y, {
           align: layout.issuer.align || 'center',
           width: layout.issuer.width ? width * (layout.issuer.width / 100) : width
         });
    }

    // Completion date
    if (layout.completionDate) {
      const pos = getPosition(layout.completionDate);
      const completionDate = new Date(data.completionDate);
      const formattedDate = completionDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      doc.fontSize(layout.completionDate.fontSize || 14)
         .fillColor(template.text_color || '#4A5568')
         .text(`Completed on ${formattedDate}`, pos.x, pos.y, {
           align: layout.completionDate.align || 'center',
           width: layout.completionDate.width ? width * (layout.completionDate.width / 100) : width
         });
    }

    // Draw signatures
    if (template.signatures && template.signatures.length > 0) {
      await this.drawSignatures(doc, template.signatures);
    }

    // Verification code
    if (layout.verificationCode) {
      const pos = getPosition(layout.verificationCode);
      doc.fontSize(layout.verificationCode.fontSize || 10)
         .fillColor('#718096')
         .text(`Verification Code: ${data.verificationCode}`, pos.x, pos.y, {
           align: layout.verificationCode.align || 'center',
           width: layout.verificationCode.width ? width * (layout.verificationCode.width / 100) : width
         });
    }

    // Footer
    if (layout.footer) {
      const pos = getPosition(layout.footer);
      doc.fontSize(layout.footer.fontSize || 8)
         .fillColor('#A0AEC0')
         .text('This certificate can be verified at themobileprof.com/verify', pos.x, pos.y, {
           align: layout.footer.align || 'center',
           width: layout.footer.width ? width * (layout.footer.width / 100) : width
         });
    }
  }

  /**
   * Draw signatures on the certificate
   */
  async drawSignatures(doc, signatures) {
    const { width, height } = doc.page;

    for (const signature of signatures) {
      try {
        const imagePath = path.resolve(signature.imageUrl.replace('/uploads/', './uploads/'));

        if (fs.existsSync(imagePath)) {
          const x = width * (signature.position.x / 100);
          const y = height * (signature.position.y / 100);
          const w = width * (signature.size.width / 100);
          const h = height * (signature.size.height / 100);

          // Draw signature image
          doc.image(imagePath, x, y, {
            width: w,
            height: h,
            fit: [w, h]
          });

          // Draw signature line above image
          doc.moveTo(x, y - 5)
             .lineTo(x + w, y - 5)
             .stroke('#4A5568');

          // Draw signature title below image
          if (signature.title) {
            doc.fontSize(10)
               .fillColor('#4A5568')
               .text(signature.title, x, y + h + 2, {
                 align: 'center',
                 width: w
               });
          }
        }
      } catch (error) {
        console.error(`Error drawing signature ${signature.name}:`, error);
      }
    }
  }

  /**
   * Create a new certificate template
   */
  async createTemplate(templateData, createdBy) {
    const {
      name,
      description,
      templateType = 'course',
      layoutData,
      backgroundColor = '#FFFFFF',
      textColor = '#000000',
      accentColor = '#2D3748',
      fontFamily = 'Helvetica',
      isDefault = false
    } = templateData;

    // If setting as default, unset other defaults for this type
    if (isDefault) {
      await query(
        'UPDATE certificate_templates SET is_default = false WHERE template_type = $1',
        [templateType]
      );
    }

    const result = await query(`
      INSERT INTO certificate_templates (
        name, description, template_type, layout_data,
        background_color, text_color, accent_color, font_family,
        is_default, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      name, description, templateType, JSON.stringify(layoutData),
      backgroundColor, textColor, accentColor, fontFamily,
      isDefault, createdBy
    ]);

    return result.rows[0];
  }

  /**
   * Create a new signature
   */
  async createSignature(signatureData, createdBy) {
    const { name, title, signatureImageUrl } = signatureData;

    const result = await query(`
      INSERT INTO certificate_signatures (name, title, signature_image_url, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [name, title, signatureImageUrl, createdBy]);

    return result.rows[0];
  }

  /**
   * Add signature to template
   */
  async addSignatureToTemplate(templateId, signatureId, position = {}) {
    const {
      x = 50,
      y = 78,
      width = 20,
      height = 10,
      orderIndex = 0
    } = position;

    const result = await query(`
      INSERT INTO template_signatures (template_id, signature_id, position_x, position_y, width, height, order_index)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (template_id, signature_id) DO UPDATE SET
        position_x = EXCLUDED.position_x,
        position_y = EXCLUDED.position_y,
        width = EXCLUDED.width,
        height = EXCLUDED.height,
        order_index = EXCLUDED.order_index
      RETURNING *
    `, [templateId, signatureId, x, y, width, height, orderIndex]);

    return result.rows[0];
  }

  /**
   * Get all active templates
   */
  async getActiveTemplates(templateType = null) {
    let queryText = 'SELECT * FROM certificate_templates WHERE is_active = true';
    let params = [];

    if (templateType) {
      queryText += ' AND template_type = $1';
      params.push(templateType);
    }

    queryText += ' ORDER BY is_default DESC, name ASC';

    return await getRows(queryText, params);
  }

  /**
   * Get all active signatures
   */
  async getActiveSignatures() {
    return await getRows(
      'SELECT * FROM certificate_signatures WHERE is_active = true ORDER BY name ASC'
    );
  }
}

module.exports = new CertificateTemplateManager();