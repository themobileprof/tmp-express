# Mini Courses API (Agent Reference)

Admin-authenticated endpoints for creating and composing **Mini Courses** from **Micro Courses**.

Base path: `/api/admin/mini-courses`

## Prerequisites

Create micro courses first — see [MICRO_COURSES_API.md](./MICRO_COURSES_API.md):

- `POST /api/admin/micro-courses/upsert` (recommended)
- `GET /api/admin/micro-courses?search=Vim`

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/admin/mini-courses` | List mini courses (`page`, `limit`, `search`, `topic`, `isPublished`) |
| `GET` | `/admin/mini-courses/by-slug/:slug` | Lookup by slug |
| `GET` | `/admin/mini-courses/:id` | Get by UUID or slug |
| `POST` | `/admin/mini-courses` | Create mini course |
| `POST` | `/admin/mini-courses/upsert` | **Idempotent** create/update by slug or title |
| `PUT` | `/admin/mini-courses/:id` | Update fields and/or micro membership |
| `POST` | `/admin/mini-courses/:id/micros` | Append micro courses |
| `PUT` | `/admin/mini-courses/:id/micros` | Replace micro course list |
| `DELETE` | `/admin/mini-courses/:id/micros/:courseId` | Remove one micro from mini |
| `DELETE` | `/admin/mini-courses/:id` | Soft-delete mini course |

## Create / upsert body

```json
{
  "title": "Linux Beginner",
  "slug": "linux-beginner",
  "description": "Terminal foundations for mobile learners",
  "topic": "Linux",
  "bundlePrice": 48,
  "issuesCertificate": true,
  "isPublished": true,
  "microCourseIds": ["uuid-1", "uuid-2"],
  "microCourseTitles": ["Linux File basics", "Vim basics"],
  "microCourseMode": "replace"
}
```

- `microCourseTitles` resolves published micro courses by exact title (case-insensitive).
- `microCourseMode`: `replace` (default) or `append` (upsert/put only).

## Recommended agent flow

```bash
# 1. Upsert mini course with micro titles
POST /api/admin/mini-courses/upsert
{
  "title": "Linux Beginner",
  "slug": "linux-beginner",
  "topic": "Linux",
  "bundlePrice": 48,
  "isPublished": true,
  "microCourseTitles": [
    "Linux File basics",
    "Vim basics",
    "Nano basics",
    "SSH basics"
  ]
}

# 2. Append another micro later
POST /api/admin/mini-courses/linux-beginner/micros
{
  "microCourseTitles": ["Git basics"]
}
```

## Python agent helpers

```python
from tmp_agent.api.lms_api import authenticate
from tmp_agent.services.mini_courses import upsert_mini_course, build_mini_course_payload

lms = authenticate()
mini = upsert_mini_course(lms, build_mini_course_payload(
    title="Linux Beginner",
    slug="linux-beginner",
    topic="Linux",
    bundle_price=48,
    is_published=True,
    micro_course_titles=[
        "Linux File basics",
        "Vim basics",
        "Nano basics",
        "SSH basics",
    ],
))
```
