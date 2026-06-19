const express = require('express');
const router = express.Router();
const User = require('../models/User');

// GET /api/stats — public endpoint for landing page real stats
router.get('/', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const onlineUsersCount = global.onlineUsers ? global.onlineUsers.size : 0;

    res.json({
      totalUsers,
      onlineUsers: onlineUsersCount,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
});

module.exports = router;
