'use strict';
const router       = require('express').Router();
const controller   = require('./user.controller');
const authenticate = require('../../middleware/authenticate');
const authorize    = require('../../middleware/authorize');
const { ROLES }    = require('../../constants');

router.use(authenticate);

router.get('/',                   authorize(ROLES.ADMIN), controller.getAll);
router.post('/admin-create',      authorize(ROLES.ADMIN), controller.adminCreate);
router.get('/:id',                controller.getById);
router.put('/:id',                controller.update);
router.patch('/:id/deactivate',   authorize(ROLES.ADMIN), controller.deactivate);
router.patch('/:id/activate',     authorize(ROLES.ADMIN), controller.activate);

module.exports = router;
