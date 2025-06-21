
# TheMobileProf Backend API Specification

## Overview
This document provides the complete database schema and API specification for the TheMobileProf learning management system. Use this documentation to implement a custom backend API that supports all frontend functionality.

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role ENUM('student', 'instructor', 'admin', 'sponsor') DEFAULT 'student',
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);
```

### Courses Table
```sql
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    topic VARCHAR(100) NOT NULL,
    type ENUM('online', 'offline') DEFAULT 'online',
    certification VARCHAR(255),
    price DECIMAL(10,2) NOT NULL,
    rating DECIMAL(3,2) DEFAULT 0,
    student_count INTEGER DEFAULT 0,
    duration VARCHAR(50) NOT NULL,
    instructor_id UUID NOT NULL,
    image_url TEXT,
    status ENUM('published', 'draft', 'review', 'archived') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Sponsorships Table
```sql
CREATE TABLE sponsorships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sponsor_id UUID NOT NULL,
    course_id UUID NOT NULL,
    discount_code VARCHAR(50) UNIQUE NOT NULL,
    discount_type ENUM('percentage', 'fixed') NOT NULL,
    discount_value DECIMAL(10,2) NOT NULL,
    max_students INTEGER NOT NULL,
    students_used INTEGER DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status ENUM('active', 'paused', 'expired', 'completed') DEFAULT 'active',
    completion_rate DECIMAL(5,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sponsor_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);
```

### Sponsorship_Usage Table
```sql
CREATE TABLE sponsorship_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sponsorship_id UUID NOT NULL,
    student_id UUID NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    original_price DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) NOT NULL,
    final_price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (sponsorship_id) REFERENCES sponsorships(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(sponsorship_id, student_id)
);
```

### Sponsorship_Opportunities Table
```sql
CREATE TABLE sponsorship_opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL,
    target_students INTEGER NOT NULL,
    funding_goal DECIMAL(10,2) NOT NULL,
    funding_raised DECIMAL(10,2) DEFAULT 0,
    urgency ENUM('low', 'medium', 'high') DEFAULT 'medium',
    demographics TEXT,
    impact_description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);
```

### Classes Table
```sql
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    topic VARCHAR(100) NOT NULL,
    type ENUM('online', 'hybrid') DEFAULT 'online',
    start_date DATE NOT NULL,
    end_date DATE,
    duration VARCHAR(50) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    instructor_id UUID NOT NULL,
    available_slots INTEGER NOT NULL,
    total_slots INTEGER NOT NULL,
    location TEXT,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Class_Courses Table (Many-to-Many)
```sql
CREATE TABLE class_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL,
    course_id UUID NOT NULL,
    order_index INTEGER DEFAULT 0,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE(class_id, course_id)
);
```

### Enrollments Table
```sql
CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    course_id UUID,
    class_id UUID,
    enrollment_type ENUM('course', 'class') NOT NULL,
    progress INTEGER DEFAULT 0,
    status ENUM('enrolled', 'in_progress', 'completed', 'dropped') DEFAULT 'enrolled',
    sponsorship_id UUID,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
    FOREIGN KEY (sponsorship_id) REFERENCES sponsorships(id) ON DELETE SET NULL,
    CHECK (
        (enrollment_type = 'course' AND course_id IS NOT NULL AND class_id IS NULL) OR
        (enrollment_type = 'class' AND class_id IS NOT NULL AND course_id IS NULL)
    )
);
```

### Lessons Table
```sql
CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    description_type ENUM('text', 'link', 'html') DEFAULT 'text',
    content TEXT,
    video_url TEXT,
    duration_minutes INTEGER DEFAULT 0,
    materials JSON, -- Array of material file names/URLs
    order_index INTEGER NOT NULL,
    status ENUM('published', 'draft', 'archived') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);
```

### Tests Table
```sql
CREATE TABLE tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID,
    course_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL,
    passing_score INTEGER DEFAULT 70,
    max_attempts INTEGER DEFAULT 3,
    order_index INTEGER NOT NULL,
    status ENUM('active', 'draft', 'archived') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);
