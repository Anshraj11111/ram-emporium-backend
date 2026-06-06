'use strict';
const request = require('supertest');
const app     = require('../src/app');
const { createAdminAndLogin, createStaffAndLogin, createProduct } = require('./helpers/testHelpers');

describe('PRODUCTS MODULE', () => {
  const BASE = '/api/v1/products';
  let adminToken, staffToken;

  beforeEach(async () => {
    const admin = await createAdminAndLogin();
    adminToken  = admin.token;
    const staff = await createStaffAndLogin();
    staffToken  = staff.token;
  });

  // ── Create ──────────────────────────────────
  describe('POST / (create product)', () => {
    it('admin should create a product', async () => {
      const res = await request(app).post(BASE)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          sku: 'PROD-001', name: 'Aluminium Pipe 1inch',
          sellingPrice: 110, gstRate: 18, unit: 'MTR',
        });
      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('sku', 'PROD-001');
      expect(res.body.data).toHaveProperty('name', 'Aluminium Pipe 1inch');
    });

    it('staff should also create a product', async () => {
      const res = await request(app).post(BASE)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ sku: 'PROD-002', name: 'Steel Angle', sellingPrice: 85, gstRate: 18 });
      expect(res.status).toBe(201);
    });

    it('should reject duplicate SKU with 409', async () => {
      await createProduct({ sku: 'DUP-SKU', name: 'Original' });
      const res = await request(app).post(BASE)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ sku: 'DUP-SKU', name: 'Duplicate', sellingPrice: 100, gstRate: 18 });
      expect(res.status).toBe(409);
    });

    it('should reject invalid GST rate', async () => {
      const res = await request(app).post(BASE)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ sku: 'P-003', name: 'Bad GST', sellingPrice: 100, gstRate: 7 });
      expect(res.status).toBe(400);
    });

    it('should reject missing sellingPrice', async () => {
      const res = await request(app).post(BASE)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ sku: 'P-004', name: 'No Price', gstRate: 18 });
      expect(res.status).toBe(400);
    });

    it('should return 401 without token', async () => {
      const res = await request(app).post(BASE)
        .send({ sku: 'P-005', name: 'No Auth', sellingPrice: 100, gstRate: 18 });
      expect(res.status).toBe(401);
    });
  });

  // ── List ─────────────────────────────────────
  describe('GET / (list products)', () => {
    beforeEach(async () => {
      await createProduct({ sku: 'L-001', name: 'Aluminium Pipe', category: 'Aluminium' });
      await createProduct({ sku: 'L-002', name: 'Steel Rod',      category: 'Steel' });
      await createProduct({ sku: 'L-003', name: 'PVC Pipe',       category: 'PVC' });
    });

    it('should return paginated product list', async () => {
      const res = await request(app).get(BASE)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
      expect(res.body).toHaveProperty('meta.pagination');
    });

    it('should filter by category', async () => {
      const res = await request(app).get(`${BASE}?category=Aluminium`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      res.body.data.forEach(p => expect(p.category).toBe('Aluminium'));
    });

    it('should search by name', async () => {
      const res = await request(app).get(`${BASE}?search=Steel`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.some(p => p.name.includes('Steel'))).toBe(true);
    });

    it('should paginate correctly', async () => {
      const res = await request(app).get(`${BASE}?page=1&limit=2`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
      expect(res.body.meta.pagination.limit).toBe(2);
    });
  });

  // ── Search autocomplete ──────────────────────
  describe('GET /search (autocomplete)', () => {
    beforeEach(async () => {
      await createProduct({ sku: 'S-001', name: 'Aluminium Pipe 1 inch' });
      await createProduct({ sku: 'S-002', name: 'Aluminium Sheet 4x8' });
      await createProduct({ sku: 'S-003', name: 'Acrylic Sheet' });
    });

    it('should return matching products for prefix "Alum"', async () => {
      const res = await request(app).get(`${BASE}/search?q=Alum`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should return empty array for no match', async () => {
      const res = await request(app).get(`${BASE}/search?q=zzznomatch`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    it('should return 400 without q param', async () => {
      const res = await request(app).get(`${BASE}/search`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });
  });

  // ── Get by ID ────────────────────────────────
  describe('GET /:id', () => {
    it('should return product by ID', async () => {
      const product = await createProduct({ sku: 'GB-001', name: 'Get By ID Product' });
      const res = await request(app).get(`${BASE}/${product._id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data._id).toBe(product._id.toString());
    });

    it('should return 404 for non-existent ID', async () => {
      const res = await request(app).get(`${BASE}/507f1f77bcf86cd799439011`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
    });

    it('should return 400 for invalid ID format', async () => {
      const res = await request(app).get(`${BASE}/invalidid`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });
  });

  // ── Update ───────────────────────────────────
  describe('PUT /:id', () => {
    it('should update product fields', async () => {
      const product = await createProduct({ sku: 'UP-001', name: 'Old Name', sellingPrice: 100 });
      const res = await request(app).put(`${BASE}/${product._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'New Name', sellingPrice: 150 });
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('New Name');
      expect(res.body.data.sellingPrice).toBe(150);
    });
  });

  // ── Delete ───────────────────────────────────
  describe('DELETE /:id', () => {
    it('admin should delete a product', async () => {
      const product = await createProduct({ sku: 'DEL-001', name: 'To Delete' });
      const res = await request(app).delete(`${BASE}/${product._id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);

      const check = await request(app).get(`${BASE}/${product._id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(check.status).toBe(404);
    });

    it('staff should not be able to delete', async () => {
      const product = await createProduct({ sku: 'DEL-002', name: 'Protected' });
      const res = await request(app).delete(`${BASE}/${product._id}`)
        .set('Authorization', `Bearer ${staffToken}`);
      expect(res.status).toBe(403);
    });
  });

  // ── Low Stock ────────────────────────────────
  describe('GET /low-stock', () => {
    it('should return products below minStockLevel', async () => {
      await createProduct({ sku: 'LS-001', name: 'Low Stock Item', stockQty: 2, minStockLevel: 10 });
      await createProduct({ sku: 'LS-002', name: 'Fine Stock Item', stockQty: 50, minStockLevel: 10 });

      const res = await request(app).get(`${BASE}/low-stock`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.some(p => p.name === 'Low Stock Item')).toBe(true);
      expect(res.body.data.some(p => p.name === 'Fine Stock Item')).toBe(false);
    });
  });
});
