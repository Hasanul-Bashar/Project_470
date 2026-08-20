/**
 * Auth Middleware — extracts mock JWT token and attaches user role to req.user.
 * Also enforces role-based access control (RBAC).
 */

const authenticate = (req, res, next) => {
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
      try {
        const savedUser = req.headers['x-user-data'];
        if (savedUser) {
          req.user = JSON.parse(savedUser);
        }
      } catch (e) {}
    }
  }

  next();
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin role required.' });
  }
  next();
};

module.exports = { authenticate, requireAdmin };
