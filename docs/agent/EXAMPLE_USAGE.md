# Example API Usage for Course Scraping Agent

This document provides practical examples of how to use the LMS API endpoints correctly.

## Prerequisites

1. Set up environment variables:
```env
LMS_EMAIL=your_admin_email@example.com
LMS_PASSWORD=your_admin_password
LMS_BASE_URL=https://api.themobileprof.com
```

2. Install required dependencies:
```bash
npm install axios
```

## Authentication Flow

```javascript
const axios = require('axios');

async function authenticate() {
  try {
    const response = await axios.post(`${LMS_BASE_URL}/api/auth/login`, {
      email: process.env.LMS_EMAIL,
      password: process.env.LMS_PASSWORD
    });
    
    return response.data.data.tokens.access;
  } catch (error) {
    console.error('Authentication failed:', error.response?.data || error.message);
    throw error;
  }
}
```

## Course Creation Example

```javascript
async function createCourse(token, courseData) {
  try {
    const response = await axios.post(`${LMS_BASE_URL}/api/admin/courses`, {
      title: courseData.title,
      description: courseData.description,
      topic: courseData.topic,
      type: 'online', // or 'offline'
      price: courseData.price || 0,
      duration: courseData.duration,
      instructorId: courseData.instructorId, // Must be a valid UUID
      certification: courseData.certification || null,
      imageUrl: courseData.imageUrl || null
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data.course;
  } catch (error) {
    if (error.response?.data?.error?.code === 'VALIDATION_ERROR') {
      console.error('Validation errors:', error.response.data.error.details);
    }
    throw error;
  }
}

// Usage example
const courseData = {
  title: 'Linux Essentials',
  description: 'Learn the fundamentals of Linux operating system',
  topic: 'operating_systems',
  price: 0,
  duration: '8 weeks',
  // instructorId is optional - courses can exist without an instructor
  certification: 'LPI Linux Essentials'
};

const course = await createCourse(token, courseData);
console.log('Course created:', course.id);
```

## Lesson Creation Example

```javascript
async function createLesson(token, courseId, lessonData) {
  try {
    const response = await axios.post(`${LMS_BASE_URL}/api/admin/courses/${courseId}/lessons`, {
      title: lessonData.title,
      description: lessonData.description,
      content: lessonData.content, // HTML content with embedded screenshots
      durationMinutes: lessonData.durationMinutes,
      status: lessonData.status || 'published'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data.lesson;
  } catch (error) {
    if (error.response?.data?.error?.code === 'VALIDATION_ERROR') {
      console.error('Validation errors:', error.response.data.error.details);
    }
    throw error;
  }
}

// Usage example
const lessonData = {
  title: 'Introduction to Linux Commands',
  description: 'Learn basic Linux command line operations',
  content: `
    <h2>Introduction to Linux Commands</h2>
    <p>In this lesson, you'll learn the fundamental commands used in Linux.</p>
    
    <h3>Basic Commands</h3>
    <p>Here are some essential commands:</p>
    <ul>
      <li><code>ls</code> - List files and directories</li>
      <li><code>cd</code> - Change directory</li>
      <li><code>pwd</code> - Print working directory</li>
    </ul>
    
    <h3>Example Terminal Session</h3>
    <img src="https://api.themobileprof.com/uploads/screenshots/terminal_example.png" alt="Terminal example" />
  `,
  durationMinutes: 45,
  status: 'published'
};

const lesson = await createLesson(token, courseId, lessonData);
console.log('Lesson created:', lesson.id);
```

## File Upload Example

```javascript
const FormData = require('form-data');

async function uploadScreenshot(token, filePath, lessonId = null) {
  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    form.append('type', 'screenshot');
    if (lessonId) {
      form.append('lesson_id', lessonId);
    }
    
    const response = await axios.post(`${LMS_BASE_URL}/api/upload`, form, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...form.getHeaders()
      }
    });
    
    return response.data.data.url;
  } catch (error) {
    console.error('Upload failed:', error.response?.data || error.message);
    throw error;
  }
}

// Usage example
const screenshotUrl = await uploadScreenshot(token, './screenshots/terminal_example.png');
console.log('Screenshot uploaded:', screenshotUrl);
```

## Complete Workflow Example

