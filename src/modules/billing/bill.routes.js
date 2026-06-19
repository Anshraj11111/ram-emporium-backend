'use strict';
const router       = require('express').Router();
const controller   = require('./bill.controller');
const validate     = require('../../middleware/validate');
const authenticate = require('../../middleware/authenticate');
const authorize    = require('../../middleware/authorize');
const { ROLES }    = require('../../constants');
const { createBillSchema, convertQuotationSchema } = require('../../validators/bill.validators');

router.use(authenticate);

router.get('/',                                    controller.list);
router.post('/',                                   validate(createBillSchema), controller.create);
router.post('/convert/:quotationId',               validate(convertQuotationSchema), controller.convertFromQuotation);
router.get('/:id',                                 controller.getById);
router.post('/:id/generate-pdf',                   controller.generatePDF);
router.delete('/:id',                              authorize(ROLES.ADMIN), controller.deleteBill);

module.exports = router;
