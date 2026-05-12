const express = require('express');
const router = express.Router();
const { contactLimit } = require('../middleware/rateLimit');

router.post('/', contactLimit, async (req, res, next) => {
  try {
    const { name, phone, email, message } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'שם וטלפון הם שדות חובה' });
    }

    // TODO: persist contact form to DB or send via email/SMS to owner.
    // PII (name/phone/email/message) must NEVER be written to stdout — log only counts/timestamps.
    void email; void message;

    res.status(200).json({ message: 'הפנייה התקבלה בהצלחה, ניצור איתך קשר בהקדם' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
