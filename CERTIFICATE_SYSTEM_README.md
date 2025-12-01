# Certificate System Implementation

This document describes the comprehensive certificate creation and awarding system implemented for TheMobileProf Learning Platform.

## Key Changes (Client-Side Migration)

### Before (Server-Side PDF)
- ❌ Heavy dependencies (PDFKit, Cairo, Pango, Pixman, etc.)
- ❌ Server-side image generation
- ❌ Complex Docker builds with native libraries
- ❌ Static PDF files stored on server

### After (Client-Side Canvas)
- ✅ **Zero server dependencies** - pure JavaScript
- ✅ **Instant generation** in browser using HTML5 Canvas
- ✅ **Lightweight Docker builds** - no native libraries needed
- ✅ **Dynamic rendering** - certificates adapt to screen size
- ✅ **Enhanced UX** - print, download, share directly in browser

## Overview

The certificate system automatically generates and awards professional certificates to users upon completion of courses and classes. **Updated for client-side rendering** - certificates are now generated using HTML5 Canvas in the browser instead of server-side PDF generation.

## Architecture

### Core Components

1. **CertificateGenerator** (`src/utils/certificateGenerator.js`)
   - **UPDATED**: Now returns JSON data for client-side rendering
   - No more PDF generation - just data preparation
   - Lightweight data-only generation

2. **CertificateService** (`src/utils/certificateService.js`)
   - Business logic for certificate awarding
   - Automatic eligibility checking
   - Integration with course/class completion tracking
   - Email notification handling

3. **Certificate Viewer** (`docs/certificate-viewer.html`)
   - **NEW**: HTML5 Canvas-based certificate renderer
   - Professional design with print/download functionality
   - Client-side generation with Web Share API support

## Certificate Generation

### Client-Side Rendering Process

1. **Data Preparation**: Server provides JSON certificate data
2. **Canvas Rendering**: Browser draws certificate using HTML5 Canvas API
3. **User Interaction**: Print, download PNG, or share certificate
4. **No Server Processing**: All rendering happens client-side

### Certificate Data Structure

```javascript
// Certificate data returned by API
{
  "id": "uuid",
  "type": "course_completion",
  "data": {
    "userName": "John Doe",
    "courseTitle": "Advanced JavaScript Development",
    "classTitle": null,
    "completionDate": "December 1, 2025",
    "verificationCode": "CERT1A2B3C",
    "templateImageUrl": null
  },
  "verificationUrl": "/api/certifications/verify/CERT1A2B3C",
  "issuedAt": "2025-12-01T10:00:00.000Z"
}
```

### Canvas Design Features

- **Professional Layout**: A4 aspect ratio (794x1123px at 96 DPI)
- **Custom Branding**: TheMobileProf colors and typography
- **Responsive Rendering**: Scales properly on different devices
- **Print Optimization**: CSS print styles for physical certificates
- **Download Support**: PNG export functionality
- **Share Integration**: Web Share API with fallbacks

## Automatic Awarding

### Course Completion Certificates

Certificates are automatically awarded when:
- User completes all lessons in a course (progress = 100%)
- Course has certification enabled (`certification` field is not null)
- User hasn't already received a certificate for this course
- All required tests are passed (if applicable)

**Integration Point**: `updateCourseProgressFromLesson()` in `src/routes/lessons.js`

### Class Completion Certificates

Certificates are automatically awarded when:
- User completes a class (progress = 100%)
- Class has certification enabled
- User hasn't already received a certificate for this class

## API Endpoints

### Certificate Management

```
GET    /api/certifications              # List certificates (with filtering)
GET    /api/certifications/:id          # Get certificate data for client-side rendering
PUT    /api/certifications/:id          # Update certificate (admin/instructor)
DELETE /api/certifications/:id          # Delete certificate (admin/instructor)
GET    /api/certifications/verify/:code # Verify certificate by code
GET    /api/certifications/my           # Current user's certificates
GET    /api/certifications/:id/download # Download certificate (legacy - returns template URL if available)
GET    /api/certifications/:id/view     # NEW: HTML certificate viewer page
```

