const express = require('express');
const { body } = require('express-validator');
const { validationResult } = require('express-validator');
const { getRow, getRows, query } = require('../database/config');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const { 
  createNotification, 
  createBulkNotifications,
  markNotificationAsRead,
  getUnreadNotificationCount,
  cleanupOldNotifications,
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES
} = require('../utils/notifications');

const router = express.Router();

// Get user notifications
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const { 
    type, 
    read, 
    priority,
    sort = 'created_at', 
    order = 'desc',
    page = 1,
    limit = 20
  } = req.query;

  let whereConditions = ['n.user_id = $1'];
  let params = [req.user.id];
  let paramIndex = 2;

  // Add filters
  if (type) {
    whereConditions.push(`n.type = $${paramIndex}`);
    params.push(type);
    paramIndex++;
  }

  if (read !== undefined) {
    whereConditions.push(`n.is_read = $${paramIndex}`);
    params.push(read === 'true');
    paramIndex++;
  }

  if (priority) {
    whereConditions.push(`n.priority = $${paramIndex}`);
    params.push(priority);
    paramIndex++;
  }

  // Validate sort field
  const allowedSortFields = ['created_at', 'type', 'priority', 'is_read'];
  const sortField = allowedSortFields.includes(sort) ? sort : 'created_at';
  const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  // Calculate offset
  const offset = (parseInt(page) - 1) * parseInt(limit);

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total
    FROM notifications n
    WHERE ${whereConditions.join(' AND ')}
  `;
  
  const countResult = await getRow(countQuery, params);
  const total = parseInt(countResult.total);

  // Get notifications
  const notificationsQuery = `
    SELECT 
      n.id, n.type, n.title, n.message, n.data, n.is_read, n.priority,
      n.created_at, n.read_at
    FROM notifications n
    WHERE ${whereConditions.join(' AND ')}
    ORDER BY n.${sortField} ${sortOrder}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  params.push(parseInt(limit), offset);
  const notifications = await getRows(notificationsQuery, params);

  res.json({
    notifications: notifications.map(notification => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data ? JSON.parse(notification.data) : null,
      isRead: notification.is_read,
      priority: notification.priority,
      createdAt: notification.created_at,
      readAt: notification.read_at
    })),
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit))
    }
  });
}));

// Get notification types and priorities (for frontend forms)
router.get('/types', authenticateToken, asyncHandler(async (req, res) => {
  res.json({
    types: Object.values(NOTIFICATION_TYPES),
    priorities: Object.values(NOTIFICATION_PRIORITIES)
  });
}));

// Mark notification as read
router.patch('/:id/read', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const notification = await getRow(
    'SELECT id, user_id, is_read FROM notifications WHERE id = $1',
    [id]
  );

  if (!notification) {
    throw new AppError('Notification not found', 404, 'Not Found');
  }

  if (notification.user_id !== req.user.id) {
    throw new AppError('Access denied', 403, 'Access Denied');
  }

  if (notification.is_read) {
    return res.json({ message: 'Notification already marked as read' });
  }

  await markNotificationAsRead(id, req.user.id);

  res.json({ message: 'Notification marked as read' });
}));

// Mark all notifications as read
router.patch('/read-all', authenticateToken, asyncHandler(async (req, res) => {
  const result = await query(
    'UPDATE notifications SET is_read = true, read_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND is_read = false',
    [req.user.id]
  );

  res.json({ 
    message: 'All notifications marked as read',
    updatedCount: result.rowCount
  });
}));

// Mark notifications by type as read
router.patch('/read-by-type', authenticateToken, asyncHandler(async (req, res) => {
  const { type } = req.body;

  if (!type || !Object.values(NOTIFICATION_TYPES).includes(type)) {
    throw new AppError('Valid notification type is required', 400, 'Bad Request');
  }

  const result = await query(
    'UPDATE notifications SET is_read = true, read_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND type = $2 AND is_read = false',
    [req.user.id, type]
  );

  res.json({ 
    message: `All ${type} notifications marked as read`,
    updatedCount: result.rowCount
  });
}));

