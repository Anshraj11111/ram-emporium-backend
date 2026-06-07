'use strict';
const mongoose       = require('mongoose');
const UserRepository = require('./user.repository');
const ApiError       = require('../../utils/ApiError');
const { parsePagination, buildPaginationMeta } = require('../../utils/pagination');

class UserService {
  static async getAll(queryParams) {
    const { page, limit, skip } = parsePagination(queryParams);
    const [users, total] = await UserRepository.findAll({ page, limit, skip });
    return { users, pagination: buildPaginationMeta(total, page, limit) };
  }

  static async getById(id) {
    const user = await UserRepository.findById(id);
    if (!user) throw ApiError.notFound('User not found');
    return user;
  }

  static async update(id, data, requesterId, requesterRole) {
    const user = await UserRepository.findById(id);
    if (!user) throw ApiError.notFound('User not found');
    if (data.role && requesterRole !== 'admin') {
      throw ApiError.forbidden('Only admin can change user roles');
    }
    if (String(id) !== String(requesterId) && requesterRole !== 'admin') {
      throw ApiError.forbidden('You can only update your own profile');
    }
    delete data.password;
    return UserRepository.updateById(id, data);
  }

  static async deactivate(id) {
    const user = await UserRepository.findById(id);
    if (!user) throw ApiError.notFound('User not found');
    return UserRepository.updateById(id, { isActive: false });
  }

  static async activate(id) {
    const user = await UserRepository.findById(id);
    if (!user) throw ApiError.notFound('User not found');
    return UserRepository.updateById(id, { isActive: true });
  }

  /**
   * Admin creates a user directly — auto-verified, no email OTP needed.
   * Password is hashed by the User model pre-save hook.
   */
  static async adminCreate({ name, email, password, role }) {
    if (!name || !email || !password) {
      throw ApiError.badRequest('Name, email and password are required');
    }

    const existing = await UserRepository.findByEmail(email);
    if (existing) throw ApiError.conflict('Email already registered');

    // Use User model directly — pre-save hook will hash password
    const User = require('./user.model');
    const user = await User.create({
      name,
      email:      email.toLowerCase().trim(),
      password,   // will be hashed by pre-save hook
      role:       role || 'staff',
      isVerified: true,   // admin-created = auto verified
      isActive:   true,
    });

    return {
      _id:        user._id,
      name:       user.name,
      email:      user.email,
      role:       user.role,
      isVerified: user.isVerified,
    };
  }
}

module.exports = UserService;
