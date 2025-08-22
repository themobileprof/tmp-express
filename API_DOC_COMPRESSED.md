I'll recreate the complete API documentation with all the notification system information included, without compression.

Read file: API_DOCUMENTATION.md
I need to recreate the complete API documentation. Let me start fresh with a comprehensive version that includes all the notification system information.

Ran tool
# TheMobileProf API Documentation

> **Test Type Rule:** Only `lesson_id` is nullable in tests table. Tests with both `course_id` and `lesson_id` are lesson tests; tests with only `course_id` are course tests.

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

The TheMobileProf API is a RESTful API for a Learning Management System (LMS) that supports course management, user authentication, sponsorship programs, testing systems, file uploads, notifications, and more.

**Base URL**: `https://api.themobileprof.com`

**Implementation Status**: All documented endpoints are fully implemented and tested, including the complete file upload system with persistent storage support and comprehensive notification system.

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

#### Login User
**POST** `/api/auth/login`

Authenticate user with email and password.

#### Get Current User
**GET** `/auth/me`

Get current user information.

---

### Users Endpoints

#### Get User Profile
**GET** `/users/:id`

Get user profile by ID.

#### Get User Enrollments
**GET** `/users/:id/enrollments`

Get user's course and class enrollments.

#### Get User Dashboard Stats
**GET** `/users/:id/dashboard-stats`

Get user's dashboard statistics.

#### Get User Enrolled Courses
**GET** `/users/:id/enrolled-courses`

Get user's enrolled courses with detailed information.

#### Get User Enrolled Classes
**GET** `/users/:id/enrolled-classes`

Get user's enrolled classes with detailed information.

#### Get Current User's Enrolled Courses
**GET** `/users/enrollments/courses`

Get current user's enrolled courses (frontend compatible).

#### Get Current User's Enrolled Classes
**GET** `/users/enrollments/classes`

Get current user's enrolled classes (frontend compatible).

#### Get Current User's Dashboard Stats
**GET** `/users/dashboard-stats`

Get current user's dashboard statistics (frontend compatible).

#### Get Current User Settings
**GET** `/api/users/me/settings`

Get current user's settings and preferences.

#### Update Current User Settings
**PUT** `/api/users/me/settings`

Update current user's settings and preferences.

#### Update Current User Profile
**PUT** `/api/users/me/profile`

Update current user's profile information.

---

### Courses Endpoints

#### Browse Courses
**GET** `/api/courses/browse`

Browse published courses with filters and pagination.

#### Get Course by ID
**GET** `/api/courses/:id`

Get course details by ID.

#### Enroll in Course
**POST** `/api/courses/:id/enroll`

Enroll in a course (supports sponsorship codes).

#### Get Course Lessons
**GET** `/api/courses/:id/lessons`

Get all lessons for a course.

#### Get Course Progression
**GET** `/api/courses/:id/progression`

Get user's progression through a course.

---

### Classes Endpoints

#### Get Upcoming Classes
**GET** `/api/classes/upcoming`

Get upcoming classes with filters and pagination.

#### Get Classes
**GET** `/api/classes`

List classes with filters (topic, type, instructorId, priceMin/priceMax, isPublished, search, sort, order, limit, offset).

#### Get Class by ID
**GET** `/api/classes/:id`

Get class details including schedule, duration, location, instructor, availableSlots/totalSlots, courses.

#### Enroll in Class
**POST** `/api/classes/:id/enroll`

Enroll in a class (supports sponsorship codes).

#### Get Class Topics
**GET** `/api/classes/topics`

Get distinct topics for filters.

---

### Lessons Endpoints

#### Get Lesson Details
**GET** `/api/lessons/:id`

Get details of a lesson by its ID.

#### Update Lesson
**PUT** `/lessons/:id`

Update a lesson by its ID.

#### Delete Lesson
**DELETE** `/lessons/:id`

Delete a lesson by its ID.

#### Mark Lesson as Completed
**POST** `/api/lessons/:id/complete`

