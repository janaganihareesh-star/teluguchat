const express = require('express');
const router = express.Router();
const Story = require('../models/Story');
const { protect } = require('../middleware/authMiddleware');

// Get all active stories for the current user (their own and others)
// In a real app, you'd filter by friends/contacts. For now, fetch all active stories.
router.get('/', protect, async (req, res) => {
  try {
    const stories = await Story.find({ expiresAt: { $gt: new Date() } })
      .populate('user', 'username profilePic _id')
      .sort({ createdAt: -1 });

    // Group stories by user
    const groupedStories = stories.reduce((acc, story) => {
      const userId = story.user._id.toString();
      if (!acc[userId]) {
        acc[userId] = {
          user: story.user,
          stories: []
        };
      }
      acc[userId].stories.push(story);
      return acc;
    }, {});

    res.json(Object.values(groupedStories));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching stories' });
  }
});

// Create a new story
router.post('/', protect, async (req, res) => {
  try {
    const { mediaUrl, text } = req.body;
    
    if (!mediaUrl && !text) {
      return res.status(400).json({ message: 'Media or text is required for a story' });
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    const story = new Story({
      user: req.user._id,
      mediaUrl: mediaUrl || '', // Make it empty string if not provided
      text: text || '',
      expiresAt
    });

    await story.save();
    res.status(201).json(story);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating story' });
  }
});

// Mark story as viewed
router.post('/:id/view', protect, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Story not found' });

    if (!story.viewers.includes(req.user._id)) {
      story.viewers.push(req.user._id);
      await story.save();
    }
    res.status(200).json({ message: 'Story viewed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error viewing story' });
  }
});

// Delete a story
router.delete('/:id', protect, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Story not found' });

    // Only allow the story owner to delete it
    if (story.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own stories' });
    }

    await Story.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Story deleted' });
  } catch (error) {
    console.error('Error deleting story:', error);
    res.status(500).json({ message: 'Error deleting story' });
  }
});

module.exports = router;
