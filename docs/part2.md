### Database Schema Notes

#### UUID Primary Keys
All primary keys use UUID format for better security and distribution.

#### Enum Types
The following ENUM types are used:
- User roles: `student`, `instructor`, `admin`, `sponsor`
- Course types: `online`, `offline`
- Course status: `published`, `draft`, `review`, `archived`
- Test status: `active`, `draft`, `archived`
- Sponsorship status: `active`, `paused`, `expired`, `completed`
- Payment status: `pending`, `successful`, `failed`

#### Important Constraints
- Unique constraint on `sponsorship_usage(sponsorship_id, student_id)` prevents multiple uses
- Check constraint on enrollments ensures either course_id or class_id is set
- Foreign key constraints with appropriate CASCADE/SET NULL actions

### Security Considerations

#### Authentication
- JWT tokens with configurable expiration
- Password hashing using bcrypt with configurable rounds
- Google OAuth integration for alternative authentication

#### Authorization
- Role-based access control (RBAC)
- Admin-only endpoints for system management
- Instructor access limited to their own courses
- Sponsor access limited to their own sponsorships

#### Data Protection
- Input validation and sanitization
- SQL injection prevention with prepared statements
- Rate limiting on sensitive endpoints
- File upload validation and virus scanning
- File type validation and size limits
- Unique filename generation to prevent path traversal
- Authentication required for all upload operations

### Performance Optimizations

#### Database Indexes
Recommended indexes on frequently queried columns:
- `users(email)`
- `courses(instructor_id, status)`
- `enrollments(user_id, course_id)`
- `sponsorships(discount_code, status)`
- `test_attempts(test_id, user_id)`

#### Caching Strategy
- Cache frequently accessed data (course listings, user profiles)
- Redis recommended for session storage
- CDN for static assets and uploaded files

### Environment Variables

#### Required Variables
```
DATABASE_URL=postgresql://username:password@localhost:5432/themobileprof
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=12
PORT=3000
```

#### Docker Deployment
For Docker deployment, the uploads directory is mapped to `/var/www/api.themobileprof.com/uploads` on the server to ensure file persistence across container restarts and deployments. The deployment uses a direct `docker run` command via GitHub Actions.

