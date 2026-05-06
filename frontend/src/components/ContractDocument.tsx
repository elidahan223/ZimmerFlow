import { forwardRef } from 'react'

export interface BookingItem {
  compoundName: string
  roomsLabel: string // "כל המתחם" / "חדרים: …"
}

export interface ContractData {
  customerName: string
  customerIdNumber: string
  customerPhone: string
  customerAddress: string
  bookingItems: BookingItem[]
  checkIn: string // YYYY-MM-DD
  checkOut: string // YYYY-MM-DD
  checkInTime: string // HH:MM
  checkOutTime: string // HH:MM
  nights: number
  adults: number
  children: number
  totalPrice: number | null
  signatureDataUrl: string | null // png data URL
  signedDate: string // YYYY-MM-DD
}

interface Props {
  data: ContractData
}

const ContractDocument = forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  const fmt = (s: string) => s || '__________'
  const num = (n: number | null | undefined) => (n != null ? String(n) : '____')

  return (
    <div
      ref={ref}
      dir="rtl"
      style={{
        width: 794,
        minHeight: 1123,
        padding: '50px 60px',
        background: '#fff',
        color: '#111',
        fontFamily: '"Segoe UI", "Arial", sans-serif',
        fontSize: 13,
        lineHeight: 1.65,
        boxSizing: 'border-box',
      }}
    >
      <h1 style={{ textAlign: 'center', fontSize: 18, fontWeight: 700, marginBottom: 24, textDecoration: 'underline' }}>
        בקתות הזהב מול הכנרת - הסכם הזמנת נופש
      </h1>

      <div style={{ marginBottom: 14 }}>
        <div>
          שם המזמין : <u>{fmt(data.customerName)}</u> &nbsp;&nbsp; ת"ז : <u>{fmt(data.customerIdNumber)}</u> &nbsp; (להלן : <b>"המזמין"</b>) &nbsp;
          טל : <u>{fmt(data.customerPhone)}</u> &nbsp; כתובת : <u>{fmt(data.customerAddress)}</u> &nbsp;
          שם נותן שירות : <u>מורים דהן</u> (להלן : <b>"נותן שירותי"</b>)
        </div>
      </div>

      <p style={{ marginBottom: 10 }}>
        הזמנת נופש בבקתות הזהב מול הכנרת הממוקמים ברחוב הצאלון 60 במושבה מגדל
        (להלן : <b>"בקתות הזהב"</b>/<b>"המתחם"</b>), הכל כמפורט להלן :
      </p>

      {data.bookingItems.length > 0 && (
        <div style={{ marginBottom: 14, padding: '8px 12px', border: '1px solid #999', borderRadius: 4 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>מתחמים שהוזמנו:</div>
          {data.bookingItems.map((b, i) => (
            <div key={i}>• {b.compoundName} — <u>{b.roomsLabel}</u></div>
          ))}
        </div>
      )}

      <div style={{ margin: '12px 0 8px' }}>
        תאריך תאריך : <u>{fmt(data.checkIn)}</u> החל משעה : <u>{fmt(data.checkInTime)}</u> ועד ליום העזיבה בתאריך :&nbsp;
        <u>{fmt(data.checkOut)}</u> בשעה : <u>{fmt(data.checkOutTime)}</u> (להלן : <b>"שעת עזיבה מוסכמת"</b>), <b>**לכל האוחר</b>
      </div>

      <div style={{ margin: '4px 0 14px' }}>
        <div>מספר לילות : <u>{num(data.nights)}</u></div>
        <div>מספר מבוגרים : <u>{num(data.adults)}</u> &nbsp; מספר ילדים : <u>{num(data.children)}</u></div>
        <div>סה"כ לתשלום : <u>{num(data.totalPrice)}</u> (להלן : <b>"התמורה"</b>) (והכל להלן : <b>"ההזמנה"</b>).</div>
      </div>

      <ol style={{ paddingInlineStart: 22, margin: 0 }}>
        <li style={{ marginBottom: 10 }}>
          יובר כי נותן שירות יספק את המתחם אך ורק לצורך קיום הנופש.
          <div style={{ marginTop: 6 }}>
            <b>**</b> יודגש כי על כל איחור בשעת העזיבה, המשך לשעת העזיבה המוסכמת כמפורט לעיל
            (להלן : <b>"איחור בזמן העזיבה"</b>), ישלם המזמין בנוסף, סך של 100 ₪ לכל שעה נוספת בקבועה בהסכם זה,
            עוד עזרתו. (למען הסר ספק ולמען הסדר הטוב, כל תחילתה של שעה עגולה משעת העזיבה תחשב כשעה נוספת)
            (להלן : <b>"תוספת תשלום"</b>). כלל שלא יש המזמין את תוספת תשלום הלימה, מאשר המזמין לחייב את
            כרטיס האשראי לבטחון שהוצמא בעת הזמנה זו.
          </div>
        </li>

        <li style={{ marginBottom: 10 }}>
          המזמין מתחייב בהסכם זה, לערוך את הנופש באופן מכובד וסביר ולעמוד בכל התנאות, תקנות והוראות הדין,
          באשר להפרעה לציבור, לשכנים וכיוב'.
        </li>

        <li style={{ marginBottom: 10 }}>
          נותן שירותים מתחייב בזאת כי המתחם אשר יועמד לטובת קיום הנופש יהיה מוכן בצורה נאותה ביום הנופש.
        </li>

        <li style={{ marginBottom: 10 }}>
          התמורה תבוצע על ידי המזמין כדלקמן :
          <div style={{ marginTop: 6 }}>4.1 בזמן החתימה על הסכם זה יעביר המזמין לצד החסד שירותים לביטחון</div>
          <div>
            4.2 תנאי לביטחון זה קיים בטחון לנופש, לשמירת מועד הנופש בצימר ובמקרא של הרס או נזק או חרס
            לתחולת המקום ו/או איחור בזמן העזיבה.
          </div>
          <div>
            4.3 כמו כן מועד הגעה למתחם הבקתות יחויב המזמין על סך : <u>{num(data.totalPrice)}</u> ₪
            (ה' לתשלום) למפקדת בעל הצימר.
          </div>
        </li>

        <li style={{ marginBottom: 10 }}>
          ביטול ההסכם :
          <div style={{ marginTop: 6 }}>
            5.1 למזמין הזכות לבטל את הנופש עד 14 יום מיום סגירת הנופש. במקרה של ביטול הנופש, מכל סיבה שהיא,
            עד שבועיים לפני הנופש, ישלם המזמין לנות שירותים סך של 50% מהתמורה בגין הנופש.
          </div>
          <div>5.2 שבוע לפני מועד הנופש יהיה זמין מחויב בתשלום מלוא התמורה המפורטת בהסכם זה.</div>
        </li>

        <li style={{ marginBottom: 10 }}>
          במקרה של דחיית מועד הנופש מכל סיבה שהיא - החייה תבצע אך ורק על בסיס מקום פנוי.
        </li>

        <li style={{ marginBottom: 10 }}>
          מתן ויבטל שירות את ההזמנה יהיה מחויב להחזיר לו את מלוא כספו שילם כמקדמה.
        </li>
      </ol>

      <p style={{ marginTop: 16 }}>
        המזמין קרא הסכם זה בעיון, שאל שאלות בגין ההסכם, קיבלו תשובות לשביעות רצונו וחתם על ההסכם
        לאחר שהבין את משמעותו ומרצונו.
      </p>

      <p style={{ marginTop: 8 }}>
        יש להעביר חתום למייל: <span dir="ltr" style={{ textDecoration: 'underline' }}>elidahan223@walla.co.il</span>
      </p>

      <div style={{ marginTop: 36, display: 'flex', alignItems: 'flex-end', gap: 18 }}>
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: 4 }}>חתימת המזמין:</div>
          <div
            style={{
              borderBottom: '1px solid #111',
              height: 70,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              paddingBottom: 2,
            }}
          >
            {data.signatureDataUrl && (
              <img src={data.signatureDataUrl} alt="signature" style={{ maxHeight: 64, maxWidth: '100%' }} />
            )}
          </div>
        </div>
        <div style={{ width: 180, fontSize: 12 }}>
          <div>תאריך חתימה:</div>
          <div style={{ borderBottom: '1px solid #111', paddingBottom: 2 }}>{data.signedDate}</div>
        </div>
      </div>
    </div>
  )
})

export default ContractDocument
