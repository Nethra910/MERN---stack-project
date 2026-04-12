import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';

// ✅ Enhanced protect middleware with better error handling
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Access denied. No token provided.');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new ApiError(401, 'Access denied. No token provided.');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new ApiError(401, 'Token has expired. Please log in again.');
      }
      if (err.name === 'JsonWebTokenError') {
        throw new ApiError(401, 'Invalid token. Please log in again.');
      }
      throw new ApiError(401, 'Token verification failed.');
    }

    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      throw new ApiError(401, 'User no longer exists.');
    }

    if (!user.isVerified) {
      throw new ApiError(403, 'Please verify your email to access this resource.');
    }

    req.user = user;
    next();

  } catch (err) {
    if (err instanceof ApiError) {
      return res.status(err.statusCode).json(
        new ApiResponse(err.statusCode, err.message)
      );
    }
    return res.status(500).json(
      new ApiResponse(500, 'Authentication error')
    );
  }
};

export default protect;