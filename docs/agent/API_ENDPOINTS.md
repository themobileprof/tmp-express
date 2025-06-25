# LMS API Endpoints Reference

> **Test Type Rule:**
> - Only `lesson_id` is nullable in the tests table.
> - If a test has both `course_id` and `lesson_id`, it is a **lesson test** (attached to a specific lesson).
> - If a test has a `course_id` but no `lesson_id`, it is a **course test** (attached to the course as a whole).

This document provides detailed information about all API endpoints that the course scraping agent needs to interact with.

## Base URL
```
https://api.themobileprof.com
```

## Authentication

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "your_email@example.com",
  "password": "your_password"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "User Name",
      "role": "admin"
    },
    "tokens": {
      "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

### Refresh Token
```http
POST /api/auth/refresh
Authorization: Bearer <refresh_token>
```

## File Upload

### Upload Screenshots/Images
```http
POST /api/upload
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

Form Data:
- file: <image_file>
- type: "screenshot" | "image"
- lesson_id: <optional_lesson_id>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://api.themobileprof.com/uploads/screenshots/abc123.png",
    "filename": "screenshot_001.png",
    "size": 24576,
    "mime_type": "image/png"
  }
}
```

### Upload Test Question Image
```http
POST /api/tests/:id/questions/:questionId/image/upload
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

Form Data:
- image: <image_file> (PNG, JPG, JPEG, GIF, SVG, max 5MB)

Response:
{
  "success": true,
  "imageUrl": "/uploads/question-images/<filename>",
  "message": "Image uploaded successfully"
}
```

## Course Management (Admin)

### Create Course (Admin)
```http
POST /api/admin/courses
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "title": "Course Title",
  "description": "Course description",
  "topic": "programming",
  "type": "online",
  "certification": "Certification Name",
  "price": 0,
  "duration": "6 weeks",
  "instructorId": "uuid",
  "status": "published"
}
```

**Required Fields:**
- `title` (string): Course title - must not be empty
- `description` (string): Course description - must not be empty
- `topic` (string): Course topic/category - must not be empty
- `type` (string): Must be either "online" or "offline"
- `price` (number): Course price - must be >= 0
- `duration` (string): Course duration - must not be empty

**Optional Fields:**
- `instructorId` (string): Valid UUID of instructor (courses can exist without an instructor)
- `certification` (string): Certification name
- `imageUrl` (string): Course image URL

**Important Notes:**
- **Courses** are content created by admins and can exist without an instructor
- **Classes** are instructor-led sessions that use existing courses
- **Instructors** create classes, not courses
- **Admins** create courses and lessons for content management
- When `instructorId` is not provided, the course will be created without an instructor
- Courses without instructors can still have lessons, tests, and enrollments

**Response:**
```json
{
  "success": true,
  "course": {
    "id": "uuid",
    "title": "Course Title",
    "description": "Course description",
    "topic": "programming",
    "type": "online",
    "certification": "Certification Name",
    "price": 0,
    "duration": "6 weeks",
    "instructorId": "uuid",
    "status": "published",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Validation Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "title": "Title is required and must not be empty",
      "instructorId": "Instructor ID must be a valid UUID"
    }
  }
}
```

### Get Courses (Admin)
```http
GET /api/admin/courses
Authorization: Bearer <access_token>
```

### Update Course (Admin)
```http
PUT /api/admin/courses/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "title": "Updated Course Title",
  "description": "Updated description",
  "topic": "updated topic",
  "type": "online",
  "certification": "Updated Certification",
  "price": 100,
  "duration": "8 weeks",
  "status": "published"
}
```

### Delete Course (Admin)
```http
DELETE /api/admin/courses/:id
Authorization: Bearer <access_token>
```

## Class Management (Admin)

### Get All Classes (Admin)
```http
GET /api/admin/classes
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Number of results (default: 20)
- `isPublished` - Filter by publication status (true/false)
- `instructor` - Filter by instructor name
- `search` - Search by title or description

**Response:**
```json
{
  "classes": [
    {
      "id": "uuid",
      "title": "JavaScript Workshop",
      "description": "Hands-on JavaScript training",
      "topic": "Programming",
      "type": "offline",
      "price": 199.99,
      "duration": "4 hours",
      "instructor_first_name": "John",
      "instructor_last_name": "Doe",
      "enrollment_count": 15,
      "completion_count": 12,
      "start_date": "2024-02-01",
      "end_date": "2024-02-01",
      "is_published": true,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 25,
    "pages": 2
  }
}
```

### Create Class (Admin)
```http
POST /api/admin/classes
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "title": "Advanced JavaScript Workshop",
  "description": "Advanced JavaScript concepts workshop",
  "topic": "Programming",
  "type": "offline",
  "price": 299.99,
  "duration": "6 hours",
  "instructorId": "uuid-of-instructor",
  "startDate": "2024-03-01",
  "endDate": "2024-03-01",
  "maxStudents": 20,
  "location": "Training Center"
}
```

**Response:**
```json
{
  "class": {
    "id": "uuid",
    "title": "Advanced JavaScript Workshop",
    "description": "Advanced JavaScript concepts workshop",
    "topic": "Programming",
    "type": "offline",
    "price": 299.99,
    "duration": "6 hours",
    "instructor_id": "uuid-of-instructor",
    "start_date": "2024-03-01",
    "end_date": "2024-03-01",
    "max_students": 20,
    "location": "Training Center",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### Update Class (Admin)
```http
PUT /api/admin/classes/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "title": "Updated JavaScript Workshop",
  "description": "Updated workshop description",
  "topic": "Programming",
  "type": "online",
  "price": 249.99,
  "duration": "8 hours",
  "startDate": "2024-04-01",
  "endDate": "2024-04-01",
  "maxStudents": 25,
  "location": "Online",
  "meetingLink": "https://meet.google.com/abc-defg-hij",
  "isPublished": true
}
```

**Response:**
```json
{
  "class": {
    "id": "uuid",
    "title": "Updated JavaScript Workshop",
    "description": "Updated workshop description",
    "topic": "Programming",
    "type": "online",
    "price": 249.99,
    "duration": "8 hours",
    "instructor_id": "uuid-of-instructor",
    "start_date": "2024-04-01",
    "end_date": "2024-04-01",
    "max_students": 25,
    "location": "Online",
    "meeting_link": "https://meet.google.com/abc-defg-hij",
    "is_published": true,
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### Get Class Enrollments (Admin)
```http
GET /api/admin/classes/:id/enrollments
Authorization: Bearer <access_token>
```

## Lesson Management (Admin)

### Create Lesson (Admin)
```http
POST /api/admin/courses/:courseId/lessons
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "title": "Lesson Title",
  "description": "Lesson description",
  "content": "<html>Lesson content with embedded screenshots</html>",
  "durationMinutes": 30,
  "status": "published"
}
```

**Required Fields:**
- `title` (string): Lesson title - must not be empty
- `description` (string): Lesson description - must not be empty
- `content` (string): HTML content with embedded screenshots - must not be empty
- `durationMinutes` (number): Lesson duration in minutes - must be > 0

**Optional Fields:**
- `status` (string): "published" or "draft" (default: "published")

**Response:**
```json
{
  "success": true,
  "lesson": {
    "id": "uuid",
    "title": "Lesson Title",
    "description": "Lesson description",
    "content": "<html>Lesson content with embedded screenshots</html>",
    "duration_minutes": 30,
    "order_index": 1,
    "status": "published",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### Get Lessons for a Course (Admin)
```http
GET /api/admin/courses/:courseId/lessons
Authorization: Bearer <access_token>
```

### Update Lesson (Admin)
```http
PUT /api/admin/lessons/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "title": "Updated Lesson Title",
  "description": "Updated description",
  "content": "Updated content",
  "durationMinutes": 35,
  "status": "published"
}
```

### Delete Lesson (Admin)
```http
DELETE /api/admin/lessons/:id
Authorization: Bearer <access_token>
```

### Update Lesson Status (Admin)
```http
PUT /api/admin/lessons/:id/status
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "status": "published"
}
```

### Test Management

> **Test Type Rule:**
> - Only `lesson_id` is nullable in the tests table.
> - If a test has both `course_id` and `lesson_id`, it is a **lesson test** (attached to a specific lesson).
> - If a test has a `course_id` but no `lesson_id`, it is a **course test** (attached to the course as a whole).

#### Create Test for a Lesson (Admin)
```http
POST /api/admin/lessons/:lessonId/tests
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "title": "Quiz Title",
  "description": "Quiz description",
  "durationMinutes": 30,
  "passingScore": 70,
  "maxAttempts": 3,
  "questions": [
    {
      "question": "What is Linux?",
      "questionType": "multiple_choice",
      "options": ["OS", "Browser", "Editor"],
      "correctAnswer": 0,
      "points": 1,
      "orderIndex": 1
    }
  ]
}
```
**Response:**
```json
{
  "test": { ... },
  "questions": [ ... ]
}
```

#### Get Tests for a Lesson (Admin)
```http
GET /api/admin/lessons/:lessonId/tests
Authorization: Bearer <access_token>
```

#### Get Test Details
```http
GET /api/tests/:id
Authorization: Bearer <access_token>
```

#### Add Question to Test
```http
POST /api/tests/:id/questions
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "question": "What is Bash?",
  "questionType": "multiple_choice",
  "options": ["Shell", "Kernel", "Editor"],
  "correctAnswer": 0,
  "points": 1,
  "orderIndex": 2
}
```

#### Get Test Questions
```http
GET /api/tests/:id/questions
Authorization: Bearer <access_token>
```