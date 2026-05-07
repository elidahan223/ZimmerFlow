/**
 * In-memory rate limiter for the public AI agent endpoint.
 * Two windows per IP:
 *   - 30 requests per 5 minutes (burst protection)
 *   - 1500 requests per day  (cost cap)
 *
 * Returns 429 with retry hint if either limit is exceeded.
 */

const FIVE_MIN_MS = 5 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const PER_5MIN = 30;
const PER_DAY = 1500;

// Map<ip, { burst: number[], daily: number[] }>  arrays of request timestamps
const buckets = new Map();

function getIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

function prune(timestamps, windowMs, now) {
  const cutoff = now - windowMs;
  let i = 0;
  while (i < timestamps.length && timestamps[i] < cutoff) i++;
  if (i > 0) timestamps.splice(0, i);
}

function rateLimitAgent(req, res, next) {
  const ip = getIp(req);
  const now = Date.now();
  let bucket = buckets.get(ip);
  if (!bucket) {
    bucket = { burst: [], daily: [] };
    buckets.set(ip, bucket);
  }
  prune(bucket.burst, FIVE_MIN_MS, now);
  prune(bucket.daily, ONE_DAY_MS, now);

  if (bucket.burst.length >= PER_5MIN) {
    const oldest = bucket.burst[0];
    const retryAfter = Math.ceil((oldest + FIVE_MIN_MS - now) / 1000);
    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({
      error: 'יותר מדי בקשות. אנא נסה שוב בעוד כמה דקות.',
      retryAfterSeconds: retryAfter,
    });
  }
  if (bucket.daily.length >= PER_DAY) {
    return res.status(429).json({
      error: 'הגעת למכסה היומית של שימוש בסוכן. אנא חזור מחר או צור קשר טלפוני.',
      retryAfterSeconds: ONE_DAY_MS / 1000,
    });
  }

  bucket.burst.push(now);
  bucket.daily.push(now);
  next();
}

// Periodic cleanup of stale IPs to prevent unbounded memory growth.
setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of buckets.entries()) {
    prune(bucket.burst, FIVE_MIN_MS, now);
    prune(bucket.daily, ONE_DAY_MS, now);
    if (bucket.burst.length === 0 && bucket.daily.length === 0) {
      buckets.delete(ip);
    }
  }
}, 60 * 1000).unref();

module.exports = { rateLimitAgent };
