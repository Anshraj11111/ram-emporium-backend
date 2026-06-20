'use strict';
const router = require('express').Router();

router.use('/auth',          require('../modules/auth/auth.routes'));
router.use('/users',         require('../modules/users/user.routes'));
router.use('/settings',      require('../modules/settings/settings.routes'));
router.use('/customers',     require('../modules/customers/customer.routes'));
router.use('/products',      require('../modules/products/product.routes'));
router.use('/stock',         require('../modules/stock/stock.routes'));
router.use('/quotations',    require('../modules/quotations/quotation.routes'));
router.use('/bills',         require('../modules/billing/bill.routes'));
router.use('/custom-bills',  require('../modules/billing/customBill.routes'));
router.use('/reports',       require('../modules/reports/reports.routes'));
router.use('/dashboard',     require('../modules/dashboard/dashboard.routes'));
router.use('/notifications', require('../modules/notifications/notification.routes'));

module.exports = router;
