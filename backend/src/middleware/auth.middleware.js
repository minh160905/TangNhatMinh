const jwt = require('jsonwebtoken');
const { unauthorized, forbidden } = require('../utils/response');

/**
 * Verify JWT and attach user to request
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorized(res, 'No token provided');
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return unauthorized(res, 'Invalid or expired token');
  }
};

/**
 * RBAC middleware – pass allowed roles as strings
 * Usage: authorize('ADMIN', 'TEACHER')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) return unauthorized(res);
    if (!roles.includes(req.user.role)) {
      return forbidden(res, `Access denied. Required roles: ${roles.join(', ')}`);
    }
    next();
  };
};

module.exports = { authenticate, authorize };
