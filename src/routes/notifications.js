const express = require('express');
const { body } = require('express-validator');
const { validationResult } = require('express-validator');
const { getRow, getRows, query } = require('../database/config');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user notifications
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const { 
    type, 
    read, 
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

  // Validate sort field
  const allowedSortFields = ['created_at', 'type', 'priority'];
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

  await query(
    'UPDATE notifications SET is_read = true, read_at = CURRENT_TIMESTAMP WHERE id = $1',
    [id]
  );

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

// Get notification count (unread)
router.get('/count', authenticateToken, asyncHandler(async (req, res) => {
  const result = await getRow(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
    [req.user.id]
  );

  res.json({ 
    unreadCount: parseInt(result.count)
  });
}));

module.exports = router; 