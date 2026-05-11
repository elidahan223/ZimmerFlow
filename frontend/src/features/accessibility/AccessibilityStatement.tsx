import { OWNER_NAME, OWNER_PHONE, OWNER_EMAIL, PROPERTY_NAME } from '../../config'

/**
 * Israeli Web Accessibility Statement (תקנות הנגישות, תקן ישראלי 5568, WCAG 2.0 AA).
 * Required by law for any business website serving the Israeli public.
 */
export default function AccessibilityStatement() {
  const today = new Date().toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="max-w-3xl mx-auto px-4 py-10" dir="rtl">
      <h1 className="text-3xl font-bold text-neutral-900 mb-2">הצהרת נגישות</h1>
      <p className="text-sm text-neutral-400 mb-8">{PROPERTY_NAME} | עודכן לאחרונה: {today}</p>

      <section className="space-y-4 text-neutral-700 leading-relaxed">
        <p>
          {PROPERTY_NAME} פועלים להנגשת השירות הדיגיטלי שלנו לאנשים עם מוגבלות, מתוך אמונה
          שהאינטרנט הוא משאב חיוני שצריך להיות נגיש לכולם.
        </p>

        <h2 className="text-xl font-bold text-neutral-900 pt-6">תקן הנגישות</h2>
        <p>
          האתר נבנה בהתאם להנחיות תקן ישראלי 5568 (תואם WCAG 2.0 רמה AA), בהתאם לתקנות שוויון
          זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), תשע"ג-2013.
        </p>

        <h2 className="text-xl font-bold text-neutral-900 pt-6">סוגי התאמות באתר</h2>
        <ul className="list-disc pr-6 space-y-2">
          <li>תפריט נגישות צף (אייקון ⚙️ בצד) — מאפשר להגדיל טקסט, להגביר ניגודיות, להשבית
            אנימציות, להקריא טקסט ועוד.</li>
          <li>ניווט במקלדת בלבד — באמצעות מקש Tab, Enter, Esc.</li>
          <li>טקסט חלופי (alt) על תמונות.</li>
          <li>תיוגים סמנטיים (HTML5) — כותרות, רשימות, טפסים מתויגים נכון.</li>
          <li>תמיכה בקוראי מסך (NVDA, JAWS, VoiceOver).</li>
          <li>מבנה דף ברור והיררכי.</li>
          <li>טפסים עם הוראות ברורות והודעות שגיאה מפורטות.</li>
        </ul>

        <h2 className="text-xl font-bold text-neutral-900 pt-6">חלקים שייתכן שאינם נגישים במלואם</h2>
        <p>
          לעיתים, חלקים מהאתר עלולים להיות פחות נגישים בשל אופיים (תוכן ממקור חיצוני, קבצי PDF
          סרוקים וכדומה). אנחנו פועלים באופן שוטף לתיקון נושאים אלו.
        </p>

        <h2 className="text-xl font-bold text-neutral-900 pt-6">פנייה לרכז הנגישות</h2>
        <p>
          אם נתקלת בבעיית נגישות באתר, או שיש לך שאלה / בקשה - אנא פנה אלינו ונשמח לסייע
          בהקדם:
        </p>
        <ul className="list-none space-y-1">
          <li><strong>שם רכז הנגישות:</strong> {OWNER_NAME}</li>
          <li><strong>טלפון:</strong> <a href={`tel:${OWNER_PHONE}`} className="text-blue-600 hover:underline">{OWNER_PHONE}</a></li>
          <li><strong>אימייל:</strong> <a href={`mailto:${OWNER_EMAIL}`} className="text-blue-600 hover:underline">{OWNER_EMAIL}</a></li>
        </ul>

        <p className="pt-4 text-sm text-neutral-500">
          אנחנו מתחייבים לטפל בכל פנייה ולתת מענה תוך 30 ימי עסקים.
        </p>
      </section>
    </div>
  )
}
