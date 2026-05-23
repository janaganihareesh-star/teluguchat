const express = require('express');
const { getNotifications, markRead, markAllRead, getUnreadCount } = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/', protect, getNotifications);
router.put('/:id/read', protect, markRead);
router.put('/read-all', protect, markAllRead);
router.get('/unread-count', protect, getUnreadCount);

module.exports = router;