// Delete notification
router.delete('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const notification = await getRow(
    'SELECT id, user_id FROM notifications WHERE id = $1',
    [id]
  );

  if (!notification) {
    throw new AppError('Notification not found', 404, 'Not Found');
  }

  if (notification.user_id !== req.user.id) {
    throw new AppError('Access denied', 403, 'Access Denied');
  }

  await query('DELETE FROM notifications WHERE id = $1', [id]);

  res.json({ message: 'Notification deleted' });
}));

// Delete multiple notifications
router.delete('/bulk', authenticateToken, asyncHandler(async (req, res) => {
  const { ids, type, read } = req.body;

  if (!ids && !type && read === undefined) {
    throw new AppError('Must provide ids, type, or read status', 400, 'Bad Request');
  }

  let whereConditions = ['user_id = $1'];
  let params = [req.user.id];
  let paramIndex = 2;

  if (ids && Array.isArray(ids) && ids.length > 0) {
    const placeholders = ids.map((_, index) => `$${paramIndex + index}`).join(', ');
    whereConditions.push(`id IN (${placeholders})`);
    params.push(...ids);
    paramIndex += ids.length;
  }

  if (type) {
    whereConditions.push(`type = $${paramIndex}`);
    params.push(type);
    paramIndex++;
  }

  if (read !== undefined) {
    whereConditions.push(`is_read = $${paramIndex}`);
    params.push(read);
  }

  const result = await query(
    `DELETE FROM notifications WHERE ${whereConditions.join(' AND ')}`,
    params
  );

  res.json({ 
    message: 'Notifications deleted successfully',
    deletedCount: result.rowCount
  });
}));

// Get notification count (unread)
router.get('/count', authenticateToken, asyncHandler(async (req, res) => {
  const { type } = req.query;
  
  let whereConditions = ['user_id = $1 AND is_read = false'];
  let params = [req.user.id];

  if (type) {
    whereConditions.push('type = $2');
    params.push(type);
  }

  const result = await getRow(
    `SELECT COUNT(*) as count FROM notifications WHERE ${whereConditions.join(' AND ')}`,
    params
  );

  res.json({ 
    unreadCount: parseInt(result.count)
  });
}));

// Get notification statistics
router.get('/stats', authenticateToken, asyncHandler(async (req, res) => {
  const stats = await getRow(
    `SELECT 
       COUNT(*) as total,
       COUNT(CASE WHEN is_read = false THEN 1 END) as unread,
       COUNT(CASE WHEN is_read = true THEN 1 END) as read,
       COUNT(CASE WHEN priority = 'urgent' THEN 1 END) as urgent,
       COUNT(CASE WHEN priority = 'high' THEN 1 END) as high,
       COUNT(CASE WHEN priority = 'normal' THEN 1 END) as normal,
       COUNT(CASE WHEN priority = 'low' THEN 1 END) as low
     FROM notifications 
     WHERE user_id = $1`,
    [req.user.id]
  );

  const typeStats = await getRows(
    `SELECT type, COUNT(*) as count
     FROM notifications 
     WHERE user_id = $1
     GROUP BY type
     ORDER BY count DESC`,
    [req.user.id]
  );

  res.json({
    total: parseInt(stats.total),
    unread: parseInt(stats.unread),
    read: parseInt(stats.read),
    byPriority: {
      urgent: parseInt(stats.urgent),
      high: parseInt(stats.high),
      normal: parseInt(stats.normal),
      low: parseInt(stats.low)
    },
    byType: typeStats.map(s => ({
      type: s.type,
      count: parseInt(s.count)
    }))
  });
}));

