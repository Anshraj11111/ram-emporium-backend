# RAM EMPORIUM – API Documentation

**Base URL:** `http://localhost:5000/api/v1`  
**All protected routes require:** `Authorization: Bearer <accessToken>`  
**All responses follow the envelope:**
```json
{ "success": true, "message": "...", "data": { ... } }
{ "success": false, "error": { "code": "...", "message": "...", "errors": [] } }
```

---

## 🔐 AUTH  `/api/v1/auth`

| Method | Endpoint | Auth | Body | Description |
|--------|----------|------|------|-------------|
| POST | `/register` | ❌ | `{name, email, password, role?}` | Register new user |
| POST | `/verify-email` | ❌ | `{email, otp}` | Verify email with OTP |
| POST | `/resend-otp` | ❌ | `{email}` | Resend verification OTP |
| POST | `/login` | ❌ | `{email, password}` | Login (rate limited: 5/15min) |
| POST | `/refresh-token` | ❌ | `{refreshToken}` | Get new access token |
| POST | `/forgot-password` | ❌ | `{email}` | Send password reset OTP |
| POST | `/reset-password` | ❌ | `{email, otp, newPassword}` | Reset password |
| POST | `/logout` | ✅ | — | Logout (invalidates refresh token) |
| POST | `/change-password` | ✅ | `{currentPassword, newPassword}` | Change password |
| GET | `/me` | ✅ | — | Get logged-in user profile |

---