Mark a lesson as completed for the authenticated user.

#### Get Lesson Progress
**GET** `/api/lessons/:id/progress`

Get the current progress for a lesson for the authenticated user.

---

### Tests Endpoints

#### Get Test by ID
**GET** `/api/tests/:id`

Get test details by ID.

#### Update Test
**PUT** `/api/tests/:id`

Update test details (instructor/admin only).

#### Delete Test
**DELETE** `/api/tests/:id`

Delete a test (instructor/admin only).

#### Get Test Questions
**GET** `/api/tests/:id/questions`

Get all questions for a test.

#### Add Question to Test
**POST** `/api/tests/:id/questions`

Add a new question to a test.

#### Start Test Attempt
**POST** `/api/tests/:id/start`

Start a new test attempt.

#### Submit Answer
**PUT** `/api/tests/:id/attempts/:attemptId/answer`

Submit an answer for a test question.

#### Submit Test
**POST** `/api/tests/:id/attempts/:attemptId/submit`

Submit completed test.

#### Get Test Results
**GET** `/api/tests/:id/attempts/:attemptId/results`

Get detailed test results.

---

### Sponsorships Endpoints

#### Get All Sponsorships
**GET** `/api/sponsorships`

Get list of sponsorships for the authenticated sponsor.

#### Create Sponsorship
**POST** `/api/sponsorships`

Create a new sponsorship (sponsor only).

#### Get Specific Sponsorship
**GET** `/api/sponsorships/:id`

Get details of a specific sponsorship.

#### Update Sponsorship
**PUT** `/sponsorships/:id`

Update sponsorship details (owner/admin only).

#### Delete Sponsorship
**DELETE** `/api/sponsorships/:id`

Delete a sponsorship (owner/admin only).

#### Use Sponsorship Code
**POST** `/api/sponsorships/:id/use`

Use a sponsorship code for enrollment.

#### Validate Sponsorship Code
**GET** `/api/sponsorships/code/:discountCode`

Validate a sponsorship discount code (public endpoint).

---

### Sponsorship Opportunities Endpoints

#### Get All Opportunities
**GET** `/api/sponsorship-opportunities`

Get list of sponsorship opportunities (public endpoint).

#### Create Opportunity
**POST** `/api/sponsorship-opportunities`

Create a new sponsorship opportunity (instructor/admin only).

#### Get Specific Opportunity
**GET** `/api/sponsorship-opportunities/:id`

Get details of a specific opportunity (public endpoint).

#### Update Opportunity
**PUT** `/api/sponsorship-opportunities/:id`

Update opportunity details (owner/admin only).

#### Delete Opportunity
**DELETE** `/api/sponsorship-opportunities/:id`

Delete an opportunity (owner/admin only).

#### Contribute to Opportunity
**POST** `/api/sponsorship-opportunities/:id/contribute`

Contribute to a sponsorship opportunity.

---

### Discussions Endpoints

#### Get Recent Discussions
**GET** `/api/discussions/recent`

Get recent discussions with filters.

#### Get Discussions
**GET** `/api/discussions`

List discussions with filters (type=general|course|class, courseId?, classId?, search, sort, order, limit, offset).

#### Create Discussion
**POST** `/api/discussions`

Create a discussion (body: { title, content, type, courseId?, classId? }).

#### Get Discussion by ID
**GET** `/api/discussions/:id`

Get discussion detail with reply count/likes.

#### Get Discussion Replies
**GET** `/api/discussions/:id/replies`

List replies with pagination.

#### Add Reply to Discussion
**POST** `/api/discussions/:id/replies`

Add reply (body: { content }).

#### Like Discussion
**POST** `/api/discussions/:id/like`

Like a discussion.

#### Unlike Discussion
**DELETE** `/api/discussions/:id/like`

Unlike a discussion.

---

### Certifications Endpoints

#### Get User's Certifications
**GET** `/api/certifications/my`

Get user's earned certificates.

#### Download Certificate
**GET** `/api/certifications/:id/download`

