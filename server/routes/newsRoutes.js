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

module.exports = router;