#### Optional Variables
```
TEST_TIMEOUT_MINUTES=120
MAX_TEST_ATTEMPTS_PER_USER=3
EMAIL_SERVICE_API_KEY=your-email-service-key
EMAIL_FROM_ADDRESS=noreply@themobileprof.com
SPONSORSHIP_CODE_LENGTH=10
MAX_SPONSORSHIP_DURATION_MONTHS=12
UPLOAD_MAX_FILE_SIZE=26214400
UPLOAD_PATH=./uploads
BASE_URL=https://api.themobileprof.com
CORS_ORIGIN=https://themobileprof.com
TINYMCE_API_KEY=your-tinymce-api-key
ADMIN_DEFAULT_EMAIL=admin@themobileprof.com
ADMIN_DEFAULT_PASSWORD=secure_admin_password
# Flutterwave v3 (Stable) - API-based authentication
FLUTTERWAVE_PUBLIC_KEY=your_flutterwave_public_key
FLUTTERWAVE_SECRET_KEY=your_flutterwave_secret_key
FLUTTERWAVE_SECRET_HASH=your-webhook-secret-hash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Error Handling

#### Standard Error Response
```json
{
  "error": "Error Type",
  "message": "Human-readable error message",
  "details": "Additional error details (optional)",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Common Error Types
- `ValidationError` - Input validation failed
- `AuthenticationError` - Invalid credentials
- `AuthorizationError` - Insufficient permissions
- `NotFoundError` - Resource not found
- `ConflictError` - Resource conflict
- `RateLimitError` - Too many requests
- `ServerError` - Internal server error

### Rate Limiting

#### Default Limits
- **General endpoints**: 100 requests per 15 minutes per IP
- **Authentication endpoints**: 10 requests per 15 minutes per IP
- **File uploads**: 20 requests per hour per user
- **Test submissions**: 5 requests per minute per user
- **Sponsorship usage**: 10 requests per hour per user
- **Admin endpoints**: 200 requests per 15 minutes per IP

#### Rate Limit Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

### Pagination

#### Standard Pagination
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

#### Query Parameters
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `offset` - Alternative to page (number to skip)

### Search and Filtering

#### Search Parameters
- `search` - Full-text search across relevant fields
- `q` - Alternative search parameter

#### Filter Parameters
- `status` - Filter by status
- `role` - Filter by user role
- `topic` - Filter by course topic
- `type` - Filter by course/class type
- `date` - Filter by date range
- `price` - Filter by price range

#### Sorting
- `sort` - Field to sort by
- `order` - Sort order (asc/desc)

Example: `?sort=created_at&order=desc&status=published&topic=programming`

---

### Tests Endpoints

> **Test Type Rule:**
> - Only `lesson_id` is nullable in the tests table.
> - If a test has both `course_id` and `lesson_id`, it is a **lesson test** (attached to a specific lesson).
> - If a test has a `course_id` but no `lesson_id`, it is a **course test** (attached to the course as a whole).

#### Get Test by ID
**GET** `/api/tests/:id`

Get test details by ID.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "id": "uuid",
  "courseId": "uuid",
  "courseTitle": "JavaScript Fundamentals",
  "title": "JavaScript Quiz",
  "description": "Test your JavaScript knowledge",
  "durationMinutes": 60,
  "passingScore": 70,
  "maxAttempts": 3,
  "orderIndex": 1,
  "isPublished": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Update Test
**PUT** `/api/tests/:id`

Update test details (instructor/admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Updated Test Title",
  "description": "Updated test description",
  "durationMinutes": 45,
  "passingScore": 80,
  "maxAttempts": 2,
  "orderIndex": 2,
  "isPublished": true
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "title": "Updated Test Title",
  "description": "Updated test description",
  "durationMinutes": 45,
  "passingScore": 80,
  "maxAttempts": 2,
  "orderIndex": 2,
  "isPublished": true,
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Delete Test
**DELETE** `/api/tests/:id`

Delete a test (instructor/admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "message": "Test deleted successfully"
}
```

#### Get Test Questions
**GET** `/api/tests/:id/questions`

Get all questions for a test.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "questions": [
    {
      "id": "uuid",
      "question": "What is JavaScript?",
      "questionType": "multiple_choice",
      "options": ["Programming language", "Markup language", "Style sheet", "Database"],
      "correctAnswer": 0,
      "correctAnswerText": null,
      "points": 1,
      "orderIndex": 1
    }
  ]
}
```

#### Add Question to Test
**POST** `/api/tests/:id/questions`

Add a new question to a test (instructor/admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "question": "What is the purpose of JavaScript?",
  "questionType": "multiple_choice",
  "options": ["Server-side programming", "Client-side programming", "Database management", "File system"],
  "correctAnswer": 1,
  "points": 2,
  "orderIndex": 2
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "question": "What is the purpose of JavaScript?",
  "questionType": "multiple_choice",
  "options": ["Server-side programming", "Client-side programming", "Database management", "File system"],
  "correctAnswer": 1,
  "points": 2,
  "orderIndex": 2
}
```

#### Update Question
**PUT** `/api/tests/:id/questions/:questionId`

Update a question in a test (instructor/admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "question": "Updated question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": 2,
  "points": 3
}
```

#### Delete Question
**DELETE** `/api/tests/:id/questions/:questionId`

Delete a question from a test (instructor/admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "message": "Question deleted successfully"
}
```

#### Start Test Attempt
**POST** `/api/tests/:id/start`

Start a new test attempt.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "attempt": {
    "id": "uuid",
    "testId": "uuid",
    "userId": "uuid",
    "attemptNumber": 1,
    "status": "in_progress",
    "startedAt": "2024-01-01T00:00:00.000Z"
  },
  "questions": [
    {
      "id": "uuid",
      "question": "What is JavaScript?",
      "questionType": "multiple_choice",
      "options": ["Programming language", "Markup language", "Style sheet", "Database"],
      "points": 1,
      "orderIndex": 1
    }
  ]
}
```

**Error Response (400) - Max Attempts Reached:**
```json
{
  "error": "MAX_ATTEMPTS_REACHED",
  "message": "Maximum attempts reached for this test",
  "details": {
    "maxAttempts": 3,
    "currentAttempts": 3,
    "lastScore": 65,
    "passed": false,
    "canProceed": true,
    "lastAttemptId": "uuid"
  }
}
```

**Notes:**
- When max attempts are reached, the response includes details about the last attempt
- Users can use the `/proceed` endpoint to continue with their last score
- This prevents users from getting completely stuck on a test

#### Submit Answer
**PUT** `/api/tests/:id/attempts/:attemptId/answer`

Submit an answer for a test question.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "questionId": "uuid",
  "selectedAnswer": 0,
  "answerText": "Programming language"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Answer saved successfully",
  "isCorrect": true,
  "pointsEarned": 1
}
```

#### Submit Test
**POST** `/api/tests/:id/attempts/:attemptId/submit`

Submit completed test.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "forceProceed": false
}
```

**Optional Fields:**
- `forceProceed` - Allow progression even if test is not passed (boolean, default: false)

**Response (200):**
```json
{
  "results": {
    "attemptId": "uuid",
    "score": 85,
    "totalQuestions": 20,
    "correctAnswers": 17,
    "timeTakenMinutes": 45,
    "completedAt": "2024-01-01T01:00:00.000Z",
    "passed": true,
    "forceProceed": false,
    "message": "Test passed!"
  }
}
```

**Notes:**
- When a test is passed, course and lesson progress are automatically updated
- For lesson tests: the lesson is marked as completed and course progress is recalculated
- For course tests: course progress is updated based on test completion
- Progress calculation: 50% from completed lessons, 50% from completed tests
- Use `forceProceed: true` to allow progression even with failing scores
- Forced progression still updates course progress but marks the test as completed

#### Force Proceed After Max Attempts
**POST** `/api/tests/:id/proceed`

Force progression after reaching maximum attempts. This allows users to proceed with their last attempt score even if they didn't pass.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "message": "Proceeding with last attempt score",
  "details": {
    "lastAttemptId": "uuid",
    "score": 65,
    "totalQuestions": 20,
    "correctAnswers": 13,
    "timeTakenMinutes": 45,
    "completedAt": "2024-01-01T01:00:00.000Z",
    "passed": false,
    "forcedProceed": true
  }
}
```

**Notes:**
- Only available after reaching maximum attempts
- Uses the last completed attempt score for progression
- Updates course progress even if the test wasn't passed
- Useful for preventing users from getting stuck on a test

#### Get Test Results
**GET** `/api/tests/:id/attempts/:attemptId/results`

Get detailed test results.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "attempt": {
    "id": "uuid",
    "score": 85,
    "totalQuestions": 20,
    "correctAnswers": 17,
    "timeTakenMinutes": 45,
    "status": "completed",
    "startedAt": "2024-01-01T00:00:00.000Z",
    "completedAt": "2024-01-01T01:00:00.000Z"
  },
  "questions": [
    {
      "id": "uuid",
      "question": "What is JavaScript?",
      "questionType": "multiple_choice",
      "options": ["Programming language", "Markup language", "Style sheet", "Database"],
      "correctAnswer": 0,
      "userAnswer": 0,
      "isCorrect": true,
      "pointsEarned": 1,
      "points": 1
    }
  ]
}
```

