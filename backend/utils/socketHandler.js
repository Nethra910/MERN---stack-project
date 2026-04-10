import User from '../models/User.js';

const onlineUsers = new Map();

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
      socket.join(userId.toString());
      await User.findByIdAndUpdate(userId, { isOnline: true });
      await updateLastSeen(userId);
      const user = await User.findById(userId).select('friends');
      if (user?.friends) {
        user.friends.forEach(fid => {
          io.to(fid.toString()).emit('user_online', { userId, timestamp: new Date() });
        });
      }
    });

    // ─── Join / leave conversation rooms ──────────────
    socket.on('join-conversation', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on('leave-conversation', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });

    // ─── Send message ─────────────────────────────────
    socket.on('send-message', async (data) => {
      try {
        const { conversationId, senderId, content, messageId, replyTo, attachments } = data;
        await updateLastSeen(senderId);
        io.to(`conversation:${conversationId}`).emit('receive-message', {
          conversationId,
          senderId,
          content,
          messageId,
          replyTo,
          attachments,
          timestamp: new Date(),
        });
      } catch (error) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // ─── Edit message ─────────────────────────────────
    socket.on('edit-message', (data) => {
      const { conversationId, messageId, content } = data;
      socket.to(`conversation:${conversationId}`).emit('message-edited', {
        conversationId, messageId, content, editedAt: new Date(),
      });
    });

    // ─── Delete message ───────────────────────────────
    socket.on('delete-message', (data) => {
      const { conversationId, messageId, deleteFor, deletedBy } = data;
      socket.to(`conversation:${conversationId}`).emit('message-deleted', {
        conversationId, messageId, deleteFor, deletedBy, deletedAt: new Date(),
      });
    });

    // ─── React to message ─────────────────────────────
    socket.on('react-message', (data) => {
      const { conversationId, messageId, reactions } = data;
      socket.to(`conversation:${conversationId}`).emit('message-reacted', {
        conversationId, messageId, reactions,
      });
    });

    // ─── Forward message ──────────────────────────────
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

    // ─── Typing ───────────────────────────────────────
    socket.on('typing', ({ conversationId, userId }) => {
      socket.broadcast.to(`conversation:${conversationId}`).emit('user-typing', {
        conversationId, userId,
      });
    });

    socket.on('stop-typing', ({ conversationId }) => {
      socket.broadcast.to(`conversation:${conversationId}`).emit('user-stop-typing', {
        conversationId,
      });
    });

    // ─── NEW: Chat request events (relay only) ────────
    // These are emitted by the REST controller via io.to()
    // Socket just needs to relay them — no logic here needed.
    // The controller emits: chat_request_received, chat_request_accepted,
    // chat_request_rejected, chat_request_cancelled

    // ─── NEW: Block events (relay only) ───────────────
    // The controller emits: user_blocked_by, user_unblocked_by

    // ─── Disconnect ───────────────────────────────────
    socket.on('disconnect', async () => {
      let userId;
      for (const [key, value] of onlineUsers.entries()) {
        if (value === socket.id) { userId = key; break; }
      }
      if (userId) {
        onlineUsers.delete(userId);
        await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
        const user = await User.findById(userId).select('friends');
        if (user?.friends) {
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