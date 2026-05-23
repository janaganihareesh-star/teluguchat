import React, { createContext, useContext, useEffect, useState } from 'react';
import { socket } from '../socket/socket';
import { AuthContext } from './AuthContext';

export const SocketContext = createContext();

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const { user, token } = useContext(AuthContext);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    if (user && token) {
      socket.auth = { token };
      socket.connect();
      socket.on('connect', () => {
        setIsConnected(true);
        setReconnecting(false);
        socket.emit('user-online', user._id);
      });

      if (socket.connected) {
        setIsConnected(true);
        socket.emit('user-online', user._id);
      }

      socket.on('disconnect', () => {
        setIsConnected(false);
      });
      
      socket.io.on('reconnect_attempt', () => {
         setReconnecting(true);
      });

      socket.on('update-users', (users) => {
        setOnlineUsers(users);
      });

      return () => {
        socket.emit('user-offline', user._id);
        socket.disconnect();
        socket.off('connect');
        socket.off('disconnect');
        socket.io.off('reconnect_attempt');
        socket.off('update-users');
      };
    }
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, reconnecting, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};
