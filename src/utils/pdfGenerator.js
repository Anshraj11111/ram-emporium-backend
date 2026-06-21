'use strict';
const PDFDocument   = require('pdfkit');
const QRCode        = require('qrcode');
const fs            = require('fs');
const path          = require('path');
const env           = require('../config/env');
const { randomHex } = require('./helpers');

const PDF_BASE = path.resolve(__dirname, '../../', env.PDF_STORAGE_PATH.replace('./', ''));

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const safeNum = (n) => Number(n) || 0;
const fmt     = (n) => `Rs.${safeNum(n).toFixed(2)}`;
const trunc   = (s, len = 35) => String(s || '').substring(0, len);

// ─── Page layout constants ────────────────────────────────────────────────────
const PAGE_W        = 595.28;   // A4 width  in pts
const PAGE_H        = 841.89;   // A4 height in pts
const MARGIN        = 30;
const CONTENT_W     = PAGE_W - MARGIN * 2;  // 535.28

// Header block: dark band (75pt) + blue title band (20pt) = 95pt + top margin 30 = starts content at y=138
const HEADER_H      = 108;   // total header height (both bands)
const HEADER_TOP    = MARGIN; // 30
const CONTENT_TOP   = HEADER_TOP + HEADER_H + 2;  // 140 — first content line after header

// Footer strip height
const FOOTER_H      = 18;
const FOOTER_Y      = PAGE_H - MARGIN - FOOTER_H; // ~793

// Usable content area per page (between header bottom and footer top)
const BODY_TOP      = CONTENT_TOP;   // 140
const BODY_BOTTOM   = FOOTER_Y - 4;  // ~789

const C = {
  header : '#1E3A5F',
  accent : '#2563EB',
  white  : '#FFFFFF',
  light  : '#F8FAFC',
  border : '#CBD5E1',
  text   : '#1E293B',
  sub    : '#64748B',
  red    : '#DC2626',
  green  : '#16A34A',
};

