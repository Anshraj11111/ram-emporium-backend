'use strict';
const { z } = require('zod');
const { QUOTATION_STATUS, GST_RATES } = require('../constants');

const quotationItemSchema = z.object({
  productId:          z.string().min(24).max(24).optional(),  // Optional for manual items
  quantity:           z.number().min(1),
  rate:               z.number().min(0),
  discountPercentage: z.number().min(0).max(100).optional().default(0),
  gstRate:            z.number().min(0).max(100).optional(),
  productName:        z.string().trim().min(1, 'Product name is required'),  // Required
  sku:                z.string().trim().optional(),
  unit:               z.string().trim().optional(),
});

const createQuotationSchema = z.object({
  customerId:      z.string().min(24).max(24).optional().or(z.literal('').transform(() => undefined)),
  customerName:    z.string().trim().max(150).optional(),
  customerMobile:  z.string().trim().max(15).optional(),
  customerAddress: z.string().trim().max(300).optional(),
  customerGst:     z.string().trim().toUpperCase().max(15).optional(),
  items:           z.array(quotationItemSchema).min(1, 'At least one item is required'),
  overallDiscount: z.number().min(0).max(100).optional().default(0),
  notes:           z.string().trim().max(500).optional(),
  termsConditions: z.string().trim().max(1000).optional(),
  validUntil:      z.coerce.date().optional(),
});

const updateQuotationSchema = createQuotationSchema.partial();

const updateStatusSchema = z.object({
  status: z.enum(Object.values(QUOTATION_STATUS)),
});

module.exports = { createQuotationSchema, updateQuotationSchema, updateStatusSchema };