#### Upload Question Image
**POST** `/api/tests/:id/questions/:questionId/image/upload`

Upload an image for a test question (instructor/admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: multipart/form-data
```

**Form Data:**
- `image`: Image file (PNG, JPG, JPEG, GIF, SVG, max 5MB)

**Response (200):**
```json
{
  "success": true,
  "imageUrl": "/uploads/question-images/<filename>",
  "message": "Image uploaded successfully"
}
```

#### Get Test Analytics (Admin/Instructor)
**GET** `/api/tests/:id/analytics`

Get comprehensive analytics for a test including overall statistics and question-level analytics.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "totalAttempts": 25,
  "averageScore": 85.5,
  "passRate": 80.0,
  "averageTimeMinutes": 15.2,
  "questionAnalytics": [
    {
      "questionId": "uuid",
      "question": "What is 2 + 2?",
      "questionType": "multiple_choice",
      "points": 1,
      "totalAnswers": 25,
      "correctAnswers": 23,
      "correctRate": 92.0
    }
  ]
}
```

#### List All Attempts for a Test (Admin/Instructor Only)
**GET** `/api/tests/:id/attempts`

**Note:** This endpoint is restricted to test owners (instructors) and admins only. Students should use `/api/tests/:id/my-attempts` to view their own attempts.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `limit` - Number of results to return (default: 20, max: 100)
- `offset` - Number of results to skip (default: 0)

**Response (200):**
```json
{
  "test": {
    "id": "uuid",
    "title": "JavaScript Quiz",
    "passingScore": 70
  },
  "attempts": [
    {
      "id": "uuid",
      "userId": "uuid",
      "userName": "John Doe",
      "userEmail": "john@example.com",
      "attemptNumber": 1,
      "score": 85,
      "totalQuestions": 20,
      "correctAnswers": 17,
      "status": "completed",
      "startedAt": "2024-01-01T00:00:00.000Z",
      "completedAt": "2024-01-01T01:00:00.000Z",
      "timeTakenMinutes": 60,
      "passed": true
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 20,
    "offset": 0
  }
}
```

#### Get User's Own Test Attempts (Student View)
**GET** `/api/tests/:id/my-attempts`

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "test": {
    "id": "uuid",
    "title": "JavaScript Quiz",
    "passingScore": 70,
    "maxAttempts": 3
  },
  "attempts": [
    {
      "id": "uuid",
      "attemptNumber": 1,
      "score": 85,
      "totalQuestions": 20,
      "correctAnswers": 17,
      "status": "completed",
      "startedAt": "2024-01-01T00:00:00.000Z",
      "completedAt": "2024-01-01T01:00:00.000Z",
      "timeTakenMinutes": 60,
      "passed": true
    }
  ],
  "currentAttempts": 1,
  "canStartNew": true
}
```

#### Get Detailed Answers for a Student's Attempt (Admin/Instructor)
**GET** `/api/tests/:id/attempts/:attemptId/details`

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "attempt": {
    "id": "uuid",
    "studentName": "John Doe",
    "studentEmail": "john@example.com",
    "score": 85,
    "timeSpent": 42,
    "attemptNumber": 1,
    "completedAt": "2024-07-01T12:00:00Z",
    "status": "completed"
  },
  "answers": [
    {
      "questionId": "uuid",
      "question": "What is 2 + 2?",
      "questionType": "multiple_choice",
      "options": ["2", "3", "4", "5"],
      "correctAnswer": 2,
      "correctAnswerText": null,
      "userAnswer": 2,
      "userAnswerText": null,
      "isCorrect": true,
      "pointsEarned": 1
    }
  ]
}
```

