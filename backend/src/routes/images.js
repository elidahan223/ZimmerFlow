const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { requireOwner } = require('../middleware/auth');
const { getUploadUrl, deleteObject } = require('../services/s3');

// OWNER - קבלת presigned URL להעלאה
router.post('/presign', requireOwner, async (req, res, next) => {
  try {
    const { contentType, folder, fileExtension } = req.body;
    if (!contentType || !folder || !fileExtension) {
      return res.status(400).json({ error: 'חסרים שדות: contentType, folder, fileExtension' });
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (!allowed.includes(contentType)) {
      return res.status(400).json({ error: 'סוג קובץ לא נתמך. נתמכים: JPEG, PNG, WebP, HEIC' });
    }
    const result = await getUploadUrl({ folder, fileExtension, contentType });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// OWNER - שמירת תמונת מתחם לאחר העלאה
router.post('/compound/:compoundId', requireOwner, async (req, res, next) => {
  try {
    const { url, sortOrder } = req.body;
    const image = await prisma.compoundImage.create({
      data: {
        compoundId: req.params.compoundId,
        url,
        sortOrder: parseInt(sortOrder) || 0,
      },
    });
    res.status(201).json(image);
  } catch (err) {
    next(err);
  }
});

// OWNER - שמירת תמונת חדר לאחר העלאה
router.post('/room/:roomId', requireOwner, async (req, res, next) => {
  try {
    const { url, sortOrder } = req.body;
    const image = await prisma.roomImage.create({
      data: {
        roomId: req.params.roomId,
        url,
        sortOrder: parseInt(sortOrder) || 0,
      },
    });
    res.status(201).json(image);
  } catch (err) {
    next(err);
  }
});

// OWNER - מחיקת תמונת מתחם (S3 + DB)
router.delete('/compound/:imageId', requireOwner, async (req, res, next) => {
  try {
    const image = await prisma.compoundImage.findUnique({
      where: { id: req.params.imageId },
    });
    if (!image) return res.status(404).json({ error: 'תמונה לא נמצאה' });

    await deleteObject(image.url);
    await prisma.compoundImage.delete({ where: { id: req.params.imageId } });
    res.json({ message: 'תמונה נמחקה' });
  } catch (err) {
    next(err);
  }
});

// OWNER - מחיקת תמונת חדר (S3 + DB)
router.delete('/room/:imageId', requireOwner, async (req, res, next) => {
  try {
    const image = await prisma.roomImage.findUnique({
      where: { id: req.params.imageId },
    });
    if (!image) return res.status(404).json({ error: 'תמונה לא נמצאה' });

    await deleteObject(image.url);
    await prisma.roomImage.delete({ where: { id: req.params.imageId } });
    res.json({ message: 'תמונה נמחקה' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