// Update notification preferences
router.put('/preferences', authenticateToken, asyncHandler(async (req, res) => {
  const { 
    emailNotifications, 
    pushNotifications, 
    courseNotifications,
    classNotifications,
    discussionNotifications,
    testNotifications,
    certificationNotifications,
    paymentNotifications,
    systemNotifications
  } = req.body;

  // Update user settings
  await query(
    `UPDATE user_settings SET 
       email_notifications = COALESCE($1, email_notifications),
       push_notifications = COALESCE($2, push_notifications),
       course_notifications = COALESCE($3, course_notifications),
       class_notifications = COALESCE($4, class_notifications),
       discussion_notifications = COALESCE($5, discussion_notifications),
       test_notifications = COALESCE($6, test_notifications),
       certification_notifications = COALESCE($7, certification_notifications),
       payment_notifications = COALESCE($8, payment_notifications),
       system_notifications = COALESCE($9, system_notifications),
       updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $10`,
    [
      emailNotifications, pushNotifications, courseNotifications,
      classNotifications, discussionNotifications, testNotifications,
      certificationNotifications, paymentNotifications, systemNotifications,
      req.user.id
    ]
  );

  res.json({ message: 'Notification preferences updated successfully' });
}));

// Get notification preferences
router.get('/preferences', authenticateToken, asyncHandler(async (req, res) => {
  const preferences = await getRow(
    `SELECT 
       email_notifications, push_notifications, course_notifications,
       class_notifications, discussion_notifications, test_notifications,
       certification_notifications, payment_notifications, system_notifications
     FROM user_settings 
     WHERE user_id = $1`,
    [req.user.id]
  );

  if (!preferences) {
    // Create default preferences if they don't exist
    await query(
      `INSERT INTO user_settings (user_id, email_notifications, push_notifications,
                                 course_notifications, class_notifications, discussion_notifications,
                                 test_notifications, certification_notifications, payment_notifications, system_notifications)
       VALUES ($1, true, true, true, true, true, true, true, true, true)`,
      [req.user.id]
    );

    res.json({
      emailNotifications: true,
      pushNotifications: true,
      courseNotifications: true,
      classNotifications: true,
      discussionNotifications: true,
      testNotifications: true,
      certificationNotifications: true,
      paymentNotifications: true,
      systemNotifications: true
    });
  } else {
    res.json({
      emailNotifications: preferences.email_notifications,
      pushNotifications: preferences.push_notifications,
      courseNotifications: preferences.course_notifications,
      classNotifications: preferences.class_notifications,
      discussionNotifications: preferences.discussion_notifications,
      testNotifications: preferences.test_notifications,
      certificationNotifications: preferences.certification_notifications,
      paymentNotifications: preferences.payment_notifications,
      systemNotifications: preferences.system_notifications
    });
  }
}));

// Admin: Create system notification for all users
router.post('/system', authenticateToken, asyncHandler(async (req, res) => {
  // Only admins can create system notifications
  if (req.user.role !== 'admin') {
    throw new AppError('Access denied', 403, 'Access Denied');
  }

  const { title, message, type, priority, data } = req.body;

  if (!title || !message || !type) {
    throw new AppError('Title, message, and type are required', 400, 'Bad Request');
  }

  // Get all active users
  const users = await getRows(
    'SELECT id FROM users WHERE is_active = true AND role != \'admin\'',
    []
  );

  const userIds = users.map(u => u.id);

  if (userIds.length === 0) {
    throw new AppError('No active users found', 404, 'Not Found');
  }

  // Create notifications for all users
  const notificationIds = await createBulkNotifications({
    userIds,
    type,
    title,
    message,
    data,
    priority: priority || 'normal',
    sendEmail: true
  });

  res.json({
    message: `System notification sent to ${userIds.length} users`,
    notificationCount: notificationIds.length,
    type,
    title
  });
}));

// Admin: Clean up old notifications
router.delete('/cleanup', authenticateToken, asyncHandler(async (req, res) => {
  // Only admins can clean up notifications
  if (req.user.role !== 'admin') {
    throw new AppError('Access denied', 403, 'Access Denied');
  }

  const { daysOld = 90 } = req.query;
  const deletedCount = await cleanupOldNotifications(parseInt(daysOld));

  res.json({
    message: `Cleaned up ${deletedCount} old notifications`,
    deletedCount,
    daysOld: parseInt(daysOld)
  });
}));

module.exports = router; 