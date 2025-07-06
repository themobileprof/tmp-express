const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const courseRoutes = require('./routes/courses');
const sponsorshipRoutes = require('./routes/sponsorships');
const sponsorshipOpportunityRoutes = require('./routes/sponsorshipOpportunities');
const classRoutes = require('./routes/classes');
const lessonRoutes = require('./routes/lessons');
const testRoutes = require('./routes/tests');
const discussionRoutes = require('./routes/discussions');
const certificationRoutes = require('./routes/certifications');
const settingsRoutes = require('./routes/settings');
const paymentRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');
const scrapingRoutes = require('./routes/scraping');
const notificationRoutes = require('./routes/notifications');
const uploadRoutes = require('./routes/upload');

const { errorHandler } = require('./middleware/errorHandler');
const { authenticateToken } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Static file serving for uploads
const uploadPath = (process.env.UPLOAD_PATH || './uploads').trim();
const resolvedUploadPath = path.resolve(uploadPath);
console.log('🌐 Static file serving for uploads:', uploadPath);
console.log('🌐 Resolved upload path:', resolvedUploadPath);
// app.use('/uploads', express.static(resolvedUploadPath)); // Commented out so Nginx can serve static files

// Logging middleware
app.use(morgan('combined'));

// Enhanced error logging middleware
app.use((err, req, res, next) => {
  console.error('🚨 Error occurred:', {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id,
    error: {
      message: err.message,
      stack: err.stack,
      code: err.code,
      status: err.status
    }
  });
  next(err);
});

