# Notification System Documentation

## Overview

The notification system provides comprehensive user notification capabilities across the platform, including in-app notifications, email notifications, and preference management. It's designed to be non-intrusive and respect user preferences.

## Features

### 🎯 Notification Types
- **Course-related**: Enrollment, completion, progress updates
- **Class-related**: Enrollment, reminders, schedule changes
- **Discussion-related**: Replies, mentions, likes
- **Test-related**: Results, availability, reminders
- **Certification-related**: Earned, expiring, progress
- **Payment-related**: Success, failure, refunds
- **System-related**: Maintenance, updates, announcements

### 🔔 Notification Priorities
- **Low**: Informational updates
- **Normal**: Standard notifications
- **High**: Important updates (class reminders, test results)
- **Urgent**: Critical system notifications

### 📧 Delivery Methods
- **In-app notifications**: Stored in database, accessible via API
- **Email notifications**: Sent via configured mailer service
- **Push notifications**: Framework ready for future implementation

## Database Schema

### Notifications Table
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  priority VARCHAR(20) DEFAULT 'normal',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### User Settings Table (Enhanced)
```sql
CREATE TABLE user_settings (
  -- ... existing fields ...
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  course_notifications BOOLEAN DEFAULT true,
  class_notifications BOOLEAN DEFAULT true,
  discussion_notifications BOOLEAN DEFAULT true,
  test_notifications BOOLEAN DEFAULT true,
  certification_notifications BOOLEAN DEFAULT true,
  payment_notifications BOOLEAN DEFAULT true,
  system_notifications BOOLEAN DEFAULT true,
  -- ... other fields ...
);
```

## API Endpoints

### Core Notification Operations

#### List Notifications
```http
GET /api/notifications
```
**Query Parameters:**
- `type` - Filter by notification type
- `read` - Filter by read status (`true`/`false`)
- `priority` - Filter by priority level
- `sort` - Sort field (`created_at`, `type`, `priority`, `is_read`)
- `order` - Sort order (`asc`/`desc`)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

**Response:**
```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "course_enrollment",
      "title": "Course Enrollment Successful",
      "message": "You have successfully enrolled in...",
      "data": { "courseId": "uuid", "courseTitle": "..." },
      "isRead": false,
      "priority": "normal",
      "createdAt": "2024-01-01T00:00:00Z",
      "readAt": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

#### Get Unread Count
```http
GET /api/notifications/count
```
**Query Parameters:**
- `type` - Filter by notification type (optional)

**Response:**
```json
{
  "unreadCount": 5
}
```

#### Mark as Read
```http
PATCH /api/notifications/:id/read
```

#### Mark All as Read
```http
PATCH /api/notifications/read-all
```

#### Mark by Type as Read
```http
PATCH /api/notifications/read-by-type
```
**Body:**
```json
{
  "type": "course_enrollment"
}
```

### Notification Preferences

#### Get Preferences
```http
GET /api/notifications/preferences
```

#### Update Preferences
```http
PUT /api/notifications/preferences
```
**Body:**
```json
{
  "emailNotifications": true,
  "pushNotifications": true,
  "courseNotifications": true,
  "classNotifications": true,
  "discussionNotifications": true,
  "testNotifications": true,
  "certificationNotifications": true,
  "paymentNotifications": true,
  "systemNotifications": true
}
```

### Statistics and Types

#### Get Statistics
```http
GET /api/notifications/stats
```

#### Get Types and Priorities
```http
GET /api/notifications/types
```

### Admin Operations

#### Send System Notification
```http
POST /api/notifications/system
```
**Body:**
```json
{
  "title": "System Maintenance",
  "message": "Scheduled maintenance will begin...",
  "type": "system_maintenance",
  "priority": "high",
  "data": { "maintenanceType": "database", "duration": "2 hours" }
}
```

#### Cleanup Old Notifications
```http
DELETE /api/notifications/cleanup?daysOld=90
```

## Integration Examples

### Creating Notifications

#### Basic Notification
```javascript
const { createNotification } = require('../utils/notifications');

await createNotification({
  userId: 'user-uuid',
  type: 'course_enrollment',
  title: 'Course Enrollment Successful',
  message: 'You have successfully enrolled in "JavaScript Fundamentals"',
  data: { courseId: 'course-uuid', courseTitle: 'JavaScript Fundamentals' },
  priority: 'normal',
  sendEmail: true
});
```

#### Bulk Notifications
```javascript
const { createBulkNotifications } = require('../utils/notifications');

await createBulkNotifications({
  userIds: ['user1-uuid', 'user2-uuid', 'user3-uuid'],
  type: 'system_maintenance',
  title: 'Scheduled Maintenance',
  message: 'System will be unavailable from 2-4 AM',
  priority: 'high',
  sendEmail: true
});
```

### Pre-built Notification Functions

```javascript
const {
  notifyCourseEnrollment,
  notifyClassReminder,
  notifyDiscussionReply,
  notifyTestResult,
  notifyCertificationEarned,
  notifyPaymentSuccess
} = require('../utils/notifications');

