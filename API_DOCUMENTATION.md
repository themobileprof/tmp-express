# TheMobileProf API Documentation

> **Test Type Rule that determines which test is a course test and which is a lesson test:**
> - Only `lesson_id` is nullable in the tests table.
> - If a test has both `course_id` and `lesson_id`, it is a **lesson test** (attached to a specific lesson).
> - If a test has a `course_id` but no `lesson_id`, it is a **course test** (attached to the course as a whole).

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
   - [Certification Programs](#certification-programs-endpoints)
   - [Settings](#settings-endpoints)
   - [Payments](#payments-endpoints)
   - [Admin](#admin-endpoints)
   - [File Uploads](#file-upload-endpoints)
   - [Scraping Management](#scraping-management)
   - [Notifications](#notifications-endpoints)
   - [Search](#search-endpoints)
   - [Meta](#meta-endpoints)

## Overview

The TheMobileProf API is a RESTful API for a Learning Management System (LMS) that supports course management, user authentication, sponsorship programs, testing systems, file uploads, and more.

**Base URL**: `https://api.themobileprof.com`

**Implementation Status**: All documented endpoints are fully implemented and tested, including the complete file upload system with persistent storage support.

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

### Validation Errors

When validation fails, the API returns detailed error information:

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Validation failed",
  "details": {
    "fieldName": "Specific error message for this field",
    "anotherField": "Another specific error message"
  }
}
```

**Common Validation Rules:**
- **Required Fields**: Must be provided and non-empty
- **String Fields**: Must be non-empty strings if provided
- **Number Fields**: Must be valid numbers within specified ranges
- **Array Fields**: Must be arrays with valid content
- **UUID Fields**: Must be valid UUID format
- **Enum Fields**: Must be one of the allowed values

**Example Validation Error:**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Validation failed",
  "details": {
    "duration": "Duration is required and must not be empty",
    "prerequisites": "Prerequisites must be a non-empty string if provided",
    "syllabus": "Syllabus must be a non-empty string if provided"
  }
}
```

This error occurs when creating a course without providing required fields or with empty string values.

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
**POST** `/api/auth/login`

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

#### Get Current User Profile (Frontend Compatible)
**GET** `/auth/profile`

Get current user profile in frontend-compatible format.

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
  "profilePicture": "https://example.com/avatar.jpg",
  "bio": "User bio",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "authProvider": "local",
  "emailVerified": true,
  "settings": {
    "theme": "system",
    "language": "en",
    "timezone": "UTC"
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
      "enrolled_at": "2024-01-15T00:00:00.000Z",
      "status": "enrolled",
      "progress": 0
    }
  ]
}
```

#### Sponsorship Management

##### Get All Sponsorships (Admin)
**GET** `/api/admin/sponsorships`

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
**POST** `/api/admin/sponsorships`

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
**GET** `/api/admin/sponsorships/:id/usage`

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
**PUT** `/api/admin/sponsorships/:id/status`

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

##### Get Admin Overview (Includes Sponsorship Stats)
**GET** `/api/admin/stats/overview`

Get overall admin statistics including users, courses, tests, enrollments, and sponsorships.

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
    "draft": 26
  },
  "tests": {
    "total": 856,
    "published": 734,
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

#### Discussion Management

##### Get All Discussions (Admin)
**GET** `/api/admin/discussions`

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
**PUT** `/api/admin/discussions/:id`

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
**GET** `/api/admin/certifications`

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
**POST** `/api/admin/certifications`

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
**GET** `/api/admin/payments`

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
**GET** `/api/admin/stats/overview`

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
**GET** `/api/admin/stats/users`

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
**GET** `/api/admin/stats/courses`

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

#### Course Management (Admin)

##### Create Course (Admin)
**POST** `/api/admin/courses`

Create a new course.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Advanced JavaScript Programming",
  "description": "Learn advanced JavaScript concepts and modern development practices",
  "topic": "Programming",
  "type": "online",
  "price": 99.99,
  "duration": "8 weeks",
  "certification": "Certificate of Completion",
  "difficulty": "intermediate",
  "objectives": "Master advanced JavaScript concepts, learn modern frameworks, build real-world projects",
  "prerequisites": "Basic JavaScript knowledge, familiarity with HTML and CSS",
  "syllabus": "Week 1: Advanced Functions and Closures\nWeek 2: Object-Oriented Programming\nWeek 3: Asynchronous Programming\nWeek 4: Modern ES6+ Features",
  "tags": ["javascript", "programming", "web-development", "es6"],
  "instructorId": "uuid",
  "imageUrl": "https://api.themobileprof.com/uploads/course-images/course-image.jpg"
}
```

**Required Fields:**
- `title` - Course title (string, non-empty)
- `description` - Course description (string, non-empty)
- `topic` - Course topic (string, non-empty)
- `type` - Course type: "online" or "offline"
- `price` - Course price (number, positive)
- `duration` - Course duration (string, non-empty)
- `certification` - Certification type (string, non-empty)
- `difficulty` - Difficulty level: "beginner", "intermediate", "advanced"
- `objectives` - Learning objectives (string, non-empty)
- `prerequisites` - Prerequisites (string, non-empty)
- `syllabus` - Course syllabus (string, non-empty)
- `tags` - Course tags (array of strings, non-empty)

**Optional Fields:**
- `instructorId` - Instructor ID (UUID, can be null)
- `imageUrl` - Course image URL (string, valid URL format)

**Validation Rules:**
- All string fields must be non-empty if provided
- `price` must be a positive number
- `type` must be one of: "online", "offline"
- `difficulty` must be one of: "beginner", "intermediate", "advanced"
- `tags` must be an array of non-empty strings

**Response (201):**
```json
{
  "success": true,
  "course": {
    "id": "uuid",
    "title": "Advanced JavaScript Programming",
    "description": "Learn advanced JavaScript concepts and modern development practices",
    "topic": "Programming",
    "type": "online",
    "price": 99.99,
    "duration": "8 weeks",
    "certification": "Certificate of Completion",
    "difficulty": "intermediate",
    "objectives": "Master advanced JavaScript concepts, learn modern frameworks, build real-world projects",
    "prerequisites": "Basic JavaScript knowledge, familiarity with HTML and CSS",
    "syllabus": "Week 1: Advanced Functions and Closures\nWeek 2: Object-Oriented Programming\nWeek 3: Asynchronous Programming\nWeek 4: Modern ES6+ Features",
    "tags": ["javascript", "programming", "web-development", "es6"],
    "instructorId": "uuid",
    "imageUrl": "https://api.themobileprof.com/uploads/course-images/course-image.jpg",
    "isPublished": false,
    "createdAt": "2024-07-01T10:00:00Z",
    "updatedAt": "2024-07-01T10:00:00Z"
  }
}
```

**Error Response (400):**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Validation failed",
  "details": {
    "duration": "Duration is required and must not be empty",
    "prerequisites": "Prerequisites must be a non-empty string if provided",
    "syllabus": "Syllabus must be a non-empty string if provided"
  }
}
```

**Notes:**
- All fields except `instructorId` and `imageUrl` are required
- `difficulty` must be one of: "beginner", "intermediate", "advanced"
- `type` must be one of: "online", "offline"
- `tags` should be an array of strings
- `instructorId` is optional (can be null)
- `imageUrl` is optional but must be a valid URL if provided

##### Update Course (Admin)
**PUT** `/api/admin/courses/:id`

Update an existing course.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Updated Course Title",
  "description": "Updated course description",
  "difficulty": "advanced",
  "objectives": "Updated learning objectives",
  "prerequisites": "Updated prerequisites",
  "syllabus": "Updated syllabus content",
  "tags": ["updated", "tags"],
  "isPublished": true
}
```

**Updateable Fields:**
- `title` - Course title (string, non-empty)
- `description` - Course description (string, non-empty)
- `topic` - Course topic (string, non-empty)
- `type` - Course type: "online" or "offline"
- `price` - Course price (number, positive)
- `duration` - Course duration (string, non-empty)
- `certification` - Certification type (string, non-empty)
- `difficulty` - Difficulty level: "beginner", "intermediate", "advanced"
- `objectives` - Learning objectives (string, non-empty)
- `prerequisites` - Prerequisites (string, non-empty)
- `syllabus` - Course syllabus (string, non-empty)
- `tags` - Course tags (array of strings, non-empty)
- `isPublished` - Publication status (boolean)
- `imageUrl` - Course image URL (string, valid URL format)

**Validation Rules:**
- All fields are optional for updates
- If provided, string fields must be non-empty
- `price` must be a positive number if provided
- `type` must be one of: "online", "offline"
- `difficulty` must be one of: "beginner", "intermediate", "advanced"
- `tags` must be an array of non-empty strings if provided

**Response (200):**
```json
{
  "course": {
    "id": "uuid",
    "title": "Updated Course Title",
    "description": "Updated course description",
    "difficulty": "advanced",
    "objectives": "Updated learning objectives",
    "prerequisites": "Updated prerequisites",
    "syllabus": "Updated syllabus content",
    "tags": ["updated", "tags"],
    "isPublished": true,
    "updatedAt": "2024-07-01T12:00:00Z"
  }
}
```

**Error Response (400):**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Validation failed",
  "details": {
    "title": "Title must be a non-empty string",
    "price": "Price must be a positive number"
  }
}
```

#### System Settings

##### Get All System Settings (Admin)
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

##### Get Single System Setting (Admin)
**GET** `/admin/settings/:key`

Get a specific system setting by key.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "key": "site_name",
  "value": "TheMobileProf LMS",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

**Error Response (404):**
```json
{
  "error": "Setting not found"
}
```

##### Create System Setting (Admin)
**POST** `/admin/settings`

Create a new system setting.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "key": "new_setting_key",
  "value": "new_setting_value"
}
```

**Response (201):**
```json
{
  "message": "Setting created"
}
```

**Error Response (409):**
```json
{
  "error": "Setting already exists"
}
```

##### Update Multiple System Settings (Admin)
**PUT** `/admin/settings`

Update multiple system settings at once.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
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
  "message": "Settings updated successfully"
}
```

##### Update Single System Setting (Admin)
**PUT** `/admin/settings/:key`

Update a specific system setting.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "value": "updated_setting_value"
}
```

**Response (200):**
```json
{
  "message": "Setting updated",
  "setting": {
    "key": "site_name",
    "value": "updated_setting_value",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Response (404):**
```json
{
  "error": "Setting not found"
}
```

##### Delete System Setting (Admin)
**DELETE** `/admin/settings/:key`

Delete a system setting.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "message": "Setting deleted"
}
```

**Error Response (404):**
```json
{
  "error": "Setting not found"
}
```

---

### Notifications Endpoints

The notification system provides comprehensive user notification capabilities across the platform, including in-app notifications, email notifications, and preference management.

#### Get Notifications
**GET** `/api/notifications`

List notifications with filters and pagination.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `type` - Filter by notification type
- `read` - Filter by read status (`true`/`false`)
- `priority` - Filter by priority level
- `sort` - Sort field (`created_at`, `type`, `priority`, `is_read`)
- `order` - Sort order (`asc`/`desc`)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

**Response (200):**
```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "course_enrollment",
      "title": "Course Enrollment Successful",
      "message": "You have successfully enrolled in...",
      "data": { "courseId": "uuid", "courseTitle": "..." },
      "isRead": false,
      "priority": "normal",
      "createdAt": "2024-01-01T00:00:00Z",
      "readAt": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

#### Get Notification Types
**GET** `/api/notifications/types`

Get available notification types and priorities.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "types": [
    "course_enrollment",
    "course_completion",
    "class_enrollment",
    "discussion_reply",
    "test_result",
    "payment_success",
    "system_maintenance"
  ],
  "priorities": ["low", "normal", "high", "urgent"]
}
```

#### Get Unread Count
**GET** `/api/notifications/count`

Get unread notification count.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `type` - Filter by notification type (optional)

**Response (200):**
```json
{
  "unreadCount": 5
}
```

#### Get Notification Statistics
**GET** `/api/notifications/stats`

Get notification statistics and analytics.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "total": 25,
  "unread": 5,
  "read": 20,
  "byPriority": {
    "urgent": 1,
    "high": 3,
    "normal": 18,
    "low": 3
  },
  "byType": [
    {
      "type": "course_enrollment",
      "count": 8
    }
  ]
}
```

#### Get Notification Preferences
**GET** `/api/notifications/preferences`

Get user notification preferences.

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
  "systemNotifications": true
}
```

#### Update Notification Preferences
**PUT** `/api/notifications/preferences`

Update user notification preferences.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
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
  "systemNotifications": true
}
```

**Response (200):**
```json
{
  "message": "Notification preferences updated successfully"
}
```

#### Mark Notification as Read
**PATCH** `/api/notifications/:id/read`

Mark a specific notification as read.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "message": "Notification marked as read"
}
```

#### Mark All Notifications as Read
**PATCH** `/api/notifications/read-all`

Mark all notifications as read.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "message": "All notifications marked as read",
  "updatedCount": 5
}
```

#### Mark Notifications by Type as Read
**PATCH** `/api/notifications/read-by-type`

Mark all notifications of a specific type as read.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "type": "course_enrollment"
}
```

