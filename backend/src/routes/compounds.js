const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { requireOwner } = require('../middleware/auth');
const { deleteObject } = require('../services/s3');
const { requireString, optionalString, requireNumber, optionalEnum } = require('../middleware/validate');

const VALID_STATUSES = ['ACTIVE', 'INACTIVE', 'MAINTENANCE'];

function validateCompoundBody(body) {
  return {
    name: requireString(body.name, 'שם המתחם', { min: 2, max: 100 }),
    description: optionalString(body.description, 'תיאור', { max: 2000 }),
    tagline: optionalString(body.tagline, 'תגית', { max: 200 }),
    capacity: requireNumber(body.capacity, 'תפוסה', { min: 1, max: 50 }),
    weekdayPrice: requireNumber(body.weekdayPrice, 'מחיר יום חול', { min: 0, max: 100000 }),
    weekendPrice: requireNumber(body.weekendPrice, 'מחיר סוף שבוע', { min: 0, max: 100000 }),
    holidayPrice: body.holidayPrice ? requireNumber(body.holidayPrice, 'מחיר חג', { min: 0, max: 100000 }) : null,
    yardDescription: optionalString(body.yardDescription, 'תיאור חצר', { max: 1000 }),
    videoUrl: optionalString(body.videoUrl, 'קישור לסרטון', { max: 500 }),
    status: optionalEnum(body.status, 'סטטוס', VALID_STATUSES) || 'ACTIVE',
  };
}

// PUBLIC - מתחמים פעילים עם חדרים ותמונות
router.get('/', async (req, res, next) => {
  try {
    const compounds = await prisma.compound.findMany({
      where: { status: 'ACTIVE' },
      include: {
        rooms: {
          orderBy: { sortOrder: 'asc' },
          include: { images: { orderBy: { sortOrder: 'asc' } } },
        },
        images: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { name: 'asc' },
    });
    res.json(compounds);
  } catch (err) {
    next(err);
  }
});

// OWNER - כל המתחמים (כולל לא פעילים) לדף הגדרות
router.get('/admin/all', requireOwner, async (req, res, next) => {
  try {
    const compounds = await prisma.compound.findMany({
      include: {
        rooms: {
          orderBy: { sortOrder: 'asc' },
          include: { images: { orderBy: { sortOrder: 'asc' } } },
        },
        images: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { bookings: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(compounds);
  } catch (err) {
    next(err);
  }
});

// PUBLIC - מתחם בודד
router.get('/:id', async (req, res, next) => {
  try {
    const compound = await prisma.compound.findUnique({
      where: { id: req.params.id },
      include: {
        rooms: {
          orderBy: { sortOrder: 'asc' },
          include: { images: { orderBy: { sortOrder: 'asc' } } },
        },
        images: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!compound) return res.status(404).json({ error: 'מתחם לא נמצא' });
    res.json(compound);
  } catch (err) {
    next(err);
  }
});

// OWNER - יצירת מתחם
router.post('/', requireOwner, async (req, res, next) => {
  try {
    const data = validateCompoundBody(req.body);
    const compound = await prisma.compound.create({
      data,
      include: {
        rooms: {
          orderBy: { sortOrder: 'asc' },
          include: { images: { orderBy: { sortOrder: 'asc' } } },
        },
        images: { orderBy: { sortOrder: 'asc' } },
      },
    });
    res.status(201).json(compound);
  } catch (err) {
    next(err);
  }
});

// OWNER - עדכון מתחם
router.put('/:id', requireOwner, async (req, res, next) => {
  try {
    const data = validateCompoundBody(req.body);
    const compound = await prisma.compound.update({
      where: { id: req.params.id },
      data,
      include: {
        rooms: {
          orderBy: { sortOrder: 'asc' },
          include: { images: { orderBy: { sortOrder: 'asc' } } },
        },
        images: { orderBy: { sortOrder: 'asc' } },
      },
    });
    res.json(compound);
  } catch (err) {
    next(err);
  }
});

// OWNER - מחיקת מתחם
router.delete('/:id', requireOwner, async (req, res, next) => {
  try {
    const activeBooking = await prisma.booking.findFirst({
      where: {
        compoundId: req.params.id,
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    });
    if (activeBooking) {
      return res.status(409).json({ error: 'לא ניתן למחוק מתחם עם הזמנות פעילות' });
    }

    // Collect all image URLs for S3 cleanup
    const compoundImages = await prisma.compoundImage.findMany({
      where: { compoundId: req.params.id },
      select: { url: true },
    });
    const rooms = await prisma.room.findMany({
      where: { compoundId: req.params.id },
      include: { images: { select: { url: true } } },
    });
    const roomImageUrls = rooms.flatMap((r) => r.images.map((img) => img.url));
    const allUrls = [...compoundImages.map((img) => img.url), ...roomImageUrls];

    // Delete from DB (cascade handles room_images)
    await prisma.$transaction([
      prisma.compoundImage.deleteMany({ where: { compoundId: req.params.id } }),
      prisma.roomImage.deleteMany({ where: { room: { compoundId: req.params.id } } }),
      prisma.room.deleteMany({ where: { compoundId: req.params.id } }),
      prisma.compound.delete({ where: { id: req.params.id } }),
    ]);

    // Delete from S3 (best effort)
    await Promise.allSettled(allUrls.map((url) => deleteObject(url)));

    res.json({ message: 'מתחם נמחק בהצלחה' });
  } catch (err) {
    next(err);
  }
});

// === חדרים ===

// OWNER - הוספת חדר למתחם
router.post('/:id/rooms', requireOwner, async (req, res, next) => {
  try {
    const { name, description, capacity, sortOrder } = req.body;
    const room = await prisma.room.create({
      data: {
        compoundId: req.params.id,
        name,
        description,
        capacity: capacity ? parseInt(capacity) : null,
        sortOrder: parseInt(sortOrder) || 0,
      },
    });
    res.status(201).json(room);
  } catch (err) {
    next(err);
  }
});

// OWNER - עדכון חדר
router.put('/rooms/:roomId', requireOwner, async (req, res, next) => {
  try {
    const { name, description, capacity, sortOrder } = req.body;
    const room = await prisma.room.update({
      where: { id: req.params.roomId },
      data: {
        name,
        description,
        capacity: capacity ? parseInt(capacity) : null,
        sortOrder: parseInt(sortOrder) || 0,
      },
    });
    res.json(room);
  } catch (err) {
    next(err);
  }
});

// OWNER - מחיקת חדר
router.delete('/rooms/:roomId', requireOwner, async (req, res, next) => {
  try {
    const roomImages = await prisma.roomImage.findMany({
      where: { roomId: req.params.roomId },
      select: { url: true },
    });
    await prisma.roomImage.deleteMany({ where: { roomId: req.params.roomId } });
    await prisma.room.delete({ where: { id: req.params.roomId } });
    await Promise.allSettled(roomImages.map((img) => deleteObject(img.url)));
    res.json({ message: 'חדר נמחק' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
