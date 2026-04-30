const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { requireOwner, requireAuth } = require('../middleware/auth');

const bookingInclude = {
  customer: true,
  compound: true,
  bookingRooms: { include: { room: true } },
};

// PUBLIC - זמינות (רק תאריכים, בלי פרטי לקוח)
router.get('/availability', async (req, res, next) => {
  try {
    const { compoundId, roomId, from, to } = req.query;
    const where = {
      status: { in: ['PENDING', 'CONFIRMED'] },
    };
    if (compoundId) where.compoundId = compoundId;
    if (roomId) where.bookingRooms = { some: { roomId } };
    if (from) where.checkOut = { gt: new Date(from) };
    if (to) where.checkIn = { lt: new Date(to) };

    const bookings = await prisma.booking.findMany({
      where,
      select: {
        id: true,
        compoundId: true,
        checkIn: true,
        checkOut: true,
        status: true,
        bookingRooms: { select: { roomId: true } },
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
      include: bookingInclude,
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
      include: { ...bookingInclude, contracts: true },
    });
    if (!booking) return res.status(404).json({ error: 'הזמנה לא נמצאה' });
    res.json(booking);
  } catch (err) {
    next(err);
  }
});

// AUTH - בקשת הזמנה ע"י משתמש רגיל (GUEST), חתום עם חוזה
router.post('/request', requireAuth, async (req, res, next) => {
  try {
    const { compoundId, roomIds, checkIn, checkOut, guestsCount, adults, children, customerNotes, contractKey, signatureMetadata } = req.body;

    if (!compoundId || !checkIn || !checkOut) {
      return res.status(400).json({ error: 'חסרים שדות חובה: מתחם, צ׳ק-אין, צ׳ק-אאוט' });
    }
    if (!contractKey) {
      return res.status(400).json({ error: 'נדרש לחתום על החוזה לפני שליחת הבקשה' });
    }

    // Overlap check (room-level if rooms picked, else compound-level)
    if (roomIds && roomIds.length > 0) {
      const overlap = await prisma.bookingRoom.findFirst({
        where: {
          roomId: { in: roomIds },
          booking: {
            status: { in: ['PENDING', 'CONFIRMED'] },
            checkIn: { lt: new Date(checkOut) },
            checkOut: { gt: new Date(checkIn) },
          },
        },
        include: { room: true },
      });
      if (overlap) {
        return res.status(409).json({ error: `חדר "${overlap.room.name}" תפוס בתאריכים המבוקשים` });
      }
    } else {
      const overlap = await prisma.booking.findFirst({
        where: {
          compoundId,
          status: { in: ['PENDING', 'CONFIRMED'] },
          checkIn: { lt: new Date(checkOut) },
          checkOut: { gt: new Date(checkIn) },
        },
      });
      if (overlap) {
        return res.status(409).json({ error: 'התאריכים המבוקשים תפוסים' });
      }
    }

    // Reuse Customer record per phone (avoid duplicates for repeat guests)
    const fullName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'אורח';
    let customer = req.user.phone
      ? await prisma.customer.findFirst({ where: { phone: req.user.phone } })
      : null;
    if (customer) {
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          fullName,
          email: req.user.email || customer.email,
          idNumber: req.user.idNumber || customer.idNumber,
        },
      });
    } else {
      customer = await prisma.customer.create({
        data: {
          fullName,
          phone: req.user.phone || '',
          email: req.user.email || null,
          idNumber: req.user.idNumber || null,
        },
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.create({
        data: {
          customerId: customer.id,
          compoundId,
          createdByUserId: req.user.id,
          checkIn: new Date(checkIn),
          checkOut: new Date(checkOut),
          guestsCount: guestsCount || ((adults || 2) + (children || 0)),
          adults: adults || 2,
          children: children || 0,
          status: 'PENDING',
          customerNotes: customerNotes || null,
          ...(roomIds && roomIds.length > 0 && {
            bookingRooms: { create: roomIds.map((roomId) => ({ roomId })) },
          }),
        },
        include: bookingInclude,
      });

      const contractNumber = `CTR-${Date.now()}-${booking.id.slice(0, 6)}`;
      const contract = await tx.contract.create({
        data: {
          bookingId: booking.id,
          contractNumber,
          templateVersion: 'v1',
          status: 'SIGNED',
          fileUrl: contractKey,
          signedFileUrl: contractKey,
          signedAt: new Date(),
        },
      });

      await tx.signatureEvent.create({
        data: {
          contractId: contract.id,
          eventType: 'SIGNED',
          ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
          userAgent: req.headers['user-agent'] || null,
          metadata: signatureMetadata || null,
        },
      });

      return { booking, contract };
    });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// OWNER - יצירת הזמנה עם פרטי לקוח
router.post('/', requireOwner, async (req, res, next) => {
  try {
    const { compoundId, roomIds, checkIn, checkOut, guestsCount, adults, children, customerNotes, adminNotes,
            customerId, customerName, customerPhone, customerEmail, customerIdNumber } = req.body;

    if (!compoundId || !checkIn || !checkOut) {
      return res.status(400).json({ error: 'חסרים שדות חובה: מתחם, צ׳ק-אין, צ׳ק-אאוט' });
    }

    // בדיקת חפיפה ברמת חדרים (אם נבחרו חדרים)
    if (roomIds && roomIds.length > 0) {
      const overlap = await prisma.bookingRoom.findFirst({
        where: {
          roomId: { in: roomIds },
          booking: {
            status: { in: ['PENDING', 'CONFIRMED'] },
            checkIn: { lt: new Date(checkOut) },
            checkOut: { gt: new Date(checkIn) },
          },
        },
        include: { room: true },
      });
      if (overlap) {
        return res.status(409).json({ error: `חדר "${overlap.room.name}" תפוס בתאריכים המבוקשים` });
      }
    } else {
      // בדיקת חפיפה ברמת מתחם
      const overlap = await prisma.booking.findFirst({
        where: {
          compoundId,
          status: { in: ['PENDING', 'CONFIRMED'] },
          checkIn: { lt: new Date(checkOut) },
          checkOut: { gt: new Date(checkIn) },
        },
      });
      if (overlap) {
        return res.status(409).json({ error: 'התאריכים המבוקשים תפוסים' });
      }
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
        compoundId,
        createdByUserId: req.user.id,
        checkIn: new Date(checkIn),
        checkOut: new Date(checkOut),
        guestsCount: guestsCount || ((adults || 2) + (children || 0)),
        adults: adults || 2,
        children: children || 0,
        customerNotes,
        adminNotes,
        ...(roomIds && roomIds.length > 0 && {
          bookingRooms: {
            create: roomIds.map((roomId) => ({ roomId })),
          },
        }),
      },
      include: bookingInclude,
    });

    res.status(201).json(booking);
  } catch (err) {
    next(err);
  }
});

