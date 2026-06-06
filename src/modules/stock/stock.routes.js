'use strict';
const router       = require('express').Router();
const controller   = require('./stock.controller');
const validate     = require('../../middleware/validate');
const authenticate = require('../../middleware/authenticate');
const authorize    = require('../../middleware/authorize');
const { ROLES }    = require('../../constants');
const { adjustStockSchema, purchaseStockSchema } = require('../../validators/stock.validators');

router.use(authenticate);

router.post('/adjust',           authorize(ROLES.ADMIN, ROLES.STAFF), validate(adjustStockSchema), controller.adjust);
router.post('/purchase',         authorize(ROLES.ADMIN, ROLES.STAFF), validate(purchaseStockSchema), controller.purchase);
router.get('/ledger/:productId', controller.getLedger);

module.exports = router;