### Admin Operations

```
GET    /api/certifications/stats        # Certificate statistics
POST   /api/certifications/award        # Manually award certificate
GET    /api/certifications/eligibility/:userId # Check eligibility
POST   /api/certifications/bulk-award  # Bulk certificate awarding
```

## Certificate Viewer

### HTML Certificate Viewer

The new `/api/certifications/:id/view` endpoint serves an HTML page that:

- **Loads certificate data** via AJAX from `/api/certifications/:id`
- **Renders certificate** using HTML5 Canvas in real-time
- **Provides user actions**: Print, Download PNG, Share
- **Handles errors gracefully** with user-friendly messages
- **Works offline** once loaded (for print/download)

### Viewer Features

- **Professional Design**: Certificate-quality layout and typography
- **Print Support**: Optimized CSS for physical printing
- **Download PNG**: High-quality image export
- **Web Share API**: Native sharing on supported devices
- **Responsive**: Works on desktop, tablet, and mobile
- **Accessibility**: Proper alt text and semantic HTML

## Email Notifications

### Certificate Awarded Email

- **Template**: `certificate-awarded`
- **Triggers**: Automatic awarding or manual awarding
- **Content**:
  - Congratulations message
  - Certificate details (course title, verification code)
  - **UPDATED**: Link to certificate viewer instead of PDF download
  - Usage instructions for viewing/printing certificate

### Email Features

- **Responsive Design**: Mobile-friendly HTML templates
- **Security Notes**: Verification code importance
- **Action Buttons**: Direct link to certificate viewer
- **Professional Branding**: Consistent with platform design

## Verification System

### Certificate Verification

- **Public Endpoint**: `GET /api/certifications/verify/:code`
- **Features**:
  - Validates verification code
  - Checks certificate status and expiry
  - Returns certificate details without sensitive information
  - Public access (no authentication required)

### Verification Codes

- **Format**: `CERT` + 6 random alphanumeric characters
- **Uniqueness**: Guaranteed unique in database
- **Security**: Used for authenticity verification only

## Database Schema

### Certifications Table

```sql
CREATE TABLE certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  course_id UUID,           -- NULL for manual certificates
  class_id UUID,            -- NULL for course certificates
  certification_name VARCHAR(255) NOT NULL,
  issuer VARCHAR(255) NOT NULL,
  issued_date DATE NOT NULL,
  expiry_date DATE,         -- NULL for permanent certificates
  certificate_url TEXT,     -- Now used for template images (optional)
  verification_code VARCHAR(100) UNIQUE,
  status certification_status DEFAULT 'issued',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL
);
```

### Status Enum

```sql
CREATE TYPE certification_status AS ENUM ('issued', 'expired', 'revoked');
```

## Integration Points

### Course Completion Flow

1. User completes lessons → `updateCourseProgressFromLesson()`
2. Progress reaches 100% → Check certificate eligibility
3. **UPDATED**: Generate certificate data (not PDF) → Store in database
4. Send email notification → Create in-app notification

### Class Completion Flow

1. User completes class → Similar to course completion
2. Check class certification settings
3. Award certificate if eligible

### Manual Awarding

- **Admin Interface**: Award certificates for special achievements
- **Bulk Operations**: Award multiple certificates at once
- **Custom Certificates**: Certificates not tied to courses/classes

## Security Considerations

### Client-Side Security

- **Data Validation**: All certificate data validated server-side before sending
- **Authentication**: Certificate viewer requires authentication
- **Authorization**: Users can only view their own certificates
- **Verification**: Public verification endpoint returns limited data

### Canvas Security

- **No External Scripts**: All rendering happens in secure Canvas context
- **CORS Handling**: Template images loaded with proper CORS headers
- **Data Sanitization**: Certificate data sanitized to prevent XSS

## Performance Benefits

### Before vs After

