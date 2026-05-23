/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err);

  // Prisma errors
  if (err.code === 'P2002') {
    return res.status(409).json({ success: false, message: 'Duplicate entry: ' + (err.meta?.target || 'field already exists') });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ success: false, message: 'Record not found' });
  }

  // Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: err.errors });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }

  // Default
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
  });
};

module.exports = { errorHandler };
