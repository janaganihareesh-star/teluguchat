const Notification = require('../models/Notification');

module.exports = (io, onlineUsers) => {
  const createNotification = async (data) => {
    try {
      const newNotif = new Notification(data);
      await newNotif.save();
      
      const populatedNotif = await Notification.findById(newNotif._id).populate('sender', 'username profilePic role');
      
      const socketId = onlineUsers.get(data.recipient.toString());
      if (socketId) {
        io.to(socketId).emit('new-notification', populatedNotif);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return { createNotification };
};
