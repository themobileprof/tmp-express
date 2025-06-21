# TheMobileProf API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Base URL](#base-url)
4. [Error Handling](#error-handling)
5. [Endpoints](#endpoints)
   - [Authentication](#authentication-endpoints)
   - [Users](#users-endpoints)
   - [Courses](#courses-endpoints)
   - [Classes](#classes-endpoints)
   - [Lessons](#lessons-endpoints)
   - [Tests](#tests-endpoints)
   - [Sponsorships](#sponsorships-endpoints)
   - [Sponsorship Opportunities](#sponsorship-opportunities-endpoints)
   - [Discussions](#discussions-endpoints)
   - [Certifications](#certifications-endpoints)
   - [Settings](#settings-endpoints)
   - [Payments](#payments-endpoints)
   - [Admin](#admin-endpoints)

## Overview

The TheMobileProf API is a RESTful API for a Learning Management System (LMS) that supports course management, user authentication, sponsorship programs, testing systems, and more.

**Base URL**: `http://localhost:3000/api`

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

## Base URL

All API endpoints are prefixed with `/api`

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

---

## Endpoints

### Authentication Endpoints

#### Register User
**POST** `/auth/register`

Register a new user with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "student"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "student",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "token": "jwt-token"
}
```

#### Login User
**POST** `/auth/login`

Authenticate user with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "student"
  },
  "token": "jwt-token"
}
```

#### Admin Login
**POST** `/auth/admin/login`

Authenticate admin user with email and password (admin only).

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "adminpassword"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "firstName": "Admin",
    "lastName": "User",
    "role": "admin"
  },
  "token": "jwt-token"
}
```

#### Google OAuth Login/Signup
**POST** `/auth/google`

Authenticate or register user with Google OAuth.

**Request Body:**
```json
{
  "token": "google_id_token",
  "firstName": "John",  // Optional, will use Google data if not provided
  "lastName": "Doe",    // Optional, will use Google data if not provided
  "role": "student"     // Optional, defaults to "student"
}
```

**Response (200/201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@gmail.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "student",
    "createdAt": "2024-01-01T00:00:00.000Z"  // Only for new users
  },
  "token": "jwt-token"
}
```

**Notes:**
- If user exists with Google ID, logs them in
- If user exists with email but different auth provider, links Google account
- If user doesn't exist, creates new account
- Google profile picture is automatically set as avatar
- Email verification status is set based on Google's verification

#### Get Current User
**GET** `/auth/me`

Get current user information.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "student",
    "avatarUrl": "https://example.com/avatar.jpg",
    "bio": "User bio",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "authProvider": "local",  // "local" or "google"
    "emailVerified": true,    // true for Google users, false for local users
    "settings": {
      "theme": "system",
      "language": "en",
      "timezone": "UTC"
    }
  }
}
```

#### Refresh Token
**POST** `/auth/refresh`

Refresh JWT token.

**Request Body:**
```json
{
  "token": "jwt-token"
}
```

**Response (200):**
```json
{
  "token": "new-jwt-token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "student"
  }
}
```

#### Change Password
**POST** `/auth/change-password`

Change user password (only for local authentication users).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

**Response (200):**
```json
{
  "message": "Password changed successfully"
}
```

**Error Response (400) - Google OAuth users:**
```json
{
  "error": "Password change not available for Google OAuth accounts",
  "message": "Invalid Operation"
}
```

---

### Users Endpoints

#### Get User Profile
**GET** `/users/:id`

Get user profile by ID.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "student",
  "avatarUrl": "https://example.com/avatar.jpg",
  "bio": "User bio",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "settings": {
    "theme": "system",
    "language": "en",
    "timezone": "UTC"
  }
}
```

#### Update User Profile
**PUT** `/users/:id`

Update user profile.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "bio": "Updated bio",
  "avatarUrl": "https://example.com/new-avatar.jpg"
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "firstName": "John",
  "lastName": "Smith",
  "bio": "Updated bio",
  "avatarUrl": "https://example.com/new-avatar.jpg",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
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

#### Get User Certifications
**GET** `/users/:id/certifications`

Get user's certifications.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "certifications": [
    {
      "id": "uuid",
      "certificationName": "JavaScript Developer",
      "issuer": "TheMobileProf",
      "issuedDate": "2024-01-01",
      "expiryDate": "2025-01-01",
      "certificateUrl": "https://example.com/certificate.pdf",
      "verificationCode": "CERT123456",
      "status": "issued",
      "course": {
        "id": "uuid",
        "title": "JavaScript Fundamentals",
        "topic": "Programming"
      }
    }
  ]
}
```

#### Get User Test Attempts
**GET** `/users/:id/test-attempts`

Get user's test attempts.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "attempts": [
    {
      "id": "uuid",
      "testTitle": "JavaScript Quiz",
      "courseTitle": "JavaScript Fundamentals",
      "attemptNumber": 1,
      "score": 85,
      "totalQuestions": 20,
      "correctAnswers": 17,
      "status": "completed",
      "startedAt": "2024-01-01T00:00:00.000Z",
      "completedAt": "2024-01-01T01:00:00.000Z",
      "timeTakenMinutes": 60
    }
  ]
}
```

---

### Courses Endpoints

#### Get All Courses
**GET** `/courses`

Get list of all courses with optional filtering.

**Query Parameters:**
- `topic` - Filter by topic
- `type` - Filter by type (online/offline)
- `instructorId` - Filter by instructor
- `isPublished` - Filter by publication status
- `limit` - Number of results (default: 20)
- `offset` - Number to skip (default: 0)

**Response (200):**
```json
{
  "courses": [
    {
      "id": "uuid",
      "title": "JavaScript Fundamentals",
      "description": "Learn JavaScript from scratch",
      "topic": "Programming",
      "type": "online",
      "certification": "JavaScript Developer",
      "price": 99.99,
      "rating": 4.5,
      "studentCount": 150,
      "duration": "8 weeks",
      "instructorId": "uuid",
      "instructorName": "John Doe",
      "imageUrl": "https://example.com/course.jpg",
      "isPublished": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Create Course
**POST** `/courses`

Create a new course (instructor only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "title": "JavaScript Fundamentals",
  "description": "Learn JavaScript from scratch",
  "topic": "Programming",
  "type": "online",
  "certification": "JavaScript Developer",
  "price": 99.99,
  "duration": "8 weeks",
  "imageUrl": "https://example.com/course.jpg"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "title": "JavaScript Fundamentals",
  "description": "Learn JavaScript from scratch",
  "topic": "Programming",
  "type": "online",
  "certification": "JavaScript Developer",
  "price": 99.99,
  "duration": "8 weeks",
  "instructorId": "uuid",
  "imageUrl": "https://example.com/course.jpg",
  "isPublished": false,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### Get Course by ID
**GET** `/courses/:id`

Get detailed course information.

**Response (200):**
```json
{
  "id": "uuid",
  "title": "JavaScript Fundamentals",
  "description": "Learn JavaScript from scratch",
  "topic": "Programming",
  "type": "online",
  "certification": "JavaScript Developer",
  "price": 99.99,
  "rating": 4.5,
  "studentCount": 150,
  "duration": "8 weeks",
  "instructorId": "uuid",
  "instructorName": "John Doe",
  "instructorAvatar": "https://example.com/avatar.jpg",
  "instructorBio": "Experienced JavaScript developer",
  "imageUrl": "https://example.com/course.jpg",
  "isPublished": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Update Course
**PUT** `/courses/:id`

Update course information (instructor only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "title": "Updated JavaScript Fundamentals",
  "description": "Updated description",
  "price": 89.99,
  "isPublished": true
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "title": "Updated JavaScript Fundamentals",
  "description": "Updated description",
  "topic": "Programming",
  "type": "online",
  "certification": "JavaScript Developer",
  "price": 89.99,
  "duration": "8 weeks",
  "imageUrl": "https://example.com/course.jpg",
  "isPublished": true,
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Get Course Lessons
**GET** `/courses/:id/lessons`

Get all lessons for a course.

**Response (200):**
```json
{
  "lessons": [
    {
      "id": "uuid",
      "title": "Introduction to JavaScript",
      "description": "Basic concepts",
      "content": "Lesson content...",
      "videoUrl": "https://example.com/video.mp4",
      "durationMinutes": 45,
      "orderIndex": 1,
      "isPublished": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Get Course Tests
**GET** `/courses/:id/tests`

Get all tests for a course.

**Response (200):**
```json
{
  "tests": [
    {
      "id": "uuid",
      "title": "JavaScript Quiz",
      "description": "Test your knowledge",
      "durationMinutes": 60,
      "passingScore": 70,
      "maxAttempts": 3,
      "orderIndex": 1,
      "isPublished": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Enroll in Course
**POST** `/courses/:id/enroll`

Enroll in a course.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "sponsorshipId": "uuid"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "courseId": "uuid",
  "enrollmentType": "course",
  "progress": 0,
  "status": "enrolled",
  "sponsorshipId": "uuid",
  "enrolledAt": "2024-01-01T00:00:00.000Z"
}
```

---

### Classes Endpoints

#### Get All Classes
**GET** `/classes`

Get list of all classes with optional filtering.

**Query Parameters:**
- `topic` - Filter by topic
- `type` - Filter by type (online/hybrid)
- `instructorId` - Filter by instructor
- `isPublished` - Filter by publication status
- `limit` - Number of results (default: 20)
- `offset` - Number to skip (default: 0)

**Response (200):**
```json
{
  "classes": [
    {
      "id": "uuid",
      "title": "JavaScript Workshop",
      "description": "Hands-on JavaScript workshop",
      "topic": "Programming",
      "type": "online",
      "startDate": "2024-02-01",
      "endDate": "2024-02-15",
      "duration": "2 weeks",
      "price": 199.99,
      "instructorId": "uuid",
      "instructorName": "John Doe",
      "availableSlots": 15,
      "totalSlots": 20,
      "location": "Online",
      "isPublished": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Create Class
**POST** `/classes`

Create a new class (instructor only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "title": "JavaScript Workshop",
  "description": "Hands-on JavaScript workshop",
  "topic": "Programming",
  "type": "online",
  "startDate": "2024-02-01",
  "endDate": "2024-02-15",
  "duration": "2 weeks",
  "price": 199.99,
  "availableSlots": 20,
  "totalSlots": 20,
  "location": "Online"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "title": "JavaScript Workshop",
  "description": "Hands-on JavaScript workshop",
  "topic": "Programming",
  "type": "online",
  "startDate": "2024-02-01",
  "endDate": "2024-02-15",
  "duration": "2 weeks",
  "price": 199.99,
  "instructorId": "uuid",
  "availableSlots": 20,
  "totalSlots": 20,
  "location": "Online",
  "isPublished": false,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### Get Class by ID
**GET** `/classes/:id`

Get detailed class information.

**Response (200):**
```json
{
  "id": "uuid",
  "title": "JavaScript Workshop",
  "description": "Hands-on JavaScript workshop",
  "topic": "Programming",
  "type": "online",
  "startDate": "2024-02-01",
  "endDate": "2024-02-15",
  "duration": "2 weeks",
  "price": 199.99,
  "instructorId": "uuid",
  "instructorName": "John Doe",
  "instructorAvatar": "https://example.com/avatar.jpg",
  "instructorBio": "Experienced instructor",
  "availableSlots": 15,
  "totalSlots": 20,
  "location": "Online",
  "isPublished": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "courses": [
    {
      "id": "uuid",
      "title": "JavaScript Fundamentals",
      "topic": "Programming",
      "duration": "8 weeks",
      "orderIndex": 1
    }
  ]
}
```

#### Enroll in Class
**POST** `/classes/:id/enroll`

Enroll in a class.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (201):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "classId": "uuid",
  "enrollmentType": "class",
  "progress": 0,
  "status": "enrolled",
  "enrolledAt": "2024-01-01T00:00:00.000Z"
}
```

---

### Lessons Endpoints

#### Get Lesson by ID
**GET** `/lessons/:id`

Get lesson details.

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
  "title": "Introduction to JavaScript",
  "description": "Basic concepts",
  "content": "Lesson content...",
  "videoUrl": "https://example.com/video.mp4",
  "durationMinutes": 45,
  "orderIndex": 1,
  "isPublished": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Update Lesson
**PUT** `/lessons/:id`

Update lesson (instructor only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "title": "Updated Lesson Title",
  "description": "Updated description",
  "content": "Updated content",
  "videoUrl": "https://example.com/new-video.mp4",
  "durationMinutes": 50,
  "isPublished": true
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "title": "Updated Lesson Title",
  "description": "Updated description",
  "content": "Updated content",
  "videoUrl": "https://example.com/new-video.mp4",
  "durationMinutes": 50,
  "orderIndex": 1,
  "isPublished": true,
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

### Tests Endpoints

#### Get Test by ID
**GET** `/tests/:id`

Get test details.

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
  "description": "Test your knowledge",
  "durationMinutes": 60,
  "passingScore": 70,
  "maxAttempts": 3,
  "orderIndex": 1,
  "isPublished": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Get Test Questions
**GET** `/tests/:id/questions`

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

#### Start Test Attempt
**POST** `/tests/:id/start`

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

#### Submit Answer
**PUT** `/tests/:id/attempts/:attemptId/answer`

Submit an answer for a test question.

**Headers:**
```
Authorization: Bearer <jwt-token>
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
**POST** `/tests/:id/attempts/:attemptId/submit`

Submit completed test.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

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
    "passed": true
  }
}
```

#### Get Test Results
**GET** `/tests/:id/attempts/:attemptId/results`

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
      "correctAnswerText": null,
      "userAnswer": 0,
      "userAnswerText": null,
      "isCorrect": true,
      "pointsEarned": 1,
      "points": 1
    }
  ]
}
```

---

### Sponsorships Endpoints

#### Get All Sponsorships
**GET** `/sponsorships`

Get list of sponsorships (sponsor only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `status` - Filter by status
- `courseId` - Filter by course

**Response (200):**
```json
{
  "sponsorships": [
    {
      "id": "uuid",
      "courseId": "uuid",
      "courseTitle": "JavaScript Fundamentals",
      "coursePrice": 99.99,
      "discountCode": "SPONSOR123",
      "discountType": "percentage",
      "discountValue": 20,
      "maxStudents": 50,
      "studentsUsed": 25,
      "remainingSpots": 25,
      "startDate": "2024-01-01",
      "endDate": "2024-12-31",
      "status": "active",
      "completionRate": 75.5,
      "notes": "Special discount for students",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Create Sponsorship
**POST** `/sponsorships`

Create a new sponsorship (sponsor only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "courseId": "uuid",
  "discountType": "percentage",
  "discountValue": 20,
  "maxStudents": 50,
  "duration": 6,
  "notes": "Special discount for students"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "sponsorId": "uuid",
  "courseId": "uuid",
  "discountCode": "SPONSOR123",
  "discountType": "percentage",
  "discountValue": 20,
  "maxStudents": 50,
  "studentsUsed": 0,
  "startDate": "2024-01-01",
  "endDate": "2024-07-01",
  "status": "active",
  "completionRate": 0,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### Validate Sponsorship Code
**GET** `/sponsorships/code/:discountCode`

Validate a sponsorship discount code.

**Response (200):**
```json
{
  "valid": true,
  "sponsorship": {
    "id": "uuid",
    "courseName": "JavaScript Fundamentals",
    "coursePrice": 99.99,
    "discountType": "percentage",
    "discountValue": 20,
    "maxStudents": 50,
    "studentsUsed": 25,
    "remainingSpots": 25,
    "startDate": "2024-01-01",
    "endDate": "2024-12-31",
    "isExpired": false,
    "isFull": false
  }
}
```

#### Use Sponsorship Code
**POST** `/sponsorships/:id/use`

Use a sponsorship code for enrollment.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "studentId": "uuid",
  "courseId": "uuid"
}
```

**Response (200):**
```json
{
  "success": true,
  "originalPrice": 99.99,
  "discountAmount": 19.99,
  "finalPrice": 80.00,
  "message": "Sponsorship code applied successfully"
}
```

#### Send Sponsorship Email
**POST** `/sponsorships/:id/email`

Send sponsorship details via email.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "recipientEmail": "student@example.com",
  "isForRecipient": true,
  "customMessage": "Congratulations! You've been selected for this educational sponsorship."
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Sponsorship details sent successfully"
}
```

#### Get Sponsorship Statistics
**GET** `/sponsorships/:id/stats`

Get detailed sponsorship statistics.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "totalSponsored": 25000,
  "studentsImpacted": 1250,
  "coursesSponsored": 12,
  "averageCompletionRate": 78,
  "monthlyStats": [
    {
      "month": "2024-01",
      "studentsEnrolled": 45,
      "completionRate": 82
    }
  ],
  "demographics": {
    "ageGroups": {
      "18-25": 45,
      "26-35": 35,
      "36+": 20
    },
    "locations": {
      "Nigeria": 60,
      "Ghana": 25,
      "Other": 15
    }
  }
}
```

---

### Sponsorship Opportunities Endpoints

#### Get All Opportunities
**GET** `/sponsorship-opportunities`

Get list of sponsorship opportunities.

**Query Parameters:**
- `isActive` - Filter by active status
- `urgency` - Filter by urgency level
- `limit` - Number of results (default: 20)
- `offset` - Number to skip (default: 0)

**Response (200):**
```json
{
  "opportunities": [
    {
      "id": "uuid",
      "courseId": "uuid",
      "courseName": "JavaScript Fundamentals",
      "courseDescription": "Learn JavaScript from scratch",
      "courseDuration": "8 weeks",
      "courseTopic": "Programming",
      "instructor": "John Doe",
      "instructorAvatar": "https://example.com/avatar.jpg",
      "targetStudents": 100,
      "fundingGoal": 5000.00,
      "fundingRaised": 2500.00,
      "fundingProgress": "50.00",
      "urgency": "high",
      "demographics": "Students aged 18-25",
      "impactDescription": "Help students learn programming",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Create Opportunity
**POST** `/sponsorship-opportunities`

Create a new sponsorship opportunity (instructor only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "courseId": "uuid",
  "targetStudents": 100,
  "fundingGoal": 5000.00,
  "urgency": "high",
  "demographics": "Students aged 18-25",
  "impactDescription": "Help students learn programming"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "courseId": "uuid",
  "targetStudents": 100,
  "fundingGoal": 5000.00,
  "fundingRaised": 0,
  "urgency": "high",
  "demographics": "Students aged 18-25",
  "impactDescription": "Help students learn programming",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### Contribute to Opportunity
**POST** `/sponsorship-opportunities/:id/contribute`

Contribute to a sponsorship opportunity.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "amount": 100.00,
  "message": "Supporting education"
}
```

**Response (200):**
```json
{
  "success": true,
  "amount": 100.00,
  "newFundingRaised": 2600.00,
  "message": "Contribution recorded successfully"
}
```

---

### Discussions Endpoints

#### Get All Discussions
**GET** `/discussions`

Get list of discussions.

**Query Parameters:**
- `category` - Filter by category
- `courseId` - Filter by course
- `classId` - Filter by class
- `authorId` - Filter by author
- `limit` - Number of results (default: 20)
- `offset` - Number to skip (default: 0)

**Response (200):**
```json
{
  "discussions": [
    {
      "id": "uuid",
      "title": "JavaScript Best Practices",
      "content": "What are the best practices for JavaScript?",
      "category": "Programming",
      "authorId": "uuid",
      "authorName": "John Doe",
      "authorAvatar": "https://example.com/avatar.jpg",
      "courseId": "uuid",
      "courseTitle": "JavaScript Fundamentals",
      "classId": null,
      "classTitle": null,
      "isPinned": false,
      "replyCount": 5,
      "lastActivityAt": "2024-01-01T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Create Discussion
**POST** `/discussions`

Create a new discussion.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "title": "JavaScript Best Practices",
  "content": "What are the best practices for JavaScript?",
  "category": "Programming",
  "courseId": "uuid"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "title": "JavaScript Best Practices",
  "content": "What are the best practices for JavaScript?",
  "category": "Programming",
  "authorId": "uuid",
  "courseId": "uuid",
  "classId": null,
  "isPinned": false,
  "replyCount": 0,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### Get Discussion Replies
**GET** `/discussions/:id/replies`

Get replies for a discussion.

**Response (200):**
```json
{
  "replies": [
    {
      "id": "uuid",
      "discussionId": "uuid",
      "authorId": "uuid",
      "authorName": "Jane Smith",
      "authorAvatar": "https://example.com/avatar.jpg",
      "content": "Great question! Here are some best practices...",
      "parentReplyId": null,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Add Reply
**POST** `/discussions/:id/replies`

Add a reply to a discussion.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "content": "Great question! Here are some best practices...",
  "parentReplyId": "uuid"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "discussionId": "uuid",
  "authorId": "uuid",
  "content": "Great question! Here are some best practices...",
  "parentReplyId": "uuid",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

---

### Certifications Endpoints

#### Get All Certifications
**GET** `/certifications`

Get list of certifications.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `userId` - Filter by user
- `courseId` - Filter by course
- `classId` - Filter by class
- `status` - Filter by status
- `limit` - Number of results (default: 20)
- `offset` - Number to skip (default: 0)

**Response (200):**
```json
{
  "certifications": [
    {
      "id": "uuid",
      "userId": "uuid",
      "userName": "John Doe",
      "userEmail": "john@example.com",
      "certificationName": "JavaScript Developer",
      "issuer": "TheMobileProf",
      "issuedDate": "2024-01-01",
      "expiryDate": "2025-01-01",
      "certificateUrl": "https://example.com/certificate.pdf",
      "verificationCode": "CERT123456",
      "status": "issued",
      "courseId": "uuid",
      "courseTitle": "JavaScript Fundamentals",
      "classId": null,
      "classTitle": null,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Create Certification
**POST** `/certifications`

Create a new certification (instructor only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "userId": "uuid",
  "certificationName": "JavaScript Developer",
  "issuer": "TheMobileProf",
  "issuedDate": "2024-01-01",
  "expiryDate": "2025-01-01",
  "courseId": "uuid",
  "certificateUrl": "https://example.com/certificate.pdf"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "courseId": "uuid",
  "classId": null,
  "certificationName": "JavaScript Developer",
  "issuer": "TheMobileProf",
  "issuedDate": "2024-01-01",
  "expiryDate": "2025-01-01",
  "certificateUrl": "https://example.com/certificate.pdf",
  "verificationCode": "CERT123456",
  "status": "issued",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### Verify Certification
**GET** `/certifications/verify/:code`

Verify a certification by code.

**Response (200):**
```json
{
  "valid": true,
  "certification": {
    "id": "uuid",
    "userName": "John Doe",
    "certificationName": "JavaScript Developer",
    "issuer": "TheMobileProf",
    "issuedDate": "2024-01-01",
    "expiryDate": "2025-01-01",
    "status": "issued",
    "courseTitle": "JavaScript Fundamentals",
    "classTitle": null,
    "isExpired": false
  }
}
```

---

### Settings Endpoints

#### Get User Settings
**GET** `/settings`

Get current user settings.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "emailNotifications": true,
  "pushNotifications": true,
  "marketingEmails": false,
  "theme": "system",
  "language": "en",
  "timezone": "UTC"
}
```

#### Update User Settings
**PUT** `/settings`

Update user settings.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "emailNotifications": false,
  "theme": "dark",
  "language": "es",
  "timezone": "America/New_York"
}
```

**Response (200):**
```json
{
  "emailNotifications": false,
  "pushNotifications": true,
  "marketingEmails": false,
  "theme": "dark",
  "language": "es",
  "timezone": "America/New_York"
}
```

---

### Payments Endpoints

#### Initialize Payment
**POST** `/payments/initialize`

Initialize a payment for a course or class.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "paymentType": "course",
  "itemId": "uuid",
  "paymentMethod": "card"
}
```

**Response (200):**
```json
{
  "success": true,
  "paymentId": "uuid",
  "reference": "TMP_1234567890_ABC123",
  "authorizationUrl": "https://checkout.flutterwave.com/v3/hosted/pay/...",
  "paymentData": {
    "link": "https://checkout.flutterwave.com/v3/hosted/pay/...",
    "status": "pending"
  }
}
```

#### Verify Payment
**GET** `/payments/verify/:reference`

Verify payment status and complete enrollment.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Payment verified and enrollment completed",
  "payment": {
    "id": "uuid",
    "amount": 99.99,
    "status": "successful",
    "transactionId": "FLW123456789"
  }
}
```

#### Get User Payments
**GET** `/payments/user`

Get user's payment history.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `limit` - Number of results (default: 20)
- `offset` - Number to skip (default: 0)

**Response (200):**
```json
{
  "payments": [
    {
      "id": "uuid",
      "paymentType": "course",
      "amount": 99.99,
      "currency": "NGN",
      "status": "successful",
      "paymentMethod": "card",
      "reference": "TMP_1234567890_ABC123",
      "transactionId": "FLW123456789",
      "course": {
        "id": "uuid",
        "title": "JavaScript Fundamentals",
        "topic": "Programming"
      },
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Payment Webhook
**POST** `/payments/webhook`

Flutterwave webhook handler (no authentication required).

**Headers:**
```
verif-hash: <webhook-signature>
```

**Request Body:**
```json
{
  "event": "charge.completed",
  "data": {
    "tx_ref": "TMP_1234567890_ABC123",
    "status": "successful",
    "id": "FLW123456789"
  }
}
```

**Response (200):**
```json
{
  "status": "success"
}
```

---

### Admin Endpoints

#### Get All Certifications
**GET** `/admin/certifications`

Get list of all certifications.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `limit` - Number of results (default: 20)
- `offset` - Number to skip (default: 0)

**Response (200):**
```json
{
  "certifications": [
    {
      "id": "uuid",
      "userId": "uuid",
      "userName": "John Doe",
      "userEmail": "john@example.com",
      "certificationName": "JavaScript Developer",
      "issuer": "TheMobileProf",
      "issuedDate": "2024-01-01",
      "expiryDate": "2025-01-01",
      "certificateUrl": "https://example.com/certificate.pdf",
      "verificationCode": "CERT123456",
      "status": "issued",
      "courseId": "uuid",
      "courseTitle": "JavaScript Fundamentals",
      "classId": null,
      "classTitle": null,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### Admin Management Endpoints

#### User Management

##### Get All Users (Admin)
**GET** `/admin/users`

Get list of all users with pagination and filtering.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Number of results (default: 20)
- `role` - Filter by role (student, instructor, admin, sponsor)
- `search` - Search by name or email
- `status` - Filter by status (active, inactive)

**Response (200):**
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "student",
      "avatar_url": "https://example.com/avatar.jpg",
      "created_at": "2024-01-01T00:00:00.000Z",
      "is_active": true,
      "auth_provider": "local",
      "email_verified": true,
      "enrollment_count": 5,
      "course_count": 0
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

##### Create User (Admin)
**POST** `/admin/users`

Create a new user (admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "student"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "newuser@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "role": "student",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

##### Update User (Admin)
**PUT** `/admin/users/:id`

Update user information (admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Johnson",
  "role": "instructor",
  "isActive": true
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "firstName": "Jane",
    "lastName": "Johnson",
    "role": "instructor",
    "isActive": true,
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

##### Delete User (Admin)
**DELETE** `/admin/users/:id`

Delete a user (admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "message": "User deleted successfully"
}
```

##### Update User Role (Admin)
**PUT** `/admin/users/:id/role`

Update user role (admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "role": "instructor"
}
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "instructor",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

##### Update User Status (Admin)
**PUT** `/admin/users/:id/status`

Update user active status (admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "isActive": false
}
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "isActive": false,
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

##### Get User Statistics (Admin)
**GET** `/admin/users/stats`

Get user statistics and analytics (admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "totalUsers": 2542,
  "activeUsers": 2245,
  "inactiveUsers": 297,
  "roleDistribution": {
    "students": 2245,
    "instructors": 285,
    "admins": 3,
    "sponsors": 12
  },
  "newUsersThisMonth": 156,
  "usersByStatus": {
    "active": 2245,
    "inactive": 297
  }
}
```

#### Course Management

##### Get All Courses (Admin)
**GET** `/admin/courses`

Get list of all courses with admin details.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Number of results (default: 20)
- `status` - Filter by status (published, draft)
- `instructor` - Filter by instructor name
- `search` - Search by title, description, or topic

**Response (200):**
```json
{
  "courses": [
    {
      "id": "uuid",
      "title": "JavaScript Fundamentals",
      "description": "Learn JavaScript from scratch",
      "topic": "Programming",
      "type": "online",
      "certification": "JavaScript Developer",
      "price": 99.99,
      "duration": "8 weeks",
      "instructor_id": "uuid",
      "instructor_first_name": "John",
      "instructor_last_name": "Doe",
      "enrollment_count": 150,
      "lesson_count": 12,
      "test_count": 3,
      "is_published": true,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "pages": 3
  }
}
```

##### Create Course (Admin)
**POST** `/admin/courses`

Create a new course (admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "title": "Advanced JavaScript",
  "description": "Master advanced JavaScript concepts",
  "topic": "Programming",
  "type": "online",
  "price": 149.99,
  "duration": "10 weeks",
  "instructorId": "uuid-of-instructor"
}
```

**Response (201):**
```json
{
  "course": {
    "id": "uuid",
    "title": "Advanced JavaScript",
    "description": "Master advanced JavaScript concepts",
    "topic": "Programming",
    "type": "online",
    "price": 149.99,
    "duration": "10 weeks",
    "instructor_id": "uuid-of-instructor",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

##### Update Course (Admin)
**PUT** `/admin/courses/:id`

Update course information (admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "title": "Advanced JavaScript Mastery",
  "price": 179.99,
  "isPublished": true
}
```

**Response (200):**
```json
{
  "course": {
    "id": "uuid",
    "title": "Advanced JavaScript Mastery",
    "price": 179.99,
    "is_published": true,
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

##### Delete Course (Admin)
**DELETE** `/admin/courses/:id`

Delete a course (admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "message": "Course deleted successfully"
}
```

##### Update Course Status (Admin)
**PUT** `/admin/courses/:id/status`

Update course publication status (admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "status": "published"
}
```

**Response (200):**
```json
{
  "success": true,
  "course": {
    "id": "uuid",
    "title": "JavaScript Fundamentals",
    "status": "published",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

##### Approve Course (Admin)
**POST** `/admin/courses/:id/approve`

Approve a course for publication (admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Course approved successfully",
  "course": {
    "id": "uuid",
    "title": "JavaScript Fundamentals",
    "status": "published",
    "approvedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

##### Reject Course (Admin)
**POST** `/admin/courses/:id/reject`

Reject a course submission (admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "reason": "Content does not meet quality standards"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Course rejected successfully",
  "course": {
    "id": "uuid",
    "title": "JavaScript Fundamentals",
    "status": "draft",
    "rejectedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

##### Archive Course (Admin)
**POST** `/admin/courses/:id/archive`

Archive a course (admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Course archived successfully",
  "course": {
    "id": "uuid",
    "title": "JavaScript Fundamentals",
    "status": "archived",
    "archivedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

##### Duplicate Course (Admin)
**POST** `/admin/courses/:id/duplicate`

Duplicate a course (admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "title": "JavaScript Fundamentals - Copy",
  "instructorId": "uuid-of-new-instructor"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Course duplicated successfully",
  "course": {
    "id": "uuid",
    "title": "JavaScript Fundamentals - Copy",
    "instructorId": "uuid-of-new-instructor",
    "status": "draft",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

##### Get Course Analytics (Admin)
**GET** `/admin/courses/:id/analytics`

Get detailed course analytics (admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "course": {
    "id": "uuid",
    "title": "JavaScript Fundamentals",
    "students": 245
  },
  "overview": {
    "totalQuestions": 50,
    "totalDuration": 120,
    "totalAttempts": 735,
    "averageScore": 78,
    "completionRate": 82
  },
  "lessonAnalytics": [
    {
      "lessonId": "uuid",
      "title": "Introduction to JavaScript",
      "completionRate": 95,
      "averageScore": 85,
      "tests": [
        {
          "testId": "uuid",
          "title": "JavaScript Basics Quiz",
          "attempts": 230,
          "averageScore": 85,
          "passRate": 90
        }
      ]
    }
  ],
  "studentProgress": [
    {
      "studentId": "uuid",
      "studentName": "John Doe",
      "progress": 75,
      "lessonsCompleted": 3,
      "testsCompleted": 2,
      "averageScore": 82
    }
  ]
}
```

##### Get Course Statistics (Admin)
**GET** `/admin/courses/stats`

Get course statistics and analytics (admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "totalCourses": 124,
  "publishedCourses": 98,
  "draftCourses": 15,
  "reviewCourses": 8,
  "archivedCourses": 3,
  "averageRating": 4.2,
  "totalEnrollments": 15420,
  "totalRevenue": 125600.50,
  "topCourses": [
    {
      "id": "uuid",
      "title": "JavaScript Fundamentals",
      "enrollments": 245,
      "rating": 4.5,
      "revenue": 24455.00
    }
  ]
}
```

#### Lesson Management

##### Get Course Lessons (Admin)
**GET** `/admin/courses/:courseId/lessons`

Get all lessons for a course.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Number of results (default: 20)
- `status` - Filter by status (published, draft, archived)

**Response (200):**
```json
{
  "lessons": [
    {
      "id": "uuid",
      "title": "Introduction to JavaScript",
      "description": "Basic JavaScript concepts",
      "content": "Lesson content...",
      "video_url": "https://example.com/video.mp4",
      "duration_minutes": 45,
      "order_index": 1,
      "status": "published",
      "test_count": 1,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 12,
    "pages": 1
  }
}
```

##### Create Lesson (Admin)
**POST** `/admin/courses/:courseId/lessons`

Create a new lesson for a course.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "title": "JavaScript Variables",
  "description": "Understanding variables in JavaScript",
  "content": "Variables are containers for storing data...",
  "durationMinutes": 30,
  "status": "published"
}
```

**Response (201):**
```json
{
  "lesson": {
    "id": "uuid",
    "title": "JavaScript Variables",
    "description": "Understanding variables in JavaScript",
    "content": "Variables are containers for storing data...",
    "duration_minutes": 30,
    "order_index": 2,
    "status": "published",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

##### Update Lesson (Admin)
**PUT** `/admin/lessons/:id`

Update lesson information.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "title": "JavaScript Variables and Constants",
  "durationMinutes": 35,
  "status": "published"
}
```

**Response (200):**
```json
{
  "lesson": {
    "id": "uuid",
    "title": "JavaScript Variables and Constants",
    "duration_minutes": 35,
    "status": "published",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

##### Delete Lesson (Admin)
**DELETE** `/admin/lessons/:id`

Delete a lesson.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "message": "Lesson deleted successfully"
}
```

##### Update Lesson Status (Admin)
**PUT** `/admin/lessons/:id/status`

Update lesson publication status.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "status": "published"
}
```

**Response (200):**
```json
{
  "success": true,
  "lesson": {
    "id": "uuid",
    "title": "JavaScript Variables",
    "status": "published",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

##### Duplicate Lesson (Admin)
**POST** `/admin/lessons/:id/duplicate`

Duplicate a lesson.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "title": "JavaScript Variables - Copy",
  "courseId": "uuid-of-target-course"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Lesson duplicated successfully",
  "lesson": {
    "id": "uuid",
    "title": "JavaScript Variables - Copy",
    "courseId": "uuid-of-target-course",
    "status": "draft",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

##### Get Lesson Tests (Admin)
**GET** `/admin/lessons/:id/tests`

Get all tests for a lesson.

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
      "title": "JavaScript Variables Quiz",
      "description": "Test your knowledge of variables",
      "durationMinutes": 30,
      "passingScore": 70,
      "maxAttempts": 3,
      "status": "active",
      "questionCount": 15,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

##### Create Lesson Test (Admin)
**POST** `/admin/lessons/:id/tests`

Create a new test for a lesson.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "title": "JavaScript Variables Quiz",
  "description": "Test your knowledge of variables",
  "durationMinutes": 30,
  "passingScore": 70,
  "maxAttempts": 3,
  "questions": [
    {
      "question": "What keyword is used to declare a variable in JavaScript?",
      "questionType": "multiple_choice",
      "options": ["var", "let", "const", "All of the above"],
      "correctAnswer": 3,
      "points": 5
    }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Test created successfully",
  "test": {
    "id": "uuid",
    "title": "JavaScript Variables Quiz",
    "description": "Test your knowledge of variables",
    "durationMinutes": 30,
    "passingScore": 70,
    "maxAttempts": 3,
    "status": "active",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "questions": [
    {
      "id": "uuid",
      "question": "What keyword is used to declare a variable in JavaScript?",
      "questionType": "multiple_choice",
      "options": ["var", "let", "const", "All of the above"],
      "correctAnswer": 3,
      "points": 5,
      "orderIndex": 1
    }
  ]
}
```

#### Test Management

##### Get Test Details (Admin)
**GET** `/admin/tests/:id`

Get detailed test information with questions and statistics.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "test": {
    "id": "uuid",
    "title": "JavaScript Fundamentals Test",
    "description": "Test your JavaScript knowledge",
    "duration_minutes": 60,
    "passing_score": 70,
    "max_attempts": 3,
    "status": "active",
    "course_title": "JavaScript Fundamentals",
    "lesson_title": "JavaScript Basics"
  },
  "questions": [
    {
      "id": "uuid",
      "question": "What is JavaScript?",
      "question_type": "multiple_choice",
      "options": ["Programming language", "Markup language", "Style sheet"],
      "correct_answer": 0,
      "points": 5,
      "order_index": 1
    }
  ],
  "statistics": {
    "total_attempts": 45,
    "average_score": 78.5,
    "passed_attempts": 32
  }
}
```

##### Update Test (Admin)
**PUT** `/admin/tests/:id`

Update test information.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "title": "JavaScript Fundamentals Assessment",
  "durationMinutes": 90,
  "passingScore": 75,
  "status": "active"
}
```

**Response (200):**
```json
{
  "test": {
    "id": "uuid",
    "title": "JavaScript Fundamentals Assessment",
    "duration_minutes": 90,
    "passing_score": 75,
    "status": "active",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

##### Add Question to Test (Admin)
**POST** `/admin/tests/:id/questions`

Add a new question to a test.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "question": "What is the purpose of 'let' in JavaScript?",
  "questionType": "multiple_choice",
  "options": ["Variable declaration", "Function declaration", "Loop control"],
  "correctAnswer": 0,
  "points": 5
}
```

**Response (201):**
```json
{
  "question": {
    "id": "uuid",
    "question": "What is the purpose of 'let' in JavaScript?",
    "question_type": "multiple_choice",
    "options": ["Variable declaration", "Function declaration", "Loop control"],
    "correct_answer": 0,
    "points": 5,
    "order_index": 5
  }
}
```

##### Update Test Status (Admin)
**PUT** `/admin/tests/:id/status`

Update test publication status.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "status": "active"
}
```

**Response (200):**
```json
{
  "success": true,
  "test": {
    "id": "uuid",
    "title": "JavaScript Fundamentals Test",
    "status": "active",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

##### Duplicate Test (Admin)
**POST** `/admin/tests/:id/duplicate`

Duplicate a test.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "title": "JavaScript Fundamentals Test - Copy",
  "courseId": "uuid-of-target-course"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Test duplicated successfully",
  "test": {
    "id": "uuid",
    "title": "JavaScript Fundamentals Test - Copy",
    "courseId": "uuid-of-target-course",
    "status": "draft",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

##### Update Test Question (Admin)
**PUT** `/admin/tests/:id/questions/:questionId`

Update a test question.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "question": "What is the purpose of 'const' in JavaScript?",
  "options": ["Constant declaration", "Variable declaration", "Function declaration"],
  "correctAnswer": 0,
  "points": 5
}
```

**Response (200):**
```json
{
  "success": true,
  "question": {
    "id": "uuid",
    "question": "What is the purpose of 'const' in JavaScript?",
    "options": ["Constant declaration", "Variable declaration", "Function declaration"],
    "correctAnswer": 0,
    "points": 5,
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

##### Delete Test Question (Admin)
**DELETE** `/admin/tests/:id/questions/:questionId`

Delete a test question.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Question deleted successfully"
}
```

##### Get Test Analytics (Admin)
**GET** `/admin/tests/:id/analytics`

Get comprehensive test analytics.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "test": {
    "id": "uuid",
    "title": "JavaScript Fundamentals Test",
    "course_title": "JavaScript Fundamentals"
  },
  "overview": {
    "total_attempts": 245,
    "average_score": 78.5,
    "passed_attempts": 185,
    "pass_rate": "75.5",
    "average_time": 52.3
  },
  "questionAnalytics": [
    {
      "questionId": "uuid",
      "question": "What is JavaScript?",
      "question_type": "multiple_choice",
      "total_answers": 245,
      "correct_answers": 225,
      "correct_rate": "91.8"
    }
  ],
  "timeDistribution": [
    {
      "range": "0-30 minutes",
      "count": 45,
      "percentage": "18.4"
    },
    {
      "range": "31-60 minutes",
      "count": 180,
      "percentage": "73.5"
    }
  ]
}
```

##### Upload Question Image (Admin)
**POST** `/admin/tests/:id/questions/:questionId/image/upload`

Upload an image for a test question.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: multipart/form-data
```

**Form Data:**
- `image` - Image file (PNG, JPG, JPEG, GIF, SVG)
- `alt` - Alt text for the image

**Response (200):**
```json
{
  "success": true,
  "imageUrl": "https://example.com/uploads/question-images/uuid.png",
  "message": "Image uploaded successfully"
}
```

#### Class Management

##### Get All Classes (Admin)
**GET** `/admin/classes`

Get list of all classes with admin details.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Number of results (default: 20)
- `status` - Filter by status (scheduled, in_progress, completed, cancelled)
- `instructor` - Filter by instructor name
- `search` - Search by title or description

**Response (200):**
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
      "status": "scheduled",
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

##### Create Class (Admin)
**POST** `/admin/classes`

Create a new class.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
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

**Response (201):**
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

##### Get Class Enrollments (Admin)
**GET** `/admin/classes/:id/enrollments`

Get all enrollments for a specific class.

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
      "user_id": "uuid",
      "first_name": "Jane",
      "last_name": "Smith",
      "email": "jane@example.com",
      "role": "student",
      "enrolled_at": "2024-01-15T00:00:00.000Z",
      "status": "enrolled",
      "progress": 0
    }
  ]
}
```

#### Sponsorship Management

##### Get All Sponsorships (Admin)
**GET** `/admin/sponsorships`

Get list of all sponsorships with admin details.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Number of results (default: 20)
- `status` - Filter by status (active, paused, expired, completed)
- `sponsor` - Filter by sponsor name
- `search` - Search by course title or discount code

**Response (200):**
```json
{
  "sponsorships": [
    {
      "id": "uuid",
      "sponsor_first_name": "TechCorp",
      "sponsor_last_name": "Inc",
      "course_title": "JavaScript Fundamentals",
      "discount_code": "TECH50",
      "discount_type": "percentage",
      "discount_value": 50,
      "max_students": 100,
      "usage_count": 25,
      "start_date": "2024-01-01",
      "end_date": "2024-12-31",
      "status": "active",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 30,
    "pages": 2
  }
}
```

##### Create Sponsorship (Admin)
**POST** `/admin/sponsorships`

Create a new sponsorship.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "sponsorId": "uuid-of-sponsor",
  "courseId": "uuid-of-course",
  "discountType": "percentage",
  "discountValue": 30,
  "maxStudents": 50,
  "startDate": "2024-01-01",
  "endDate": "2024-06-30",
  "notes": "Special discount for students"
}
```

**Response (201):**
```json
{
  "sponsorship": {
    "id": "uuid",
    "sponsor_id": "uuid-of-sponsor",
    "course_id": "uuid-of-course",
    "discount_code": "AUTO123456",
    "discount_type": "percentage",
    "discount_value": 30,
    "max_students": 50,
    "start_date": "2024-01-01",
    "end_date": "2024-06-30",
    "notes": "Special discount for students",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

##### Get Sponsorship Usage (Admin)
**GET** `/admin/sponsorships/:id/usage`

Get usage details for a specific sponsorship.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "usage": [
    {
      "id": "uuid",
      "student_id": "uuid",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "discount_amount": 29.99,
      "used_at": "2024-01-15T00:00:00.000Z"
    }
  ]
}
```

##### Update Sponsorship Status (Admin)
**PUT** `/admin/sponsorships/:id/status`

Update sponsorship status (admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "status": "paused"
}
```

**Response (200):**
```json
{
  "success": true,
  "sponsorship": {
    "id": "uuid",
    "discountCode": "TECH50",
    "status": "paused",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

##### Get Sponsorship Statistics (Admin)
**GET** `/admin/sponsorships/stats`

Get comprehensive sponsorship statistics (admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "overview": {
    "totalSponsorships": 45,
    "activeSponsorships": 32,
    "pausedSponsorships": 8,
    "expiredSponsorships": 5,
    "totalStudentsHelped": 1250,
    "totalSavings": 45200.25
  },
  "topSponsors": [
    {
      "sponsorId": "uuid",
      "sponsorName": "TechCorp Inc",
      "sponsorshipsCreated": 12,
      "studentsHelped": 450,
      "totalSavings": 15000.00
    }
  ],
  "monthlyStats": [
    {
      "month": "2024-01",
      "newSponsorships": 8,
      "studentsEnrolled": 125,
      "totalSavings": 8500.00
    }
  ]
}
```

#### Discussion Management

##### Get All Discussions (Admin)
**GET** `/admin/discussions`

Get list of all discussions with admin details.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Number of results (default: 20)
- `type` - Filter by type (course, class, general)
- `author` - Filter by author name
- `search` - Search by title or content

**Response (200):**
```json
{
  "discussions": [
    {
      "id": "uuid",
      "title": "JavaScript Best Practices",
      "content": "What are the best practices for JavaScript?",
      "author_first_name": "John",
      "author_last_name": "Doe",
      "course_title": "JavaScript Fundamentals",
      "class_title": null,
      "reply_count": 5,
      "is_pinned": false,
      "is_locked": false,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

##### Update Discussion (Admin)
**PUT** `/admin/discussions/:id`

Update discussion (moderation).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "title": "Updated Discussion Title",
  "isPinned": true,
  "isLocked": false
}
```

**Response (200):**
```json
{
  "discussion": {
    "id": "uuid",
    "title": "Updated Discussion Title",
    "is_pinned": true,
    "is_locked": false,
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Certification Management

##### Get All Certifications (Admin)
**GET** `/admin/certifications`

Get list of all certifications with admin details.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Number of results (default: 20)
- `status` - Filter by status (active, expired, revoked)
- `student` - Filter by student name
- `search` - Search by title or issuer name

**Response (200):**
```json
{
  "certifications": [
    {
      "id": "uuid",
      "student_first_name": "John",
      "student_last_name": "Doe",
      "student_email": "john@example.com",
      "title": "JavaScript Developer",
      "description": "Certified JavaScript Developer",
      "issuer_name": "TheMobileProf",
      "issued_at": "2024-01-15",
      "expiry_date": "2026-01-15",
      "certificate_url": "https://example.com/certificate.pdf",
      "verification_code": "CERT123456",
      "status": "active",
      "created_at": "2024-01-15T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 120,
    "pages": 6
  }
}
```

##### Create Certification (Admin)
**POST** `/admin/certifications`

Create a new certification.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "studentId": "uuid-of-student",
  "title": "Advanced JavaScript Developer",
  "description": "Certified Advanced JavaScript Developer",
  "issuerName": "TheMobileProf",
  "issueDate": "2024-01-15",
  "expiryDate": "2026-01-15",
  "certificateUrl": "https://example.com/certificate.pdf"
}
```

**Response (201):**
```json
{
  "certification": {
    "id": "uuid",
    "student_id": "uuid-of-student",
    "title": "Advanced JavaScript Developer",
    "description": "Certified Advanced JavaScript Developer",
    "issuer_name": "TheMobileProf",
    "issued_at": "2024-01-15",
    "expiry_date": "2026-01-15",
    "certificate_url": "https://example.com/certificate.pdf",
    "verification_code": "AUTO123456",
    "status": "active",
    "created_at": "2024-01-15T00:00:00.000Z"
  }
}
```

#### Payment Management

##### Get Payment History (Admin)
**GET** `/admin/payments`

Get payment history with admin details.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Number of results (default: 20)
- `status` - Filter by status (successful, failed, pending)
- `paymentMethod` - Filter by payment method
- `search` - Search by user name or transaction ID

**Response (200):**
```json
{
  "payments": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "amount": 99.99,
      "currency": "NGN",
      "status": "successful",
      "payment_method": "card",
      "reference": "TMP_1234567890_ABC123",
      "transaction_id": "FLW123456789",
      "course_title": "JavaScript Fundamentals",
      "class_title": null,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 500,
    "pages": 25
  }
}
```

##### Get Payment Statistics (Admin)
**GET** `/admin/payments/stats`

Get comprehensive payment statistics.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `period` - Time period in days (default: 30)

**Response (200):**
```json
{
  "overview": {
    "total_payments": 500,
    "total_revenue": 49950.00,
    "successful_payments": 485,
    "failed_payments": 10,
    "pending_payments": 5,
    "average_payment": 99.90
  },
  "methodBreakdown": [
    {
      "payment_method": "card",
      "count": 300,
      "total_amount": 29970.00
    },
    {
      "payment_method": "bank_transfer",
      "count": 200,
      "total_amount": 19980.00
    }
  ],
  "dailyStats": [
    {
      "date": "2024-01-01",
      "payment_count": 15,
      "daily_revenue": 1498.50
    }
  ]
}
```

#### System Statistics

##### Get System Overview (Admin)
**GET** `/admin/stats/overview`

Get comprehensive system overview statistics.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "users": {
    "total": 2542,
    "students": 2245,
    "instructors": 285,
    "admins": 3,
    "sponsors": 12,
    "new_this_month": 156
  },
  "courses": {
    "total": 124,
    "published": 98,
    "draft": 15,
    "review": 8,
    "archived": 3
  },
  "tests": {
    "total": 856,
    "active": 734,
    "draft": 122
  },
  "enrollments": {
    "total_enrollments": 15420,
    "completed": 8560,
    "in_progress": 6860
  },
  "sponsorships": {
    "total_sponsorships": 45,
    "active": 32,
    "total_students_helped": 1250
  }
}
```

##### Get User Statistics (Admin)
**GET** `/admin/stats/users`

Get detailed user statistics and analytics.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `period` - Time period in days (default: 30)

**Response (200):**
```json
{
  "dailyStats": [
    {
      "date": "2024-01-01",
      "new_users": 15,
      "new_students": 12,
      "new_instructors": 2,
      "new_sponsors": 1
    }
  ],
  "roleDistribution": [
    {
      "role": "student",
      "count": 2245,
      "percentage": 88.3
    },
    {
      "role": "instructor",
      "count": 285,
      "percentage": 11.2
    }
  ],
  "activeUsers": 1850,
  "userGrowth": {
    "thisMonth": 156,
    "lastMonth": 142,
    "growthRate": "9.9"
  }
}
```

##### Get Course Statistics (Admin)
**GET** `/admin/stats/courses`

Get detailed course statistics and analytics.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "courseDetails": [
    {
      "id": "uuid",
      "title": "JavaScript Fundamentals",
      "topic": "Programming",
      "price": 99.99,
      "is_published": true,
      "instructor_first_name": "John",
      "instructor_last_name": "Doe",
      "enrollment_count": 150,
      "completion_count": 120,
      "average_score": 85.5,
      "lesson_count": 12,
      "test_count": 3
    }
  ],
  "topicStats": [
    {
      "topic": "Programming",
      "course_count": 45,
      "average_price": 89.99,
      "published_count": 38
    }
  ],
  "publishingStats": {
    "published": 98,
    "draft": 15,
    "review": 8,
    "archived": 3
  }
}
```

##### Get Revenue Statistics (Admin)
**GET** `/admin/stats/revenue`

Get detailed revenue statistics and analytics.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `period` - Time period in days (default: 30)

**Response (200):**
```json
{
  "dailyRevenue": [
    {
      "date": "2024-01-01",
      "daily_revenue": 1498.50,
      "transaction_count": 15,
      "average_transaction": 99.90
    }
  ],
  "totalRevenue": {
    "total_revenue": 49950.00,
    "total_transactions": 500,
    "average_transaction": 99.90
  },
  "sponsorshipSavings": {
    "total_savings": 12500.00,
    "total_sponsorships_used": 250
  },
  "revenueBreakdown": {
    "courses": 35000.00,
    "classes": 14950.00
  }
}
```

#### System Settings

##### Get System Settings (Admin)
**GET** `/admin/settings`

Get all system settings.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "settings": {
    "site_name": "TheMobileProf LMS",
    "max_file_size": "10MB",
    "maintenance_mode": "false",
    "registration_enabled": "true",
    "email_verification_required": "true",
    "default_user_role": "student",
    "max_test_attempts": "3",
    "test_timeout_minutes": "120",
    "sponsorship_code_length": "10",
    "max_sponsorship_duration_months": "12"
  }
}
```

##### Update System Settings (Admin)
**PUT** `/admin/settings`

Update system settings.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "settings": {
    "site_name": "TheMobileProf Learning Platform",
    "max_file_size": "15MB",
    "maintenance_mode": "false",
    "registration_enabled": "true",
    "max_test_attempts": "5",
    "test_timeout_minutes": "90"
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Settings updated successfully",
  "updatedSettings": {
    "site_name": "TheMobileProf Learning Platform",
    "max_file_size": "15MB",
    "maintenance_mode": "false",
    "registration_enabled": "true",
    "max_test_attempts": "5",
    "test_timeout_minutes": "90"
  }
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse:
- **Limit**: 100 requests per 15 minutes per IP address
- **Headers**: Rate limit information is included in response headers
- **Configurable**: Limits can be adjusted via environment variables

## Pagination

Many endpoints support pagination using `limit` and `offset` query parameters:
- `limit`: Number of results to return (default: 20, max: 100)
- `offset`: Number of results to skip (default: 0)

Example:
```
GET /api/courses?limit=10&offset=20
```

## File Uploads

For file uploads (avatars, course images, etc.), the API supports:
- **Max file size**: 5MB (configurable)
- **Supported formats**: JPG, PNG, PDF
- **Upload path**: `/uploads` (configurable)

## Webhooks

The API supports webhooks for real-time notifications:
- **Event types**: User registration, course completion, test submission
- **Authentication**: Webhook signatures for security
- **Retry logic**: Automatic retry for failed deliveries

## SDKs and Libraries

Official SDKs are available for:
- **JavaScript/Node.js**: `npm install themobileprof-sdk`
- **Python**: `pip install themobileprof-sdk`
- **PHP**: `composer require themobileprof/sdk`

## Support

For API support:
- **Documentation**: [docs.themobileprof.com](https://docs.themobileprof.com)
- **Status Page**: [status.themobileprof.com](https://status.themobileprof.com)
- **Support Email**: api-support@themobileprof.com
- **Community Forum**: [community.themobileprof.com](https://community.themobileprof.com)

---

## File Upload Endpoints

### Upload Course Image
**POST** `/uploads/course-image`

Upload an image for a course.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: multipart/form-data
```

**Form Data:**
- `image` - Image file (PNG, JPG, JPEG)
- `courseId` - Course ID (optional, for existing courses)

**Response (200):**
```json
{
  "success": true,
  "imageUrl": "https://example.com/uploads/course-images/uuid.jpg",
  "message": "Course image uploaded successfully"
}
```

### Upload Lesson Material
**POST** `/uploads/lesson-material`

Upload a material file for a lesson.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: multipart/form-data
```

**Form Data:**
- `file` - File (PDF, DOC, DOCX, TXT, ZIP)
- `lessonId` - Lesson ID
- `description` - File description (optional)

**Response (200):**
```json
{
  "success": true,
  "fileUrl": "https://example.com/uploads/lesson-materials/uuid.pdf",
  "fileName": "lesson-notes.pdf",
  "fileSize": "1024000",
  "message": "Lesson material uploaded successfully"
}
```

### Upload User Avatar
**POST** `/uploads/avatar`

Upload a user avatar image.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: multipart/form-data
```

**Form Data:**
- `avatar` - Image file (PNG, JPG, JPEG)

**Response (200):**
```json
{
  "success": true,
  "avatarUrl": "https://example.com/uploads/user-avatars/uuid.jpg",
  "message": "Avatar uploaded successfully"
}
```

### Upload Certificate
**POST** `/uploads/certificate`

Upload a certificate file.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: multipart/form-data
```

**Form Data:**
- `certificate` - File (PDF, PNG, JPG)
- `certificationId` - Certification ID

**Response (200):**
```json
{
  "success": true,
  "certificateUrl": "https://example.com/uploads/certificates/uuid.pdf",
  "message": "Certificate uploaded successfully"
}
```

---

## Implementation Notes

### File Upload Configuration

#### Supported File Types
- **Lesson Materials**: PDF, DOC, DOCX, TXT, ZIP
- **Question Images**: PNG, JPG, JPEG, GIF, SVG
- **Course Images**: PNG, JPG, JPEG
- **User Avatars**: PNG, JPG, JPEG
- **Certificates**: PDF, PNG, JPG

#### File Size Limits
- **Images**: Maximum 5MB
- **Documents**: Maximum 25MB
- **Videos**: Maximum 500MB (if supporting video uploads)

#### Storage Structure
```
uploads/
├── course-images/
├── lesson-materials/
├── question-images/
├── user-avatars/
└── certificates/
```

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
TINYMCE_API_KEY=your-tinymce-api-key
ADMIN_DEFAULT_EMAIL=admin@themobileprof.com
ADMIN_DEFAULT_PASSWORD=secure_admin_password
FLUTTERWAVE_PUBLIC_KEY=your-flutterwave-public-key
FLUTTERWAVE_SECRET_KEY=your-flutterwave-secret-key
FLUTTERWAVE_WEBHOOK_SECRET=your-webhook-secret
GOOGLE_CLIENT_ID=your-google-client-id
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