# Lesson Workshop API — Usage Guide

This document shows how to use the Lesson Workshop APIs in the backend. It includes the admin CRUD endpoints and the student read-only endpoint, example workshop `spec` JSON, sample curl requests, and Node/axios examples.

## Contract
- Inputs: `lessonId` path parameter. Admin endpoints require a Bearer JWT with admin privileges. Student endpoint requires a Bearer JWT.
- Body (admin POST/PUT): JSON with optional `isEnabled` (boolean) and `spec` (object). On POST `spec` is required and must be a JSON object.
- Outputs: JSON wrapper containing `lesson` and `workshop` objects, or `workshop: null` for absent/disabled workshops.
- Error modes: 400 validation error, 401/403 auth errors, 404 lesson or workshop not found.

## Endpoints
- Admin (prefix: `/api/admin`)
  - GET    `/api/admin/lessons/:lessonId/workshop` — fetch workshop (admin view)
  - POST   `/api/admin/lessons/:lessonId/workshop` — create or replace workshop spec (body: `{ isEnabled?, spec }`)
  - PUT    `/api/admin/lessons/:lessonId/workshop` — partial update (body: `{ isEnabled?, spec? }`)
  - DELETE `/api/admin/lessons/:lessonId/workshop` — remove workshop spec

- Student (prefix: `/api/lessons`)
  - GET    `/api/lessons/:id/workshop` — read-only; returns the workshop only if `is_enabled` is true

Notes:
- `spec` must be a JSON object. POST enforces this via validation.
- Admin routes require `authenticateToken` + admin check.
- Student route returns `workshop: null` when no enabled workshop exists.

---

## Terminal-driven example (copy-paste)
The following block is a single, copy-pasteable terminal script. It:

- sets environment variables (provide real tokens/ids)
- writes a workshop payload JSON file
- POSTs the workshop as admin
- GETs the admin view
- toggles `isEnabled` via PUT
- shows the student read
- deletes the workshop

Paste the whole block into a bash shell (adjust `ADMIN_TOKEN`, `USER_TOKEN`, `LESSON_ID` before running):

```bash
# --- configure these first ---
export BASE_URL="http://localhost:3000"
export ADMIN_TOKEN="REPLACE_WITH_ADMIN_JWT"
export USER_TOKEN="REPLACE_WITH_USER_JWT"
export LESSON_ID="11111111-2222-3333-4444-555555555555"

# create a payload file with the workshop spec
cat > workshop-payload.json <<'JSON'
{
  "isEnabled": true,
  "spec": {
    "title": "Hands-on: Build a REST API",
    "description": "Guided lab for building a Node/Express REST API.",
    "durationMinutes": 90,
    "steps": [
      { "id": "init", "title": "Project init", "instructions": "Run npm init and install express" },
      { "id": "server", "title": "Create server", "instructions": "Create src/server.js and start express app" }
    ],
    "resources": {
      "starterRepo": "https://github.com/example/starter-api",
      "expectedOutputs": ["Server starts on :3000", "GET /health returns 200"]
    }
  }
}
JSON

# POST the workshop (create or replace)
curl -s -X POST "$BASE_URL/api/admin/lessons/$LESSON_ID/workshop" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  --data @workshop-payload.json | jq '.'

# GET admin view
curl -s -X GET "$BASE_URL/api/admin/lessons/$LESSON_ID/workshop" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'

# Partial update: disable the workshop
cat > workshop-update.json <<'JSON'
{ "isEnabled": false }
JSON

curl -s -X PUT "$BASE_URL/api/admin/lessons/$LESSON_ID/workshop" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  --data @workshop-update.json | jq '.'

# Student read (should return null when disabled)
curl -s -X GET "$BASE_URL/api/lessons/$LESSON_ID/workshop" \
  -H "Authorization: Bearer $USER_TOKEN" | jq '.'

# Re-enable by PATCH/PUT with spec or isEnabled true
cat > workshop-enable.json <<'JSON'
{ "isEnabled": true }
JSON
curl -s -X PUT "$BASE_URL/api/admin/lessons/$LESSON_ID/workshop" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  --data @workshop-enable.json | jq '.'

# Student read (should now show the spec)
curl -s -X GET "$BASE_URL/api/lessons/$LESSON_ID/workshop" \
  -H "Authorization: Bearer $USER_TOKEN" | jq '.'

# Delete the workshop
curl -s -X DELETE "$BASE_URL/api/admin/lessons/$LESSON_ID/workshop" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'

# cleanup local JSON files created during demo
rm -f workshop-payload.json workshop-update.json workshop-enable.json

```

