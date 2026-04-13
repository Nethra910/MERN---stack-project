/**
 * SocketContext.jsx
 *
 * THE BUG (your original code):
 *
 *   s.connect();
 *   s.emit('user-online', user._id);  // ← WRONG: fires before handshake done
 *
 * socket.connect() starts the TCP/WebSocket handshake asynchronously.
 * The very next line runs in the same JS tick — the socket is NOT yet
 * connected — so the server never receives 'user-online' — onlineUsers
 * stays empty — getSocketId(receiverId) returns null — incoming_call
 * is never sent — receiver sees nothing.
 *
 * THE FIX:
 * Move s.emit('user-online') INSIDE the 'connect' event handler.
 * That handler fires only after the handshake is complete and the
 * server has assigned a socket.id — guaranteed safe to emit.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSocket } from '../socket';

export const SocketContext = createContext();

export const SocketProvider = ({ children, user }) => {
  const [socket,       setSocket]       = useState(null);
  const [isConnected,  setIsConnected]  = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    if (!user?._id) return;

    const s = getSocket();

    // ── All listeners must be attached BEFORE calling s.connect() ─────────
    const onConnect = () => {
      console.log(`[SocketContext] ✅ connected  socketId=${s.id}  userId=${user._id}`);
      setIsConnected(true);
      setReconnecting(false);
      // SAFE to emit here — handshake is complete, server will receive this
      s.emit('user-online', user._id);
    };

    const onDisconnect = (reason) => {
      console.log(`[SocketContext] disconnected: ${reason}`);
      setIsConnected(false);
      setReconnecting(true);
    };

    s.on('connect',    onConnect);
    s.on('disconnect', onDisconnect);

    s.io.on('reconnect', () => {
      setReconnecting(false);
      // Re-register after reconnect so onlineUsers map stays accurate
      s.emit('user-online', user._id);
    });
    s.io.on('reconnect_attempt', () => setReconnecting(true));
    s.io.on('reconnect_error',   () => setReconnecting(true));
    s.io.on('reconnect_failed',  () => setReconnecting(false));

    // Handle already-connected case (React StrictMode double-mount / hot reload)
    if (s.connected) {
      setIsConnected(true);
      s.emit('user-online', user._id);
    } else {
      // ← connect() called AFTER listeners are attached
      s.connect();
    }

    setSocket(s);

    return () => {
      s.off('connect',    onConnect);
      s.off('disconnect', onDisconnect);
      s.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [user?._id]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, reconnecting }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocketContext = () => useContext(SocketContext);