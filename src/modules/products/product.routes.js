'use strict';
const router       = require('express').Router();
const controller   = require('./product.controller');
const validate     = require('../../middleware/validate');
const authenticate = require('../../middleware/authenticate');
const authorize    = require('../../middleware/authorize');
const { searchLimiter } = require('../../middleware/rateLimiter');
const { ROLES }    = require('../../constants');
const {
  createProductSchema,
  updateProductSchema,
  searchQuerySchema,
  productListQuerySchema,
} = require('../../validators/product.validators');

router.use(authenticate);

// Search (high-traffic, dedicated rate limit)
router.get('/search',    searchLimiter, validate(searchQuerySchema, 'query'), controller.search);
router.get('/low-stock', controller.lowStock);

// CRUD
router.get('/',          validate(productListQuerySchema, 'query'), controller.list);
router.post('/',         authorize(ROLES.ADMIN, ROLES.STAFF), validate(createProductSchema), controller.create);
router.get('/:id',       controller.getById);
router.put('/:id',       authorize(ROLES.ADMIN, ROLES.STAFF), validate(updateProductSchema), controller.update);
router.delete('/:id',    authorize(ROLES.ADMIN), controller.remove);

module.exports = router;
