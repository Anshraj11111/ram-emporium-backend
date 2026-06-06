'use strict';
const request = require('supertest');
const app     = require('../src/app');
const { createAdminAndLogin, createProduct, createCustomer } = require('./helpers/testHelpers');

describe('DASHBOARD & REPORTS MODULE', () => {
  let adminToken;

  beforeEach(async () => {
    const admin = await createAdminAndLogin();
    adminToken  = admin.token;
  });

  // ── Dashboard ────────────────────────────────
  describe('GET /api/v1/dashboard', () => {
    it('should return dashboard summary with all required fields', async () => {
      const res = await request(app).get('/api/v1/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data).toHaveProperty('totalSalesToday');
      expect(data).toHaveProperty('totalBillsToday');
      expect(data).toHaveProperty('totalSalesThisMonth');
      expect(data).toHaveProperty('totalBillsThisMonth');
      expect(data).toHaveProperty('totalBills');
      expect(data).toHaveProperty('totalProducts');
      expect(data).toHaveProperty('totalCustomers');
      expect(data).toHaveProperty('lowStockCount');
      expect(data).toHaveProperty('lowStockProducts');
      expect(data).toHaveProperty('recentBills');
      expect(data).toHaveProperty('topSellingProducts');
      expect(Array.isArray(data.lowStockProducts)).toBe(true);
      expect(Array.isArray(data.recentBills)).toBe(true);
      expect(Array.isArray(data.topSellingProducts)).toBe(true);
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/v1/dashboard');
      expect(res.status).toBe(401);
    });

    it('should count new product in totalProducts', async () => {
      await createProduct({ sku: 'DASH-001', name: 'Dashboard Test' });
      await createProduct({ sku: 'DASH-002', name: 'Dashboard Test 2' });

      const res = await request(app).get('/api/v1/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.body.data.totalProducts).toBeGreaterThanOrEqual(2);
    });

    it('should count new customer in totalCustomers', async () => {
      await createCustomer({ mobile: '9100000011' });
      await createCustomer({ mobile: '9100000012' });

      const res = await request(app).get('/api/v1/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.body.data.totalCustomers).toBeGreaterThanOrEqual(2);
    });

    it('should show low stock products', async () => {
      await createProduct({ sku: 'LOW-001', name: 'Low Stock Item', stockQty: 1, minStockLevel: 10 });

      const res = await request(app).get('/api/v1/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.body.data.lowStockCount).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Reports ──────────────────────────────────
  describe('Reports', () => {
    it('GET /api/v1/reports/daily should return daily summary', async () => {
      const res = await request(app).get('/api/v1/reports/daily')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('totalSales');
      expect(res.body.data).toHaveProperty('totalBills');
    });

    it('GET /api/v1/reports/monthly should return monthly data', async () => {
      const res = await request(app)
        .get('/api/v1/reports/monthly?year=2026&month=6')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/v1/reports/yearly should return yearly data', async () => {
      const res = await request(app)
        .get('/api/v1/reports/yearly?year=2026')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/v1/reports/low-stock should return low stock list', async () => {
      await createProduct({ sku: 'LS-RPT-001', name: 'Low Report', stockQty: 0, minStockLevel: 5 });
      const res = await request(app).get('/api/v1/reports/low-stock')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/v1/reports/profit should return profit data', async () => {
      const res = await request(app).get('/api/v1/reports/profit')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('revenue');
      expect(res.body.data).toHaveProperty('profit');
    });

    it('GET /api/v1/reports/top-selling should return array', async () => {
      const res = await request(app).get('/api/v1/reports/top-selling?limit=5')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ── Settings ─────────────────────────────────
  describe('Settings', () => {
    it('should get empty settings initially', async () => {
      const res = await request(app).get('/api/v1/settings')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });

    it('admin should save settings', async () => {
      const res = await request(app).put('/api/v1/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          shopName:  'RAM EMPORIUM',
          ownerName: 'Ram Kumar',
          mobile:    '9876543210',
          gstNumber: '07AAACR5055K1Z5',
          address:   '123 Test Lane',
        });
      expect(res.status).toBe(200);
      expect(res.body.data.shopName).toBe('RAM EMPORIUM');
    });

    it('should require shopName in settings', async () => {
      const res = await request(app).put('/api/v1/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ownerName: 'Someone' });
      expect(res.status).toBe(400);
    });
  });

  // ── Health check ─────────────────────────────
  describe('Health check', () => {
    it('GET /health should return 200 OK', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('OK');
    });
  });

  // ── 404 handler ──────────────────────────────
  describe('404 handler', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/api/v1/unknown-route')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
    });
  });
});
