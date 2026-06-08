# Micro Courses API (Agent Reference)

Admin-authenticated endpoints for creating and managing **Micro Courses** (atomic `$10–$20` skill units).

Base path: `/api/admin/micro-courses`

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/admin/micro-courses` | List micro courses (`page`, `limit`, `search`, `topic`, `isPublished`) |
| `GET` | `/admin/micro-courses/by-title/:title` | Lookup by exact title (case-insensitive) |
| `GET` | `/admin/micro-courses/:id` | Get by UUID |
| `POST` | `/admin/micro-courses` | Create micro course (409 if title exists) |
| `POST` | `/admin/micro-courses/upsert` | **Idempotent** create/update by title |
| `PUT` | `/admin/micro-courses/:id` | Update micro course |
| `DELETE` | `/admin/micro-courses/:id` | Soft-delete micro course |

Lessons, tests, and workshops still use existing endpoints:

- `POST /admin/courses/:courseId/lessons`
- `POST /admin/lessons/:lessonId/tests`
- `POST /admin/lessons/:lessonId/workshop`

## Create / upsert body

```json
{
  "title": "Vim basics",
  "description": "Learn essential Vim commands for mobile terminal editing",
  "topic": "Linux",
  "duration": "45 min",
  "price": 15,
  "difficulty": "beginner",
  "isPublished": true,
  "objectives": "Navigate and edit files in Vim",
  "prerequisites": "Linux File basics recommended",
  "tags": ["vim", "linux", "terminal"]
}
```

### Rules

- `format` is always `micro` (forced server-side)
- `price` must be **≤ $20** (default **$15** on upsert if omitted)
- Max **10 lessons** per micro course
- Certificate of completion is awarded automatically when the learner finishes

## Recommended agent flow

```bash
# 1. Upsert micro course shell
POST /api/admin/micro-courses/upsert
{
  "title": "Vim basics",
  "description": "...",
  "topic": "Linux",
  "duration": "45 min",
  "price": 15,
  "isPublished": true
}

# 2. Add lessons (use returned id)
POST /api/admin/courses/{id}/lessons
{ "title": "...", "description": "...", "content": "...", "durationMinutes": 15 }

# 3. Compose into mini course by title
POST /api/admin/mini-courses/upsert
{
  "title": "Linux Beginner",
  "microCourseTitles": ["Linux File basics", "Vim basics", "Nano basics", "SSH basics"]
}
```

## Python agent helpers

```python
from tmp_agent.api.lms_api import authenticate
from tmp_agent.services.micro_courses import upsert_micro_course, build_micro_course_payload

lms = authenticate()
micro = upsert_micro_course(lms, build_micro_course_payload(
    title="Vim basics",
    description="Learn essential Vim commands",
    topic="Linux",
    duration="45 min",
    price=15,
    is_published=True,
))
```
