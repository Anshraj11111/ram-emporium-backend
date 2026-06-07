'use strict';
const UserService  = require('./user.service');
const ApiResponse  = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const getAll = asyncHandler(async (req, res) => {
  const result = await UserService.getAll(req.query);
  ApiResponse.paginated(res, result.users, result.pagination);
});

const getById = asyncHandler(async (req, res) => {
  const user = await UserService.getById(req.params.id);
  ApiResponse.success(res, user);
});

const update = asyncHandler(async (req, res) => {
  const user = await UserService.update(
    req.params.id, req.body, req.user._id, req.user.role
  );
  ApiResponse.success(res, user, 'User updated');
});

const deactivate = asyncHandler(async (req, res) => {
  await UserService.deactivate(req.params.id);
  ApiResponse.success(res, null, 'User deactivated');
});

const activate = asyncHandler(async (req, res) => {
  await UserService.activate(req.params.id);
  ApiResponse.success(res, null, 'User activated');
});

// Admin creates a user — directly verified, no email needed
const adminCreate = asyncHandler(async (req, res) => {
  const user = await UserService.adminCreate(req.body);
  ApiResponse.created(res, user, 'User created successfully');
});

module.exports = { getAll, getById, update, deactivate, activate, adminCreate };
