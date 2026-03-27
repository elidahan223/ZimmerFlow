const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { requireOwner } = require('../middleware/auth');

// PUBLIC - זמינות (רק תאריכים, בלי פרטי לקוח)
router.get('/availability', async (req, res, next) => {
  try {
    const { cabinId, from, to } = req.query;
    const where = {
      status: { in: ['PENDING', 'CONFIRMED'] },
    };
    if (cabinId) where.cabinId = cabinId;
    if (from) where.checkOut = { gt: new Date(from) };
    if (to) where.checkIn = { lt: new Date(to) };

    const bookings = await prisma.booking.findMany({
      where,
      select: {
        id: true,
        cabinId: true,
        checkIn: true,
        checkOut: true,
        status: true,
      },
      orderBy: { checkIn: 'asc' },
    });
    res.json(bookings);
  } catch (err) {
    next(err);
  }
});

// OWNER - כל ההזמנות עם פרטים מלאים
router.get('/', requireOwner, async (req, res, next) => {
  try {
    const bookings = await prisma.booking.findMany({
      include: { customer: true, cabin: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(bookings);
  } catch (err) {
    next(err);
  }
});

// OWNER - הזמנה בודדת
router.get('/:id', requireOwner, async (req, res, next) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: { customer: true, cabin: true, contracts: true },
    });
    if (!booking) return res.status(404).json({ error: 'הזמנה לא נמצאה' });
    res.json(booking);
  } catch (err) {
    next(err);
  }
});

// OWNER - יצירת הזמנה עם פרטי לקוח
router.post('/', requireOwner, async (req, res, next) => {
  try {
    const { cabinId, checkIn, checkOut, guestsCount, customerNotes, adminNotes,
            customerId, customerName, customerPhone, customerEmail, customerIdNumber } = req.body;

    if (!cabinId || !checkIn || !checkOut) {
      return res.status(400).json({ error: 'חסרים שדות חובה: צימר, צ׳ק-אין, צ׳ק-אאוט' });
    }

    const overlap = await prisma.booking.findFirst({
      where: {
        cabinId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        checkIn: { lt: new Date(checkOut) },
        checkOut: { gt: new Date(checkIn) },
      },
    });

    if (overlap) {
      return res.status(409).json({ error: 'התאריכים המבוקשים תפוסים' });
    }

    // If no customerId, create new customer from inline details
    let finalCustomerId = customerId;
    if (!finalCustomerId) {
      if (!customerName || !customerPhone) {
        return res.status(400).json({ error: 'חסרים פרטי לקוח: שם וטלפון' });
      }
      const customer = await prisma.customer.create({
        data: {
          fullName: customerName,
          phone: customerPhone,
          email: customerEmail || null,
          idNumber: customerIdNumber || null,
        },
      });
      finalCustomerId = customer.id;
    }

    const booking = await prisma.booking.create({
      data: {
        customerId: finalCustomerId,
        cabinId,
        createdByUserId: req.user.id,
        checkIn: new Date(checkIn),
        checkOut: new Date(checkOut),
        guestsCount: guestsCount || 1,
        customerNotes,
        adminNotes,
      },
      include: { customer: true, cabin: true },
    });

    res.status(201).json(booking);
  } catch (err) {
    next(err);
  }
});

// OWNER - עדכון הזמנה מלא
router.put('/:id', requireOwner, async (req, res, next) => {
  try {
    const { cabinId, checkIn, checkOut, guestsCount, status, customerNotes, adminNotes,
            customerName, customerPhone, customerEmail, customerIdNumber } = req.body;

    const existing = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: { customer: true },
    });
    if (!existing) return res.status(404).json({ error: 'הזמנה לא נמצאה' });

    // Check overlap if dates or cabin changed
    if (cabinId || checkIn || checkOut) {
      const overlap = await prisma.booking.findFirst({
        where: {
          id: { not: req.params.id },
          cabinId: cabinId || existing.cabinId,
          status: { in: ['PENDING', 'CONFIRMED'] },
          checkIn: { lt: new Date(checkOut || existing.checkOut) },
          checkOut: { gt: new Date(checkIn || existing.checkIn) },
        },
      });
      if (overlap) {
        return res.status(409).json({ error: 'התאריכים המבוקשים תפוסים' });
      }
    }

    // Update customer details
    if (customerName || customerPhone || customerEmail || customerIdNumber) {
      await prisma.customer.update({
        where: { id: existing.customerId },
        data: {
          ...(customerName && { fullName: customerName }),
          ...(customerPhone && { phone: customerPhone }),
          ...(customerEmail !== undefined && { email: customerEmail || null }),
          ...(customerIdNumber !== undefined && { idNumber: customerIdNumber || null }),
        },
      });
    }

    const bookingData = {};
    if (cabinId) bookingData.cabinId = cabinId;
    if (checkIn) bookingData.checkIn = new Date(checkIn);
    if (checkOut) bookingData.checkOut = new Date(checkOut);
    if (guestsCount) bookingData.guestsCount = guestsCount;
    if (status) {
      bookingData.status = status;
      if (status === 'CANCELLED') bookingData.cancelledAt = new Date();
      if (status === 'COMPLETED') bookingData.completedAt = new Date();
    }
    if (customerNotes !== undefined) bookingData.customerNotes = customerNotes;
    if (adminNotes !== undefined) bookingData.adminNotes = adminNotes;

    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: bookingData,
      include: { customer: true, cabin: true },
    });
    res.json(booking);
  } catch (err) {
    next(err);
  }
});

// OWNER - עדכון סטטוס הזמנה
router.patch('/:id/status', requireOwner, async (req, res, next) => {
  try {
    const { status } = req.body;
    const data = { status };
    if (status === 'CANCELLED') data.cancelledAt = new Date();
    if (status === 'COMPLETED') data.completedAt = new Date();

    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data,
      include: { customer: true, cabin: true },
    });
    res.json(booking);
  } catch (err) {
    next(err);
  }
});

// OWNER - מחיקת הזמנה
router.delete('/:id', requireOwner, async (req, res, next) => {
  try {
    await prisma.booking.delete({ where: { id: req.params.id } });
    res.json({ message: 'ההזמנה נמחקה' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