// Course enrollment
await notifyCourseEnrollment(userId, courseId, courseTitle);

// Class reminder
await notifyClassReminder(userId, classId, className, startTime);

// Discussion reply
await notifyDiscussionReply(userId, discussionId, discussionTitle, replierName);

// Test result
await notifyTestResult(userId, testId, testTitle, score, passed);

// Certification earned
await notifyCertificationEarned(userId, certificationId, title, credentialId);

// Payment success
await notifyPaymentSuccess(userId, paymentId, amount, description);
```

## Automatic Notifications

The system automatically sends notifications for common events:

### Course Events
- ✅ **Enrollment**: When user enrolls in a course
- ✅ **Completion**: When user completes a course
- 🔄 **Progress**: When user reaches milestones

### Class Events
- ✅ **Enrollment**: When user enrolls in a class
- 🔄 **Reminders**: 1 hour before class starts
- 🔄 **Schedule Changes**: When class time/location changes

### Discussion Events
- ✅ **Replies**: When someone replies to user's discussion
- 🔄 **Mentions**: When user is mentioned in discussion
- 🔄 **Likes**: When discussion receives likes

### Test Events
- ✅ **Results**: When test is completed
- 🔄 **Availability**: When new test becomes available
- 🔄 **Reminders**: When test deadline approaches

### Payment Events
- ✅ **Success**: When payment is completed
- 🔄 **Failure**: When payment fails
- 🔄 **Refund**: When refund is processed

## Configuration

### Environment Variables
```bash
# Frontend URL for unsubscribe links
FRONTEND_URL=https://yourdomain.com

# Email configuration (via mailer.js)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### User Settings Defaults
```javascript
const defaultSettings = {
  emailNotifications: true,
  pushNotifications: true,
  courseNotifications: true,
  classNotifications: true,
  discussionNotifications: true,
  testNotifications: true,
  certificationNotifications: true,
  paymentNotifications: true,
  systemNotifications: true
};
```

## Testing

Run the notification system test:

```bash
node test-notifications.js
```

This will test:
- Authentication
- Preferences management
- Notification CRUD operations
- Bulk operations
- Admin restrictions
- Statistics and counts

## Best Practices

### 1. Error Handling
```javascript
try {
  await notifyCourseEnrollment(userId, courseId, courseTitle);
} catch (error) {
  console.error('Failed to send notification:', error);
  // Don't fail the main operation if notification fails
}
```

### 2. User Preferences
Always check user preferences before sending notifications:
```javascript
const userSettings = await getRow(
  'SELECT course_notifications FROM user_settings WHERE user_id = $1',
  [userId]
);

if (userSettings?.course_notifications) {
  await notifyCourseEnrollment(userId, courseId, courseTitle);
}
```

### 3. Notification Data
Include relevant data for frontend rendering:
```javascript
await createNotification({
  userId,
  type: 'discussion_reply',
  title: 'New Reply',
  message: 'Someone replied to your discussion',
  data: {
    discussionId: 'uuid',
    discussionTitle: 'Discussion Title',
    replierId: 'uuid',
    replierName: 'John Doe'
  }
});
```

### 4. Priority Levels
Use appropriate priority levels:
- **Low**: General updates, minor changes
- **Normal**: Standard notifications, enrollments
- **High**: Important events, reminders, results
- **Urgent**: System issues, critical updates

## Future Enhancements

### Planned Features
- 🔄 **Real-time notifications** via WebSocket
- 🔄 **Push notifications** for mobile apps
- 🔄 **Notification templates** for consistent messaging
- 🔄 **Scheduled notifications** for future delivery
- 🔄 **Notification analytics** and reporting
- 🔄 **Advanced filtering** and search
- 🔄 **Notification channels** (SMS, Slack, etc.)

### WebSocket Integration
```javascript
// Future implementation
const io = require('socket.io')(server);

io.on('connection', (socket) => {
  socket.on('join', (userId) => {
    socket.join(`user-${userId}`);
  });
});

// Send real-time notification
io.to(`user-${userId}`).emit('notification', {
  type: 'discussion_reply',
  title: 'New Reply',
  message: '...'
});
```

## Troubleshooting

### Common Issues

#### 1. Notifications Not Being Created
- Check database connection
- Verify user exists and has settings
- Check for validation errors

#### 2. Email Notifications Not Sending
- Verify mailer configuration
- Check SMTP credentials
- Ensure user has email notifications enabled

#### 3. Performance Issues
- Add database indexes on frequently queried fields
- Implement notification cleanup cron job
- Consider pagination for large notification lists

### Debug Mode
Enable debug logging:
```javascript
// In utils/notifications.js
const DEBUG = process.env.NODE_ENV === 'development';

if (DEBUG) {
  console.log('Creating notification:', { userId, type, title });
}
```

## Support

For issues or questions about the notification system:
1. Check the logs for error messages
2. Verify database schema and migrations
3. Test with the provided test script
4. Review user preferences and settings

---

**Version**: 1.0.0  
**Last Updated**: January 2024  
**Maintainer**: Backend Team 