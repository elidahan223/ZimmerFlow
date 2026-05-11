const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { requireOwner, requireAuth } = require('../middleware/auth');
const { deleteContract } = require('../services/s3');
const { generateContractPdf } = require('../services/contractPdfService');
const { bookingLimit } = require('../middleware/rateLimit');

const bookingInclude = {
  customer: true,
  compound: true,
  bookingRooms: { include: { room: true } },
  contracts: { select: { id: true, contractNumber: true, status: true, signedAt: true } },
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

// AUTH - ההזמנות של המשתמש המחובר (כל סטטוס)
router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { createdByUserId: req.user.id },
      include: { ...bookingInclude, contracts: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(bookings);
  } catch (err) {
    next(err);
  }
});

// OWNER - הזמנות ממתינות לאישור (לטאב התראות)
router.get('/pending', requireOwner, async (req, res, next) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { status: 'PENDING' },
      include: { ...bookingInclude, contracts: true },
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

// AUTH - בקשת הזמנה ע"י משתמש מחובר (תומך מרובה מתחמים, מייצר PDF חתום בשרת)
router.post('/request', bookingLimit, requireAuth, async (req, res, next) => {
  try {
    const {
      compounds: compoundsInput,
      checkIn, checkOut,
      checkInTime, checkOutTime,
      adults, children, guestsCount,
      customerNotes,
      signatureBase64,
      totalPrice,
    } = req.body;

    if (!Array.isArray(compoundsInput) || compoundsInput.length === 0) {
      return res.status(400).json({ error: 'יש לבחור לפחות מתחם אחד' });
    }
    if (!checkIn || !checkOut) {
      return res.status(400).json({ error: 'חסרים תאריכי צ׳ק-אין/צ׳ק-אאוט' });
    }
    if (!signatureBase64 || !signatureBase64.startsWith('data:image/')) {
      return res.status(400).json({ error: 'נדרשת חתימה תקינה' });
    }

    // Validate every compound + overlap check, and load names for the contract
    const compoundDetails = [];
    for (const item of compoundsInput) {
      const compoundId = item.compoundId;
      const roomIds = Array.isArray(item.roomIds) ? item.roomIds : [];
      if (!compoundId) {
        return res.status(400).json({ error: 'מתחם לא תקין' });
      }
      const compound = await prisma.compound.findUnique({
        where: { id: compoundId },
        include: { rooms: true },
      });
      if (!compound) {
        return res.status(404).json({ error: 'מתחם לא נמצא' });
      }

      if (roomIds.length > 0) {
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
          return res.status(409).json({ error: `המתחם "${compound.name}" תפוס בתאריכים המבוקשים` });
        }
      }

      const pickedRoomNames = roomIds
        .map((rid) => compound.rooms.find((r) => r.id === rid)?.name)
        .filter(Boolean);
      compoundDetails.push({
        compoundId,
        compoundName: compound.name,
        roomIds,
        roomsLabel: roomIds.length === 0 ? 'כל המתחם' : 'חדרים: ' + pickedRoomNames.join(', '),
      });
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

    // Compute nights from dates
    const nights = Math.max(0, Math.round(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000
    ));

    // Generate signed PDF on the server
    const pdfData = {
      customerName: fullName,
      customerIdNumber: req.user.idNumber || '',
      customerPhone: req.user.phone || '',
      customerAddress: req.user.address || '',
      bookingItems: compoundDetails.map((c) => ({
        compoundName: c.compoundName,
        roomsLabel: c.roomsLabel,
      })),
      checkIn,
      checkOut,
      checkInTime: checkInTime || '15:00',
      checkOutTime: checkOutTime || '11:00',
      nights,
      adults: adults || 2,
      children: children || 0,
      totalPrice: totalPrice ?? null,
      signatureBase64,
      signedDate: new Date().toISOString().slice(0, 10),
    };

    let contractKey;
    try {
      const result = await generateContractPdf(pdfData);
      contractKey = result.key;
    } catch (e) {
      console.error('PDF generation failed:', e);
      return res.status(500).json({ error: 'שגיאה ביצירת קובץ החוזה' });
    }

    // Create one booking + contract per compound, all sharing the same contractKey
    const created = await prisma.$transaction(async (tx) => {
      const out = [];
      for (const c of compoundDetails) {
        const booking = await tx.booking.create({
          data: {
            customerId: customer.id,
            compoundId: c.compoundId,
            createdByUserId: req.user.id,
            checkIn: new Date(checkIn),
            checkOut: new Date(checkOut),
            guestsCount: guestsCount || ((adults || 2) + (children || 0)),
            adults: adults || 2,
            children: children || 0,
            status: 'PENDING',
            customerNotes: customerNotes || null,
            ...(c.roomIds.length > 0 && {
              bookingRooms: { create: c.roomIds.map((roomId) => ({ roomId })) },
            }),
          },
          include: bookingInclude,
        });

        const contractNumber = `CTR-${Date.now()}-${booking.id.slice(0, 6)}`;
        const contract = await tx.contract.create({
          data: {
            bookingId: booking.id,
            contractNumber,
            templateVersion: 'v2',
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
            metadata: { checkInTime, checkOutTime, totalPrice, signedDate: pdfData.signedDate },
          },
        });

        out.push({ booking, contract });
      }
      return out;
    });

    res.status(201).json({ bookings: created.map((c) => c.booking), contractKey });
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

// OWNER - מחיקת הזמנה (כולל ניקוי PDF החוזה אם לא משותף)
router.delete('/:id', requireOwner, async (req, res, next) => {
  try {
    // Get contracts attached to this booking before deletion
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: { contracts: true },
    });
    if (!booking) return res.status(404).json({ error: 'הזמנה לא נמצאה' });

    const contractKeys = booking.contracts
      .map((c) => c.signedFileUrl || c.fileUrl)
      .filter(Boolean);

    // Delete the booking (cascade removes contracts via FK if set, but here we delete contracts manually)
    await prisma.$transaction([
      prisma.signatureEvent.deleteMany({
        where: { contract: { bookingId: req.params.id } },
      }),
      prisma.contract.deleteMany({ where: { bookingId: req.params.id } }),
      prisma.bookingRoom.deleteMany({ where: { bookingId: req.params.id } }),
      prisma.notification.deleteMany({ where: { bookingId: req.params.id } }),
      prisma.booking.delete({ where: { id: req.params.id } }),
    ]);

    // For each contract key, only delete from S3 if no other contract still references it
    for (const key of contractKeys) {
      const stillReferenced = await prisma.contract.findFirst({
        where: { OR: [{ fileUrl: key }, { signedFileUrl: key }] },
      });
      if (!stillReferenced) {
        await deleteContract(key).catch(() => {});
      }
    }

    res.json({ message: 'ההזמנה נמחקה' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
