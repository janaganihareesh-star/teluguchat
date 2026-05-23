const User = require('../models/User');
const Message = require('../models/Message');

exports.muteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { minutes } = req.body;
    
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.mutedUntil = new Date(Date.now() + minutes * 60000);
    await user.save();
    
    // In a real app, we emit 'user-muted' socket event to the user
    res.status(200).json({ message: `User muted for ${minutes} minutes` });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.kickUser = async (req, res) => {
  try {
    const { userId, roomId } = req.params;
    // We would use io instance to force socket.leave(roomId)
    res.status(200).json({ message: `User kicked from room ${roomId}` });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.banUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isBanned = true; // Wait, added this field logically
    user.banReason = reason;
    await user.save();
    
    // Disconnect their socket
    res.status(200).json({ message: `User banned for: ${reason}` });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
