'use strict';
/**
 * Database Seed Script
 * Usage: node src/config/seed.js
 *
 * Seeds:
 *  - 1 Admin user
 *  - Shop settings
 *  - Sample categories / products
 */
require('dotenv').config();
const mongoose  = require('mongoose');
const bcrypt    = require('bcryptjs');
const env       = require('./env');

// Models
const User     = require('../modules/users/user.model');
const Settings = require('../modules/settings/settings.model');
const Product  = require('../modules/products/product.model');
const Customer = require('../modules/customers/customer.model');

const seed = async () => {
  await mongoose.connect(env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // ── Admin user ──────────────────────────────────
  const existingAdmin = await User.findOne({ email: 'admin@ramemporium.com' });
  if (!existingAdmin) {
    // Insert directly via collection to avoid double-hashing from pre-save hook
    const hashedPwd = await bcrypt.hash('Admin@12345', env.BCRYPT_SALT_ROUNDS);
    await mongoose.connection.collection('users').insertOne({
      name:       'Admin User',
      email:      'admin@ramemporium.com',
      password:   hashedPwd,
      role:       'admin',
      isVerified: true,
      isActive:   true,
      createdAt:  new Date(),
      updatedAt:  new Date(),
    });
    console.log('✅ Admin user created  →  admin@ramemporium.com  /  Admin@12345');
  } else {
    console.log('ℹ️  Admin user already exists');
  }

  // ── Shop settings ────────────────────────────────
  const existingSettings = await Settings.findOne();
  if (!existingSettings) {
    await Settings.create({
      shopName:        'RAM EMPORIUM',
      ownerName:       'Ram Kumar',
      mobile:          '9876543210',
      email:           'info@ramemporium.com',
      address:         '123, Main Market, Near Clock Tower',
      city:            'Delhi',
      state:           'Delhi',
      pincode:         '110001',
      gstNumber:       '07AAACR5055K1Z5',
      invoicePrefix:   'GST',
      nonGstPrefix:    'NONGST',
      quotationPrefix: 'QT',
      termsConditions: 'Goods once sold will not be taken back.\nAll disputes subject to Delhi jurisdiction.',
      currency:        'INR',
    });
    console.log('✅ Shop settings created');
  } else {
    console.log('ℹ️  Settings already exist');
  }

  // ── Sample customers ─────────────────────────────
  const custCount = await Customer.countDocuments();
  if (custCount === 0) {
    await Customer.insertMany([
      { name: 'Walk-in Customer', mobile: '9999999999', city: 'Delhi', state: 'Delhi' },
      { name: 'Ramesh Traders', mobile: '9876500001', gstNumber: '07AAACR5055K1Z5', city: 'Delhi', state: 'Delhi' },
      { name: 'Suresh Hardware', mobile: '9876500002', city: 'Mumbai', state: 'Maharashtra' },
    ]);
    console.log('✅ Sample customers created');
  }

  // ── Sample products ──────────────────────────────
  const prodCount = await Product.countDocuments();
  if (prodCount === 0) {
    await Product.insertMany([
      { sku: 'ALMPIPE-01', name: 'Aluminium Pipe 1 inch', category: 'Aluminium', unit: 'MTR', purchasePrice: 80,  sellingPrice: 110, gstRate: 18, stockQty: 500, minStockLevel: 50 },
      { sku: 'ALMPIPE-02', name: 'Aluminium Pipe 2 inch', category: 'Aluminium', unit: 'MTR', purchasePrice: 150, sellingPrice: 200, gstRate: 18, stockQty: 300, minStockLevel: 30 },
      { sku: 'ACRSHEET-01',name: 'Acrylic Sheet 4x8 ft',  category: 'Acrylic',   unit: 'PCS', purchasePrice: 600, sellingPrice: 850, gstRate: 18, stockQty: 50,  minStockLevel: 10 },
      { sku: 'ANGLE-01',   name: 'Angle 1x1 inch',        category: 'Steel',     unit: 'MTR', purchasePrice: 60,  sellingPrice: 85,  gstRate: 18, stockQty: 800, minStockLevel: 100 },
      { sku: 'ALMIRAH-01', name: 'Steel Almirah 3-Door',  category: 'Furniture', unit: 'PCS', purchasePrice: 4500,sellingPrice: 6000,gstRate: 18, stockQty: 15,  minStockLevel: 3 },
      { sku: 'BOLT-M10',   name: 'Bolt M10 x 50mm',       category: 'Fasteners', unit: 'PCS', purchasePrice: 2,   sellingPrice: 5,   gstRate: 18, stockQty: 5000,minStockLevel: 500 },
      { sku: 'NUT-M10',    name: 'Nut M10',               category: 'Fasteners', unit: 'PCS', purchasePrice: 1.5, sellingPrice: 4,   gstRate: 18, stockQty: 5000,minStockLevel: 500 },
      { sku: 'PIPE-PVC-1', name: 'PVC Pipe 1 inch',       category: 'PVC',       unit: 'MTR', purchasePrice: 40,  sellingPrice: 60,  gstRate: 12, stockQty: 200, minStockLevel: 20 },
      { sku: 'WIRE-2.5',   name: 'Electric Wire 2.5mm',   category: 'Electrical',unit: 'MTR', purchasePrice: 18,  sellingPrice: 28,  gstRate: 18, stockQty: 1000,minStockLevel: 100 },
      { sku: 'SWITCH-01',  name: 'Modular Switch 6A',     category: 'Electrical',unit: 'PCS', purchasePrice: 25,  sellingPrice: 45,  gstRate: 18, stockQty: 200, minStockLevel: 20 },
    ]);
    console.log('✅ 10 sample products created');
  } else {
    console.log(`ℹ️  ${prodCount} products already exist`);
  }

  console.log('\n🎉 Seed complete!\n');
  await mongoose.connection.close();
  process.exit(0);
};

seed().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