### Course-Level Test Management

#### Get Course Tests
**GET** `/api/courses/:id/tests`

Get all tests for a course.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "tests": [
    {
      "id": "uuid",
      "title": "Course Final Exam",
      "description": "Comprehensive test covering all course material",
      "durationMinutes": 120,
      "passingScore": 70,
      "maxAttempts": 2,
      "orderIndex": 1,
      "isPublished": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Create Course Test
**Note:** This endpoint is not currently implemented. Tests are created at the lesson level instead.

**Alternative:** Use `POST /api/admin/lessons/:lessonId/tests` to create tests for individual lessons within a course.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Lesson Quiz",
  "description": "Test covering lesson material",
  "durationMinutes": 30,
  "passingScore": 80,
  "maxAttempts": 3,
  "questions": [
    {
      "question": "What did you learn in this lesson?",
      "questionType": "multiple_choice",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "points": 5,
      "orderIndex": 1
    }
  ]
}
```

### Lesson-Level Test Management

#### Get Lesson Tests
**GET** `/api/lessons/:id/tests`

Get all tests for a lesson.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "lesson": {
    "id": "uuid",
    "title": "Introduction to JavaScript",
    "courseId": "uuid"
  },
  "tests": [
    {
      "id": "uuid",
      "title": "Lesson Quiz",
      "description": "Test covering lesson material",
      "durationMinutes": 30,
      "passingScore": 80,
      "maxAttempts": 3,
      "orderIndex": 1,
      "isPublished": true,
      "questionCount": 10,
      "attemptCount": 25,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Create Lesson Test (Admin Only)
**POST** `/api/admin/lessons/:lessonId/tests`

Create a new test for a lesson (admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Lesson Quiz",
  "description": "Test covering lesson material",
  "durationMinutes": 30,
  "passingScore": 80,
  "maxAttempts": 3,
  "questions": [
    {
      "question": "What did you learn in this lesson?",
      "questionType": "multiple_choice",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 1,
      "points": 3,
      "orderIndex": 1
    }
  ]
}
```

**Notes:**
- `title`, `durationMinutes`, `passingScore`, and `maxAttempts` are required
- `description` is optional
- `questions` array is optional - you can create a test without questions and add them later
- If `questions` is provided, each question must have `question`, `questionType`, `points`, and `orderIndex`
- `questionType` must be one of: "multiple_choice", "true_false", "short_answer"

**Response (201):**
```json
{
  "test": {
    "id": "uuid",
    "course_id": "uuid",
    "lesson_id": "uuid",
    "title": "Lesson Quiz",
    "description": "Test covering lesson material",
    "duration_minutes": 30,
    "passing_score": 80,
    "max_attempts": 3,
    "order_index": 0,
    "is_published": true,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  },
  "questions": [
    {
      "id": "uuid",
      "test_id": "uuid",
      "question": "What did you learn in this lesson?",
      "question_type": "multiple_choice",
      "options": "[\"Option A\", \"Option B\", \"Option C\", \"Option D\"]",
      "correct_answer": 1,
      "points": 3,
      "order_index": 1,
      "image_url": null,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Example Response (when no questions provided):**
```json
{
  "test": {
    "id": "uuid",
    "course_id": "uuid",
    "lesson_id": "uuid",
    "title": "Lesson Quiz",
    "description": "Test covering lesson material",
    "duration_minutes": 30,
    "passing_score": 80,
    "max_attempts": 3,
    "order_index": 0,
    "is_published": true,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  },
  "questions": []
}
```

### Admin Test Management

#### Get Test Details (Admin)
**GET** `/api/admin/tests/:id`

Get test details with questions and statistics (admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "test": {
    "id": "uuid",
    "title": "JavaScript Quiz",
    "description": "Test your JavaScript knowledge",
    "course_title": "JavaScript Fundamentals",
    "lesson_title": "Introduction to JavaScript",
    "duration_minutes": 60,
    "passing_score": 70,
    "max_attempts": 3,
    "is_published": true
  },
  "questions": [
    {
      "id": "uuid",
      "question": "What is JavaScript?",
      "question_type": "multiple_choice",
      "options": ["Programming language", "Markup language", "Style sheet", "Database"],
      "correct_answer": 0,
      "points": 1,
      "order_index": 1
    }
  ],
  "statistics": {
    "total_attempts": 25,
    "average_score": 85.5,
    "passed_attempts": 20
  }
}
```

#### Update Test (Admin)
**PUT** `/api/admin/tests/:id`

Update test details (admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Updated Test Title",
  "description": "Updated description",
  "durationMinutes": 45,
  "passingScore": 80,
  "maxAttempts": 2,
  "isPublished": true
}
```

#### Delete Test (Admin)
**DELETE** `/api/admin/tests/:id`

Delete a test (admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "message": "Test deleted successfully"
}
```

#### Update Test Status (Admin)
**PUT** `/api/admin/tests/:id/status`

Update test status (admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "isPublished": true
}
```

#### Duplicate Test (Admin)
**POST** `/api/admin/tests/:id/duplicate`

Duplicate a test (admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (201):**
```json
{
  "test": {
    "id": "uuid",
    "title": "JavaScript Quiz (Copy)",
    "description": "Test your JavaScript knowledge",
    "duration_minutes": 60,
    "passing_score": 70,
    "max_attempts": 3,
    "is_published": false
  }
}
```

#### Get Test Questions (Admin)
**GET** `/api/admin/tests/:id/questions`

Get all questions for a test (admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

#### Get Lesson Tests (Admin)
**GET** `/api/admin/lessons/:lessonId/tests`

Get all tests for a lesson with additional statistics (admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "lesson": {
    "id": "uuid",
    "title": "Introduction to JavaScript",
    "courseId": "uuid"
  },
  "tests": [
    {
      "id": "uuid",
      "title": "Lesson Quiz",
      "description": "Test covering lesson material",
      "durationMinutes": 30,
      "passingScore": 80,
      "maxAttempts": 3,
      "orderIndex": 1,
      "isPublished": true,
      "questionCount": 10,
      "attemptCount": 25,
      "averageScore": 85.5,
      "passedAttempts": 20,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Add Question to Test (Admin)
**POST** `/api/admin/tests/:id/questions`

Add a question to a test (admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "question": "What is the purpose of JavaScript?",
  "questionType": "multiple_choice",
  "options": ["Server-side programming", "Client-side programming", "Database management", "File system"],
  "correctAnswer": 1,
  "correctAnswerText": null,
  "points": 2,
  "orderIndex": 2,
  "imageUrl": null
}
```

**Notes:**
- `question` and `questionType` are required
- `questionType` must be one of: "multiple_choice", "true_false", "short_answer"
- `options` is required for "multiple_choice" questions
- `correctAnswer` is required for "multiple_choice" and "true_false" questions
- `correctAnswerText` is required for "short_answer" questions
- `points` defaults to 1 if not provided
- `orderIndex` is optional - will be auto-assigned if not provided
- `imageUrl` is optional for question images

**Response (201):**
```json
{
  "question": {
    "id": "uuid",
    "test_id": "uuid",
    "question": "What is the purpose of JavaScript?",
    "question_type": "multiple_choice",
    "options": "[\"Server-side programming\", \"Client-side programming\", \"Database management\", \"File system\"]",
    "correct_answer": 1,
    "correct_answer_text": null,
    "points": 2,
    "order_index": 2,
    "image_url": null,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Update Question (Admin)
**PUT** `/api/admin/tests/:id/questions/:questionId`

Update a question in a test (admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "question": "Updated question text",
  "questionType": "multiple_choice",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": 2,
  "correctAnswerText": null,
  "points": 3,
  "imageUrl": "https://example.com/image.jpg"
}
```

**Notes:**
- All fields are optional for updates
- `questionType` must be one of: "multiple_choice", "true_false", "short_answer"
- `options` is required for "multiple_choice" questions
- `correctAnswer` is required for "multiple_choice" and "true_false" questions
- `correctAnswerText` is required for "short_answer" questions

#### Delete Question (Admin)
**DELETE** `/api/admin/tests/:id/questions/:questionId`

Delete a question from a test (admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

#### Get Test Results (Admin)
**GET** `/api/admin/tests/:id/results`

Get test results (admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

#### Get Test Analytics (Admin)
**GET** `/api/admin/tests/:id/analytics`

Get test analytics (admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

---

## Scraping Management

### Get Scraped URLs
**GET** `/api/scraping/urls`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `status`: Filter by status (pending, in_progress, completed, failed, skipped, partial)
- `category`: Filter by category
- `level`: Filter by level
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `search`: Search in URL or title

**Response:**
```json
{
  "success": true,
  "data": {
    "urls": [
      {
        "id": "uuid",
        "url": "https://learning.lpi.org/en/learning-materials/010-160/",
        "status": "pending",
        "title": "Linux Essentials",
        "description": "Introduction to Linux fundamentals",
        "category": "programming",
        "level": "beginner",
        "metadata": {},
        "error_message": null,
        "retry_count": 0,
        "last_attempt_at": null,
        "completed_at": null,
        "created_at": "2024-01-15T10:30:00Z",
        "updated_at": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "pages": 3
    }
  }
}
```

### Add URL to Scraping Queue
**POST** `/api/scraping/urls`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "url": "https://learning.lpi.org/en/learning-materials/010-160/",
  "title": "Linux Essentials",
  "description": "Introduction to Linux fundamentals",
  "category": "programming",
  "level": "beginner",
  "metadata": {
    "source": "lpi",
    "certification": "LPI Linux Essentials"
  }
}
```

### Add Multiple URLs to Scraping Queue
**POST** `/api/scraping/urls/bulk`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "urls": [
    {
      "url": "https://learning.lpi.org/en/learning-materials/010-160/",
      "title": "Linux Essentials",
      "category": "programming",
      "level": "beginner"
    },
    {
      "url": "https://learning.lpi.org/en/learning-materials/010-161/",
      "title": "System Administration",
      "category": "programming",
      "level": "intermediate"
    }
  ]
}
```

### Get Pending URLs
**GET** `/api/scraping/urls/pending`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `limit`: Number of URLs to fetch (default: 10)

### Update URL Status
**PUT** `/api/scraping/urls/:id/status`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "status": "in_progress",
  "title": "Linux Essentials",
  "description": "Introduction to Linux fundamentals",
  "category": "programming",
  "level": "beginner",
  "metadata": {
    "lessons_count": 15,
    "estimated_duration": "6 weeks"
  }
}
```

**Status Values:**
- `pending`: URL is queued for processing
- `in_progress`: URL is currently being processed
- `completed`: URL has been successfully processed
- `failed`: URL processing failed
- `skipped`: URL was skipped (e.g., already exists)

### Get Scraping Statistics
**GET** `/api/scraping/stats`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "total": 150,
      "by_status": {
        "pending": 25,
        "in_progress": 5,
        "completed": 100,
        "failed": 15,
        "skipped": 5
      },
      "summary": {
        "pending": 25,
        "in_progress": 5,
        "completed": 100,
        "failed": 15,
        "skipped": 5
      }
    },
    "recent_activity": [
      {
        "id": "uuid",
        "url": "https://learning.lpi.org/en/learning-materials/010-160/",
        "status": "completed",
        "title": "Linux Essentials",
        "updated_at": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

### Reset Failed URLs
**POST** `/api/scraping/urls/reset-failed`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reset_count": 15,
    "message": "Reset 15 failed URLs to pending status"
  }
}
```

### Delete Scraped URL
**DELETE** `/api/scraping/urls/:id`

**Headers:**
```
Authorization: Bearer <access_token>
```

#### Get User Enrollments
**GET** `/users/:id/enrollments`

Get user's course and class enrollments.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "enrollments": [
    {
      "id": "uuid",
      "enrollmentType": "course",
      "progress": 75,
      "status": "in_progress",
      "enrolledAt": "2024-01-01T00:00:00.000Z",
      "completedAt": null,
      "course": {
        "id": "uuid",
        "title": "JavaScript Fundamentals",
        "topic": "Programming",
        "imageUrl": "https://example.com/course.jpg"
      },
      "sponsorship": {
        "id": "uuid",
        "discountCode": "SPONSOR123",
        "discountType": "percentage",
        "discountValue": 20
      }
    }
  ]
}
```

#### Get User Dashboard Stats
**GET** `/users/:id/dashboard-stats`

Get user's dashboard statistics.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "totalEnrolledCourses": 2,
  "totalEnrolledClasses": 1,
  "completedLessons": 12,
  "totalLessons": 24
}
```

