const express = require('express');
const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const { name, phone, email, message } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'שם וטלפון הם שדות חובה' });
    }

    console.log('New contact form submission:', { name, phone, email, message });

    res.status(200).json({ message: 'הפנייה התקבלה בהצלחה, ניצור איתך קשר בהקדם' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