---

## Compact spec example
If you prefer a less-expository, compact JSON form for the frontend to consume, here is a short example. Keys are intentionally short to keep payloads small: `i` = instruction, `c` = expected command, `m` = matchType, `r` = result, `a` = accepted alternatives, `re` = regex for `m: "regex"`.

```json
{
  "title": "REST API lab",
  "steps": [
    { "id": "init", "i": "Init npm", "c": "npm init -y", "m": "exact", "r": "package.json created" },
    { "id": "install", "i": "Install express", "c": "npm i express", "m": "normalizeWhitespace", "r": "express added", "a": ["npm install express"] },
    { "id": "server", "i": "Start server", "c": "node src/server.js", "m": "regex", "re": "node\\s+src/server\\.js|nodemon\\s+src/server\\.js", "r": "GET /health => 200" }
  ]
}
```

## Schema & consolidated example (canonical)
The OpenAPI schema for a workshop spec is defined in `docs/openapi/schemas/LessonWorkshopSpec.yaml`. Below is a concise mapping and a canonical JSON example that follows that schema. Use this shape when POSTing/PUTing the workshop spec via the admin endpoints.

Key mappings (schema -> meaning):
- `title` — workshop title shown to learners
- `intro` — optional intro text displayed before the terminal
- `environment` — optional hints (os, shell, workingDir) for a terminal emulator
- `steps[]` — ordered list of step objects (required fields: `step`, `instruction`, `prompt`, `expect` where applicable)
  - `step` (integer) — sequential step number
  - `title` (string) — short title for the step
  - `instruction` (string) — text shown to the student
  - `prompt` (string) — terminal prompt to show (e.g., `student@vm:~$ `)
  - `expect` (object) — how the frontend should validate the student's input/output
    - `inputPattern` (string) — regex to validate the exact typed command
    - `outputIncludes` (string[]) — substrings expected in simulated nted stdout
    - `outputExcludes` (string[]) — substrings that must not appear
    - `exitCode` (integer) — expected exit code (default 0)
  - `simulate` (object) — frontend hints for showing simulated stdout/stderr and changed files
    - `stdout` / `stderr` (strings)
    - `filesChanged` — list of { path, diff } objects to show file changes
  - `comments` — admin-only notes about the step

Canonical (full) example following the schema:

```json
{
  "title": "Hands-on: Build a REST API",
  "intro": "Follow the steps below in the terminal emulator.",
  "environment": {
    "os": "ubuntu-22.04",
    "shell": "bash",
    "workingDir": "/home/student/rest-api"
  },
  "steps": [
    {
      "step": 1,
      "title": "Initialize project",
      "instruction": "Initialize npm and create package.json",
      "prompt": "student@vm:~$ ",
      "expect": {
        "inputPattern": "^npm\\s+init\\s+-y$",
        "exitCode": 0
      },
      "simulate": {
        "stdout": "Wrote package.json\n"
      },
      "comments": "Creates package.json with default values"
    },
    {
      "step": 2,
      "title": "Install express",
      "instruction": "Install express into the project",
      "prompt": "student@vm:~$ ",
      "expect": {
        "inputPattern": "^npm\\s+(install|i)\\s+express(\\s+--save)?$",
        "exitCode": 0,
        "outputIncludes": ["added 1 package"]
      },
      "simulate": {
        "stdout": "+ express@4.18.2\nadded 1 package in 1s\n"
      }
    },
    {
      "step": 3,
      "title": "Create server",
      "instruction": "Create src/server.js with a GET /health route and start it",
      "prompt": "student@vm:~$ ",
      "expect": {
        "inputPattern": "^(node|nodemon)\\s+src/server\\.js$",
        "exitCode": 0,
        "outputIncludes": ["Server listening"]
      },
      "simulate": {
        "stdout": "Server listening on http://localhost:3000\n",
        "filesChanged": [
          { "path": "src/server.js", "diff": "+ const express = require('express')\n+ app.get('/health', (req,res)=>res.send('OK'))\n" }
        ]
      }
    }
  ]
}
```

How the endpoints use this spec:
- Admin create/replace: POST /api/admin/lessons/:lessonId/workshop
  - Body: { isEnabled: boolean, spec: <LessonWorkshopSpec> }
  - Response: 201 with the saved workshop object
