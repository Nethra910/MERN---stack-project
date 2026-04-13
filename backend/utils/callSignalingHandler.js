/**
 * callSignalingHandler.js
 *
 * FIXES:
 * 1. emitToUser() — dual emit strategy:
 *    Primary:  io.to(socketId).emit(...)   direct socket ID from onlineUsers map
 *    Fallback: io.to(userId).emit(...)     userId room (socket.join(userId) in socketHandler)
 *    Belt-and-suspenders: if the map lookup has a momentary gap, the room
 *    still delivers the event. This is the primary fix for "call not reaching receiver".
 *
 * 2. Removed duplicate 'disconnect' handler:
 *    socketHandler.js already handles disconnect (removes from onlineUsers, marks offline).
 *    Having a second one here caused double DB writes and race conditions where
 *    onlineUsers was already cleared when callSignaling tried getSocketId().
 *    Replaced with socket.once('disconnect', ...) for call-specific cleanup only.
 *
 * 3. answer_call: fallback scan of pendingCalls by callId in case of any
 *    key-format mismatch between how userId was stored vs looked up.
 *
 * 4. end_call: cancels pending ring when caller hangs up before answer,
 *    instead of leaving a 30s dangling timeout.
 *
 * 5. call_ringing: emits callId back to caller so CallContext can store it.
 *    Without this, stateRef.current.callId is null when endCall fires.
 *
 * 6. activeCalls: both sides keyed with uid() for consistent lookups.
 */

import Call from '../models/Call.js';

const activeCalls  = new Map(); // userId → { callId, partnerId, startedAt }
const pendingCalls = new Map(); // receiverId → { callId, callerId, timeout }

const CALL_TIMEOUT_MS = 30_000;

const uid = (id) => String(id || '').trim();

