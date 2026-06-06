'use strict';
const request  = require('supertest');
const app      = require('../src/app');
const { createAdminAndLogin, createProduct, createCustomer, seedSettings } = require('./helpers/testHelpers');

describe('QUOTATIONS MODULE', () => {
  const BASE = '/api/v1/quotations';
  let adminToken, product, customer;

  beforeEach(async () => {
    const admin = await createAdminAndLogin();
    adminToken  = admin.token;
    product     = await createProduct({ sku: 'QT-PROD-001', name: 'Test Product', sellingPrice: 100, gstRate: 18, stockQty: 200 });
    customer    = await createCustomer({ mobile: '9800000001' });
    await seedSettings();
  });

  const validQuotationBody = () => ({
    customerId: customer._id.toString(),
    items: [{
      productId:          product._id.toString(),
      quantity:           5,
      rate:               100,
      discountPercentage: 10,
      gstRate:            18,
    }],
    overallDiscount: 0,
    notes: 'Test quotation',
  });

  // ── Create ──────────────────────────────────
  describe('POST /', () => {
    it('should create a quotation with correct calculations', async () => {
      const res = await request(app).post(BASE)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validQuotationBody());

      expect(res.status).toBe(201);
      const data = res.body.data;
      expect(data.quotationNo).toMatch(/^QT-\d{4}-\d{6}$/);
      expect(data.status).toBe('DRAFT');

      // Verify calculation: rate=100, disc=10%, finalRate=90, qty=5, taxable=450, gst18%=81, total=531
      expect(data.items[0].discountAmount).toBe(10);
      expect(data.items[0].finalRate).toBe(90);
      expect(data.items[0].taxableAmount).toBe(450);
      expect(data.items[0].gstAmount).toBe(81);
      expect(data.items[0].totalAmount).toBe(531);
      expect(data.subtotal).toBe(450);
      expect(data.gstAmount).toBe(81);
      expect(data.grandTotal).toBe(531);
    });

    it('should auto-increment quotation numbers', async () => {
      const r1 = await request(app).post(BASE)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validQuotationBody());
      const r2 = await request(app).post(BASE)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validQuotationBody());

      const no1 = parseInt(r1.body.data.quotationNo.split('-')[2]);
      const no2 = parseInt(r2.body.data.quotationNo.split('-')[2]);
      expect(no2).toBe(no1 + 1);
    });

    it('should create quotation without a customer', async () => {
      const body = { ...validQuotationBody() };
      delete body.customerId;
      const res = await request(app).post(BASE)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(body);
      expect(res.status).toBe(201);
    });

    it('should reject empty items array', async () => {
      const res = await request(app).post(BASE)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validQuotationBody(), items: [] });
      expect(res.status).toBe(400);
    });

    it('should reject invalid productId', async () => {
      const res = await request(app).post(BASE)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...validQuotationBody(),
          items: [{ productId: '507f1f77bcf86cd799439011', quantity: 1, rate: 100 }],
        });
      expect(res.status).toBe(404);
    });
  });

  // ── Get ──────────────────────────────────────
  describe('GET /:id', () => {
    it('should return quotation by ID', async () => {
      const created = await request(app).post(BASE)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validQuotationBody());
      const id  = created.body.data._id;
      const res = await request(app).get(`${BASE}/${id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data._id).toBe(id);
    });
  });

  // ── List ─────────────────────────────────────
  describe('GET /', () => {
    it('should return paginated list', async () => {
      await request(app).post(BASE).set('Authorization', `Bearer ${adminToken}`).send(validQuotationBody());
      await request(app).post(BASE).set('Authorization', `Bearer ${adminToken}`).send(validQuotationBody());

      const res = await request(app).get(BASE)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by status', async () => {
      await request(app).post(BASE).set('Authorization', `Bearer ${adminToken}`).send(validQuotationBody());
      const res = await request(app).get(`${BASE}?status=DRAFT`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      res.body.data.forEach(q => expect(q.status).toBe('DRAFT'));
    });
  });

  // ── Update Status ────────────────────────────
  describe('PATCH /:id/status', () => {
    it('should update quotation status', async () => {
      const created = await request(app).post(BASE)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validQuotationBody());
      const id = created.body.data._id;

      const res = await request(app).patch(`${BASE}/${id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'SENT' });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('SENT');
    });

    it('should reject invalid status', async () => {
      const created = await request(app).post(BASE)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validQuotationBody());
      const res = await request(app).patch(`${BASE}/${created.body.data._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'INVALID_STATUS' });
      expect(res.status).toBe(400);
    });
  });

  // ── Duplicate ────────────────────────────────
  describe('POST /:id/duplicate', () => {
    it('should duplicate a quotation with new number', async () => {
      const created = await request(app).post(BASE)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validQuotationBody());
      const id = created.body.data._id;

      const res = await request(app).post(`${BASE}/${id}/duplicate`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(201);
      expect(res.body.data.quotationNo).not.toBe(created.body.data.quotationNo);
      expect(res.body.data.status).toBe('DRAFT');
    });
  });

  // ── Overall Discount ─────────────────────────
  describe('Overall discount calculation', () => {
    it('should apply overall discount correctly', async () => {
      const res = await request(app).post(BASE)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...validQuotationBody(),
          items: [{ productId: product._id.toString(), quantity: 10, rate: 100, discountPercentage: 0, gstRate: 18 }],
          overallDiscount: 10,
          // subtotal = 10 * 100 = 1000
          // overallDiscountAmount = 1000 * 10% = 100
          // GST is sum of item-level GST: 1000 * 18% = 180 (computed before overall discount)
          // grandTotal = (1000 - 100) + 180 = 1080
        });
      expect(res.status).toBe(201);
      expect(res.body.data.subtotal).toBe(1000);
      expect(res.body.data.overallDiscountAmount).toBe(100);
      expect(res.body.data.gstAmount).toBe(180);
      expect(res.body.data.grandTotal).toBe(1080);
    });
  });

  // ── Delete ───────────────────────────────────
  describe('DELETE /:id', () => {
    it('admin should delete DRAFT quotation', async () => {
      const created = await request(app).post(BASE)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validQuotationBody());
      const id = created.body.data._id;

      const res = await request(app).delete(`${BASE}/${id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);

      const check = await request(app).get(`${BASE}/${id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(check.status).toBe(404);
    });
  });
});
