import { useEffect } from 'react';

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
    try {
      new Notification(title, {
        body,
        icon: '/favicon.svg',
        tag,
        renotify: true
      });
    } catch (err) {
      console.error('Notification failed:', err);
    }
  };

  return { sendNotification };
};

export default usePushNotification;
