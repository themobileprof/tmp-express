# Certificate System Implementation

This document describes the comprehensive certificate creation and awarding system implemented for TheMobileProf Learning Platform.

## Overview

The certificate system automatically generates and awards professional PDF certificates to users upon completion of courses and classes. The system includes:

- **Automatic Certificate Generation**: PDF certificates with professional design
- **Course Completion Awards**: Certificates for course completion with test passing
- **Class Attendance Awards**: Certificates for class completion
- **Verification System**: Unique verification codes for certificate authenticity
- **Email Notifications**: Automated email notifications with download links
- **Admin Management**: Manual certificate awarding and bulk operations

## Architecture

### Core Components

1. **CertificateGenerator** (`src/utils/certificateGenerator.js`)
   - Generates professional PDF certificates using PDFKit
   - Supports both course completion and class attendance certificates
   - Handles file storage and URL generation

2. **CertificateService** (`src/utils/certificateService.js`)
   - Business logic for certificate awarding
   - Automatic eligibility checking
   - Integration with course/class completion tracking
   - Email notification handling

3. **Database Integration**
   - Uses existing `certifications` table
   - Stores certificate metadata, verification codes, and file URLs
   - Supports certificate status tracking (issued, expired, revoked)

## Certificate Generation

### PDF Design Features

- **Professional Layout**: Landscape A4 format with decorative borders
- **Custom Branding**: TheMobileProf branding and colors
- **Security Elements**: Unique verification codes for authenticity
- **Recipient Information**: User name, course/class title, completion date
- **Instructor Details**: Course instructor or class facilitator information

### File Storage

- **Location**: `uploads/certificates/`
- **Naming**: `certificate-{uuid}.pdf` or `class-certificate-{uuid}.pdf`
- **URLs**: Served via `/uploads/certificates/{filename}`

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
GET    /api/certifications/:id          # Get certificate details
PUT    /api/certifications/:id          # Update certificate (admin/instructor)
DELETE /api/certifications/:id          # Delete certificate (admin/instructor)
GET    /api/certifications/verify/:code # Verify certificate by code
GET    /api/certifications/my           # Current user's certificates
GET    /api/certifications/:id/download # Download certificate PDF
```

### Admin Operations

```
GET    /api/certifications/stats        # Certificate statistics
POST   /api/certifications/award        # Manually award certificate
GET    /api/certifications/eligibility/:userId # Check eligibility
POST   /api/certifications/bulk-award  # Bulk certificate awarding
```

## Email Notifications

### Certificate Awarded Email

- **Template**: `certificate-awarded`
- **Triggers**: Automatic awarding or manual awarding
- **Content**:
  - Congratulations message
  - Certificate details (course title, verification code)
  - Download and verification links
  - Usage instructions

### Email Features

- **Responsive Design**: Mobile-friendly HTML templates
- **Security Notes**: Verification code importance
- **Action Buttons**: Direct download and verification links
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
  certificate_url TEXT,     -- Path to PDF file
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
3. Generate PDF certificate → Store in database
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

### File Access

- Certificates stored in protected uploads directory
- Access controlled by user ownership or admin role
- Public verification endpoint for authenticity checks

### Verification Codes

- Unique per certificate
- Used only for verification, not authentication
- Cannot be used to access other user data

### Data Protection

- Certificate URLs not exposed in public APIs
- Verification endpoint returns limited information
- Proper foreign key constraints for data integrity

## Testing

### Test Script

Run certificate generation tests:

```bash
cd /home/samuel/sites/tmp-mixer/backend
node test-certificates.js
```

### Test Coverage

- PDF generation for courses and classes
- Verification code uniqueness
- Database operations
- File storage and URLs

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

## Future Enhancements

### Potential Features

1. **Certificate Templates**: Multiple design templates
2. **Digital Signatures**: Cryptographic signing of certificates
3. **Blockchain Verification**: Immutable certificate records
4. **Bulk Printing**: Physical certificate printing support
5. **Certificate Sharing**: Social media integration
6. **Expiry Management**: Automatic expiry notifications
7. **Certificate Renewal**: Renewal workflow for expired certificates

### Performance Optimizations

1. **Background Processing**: Move PDF generation to background jobs
2. **CDN Integration**: Serve certificates from CDN
3. **Caching**: Cache verification results
4. **Batch Operations**: Optimize bulk certificate awarding

## Troubleshooting

### Common Issues

1. **PDF Generation Fails**: Check PDFKit installation and file permissions
2. **Email Not Sent**: Verify email configuration and user settings
3. **Verification Fails**: Check verification code format and database
4. **File Not Found**: Ensure uploads directory exists and is writable

### Logs and Monitoring

- Certificate awarding events logged to console
- Email sending status tracked in `email_logs` table
- File generation errors handled gracefully
- Database operations include error handling

## Conclusion

The certificate system provides a complete solution for recognizing learner achievements with professional, verifiable certificates. The automatic awarding system ensures timely recognition while the manual options provide flexibility for special cases. The verification system maintains certificate integrity and trustworthiness.</content>
<parameter name="filePath">/home/samuel/sites/tmp-mixer/backend/CERTIFICATE_SYSTEM_README.md