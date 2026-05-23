import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';

export const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [currentRoom, setCurrentRoom] = useState('general');
  const [roomUsers, setRoomUsers] = useState([]);

  const addMessage = useCallback((msg) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const deleteMessage = useCallback((id) => {
    setMessages((prev) => prev.filter(m => m._id !== id));
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const value = useMemo(() => ({
    messages, currentRoom, roomUsers, addMessage, deleteMessage, clearMessages, setCurrentRoom, setRoomUsers
  }), [messages, currentRoom, roomUsers, addMessage, deleteMessage, clearMessages]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