Download certificate file or return signed URL.

#### Get Certification Progress
**GET** `/api/certifications/progress`

Get in-progress programs with progress fields.

---

### Certification Programs Endpoints

#### Get Certification Programs
**GET** `/api/certification-programs`

List available certification programs with modules and pricing.

#### Enroll in Certification Program
**POST** `/api/certification-programs/:id/enroll`

Enroll in a certification track.

---

### Settings Endpoints

#### Get User Settings
**GET** `/api/settings/preferences`

Get user preferences and settings.

#### Update User Settings
**PUT** `/api/settings/preferences`

Update user preferences and settings.

#### Get Account Settings
**GET** `/api/settings/account`

Get user account settings.

#### Update Account Settings
**PUT** `/api/settings/account`

Update user account settings.

---

### Payments Endpoints

#### Initialize Payment
**POST** `/payments/initialize`

Initialize a payment for course or class enrollment using Flutterwave Standard v3.0.0.

#### Get Supported Payment Methods
**GET** `/payments/methods`

Get supported payment methods for a specific country.

#### Payment Verification
**GET** `/payments/verify/:reference`

Payment verification method.

#### Get User Payments
**GET** `/payments/user`

Get current user's payment history.

#### Get Payment by ID
**GET** `/payments/:id`

Get specific payment details.

---

### Admin Endpoints

#### Get All Users (Admin)
**GET** `/api/admin/users`

Get list of all users with admin details.

#### Get All Courses (Admin)
**GET** `/api/admin/courses`

Get list of all courses with admin details.

#### Get All Tests (Admin)
**GET** `/api/admin/tests`

Get list of all tests with admin details.

#### Get All Sponsorships (Admin)
**GET** `/api/admin/sponsorships`

Get list of all sponsorships with admin details.

#### Get All Discussions (Admin)
**GET** `/api/admin/discussions`

Get list of all discussions with admin details.

#### Get All Certifications (Admin)
**GET** `/api/admin/certifications`

Get list of all certifications with admin details.

#### Get Payment History (Admin)
**GET** `/api/admin/payments`

Get payment history with admin details.

#### Get System Statistics (Admin)
**GET** `/api/admin/stats/overview`

Get comprehensive system overview statistics.

#### Get User Statistics (Admin)
**GET** `/api/admin/stats/users`

Get detailed user statistics and analytics.

#### Get Course Statistics (Admin)
**GET** `/api/admin/stats/courses`

Get detailed course statistics and analytics.

#### Get Revenue Statistics (Admin)
**GET** `/admin/stats/revenue`

Get detailed revenue statistics and analytics.

#### Create Course (Admin)
**POST** `/api/admin/courses`

Create a new course.

#### Update Course (Admin)
**PUT** `/api/admin/courses/:id`

Update an existing course.

#### Create Lesson Test (Admin)
**POST** `/api/admin/lessons/:lessonId/tests`

Create a new test for a lesson.

#### Get All System Settings (Admin)
**GET** `/admin/settings`

Get all system settings.

#### Create System Setting (Admin)
**POST** `/admin/settings`

Create a new system setting.

#### Update Multiple System Settings (Admin)
**PUT** `/admin/settings`

Update multiple system settings at once.

#### Update Single System Setting (Admin)
**PUT** `/admin/settings/:key`

Update a specific system setting.

#### Delete System Setting (Admin)
**DELETE** `/admin/settings/:key`

Delete a system setting.

---

### File Upload Endpoints

#### Upload Screenshots/Images
**POST** `/api/uploads`

Upload general images and screenshots.

#### Upload Course Image
**POST** `/api/uploads/course-image`

Upload an image for a course.

#### Upload Lesson Material
**POST** `/api/uploads/lesson-material`

Upload a material file for a lesson.

#### Upload User Avatar
**POST** `/api/uploads/avatar`

Upload a user avatar image.

#### Upload Certificate
**POST** `/api/uploads/certificate`

Upload a certificate file.

