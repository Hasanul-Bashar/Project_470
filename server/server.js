const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const adminRoutes = require('./routes/admin.routes');
const complaintsRoutes = require('./routes/complaints.routes');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/rentease';

// ── Middleware ────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────
app.use('/api/admin', adminRoutes);
app.use('/api/complaints', complaintsRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'RentEase API is running 🚀' });
});

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// ── Connect & Start ───────────────────────────────────────────
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected →', MONGO_URI);
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log('   API prefix: /api/admin  |  /api/complaints');
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });
