'use strict';
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const env      = require('../../config/env');
const { ROLES } = require('../../constants');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type:     String,
      required: [true, 'Email is required'],
      unique:   true,
      lowercase: true,
      trim:     true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type:     String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select:   false,
    },
    role: {
      type:    String,
      enum:    Object.values(ROLES),
      default: ROLES.STAFF,
    },
    isVerified: {
      type:    Boolean,
      default: false,
    },
    resetOtp: {
      type:   String,
      select: false,
    },
    resetOtpExpiry: {
      type:   Date,
      select: false,
    },
    verifyOtp: {
      type:   String,
      select: false,
    },
    verifyOtpExpiry: {
      type:   Date,
      select: false,
    },
    refreshToken: {
      type:   String,
      select: false,
    },
    isActive: {
      type:    Boolean,
      default: true,
    },
    lastLoginAt: Date,
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ── Indexes ─────────────────────────────────────
userSchema.index({ email: 1 });

// ── Pre-save: hash password ──────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, env.BCRYPT_SALT_ROUNDS);
  next();
});

// ── Instance method: compare password ───────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ── Instance method: strip sensitive fields ──────
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  delete obj.resetOtp;
  delete obj.resetOtpExpiry;
  delete obj.verifyOtp;
  delete obj.verifyOtpExpiry;
  return obj;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