> **Note:** The `studyTimeThisMonth` field has been removed and is no longer returned by this endpoint.

#### Get User Enrolled Courses
**GET** `/users/:id/enrolled-courses`

Get user's enrolled courses with detailed information.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
[
  {
    "id": "uuid",
    "courseId": "uuid",
    "courseTitle": "JavaScript Fundamentals",
    "progress": 75,
    "status": "in_progress",
    "enrolledAt": "2024-01-15T00:00:00.000Z",
    "lastAccessedAt": "2024-06-28T10:30:00Z",
    "instructorName": "John Doe",
    "topic": "Programming",
    "duration": "8 weeks",
    "imageUrl": "https://example.com/course.jpg",
    "sponsorship": {
      "discountCode": "SPONSOR123",
      "discountType": "percentage",
      "discountValue": 20
    }
  }
]
```

#### Get User Enrolled Classes
**GET** `/users/:id/enrolled-classes`

Get user's enrolled classes with detailed information.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
[
  {
    "id": "uuid",
    "classId": "uuid",
    "classTitle": "Advanced JavaScript Workshop",
    "instructorName": "Sarah Chen",
    "startDate": "2024-07-02T14:00:00Z",
    "endDate": "2024-07-02T16:00:00Z",
    "type": "online",
    "status": "scheduled",
    "enrolledAt": "2024-06-25T00:00:00Z",
    "topic": "Programming",
    "duration": "2 hours",
    "location": "Online"
  }
]
```

