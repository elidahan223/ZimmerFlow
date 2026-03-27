const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { requireOwner } = require('../middleware/auth');

// POST - נקרא אחרי רישום מוצלח ב-Cognito, שומר את הפרטים ב-DB
router.post('/register', requireOwner, async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone, idNumber, address } = req.body;

    // Check if user already exists by cognitoSub
    const existing = await prisma.user.findUnique({
      where: { cognitoSub: req.user.sub },
    });

    if (existing) {
      // Update existing user with new details
      const updated = await prisma.user.update({
        where: { cognitoSub: req.user.sub },
        data: { firstName, lastName, email, phone, idNumber, address },
      });
      return res.json(updated);
    }

    const user = await prisma.user.create({
      data: {
        cognitoSub: req.user.sub,
        firstName,
        lastName,
        email: email || req.user.email,
        phone,
        idNumber,
        address,
        role: 'OWNER',
      },
    });

    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

// GET - פרטי המשתמש המחובר
router.get('/me', requireOwner, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { cognitoSub: req.user.sub },
    });
    if (!user) {
      return res.status(404).json({ error: 'משתמש לא נמצא', needsRegistration: true });
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
