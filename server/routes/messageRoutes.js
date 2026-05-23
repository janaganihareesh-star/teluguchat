const express = require('express');
const { getMessages, deleteMessage, getMessagesSince } = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/:room', protect, getMessages);
router.get('/:room/since/:timestamp', protect, getMessagesSince);
router.delete('/:id', protect, deleteMessage);

module.exports = router;
