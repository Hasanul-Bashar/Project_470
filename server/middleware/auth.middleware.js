/**
 * Auth Middleware — extracts mock JWT token or user profile header and attaches to req.user.
 * Also enforces role-based access control (RBAC).
 */

const decodeToken = (token) => {
  try {
    const jsonStr = Buffer.from(token, 'base64').toString('utf8');
    return JSON.parse(jsonStr);
  } catch (e) {
    return null;
  }
};

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  // Default fallback user
  let user = {
    id: 'demo-user-id',
    email: 'demo@rentease.com',
    role: 'user',
    isVerifiedLandlord: true,
  };

  // 1. Check custom headers
  const savedUserHeader = req.headers['x-user-profile'] || req.headers['x-user-data'];
  if (savedUserHeader) {
    try {
      user = JSON.parse(savedUserHeader);
    } catch (e) {}
  }

  // 2. Decode token if present
  if (token) {
    if (token.includes('admin')) {
      user = {
        id: 'admin-001',
        email: process.env.ADMIN_EMAIL || 'admin@rentease.com',
        role: 'admin',
        name: 'Super Admin',
        isVerifiedLandlord: true,
      };
    } else {
      const decoded = decodeToken(token);
      if (decoded && decoded.role) {
        user = { ...user, ...decoded };
      }
    }
  }

  req.user = user;
  next();
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin role required.' });
  }
  next();
};

module.exports = { authenticate, requireAdmin };
