'use strict';
const PDFDocument = require('pdfkit');
const QRCode      = require('qrcode');
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
  sub: '#64748B', red: '#DC2626', green: '#16A34A',
};

// ── Generate UPI QR as PNG buffer ─────────────────────────────────────────
async function generateUpiQrBuffer(upiId, name, amount, note) {
  if (!upiId) return null;
  try {
    const upiLink = amount > 0
      ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name || 'RAM EMPORIUM')}&am=${safeNum(amount).toFixed(2)}&cu=INR&tn=${encodeURIComponent(note || 'Payment')}`
      : `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name || 'RAM EMPORIUM')}&cu=INR`;

    const buffer = await QRCode.toBuffer(upiLink, {
      type:   'png',
      width:  120,
      margin: 1,
      color:  { dark: '#1E293B', light: '#F8FAFC' },
      errorCorrectionLevel: 'M',
    });
    return buffer;
  } catch {
    return null;
  }
}

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
  doc.text('DESCRIPTION', 58,  y + 5, { width: 155 });
  doc.text('QTY',         220, y + 5, { width: 45,  align: 'right' });
  doc.text('RATE',        270, y + 5, { width: 55,  align: 'right' });
  doc.text('DISC%',       330, y + 5, { width: 40,  align: 'right' });
  if (isGst) {
    doc.text('CGST%',     375, y + 5, { width: 38,  align: 'right' });
    doc.text('SGST%',     418, y + 5, { width: 38,  align: 'right' });
    doc.text('AMOUNT',    460, y + 5, { width: 120, align: 'right' });
  } else {
    doc.text('AMOUNT',    375, y + 5, { width: 205, align: 'right' });
  }
  return y + 17;
}

function drawItems(doc, items, startY, isGst) {
  let y = startY, flip = false;
  for (let i = 0; i < items.length; i++) {
    const item  = items[i];
    const rowH  = 15;
    const cgst  = safeNum(item.gstRate) / 2;   // split equally
    const sgst  = safeNum(item.gstRate) / 2;

    if (y + rowH > 760) { doc.addPage(); y = 40; y = drawTableHeader(doc, y, isGst); }
    if (flip) doc.rect(30, y, 555, rowH).fill('#F1F5F9');
    flip = !flip;

    doc.fillColor(C.text).font('Helvetica').fontSize(8);
    doc.text(String(i + 1),                          35,  y + 3, { width: 20 });
    doc.text(trunc(item.productName),                58,  y + 3, { width: 155 });
    doc.text(`${safeNum(item.quantity)} ${item.unit||''}`, 220, y + 3, { width: 45, align: 'right' });
    doc.text(fmt(item.rate),                         270, y + 3, { width: 55,  align: 'right' });
    doc.text(`${safeNum(item.discountPercentage)}%`, 330, y + 3, { width: 40,  align: 'right' });
    if (isGst) {
      doc.text(`${cgst}%`,  375, y + 3, { width: 38, align: 'right' });
      doc.text(`${sgst}%`,  418, y + 3, { width: 38, align: 'right' });
      doc.text(fmt(item.totalAmount), 460, y + 3, { width: 120, align: 'right' });
    } else {
      doc.text(fmt(item.totalAmount), 375, y + 3, { width: 205, align: 'right' });
    }
    y += rowH;
  }
  doc.moveTo(30, y).lineTo(585, y).strokeColor(C.border).lineWidth(0.5).stroke();
  return y + 6;
}

function drawTotals(doc, bill, y, isBill) {
  const isGst = !isBill || bill.type === 'GST'
  const rows  = [{ label: 'Subtotal', value: fmt(bill.subtotal) }]

  if (safeNum(bill.overallDiscountAmount) > 0)
    rows.push({ label: `Discount (${safeNum(bill.overallDiscount)}%)`, value: `-${fmt(bill.overallDiscountAmount)}`, red: true })

  if (isGst && safeNum(bill.gstAmount) > 0) {
    const half = Math.round((safeNum(bill.gstAmount) / 2) * 100) / 100
    rows.push({ label: 'CGST', value: fmt(half) })
    rows.push({ label: 'SGST', value: fmt(half) })
  } else if (!isGst && safeNum(bill.gstAmount) > 0) {
    rows.push({ label: 'GST Amount', value: fmt(bill.gstAmount) })
  }

  if (safeNum(bill.roundOff) !== 0 && bill.roundOff != null)
    rows.push({ label: 'Round Off', value: fmt(bill.roundOff) })

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

// ── Draw UPI QR section at bottom of bill ─────────────────────────────────
function drawUpiSection(doc, settings, amount, billNo, y) {
  if (!settings.upiId) return y;

  // Box
  const boxH = 110;
  if (y + boxH > 760) { doc.addPage(); y = 40; }

  doc.rect(30, y, 555, boxH).fillAndStroke('#F0F4FF', '#CBD5E1');

  // Title
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.accent)
     .text('PAYMENT VIA UPI', 38, y + 8);

  doc.font('Helvetica').fontSize(8).fillColor(C.sub)
     .text(`UPI ID: ${settings.upiId}`, 38, y + 22);

  // Bank details
  let bx = y + 36;
  if (settings.bankName) {
    doc.text(`Bank: ${settings.bankName}`, 38, bx); bx += 11;
  }
  if (settings.bankAccountNo) {
    doc.text(`A/C No: ${settings.bankAccountNo}`, 38, bx); bx += 11;
  }
  if (settings.bankIfsc) {
    doc.text(`IFSC: ${settings.bankIfsc}`, 38, bx);
  }

  // Amount to pay
  doc.font('Helvetica-Bold').fontSize(10).fillColor(C.green)
     .text(`Amount: ${fmt(amount)}`, 38, y + boxH - 22);

  // QR placeholder box (actual QR image drawn after async generation)
  doc.rect(440, y + 8, 95, 95).fillAndStroke('#FFFFFF', '#CBD5E1');

  return { qrX: 441, qrY: y + 9, qrSize: 93, nextY: y + boxH + 8 };
}

function drawFooter(doc, settings, y) {
  if (y > 700) { doc.addPage(); y = 40; }

  if (settings.termsConditions) {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.accent).text('Terms & Conditions:', 35, y);
    y += 11;
    doc.font('Helvetica').fontSize(7.5).fillColor(C.sub)
       .text(settings.termsConditions, 35, y, { width: 320 });
  }

  // ── Signature block ──────────────────────────────
  const sigX = 400;
  const sigY = y + 5;

  // Embed signature — supports both base64 data URI and file path
  if (settings.signature) {
    try {
      if (settings.signature.startsWith('data:')) {
        // base64 data URI — convert to buffer for PDFKit
        const base64Data = settings.signature.split(',')[1];
        const imgBuffer  = Buffer.from(base64Data, 'base64');
        doc.image(imgBuffer, sigX, sigY, { width: 160, height: 42, fit: [160, 42] });
      } else if (fs.existsSync(settings.signature)) {
        // Local file path
        doc.image(settings.signature, sigX, sigY, { width: 160, height: 42, fit: [160, 42] });
      }
    } catch { /* skip if image fails */ }
  }

  const lineY = sigY + 50;
  doc.font('Helvetica').fontSize(8).fillColor(C.text);
  doc.text('Authorised Signatory', sigX, lineY, { width: 160, align: 'center' });
  doc.moveTo(sigX - 5, lineY + 14).lineTo(sigX + 165, lineY + 14)
     .strokeColor(C.border).lineWidth(0.5).stroke();
  doc.fillColor(C.sub).fontSize(7.5)
     .text(settings.shopName || 'RAM EMPORIUM', sigX, lineY + 17, { width: 160, align: 'center' });
}

// ── Shared PDF builder (async — supports QR) ──────────────────────────────
async function buildPDFDocAsync(type, doc, data, settings) {
  const isGst = type === 'bill' ? data.type === 'GST' : true;
  const isBill = type === 'bill';
  const title = isBill
    ? (isGst ? `TAX INVOICE  –  ${data.billNo}` : `INVOICE  –  ${data.billNo}`)
    : `QUOTATION  –  ${data.quotationNo}`;

  const snap = data.customerSnapshot || {};
  let y = drawHeader(doc, settings, title);

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
    { label: 'To:',      value: snap.name      || 'Walk-in Customer' },
    { label: 'Mobile:',  value: snap.mobile    || '-' },
    { label: 'Address:', value: snap.address   || '-' },
    ...(isGst && snap.gstNumber ? [{ label: 'GSTIN:', value: snap.gstNumber }] : []),
  ];

  y = drawInfoSection(doc, leftLines, rightLines, y);
  y = drawTableHeader(doc, y, isGst);
  y = drawItems(doc, data.items || [], y, isGst);
  y = drawTotals(doc, data, y + 6, isBill);

  // ── UPI QR Section (bills only, if UPI ID is configured) ─────────────
  if (isBill && settings.upiId) {
    const payAmount = safeNum(data.dueAmount) > 0 ? data.dueAmount : data.grandTotal;
    const upiResult = drawUpiSection(doc, settings, payAmount, data.billNo, y + 10);

    if (upiResult && upiResult.qrX) {
      // Generate QR PNG asynchronously and embed into PDF
      const qrBuffer = await generateUpiQrBuffer(
        settings.upiId,
        settings.shopName,
        payAmount,
        `Payment for ${data.billNo}`
      );

      if (qrBuffer) {
        doc.image(qrBuffer, upiResult.qrX, upiResult.qrY, {
          width:  upiResult.qrSize,
          height: upiResult.qrSize,
        });
      }

      y = upiResult.nextY;
    }
  }

  drawFooter(doc, settings, y + 10);
}

// ═══════════════════════════════════════════════════
// Stream PDF directly to HTTP response
// ═══════════════════════════════════════════════════
const streamBillPDF = (bill, settings, res) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 30 });
      const filename = `${String(bill.billNo || 'BILL').replace(/[^a-zA-Z0-9-_]/g, '-')}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.on('error', reject);

      doc.pipe(res);
      await buildPDFDocAsync('bill', doc, bill, settings || {});
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
      const doc = new PDFDocument({ size: 'A4', margin: 30 });
      const filename = `${String(quotation.quotationNo || 'QT').replace(/[^a-zA-Z0-9-_]/g, '-')}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.on('error', reject);

      doc.pipe(res);
      await buildPDFDocAsync('quotation', doc, quotation, settings || {});
      doc.end();
      resolve();
    } catch (err) {
      reject(err);
    }
  });
};

// ═══════════════════════════════════════════════════
// Save to disk (local dev)
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

  const doc = new PDFDocument({ size: 'A4', margin: 30 });
  const out  = fs.createWriteStream(filepath);
  doc.pipe(out);
  await buildPDFDocAsync('bill', doc, bill, settings);
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

  const doc = new PDFDocument({ size: 'A4', margin: 30 });
  const out  = fs.createWriteStream(filepath);
  doc.pipe(out);
  await buildPDFDocAsync('quotation', doc, quotation, settings);
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