**Response (200):**
```json
{
  "message": "All course_enrollment notifications marked as read",
  "updatedCount": 3
}
```

#### Delete Notification
**DELETE** `/api/notifications/:id`

Delete a specific notification.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "message": "Notification deleted"
}
```

#### Delete Multiple Notifications
**DELETE** `/api/notifications/bulk`

Bulk delete notifications.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "ids": ["uuid1", "uuid2"],
  "type": "course_enrollment",
  "read": false
}
```

**Response (200):**
```json
{
  "message": "Notifications deleted successfully",
  "deletedCount": 5
}
```

#### Send System Notification (Admin Only)
**POST** `/api/notifications/system`

Send system notification to all users (admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "System Maintenance",
  "message": "Scheduled maintenance will begin...",
  "type": "system_maintenance",
  "priority": "high",
  "data": { "maintenanceType": "database", "duration": "2 hours" }
}
```

**Response (200):**
```json
{
  "message": "System notification sent to 150 users",
  "notificationCount": 150,
  "type": "system_maintenance",
  "title": "System Maintenance"
}
```

#### Cleanup Old Notifications (Admin Only)
**DELETE** `/api/notifications/cleanup`

Clean up old notifications (admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `daysOld` - Days old to clean up (default: 90)

**Response (200):**
```json
{
  "message": "Cleaned up 25 old notifications",
  "deletedCount": 25,
  "daysOld": 90
}
```

### Search Endpoints

#### Get Search Suggestions
**GET** `/api/search/suggestions`

Get lightweight search suggestions for search bars.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `scope` - Search scope (`classes`, `discussions`)
- `q` - Search query string

**Response (200):**
```json
{
  "suggestions": [
    {
      "id": "uuid",
      "title": "JavaScript Fundamentals",
      "type": "course",
      "relevance": 0.95
    }
  ]
}
```

### Meta Endpoints

#### Get Classes Facets
**GET** `/api/meta/classes-facets`

Get counts per topic/type and price buckets for filter chips.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "topics": [
    {
      "topic": "Programming",
      "count": 25
    }
  ],
  "types": [
    {
      "type": "online",
      "count": 30
    }
  ],
  "priceRanges": [
    {
      "range": "free",
      "count": 5
    },
    {
      "range": "under_50",
      "count": 15
    },
    {
      "range": "50_100",
      "count": 8
    },
    {
      "range": "over_100",
      "count": 2
    }
  ]
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
- **Max file size**: 5MB for images, 10MB for documents/videos (configurable)
- **Supported formats**: JPEG, JPG, PNG, GIF, WebP for images; PDF, DOC, DOCX, TXT for documents; MP4, WebM, OGG for videos
- **Upload path**: `/uploads` (configurable)
- **Storage**: Files are stored with unique UUID-based names to prevent conflicts
- **Access**: Files are accessible via direct URLs (e.g., `https://api.themobileprof.com/uploads/screenshots/filename.png`)

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

