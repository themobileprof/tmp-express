# Lesson Workshop Format Documentation

## Overview

The lesson workshop system provides an interactive, step-by-step learning experience where students execute commands in a simulated or real terminal environment. This document describes the workshop JSON format and its implementation.

## Workshop JSON Structure

### Complete Example

```json
{
  "exercise": {
    "id": "workshop-uuid-here",
    "lessonId": "lesson-uuid-here",
    "isEnabled": true,
    "title": "Navigating the Linux Filesystem",
    "introduction": "In this exercise, you'll learn how to navigate and inspect the Linux filesystem using basic commands like pwd, ls, cd, and cat.",
    "steps": [
      {
        "instructions": [
          "Print your current working directory."
        ],
        "expected_commands": ["pwd", "echo $PWD"],
        "success_response": "/home/student",
        "failure_response": "bash: command not found. Hint: Try using 'pwd' to show your current directory.",
        "success": false
      },
      {
        "instructions": [
          "List all files and folders in your current directory."
        ],
        "expected_commands": ["ls", "ls -l", "ls --color=auto"],
        "success_response": "Documents  Downloads  Pictures  Desktop",
        "failure_response": "bash: command not found. Hint: The command to list files starts with 'ls'.",
        "success": false
      },
      {
        "instructions": [
          "Change directory to the 'Documents' folder."
        ],
        "expected_commands": ["cd Documents", "cd ./Documents"],
        "success_response": "",
        "failure_response": "bash: cd: Documnts: No such file or directory. Hint: Check your spelling of 'Documents'.",
        "success": false
      }
    ],
    "end_message": "Fantastic! You've successfully learned how to navigate directories, view files, and create folders in Linux."
  }
}
```

## Field Definitions

### Root Level: `exercise`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID String | Yes | Unique identifier for the workshop exercise |
| `lessonId` | UUID String | Yes | ID of the lesson this workshop belongs to |
| `isEnabled` | Boolean | Yes | Whether the workshop is enabled and visible to students |
| `title` | String | Yes | Title of the workshop exercise |
| `introduction` | String | Yes | Introduction text shown before the workshop starts |
| `steps` | Array | Yes | Sequential steps for the workshop exercise |
| `end_message` | String | Yes | Completion message shown when all steps are finished |

### Step Object

Each step in the `steps` array contains:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `instructions` | String Array | Yes | List of instruction prompts for this step (supports multi-line guidance) |
| `expected_commands` | String Array | Yes | Array of acceptable command variations (e.g., `["pwd", "echo $PWD"]`) |
| `success_response` | String | Yes | Expected output when the command succeeds (can be empty string) |
| `failure_response` | String | Yes | Error message with hint when the command fails |
| `success` | Boolean | Yes | Whether this step has been completed successfully (tracks progress) |

## Design Principles

### 1. **Simplicity**
- Flat structure with minimal nesting
- Direct field names (no camelCase conversions needed)
- Single exercise per lesson workshop

### 2. **Flexibility**
- Multiple command variations per step (`expected_commands` array)
- Multi-line instructions support (`instructions` array)
- Optional output (empty `success_response` for commands like `cd`)

### 3. **Educational**
- Clear instructions with context
- Helpful hints in failure messages
- Success messages for positive reinforcement
- End message for completion celebration

### 4. **Progress Tracking**
- Built-in `success` flag per step
- Easy to calculate overall progress: `(completed_steps / total_steps) * 100`
- Can track partial completion

## API Endpoints

### Student Endpoints

#### Get Workshop for a Lesson
```http
GET /api/lessons/:lessonId/workshop
Authorization: Bearer {token}
```

**Response:**
```json
{
  "lesson": {
    "id": "lesson-uuid",
    "title": "Introduction to Linux"
  },
  "workshop": {
    "spec": {
      "exercise": { /* workshop exercise object */ }
    },
    "updatedAt": "2025-10-12T10:30:00Z"
  }
}
```

Returns `null` for `workshop` if:
- No workshop exists for the lesson
- Workshop is disabled (`isEnabled: false`)

### Admin Endpoints

#### Get Workshop (Admin)
```http
GET /api/admin/lessons/:lessonId/workshop
Authorization: Bearer {admin-token}
```

#### Create/Update Workshop (Admin)
```http
POST /api/admin/lessons/:lessonId/workshop
Authorization: Bearer {admin-token}
Content-Type: application/json

{
  "isEnabled": true,
  "spec": {
    "exercise": { /* workshop exercise object */ }
  }
}
```

#### Partial Update (Admin)
```http
PUT /api/admin/lessons/:lessonId/workshop
Authorization: Bearer {admin-token}
Content-Type: application/json

{
  "isEnabled": false
}
```

#### Delete Workshop (Admin)
```http
DELETE /api/admin/lessons/:lessonId/workshop
Authorization: Bearer {admin-token}
```

## Implementation Guide

### Creating a Workshop

1. **Design the learning flow**: Break down the topic into sequential steps
2. **Write clear instructions**: Each step should have specific, actionable instructions
3. **Define command variations**: Include common alternatives (e.g., `ls` and `ls -l`)
4. **Craft success responses**: Show expected output for validation
5. **Add helpful failure hints**: Guide students when they make mistakes
6. **Test the flow**: Verify all steps work in sequence

### Example: Creating a Git Basics Workshop