| Aspect | Server-Side PDF | Client-Side Canvas |
|--------|----------------|-------------------|
| **Dependencies** | PDFKit, Cairo, Pango, Pixman, etc. | None (pure JavaScript) |
| **Docker Build** | 500MB+ with native libraries | ~50MB Alpine image |
| **Generation Time** | Server processing time | Instant (client-side) |
| **File Storage** | PDF files on server | No files needed |
| **Scalability** | Limited by server resources | Scales with browsers |
| **User Experience** | Download then view | Instant rendering |
| **Print Quality** | Fixed PDF resolution | Dynamic high-quality |

## Testing

### Test Script

Run certificate generation tests:

```bash
cd /home/samuel/sites/tmp-mixer/backend
node test-certificates.js
```

### Test Coverage

- Certificate data generation for courses and classes
- Verification code uniqueness
- Database operations
- **NEW**: Certificate viewer HTML page loading
- **NEW**: Canvas rendering verification

## Usage Examples

### Automatic Awarding

```javascript
// When course progress reaches 100%
await certificateService.checkAndAwardCourseCertificate(userId, courseId);
```

### Manual Awarding

```javascript
const certificate = await certificateService.manuallyAwardCertificate({
  userId: 'user-uuid',
  courseId: 'course-uuid',
  certificationName: 'Advanced React Development - Certificate of Completion',
  issuer: 'TheMobileProf Learning Platform',
  issuedDate: '2025-11-27'
});
```

### Client-Side Rendering

```javascript
// Load certificate data
const response = await fetch(`/api/certifications/${certificateId}`);
const certificateData = await response.json();

// Render in browser
const canvas = document.getElementById('certificate-canvas');
await renderCertificateOnCanvas(canvas, certificateData);
```

### Verification

```javascript
// GET /api/certifications/verify/CERT123ABC
{
  "valid": true,
  "certificate": {
    "userName": "John Doe",
    "certificationName": "Course Completion Certificate",
    "issuedDate": "2025-11-27",
    "status": "issued"
  }
}
```

## Frontend Integration

For complete frontend integration documentation, see:

- **[Frontend Certificate Integration Guide](FRONTEND_CERTIFICATE_INTEGRATION.md)** - Complete guide for integrating certificates into frontend applications

## Migration Notes

### From Server-Side to Client-Side

1. **Certificate URLs**: Now optional - used for template images only
2. **File Storage**: No more PDF file storage required
3. **API Responses**: Certificate data now includes nested `data` object for Canvas rendering
4. **Viewer Endpoint**: New `/view` endpoint serves HTML certificate viewer
5. **Dependencies**: Removed all PDF generation dependencies

### Backward Compatibility

- **Existing Certificates**: Still work with new system
- **Verification**: Public verification endpoint unchanged
- **API**: Core endpoints maintain compatibility
- **Database**: No schema changes required

## Future Enhancements

### Potential Features

1. **Certificate Templates**: Multiple design templates (client-side)
2. **Signature Support**: Digital signature integration in Canvas
3. **QR Codes**: QR codes linking to verification pages
4. **Bulk Printing**: Print multiple certificates
5. **Certificate Sharing**: Enhanced social media integration

### Performance Optimizations

1. **Canvas Optimization**: Use OffscreenCanvas for better performance
2. **Image Caching**: Cache template images in service worker
3. **Lazy Loading**: Load certificate data on demand
4. **Progressive Rendering**: Show certificate as it renders

## Troubleshooting

### Common Issues

1. **Canvas not rendering**: Check browser Canvas support
2. **Images not loading**: Verify CORS settings for template images
3. **Print not working**: Check browser print settings
4. **Download failing**: Verify Canvas.toDataURL() support

### Debug Mode

Enable debug logging by setting `NODE_ENV=development` to see detailed certificate processing logs.

## Conclusion

The certificate system now provides a modern, lightweight solution for recognizing learner achievements. The client-side Canvas approach eliminates server dependencies while providing a superior user experience with instant rendering, high-quality output, and native browser integration.</content>
<parameter name="filePath">/home/samuel/sites/tmp-mixer/backend/CERTIFICATE_SYSTEM_README.md