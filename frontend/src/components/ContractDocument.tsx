import { forwardRef } from 'react'

export interface ContractData {
  customerName: string
  customerIdNumber: string
  customerPhone: string
  customerAddress: string
  compoundName: string
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
      <h1 style={{ textAlign: 'center', fontSize: 18, fontWeight: 700, marginBottom: 28, textDecoration: 'underline' }}>
        בקתות הזהב מול הכנרת — הסכם הזמנת נופש
      </h1>

      <div style={{ marginBottom: 18 }}>
        <div>
          שם המזמין: <u>{fmt(data.customerName)}</u> &nbsp;&nbsp; ת"ז: <u>{fmt(data.customerIdNumber)}</u> &nbsp; (להלן: <b>"המזמין"</b>)
        </div>
        <div>טל': <u>{fmt(data.customerPhone)}</u></div>
        <div>כתובת: <u>{fmt(data.customerAddress)}</u></div>
        <div>שם נותן השירות: <u>מוריס דהן</u> (להלן: <b>"נותן השירות"</b>)</div>
      </div>

      <p style={{ marginBottom: 14 }}>
        הזמנת נופש בבקתות הזהב מול הכנרת הממוקמים ברחוב הצאלון 60 במושב מגדל (להלן: <b>"בקתות הזהב"</b>/<b>"המתחם"</b>),
        הכל כמפורט להלן:
      </p>

      <ol style={{ paddingInlineStart: 22, margin: 0 }}>
        <li style={{ marginBottom: 10 }}>
          תאריך הגעה: <u>{fmt(data.checkIn)}</u> החל משעה: <u>{fmt(data.checkInTime)}</u> ועד ליום העזיבה בתאריך:&nbsp;
          <u>{fmt(data.checkOut)}</u> בשעה: <u>{fmt(data.checkOutTime)}</u> (להלן: <b>"שעת עזיבה מוסכמת"</b>),
          <b> "ייכלל המזמין"</b>.
          <div style={{ marginTop: 6 }}>– מספר לילות: <u>{num(data.nights)}</u></div>
          <div>– מספר מבוגרים: <u>{num(data.adults)}</u> &nbsp; מספר ילדים: <u>{num(data.children)}</u></div>
          <div>– סה"כ לתשלום: <u>{num(data.totalPrice)}</u> ש"ח (להלן: <b>"התמורה"</b>/<b>"ההזמנה"</b>).</div>
        </li>

        <li style={{ marginBottom: 10 }}>
          נותן השירות יספק את המתחם אך ורק לצורך קיום הנופש.
          <div style={{ marginTop: 6 }}>
            ידוע למזמין כי על כל איחור בשעת העזיבה, מעבר לשעת העזיבה המוסכמת כמפורט לעיל
            (<b>"איחור בשעת העזיבה"</b>), ישלם המזמין בנוסף, סך של 100 ש"ח לכל שעת עזיבה נוספת בהסכם זה,
            טרם עזיבתו. למחרת חסר ספק לסומך הסדר הטוב, כל תחילתו של שעת עזיבה נוספת תחשב כשעה נוספת
            (להלן: <b>"תוספת תשלום"</b>). ככל שלא ישלם המזמין את תוספת התשלום בעצול, רשאי נותן השירות
            לחייב את כרטיס האשראי לבטחון שהושאר בעקבות הזמנה זו.
          </div>
        </li>

        <li style={{ marginBottom: 10 }}>
          המזמין מתחייב בהסכם זה, לערוך את הנופש באופן מכובד ולעמוד בכל ההתנאים, התקנות והוראות הדין,
          באשר להפרעה לציבור, לשכנים וכיו"ב.
        </li>

        <li style={{ marginBottom: 10 }}>
          נותן השירות מתחייב בזאת כי המתחם אשר יועד לטובת קיום הנופש יהיה מוכן בצורה נאותה לקיום הנופש.
        </li>

        <li style={{ marginBottom: 10 }}>
          התמורה תבוצע על ידי המזמין כדלקמן:
          <div style={{ marginTop: 6 }}>4.1 בעת החתימה על הסכם זה, יעביר המזמין דמי שירותים <b>אשראי לביטחון</b>.</div>
          <div>
            4.2 אשראי לבטחון זה מהווה בטחון לקיום הנופש, תנאי לשמירת מועד ההזמנה במקרה ביצוע לתחילת
            המקום ו/או איחור בשעת העזיבה.
          </div>
          <div>
            4.3 כמו כן במועד הגעה למתחם בקבלת ההזמנה יחויב המזמין על סך <u>{num(data.totalPrice)}</u> ש"ח
            (כל התשלום) לפקודת בעל הצימר.
          </div>
        </li>

        <li style={{ marginBottom: 10 }}>
          ביטול ההסכם:
          <div style={{ marginTop: 6 }}>
            5.1 למזמין הזכות לבטל את הנופש עד 14 יום מיום סגירת ההסכם, מכל סיבה שהיא, עד שבועיים לפני
            ההגעה. ישלם המזמין לנותן השירות בהסכם זה, סך 50% משווי ההזמנה כדמי ביטול הזמנה.
          </div>
          <div>5.2 שבוע לפני מועד ההגעה ייחויב המזמין במלוא התמורה כתשלום על בסיס מקום פנוי.</div>
        </li>

        <li style={{ marginBottom: 10 }}>
          במקרה של דחיית מועד הנופש מכל סיבה שהיא — דחייתו תבוצע אך ורק על בסיס מקום פנוי.
        </li>

        <li style={{ marginBottom: 10 }}>
          במידה ויבטל נותן השירות את ההזמנה יהיה מחויב להחזיר לו את מלוא תשלום ששולם במקדמה.
        </li>
      </ol>

      <p style={{ marginTop: 16 }}>
        המזמין קרא הסכם זה בעיון, שאל שאלות בנגין ההסכם, קיבל תשובות לשביעות רצונו וחתם על ההסכם
        לאחר שהבין את משמעותו ופרטיו.
      </p>

      <p style={{ marginTop: 8 }}>
        יש להעביר חתום ל-email: <span dir="ltr" style={{ textDecoration: 'underline' }}>elidahan223@walla.co.il</span>
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
