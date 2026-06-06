'use strict';
const request = require('supertest');
const app     = require('../../src/app');
const User    = require('../../src/modules/users/user.model');
const Product = require('../../src/modules/products/product.model');
const Customer= require('../../src/modules/customers/customer.model');
const Settings= require('../../src/modules/settings/settings.model');

/**
 * Create a verified admin user and return access token.
 */
const createAdminAndLogin = async () => {
  const user = await User.create({
    name:       'Test Admin',
    email:      'admin@test.com',
    password:   'Admin@12345',
    role:       'admin',
    isVerified: true,
    isActive:   true,
  });

  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@test.com', password: 'Admin@12345' });

  return {
    token: res.body.data.accessToken,
    refreshToken: res.body.data.refreshToken,
    user: res.body.data.user,
  };
};

/**
 * Create a verified staff user and return access token.
 */
const createStaffAndLogin = async () => {
  await User.create({
    name:       'Test Staff',
    email:      'staff@test.com',
    password:   'Staff@12345',
    role:       'staff',
    isVerified: true,
    isActive:   true,
  });

  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'staff@test.com', password: 'Staff@12345' });

  return {
    token: res.body.data.accessToken,
    user:  res.body.data.user,
  };
};

/**
 * Create a sample product directly in DB.
 */
const createProduct = (overrides = {}) => Product.create({
  sku:          'TEST-001',
  name:         'Test Product',
  category:     'Test',
  unit:         'PCS',
  purchasePrice: 80,
  sellingPrice:  100,
  gstRate:      18,
  stockQty:     100,
  minStockLevel: 10,
  ...overrides,
});

/**
 * Create a sample customer directly in DB.
 */
const createCustomer = (overrides = {}) => Customer.create({
  name:   'Test Customer',
  mobile: '9876543210',
  city:   'Delhi',
  state:  'Delhi',
  ...overrides,
});

/**
 * Seed shop settings.
 */
const seedSettings = () => Settings.create({
  shopName:  'Test Shop',
  ownerName: 'Test Owner',
  mobile:    '9999999999',
  gstNumber: '07AAACR5055K1Z5',
  address:   '123 Test Street',
});

module.exports = {
  createAdminAndLogin,
  createStaffAndLogin,
  createProduct,
  createCustomer,
  seedSettings,
  request: () => request(app),
};
