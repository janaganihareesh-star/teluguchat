const Conversation = require('../models/Conversation');
const PrivateMessage = require('../models/PrivateMessage');

exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const conversations = await Conversation.find({ participants: userId })
      .sort({ lastMessageAt: -1 })
      .populate('participants', 'username profilePic isOnline role');

    res.status(200).json(conversations);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching conversations' });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    // We can fetch by sender/receiver or simply by conversationId if we added it to PrivateMessage
    // Since prompt didn't add conversationId to PrivateMessage, we'll fetch by participants
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

    const messages = await PrivateMessage.find({
      $or: [
        { sender: conversation.participants[0], receiver: conversation.participants[1] },
        { sender: conversation.participants[1], receiver: conversation.participants[0] }
      ]
    })
    .sort({ createdAt: 1 })
    .populate('sender', 'username profilePic role');

    // Reset unread count
    conversation.unreadCount.set(userId, 0);
    await conversation.save();

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching messages' });
  }
};

exports.createConversation = async (req, res) => {
  try {
    const { userId } = req.body;
    const myId = req.user.id;

    let conversation = await Conversation.findOne({
      participants: { $all: [myId, userId] }
    });

    if (!conversation) {
      conversation = new Conversation({
        participants: [myId, userId],
        unreadCount: new Map([[myId, 0], [userId, 0]])
      });
      await conversation.save();
    }

    res.status(200).json(conversation);
  } catch (error) {
    res.status(500).json({ message: 'Error creating conversation' });
  }
};

exports.readAllConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const conversations = await Conversation.find({ participants: userId });
    for (const conv of conversations) {
      conv.unreadCount.set(userId, 0);
      await conv.save();
    }
    res.status(200).json({ message: 'All conversations marked as read' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error marking conversations as read' });
  }
};

exports.clearAllConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const conversations = await Conversation.find({ participants: userId });
    
    for (const conv of conversations) {
      const otherUser = conv.participants.find(p => p.toString() !== userId.toString());
      if (otherUser) {
        await PrivateMessage.deleteMany({
          $or: [
            { sender: userId, receiver: otherUser },
            { sender: otherUser, receiver: userId }
          ]
        });
      }
      await Conversation.findByIdAndDelete(conv._id);
    }
    
    res.status(200).json({ message: 'All conversations deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting conversations' });
  }
};
