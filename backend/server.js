import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/authRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import errorHandler from './middleware/errorMiddleware.js';
import { setupSocket } from './utils/socketHandler.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.CLIENT_URL,
].filter(Boolean);

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

setupSocket(io);

// ─── Body Parser ─────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── CORS Configuration ─────────────────────
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') return res.sendStatus(200);

  next();
});

// ─── Request Logging (Development) ─────────
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// ─── Health Check ───────────────────────────
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Auth API is running',
    version: '1.0.0',
  });
});

// ─── API Routes ─────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

// ─── 404 Handler (Catch-All) ───────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ─── Error Handler (Last Middleware) ───────
app.use(errorHandler);

// ─── Database & Server ─────────────────────
const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI is not defined in environment variables');
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET is not defined in environment variables');
  process.exit(1);
}

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.warn('⚠️ EMAIL_USER or EMAIL_PASS not set. Email functionality will not work.');
}

console.log('🔄 Connecting to MongoDB...');
console.log('📌 MONGO_URI:', MONGO_URI.replace(/\/\/.*@/, '//***:***@'));

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected Successfully');
    console.log(`📦 Database: ${mongoose.connection.name}`);

    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API: http://localhost:${PORT}/api`);
      console.log(`📧 Client URL: ${process.env.CLIENT_URL || 'Not set'}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection Failed!');
    console.error('🔴 Error:', err.message);
    process.exit(1);
  });

// ─── Handle Unhandled Rejections & Exceptions ─
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  console.log('🔄 Shutting down server...');
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  console.log('🔄 Shutting down server...');
  process.exit(1);
});

// ─── Graceful Shutdown ──────────────────────
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received. Shutting down gracefully...');
  mongoose.connection.close(() => {
    console.log('✅ MongoDB connection closed');
    process.exit(0);
  });
});

export default app;