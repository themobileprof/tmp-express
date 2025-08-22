# TheMobileProf API Documentation

> **Test Type Rule:** Only `lesson_id` is nullable in tests table. Tests with both `course_id` and `lesson_id` are lesson tests; tests with only `course_id` are course tests.

## Quick Reference

**Base URL**: `https://api.themobileprof.com`  
**Authentication**: JWT Bearer tokens  
**Content-Type**: `application/json` (except file uploads: `multipart/form-data`)

## Authentication

### User Roles
- **student** - Enroll in courses, take tests, participate in discussions
- **instructor** - Create/manage courses, tests, classes
- **sponsor** - Create/manage sponsorships
- **admin** - Full system access

### Key Endpoints

#### Register User
**POST** `/auth/register`
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "student"
}
```

#### Login
**POST** `/api/auth/login`
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Google OAuth
**POST** `/auth/google`
```json
{
  "token": "google_id_token",
  "firstName": "John",
  "lastName": "Doe",
  "role": "student"
}
```

## Core Endpoints

### Users

#### Get Current User
**GET** `/auth/me` - Returns user profile with settings

#### Get User Enrollments
**GET** `/users/:id/enrollments` - Course/class enrollments with progress

#### Get Dashboard Stats
**GET** `/users/:id/dashboard-stats` - Enrollment counts and lesson progress

### Courses

#### Get Course
**GET** `/api/courses/:id` - Course details, instructor, enrollment info

#### Enroll in Course
**POST** `/api/courses/:id/enroll` - Enroll with optional sponsorship

#### Get Course Lessons
**GET** `/api/courses/:id/lessons` - Lessons with unlock/completion status

#### Get Course Progression
**GET** `/api/courses/:id/progression` - Detailed progression tracking

### Lessons

#### Get Lesson
**GET** `/api/lessons/:id` - Lesson content (requires enrollment)

#### Mark Complete
**POST** `/api/lessons/:id/complete` - Mark lesson as completed

#### Get Progress
**GET** `/api/lessons/:id/progress` - User's lesson progress

### Tests

#### Start Test
**POST** `/api/tests/:id/start` - Start/resume test attempt

#### Submit Answer
**PUT** `/api/tests/:id/attempts/:attemptId/answer` - Submit question answer

#### Submit Test
**POST** `/api/tests/:id/attempts/:attemptId/submit` - Complete test

#### Force Proceed
**POST** `/api/tests/:id/proceed` - Continue after max attempts

#### Get Results
**GET** `/api/tests/:id/attempts/:attemptId/results` - Detailed test results

### Sponsorships

#### Get All
**GET** `/api/sponsorships` - List user's sponsorships

#### Create
**POST** `/api/sponsorships` - Create new sponsorship

#### Use Code
**POST** `/api/sponsorships/:id/use` - Apply sponsorship for enrollment

#### Validate Code
**GET** `/api/sponsorships/code/:discountCode` - Public validation

### Payments (Flutterwave v3)

#### Initialize Payment
**POST** `/payments/initialize`
```json
{
  "paymentType": "course",
  "itemId": "uuid",
  "sponsorshipCode": "SPONSOR123",
  "callbackUrl": "https://themobileprof.com/callback"
}
```

#### Verify Payment
**GET** `/payments/verify/:reference` - Verify payment completion

#### Get User Payments
**GET** `/payments/user` - Payment history

### File Uploads

**Base Path**: `/api/uploads`

#### Upload Screenshots
**POST** `/api/uploads` - General images (5MB max)

#### Upload Course Image
**POST** `/api/uploads/course-image` - Course cover images

#### Upload Lesson Material
**POST** `/api/uploads/lesson-material` - Lesson files (10MB max)

#### Upload Avatar
**POST** `/api/uploads/avatar` - User profile pictures

#### Upload Certificate
**POST** `/api/uploads/certificate` - Certificate files

#### Delete File
**DELETE** `/api/uploads/:filename?type=screenshots` - Delete uploaded file

## Admin Endpoints

### Course Management

#### Create Course
**POST** `/api/admin/courses`
```json
{
  "title": "Course Title",
  "description": "Description",
  "topic": "Programming",
  "type": "online",
  "price": 99.99,
  "duration": "8 weeks",
  "certification": "Certificate",
  "difficulty": "intermediate",
  "objectives": "Learning goals",
  "prerequisites": "Requirements",
  "syllabus": "Course outline",
  "tags": ["tag1", "tag2"],
  "instructorId": "uuid"
}
```

#### Update Course
**PUT** `/api/admin/courses/:id` - Update course details

#### Delete Course
**DELETE** `/api/admin/courses/:id` - Remove course

### Test Management

#### Create Lesson Test
**POST** `/api/admin/lessons/:lessonId/tests`
```json
{
  "title": "Test Title",
  "description": "Test description",
  "durationMinutes": 30,
  "passingScore": 80,
  "maxAttempts": 3,
  "questions": [
    {
      "question": "Question text?",
      "questionType": "multiple_choice",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": 0,
      "points": 1,
      "orderIndex": 1
    }
  ]
}
```

#### Add Question
**POST** `/api/admin/tests/:id/questions` - Add question to test

#### Update Question
**PUT** `/api/admin/tests/:id/questions/:questionId` - Modify question

#### Delete Question
**DELETE** `/api/admin/tests/:id/questions/:questionId` - Remove question

### User Management

#### Get All Users
**GET** `/api/admin/users` - List users with pagination

#### Update User
**PUT** `/api/admin/users/:id` - Modify user details

#### Delete User
**DELETE** `/api/admin/users/:id` - Remove user

### System Settings

#### Get Settings
**GET** `/admin/settings` - All system settings

#### Update Settings
**PUT** `/admin/settings` - Update multiple settings
```json
{
  "settings": {
    "support_email": "support@example.com",
    "maintenance_mode": "false",
    "max_file_size": "10MB"
  }
}
```

## Error Handling

### Standard Error Response
```json
{
  "error": "Error Type",
  "message": "Human-readable message",
  "details": "Additional details (optional)"
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error

### Validation Errors
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Validation failed",
  "details": {
    "fieldName": "Specific error message",
    "anotherField": "Another error message"
  }
}
```

## Rate Limiting

- **General**: 100 requests per 15 minutes per IP
- **Auth**: 10 requests per 15 minutes per IP
- **Uploads**: 20 requests per hour per user
- **Tests**: 5 requests per minute per user
- **Admin**: 200 requests per 15 minutes per IP

## Pagination

**Query Parameters**: `page` (default: 1), `limit` (default: 20, max: 100)

**Response Format**:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

## File Upload Configuration

### Supported Formats
- **Images**: JPEG, JPG, PNG, GIF, WebP (5MB max)
- **Documents**: PDF, DOC, DOCX, TXT (10MB max)
- **Videos**: MP4, WebM, OGG (500MB max)

### Storage Structure
```
uploads/
├── screenshots/          # General images
├── course-images/        # Course covers
├── lesson-materials/     # Lesson files
├── question-images/      # Test images
├── user-avatars/         # Profile pictures
└── certificates/         # Certificate files
```

## Environment Variables

### Required
```
DATABASE_URL=postgresql://user:pass@localhost:5432/db
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h
PORT=3000
```

### Optional
```
UPLOAD_MAX_IMAGE_SIZE=5242880
UPLOAD_MAX_DOCUMENT_SIZE=10485760
FLUTTERWAVE_PUBLIC_KEY=your_key
FLUTTERWAVE_SECRET_KEY=your_secret
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
```

## Testing

### Test Upload System
```bash
npm install
export TEST_TOKEN="your-jwt-token"
node test-upload.js
```

## Support

- **Documentation**: [docs.themobileprof.com](https://docs.themobileprof.com)
- **Support Email**: api-support@themobileprof.com
- **Status Page**: [status.themobileprof.com](https://status.themobileprof.com)

---

**Note**: This is a condensed version. For detailed examples and advanced usage, refer to the full documentation or contact support.