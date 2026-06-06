'use strict';
const request = require('supertest');
const app     = require('../src/app');
const Product = require('../src/modules/products/product.model');
const { createAdminAndLogin, createProduct } = require('./helpers/testHelpers');

describe('STOCK MODULE', () => {
  const BASE = '/api/v1/stock';
  let adminToken, product;

  beforeEach(async () => {
    const admin = await createAdminAndLogin();
    adminToken  = admin.token;
    product     = await createProduct({ sku: 'STK-001', name: 'Stock Test Product', stockQty: 50 });
  });

  // ── Purchase (stock IN) ──────────────────────
  describe('POST /purchase', () => {
    it('should increase stock and create ledger entry', async () => {
      const res = await request(app).post(`${BASE}/purchase`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ productId: product._id.toString(), quantity: 20, remarks: 'Received from supplier' });

      expect(res.status).toBe(200);
      expect(res.body.data.currentStock).toBe(70); // 50 + 20
      expect(res.body.data.previousStock).toBe(50);
    });

    it('should reject zero or negative quantity', async () => {
      const res = await request(app).post(`${BASE}/purchase`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ productId: product._id.toString(), quantity: 0 });
      expect(res.status).toBe(400);
    });

    it('should reject invalid product ID', async () => {
      const res = await request(app).post(`${BASE}/purchase`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ productId: '507f1f77bcf86cd799439011', quantity: 10 });
      expect(res.status).toBe(404);
    });
  });

  // ── Adjust ───────────────────────────────────
  describe('POST /adjust', () => {
    it('should adjust stock to specific quantity (increase)', async () => {
      const res = await request(app).post(`${BASE}/adjust`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ productId: product._id.toString(), quantity: 100, remarks: 'Physical count' });

      expect(res.status).toBe(200);
      expect(res.body.data.currentStock).toBe(100);
    });

    it('should adjust stock to specific quantity (decrease)', async () => {
      const res = await request(app).post(`${BASE}/adjust`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ productId: product._id.toString(), quantity: 10 });

      expect(res.status).toBe(200);
      expect(res.body.data.currentStock).toBe(10);
    });

    it('should reject adjustment to negative quantity', async () => {
      const res = await request(app).post(`${BASE}/adjust`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ productId: product._id.toString(), quantity: -5 });
      expect(res.status).toBe(400);
    });
  });

  // ── Ledger ───────────────────────────────────
  describe('GET /ledger/:productId', () => {
    it('should return stock ledger entries after purchase', async () => {
      await request(app).post(`${BASE}/purchase`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ productId: product._id.toString(), quantity: 10 });

      await request(app).post(`${BASE}/purchase`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ productId: product._id.toString(), quantity: 5 });

      const res = await request(app).get(`${BASE}/ledger/${product._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.meta.pagination).toHaveProperty('total');
    });

    it('should return 404 for unknown product', async () => {
      const res = await request(app).get(`${BASE}/ledger/507f1f77bcf86cd799439011`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
    });

    it('should paginate ledger entries', async () => {
      for (let i = 0; i < 5; i++) {
        await request(app).post(`${BASE}/purchase`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ productId: product._id.toString(), quantity: 1 });
      }
      const res = await request(app).get(`${BASE}/ledger/${product._id}?page=1&limit=3`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.body.data.length).toBeLessThanOrEqual(3);
    });
  });
});
