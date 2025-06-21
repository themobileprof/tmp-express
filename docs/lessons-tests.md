# Lessons & Tests

## Lessons Endpoints

### Get Lesson by ID
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

### Update Lesson
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

## Tests Endpoints

### Get Test by ID
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

### Get Test Questions
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

### Start Test Attempt
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

### Submit Answer
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

### Submit Test
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

### Get Test Results
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

## Lesson Management Features

### Content Types
- **Text content** - Rich text with formatting
- **Video content** - Embedded or hosted videos
- **File attachments** - PDFs, documents, resources
- **Interactive elements** - Quizzes, exercises
- **External links** - Additional resources

### Lesson Organization
- **Sequential ordering** - Logical progression through content
- **Prerequisites** - Required completion of previous lessons
- **Estimated duration** - Time expectations for completion
- **Difficulty levels** - Beginner, intermediate, advanced
- **Tags and categories** - Content classification

### Progress Tracking
- **Completion status** - Marked as complete/incomplete
- **Time spent** - Duration tracking per lesson
- **Engagement metrics** - Video views, content interactions
- **Notes and bookmarks** - Student annotations
- **Discussion participation** - Comments and questions

---

## Test Management Features

### Question Types
- **Multiple choice** - Single correct answer
- **Multiple select** - Multiple correct answers
- **True/False** - Binary choice questions
- **Short answer** - Text-based responses
- **Essay questions** - Long-form responses
- **File upload** - Document submissions

### Test Configuration
- **Time limits** - Maximum duration for completion
- **Attempt limits** - Number of allowed attempts
- **Passing scores** - Minimum score to pass
- **Question randomization** - Random question order
- **Answer shuffling** - Random option order
- **Proctoring options** - Anti-cheating measures

### Scoring System
- **Point-based scoring** - Different weights per question
- **Partial credit** - Partial points for incomplete answers
- **Negative marking** - Penalties for wrong answers
- **Bonus questions** - Extra credit opportunities
- **Curved grading** - Statistical score adjustments

---

## Assessment Features

### Test Analytics
- **Performance metrics** - Average scores, pass rates
- **Question analysis** - Difficulty and discrimination indices
- **Time analysis** - Completion time patterns
- **Attempt patterns** - Multiple attempt behaviors
- **Learning gaps** - Areas needing improvement

### Feedback Systems
- **Immediate feedback** - Instant results and explanations
- **Detailed feedback** - Comprehensive answer explanations
- **Progress reports** - Performance over time
- **Recommendations** - Suggested study areas
- **Certification tracking** - Achievement recognition

### Adaptive Testing
- **Difficulty adjustment** - Questions based on performance
- **Personalized content** - Tailored to learning style
- **Remedial paths** - Additional practice for weak areas
- **Advanced challenges** - Bonus content for high performers
- **Learning paths** - Customized progression routes

---

## Best Practices

### Lesson Design
- **Clear objectives** - Define learning outcomes
- **Engaging content** - Use multimedia and interactivity
- **Progressive difficulty** - Build from simple to complex
- **Practical examples** - Real-world applications
- **Regular assessments** - Check understanding frequently

### Test Creation
- **Valid questions** - Test actual knowledge and skills
- **Clear language** - Avoid ambiguous wording
- **Appropriate difficulty** - Match target audience
- **Fair scoring** - Consistent and transparent grading
- **Security measures** - Prevent cheating and plagiarism

### Content Management
- **Regular updates** - Keep content current and relevant
- **Quality assurance** - Review and validate content
- **Accessibility** - Ensure content is accessible to all
- **Mobile optimization** - Responsive design for all devices
- **Performance optimization** - Fast loading and smooth experience

---

## Quick Navigation

- **[API Overview](api-overview.md)** - Back to overview
- **[Courses & Classes](courses-classes.md)** - Course management
- **[Admin Endpoints](admin-endpoints.md)** - Content administration
- **[File Uploads](file-uploads.md)** - Media management 