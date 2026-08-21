const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { sendOtpEmail, sendWelcomeEmail } = require('../services/emailService');

const generateOtp = () => Math.floor(10000 + Math.random() * 90000).toString();

exports.signup = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    if (role === 'admin') {
      return res.status(403).json({ message: 'Admin accounts cannot be registered via signup.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists. Please log in.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const otpCode = generateOtp();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const newUser = await User.create({
      firstName,
      lastName,
      name: `${firstName || ''} ${lastName || ''}`.trim() || 'User',
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || 'user',
      isOtpVerified: false,
      otpCode,
      otpExpiresAt,
      isVerifiedLandlord: role === 'landlord' ? false : true,
      isFirstLogin: true,
    });

    try {
      await sendOtpEmail(newUser.email, otpCode);
    } catch (emailErr) {
      console.error('⚠️ OTP email dispatch error:', emailErr.message);
    }

    return res.status(201).json({
      success: true,
      message: `Registration initiated. A 5-digit verification OTP code was sent to ${newUser.email}.`,
      email: newUser.email,
      role: newUser.role,
    });
  } catch (err) {
    console.error('❌ Signup Error:', err);
    return res.status(500).json({ message: 'Server error during signup.' });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and 5-digit OTP are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'User account not found.' });
    }

    if (user.isOtpVerified) {
      return res.status(400).json({ message: 'Account is already OTP verified. Please log in.' });
    }

    if (user.otpCode !== otp || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired OTP code. Please request a new OTP.' });
    }

    user.isOtpVerified = true;
    user.otpCode = null;
    user.otpExpiresAt = null;
    user.isFirstLogin = true;
    await user.save();

    try {
      await sendWelcomeEmail(user.email, user.firstName || user.name || 'User', user.role);
    } catch (welcomeErr) {
      console.error('⚠️ Welcome email dispatch error:', welcomeErr.message);
    }

    const mockToken = `mock-jwt-token-${user._id}-${Date.now()}`;

    return res.json({
      success: true,
      message: 'Email successfully verified! Welcome to RentEase.',
      token: mockToken,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name,
        isVerifiedLandlord: user.isVerifiedLandlord,
        isFirstLogin: true,
      },
    });
  } catch (err) {
    console.error('❌ OTP Verification Error:', err);
    return res.status(500).json({ message: 'Server error verifying OTP.' });
  }
};

exports.resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required.' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'User account not found.' });

    if (user.isOtpVerified) {
      return res.status(400).json({ message: 'Account is already verified. Please log in.' });
    }

    const newOtp = generateOtp();
    user.otpCode = newOtp;
    user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    try {
      await sendOtpEmail(user.email, newOtp);
    } catch (emailErr) {
      console.error('⚠️ Resend OTP email error:', emailErr.message);
    }

    return res.json({
      success: true,
      message: `A new 5-digit verification OTP code was dispatched to ${user.email}.`,
      email: user.email,
    });
  } catch (err) {
    console.error('❌ Resend OTP Error:', err);
    return res.status(500).json({ message: 'Server error resending OTP.' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    if (role === 'admin') {
      const envAdminEmail = process.env.ADMIN_EMAIL || 'admin@rentease.com';
      const envAdminPassword = process.env.ADMIN_PASSWORD || 'admin12345';

      if (email.toLowerCase() === envAdminEmail.toLowerCase() && password === envAdminPassword) {
        const mockAdminToken = `mock-admin-token-${Date.now()}`;
        return res.json({
          success: true,
          message: 'Admin authenticated successfully.',
          token: mockAdminToken,
          user: {
            id: 'admin-001',
            email: envAdminEmail,
            role: 'admin',
            name: 'Super Admin',
            firstName: 'Super',
            isFirstLogin: false,
          },
        });
      } else {
        return res.status(401).json({ message: 'Invalid Admin credentials.' });
      }
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    if (!user.isOtpVerified) {
      const newOtp = generateOtp();
      user.otpCode = newOtp;
      user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();

      try {
        await sendOtpEmail(user.email, newOtp);
      } catch (e) {}

      return res.status(403).json({
        message: 'Account not verified. A new 5-digit verification OTP was sent to your email.',
        requireOtp: true,
        email: user.email,
      });
    }

    const mockToken = `mock-jwt-token-${user._id}-${Date.now()}`;

    const isFirst = user.isFirstLogin;
    if (isFirst) {
      user.isFirstLogin = false;
      await user.save();
    }

    return res.json({
      success: true,
      message: 'Login successful.',
      token: mockToken,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        isVerifiedLandlord: user.isVerifiedLandlord,
        isFirstLogin: isFirst,
      },
    });
  } catch (err) {
    console.error('❌ Login Error:', err);
    return res.status(500).json({ message: 'Server error during login.' });
  }
};
