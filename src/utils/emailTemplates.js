'use strict';

const emailVerificationTemplate = (name, otp) => ({
  subject: 'Verify Your Email – RAM EMPORIUM',
  html: `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
      <h2 style="color:#2563EB;">RAM EMPORIUM</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Use the OTP below to verify your email address. It expires in 10 minutes.</p>
      <div style="background:#F3F4F6;padding:20px;text-align:center;border-radius:8px;">
        <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#111827;">${otp}</span>
      </div>
      <p style="color:#6B7280;font-size:12px;margin-top:24px;">
        If you did not request this, please ignore this email.
      </p>
    </div>`,
});

const forgotPasswordTemplate = (name, otp) => ({
  subject: 'Password Reset OTP – RAM EMPORIUM',
  html: `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
      <h2 style="color:#2563EB;">RAM EMPORIUM</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Your password reset OTP is:</p>
      <div style="background:#FEF3C7;padding:20px;text-align:center;border-radius:8px;">
        <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#92400E;">${otp}</span>
      </div>
      <p>This OTP is valid for <strong>10 minutes</strong>.</p>
      <p style="color:#6B7280;font-size:12px;">
        If you did not request a password reset, secure your account immediately.
      </p>
    </div>`,
});

module.exports = { emailVerificationTemplate, forgotPasswordTemplate };
