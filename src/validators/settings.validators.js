'use strict';
const { z } = require('zod');

const emptyToUndefined = z.literal('').transform(() => undefined);

const upsertSettingsSchema = z.object({
  shopName:        z.string().trim().min(1, 'Shop name is required'),
  ownerName:       z.string().trim().max(150).optional(),
  mobile:          z.string().trim().max(15).optional(),
  email:           z.string().trim().email().optional().or(emptyToUndefined),
  address:         z.string().trim().max(300).optional(),
  city:            z.string().trim().max(100).optional(),
  state:           z.string().trim().max(100).optional(),
  pincode:         z.string().trim().max(10).optional(),
  gstNumber:       z.string().trim().toUpperCase().max(15).optional(),
  invoicePrefix:   z.string().trim().max(20).optional(),
  nonGstPrefix:    z.string().trim().max(20).optional(),
  quotationPrefix: z.string().trim().max(20).optional(),
  termsConditions: z.string().trim().max(2000).optional(),
  bankName:        z.string().trim().max(100).optional(),
  bankAccountNo:   z.string().trim().max(30).optional(),
  bankIfsc:        z.string().trim().max(20).optional(),
  upiId:           z.string().trim().max(100).optional(),
  currency:        z.string().trim().max(10).optional(),
});

module.exports = { upsertSettingsSchema };
