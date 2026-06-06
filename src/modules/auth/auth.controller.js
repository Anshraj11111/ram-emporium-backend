'use strict';
const AuthService   = require('./auth.service');
const ApiResponse   = require('../../utils/ApiResponse');
const asyncHandler  = require('../../utils/asyncHandler');

const register = asyncHandler(async (req, res) => {
  const result = await AuthService.register(req.body);
  ApiResponse.created(res, result, 'Registration successful. Please verify your email.');
});

const verifyEmail = asyncHandler(async (req, res) => {
  await AuthService.verifyEmail(req.body.email, req.body.otp);
  ApiResponse.success(res, null, 'Email verified successfully');
});

const resendOtp = asyncHandler(async (req, res) => {
  await AuthService.resendVerifyOtp(req.body.email);
  ApiResponse.success(res, null, 'OTP resent to your email');
});

const login = asyncHandler(async (req, res) => {
  const result = await AuthService.login(req.body.email, req.body.password);
  ApiResponse.success(res, result, 'Login successful');
});

const refreshToken = asyncHandler(async (req, res) => {
  const result = await AuthService.refreshToken(req.body.refreshToken);
  ApiResponse.success(res, result, 'Token refreshed');
});

const logout = asyncHandler(async (req, res) => {
  await AuthService.logout(req.user._id);
  ApiResponse.success(res, null, 'Logged out successfully');
});

const forgotPassword = asyncHandler(async (req, res) => {
  await AuthService.forgotPassword(req.body.email);
  ApiResponse.success(res, null, 'If the email exists, an OTP has been sent');
});

const resetPassword = asyncHandler(async (req, res) => {
  await AuthService.resetPassword(req.body.email, req.body.otp, req.body.newPassword);
  ApiResponse.success(res, null, 'Password reset successfully');
});

const changePassword = asyncHandler(async (req, res) => {
  await AuthService.changePassword(req.user._id, req.body.currentPassword, req.body.newPassword);
  ApiResponse.success(res, null, 'Password changed successfully');
});

const me = asyncHandler(async (req, res) => {
  ApiResponse.success(res, req.user, 'Profile fetched');
});

module.exports = {
  register, verifyEmail, resendOtp, login, refreshToken,
  logout, forgotPassword, resetPassword, changePassword, me,
};
