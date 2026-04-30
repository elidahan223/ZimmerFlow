require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const cabinRoutes = require('./routes/cabins');
const compoundRoutes = require('./routes/compounds');
const bookingRoutes = require('./routes/bookings');
const customerRoutes = require('./routes/customers');
const contactRoutes = require('./routes/contact');
const userRoutes = require('./routes/users');
const authRoutes = require('./routes/auth');
const imageRoutes = require('./routes/images');
const contractRoutes = require('./routes/contracts');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : 'http://localhost:5183',
  credentials: true,
}));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/cabins', cabinRoutes);
app.use('/api/compounds', compoundRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/contracts', contractRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'שגיאה פנימית בשרת',
  });
});

const server = app.listen(PORT, () => {
  console.log(`ZimmerFlow server running on port ${PORT}`);
});

// Keep process alive
process.on('SIGTERM', () => server.close());

module.exports = app;
