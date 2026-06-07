'use strict';
const PDFDocument = require('pdfkit');
const fs          = require('fs');
const path        = require('path');
const env         = require('../config/env');
const { randomHex } = require('./helpers');

const PDF_BASE = path.resolve(__dirname, '../../', env.PDF_STORAGE_PATH.replace('./', ''));

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const safeNum = (n) => Number(n) || 0;
const fmt     = (n) => `Rs.${safeNum(n).toFixed(2)}`;
const trunc   = (s, len = 35) => String(s || '').substring(0, len);

const C = {
  header: '#1E3A5F', accent: '#2563EB', white: '#FFFFFF',
  light: '#F8FAFC', border: '#CBD5E1', text: '#1E293B',
  sub: '#64748B', red: '#DC2626',
};

function drawHeader(doc, settings, title) {
  doc.rect(30, 30, 555, 75).fill(C.header);
  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(16)
     .text(settings.shopName || 'RAM EMPORIUM', 45, 42, { width: 400 });
  doc.font('Helvetica').fontSize(8.5).fillColor('#93C5FD');
  let hy = 62;
  const lines = [
    settings.address,
    [settings.mobile, settings.email].filter(Boolean).join('  |  '),
    settings.gstNumber ? `GSTIN: ${settings.gstNumber}` : null,
  ].filter(Boolean);
  for (const l of lines) { doc.text(l, 45, hy, { width: 400 }); hy += 11; }
  doc.rect(30, 110, 555, 20).fill(C.accent);
  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(10)
     .text(title, 30, 114, { width: 555, align: 'center' });
  doc.fillColor(C.text);
  return 138;
}

function drawInfoSection(doc, leftLines, rightLines, y) {
  const rows = Math.max(leftLines.length, rightLines.length);
  const h    = rows * 14 + 18;
  doc.rect(30,  y, 265, h).fillAndStroke(C.light, C.border);
  doc.rect(320, y, 265, h).fillAndStroke(C.light, C.border);
  doc.font('Helvetica').fontSize(8.5).fillColor(C.text);
  let ly = y + 9;
  for (const row of leftLines) {
    doc.font('Helvetica-Bold').fillColor(C.sub).text(row.label, 38, ly, { continued: true })
       .font('Helvetica').fillColor(C.text).text(` ${row.value || '-'}`);
    ly += 14;
  }
  let ry = y + 9;
  for (const row of rightLines) {
    doc.font('Helvetica-Bold').fillColor(C.sub).text(row.label, 328, ry, { continued: true })
       .font('Helvetica').fillColor(C.text).text(` ${row.value || '-'}`);
    ry += 14;
  }
  return y + h + 8;
}

function drawTableHeader(doc, y, isGst) {
  doc.rect(30, y, 555, 17).fill(C.header);
  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(7.5);
  doc.text('#',           35,  y + 5, { width: 20 });
  doc.text('DESCRIPTION', 58,  y + 5, { width: 160 });
  doc.text('QTY',         225, y + 5, { width: 50,  align: 'right' });
  doc.text('RATE',        280, y + 5, { width: 60,  align: 'right' });
  doc.text('DISC%',       345, y + 5, { width: 45,  align: 'right' });
  if (isGst) doc.text('GST%', 395, y + 5, { width: 40, align: 'right' });
  doc.text('AMOUNT',      440, y + 5, { width: 140, align: 'right' });
  return y + 17;
}

function drawItems(doc, items, startY, isGst) {
  let y = startY, flip = false;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const rowH = 15;
    if (y + rowH > 760) { doc.addPage(); y = 40; y = drawTableHeader(doc, y, isGst); }
    if (flip) doc.rect(30, y, 555, rowH).fill('#F1F5F9');
    flip = !flip;
    doc.fillColor(C.text).font('Helvetica').fontSize(8);
    doc.text(String(i + 1),                          35,  y + 3, { width: 20 });
    doc.text(trunc(item.productName),                58,  y + 3, { width: 160 });
    doc.text(`${safeNum(item.quantity)} ${item.unit || ''}`, 225, y + 3, { width: 50,  align: 'right' });
    doc.text(fmt(item.rate),                         280, y + 3, { width: 60,  align: 'right' });
    doc.text(`${safeNum(item.discountPercentage)}%`, 345, y + 3, { width: 45,  align: 'right' });
    if (isGst) doc.text(`${safeNum(item.gstRate)}%`, 395, y + 3, { width: 40, align: 'right' });
    doc.text(fmt(item.totalAmount),                  440, y + 3, { width: 140, align: 'right' });
    y += rowH;
  }
  doc.moveTo(30, y).lineTo(585, y).strokeColor(C.border).lineWidth(0.5).stroke();
  return y + 6;
}

