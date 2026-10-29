const User = require('../models/User');

/**
 * Find or create the dedicated TeluguAI system user
 */
const getOrCreateTeluguAIBot = async () => {
  try {
    let botUser = await User.findOne({ username: 'TeluguAI' });
    if (!botUser) {
      botUser = new User({
        username: 'TeluguAI',
        email: 'teluguai@system.internal',
        password: 'teluguai-protected-system-key-no-login',
        age: 25,
        gender: 'other',
        role: 'admin',
        level: 100,
        badge: 'legend',
        profilePic: 'https://api.dicebear.com/7.x/bottts/svg?seed=TeluguAI&backgroundColor=6366f1',
        bio: 'Mana Telugu Chat Official AI Mitra 🤖! Mention @TeluguAI anytime for fun, jokes, or quiz!',
        motto: 'Mee Telugu AI Mitra 🤖',
        isOnline: true,
        isVerified: true
      });
      await botUser.save();
      console.log('🤖 [TeluguAI] Bot user created successfully in MongoDB.');
    }
    return botUser;
  } catch (err) {
    console.error('Error finding or creating TeluguAI bot user:', err);
    return null;
  }
};

module.exports = { getOrCreateTeluguAIBot };