## Testing

### Upload Endpoints Testing
A test script is provided to verify upload functionality:

```bash
# Install dependencies
npm install

# Set test token
export TEST_TOKEN="your-jwt-token-here"

# Run upload tests
node test-upload.js
```

The test script will:
- Create test images
- Test all upload endpoints
- Verify file deletion
- Test admin file listing
- Clean up test files

### Notification System Testing
A test script is provided to verify notification functionality:

```bash
# Install dependencies
npm install

# Set test token
export TEST_TOKEN="your-jwt-token-here"

# Run notification tests
node test-notifications.js
```

The test script will:
- Test all notification endpoints
- Verify notification preferences
- Test notification CRUD operations
- Test bulk operations
- Verify admin restrictions

## Notification System

The notification system provides comprehensive user notification capabilities across the platform, including in-app notifications, email notifications, and preference management.

### Notification Types
- **Course-related**: Enrollment, completion, progress updates
- **Class-related**: Enrollment, reminders, schedule changes
- **Discussion-related**: Replies, mentions, likes
- **Test-related**: Results, availability, reminders
- **Certification-related**: Earned, expiring, progress
- **Payment-related**: Success, failure, refunds
- **System-related**: Maintenance, updates, announcements

### Notification Priorities
- **Low**: Informational updates
- **Normal**: Standard notifications
- **High**: Important updates (class reminders, test results)
- **Urgent**: Critical system notifications

### Automatic Notifications
The system automatically sends notifications for common events:
- Course enrollments
- Class enrollments
- Discussion replies
- Test results
- Payment success
- System maintenance

### User Preferences
Users can control notifications through granular preferences:
- Email notifications (on/off)
- Push notifications (on/off)
- Category-specific notifications (courses, classes, discussions, tests, certifications, payments, system)
- Priority-based filtering

## Flutterwave v3 API Status

### Current Status
- **Flutterwave v3 API** is the **stable and production-ready** version
- **Direct API Key Authentication** - No OAuth required
- **Payment Endpoint**: `https://api.flutterwave.com/v3/payments` for payment initialization
- **Verification Endpoint**: `https://api.flutterwave.com/v3/transactions/verify_by_reference` for payment verification

### Troubleshooting Payment Issues

#### Common Errors:
1. **Invalid credentials**: Ensure `FLUTTERWAVE_PUBLIC_KEY` and `FLUTTERWAVE_SECRET_KEY` are correctly set
2. **Network issues**: Check internet connectivity and Flutterwave API status
3. **Invalid amount**: Ensure amount is in the correct format (e.g., "200.00" for USD)

#### Solutions:
1. **Verify credentials** in your `.env` file
2. **Check Flutterwave dashboard** for API status
3. **Use correct amount format** (string with 2 decimal places)
4. **Contact Flutterwave support** if issues persist

## Support

