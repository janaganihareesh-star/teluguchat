const express = require('express');
const { muteUser, kickUser, banUser, getAllUsers } = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { admin } = require('../middleware/adminMiddleware');
const router = express.Router();

router.post('/mute/:userId', protect, admin, muteUser);
router.post('/kick/:userId/:roomId', protect, admin, kickUser);
router.post('/ban/:userId', protect, admin, banUser);
router.get('/users', protect, admin, getAllUsers);

module.exports = router;