- Admin update: PUT /api/admin/lessons/:lessonId/workshop
  - Body can contain partial `isEnabled` and/or `spec`
- Student read: GET /api/lessons/:id/workshop
  - Response: { lesson: { id, title }, workshop: null | { isEnabled, spec, updatedAt } }

Frontend quick notes
- The frontend should: fetch the spec, render `intro`, show steps in order, display the configured `prompt`, accept user input, validate input against `expect.inputPattern` (or other `expect` rules), and display `simulate.stdout` when validation passes. Do NOT execute user commands on the server.
- For friendly UX accept equivalent commands by using flexible regexes in `inputPattern` or expand `expect` with alternatives.



## Edge cases & tips
- POST requires `spec` to be an object — sending a string will trigger validation error.
- PUT allows partial updates: you can toggle `isEnabled` without providing a full `spec`.
- The student endpoint enforces `is_enabled === true` before returning the `spec`.
- For development convenience, use the dev helper token endpoint (if enabled): `GET /dev/token/:email` to generate tokens when `NODE_ENV === 'development'`.
- If `spec` can be large, make sure `express.json` limits allow it (project default is 10MB per repository notes).

---

## Quick test scenario
1. Generate an admin JWT (dev helper or real admin account).
2. POST a workshop with `isEnabled: true` and a small `spec`.
3. As a student, GET the student endpoint and verify `workshop` is present.
4. As admin, PUT with `isEnabled: false` and verify student sees `workshop: null`.
5. As admin, DELETE and confirm admin GET returns `workshop: null`.

---

## Next steps (optional)
- Provide a small Postman collection or OpenAPI snippet for these endpoints.
- Add a Jest integration test that seeds a lesson and verifies the workshop flow end-to-end.

---

If you'd like this placed somewhere else (a different file path or added to the docs index), tell me where and I will move/update it.

---

## Quick local shell example
The commands below are a copy-pasteable sequence you can run locally to create a small demo directory, write the `workshop-demo.js` file (the admin flow script from above), list the directory contents, install dependencies, and run the script.

Replace `ADMIN_TOKEN` and `LESSON_ID` with real values or set them as environment variables.

```bash
# create a demo directory and switch into it
mkdir -p workshop-demo && cd workshop-demo

# create the demo file (workshop-demo.js) with the Node/axios example
cat > workshop-demo.js <<'JS'
const axios = require('axios');
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'ADMIN_TOKEN_PLACEHOLDER';
const LESSON_ID = process.env.LESSON_ID || '11111111-2222-3333-4444-555555555555';

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Bearer ${ADMIN_TOKEN}`,
    'Content-Type': 'application/json'
  },
  timeout: 5000
});

async function run() {
  // 1. Create/replace workshop
  const createPayload = {
    isEnabled: true,
    spec: {
      title: 'Hands-on API lab',
      description: 'Build a REST API',
      durationMinutes: 90,
      steps: [{ id: 's1', title: 'Init', instructions: 'npm init -y' }]
    }
  };
  const createRes = await client.post(`/api/admin/lessons/${LESSON_ID}/workshop`, createPayload);
  console.log('Created workshop:', createRes.data.workshop);

  // 2. Get admin view
  const getAdmin = await client.get(`/api/admin/lessons/${LESSON_ID}/workshop`);
  console.log('Admin GET:', getAdmin.data);

  // 3. Partial update
  const updateRes = await client.put(`/api/admin/lessons/${LESSON_ID}/workshop`, { isEnabled: false });
  console.log('Updated workshop:', updateRes.data.workshop);

  // 4. Delete
  const delRes = await client.delete(`/api/admin/lessons/${LESSON_ID}/workshop`);
  console.log('Deleted:', delRes.data);
}

run().catch(err => {
  if (err.response) {
    console.error('API error:', err.response.status, err.response.data);
  } else {
    console.error(err.message);
  }
  process.exit(1);
});
JS

# show the created files
ls -la

# install axios locally (creates node_modules)
npm init -y > /dev/null 2>&1
npm install axios --no-audit --no-fund

# run the demo (export ADMIN_TOKEN and LESSON_ID first or edit the file)
# Example: export ADMIN_TOKEN="your_admin_jwt" LESSON_ID="<uuid>"
node workshop-demo.js
```