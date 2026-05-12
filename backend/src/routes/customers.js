const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { requireOwner } = require('../middleware/auth');
const { requireString, requirePhone, optionalEmail } = require('../middleware/validate');

// OWNER - כל הלקוחות
router.get('/', requireOwner, async (req, res, next) => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(customers);
  } catch (err) {
    next(err);
  }
});

// OWNER - לקוח בודד עם הזמנות
router.get('/:id', requireOwner, async (req, res, next) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: { bookings: { include: { cabin: true } } },
    });
    if (!customer) return res.status(404).json({ error: 'לקוח לא נמצא' });
    res.json(customer);
  } catch (err) {
    next(err);
  }
});

// OWNER - יצירת לקוח
router.post('/', requireOwner, async (req, res, next) => {
  try {
    const fullName = requireString(req.body.fullName, 'שם מלא', { min: 2, max: 100 });
    const phone = requirePhone(req.body.phone);
    const email = optionalEmail(req.body.email);
    const customer = await prisma.customer.create({
      data: { fullName, phone, email },
    });
    res.status(201).json(customer);
  } catch (err) {
    next(err);
  }
});

// OWNER - עדכון לקוח
router.put('/:id', requireOwner, async (req, res, next) => {
  try {
    const fullName = requireString(req.body.fullName, 'שם מלא', { min: 2, max: 100 });
    const phone = requirePhone(req.body.phone);
    const email = optionalEmail(req.body.email);
    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: { fullName, phone, email },
    });
    res.json(customer);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
