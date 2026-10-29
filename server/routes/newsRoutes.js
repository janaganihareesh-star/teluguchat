const express = require('express');
const router = express.Router();
const News = require('../models/News');
const { protect } = require('../middleware/authMiddleware');

// Get latest news
router.get('/', protect, async (req, res) => {
  try {
    const latestNews = await News.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('replies.user', 'username profilePic');
    res.json(latestNews);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching news' });
  }
});

// Post a reply to a news item
router.post('/:id/reply', protect, async (req, res) => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) return res.status(404).json({ message: 'News not found' });
    
    if (!req.body.text || req.body.text.trim() === '') {
      return res.status(400).json({ message: 'Reply text is required' });
    }

    news.replies.push({
      user: req.user.id,
      text: req.body.text.trim()
    });
    
    await news.save();
    
    // Return the updated news item with populated replies
    const updatedNews = await News.findById(req.params.id)
      .populate('replies.user', 'username profilePic');
      
    res.json(updatedNews);
  } catch (err) {
    res.status(500).json({ message: 'Error posting reply' });
  }
});

// Vote on daily community poll and award 5 coins
router.post('/:id/vote', protect, async (req, res) => {
  try {
    const { optionIndex } = req.body;
    const news = await News.findById(req.params.id);
    if (!news) return res.status(404).json({ message: 'News not found' });
    if (!news.poll || !news.poll.options || news.poll.options.length <= optionIndex) {
      return res.status(400).json({ message: 'Invalid poll option' });
    }

    const userId = req.user.id;
    const alreadyVoted = news.poll.options.some(opt => opt.votes.some(v => v.toString() === userId.toString()));
    if (alreadyVoted) {
      return res.status(400).json({ message: 'You have already voted on this poll!' });
    }

    news.poll.options[optionIndex].votes.push(userId);
    await news.save();

    const User = require('../models/User');
    const user = await User.findById(userId);
    const rewardCoins = news.poll.rewardCoins || 5;
    if (user) {
      user.coins = (user.coins || 0) + rewardCoins;
      await user.save();
    }

    const updatedNews = await News.findById(req.params.id)
      .populate('replies.user', 'username profilePic');

    res.json({
      message: `Vote registered! You earned ${rewardCoins} Coins! 🎉`,
      news: updatedNews,
      coins: user ? user.coins : 0
    });
  } catch (err) {
    console.error('Error voting on news poll:', err);
    res.status(500).json({ message: 'Error submitting vote' });
  }
});

module.exports = router;
