/**
 * socket.js
 *
 * FIXES:
 * 1. transports: ['websocket', 'polling'] — polling fallback prevents
 *    "connect_error: Invalid namespace" when WebSocket upgrade fails.
 *    Without polling, if the WS handshake glitches, socket never connects.
 * 2. Singleton lazy-init preserved (correct pattern).
 * 3. autoConnect: false preserved — SocketProvider controls when to connect.
 */

import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';

let socket;

export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      withCredentials: true,
      transports: ['websocket', 'polling'], // ← FIXED: polling fallback added
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    // Dev-only connection logging
    if (import.meta.env.DEV) {
      socket.on('connect',       () => console.log(`[socket] ✅ connected  id=${socket.id}`));
      socket.on('disconnect',    (r) => console.log(`[socket] ❌ disconnected  reason=${r}`));
      socket.on('connect_error', (e) => console.error(`[socket] connect_error:`, e.message));
    }
  }
  return socket;
};