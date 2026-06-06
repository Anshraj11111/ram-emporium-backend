'use strict';
const router       = require('express').Router();
const controller   = require('./customer.controller');
const validate     = require('../../middleware/validate');
const authenticate = require('../../middleware/authenticate');
const authorize    = require('../../middleware/authorize');
const { ROLES }    = require('../../constants');
const { createCustomerSchema, updateCustomerSchema } = require('../../validators/customer.validators');

router.use(authenticate);

router.get('/',       controller.list);
router.post('/',      validate(createCustomerSchema), controller.create);
router.get('/:id',    controller.getById);
router.put('/:id',    validate(updateCustomerSchema), controller.update);
router.delete('/:id', authorize(ROLES.ADMIN), controller.remove);

module.exports = router;
