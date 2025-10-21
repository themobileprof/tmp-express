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

// Create development-specific spec without auth endpoints
const createDevSpec = (spec) => {
  const devSpec = JSON.parse(JSON.stringify(spec));
  
  // Remove auth paths from development spec
  if (devSpec.paths) {
    delete devSpec.paths['/api/auth/login'];
    delete devSpec.paths['/api/auth/register'];
    delete devSpec.paths['/api/auth/google'];
    delete devSpec.paths['/api/auth/verify-email'];
    delete devSpec.paths['/api/auth/resend-verification'];
    delete devSpec.paths['/api/auth/forgot-password'];
    delete devSpec.paths['/api/auth/reset-password'];
    delete devSpec.paths['/api/auth/refresh-token'];
    delete devSpec.paths['/api/auth/logout'];
  }
  
  // Add note about dev token tool
  if (devSpec.info) {
    devSpec.info.description = (devSpec.info.description || '') + '\n\n**🔧 Development Note**: Authentication endpoints are hidden in development. Use `/dev/token/:email` to generate JWT tokens for testing.';
  }
  
  return devSpec;
};

const devSpec = createDevSpec(openApiSpec);

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
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:8080',
      'https://lms.themobileprof.com',
      'https://api.themobileprof.com'
    ];

    // In development, allow localhost origins
    if (process.env.NODE_ENV !== 'production') {
      allowedOrigins.push('http://localhost:3000', 'http://localhost:8080');
    }

    // Check if the origin is in the allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Allow if FRONTEND_URL environment variable is set and matches
    if (process.env.FRONTEND_URL && process.env.FRONTEND_URL === origin) {
      return callback(null, true);
    }
    
    // Allow all origins in development or if CORS_ORIGIN is set to '*'
    if (process.env.NODE_ENV !== 'production' || process.env.CORS_ORIGIN === '*') {
      return callback(null, true);
    }

    // Reject the request
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));

// Rate limiting configuration
// General API rate limiter - generous for normal application usage
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000, // 1 minute default
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 500, // 500 requests per minute default
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

// Strict rate limiter for authentication endpoints (prevent brute force)
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes default
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || 10, // 10 requests per 15 minutes default
  message: {
    error: 'Too many authentication attempts from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Moderate rate limiter for payment endpoints
const paymentLimiter = rateLimit({
  windowMs: parseInt(process.env.PAYMENT_RATE_LIMIT_WINDOW_MS) || 60 * 1000, // 1 minute default
  max: parseInt(process.env.PAYMENT_RATE_LIMIT_MAX_REQUESTS) || 20, // 20 requests per minute default
  message: {
    error: 'Too many payment requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply general rate limiter to all API routes
app.use('/api/', generalLimiter);

// Upload routes (must come before JSON parser to handle multipart data)
app.use('/api/uploads', uploadRoutes); // Standard upload endpoint

// Serve OpenAPI docs directory for $ref resolution
app.use('/docs/openapi', express.static(path.join(__dirname, '../docs/openapi')));

// Swagger UI Documentation (load spec via URL so $refs resolve)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(null, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'TheMobileProf API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    url: '/docs/openapi/openapi.yaml',
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
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
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
    res.header('Access-Control-Allow-Origin', 'https://lms.themobileprof.com');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
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

// Google Identity Assertion endpoint for FedCM
app.get('/.well-known/identity-assertion', (req, res) => {
  res.status(200).json({
    "provider_urls": [
      "https://accounts.google.com"
    ]
  });
});


// Development-only token generation tool
if (process.env.NODE_ENV === 'development') {
  // List available users for token generation
  app.get('/dev/users', async (req, res) => {
    try {
      // Only allow localhost and specific dev IPs
      const allowedIPs = ['127.0.0.1', '::1', 'localhost'];
      const clientIP = req.ip || req.connection.remoteAddress;
      
      if (!allowedIPs.includes(clientIP) && !clientIP.startsWith('192.168.') && !clientIP.startsWith('10.0.')) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'This endpoint is only available from localhost and development networks',
          clientIP: clientIP
        });
      }
      
      // Get all active users from database
      const { query } = require('./database/config');
      const result = await query(
        'SELECT id, email, first_name, last_name, role, is_active, created_at FROM users WHERE is_active = true ORDER BY created_at DESC'
      );
      
      res.json({
        success: true,
        message: 'Available users for development token generation',
        users: result.rows.map(user => ({
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          createdAt: user.created_at
        })),
        note: 'Use /dev/token/:email to generate a JWT token for any of these users'
      });
      
    } catch (error) {
      console.error('Dev users list error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });
  
  app.get('/dev/token/:email', async (req, res) => {
    try {
      const { email } = req.params;
      
      // Only allow localhost and specific dev IPs
      const allowedIPs = ['127.0.0.1', '::1', 'localhost'];
      const clientIP = req.ip || req.connection.remoteAddress;
      
      if (!allowedIPs.includes(clientIP) && !clientIP.startsWith('192.168.') && !clientIP.startsWith('10.0.')) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'This endpoint is only available from localhost and development networks',
          clientIP: clientIP
        });
      }
      
      // Get user from database
      const { getRow } = require('./database/config');
      const user = await getRow(
        'SELECT id, email, first_name, last_name, role, is_active FROM users WHERE email = $1',
        [email]
      );
      
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: `No user found with email: ${email}`,
          tip: 'Use /dev/users to see available users'
        });
      }
      
      if (!user.is_active) {
        return res.status(400).json({
          error: 'User inactive',
          message: 'This user account is deactivated'
        });
      }
      
      // Generate JWT token
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { user_id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );
      
      res.json({
        success: true,
        message: 'Development token generated successfully',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role
        },
        token: token,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        note: 'This endpoint is for development use only'
      });
      
    } catch (error) {
      console.error('Dev token generation error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });
  
  console.log('🔧 Development tools enabled:');
  console.log('   📋 /dev/users - List available users');
  console.log('   🔑 /dev/token/:email - Generate JWT token');
}

// Maintenance mode (before most routes)
app.use(maintenanceMiddleware);

// Redirect root to API documentation
app.get('/', (req, res) => {
  res.redirect('/api-docs');
});

// API routes
app.use('/api/auth', authLimiter, authRoutes);
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
app.use('/api/payments', paymentLimiter, paymentRoutes);
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
app.listen(PORT, async () => {
  console.log(`🚀 TheMobileProf Backend API server running on port ${PORT}`);
  console.log(`📊 Health check available at http://localhost:${PORT}/health`);
  console.log(`🔗 API documentation: http://localhost:${PORT}/api-docs`);
  
});

module.exports = app; 