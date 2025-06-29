# TheMobileProf API Documentation

> **Test Type Rule:**
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
   - [Settings](#settings-endpoints)
   - [Payments](#payments-endpoints)
   - [Admin](#admin-endpoints)
   - [Scraping Management](#scraping-management)

## Overview

The TheMobileProf API is a RESTful API for a Learning Management System (LMS) that supports course management, user authentication, sponsorship programs, testing systems, and more.

**Base URL**: `https://api.themobileprof.com`

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

### Upload Screenshots/Images
**POST** `/api/upload`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Form Data:**
- `file`: Image file
- `type`: "screenshot" | "image"
- `lesson_id`: Optional lesson ID

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

---

### Tests Endpoints

> **Test Type Rule:**
> - Only `lesson_id` is nullable in the tests table.
> - If a test has both `course_id` and `lesson_id`, it is a **lesson test** (attached to a specific lesson).
> - If a test has a `course_id` but no `lesson_id`, it is a **course test** (attached to the course as a whole).

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
  "totalLessons": 24,
  "studyTimeThisMonth": 18
}
```

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
  "totalLessons": 24,
  "studyTimeThisMonth": 18
}
```