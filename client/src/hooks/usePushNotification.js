import { useEffect, useState } from 'react';
import { soundSystem } from '../utils/soundSystem';
import { registerPushSubscription } from '../utils/pushManager';

const usePushNotification = (user) => {
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!user || user.role === 'guest') return;

    registerPushSubscription(user).then((sub) => {
      if (sub) setIsSubscribed(true);
    });
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
      soundSystem.notificationAlert?.();
    } catch (err) {
      console.error('Notification failed:', err);
    }
  };

  return { sendNotification, isSubscribed };
};

export default usePushNotification;