```javascript
async function processCourse(courseUrl) {
  try {
    // 1. Authenticate
    const token = await authenticate();
    
    // 2. Scrape course data (implement your scraping logic)
    const scrapedData = await scrapeCoursePage(courseUrl);
    
    // 3. Create course
    const course = await createCourse(token, {
      title: scrapedData.title,
      description: scrapedData.description,
      topic: 'programming',
      price: 0,
      duration: '6 weeks',
      instructorId: '550e8400-e29b-41d4-a716-446655440000'
    });
    
    // 4. Process each lesson
    for (const lessonData of scrapedData.lessons) {
      // Generate screenshot
      const screenshotPath = await generateTermuxScreenshot(lessonData);
      
      // Upload screenshot
      const screenshotUrl = await uploadScreenshot(token, screenshotPath);
      
      // Create lesson with embedded screenshot
      const lesson = await createLesson(token, course.id, {
        title: lessonData.title,
        description: lessonData.description,
        content: lessonData.content.replace('{{SCREENSHOT}}', screenshotUrl),
        durationMinutes: lessonData.durationMinutes
      });
      
      console.log(`Created lesson: ${lesson.title}`);
    }
    
    console.log(`Course "${course.title}" created successfully with ${scrapedData.lessons.length} lessons`);
    
  } catch (error) {
    console.error('Process failed:', error.message);
  }
}
```

## Error Handling Best Practices

1. **Always check for validation errors**:
```javascript
if (error.response?.data?.error?.code === 'VALIDATION_ERROR') {
  const details = error.response.data.error.details;
  console.error('Validation errors:', details);
  // Handle specific field errors
  if (details.instructorId) {
    console.error('Invalid instructor ID');
  }
}
```

2. **Handle authentication errors**:
```javascript
if (error.response?.status === 401) {
  console.error('Authentication failed - check credentials');
  // Re-authenticate or exit
}
```

3. **Handle rate limiting**:
```javascript
if (error.response?.status === 429) {
  console.error('Rate limit exceeded - wait before retrying');
  await new Promise(resolve => setTimeout(resolve, 5000));
}
```

## Common Issues and Solutions

1. **Invalid UUID for instructorId**: Make sure you have a valid instructor user ID
2. **Missing required fields**: All required fields must be provided
3. **Invalid content format**: Content should be valid HTML
4. **File upload issues**: Ensure files are not too large and are valid image formats

## Testing Your Implementation

Use the provided `test-api.js` script to verify your API setup:

```bash
node test-api.js
```

This will test authentication, course creation, and lesson creation with proper error handling.

### Example: Uploading a Test Question Image

```bash
curl -X POST \
  'https://api.themobileprof.com/api/tests/1234/questions/5678/image/upload' \
  -H 'Authorization: Bearer <access_token>' \
  -F 'image=@/path/to/image.png'
```

**Response:**
```json
{
  "success": true,
  "imageUrl": "/uploads/question-images/5678-1623456789012.png",
  "message": "Image uploaded successfully"
}
```

## Test Management Examples

### Create Test for a Lesson (Admin)

```bash
curl -X POST \
  'https://api.themobileprof.com/api/admin/lessons/abcd-lesson-uuid/tests' \
  -H 'Authorization: Bearer <access_token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Linux Basics Quiz",
    "description": "Test your knowledge of Linux basics",
    "durationMinutes": 30,
    "passingScore": 70,
    "maxAttempts": 3,
    "questions": [
      {
        "question": "What is Linux?",
        "questionType": "multiple_choice",
        "options": ["OS", "Browser", "Editor"],
        "correctAnswer": 0,
        "points": 1,
        "orderIndex": 1
      }
    ]
  }'
```
**Response:**
```json
{
  "test": { "id": "test-uuid", ... },
  "questions": [ { "id": "question-uuid", ... } ]
}
```

### Get Tests for a Lesson (Admin)

```bash
curl -X GET \
  'https://api.themobileprof.com/api/admin/lessons/abcd-lesson-uuid/tests' \
  -H 'Authorization: Bearer <access_token>'
```

**Response:**
```json
{
  "tests": [
    {
      "id": "test-uuid",
      "title": "Linux Basics Quiz",
      ...
    }
  ]
}
```

### Get Test Details

```bash
curl -X GET \
  'https://api.themobileprof.com/api/tests/test-uuid' \
  -H 'Authorization: Bearer <access_token>'
```

**Response:**
```json
{
  "id": "test-uuid",
  "title": "Linux Basics Quiz",
  "description": "Test your knowledge of Linux basics",
  "durationMinutes": 30,
  ...
}
```

### Add Question to Test

```bash
curl -X POST \
  'https://api.themobileprof.com/api/tests/test-uuid/questions' \
  -H 'Authorization: Bearer <access_token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "question": "What is Bash?",
    "questionType": "multiple_choice",
    "options": ["Shell", "Kernel", "Editor"],
    "correctAnswer": 0,
    "points": 1,
    "orderIndex": 2
  }'
```

**Response:**
```json
{
  "id": "question-uuid",
  "question": "What is Bash?",
  ...
}
```

### Get Test Questions

```bash
curl -X GET \
  'https://api.themobileprof.com/api/tests/test-uuid/questions' \
  -H 'Authorization: Bearer <access_token>'
```

**Response:**
```json
{
  "questions": [
    {
      "id": "question-uuid",
      "question": "What is Bash?",
      ...
    }
  ]
}
``` 