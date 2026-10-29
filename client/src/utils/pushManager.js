import api from '../services/api';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Register Service Worker and subscribe to Background Web Push
 */
export async function registerPushSubscription(user) {
  if (!user || user.role === 'guest') return null;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[Web Push] Push messaging is not supported in this browser.');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[Web Push] Notification permission was not granted:', permission);
      return null;
    }

    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    // Check existing subscription
    let subscription = await registration.pushManager.getSubscription();

    // Get VAPID public key
    let vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      const res = await api.get('/api/notifications/vapid-public-key');
      vapidPublicKey = res.data.publicKey;
    }

    if (!vapidPublicKey) {
      console.warn('[Web Push] No VAPID public key found.');
      return null;
    }

    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });
      console.log('✅ [Web Push] Subscribed to push notification endpoint.');
    }

    // Send subscription to backend
    await api.post('/api/notifications/subscribe', {
      subscription: subscription.toJSON()
    });

    console.log('✅ [Web Push] Subscription successfully synchronized with server.');
    return subscription;
  } catch (err) {
    console.error('[Web Push] Error registering push subscription:', err);
    return null;
  }
}

