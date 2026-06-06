'use strict';
const Notification = require('./notification.model');

class NotificationRepository {
  static create(data) {
    return Notification.create(data);
  }

  static bulkCreate(items) {
    return Notification.insertMany(items);
  }

  static findForUser(userId, { skip, limit }) {
    const query = { $or: [{ userId }, { userId: null }] };
    return Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ ...query, isRead: false }),
    ]);
  }

  static markRead(id, userId) {
    return Notification.findOneAndUpdate(
      { _id: id, $or: [{ userId }, { userId: null }] },
      { isRead: true },
      { new: true }
    );
  }

  static markAllRead(userId) {
    return Notification.updateMany(
      { $or: [{ userId }, { userId: null }], isRead: false },
      { isRead: true }
    );
  }
}

module.exports = NotificationRepository;
