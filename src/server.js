const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Swagger UI imports
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

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
const uploadRoutes = require('./routes/uploads');
const searchRoutes = require('./routes/search');
const metaRoutes = require('./routes/meta');
const certificationProgramRoutes = require('./routes/certificationPrograms');

const { errorHandler } = require('./middleware/errorHandler');
const { authenticateToken } = require('./middleware/auth');
const { getSystemSetting } = require('./utils/systemSettings');
const maintenanceMiddleware = require('./middleware/maintenance');

const app = express();
const PORT = process.env.PORT || 3000;

// Load OpenAPI specification
const openApiSpec = YAML.load(path.join(__dirname, '../docs/openapi/openapi.yaml'));

// Trust proxy configuration for rate limiting
app.set('trust proxy', 1);

// Security middleware with custom CSP for uploads
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "http://localhost:3000", "http://localhost:8080"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
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

// Upload routes (must come before JSON parser to handle multipart data)
app.use('/api/uploads', uploadRoutes); // Standard upload endpoint

// Swagger UI Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'TheMobileProf API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    docExpansion: 'list',
    filter: true,
    showRequestHeaders: true,
    tryItOutEnabled: true
  }
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Static file serving for uploads (conditional based on environment)
const uploadPath = (process.env.UPLOAD_PATH || './uploads').trim();
const resolvedUploadPath = path.resolve(uploadPath);
console.log('🌐 Upload path configured:', uploadPath);
console.log('🌐 Resolved upload path:', resolvedUploadPath);

// Only serve static files in development (let Nginx handle in production)
if (process.env.NODE_ENV !== 'production') {
  console.log('🌐 Static file serving enabled (development mode)');
  
  app.use('/uploads', (req, res, next) => {
    // Set CORS headers for static files
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    next();
  }, express.static(resolvedUploadPath));
} else {
  console.log('🌐 Static file serving disabled (production mode - Nginx will handle)');
  
  // In production, just handle CORS preflight for uploads
  app.use('/uploads', (req, res, next) => {
    // Set CORS headers for preflight requests only
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    // In production, let Nginx handle the actual file serving
    next();
  });
}

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

// Maintenance mode (before most routes)
app.use(maintenanceMiddleware);

// Redirect root to API documentation
app.get('/', (req, res) => {
  res.redirect('/api-docs');
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
app.use('/api/search', searchRoutes);
app.use('/api/meta', metaRoutes);
app.use('/api/certification-programs', certificationProgramRoutes);

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
  console.log(`🔗 API documentation: http://localhost:${PORT}/api-docs`);
});

module.exports = app; 