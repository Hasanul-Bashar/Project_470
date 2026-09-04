const mongoose = require('mongoose');
const RentPayment = require('../models/RentPayment');
const MaintenanceRequest = require('../models/MaintenanceRequest');
const Notification = require('../models/Notification');
const Agreement = require('../models/Agreement');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/rentease';

async function clearDemoData() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB →', MONGO_URI);

    await RentPayment.deleteMany({});
    console.log('🧹 Cleared all demo Rent Payments');

    await MaintenanceRequest.deleteMany({});
    console.log('🧹 Cleared all demo Maintenance Requests');

    await Notification.deleteMany({});
    console.log('🧹 Cleared all demo Notifications');

    await Agreement.deleteMany({});
    console.log('🧹 Cleared all demo Rental Agreements');

    console.log('\n✨ Database cleared of all demo records!');
  } catch (err) {
    console.error('❌ Error clearing demo records:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

clearDemoData();
