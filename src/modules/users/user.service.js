'use strict';
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

    // Only admin can change roles
    if (data.role && requesterRole !== 'admin') {
      throw ApiError.forbidden('Only admin can change user roles');
    }
    // Users can only update their own profile (unless admin)
    if (String(id) !== String(requesterId) && requesterRole !== 'admin') {
      throw ApiError.forbidden('You can only update your own profile');
    }

    // Prevent password change through this endpoint
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
}

module.exports = UserService;
