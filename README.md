# TheMobileProf Backend API

Backend API for [TheMobileProf](https://themobileprof.com) — a learning platform built so people without a PC can learn software development and IT operations using only an Android phone.

## About TheMobileProf

Most tech education assumes a laptop or desktop. Courses, tutorials, and hiring pipelines are built around that assumption. For much of the world, a smartphone is the only computer someone has — and on Android, tools like [Termux](https://termux.dev/) make a real Linux environment possible on that device.

TheMobileProf exists to close that gap. We are building the infrastructure, content, and community so learners can go from zero to employable skills without ever needing traditional hardware.

### The problem we are solving

- **Access**: Millions of people cannot afford or reliably access a PC, but many do have an Android phone with mobile data.
- **Content mismatch**: Existing curricula assume desktop setups, large screens, and IDE-centric workflows that do not translate to a phone terminal.
- **Cost**: Even when content exists online, course fees, certification costs, and payment friction block participation.
- **Proof of skill**: Without formal training paths, mobile-only learners struggle to demonstrate competence to employers.

### What we are building

This repository is the backend for that platform — the API layer that powers courses, hands-on practice, assessments, payments, and credentials on mobile.

| Area | What it enables |
|------|-----------------|
| **Mobile-first LMS** | Courses, lessons, classes, and discussions designed for small screens and intermittent connectivity |
| **Interactive workshops** | Step-by-step terminal exercises (see [Workshop System](docs/WORKSHOP_FORMAT.md)) that mirror real command-line work on Android |
| **Assessments & certification** | Tests, scoring, and verifiable digital certificates so skills can be demonstrated |
| **Sponsorships** | Discount codes and funded seats so cost is not a barrier (see [Sponsorships](docs/sponsorships.md)) |
| **Mobile-friendly payments** | Flutterwave integration including mobile money options common in regions where card payments are rare |
| **Content pipeline** | Tools and agents to adapt traditional learning materials into mobile-optimized lessons with Termux-style visuals (see [docs/agent](docs/agent/README.md)) |

### Who this is for

- **Learners** who want to learn Linux, DevOps, programming, or IT operations from an Android phone
- **Instructors** who create and deliver mobile-native courses and workshops
- **Sponsors** who fund seats and scholarships for underserved communities
- **Contributors** who help extend the platform, API, and educational content

The goal is not to replace desktop development forever — it is to make the **first steps, daily practice, and career entry** possible for everyone, regardless of what hardware they start with.

---

Built with Node.js, Express, and PostgreSQL.

## 🚀 Quick Start

### Option 1: Docker (Recommended)

#### Local Development
```bash
# Start development environment
docker-compose up --build

# The API will be available at http://localhost:3000
# Database will be available at localhost:5432
```

#### Production Build
```bash
# Build production image
docker build -t themobileprof-backend .

# Run with environment variables
docker run -d \
  --name themobileprof-backend \
  -p 3000:3000 \
  -v /var/www/tmp-root/uploads:/app/uploads \
  --env-file .env \
  themobileprof-backend
```

### Option 2: Local Development

#### Prerequisites
- Node.js 18 or higher
- PostgreSQL 12 or higher
- npm or yarn

#### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd themobileprof-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/themobileprof
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRES_IN=24h
   PORT=3000
   ```

4. **Database Setup**
   ```bash
   # Run database migration
   npm run migrate
   
   # (Optional) Seed with sample data
   npm run seed
   ```

5. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## 📚 API Documentation

For detailed API documentation, see our comprehensive guides:

### Core Documentation
- **[API Overview & Setup](docs/README.md)** - Complete API documentation and setup guides
- **[Authentication & Users](docs/auth-users.md)** - User registration, login, profiles, and authentication flows
- **[Frontend Integration](FRONTEND_INTEGRATION.md)** - Complete frontend implementation guide for Flutterwave v3 payments
- **[Courses & Classes](docs/courses-classes.md)** - Course and class management, enrollment, and content organization
- **[Lessons & Tests](docs/lessons-tests.md)** - Educational content, lessons, tests, and assessments
- **[Workshop System](docs/WORKSHOP_FORMAT.md)** - Interactive workshop exercises with step-by-step terminal commands
- **[Workshop Quick Start](docs/WORKSHOP_GUIDE.md)** - Quick guide for instructors creating workshop exercises
- **[Sponsorships](docs/sponsorships.md)** - Sponsorship system, discount codes, and funding opportunities
- **[Payments](docs/payments.md)** - Payment processing, Flutterwave integration, and transaction management

### Quick Reference
- **[API Reference](docs/api-reference.md)** - Complete endpoint reference (condensed)
- **[Error Codes](docs/error-codes.md)** - Comprehensive error code reference
- **[Rate Limits](docs/rate-limits.md)** - Rate limiting policies and headers

## 🔗 API Base URL

- **Development**: `http://localhost:3000/api`
- **Production**: `https://your-domain.com/api`

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### User Roles
- **student** - Can enroll in courses, take tests, participate in discussions
- **instructor** - Can create and manage courses, tests, and classes
- **sponsor** - Can create and manage sponsorships
- **admin** - Full system access

### Admin Setup
Admin users have separate authentication and cannot register through the regular endpoint:

```bash
# Create admin user
npm run create-admin

# Admin login
POST /api/auth/admin/login
{
  "email": "admin@themobileprof.com",
  "password": "securepassword123"
}
```

See [ADMIN_SETUP.md](ADMIN_SETUP.md) for complete admin documentation.

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **Validation**: express-validator
- **Security**: helmet, cors, rate-limiting
- **Containerization**: Docker

## 📁 File Uploads and Persistence

### Uploads Directory Persistence

The application handles file uploads (avatars, course images, etc.) and ensures they persist across container recreations:

#### **Local Development**
Uploads are automatically persisted using Docker volumes:
```yaml
volumes:
  - uploads_data:/app/uploads  # Named volume for persistence
```

#### **Production Deployment**
Uploads are mapped to a host directory for persistence:
```bash
# In GitHub Actions deployment
-v /var/www/tmp-root/uploads:/app/uploads
```

#### **Manual Docker Run**
When running the container manually, always include volume mapping:
```bash
docker run -d \
  --name themobileprof-backend \
  -p 3000:3000 \
  -v /var/www/tmp-root/uploads:/app/uploads \
  your-image:latest
```

### File Storage Configuration

- **Max file size**: 10MB (configurable via `MAX_FILE_SIZE`)
- **Upload path**: `/app/uploads` (configurable via `UPLOAD_PATH`)
- **Supported formats**: Images (JPG, PNG), Documents (PDF), etc.

## 🚀 Docker Setup

### Development Environment

The `docker-compose.yml` file sets up a complete development environment:

- **Backend**: Node.js application with hot reload
- **Database**: PostgreSQL with persistent data
- **Volumes**: Code changes are reflected immediately
- **Networks**: Isolated network for services

```bash
# Start development environment
docker-compose up --build

# Stop environment
docker-compose down

# View logs
docker-compose logs -f backend
```

### Production Deployment

#### Using Docker Hub (CI/CD)

1. **Set up GitHub Actions secrets**:
   - `DOCKERHUB_USERNAME`: Your Docker Hub username
   - `DOCKERHUB_TOKEN`: Docker Hub access token

2. **Push to main branch** - automatically builds and pushes to Docker Hub

3. **Deploy to production**:
   ```bash
   # Pull latest image
   docker pull your-username/themobileprof-backend:latest
   
   # Run with environment variables
   docker run -d \
     --name themobileprof-backend \
     --restart unless-stopped \
     -p 3000:3000 \
     -v /var/www/tmp-root/uploads:/app/uploads \
     --env-file .env \
     your-username/themobileprof-backend:latest
   ```

#### Manual Build
```bash
# Build production image
docker build -t themobileprof-backend .

# Run with external database
docker run -d \
  --name themobileprof-backend \
  --restart unless-stopped \
  -p 3000:3000 \
  -v /var/www/tmp-root/uploads:/app/uploads \
  --env-file .env \
  themobileprof-backend
```

## ⚙️ Environment Variables

### Local Development
Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Security
JWT_SECRET=your-super-secure-jwt-secret
BCRYPT_ROUNDS=12

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM_ADDRESS=noreply@yourdomain.com

# Application
NODE_ENV=production
PORT=3000

# Optional: Docker Hub username for CI/CD
DOCKERHUB_USERNAME=your-username

### Docker/Production Deployment

For Docker and production deployments, environment variables are handled differently:

#### Option 1: Pass Environment Variables Directly
```bash
docker run -d \
  --name themobileprof-backend \
  -p 3000:3000 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  -e JWT_SECRET=your-secret \
  -e FLUTTERWAVE_PUBLIC_KEY=your-key \
  -e FLUTTERWAVE_SECRET_KEY=your-secret \
  --env-file .env \
  themobileprof-backend
```

#### Option 2: Use Environment File
```bash
docker run -d \
  --name themobileprof-backend \
  -p 3000:3000 \
  --env-file .env \
  themobileprof-backend
```

#### Option 3: Docker Compose with Environment File
```yaml
version: '3.8'
services:
  backend:
    image: themobileprof-backend
    env_file:
      - .env
    ports:
      - "3000:3000"
    volumes:
      - ./uploads:/app/uploads
```

**Note:** The `.env` file is excluded from the Docker image (via `.dockerignore`) for security reasons. The `.env` file is mounted into the container at runtime.

## 📊 API Features

### Core Features
- **User Management**: Registration, authentication, role-based access control
- **Course Management**: Create, update, delete courses with lessons and tests
- **Lesson Management**: Create, update, delete lessons with associated tests
- **Test Management**: Create, update, delete tests with questions and analytics
- **Class Management**: Schedule-based learning with limited slots
- **Sponsorship System**: Discount codes and funding opportunities
- **Testing System**: Multiple choice, true/false, and short answer questions
- **Discussion Forums**: Course and class-specific discussions
- **Certification System**: Digital certificates with verification codes
- **User Settings**: Personalized preferences and notifications

### Key Highlights
- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access**: Student, Instructor, Sponsor, Admin roles
- **Comprehensive Testing**: Full test creation, taking, and scoring system
- **Sponsorship Tracking**: Detailed analytics and usage statistics
- **Database Optimization**: Proper indexing and efficient queries
- **Input Validation**: Comprehensive request validation
- **Error Handling**: Consistent error responses
- **Rate Limiting**: API protection against abuse

## 🔧 Development

### Running Tests
```bash
# Local development
npm test

# Docker development
docker-compose exec backend npm test
```

### Database Migrations
```bash
# Local development
npm run migrate

# Docker development
docker-compose exec backend npm run migrate
```



### Health Check
```bash
curl http://localhost:3000/health
```

## 📖 Additional Resources

- **[ADMIN_SETUP.md](ADMIN_SETUP.md)** - Admin user creation and management
- **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)** - API Documentation

## 🤝 Support

- **Documentation Issues**: Create an issue in the repository
- **API Support**: api-support@themobileprof.com
- **Community Forum**: [community.themobileprof.com](https://community.themobileprof.com)
- **Status Page**: [status.themobileprof.com](https://status.themobileprof.com)

---

**Last Updated**: June 2025  
**Version**: 1.0.0