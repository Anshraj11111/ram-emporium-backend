'use strict';
const { z } = require('zod');

const adjustStockSchema = z.object({
  productId: z.string().min(24).max(24),
  quantity:  z.number().min(0),
  remarks:   z.string().trim().max(300).optional(),
});

const purchaseStockSchema = z.object({
  productId: z.string().min(24).max(24),
  quantity:  z.number().min(1),
  remarks:   z.string().trim().max(300).optional(),
});

module.exports = { adjustStockSchema, purchaseStockSchema };
