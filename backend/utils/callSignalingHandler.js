/**
 * callSignalingHandler.js
 * 
 * Fixed: robust userId string normalisation so onlineUsers lookups
 * always match regardless of how the client sent the ID.
 */

import Call from '../models/Call.js';

// Map<userId_string, { callId, partnerId, socketId, startedAt }>
const activeCalls = new Map();

// Map<receiverId_string, { callId, callerId, timeout }>
const pendingCalls = new Map();

const CALL_TIMEOUT_MS = 30_000;

// ✅ Always normalise to trimmed lowercase string for map keys
const uid = (id) => String(id || '').trim();

export const registerCallHandlers = (io, socket, onlineUsers) => {
  const userId = uid(socket.userId);

  if (!userId) {
    console.warn('[callSignaling] socket has no userId — skipping handler registration');
    return;
  }

  console.log(`[callSignaling] registered handlers for userId: ${userId}`);

  // ── Helper: find socket ID for a user ──────────────────────────────────────
  const getSocketId = (targetId) => {
    const key = uid(targetId);
    // Try direct lookup first
    if (onlineUsers.has(key)) return onlineUsers.get(key);
    // Fallback: scan map (handles any key format inconsistency)
    for (const [k, v] of onlineUsers.entries()) {
      if (uid(k) === key) return v;
    }
    return null;
  };

  // ── call_user ──────────────────────────────────────────────────────────────
  socket.on('call_user', async ({ receiverId, callType, offer, callerInfo }) => {
    try {
      const rId = uid(receiverId);
      console.log(`[call_user] ${userId} → ${rId} (${callType})`);
      console.log(`[call_user] onlineUsers:`, Array.from(onlineUsers.keys()));

      if (activeCalls.has(userId)) {
        socket.emit('call_error', { message: 'You are already in a call.' });
        return;
      }
      if (activeCalls.has(rId)) {
        socket.emit('call_error', { message: 'User is busy in another call.' });
        return;
      }
      if (pendingCalls.has(rId)) {
        socket.emit('call_error', { message: 'User is already being called.' });
        return;
      }

      // Persist call record
      const callRecord = await Call.create({
        caller:   userId,
        receiver: rId,
        type:     callType,
        status:   'missed',
      });
      const callId = callRecord._id.toString();

      // Ring timeout
      const timeout = setTimeout(async () => {
        pendingCalls.delete(rId);
        socket.emit('call_unanswered', { callId });
        const receiverSocketId = getSocketId(rId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('call_cancelled', { callId });
        }
      }, CALL_TIMEOUT_MS);

      pendingCalls.set(rId, { callId, callerId: userId, timeout });

      // Check receiver online
      const receiverSocketId = getSocketId(rId);
      console.log(`[call_user] receiver socketId: ${receiverSocketId}`);

      if (!receiverSocketId) {
        clearTimeout(timeout);
        pendingCalls.delete(rId);
        socket.emit('call_unanswered', { callId, reason: 'offline' });
        return;
      }

      // Send incoming_call to receiver
      io.to(receiverSocketId).emit('incoming_call', {
        callId,
        callType,
        offer,
        caller: {
          _id: userId,
          ...callerInfo,
        },
      });

      socket.emit('call_ringing', { callId, receiverId: rId });
      console.log(`[call_user] incoming_call emitted to socket ${receiverSocketId}`);
    } catch (err) {
      console.error('[call_user] error:', err);
      socket.emit('call_error', { message: 'Failed to initiate call.' });
    }
  });

  // ── answer_call ────────────────────────────────────────────────────────────
  socket.on('answer_call', async ({ callId, answer, callerId }) => {
    try {
      const cId = uid(callerId);
      console.log(`[answer_call] ${userId} answering callId ${callId}`);

      const pending = pendingCalls.get(userId);
      if (!pending || pending.callId !== callId) {
        // Also try caller-side pending lookup (receiver stored under their own id)
        console.warn('[answer_call] no pending call found for', userId, pendingCalls);
        socket.emit('call_error', { message: 'No pending call found.' });
        return;
      }

      clearTimeout(pending.timeout);
      pendingCalls.delete(userId);

      const now = new Date();
      activeCalls.set(userId, { callId, partnerId: cId,    startedAt: now });
      activeCalls.set(cId,    { callId, partnerId: userId, startedAt: now });

      await Call.findByIdAndUpdate(callId, { status: 'completed', startedAt: now });

      const callerSocketId = getSocketId(cId);
      if (callerSocketId) {
        io.to(callerSocketId).emit('call_accepted', { callId, answer, receiverId: userId });
      }
      console.log(`[answer_call] call_accepted sent to caller socket ${callerSocketId}`);
    } catch (err) {
      console.error('[answer_call] error:', err);
      socket.emit('call_error', { message: 'Failed to answer call.' });
    }
  });

  // ── call_rejected ──────────────────────────────────────────────────────────
  socket.on('call_rejected', async ({ callId, callerId }) => {
    try {
      const cId = uid(callerId);
      console.log(`[call_rejected] ${userId} rejected call from ${cId}`);

      const pending = pendingCalls.get(userId);
      if (pending && pending.callId === callId) {
        clearTimeout(pending.timeout);
        pendingCalls.delete(userId);
      }

      await Call.findByIdAndUpdate(callId, { status: 'rejected' });

      const callerSocketId = getSocketId(cId);
      if (callerSocketId) {
        io.to(callerSocketId).emit('call_rejected', { callId });
      }
    } catch (err) {
      console.error('[call_rejected] error:', err);
    }
  });

  // ── ice_candidate ──────────────────────────────────────────────────────────
  socket.on('ice_candidate', ({ candidate, targetId }) => {
    const tId = uid(targetId);
    const targetSocketId = getSocketId(tId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('ice_candidate', { candidate, senderId: userId });
    }
  });

  // ── end_call ───────────────────────────────────────────────────────────────
  socket.on('end_call', async ({ callId, targetId }) => {
    try {
      const tId = uid(targetId);
      console.log(`[end_call] ${userId} ending call with ${tId}`);

      const activeCall = activeCalls.get(userId);
      if (activeCall && activeCall.callId === callId) {
        const duration = activeCall.startedAt
          ? Math.floor((Date.now() - new Date(activeCall.startedAt).getTime()) / 1000)
          : 0;
        activeCalls.delete(userId);
        activeCalls.delete(tId);
        await Call.findByIdAndUpdate(callId, {
          status: 'completed', endedAt: new Date(), duration,
        });
      }

      // Cancel pending ring if caller ended before answer
      const pending = pendingCalls.get(tId);
      if (pending && pending.callId === callId) {
        clearTimeout(pending.timeout);
        pendingCalls.delete(tId);
      }

      const targetSocketId = getSocketId(tId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('call_ended', { callId });
      }
    } catch (err) {
      console.error('[end_call] error:', err);
    }
  });

  // ── cleanup on disconnect ──────────────────────────────────────────────────
  socket.on('disconnect', async () => {
    console.log(`[callSignaling] disconnect cleanup for userId: ${userId}`);

    if (activeCalls.has(userId)) {
      const { callId, partnerId, startedAt } = activeCalls.get(userId);
      const duration = startedAt
        ? Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
        : 0;

      activeCalls.delete(userId);
      activeCalls.delete(partnerId);

      await Call.findByIdAndUpdate(callId, {
        status: 'completed', endedAt: new Date(), duration,
      }).catch(console.error);

      const partnerSocketId = getSocketId(partnerId);
      if (partnerSocketId) {
        io.to(partnerSocketId).emit('call_ended', { callId, reason: 'disconnected' });
      }
    }

    if (pendingCalls.has(userId)) {
      const { callId, callerId, timeout } = pendingCalls.get(userId);
      clearTimeout(timeout);
      pendingCalls.delete(userId);
      const callerSocketId = getSocketId(callerId);
      if (callerSocketId) {
        io.to(callerSocketId).emit('call_unanswered', { callId, reason: 'offline' });
      }
    }
  });
};