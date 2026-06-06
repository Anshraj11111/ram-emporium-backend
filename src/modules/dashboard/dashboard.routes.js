'use strict';
const router       = require('express').Router();
const controller   = require('./dashboard.controller');
const authenticate = require('../../middleware/authenticate');

router.use(authenticate);

router.get('/', controller.getSummary);

module.exports = router;
