const express = require('express');
const { getConversations, getMessages, createConversation, readAllConversations, clearAllConversations } = require('../controllers/inboxController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/conversations', protect, getConversations);
router.get('/messages/:conversationId', protect, getMessages);
router.post('/conversations', protect, createConversation);
router.put('/read-all', protect, readAllConversations);
router.delete('/clear-all', protect, clearAllConversations);

module.exports = router;
