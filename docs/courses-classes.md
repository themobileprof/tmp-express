# Courses & Classes

## Courses Endpoints

### Get All Courses
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

### Create Course
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

### Get Course by ID
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

### Update Course
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

### Get Course Lessons
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

### Get Course Tests
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

### Enroll in Course
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

## Classes Endpoints

### Get All Classes
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

### Create Class
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

### Get Class by ID
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

### Enroll in Class
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

## Course Management Features

### Course Publishing Workflow
1. **Draft** - Course created but not visible to students
2. **Review** - Submitted for admin approval (optional)
3. **Published** - Available for enrollment
4. **Archived** - No longer available for new enrollments

### Course Content Organization
- **Lessons** - Individual learning units with content and videos
- **Tests** - Assessments to evaluate learning progress
- **Materials** - Additional resources (PDFs, links, etc.)
- **Discussions** - Student-instructor interactions

### Enrollment Management
- **Automatic enrollment** - Direct course purchase
- **Sponsorship enrollment** - Using discount codes
- **Class enrollment** - Limited slots with scheduling
- **Progress tracking** - Completion status and scores

---

## Class Management Features

### Class Types
- **Online** - Virtual classes with video conferencing
- **Offline** - Physical location-based classes
- **Hybrid** - Combination of online and offline sessions

### Scheduling Features
- **Fixed dates** - Specific start and end dates
- **Recurring sessions** - Weekly/bi-weekly meetings
- **Flexible timing** - Self-paced with deadlines
- **Time zones** - Support for multiple time zones

### Capacity Management
- **Slot tracking** - Available vs. total slots
- **Waitlist** - Automatic waitlist when full
- **Cancellation** - Refund and slot management
- **Attendance** - Track student participation

---

## Best Practices

### Course Creation
- Use clear, descriptive titles
- Provide comprehensive descriptions
- Set appropriate pricing based on value
- Include high-quality course images
- Structure content logically

### Class Scheduling
- Consider time zones for online classes
- Set realistic class sizes
- Provide clear location information
- Include preparation requirements
- Plan for technical issues

### Content Management
- Keep lessons concise and focused
- Include practical exercises
- Provide multiple learning formats
- Regular content updates
- Quality assurance reviews

---

## Quick Navigation

- **[API Overview](api-overview.md)** - Back to overview
- **[Authentication & Users](auth-users.md)** - User management
- **[Lessons & Tests](lessons-tests.md)** - Content management
- **[Admin Endpoints](admin-endpoints.md)** - Course administration
- **[File Uploads](file-uploads.md)** - Media management 