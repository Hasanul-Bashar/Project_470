const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes       = require('./routes/authRoutes');
const adminRoutes      = require('./routes/adminRoutes');
const complaintRoutes  = require('./routes/complaintRoutes');
const listingRoutes    = require('./routes/listingRoutes');
const bookingRoutes    = require('./routes/bookingRoutes');
const reviewRoutes     = require('./routes/reviewRoutes');
const analyticsRoutes  = require('./routes/analyticsRoutes');
const chatRoutes       = require('./routes/chatRoutes');
const trustScoreRoutes = require('./routes/trustScoreRoutes');
const assistantRoutes  = require('./routes/assistantRoutes');
const rentRoutes         = require('./routes/rentRoutes');
const maintenanceRoutes  = require('./routes/maintenanceRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const agreementRoutes    = require('./routes/agreementRoutes');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/rentease';

// ── CORS & Body Parsing ───────────────────────────────────────
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// ── Serverless Mongoose Connection Cache ───────────────────────
let isConnected = false;
const connectDB = async () => {
  if (isConnected && mongoose.connection.readyState === 1) return;
  try {
    const db = await mongoose.connect(MONGO_URI);
    isConnected = db.connections[0].readyState === 1;
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
  }
};

// Middleware to ensure DB connection on every request
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

// ── Routes (MVC Pattern Controller Mounts) ────────────────────
app.use('/api/auth',         authRoutes);
app.use('/api/admin',        adminRoutes);
app.use('/api/complaints',   complaintRoutes);
app.use('/api/listings',     listingRoutes);
app.use('/api/bookings',     bookingRoutes);
app.use('/api/reviews',      reviewRoutes);
app.use('/api/analytics',    analyticsRoutes);
app.use('/api/chats',        chatRoutes);
app.use('/api/trust-score',  trustScoreRoutes);
app.use('/api/assistant',    assistantRoutes);
app.use('/api/rent',           rentRoutes);
app.use('/api/maintenance',    maintenanceRoutes);
app.use('/api/notifications',  notificationRoutes);
app.use('/api/agreements',     agreementRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'RentEase MVC API is running 🚀' });
});

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// ── Start Server locally (if not imported by Vercel) ──────────
if (require.main === module) {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  });
}

module.exports = app;
