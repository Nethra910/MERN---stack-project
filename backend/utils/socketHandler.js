/**
 * socketHandler.js
 *
 * FIXES:
 * 1. _callHandlersRegistered guard — user-online can fire multiple times
 *    on the same socket (reconnects, React StrictMode). Without this guard,
 *    duplicate listeners stack up: call_user fires twice, DB written twice,
 *    ICE candidates delivered twice, race conditions everywhere.
 *
 * 2. socket.join(normalUserId) is already here (correct) — this means
 *    callSignalingHandler can emit to the userId room as a fallback even
 *    if the onlineUsers map lookup fails momentarily.
 *
 * 3. Detailed logging — you can see exactly who is in onlineUsers at the
 *    moment a call comes in.
 */

import User from '../models/User.js';
import { registerCallHandlers } from './callSignalingHandler.js';

export const onlineUsers = new Map();

const uid = (id) => String(id || '').trim();

const updateLastSeen = async (userId) => {
  try {
    await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
  } catch (err) {
    console.error('Failed to update lastSeen:', err);
  }
};

export const initializeSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`✅ Socket connected: ${socket.id}`);

    // ─── User online ─────────────────────────────────────────────────────────
    socket.on('user-online', async (userId) => {
      const normalUserId = uid(userId);

      socket.userId = normalUserId;
      onlineUsers.set(normalUserId, socket.id);
      socket.join(normalUserId); // room named after userId — used as emit fallback

      console.log(`\n👤 user-online: ${normalUserId} → socket ${socket.id}`);
      console.log(`📋 onlineUsers (${onlineUsers.size} total):`, Array.from(onlineUsers.keys()));

      try {
        await User.findByIdAndUpdate(userId, { isOnline: true });
        await updateLastSeen(userId);

        const user = await User.findById(userId).select('friends');
        if (user?.friends?.length) {
          user.friends.forEach(fid => {
            io.to(uid(fid)).emit('user_online', { userId: normalUserId, timestamp: new Date() });
          });
        }
      } catch (err) {
        console.error('[user-online] DB error:', err);
      }

      // FIX: only register call handlers ONCE per socket instance.
      // 'user-online' fires on every reconnect on the SAME socket object,
      // which would stack duplicate event listeners causing double-processing.
      if (!socket._callHandlersRegistered) {
        socket._callHandlersRegistered = true;
        registerCallHandlers(io, socket, onlineUsers);
        console.log(`📞 Call handlers registered for ${normalUserId}`);
      }
    });

    // ─── Conversation rooms ───────────────────────────────────────────────────
    socket.on('join-conversation', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on('leave-conversation', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });

    // ─── Messages ─────────────────────────────────────────────────────────────
    socket.on('send-message', async (data) => {
      try {
        const { conversationId, senderId, content, messageId, replyTo, attachments } = data;
        await updateLastSeen(senderId);
        io.to(`conversation:${conversationId}`).emit('receive-message', {
          conversationId, senderId, content, messageId,
          replyTo, attachments, timestamp: new Date(),
        });
      } catch (error) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('edit-message', (data) => {
      const { conversationId, messageId, content } = data;
      socket.to(`conversation:${conversationId}`).emit('message-edited', {
        conversationId, messageId, content, editedAt: new Date(),
      });
    });

    socket.on('delete-message', (data) => {
      const { conversationId, messageId, deleteFor, deletedBy } = data;
      socket.to(`conversation:${conversationId}`).emit('message-deleted', {
        conversationId, messageId, deleteFor, deletedBy, deletedAt: new Date(),
      });
    });

    socket.on('react-message', (data) => {
      const { conversationId, messageId, reactions } = data;
      socket.to(`conversation:${conversationId}`).emit('message-reacted', {
        conversationId, messageId, reactions,
      });
    });

    socket.on('forward-message', (data) => {
      const { targetConversationIds, message } = data;
      targetConversationIds.forEach((convId) => {
        socket.to(`conversation:${convId}`).emit('receive-message', {
          ...message, conversationId: convId, timestamp: new Date(),
        });
      });
    });

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

    // ─── Disconnect ───────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      let userId;
      for (const [key, value] of onlineUsers.entries()) {
        if (value === socket.id) { userId = key; break; }
      }

      console.log(`❌ Socket disconnected: ${socket.id} (userId: ${userId})`);

      if (userId) {
        onlineUsers.delete(userId);
        try {
          await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
          const user = await User.findById(userId).select('friends');
          if (user?.friends?.length) {
            user.friends.forEach(fid => {
              io.to(uid(fid)).emit('user_offline', { userId, timestamp: new Date() });
            });
          }
        } catch (err) {
          console.error('[disconnect] DB error:', err);
        }
      }

      console.log(`📋 onlineUsers after disconnect (${onlineUsers.size}):`,
        Array.from(onlineUsers.keys()));
    });

    socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });
  });

  return io;
};

export const getOnlineUsers = () => Array.from(onlineUsers.keys());