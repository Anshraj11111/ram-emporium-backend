'use strict';
const router       = require('express').Router();
const controller   = require('./notification.controller');
const authenticate = require('../../middleware/authenticate');

router.use(authenticate);

router.get('/',              controller.getAll);
router.patch('/:id/read',    controller.markRead);
router.patch('/read-all',    controller.markAllRead);

module.exports = router;
