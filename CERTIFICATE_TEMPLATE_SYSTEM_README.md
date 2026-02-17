# Certificate Template System

> **Note:** This template system has been updated for **client-side HTML5 Canvas rendering**. Templates now return structured data (JSON) for frontend rendering instead of generating server-side PDFs. This eliminates the need for PDFKit and heavy native dependencies.

This document describes the certificate template system that allows administrators to create customizable certificate designs with signature support.

## Overview

The certificate template system provides:

- **Customizable Templates**: Create professional certificate designs with custom layouts, colors, and fonts
- **Signature Support**: Attach digital signatures to certificates with precise positioning
- **Template Types**: Support for course certificates, class certificates, and custom certificates
- **Admin Management**: Full CRUD operations for templates and signatures via API
- **Automatic Integration**: Seamlessly integrates with the existing certificate awarding system
- **Client-Side Rendering**: Returns template data for HTML5 Canvas rendering in the browser

## Database Schema

### certificate_templates
```sql
CREATE TABLE certificate_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  template_type VARCHAR(50) DEFAULT 'course', -- course, class, custom
  layout_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  background_color VARCHAR(7) DEFAULT '#FFFFFF',
  text_color VARCHAR(7) DEFAULT '#000000',
  accent_color VARCHAR(7) DEFAULT '#2D3748',
  font_family VARCHAR(100) DEFAULT 'Helvetica',
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
```

### certificate_signatures
```sql
CREATE TABLE certificate_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  title VARCHAR(255), -- e.g., 'Course Instructor', 'CEO', etc.
  signature_image_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
```

### template_signatures
```sql
CREATE TABLE template_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL,
  signature_id UUID NOT NULL,
  position_x DECIMAL(5,2) DEFAULT 0, -- percentage from left
  position_y DECIMAL(5,2) DEFAULT 0, -- percentage from top
  width DECIMAL(5,2) DEFAULT 20, -- percentage width
  height DECIMAL(5,2) DEFAULT 10, -- percentage height
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES certificate_templates(id) ON DELETE CASCADE,
  FOREIGN KEY (signature_id) REFERENCES certificate_signatures(id) ON DELETE CASCADE,
  UNIQUE(template_id, signature_id)
);
```

## API Endpoints

### Template Management

#### GET /api/certificate-templates/templates
Get all active certificate templates.

**Query Parameters:**
- `type` (optional): Filter by template type (`course`, `class`, `custom`)

**Response:**
```json
{
  "templates": [
    {
      "id": "uuid",
      "name": "Professional Certificate",
      "description": "Default professional template",
      "templateType": "course",
      "backgroundColor": "#FFFFFF",
      "textColor": "#000000",
      "accentColor": "#2D3748",
      "fontFamily": "Helvetica",
      "isDefault": true,
      "createdAt": "2025-11-27T...",
      "updatedAt": "2025-11-27T..."
    }
  ]
}
```

#### GET /api/certificate-templates/templates/:id
Get a specific template with its signatures.

**Response:**
```json
{
  "template": {
    "id": "uuid",
    "name": "Professional Certificate",
    "templateType": "course",
    "layoutData": { ... },
    "signatures": [
      {
        "id": "uuid",
        "name": "John Doe Signature",
        "title": "Course Instructor",
        "imageUrl": "/uploads/signatures/signature-123.png",
        "position": { "x": 50, "y": 78 },
        "size": { "width": 20, "height": 10 },
        "orderIndex": 0
      }
    ]
  }
}
```

#### POST /api/certificate-templates/templates
Create a new certificate template.

**Request Body:**
```json
{
  "name": "Custom Certificate",
  "description": "A custom certificate design",
  "templateType": "course",
  "layoutData": {
    "title": { "x": 50, "y": 15, "fontSize": 36, "align": "center" },
    "recipientName": { "x": 50, "y": 32, "fontSize": 32, "align": "center" },
    "signatures": { "x": 50, "y": 78, "spacing": 15 }
  },
  "backgroundColor": "#FFFFFF",
  "textColor": "#000000",
  "accentColor": "#2D3748",
  "fontFamily": "Helvetica",
  "isDefault": false
}
```

#### PUT /api/certificate-templates/templates/:id
Update an existing template.

#### DELETE /api/certificate-templates/templates/:id
Delete a template (cannot delete default templates or templates in use).

### Signature Management

#### GET /api/certificate-templates/signatures
Get all active signatures.

**Response:**
```json
{
  "signatures": [
    {
      "id": "uuid",
      "name": "John Doe",
      "title": "Course Instructor",
      "signatureImageUrl": "/uploads/signatures/signature-123.png",
      "isActive": true,
      "createdAt": "2025-11-27T..."
    }
  ]
}
```

#### POST /api/certificate-templates/signatures
Upload a new signature image.

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `signatureImage`: Image file (PNG, JPG, etc.)
- `name`: Signature name
- `title`: Signature title (e.g., "Course Instructor")

