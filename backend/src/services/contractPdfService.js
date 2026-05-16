/**
 * Contract PDF Service — בקתות הזהב הסכם הזמנת נופש
 * Uses pdfkit directly (no headless browser) so contract rendering works
 * reliably on Elastic Beanstalk without depending on @sparticuz/chromium,
 * Google Fonts reachability, or any other browser/network quirk.
 */

const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const { uploadContractBuffer } = require('./s3');

// features:['rtla'] is what lets pdfkit lay Hebrew out right-to-left, but
// it reverses *every* code point in the string — so any run of digits or
// Latin characters embedded in Hebrew (dates, phone numbers, emails)
// comes out reversed too. Pre-reverse those runs in the input string so
// they get re-reversed by the RTL flow back to the correct order, while
// the surrounding Hebrew stays in proper visual order.
//
// bidi-js was tried here and over-corrected — it flipped the Hebrew too.
// The pre-reverse trick is the standard fix for pdfkit + Hebrew and
// matches what tools like html-pdf-node ship with by default.
const LATIN_OR_DIGIT_RUN = /[A-Za-z0-9@._\-+/:'"!?#%&*()\[\]{}<>=,]+/g;
function fixBidi(text) {
  if (text == null) return '';
  return String(text).replace(LATIN_OR_DIGIT_RUN, (match) => match.split('').reverse().join(''));
}

// Rubik covers Hebrew + Latin + digits in one TTF. The CI workflow
// downloads this file from google/fonts before bundling the ZIP.
const FONT_PATH = path.join(__dirname, '..', '..', 'fonts', 'Rubik-Regular.ttf');
const FONT_EXISTS = fs.existsSync(FONT_PATH);
if (FONT_EXISTS) {
  console.log(`[contractPdf] pdfkit will register font from ${FONT_PATH}`);
} else {
  console.warn(`[contractPdf] font missing at ${FONT_PATH} — text will use pdfkit's built-in Helvetica (no Hebrew glyphs)`);
}

const PAGE = { width: 595.28, height: 841.89 }; // A4 in pt
const MARGIN = { top: 40, bottom: 40, left: 50, right: 50 };
const CONTENT_WIDTH = PAGE.width - MARGIN.left - MARGIN.right;

function fmtDate(s) {
  if (!s) return '__________';
  return s;
}

function fmtNum(n) {
  return n != null ? String(n) : '____';
}

function fmtStr(s, fallback = '____________') {
  return s || fallback;
}

// Pre-reverse Latin/digit runs, then let features:['rtla'] reverse the
// whole string for RTL layout; the Latin runs end up flipped back to
// their original order while the Hebrew gets its proper RTL placement.
function heText(doc, text, opts = {}) {
  doc.text(fixBidi(text), {
    align: 'right',
    features: ['rtla'],
    ...opts,
  });
}

async function generateContractPdf(data) {
  // Log every field we got so a future blank/broken PDF tells us
  // immediately whether the upstream data was missing rather than the
  // renderer dropping it on the floor.
  console.log('[contractPdf] input fields:', JSON.stringify({
    customerName: data.customerName,
    customerIdNumber: data.customerIdNumber,
    customerPhone: data.customerPhone,
    customerAddress: data.customerAddress,
    bookingItemsCount: (data.bookingItems || []).length,
    checkIn: data.checkIn,
    checkOut: data.checkOut,
    checkInTime: data.checkInTime,
    checkOutTime: data.checkOutTime,
    nights: data.nights,
    adults: data.adults,
    children: data.children,
    totalPrice: data.totalPrice,
    hasSignature: typeof data.signatureBase64 === 'string' && data.signatureBase64.length > 0,
    signatureLength: data.signatureBase64 ? data.signatureBase64.length : 0,
    signedDate: data.signedDate,
  }));

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: MARGIN,
    });

    const chunks = [];
    let bytesWritten = 0;
    doc.on('data', (chunk) => {
      chunks.push(chunk);
      bytesWritten += chunk.length;
    });
    doc.on('end', async () => {
      try {
        const pdfBuffer = Buffer.concat(chunks);
        console.log(`[contractPdf] pdfkit generated PDF: ${pdfBuffer.length} bytes (data events accumulated ${bytesWritten} bytes)`);
        const key = await uploadContractBuffer(pdfBuffer);
        console.log(`[contractPdf] uploaded to S3 key=${key}`);
        resolve({ key, byteLength: pdfBuffer.length });
      } catch (err) {
        console.error('[contractPdf] S3 upload failed:', err.message);
        reject(err);
      }
    });
    doc.on('error', (err) => {
      console.error('[contractPdf] pdfkit error event:', err.message);
      reject(err);
    });

    if (FONT_EXISTS) {
      try {
        doc.registerFont('main', FONT_PATH);
        doc.font('main');
        console.log('[contractPdf] font "main" registered and active');
      } catch (e) {
        console.error('[contractPdf] failed to register font, falling back to Helvetica:', e.message);
      }
    } else {
      console.warn('[contractPdf] no font registered — Hebrew text will not render');
    }

    // ── Title ────────────────────────────────────────────────────────────
    doc.fontSize(18);
    heText(doc, 'בקתות הזהב מול הכנרת - הסכם הזמנת נופש', {
      align: 'center',
      underline: true,
    });
    doc.moveDown(1);

    // ── Parties ──────────────────────────────────────────────────────────
    doc.fontSize(10);
    heText(doc, `שם המזמין: ${fmtStr(data.customerName)}    ת"ז: ${fmtStr(data.customerIdNumber)}    טל: ${fmtStr(data.customerPhone)}    כתובת: ${fmtStr(data.customerAddress)}`);
    doc.moveDown(0.3);
    heText(doc, 'שם נותן שירות: מורים דהן  (להלן: "נותן השירות")');
    doc.moveDown(0.5);

    // ── Description ──────────────────────────────────────────────────────
    heText(doc, 'הזמנת נופש בבקתות הזהב מול הכנרת הממוקמים ברחוב הצאלון 60 במושבה מגדל (להלן: "בקתות הזהב"/"המתחם"), הכל כמפורט להלן:');
    doc.moveDown(0.5);

    // ── Booking items box ────────────────────────────────────────────────
    const items = data.bookingItems || [];
    if (items.length > 0) {
      const boxY = doc.y;
      const boxHeight = 20 + items.length * 14;
      doc.rect(MARGIN.left, boxY, CONTENT_WIDTH, boxHeight).stroke('#999');
      doc.y = boxY + 6;
      doc.x = MARGIN.left + 10;
      heText(doc, 'מתחמים שהוזמנו:', { width: CONTENT_WIDTH - 20 });
      for (const item of items) {
        doc.x = MARGIN.left + 10;
        heText(doc, `• ${item.compoundName} — ${item.roomsLabel}`, { width: CONTENT_WIDTH - 20 });
      }
      doc.y = boxY + boxHeight + 8;
      doc.x = MARGIN.left;
    }

    // ── Dates ────────────────────────────────────────────────────────────
    heText(doc, `תאריך הגעה: ${fmtDate(data.checkIn)}  משעה: ${fmtStr(data.checkInTime, '__:__')}   תאריך עזיבה: ${fmtDate(data.checkOut)}  בשעה: ${fmtStr(data.checkOutTime, '__:__')}  (להלן: "שעת עזיבה מוסכמת"), לכל המאוחר.`);
    doc.moveDown(0.3);

    // ── Stay details ─────────────────────────────────────────────────────
    heText(doc, `מספר לילות: ${fmtNum(data.nights)}    מספר מבוגרים: ${fmtNum(data.adults)}    מספר ילדים: ${fmtNum(data.children)}`);
    doc.moveDown(0.2);
    heText(doc, `סה"כ לתשלום: ${fmtNum(data.totalPrice)} ₪  (להלן: "התמורה")  (והכל להלן: "ההזמנה").`);
    doc.moveDown(0.6);

    // ── Numbered clauses ─────────────────────────────────────────────────
    const clauses = [
      'יודגש כי נותן השירות יספק את המתחם אך ורק לצורך קיום הנופש. יודגש כי על כל איחור בשעת העזיבה, מעבר לשעת העזיבה המוסכמת, ישלם המזמין בנוסף סך של 100 ₪ לכל שעה נוספת (להלן: "תוספת תשלום"). כל תחילתה של שעה עגולה נחשבת כשעה נוספת. במקרה שהמזמין לא ישלם, מאשר המזמין לחייב את כרטיס האשראי לביטחון שהוצמד בעת הזמנה זו.',
      'המזמין מתחייב בהסכם זה לערוך את הנופש באופן מכובד וסביר ולעמוד בכל התקנות והוראות הדין, באשר להפרעה לציבור, לשכנים וכיו"ב.',
      'נותן השירות מתחייב בזאת כי המתחם אשר יועמד לטובת קיום הנופש יהיה מוכן בצורה נאותה ביום הנופש.',
      `התמורה תבוצע על ידי המזמין כדלקמן: בזמן החתימה על הסכם זה יעביר המזמין לנותן השירות סך של ${fmtNum(data.totalPrice)} ₪ לביטחון, לשמירת מועד הנופש בצימר ובמקרה של הרס/נזק לתכולת המקום ו/או איחור בזמן העזיבה. במועד ההגעה למתחם הבקתות יחויב המזמין בסך מלא התמורה לבעל הצימר.`,
      'ביטול ההסכם: למזמין הזכות לבטל את הנופש עד 14 יום מיום סגירת הנופש. במקרה של ביטול מכל סיבה שהיא, עד שבועיים לפני הנופש, ישלם המזמין לנותן השירות סך של 50% מהתמורה. שבוע לפני מועד הנופש המזמין מחויב בתשלום מלוא התמורה.',
      'במקרה של דחיית מועד הנופש, מכל סיבה שהיא, הדחייה תבוצע אך ורק על בסיס מקום פנוי.',
      'במקרה ונותן השירות יבטל את ההזמנה - יהיה מחויב להחזיר למזמין את מלוא הכסף ששילם כמקדמה.',
    ];

    doc.fontSize(9.5);
    for (let i = 0; i < clauses.length; i++) {
      heText(doc, `${i + 1}. ${clauses[i]}`, { width: CONTENT_WIDTH });
      doc.moveDown(0.4);
    }
    doc.moveDown(0.4);

    // ── Declaration ──────────────────────────────────────────────────────
    doc.fontSize(10);
    heText(doc, 'המזמין קרא הסכם זה בעיון, שאל שאלות בגין ההסכם, קיבל תשובות לשביעות רצונו וחתם על ההסכם לאחר שהבין את משמעותו ומרצונו.');
    doc.moveDown(0.5);

    // ── Email line ───────────────────────────────────────────────────────
    heText(doc, 'יש להעביר חתום למייל: elidahan223@walla.co.il');
    doc.moveDown(1.5);

    // ── Signature block ──────────────────────────────────────────────────
    const sigY = doc.y;
    doc.fontSize(10);
    // Label "חתימת המזמין:"
    heText(doc, 'חתימת המזמין:', { continued: false });

    // Embed signature image if present
    if (data.signatureBase64 && typeof data.signatureBase64 === 'string') {
      try {
        const commaIdx = data.signatureBase64.indexOf(',');
        const base64Data = commaIdx >= 0 ? data.signatureBase64.slice(commaIdx + 1) : data.signatureBase64;
        const sigBuffer = Buffer.from(base64Data, 'base64');
        // Place image under the label, sized to fit
        const imgX = MARGIN.left + CONTENT_WIDTH / 2 - 90;
        const imgY = sigY + 14;
        doc.image(sigBuffer, imgX, imgY, { fit: [180, 60] });
        doc.y = imgY + 64;
      } catch (e) {
        console.error('[contractPdf] failed to embed signature image:', e.message);
      }
    }

    // Signature underline
    const lineY = doc.y + 4;
    doc.moveTo(MARGIN.left + 30, lineY).lineTo(MARGIN.left + CONTENT_WIDTH - 30, lineY).stroke('#111');
    doc.y = lineY + 8;

    // Date of signature
    heText(doc, `תאריך חתימה: ${fmtStr(data.signedDate, '')}`);

    doc.end();
  });
}

// Kept as a stub for backward compatibility with the old export; nobody
// imports it externally but removing it would be a breaking API change.
function createContractHtml() {
  return '';
}

module.exports = { generateContractPdf, createContractHtml };
