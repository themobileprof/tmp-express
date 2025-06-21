# TheMobileProf API Documentation

Welcome to the TheMobileProf Learning Management System API documentation. This documentation is organized into logical sections for easier navigation and maintenance.

## 📚 Documentation Structure

### Core Documentation
- **[API Overview & Setup](../README.md)** - Complete API documentation, setup guides, and quick start
- **[Authentication & Users](auth-users.md)** - User registration, login, profiles, and authentication flows
- **[Courses & Classes](courses-classes.md)** - Course and class management, enrollment, and content organization
- **[Lessons & Tests](lessons-tests.md)** - Educational content, lessons, tests, and assessments
- **[Sponsorships](sponsorships.md)** - Sponsorship system, discount codes, and funding opportunities
- **[Discussions & Certifications](discussions-certifications.md)** - Community features, discussions, and certification management
- **[Payments](payments.md)** - Payment processing, Flutterwave integration, and transaction management
- **[Admin Endpoints](admin-endpoints.md)** - Administrative functions, user management, and system administration
- **[File Uploads](file-uploads.md)** - File handling, upload endpoints, and media management
- **[Implementation Guide](implementation-guide.md)** - Technical details, setup instructions, and best practices

### Quick Reference
- **[API Reference](api-reference.md)** - Complete endpoint reference (condensed)
- **[Error Codes](error-codes.md)** - Comprehensive error code reference
- **[Rate Limits](rate-limits.md)** - Rate limiting policies and headers

## 🚀 Getting Started

1. **Read the [API Overview & Setup](../README.md)** to understand the basics and get started
2. **Check [Authentication & Users](auth-users.md)** for login and user management
3. **Review [Implementation Guide](implementation-guide.md)** for setup instructions
4. **Use [API Reference](api-reference.md)** for quick endpoint lookup

## 🔗 Base URL

- **Development**: `http://localhost:3000/api`
- **Production**: `https://your-domain.com/api`

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## 📋 User Roles

- **student** - Can enroll in courses, take tests, participate in discussions
- **instructor** - Can create and manage courses, tests, and classes
- **sponsor** - Can create and manage sponsorships
- **admin** - Full system access

## 🛠️ Development

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis (optional, for caching)

### Quick Start
```bash
# Clone the repository
git clone <repository-url>

# Install dependencies
npm install

# Set up environment variables
cp env.example .env

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

## 📖 Additional Resources

- **[README.md](../README.md)** - Project overview and setup
- **[ADMIN_SETUP.md](../ADMIN_SETUP.md)** - Admin user creation and management
- **[FLUTTERWAVE_SETUP.md](../FLUTTERWAVE_SETUP.md)** - Payment integration setup
- **[GOOGLE_OAUTH_SETUP.md](../GOOGLE_OAUTH_SETUP.md)** - Google OAuth configuration
- **[DEPLOYMENT_SETUP.md](../DEPLOYMENT_SETUP.md)** - Production deployment guide
- **[PRODUCTION_MONITORING.md](../PRODUCTION_MONITORING.md)** - Monitoring and troubleshooting

## 🤝 Support

- **Documentation Issues**: Create an issue in the repository
- **API Support**: api-support@themobileprof.com
- **Community Forum**: [community.themobileprof.com](https://community.themobileprof.com)

---

**Last Updated**: January 2024  
**Version**: 1.0.0 