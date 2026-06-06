'use strict';
const jwt         = require('jsonwebtoken');
const env         = require('../../config/env');
const transporter = require('../../config/mailer');
const UserRepository = require('../users/user.repository');
const ApiError    = require('../../utils/ApiError');
const { generateOTP } = require('../../utils/helpers');
const { emailVerificationTemplate, forgotPasswordTemplate } = require('../../utils/emailTemplates');
const logger      = require('../../utils/logger');

class AuthService {
  // ── Token Helpers ──────────────────────────────
  static generateAccessToken(payload) {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN });
  }

  static generateRefreshToken(payload) {
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN });
  }

  static verifyRefreshToken(token) {
    try {
      return jwt.verify(token, env.JWT_REFRESH_SECRET);
    } catch {
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }
  }

  // ── Register ────────────────────────────────────
  static async register(data) {
    const existing = await UserRepository.findByEmail(data.email);
    if (existing) throw ApiError.conflict('Email already registered');

    const otp       = generateOTP(6);
    const otpExpiry = new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000);

    const user = await UserRepository.create({
      ...data,
      verifyOtp:       otp,
      verifyOtpExpiry: otpExpiry,
    });

    // Send verification email (non-blocking)
    AuthService._sendEmail(user.email, emailVerificationTemplate(user.name, otp)).catch((e) =>
      logger.error('Email send failed', { error: e.message })
    );

    return { id: user._id, name: user.name, email: user.email };
  }

  // ── Verify Email ────────────────────────────────
  static async verifyEmail(email, otp) {
    const user = await UserRepository.findByEmailWithSecrets(email);
    if (!user) throw ApiError.notFound('User not found');
    if (user.isVerified) throw ApiError.badRequest('Email already verified');

    if (!user.verifyOtp || user.verifyOtp !== otp) throw ApiError.badRequest('Invalid OTP');
    if (user.verifyOtpExpiry < new Date()) throw ApiError.badRequest('OTP has expired');

    await user.updateOne({
      isVerified:      true,
      verifyOtp:       undefined,
      verifyOtpExpiry: undefined,
    });

    return true;
  }

  // ── Resend Verify OTP ───────────────────────────
  static async resendVerifyOtp(email) {
    const user = await UserRepository.findByEmailWithSecrets(email);
    if (!user) throw ApiError.notFound('User not found');
    if (user.isVerified) throw ApiError.badRequest('Email already verified');

    const otp       = generateOTP(6);
    const otpExpiry = new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000);

    await user.updateOne({ verifyOtp: otp, verifyOtpExpiry: otpExpiry });

    AuthService._sendEmail(user.email, emailVerificationTemplate(user.name, otp)).catch((e) =>
      logger.error('Email send failed', { error: e.message })
    );

    return true;
  }

  // ── Login ────────────────────────────────────────
  static async login(email, password) {
    const user = await UserRepository.findByEmailWithSecrets(email);

    if (!user) throw ApiError.unauthorized('Invalid credentials');
    if (!user.isActive) throw ApiError.forbidden('Account deactivated. Contact admin.');
    if (!user.isVerified) throw ApiError.forbidden('Please verify your email before logging in');

    const passwordMatch = await user.comparePassword(password);
    if (!passwordMatch) {
      logger.warn('Failed login attempt', { email });
      throw ApiError.unauthorized('Invalid credentials');
    }

    const tokenPayload = { id: user._id, role: user.role };
    const accessToken  = AuthService.generateAccessToken(tokenPayload);
    const refreshToken = AuthService.generateRefreshToken(tokenPayload);

    // Persist refresh token (hashed is even safer; keeping plain here for simplicity)
    await user.updateOne({ refreshToken, lastLoginAt: new Date() });

    return {
      accessToken,
      refreshToken,
      user: {
        id:         user._id,
        name:       user.name,
        email:      user.email,
        role:       user.role,
        isVerified: user.isVerified,
      },
    };
  }

  // ── Refresh Token ────────────────────────────────
  static async refreshToken(token) {
    const decoded = AuthService.verifyRefreshToken(token);

    const user = await UserRepository.findByIdWithPassword(decoded.id);
    if (!user) throw ApiError.unauthorized('User not found');
    if (user.refreshToken !== token) throw ApiError.unauthorized('Refresh token reuse detected');

    const tokenPayload = { id: user._id, role: user.role };
    const newAccess    = AuthService.generateAccessToken(tokenPayload);
    const newRefresh   = AuthService.generateRefreshToken(tokenPayload);

    await UserRepository.updateById(user._id, { refreshToken: newRefresh });

    return { accessToken: newAccess, refreshToken: newRefresh };
  }

  // ── Logout ───────────────────────────────────────
  static async logout(userId) {
    await UserRepository.updateById(userId, { refreshToken: null });
    return true;
  }

  // ── Forgot Password ──────────────────────────────
  static async forgotPassword(email) {
    const user = await UserRepository.findByEmailWithSecrets(email);
    // Always return success to prevent email enumeration
    if (!user) return true;

    const otp       = generateOTP(6);
    const otpExpiry = new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000);

    await user.updateOne({ resetOtp: otp, resetOtpExpiry: otpExpiry });

    AuthService._sendEmail(user.email, forgotPasswordTemplate(user.name, otp)).catch((e) =>
      logger.error('Email send failed', { error: e.message })
    );

    return true;
  }

  // ── Reset Password ───────────────────────────────
  static async resetPassword(email, otp, newPassword) {
    const user = await UserRepository.findByEmailWithSecrets(email);
    if (!user) throw ApiError.notFound('User not found');

    if (!user.resetOtp || user.resetOtp !== otp) throw ApiError.badRequest('Invalid OTP');
    if (user.resetOtpExpiry < new Date()) throw ApiError.badRequest('OTP has expired');

    // Setting password triggers pre-save bcrypt hook
    user.password       = newPassword;
    user.resetOtp       = undefined;
    user.resetOtpExpiry = undefined;
    user.refreshToken   = undefined; // invalidate all sessions
    await user.save();

    return true;
  }

  // ── Change Password ──────────────────────────────
  static async changePassword(userId, currentPassword, newPassword) {
    const user = await UserRepository.findByIdWithPassword(userId);
    if (!user) throw ApiError.notFound('User not found');

    // user from lean() doesn't have comparePassword – fetch as Document
    const userDoc = await require('../users/user.model').findById(userId).select('+password');
    const match   = await userDoc.comparePassword(currentPassword);
    if (!match) throw ApiError.badRequest('Current password is incorrect');

    userDoc.password     = newPassword;
    userDoc.refreshToken = undefined; // invalidate sessions
    await userDoc.save();

    return true;
  }

  // ── Internal: send email ─────────────────────────
  static _sendEmail(to, { subject, html }) {
    return transporter.sendMail({ from: env.EMAIL_FROM, to, subject, html });
  }
}

module.exports = AuthService;
