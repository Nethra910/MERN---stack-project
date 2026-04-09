import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSocket } from '../socket';
import toast from 'react-hot-toast';

export const SocketContext = createContext();

export const SocketProvider = ({ children, user }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    if (!user?._id) return;
    const s = getSocket();
    setSocket(s);
    s.connect();
    s.emit('user-online', user._id);
    setIsConnected(true);

    s.on('connect', () => {
      setIsConnected(true);
      setReconnecting(false);
    });
    s.on('disconnect', () => {
      setIsConnected(false);
      setReconnecting(true);
    });
    s.io.on('reconnect', () => {
      setReconnecting(false);
      s.emit('user-online', user._id);
    });
    s.io.on('reconnect_attempt', () => setReconnecting(true));
    s.io.on('reconnect_error', () => setReconnecting(true));
    s.io.on('reconnect_failed', () => setReconnecting(false));

    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, [user?._id]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, reconnecting }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocketContext = () => useContext(SocketContext);