#### POST /api/certificate-templates/templates/:templateId/signatures/:signatureId
Add a signature to a template with positioning.

**Request Body:**
```json
{
  "x": 50,      // X position (percentage from left)
  "y": 78,      // Y position (percentage from top)
  "width": 20,  // Width (percentage)
  "height": 10, // Height (percentage)
  "orderIndex": 0
}
```

#### DELETE /api/certificate-templates/templates/:templateId/signatures/:signatureId
Remove a signature from a template.

### Template Preview

#### POST /api/certificate-templates/templates/:id/preview
Generate a preview certificate data using the template.

> **Note:** This now returns JSON data for client-side Canvas rendering, not a PDF file.

**Request Body:**
```json
{
  "sampleData": {
    "userName": "John Doe",
    "courseTitle": "Sample Course",
    "instructorName": "Jane Smith",
    "completionDate": "2025-11-27T10:00:00Z",
    "verificationCode": "CERTPREVIEW"
  }
}
```

**Response:**
```json
{
  "id": "preview-uuid",
  "type": "course_completion",
  "template": {
    "id": "template-uuid",
    "name": "Professional Certificate",
    "layout": { /* layout data */ },
    "backgroundColor": "#FFFFFF",
    "textColor": "#000000",
    "accentColor": "#2D3748",
    "fontFamily": "Helvetica",
    "signatures": []
  },
  "data": {
    "userName": "John Doe",
    "courseTitle": "Sample Course",
    "completionDate": "November 27, 2025",
    "verificationCode": "CERTPREVIEW"
  }
}
```

## Template Layout System

Templates use a flexible layout system based on percentages for positioning. All coordinates are relative to the page dimensions.

### Layout Data Structure

```json
{
  "title": {
    "x": 50,           // Center horizontally
    "y": 15,           // 15% from top
    "fontSize": 36,
    "align": "center"
  },
  "subtitle": {
    "x": 50,
    "y": 25,
    "fontSize": 16,
    "align": "center"
  },
  "recipientName": {
    "x": 50,
    "y": 32,
    "fontSize": 32,
    "align": "center"
  },
  "completionText": {
    "x": 50,
    "y": 45,
    "fontSize": 16,
    "align": "center"
  },
  "courseTitle": {
    "x": 50,
    "y": 52,
    "fontSize": 24,
    "align": "center"
  },
  "issuer": {
    "x": 50,
    "y": 65,
    "fontSize": 14,
    "align": "center"
  },
  "completionDate": {
    "x": 50,
    "y": 70,
    "fontSize": 14,
    "align": "center"
  },
  "signatures": {
    "x": 50,           // Center signatures horizontally
    "y": 78,           // Start at 78% from top
    "spacing": 15      // Space between multiple signatures
  },
  "verificationCode": {
    "x": 50,
    "y": 92,
    "fontSize": 10,
    "align": "center"
  },
  "footer": {
    "x": 50,
    "y": 96,
    "fontSize": 8,
    "align": "center"
  },
  "decorativeElements": [
    {
      "type": "circle",
      "x": 20,
      "y": 30,
      "width": 15,
      "height": 15,
      "color": "#667EEA",
      "opacity": 0.05
    }
  ]
}
```

### Supported Layout Elements

- `title`: Main certificate title
- `subtitle`: Secondary title or tagline
- `recipientName`: Name of the certificate recipient
- `completionText`: Text describing the achievement
- `courseTitle` / `classTitle`: Title of the course/class
- `issuer`: Organization issuing the certificate
- `completionDate`: Date of completion
- `signatures`: Signature placement configuration
- `verificationCode`: Verification code display
- `footer`: Footer text (usually verification URL)
- `decorativeElements`: Background graphics

### Decorative Elements

Templates support decorative background elements:

- **circle**: Circular background elements
- **rectangle**: Rectangular background elements

Each element supports:
- `x`, `y`: Position (percentage)
- `width`, `height`: Size (percentage)
- `color`: Hex color code
- `opacity`: Transparency (0-1)

## Signature System

### Signature Images
- Stored in `/uploads/signatures/` directory
- Support common image formats (PNG, JPG, GIF)
- Recommended: PNG with transparent background
- Maximum file size: 5MB

### Signature Positioning
Signatures are positioned using percentage coordinates:
- `x`: Horizontal position (0 = left edge, 100 = right edge)
- `y`: Vertical position (0 = top edge, 100 = bottom edge)
- `width`: Signature width as percentage of page width
- `height`: Signature height as percentage of page height

### Multiple Signatures
Templates can have multiple signatures arranged horizontally or vertically. The `orderIndex` determines the display order, and `spacing` controls the gap between signatures.

## Integration with Certificate System

The template system integrates seamlessly with the existing certificate awarding process:

1. **Automatic Template Selection**: When awarding certificates, the system automatically selects the default template for the appropriate type (course/class).

