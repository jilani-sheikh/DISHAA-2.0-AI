const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dishaa-campus-production-secret-key-2026';

/**
 * Middleware: Require authenticated user (Faculty or Admin)
 */
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please provide a valid Bearer token.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role || 'faculty',
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Session expired. Please log in again.',
      });
    }
    return res.status(401).json({
      success: false,
      error: 'Invalid authentication token.',
    });
  }
};

/**
 * Generate a signed JWT token
 */
const generateToken = (payload) => {
  return jwt.sign(
    {
      id: payload.id || payload._id,
      email: payload.email,
      role: payload.role || 'faculty',
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

module.exports = {
  requireAuth,
  generateToken,
  JWT_SECRET,
};
