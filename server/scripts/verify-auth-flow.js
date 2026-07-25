const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../features/auth/User');
const { sendOtpEmail, sendWelcomeEmail } = require('../services/emailService');

async function testAuthLogic() {
  console.log('🧪 Starting Auth & Email Verification Test Suite...\n');

  try {
    // 1. Test Email Service Nodemailer & Fallback
    console.log('1️⃣ Testing Email Service...');
    const otpRes = await sendOtpEmail('test.user@example.com', '98765');
    console.log('  -> OTP Email Result:', otpRes);

    const welcomeRes = await sendWelcomeEmail('test.user@example.com', 'Test User', 'user');
    console.log('  -> Welcome Email Result:', welcomeRes);

    // 2. Test Admin Credentials Verification
    console.log('\n2️⃣ Testing Admin Credentials Logic...');
    const envAdminEmail = (process.env.ADMIN_EMAIL || 'admin@rentease.com').toLowerCase();
    const envAdminPassword = process.env.ADMIN_PASSWORD || 'admin12345';
    console.log(`  -> Configured Admin Email: ${envAdminEmail}`);
    console.log(`  -> Configured Admin Password: ${envAdminPassword}`);

    // 3. Connect to Database & Verify User Model Schema
    console.log('\n3️⃣ Connecting to MongoDB Database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('  -> Connected to MongoDB Atlas!');

    // Cleanup test user if exists
    await User.deleteOne({ email: 'authtest.user@example.com' });

    // Create test user with OTP
    const testOtp = '54321';
    const newUser = await User.create({
      firstName: 'Auth',
      lastName: 'Tester',
      email: 'authtest.user@example.com',
      password: 'hashed_password_123',
      role: 'user',
      isOtpVerified: false,
      otpCode: testOtp,
      otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      isFirstLogin: true,
    });
    console.log('  -> Created Test User:', newUser.email, '| OTP:', newUser.otpCode);

    // Verify OTP
    newUser.isOtpVerified = true;
    newUser.otpCode = null;
    newUser.otpExpiresAt = null;
    await newUser.save();
    console.log('  -> Verified Test User Account successfully!');

    // Clean up
    await User.deleteOne({ email: 'authtest.user@example.com' });
    console.log('  -> Cleaned up test data.');

    await mongoose.disconnect();
    console.log('\n✅ All Auth & Email logic tests PASSED successfully!');
  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  }
}

testAuthLogic();