#### Get Current User's Enrolled Courses
**GET** `/users/enrollments/courses`

Get current user's enrolled courses (frontend compatible).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
[
  {
    "id": "uuid",
    "courseId": "uuid",
    "courseTitle": "JavaScript Fundamentals",
    "progress": 75,
    "status": "in_progress",
    "enrolledAt": "2024-01-15T00:00:00.000Z",
    "lastAccessedAt": "2024-06-28T10:30:00Z",
    "instructorName": "John Doe",
    "topic": "Programming",
    "duration": "8 weeks",
    "imageUrl": "https://example.com/course.jpg",
    "sponsorship": {
      "discountCode": "SPONSOR123",
      "discountType": "percentage",
      "discountValue": 20
    }
  }
]
```

#### Get Current User's Enrolled Classes
**GET** `/users/enrollments/classes`

Get current user's enrolled classes (frontend compatible).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
[
  {
    "id": "uuid",
    "classId": "uuid",
    "classTitle": "Advanced JavaScript Workshop",
    "instructorName": "Sarah Chen",
    "startDate": "2024-07-02T14:00:00Z",
    "endDate": "2024-07-02T16:00:00Z",
    "type": "online",
    "status": "scheduled",
    "enrolledAt": "2024-06-25T00:00:00Z",
    "topic": "Programming",
    "duration": "2 hours",
    "location": "Online"
  }
]
```

