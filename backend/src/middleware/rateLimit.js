/**
 * Generic in-memory IP rate limiter.
 * Each call to createRateLimit returns an Express middleware tracking requests
 * per IP within a sliding window.
 */

function getIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

function pruneAndCount(timestamps, windowMs, now) {
  const cutoff = now - windowMs;
  let i = 0;
  while (i < timestamps.length && timestamps[i] < cutoff) i++;
  if (i > 0) timestamps.splice(0, i);
  return timestamps.length;
}

function createRateLimit({ windowMs, max, message = 'יותר מדי בקשות. נסה שוב בעוד כמה דקות.' }) {
  const store = new Map();

  // Periodic cleanup of stale IPs
  setInterval(() => {
    const now = Date.now();
    for (const [ip, arr] of store.entries()) {
      pruneAndCount(arr, windowMs, now);
      if (arr.length === 0) store.delete(ip);
    }
  }, 60 * 1000).unref();

  return function (req, res, next) {
    const ip = getIp(req);
    const now = Date.now();
    let arr = store.get(ip);
    if (!arr) {
      arr = [];
      store.set(ip, arr);
    }
    const count = pruneAndCount(arr, windowMs, now);
    if (count >= max) {
      const retryAfter = Math.ceil((arr[0] + windowMs - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ error: message, retryAfterSeconds: retryAfter });
    }
    arr.push(now);
    next();
  };
}

// Pre-configured limiters for common cases
const authLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // 10 attempts per 15min per IP
  message: 'יותר מדי ניסיונות התחברות. נסה שוב בעוד 15 דקות.',
});

const contactLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,                    // 5 messages per hour
  message: 'שלחת הרבה הודעות בזמן קצר. נסה שוב בעוד שעה.',
});

const bookingLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,                   // 10 booking requests per hour per IP
  message: 'יותר מדי בקשות הזמנה. נסה שוב בעוד שעה.',
});

// Refresh token endpoint: bound but lenient (legitimate clients may refresh often).
// Without this, a stolen refresh token can be brute-forced indefinitely.
const refreshLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,                   // 30 refreshes per 15min per IP
  message: 'יותר מדי ניסיונות רענון. נסה שוב בעוד מעט.',
});

/**
 * AI agent has TWO windows: 30/5min (burst) AND 1500/day (cost cap).
 * Use both as a chain.
 */
const agentBurst = createRateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  message: 'יותר מדי בקשות. אנא נסה שוב בעוד כמה דקות.',
});
const agentDaily = createRateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 1500,
  message: 'הגעת למכסה היומית של שימוש בסוכן. אנא חזור מחר או צור קשר טלפוני.',
});
const rateLimitAgent = [agentBurst, agentDaily];

module.exports = { createRateLimit, authLimit, contactLimit, bookingLimit, refreshLimit, rateLimitAgent };
