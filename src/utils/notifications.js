const { query, getRow } = require('../database/config');
const { sendEmail } = require('../mailer');

/**
 * Notification Types
 */
const NOTIFICATION_TYPES = {
  // Course related
  COURSE_ENROLLMENT: 'course_enrollment',
  COURSE_COMPLETION: 'course_completion',
  COURSE_PROGRESS: 'course_progress',
  COURSE_ANNOUNCEMENT: 'course_announcement',
  
  // Class related
  CLASS_ENROLLMENT: 'class_enrollment',
  CLASS_REMINDER: 'class_reminder',
  CLASS_CANCELLATION: 'class_cancellation',
  CLASS_SCHEDULE_CHANGE: 'class_schedule_change',
  
  // Discussion related
  DISCUSSION_REPLY: 'discussion_reply',
  DISCUSSION_MENTION: 'discussion_mention',
  DISCUSSION_LIKE: 'discussion_like',
  
  // Test related
  TEST_AVAILABLE: 'test_available',
  TEST_RESULT: 'test_result',
  TEST_REMINDER: 'test_reminder',
  
  // Certification related
  CERTIFICATION_EARNED: 'certification_earned',
  CERTIFICATION_EXPIRING: 'certification_expiring',
  CERTIFICATION_PROGRAM_PROGRESS: 'certification_program_progress',
  
  // Payment related
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed',
  PAYMENT_REFUND: 'payment_refund',
  
  // System related
  SYSTEM_MAINTENANCE: 'system_maintenance',
  SYSTEM_UPDATE: 'system_update',
  WELCOME: 'welcome'
};

/**
 * Notification Priorities
 */
const NOTIFICATION_PRIORITIES = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent'
};

/**
 * Create a notification in the database
 */