For API support:
- **Documentation**: [docs.themobileprof.com](https://docs.themobileprof.com)
- **Status Page**: [status.themobileprof.com](https://status.themobileprof.com)
- **Support Email**: api-support@themobileprof.com
- **Community Forum**: [community.themobileprof.com](https://community.themobileprof.com)

---

### File Upload Endpoints

**📋 IMPORTANT: Upload Endpoint Standard**

All upload endpoints use the `/api/uploads` prefix for consistency with other API endpoints.

**Standard Format:** `/api/uploads/{endpoint-name}`

**Content-Type:** All upload endpoints require `multipart/form-data`

**Available Endpoints:**
- `POST /api/uploads` - Upload screenshots/images
- `POST /api/uploads/course-image` - Upload course images  
- `POST /api/uploads/lesson-material` - Upload lesson materials
- `POST /api/uploads/avatar` - Upload user avatars
- `POST /api/uploads/certificate` - Upload certificates
- `DELETE /api/uploads/:filename` - Delete uploaded files
- `GET /api/uploads/files` - List uploaded files (admin only)

#### Upload Screenshots/Images
**POST** `/api/uploads`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Form Data:**
- `file`: Image file (required)

**Response:**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "filename": "abc123-def456-1234567890.png",
    "originalName": "screenshot.png",
    "size": 1024000,
    "mimetype": "image/png",
    "url": "https://api.themobileprof.com/uploads/screenshots/abc123-def456-1234567890.png"
  }
}
```

**Notes:**
- Supported formats: JPEG, JPG, PNG, GIF, WebP
- Maximum file size: 5MB
- Files are stored with unique names to prevent conflicts
- Files are stored in `/app/uploads/screenshots/` inside the container
- Files are accessible via `/uploads/screenshots/filename` URL path

#### Debug Upload Directory
**GET** `/debug/uploads`

Debug endpoint to check upload directory structure and file access.

**Response:**
```json
{
  "uploadPath": "./uploads",
  "resolvedUploadPath": "/app/uploads",
  "uploadExists": true,
  "screenshotsExists": true,
  "uploadContents": ["screenshots", "course-images", "lesson-materials"],
  "screenshotsContents": ["file1.png", "file2.png"],
  "cwd": "/app"
}
```

#### Test File Access
**GET** `/test-upload/:filename`

Test endpoint to serve a specific file from the uploads directory.

**Parameters:**
- `filename` (string): Name of the file to serve

**Response:**
- If file exists: Returns the file
- If file doesn't exist: Returns 404 with error details

#### Upload Test Question Image
**POST** `/api/tests/:id/questions/:questionId/image/upload`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Form Data:**
- `image`: Image file (PNG, JPG, JPEG, GIF, SVG, max 5MB)

**Response:**
```json
{
  "success": true,
  "imageUrl": "/uploads/question-images/<filename>",
  "message": "Image uploaded successfully"
}
```

#### Upload Course Image
**POST** `/api/uploads/course-image`

Upload an image for a course.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: multipart/form-data
```

**Form Data:**
- `image` - Image file (required)

**Response (200):**
```json
{
  "success": true,
  "message": "Course image uploaded successfully",
  "data": {
    "filename": "abc123-def456-1234567890.jpg",
    "originalName": "course-image.jpg",
    "size": 1024000,
    "mimetype": "image/jpeg",
    "imageUrl": "https://api.themobileprof.com/uploads/course-images/abc123-def456-1234567890.jpg"
  }
}
```

**Notes:**
- Supported formats: JPEG, JPG, PNG, GIF, WebP
- Maximum file size: 5MB

#### Upload Lesson Material
**POST** `/api/uploads/lesson-material`

Upload a material file for a lesson.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: multipart/form-data
```

**Form Data:**
- `file` - File (required)

**Response (200):**
```json
{
  "success": true,
  "message": "Lesson material uploaded successfully",
  "data": {
    "filename": "abc123-def456-1234567890.pdf",
    "originalName": "lesson-notes.pdf",
    "size": 1024000,
    "mimetype": "application/pdf",
    "fileUrl": "https://api.themobileprof.com/uploads/lesson-materials/abc123-def456-1234567890.pdf"
  }
}
```

**Notes:**
- Supported formats: Images (JPEG, JPG, PNG, GIF, WebP), Documents (PDF, DOC, DOCX, TXT), Videos (MP4, WebM, OGG)
- Maximum file size: 10MB

#### Upload User Avatar
**POST** `/api/uploads/avatar`

Upload a user avatar image.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: multipart/form-data
```

**Form Data:**
- `avatar` - Image file (required)

**Response (200):**
```json
{
  "success": true,
  "message": "Avatar uploaded successfully",
  "data": {
    "filename": "abc123-def456-1234567890.jpg",
    "originalName": "avatar.jpg",
    "size": 1024000,
    "mimetype": "image/jpeg",
    "avatarUrl": "https://api.themobileprof.com/uploads/user-avatars/abc123-def456-1234567890.jpg"
  }
}
```

**Notes:**
- Supported formats: JPEG, JPG, PNG, GIF, WebP
- Maximum file size: 5MB

#### Upload Certificate
**POST** `/api/uploads/certificate`

Upload a certificate file.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: multipart/form-data
```

**Form Data:**
- `certificate` - File (required)

**Response (200):**
```json
{
  "success": true,
  "message": "Certificate uploaded successfully",
  "data": {
    "filename": "abc123-def456-1234567890.pdf",
    "originalName": "certificate.pdf",
    "size": 1024000,
    "mimetype": "application/pdf",
    "certificateUrl": "https://api.themobileprof.com/uploads/certificates/abc123-def456-1234567890.pdf"
  }
}
```

**Notes:**
- Supported formats: Images (JPEG, JPG, PNG, GIF, WebP), Documents (PDF, DOC, DOCX, TXT)
- Maximum file size: 10MB

#### Delete Uploaded File
**DELETE** `/api/uploads/:filename`

Delete an uploaded file.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `type` - File type (screenshots, course-images, lesson-materials, user-avatars, certificates)

**Response (200):**
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

**Error Responses:**
- `400` - Invalid file type specified
- `404` - File not found

#### List Uploaded Files (Admin Only)
**GET** `/api/uploads/files`

List all uploaded files (admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `type` - Optional: Filter by file type (screenshots, course-images, lesson-materials, user-avatars, certificates)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "files": [
      {
        "filename": "abc123-def456-1234567890.png",
        "type": "screenshots",
        "url": "https://api.themobileprof.com/uploads/screenshots/abc123-def456-1234567890.png",
        "path": "/path/to/file"
      }
    ],
    "total": 1
  }
}
```

**Error Responses:**
- `403` - Access denied (non-admin users)

---

## Implementation Notes

### File Upload Configuration

#### Supported File Types
- **Screenshots/Images**: JPEG, JPG, PNG, GIF, WebP
- **Course Images**: JPEG, JPG, PNG, GIF, WebP
- **Lesson Materials**: Images (JPEG, JPG, PNG, GIF, WebP), Documents (PDF, DOC, DOCX, TXT), Videos (MP4, WebM, OGG)
- **User Avatars**: JPEG, JPG, PNG, GIF, WebP
- **Certificates**: Images (JPEG, JPG, PNG, GIF, WebP), Documents (PDF, DOC, DOCX, TXT)
- **Question Images**: PNG, JPG, JPEG, GIF, SVG (via test endpoints)

#### File Size Limits
- **Images**: Maximum 5MB
- **Documents**: Maximum 10MB
- **Videos**: Maximum 10MB (for lesson materials)

#### Storage Structure
```
uploads/
├── screenshots/          # General images and screenshots
├── course-images/        # Course cover images
├── lesson-materials/     # Lesson files (PDFs, videos, etc.)
├── question-images/      # Test question images
├── user-avatars/         # User profile pictures
└── certificates/         # Certificate files
```

#### Upload System Architecture
- **File Storage**: Local filesystem with organized subdirectories
- **File Naming**: UUID-based unique names to prevent conflicts
- **Static Serving**: Files served directly via Express static middleware
- **URL Structure**: `https://api.themobileprof.com/uploads/[type]/[filename]`
- **Security**: File type validation, size limits, and authentication required
- **Persistence**: Volume mapping to `/var/www/api.themobileprof.com/uploads` ensures files survive container restarts
- **Deployment**: Automated via GitHub Actions with direct Docker run command

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

### Sponsorships Endpoints

#### Get All Sponsorships (Sponsor)
**GET** `/api/sponsorships`

Get list of sponsorships for the authenticated sponsor.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `status` - Filter by status (active, paused, expired, completed)
- `courseId` - Filter by course ID

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
**POST** `/api/sponsorships`

Create a new sponsorship (sponsor only).

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
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

#### Get Specific Sponsorship
**GET** `/api/sponsorships/:id`

Get details of a specific sponsorship.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "id": "uuid",
  "sponsorId": "uuid",
  "sponsorName": "John Doe",
  "courseId": "uuid",
  "courseTitle": "JavaScript Fundamentals",
  "coursePrice": 99.99,
  "courseDescription": "Learn JavaScript from scratch",
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
```

#### Update Sponsorship
**PUT** `/sponsorships/:id`

Update sponsorship details (owner/admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "status": "paused",
  "notes": "Updated notes"
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "status": "paused",
  "notes": "Updated notes",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Delete Sponsorship
**DELETE** `/api/sponsorships/:id`

Delete a sponsorship (owner/admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "message": "Sponsorship deleted successfully"
}
```

#### Use Sponsorship Code
**POST** `/api/sponsorships/:id/use`

Use a sponsorship code for enrollment.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
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

#### Validate Sponsorship Code
**GET** `/api/sponsorships/code/:discountCode`

Validate a sponsorship discount code (public endpoint).

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

#### Get Sponsorship Statistics
**GET** `/api/sponsorships/:id/stats`

Get detailed sponsorship statistics (owner/admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "sponsorship": {
    "id": "uuid",
    "courseTitle": "JavaScript Fundamentals",
    "discountCode": "SPONSOR123",
    "discountType": "percentage",
    "discountValue": 20,
    "maxStudents": 50,
    "studentsUsed": 25,
    "completionRate": 75.5,
    "status": "active"
  },
  "stats": {
    "totalUsage": 25,
    "totalDiscountGiven": 499.75,
    "averageFinalPrice": 80.00,
    "utilizationRate": "50.0"
  },
  "monthlyStats": [
    {
      "month": "2024-01",
      "studentsEnrolled": 15
    }
  ]
}
```

#### Send Sponsorship Email
**POST** `/api/sponsorships/:id/email`

Send sponsorship details via email (owner/admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
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

### Sponsorship Opportunities Endpoints

#### Get All Opportunities
**GET** `/api/sponsorship-opportunities`

Get list of sponsorship opportunities (public endpoint).

**Query Parameters:**
- `isActive` - Filter by active status
- `urgency` - Filter by urgency level (low, medium, high)
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
**POST** `/api/sponsorship-opportunities`

Create a new sponsorship opportunity (instructor/admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
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

#### Get Specific Opportunity
**GET** `/api/sponsorship-opportunities/:id`

Get details of a specific opportunity (public endpoint).

**Response (200):**
```json
{
  "id": "uuid",
  "courseId": "uuid",
  "courseName": "JavaScript Fundamentals",
  "courseDescription": "Learn JavaScript from scratch",
  "courseDuration": "8 weeks",
  "courseTopic": "Programming",
  "coursePrice": 99.99,
  "instructor": "John Doe",
  "instructorAvatar": "https://example.com/avatar.jpg",
  "instructorBio": "Experienced JavaScript developer",
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
```

#### Update Opportunity
**PUT** `/api/sponsorship-opportunities/:id`

Update opportunity details (owner/admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "targetStudents": 150,
  "fundingGoal": 7500.00,
  "urgency": "medium",
  "demographics": "Students aged 18-30",
  "impactDescription": "Updated impact description",
  "isActive": true
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "targetStudents": 150,
  "fundingGoal": 7500.00,
  "fundingRaised": 2500.00,
  "urgency": "medium",
  "demographics": "Students aged 18-30",
  "impactDescription": "Updated impact description",
  "isActive": true,
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Delete Opportunity
**DELETE** `/api/sponsorship-opportunities/:id`

Delete an opportunity (owner/admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "message": "Sponsorship opportunity deleted successfully"
}
```

#### Contribute to Opportunity
**POST** `/api/sponsorship-opportunities/:id/contribute`

Contribute to a sponsorship opportunity.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
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

### Payments Endpoints (Flutterwave Standard v3.0.0)

> **Note:** The payment system uses **hosted payment integration** with Flutterwave Standard v3.0.0, providing a clean, reliable, and secure payment experience. The system uses **direct API authentication** and **verification** with Flutterwave's v3 API for reliable transaction tracking.

> **✅ Current Implementation:** The system uses **Flutterwave v3 API** (stable and production-ready) for reliable payment processing.

#### Initialize Payment
**POST** `/payments/initialize`

Initialize a payment for course or class enrollment using Flutterwave Standard v3.0.0.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "paymentType": "course",
  "itemId": "uuid-of-course-or-class",
  "paymentMethod": "card",
  "sponsorshipCode": "SPONSOR123456",
  "callbackUrl": "https://themobileprof.com/payment/callback"
}
```

**Parameters:**
- `paymentType` (required): "course" or "class"
- `itemId` (required): UUID of the course or class
- `paymentMethod` (optional): Payment method to use
- `sponsorshipCode` (optional): Sponsorship discount code
- `callbackUrl` (optional): URL where user will be redirected after payment completion. If not provided, uses FRONTEND_URL environment variable

**Supported Payment Methods:**
- `card` - Credit/Debit cards
- `bank_transfer` - Direct bank transfers
- `ussd` - USSD payments
- `mobile_money` - Mobile money transfers
- `qr_code` - QR code payments
- `barter` - Barter payments
- `mpesa` - M-Pesa (Kenya)
- `gh_mobile_money` - Ghana Mobile Money
- `ug_mobile_money` - Uganda Mobile Money
- `franc_mobile_money` - Francophone Mobile Money
- `emalipay` - EmaliPay (Ethiopia)

**Response (200):**
```json
{
  "success": true,
  "message": "Payment initialized successfully",
  "data": {
    "payment_id": "uuid",
    "reference": "TMP_1234567890_ABC123_ABCD1234",
    "flutterwave_reference": "TMP_1234567890_ABC123_ABCD1234",
    "checkout_url": "https://checkout.flutterwave.com/v3/hosted/pay/...",
    "original_amount": 99.99,
    "final_amount": 79.99,
    "discount_amount": 20.00,
    "payment_type": "course",
    "sponsorship": {
      "id": "uuid",
      "discountCode": "SPONSOR123456",
      "discountType": "percentage",
      "discountValue": 20,
      "discountAmount": 20.00,
      "originalPrice": 99.99,
      "finalPrice": 79.99
    }
  }
}
```

**Error Response (400):**
```json
{
  "error": "Payment Error",
  "message": "Unsupported payment method: invalid_method"
}
```



#### Get Supported Payment Methods
**GET** `/payments/methods`

Get supported payment methods for a specific country.

**Query Parameters:**
- `country` (optional): Country code (default: NG)

**Response (200):**
```json
{
  "country": "NG",
  "supportedMethods": [
    "card",
    "bank_transfer",
    "ussd",
    "mobile_money",
    "qr_code"
  ],
  "message": "Payment methods available for NG"
}
```

**Supported Countries:**
- **NG** (Nigeria): card, bank_transfer, ussd, mobile_money, qr_code
- **GH** (Ghana): card, bank_transfer, mobile_money, gh_mobile_money
- **KE** (Kenya): card, bank_transfer, mobile_money, mpesa
- **UG** (Uganda): card, bank_transfer, mobile_money, ug_mobile_money
- **CM** (Cameroon): card, bank_transfer, mobile_money, franc_mobile_money
- **ET** (Ethiopia): card, bank_transfer, mobile_money, emalipay

#### Payment Verification
**GET** `/payments/verify/:reference`

Payment verification method. Called by frontend when user returns from Flutterwave.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Parameters:**
- `reference` (required): Payment reference from our system (TMP_...)

**Response (200) - Success:**
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

**Error Response (400):**
```json
{
  "error": "Payment Error",
  "message": "Payment verification failed",
  "code": "PAYMENT_ERROR",
  "details": {
    "reference": "TMP_1234567890_ABC123",
    "suggestedAction": "try_alternative_payment_method"
  }
}
```

**Important Notes:**
- **Flutterwave v3**: Stable, publicly available configuration
- **Direct API Authentication**: Uses secret key for secure API access
- **Direct Verification**: Payments are verified directly with Flutterwave's v3 API
- **Clean Callbacks**: Redirect URLs include proper parameters for reliable tracking
- **No Reference Mismatches**: Consistent reference handling throughout the payment flow
- **Reliable**: v3 is production-ready and widely used

**Enhanced Error Responses:**
```json
{
  "error": "Payment Error",
  "message": "Card was declined by bank",
  "code": "CARD_DECLINED",
  "details": {
    "paymentId": "uuid",
    "reference": "TMP_1234567890_ABC123_ABCD1234",
    "suggestedAction": "try_alternative_payment_method"
  }
}
```

#### Get User Payments
**GET** `/payments/user`

Get current user's payment history.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `limit` (optional): Number of results (default: 20)
- `offset` (optional): Number of results to skip (default: 0)

**Response (200):**
```json
{
  "payments": [
    {
      "id": "uuid",
      "paymentType": "course",
      "amount": 99.99,
      "currency": "USD",
      "status": "successful",
      "paymentMethod": "card",
      "reference": "TMP_1234567890_ABC123_ABCD1234",
      "transactionId": "FLW123456789",
      "course": {
        "id": "uuid",
        "title": "JavaScript Fundamentals",
        "topic": "Programming"
      },
      "class": null,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Get Payment by ID
**GET** `/payments/:id`

Get specific payment details.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "id": "uuid",
  "paymentType": "course",
  "amount": 99.99,
  "currency": "USD",
  "status": "successful",
  "paymentMethod": "card",
  "reference": "TMP_1234567890_ABC123_ABCD1234",
  "flutterwaveReference": "TMP_1234567890_ABC123_ABCD1234",
  "flutterwaveTransactionId": "FLW-MOCK-c83e69e60f6cda5fc89da7389bd20fe1",
  "errorMessage": null,
  "course": {
    "id": "uuid",
    "title": "JavaScript Fundamentals",
    "topic": "Programming"
  },
  "class": null,
  "metadata": {
    "itemTitle": "JavaScript Fundamentals",
    "itemDescription": "Payment for JavaScript Fundamentals course",
    "userEmail": "user@example.com",
    "userName": "John Doe"
  },
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Error Response (404):**
```json
{
  "error": "Payment Not Found",
  "message": "Payment not found"
}
```



#### Admin Payment Management

##### Get All Payments (Admin)
**GET** `/api/admin/payments`

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
      "currency": "USD",
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
**GET** `/api/admin/payments/stats`

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

### Discussions Endpoints

The discussion system provides a comprehensive platform for learners to engage in meaningful conversations, ask questions, and collaborate on their learning journey. The system supports multiple discussion types and provides easy ways to organize and discover relevant conversations.

#### Discussion Organization

**Hierarchical Structure:**
- **Platform-wide**: General discussions accessible to all users
- **Course-specific**: Discussions related to a particular course
- **Lesson-specific**: Questions and clarifications for specific lessons
- **Class-specific**: Discussions for scheduled classes and workshops

**Categories and Tags:**
- **Categories**: Predefined discussion types (general, course, lesson, class, question, help, feedback)
- **Tags**: User-defined labels for better organization and discovery
- **Smart Filtering**: Combine category, course, lesson, and tag filters for precise results

**Discovery Features:**
- **Related Discussions**: Easily find discussions related to your current lesson or course
- **Popular Tags**: Discover trending topics and common questions
- **Search and Filter**: Advanced search with multiple filter options
- **Follow Conversations**: Track discussions you're interested in

#### Use Cases

**For Students:**
- Ask lesson-specific questions when stuck
- Discuss course concepts with peers
- Get help with assignments or projects
- Share learning experiences and tips

**For Instructors:**
- Announce course updates and changes
- Answer common questions in one place
- Facilitate group discussions
- Provide additional resources and clarifications

**For Course Communities:**
- Build knowledge bases through Q&A
- Create study groups and discussions
- Share resources and helpful links
- Foster peer-to-peer learning

---

#### Get Discussions
**GET** `/api/discussions`

List discussions with filters and pagination.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `category` - Filter by category (general, course, lesson, class, question, help, feedback)
- `courseId` - Filter by course ID for course-specific discussions
- `lessonId` - Filter by lesson ID for lesson-specific discussions
- `classId` - Filter by class ID for class-specific discussions
- `search` - Search in title/content
- `tags` - Filter by tags (comma-separated)
- `sort` - Sort field (created_at, title, last_activity, reply_count, likes_count)
- `order` - Sort order (asc/desc)
- `limit` - Items per page (default: 20)
- `offset` - Number to skip (default: 0)

**Response (200):**
```json
{
  "discussions": [
    {
      "id": "uuid",
      "title": "JavaScript Variables Question",
      "content": "I'm having trouble understanding how variables work in JavaScript...",
      "category": "lesson",
      "authorId": "uuid",
      "authorName": "John Doe",
      "authorAvatar": "https://example.com/avatar.jpg",
      "courseId": "uuid",
      "courseTitle": "JavaScript Fundamentals",
      "lessonId": "uuid",
      "lessonTitle": "Variables and Data Types",
      "classId": null,
      "classTitle": null,
      "tags": ["javascript", "variables", "beginner"],
      "isPinned": false,
      "replyCount": 3,
      "likesCount": 5,
      "lastActivityAt": "2024-07-01T12:00:00Z",
      "createdAt": "2024-07-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "pages": 1
  }
}
```

#### Get Discussion by ID
**GET** `/api/discussions/:id`

Get discussion details with replies and likes count.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "id": "uuid",
  "title": "JavaScript Variables Question",
  "content": "I'm having trouble understanding how variables work in JavaScript...",
  "category": "lesson",
  "authorId": "uuid",
  "authorName": "John Doe",
  "authorAvatar": "https://example.com/avatar.jpg",
  "courseId": "uuid",
  "courseTitle": "JavaScript Fundamentals",
  "lessonId": "uuid",
  "lessonTitle": "Variables and Data Types",
  "classId": null,
  "classTitle": null,
  "tags": ["javascript", "variables", "beginner"],
  "isPinned": false,
  "replyCount": 3,
  "likesCount": 5,
  "lastActivityAt": "2024-07-01T12:00:00Z",
  "createdAt": "2024-07-01T10:00:00Z"
}
```

#### Create Discussion
**POST** `/api/discussions`

Create a new discussion.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Discussion Title",
  "content": "Discussion content...",
  "category": "general",
  "courseId": "uuid",
  "lessonId": "uuid",
  "classId": "uuid",
  "tags": ["javascript", "beginner"]
}
```

**Fields:**
- `title` (required): Discussion title
- `content` (required): Discussion content
- `category` (required): Discussion category (general, course, lesson, class, question, help, feedback)
- `courseId` (optional): Course ID for course-specific discussions
- `lessonId` (optional): Lesson ID for lesson-specific discussions
- `classId` (optional): Class ID for class-specific discussions
- `tags` (optional): Array of tags for better organization

**Response (201):**
```json
{
  "id": "uuid",
  "title": "Discussion Title",
  "content": "Discussion content...",
  "category": "general",
  "courseId": "uuid",
  "lessonId": "uuid",
  "classId": "uuid",
  "tags": ["javascript", "beginner"],
  "authorId": "uuid",
  "createdAt": "2024-07-01T10:00:00Z"
}
```

**Discussion Categories:**
- **general**: Platform-wide discussions
- **course**: Course-specific discussions and announcements
- **lesson**: Lesson-specific questions and clarifications
- **class**: Class-specific discussions and Q&A
- **question**: General questions seeking help
- **help**: Help requests and support
- **feedback**: Feedback and suggestions

#### Get Course Discussions
**GET** `/api/courses/:courseId/discussions`

Get all discussions for a specific course.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `category` - Filter by category (optional)
- `lessonId` - Filter by specific lesson (optional)
- `search` - Search in title/content (optional)
- `sort` - Sort field (created_at, title, last_activity, reply_count, likes_count)
- `order` - Sort order (asc/desc)
- `limit` - Items per page (default: 20)
- `offset` - Number to skip (default: 0)

**Response (200):**
```json
{
  "course": {
    "id": "uuid",
    "title": "JavaScript Fundamentals",
    "topic": "Programming"
  },
  "discussions": [
    {
      "id": "uuid",
      "title": "JavaScript Variables Question",
      "content": "I'm having trouble understanding how variables work...",
      "category": "lesson",
      "lessonId": "uuid",
      "lessonTitle": "Variables and Data Types",
      "authorName": "John Doe",
      "replyCount": 3,
      "likesCount": 5,
      "lastActivityAt": "2024-07-01T12:00:00Z",
      "createdAt": "2024-07-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "pages": 1
  }
}
```

#### Get Lesson Discussions
**GET** `/api/lessons/:lessonId/discussions`

Get all discussions for a specific lesson.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `category` - Filter by category (optional)
- `search` - Search in title/content (optional)
- `sort` - Sort field (created_at, title, last_activity, reply_count, likes_count)
- `order` - Sort order (asc/desc)
- `limit` - Items per page (default: 20)
- `offset` - Number to skip (default: 0)

**Response (200):**
```json
{
  "lesson": {
    "id": "uuid",
    "title": "Variables and Data Types",
    "courseId": "uuid",
    "courseTitle": "JavaScript Fundamentals"
  },
  "discussions": [
    {
      "id": "uuid",
      "title": "JavaScript Variables Question",
      "content": "I'm having trouble understanding how variables work...",
      "category": "lesson",
      "authorName": "John Doe",
      "replyCount": 3,
      "likesCount": 5,
      "lastActivityAt": "2024-07-01T12:00:00Z",
      "createdAt": "2024-07-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 8,
    "pages": 1
  }
}
```

#### Get Discussion Replies
**GET** `/api/discussions/:id/replies`

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `limit` - Items per page (default: 20)
- `offset` - Number to skip (default: 0)

**Response (200):**
```json
{
  "replies": [
    {
      "id": "uuid",
      "content": "Reply content...",
      "authorId": "uuid",
      "authorName": "Jane Doe",
      "authorAvatar": "https://example.com/avatar.jpg",
      "createdAt": "2024-07-01T11:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "pages": 1
  }
}
```

#### Add Reply
**POST** `/api/discussions/:id/replies`

Add a reply to a discussion.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "content": "Reply content..."
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "content": "Reply content...",
  "authorId": "uuid",
  "discussionId": "uuid",
  "createdAt": "2024-07-01T11:00:00Z"
}
```

#### Like Discussion
**POST** `/api/discussions/:id/like`

Like a discussion.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "message": "Discussion liked successfully"
}
```

#### Unlike Discussion
**DELETE** `/api/discussions/:id/like`

Unlike a discussion.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "message": "Discussion unliked successfully"
}
```

#### Get Discussion Categories
**GET** `/api/discussions/categories`

Get available discussion categories and their descriptions.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "categories": [
    {
      "key": "general",
      "name": "General",
      "description": "Platform-wide discussions and announcements",
      "icon": "chat"
    },
    {
      "key": "course",
      "name": "Course",
      "description": "Course-specific discussions and announcements",
      "icon": "book"
    },
    {
      "key": "lesson",
      "name": "Lesson",
      "description": "Lesson-specific questions and clarifications",
      "icon": "lightbulb"
    },
    {
      "key": "class",
      "name": "Class",
      "description": "Class-specific discussions and Q&A",
      "icon": "users"
    },
    {
      "key": "question",
      "name": "Question",
      "description": "General questions seeking help",
      "icon": "help-circle"
    },
    {
      "key": "help",
      "name": "Help",
      "description": "Help requests and support",
      "icon": "life-buoy"
    },
    {
      "key": "feedback",
      "name": "Feedback",
      "description": "Feedback and suggestions",
      "icon": "message-square"
    }
  ]
}
```

#### Get Popular Tags
**GET** `/api/discussions/tags`

Get popular discussion tags for better organization.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `limit` - Number of tags to return (default: 50)

**Response (200):**
```json
{
  "tags": [
    {
      "tag": "javascript",
      "count": 125,
      "category": "programming"
    },
    {
      "tag": "beginner",
      "count": 89,
      "category": "level"
    },
    {
      "tag": "variables",
      "count": 45,
      "category": "concept"
    }
  ]
}
```

> **Note:** The discussion system now supports lesson-specific and course-specific discussions with proper categorization and tagging for better organization and discovery.

### Certifications Endpoints

#### Get User's Certifications
**GET** `/api/certifications/my`

Get user's earned certificates.

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
      "title": "JavaScript Developer",
      "description": "Certified JavaScript Developer",
      "issuerName": "TheMobileProf",
      "issuedAt": "2024-01-15T00:00:00Z",
      "expiryDate": "2026-01-15T00:00:00Z",
      "certificateUrl": "https://example.com/certificate.pdf",
      "verificationCode": "CERT123456",
      "status": "active"
    }
  ]
}
```

#### Download Certificate
**GET** `/api/certifications/:id/download`

Download certificate file or return signed URL.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "certificateUrl": "https://example.com/certificate.pdf",
  "downloadUrl": "https://api.themobileprof.com/certificates/download/uuid",
  "expiresAt": "2024-01-02T00:00:00Z"
}
```

