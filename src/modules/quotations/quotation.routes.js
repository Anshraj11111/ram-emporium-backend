'use strict';
const router       = require('express').Router();
const controller   = require('./quotation.controller');
const validate     = require('../../middleware/validate');
const authenticate = require('../../middleware/authenticate');
const authorize    = require('../../middleware/authorize');
const { ROLES }    = require('../../constants');
const {
  createQuotationSchema,
  updateQuotationSchema,
  updateStatusSchema,
} = require('../../validators/quotation.validators');

router.use(authenticate);

router.get('/',                           controller.list);
router.post('/',                          validate(createQuotationSchema), controller.create);
router.get('/:id',                        controller.getById);
router.put('/:id',                        validate(updateQuotationSchema), controller.update);
router.delete('/:id',                     authorize(ROLES.ADMIN), controller.remove);
router.patch('/:id/status',               validate(updateStatusSchema), controller.updateStatus);
router.post('/:id/duplicate',             controller.duplicate);
router.post('/:id/generate-pdf',          controller.generatePDF);
router.get('/:id/convert-preview',        controller.getForConversion);

module.exports = router;
