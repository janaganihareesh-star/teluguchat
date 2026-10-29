const webpush = require('web-push');
const User = require('../models/User');

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const mailto = process.env.VAPID_MAILTO || 'mailto:admin@teluguchat.local';

if (publicKey && privateKey) {
  try {
    webpush.setVapidDetails(mailto, publicKey, privateKey);
    console.log('✅ Web Push VAPID details configured successfully.');
  } catch (err) {
    console.error('❌ Failed to configure Web Push VAPID:', err.message);
  }
} else {
  console.warn('⚠️ VAPID keys not configured in .env. Web push notifications disabled.');
}

/**
 * Send a background Web Push Notification to a user across all their registered devices
 * @param {string|mongoose.Types.ObjectId} userId 
 * @param {object} payload - { title, body, icon, url, tag }
 */
async function sendPushNotification(userId, payload) {
  if (!publicKey || !privateKey) return;

  try {
    const user = await User.findById(userId).select('pushSubscriptions username');
    if (!user || !user.pushSubscriptions || user.pushSubscriptions.length === 0) {
      return;
    }

    const notificationPayload = JSON.stringify({
      title: payload.title || 'TeluguChat',
      body: payload.body || 'You have a new update in TeluguChat',
      icon: payload.icon || 'https://res.cloudinary.com/demo/image/upload/v1519759714/avatar.png',
      badge: payload.badge || '/logo.png',
      tag: payload.tag || 'general-notif',
      data: {
        url: payload.url || '/chat',
        timestamp: Date.now()
      }
    });

    const activeSubscriptions = [];

    for (const sub of user.pushSubscriptions) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth
          }
        };

        await webpush.sendNotification(pushSubscription, notificationPayload);
        activeSubscriptions.push(sub);
      } catch (err) {
        // Status 404 or 410 means subscription is expired or unregistered
        if (err.statusCode === 404 || err.statusCode === 410) {
          console.log(`[Web Push] Removing expired subscription for ${user.username}`);
        } else {
          console.error(`[Web Push] Error sending to ${user.username}:`, err.message);
          activeSubscriptions.push(sub); // keep temporarily for network glitches
        }
      }
    }

    // Save pruned active subscriptions if any were deleted
    if (activeSubscriptions.length !== user.pushSubscriptions.length) {
      user.pushSubscriptions = activeSubscriptions;
      await user.save();
    }
  } catch (err) {
    console.error('[Web Push Service Error]:', err.message);
  }
}

module.exports = {
  sendPushNotification,
  getVapidPublicKey: () => publicKey
};

