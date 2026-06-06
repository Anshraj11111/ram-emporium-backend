'use strict';
const router       = require('express').Router();
const controller   = require('./bill.controller');
const validate     = require('../../middleware/validate');
const authenticate = require('../../middleware/authenticate');
const { createBillSchema, convertQuotationSchema } = require('../../validators/bill.validators');

router.use(authenticate);

router.get('/',                                    controller.list);
router.post('/',                                   validate(createBillSchema), controller.create);
router.post('/convert/:quotationId',               validate(convertQuotationSchema), controller.convertFromQuotation);
router.get('/:id',                                 controller.getById);
router.post('/:id/generate-pdf',                   controller.generatePDF);

module.exports = router;
