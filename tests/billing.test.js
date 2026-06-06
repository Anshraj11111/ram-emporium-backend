'use strict';
const request  = require('supertest');
const app      = require('../src/app');
const Product  = require('../src/modules/products/product.model');
const { createAdminAndLogin, createProduct, createCustomer, seedSettings } = require('./helpers/testHelpers');

describe('BILLING MODULE', () => {
  const BASE      = '/api/v1/bills';
  const QUOT_BASE = '/api/v1/quotations';
  let adminToken, product, customer;

  beforeEach(async () => {
    const admin = await createAdminAndLogin();
    adminToken  = admin.token;
    product     = await createProduct({
      sku: 'BILL-PROD-001', name: 'Billing Product',
      sellingPrice: 500, gstRate: 18, stockQty: 100,
    });
    customer    = await createCustomer({ mobile: '9700000001' });
    await seedSettings();
  });

  const gstBillBody = () => ({
    type:       'GST',
    customerId: customer._id.toString(),
    items: [{
      productId:          product._id.toString(),
      quantity:           2,
      rate:               500,
      discountPercentage: 0,
      gstRate:            18,
    }],
    overallDiscount: 0,
    paymentMode:     'CASH',
  });

  const nonGstBillBody = () => ({
    type:       'NON_GST',
    customerId: customer._id.toString(),
    items: [{
      productId: product._id.toString(),
      quantity:  3,
      rate:      500,
      gstRate:   0,
    }],
    paymentMode: 'UPI',
  });

  // ── Create GST Bill ──────────────────────────
  describe('POST / (GST Bill)', () => {
    it('should create a GST bill with correct totals', async () => {
      const res = await request(app).post(BASE)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(gstBillBody());

      expect(res.status).toBe(201);
      const data = res.body.data;
      expect(data.billNo).toMatch(/^GST-\d{4}-\d{6}$/);
      expect(data.type).toBe('GST');
      // qty=2, rate=500, disc=0, taxable=1000, gst18%=180, total=1180
      expect(data.subtotal).toBe(1000);
      expect(data.gstAmount).toBe(180);
      expect(data.grandTotal).toBe(1180);
    });

    it('should auto-deduct stock after bill creation', async () => {
      const initialStock = product.stockQty; // 100
      await request(app).post(BASE)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(gstBillBody()); // buys qty=2

      const updated = await Product.findById(product._id);
      expect(updated.stockQty).toBe(initialStock - 2);
    });

    it('should auto-increment bill numbers sequentially', async () => {
      const r1 = await request(app).post(BASE)
        .set('Authorization', `Bearer ${adminToken}`).send(gstBillBody());
      const r2 = await request(app).post(BASE)
        .set('Authorization', `Bearer ${adminToken}`).send(gstBillBody());

      const seq1 = parseInt(r1.body.data.billNo.split('-')[2]);
      const seq2 = parseInt(r2.body.data.billNo.split('-')[2]);
      expect(seq2).toBe(seq1 + 1);
    });

    it('should rollback stock deduction if bill creation fails mid-way', async () => {
      // Try to buy more than available stock
      const res = await request(app).post(BASE)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...gstBillBody(),
          items: [{ productId: product._id.toString(), quantity: 999, rate: 500, gstRate: 18 }],
        });
      expect(res.status).toBe(400); // Insufficient stock

      // Stock should be unchanged
      const unchanged = await Product.findById(product._id);
      expect(unchanged.stockQty).toBe(100);
    });

    it('should reject invalid bill type', async () => {
      const res = await request(app).post(BASE)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...gstBillBody(), type: 'INVALID' });
      expect(res.status).toBe(400);
    });
  });

  // ── Create Non-GST Bill ──────────────────────
  describe('POST / (Non-GST Bill)', () => {
    it('should create a NON_GST bill', async () => {
      const res = await request(app).post(BASE)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(nonGstBillBody());

      expect(res.status).toBe(201);
      expect(res.body.data.billNo).toMatch(/^NONGST-\d{4}-\d{6}$/);
      expect(res.body.data.type).toBe('NON_GST');
      // qty=3, rate=500, gst=0, total=1500
      expect(res.body.data.grandTotal).toBe(1500);
    });

    it('GST and NON_GST sequences should be independent', async () => {
      const gst    = await request(app).post(BASE)
        .set('Authorization', `Bearer ${adminToken}`).send(gstBillBody());
      const nonGst = await request(app).post(BASE)
        .set('Authorization', `Bearer ${adminToken}`).send(nonGstBillBody());

      expect(gst.body.data.billNo).toMatch(/^GST-/);
      expect(nonGst.body.data.billNo).toMatch(/^NONGST-/);
    });
  });

  // ── Get Bill ─────────────────────────────────
  describe('GET /:id', () => {
    it('should return bill by ID with populated customer', async () => {
      const created = await request(app).post(BASE)
        .set('Authorization', `Bearer ${adminToken}`).send(gstBillBody());
      const id = created.body.data._id;

      const res = await request(app).get(`${BASE}/${id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBe(1);
      expect(res.body.data.customerSnapshot.name).toBeTruthy();
    });

    it('should 404 for unknown ID', async () => {
      const res = await request(app).get(`${BASE}/507f1f77bcf86cd799439011`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
    });
  });

  // ── List Bills ───────────────────────────────
  describe('GET /', () => {
    it('should return paginated bill list', async () => {
      await request(app).post(BASE).set('Authorization', `Bearer ${adminToken}`).send(gstBillBody());
      await request(app).post(BASE).set('Authorization', `Bearer ${adminToken}`).send(nonGstBillBody());

      const res = await request(app).get(BASE)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by type=GST', async () => {
      await request(app).post(BASE).set('Authorization', `Bearer ${adminToken}`).send(gstBillBody());
      await request(app).post(BASE).set('Authorization', `Bearer ${adminToken}`).send(nonGstBillBody());

      const res = await request(app).get(`${BASE}?type=GST`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      res.body.data.forEach(b => expect(b.type).toBe('GST'));
    });

    it('should search by bill number', async () => {
      const created = await request(app).post(BASE)
        .set('Authorization', `Bearer ${adminToken}`).send(gstBillBody());
      const billNo = created.body.data.billNo;

      const res = await request(app).get(`${BASE}?search=${billNo}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
    });
  });

  // ── Convert Quotation to Bill ────────────────
  describe('POST /convert/:quotationId', () => {
    it('should convert an approved quotation to a GST bill', async () => {
      // Create quotation
      const qRes = await request(app).post(QUOT_BASE)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId: customer._id.toString(),
          items: [{ productId: product._id.toString(), quantity: 1, rate: 500, gstRate: 18 }],
        });
      const qId = qRes.body.data._id;

      // Approve it
      await request(app).patch(`${QUOT_BASE}/${qId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'APPROVED' });

      // Convert
      const bRes = await request(app).post(`${BASE}/convert/${qId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ type: 'GST', paymentMode: 'CASH' });

      expect(bRes.status).toBe(201);
      expect(bRes.body.data.billNo).toMatch(/^GST-/);
      expect(bRes.body.data.quotationId).toBe(qId);

      // Quotation should be marked CONVERTED_TO_BILL
      const qCheck = await request(app).get(`${QUOT_BASE}/${qId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(qCheck.body.data.status).toBe('CONVERTED_TO_BILL');
    });

    it('should not convert the same quotation twice', async () => {
      const qRes = await request(app).post(QUOT_BASE)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [{ productId: product._id.toString(), quantity: 1, rate: 500, gstRate: 18 }],
        });
      const qId = qRes.body.data._id;

      // First conversion
      await request(app).post(`${BASE}/convert/${qId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ type: 'GST', paymentMode: 'CASH' });

      // Second conversion should fail
      const res2 = await request(app).post(`${BASE}/convert/${qId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ type: 'GST', paymentMode: 'CASH' });
      expect(res2.status).toBe(400);
    });
  });
});