2. **Template Override**: Administrators can manually specify a template when awarding certificates.

3. **Database Tracking**: Each certificate stores a reference to the template used, ensuring consistent regeneration if needed.

## File Structure

```
backend/
├── src/
│   ├── utils/
│   │   ├── certificateTemplateManager.js    # Template management (returns data for Canvas)
│   │   └── certificateService.js             # Updated for client-side rendering
│   └── routes/
│       └── certificateTemplates.js           # Template API endpoints
├── uploads/
│   └── signatures/                          # Signature images
├── docs/
│   └── certificate-viewer.html              # Client-side Canvas certificate viewer
└── test-certificate-templates.js            # Template system tests (needs updating)
```

> **Note:** The `uploads/certificates/` directory is no longer needed for storing PDF files since certificates are now rendered client-side.

## Usage Examples

### Creating a Custom Template

```javascript
const templateData = {
  name: "Corporate Certificate",
  description: "Professional corporate-style certificate",
  templateType: "course",
  layoutData: {
    title: { x: 50, y: 12, fontSize: 40, align: "center" },
    recipientName: { x: 50, y: 30, fontSize: 28, align: "center" },
    signatures: { x: 50, y: 75, spacing: 20 }
  },
  backgroundColor: "#F8F9FA",
  textColor: "#212529",
  accentColor: "#007BFF",
  fontFamily: "Times-Roman"
};

const template = await certificateTemplateManager.createTemplate(templateData, adminUserId);
```

### Adding a Signature to a Template

```javascript
// First upload the signature image
const signature = await certificateTemplateManager.createSignature({
  name: "Dr. Jane Smith",
  title: "Program Director",
  signatureImageUrl: "/uploads/signatures/dr-jane-smith.png"
}, adminUserId);

// Then add it to the template
await certificateTemplateManager.addSignatureToTemplate(
  templateId,
  signature.id,
  { x: 40, y: 75, width: 18, height: 8, orderIndex: 0 }
);
```

### Generating a Certificate with Template

> **Updated:** This now returns JSON data for client-side Canvas rendering instead of generating PDF files.

```javascript
const certificateData = {
  userName: "John Doe",
  courseTitle: "Advanced JavaScript",
  instructorName: "Dr. Jane Smith",
  completionDate: "2025-11-27T10:00:00Z",
  verificationCode: "CERT123456",
  issuer: "Tech University"
};

const certificateResult = await certificateTemplateManager.generateCertificateFromTemplate(
  templateId,
  certificateData
);

// Returns structured data for client-side rendering:
// {
//   id: 'certificate-uuid',
//   type: 'course_completion',
//   template: {
//     id: 'template-uuid',
//     name: 'Professional Certificate',
//     layout: { /* layout configuration */ },
//     backgroundColor: '#FFFFFF',
//     textColor: '#000000',
//     accentColor: '#2D3748',
//     fontFamily: 'Helvetica',
//     signatures: []
//   },
//   data: {
//     userName: 'John Doe',
//     courseTitle: 'Advanced JavaScript',
//     completionDate: 'November 27, 2025',
//     verificationCode: 'CERT123456'
//   },
//   verificationUrl: '/api/certifications/verify/CERT123456',
//   issuedAt: '2025-11-27T...'
// }
```

## Security Considerations

- **File Upload Security**: Signature uploads are validated for file type and size
- **Access Control**: Template management requires admin authentication
- **File Storage**: Signature images are stored securely with proper permissions
- **Database Integrity**: Foreign key constraints ensure data consistency

## Performance Notes

- **Client-Side Rendering**: Certificate generation happens in the browser using HTML5 Canvas (zero server processing)
- **Image Loading**: Signature images loaded with proper CORS headers for Canvas rendering
- **Database Queries**: Template data is efficiently queried with proper indexing
- **No File Storage**: Eliminates need for file storage and cleanup (certificates rendered on-demand)
- **Template Caching**: Template data can be cached on the frontend for faster rendering

## Troubleshooting

### Common Issues

1. **Template Not Found**: Ensure template exists and is active
2. **Signature Images**: Verify images are uploaded correctly with proper CORS headers for Canvas rendering
3. **Canvas Rendering Errors**: Check browser Console for JavaScript errors in certificate viewer
4. **Layout Issues**: Verify that layout coordinates are within valid ranges (0-100)
5. **Font Issues**: Template fonts are rendered client-side; ensure browser supports specified fonts

### Debug Mode

Enable debug logging by setting `NODE_ENV=development` to see detailed template processing logs.

## Future Enhancements

- **Template Preview**: Real-time template preview in the admin interface using Canvas
- **Bulk Template Operations**: Apply templates to multiple certificates
- **Template Categories**: Organize templates by category or organization
- **Dynamic Content**: Support for conditional content based on certificate type
- **QR Codes**: Add QR codes linking to verification pages (Canvas API supports QR generation)
- **Multi-language Support**: Localized certificate text