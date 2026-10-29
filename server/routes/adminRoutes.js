const express = require('express');
const { muteUser, kickUser, banUser, getAllUsers, shadowbanUser, banUserIp, getModerationQueue, resolveQueueItem } = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { admin } = require('../middleware/adminMiddleware');
const router = express.Router();

router.get('/moderation-queue', protect, admin, getModerationQueue);
router.post('/moderation-queue/:reviewId/resolve', protect, admin, resolveQueueItem);
router.post('/mute/:userId', protect, admin, muteUser);
router.post('/kick/:userId/:roomId', protect, admin, kickUser);
router.post('/ban/:userId', protect, admin, banUser);
router.post('/shadowban/:userId', protect, admin, shadowbanUser);
router.post('/ipban/:userId', protect, admin, banUserIp);
router.get('/users', protect, admin, getAllUsers);

module.exports = router;