// ── Generate UPI QR PNG buffer ────────────────────────────────────────────────
async function generateUpiQrBuffer(upiId, name, amount, note) {
  if (!upiId) return null;
  try {
    const upiLink = amount > 0
      ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name || 'RAM EMPORIUM')}&am=${safeNum(amount).toFixed(2)}&cu=INR&tn=${encodeURIComponent(note || 'Payment')}`
      : `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name || 'RAM EMPORIUM')}&cu=INR`;
    return await QRCode.toBuffer(upiLink, {
      type: 'png', width: 120, margin: 1,
      color: { dark: '#1E293B', light: '#F8FAFC' },
      errorCorrectionLevel: 'M',
    });
  } catch { return null; }
}

// ─── Draw the full header on whatever page is current ────────────────────────
// Returns nothing — header is always at fixed coordinates (top of page)
function stampHeader(doc, settings, title) {
  const x = MARGIN;
  const y = HEADER_TOP;

  // Dark shop-info band
  doc.rect(x, y, CONTENT_W, 78).fill(C.header);
  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(16)
     .text(settings.shopName || 'RAM EMPORIUM', x + 15, y + 12, { width: 400 });

  doc.font('Helvetica').fontSize(8.5).fillColor('#93C5FD');
  let hy = y + 34;
  const infoLines = [
    settings.address,
    [settings.mobile, settings.email].filter(Boolean).join('  |  '),
    settings.gstNumber ? `GSTIN: ${settings.gstNumber}` : null,
  ].filter(Boolean);
  for (const l of infoLines) { doc.text(l, x + 15, hy, { width: 400 }); hy += 11; }

  // Blue title band
  doc.rect(x, y + 80, CONTENT_W, 22).fill(C.accent);
  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(10)
     .text(title, x, y + 85, { width: CONTENT_W, align: 'center' });

  doc.fillColor(C.text);
}

// ─── Draw the footer strip on whatever page is current ───────────────────────
function stampFooter(doc, settings, title, pageNum, totalPages) {
  const label = totalPages > 1
    ? `${settings.shopName || 'RAM EMPORIUM'}  |  ${title}  |  Page ${pageNum} of ${totalPages}`
    : `${settings.shopName || 'RAM EMPORIUM'}  |  ${title}`;

  // Thin separator line
  doc.moveTo(MARGIN, FOOTER_Y - 2).lineTo(MARGIN + CONTENT_W, FOOTER_Y - 2)
     .strokeColor(C.border).lineWidth(0.5).stroke();

  doc.font('Helvetica').fontSize(7).fillColor('#94a3b8')
     .text(label, MARGIN, FOOTER_Y + 2, { width: CONTENT_W, align: 'center' });
}

// ─── Info boxes (invoice meta + customer) ─────────────────────────────────────
function drawInfoSection(doc, leftLines, rightLines, y) {
  const rows = Math.max(leftLines.length, rightLines.length);
  const h    = rows * 14 + 18;
  doc.rect(MARGIN, y, 265, h).fillAndStroke(C.light, C.border);
  doc.rect(MARGIN + 290, y, 265, h).fillAndStroke(C.light, C.border);
  let ly = y + 9;
  for (const row of leftLines) {
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.sub)
       .text(row.label, MARGIN + 8, ly, { continued: true })
       .font('Helvetica').fillColor(C.text).text(` ${row.value || '-'}`);
    ly += 14;
  }
  let ry = y + 9;
  for (const row of rightLines) {
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.sub)
       .text(row.label, MARGIN + 298, ry, { continued: true })
       .font('Helvetica').fillColor(C.text).text(` ${row.value || '-'}`);
    ry += 14;
  }
  return y + h + 8;
}

// ─── Table column header ──────────────────────────────────────────────────────
function drawTableHeader(doc, y, isGst) {
  doc.rect(MARGIN, y, CONTENT_W, 17).fill(C.header);
  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(7.5);
  doc.text('#',           MARGIN + 5,  y + 5, { width: 20 });
  doc.text('DESCRIPTION', MARGIN + 28, y + 5, { width: 155 });
  doc.text('QTY',         MARGIN + 190, y + 5, { width: 45,  align: 'right' });
  doc.text('RATE',        MARGIN + 240, y + 5, { width: 55,  align: 'right' });
  doc.text('DISC%',       MARGIN + 300, y + 5, { width: 40,  align: 'right' });
  if (isGst) {
    doc.text('CGST%',     MARGIN + 345, y + 5, { width: 38,  align: 'right' });
    doc.text('SGST%',     MARGIN + 388, y + 5, { width: 38,  align: 'right' });
    doc.text('AMOUNT',    MARGIN + 430, y + 5, { width: 100, align: 'right' });
  } else {
    doc.text('AMOUNT',    MARGIN + 345, y + 5, { width: 185, align: 'right' });
  }
  return y + 17;
}

// ─── Draw all items, adding pages as needed ───────────────────────────────────
// Each new page gets header+table-header automatically; footer is stamped in post-pass
function drawItems(doc, items, startY, isGst) {
  let y    = startY;
  let flip = false;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const rowH = 15;

    // Need a new page?
    if (y + rowH > BODY_BOTTOM) {
      doc.addPage();
      y = BODY_TOP;
      y = drawTableHeader(doc, y, isGst);
    }

    if (flip) doc.rect(MARGIN, y, CONTENT_W, rowH).fill('#F1F5F9');
    flip = !flip;

    const cgst = safeNum(item.gstRate) / 2;
    const sgst = safeNum(item.gstRate) / 2;

    doc.fillColor(C.text).font('Helvetica').fontSize(8);
    doc.text(String(i + 1),                               MARGIN + 5,   y + 3, { width: 20 });
    doc.text(trunc(item.productName),                     MARGIN + 28,  y + 3, { width: 155 });
    doc.text(`${safeNum(item.quantity)} ${item.unit||''}`,MARGIN + 190, y + 3, { width: 45,  align: 'right' });
    doc.text(fmt(item.rate),                              MARGIN + 240, y + 3, { width: 55,  align: 'right' });
    doc.text(`${safeNum(item.discountPercentage)}%`,      MARGIN + 300, y + 3, { width: 40,  align: 'right' });
    if (isGst) {
      doc.text(`${cgst}%`,             MARGIN + 345, y + 3, { width: 38,  align: 'right' });
      doc.text(`${sgst}%`,             MARGIN + 388, y + 3, { width: 38,  align: 'right' });
      doc.text(fmt(item.totalAmount),  MARGIN + 430, y + 3, { width: 100, align: 'right' });
    } else {
      doc.text(fmt(item.totalAmount),  MARGIN + 345, y + 3, { width: 185, align: 'right' });
    }
    y += rowH;
  }

  // Bottom border of table
  doc.moveTo(MARGIN, y).lineTo(MARGIN + CONTENT_W, y)
     .strokeColor(C.border).lineWidth(0.5).stroke();
  return y + 6;
}

// ─── Totals block ─────────────────────────────────────────────────────────────
function drawTotals(doc, bill, y, isBill) {
  const isGst = !isBill || bill.type === 'GST';
  const rows  = [{ label: 'Subtotal', value: fmt(bill.subtotal) }];

  if (safeNum(bill.overallDiscountAmount) > 0)
    rows.push({ label: `Discount (${safeNum(bill.overallDiscount)}%)`, value: `-${fmt(bill.overallDiscountAmount)}`, red: true });

  if (isGst && safeNum(bill.gstAmount) > 0) {
    const half = Math.round((safeNum(bill.gstAmount) / 2) * 100) / 100;
    rows.push({ label: 'CGST', value: fmt(half) });
    rows.push({ label: 'SGST', value: fmt(half) });
  } else if (!isGst && safeNum(bill.gstAmount) > 0) {
    rows.push({ label: 'GST Amount', value: fmt(bill.gstAmount) });
  }

  if (safeNum(bill.roundOff) !== 0 && bill.roundOff != null)
    rows.push({ label: 'Round Off', value: fmt(bill.roundOff) });

  let ty = y;
  doc.font('Helvetica').fontSize(9);
  for (const row of rows) {
    doc.fillColor(row.red ? C.red : C.sub)
       .text(row.label, MARGIN + 320, ty, { width: 150, align: 'right' });
    doc.fillColor(row.red ? C.red : C.text)
       .text(row.value, MARGIN + 475, ty, { width: 60,  align: 'right' });
    ty += 15;
  }

  ty += 3;
  doc.rect(MARGIN + 310, ty, 225, 22).fill(C.header);
  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(10)
     .text('GRAND TOTAL',     MARGIN + 315, ty + 6, { width: 130, align: 'right' })
     .text(fmt(bill.grandTotal), MARGIN + 450, ty + 6, { width: 80,  align: 'right' });
  ty += 28;

  doc.fillColor(C.sub).font('Helvetica').fontSize(8.5);
  if (bill.paidAmount !== undefined)
    doc.text(`Paid: ${fmt(bill.paidAmount)}`, MARGIN + 310, ty, { width: 225, align: 'right' });
  if (safeNum(bill.dueAmount) > 0) {
    ty += 13;
    doc.fillColor(C.red)
       .text(`Due: ${fmt(bill.dueAmount)}`, MARGIN + 310, ty, { width: 225, align: 'right' });
  }
  return ty + 20;
}

// ─── UPI + bank details block ─────────────────────────────────────────────────
function drawUpiBlock(doc, settings, amount, y) {
  const boxH = 110;
  doc.rect(MARGIN, y, CONTENT_W, boxH).fillAndStroke('#F0F4FF', C.border);
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.accent)
     .text('PAYMENT VIA UPI', MARGIN + 8, y + 8);
  doc.font('Helvetica').fontSize(8).fillColor(C.sub)
     .text(`UPI ID: ${settings.upiId}`, MARGIN + 8, y + 22);

  let bx = y + 36;
  if (settings.bankName)      { doc.text(`Bank: ${settings.bankName}`,       MARGIN + 8, bx); bx += 11; }
  if (settings.bankAccountNo) { doc.text(`A/C No: ${settings.bankAccountNo}`, MARGIN + 8, bx); bx += 11; }
  if (settings.bankIfsc)      { doc.text(`IFSC: ${settings.bankIfsc}`,        MARGIN + 8, bx); }

  doc.font('Helvetica-Bold').fontSize(10).fillColor(C.green)
     .text(`Amount: ${fmt(amount)}`, MARGIN + 8, y + boxH - 22);

  // QR box placeholder (image drawn after async QR generation)
  doc.rect(MARGIN + CONTENT_W - 105, y + 8, 95, 95).fillAndStroke('#FFFFFF', C.border);
  return {
    qrX:   MARGIN + CONTENT_W - 104,
    qrY:   y + 9,
    qrSize: 93,
    nextY:  y + boxH + 8,
  };
}

// ─── Terms + authorised signatory ────────────────────────────────────────────
function drawTermsAndSignature(doc, settings, y) {
  if (settings.termsConditions) {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.accent)
       .text('Terms & Conditions:', MARGIN + 5, y);
    y += 12;
    doc.font('Helvetica').fontSize(7.5).fillColor(C.sub)
       .text(settings.termsConditions, MARGIN + 5, y, { width: 300 });
  }

  // Signature on the right side
  const sigX = MARGIN + CONTENT_W - 165;
  const sigY = y + 5;

  if (settings.signature) {
    try {
      if (settings.signature.startsWith('data:')) {
        const buf = Buffer.from(settings.signature.split(',')[1], 'base64');
        doc.image(buf, sigX, sigY, { width: 160, height: 42, fit: [160, 42] });
      } else if (fs.existsSync(settings.signature)) {
        doc.image(settings.signature, sigX, sigY, { width: 160, height: 42, fit: [160, 42] });
      }
    } catch { /* ignore bad image */ }
  }

  const lineY = sigY + 50;
  doc.font('Helvetica').fontSize(8).fillColor(C.text)
     .text('Authorised Signatory', sigX, lineY, { width: 160, align: 'center' });
  doc.moveTo(sigX - 5, lineY + 14).lineTo(sigX + 165, lineY + 14)
     .strokeColor(C.border).lineWidth(0.5).stroke();
  doc.font('Helvetica').fontSize(7.5).fillColor(C.sub)
     .text(settings.shopName || 'RAM EMPORIUM', sigX, lineY + 17, { width: 160, align: 'center' });
}

// ─── Main PDF builder ─────────────────────────────────────────────────────────
async function buildPDFDocAsync(type, doc, data, settings) {
  const isGst  = type === 'bill' ? data.type === 'GST' : true;
  const isBill = type === 'bill';
  const title  = isBill
    ? (isGst ? `TAX INVOICE  –  ${data.billNo}` : `INVOICE  –  ${data.billNo}`)
    : `QUOTATION  –  ${data.quotationNo}`;

  const snap = data.customerSnapshot || {};

  // ── 1. Invoice meta + customer info ──────────────────────────────────────
  let y = BODY_TOP;

  const leftLines = isBill ? [
    { label: 'Invoice No:', value: data.billNo },
    { label: 'Date:',       value: data.createdAt ? new Date(data.createdAt).toLocaleDateString('en-IN') : '-' },
    { label: 'Payment:',    value: data.paymentMode || '-' },
    { label: 'Type:',       value: data.type },
  ] : [
    { label: 'Quotation No:', value: data.quotationNo },
    { label: 'Date:',         value: data.createdAt ? new Date(data.createdAt).toLocaleDateString('en-IN') : '-' },
    { label: 'Valid Until:',  value: data.validUntil ? new Date(data.validUntil).toLocaleDateString('en-IN') : '-' },
    { label: 'Status:',       value: data.status },
  ];

  const rightLines = [
    { label: 'To:',      value: snap.name    || 'Walk-in Customer' },
    { label: 'Mobile:',  value: snap.mobile  || '-' },
    { label: 'Address:', value: snap.address || '-' },
    ...(isGst && snap.gstNumber ? [{ label: 'GSTIN:', value: snap.gstNumber }] : []),
  ];

  y = drawInfoSection(doc, leftLines, rightLines, y);
  y = drawTableHeader(doc, y, isGst);

  // ── 2. Items (adds pages automatically if needed) ────────────────────────
  y = drawItems(doc, data.items || [], y, isGst);

  // ── 3. Totals ─────────────────────────────────────────────────────────────
  const totalsH = 120; // safe fixed estimate: subtotal + gst rows + grand total + paid/due

  if (y + totalsH > BODY_BOTTOM) {
    doc.addPage();
    y = BODY_TOP;
  }
  y = drawTotals(doc, data, y + 8, isBill);

  // ── 4. UPI / payment section ──────────────────────────────────────────────
  if (isBill && settings.upiId) {
    const payAmount = safeNum(data.dueAmount) > 0 ? data.dueAmount : data.grandTotal;

    if (y + 118 > BODY_BOTTOM) {
      doc.addPage();
      y = BODY_TOP;
    }

    const upiResult = drawUpiBlock(doc, settings, payAmount, y);
    const qrBuffer  = await generateUpiQrBuffer(
      settings.upiId, settings.shopName, payAmount, `Payment for ${data.billNo || data.quotationNo}`
    );
    if (qrBuffer && upiResult.qrX) {
      doc.image(qrBuffer, upiResult.qrX, upiResult.qrY, {
        width: upiResult.qrSize, height: upiResult.qrSize,
      });
    }
    y = upiResult.nextY;
  }

  // ── 5. Terms & Signature ──────────────────────────────────────────────────
  const termsH = 90 + (settings.termsConditions ? 40 : 0);
  if (y + termsH > BODY_BOTTOM) {
    doc.addPage();
    y = BODY_TOP;
  }
  drawTermsAndSignature(doc, settings, y + 8);

  // ── 6. Stamp header + footer on EVERY page (post-pass) ───────────────────
  // bufferPages:true lets us do this cleanly
  const range      = doc.bufferedPageRange();
  const totalPages = range.count;

  for (let i = 0; i < totalPages; i++) {
    doc.switchToPage(range.start + i);
    stampHeader(doc, settings, title);
    stampFooter(doc, settings, title, i + 1, totalPages);
  }
}

// ═══════════════════════════════════════════════════
// Stream PDF directly to HTTP response
// ═══════════════════════════════════════════════════
const streamBillPDF = (bill, settings, res) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc      = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
      const filename = `${String(bill.billNo || 'BILL').replace(/[^a-zA-Z0-9-_]/g, '-')}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.on('error', reject);

      doc.pipe(res);
      await buildPDFDocAsync('bill', doc, bill, settings || {});
      doc.flushPages();
      doc.end();
      resolve();
    } catch (err) {
      reject(err);
    }
  });
};

