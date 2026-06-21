'use strict';
const router       = require('express').Router();
const controller   = require('./settings.controller');
const validate     = require('../../middleware/validate');
const authenticate = require('../../middleware/authenticate');
const authorize    = require('../../middleware/authorize');
const upload       = require('../../middleware/upload');
const { ROLES }    = require('../../constants');
const { upsertSettingsSchema } = require('../../validators/settings.validators');

router.use(authenticate);

router.get('/',         controller.get);
router.put('/',         authorize(ROLES.ADMIN), validate(upsertSettingsSchema), controller.upsert);
router.post('/logo',      authorize(ROLES.ADMIN), upload.single('logo'),      controller.uploadLogo);
router.post('/signature', authorize(ROLES.ADMIN), upload.single('signature'), controller.uploadSignature);
router.delete('/signature', authorize(ROLES.ADMIN), controller.removeSignature);

module.exports = router;
