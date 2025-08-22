# Admin Setup & Management Guide

This guide covers setting up and managing admin users for TheMobileProf LMS.

## 🔧 Admin Authentication

### Separate Admin Login
The admin system uses **separate authentication** from regular users:
- **Regular users**: `POST /api/auth/login` (students, instructors, sponsors)
- **Admin users**: `POST /api/auth/admin/login` (admin only)

### No Admin Registration
Admin users **cannot register** through the regular registration endpoint. They must be created manually using the admin creation script.

## 🚀 Creating Admin Users

### Method 1: Interactive Mode (Recommended)
```bash
npm run create-admin
```

This will prompt you for:
- Email address
- Password (minimum 8 characters)
- First name
- Last name

### Method 2: Command Line Arguments
```bash
npm run create-admin admin@themobileprof.com securepassword123 "Admin" "User"
```

### Method 3: Direct Script Execution
```bash
node scripts/create-admin.js admin@themobileprof.com securepassword123 "Admin" "User"
```

## 🔐 Admin Login

### Local Authentication
```bash
curl -X POST https://api.themobileprof.com/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@themobileprof.com",
    "password": "securepassword123"
  }'
```

### Google OAuth (if configured)
```bash
curl -X POST https://api.themobileprof.com/api/auth/admin/google \
  -H "Content-Type: application/json" \
  -d '{
    "token": "google_oauth_token"
  }'
```

## 📊 Admin Dashboard Endpoints

### User Management
```bash
# List all users with pagination and filtering
GET /api/admin/users?page=1&limit=20&role=student&search=john&status=active

# Create new user
POST /api/admin/users
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "student"
}

# Update user
PUT /api/admin/users/:id
{
  "firstName": "John",
  "lastName": "Smith",
  "role": "instructor",
  "isActive": true
}

# Delete user
DELETE /api/admin/users/:id
```

### Course Management
```bash
# List all courses with admin details
GET /api/admin/courses?page=1&limit=20&status=published&instructor=john&search=linux

# Create course
POST /api/admin/courses
{
  "title": "Linux Fundamentals",
  "description": "Master Linux basics",
  "topic": "Linux",
  "type": "online",
  "certification": "Linux Professional Institute",
  "price": 299.00,
  "duration": "6 weeks",
  "instructorId": "uuid-of-instructor"
}

# Update course
PUT /api/admin/courses/:id
{
  "title": "Advanced Linux",
  "price": 399.00,
  "isPublished": true
}

# Delete course
DELETE /api/admin/courses/:id
```

### Lesson Management
```bash
# Get lessons for a course
GET /api/admin/courses/:courseId/lessons?page=1&limit=20&status=published

# Create lesson
POST /api/admin/courses/:courseId/lessons
{
  "title": "Introduction to Linux",
  "description": "Basic Linux concepts",
  "content": "Linux is an open-source operating system...",
  "durationMinutes": 45,
  "status": "published"
}

# Update lesson
PUT /api/admin/lessons/:id
{
  "title": "Advanced Linux Concepts",
  "status": "published"
}

# Delete lesson
DELETE /api/admin/lessons/:id
```

### Test Management
```bash
# Get test details with questions
GET /api/admin/tests/:id

# Update test
PUT /api/admin/tests/:id
{
  "title": "Linux Fundamentals Test",
  "durationMinutes": 60,
  "passingScore": 70,
  "status": "active"
}

# Delete test
DELETE /api/admin/tests/:id

# Get test questions
GET /api/admin/tests/:id/questions

# Add question to test
POST /api/admin/tests/:id/questions
{
  "question": "What is Linux?",
  "questionType": "multiple_choice",
  "options": ["Operating System", "Programming Language", "Database", "Web Browser"],
  "correctAnswer": 0,
  "points": 5
}

# Update question
PUT /api/admin/tests/:id/questions/:questionId
{
  "question": "What is the Linux kernel?",
  "correctAnswer": 1
}

# Delete question
DELETE /api/admin/tests/:id/questions/:questionId

# Get test results and analytics
GET /api/admin/tests/:id/results
```

