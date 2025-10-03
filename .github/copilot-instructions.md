## TheMobileProf backend — Copilot instructions

Short, actionable notes to help an AI coding agent be productive in this repository.

- Project entrypoints & how to run
  - Primary server: `src/server.js`. Start locally with `npm run dev` (nodemon) or `npm start` for production.
  - Docker dev: `docker-compose up --build` (recommended). The compose file wires Postgres and named volumes for `./uploads`.
  - API docs (Swagger): served at `/api-docs` and the OpenAPI source is `docs/openapi/openapi.yaml` (the server serves the YAML from `/docs/openapi`).

- Authentication & dev helpers
  - JWT-based auth. Token verification and role checks live in `src/middleware/auth.js`. Use `authenticateToken`, `authorizeInstructor`, `authorizeOwnerOrAdmin(...)` when protecting routes.
  - Development helper endpoints (only enabled when `NODE_ENV === 'development'`):
    - List dev users: `GET /dev/users`
    - Generate tokens: `GET /dev/token/:email` — useful for testing without UI.

- Database access patterns
  - DB helpers are in `src/database/config.js`: use `query(text, params)`, `getRow(text, params)`, `getRows(text, params)`.
  - SQL uses parameterized queries with `$1, $2, ...`. Many route files build queries dynamically — preserve param ordering when refactoring.
  - Connection pool settings and SSL behavior are in the same file; production sets `ssl: { rejectUnauthorized: false }`.

- Error handling & async patterns
  - Use the `asyncHandler(fn)` wrapper from `src/middleware/errorHandler.js` for async route handlers so thrown errors flow into the centralized `errorHandler`.
  - Throw `new AppError(message, statusCode, errorCode, details)` for controlled errors. The error handler maps common Postgres codes (e.g. `23505`) to HTTP statuses.
  - API responses follow the pattern: success boolean and `error` object (see `errorHandler.js`).

- Routes & conventions
  - Route files live under `src/routes/`. Most routes export an Express router and use middleware from `src/middleware/`.
  - Public endpoints (e.g., `/api/courses/browse`) may live alongside authenticated ones in the same file; pay attention to route order (e.g., `browse` before `/:id`).
  - Validation uses `express-validator` inside route files (see `src/routes/courses.js` for examples). Prefer existing validators when adding fields.

- File uploads & static assets
  - Uploads directory: configured via `UPLOAD_PATH` or defaults to `./uploads`. In development the server serves `/uploads`; in production static serving is disabled (Nginx expected).
  - Multer-based upload route is `src/routes/uploads.js` (mounted at `/api/uploads`). Keep upload size limits in mind (`express.json` limit is 10mb here).

- Tests, migrations & admin
  - Run tests: `npm test` (Jest + supertest). In Docker: `docker-compose exec backend npm test`.
  - DB migrations: `npm run migrate`. Seeds: `npm run seed`.
  - Create admin helper script: `node scripts/create-admin.js` (interactive or args mode).

- OpenAPI & docs
  - The OpenAPI YAML contains many $refs; the server serves the whole `docs/openapi` directory so relative $ref resolution works. Update YAML and supporting `docs/openapi/paths` when adding endpoints.

- Safety and small rules for edits
  - Preserve prepared-statement param ordering when changing SQL. Avoid string interpolation of untrusted data.
  - Use `asyncHandler` for async routes; otherwise unhandled promise rejections may bypass `errorHandler`.
  - For auth-protected routes, prefer middleware (`authenticateToken`, `authorizeOwnerOrAdmin`) over manual token parsing.
  - When adding logs, follow existing structure (use console.log/morgan) and avoid leaking secrets (do not print full tokens or private keys).

If any section is unclear or you want examples for a specific change (new route, DB migration, or test), tell me which area and I'll extend these instructions with concrete snippets from the repository.
