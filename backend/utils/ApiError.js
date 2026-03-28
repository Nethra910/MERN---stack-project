// ✅ Custom error class for API errors
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.success = false;
    this.isOperational = true; // ✅ Distinguish operational errors from programming errors

    // ✅ Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

export default ApiError;