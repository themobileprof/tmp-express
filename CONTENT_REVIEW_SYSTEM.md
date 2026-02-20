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

### Get Review Statistics

```sql
-- Count of reviewed vs unreviewed
SELECT 
  is_reviewed,
  COUNT(*) as count
FROM lessons
WHERE deleted_at IS NULL
GROUP BY is_reviewed;
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
