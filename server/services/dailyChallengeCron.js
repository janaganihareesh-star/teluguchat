const cron = require('node-cron');
const Message = require('../models/Message');
const { getOrCreateSystemAdmin } = require('../utils/adminHelper');

const challenges = [
  {
    text: "🎯 **Bounty Drop!** Who is the current CEO of Google? First to answer wins 20 coins!",
    answer: "sundar pichai",
    coins: 20
  },
  {
    text: "🎯 **Bounty Drop!** Type the exact word 'Antigravity' to win 10 coins!",
    answer: "antigravity",
    coins: 10
  },
  {
    text: "🎯 **Bounty Drop!** What is 15 * 6? First one to solve wins 15 coins!",
    answer: "90",
    coins: 15
  },
  {
    text: "🎯 **Bounty Drop!** Which planet is known as the Red Planet? Win 20 coins!",
    answer: "mars",
    coins: 20
  },
  {
    text: "🎯 **Bounty Drop!** Type 'somethingnewiscoming' perfectly without spaces to win 50 coins!",
    answer: "somethingnewiscoming",
    coins: 50
  }
];

const dropChallenge = async (app) => {
  try {
    const adminUser = await getOrCreateSystemAdmin();
    if (!adminUser) return;

    const io = app.get('io');
    if (!io) return;

    const randomChallenge = challenges[Math.floor(Math.random() * challenges.length)];
    
    // Set active challenge globally
    global.activeChallenge = randomChallenge;

    const sysMsg = new Message({
      room: 'general',
      message: randomChallenge.text,
      sender: adminUser._id
    });
    
    await sysMsg.save();
    
    const populatedSysMsg = await Message.findById(sysMsg._id).populate('sender', 'username profilePic level badge role');
    io.to('general').emit('receive-message', populatedSysMsg);
    
    console.log(`[Challenge Cron] Dropped challenge: ${randomChallenge.text.substring(0, 30)}...`);
  } catch (error) {
    console.error('[Challenge Cron] Error:', error);
  }
};

module.exports = (app) => {
  // Run everyday at 2:00 PM and 8:00 PM
  cron.schedule('0 14,20 * * *', () => {
    dropChallenge(app);
  });
};
