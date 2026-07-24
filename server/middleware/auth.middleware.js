/**
 * Mock JWT Middleware — Demo-grade authentication for faculty live demo.
 *
 * Token format: btoa(JSON.stringify({ id, role, name, email }))
 * No cryptographic signature verification — intentional for demo simplicity.
 * Replace with jsonwebtoken + real secret for production use.
 */

const decodeToken = (token) => {
  try {
    return JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
  } catch {
    return null;
  }
};

/**
 * authenticate — reads Bearer token from Authorization header,
 * decodes it, and attaches the payload to req.user.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided. Include Authorization: Bearer <token>' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = decodeToken(token);

  if (!decoded || !decoded.role) {
    return res.status(401).json({ message: 'Invalid or malformed token' });
  }

  req.user = decoded; // { id, role, name, email }
  next();
};

/**
 * requireAdmin — must be used AFTER authenticate.
 * Rejects requests from non-admin users with 403.
 */
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required. Switch to Admin role in the header.' });
  }
  next();
};

module.exports = { authenticate, requireAdmin };
