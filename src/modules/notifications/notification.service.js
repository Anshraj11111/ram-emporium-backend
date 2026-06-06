'use strict';
const NotificationRepository = require('./notification.repository');
const { parsePagination, buildPaginationMeta } = require('../../utils/pagination');

class NotificationService {
  static create(data) {
    return NotificationRepository.create(data);
  }

  /**
   * Send a low-stock alert notification.
   */
  static lowStockAlert(product) {
    return NotificationRepository.create({
      title:         'Low Stock Alert',
      message:       `"${product.name}" (SKU: ${product.sku}) is running low. Current: ${product.stockQty}, Min: ${product.minStockLevel}`,
      type:          'LOW_STOCK',
      referenceId:   product._id,
      referenceType: 'Product',
    });
  }

  static async getForUser(userId, queryParams) {
    const { page, limit, skip } = parsePagination(queryParams);
    const [notifications, total, unreadCount] = await NotificationRepository.findForUser(
      userId,
      { skip, limit }
    );

    return {
      notifications,
      unreadCount,
      pagination: buildPaginationMeta(total, page, limit),
    };
  }

  static markRead(id, userId) {
    return NotificationRepository.markRead(id, userId);
  }

  static markAllRead(userId) {
    return NotificationRepository.markAllRead(userId);
  }
}

module.exports = NotificationService;
