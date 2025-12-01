# Frontend Certificate Integration Guide

This guide provides comprehensive documentation for frontend developers integrating with TheMobileProf's client-side certificate system.

## Overview

The certificate system has been redesigned to use **client-side HTML5 Canvas rendering** instead of server-side PDF generation. This eliminates heavy dependencies and enables:

- ⚡ **Instant certificate generation** in the browser
- 📱 **Responsive design** that works on all devices
- 🖨️ **Native print and download** functionality
- 🔗 **Easy sharing** via Web Share API
- 🎨 **Customizable designs** without server changes

## Architecture

### Client-Side Rendering Flow

1. **Certificate Data**: Server provides JSON data via `/api/certifications/:id`
2. **HTML5 Canvas**: Browser renders certificate using Canvas API
3. **User Actions**: Print, download PNG, or share certificate
4. **Verification**: Public verification via `/api/certifications/verify/:code`

### Key Components

- **Certificate Viewer**: `docs/certificate-viewer.html` - Standalone HTML page
- **API Endpoints**: RESTful endpoints for certificate data
- **Canvas Rendering**: JavaScript-based certificate generation
- **Verification System**: Public certificate verification

## API Integration

### Get Certificate Data

```javascript
// Fetch certificate data for rendering
const response = await fetch(`/api/certifications/${certificateId}`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const certificateData = await response.json();
```

**Response Format:**
```json
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
  "issuedAt": "2025-12-01T10:00:00.000Z",
  "userId": "uuid",
  "userEmail": "john@example.com",
  "certificationName": "Course Completion Certificate",
  "issuer": "TheMobileProf Learning Platform",
  "expiryDate": null,
  "status": "issued",
  "courseId": "uuid",
  "classId": null,
  "createdAt": "2025-12-01T10:00:00.000Z"
}
```

### Certificate Viewer Integration

#### Option 1: Direct Link to Viewer

```javascript
// Redirect user to certificate viewer
window.location.href = `/api/certifications/${certificateId}/view`;
```

#### Option 2: Embed Viewer in Your App

```html
<!-- Embed the certificate viewer in an iframe -->
<iframe
  src="/api/certifications/${certificateId}/view"
  width="100%"
  height="800px"
  frameborder="0">
</iframe>
```

#### Option 3: Custom Integration

```javascript
// Load certificate data and render in your own canvas
async function loadCertificate(certificateId) {
  const response = await fetch(`/api/certifications/${certificateId}`);
  const data = await response.json();

  // Render certificate using your own Canvas implementation
  renderCertificate(data);
}
```

## Certificate Rendering

### HTML5 Canvas Implementation

The certificate viewer uses HTML5 Canvas for professional rendering:

```javascript
async function generateCertificate(data) {
  const canvas = document.getElementById('certificate-canvas');
  const ctx = canvas.getContext('2d');

  // Set canvas size (A4 aspect ratio)
  canvas.width = 794;  // ~210mm at 96 DPI
  canvas.height = 1123; // ~297mm at 96 DPI

  // Draw background
  await drawBackground(ctx, canvas, data);

  // Draw certificate content
  drawContent(ctx, canvas, data);

  // Update UI details
  updateCertificateDetails(data);
}
```

### Certificate Layout

The certificate follows a professional layout:

- **Header**: "CERTIFICATE OF COMPLETION" title
- **Recipient**: Large, centered student name
- **Achievement**: "has successfully completed the course"
- **Course Title**: Prominent course name
- **Date**: "Completed on [formatted date]"
- **Verification**: Code at bottom
- **Signatures**: Space for instructor signatures (future)

### Styling Features

- **Fonts**: Professional typography (Times New Roman, serif)
- **Colors**: TheMobileProf brand colors
- **Borders**: Decorative borders and backgrounds
- **Responsive**: Scales properly on different screen sizes

## User Actions

### Print Certificate

```javascript
function printCertificate() {
  window.print();
}

// Or with custom print styles
@media print {
  .actions, .verification-info {
    display: none;
  }
  .certificate-canvas {
    width: 100%;
    height: auto;
  }
}
```

### Download as PNG

