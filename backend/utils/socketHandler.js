import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';

const onlineUsers = new Map();

export const initializeSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.id}`);

    // ─── User comes online ──��────────────────────
    socket.on('user-online', (userId) => {
      onlineUsers.set(userId, socket.id);
      socket.broadcast.emit('user-status', {
        userId,
        status: 'online',
        timestamp: new Date(),
      });
      console.log(`✅ User ${userId} is online`);
    });

    // ─── Join conversation room ──────────────────
    socket.on('join-conversation', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
      console.log(`📍 User joined conversation: ${conversationId}`);
    });

    // ─── Leave conversation room ─────────────────
    socket.on('leave-conversation', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
      console.log(`📍 User left conversation: ${conversationId}`);
    });

    // ─── Send message ────────────────────────────
    socket.on('send-message', async (data) => {
      try {
        const { conversationId, senderId, content } = data;

        // ✅ Broadcast to conversation members
        io.to(`conversation:${conversationId}`).emit('receive-message', {
          conversationId,
          senderId,
          content,
          timestamp: new Date(),
        });

        console.log(`💬 Message sent in conversation: ${conversationId}`);
      } catch (error) {
        console.error('❌ Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // ─── Typing indicator ─────────────────────────
    socket.on('typing', (data) => {
      const { conversationId, userId } = data;
      socket.broadcast.to(`conversation:${conversationId}`).emit('user-typing', {
        conversationId,
        userId,
      });
    });

    // ─── Stop typing ──────────────────────────────
    socket.on('stop-typing', (data) => {
      const { conversationId } = data;
      socket.broadcast.to(`conversation:${conversationId}`).emit('user-stop-typing', {
        conversationId,
      });
    });

    // ─── Disconnect ──────────────────────────────
    socket.on('disconnect', () => {
      // Find and remove user from online users
      let userId;
      for (const [key, value] of onlineUsers.entries()) {
        if (value === socket.id) {
          userId = key;
          break;
        }
      }

      if (userId) {
        onlineUsers.delete(userId);
        socket.broadcast.emit('user-status', {
          userId,
          status: 'offline',
          timestamp: new Date(),
        });
        console.log(`❌ User ${userId} is offline`);
      }

      console.log(`❌ User disconnected: ${socket.id}`);
    });

    // ─── Error handling ──────────────────────────
    socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });
  });

  return io;
};

export const getOnlineUsers = () => Array.from(onlineUsers.keys());