### Class Management
```bash
# List all classes with admin details
GET /api/admin/classes?page=1&limit=20&status=scheduled&instructor=john&search=linux

# Create class
POST /api/admin/classes
{
  "title": "Linux Workshop",
  "description": "Hands-on Linux training",
  "topic": "Linux",
  "type": "offline",
  "price": 150.00,
  "duration": "4 hours",
  "instructorId": "uuid-of-instructor",
  "startDate": "2024-01-15",
  "endDate": "2024-01-15",
  "maxStudents": 20,
  "location": "Training Center"
}

# Update class
PUT /api/admin/classes/:id
{
  "title": "Advanced Linux Workshop",
  "price": 200.00,
  "status": "scheduled"
}

# Delete class
DELETE /api/admin/classes/:id

# Get class enrollments
GET /api/admin/classes/:id/enrollments
```

### Sponsorship Management
```bash
# List all sponsorships with admin details
GET /api/admin/sponsorships?page=1&limit=20&status=active&sponsor=company&search=linux

# Create sponsorship
POST /api/admin/sponsorships
{
  "sponsorId": "uuid-of-sponsor",
  "courseId": "uuid-of-course",
  "discountType": "percentage",
  "discountValue": 50,
  "maxStudents": 100,
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "notes": "Sponsored by TechCorp"
}

# Update sponsorship
PUT /api/admin/sponsorships/:id
{
  "discountValue": 60,
  "status": "active"
}

# Delete sponsorship
DELETE /api/admin/sponsorships/:id

# Get sponsorship usage
GET /api/admin/sponsorships/:id/usage
```

### Discussion Management
```bash
# List all discussions with admin details
GET /api/admin/discussions?page=1&limit=20&type=course&author=john&search=linux

# Update discussion
PUT /api/admin/discussions/:id
{
  "title": "Updated Discussion Title",
  "isPinned": true,
  "isLocked": false
}

# Delete discussion
DELETE /api/admin/discussions/:id

# Get discussion replies
GET /api/admin/discussions/:id/replies

# Delete discussion reply
DELETE /api/admin/discussions/:id/replies/:replyId
```

### Certification Management
```bash
# List all certifications with admin details
GET /api/admin/certifications?page=1&limit=20&status=active&student=john&search=linux

# Create certification
POST /api/admin/certifications
{
  "studentId": "uuid-of-student",
  "title": "Linux Administrator Certification",
  "description": "Certified Linux Administrator",
  "issuerName": "TheMobileProf",
  "issueDate": "2024-01-15",
  "expiryDate": "2026-01-15"
}

# Update certification
PUT /api/admin/certifications/:id
{
  "title": "Advanced Linux Administrator",
  "status": "active"
}

# Delete certification
DELETE /api/admin/certifications/:id
```

### Payment Management
```bash
# Get payment history
GET /api/admin/payments?page=1&limit=20&status=successful&paymentMethod=card&search=john

# Get payment statistics
GET /api/admin/payments/stats?period=30
```

### System Settings
```bash
# Get system settings
GET /api/admin/settings

# Update system settings
PUT /api/admin/settings
{
  "settings": {
    "support_email": "support@themobileprof.com",
    "site_description": "Professional mobile development learning platform",
    "max_file_size": "10MB",
    "maintenance_mode": "false"
  }
}
```

### System Statistics
```bash
# Get comprehensive system overview
GET /api/admin/stats/overview

Response:
{
  "users": {
    "total": 2542,
    "students": 2245,
    "instructors": 285,
    "admins": 3,
    "sponsors": 12,
    "newThisMonth": 156
  },
  "courses": {
    "total": 124,
    "published": 98,
    "draft": 15
  },
  "tests": {
    "total": 856,
    "active": 734
  },
  "enrollments": {
    "totalEnrollments": 15420,
    "completed": 8560,
    "inProgress": 6860
  },
  "sponsorships": {
    "totalSponsorships": 45,
    "active": 32,
    "totalStudentsHelped": 1250
  }
}
```

## 🛡️ Security Features

