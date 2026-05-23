const PrivateMessage = require('../models/PrivateMessage');
const Conversation = require('../models/Conversation');
const User = require('../models/User');

module.exports = (io, onlineUsers) => {
  io.on('connection', (socket) => {
    socket.on('private-message', async (data) => {
      const { senderId, receiverId, message, mediaUrl, gifUrl, voiceUrl } = data;

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

        const newMsg = new PrivateMessage({ sender: senderId, receiver: receiverId, message, mediaUrl, gifUrl, voiceUrl });
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
        conversation.unreadCount.set(receiverId.toString(), currentUnread + 1);
        
        await conversation.save();

        const receiverInfo = onlineUsers.get(receiverId.toString());
        const receiverSocketId = receiverInfo ? (typeof receiverInfo === 'string' ? receiverInfo : receiverInfo.socketId) : null;
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('private-message', newMsg);
        }
        socket.emit('private-message', newMsg); // send back to sender for UI

      } catch (err) {
        console.error(err);
      }
    });

    socket.on('typing-private', ({ senderId, receiverId }) => {
      const receiverInfo = onlineUsers.get(receiverId.toString());
      const receiverSocketId = receiverInfo ? (typeof receiverInfo === 'string' ? receiverInfo : receiverInfo.socketId) : null;
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('typing-private', senderId);
      }
    });

    socket.on('message-read', async ({ conversationId, userId }) => {
      const conversation = await Conversation.findById(conversationId);
      if(conversation) {
        conversation.unreadCount.set(userId, 0);
        await conversation.save();
      }
    });
  });
};
