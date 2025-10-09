# Admin: Change User Password

Endpoint: PUT /api/admin/users/:id/password

Purpose
- Allows an administrator to set a new password for a user.

Permissions
- Requires a valid JWT belonging to a user with role `admin`.
- This route is mounted under `/api/admin` so the full path is `/api/admin/users/:id/password`.

Validation
- Request body must include a `password` string with at least 6 characters.
- The route only allows changing passwords for accounts that use local authentication (`auth_provider = 'local'`) by default. It will reject accounts managed by external providers (e.g., Google OAuth) unless you explicitly use the `force` flag.

Request
- Headers:
  - Authorization: Bearer <admin-jwt>
  - Content-Type: application/json

- Example payload:

```json
{
  "password": "s3cureP@ssw0rd"
}
```

- To override a non-local (OAuth) account and convert it to local auth so you can set a password, include the `force` flag. This will remove the OAuth linkage (e.g., `google_id`) and set `auth_provider` to `local`.

```json
{
  "password": "n3wStrongPass",
  "force": true
}
```

Examples

- curl example (replace <ADMIN_TOKEN> and <USER_ID>):

```bash
curl -X PUT "http://localhost:3000/api/admin/users/<USER_ID>/password" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"password":"n3wStrongPass"}'
```

Responses
- 200 OK
  - Body: { "message": "Password updated successfully" }

- 400 Bad Request
  - Validation errors (e.g. password too short) or attempting to change password for non-local auth users without `force`.

- 401 Unauthorized / 403 Forbidden
  - Missing or non-admin token.

- 404 Not Found
  - User not found.

Notes & Safety
- The endpoint hashes the password using bcrypt (respecting `BCRYPT_ROUNDS` from environment if set) and clears any existing password reset tokens for the user.
- Converting an OAuth account to `local` (via `force`) removes the OAuth linkage — only use when you understand the implications.
- Use this endpoint sparingly and consider auditing or notifying users when their password is changed by an admin.

Suggested follow-ups
- Add an audit log entry when admins change passwords (store admin_id, user_id, timestamp) so you can track these actions.
- Optionally send the user an email notifying them their password was changed by an administrator.
