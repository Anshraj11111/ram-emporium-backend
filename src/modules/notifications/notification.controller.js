'use strict';
const NotificationService = require('./notification.service');
const ApiResponse          = require('../../utils/ApiResponse');
const asyncHandler         = require('../../utils/asyncHandler');

const getAll = asyncHandler(async (req, res) => {
  const result = await NotificationService.getForUser(req.user._id, req.query);
  ApiResponse.success(res, {
    notifications: result.notifications,
    unreadCount:   result.unreadCount,
  }, 'Notifications fetched', 200, { pagination: result.pagination });
});

const markRead = asyncHandler(async (req, res) => {
  await NotificationService.markRead(req.params.id, req.user._id);
  ApiResponse.success(res, null, 'Notification marked as read');
});

const markAllRead = asyncHandler(async (req, res) => {
  await NotificationService.markAllRead(req.user._id);
  ApiResponse.success(res, null, 'All notifications marked as read');
});

module.exports = { getAll, markRead, markAllRead };
