'use strict';
const { z } = require('zod');
const { GST_RATES, PRODUCT_STATUS } = require('../constants');

const createProductSchema = z.object({
  sku:           z.string().trim().min(1).max(50).toUpperCase(),
  name:          z.string().trim().min(1).max(250),
  category:      z.string().trim().max(100).optional(),
  unit:          z.string().trim().max(20).optional().default('PCS'),
  purchasePrice: z.number().min(0).optional().default(0),
  sellingPrice:  z.number().min(0),
  gstRate:       z.number().refine((v) => GST_RATES.includes(v), {
    message: `GST rate must be one of ${GST_RATES.join(', ')}`,
  }).default(18),
  stockQty:      z.number().min(0).optional().default(0),
  location:      z.string().trim().max(100).optional(),
  minStockLevel: z.number().min(0).optional().default(5),
  barcode:       z.string().trim().optional(),
  description:   z.string().trim().optional(),
  hsn:           z.string().trim().max(20).optional(),
  status:        z.enum(Object.values(PRODUCT_STATUS)).optional(),
});

const updateProductSchema = createProductSchema.partial();

const searchQuerySchema = z.object({
  q:     z.string().trim().min(1).max(100),
  limit: z.coerce.number().min(1).max(50).optional().default(15),
});

const productListQuerySchema = z.object({
  page:      z.coerce.number().min(1).optional(),
  limit:     z.coerce.number().min(1).max(100).optional(),
  search:    z.string().trim().optional().transform(v => v === '' ? undefined : v),
  category:  z.string().trim().optional().transform(v => v === '' ? undefined : v),
  status:    z.enum(Object.values(PRODUCT_STATUS)).optional().or(z.literal('').transform(() => undefined)),
  lowStock:  z.enum(['true', 'false']).optional().or(z.literal('').transform(() => undefined)),
  sort:      z.string().optional(),
});

module.exports = { createProductSchema, updateProductSchema, searchQuerySchema, productListQuerySchema };
