# Authentication & Users

## Authentication Endpoints

### Register User
**POST** `/auth/register`

Register a new user with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "student"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "student",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "token": "jwt-token"
}
```

### Login User
**POST** `/auth/login`

Authenticate user with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "student"
  },
  "token": "jwt-token"
}
```

### Admin Login
**POST** `/auth/admin/login`

Authenticate admin user with email and password (admin only).

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "adminpassword"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "firstName": "Admin",
    "lastName": "User",
    "role": "admin"
  },
  "token": "jwt-token"
}
```

### Google OAuth Login/Signup
**POST** `/auth/google`

Authenticate or register user with Google OAuth.

**Request Body:**
```json
{
  "token": "google_id_token",
  "firstName": "John",  // Optional, will use Google data if not provided
  "lastName": "Doe",    // Optional, will use Google data if not provided
  "role": "student"     // Optional, defaults to "student"
}
```

**Response (200/201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@gmail.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "student",
    "createdAt": "2024-01-01T00:00:00.000Z"  // Only for new users
  },
  "token": "jwt-token"
}
```

**Notes:**
- If user exists with Google ID, logs them in
- If user exists with email but different auth provider, links Google account
- If user doesn't exist, creates new account
- Google profile picture is automatically set as avatar
- Email verification status is set based on Google's verification

### Get Current User
**GET** `/auth/me`

Get current user information.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "student",
    "avatarUrl": "https://example.com/avatar.jpg",
    "bio": "User bio",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "authProvider": "local",  // "local" or "google"
    "emailVerified": true,    // true for Google users, false for local users
    "settings": {
      "theme": "system",
      "language": "en",
      "timezone": "UTC"
    }
  }
}
```

### Refresh Token
**POST** `/auth/refresh`

Refresh JWT token.

**Request Body:**
```json
{
  "token": "jwt-token"
}
```

**Response (200):**
```json
{
  "token": "new-jwt-token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "student"
  }
}
```

### Change Password
**POST** `/auth/change-password`

Change user password (only for local authentication users).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

**Response (200):**
```json
{
  "message": "Password changed successfully"
}
```

**Error Response (400) - Google OAuth users:**
```json
{
  "error": "Password change not available for Google OAuth accounts",
  "message": "Invalid Operation"
}
```

---

## Users Endpoints

### Get User Profile
**GET** `/users/:id`

Get user profile by ID.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "student",
  "avatarUrl": "https://example.com/avatar.jpg",
  "bio": "User bio",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "settings": {
    "theme": "system",
    "language": "en",
    "timezone": "UTC"
  }
}
```

### Update User Profile
**PUT** `/users/:id`

Update user profile.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "bio": "Updated bio",
  "avatarUrl": "https://example.com/new-avatar.jpg"
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "firstName": "John",
  "lastName": "Smith",
  "bio": "Updated bio",
  "avatarUrl": "https://example.com/new-avatar.jpg",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Get User Enrollments
**GET** `/users/:id/enrollments`

Get user's course and class enrollments.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "enrollments": [
    {
      "id": "uuid",
      "enrollmentType": "course",
      "progress": 75,
      "status": "in_progress",
      "enrolledAt": "2024-01-01T00:00:00.000Z",
      "completedAt": null,
      "course": {
        "id": "uuid",
        "title": "JavaScript Fundamentals",
        "topic": "Programming",
        "imageUrl": "https://example.com/course.jpg"
      },
      "sponsorship": {
        "id": "uuid",
        "discountCode": "SPONSOR123",
        "discountType": "percentage",
        "discountValue": 20
      }
    }
  ]
}
```

### Get User Certifications
**GET** `/users/:id/certifications`

Get user's certifications.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "certifications": [
    {
      "id": "uuid",
      "certificationName": "JavaScript Developer",
      "issuer": "TheMobileProf",
      "issuedDate": "2024-01-01",
      "expiryDate": "2025-01-01",
      "certificateUrl": "https://example.com/certificate.pdf",
      "verificationCode": "CERT123456",
      "status": "issued",
      "course": {
        "id": "uuid",
        "title": "JavaScript Fundamentals",
        "topic": "Programming"
      }
    }
  ]
}
```

### Get User Test Attempts
**GET** `/users/:id/test-attempts`

Get user's test attempts.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "attempts": [
    {
      "id": "uuid",
      "testTitle": "JavaScript Quiz",
      "courseTitle": "JavaScript Fundamentals",
      "attemptNumber": 1,
      "score": 85,
      "totalQuestions": 20,
      "correctAnswers": 17,
      "status": "completed",
      "startedAt": "2024-01-01T00:00:00.000Z",
      "completedAt": "2024-01-01T01:00:00.000Z",
      "timeTakenMinutes": 60
    }
  ]
}
```

---

## Settings Endpoints

### Get User Settings
**GET** `/settings`

Get current user settings.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "emailNotifications": true,
  "pushNotifications": true,
  "marketingEmails": false,
  "theme": "system",
  "language": "en",
  "timezone": "UTC"
}
```

### Update User Settings
**PUT** `/settings`

Update user settings.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "emailNotifications": false,
  "theme": "dark",
  "language": "es",
  "timezone": "America/New_York"
}
```

**Response (200):**
```json
{
  "emailNotifications": false,
  "pushNotifications": true,
  "marketingEmails": false,
  "theme": "dark",
  "language": "es",
  "timezone": "America/New_York"
}
```

---

## Authentication Flow Examples

### Local Authentication Flow
1. User registers with email/password
2. User logs in with credentials
3. Server returns JWT token
4. Client includes token in subsequent requests
5. Token can be refreshed before expiration

### Google OAuth Flow
1. User authenticates with Google
2. Client sends Google ID token to `/auth/google`
3. Server verifies token and creates/updates user
4. Server returns JWT token for API access
5. User can link additional Google accounts

### Password Reset Flow
1. User requests password reset via email
2. Server sends reset link with temporary token
3. User clicks link and enters new password
4. Server validates token and updates password
5. User can log in with new password

---

## Security Considerations

### JWT Token Security
- Tokens expire after 24 hours (configurable)
- Refresh tokens have longer expiration
- Tokens are invalidated on password change
- Secure token storage recommended on client

### Password Security
- Passwords are hashed using bcrypt
- Minimum 8 characters required
- Password complexity validation
- Rate limiting on login attempts

### OAuth Security
- Google ID tokens are verified server-side
- OAuth state parameter validation
- Secure redirect URI validation
- Account linking with email verification

---

## Quick Navigation

- **[API Overview](api-overview.md)** - Back to overview
- **[Courses & Classes](courses-classes.md)** - Course management
- **[Admin Endpoints](admin-endpoints.md)** - User management (admin)
- **[Implementation Guide](implementation-guide.md)** - Setup instructions 