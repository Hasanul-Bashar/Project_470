const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('./User');
const { sendOtpEmail, sendWelcomeEmail } = require('../../services/emailService');

// Base64 token encoder helper
const encodeToken = (payload) => Buffer.from(JSON.stringify(payload)).toString('base64');

/**
 * POST /api/auth/signup
 * User / Landlord registration with OTP generation
 */
router.post('/signup', async (req, res) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;

    if (!firstName || !lastName || !email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required (firstName, lastName, email, password, role)' });
    }

    if (role === 'admin') {
      return res.status(400).json({ message: 'Admin accounts cannot be created via Signup. Use Admin Login.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if email already exists
    let existingUser = await User.findOne({ email: cleanEmail });

    if (existingUser && existingUser.isOtpVerified) {
      return res.status(400).json({
        message: 'Account with this email already exists. Please log in.',
        alreadyExists: true,
      });
    }

    // Generate 5-digit numeric OTP code
    const otpCode = Math.floor(10000 + Math.random() * 90000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
    const hashedPassword = await bcrypt.hash(password, 10);

    if (existingUser && !existingUser.isOtpVerified) {
      // Update pending unverified account
      existingUser.firstName = firstName;
      existingUser.lastName = lastName;
      existingUser.password = hashedPassword;
      existingUser.role = role;
      existingUser.otpCode = otpCode;
      existingUser.otpExpiresAt = otpExpiresAt;
      await existingUser.save();
    } else {
      // Create new user record
      existingUser = await User.create({
        firstName,
        lastName,
        email: cleanEmail,
        password: hashedPassword,
        role,
        isOtpVerified: false,
        otpCode,
        otpExpiresAt,
        isFirstLogin: true,
      });
    }

    // Send OTP email notification
    const emailResult = await sendOtpEmail(cleanEmail, otpCode);

    return res.status(201).json({
      success: true,
      message: '5-digit OTP verification code sent to your email inbox.',
      email: cleanEmail,
      role,
    });
  } catch (err) {
    console.error('❌ Signup Error:', err);
    return res.status(500).json({ message: err.message || 'Internal server error during signup' });
  }
});

/**
 * POST /api/auth/resend-otp
 * Regenerates and resends 5-digit OTP
 */
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) return res.status(404).json({ message: 'User account not found' });

    const otpCode = Math.floor(10000 + Math.random() * 90000).toString();
    user.otpCode = otpCode;
    user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendOtpEmail(cleanEmail, otpCode);

    return res.json({
      success: true,
      message: 'A new 5-digit OTP code has been sent to your email inbox.',
      email: cleanEmail,
    });
  } catch (err) {
    console.error('❌ Resend OTP Error:', err);
    return res.status(500).json({ message: 'Failed to resend OTP' });
  }
});

/**
 * POST /api/auth/verify-otp
 * Verifies 5-digit OTP, marks account verified, and sends welcome email
 */
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and 5-digit OTP code are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(404).json({ message: 'User account not found' });
    }

    if (user.isOtpVerified) {
      const token = encodeToken({ id: user._id, role: user.role, name: `${user.firstName} ${user.lastName}`, email: user.email });
      return res.json({
        success: true,
        message: 'Account is already verified',
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
          isFirstLogin: true,
        },
        token,
      });
    }

    if (user.otpCode !== otp.toString().trim()) {
      return res.status(400).json({ message: 'Invalid 5-digit OTP code. Please check and try again.' });
    }

    if (user.otpExpiresAt && new Date() > user.otpExpiresAt) {
      return res.status(400).json({ message: 'OTP code has expired. Please request a new OTP.' });
    }

    // Mark as verified
    user.isOtpVerified = true;
    user.otpCode = null;
    user.otpExpiresAt = null;
    user.isFirstLogin = true;
    await user.save();

    // Send tailored welcome email
    sendWelcomeEmail(user.email, `${user.firstName} ${user.lastName}`, user.role).catch((e) =>
      console.error('Welcome email error:', e)
    );

    const token = encodeToken({
      id: user._id,
      role: user.role,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
    });

    return res.json({
      success: true,
      message: 'OTP verified successfully!',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        isFirstLogin: true,
      },
      token,
    });
  } catch (err) {
    console.error('❌ OTP Verification Error:', err);
    return res.status(500).json({ message: 'Error verifying OTP code' });
  }
});

/**
 * POST /api/auth/login
 * Handles User, Landlord, and Admin Login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // ── 1. ADMIN LOGIN MODE (Env-based credentials check) ──
    if (role === 'admin') {
      const envAdminEmail = (process.env.ADMIN_EMAIL || 'admin@rentease.com').trim().toLowerCase();
      const envAdminPassword = process.env.ADMIN_PASSWORD || 'admin12345';

      if (cleanEmail === envAdminEmail && password === envAdminPassword) {
        const adminUser = {
          id: 'admin-001',
          firstName: 'Super',
          lastName: 'Admin',
          name: 'Super Admin',
          email: envAdminEmail,
          role: 'admin',
          isFirstLogin: false,
        };
        const token = encodeToken(adminUser);
        return res.json({
          success: true,
          message: 'Admin authentication successful',
          user: adminUser,
          token,
        });
      } else {
        return res.status(401).json({ message: 'Invalid Admin email or password.' });
      }
    }

    // ── 2. USER / LANDLORD LOGIN MODE ──
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(404).json({ message: 'No account found with this email. Please sign up.' });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password. Please try again.' });
    }

    // Check if OTP verified
    if (!user.isOtpVerified) {
      return res.status(400).json({
        message: 'Account email has not been verified yet.',
        needsOtp: true,
        email: cleanEmail,
      });
    }

    // Capture first login state then update DB to false for future logins
    const isFirstLogin = user.isFirstLogin ?? false;
    if (user.isFirstLogin) {
      user.isFirstLogin = false;
      await user.save();
    }

    // Ensure role matches requested role or keep user's stored role
    const activeRole = role || user.role;

    const userData = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      role: activeRole,
      isVerified: user.isVerified,
      isFirstLogin,
    };

    const token = encodeToken(userData);

    return res.json({
      success: true,
      message: 'Login successful!',
      user: userData,
      token,
    });
  } catch (err) {
    console.error('❌ Login Error:', err);
    return res.status(500).json({ message: 'Internal server error during login' });
  }
});

module.exports = router;