const streamQuotationPDF = (quotation, settings, res) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc      = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
      const filename = `${String(quotation.quotationNo || 'QT').replace(/[^a-zA-Z0-9-_]/g, '-')}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.on('error', reject);

      doc.pipe(res);
      await buildPDFDocAsync('quotation', doc, quotation, settings || {});
      doc.flushPages();
      doc.end();
      resolve();
    } catch (err) {
      reject(err);
    }
  });
};

// ═══════════════════════════════════════════════════
// Save to disk (local dev / billing module)
// ═══════════════════════════════════════════════════
const generateBillPDF = async (bill, settings = {}) => {
  const isGst  = bill.type === 'GST';
  const subDir = isGst ? 'gst-bills' : 'nongst-bills';
  const dir    = path.join(PDF_BASE, subDir);
  ensureDir(dir);
  const safeBillNo = String(bill.billNo || 'BILL').replace(/[^a-zA-Z0-9-_]/g, '-');
  const filename   = `${safeBillNo}-${randomHex(4)}.pdf`;
  const filepath   = path.join(dir, filename);
  const pdfUrl     = `${env.PDF_BASE_URL}/${subDir}/${filename}`;

  const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
  const out  = fs.createWriteStream(filepath);
  doc.pipe(out);
  await buildPDFDocAsync('bill', doc, bill, settings);
  doc.flushPages();
  doc.end();
  return new Promise((resolve, reject) => {
    out.on('finish', () => resolve(pdfUrl));
    out.on('error',  reject);
  });
};

const generateQuotationPDF = async (quotation, settings = {}) => {
  const dir = path.join(PDF_BASE, 'quotations');
  ensureDir(dir);
  const safeNo   = String(quotation.quotationNo || 'QT').replace(/[^a-zA-Z0-9-_]/g, '-');
  const filename = `${safeNo}-${randomHex(4)}.pdf`;
  const filepath = path.join(dir, filename);
  const pdfUrl   = `${env.PDF_BASE_URL}/quotations/${filename}`;

  const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
  const out  = fs.createWriteStream(filepath);
  doc.pipe(out);
  await buildPDFDocAsync('quotation', doc, quotation, settings);
  doc.flushPages();
  doc.end();
  return new Promise((resolve, reject) => {
    out.on('finish', () => resolve(pdfUrl));
    out.on('error',  reject);
  });
};

module.exports = {
  generateBillPDF,
  generateQuotationPDF,
  streamBillPDF,
  streamQuotationPDF,
};