async function createNotification({
  userId,
  type,
  title,
  message,
  data = null,
  priority = NOTIFICATION_PRIORITIES.NORMAL,
  sendEmail = false
}) {
  try {
    // Check if user has notifications enabled
    const userSettings = await getRow(
      'SELECT email_notifications, push_notifications FROM user_settings WHERE user_id = $1',
      [userId]
    );

    if (!userSettings) {
      console.log(`User ${userId} has no notification settings, skipping notification`);
      return null;
    }

    // Create notification record
    const result = await query(
      `INSERT INTO notifications (user_id, type, title, message, data, priority)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [userId, type, title, message, data ? JSON.stringify(data) : null, priority]
    );

    const notificationId = result.rows[0].id;

    // Send email notification if enabled
    if (sendEmail && userSettings.email_notifications) {
      await sendEmailNotification(userId, type, title, message, data);
    }

    return notificationId;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

/**
 * Send email notification
 */
async function sendEmailNotification(userId, type, title, message, data) {
  try {
    const user = await getRow(
      'SELECT email, first_name, last_name FROM users WHERE id = $1',
      [userId]
    );

    if (!user || !user.email) {
      console.log(`No email found for user ${userId}`);
      return;
    }

    const emailData = {
      to: user.email,
      subject: title,
      template: 'notification',
      context: {
        firstName: user.first_name || 'User',
        title,
        message,
        data,
        type,
        unsubscribeUrl: `${process.env.FRONTEND_URL}/unsubscribe?email=${encodeURIComponent(user.email)}`
      }
    };

    await sendEmail(emailData);
    console.log(`Email notification sent to ${user.email} for type: ${type}`);
  } catch (error) {
    console.error('Error sending email notification:', error);
    // Don't throw error to avoid breaking the main notification flow
  }
}

/**
 * Create multiple notifications for multiple users
 */
async function createBulkNotifications({
  userIds,
  type,
  title,
  message,
  data = null,
  priority = NOTIFICATION_PRIORITIES.NORMAL,
  sendEmail = false
}) {
  try {
    const notifications = [];
    
    for (const userId of userIds) {
      const notificationId = await createNotification({
        userId,
        type,
        title,
        message,
        data,
        priority,
        sendEmail
      });
      
      if (notificationId) {
        notifications.push(notificationId);
      }
    }

    return notifications;
  } catch (error) {
    console.error('Error creating bulk notifications:', error);
    throw error;
  }
}

/**
 * Create course enrollment notification
 */
async function notifyCourseEnrollment(userId, courseId, courseTitle) {
  return createNotification({
    userId,
    type: NOTIFICATION_TYPES.COURSE_ENROLLMENT,
    title: 'Course Enrollment Successful',
    message: `You have successfully enrolled in "${courseTitle}". Start learning now!`,
    data: { courseId, courseTitle },
    priority: NOTIFICATION_PRIORITIES.NORMAL,
    sendEmail: true
  });
}

/**
 * Create course completion notification
 */
async function notifyCourseCompletion(userId, courseId, courseTitle, score) {
  return createNotification({
    userId,
    type: NOTIFICATION_TYPES.COURSE_COMPLETION,
    title: 'Course Completed! 🎉',
    message: `Congratulations! You have completed "${courseTitle}" with a score of ${score}%.`,
    data: { courseId, courseTitle, score },
    priority: NOTIFICATION_PRIORITIES.HIGH,
    sendEmail: true
  });
}

/**
 * Create class reminder notification
 */
async function notifyClassReminder(userId, classId, className, startTime) {
  return createNotification({
    userId,
    type: NOTIFICATION_TYPES.CLASS_REMINDER,
    title: 'Class Reminder',
    message: `Your class "${className}" starts in 1 hour at ${startTime}.`,
    data: { classId, className, startTime },
    priority: NOTIFICATION_PRIORITIES.HIGH,
    sendEmail: true
  });
}

/**
 * Create discussion reply notification
 */
async function notifyDiscussionReply(userId, discussionId, discussionTitle, replierName) {
  return createNotification({
    userId,
    type: NOTIFICATION_TYPES.DISCUSSION_REPLY,
    title: 'New Reply to Your Discussion',
    message: `${replierName} replied to your discussion "${discussionTitle}".`,
    data: { discussionId, discussionTitle, replierName },
    priority: NOTIFICATION_PRIORITIES.NORMAL,
    sendEmail: false
  });
}

/**
 * Create test result notification
 */
async function notifyTestResult(userId, testId, testTitle, score, passed) {
  const status = passed ? 'passed' : 'did not pass';
  return createNotification({
    userId,
    type: NOTIFICATION_TYPES.TEST_RESULT,
    title: `Test Result: ${testTitle}`,
    message: `You ${status} "${testTitle}" with a score of ${score}%.`,
    data: { testId, testTitle, score, passed },
    priority: NOTIFICATION_PRIORITIES.NORMAL,
    sendEmail: true
  });
}

/**
 * Create certification earned notification
 */
async function notifyCertificationEarned(userId, certificationId, title, credentialId) {
  return createNotification({
    userId,
    type: NOTIFICATION_TYPES.CERTIFICATION_EARNED,
    title: 'Certification Earned! 🏆',
    message: `Congratulations! You have earned the "${title}" certification. Your credential ID is ${credentialId}.`,
    data: { certificationId, title, credentialId },
    priority: NOTIFICATION_PRIORITIES.HIGH,
    sendEmail: true
  });
}

/**
 * Create payment success notification
 */
async function notifyPaymentSuccess(userId, paymentId, amount, description) {
  return createNotification({
    userId,
    type: NOTIFICATION_TYPES.PAYMENT_SUCCESS,
    title: 'Payment Successful',
    message: `Your payment of $${amount} for "${description}" has been processed successfully.`,
    data: { paymentId, amount, description },
    priority: NOTIFICATION_PRIORITIES.NORMAL,
    sendEmail: true
  });
}

/**
 * Create system maintenance notification
 */
async function notifySystemMaintenance(userIds, maintenanceType, scheduledTime, duration) {
  return createBulkNotifications({
    userIds,
    type: NOTIFICATION_TYPES.SYSTEM_MAINTENANCE,
    title: 'System Maintenance Scheduled',
    message: `Scheduled ${maintenanceType} maintenance will begin at ${scheduledTime} and last approximately ${duration}.`,
    data: { maintenanceType, scheduledTime, duration },
    priority: NOTIFICATION_PRIORITIES.HIGH,
    sendEmail: true
  });
}

/**
 * Mark notification as read
 */
async function markNotificationAsRead(notificationId, userId) {
  try {
    const result = await query(
      'UPDATE notifications SET is_read = true, read_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    );
    
    return result.rowCount > 0;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

/**
 * Get unread notification count for a user
 */
async function getUnreadNotificationCount(userId) {
  try {
    const result = await getRow(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );
    
    return parseInt(result.count);
  } catch (error) {
    console.error('Error getting unread notification count:', error);
    throw error;
  }
}

/**
 * Clean up old notifications (older than specified days)
 */
async function cleanupOldNotifications(daysOld = 90) {
  try {
    const result = await query(
      'DELETE FROM notifications WHERE created_at < NOW() - INTERVAL \'$1 days\' AND is_read = true',
      [daysOld]
    );
    
    console.log(`Cleaned up ${result.rowCount} old notifications`);
    return result.rowCount;
  } catch (error) {
    console.error('Error cleaning up old notifications:', error);
    throw error;
  }
}

module.exports = {
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
  createNotification,
  createBulkNotifications,
  notifyCourseEnrollment,
  notifyCourseCompletion,
  notifyClassReminder,
  notifyDiscussionReply,
  notifyTestResult,
  notifyCertificationEarned,
  notifyPaymentSuccess,
  notifySystemMaintenance,
  markNotificationAsRead,
  getUnreadNotificationCount,
  cleanupOldNotifications
}; 