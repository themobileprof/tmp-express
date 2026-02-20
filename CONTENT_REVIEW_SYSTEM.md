# Content Review System

A simple review tracking system that allows admins to mark lessons, test questions, and workshops as reviewed, with notes about who reviewed them and when.

## Overview

This system adds a simple review flag to content items so admins can:
- **Mark content as reviewed** - Track which content has been proofread
- **Add review notes** - Leave feedback or notes about the content
- **Track reviewer** - See who reviewed each item and when
- **Filter by review status** - Easily find content that hasn't been reviewed yet

## Database Schema

### Fields Added

The following fields have been added to `lessons`, `test_questions`, and `lesson_workshops` tables:
- `is_reviewed` (BOOLEAN) - Whether content has been reviewed (default: false)
- `reviewed_by` (UUID) - ID of the admin who reviewed it
- `reviewed_at` (TIMESTAMP) - When the review happened
- `review_notes` (TEXT) - Optional notes or feedback from the reviewer

### Installation

Run the migration script:
```bash
node scripts/add-content-review-fields.js
```

This will add the review fields to all three tables and create indexes for efficient filtering. Existing published content will be automatically marked as reviewed.

## API Endpoints

All endpoints require admin authentication.

### Get Content with Review Status

```http
GET /api/admin/content/review-list
```

**Query Parameters:**
- `reviewed` - Filter by review status (true/false)
- `contentType` - Filter by type (lessons, test_questions, workshops)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50)

**Examples:**
```bash
# Get all unreviewed content
GET /api/admin/content/review-list?reviewed=false

# Get only unreviewed lessons
GET /api/admin/content/review-list?reviewed=false&contentType=lessons

# Get all reviewed questions
GET /api/admin/content/review-list?reviewed=true&contentType=test_questions
```

**Response:**
```json
{
  "lessons": [...],
  "testQuestions": [...],
  "workshops": [...],
  "pagination": { "page": 1, "limit": 50 }
}
```

### Mark Lesson as Reviewed

```http
PUT /api/admin/lessons/:id/mark-reviewed
Content-Type: application/json

{
  "isReviewed": true,
  "notes": "Reviewed content, looks good"
}
```

### Mark Workshop as Reviewed

```http
PUT /api/admin/lessons/:lessonId/workshop/mark-reviewed
Content-Type: application/json

{
  "isReviewed": true,
  "notes": "Workshop configuration validated"
}
```

### Mark Test Question as Reviewed

```http
PUT /api/admin/tests/:testId/questions/:questionId/mark-reviewed
Content-Type: application/json

{
  "isReviewed": true,
  "notes": "Question is clear and accurate"
}
```

### Bulk Mark Questions as Reviewed

```http
PUT /api/admin/tests/:testId/questions/bulk-mark-reviewed
Content-Type: application/json

{
  "questionIds": ["uuid1", "uuid2", "uuid3"],
  "isReviewed": true,
  "notes": "All questions validated"
}
```

## Usage Examples

### Check Review Status from Frontend

The review status is included in the regular GET endpoints, so you can check it when fetching content:

**Get Lesson (includes review status):**
```bash
GET /api/lessons/:id
```

**Response includes:**
```json
{
  "id": "...",
  "title": "...",
  "reviewStatus": {
    "isReviewed": false,
    "reviewedBy": null,
    "reviewedByName": null,
    "reviewedAt": null,
    "reviewNotes": null
  }
}
```

**Get Test Questions (includes review status on each question):**
```bash
GET /api/tests/:id/questions
```

**Response includes:**
```json
{
  "questions": [
    {
      "id": "...",
      "question": "...",
      "reviewStatus": {
        "isReviewed": true,
        "reviewedBy": "admin-uuid",
        "reviewedByName": "John Doe",
        "reviewedAt": "2026-02-20T10:30:00Z",
        "reviewNotes": "Reviewed and approved"
      }
    }
  ]
}
```

**Get Workshop (includes review status):**
```bash
GET /api/lessons/:id/workshop
```

