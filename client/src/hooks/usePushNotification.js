import { useEffect } from 'react';
import { soundSystem } from '../utils/soundSystem';

const usePushNotification = (user) => {
  useEffect(() => {
    if (!user || !('serviceWorker' in navigator) || !('Notification' in window)) return;

    const register = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        await navigator.serviceWorker.register('/sw.js');
        console.log('Push notification service worker registered');
      } catch (err) {
        console.error('Push notification setup failed:', err);
      }
    };

    register();
  }, [user]);

  const sendNotification = (title, body, tag = 'default') => {
    if (Notification.permission !== 'granted') return;
    
    // Check if user has disabled notifications or sounds globally
    if (!soundSystem.enabled || !soundSystem.settings.notifications) return;

    try {
      new Notification(title, {
        body,
        icon: '/favicon.svg',
        tag,
        renotify: true
      });
      // Optionally play sound directly here if not played by the chat listener
      soundSystem.notificationAlert?.();
    } catch (err) {
      console.error('Notification failed:', err);
    }
  };

  return { sendNotification };
};

export default usePushNotification;
