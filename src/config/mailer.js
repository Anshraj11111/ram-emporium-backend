'use strict';
const nodemailer = require('nodemailer');
const env        = require('./env');

const transporter = nodemailer.createTransport({
  host:   env.EMAIL_HOST,
  port:   env.EMAIL_PORT,
  secure: env.EMAIL_SECURE,
  auth: {
    user: env.EMAIL_USER,
    pass: env.EMAIL_PASS,
  },
});

module.exports = transporter;
