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

Create a new user account.

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

Authenticate user and receive JWT token.

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

Change user password.

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