export const registerCallHandlers = (io, socket, onlineUsers) => {
  const userId = uid(socket.userId);

  if (!userId) {
    console.warn('[callSignaling] no userId on socket — skipping');
    return;
  }

  console.log(`[callSignaling] handlers registered for: ${userId}`);

  // ── emitToUser: direct socket + userId room fallback ──────────────────────
  const emitToUser = (targetId, event, data) => {
    const key            = uid(targetId);
    const targetSocketId = onlineUsers.get(key)
      ?? [...onlineUsers.entries()].find(([k]) => uid(k) === key)?.[1];

    console.log(`[emitToUser] '${event}' → userId=${key}  socketId=${targetSocketId ?? 'not in map'}`);

    if (targetSocketId) {
      io.to(targetSocketId).emit(event, data); // primary: direct socket
    }
    io.to(key).emit(event, data);              // fallback: userId room
  };

  // ── call_user ─────────────────────────────────────────────────────────────
  socket.on('call_user', async ({ receiverId, callType, offer, callerInfo }) => {
    try {
      const rId = uid(receiverId);
      console.log(`\n[call_user] ${userId} → ${rId} (${callType})`);
      console.log(`[call_user] onlineUsers:`, Array.from(onlineUsers.keys()));

      if (activeCalls.has(userId)) {
        socket.emit('call_error', { message: 'You are already in a call.' }); return;
      }
      if (activeCalls.has(rId)) {
        socket.emit('call_error', { message: 'User is busy in another call.' }); return;
      }
      if (pendingCalls.has(rId)) {
        socket.emit('call_error', { message: 'User is already being called.' }); return;
      }

      // Check receiver is online (map OR room membership)
      const receiverInMap  = onlineUsers.has(rId);
      const receiverInRoom = io.sockets.adapter.rooms.get(rId)?.size > 0;
      if (!receiverInMap && !receiverInRoom) {
        await Call.create({ caller: userId, receiver: rId, type: callType, status: 'missed' });
        socket.emit('call_unanswered', { reason: 'offline' });
        return;
      }

      const callRecord = await Call.create({
        caller: userId, receiver: rId, type: callType, status: 'missed',
      });
      const callId = callRecord._id.toString();

      const timeout = setTimeout(async () => {
        pendingCalls.delete(rId);
        await Call.findByIdAndUpdate(callId, { status: 'missed' }).catch(console.error);
        socket.emit('call_unanswered', { callId });
        emitToUser(rId, 'call_cancelled', { callId });
      }, CALL_TIMEOUT_MS);

      pendingCalls.set(rId, { callId, callerId: userId, timeout });

      emitToUser(rId, 'incoming_call', { callId, callType, offer, caller: { _id: userId, ...callerInfo } });

      // Send callId back to caller so it can be stored in state
      socket.emit('call_ringing', { callId, receiverId: rId });

      console.log(`[call_user] ✅ incoming_call dispatched to ${rId}`);
    } catch (err) {
      console.error('[call_user] error:', err);
      socket.emit('call_error', { message: 'Failed to initiate call.' });
    }
  });

  // ── answer_call ───────────────────────────────────────────────────────────
  socket.on('answer_call', async ({ callId, answer, callerId }) => {
    try {
      const cId = uid(callerId);
      console.log(`[answer_call] ${userId} answering callId=${callId} caller=${cId}`);

      // Primary lookup: pendingCalls keyed by receiverId (= userId here)
      let pending = pendingCalls.get(userId);
      if (pending) {
        pendingCalls.delete(userId);
      } else {
        // Fallback: scan by callId in case of key mismatch
        for (const [key, val] of pendingCalls.entries()) {
          if (val.callId === callId) { pending = val; pendingCalls.delete(key); break; }
        }
      }

      if (!pending || pending.callId !== callId) {
        console.warn('[answer_call] no matching pending call', { userId, callId });
        socket.emit('call_error', { message: 'No pending call found.' });
        return;
      }

      clearTimeout(pending.timeout);

      const now = new Date();
      activeCalls.set(uid(userId), { callId, partnerId: cId,    startedAt: now });
      activeCalls.set(uid(cId),    { callId, partnerId: userId, startedAt: now });

      await Call.findByIdAndUpdate(callId, { status: 'completed', startedAt: now });

      emitToUser(cId, 'call_accepted', { callId, answer, receiverId: userId });
      console.log(`[answer_call] ✅ call_accepted sent to ${cId}`);
    } catch (err) {
      console.error('[answer_call] error:', err);
      socket.emit('call_error', { message: 'Failed to answer call.' });
    }
  });

  // ── call_rejected ─────────────────────────────────────────────────────────
  socket.on('call_rejected', async ({ callId, callerId }) => {
    try {
      const cId = uid(callerId);

      let pending = pendingCalls.get(userId);
      if (pending?.callId === callId) {
        clearTimeout(pending.timeout); pendingCalls.delete(userId);
      } else {
        for (const [key, val] of pendingCalls.entries()) {
          if (val.callId === callId) { clearTimeout(val.timeout); pendingCalls.delete(key); break; }
        }
      }

      await Call.findByIdAndUpdate(callId, { status: 'rejected' });
      emitToUser(cId, 'call_rejected', { callId });
    } catch (err) {
      console.error('[call_rejected] error:', err);
    }
  });

  // ── ice_candidate ─────────────────────────────────────────────────────────
  socket.on('ice_candidate', ({ candidate, targetId }) => {
    emitToUser(uid(targetId), 'ice_candidate', { candidate, senderId: userId });
  });

  // ── end_call ──────────────────────────────────────────────────────────────
  socket.on('end_call', async ({ callId, targetId }) => {
    try {
      const tId = uid(targetId);

      const activeCall = activeCalls.get(uid(userId));
      if (activeCall) {
        const duration = activeCall.startedAt
          ? Math.floor((Date.now() - new Date(activeCall.startedAt).getTime()) / 1000) : 0;
        activeCalls.delete(uid(userId));
        activeCalls.delete(uid(tId));
        await Call.findByIdAndUpdate(callId || activeCall.callId, {
          status: 'completed', endedAt: new Date(), duration,
        }).catch(console.error);
      }

      // Also cancel pending ring if caller ends before receiver answers
      const pending = pendingCalls.get(tId);
      if (pending && (!callId || pending.callId === callId)) {
        clearTimeout(pending.timeout);
        pendingCalls.delete(tId);
        await Call.findByIdAndUpdate(callId, { status: 'cancelled' }).catch(console.error);
      }

      emitToUser(tId, 'call_ended', { callId: callId || activeCall?.callId });
    } catch (err) {
      console.error('[end_call] error:', err);
    }
  });

  // ── Disconnect: call-specific cleanup only ────────────────────────────────
  // socketHandler.js handles the onlineUsers map and DB isOnline update.
  // This once-listener only cleans up active/pending call state.
  socket.once('disconnect', async () => {
    console.log(`[callSignaling] disconnect cleanup for ${userId}`);

    // Was in an active call
    if (activeCalls.has(uid(userId))) {
      const { callId, partnerId, startedAt } = activeCalls.get(uid(userId));
      const duration = startedAt
        ? Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000) : 0;
      activeCalls.delete(uid(userId));
      activeCalls.delete(uid(partnerId));
      await Call.findByIdAndUpdate(callId, {
        status: 'completed', endedAt: new Date(), duration,
      }).catch(console.error);
      // Use room emit — onlineUsers may already be cleared by socketHandler
      io.to(uid(partnerId)).emit('call_ended', { callId, reason: 'disconnected' });
    }

    // Was receiver of a ringing call
    if (pendingCalls.has(uid(userId))) {
      const { callId, callerId, timeout } = pendingCalls.get(uid(userId));
      clearTimeout(timeout);
      pendingCalls.delete(uid(userId));
      await Call.findByIdAndUpdate(callId, { status: 'missed' }).catch(console.error);
      io.to(uid(callerId)).emit('call_unanswered', { callId, reason: 'offline' });
    }

    // Was caller of a ringing call (scan by callerId)
    for (const [receiverId, pending] of pendingCalls.entries()) {
      if (uid(pending.callerId) === uid(userId)) {
        clearTimeout(pending.timeout);
        pendingCalls.delete(receiverId);
        await Call.findByIdAndUpdate(pending.callId, { status: 'cancelled' }).catch(console.error);
        io.to(receiverId).emit('call_cancelled', { callId: pending.callId });
        break;
      }
    }
  });
};