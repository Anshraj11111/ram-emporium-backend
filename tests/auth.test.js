'use strict';
const request = require('supertest');
const app     = require('../src/app');
const User    = require('../src/modules/users/user.model');

describe('AUTH MODULE', () => {
  const BASE = '/api/v1/auth';

  // ── Register ─────────────────────────────────
  describe('POST /register', () => {
    it('should register a new user and return 201', async () => {
      const res = await request(app).post(`${BASE}/register`).send({
        name:     'Ram Kumar',
        email:    'ram@test.com',
        password: 'Test@1234',
      });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('email', 'ram@test.com');
    });

    it('should reject duplicate email with 409', async () => {
      await User.create({ name: 'Existing', email: 'dup@test.com', password: 'Test@1234', isVerified: true });
      const res = await request(app).post(`${BASE}/register`).send({
        name: 'New User', email: 'dup@test.com', password: 'Test@1234',
      });
      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should reject weak password with 400', async () => {
      const res = await request(app).post(`${BASE}/register`).send({
        name: 'X', email: 'x@test.com', password: 'weak',
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject missing email', async () => {
      const res = await request(app).post(`${BASE}/register`).send({
        name: 'X', password: 'Test@1234',
      });
      expect(res.status).toBe(400);
    });
  });

  // ── Verify Email ─────────────────────────────
  describe('POST /verify-email', () => {
    it('should verify email with correct OTP', async () => {
      const otp = '123456';
      await User.create({
        name:            'Verify User',
        email:           'verify@test.com',
        password:        'Test@1234',
        verifyOtp:       otp,
        verifyOtpExpiry: new Date(Date.now() + 600000),
        isVerified:      false,
      });

      const res = await request(app).post(`${BASE}/verify-email`).send({
        email: 'verify@test.com', otp,
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject wrong OTP', async () => {
      await User.create({
        name:            'V2',
        email:           'v2@test.com',
        password:        'Test@1234',
        verifyOtp:       '999999',
        verifyOtpExpiry: new Date(Date.now() + 600000),
        isVerified:      false,
      });
      const res = await request(app).post(`${BASE}/verify-email`).send({
        email: 'v2@test.com', otp: '000000',
      });
      expect(res.status).toBe(400);
    });

    it('should reject expired OTP', async () => {
      await User.create({
        name:            'V3',
        email:           'v3@test.com',
        password:        'Test@1234',
        verifyOtp:       '111111',
        verifyOtpExpiry: new Date(Date.now() - 1000), // already expired
        isVerified:      false,
      });
      const res = await request(app).post(`${BASE}/verify-email`).send({
        email: 'v3@test.com', otp: '111111',
      });
      expect(res.status).toBe(400);
    });
  });

  // ── Login ────────────────────────────────────
  describe('POST /login', () => {
    beforeEach(async () => {
      await User.create({
        name:       'Login User',
        email:      'login@test.com',
        password:   'Login@1234',
        role:       'admin',
        isVerified: true,
        isActive:   true,
      });
    });

    it('should login with correct credentials and return tokens', async () => {
      const res = await request(app).post(`${BASE}/login`).send({
        email: 'login@test.com', password: 'Login@1234',
      });
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data.user).toHaveProperty('role', 'admin');
    });

    it('should reject wrong password with 401', async () => {
      const res = await request(app).post(`${BASE}/login`).send({
        email: 'login@test.com', password: 'WrongPass@1',
      });
      expect(res.status).toBe(401);
    });

    it('should reject non-existent user with 401', async () => {
      const res = await request(app).post(`${BASE}/login`).send({
        email: 'nobody@test.com', password: 'Test@1234',
      });
      expect(res.status).toBe(401);
    });

    it('should reject unverified user with 403', async () => {
      await User.create({
        name: 'Unverified', email: 'unv@test.com',
        password: 'Test@1234', isVerified: false, isActive: true,
      });
      const res = await request(app).post(`${BASE}/login`).send({
        email: 'unv@test.com', password: 'Test@1234',
      });
      expect(res.status).toBe(403);
    });
  });

  // ── /me (protected) ──────────────────────────
  describe('GET /me', () => {
    it('should return user profile when authenticated', async () => {
      await User.create({
        name: 'Me User', email: 'me@test.com',
        password: 'Me@12345', isVerified: true, isActive: true,
      });
      const loginRes = await request(app).post(`${BASE}/login`)
        .send({ email: 'me@test.com', password: 'Me@12345' });
      const token = loginRes.body.data.accessToken;

      const res = await request(app).get(`${BASE}/me`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('email', 'me@test.com');
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get(`${BASE}/me`);
      expect(res.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app).get(`${BASE}/me`)
        .set('Authorization', 'Bearer invalidtoken');
      expect(res.status).toBe(401);
    });
  });

  // ── Refresh Token ─────────────────────────────
  describe('POST /refresh-token', () => {
    it('should issue new tokens with valid refresh token', async () => {
      await User.create({
        name: 'Refresh User', email: 'ref@test.com',
        password: 'Ref@12345', isVerified: true, isActive: true,
      });
      const loginRes = await request(app).post(`${BASE}/login`)
        .send({ email: 'ref@test.com', password: 'Ref@12345' });
      const { refreshToken } = loginRes.body.data;

      const res = await request(app).post(`${BASE}/refresh-token`)
        .send({ refreshToken });
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('accessToken');
    });

    it('should reject invalid refresh token', async () => {
      const res = await request(app).post(`${BASE}/refresh-token`)
        .send({ refreshToken: 'badtoken' });
      expect(res.status).toBe(401);
    });
  });

  // ── Logout ───────────────────────────────────
  describe('POST /logout', () => {
    it('should logout successfully', async () => {
      await User.create({
        name: 'Logout User', email: 'logout@test.com',
        password: 'Out@12345', isVerified: true, isActive: true,
      });
      const loginRes = await request(app).post(`${BASE}/login`)
        .send({ email: 'logout@test.com', password: 'Out@12345' });
      const token = loginRes.body.data.accessToken;

      const res = await request(app).post(`${BASE}/logout`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  // ── Forgot / Reset Password ───────────────────
  describe('Forgot & Reset Password', () => {
    it('should always return 200 for forgot-password (prevents enumeration)', async () => {
      const res = await request(app).post(`${BASE}/forgot-password`)
        .send({ email: 'doesnotexist@test.com' });
      expect(res.status).toBe(200);
    });

    it('should reset password with valid OTP', async () => {
      const otp = '654321';
      await User.create({
        name:           'Reset User',
        email:          'reset@test.com',
        password:       'Old@12345',
        isVerified:     true,
        isActive:       true,
        resetOtp:       otp,
        resetOtpExpiry: new Date(Date.now() + 600000),
      });

      const res = await request(app).post(`${BASE}/reset-password`).send({
        email: 'reset@test.com', otp, newPassword: 'New@12345',
      });
      expect(res.status).toBe(200);

      // Confirm new password works
      const loginRes = await request(app).post(`${BASE}/login`)
        .send({ email: 'reset@test.com', password: 'New@12345' });
      expect(loginRes.status).toBe(200);
    });
  });
});