```javascript
function downloadCertificate() {
  const canvas = document.getElementById('certificate-canvas');
  const link = document.createElement('a');

  link.download = `certificate-${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
```

### Share Certificate

```javascript
async function shareCertificate() {
  const canvas = document.getElementById('certificate-canvas');

  if (navigator.share && navigator.canShare) {
    // Use Web Share API
    canvas.toBlob(async (blob) => {
      const file = new File([blob], 'certificate.png', { type: 'image/png' });
      try {
        await navigator.share({
          title: 'My Certificate',
          text: 'Check out my course completion certificate!',
          files: [file]
        });
      } catch (error) {
        // Fallback to download
        downloadCertificate();
      }
    });
  } else {
    // Fallback for browsers without Web Share API
    downloadCertificate();
  }
}
```

## Verification System

### Public Verification

```javascript
// Verify certificate authenticity (public endpoint)
const response = await fetch(`/api/certifications/verify/${verificationCode}`);
const result = await response.json();

console.log('Certificate valid:', result.valid);
console.log('Details:', result.certificate);
```

**Verification Response:**
```json
{
  "valid": true,
  "certificate": {
    "id": "uuid",
    "userName": "John Doe",
    "certificationName": "Course Completion Certificate",
    "issuer": "TheMobileProf Learning Platform",
    "issuedDate": "2025-12-01T10:00:00.000Z",
    "expiryDate": null,
    "status": "issued",
    "courseTitle": "Advanced JavaScript Development",
    "classTitle": null,
    "isExpired": false
  }
}
```

### Verification URL

Each certificate includes a verification URL:
```
https://yourapp.com/api/certifications/verify/CERT1A2B3C
```

## Certificate Management

### List User Certificates

```javascript
const response = await fetch('/api/certifications/my', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const { certifications } = await response.json();

// Display certificates in UI
certifications.forEach(cert => {
  console.log(`${cert.title} - ${cert.dateEarned}`);
  console.log(`Verification: ${cert.credentialId}`);
});
```

### Certificate Actions

```javascript
// View certificate
function viewCertificate(certificateId) {
  window.open(`/api/certifications/${certificateId}/view`, '_blank');
}

// Download certificate (if file exists)
async function downloadCertificate(certificateId) {
  const response = await fetch(`/api/certifications/${certificateId}/download`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const { url } = await response.json();
  window.open(url, '_blank');
}
```

## Error Handling

### Certificate Loading Errors

```javascript
async function loadCertificate(certificateId) {
  try {
    const response = await fetch(`/api/certifications/${certificateId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      if (response.status === 404) {
        showError('Certificate not found');
      } else if (response.status === 403) {
        showError('Access denied');
      } else {
        showError('Failed to load certificate');
      }
      return;
    }

    const certificateData = await response.json();
    await generateCertificate(certificateData);

  } catch (error) {
    console.error('Error loading certificate:', error);
    showError('Network error - please try again');
  }
}
```

### Canvas Rendering Errors

```javascript
function drawCertificateContent(ctx, canvas, data) {
  try {
    // Certificate rendering logic
    ctx.fillText(data.data.userName, centerX, nameY);
  } catch (error) {
    console.error('Canvas rendering error:', error);
    showError('Failed to render certificate');
  }
}
```

## Browser Compatibility

### Supported Features

- **HTML5 Canvas**: All modern browsers
- **ES6+ JavaScript**: Modern browser support
- **Web Share API**: Chrome, Edge, Safari (with fallbacks)
- **Download API**: All modern browsers
- **Print API**: All browsers with print support

### Fallbacks

```javascript
// Check for required features
function checkBrowserSupport() {
  const canvas = document.createElement('canvas');
  const hasCanvas = !!(canvas.getContext && canvas.getContext('2d'));

  if (!hasCanvas) {
    showError('Your browser does not support certificate rendering. Please update to a modern browser.');
    return false;
  }

  return true;
}
```

## Performance Optimization

### Canvas Optimization

```javascript
// Use OffscreenCanvas for better performance (if available)
function createCanvas() {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(794, 1123);
  } else {
    const canvas = document.createElement('canvas');
    canvas.width = 794;
    canvas.height = 1123;
    return canvas;
  }
}
```

### Image Loading

```javascript
// Preload template images
async function loadTemplateImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
```

## Security Considerations

### Certificate Data

- **Authentication**: All certificate data endpoints require authentication
- **Authorization**: Users can only access their own certificates (admins can access all)
- **Data Exposure**: Certificate data is sanitized before sending to client

### Verification Security

- **Public Access**: Verification endpoint is public but returns limited data
- **Code Validation**: Verification codes are validated server-side
- **Rate Limiting**: Consider implementing rate limiting for verification endpoints

## Testing

### Unit Tests

```javascript
// Test certificate data fetching
describe('Certificate API', () => {
  test('should fetch certificate data', async () => {
    const response = await fetch('/api/certifications/test-id');
    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data.data.userName).toBeDefined();
    expect(data.data.verificationCode).toBeDefined();
  });
});
```

### Integration Tests

```javascript
// Test full certificate rendering flow
describe('Certificate Rendering', () => {
  test('should render certificate on canvas', async () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const mockData = {
      data: {
        userName: 'Test User',
        courseTitle: 'Test Course',
        completionDate: 'December 1, 2025',
        verificationCode: 'TEST123'
      }
    };

    await generateCertificate(mockData);

    // Verify canvas has content
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    expect(imageData.data.some(pixel => pixel > 0)).toBe(true);
  });
});
```

## Troubleshooting

### Common Issues

1. **Canvas not rendering**: Check browser support and canvas context
2. **Images not loading**: Verify CORS settings for template images
3. **Print not working**: Check browser print settings and CSS
4. **Download failing**: Verify blob creation and download API support

### Debug Mode

```javascript
// Enable debug logging
const DEBUG = true;

function debugLog(message, data) {
  if (DEBUG) {
    console.log(`[Certificate] ${message}`, data);
  }
}
```

## Future Enhancements

### Planned Features

- **Custom Templates**: User-selectable certificate designs
- **Signature Support**: Digital signature integration
- **QR Codes**: QR codes linking to verification
- **Social Sharing**: Enhanced sharing options
- **Certificate Templates**: Admin-configurable designs

### API Extensions

- **Template Management**: CRUD operations for certificate templates
- **Bulk Operations**: Generate multiple certificates
- **Certificate History**: Track certificate versions
- **Analytics**: Certificate usage statistics

## Support

For questions or issues with certificate integration:

1. Check browser console for JavaScript errors
2. Verify API responses match expected format
3. Test with different browsers and devices
4. Review network requests for failed API calls

## Examples

### Complete Certificate Component

```javascript
class CertificateViewer extends React.Component {
  constructor(props) {
    super(props);
    this.canvasRef = React.createRef();
    this.state = { loading: true, error: null };
  }

  async componentDidMount() {
    try {
      const response = await fetch(`/api/certifications/${this.props.certificateId}`, {
        headers: { 'Authorization': `Bearer ${this.props.token}` }
      });

      if (!response.ok) throw new Error('Failed to load certificate');

      const data = await response.json();
      await this.renderCertificate(data);

      this.setState({ loading: false });
    } catch (error) {
      this.setState({ loading: false, error: error.message });
    }
  }

  async renderCertificate(data) {
    const canvas = this.canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Certificate rendering logic here
    // ... (implementation details)

    this.setState({ certificateData: data });
  }

  handleDownload = () => {
    const canvas = this.canvasRef.current;
    const link = document.createElement('a');
    link.download = 'certificate.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  render() {
    const { loading, error } = this.state;

    if (loading) return <div>Loading certificate...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
      <div className="certificate-container">
        <canvas ref={this.canvasRef} className="certificate-canvas" />
        <div className="certificate-actions">
          <button onClick={this.handleDownload}>Download PNG</button>
          <button onClick={() => window.print()}>Print</button>
        </div>
      </div>
    );
  }
}
```

This guide provides everything needed to integrate certificates into your frontend application. The client-side approach ensures fast, reliable certificate generation without server-side dependencies.</content>
<parameter name="filePath">/home/samuel/sites/tmp-mixer/backend/FRONTEND_CERTIFICATE_INTEGRATION.md