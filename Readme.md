# TheMobileProf Backend API

A comprehensive Learning Management System (LMS) backend API built with Node.js, Express, and PostgreSQL. This API supports course management, user authentication, sponsorship programs, testing systems, and more.

## Quick Start

### Option 1: Docker (Recommended)

#### Local Development
```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up --build

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

## Docker Setup

### Development Environment

The `docker-compose.dev.yml` file sets up a complete development environment:

- **Backend**: Node.js application with hot reload
- **Database**: PostgreSQL with persistent data
- **Volumes**: Code changes are reflected immediately
- **Networks**: Isolated network for services

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up --build

# Stop environment
docker-compose -f docker-compose.dev.yml down

# View logs
docker-compose -f docker-compose.dev.yml logs -f backend
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
     -v uploads:/app/uploads \
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
  -v uploads:/app/uploads \
  --env-file .env \
  themobileprof-backend
```

### Environment Variables

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
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh JWT token
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - User logout

### Users
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/:id` - Update user profile
- `DELETE /api/users/:id` - Delete user (admin only)
- `GET /api/users/:id/enrollments` - Get user enrollments
- `GET /api/users/:id/certifications` - Get user certifications

### Courses
- `GET /api/courses` - List all courses
- `POST /api/courses` - Create new course
- `GET /api/courses/:id` - Get course details
- `PUT /api/courses/:id` - Update course
- `DELETE /api/courses/:id` - Delete course
- `GET /api/courses/:id/lessons` - Get course lessons
- `GET /api/courses/:id/tests` - Get course tests
- `POST /api/courses/:id/enroll` - Enroll in course

### Sponsorships
- `GET /api/sponsorships` - List sponsorships
- `POST /api/sponsorships` - Create sponsorship
- `GET /api/sponsorships/:id` - Get sponsorship details
- `PUT /api/sponsorships/:id` - Update sponsorship
- `DELETE /api/sponsorships/:id` - Delete sponsorship
- `POST /api/sponsorships/:id/use` - Use sponsorship code
- `GET /api/sponsorships/code/:discountCode` - Validate discount code
- `GET /api/sponsorships/:id/stats` - Get sponsorship statistics

### Sponsorship Opportunities
- `GET /api/sponsorship-opportunities` - List opportunities
- `POST /api/sponsorship-opportunities` - Create opportunity
- `GET /api/sponsorship-opportunities/:id` - Get opportunity details
- `PUT /api/sponsorship-opportunities/:id` - Update opportunity
- `DELETE /api/sponsorship-opportunities/:id` - Delete opportunity
- `POST /api/sponsorship-opportunities/:id/contribute` - Contribute to opportunity

### Classes
- `GET /api/classes` - List all classes
- `POST /api/classes` - Create new class
- `GET /api/classes/:id` - Get class details
- `PUT /api/classes/:id` - Update class
- `DELETE /api/classes/:id` - Delete class
- `POST /api/classes/:id/enroll` - Enroll in class

### Tests
- `GET /api/tests/:id` - Get test details
- `PUT /api/tests/:id` - Update test
- `DELETE /api/tests/:id` - Delete test
- `GET /api/tests/:id/questions` - Get test questions
- `POST /api/tests/:id/questions` - Add question to test
- `POST /api/tests/:id/start` - Start test attempt
- `PUT /api/tests/:id/attempts/:attemptId/answer` - Submit answer
- `POST /api/tests/:id/attempts/:attemptId/submit` - Submit test
- `GET /api/tests/:id/attempts/:attemptId/results` - Get test results

### Discussions
- `GET /api/discussions` - List discussions
- `POST /api/discussions` - Create discussion
- `GET /api/discussions/:id` - Get discussion details
- `PUT /api/discussions/:id` - Update discussion
- `DELETE /api/discussions/:id` - Delete discussion
- `GET /api/discussions/:id/replies` - Get discussion replies
- `POST /api/discussions/:id/replies` - Add reply

### Certifications
- `GET /api/certifications` - List certifications
- `POST /api/certifications` - Create certification
- `GET /api/certifications/:id` - Get certification details
- `PUT /api/certifications/:id` - Update certification
- `DELETE /api/certifications/:id` - Delete certification
- `GET /api/certifications/verify/:code` - Verify certification

### Settings
- `GET /api/settings` - Get user settings
- `PUT /api/settings` - Update user settings


## Development

### Running Tests
```bash
# Local development
npm test

# Docker development
docker-compose -f docker-compose.dev.yml exec backend npm test
```

### Database Migrations
```bash
# Local development
npm run migrate

# Docker development
docker-compose -f docker-compose.dev.yml exec backend npm run migrate
```

### Health Check
```bash
curl http://localhost:3000/health
```

## Production Deployment

### Using Docker Hub (Recommended)

1. **Set up GitHub Actions** (already configured)
2. **Push to main branch** - automatically builds and pushes to Docker Hub
3. **Deploy to your server**:
   ```bash
   docker pull your-username/themobileprof-backend:latest
   docker run -d --name themobileprof-backend -p 3000:3000 --env-file .env your-username/themobileprof-backend:latest
   ```

### Using External Database

For production, it's recommended to use a managed PostgreSQL service:

```bash
docker run -d \
  --name themobileprof-backend \
  --restart unless-stopped \
  -p 3000:3000 \
  -v uploads:/app/uploads \
  --env-file .env \
  your-username/themobileprof-backend:latest
```

### Scaling

Run multiple instances behind a load balancer:

```bash
# Instance 1
docker run -d --name themobileprof-backend-1 -p 3001:3000 --env-file .env your-username/themobileprof-backend:latest

# Instance 2
docker run -d --name themobileprof-backend-2 -p 3002:3000 --env-file .env your-username/themobileprof-backend:latest
```

## Monitoring

### Health Checks
- Application: `GET /health`
- Docker health checks configured in Dockerfile

### Logs
```bash
# View application logs
docker logs themobileprof-backend

# Follow logs
docker logs -f themobileprof-backend
```

### Database Backup
```bash
# For self-hosted PostgreSQL
docker exec themobileprof-db pg_dump -U username database > backup.sql