#### Get Current User's Dashboard Stats
**GET** `/users/dashboard-stats`

Get current user's dashboard statistics (frontend compatible).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "totalEnrolledCourses": 2,
  "totalEnrolledClasses": 1,
  "completedLessons": 12,
  "totalLessons": 24
}
```

> **Note:** The `studyTimeThisMonth` field has been removed and is no longer returned by this endpoint.

#### Get Current User's Settings
**GET** `/api/users/me/settings`

Get current user's preferences (notifications, privacy, appearance).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "emailNotifications": true,
  "pushNotifications": true,
  "courseNotifications": true,
  "classNotifications": true,
  "discussionNotifications": true,
  "testNotifications": true,
  "certificationNotifications": true,
  "paymentNotifications": true,
  "systemNotifications": true,
  "marketingEmails": false,
  "theme": "system",
  "language": "en",
  "timezone": "UTC"
}
```

#### Update Current User's Settings
**PUT** `/api/users/me/settings`

Update current user's preferences.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "emailNotifications": true,
  "pushNotifications": false,
  "theme": "dark",
  "language": "en",
  "timezone": "UTC"
}
```

**Response (200):**
```json
{
  "message": "Settings updated successfully"
}
```

#### Update Current User's Profile
**PUT** `/api/users/me/profile`

Update current user's profile information.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "location": "New York, NY",
  "bio": "Software developer passionate about learning"
}
```

**Response (200):**
```json
{
  "message": "Profile updated successfully"
}
```
