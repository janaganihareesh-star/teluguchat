import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';

export const InboxContext = createContext();

export const useInbox = () => useContext(InboxContext);

export const InboxProvider = ({ children }) => {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState(new Map());

  const updateUnread = useCallback((convId, count) => {
    setUnreadCounts(prev => {
      const newMap = new Map(prev);
      newMap.set(convId, count);
      return newMap;
    });
  }, []);

  const value = useMemo(() => ({
    conversations, activeConversation, unreadCounts, setConversations, setActiveConversation, updateUnread
  }), [conversations, activeConversation, unreadCounts, updateUnread]);

  return <InboxContext.Provider value={value}>{children}</InboxContext.Provider>;
};