## 👥 USERS  `/api/v1/users`

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/` | admin | List all users (paginated) |
| GET | `/:id` | any | Get user by ID |
| PUT | `/:id` | any* | Update user profile |
| PATCH | `/:id/deactivate` | admin | Deactivate user |
| PATCH | `/:id/activate` | admin | Activate user |

---

## ⚙️ SETTINGS  `/api/v1/settings`

| Method | Endpoint | Role | Body | Description |
|--------|----------|------|------|-------------|
| GET | `/` | any | — | Get shop settings |
| PUT | `/` | admin | `{shopName, ownerName, mobile, ...}` | Save/update settings |
| POST | `/logo` | admin | `multipart: logo` | Upload shop logo |

**Settings fields:** `shopName, ownerName, mobile, email, address, city, state, pincode, gstNumber, invoicePrefix, nonGstPrefix, quotationPrefix, termsConditions, bankName, bankAccountNo, bankIfsc, upiId, currency`

---

## 👤 CUSTOMERS  `/api/v1/customers`

| Method | Endpoint | Role | Body/Query | Description |
|--------|----------|------|------------|-------------|
| GET | `/` | any | `?search=&gstOnly=&page=&limit=` | List/search customers |
| POST | `/` | any | `{name, mobile?, gstNumber?, address?, city?, state?}` | Create customer |
| GET | `/:id` | any | — | Get customer |
| PUT | `/:id` | any | same as POST | Update customer |
| DELETE | `/:id` | admin | — | Delete customer |

**Search filters:** `search` (name/mobile/GST), `gstOnly=true`

---

## 📦 PRODUCTS  `/api/v1/products`

| Method | Endpoint | Role | Body/Query | Description |
|--------|----------|------|------------|-------------|
| GET | `/search` | any | `?q=alum&limit=15` | **Autocomplete search (<100ms)** |
| GET | `/low-stock` | any | `?limit=20` | Low stock products |
| GET | `/` | any | `?search=&category=&status=&lowStock=&page=&limit=&sort=` | List products |
| POST | `/` | admin/staff | `{sku, name, sellingPrice, gstRate, ...}` | Create product |
| GET | `/:id` | any | — | Get product |
| PUT | `/:id` | admin/staff | same as POST (partial) | Update product |
| DELETE | `/:id` | admin | — | Delete product |

**Product fields:** `sku*, name*, category, unit, purchasePrice, sellingPrice*, gstRate, stockQty, location, minStockLevel, barcode, description, hsn, status`  
**GST Rates allowed:** `0, 3, 5, 12, 18, 28`

---

## 📊 STOCK  `/api/v1/stock`

| Method | Endpoint | Role | Body | Description |
|--------|----------|------|------|-------------|
| POST | `/purchase` | admin/staff | `{productId, quantity, remarks?}` | Record purchase (stock IN) |
| POST | `/adjust` | admin/staff | `{productId, quantity, remarks?}` | Manual stock adjustment |
| GET | `/ledger/:productId` | any | `?page=&limit=` | Stock ledger for a product |

> **Note:** Stock is auto-deducted when a bill is created. These endpoints are for manual entries.

---

## 📋 QUOTATIONS  `/api/v1/quotations`

| Method | Endpoint | Role | Body/Query | Description |
|--------|----------|------|------------|-------------|
| GET | `/` | any | `?search=&status=&customerId=&startDate=&endDate=&page=&limit=` | List quotations |
| POST | `/` | any | see below | Create quotation |
| GET | `/:id` | any | — | Get quotation |
| PUT | `/:id` | any | partial | Update quotation |
| DELETE | `/:id` | admin | — | Delete quotation |
| PATCH | `/:id/status` | any | `{status}` | Update status |
| POST | `/:id/duplicate` | any | — | Duplicate quotation |
| POST | `/:id/generate-pdf` | any | — | Generate & get PDF URL |
| GET | `/:id/convert-preview` | any | — | Get data for bill conversion |

**Create body:**
```json
{
  "customerId": "...",
  "items": [
    {
      "productId": "...",
      "quantity": 5,
      "rate": 100,
      "discountPercentage": 10,
      "gstRate": 18
    }
  ],
  "overallDiscount": 5,
  "notes": "...",
  "termsConditions": "...",
  "validUntil": "2026-12-31"
}
```

**Quotation Number Format:** `QT-2026-000001`  
**Status values:** `DRAFT | SENT | APPROVED | REJECTED | CONVERTED_TO_BILL`

---

## 🧾 BILLS  `/api/v1/bills`

| Method | Endpoint | Role | Body/Query | Description |
|--------|----------|------|------------|-------------|
| GET | `/` | any | `?search=&type=&customerId=&startDate=&endDate=&page=&limit=` | List bills |
| POST | `/` | any | see below | Create bill (atomic + stock deduction) |
| POST | `/convert/:quotationId` | any | `{type, paymentMode?, paidAmount?}` | **Convert quotation → bill** |
| GET | `/:id` | any | — | Get bill |
| POST | `/:id/generate-pdf` | any | — | Generate & get PDF URL |

**Create body:**
```json
{
  "type": "GST",
  "customerId": "...",
  "items": [
    {
      "productId": "...",
      "quantity": 2,
      "rate": 500,
      "discountPercentage": 0,
      "gstRate": 18
    }
  ],
  "overallDiscount": 0,
  "paymentMode": "CASH",
  "paidAmount": 1180,
  "notes": "..."
}
```

**Bill Number Formats:** `GST-2026-000001` / `NONGST-2026-000001`  
**Bill Types:** `GST | NON_GST`  
**Payment Modes:** `CASH | CARD | UPI | CREDIT | CHEQUE | NEFT | RTGS`

---

## 📈 REPORTS  `/api/v1/reports`

| Method | Endpoint | Query Params | Description |
|--------|----------|--------------|-------------|
| GET | `/daily` | `?date=2026-06-01` | Daily sales summary |
| GET | `/monthly` | `?year=2026&month=6` | Monthly day-wise sales |
| GET | `/yearly` | `?year=2026` | Yearly month-wise sales |
| GET | `/product-wise` | `?startDate=&endDate=&page=&limit=` | Product-wise sales report |
| GET | `/customer-wise` | `?startDate=&endDate=&page=&limit=` | Customer-wise sales report |
| GET | `/top-selling` | `?limit=10&startDate=&endDate=` | Top selling products |
| GET | `/low-stock` | — | Low stock report |
| GET | `/profit` | `?startDate=&endDate=` | Profit/margin report |

---

## 🏠 DASHBOARD  `/api/v1/dashboard`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Single-call dashboard summary (<500ms) |

**Response:**
```json
{
  "totalSalesToday": 15000,
  "totalBillsToday": 8,
  "totalSalesThisMonth": 250000,
  "totalBillsThisMonth": 120,
  "totalBills": 5000,
  "totalProducts": 2000,
  "totalCustomers": 350,
  "lowStockCount": 5,
  "lowStockProducts": [...],
  "recentBills": [...],
  "topSellingProducts": [...]
}
```

---

## 🔔 NOTIFICATIONS  `/api/v1/notifications`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get notifications for logged-in user |
| PATCH | `/:id/read` | Mark one as read |
| PATCH | `/read-all` | Mark all as read |

---

## 📐 Calculation Logic

```
Item Calculation:
  discountAmount  = rate × discountPercentage / 100
  finalRate       = rate − discountAmount
  taxableAmount   = finalRate × quantity
  gstAmount       = taxableAmount × gstRate / 100
  totalAmount     = taxableAmount + gstAmount

Bill Totals:
  subtotal                = Σ taxableAmount
  overallDiscountAmount   = subtotal × overallDiscount / 100
  taxableAfterDiscount    = subtotal − overallDiscountAmount
  gstAmount               = Σ item.gstAmount
  grandTotal (pre-round)  = taxableAfterDiscount + gstAmount
  roundOff                = round(grandTotal) − grandTotal
  grandTotal (final)      = Math.round(grandTotal)
```

---

## 🔒 Password Requirements
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 number

## 📄 PDF Storage
PDFs are stored at `public/pdfs/` and served at `GET /pdfs/<type>/<filename>`.  
`pdfUrl` is stored in the bill/quotation document after generation.