### Admin-Only Access
- All admin routes require `role: 'admin'` in the JWT token
- Regular users cannot access admin endpoints
- Admin middleware validates admin role on every request

### Password Security
- Admin passwords are hashed using bcrypt
- Minimum 8 characters required
- Configurable salt rounds via `BCRYPT_ROUNDS` environment variable

### Account Protection
- Cannot delete the last admin user
- Admin accounts can be deactivated but not deleted through regular deletion
- Google OAuth linking available for existing admin accounts

## 📋 Admin Capabilities

### User Management
- ✅ Create, read, update, delete all users
- ✅ Change user roles (student, instructor, admin, sponsor)
- ✅ Activate/deactivate user accounts
- ✅ View user enrollment and course statistics
- ✅ Search and filter users by various criteria

### Course Management
- ✅ Create, read, update, delete all courses
- ✅ Publish/unpublish courses
- ✅ Assign courses to instructors
- ✅ View course enrollment statistics
- ✅ Manage course content and pricing

### System Administration
- ✅ View comprehensive system statistics
- ✅ Monitor user activity and engagement
- ✅ Track course performance and completion rates
- ✅ Manage sponsorship programs
- ✅ Access detailed analytics and reporting

## 🔍 Monitoring & Analytics

### User Analytics
- Total user count by role
- New user registrations per month
- User activity and engagement metrics
- Course enrollment patterns

### Course Analytics
- Course completion rates
- Student progress tracking
- Instructor performance metrics
- Revenue and pricing analytics

### System Health
- Database performance metrics
- API usage statistics
- Error rates and system alerts
- Resource utilization

## 🚨 Emergency Procedures

### Lost Admin Access
If you lose access to all admin accounts:

1. **Database Access**: Connect directly to the database
2. **Create Admin**: Use the admin creation script
3. **Reset Password**: Update password hash in database

### Database Commands
```sql
-- Check existing admin users
SELECT id, email, first_name, last_name, is_active FROM users WHERE role = 'admin';

-- Create admin user directly (emergency only)
INSERT INTO users (email, password_hash, first_name, last_name, role, auth_provider, email_verified, is_active)
VALUES ('emergency@themobileprof.com', 'hashed_password', 'Emergency', 'Admin', 'admin', 'local', true, true);

-- Reset admin password
UPDATE users 
SET password_hash = 'new_hashed_password', updated_at = CURRENT_TIMESTAMP 
WHERE email = 'admin@themobileprof.com' AND role = 'admin';
```

## 📝 Environment Variables

Add these to your `.env` file for admin functionality:

```env
# Admin default credentials (for initial setup)
ADMIN_DEFAULT_EMAIL=admin@themobileprof.com
ADMIN_DEFAULT_PASSWORD=secure_admin_password

# Password security
BCRYPT_ROUNDS=12

# JWT settings
JWT_SECRET=your-super-secure-jwt-secret
JWT_EXPIRES_IN=24h
```

## 🔄 Regular Maintenance

### Monthly Tasks
- [ ] Review admin user list
- [ ] Check system statistics for anomalies
- [ ] Update admin passwords
- [ ] Review user role assignments
- [ ] Audit course publication status

### Quarterly Tasks
- [ ] Review and update admin permissions
- [ ] Analyze system performance metrics
- [ ] Update security policies
- [ ] Review and rotate secrets

## 📞 Support

For admin-related issues:
- **Technical Support**: Check server logs and database
- **Security Issues**: Review authentication logs
- **User Management**: Use admin endpoints for bulk operations
- **System Monitoring**: Use `/api/admin/stats/overview` for health checks

## 🎯 Best Practices

1. **Use Strong Passwords**: Minimum 12 characters with mixed characters
2. **Regular Rotation**: Change admin passwords every 90 days
3. **Limited Access**: Only create admin accounts for necessary personnel
4. **Audit Logs**: Monitor admin actions regularly
5. **Backup Credentials**: Store admin credentials securely
6. **Multi-Factor**: Consider implementing 2FA for admin accounts
7. **Session Management**: Implement proper session timeouts
8. **IP Restrictions**: Consider IP whitelisting for admin access 