'use strict';
const router       = require('express').Router()
const controller   = require('./customBill.controller')
const authenticate = require('../../middleware/authenticate')
const authorize    = require('../../middleware/authorize')
const { ROLES }    = require('../../constants')

router.use(authenticate)

router.get('/',                  controller.list)
router.post('/',                 controller.create)
router.get('/:id',               controller.getById)
router.post('/:id/generate-pdf', controller.generatePDF)
router.delete('/:id',            authorize(ROLES.ADMIN, ROLES.STAFF), controller.deleteBill)

module.exports = router