// Request logging for debugging
app.use((req, res, next) => {
  // Log all requests in production, especially upload-related ones
  if (process.env.NODE_ENV === 'production' || req.url.startsWith('/uploads')) {
    console.log('📝 Request:', {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id
    });
  }
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API landing page
app.get('/', (req, res) => {
  // Check if request wants JSON (API client) or HTML (browser)
  const wantsJson = req.headers.accept && req.headers.accept.includes('application/json');
  
  if (wantsJson) {
    // Return JSON for API clients
    res.status(200).json({
      name: 'TheMobileProf LMS API',
      version: '1.0.0',
      description: 'Learning Management System Backend API',
      status: 'running',
      timestamp: new Date().toISOString(),
      endpoints: {
        health: '/health',
        api: '/api',
        auth: '/api/auth',
        users: '/api/users',
        courses: '/api/courses',
        classes: '/api/classes',
        tests: '/api/tests',
        sponsorships: '/api/sponsorships',
        payments: '/api/payments',
        discussions: '/api/discussions',
        certifications: '/api/certifications',
        admin: '/api/admin',
        scraping: '/api/scraping'
      },
      documentation: 'https://github.com/your-username/themobileprof-backend',
      support: 'support@themobileprof.com'
    });
  } else {
    // Return HTML for browser requests
    res.status(200).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TheMobileProf LMS API</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            line-height: 1.6;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 3rem;
            padding-bottom: 2rem;
            border-bottom: 2px solid #e1e5e9;
          }
          .status {
            display: inline-block;
            background: #28a745;
            color: white;
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            font-size: 0.875rem;
            font-weight: 500;
          }
          .endpoints {
            background: #f8f9fa;
            padding: 1.5rem;
            border-radius: 8px;
            margin: 2rem 0;
          }
          .endpoint {
            margin: 0.5rem 0;
            font-family: 'Monaco', 'Menlo', monospace;
            color: #0066cc;
          }
          .info {
            background: #e7f3ff;
            padding: 1rem;
            border-radius: 6px;
            border-left: 4px solid #0066cc;
            margin: 1rem 0;
          }
          .footer {
            margin-top: 3rem;
            padding-top: 2rem;
            border-top: 1px solid #e1e5e9;
            text-align: center;
            color: #666;
            font-size: 0.875rem;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🚀 TheMobileProf LMS API</h1>
          <p>Learning Management System Backend API</p>
          <span class="status">Running</span>
        </div>
        
        <div class="info">
          <strong>API Status:</strong> The API is running successfully. Use the endpoints below to interact with the system.
        </div>
        
        <h2>Available Endpoints</h2>
        <div class="endpoints">
          <div class="endpoint">GET /health - Health check</div>
          <div class="endpoint">POST /api/auth/register - User registration</div>
          <div class="endpoint">POST /api/auth/login - User login</div>
          <div class="endpoint">POST /api/auth/admin/login - Admin login</div>
          <div class="endpoint">GET /api/courses - List courses</div>
          <div class="endpoint">GET /api/classes - List classes</div>
          <div class="endpoint">GET /api/sponsorships - List sponsorships</div>
          <div class="endpoint">POST /api/payments/initialize - Initialize payment</div>
          <div class="endpoint">GET /api/discussions - List discussions</div>
          <div class="endpoint">GET /api/certifications - List certifications</div>
          <div class="endpoint">GET /api/admin/users - Admin: List users</div>
          <div class="endpoint">GET /api/admin/courses - Admin: List courses</div>
          <div class="endpoint">GET /api/admin/classes - Admin: List classes</div>
          <div class="endpoint">GET /api/admin/sponsorships - Admin: List sponsorships</div>
          <div class="endpoint">GET /api/admin/discussions - Admin: List discussions</div>
          <div class="endpoint">GET /api/admin/certifications - Admin: List certifications</div>
          <div class="endpoint">GET /api/admin/payments - Admin: Payment history</div>
          <div class="endpoint">GET /api/admin/stats/overview - Admin: System overview</div>
          <div class="endpoint">GET /api/admin/stats/users - Admin: User statistics</div>
          <div class="endpoint">GET /api/admin/stats/courses - Admin: Course statistics</div>
          <div class="endpoint">GET /api/admin/stats/revenue - Admin: Revenue statistics</div>
          <div class="endpoint">GET /api/admin/settings - Admin: System settings</div>
        </div>
        
        <div class="info">
          <strong>Authentication:</strong> Most endpoints require JWT authentication. Include your token in the Authorization header: <code>Authorization: Bearer YOUR_TOKEN</code>
        </div>
        
        <div class="footer">
          <p>Version 1.0.0 | <a href="https://github.com/your-username/themobileprof-backend">Documentation</a> | <a href="mailto:support@themobileprof.com">Support</a></p>
          <p>Last updated: ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `);
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/sponsorships', sponsorshipRoutes);
app.use('/api/sponsorship-opportunities', sponsorshipOpportunityRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/lessons', authenticateToken, lessonRoutes);
app.use('/api/tests', authenticateToken, testRoutes);
app.use('/api/discussions', discussionRoutes);
app.use('/api/certifications', authenticateToken, certificationRoutes);
app.use('/api/settings', authenticateToken, settingsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/scraping', scrapingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/upload', uploadRoutes);

// Debug endpoints (must be defined before /uploads route to avoid conflicts)
app.get('/debug/uploads', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const uploadDir = resolvedUploadPath;
    const screenshotsDir = path.join(uploadDir, 'screenshots');
    
    const uploadExists = fs.existsSync(uploadDir);
    const screenshotsExists = fs.existsSync(screenshotsDir);
    
    let uploadContents = [];
    let screenshotsContents = [];
    
    if (uploadExists) {
      uploadContents = fs.readdirSync(uploadDir);
    }
    
    if (screenshotsExists) {
      screenshotsContents = fs.readdirSync(screenshotsDir).slice(0, 10); // First 10 files
    }
    
    res.json({
      uploadPath: uploadPath,
      resolvedUploadPath: resolvedUploadPath,
      uploadExists: uploadExists,
      screenshotsExists: screenshotsExists,
      uploadContents: uploadContents,
      screenshotsContents: screenshotsContents,
      cwd: process.cwd()
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
});

// Test endpoint to serve a specific file
app.get('/test-upload/:filename', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const filename = req.params.filename;
    const filePath = path.join(resolvedUploadPath, 'screenshots', filename);
    
    console.log('🔍 Testing file access:', {
      filename: filename,
      filePath: filePath,
      exists: fs.existsSync(filePath)
    });
    
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({
        error: 'File not found',
        filename: filename,
        filePath: filePath,
        uploadPath: resolvedUploadPath
      });
    }
  } catch (error) {
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
});

// app.use('/uploads', uploadRoutes); // Commented out so Nginx can serve static files

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 TheMobileProf Backend API server running on port ${PORT}`);
  console.log(`📊 Health check available at http://localhost:${PORT}/health`);
  console.log(`🔗 API documentation: http://localhost:${PORT}/api`);
});

module.exports = app; 