import {
  OWNER_NAME,
  OWNER_PHONE,
  OWNER_EMAIL,
  PROPERTY_NAME,
  PROPERTY_ADDRESS,
  BUSINESS_TAX_ID,
  BUSINESS_TAX_STATUS,
} from '../../config'

export default function TermsOfUse() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10" dir="rtl">
      <h1 className="text-3xl font-bold text-neutral-900 mb-2">תנאי שימוש</h1>
      <p className="text-sm text-neutral-400 mb-8">{PROPERTY_NAME}</p>

      <section className="space-y-4 text-neutral-700 leading-relaxed">
        <p>
          ברוכים הבאים לאתר {PROPERTY_NAME}. השימוש באתר ובשירותים המוצעים בו כפוף לתנאי
          השימוש המפורטים להלן. עצם השימוש באתר מהווה הסכמה לתנאים אלה.
        </p>

        <h2 className="text-xl font-bold text-neutral-900 pt-6">1. בעלים מפעיל האתר</h2>
        <ul className="list-disc pr-6 space-y-1">
          <li>שם העסק: {OWNER_NAME}</li>
          <li>סטטוס: {BUSINESS_TAX_STATUS}</li>
          <li>מספר עוסק: {BUSINESS_TAX_ID}</li>
          <li>כתובת: {PROPERTY_ADDRESS}</li>
          <li>טלפון: <a href={`tel:${OWNER_PHONE}`} className="text-blue-600 hover:underline">{OWNER_PHONE}</a></li>
          <li>אימייל: <a href={`mailto:${OWNER_EMAIL}`} className="text-blue-600 hover:underline">{OWNER_EMAIL}</a></li>
        </ul>

        <h2 className="text-xl font-bold text-neutral-900 pt-6">2. כללי</h2>
        <p>
          האתר מאפשר עיון במידע על מתחם הצימרים, בדיקת זמינות, יצירת קשר עם הסוכן הוירטואלי
          ופתיחת בקשות הזמנה. השירות ניתן לאנשים בני 18 ומעלה. שימוש בשם משתמש שלא שלך,
          מסירת פרטים שגויים, או ניסיון להתחזות הם אסורים.
        </p>

        <h2 className="text-xl font-bold text-neutral-900 pt-6">3. שימוש מותר</h2>
        <ul className="list-disc pr-6 space-y-2">
          <li>השימוש מותר למטרות אישיות ופרטיות בלבד.</li>
          <li>אסור להעתיק, לשכפל, להפיץ, או לעשות שימוש מסחרי בתוכן האתר.</li>
          <li>אסור לבצע פעולות אוטומטיות מסיביות (סקרייפינג, התקפת DDoS, וכו').</li>
          <li>אסור להעלות תוכן בלתי חוקי, פוגעני, או הפרה של זכויות יוצרים.</li>
        </ul>

        <h2 className="text-xl font-bold text-neutral-900 pt-6">4. אחריות וסעיפי הגבלה</h2>
        <p>
          האתר ניתן כפי שהוא (AS-IS). אנו עושים מאמצים סבירים לוודא דיוק המידע, אך לא
          מתחייבים שהאתר יהיה זמין באופן רציף או חופשי משגיאות. בעל האתר לא יישא באחריות
          לנזקים עקיפים, אובדן רווחים, או נזקים שמקורם בתקלה טכנית באתר. כל הסתמכות על
          מידע באתר היא באחריות המשתמש.
        </p>

        <h2 className="text-xl font-bold text-neutral-900 pt-6">5. סוכן וירטואלי (אקי)</h2>
        <p>
          האתר כולל סוכן צ'אט וירטואלי בשם "אקי", המבוסס על בינה מלאכותית. הסוכן נועד לסייע
          בבדיקת זמינות, מתן מידע על המתחם ותחילת תהליך הזמנה. הוא <strong>איננו מחליף
          את בעל הבית</strong>. במקרים מורכבים, מצבי קצה, או נושאים פיננסיים — יש לפנות
          ישירות לבעל הבית.
        </p>
        <p>
          הסוכן עלול לטעות בחישוב או בהבנת בקשה. כל זמינות, מחיר או הסכם שיוצגו על ידו
          טעונים אישור סופי של בעל הבית בעת ההזמנה.
        </p>

        <h2 className="text-xl font-bold text-neutral-900 pt-6">6. קניין רוחני</h2>
        <p>
          כל התכנים באתר (טקסטים, תמונות, עיצוב, קוד, סימני מסחר) הם רכוש בלעדי של {OWNER_NAME}
          או של מי שהעניק לנו רישיון שימוש. אסור להעתיק, לשנות או להפיץ ללא רשות בכתב.
        </p>

        <h2 className="text-xl font-bold text-neutral-900 pt-6">7. שינוי תנאי השימוש</h2>
        <p>
          אנו שומרים את הזכות לעדכן את תנאי השימוש מעת לעת. השימוש המתמשך באתר אחרי עדכון
          התנאים מהווה הסכמה לתנאים החדשים.
        </p>

        <h2 className="text-xl font-bold text-neutral-900 pt-6">8. דין ושיפוט</h2>
        <p>
          על תנאים אלו יחול הדין הישראלי. סמכות שיפוט בלעדית מסורה לבתי המשפט המוסמכים
          באזור הצפון.
        </p>

        <h2 className="text-xl font-bold text-neutral-900 pt-6">9. יצירת קשר</h2>
        <p>
          לכל שאלה, פנייה או תלונה - ניתן ליצור קשר באמצעים המופיעים בסעיף 1.
        </p>
      </section>
    </div>
  )
}
