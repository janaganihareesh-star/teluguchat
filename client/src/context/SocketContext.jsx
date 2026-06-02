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
    if (!user || !token) return;

    socket.auth = { token };

    const onConnect = () => {
      console.log('SOCKET CONNECTED:', socket.id);
      setIsConnected(true);
      setReconnecting(false);
      socket.emit('user-online', user._id);
    };

    const onDisconnect = () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    };

    const onReconnectAttempt = () => {
      console.log('Socket reconnecting...');
      setReconnecting(true);
    };

    const onUpdateUsers = (users) => {
      setOnlineUsers(users);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('update-users', onUpdateUsers);
    socket.io.on('reconnect_attempt', onReconnectAttempt);

    if (!socket.connected) {
      socket.connect();
    } else {
      onConnect();
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('update-users', onUpdateUsers);
      socket.io.off('reconnect_attempt', onReconnectAttempt);

    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, reconnecting, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};
