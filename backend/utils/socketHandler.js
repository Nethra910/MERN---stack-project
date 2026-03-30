import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const onlineUsers = new Map(); // userId -> socketId

export const setupSocket = (io) => {
  // Auth middleware for socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication error'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user) return next(new Error('User not found'));

      socket.user = user;
      next();
    } catch {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    onlineUsers.set(userId, socket.id);

    // Broadcast online status
    socket.broadcast.emit('user:online', { userId });

    // Send current online users to newly connected user
    socket.emit('users:online', Array.from(onlineUsers.keys()));

    // Join conversation room
    socket.on('conversation:join', (conversationId) => {
      socket.join(conversationId);
    });

    // Leave conversation room
    socket.on('conversation:leave', (conversationId) => {
      socket.leave(conversationId);
    });

    // Typing indicator
    socket.on('typing:start', ({ conversationId }) => {
      socket.to(conversationId).emit('typing:start', {
        conversationId,
        userId,
        userName: socket.user.name,
      });
    });

    socket.on('typing:stop', ({ conversationId }) => {
      socket.to(conversationId).emit('typing:stop', {
        conversationId,
        userId,
      });
    });

    // Forward new messages to conversation room
    socket.on('message:send', ({ conversationId, message }) => {
      socket.to(conversationId).emit('message:new', message);
    });

    // Disconnect
    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      socket.broadcast.emit('user:offline', { userId });
    });
  });
};

export const getOnlineUsers = () => Array.from(onlineUsers.keys());
