const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { requireAuth } = require('../middleware/auth');
const { getContractDownloadUrl } = require('../services/s3');

// AUTH - presigned URL להורדת חוזה.
// אדמין/בעלים — לכל חוזה. אורח — רק לחוזה של הזמנה שהוא יצר.
router.get('/:id/download', requireAuth, async (req, res, next) => {
  try {
    const contract = await prisma.contract.findUnique({
      where: { id: req.params.id },
      include: { booking: { select: { createdByUserId: true } } },
    });
    if (!contract) return res.status(404).json({ error: 'חוזה לא נמצא' });
    if (!contract.signedFileUrl) return res.status(404).json({ error: 'אין קובץ חתום' });

    const isOwner = req.user.role === 'ADMIN' || req.user.role === 'OWNER';
    const isCreator = contract.booking.createdByUserId === req.user.id;
    if (!isOwner && !isCreator) {
      return res.status(403).json({ error: 'אין הרשאה לצפות בחוזה זה' });
    }

    const url = await getContractDownloadUrl(contract.signedFileUrl, 600);
    res.json({ url, expiresIn: 600 });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
