const User = require('../models/User');
const { calculateLevel, getBadge } = require('../utils/xpSystem');

exports.addXp = async (userId, amount, io) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    user.xp += amount;
    const newLevel = calculateLevel(user.xp);

    if (newLevel > user.level) {
      user.level = newLevel;
      user.badge = getBadge(newLevel, user.gender);
      
      if (io) {
        // Emit level up event
        const onlineUsers = require('../sockets/chatSocket').getOnlineUsers; // Helper we'll add
        // To be simpler, we can just broadcast or send specifically if we pass socket instead of io
        // We will handle socket logic more carefully later
      }
    }

    await user.save();
  } catch (error) {
    console.error('Error adding XP:', error);
  }
};