#### Get Certification Progress
**GET** `/api/certifications/progress`

Get in-progress programs with progress fields.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "programs": [
    {
      "id": "uuid",
      "title": "Full-Stack Web Developer",
      "progress": 65,
      "completedModules": 3,
      "totalModules": 5,
      "nextRequirement": "Complete Frontend Fundamentals module",
      "estimatedCompletion": "2024-03-15T00:00:00Z"
    }
  ]
}
```

### Certification Programs Endpoints

#### Get Certification Programs
**GET** `/api/certification-programs`

List available certification programs with modules and pricing.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "programs": [
    {
      "id": "uuid",
      "title": "Full-Stack Web Developer",
      "description": "Comprehensive web development certification",
      "duration": "6 months",
      "level": "intermediate",
      "prerequisites": "Basic programming knowledge",
      "modules": [
        {
          "id": "uuid",
          "title": "Frontend Fundamentals",
          "description": "HTML, CSS, JavaScript basics",
          "duration": "4 weeks",
          "orderIndex": 1
        }
      ],
      "price": 299.99,
      "isActive": true
    }
  ]
}
```

#### Enroll in Certification Program
**POST** `/api/certification-programs/:id/enroll`

Enroll in a certification track.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Response (201):**
```json
{
  "message": "Successfully enrolled in certification program",
  "enrollment": {
    "id": "uuid",
    "programId": "uuid",
    "userId": "uuid",
    "enrolledAt": "2024-01-01T00:00:00Z",
    "status": "enrolled"
  }
}
```

