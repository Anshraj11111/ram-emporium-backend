'use strict';
const router       = require('express').Router();
const controller   = require('./reports.controller');
const authenticate = require('../../middleware/authenticate');

router.use(authenticate);

router.get('/daily',           controller.dailySales);
router.get('/monthly',         controller.monthlySales);
router.get('/yearly',          controller.yearlySales);
router.get('/product-wise',    controller.productWiseSales);
router.get('/customer-wise',   controller.customerWiseSales);
router.get('/top-selling',     controller.topSellingProducts);
router.get('/low-stock',       controller.lowStockReport);
router.get('/profit',          controller.profitReport);

module.exports = router;