**Response includes:**
```json
{
  "lesson": {...},
  "workshop": {
    "spec": {...},
    "reviewStatus": {
      "isReviewed": false,
      "reviewedBy": null,
      "reviewedByName": null,
      "reviewedAt": null,
      "reviewNotes": null
    }
  }
}
```

### Frontend Implementation Example

```javascript
// Fetch lesson and check if it needs review
const response = await fetch('/api/lessons/123');
const lesson = await response.json();

// Show review button if not reviewed (for admins)
if (!lesson.reviewStatus.isReviewed && userIsAdmin) {
  showReviewButton();
}

// Mark as reviewed when button is clicked
async function markAsReviewed() {
  await fetch('/api/admin/lessons/123/mark-reviewed', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      isReviewed: true,
      notes: 'Reviewed on ' + new Date().toISOString()
    })
  });
  // Refresh the lesson data
}
```

### Find All Unreviewed Content

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:5000/api/admin/content/review-list?reviewed=false"
```

### Mark a Lesson as Reviewed

```bash
curl -X PUT \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isReviewed":true,"notes":"Content reviewed and approved"}' \
  "http://localhost:5000/api/admin/lessons/{lesson-id}/mark-reviewed"
```

### Mark a Lesson as NOT Reviewed (unmark)

```bash
curl -X PUT \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isReviewed":false,"notes":"Needs revision"}' \
  "http://localhost:5000/api/admin/lessons/{lesson-id}/mark-reviewed"
```

### Bulk Review Test Questions

```bash
curl -X PUT \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"questionIds":["uuid1","uuid2"],"isReviewed":true}' \
  "http://localhost:5000/api/admin/tests/{test-id}/questions/bulk-mark-reviewed"
```

## Typical Workflow

### For Admins

1. **Check what needs review:**
   ```bash
   GET /api/admin/content/review-list?reviewed=false
   ```

2. **Review the content** (read through lessons, questions, workshops)

3. **Mark as reviewed:**
   ```bash
   PUT /api/admin/lessons/{id}/mark-reviewed
   Body: {"isReviewed": true, "notes": "Reviewed on [date]"}
   ```

4. **If content needs changes:**
   ```bash
   PUT /api/admin/lessons/{id}/mark-reviewed
   Body: {"isReviewed": false, "notes": "Needs more examples in section 3"}
   ```

### For Content Creators

Check your content's review status by looking at the `is_reviewed`, `reviewed_by`, `reviewed_at`, and `review_notes` fields when fetching lessons/questions/workshops.

## Student Flag System

Students can flag problematic content (lessons, workshops, or test questions) when they encounter issues. When content is flagged by a student:

1. **Review status is reset** - `is_reviewed` is set to `false` automatically
2. **Flag counter increments** - Track how many times content has been flagged
3. **Timestamp and reason recorded** - Know when it was flagged and why
4. **Admin notification via notes** - Flag details are added to `review_notes`

### Student Flag Endpoints

These endpoints are **authenticated but not admin-only** - any enrolled student can use them.

#### Flag a Lesson

```http
POST /api/lessons/:id/flag
Content-Type: application/json
Authorization: Bearer {student-token}

{
  "reason": "The video URL is broken and doesn't load"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Lesson flagged for review. An admin will investigate shortly."
}
```

#### Flag a Workshop

```http
POST /api/lessons/:id/workshop/flag
Content-Type: application/json
Authorization: Bearer {student-token}

{
  "reason": "The workshop instructions are unclear"
}
```

#### Flag a Test Question

```http
POST /api/tests/:id/questions/:questionId/flag
Content-Type: application/json
Authorization: Bearer {student-token}

