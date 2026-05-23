const Message = require('../models/Message');

exports.getMessages = async (req, res) => {
  try {
    const { room } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const messages = await Message.find({ room })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('sender', 'username profilePic level badge role');

    res.status(200).json(messages.reverse());
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching messages' });
  }
};

exports.getMessagesSince = async (req, res) => {
  try {
    const { room, timestamp } = req.params;
    const messages = await Message.find({ 
      room, 
      createdAt: { $gt: new Date(timestamp) } 
    })
      .sort({ createdAt: 1 })
      .populate('sender', 'username profilePic level badge role');

    res.status(200).json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching recent messages' });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Only sender or admin can delete. Handled later via middleware/check
    if (message.sender.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }

    message.isDeleted = true;
    message.deletedBy = req.user.role === 'admin' ? 'admin' : 'user';
    await message.save();

    res.status(200).json({ message: 'Message deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting message' });
  }
};