---

### Lessons Endpoints

#### Get Lesson Details
**GET** `/lessons/:id`

Get details of a lesson by its ID.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "id": "uuid",
  "courseId": "uuid",
  "courseTitle": "Course Title",
  "title": "Lesson Title",
  "description": "Lesson description...",
  "content": "Lesson content...",
  "videoUrl": "https://example.com/video.mp4",
  "durationMinutes": 45,
  "orderIndex": 1,
  "isPublished": true,
  "createdAt": "2024-07-01T10:00:00Z",
  "updatedAt": "2024-07-01T12:00:00Z"
}
```

#### Update Lesson
**PUT** `/lessons/:id`

Update a lesson by its ID. Requires authentication and owner/admin authorization.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Updated Lesson Title",
  "description": "Updated description...",
  "content": "Updated content...",
  "videoUrl": "https://example.com/video.mp4",
  "durationMinutes": 50,
  "orderIndex": 2,
  "isPublished": false
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "title": "Updated Lesson Title",
  "description": "Updated description...",
  "content": "Updated content...",
  "videoUrl": "https://example.com/video.mp4",
  "durationMinutes": 50,
  "orderIndex": 2,
  "isPublished": false,
  "updatedAt": "2024-07-01T13:00:00Z"
}
```

#### Delete Lesson
**DELETE** `/lessons/:id`

