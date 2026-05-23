const express = require('express');
const { 
  getProfileByUsername, 
  updateProfile, 
  sendFriendRequest, 
  acceptFriendRequest, 
  rejectFriendRequest, 
  getFriendsList, 
  unfriendUser,
  toggleLikeProfile,
  blockUser,
  unblockUser,
  restrictUser,
  unrestrictUser,
  getActionsStatus,
  ignoreUser,
  unignoreUser,
  reportUser,
  addCoins,
  sendGift,
  transferCoins,
  getLeaderboard
, changeEmail, changePassword, getIgnoredUsersList, uploadProfilePic, uploadCoverPhoto} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { moderateImage } = require('../middleware/imageModerator');
const router = express.Router();

router.get('/leaderboard', protect, getLeaderboard);
router.get('/profile/:username', protect, getProfileByUsername);
router.put('/profile', protect, updateProfile);
router.post('/profile-pic', protect, upload.single('file'), moderateImage, uploadProfilePic);
router.post('/cover-photo', protect, upload.single('file'), moderateImage, uploadCoverPhoto);
router.put('/change-email', protect, changeEmail);
router.put('/change-password', protect, changePassword);
router.get('/friends', protect, getFriendsList);
router.get('/ignores', protect, getIgnoredUsersList);
router.post('/friend-request/:userId', protect, sendFriendRequest);
router.post('/friend-request/:notifId/accept', protect, acceptFriendRequest);
router.post('/friend-request/:notifId/reject', protect, rejectFriendRequest);
router.delete('/friends/:friendId', protect, unfriendUser);
router.post('/profile/:userId/like', protect, toggleLikeProfile);
router.post('/add-coins', protect, addCoins);
router.post('/send-gift/:userId', protect, sendGift);
router.post('/transfer-coins/:userId', protect, transferCoins);

// Block/Restrict/Ignore/Report Routes
router.post('/block/:userId', protect, blockUser);
router.post('/unblock/:userId', protect, unblockUser);
router.post('/restrict/:userId', protect, restrictUser);
router.post('/unrestrict/:userId', protect, unrestrictUser);
router.post('/ignore/:userId', protect, ignoreUser);
router.post('/unignore/:userId', protect, unignoreUser);
router.post('/report/:userId', protect, reportUser);
router.get('/actions-status/:userId', protect, getActionsStatus);

module.exports = router;
