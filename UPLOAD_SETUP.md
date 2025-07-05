# File Upload System Setup Guide

This guide explains how to set up and use the file upload system in TheMobileProf LMS backend.

## Overview

The upload system provides endpoints for uploading various types of files:
- Screenshots and images (`/api/upload`)
- Course images (`/uploads/course-image`)
- Lesson materials (`/uploads/lesson-material`)
- User avatars (`/uploads/avatar`)
- Certificates (`/uploads/certificate`)

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Upload Configuration
UPLOAD_PATH=./uploads
UPLOAD_MAX_FILE_SIZE=26214400
API_BASE_URL=https://api.themobileprof.com
```

### Directory Structure

The system automatically creates these directories:
```
uploads/
├── screenshots/          # General images and screenshots
├── course-images/        # Course cover images
├── lesson-materials/     # Lesson files (PDFs, videos, etc.)
├── user-avatars/         # User profile pictures
├── certificates/         # Certificate files
└── question-images/      # Test question images (via test endpoints)
```

## Installation

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Create upload directories (automatically done by the server):
```bash
mkdir -p uploads/{screenshots,course-images,lesson-materials,user-avatars,certificates,question-images}
```

3. Set proper permissions:
```bash
chmod -R 755 uploads/
```

### Docker Deployment

The deployment is automated via GitHub Actions workflow. The uploads directory is automatically created and mapped during deployment.

**Important**: The uploads directory is mapped to `/var/www/api.themobileprof.com/uploads` on the server, ensuring files persist across deployments.

#### Manual Setup (if needed)

If you need to manually set up the uploads directory:

```bash
# Create uploads directory
sudo mkdir -p /var/www/api.themobileprof.com/uploads
sudo chown -R $USER:$USER /var/www/api.themobileprof.com/uploads
sudo chmod -R 755 /var/www/api.themobileprof.com/uploads
```

#### Deployment Process

1. **Automatic**: GitHub Actions handles the deployment
2. **Volume Mapping**: `-v "/var/www/api.themobileprof.com/uploads:/app/uploads"`
3. **Persistence**: Files survive container restarts and deployments

## Usage

### Upload Screenshots/Images

```bash
curl -X POST http://localhost:3000/api/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@screenshot.png"
```

### Upload Course Image

```bash
curl -X POST http://localhost:3000/uploads/course-image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@course-image.jpg"
```

### Upload Lesson Material

```bash
curl -X POST http://localhost:3000/uploads/lesson-material \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@lesson-notes.pdf"
```

### Upload User Avatar

```bash
curl -X POST http://localhost:3000/uploads/avatar \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "avatar=@profile-pic.jpg"
```

### Upload Certificate

```bash
curl -X POST http://localhost:3000/uploads/certificate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "certificate=@certificate.pdf"
```

### Delete File

```bash
curl -X DELETE "http://localhost:3000/api/upload/filename.png?type=screenshots" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### List Files (Admin Only)

```bash
curl -X GET http://localhost:3000/api/upload/files \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

## File Type Support

### Images
- **Formats**: JPEG, JPG, PNG, GIF, WebP
- **Max Size**: 5MB
- **Use Cases**: Screenshots, course images, avatars, certificates

### Documents
- **Formats**: PDF, DOC, DOCX, TXT
- **Max Size**: 10MB
- **Use Cases**: Lesson materials, certificates

### Videos
- **Formats**: MP4, WebM, OGG
- **Max Size**: 10MB
- **Use Cases**: Lesson materials

## Security Features

1. **File Type Validation**: Only allowed MIME types are accepted
2. **File Size Limits**: Prevents large file uploads
3. **Unique Filenames**: UUID-based naming prevents conflicts
4. **Authentication Required**: All endpoints require valid JWT tokens
5. **Admin-Only Operations**: File listing restricted to admins

## Testing

Run the test script to verify upload functionality:

```bash
# Set your test token
export TEST_TOKEN="your-jwt-token-here"

# Run tests
node test-upload.js
```

## Production Considerations

### File Storage
For production, consider:
- Using cloud storage (AWS S3, Google Cloud Storage)
- Implementing CDN for faster file delivery
- Setting up backup strategies
- **Volume Persistence**: The GitHub Actions deployment automatically maps `/var/www/api.themobileprof.com/uploads:/app/uploads` to persist files across container restarts

### Security
- Implement virus scanning for uploaded files
- Add file content validation
- Consider implementing file ownership tracking
- Set up monitoring for upload patterns

### Performance
- Configure proper caching headers
- Implement image optimization
- Consider using streaming for large files

## Troubleshooting

### Common Issues

1. **"No file uploaded" error**
   - Ensure the file field name matches the endpoint requirements
   - Check that the file is actually being sent

2. **"Invalid file type" error**
   - Verify the file format is supported
   - Check the file's MIME type

3. **"File too large" error**
   - Reduce file size or increase limits in configuration
   - Consider compressing images before upload

4. **Permission denied errors**
   - Check upload directory permissions
   - Ensure the server process has write access

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
DEBUG=upload:*
```

## API Reference

For complete API documentation, see `API_DOCUMENTATION.md` in the project root.

## Support

If you encounter issues:
1. Check the server logs for error messages
2. Verify your configuration settings
3. Test with the provided test script
4. Review the API documentation for endpoint details 