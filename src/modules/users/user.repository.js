'use strict';
const User = require('./user.model');

class UserRepository {
  /** Find by ID – no sensitive fields */
  static findById(id) {
    return User.findById(id).lean();
  }

  /** Find by ID with password (for login / token compare) */
  static findByIdWithPassword(id) {
    return User.findById(id).select('+password +refreshToken').lean();
  }

  /** Find by email – public fields only */
  static findByEmail(email) {
    return User.findOne({ email }).lean();
  }

  /** Find by email WITH sensitive fields (login, OTP verify) */
  static findByEmailWithSecrets(email) {
    return User.findOne({ email })
      .select('+password +resetOtp +resetOtpExpiry +verifyOtp +verifyOtpExpiry +refreshToken')
      .exec();
  }

  static create(data) {
    return User.create(data);
  }

  static updateById(id, data) {
    return User.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
  }

  static findAll({ page, limit, skip }) {
    return Promise.all([
      User.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(),
    ]);
  }

  static deleteById(id) {
    return User.findByIdAndDelete(id);
  }
}

module.exports = UserRepository;
