const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const adminRoutes = require('./routes/admin.routes');
const complaintsRoutes = require('./routes/complaints.routes');
const listingsRoutes = require('./routes/listings.routes');

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

// ── Routes ────────────────────────────────────────────────────
app.use('/api/admin', adminRoutes);
app.use('/api/complaints', complaintsRoutes);
app.use('/api/listings', listingsRoutes);


// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'RentEase API is running 🚀' });
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
