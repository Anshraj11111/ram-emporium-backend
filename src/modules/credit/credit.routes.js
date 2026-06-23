'use strict';
const router       = require('express').Router();
const controller   = require('./credit.controller');
const authenticate = require('../../middleware/authenticate');
const authorize    = require('../../middleware/authorize');
const { ROLES }    = require('../../constants');

router.use(authenticate);

// GET  /api/v1/credit            — list all customer credit accounts
router.get('/', controller.listCredits);

// PATCH /api/v1/credit/:source/:id/mark-paid  — mark bill fully paid
router.patch('/:source/:id/mark-paid', authorize(ROLES.ADMIN, ROLES.STAFF), controller.markPaid);

// PATCH /api/v1/credit/:source/:id/pay  — record partial payment
router.patch('/:source/:id/pay', authorize(ROLES.ADMIN, ROLES.STAFF), controller.addPayment);

module.exports = router;
