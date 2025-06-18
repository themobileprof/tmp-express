# TheMobileProf Backend API

A comprehensive Learning Management System (LMS) backend API built with Node.js, Express, and PostgreSQL. This API supports course management, user authentication, sponsorship programs, testing systems, and more.

## Features

### Core Features
- **User Management**: Registration, authentication, role-based access control
- **Course Management**: Create, update, delete courses with lessons and tests
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

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **Validation**: express-validator
- **Security**: helmet, cors, rate-limiting

## Installation

### Prerequisites
- Node.js 18 or higher
- PostgreSQL 12 or higher
- npm or yarn

### Setup

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

## Database Schema

The API uses a comprehensive PostgreSQL database with the following main tables:

- **users** - User accounts and profiles
- **courses** - Course information and metadata
- **classes** - Scheduled learning sessions
- **lessons** - Course content and materials
- **tests** - Assessment and quiz data
- **test_questions** - Individual test questions
- **test_attempts** - Student test attempts
- **sponsorships** - Discount and funding programs
- **sponsorship_opportunities** - Funding opportunities
- **enrollments** - Student course/class enrollments
- **discussions** - Forum discussions
- **certifications** - Digital certificates
- **user_settings** - User preferences

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### User Roles
- **student** - Can enroll in courses, take tests, participate in discussions
- **instructor** - Can create and manage courses, tests, and classes
- **sponsor** - Can create and manage sponsorships
- **admin** - Full system access

## Error Handling

The API returns consistent error responses:

```json
{
  "error": "Error Type",
  "message": "Human-readable error message"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error

## Rate Limiting

The API implements rate limiting to prevent abuse:
- 100 requests per 15 minutes per IP address
- Configurable via environment variables

## Security Features

- **Password Hashing**: bcryptjs with configurable rounds
- **JWT Security**: Configurable expiration and secret
- **Input Validation**: Comprehensive request validation
- **SQL Injection Protection**: Parameterized queries
- **CORS Protection**: Configurable cross-origin requests
- **Helmet**: Security headers
- **Rate Limiting**: API abuse protection

## Development

### Running Tests
```bash
npm test
```

### Database Migration
```bash
npm run migrate
```

### Database Seeding
```bash
npm run seed
```

### Environment Variables

See `env.example` for all available environment variables.

## Production Deployment

1. Set `NODE_ENV=production`
2. Configure production database
3. Set secure JWT secret
4. Configure proper CORS origins
5. Set up SSL/TLS certificates
6. Configure reverse proxy (nginx recommended)
7. Set up monitoring and logging

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For support and questions, please contact the development team or create an issue in the repository. 