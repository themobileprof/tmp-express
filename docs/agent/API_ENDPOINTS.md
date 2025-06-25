# LMS API Endpoints Reference

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
- `instructorId` (string): Valid UUID of instructor

**Optional Fields:**
- `certification` (string): Certification name
- `imageUrl` (string): Course image URL

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

### Duplicate Lesson (Admin)
```http
POST /api/admin/lessons/:id/duplicate
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "title": "Lesson Title - Copy",
  "courseId": "uuid-of-target-course"
}
```

### Get Lesson Tests (Admin)
```http
GET /api/admin/lessons/:id/tests
Authorization: Bearer <access_token>
```

## Test Management

### Create Test
```http
POST /api/tests
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "course_id": 1,
  "lesson_id": 1,
  "title": "Test Title",
  "description": "Test description",
  "duration": 30,
  "passing_score": 70,
  "is_published": true,
  "questions": [
    {
      "type": "multiple_choice",
      "question": "What command is used to list files in Linux?",
      "options": ["ls", "dir", "list", "show"],
      "correct_answer": 0,
      "explanation": "The 'ls' command is used to list files and directories in Linux."
    },
    {
      "type": "true_false",
      "question": "Linux is an open-source operating system.",
      "correct_answer": true,
      "explanation": "Linux is indeed an open-source operating system."
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Test Title",
    "course_id": 1,
    "lesson_id": 1,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### Add Questions to Test
```http
POST /api/tests/:id/questions
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "questions": [
    {
      "type": "multiple_choice",
      "question": "Additional question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": 0,
      "explanation": "Explanation for the correct answer"
    }
  ]
}
```

### Get Test
```http
GET /api/tests/:id
Authorization: Bearer <access_token>
```

### List Tests by Course
```http
GET /api/courses/:course_id/tests
Authorization: Bearer <access_token>
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "field": "Error description"
    }
  }
}
```

## Common Error Codes

- `AUTHENTICATION_ERROR` - Invalid or expired token
- `AUTHORIZATION_ERROR` - Insufficient permissions
- `VALIDATION_ERROR` - Invalid request data
- `NOT_FOUND` - Resource not found
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `INTERNAL_ERROR` - Server error

## Rate Limiting

- Authentication endpoints: 5 requests per minute
- File upload: 10 requests per minute
- Other endpoints: 100 requests per minute

## Headers

Always include these headers:
```http
Authorization: Bearer <access_token>
Content-Type: application/json
User-Agent: CourseScrapingAgent/1.0
```

## Pagination

List endpoints support pagination:
```http
GET /api/courses?page=1&limit=10&sort=created_at&order=desc
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "pages": 10
    }
  }
}
``` 