```

### Test_Questions Table
```sql
CREATE TABLE test_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL,
    question TEXT NOT NULL,
    question_type ENUM('multiple_choice', 'true_false') DEFAULT 'multiple_choice',
    options JSON, -- Array of options for multiple choice questions
    correct_answer INTEGER, -- Index of correct answer for multiple choice, or 0/1 for true/false
    image_url TEXT, -- Optional image for the question
    points INTEGER DEFAULT 1,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE
);
```

### Test_Attempts Table
```sql
CREATE TABLE test_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL,
    user_id UUID NOT NULL,
    attempt_number INTEGER NOT NULL,
    score INTEGER, -- Percentage score
    total_questions INTEGER NOT NULL,
    correct_answers INTEGER DEFAULT 0,
    status ENUM('in_progress', 'completed', 'abandoned') DEFAULT 'in_progress',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    time_taken_minutes INTEGER,
    FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(test_id, user_id, attempt_number)
);
```

### Test_Attempt_Answers Table
```sql
CREATE TABLE test_attempt_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL,
    question_id UUID NOT NULL,
    selected_answer INTEGER, -- For multiple choice/true false
    is_correct BOOLEAN DEFAULT false,
    points_earned INTEGER DEFAULT 0,
    answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (attempt_id) REFERENCES test_attempts(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES test_questions(id) ON DELETE CASCADE,
    UNIQUE(attempt_id, question_id)
);
```

### Discussions Table
```sql
CREATE TABLE discussions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    author_id UUID NOT NULL,
    course_id UUID,
    class_id UUID,
    is_pinned BOOLEAN DEFAULT false,
    reply_count INTEGER DEFAULT 0,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL
);
```

### Discussion_Replies Table
```sql
CREATE TABLE discussion_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discussion_id UUID NOT NULL,
    author_id UUID NOT NULL,
    content TEXT NOT NULL,
    parent_reply_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (discussion_id) REFERENCES discussions(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_reply_id) REFERENCES discussion_replies(id) ON DELETE SET NULL
);
```

### Certifications Table
```sql
CREATE TABLE certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    course_id UUID,
    class_id UUID,
    certification_name VARCHAR(255) NOT NULL,
    issuer VARCHAR(255) NOT NULL,
    issued_date DATE NOT NULL,
    expiry_date DATE,
    certificate_url TEXT,
    verification_code VARCHAR(100) UNIQUE,
    status ENUM('issued', 'expired', 'revoked') DEFAULT 'issued',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL
);
```

### User_Settings Table
```sql
CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    marketing_emails BOOLEAN DEFAULT false,
    theme ENUM('light', 'dark', 'system') DEFAULT 'system',
    language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## API Endpoints

