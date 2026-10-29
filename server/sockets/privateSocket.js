const PrivateMessage = require('../models/PrivateMessage');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const { addToReviewQueue } = require('../utils/moderationQueue');
const { sendPushNotification } = require('../services/webPushService');

module.exports = (io, onlineUsers) => {
  io.on('connection', (socket) => {
    socket.on('private-message', async (data) => {
      const { senderId, receiverId, message, mediaUrl, gifUrl, voiceUrl, location, contact, scheduledFor, expiresAt, isViewOnce } = data;

      try {
        const receiverUser = await User.findById(receiverId);
        const senderUser = await User.findById(senderId);

        if (!receiverUser || !senderUser) {
          socket.emit('private-message-error', { error: 'User not found.' });
          return;
        }

        // Check if receiver blocked/restricted/ignored sender
        if (receiverUser.blockedUsers.some(id => id.toString() === senderId.toString())) {
          socket.emit('private-message-error', { error: 'You cannot message this user.' });
          return;
        }
        if (receiverUser.restrictedUsers.some(id => id.toString() === senderId.toString())) {
          socket.emit('private-message-error', { error: 'User is not available.' });
          return;
        }
        if (receiverUser.ignoredUsers && receiverUser.ignoredUsers.some(id => id.toString() === senderId.toString())) {
          socket.emit('private-message-error', { error: 'This user has ignored messages from you.' });
          return;
        }

        // Check if sender blocked/restricted/ignored receiver
        if (senderUser.blockedUsers.some(id => id.toString() === receiverId.toString())) {
          socket.emit('private-message-error', { error: 'You have blocked this user. Unblock them first.' });
          return;
        }
        if (senderUser.restrictedUsers.some(id => id.toString() === receiverId.toString())) {
          socket.emit('private-message-error', { error: 'You have restricted this user.' });
          return;
        }
        if (senderUser.ignoredUsers && senderUser.ignoredUsers.some(id => id.toString() === receiverId.toString())) {
          socket.emit('private-message-error', { error: 'You have ignored this user. Unignore them in chat settings first.' });
          return;
        }

        const newMsg = new PrivateMessage({ sender: senderId, receiver: receiverId, message, mediaUrl, gifUrl, voiceUrl, location, contact, scheduledFor, expiresAt, isViewOnce });
        await newMsg.save();

        let conversation = await Conversation.findOne({ participants: { $all: [senderId, receiverId] } });
        if (!conversation) {
          conversation = new Conversation({
            participants: [senderId, receiverId],
            unreadCount: new Map([[senderId, 0], [receiverId, 0]])
          });
        }
        
        conversation.lastMessage = message || 'Media attachment';
        conversation.lastMessageAt = Date.now();
        const currentUnread = conversation.unreadCount.get(receiverId.toString()) || 0;
        const newUnreadCount = currentUnread + 1;
        conversation.unreadCount.set(receiverId.toString(), newUnreadCount);
        
        await conversation.save();

        // Behavior Profiling & Shadowbanning (Phase 1)
        if (newUnreadCount === 10) {
          senderUser.moderation = senderUser.moderation || {};
          senderUser.moderation.riskLevel = 'high-risk';
          senderUser.moderation.lastViolationAt = new Date();
          await senderUser.save();
          
          addToReviewQueue(
            senderUser._id.toString(),
            senderUser.username,
            'spam-behavior',
            `User sent 10 unreciprocated private messages to ${receiverUser.username}`
          );
        }

        const receiverInfo = onlineUsers.get(receiverId.toString());
        const receiverSocketId = receiverInfo ? (typeof receiverInfo === 'string' ? receiverInfo : receiverInfo.socketId) : null;
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('private-message', newMsg);
        }
        socket.emit('private-message', newMsg); // send back to sender for UI

        // Background Web Push Notification to receiver
        sendPushNotification(receiverId, {
          title: `💬 ${senderUser.username}`,
          body: isViewOnce ? '📷 Sent a view-once photo' : (message || (mediaUrl ? '📎 Sent an attachment' : (voiceUrl ? '🎤 Sent a voice note' : 'New private message'))),
          icon: senderUser.profilePic || '/logo.png',
          url: '/inbox',
          tag: `pm-${senderId}`
        });

      } catch (err) {
        console.error(err);
      }
    });

    // Screenshot Protection Alert
    socket.on('screenshot-taken', ({ targetUserId, senderName }) => {
      try {
        const targetInfo = onlineUsers.get(targetUserId.toString());
        const targetSocketId = targetInfo ? (typeof targetInfo === 'string' ? targetInfo : targetInfo.socketId) : null;
        if (targetSocketId) {
          io.to(targetSocketId).emit('screenshot-alert', { byUser: senderName });
        }
      } catch (sErr) {
        console.error('Error broadcasting screenshot alert:', sErr);
      }
    });

    socket.on('delete-private-message', async (data) => {
      try {
        const { messageId, receiverId } = data;
        
        // Use the authenticated user's ID
        const senderId = socket.user?.id || (socket.request && socket.request.user ? socket.request.user.id : null);
        if (!senderId) return;

        const message = await PrivateMessage.findById(messageId);
        if (message && message.sender.toString() === senderId.toString()) {
          message.isDeleted = true;
          message.deletedBy = 'user';
          message.message = 'This message was deleted 🚫';
          message.mediaUrl = '';
          message.voiceUrl = '';
          message.gifUrl = '';
          await message.save();
          
          const receiverInfo = onlineUsers.get(receiverId.toString());
          const receiverSocketId = receiverInfo ? (typeof receiverInfo === 'string' ? receiverInfo : receiverInfo.socketId) : null;
          if (receiverSocketId) {
            io.to(receiverSocketId).emit('private-message-deleted', { messageId });
          }
          socket.emit('private-message-deleted', { messageId });
        }
      } catch (err) {
        console.error('Error deleting private message:', err);
      }
    });

    socket.on('typing-private', ({ senderId, receiverId }) => {
      const receiverInfo = onlineUsers.get(receiverId.toString());
      const receiverSocketId = receiverInfo ? (typeof receiverInfo === 'string' ? receiverInfo : receiverInfo.socketId) : null;
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('typing-private', senderId);
      }
    });

    socket.on('message-read', async ({ conversationId, userId, targetUserId }) => {
      const conversation = await Conversation.findById(conversationId);
      if(conversation) {
        conversation.unreadCount.set(userId, 0);
        await conversation.save();
      }

      if (targetUserId) {
        // Mark all messages from targetUserId to userId as read
        await PrivateMessage.updateMany(
          { sender: targetUserId, receiver: userId, isRead: false },
          { $set: { isRead: true } }
        );

        // Notify the sender that their messages were read
        const senderInfo = onlineUsers.get(targetUserId.toString());
        const senderSocketId = senderInfo ? (typeof senderInfo === 'string' ? senderInfo : senderInfo.socketId) : null;
        if (senderSocketId) {
          io.to(senderSocketId).emit('messages-read', { conversationId, readerId: userId });
        }
      }
    });

    // WebRTC Video/Audio Call Events
    socket.on('call-user', async (data) => {
      try {
        const callerUser = socket.user ? await User.findById(socket.user.id).select('username profilePic') : null;
        const callerName = callerUser?.username || 'Someone';

        // Send background web push notification for incoming call
        sendPushNotification(data.userToCall, {
          title: `📞 Incoming Call from ${callerName}`,
          body: 'Tap to answer video/audio call in TeluguChat',
          icon: callerUser?.profilePic || '/logo.png',
          url: '/chat',
          tag: `call-${socket.user?.id}`
        });

        const receiverInfo = onlineUsers.get(data.userToCall.toString());
        const receiverSocketId = receiverInfo ? (typeof receiverInfo === 'string' ? receiverInfo : receiverInfo.socketId) : null;
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('call-made', {
            signal: data.signalData,
            from: data.from,
            callerId: socket.user ? socket.user.id : data.callerId,
            callerName,
            callerPic: callerUser?.profilePic
          });
        }
      } catch (callErr) {
        console.error('Error handling call-user event:', callErr);
      }
    });

    socket.on('answer-call', (data) => {
      const callerInfo = onlineUsers.get(data.to.toString());
      const callerSocketId = callerInfo ? (typeof callerInfo === 'string' ? callerInfo : callerInfo.socketId) : null;
      if (callerSocketId) {
        io.to(callerSocketId).emit('call-accepted', data.signal);
      }
    });

    socket.on('end-call', (data) => {
      if (data.to) {
        const targetInfo = onlineUsers.get(data.to.toString());
        const targetSocketId = targetInfo ? (typeof targetInfo === 'string' ? targetInfo : targetInfo.socketId) : null;
        if (targetSocketId) {
          io.to(targetSocketId).emit('call-ended');
        }
      }
    });
  });
};
