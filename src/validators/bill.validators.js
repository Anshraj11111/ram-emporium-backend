'use strict';
const { z } = require('zod');
const { BILL_TYPES, PAYMENT_MODES, GST_RATES } = require('../constants');

const billItemSchema = z.object({
  productId:          z.string().min(24).max(24).optional(),  // Optional for manual items
  quantity:           z.number().min(1),
  rate:               z.number().min(0),
  discountPercentage: z.number().min(0).max(100).optional().default(0),
  gstRate:            z.number().min(0).max(100).optional(),
  productName:        z.string().trim().min(1, 'Product name is required'),  // Required for manual items
  sku:                z.string().trim().optional(),     // Optional - manual items use 'MANUAL'
  unit:               z.string().trim().optional(),     // Optional - defaults to 'PCS'
});

const createBillSchema = z.object({
  type:            z.enum(Object.values(BILL_TYPES)),
  customerId:      z.string().min(24).max(24).optional().or(z.literal('').transform(() => undefined)),
  customerSnapshot: z.object({
    name:      z.string().trim().optional(),
    mobile:    z.string().trim().optional(),
    gstNumber: z.string().trim().optional(),
    address:   z.string().trim().optional(),
  }).optional(),
  items:           z.array(billItemSchema).min(1, 'At least one item is required'),
  overallDiscount: z.number().min(0).max(100).optional().default(0),
  paymentMode:     z.enum(Object.values(PAYMENT_MODES)).optional().default('CASH'),
  paidAmount:      z.number().min(0).optional(),
  notes:           z.string().trim().max(500).optional(),
});

const convertQuotationSchema = z.object({
  type:        z.enum(Object.values(BILL_TYPES)),
  paymentMode: z.enum(Object.values(PAYMENT_MODES)).optional().default('CASH'),
  paidAmount:  z.number().min(0).optional(),
  notes:       z.string().trim().max(500).optional(),
});

const updateBillSchema = createBillSchema.partial().extend({
  // Allow partial update — type can be omitted
  type: z.enum(Object.values(BILL_TYPES)).optional(),
});

module.exports = { createBillSchema, updateBillSchema, convertQuotationSchema };