### Authentication
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
GET  /api/auth/me
```

### Users
```
GET    /api/users
POST   /api/users
GET    /api/users/:id
PUT    /api/users/:id
DELETE /api/users/:id
GET    /api/users/:id/enrollments
GET    /api/users/:id/certifications
```

### Admin - Users Management
```
GET    /api/admin/users
POST   /api/admin/users
PUT    /api/admin/users/:id
DELETE /api/admin/users/:id
PUT    /api/admin/users/:id/role
PUT    /api/admin/users/:id/status
GET    /api/admin/users/stats
```

### Courses
```
GET    /api/courses
POST   /api/courses
GET    /api/courses/:id
PUT    /api/courses/:id
DELETE /api/courses/:id
GET    /api/courses/:id/lessons
POST   /api/courses/:id/lessons
GET    /api/courses/:id/tests
POST   /api/courses/:id/tests
GET    /api/courses/:id/enrollments
POST   /api/courses/:id/enroll
GET    /api/courses/:id/analytics
```

### Admin - Course Management
```
GET    /api/admin/courses
POST   /api/admin/courses
PUT    /api/admin/courses/:id
DELETE /api/admin/courses/:id
PUT    /api/admin/courses/:id/status
GET    /api/admin/courses/:id/analytics
POST   /api/admin/courses/:id/approve
POST   /api/admin/courses/:id/reject
POST   /api/admin/courses/:id/archive
POST   /api/admin/courses/:id/duplicate
GET    /api/admin/courses/stats
```

### Admin - Lesson Management
```
GET    /api/admin/courses/:courseId/lessons
POST   /api/admin/courses/:courseId/lessons
GET    /api/admin/lessons/:id
PUT    /api/admin/lessons/:id
DELETE /api/admin/lessons/:id
PUT    /api/admin/lessons/:id/status
POST   /api/admin/lessons/:id/duplicate
GET    /api/admin/lessons/:id/tests
POST   /api/admin/lessons/:id/tests
```

### Admin - Test Management
```
GET    /api/admin/tests/:id
PUT    /api/admin/tests/:id
DELETE /api/admin/tests/:id
PUT    /api/admin/tests/:id/status
POST   /api/admin/tests/:id/duplicate
GET    /api/admin/tests/:id/questions
POST   /api/admin/tests/:id/questions
PUT    /api/admin/tests/:id/questions/:questionId
DELETE /api/admin/tests/:id/questions/:questionId
GET    /api/admin/tests/:id/results
GET    /api/admin/tests/:id/analytics
```

### Sponsorships
```
GET    /api/sponsorships
POST   /api/sponsorships
GET    /api/sponsorships/:id
PUT    /api/sponsorships/:id
DELETE /api/sponsorships/:id
GET    /api/sponsorships/sponsor/:sponsorId
POST   /api/sponsorships/:id/use
GET    /api/sponsorships/code/:discountCode
POST   /api/sponsorships/:id/email
GET    /api/sponsorships/:id/stats
```

### Admin - Sponsorship Management
```
GET    /api/admin/sponsorships
POST   /api/admin/sponsorships
PUT    /api/admin/sponsorships/:id
DELETE /api/admin/sponsorships/:id
PUT    /api/admin/sponsorships/:id/status
GET    /api/admin/sponsorships/stats
GET    /api/admin/sponsorships/:id/usage
```

### Sponsorship Opportunities
```
GET    /api/sponsorship-opportunities
POST   /api/sponsorship-opportunities
GET    /api/sponsorship-opportunities/:id
PUT    /api/sponsorship-opportunities/:id
DELETE /api/sponsorship-opportunities/:id
```

### Classes
```
GET    /api/classes
POST   /api/classes
GET    /api/classes/:id
PUT    /api/classes/:id
DELETE /api/classes/:id
GET    /api/classes/:id/enrollments
POST   /api/classes/:id/enroll
```

### Lessons
```
GET    /api/lessons/:id
PUT    /api/lessons/:id
DELETE /api/lessons/:id
POST   /api/lessons/:id/materials/upload
```

### Tests & Quizzes
```
GET    /api/tests/:id
PUT    /api/tests/:id
DELETE /api/tests/:id
GET    /api/tests/:id/questions
POST   /api/tests/:id/questions
PUT    /api/tests/:id/questions/:questionId
DELETE /api/tests/:id/questions/:questionId
POST   /api/tests/:id/start
GET    /api/tests/:id/attempts/:attemptId
PUT    /api/tests/:id/attempts/:attemptId/answer
POST   /api/tests/:id/attempts/:attemptId/submit
GET    /api/tests/:id/attempts/:attemptId/results
POST   /api/tests/:id/questions/:questionId/image/upload
```

### Discussions
```
GET    /api/discussions
POST   /api/discussions
GET    /api/discussions/:id
PUT    /api/discussions/:id
DELETE /api/discussions/:id
GET    /api/discussions/:id/replies
POST   /api/discussions/:id/replies
```

### Certifications
```
GET    /api/certifications
POST   /api/certifications
GET    /api/certifications/:id
PUT    /api/certifications/:id
DELETE /api/certifications/:id
GET    /api/certifications/verify/:code
```

### Settings
```
GET    /api/settings
PUT    /api/settings
```

### Admin - System Settings
```
GET    /api/admin/settings
PUT    /api/admin/settings
GET    /api/admin/stats/overview
GET    /api/admin/stats/users
GET    /api/admin/stats/courses
GET    /api/admin/stats/revenue
```

## Request/Response Examples

### Admin - Create Course
```json
POST /api/admin/courses
{
  "title": "Linux Fundamentals",
  "description": "Master the basics of Linux operating system",
  "topic": "Linux",
  "type": "online",
  "certification": "Linux Professional Institute", 
  "price": 299.00,
  "duration": "6 weeks",
  "instructorId": "uuid",
  "status": "draft"
}

