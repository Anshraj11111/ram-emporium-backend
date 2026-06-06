'use strict';
const router       = require('express').Router();
const controller   = require('./auth.controller');
const validate     = require('../../middleware/validate');
const authenticate = require('../../middleware/authenticate');
const { loginLimiter } = require('../../middleware/rateLimiter');
const {
  registerSchema, loginSchema, verifyEmailSchema, resendOtpSchema,
  forgotPasswordSchema, resetPasswordSchema, changePasswordSchema,
  refreshTokenSchema,
} = require('../../validators/auth.validators');

// Public routes
router.post('/register',         validate(registerSchema),         controller.register);
router.post('/verify-email',     validate(verifyEmailSchema),      controller.verifyEmail);
router.post('/resend-otp',       validate(resendOtpSchema),        controller.resendOtp);
router.post('/login',            loginLimiter, validate(loginSchema), controller.login);
router.post('/refresh-token',    validate(refreshTokenSchema),     controller.refreshToken);
router.post('/forgot-password',  validate(forgotPasswordSchema),   controller.forgotPassword);
router.post('/reset-password',   validate(resetPasswordSchema),    controller.resetPassword);

// Protected routes
router.use(authenticate);
router.post('/logout',           controller.logout);
router.post('/change-password',  validate(changePasswordSchema),   controller.changePassword);
router.get('/me',                controller.me);

module.exports = router;
