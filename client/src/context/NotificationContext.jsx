import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';

export const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((notif) => {
    setNotifications(prev => [notif, ...prev]);
  }, []);

  const markRead = useCallback((id) => {
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
  }, []);

  const totalUnread = useMemo(() => {
    return notifications.filter(n => !n.isRead).length;
  }, [notifications]);

  const value = useMemo(() => ({
    notifications, totalUnread, addNotification, markRead, setNotifications
  }), [notifications, totalUnread, addNotification, markRead]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};
