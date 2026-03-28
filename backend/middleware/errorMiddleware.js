import ApiResponse from '../utils/ApiResponse.js';

// ✅ Enhanced error handler with specific error types
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // ✅ Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json(new ApiResponse(400, messages.join(', ')));
  }

  // ✅ Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json(new ApiResponse(400, `${field} already exists`));
  }

  // ✅ Mongoose cast error (invalid ID format)
  if (err.name === 'CastError') {
    return res.status(400).json(new ApiResponse(400, 'Invalid ID format'));
  }

  // ✅ JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json(new ApiResponse(401, 'Invalid token'));
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json(new ApiResponse(401, 'Token expired'));
  }

  // ✅ Default error response
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json(new ApiResponse(statusCode, message));
};

export default errorHandler;