Delete a lesson by its ID. Requires authentication and owner/admin authorization.

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

#### Mark Lesson as Completed
**POST** `/api/lessons/:id/complete`

Mark a lesson as completed for the authenticated user. This will automatically update course progress.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "timeSpentMinutes": 45
}
```

**Optional Fields:**
- `timeSpentMinutes` - Time spent on the lesson in minutes (number, default: 0)

**Response (200):**
```json
{
  "message": "Lesson marked as completed",
  "lessonId": "uuid",
  "completedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Get Lesson Progress
**GET** `/api/lessons/:id/progress`

Get the current progress for a lesson for the authenticated user.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "lessonId": "uuid",
  "isCompleted": true,
  "progressPercentage": 100,
  "timeSpentMinutes": 45,
  "completedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Get All Lessons for a Course (Admin)
**GET** `/admin/courses/:courseId/lessons`

Get all lessons for a course (admin access).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "lessons": [
    {
      "id": "uuid",
      "title": "Lesson Title",
      "description": "Lesson description...",
      "content": "Lesson content...",
      "videoUrl": "https://example.com/video.mp4",
      "durationMinutes": 45,
      "orderIndex": 1,
      "isPublished": true,
      "createdAt": "2024-07-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "pages": 1
  }
}
```

#### Create Lesson for a Course (Admin)
**POST** `/admin/courses/:courseId/lessons`

Create a new lesson for a course (admin access).

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Lesson Title",
  "description": "Lesson description...",
  "content": "Lesson content...",
  "videoUrl": "https://example.com/video.mp4",
  "durationMinutes": 45,
  "orderIndex": 1,
  "isPublished": true
}
```

**Response (201):**
```json
{
  "lesson": {
    "id": "uuid",
    "courseId": "uuid",
    "title": "Lesson Title",
    "description": "Lesson description...",
    "content": "Lesson content...",
    "videoUrl": "https://example.com/video.mp4",
    "durationMinutes": 45,
    "orderIndex": 1,
    "isPublished": true,
    "createdAt": "2024-07-01T10:00:00Z"
  }
}
```

#### Get All Lessons for a Course
**GET** `/courses/:id/lessons`

Get all lessons for a course by course ID.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "lessons": [
    {
      "id": "uuid",
      "title": "Lesson Title",
      "description": "Lesson description...",
      "content": "Lesson content...",
      "videoUrl": "https://example.com/video.mp4",
      "durationMinutes": 45,
      "orderIndex": 1,
      "isPublished": true,
      "createdAt": "2024-07-01T10:00:00Z"
    }
  ]
}
```

#### Get Course Analytics (Admin/Instructor)
**GET** `/api/courses/:id/analytics`

Get comprehensive analytics for all tests in a course, including both course-level and lesson-level tests.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "totalTests": 5,
  "totalAttempts": 150,
  "averageScore": 78.5,
  "passRate": 75.0,
  "averageTimeMinutes": 25.3,
  "questionAnalytics": [
    {
      "questionId": "uuid",
      "question": "What is the capital of France?",
      "questionType": "multiple_choice",
      "points": 1,
      "totalAnswers": 150,
      "correctAnswers": 135,
      "correctRate": 90.0
    }
  ]
}
```

### Courses Endpoints

#### Get Course by ID
**GET** `/api/courses/:id`

Get details of a course by its ID.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Parameters:**
- `id` (string, required): Course ID

