const mongoose = require('mongoose');
const User = require('../models/User');
const Listing = require('../models/Listing');
const Complaint = require('../models/Complaint');
const RentPayment = require('../models/RentPayment');
const MaintenanceRequest = require('../models/MaintenanceRequest');
const Notification = require('../models/Notification');
const Agreement = require('../models/Agreement');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/rentease';

async function seedClean() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB →', MONGO_URI);

    console.log('🗑️  Wiping all demo records...');
    await RentPayment.deleteMany({});
    await MaintenanceRequest.deleteMany({});
    await Notification.deleteMany({});
    await Agreement.deleteMany({});
    await Complaint.deleteMany({});

    console.log('✨ All demo records, notifications, agreements, payments & maintenance tickets cleared!');
  } catch (err) {
    console.error('❌ Error during clean wipe:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

seedClean();
