// No unused imports — socket only handles real-time relay
import User from '../models/User.js';

const onlineUsers = new Map();

// Helper to update lastSeen in database
const updateLastSeen = async (userId) => {
  try {
    await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
  } catch (err) {
    console.error('Failed to update lastSeen:', err);
  }
};

export const initializeSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.id}`);

    // ─── User online ──────────────────────────────────
    socket.on('user-online', async (userId) => {
      onlineUsers.set(userId, socket.id);
      socket.join(userId.toString()); // Join personal room for direct events
      await User.findByIdAndUpdate(userId, { isOnline: true });
      await updateLastSeen(userId);
      // Notify all friends
      const user = await User.findById(userId).select('friends');
      if (user && user.friends) {
        user.friends.forEach(fid => {
          io.to(fid.toString()).emit('user_online', { userId, timestamp: new Date() });
        });
      }
    });

    // ─── Join / leave conversation room ───────────────
    socket.on('join-conversation', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on('leave-conversation', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });

    // ─── Send message ─────────────────────────────────
    socket.on('send-message', async (data) => {
      try {
        const { conversationId, senderId, content, messageId, replyTo } = data;
        // Update sender's lastSeen on activity
        await updateLastSeen(senderId);
        io.to(`conversation:${conversationId}`).emit('receive-message', {
          conversationId,
          senderId,
          content,
          messageId,
          replyTo,
          timestamp: new Date(),
        });
      } catch (error) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // ─── NEW: Edit message ─────────────────────────────
    socket.on('edit-message', (data) => {
      const { conversationId, messageId, content } = data;
      // Broadcast to all other participants in the room
      socket.to(`conversation:${conversationId}`).emit('message-edited', {
        conversationId,
        messageId,
        content,
        editedAt: new Date(),
      });
    });

    // ─── NEW: Delete message ───────────────────────────
    socket.on('delete-message', (data) => {
      const { conversationId, messageId, deleteFor, deletedBy } = data;
      socket.to(`conversation:${conversationId}`).emit('message-deleted', {
        conversationId,
        messageId,
        deleteFor,
        deletedBy, // Include deletedBy array for 'self' deletions
        deletedAt: new Date(),
      });
    });

    // ─── NEW: React to message ─────────────────────────
    socket.on('react-message', (data) => {
      const { conversationId, messageId, reactions } = data;
      socket.to(`conversation:${conversationId}`).emit('message-reacted', {
        conversationId,
        messageId,
        reactions,
      });
    });

    // ─── NEW: Forward message ──────────────────────────
    socket.on('forward-message', (data) => {
      const { targetConversationIds, message } = data;
      targetConversationIds.forEach((convId) => {
        socket.to(`conversation:${convId}`).emit('receive-message', {
          ...message,
          conversationId: convId,
          timestamp: new Date(),
        });
      });
    });

    // ─── Typing indicators ─────────────────────────────
    socket.on('typing', ({ conversationId, userId }) => {
      socket.broadcast.to(`conversation:${conversationId}`).emit('user-typing', {
        conversationId,
        userId,
      });
    });

    socket.on('stop-typing', ({ conversationId }) => {
      socket.broadcast.to(`conversation:${conversationId}`).emit('user-stop-typing', {
        conversationId,
      });
    });

    // ─── Disconnect ────────────────────────────────────
    socket.on('disconnect', async () => {
      let userId;
      for (const [key, value] of onlineUsers.entries()) {
        if (value === socket.id) { userId = key; break; }
      }
      if (userId) {
        onlineUsers.delete(userId);
        await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
        await updateLastSeen(userId);
        // Notify all friends
        const user = await User.findById(userId).select('friends');
        if (user && user.friends) {
          user.friends.forEach(fid => {
            io.to(fid.toString()).emit('user_offline', { userId, timestamp: new Date() });
          });
        }
      }
    });

    socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });
  });

  return io;
};

export const getOnlineUsers = () => Array.from(onlineUsers.keys());