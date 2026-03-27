const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { requireOwner } = require('../middleware/auth');

// PUBLIC - כולם רואים צימרים + תמונות
router.get('/', async (req, res, next) => {
  try {
    const cabins = await prisma.cabin.findMany({
      where: { status: 'ACTIVE' },
      include: { images: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { name: 'asc' },
    });
    res.json(cabins);
  } catch (err) {
    next(err);
  }
});

// PUBLIC - צימר בודד
router.get('/:id', async (req, res, next) => {
  try {
    const cabin = await prisma.cabin.findUnique({
      where: { id: req.params.id },
      include: { images: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!cabin) return res.status(404).json({ error: 'צימר לא נמצא' });
    res.json(cabin);
  } catch (err) {
    next(err);
  }
});

// OWNER - יצירת צימר
router.post('/', requireOwner, async (req, res, next) => {
  try {
    const { name, description, tagline, capacity, basePrice } = req.body;
    const cabin = await prisma.cabin.create({
      data: { name, description, tagline, capacity, basePrice },
    });
    res.status(201).json(cabin);
  } catch (err) {
    next(err);
  }
});

// OWNER - עדכון צימר (מחיר, טקסט, תיאור)
router.put('/:id', requireOwner, async (req, res, next) => {
  try {
    const { name, description, tagline, capacity, basePrice, status } = req.body;
    const cabin = await prisma.cabin.update({
      where: { id: req.params.id },
      data: { name, description, tagline, capacity, basePrice, status },
      include: { images: { orderBy: { sortOrder: 'asc' } } },
    });
    res.json(cabin);
  } catch (err) {
    next(err);
  }
});

// OWNER - הוספת תמונה לצימר
router.post('/:id/images', requireOwner, async (req, res, next) => {
  try {
    const { url, sortOrder } = req.body;
    const image = await prisma.cabinImage.create({
      data: { cabinId: req.params.id, url, sortOrder: sortOrder || 0 },
    });
    res.status(201).json(image);
  } catch (err) {
    next(err);
  }
});

// OWNER - מחיקת תמונה
router.delete('/images/:imageId', requireOwner, async (req, res, next) => {
  try {
    await prisma.cabinImage.delete({ where: { id: req.params.imageId } });
    res.json({ message: 'תמונה נמחקה' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
