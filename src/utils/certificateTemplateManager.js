const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { query, getRow, getRows } = require('../database/config');

/**
 * Certificate Template Manager
 * Manages certificate templates and signature integration
 * Returns template data for client-side HTML5 Canvas rendering
 */
class CertificateTemplateManager {
  constructor() {
    this.signaturesDir = path.join(process.env.UPLOAD_PATH || './uploads', 'signatures');

    // Ensure directories exist
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
   * Generate certificate data using template for client-side Canvas rendering
   * Returns structured data instead of generating a PDF
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

    // Format completion date
    const completionDateObj = new Date(completionDate);
    const formattedDate = completionDateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Generate unique certificate ID
    const certificateId = uuidv4();

    // Return certificate data for client-side Canvas rendering
    return {
      id: certificateId,
      type: courseTitle ? 'course_completion' : 'class_attendance',
      template: {
        id: template.id,
        name: template.name,
        layout: template.layout_data,
        backgroundColor: template.background_color,
        textColor: template.text_color,
        accentColor: template.accent_color,
        fontFamily: template.font_family,
        signatures: template.signatures || []
      },
      data: {
        userName,
        courseTitle: courseTitle || classTitle,
        instructorName,
        completionDate: formattedDate,
        verificationCode,
        issuer
      },
      verificationUrl: `/api/certifications/verify/${verificationCode}`,
      issuedAt: new Date().toISOString()
    };
  }

  /**
   * Get certificate template data formatted for client-side rendering
   * This prepares all template styling and layout data for the frontend Canvas renderer
   */
  getTemplateRenderData(template) {
    return {
      id: template.id,
      name: template.name,
      templateType: template.template_type,
      layout: template.layout_data,
      styling: {
        backgroundColor: template.background_color || '#FFFFFF',
        textColor: template.text_color || '#000000',
        accentColor: template.accent_color || '#2D3748',
        fontFamily: template.font_family || 'Helvetica'
      },
      signatures: template.signatures ? template.signatures.map(sig => ({
        id: sig.id,
        name: sig.name,
        title: sig.title,
        imageUrl: sig.imageUrl,
        position: sig.position,
        size: sig.size
      })) : []
    };
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