**Response (200):**
```json
{
  "id": "uuid",
  "title": "Course Title",
  "description": "Course description...",
  "topic": "Programming",
  "type": "online",
  "price": 99.99,
  "duration": "8 weeks",
  "certification": "Certificate of Completion",
  "difficulty": "intermediate",
  "objectives": "Learn advanced programming concepts and build real-world projects",
  "prerequisites": "Basic programming knowledge required",
  "syllabus": "Week 1: Introduction to Advanced Concepts\nWeek 2: Practical Applications\nWeek 3: Project Development",
  "tags": ["programming", "javascript", "web-development"],
  "imageUrl": "https://api.themobileprof.com/uploads/course-images/course-image.jpg",
  "instructorId": "uuid",
  "instructorName": "John Doe",
  "isPublished": true,
  "enrollmentCount": 25,
  "lessonCount": 8,
  "testCount": 3,
  "createdAt": "2024-07-01T10:00:00Z",
  "updatedAt": "2024-07-01T12:00:00Z"
}
```

#### Enroll in Course
**POST** `/api/courses/:id/enroll`

Enroll in a course. Supports sponsorship codes for discounted enrollment.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Parameters:**
- `id` (string, required): Course ID

**Request Body:**
```json
{
  "sponsorshipId": "uuid"
}
```

**Fields:**
- `sponsorshipId` (string, optional): Sponsorship ID for discounted enrollment

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

**Error Responses:**
- `400` - User is already enrolled in this course
- `400` - Invalid or inactive sponsorship
- `400` - Sponsorship has not been used by this user
- `404` - Course not found or not published

**Notes:**
- If `sponsorshipId` is provided, the system validates that the sponsorship is active and has been used by the student
- The sponsorship must be valid for the specific course
- Enrollment automatically updates the course student count

#### Get Course Lessons with Unlock Status
**GET** `/api/courses/:id/lessons`

Get all lessons for a course with their unlock and completion status. Lessons are unlocked sequentially based on test completion.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "courseId": "uuid",
  "lessons": [
    {
      "id": "uuid",
      "title": "Introduction to JavaScript",
      "description": "Learn the basics of JavaScript",
      "orderIndex": 1,
      "durationMinutes": 45,
      "isUnlocked": true,
      "isCompleted": false,
      "testPassed": false,
      "progress": 0,
      "timeSpentMinutes": 0,
      "completedAt": null,
      "test": {
        "id": "uuid",
        "title": "JavaScript Basics Quiz",
        "passingScore": 70,
        "maxAttempts": 3
      },
      "canAccess": true,
      "nextUnlocked": true
    },
    {
      "id": "uuid",
      "title": "Variables and Data Types",
      "description": "Understanding variables and data types",
      "orderIndex": 2,
      "durationMinutes": 60,
      "isUnlocked": false,
      "isCompleted": false,
      "testPassed": false,
      "progress": 0,
      "timeSpentMinutes": 0,
      "completedAt": null,
      "test": {
        "id": "uuid",
        "title": "Variables Quiz",
        "passingScore": 70,
        "maxAttempts": 3
      },
      "canAccess": false,
      "nextUnlocked": false
    }
  ],
  "courseStats": {
    "totalLessons": 19,
    "unlockedLessons": 1,
    "completedLessons": 0,
    "passedTests": 0,
    "totalProgress": 0
  }
}
```

#### Get Course Progression Status
**GET** `/api/courses/:id/progression`

Get detailed progression status for a course, showing which lessons are locked/unlocked and overall progress.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "courseId": "uuid",
  "progression": [
    {
      "id": "uuid",
      "title": "Introduction to JavaScript",
      "orderIndex": 1,
      "isUnlocked": true,
      "isCompleted": false,
      "testPassed": false,
      "progress": 0,
      "timeSpentMinutes": 0,
      "completedAt": null,
      "test": {
        "id": "uuid",
        "title": "JavaScript Basics Quiz",
        "passingScore": 70,
        "maxAttempts": 3
      },
      "nextUnlocked": true
    }
  ],
  "courseStats": {
    "totalLessons": 19,
    "unlockedLessons": 1,
    "completedLessons": 0,
    "passedTests": 0,
    "totalProgress": 0
  },
  "currentLesson": {
    "id": "uuid",
    "title": "Introduction to JavaScript"
  },
  "nextUnlockedLesson": {
    "id": "uuid",
    "title": "Variables and Data Types"
  }
}
```

**Error Responses:**
- `404` - Course not found
- `401` - Unauthorized (invalid or missing token)

#### Update Course Enrollment Progress
**PUT** `/api/courses/:id/enrollments/:enrollmentId`

Update the progress of a course enrollment for the authenticated user. This endpoint allows manual progress updates and is also used automatically by the progress tracking system.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "progress": 75,
  "status": "in_progress"
}
```

**Fields:**
- `progress` - Progress percentage (0-100, number, optional)
- `status` - Enrollment status: "pending", "in_progress", "completed", "dropped" (string, optional)

**Response (200):**
```json
{
  "id": "uuid",
  "progress": 75,
  "status": "in_progress",
  "completedAt": null
}
```

**Notes:**
- Progress is automatically calculated when lessons are completed or tests are passed
- Setting status to "completed" will automatically set `completedAt` timestamp
- Progress of 100% will automatically set status to "completed"

---

### Classes Endpoints

#### Get Upcoming Classes
**GET** `/api/classes/upcoming`

Get upcoming classes with filters and pagination.

#### Get Classes
**GET** `/api/classes`

List classes with filters and pagination.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `topic` - Filter by topic
- `type` - Filter by type (online/offline)
- `instructorId` - Filter by instructor ID
- `priceMin` - Minimum price filter
- `priceMax` - Maximum price filter
- `isPublished` - Filter by publication status
- `search` - Search in title/description
- `sort` - Sort field (start_date, title, price, available_slots, created_at)
- `order` - Sort order (asc/desc)
- `limit` - Items per page (default: 20)
- `offset` - Number to skip (default: 0)

**Response (200):**
```json
{
  "classes": [
    {
      "id": "uuid",
      "title": "Advanced JavaScript Workshop",
      "description": "Hands-on JavaScript workshop",
      "topic": "Programming",
      "type": "online",
      "instructorId": "uuid",
      "instructorName": "John Doe",
      "startDate": "2024-07-02T14:00:00Z",
      "endDate": "2024-07-02T16:00:00Z",
      "duration": "2 hours",
      "location": "Online",
      "price": 49.99,
      "availableSlots": 15,
      "totalSlots": 20,
      "isPublished": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

#### Get Class by ID
**GET** `/api/classes/:id`

Get class details including schedule, duration, location, instructor, availableSlots/totalSlots, courses.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "id": "uuid",
  "title": "Advanced JavaScript Workshop",
  "description": "Hands-on JavaScript workshop",
  "topic": "Programming",
  "type": "online",
  "instructorId": "uuid",
  "instructorName": "John Doe",
  "instructorAvatar": "https://example.com/avatar.jpg",
  "startDate": "2024-07-02T14:00:00Z",
  "endDate": "2024-07-02T16:00:00Z",
  "duration": "2 hours",
  "location": "Online",
  "price": 49.99,
  "availableSlots": 15,
  "totalSlots": 20,
  "isPublished": true,
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
**POST** `/api/classes/:id/enroll`

Enroll in a class (supports sponsorship codes).

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
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
  "message": "Successfully enrolled in class",
  "enrollment": {
    "id": "uuid",
    "classId": "uuid",
    "userId": "uuid",
    "enrolledAt": "2024-01-01T00:00:00Z",
    "status": "enrolled",
    "sponsorshipId": "uuid"
  }
}
```

#### Get Class Topics
**GET** `/api/classes/topics`

Get distinct topics for filters.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "topics": [
    {
      "topic": "Programming",
      "count": 25
    },
    {
      "topic": "Design",
      "count": 15
    }
  ]
}
```