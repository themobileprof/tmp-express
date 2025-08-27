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