#### Delete Uploaded File
**DELETE** `/api/uploads/:filename`

Delete an uploaded file.

#### List Uploaded Files (Admin Only)
**GET** `/api/uploads/files`

List all uploaded files (admin only).

---

### Scraping Management Endpoints

#### Get Scraped URLs
**GET** `/api/scraping/urls`

Get list of scraped URLs with filters.

#### Add URL to Scraping Queue
**POST** `/api/scraping/urls`

Add a URL to the scraping queue.

#### Add Multiple URLs to Scraping Queue
**POST** `/api/scraping/urls/bulk`

Add multiple URLs to the scraping queue.

#### Get Pending URLs
**GET** `/api/scraping/urls/pending`

Get pending URLs for processing.

#### Update URL Status
**PUT** `/api/scraping/urls/:id/status`

Update URL processing status.

#### Get Scraping Statistics
**GET** `/api/scraping/stats`

Get scraping statistics and recent activity.

#### Reset Failed URLs
**POST** `/api/scraping/urls/reset-failed`

Reset failed URLs to pending status.

#### Delete Scraped URL
**DELETE** `/api/scraping/urls/:id`

Delete a scraped URL.

---

### Notifications Endpoints

#### Get Notifications
**GET** `/api/notifications`

List notifications with filters (type, read, priority, sort, order, page, limit).

#### Get Notification Types
**GET** `/api/notifications/types`

Get available notification types and priorities.

#### Get Unread Count
**GET** `/api/notifications/count`

Get unread notification count (filter by type).

#### Get Notification Statistics
**GET** `/api/notifications/stats`

Get notification statistics and analytics.

#### Get Notification Preferences
**GET** `/api/notifications/preferences`

Get user notification preferences.

#### Update Notification Preferences
**PUT** `/api/notifications/preferences`

Update user notification preferences.

#### Mark Notification as Read
**PATCH** `/api/notifications/:id/read`

Mark a specific notification as read.

#### Mark All Notifications as Read
**PATCH** `/api/notifications/read-all`

Mark all notifications as read.

#### Mark Notifications by Type as Read
**PATCH** `/api/notifications/read-by-type`

Mark all notifications of a specific type as read.

#### Delete Notification
**DELETE** `/api/notifications/:id`

Delete a specific notification.

#### Delete Multiple Notifications
**DELETE** `/api/notifications/bulk`

Bulk delete notifications (by ids, type, or read status).

#### Send System Notification (Admin)
**POST** `/api/notifications/system`

Send system notification to all users (admin only).

#### Cleanup Old Notifications (Admin)
**DELETE** `/api/notifications/cleanup`

Clean up old notifications (admin only).

---

### Search Endpoints

#### Get Search Suggestions
**GET** `/api/search/suggestions`

Get lightweight search suggestions for search bars.

**Query Parameters:**
- `scope` - Search scope (classes, discussions)
- `q` - Search query string

---

### Meta Endpoints

#### Get Classes Facets
**GET** `/api/meta/classes-facets`

Get counts per topic/type and price buckets for filter chips.

---

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

## File Uploads

For file uploads (avatars, course images, etc.), the API supports:
- **Max file size**: 5MB for images, 10MB for documents/videos (configurable)
- **Supported formats**: JPEG, JPG, PNG, GIF, WebP for images; PDF, DOC, DOCX, TXT for documents; MP4, WebM, OGG for videos
- **Upload path**: `/uploads` (configurable)
- **Storage**: Files are stored with unique UUID-based names to prevent conflicts
- **Access**: Files are accessible via direct URLs

## Testing

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

## Support

For API support:
- **Documentation**: [docs.themobileprof.com](https://docs.themobileprof.com)
- **Status Page**: [status.themobileprof.com](https://status.themobileprof.com)
- **Support Email**: api-support@themobileprof.com
- **Community Forum**: [community.themobileprof.com](https://community.themobileprof.com)

---

**Version**: 2.0.0  
**Last Updated**: January 2024  
**Maintainer**: Backend Team