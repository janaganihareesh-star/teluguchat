const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Group = require('../models/Group');
const GroupMessage = require('../models/GroupMessage');

// Create a new group
router.post('/', protect, async (req, res) => {
  try {
    const { name, description, icon } = req.body;
    
    // Generate a random invite code
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const group = new Group({
      name,
      description,
      icon,
      admin: req.user._id,
      members: [req.user._id],
      inviteCode
    });
    
    await group.save();
    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ message: 'Error creating group', error: error.message });
  }
});

// Get user's groups
router.get('/', protect, async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id })
                              .populate('admin', 'username profilePic')
                              .populate('members', 'username profilePic');
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching groups', error: error.message });
  }
});

// Join group via invite code
router.post('/join/:code', protect, async (req, res) => {
  try {
    const group = await Group.findOne({ inviteCode: req.params.code });
    if (!group) return res.status(404).json({ message: 'Group not found or invalid code' });
    
    if (group.members.includes(req.user._id)) {
      return res.status(400).json({ message: 'Already a member' });
    }
    
    group.members.push(req.user._id);
    await group.save();
    
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: 'Error joining group', error: error.message });
  }
});

// Leave a group
router.post('/:groupId/leave', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    
    if (group.admin.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Admin cannot leave the group directly. Delete the group instead.' });
    }
    
    group.members = group.members.filter(m => m.toString() !== req.user._id.toString());
    await group.save();
    
    res.json({ message: 'Left group successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error leaving group', error: error.message });
  }
});

// Fetch messages for a group
router.get('/:groupId/messages', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    
    if (!group.members.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }
    
    const messages = await GroupMessage.find({ 
      group: req.params.groupId,
      $or: [
        { scheduledFor: { $exists: false } },
        { scheduledFor: null },
        { isScheduledSent: true }
      ]
    })
    .populate('sender', 'username profilePic role level gender')
    .sort({ createdAt: 1 })
    .limit(100);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching group messages', error: error.message });
  }
});

// Update group theme (Admin only)
router.put('/:groupId/theme', protect, async (req, res) => {
  try {
    const { theme } = req.body;
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    
    if (group.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the admin can change the theme' });
    }
    
    group.theme = theme;
    await group.save();
    
    res.json({ message: 'Theme updated successfully', group });
  } catch (error) {
    res.status(500).json({ message: 'Error updating theme', error: error.message });
  }
});

module.exports = router;
