'use strict';
const request  = require('supertest');
const app      = require('../src/app');
const { createAdminAndLogin, createCustomer } = require('./helpers/testHelpers');

describe('CUSTOMERS MODULE', () => {
  const BASE = '/api/v1/customers';
  let adminToken;

  beforeEach(async () => {
    const admin = await createAdminAndLogin();
    adminToken  = admin.token;
  });

  // ── Create ──────────────────────────────────
  describe('POST /', () => {
    it('should create a customer', async () => {
      const res = await request(app).post(BASE)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Ramesh Traders', mobile: '9876543210', city: 'Delhi' });
      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('name', 'Ramesh Traders');
    });

    it('should create a GST customer', async () => {
      const res = await request(app).post(BASE)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'GST Firm', mobile: '9876543211',
          gstNumber: '07AAACR5055K1Z5',
        });
      expect(res.status).toBe(201);
      expect(res.body.data.gstNumber).toBe('07AAACR5055K1Z5');
    });

    it('should reject duplicate mobile number', async () => {
      await createCustomer({ mobile: '9000000001' });
      const res = await request(app).post(BASE)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Dup Mobile', mobile: '9000000001' });
      expect(res.status).toBe(409);
    });

    it('should reject invalid mobile number', async () => {
      const res = await request(app).post(BASE)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Bad Mobile', mobile: '1234567890' });
      expect(res.status).toBe(400);
    });

    it('should reject invalid GST number', async () => {
      const res = await request(app).post(BASE)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Bad GST', mobile: '9876543212', gstNumber: 'INVALIDGST' });
      expect(res.status).toBe(400);
    });

    it('should reject missing name', async () => {
      const res = await request(app).post(BASE)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ mobile: '9876543213' });
      expect(res.status).toBe(400);
    });
  });

  // ── List & Search ────────────────────────────
  describe('GET /', () => {
    beforeEach(async () => {
      await createCustomer({ name: 'Suresh Hardware', mobile: '9111111111' });
      await createCustomer({ name: 'Mahesh Stores',   mobile: '9222222222' });
      await createCustomer({ name: 'Ramesh Traders',  mobile: '9333333333', gstNumber: '29AAACR5055K1Z5' });
    });

    it('should return paginated customer list', async () => {
      const res = await request(app).get(BASE)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    });

    it('should search by name', async () => {
      const res = await request(app).get(`${BASE}?search=Suresh`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data[0].name).toBe('Suresh Hardware');
    });

    it('should search by mobile', async () => {
      const res = await request(app).get(`${BASE}?search=9222222222`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data[0].name).toBe('Mahesh Stores');
    });

    it('should filter GST-only customers', async () => {
      const res = await request(app).get(`${BASE}?gstOnly=true`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      res.body.data.forEach(c => expect(c.gstNumber).toBeTruthy());
    });

    it('should paginate', async () => {
      const res = await request(app).get(`${BASE}?page=1&limit=2`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
      expect(res.body.meta.pagination).toHaveProperty('totalPages');
    });
  });

  // ── Get by ID ────────────────────────────────
  describe('GET /:id', () => {
    it('should get customer by ID', async () => {
      const cust = await createCustomer({ mobile: '9444444444' });
      const res  = await request(app).get(`${BASE}/${cust._id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data._id).toBe(cust._id.toString());
    });

    it('should 404 for unknown ID', async () => {
      const res = await request(app).get(`${BASE}/507f1f77bcf86cd799439011`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
    });
  });

  // ── Update ───────────────────────────────────
  describe('PUT /:id', () => {
    it('should update customer', async () => {
      const cust = await createCustomer({ mobile: '9555555555' });
      const res  = await request(app).put(`${BASE}/${cust._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Name', city: 'Mumbai' });
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated Name');
    });
  });

  // ── Delete ───────────────────────────────────
  describe('DELETE /:id', () => {
    it('admin should delete customer', async () => {
      const cust = await createCustomer({ mobile: '9666666666' });
      const res  = await request(app).delete(`${BASE}/${cust._id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });
  });
});