```json
{
  "exercise": {
    "id": "git-basics-workshop",
    "lessonId": "lesson-git-intro",
    "isEnabled": true,
    "title": "Git Basics: Your First Repository",
    "introduction": "Learn the fundamentals of Git version control by creating your first repository and making commits.",
    "steps": [
      {
        "instructions": [
          "Initialize a new Git repository in the current directory."
        ],
        "expected_commands": ["git init", "git init ."],
        "success_response": "Initialized empty Git repository in /home/student/project/.git/",
        "failure_response": "git: command not found. Hint: Use 'git init' to create a new repository.",
        "success": false
      },
      {
        "instructions": [
          "Check the status of your repository."
        ],
        "expected_commands": ["git status", "git status --short"],
        "success_response": "On branch main\nNo commits yet\nnothing to commit",
        "failure_response": "Hint: Use 'git status' to see the current state of your repository.",
        "success": false
      },
      {
        "instructions": [
          "Create a new file called 'README.md'.",
          "Then add it to the staging area."
        ],
        "expected_commands": ["touch README.md && git add README.md", "git add README.md"],
        "success_response": "",
        "failure_response": "Hint: Create the file first with 'touch README.md', then use 'git add README.md'.",
        "success": false
      },
      {
        "instructions": [
          "Commit your changes with a meaningful message."
        ],
        "expected_commands": ["git commit -m \"Initial commit\"", "git commit -m 'Add README'"],
        "success_response": "[main (root-commit) abc1234] Initial commit\n 1 file changed, 0 insertions(+), 0 deletions(-)",
        "failure_response": "Hint: Use 'git commit -m \"Your message\"' to commit staged changes.",
        "success": false
      }
    ],
    "end_message": "Excellent! You've created your first Git repository and made your first commit. You're on your way to mastering version control!"
  }
}
```

## Best Practices

### Instructions
- ✅ **Do**: Be specific and actionable ("Print your current directory")
- ❌ **Don't**: Be vague or open-ended ("Try some commands")

### Expected Commands
- ✅ **Do**: Include common variations and alternatives
- ✅ **Do**: Support both short and long flags (`ls` and `ls -l`)
- ❌ **Don't**: Be too strict (allow reasonable variations)

### Success Responses
- ✅ **Do**: Show realistic output that students will see
- ✅ **Do**: Use empty string for commands with no output (`cd`, `touch`)
- ❌ **Don't**: Include terminal prompts or timestamps

### Failure Responses
- ✅ **Do**: Include "Hint:" prefix for visibility
- ✅ **Do**: Provide the correct command or approach
- ✅ **Do**: Address common mistakes (typos, wrong directory)
- ❌ **Don't**: Just say "wrong command" without guidance

### End Messages
- ✅ **Do**: Celebrate completion and reinforce learning
- ✅ **Do**: Summarize what was learned
- ✅ **Do**: Encourage further practice
- ❌ **Don't**: Just say "Done" or "Complete"

## Progress Tracking

The `success` flag on each step enables progress tracking:

```javascript
function calculateProgress(exercise) {
  const completedSteps = exercise.steps.filter(step => step.success).length;
  const totalSteps = exercise.steps.length;
  const percentage = (completedSteps / totalSteps) * 100;
  
  return {
    completed: completedSteps,
    total: totalSteps,
    percentage: percentage.toFixed(0),
    isComplete: completedSteps === totalSteps
  };
}
```

## Validation

The backend stores workshop specs as JSONB in PostgreSQL with the following validation:

### Required Fields
- `exercise.id` (UUID)
- `exercise.lessonId` (UUID)
- `exercise.isEnabled` (boolean)
- `exercise.title` (string)
- `exercise.steps` (array with at least 1 item)

### Step Validation
Each step must have:
- `instructions` (non-empty array of strings)
- `expected_commands` (non-empty array of strings)
- `success_response` (string, can be empty)
- `failure_response` (non-empty string)
- `success` (boolean)

## Database Schema

```sql
CREATE TABLE lesson_workshops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT false,
  spec JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(lesson_id)
);

CREATE INDEX idx_lesson_workshops_lesson_id ON lesson_workshops(lesson_id);
CREATE INDEX idx_lesson_workshops_enabled ON lesson_workshops(is_enabled);
```

## CORS Configuration

The workshop endpoints support CORS for the frontend application:

```javascript
// Allowed origins
const allowedOrigins = [
  'https://lms.themobileprof.com',
  'https://api.themobileprof.com',
  'http://localhost:3000',  // Development
  'http://localhost:8080'   // Development
];

// Or use FRONTEND_URL environment variable
FRONTEND_URL=https://lms.themobileprof.com
```

## Security

- **Authentication**: All workshop endpoints require valid JWT tokens
- **Authorization**: Admin endpoints require `admin` role
- **Validation**: Input validation using express-validator
- **Rate Limiting**: Standard rate limits apply (100 requests per 15 minutes)
- **CORS**: Restricted to allowed origins only

## Performance

- **JSON Storage**: JSONB in PostgreSQL allows efficient storage and querying
- **Indexing**: Indexed on `lesson_id` and `is_enabled` for fast lookups
- **Size Limit**: Express JSON body limit is 10MB (sufficient for large workshops)
- **Caching**: Consider client-side caching for workshop specs

## Migration from Old Format

If you have workshops in the old format (with `exercises` array and nested `commands`), contact the development team for a migration script. The backend no longer performs automatic normalization.

## Examples

See `/test-new-workshop-format.js` for a complete working example with validation tests.

## Support

For questions or issues with the workshop format:
1. Check the OpenAPI documentation at `/api-docs`
2. Review the schema at `/docs/openapi/schemas/LessonWorkshopSpec.yaml`
3. Test with the sample exercise in this document
4. Contact the development team

## Changelog

### Version 2.0 (October 2025)
- Simplified to single exercise format
- Removed nested exercises/commands structure
- Added multiple command variations support
- Improved failure messages with hints
- Removed complex normalization logic
- Updated OpenAPI schema

### Version 1.0 (Initial)
- Complex nested structure with exercises and commands arrays
- Task-based format with validation objects
- Multiple normalization paths for legacy formats
