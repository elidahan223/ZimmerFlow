const prisma = require('../config/database');

// Tool 1: check_availability
async function checkAvailability({ compoundId, check_in, check_out }) {
  if (!check_in || !check_out) {
    return { error: 'חסרים תאריכים' };
  }
  const checkIn = new Date(check_in);
  const checkOut = new Date(check_out);
  if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
    return { error: 'תאריך לא תקין' };
  }
  if (checkOut <= checkIn) {
    return { error: 'תאריך יציאה חייב להיות אחרי תאריך כניסה' };
  }

  const conflicts = await prisma.booking.findMany({
    where: {
      compoundId,
      status: { not: 'CANCELLED' },
      checkIn: { lt: checkOut },
      checkOut: { gt: checkIn },
    },
    select: { checkIn: true, checkOut: true, status: true },
  });

  return {
    available: conflicts.length === 0,
    conflicting_dates: conflicts.map((c) => ({
      check_in: c.checkIn.toISOString().split('T')[0],
      check_out: c.checkOut.toISOString().split('T')[0],
    })),
  };
}

// Tool 2: get_property_info
async function getPropertyInfo({ compoundId }) {
  const compound = await prisma.compound.findUnique({
    where: { id: compoundId },
    include: {
      rooms: { select: { name: true, description: true, capacity: true } },
    },
  });
  if (!compound) return { error: 'מתחם לא נמצא' };

  return {
    name: compound.name,
    description: compound.description || null,
    tagline: compound.tagline || null,
    yard_description: compound.yardDescription || null,
    capacity: compound.capacity,
    status: compound.status,
    weekday_price: parseFloat(compound.weekdayPrice),
    weekend_price: parseFloat(compound.weekendPrice),
    holiday_price: compound.holidayPrice ? parseFloat(compound.holidayPrice) : null,
    rooms: compound.rooms,
  };
}

// Tool 3: create_booking_request
async function createBookingRequest({ compoundId, check_in, check_out, guest_name, phone, guests_count, email }) {
  if (!guest_name || !phone || !check_in || !check_out) {
    return { error: 'חסרים פרטים: שם, טלפון, תאריכי כניסה ויציאה' };
  }

  const availability = await checkAvailability({ compoundId, check_in, check_out });
  if (availability.error) return availability;
  if (!availability.available) {
    return { error: 'התאריכים שביקשת אינם זמינים', conflicting_dates: availability.conflicting_dates };
  }

  const owner = await prisma.user.findFirst({ where: { role: { in: ['OWNER', 'ADMIN'] } } });
  if (!owner) return { error: 'שגיאה במערכת - לא נמצא בעל בית' };

  let customer = await prisma.customer.findFirst({ where: { phone } });
  if (!customer) {
    customer = await prisma.customer.create({
      data: { fullName: guest_name, phone, email: email || null },
    });
  }

  const booking = await prisma.booking.create({
    data: {
      compoundId,
      customerId: customer.id,
      createdByUserId: owner.id,
      checkIn: new Date(check_in),
      checkOut: new Date(check_out),
      guestsCount: parseInt(guests_count) || 2,
      status: 'PENDING',
      customerNotes: 'הזמנה דרך סוכן AI',
    },
  });

  return {
    booking_id: booking.id,
    message: 'ההזמנה נשלחה בהצלחה לאישור בעל הבית. תקבל עדכון בהקדם.',
  };
}

const TOOLS = [
  {
    name: 'check_availability',
    description: 'בודק זמינות תאריכים במתחם. מחזיר אם התאריכים פנויים, ואם לא - את התאריכים החופפים.',
    input_schema: {
      type: 'object',
      properties: {
        check_in: { type: 'string', description: 'תאריך צ\'ק-אין בפורמט YYYY-MM-DD' },
        check_out: { type: 'string', description: 'תאריך צ\'ק-אאוט בפורמט YYYY-MM-DD' },
      },
      required: ['check_in', 'check_out'],
    },
  },
  {
    name: 'get_property_info',
    description: 'מחזיר מידע מלא על המתחם: שם, תיאור, חצר, קיבולת, מחירים (יום חול/סופ"ש/חג), וחדרים.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'propose_booking',
    description: 'מציע ללקוח לסיים את ההזמנה במסך החתימה - לא יוצר הזמנה ב-DB. השתמש בכלי הזה אחרי שאספת את כל הפרטים ובדקת זמינות. הוא יחזיר חזרה ללקוח כפתור "המשך לחתימה" שיפתח חוזה דיגיטלי. ההזמנה תיווצר רק אחרי שהלקוח חותם.',
    input_schema: {
      type: 'object',
      properties: {
        check_in: { type: 'string', description: 'YYYY-MM-DD' },
        check_out: { type: 'string', description: 'YYYY-MM-DD' },
        guests_count: { type: 'integer', description: 'מספר אורחים סה"כ' },
        adults: { type: 'integer', description: 'מבוגרים (אם ידוע, אחרת השתמש ב-guests_count)' },
        children: { type: 'integer', description: 'ילדים (אופציונלי)' },
        room_ids: { type: 'array', items: { type: 'string' }, description: 'רשימת ID של חדרים שהלקוח בחר במתחם (אופציונלי)' },
        notes: { type: 'string', description: 'הערות מיוחדות מהלקוח (אופציונלי)' },
      },
      required: ['check_in', 'check_out', 'guests_count'],
    },
  },
];

async function proposeBooking({ compoundId, check_in, check_out, guests_count, adults, children, room_ids, notes }) {
  // Validate dates and availability one more time before proposing
  if (!check_in || !check_out) return { error: 'חסרים תאריכים' };
  const availability = await checkAvailability({ compoundId, check_in, check_out });
  if (availability.error) return availability;
  if (!availability.available) {
    return { error: 'התאריכים שביקשת אינם זמינים', conflicting_dates: availability.conflicting_dates };
  }

  return {
    ok: true,
    proposal: {
      compoundId,
      checkIn: check_in,
      checkOut: check_out,
      guestsCount: parseInt(guests_count) || 2,
      adults: adults != null ? parseInt(adults) : null,
      children: children != null ? parseInt(children) : null,
      roomIds: Array.isArray(room_ids) ? room_ids : [],
      notes: notes || '',
    },
    next_step: 'הצג ללקוח שהפרטים מאושרים ואמור לו ללחוץ על הכפתור "המשך לחתימה" שמופיע במסך כדי לחתום על החוזה ולסיים את ההזמנה.',
  };
}

async function executeTool(name, input, compoundId, ctx = {}) {
  switch (name) {
    case 'check_availability':
      return await checkAvailability({ ...input, compoundId });
    case 'get_property_info':
      return await getPropertyInfo({ compoundId });
    case 'propose_booking':
      if (!ctx.isAuthenticated) {
        return { error: 'הלקוח חייב להיות מחובר כדי לפתוח הזמנה. הפנה אותו להתחברות.' };
      }
      return await proposeBooking({ ...input, compoundId });
    default:
      return { error: `כלי לא ידוע: ${name}` };
  }
}

module.exports = { TOOLS, executeTool, checkAvailability, getPropertyInfo, createBookingRequest, proposeBooking };