{
  "reason": "Multiple answers seem correct"
}
```

### Flag Validation & Security

To prevent abuse, the system implements:

- **Character limit**: Reasons are limited to 500 characters
- **Sanitization**: Input is trimmed and length-validated
- **Authentication required**: Must be logged in to flag content
- **Default reason**: If no reason provided, uses "No reason provided"

### Flag Status in GET Responses

Flag information is included in regular GET endpoints so the frontend can display flag counts and reasons:

**Lesson endpoint response:**
```json
{
  "id": "...",
  "title": "...",
  "reviewStatus": { ... },
  "flagStatus": {
    "isFlagged": true,
    "flagCount": 3,
    "lastFlaggedAt": "2026-02-20T14:30:00Z",
    "lastFlagReason": "Video doesn't work"
  }
}
```

**Test questions response:**
```json
{
  "questions": [
    {
      "id": "...",
      "question": "...",
      "reviewStatus": { ... },
      "flagStatus": {
        "isFlagged": true,
        "flagCount": 2,
        "lastFlaggedAt": "2026-02-20T15:45:00Z",
        "lastFlagReason": "Answer key seems wrong"
      }
    }
  ]
}
```

**Workshop endpoint response:**
```json
{
  "lesson": { ... },
  "workshop": {
    "spec": { ... },
    "reviewStatus": { ... },
    "flagStatus": {
      "isFlagged": false,
      "flagCount": 0,
      "lastFlaggedAt": null,
      "lastFlagReason": null
    }
  }
}
```

### What Happens When Content is Flagged?

1. **Flag counter increments**: `flag_count` increases by 1
2. **Flagged status set**: `flagged` boolean set to `true`
3. **Timestamp recorded**: `last_flagged_at` updated to current time
4. **Reason stored**: `last_flag_reason` captures the student's comment
5. **Review reset**: `is_reviewed` set to `false` (needs admin re-review)
6. **Notes appended**: Review notes get updated with flag details:
   ```
   FLAGGED BY STUDENT at 2026-02-20 14:30:00
   Reason: The video URL is broken and doesn't load
   ```

### Admin Response to Flags

When an admin sees flagged content in the review list:

1. **Investigate the issue** - Check the flag reason in `review_notes`
2. **Fix the content** - Update the lesson/question/workshop
3. **Mark as reviewed** - Use the admin review endpoint:
   ```bash
   PUT /api/admin/lessons/{id}/mark-reviewed
   Body: {"isReviewed": true, "notes": "Fixed broken video URL"}
   ```

### Frontend Implementation for Students

```javascript
// Show flag button for enrolled students
async function flagLesson(lessonId, reason) {
  const response = await fetch(`/api/lessons/${lessonId}/flag`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify({ reason })
  });
  
  if (response.ok) {
    alert('Thank you for reporting this issue!');
  }
}

// Display flag count (for admins)
if (lesson.flagStatus.isFlagged && userIsAdmin) {
  showWarning(`This lesson has been flagged ${lesson.flagStatus.flagCount} times`);
  showLastFlagReason(lesson.flagStatus.lastFlagReason);
}
```

### Example Student Flag Workflow

1. **Student encounters issue**: Video doesn't play in lesson
2. **Student flags lesson**:
   ```javascript
   POST /api/lessons/abc-123/flag
   Body: {"reason": "Video link is broken"}
   ```
3. **System automatically**:
   - Sets `is_reviewed = false`
   - Increments `flag_count`
   - Records timestamp and reason
   - Appends to review notes
4. **Admin receives notification** (via review list)
5. **Admin investigates and fixes**
6. **Admin marks as reviewed** with fix notes

## Database Queries

### Find Unreviewed Content

```sql
-- Unreviewed lessons
SELECT id, title, created_at 
FROM lessons 
WHERE is_reviewed = false AND deleted_at IS NULL;

-- Unreviewed test questions
SELECT tq.id, tq.question, t.title as test_title
FROM test_questions tq
JOIN tests t ON tq.test_id = t.id
WHERE tq.is_reviewed = false;

-- Unreviewed workshops
SELECT lw.id, l.title as lesson_title
FROM lesson_workshops lw
JOIN lessons l ON lw.lesson_id = l.id
WHERE lw.is_reviewed = false;
```

### Find Flagged Content

```sql
-- Flagged lessons
SELECT id, title, flag_count, last_flagged_at, last_flag_reason
FROM lessons 
WHERE flagged = true AND deleted_at IS NULL
ORDER BY flag_count DESC, last_flagged_at DESC;

-- Flagged test questions
SELECT tq.id, tq.question, t.title as test_title, 
       tq.flag_count, tq.last_flagged_at, tq.last_flag_reason
