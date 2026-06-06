'use strict';
const { z } = require('zod');

const emptyToUndefined = z.literal('').transform(() => undefined);

const createCustomerSchema = z.object({
  name:      z.string().trim().min(1, 'Name required'),
  mobile:    z.string().trim().regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number')
               .optional().or(emptyToUndefined),
  gstNumber: z.string().trim().toUpperCase()
               .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST number')
               .optional().or(emptyToUndefined),
  address:   z.string().trim().max(300).optional(),
  city:      z.string().trim().max(100).optional(),
  state:     z.string().trim().max(100).optional(),
  pincode:   z.string().trim().max(10).optional(),
  email:     z.string().trim().email().optional().or(emptyToUndefined),
  notes:     z.string().trim().max(500).optional(),
});

const updateCustomerSchema = createCustomerSchema.partial();

module.exports = { createCustomerSchema, updateCustomerSchema };
