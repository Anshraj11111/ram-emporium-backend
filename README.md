# 🏪 RAM EMPORIUM
### Billing, Quotation, Inventory & Stock Management System
**Backend API — Node.js + Express.js + MongoDB**

---

## 📁 Project Structure

```
src/
├── config/          # env, database, mailer, seed
├── constants/       # roles, types, enums
├── middleware/       # auth, authorize, validate, rateLimiter, upload, errorHandler
├── validators/      # Zod schemas for every module
├── utils/           # ApiError, ApiResponse, asyncHandler, helpers, pdfGenerator, logger
├── routes/          # Master router (index.js)
└── modules/
    ├── auth/        # Login, Register, OTP, JWT, Refresh Tokens
    ├── users/       # User management (admin)
    ├── settings/    # Shop settings + logo upload
    ├── customers/   # Customer CRUD + search
    ├── products/    # Product CRUD + autocomplete search
    ├── stock/       # Stock ledger, purchase, adjustment, counters
    ├── quotations/  # Quotation lifecycle + PDF
    ├── billing/     # GST/Non-GST bills + atomic stock deduction + PDF
    ├── reports/     # Daily/monthly/yearly/product/customer reports
    ├── dashboard/   # Single aggregated dashboard API
    └── notifications/ # Low-stock & system alerts
```

---

## ⚡ Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Fill in MONGO_URI, JWT secrets, email credentials
```

### 3. Seed the database
```bash
npm run seed
# Creates: admin user, shop settings, 10 sample products, 3 customers
# Admin credentials: admin@ramemporium.com / Admin@12345
```

### 4. Start the server
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

### 5. Health check
```
GET http://localhost:5000/health
```

---

## 🔑 Key Features

| Feature | Detail |
|---------|--------|
| Auth | JWT access tokens (15m) + Refresh tokens (7d) + OTP email verification |
| Serial Numbers | Atomic counters — `GST-2026-000001`, `QT-2026-000001` |
| Quotation→Bill | One-click conversion, auto-fills all data |
| Stock | Automatic deduction on billing via MongoDB transactions |
| PDF | Professional A4 PDFs for bills and quotations (PDFKit) |
| Search | Autocomplete product search < 100ms (regex + MongoDB indexes) |
| Dashboard | Single API call with aggregation pipeline < 500ms |
| Low Stock | Auto notification when stock < minStockLevel |
| Security | Helmet, CORS, Rate Limiting, Mongo Sanitize, HPP, bcrypt |
| Logging | Winston daily-rotate logs (combined + error + exceptions) |
| Validation | Zod on every request body, query, and params |

---

## 🌐 API Endpoints Summary

| Module | Base Path |
|--------|-----------|
| Auth | `POST /api/v1/auth/login` |
| Dashboard | `GET /api/v1/dashboard` |
| Products | `GET /api/v1/products/search?q=alum` |
| Customers | `GET /api/v1/customers?search=ram` |
| Quotations | `POST /api/v1/quotations` |
| Bills | `POST /api/v1/bills` |
| Convert | `POST /api/v1/bills/convert/:quotationId` |
| Stock | `POST /api/v1/stock/purchase` |
| Reports | `GET /api/v1/reports/daily` |

See **[API_DOCS.md](./API_DOCS.md)** for complete documentation.

---

## 🗄️ MongoDB Indexes

| Collection | Index |
|-----------|-------|
| products | `name (text), sku (text), barcode (text)` — compound text index |
| products | `sku (unique), barcode (sparse), category, status, stockQty` |
| customers | `name (text), mobile, gstNumber (sparse)` |
| bills | `billNo (unique), createdAt, customerId, type` |
| quotations | `quotationNo (unique), createdAt, status, customerId` |
| stockLedger | `productId + createdAt, referenceId` |
| users | `email (unique)` |

---

## 🔐 Roles & Permissions

| Action | Admin | Staff |
|--------|-------|-------|
| Create/Edit Product | ✅ | ✅ |
| Delete Product | ✅ | ❌ |
| Create Bill/Quotation | ✅ | ✅ |
| Stock Adjustment | ✅ | ✅ |
| Change User Roles | ✅ | ❌ |
| Shop Settings | ✅ | ❌ |
| View Reports | ✅ | ✅ |

---

## 📦 Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Express.js 4
- **Database:** MongoDB Atlas (Mongoose 8)
- **Auth:** JWT + bcryptjs
- **Validation:** Zod
- **PDF:** PDFKit
- **Email:** Nodemailer
- **Logging:** Winston + daily-rotate-file
- **Security:** Helmet, express-mongo-sanitize, HPP, express-rate-limit, CORS

---

## 🚀 Deployment (Render / Railway / VPS)

1. Set all environment variables from `.env.example`
2. Set `NODE_ENV=production`
3. `npm start`
4. Point MongoDB to Atlas cluster URI
5. Ensure `PDF_STORAGE_PATH` is a persistent volume path

---

## 📈 Performance Targets

| Operation | Target | Approach |
|-----------|--------|----------|
| Product Search | < 100ms | Text index + regex + lean() |
| Bill Creation | < 500ms | Atomic transaction, lean queries |
| Quotation Save | < 300ms | Optimised pipeline |
| Dashboard | < 500ms | Single aggregation, Promise.all |

---

## 🔮 Future-Ready

- Multi-store support (add `storeId` field to all models)
- Barcode scanning (barcode field & index already present)
- Thermal printer (bill data structure is printer-friendly)
- WhatsApp invoice sharing (pdfUrl available on every bill)
