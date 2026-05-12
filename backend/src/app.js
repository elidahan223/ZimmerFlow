require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const compoundRoutes = require('./routes/compounds');
const bookingRoutes = require('./routes/bookings');
const customerRoutes = require('./routes/customers');
const contactRoutes = require('./routes/contact');
const userRoutes = require('./routes/users');
const authRoutes = require('./routes/auth');
const imageRoutes = require('./routes/images');
const contractRoutes = require('./routes/contracts');
const agentRoutes = require('./routes/agent');

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

// Hide Express signature
app.disable('x-powered-by');

// Security headers - strict in production, permissive in dev for Vite HMR
app.use(helmet({
  contentSecurityPolicy: isProd
    ? {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https://*.amazonaws.com'],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          connectSrc: ["'self'", 'https://cognito-idp.*.amazonaws.com', 'https://*.amazonaws.com'],
          frameAncestors: ["'none'"],
        },
      }
    : false,
  hsts: isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  crossOriginResourcePolicy: { policy: 'same-site' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

app.use(cors({
  origin: isProd ? process.env.FRONTEND_URL : 'http://localhost:5183',
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/compounds', compoundRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/agent', agentRoutes);

// 404 handler for unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'נתיב לא נמצא' });
});

// Centralized error handler
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  // Log full details server-side (stack, request ID if any)
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, err.stack || err.message);

  // In production, don't leak internals - generic message for 5xx
  const isClientError = status >= 400 && status < 500;
  const safeMessage = isClientError
    ? (err.message || 'בקשה לא תקינה')
    : (isProd ? 'שגיאה פנימית בשרת. נסה שוב מאוחר יותר.' : (err.message || 'Internal error'));

  res.status(status).json({ error: safeMessage });
});

const server = app.listen(PORT, () => {
  console.log(`ZimmerFlow server running on port ${PORT}`);
});

// Graceful shutdown: close HTTP server, then drain Prisma connection pool.
// Without disconnecting Prisma, the postgres pool can leak on container restarts.
const prisma = require('./config/database');

async function shutdown(signal) {
  console.log(`\n[${signal}] shutting down gracefully...`);
  server.close(async () => {
    try {
      await prisma.$disconnect();
    } catch (e) {
      console.error('Error disconnecting Prisma:', e.message);
    }
    process.exit(0);
  });
  // Force exit after 10s if shutdown hangs
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;
