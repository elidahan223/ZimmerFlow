/**
 * Contract PDF Service — בקתות הזהב הסכם הזמנת נופש
 * משתמש ב-Puppeteer לרינדור HTML→PDF עם תמיכה מלאה ב-RTL וגופנים עבריים.
 */

const { uploadContractBuffer } = require('./s3');

// Match Shetzli's pdfService.js, which renders identical Hebrew contracts
// successfully: pull Rubik from fonts.googleapis.com via CSS @import
// inside the page itself. Combined with page.evaluate(document.fonts.ready)
// below, chromium loads the webfont before snapshotting.
const HEBREW_FONT_FACE = `@import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700&display=swap');`;

const getBrowser = async () => {
  try {
    const chromium = require('@sparticuz/chromium');
    const puppeteer = require('puppeteer-core');
    const execPath = await chromium.executablePath();
    console.log('[contractPdf] Using chromium, executablePath:', execPath);
    return await puppeteer.launch({
      headless: 'new',
      args: chromium.args,
      executablePath: execPath,
    });
  } catch (e) {
    console.log('[contractPdf] Chromium not available, falling back to puppeteer:', e.message);
    const puppeteer = require('puppeteer');
    return await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
};

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDate(s) {
  if (!s) return '__________';
  return s; // already YYYY-MM-DD
}

function fmtNum(n) {
  return n != null ? String(n) : '____';
}

/**
 * data: {
 *   customerName, customerIdNumber, customerPhone, customerAddress,
 *   bookingItems: [{ compoundName, roomsLabel }],
 *   checkIn, checkOut, checkInTime, checkOutTime,
 *   nights, adults, children, totalPrice,
 *   signatureBase64, signedDate
 * }
 */
function createContractHtml(data) {
  const itemsHtml = (data.bookingItems || [])
    .map((b) => `<li><b>${escapeHtml(b.compoundName)}</b> — ${escapeHtml(b.roomsLabel)}</li>`)
    .join('');

  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <style>
    /* Hebrew font is embedded as base64 inside @font-face so chromium has
       no runtime network dependency on Google Fonts (which appears to be
       blocked / unreachable from this EB instance — every previous URL
       and FONTCONFIG approach silently produced an empty PDF). */
    ${HEBREW_FONT_FACE}
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Rubik', sans-serif;
      direction: rtl; text-align: right;
      padding: 40px 50px; color: #111;
      font-size: 13px; line-height: 1.7;
    }
    h1 { font-size: 20px; text-align: center; margin-bottom: 24px; text-decoration: underline; font-weight: 700; }
    .parties { margin-bottom: 14px; }
    .parties div { margin-bottom: 4px; }
    u { text-decoration: underline; }
    .booking-list {
      border: 1px solid #999; border-radius: 6px;
      padding: 10px 14px; margin: 12px 0;
    }
    .booking-list .label { font-weight: 700; margin-bottom: 6px; }
    .booking-list ul { list-style: none; padding: 0; }
    .booking-list li { padding: 2px 0; }
    .date-line { margin: 12px 0 8px; }
    .stay-details { margin: 4px 0 14px; }
    .stay-details div { margin-bottom: 3px; }
    ol { padding-inline-start: 22px; margin-top: 10px; }
    ol > li { margin-bottom: 10px; }
    .sub { margin-top: 6px; }
    .signature-block { margin-top: 36px; display: flex; align-items: flex-end; gap: 18px; }
    .signature-box { flex: 1; }
    .signature-line {
      border-bottom: 1px solid #111;
      height: 70px; padding-bottom: 2px;
      display: flex; align-items: flex-end; justify-content: center;
    }
    .signature-line img { max-height: 64px; max-width: 100%; }
    .date-box { width: 180px; font-size: 12px; }
    .date-box .line { border-bottom: 1px solid #111; padding-bottom: 2px; }
    .declaration { margin-top: 16px; }
    .email-line { margin-top: 8px; }
    .email-line a { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>בקתות הזהב מול הכנרת - הסכם הזמנת נופש</h1>

  <div class="parties">
    <div>שם המזמין : <u>${escapeHtml(data.customerName) || '____________'}</u> &nbsp;&nbsp; ת"ז : <u>${escapeHtml(data.customerIdNumber) || '____________'}</u> &nbsp; (להלן : <b>"המזמין"</b>) &nbsp; טל : <u>${escapeHtml(data.customerPhone) || '____________'}</u> &nbsp; כתובת : <u>${escapeHtml(data.customerAddress) || '____________'}</u> &nbsp; שם נותן שירות : <u>מורים דהן</u> (להלן : <b>"נותן שירותי"</b>)</div>
  </div>

  <p>
    הזמנת נופש בבקתות הזהב מול הכנרת הממוקמים ברחוב הצאלון 60 במושבה מגדל
    (להלן : <b>"בקתות הזהב"</b>/<b>"המתחם"</b>), הכל כמפורט להלן :
  </p>

  ${itemsHtml ? `<div class="booking-list"><div class="label">מתחמים שהוזמנו:</div><ul>${itemsHtml}</ul></div>` : ''}

  <div class="date-line">
    תאריך תאריך : <u>${fmtDate(data.checkIn)}</u> החל משעה : <u>${escapeHtml(data.checkInTime) || '____________'}</u> ועד ליום העזיבה בתאריך : <u>${fmtDate(data.checkOut)}</u> בשעה : <u>${escapeHtml(data.checkOutTime) || '____________'}</u> (להלן : <b>"שעת עזיבה מוסכמת"</b>), <b>**לכל האוחר</b>
  </div>

  <div class="stay-details">
    <div>מספר לילות : <u>${fmtNum(data.nights)}</u></div>
    <div>מספר מבוגרים : <u>${fmtNum(data.adults)}</u> &nbsp; מספר ילדים : <u>${fmtNum(data.children)}</u></div>
    <div>סה"כ לתשלום : <u>${fmtNum(data.totalPrice)}</u> (להלן : <b>"התמורה"</b>) (והכל להלן : <b>"ההזמנה"</b>).</div>
  </div>

  <ol>
    <li>
      יובר כי נותן שירות יספק את המתחם אך ורק לצורך קיום הנופש.
      <div class="sub">
        <b>**</b> יודגש כי על כל איחור בשעת העזיבה, המשך לשעת העזיבה המוסכמת כמפורט לעיל
        (להלן : <b>"איחור בזמן העזיבה"</b>), ישלם המזמין בנוסף, סך של 100 ₪ לכל שעה נוספת בקבועה בהסכם זה,
        עוד עזרתו. (למען הסר ספק ולמען הסדר הטוב, כל תחילתה של שעה עגולה משעת העזיבה תחשב כשעה נוספת)
        (להלן : <b>"תוספת תשלום"</b>). כלל שלא יש המזמין את תוספת תשלום הלימה, מאשר המזמין לחייב את כרטיס
        האשראי לבטחון שהוצמא בעת הזמנה זו.
      </div>
    </li>

    <li>
      המזמין מתחייב בהסכם זה, לערוך את הנופש באופן מכובד וסביר ולעמוד בכל התנאות, תקנות והוראות הדין,
      באשר להפרעה לציבור, לשכנים וכיוב'.
    </li>

    <li>
      נותן שירותים מתחייב בזאת כי המתחם אשר יועמד לטובת קיום הנופש יהיה מוכן בצורה נאותה ביום הנופש.
    </li>

    <li>
      התמורה תבוצע על ידי המזמין כדלקמן :
      <div class="sub">4.1 בזמן החתימה על הסכם זה יעביר המזמין לצד החסד שירותים לביטחון</div>
      <div>4.2 תנאי לביטחון זה קיים בטחון לנופש, לשמירת מועד הנופש בצימר ובמקרא של הרס או נזק או חרס לתחולת המקום ו/או איחור בזמן העזיבה.</div>
      <div>4.3 כמו כן מועד הגעה למתחם הבקתות יחויב המזמין על סך : <u>${fmtNum(data.totalPrice)}</u> ₪ (ה' לתשלום) למפקדת בעל הצימר.</div>
    </li>

    <li>
      ביטול ההסכם :
      <div class="sub">5.1 למזמין הזכות לבטל את הנופש עד 14 יום מיום סגירת הנופש. במקרה של ביטול הנופש, מכל סיבה שהיא, עד שבועיים לפני הנופש, ישלם המזמין לנות שירותים סך של 50% מהתמורה בגין הנופש.</div>
      <div>5.2 שבוע לפני מועד הנופש יהיה זמין מחויב בתשלום מלוא התמורה המפורטת בהסכם זה.</div>
    </li>

    <li>במקרה של דחיית מועד הנופש מכל סיבה שהיא - החייה תבצע אך ורק על בסיס מקום פנוי.</li>

    <li>מתן ויבטל שירות את ההזמנה יהיה מחויב להחזיר לו את מלוא כספו שילם כמקדמה.</li>
  </ol>

  <div class="declaration">
    המזמין קרא הסכם זה בעיון, שאל שאלות בגין ההסכם, קיבלו תשובות לשביעות רצונו וחתם על ההסכם
    לאחר שהבין את משמעותו ומרצונו.
  </div>

  <div class="email-line">
    יש להעביר חתום למייל: <span dir="ltr"><a>elidahan223@walla.co.il</a></span>
  </div>

  <div class="signature-block">
    <div class="signature-box">
      <div>חתימת המזמין:</div>
      <div class="signature-line">
        ${data.signatureBase64 ? `<img src="${data.signatureBase64}" alt="חתימה">` : ''}
      </div>
    </div>
    <div class="date-box">
      <div>תאריך חתימה:</div>
      <div class="line">${escapeHtml(data.signedDate) || ''}</div>
    </div>
  </div>
</body>
</html>`;
}

async function generateContractPdf(data) {
  const html = createContractHtml(data);
  console.log(`[contractPdf] rendering HTML: ${html.length} chars, font-face block present: ${HEBREW_FONT_FACE.length > 0}`);
  let browser = null;
  try {
    browser = await getBrowser();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    // Without this, page.pdf() can fire before the embedded @font-face is
    // actually decoded and applied — Chromium lays out the document with
    // .notdef glyphs (or nothing) and we get a blank PDF. fonts.ready
    // resolves once every face declared on the page has loaded or failed.
    await page.evaluate(() => document.fonts.ready);
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', right: '12mm', bottom: '15mm', left: '12mm' },
    });
    console.log(`[contractPdf] generated PDF: ${pdfBuffer.length} bytes`);
    await browser.close();
    browser = null;

    const key = await uploadContractBuffer(pdfBuffer);
    return { key, byteLength: pdfBuffer.length };
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    throw err;
  }
}

module.exports = { generateContractPdf, createContractHtml };