// OWNER - עדכון הזמנה מלא
router.put('/:id', requireOwner, async (req, res, next) => {
  try {
    const { compoundId, roomIds, checkIn, checkOut, guestsCount, status, customerNotes, adminNotes,
            customerName, customerPhone, customerEmail, customerIdNumber } = req.body;

    const existing = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: { customer: true, bookingRooms: true },
    });
    if (!existing) return res.status(404).json({ error: 'הזמנה לא נמצאה' });

    // Check overlap if dates or compound changed
    if (compoundId || checkIn || checkOut) {
      const newRoomIds = roomIds || existing.bookingRooms.map(br => br.roomId);
      if (newRoomIds.length > 0) {
        const overlap = await prisma.bookingRoom.findFirst({
          where: {
            roomId: { in: newRoomIds },
            booking: {
              id: { not: req.params.id },
              status: { in: ['PENDING', 'CONFIRMED'] },
              checkIn: { lt: new Date(checkOut || existing.checkOut) },
              checkOut: { gt: new Date(checkIn || existing.checkIn) },
            },
          },
        });
        if (overlap) {
          return res.status(409).json({ error: 'חדרים תפוסים בתאריכים המבוקשים' });
        }
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
    if (compoundId) bookingData.compoundId = compoundId;
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

    // Update rooms if provided
    if (roomIds) {
      await prisma.bookingRoom.deleteMany({ where: { bookingId: req.params.id } });
      if (roomIds.length > 0) {
        bookingData.bookingRooms = {
          create: roomIds.map((roomId) => ({ roomId })),
        };
      }
    }

    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: bookingData,
      include: bookingInclude,
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
      include: bookingInclude,
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
