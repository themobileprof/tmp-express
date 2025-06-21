const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
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

// Logging middleware
app.use(morgan('combined'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
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