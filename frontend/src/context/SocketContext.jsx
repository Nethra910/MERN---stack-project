import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSocket } from '../socket';

export const SocketContext = createContext();

export const SocketProvider = ({ children, user }) => {
  const [socket, setSocket]           = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    if (!user?._id) return;

    const s = getSocket();

    // Connect and register user
    s.connect();
    s.emit('user-online', user._id);

    // ✅ Set socket in state AFTER connect so CallContext gets the live instance
    setSocket(s);
    setIsConnected(s.connected);

    const onConnect    = () => { setIsConnected(true);  setReconnecting(false); };
    const onDisconnect = () => { setIsConnected(false); setReconnecting(true);  };

    s.on('connect',    onConnect);
    s.on('disconnect', onDisconnect);

    s.io.on('reconnect', () => {
      setReconnecting(false);
      s.emit('user-online', user._id);
    });
    s.io.on('reconnect_attempt', () => setReconnecting(true));
    s.io.on('reconnect_error',   () => setReconnecting(true));
    s.io.on('reconnect_failed',  () => setReconnecting(false));

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

// Two named exports — existing code uses useSocketContext, CallContext uses useSocketContext too
export const useSocketContext = () => useContext(SocketContext);