function drawTotals(doc, bill, y) {
  const rows = [{ label: 'Subtotal', value: fmt(bill.subtotal) }];
  if (safeNum(bill.overallDiscountAmount) > 0)
    rows.push({ label: `Discount (${safeNum(bill.overallDiscount)}%)`, value: `-${fmt(bill.overallDiscountAmount)}`, red: true });
  if (safeNum(bill.gstAmount) > 0)
    rows.push({ label: 'GST Amount', value: fmt(bill.gstAmount) });
  if (safeNum(bill.roundOff) !== 0 && bill.roundOff != null)
    rows.push({ label: 'Round Off', value: fmt(bill.roundOff) });

  let ty = y;
  doc.font('Helvetica').fontSize(9);
  for (const row of rows) {
    doc.fillColor(row.red ? C.red : C.sub).text(row.label, 350, ty, { width: 150, align: 'right' });
    doc.fillColor(row.red ? C.red : C.text).text(row.value, 505, ty, { width: 75,  align: 'right' });
    ty += 15;
  }
  ty += 3;
  doc.rect(340, ty, 245, 22).fill(C.header);
  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(10);
  doc.text('GRAND TOTAL', 345, ty + 6, { width: 145, align: 'right' });
  doc.text(fmt(bill.grandTotal), 495, ty + 6, { width: 85, align: 'right' });
  ty += 28;
  doc.fillColor(C.sub).font('Helvetica').fontSize(8.5);
  if (bill.paidAmount !== undefined)
    doc.text(`Paid: ${fmt(bill.paidAmount)}`, 350, ty, { width: 240, align: 'right' });
  if (safeNum(bill.dueAmount) > 0) {
    ty += 12;
    doc.fillColor(C.red).text(`Due: ${fmt(bill.dueAmount)}`, 350, ty, { width: 240, align: 'right' });
  }
  return ty + 20;
}

function drawFooter(doc, settings, y) {
  if (y > 700) { doc.addPage(); y = 40; }

  // Bank / UPI details
  if (settings.bankName || settings.upiId) {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.accent).text('Payment Details:', 35, y);
    y += 11;
    doc.font('Helvetica').fontSize(7.5).fillColor(C.sub);
    if (settings.bankName)    doc.text(`Bank: ${settings.bankName}`, 35, y); y += 10;
    if (settings.bankAccountNo) doc.text(`A/C: ${settings.bankAccountNo}`, 35, y); y += 10;
    if (settings.bankIfsc)    doc.text(`IFSC: ${settings.bankIfsc}`, 35, y); y += 10;
    if (settings.upiId)       doc.text(`UPI: ${settings.upiId}`, 35, y); y += 10;
    y += 5;
  }

  if (settings.termsConditions) {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.accent).text('Terms & Conditions:', 35, y);
    y += 11;
    doc.font('Helvetica').fontSize(7.5).fillColor(C.sub)
       .text(settings.termsConditions, 35, y, { width: 300 });
  }
  doc.font('Helvetica').fontSize(8).fillColor(C.text);
  doc.text('Authorised Signatory', 420, y + 20, { width: 150, align: 'center' });
  doc.moveTo(415, y + 45).lineTo(575, y + 45).strokeColor(C.border).lineWidth(0.5).stroke();
  doc.fillColor(C.sub).fontSize(7.5)
     .text(settings.shopName || 'RAM EMPORIUM', 415, y + 48, { width: 160, align: 'center' });
}

// ── Build PDF doc (shared) ─────────────────────────────────────
function buildPDFDoc(type, doc, data, settings) {
  const isGst = type === 'bill' ? data.type === 'GST' : true;
  const title = type === 'bill'
    ? (isGst ? `TAX INVOICE  –  ${data.billNo}` : `INVOICE  –  ${data.billNo}`)
    : `QUOTATION  –  ${data.quotationNo}`;

  const snap = data.customerSnapshot || {};
  let y = drawHeader(doc, settings, title);

  const leftLines = type === 'bill' ? [
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
    { label: 'To:',      value: snap.name      || 'Walk-in Customer' },
    { label: 'Mobile:',  value: snap.mobile    || '-' },
    { label: 'Address:', value: snap.address   || '-' },
    ...(isGst && snap.gstNumber ? [{ label: 'GSTIN:', value: snap.gstNumber }] : []),
  ];

  y = drawInfoSection(doc, leftLines, rightLines, y);
  y = drawTableHeader(doc, y, isGst);
  y = drawItems(doc, data.items || [], y, isGst);
  y = drawTotals(doc, data, y + 6);
  drawFooter(doc, settings, y + 10);
}

// ═══════════════════════════════════════════════════
// Stream PDF directly to HTTP response (no file storage)
// ═══════════════════════════════════════════════════
const streamBillPDF = (bill, settings, res) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 30 });
    const filename = `${String(bill.billNo || 'BILL').replace(/[^a-zA-Z0-9-_]/g, '-')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);
    buildPDFDoc('bill', doc, bill, settings || {});
    doc.end();

    res.on('finish', resolve);
    res.on('error',  reject);
  });
};

const streamQuotationPDF = (quotation, settings, res) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 30 });
    const filename = `${String(quotation.quotationNo || 'QT').replace(/[^a-zA-Z0-9-_]/g, '-')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);
    buildPDFDoc('quotation', doc, quotation, settings || {});
    doc.end();

    res.on('finish', resolve);
    res.on('error',  reject);
  });
};

// ═══════════════════════════════════════════════════
// Save to disk (for local dev / when storage available)
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
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 30 });
    const out = fs.createWriteStream(filepath);
    doc.pipe(out);
    buildPDFDoc('bill', doc, bill, settings);
    doc.end();
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
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 30 });
    const out = fs.createWriteStream(filepath);
    doc.pipe(out);
    buildPDFDoc('quotation', doc, quotation, settings);
    doc.end();
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