FROM test_questions tq
JOIN tests t ON tq.test_id = t.id
WHERE tq.flagged = true
ORDER BY tq.flag_count DESC, tq.last_flagged_at DESC;

-- Flagged workshops
SELECT lw.id, l.title as lesson_title, 
       lw.flag_count, lw.last_flagged_at, lw.last_flag_reason
FROM lesson_workshops lw
JOIN lessons l ON lw.lesson_id = l.id
WHERE lw.flagged = true
ORDER BY lw.flag_count DESC, lw.last_flagged_at DESC;

-- Priority flags (multiple flags)
SELECT 'lesson' as type, id, title as name, flag_count, last_flag_reason
FROM lessons 
WHERE flag_count > 2 AND deleted_at IS NULL
UNION ALL
SELECT 'question' as type, tq.id, tq.question as name, tq.flag_count, tq.last_flag_reason
FROM test_questions tq
WHERE tq.flag_count > 2
UNION ALL
SELECT 'workshop' as type, lw.id, l.title as name, lw.flag_count, lw.last_flag_reason
FROM lesson_workshops lw
JOIN lessons l ON lw.lesson_id = l.id
WHERE lw.flag_count > 2
ORDER BY flag_count DESC;
```

### Get Review Statistics

```sql
-- Count of reviewed vs unreviewed
SELECT 
  is_reviewed,
  COUNT(*) as count
FROM lessons
WHERE deleted_at IS NULL
GROUP BY is_reviewed;

-- Flag statistics
SELECT 
  'lessons' as content_type,
  COUNT(*) FILTER (WHERE flagged = true) as flagged_count,
  SUM(flag_count) as total_flags,
  AVG(flag_count) FILTER (WHERE flagged = true) as avg_flags_per_item
FROM lessons WHERE deleted_at IS NULL
UNION ALL
SELECT 
  'questions' as content_type,
  COUNT(*) FILTER (WHERE flagged = true) as flagged_count,
  SUM(flag_count) as total_flags,
  AVG(flag_count) FILTER (WHERE flagged = true) as avg_flags_per_item
FROM test_questions
UNION ALL
SELECT 
  'workshops' as content_type,
  COUNT(*) FILTER (WHERE flagged = true) as flagged_count,
  SUM(flag_count) as total_flags,
  AVG(flag_count) FILTER (WHERE flagged = true) as avg_flags_per_item
FROM lesson_workshops;
```

## Integration Tips

### Notifications (Optional)

Consider adding notifications when:
- Content is marked as reviewed (notify creator)
- Content is marked as needing changes (notify creator with notes)

### Frontend Display

Show review status in your admin dashboard:
- ⭕ Unreviewed - Gray or faded
- ✅ Reviewed - Green checkmark

### Workflow Suggestions

- **Daily Review**: Check unreviewed content daily
- **Batch Processing**: Use bulk operations for similar questions
- **Clear Notes**: Always add notes when marking as not reviewed
- **Regular Audits**: Periodically re-review old content

## Testing

### Run the Test Script

```bash
node test-content-review.js
```

This will test all endpoints and verify the system is working correctly.

### Manual Testing

1. Create a new lesson/question/workshop (should be `is_reviewed = false`)
2. List unreviewed content
3. Mark it as reviewed
4. Verify it no longer appears in unreviewed list
5. Check that reviewer info is recorded

## Troubleshooting

### Migration Already Run?

The migration is idempotent - you can run it multiple times safely. It will skip columns that already exist.

### Can't Access Endpoints?

1. Verify you're authenticated as an admin
2. Check your JWT token is valid
3. Ensure the server was restarted after migration

### Review Status Not Updating?

1. Check the request body has `isReviewed` as a boolean
2. Verify the content ID exists
3. Check server logs for error messages

## API Documentation

For detailed API documentation including request/response schemas, visit `/api-docs` after starting the server.

## Summary

- ✅ Simple boolean flag for review status
- ✅ Track who reviewed and when
- ✅ Optional notes for feedback
- ✅ Filter content by review status
- ✅ Bulk operations for efficiency
- ✅ Works for lessons, test questions, and workshops

---

**Version:** 1.0  
**Last Updated:** 2026-02-20