Response:
{
  "id": "uuid",
  "title": "Linux Fundamentals",
  "description": "Master the basics of Linux operating system",
  "topic": "Linux", 
  "type": "online",
  "certification": "Linux Professional Institute",
  "price": 299.00,
  "duration": "6 weeks",
  "instructorId": "uuid",
  "status": "draft",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### Admin - Create Lesson with Rich Content
```json
POST /api/admin/courses/:courseId/lessons
{
  "title": "Introduction to Linux",
  "description": "<h2>Welcome to Linux</h2><p>This lesson covers...</p>",
  "descriptionType": "html",
  "videoUrl": "https://example.com/video1",
  "duration": 45,
  "materials": ["slides.pdf", "notes.txt"],
  "status": "published"
}

Response:
{
  "id": "uuid",
  "courseId": "uuid",
  "title": "Introduction to Linux",
  "description": "<h2>Welcome to Linux</h2><p>This lesson covers...</p>",
  "descriptionType": "html",
  "videoUrl": "https://example.com/video1", 
  "duration": 45,
  "materials": ["slides.pdf", "notes.txt"],
  "orderIndex": 1,
  "status": "published",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### Admin - Create Test with Image Questions
```json
POST /api/admin/lessons/:lessonId/tests
{
  "title": "Linux Basics Quiz",
  "description": "Test your knowledge of Linux fundamentals",
  "durationMinutes": 30,
  "passingScore": 70,
  "maxAttempts": 3,
  "questions": [
    {
      "question": "What does this Linux command do?",
      "questionType": "multiple_choice",
      "options": ["Lists files", "Changes directory", "Creates file", "Deletes file"],
      "correctAnswer": 0,
      "imageUrl": "https://example.com/command-screenshot.png",
      "points": 2
    },
    {
      "question": "Linux is an open-source operating system.",
      "questionType": "true_false", 
      "correctAnswer": 1,
      "points": 1
    }
  ]
}

Response:
{
  "test": {
    "id": "uuid",
    "lessonId": "uuid",
    "courseId": "uuid",
    "title": "Linux Basics Quiz",
    "description": "Test your knowledge of Linux fundamentals",
    "durationMinutes": 30,
    "passingScore": 70,
    "maxAttempts": 3,
    "status": "active",
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "questions": [
    {
      "id": "uuid",
      "testId": "uuid",
      "question": "What does this Linux command do?",
      "questionType": "multiple_choice",
      "options": ["Lists files", "Changes directory", "Creates file", "Deletes file"],
      "correctAnswer": 0,
      "imageUrl": "https://example.com/command-screenshot.png",
      "points": 2,
      "orderIndex": 1
    }
  ]
}
```

### Admin - Get Test Results/Analytics
```json
GET /api/admin/tests/:id/results

Response:
{
  "test": {
    "id": "uuid",
    "title": "Linux Basics Quiz",
    "questions": 10,
    "duration": 30,
    "status": "active"
  },
  "overview": {
    "totalAttempts": 245,
    "averageScore": 78,
    "passRate": 85,
    "averageTime": 22
  },
  "studentResults": [
    {
      "id": "uuid",
      "studentName": "John Doe",
      "email": "john@example.com",
      "score": 85,
      "completedAt": "2024-01-15T10:30:00Z",
      "timeTaken": 25,
      "attempt": 1,
      "status": "passed"
    }
  ],
  "questionAnalytics": [
    {
      "questionId": "uuid",
      "question": "What is the default shell in Linux?",
      "correctRate": 92,
      "totalAnswers": 245,
      "correctAnswers": 225
    }
  ]
}
```

### Admin - Get Course Analytics
```json
GET /api/admin/courses/:id/analytics

Response:
{
  "course": {
    "id": "uuid",
    "title": "Linux Fundamentals",
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
      "title": "Introduction to Linux", 
      "completionRate": 95,
      "averageScore": 85,
      "tests": [
        {
          "testId": "uuid",
          "title": "Linux Basics Quiz",
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

### Admin - Upload Question Image
```json
POST /api/tests/:id/questions/:questionId/image/upload
Content-Type: multipart/form-data

Form Data:
- image: [binary file data]
- alt: "Linux command screenshot"

Response:
{
  "success": true,
  "imageUrl": "https://example.com/uploads/question-images/uuid.png",
  "message": "Image uploaded successfully"
}
```

### Admin - Get System Stats
```json
GET /api/admin/stats/overview

Response:
{
  "users": {
    "total": 2542,
    "students": 2245,
    "instructors": 285,
    "sponsors": 12,
    "newThisMonth": 156
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
    "totalAttempts": 15420,
    "averageScore": 76
  },
  "revenue": {
    "total": 125600.50,
    "thisMonth": 12450.75,
    "sponsorshipSavings": 45200.25
  },
  "engagement": {
    "activeUsers": 1840,
    "courseCompletions": 856,
    "discussionPosts": 2341
  }
}
```

### Admin - Update User Role
```json
PUT /api/admin/users/:id/role
{
  "role": "instructor"
}

Response:
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe", 
    "role": "instructor",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### Create Sponsorship
```json
POST /api/sponsorships
{
  "courseId": "uuid",
  "discountType": "percentage",
  "discountValue": 75,
  "maxStudents": 45,
  "duration": 6,
  "notes": "Supporting Linux education for underserved communities"
}

Response:
{
  "id": "uuid",
  "sponsorId": "uuid",
  "courseId": "uuid",
  "discountCode": "SPONSOR2024A1",
  "discountType": "percentage",
  "discountValue": 75,
  "maxStudents": 45,
  "studentsUsed": 0,
  "startDate": "2024-01-15",
  "endDate": "2024-07-15",
  "status": "active",
  "completionRate": 0,
  "createdAt": "2024-01-15T00:00:00Z"
}
```

### Use Sponsorship Code
```json
POST /api/sponsorships/:id/use
{
  "studentId": "uuid",
  "courseId": "uuid"
}

Response:
{
  "success": true,
  "originalPrice": 299.00,
  "discountAmount": 224.25,
  "finalPrice": 74.75,
  "message": "Sponsorship code applied successfully"
}
```

### Validate Sponsorship Code
```json
GET /api/sponsorships/code/SPONSOR2024A1

Response:
{
  "valid": true,
  "sponsorship": {
    "id": "uuid",
    "courseName": "Linux Fundamentals for Beginners",
    "discountType": "percentage",
    "discountValue": 75,
    "maxStudents": 45,
    "studentsUsed": 32,
    "remainingSpots": 13,
    "endDate": "2024-07-15"
  }
}
```

### Send Sponsorship Email
```json
POST /api/sponsorships/:id/email
{
  "recipientEmail": "student@example.com",
  "isForRecipient": true,
  "customMessage": "Congratulations! You've been selected for this educational sponsorship."
}

Response:
{
  "success": true,
  "message": "Sponsorship details sent successfully"
}
```

### Get Sponsorship Stats
```json
GET /api/sponsorships/:id/stats

Response:
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
  ]
}
```

### Get Sponsorship Opportunities
```json
GET /api/sponsorship-opportunities

Response:
{
  "opportunities": [
    {
      "id": "uuid",
      "courseName": "Artificial Intelligence Fundamentals",
      "instructor": "Dr. Alex Thompson",
      "instructorRating": 4.9,
      "description": "Comprehensive introduction to AI concepts",
      "targetStudents": 100,
      "currentStudents": 15,
      "fundingGoal": 12000,
      "fundingRaised": 3200,
      "duration": "6 months",
      "category": "AI/ML",
      "urgency": "high",
      "demographics": "Low-income students",
      "impact": "High-demand tech skills"
    }
  ]
}
```

### User Registration
```json
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "securepassword",
  "firstName": "John",
  "lastName": "Doe",
  "role": "student"
}

Response:
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "student"
  },
  "token": "jwt_token"
}
```

### Start Test Attempt
```json
POST /api/tests/:id/start
{
  "user_id": "uuid"
}

Response:
{
  "attempt": {
    "id": "uuid",
    "test_id": "uuid",
    "user_id": "uuid",
    "attempt_number": 1,
    "status": "in_progress",
    "started_at": "2024-01-01T00:00:00Z"
  },
  "questions": [
    {
      "id": "uuid",
      "question": "What is the default shell in most Linux distributions?",
      "question_type": "multiple_choice",
      "options": ["bash", "zsh", "fish", "csh"],
      "imageUrl": null,
      "points": 1,
      "order_index": 1
    }
  ]
}
```

### Submit Test Answer
```json
PUT /api/tests/:id/attempts/:attemptId/answer
{
  "question_id": "uuid",
  "selected_answer": 0
}

Response:
{
  "success": true,
  "message": "Answer saved successfully"
}
```

### Submit Test
```json
POST /api/tests/:id/attempts/:attemptId/submit

Response:
{
  "results": {
    "attempt_id": "uuid",
    "score": 85,
    "total_questions": 20,
    "correct_answers": 17,
    "time_taken_minutes": 45,
    "completed_at": "2024-01-01T00:45:00Z",
    "passed": true
  }
}
```

### Get Test Results
```json
GET /api/tests/:id/attempts/:attemptId/results

Response:
{
  "attempt": {
    "id": "uuid",
    "score": 85,
    "total_questions": 20,
    "correct_answers": 17,
    "time_taken_minutes": 45,
    "status": "completed"
  },
  "questions": [
    {
      "id": "uuid",
      "question": "What is the default shell in most Linux distributions?",
      "options": ["bash", "zsh", "fish", "csh"],
      "correct_answer": 0,
      "user_answer": 0,
      "is_correct": true,
      "points_earned": 1,
      "imageUrl": null
    }
  ]
}
```

## Data Models (TypeScript Interfaces)

```typescript
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'instructor' | 'admin' | 'sponsor';
  avatarUrl?: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

interface Course {
  id: string;
  title: string;
  description: string;
  topic: string;
  type: 'online' | 'offline';
  certification?: string;
  price: number;
  rating: number;
  studentCount: number;
  duration: string;
  instructorId: string;
  imageUrl?: string;
  status: 'published' | 'draft' | 'review' | 'archived';
  createdAt: string;
  updatedAt: string;
}

interface Lesson {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  descriptionType: 'text' | 'link' | 'html';
  content?: string;
  videoUrl?: string;
  durationMinutes: number;
  materials: string[];
  orderIndex: number;
  status: 'published' | 'draft' | 'archived';
  createdAt: string;
  updatedAt: string;
}

interface Test {
  id: string;
  lessonId?: string;
  courseId: string;
  title: string;
  description?: string;
  durationMinutes: number;
  passingScore: number;
  maxAttempts: number;
  orderIndex: number;
  status: 'active' | 'draft' | 'archived';
  createdAt: string;
  updatedAt: string;
}

interface TestQuestion {
  id: string;
  testId: string;
  question: string;
  questionType: 'multiple_choice' | 'true_false';
  options?: string[]; // For multiple choice questions
  correctAnswer: number; // Index for multiple choice/true-false
  imageUrl?: string; // Optional image for the question
  points: number;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

interface TestAttempt {
  id: string;
  testId: string;
  userId: string;
  attemptNumber: number;
  score?: number; // Percentage
  totalQuestions: number;
  correctAnswers: number;
  status: 'in_progress' | 'completed' | 'abandoned';
  startedAt: string;
  completedAt?: string;
  timeTakenMinutes?: number;
}

interface TestAttemptAnswer {
  id: string;
  attemptId: string;
  questionId: string;
  selectedAnswer: number; // For multiple choice/true-false
  isCorrect: boolean;
  pointsEarned: number;
  answeredAt: string;
}

interface TestResults {
  test: {
    id: string;
    title: string;
    questions: number;
    duration: number;
    status: string;
  };
  overview: {
    totalAttempts: number;
    averageScore: number;
    passRate: number;
    averageTime: number;
  };
  studentResults: {
    id: string;
    studentName: string;
    email: string;
    score: number;
    completedAt: string;
    timeTaken: number;
    attempt: number;
    status: 'passed' | 'failed';
  }[];
  questionAnalytics: {
    questionId: string;
    question: string;
    correctRate: number;
    totalAnswers: number;
    correctAnswers: number;
  }[];
}

interface CourseAnalytics {
  course: {
    id: string;
    title: string;
    students: number;
  };
  overview: {
    totalQuestions: number;
    totalDuration: number;
    totalAttempts: number;
    averageScore: number;
    completionRate: number;
  };
  lessonAnalytics: {
    lessonId: string;
    title: string;
    completionRate: number;
    averageScore: number;
    tests: {
      testId: string;
      title: string;
      attempts: number;
      averageScore: number;
      passRate: number;
    }[];
  }[];
  studentProgress: {
    studentId: string;
    studentName: string;
    progress: number;
    lessonsCompleted: number;
    testsCompleted: number;
    averageScore: number;
  }[];
}

interface AdminStats {
  users: {
    total: number;
    students: number;
    instructors: number;
    sponsors: number;
    newThisMonth: number;
  };
  courses: {
    total: number;
    published: number;
    draft: number;
    review: number;
    archived: number;
  };
  tests: {
    total: number;
    active: number;
    totalAttempts: number;
    averageScore: number;
  };
  revenue: {
    total: number;
    thisMonth: number;
    sponsorshipSavings: number;
  };
  engagement: {
    activeUsers: number;
    courseCompletions: number;
    discussionPosts: number;
  };
}

interface Sponsorship {
  id: string;
  sponsorId: string;
  courseId: string;
  discountCode: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxStudents: number;
  studentsUsed: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'paused' | 'expired' | 'completed';
  completionRate: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface SponsorshipUsage {
  id: string;
  sponsorshipId: string;
  studentId: string;
  usedAt: string;
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
}

interface SponsorshipOpportunity {
  id: string;
  courseId: string;
  targetStudents: number;
  fundingGoal: number;
  fundingRaised: number;
  urgency: 'low' | 'medium' | 'high';
  demographics?: string;
  impactDescription?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Class {
  id: string;
  title: string;
  description: string;
  topic: string;
  type: 'online' | 'hybrid';
  startDate: string;
  endDate?: string;
  duration: string;
  price: number;
  instructorId: string;
  availableSlots: number;
  totalSlots: number;
  location?: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  courses?: string[]; // Array of course titles for display
}

interface Enrollment {
  id: string;
  userId: string;
  courseId?: string;
  classId?: string;
  enrollmentType: 'course' | 'class';
  progress: number;
  status: 'enrolled' | 'in_progress' | 'completed' | 'dropped';
  sponsorshipId?: string;
  enrolledAt: string;
  completedAt?: string;
}

interface Discussion {
  id: string;
  title: string;
  content: string;
  category: string;
  authorId: string;
  courseId?: string;
  classId?: string;
  isPinned: boolean;
  replyCount: number;
  lastActivityAt: string;
  createdAt: string;
}

interface Certification {
  id: string;
  userId: string;
  courseId?: string;
  classId?: string;
  certificationName: string;
  issuer: string;
  issuedDate: string;
  expiryDate?: string;
  certificateUrl?: string;
  verificationCode: string;
  status: 'issued' | 'expired' | 'revoked';
  createdAt: string;
}
```

## Authentication & Authorization

### JWT Token Structure
```json
{
  "user_id": "uuid",
  "email": "user@example.com",
  "role": "student",
  "exp": 1234567890,
  "iat": 1234567890
}
```

### Role-Based Access Control
- **Students**: Can view and enroll in courses/classes, take tests, participate in discussions, use sponsorship codes
- **Instructors**: Can create and manage courses/classes/tests, view student progress and test results
- **Sponsors**: Can create and manage sponsorships, view sponsorship analytics, send sponsorship codes
- **Admins**: Full access to all resources, user management, system settings, analytics

### Admin Permissions
Admins have additional permissions for:
- Managing all users (create, update, delete, change roles)
- Managing all courses regardless of instructor
- Approving/rejecting course submissions
- Viewing comprehensive analytics across the platform
- Managing system settings and configurations
- Overriding sponsorship limits and rules
- Accessing detailed test results and student data

## Implementation Notes

1. Use UUID for all primary keys
2. Implement proper password hashing (bcrypt recommended)
3. Add database indexes on frequently queried columns (user_id, course_id, test_id, sponsorship_id, discount_code, etc.)
4. Implement rate limiting for API endpoints, especially test submission and sponsorship usage
5. Add input validation and sanitization for all test answers, lesson content, and sponsorship data
6. Use prepared statements to prevent SQL injection
7. Implement proper error handling and logging
8. Add API versioning for future updates
9. Implement test timer functionality to prevent cheating
10. Add test attempt validation to prevent multiple simultaneous attempts
11. Implement proper test scoring algorithms for different question types
12. Add sponsorship code validation and usage tracking
13. Implement email notification system for sponsorship sharing
14. Add analytics tracking for sponsorship effectiveness
15. Implement expiration handling for sponsorship codes
16. Add file upload handling for lesson materials and question images
17. Implement rich text content storage and sanitization for HTML lesson descriptions
18. Add comprehensive admin audit logging for all administrative actions
19. Implement data export functionality for analytics and reporting
20. Add backup and restore functionality for critical data
21. Implement proper pagination for large datasets
22. Add search and filtering capabilities for admin interfaces
23. Implement real-time notifications for admin actions
24. Add comprehensive validation for all admin operations

## File Upload Configuration

### Supported File Types
- **Lesson Materials**: PDF, DOC, DOCX, TXT, ZIP
- **Question Images**: PNG, JPG, JPEG, GIF, SVG
- **Course Images**: PNG, JPG, JPEG
- **User Avatars**: PNG, JPG, JPEG

### File Size Limits
- **Images**: Maximum 5MB
- **Documents**: Maximum 25MB
- **Videos**: Maximum 500MB (if supporting video uploads)

### Storage Structure
```
uploads/
├── course-images/
├── lesson-materials/
├── question-images/
├── user-avatars/
└── certificates/
```

## Sample Environment Variables
```
DATABASE_URL=postgresql://username:password@localhost:5432/themobileprof
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=12
PORT=3000
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
```

This specification provides everything needed to build a complete backend API that supports all the functionality in your TheMobileProf frontend application, including the comprehensive admin management system, enhanced lesson creation with rich content support, improved test creation with image uploads, and detailed analytics and reporting capabilities.
