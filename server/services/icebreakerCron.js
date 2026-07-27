const cron = require('node-cron');
const Group = require('../models/Group');
const Conversation = require('../models/Conversation');
const GroupMessage = require('../models/GroupMessage');
const PrivateMessage = require('../models/PrivateMessage');
const { getOrCreateSystemAdmin } = require('../utils/adminHelper');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Icebreaker topics
const icebreakers = [
  "Truth or Dare? First person to reply with 'Truth' or 'Dare' gets a challenge! 👀",
  "If you had 1 million dollars right now, what is the FIRST thing you would buy? 💰",
  "What is the most embarrassing thing that happened to you in school? 🏫",
  "Would you rather travel 100 years into the past or 100 years into the future? ⏳",
  "Post your favorite meme! The best one gets bragging rights. 🏆",
  "What's a movie that everyone loves but you secretly hate? 🎥",
  "What's your most controversial food opinion? 🍕",
  "If you could have any superpower for 24 hours, what would it be? 🦸"
];

const checkInactiveChats = async (app) => {
  try {
    const adminUser = await getOrCreateSystemAdmin();
    if (!adminUser) return;
    
    const now = Date.now();
    const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);

    const io = app.get('io');
    if (!io) return;

    // Check Groups
    const inactiveGroups = await Group.find({
      'lastMessage.timestamp': { $lt: new Date(twentyFourHoursAgo) }
    });

    for (let group of inactiveGroups) {
      const randomIcebreaker = icebreakers[Math.floor(Math.random() * icebreakers.length)];
      
      const newMsg = new GroupMessage({
        groupId: group._id,
        sender: adminUser._id,
        message: `🤖 *AI Ice-breaker:*\n\n${randomIcebreaker}`
      });
      await newMsg.save();

      group.lastMessage = {
        text: `AI Ice-breaker: ${randomIcebreaker.substring(0, 20)}...`,
        sender: adminUser.username,
        timestamp: new Date()
      };
      await group.save();

      const populatedMsg = await GroupMessage.findById(newMsg._id).populate('sender', 'username profilePic level badge role');
      io.to(`group_${group._id}`).emit('group-message', populatedMsg);
    }

    // Check Private Conversations
    const inactiveConversations = await Conversation.find({
      lastMessageAt: { $lt: new Date(twentyFourHoursAgo) }
    });

    for (let conv of inactiveConversations) {
      // Pick a random participant to receive the icebreaker as a system message
      // Actually, private conversations are 1-1. We shouldn't inject a message into the DB from the bot
      // because PrivateMessages require a specific sender and receiver.
      // A better approach is to send a system notification, or just send a direct message to both from the bot.
      
      const randomIcebreaker = icebreakers[Math.floor(Math.random() * icebreakers.length)];
      
      // Send to participant 1
      const p1Msg = new PrivateMessage({
        sender: adminUser._id,
        receiver: conv.participants[0],
        message: `🤖 *Dead Chat Revival!*\nWant to talk to someone? Try asking this:\n\n"${randomIcebreaker}"`
      });
      await p1Msg.save();

      // Send to participant 2
      const p2Msg = new PrivateMessage({
        sender: adminUser._id,
        receiver: conv.participants[1],
        message: `🤖 *Dead Chat Revival!*\nWant to talk to someone? Try asking this:\n\n"${randomIcebreaker}"`
      });
      await p2Msg.save();
      
      // Update conv
      conv.lastMessageAt = new Date();
      await conv.save();
    }

    console.log(`[Icebreaker Cron] Triggered for ${inactiveGroups.length} groups and ${inactiveConversations.length} private chats.`);
  } catch (error) {
    console.error('[Icebreaker Cron] Error:', error);
  }
};

module.exports = (app) => {
  // Run every 4 hours
  cron.schedule('0 */4 * * *', () => {
    checkInactiveChats(app);
  });
};
