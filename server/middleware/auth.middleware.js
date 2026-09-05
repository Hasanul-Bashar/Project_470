const mongoose = require('mongoose');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

    // Demo user defaults if no token header provided
    req.user = {
      id: 'demo-user-id',
      email: 'demo@rentease.com',
      role: 'user',
      isVerifiedLandlord: true,
    };

    if (token) {
      if (token.includes('admin')) {
        req.user = {
          id: 'admin-001',
          email: process.env.ADMIN_EMAIL || 'admin@rentease.com',
          role: 'admin',
          name: 'Super Admin',
          isVerifiedLandlord: true,
        };
      } else {
        const savedUserHeader = req.headers['x-user-data'];
        if (savedUserHeader) {
          try {
            req.user = typeof savedUserHeader === 'string' ? JSON.parse(savedUserHeader) : savedUserHeader;
          } catch (e) { }
        } else if (token) {
          try {
            const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
            if (decoded && decoded.role) {
              req.user = decoded;
            }
          } catch (e) { }
        }

        // Try extracting user ID from mock-jwt-token-<id>-<timestamp>
        const match = token.match(/^mock-jwt-token-([a-f0-9]{24})/i);
        if (match && match[1]) {
          const userId = match[1];
          if (mongoose.Types.ObjectId.isValid(userId)) {
            const dbUser = await User.findById(userId);
            if (dbUser) {
              req.user = {
                id: dbUser._id.toString(),
                email: dbUser.email,
                role: dbUser.role,
                name: dbUser.name || `${dbUser.firstName || ''} ${dbUser.lastName || ''}`.trim(),
                firstName: dbUser.firstName,
                lastName: dbUser.lastName,
                isVerifiedLandlord: dbUser.isVerifiedLandlord,
              };
            }
          }
        }
      }
    }
    next();
  } catch (err) {
    console.error('⚠️ Auth middleware error:', err.message);
    next();
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin role required.' });
  }
  next();
};

module.exports = { authenticate, requireAdmin };
