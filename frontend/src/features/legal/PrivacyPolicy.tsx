import {
  OWNER_NAME,
  OWNER_PHONE,
  OWNER_EMAIL,
  PROPERTY_NAME,
  PROPERTY_ADDRESS,
  BUSINESS_TAX_ID,
} from '../../config'

/**
 * Israeli Privacy Policy (חוק הגנת הפרטיות, התשמ"א-1981).
 * Required for any business collecting personal data from Israeli users.
 */
export default function PrivacyPolicy() {
  const today = new Date().toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="max-w-3xl mx-auto px-4 py-10" dir="rtl">
      <h1 className="text-3xl font-bold text-neutral-900 mb-2">מדיניות פרטיות</h1>
      <p className="text-sm text-neutral-400 mb-8">{PROPERTY_NAME} | עודכן לאחרונה: {today}</p>

      <section className="space-y-4 text-neutral-700 leading-relaxed">
        <p>
          {PROPERTY_NAME} (להלן: "האתר", "אנחנו") מכבדים את פרטיות המשתמשים באתר ומחויבים
          להגן עליה. מדיניות זו מתארת איזה מידע אנו אוספים, כיצד אנו משתמשים בו, ואיזה
          זכויות עומדות לך ביחס למידע. המדיניות נכתבה בהתאם לחוק הגנת הפרטיות, התשמ"א-1981
          ולתקנות הגנת הפרטיות (אבטחת מידע), התשע"ז-2017.
        </p>

        <h2 className="text-xl font-bold text-neutral-900 pt-6">1. מי הגוף האוסף את המידע</h2>
        <ul className="list-disc pr-6 space-y-1">
          <li>שם העסק: {OWNER_NAME}</li>
          <li>מספר עוסק מורשה: {BUSINESS_TAX_ID}</li>
          <li>כתובת: {PROPERTY_ADDRESS}</li>
          <li>טלפון: <a href={`tel:${OWNER_PHONE}`} className="text-blue-600 hover:underline">{OWNER_PHONE}</a></li>
          <li>אימייל: <a href={`mailto:${OWNER_EMAIL}`} className="text-blue-600 hover:underline">{OWNER_EMAIL}</a></li>
        </ul>

        <h2 className="text-xl font-bold text-neutral-900 pt-6">2. איזה מידע אנו אוספים</h2>
        <p>במהלך השימוש באתר ובשירות, אנו אוספים את סוגי המידע הבאים:</p>
        <ul className="list-disc pr-6 space-y-2">
          <li>
            <strong>מידע שאתה מוסר ביוזמתך</strong> — בעת הרשמה, יצירת קשר או הזמנה: שם פרטי
            ושם משפחה, מספר טלפון, כתובת אימייל, מספר תעודת זהות, כתובת מגורים, חתימה דיגיטלית
            על חוזה ההזמנה, ופרטי ההזמנה (תאריכים, מספר אורחים, הערות).
          </li>
          <li>
            <strong>מידע טכני שנאסף אוטומטית</strong> — כתובת IP, סוג דפדפן ומערכת הפעלה
            (User-Agent), מועד הגישה לאתר, ופעולות שביצעת באתר. מידע זה נאסף לצורכי אבטחת
            מידע, מניעת הונאה ותחזוקה.
          </li>
          <li>
            <strong>שיחות עם העוזר הוירטואלי</strong> — תוכן ההודעות שאתה שולח לעוזר
            נשמר אצלנו, ועובר לעיבוד בשירות AI חיצוני (Anthropic) לצורך הפקת התשובה.
          </li>
          <li>
            <strong>Cookies וטכנולוגיות דומות</strong> — האתר משתמש ב-localStorage לצורך
            ניהול הפעלת המשתמש (שמירת מצב התחברות). האתר אינו עושה שימוש ב-cookies שיווקיים
            של צד שלישי.
          </li>
        </ul>

        <h2 className="text-xl font-bold text-neutral-900 pt-6">3. למה אנו אוספים את המידע</h2>
        <ul className="list-disc pr-6 space-y-2">
          <li>לאפשר הרשמה והתחברות לאתר.</li>
          <li>לטפל בבקשות הזמנה, לערוך חוזה ולנהל את שהותך במתחם.</li>
          <li>ליצור איתך קשר בנוגע להזמנה (שיחת אישור, שינויים, ביטולים).</li>
          <li>לקיים חובות חוקיות (הוצאת חשבונית, ניהול ספרים, דיווח לרשויות המס).</li>
          <li>לאבטח את האתר, לזהות שימוש לרעה ולמנוע הונאות.</li>
          <li>לשפר את השירות ואת חוויית המשתמש באתר.</li>
        </ul>

        <h2 className="text-xl font-bold text-neutral-900 pt-6">4. בסיס חוקי לעיבוד המידע</h2>
        <p>
          איסוף ועיבוד המידע מתבצעים על סמך הסכמתך בעת ההרשמה והשימוש באתר, לצורך ביצוע חוזה
          ההזמנה איתך, ובמקרים מסוימים מכוח חובה חוקית (כגון שמירת מסמכי הזמנה לצורכי מס).
        </p>

        <h2 className="text-xl font-bold text-neutral-900 pt-6">5. שיתוף מידע עם צדדים שלישיים</h2>
        <p>איננו מוכרים את המידע שלך. אנו משתפים מידע עם הגורמים הבאים בלבד, ובמידה הדרושה:</p>
        <ul className="list-disc pr-6 space-y-2">
          <li>
            <strong>ספקי תשתית ענן</strong> — שירותי אחסון נתונים, אחסון תמונות וחתימות
            דיגיטליות (כגון Amazon Web Services).
          </li>
          <li>
            <strong>ספק שירות AI</strong> — שיחות עם העוזר הוירטואלי עוברות לעיבוד אצל
            Anthropic לצורך הפקת תשובה. Anthropic מחויבת בתנאי השירות שלה לאי-שימוש בנתונים
            לאימון מודלים.
          </li>
          <li>
            <strong>שירותי אימות</strong> — Amazon Cognito לצורך ניהול הזדהות וסיסמאות.
          </li>
          <li>
            <strong>רשויות מוסמכות</strong> — אם נידרש בצו של בית משפט או רשות חוקית.
          </li>
        </ul>

        <h2 className="text-xl font-bold text-neutral-900 pt-6">6. העברת מידע לחו"ל</h2>
        <p>
          חלק מהשירותים הטכנולוגיים שאנו משתמשים בהם (אחסון ענן, שירות AI) מאוחסנים בשרתים
          מחוץ לישראל, בעיקר בארה"ב ובאירופה. ספקי השירות מחויבים לסטנדרטי אבטחה גבוהים.
        </p>

        <h2 className="text-xl font-bold text-neutral-900 pt-6">7. אבטחת מידע</h2>
        <p>
          אנו נוקטים אמצעי אבטחה מקובלים להגנה על המידע: הצפנת תקשורת (HTTPS), הצפנת סיסמאות,
          הגבלת גישה למורשים בלבד, ויישום בקרות נגד תקיפות נפוצות. עם זאת, אין מערכת מקוונת
          חסינה לחלוטין, ואיננו יכולים להבטיח אבטחה מוחלטת.
        </p>

        <h2 className="text-xl font-bold text-neutral-900 pt-6">8. תקופת שמירת המידע</h2>
        <ul className="list-disc pr-6 space-y-2">
          <li>פרטי משתמש רשום — כל עוד החשבון פעיל, ועד 7 שנים לאחר מכן או עד לבקשת מחיקה.</li>
          <li>חוזי הזמנה וחתימות דיגיטליות — 7 שנים לפחות, מכוח חובת שמירת מסמכים בחוק.</li>
          <li>לוגים טכניים (IP, User-Agent) — עד 12 חודשים, לצורכי אבטחה ובדיקת אירועים.</li>
          <li>שיחות עם הסוכן הוירטואלי — עד 24 חודשים, לצורכי שיפור השירות וטיפול בתלונות.</li>
        </ul>

        <h2 className="text-xl font-bold text-neutral-900 pt-6">9. הזכויות שלך</h2>
        <p>על פי חוק הגנת הפרטיות, עומדות לך הזכויות הבאות:</p>
        <ul className="list-disc pr-6 space-y-2">
          <li><strong>זכות עיון</strong> — לבקש לראות איזה מידע אנו מחזיקים עליך.</li>
          <li><strong>זכות תיקון</strong> — לבקש לתקן מידע שגוי או לא מדויק.</li>
          <li><strong>זכות מחיקה</strong> — לבקש מחיקת המידע שלך, בכפוף לחובות שמירה חוקיות.</li>
          <li>
            <strong>זכות לסירוב לדיוור ישיר</strong> — אם בעתיד נשלח לך דיוור פרסומי, תמיד
            תוכל לבטל את הסכמתך.
          </li>
        </ul>
        <p>
          להפעלת זכויות אלה, ניתן לפנות אלינו באימייל{' '}
          <a href={`mailto:${OWNER_EMAIL}`} className="text-blue-600 hover:underline">{OWNER_EMAIL}</a>{' '}
          או בטלפון{' '}
          <a href={`tel:${OWNER_PHONE}`} className="text-blue-600 hover:underline">{OWNER_PHONE}</a>.
          נשתדל להשיב לבקשתך תוך 30 ימים.
        </p>

        <h2 className="text-xl font-bold text-neutral-900 pt-6">10. קטינים</h2>
        <p>
          השירות מיועד לאנשים בני 18 ומעלה. איננו אוספים ביודעין מידע על קטינים מתחת לגיל 18.
          אם נודע לנו שנאסף מידע כזה, נמחק אותו בהקדם.
        </p>

        <h2 className="text-xl font-bold text-neutral-900 pt-6">11. עדכונים למדיניות</h2>
        <p>
          אנו רשאים לעדכן את מדיניות הפרטיות מעת לעת. עדכון מהותי יפורסם באתר. השימוש המתמשך
          באתר לאחר עדכון מהווה הסכמה למדיניות המעודכנת.
        </p>

        <h2 className="text-xl font-bold text-neutral-900 pt-6">12. תלונות וגוף הפיקוח</h2>
        <p>
          אם לדעתך פעלנו בניגוד לחוק הגנת הפרטיות, אנו ממליצים תחילה לפנות אלינו ישירות. בנוסף,
          ניתן להגיש תלונה לרשות להגנת הפרטיות במשרד המשפטים, באמצעות אתר הרשות.
        </p>

        <h2 className="text-xl font-bold text-neutral-900 pt-6">13. יצירת קשר</h2>
        <p>
          לכל שאלה בנוגע למדיניות זו או לאופן הטיפול במידע שלך:
        </p>
        <ul className="list-none space-y-1">
          <li><strong>אימייל:</strong> <a href={`mailto:${OWNER_EMAIL}`} className="text-blue-600 hover:underline">{OWNER_EMAIL}</a></li>
          <li><strong>טלפון:</strong> <a href={`tel:${OWNER_PHONE}`} className="text-blue-600 hover:underline">{OWNER_PHONE}</a></li>
        </ul>
      </section>
    </div>
  )
}
