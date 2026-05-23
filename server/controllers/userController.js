const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Get profile by username
exports.getProfileByUsername = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username })
      .select('-password -otp -otpExpiry')
      .populate('friends', 'username profilePic level role gender isOnline');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const targetId = user._id;
    const currentUserId = req.user.id;

    // Check if target user has restricted the requester
    if (user.restrictedUsers && user.restrictedUsers.some(id => id.toString() === currentUserId.toString())) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if requester has restricted the target user
    const requester = await User.findById(currentUserId);
    if (requester && requester.restrictedUsers && requester.restrictedUsers.some(id => id.toString() === targetId.toString())) {
      return res.status(404).json({ message: 'User not found' });
    }

    
    // Apply privacy settings if viewing someone else's profile
    if (user._id.toString() !== currentUserId.toString() && user.privacy) {
      const sanitizedUser = user.toObject();
      if (user.privacy.showAge === false) {
        delete sanitizedUser.age;
        delete sanitizedUser.dob;
      }
      if (user.privacy.showGender === false) delete sanitizedUser.gender;
      if (user.privacy.showLocation === false) delete sanitizedUser.country;
      if (user.privacy.showFriendList === false) delete sanitizedUser.friends;
      if (user.privacy.showGiftList === false) delete sanitizedUser.gifts;
      return res.status(200).json(sanitizedUser);
    }

    res.status(200).json(user);

  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Error fetching profile' });
  }
};

// Update profile details
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { motto, relationshipStatus, bio, profilePic, profileColor, coverPhoto, facebook, instagram, gender, age, country } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (motto !== undefined) user.motto = motto;
    if (relationshipStatus !== undefined) user.relationshipStatus = relationshipStatus;
    if (bio !== undefined) user.bio = bio;
    if (profilePic !== undefined) user.profilePic = profilePic;
    if (profileColor !== undefined) user.profileColor = profileColor;
    if (coverPhoto !== undefined) user.coverPhoto = coverPhoto;
    if (facebook !== undefined) user.facebook = facebook;
    if (instagram !== undefined) user.instagram = instagram;
    if (gender !== undefined) user.gender = gender.toLowerCase();
      if (req.body.dob !== undefined) {
        if (user.infoEdited) return res.status(400).json({ message: 'Info can only be edited once.' });
        user.dob = req.body.dob;
        user.infoEdited = true;
      }
    if (age !== undefined) {
      if (age < 18) {
        return res.status(400).json({ message: 'Age must be at least 18.' });
      }
      user.age = age;
    }
    if (country !== undefined) user.country = country;

    
    if (req.body.preferences) user.preferences = { ...user.preferences, ...req.body.preferences };
    if (req.body.privacy) user.privacy = { ...user.privacy, ...req.body.privacy };
    if (req.body.settings) user.settings = { ...user.settings, ...req.body.settings };
    
    await user.save();


    // Return the updated user info (matching auth format)
    const userResponse = {
      _id: user._id,
      username: user.username,
      email: user.email,
      age: user.age,
      gender: user.gender,
      country: user.country,
      profilePic: user.profilePic,
      level: user.level,
      badge: user.badge,
      role: user.role,
      
      motto: user.motto,
      relationshipStatus: user.relationshipStatus,
      bio: user.bio,
      profileColor: user.profileColor,
      coverPhoto: user.coverPhoto,
      facebook: user.facebook,
      instagram: user.instagram,
      likes: user.likes,
      likedBy: user.likedBy
    };

    res.status(200).json({
      message: 'Profile updated successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
};

// Send friend request
exports.sendFriendRequest = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { userId: recipientId } = req.params;

    if (senderId === recipientId) {
      return res.status(400).json({ message: 'You cannot send a friend request to yourself.' });
    }

    const recipient = await User.findById(recipientId);
    const sender = await User.findById(senderId);

    if (!recipient || !sender) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (sender.friends.includes(recipientId)) {
      return res.status(400).json({ message: 'You are already friends with this user.' });
    }

    // Check if a request is already pending
    const existingNotif = await Notification.findOne({
      recipient: recipientId,
      sender: senderId,
      type: 'friend_request',
      isRead: false
    });

    if (existingNotif) {
      return res.status(400).json({ message: 'Friend request already sent and pending.' });
    }

    // Create a new notification
    const notification = new Notification({
      recipient: recipientId,
      sender: senderId,
      type: 'friend_request',
      message: `${sender.username} sent you a friend request.`,
      link: '/chat' // Link back to chat room where they can accept it
    });

    await notification.save();

    // Track sent request
    if (!sender.friendRequestsSent.includes(recipientId)) {
      sender.friendRequestsSent.push(recipientId);
      await sender.save();
    }

    // Populate sender details for real-time update
    const populatedNotif = await Notification.findById(notification._id)
      .populate('sender', 'username profilePic level badge role gender');

    // Socket Emit
    const io = req.app.get('io');
    if (io && global.onlineUsers) {
      const recipientSocket = global.onlineUsers.get(recipientId.toString());
      if (recipientSocket) {
        io.to(recipientSocket.socketId).emit('new-notification', populatedNotif);
      }
    }

    res.status(200).json({ message: 'Friend request sent successfully.' });
  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).json({ message: 'Error sending friend request' });
  }
};

// Accept friend request
exports.acceptFriendRequest = async (req, res) => {
  try {
    const recipientId = req.user.id;
    const { notifId } = req.params;

    const notification = await Notification.findById(notifId);
    if (!notification) {
      return res.status(404).json({ message: 'Friend request not found.' });
    }

    if (notification.recipient.toString() !== recipientId) {
      return res.status(403).json({ message: 'Unauthorized action.' });
    }

    const senderId = notification.sender;
    const sender = await User.findById(senderId);
    const recipient = await User.findById(recipientId);

    if (!sender || !recipient) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Add as friends
    if (!recipient.friends.includes(senderId)) {
      recipient.friends.push(senderId);
    }
    if (!sender.friends.includes(recipientId)) {
      sender.friends.push(recipientId);
    }

    // Remove from sent lists
    sender.friendRequestsSent = sender.friendRequestsSent.filter(id => id.toString() !== recipientId);
    recipient.friendRequestsSent = recipient.friendRequestsSent.filter(id => id.toString() !== senderId);

    await recipient.save();
    await sender.save();

    // Mark notification as read
    notification.isRead = true;
    notification.message = `You accepted ${sender.username}'s friend request.`;
    await notification.save();

    // Create acceptance notification for the sender
    const acceptNotif = new Notification({
      recipient: senderId,
      sender: recipientId,
      type: 'mention', // Can trigger standard mention/alert style
      message: `${recipient.username} accepted your friend request.`,
      link: '/chat'
    });
    await acceptNotif.save();

    const populatedAcceptNotif = await Notification.findById(acceptNotif._id)
      .populate('sender', 'username profilePic level badge role gender');

    // Sockets: notify sender & trigger real-time friends list reload
    const io = req.app.get('io');
    if (io && global.onlineUsers) {
      // 1. Notify the sender
      const senderSocket = global.onlineUsers.get(senderId.toString());
      if (senderSocket) {
        io.to(senderSocket.socketId).emit('new-notification', populatedAcceptNotif);
        io.to(senderSocket.socketId).emit('friend-status-updated', { type: 'accept', friendId: recipientId });
      }
      
      // 2. Notify the recipient (self, in case other tabs are open)
      const recipientSocket = global.onlineUsers.get(recipientId.toString());
      if (recipientSocket) {
        io.to(recipientSocket.socketId).emit('friend-status-updated', { type: 'accept', friendId: senderId });
      }
    }

    res.status(200).json({ message: 'Friend request accepted.' });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    res.status(500).json({ message: 'Error accepting friend request' });
  }
};

// Reject friend request
exports.rejectFriendRequest = async (req, res) => {
  try {
    const recipientId = req.user.id;
    const { notifId } = req.params;

    const notification = await Notification.findById(notifId);
    if (!notification) {
      return res.status(404).json({ message: 'Friend request not found.' });
    }

    if (notification.recipient.toString() !== recipientId) {
      return res.status(403).json({ message: 'Unauthorized action.' });
    }

    // Mark as read and updated message
    notification.isRead = true;
    notification.message = `You declined ${notification.sender?.username || 'the'} friend request.`;
    await notification.save();

    // Clean up sender requests list
    const sender = await User.findById(notification.sender);
    if (sender) {
      sender.friendRequestsSent = sender.friendRequestsSent.filter(id => id.toString() !== recipientId);
      await sender.save();
    }

    res.status(200).json({ message: 'Friend request declined.' });
  } catch (error) {
    console.error('Error rejecting friend request:', error);
    res.status(500).json({ message: 'Error declining friend request' });
  }
};

// Get friends list
exports.getFriendsList = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).populate('friends', 'username profilePic level role gender isOnline lastSeen');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user.friends);
  } catch (error) {
    console.error('Error fetching friends list:', error);
    res.status(500).json({ message: 'Error fetching friends list' });
  }
};

// Remove friend
exports.unfriendUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const { friendId } = req.params;

    const user = await User.findById(userId);
    const friend = await User.findById(friendId);

    if (!user || !friend) {
      return res.status(404).json({ message: 'User not found.' });
    }

    user.friends = user.friends.filter(id => id.toString() !== friendId);
    friend.friends = friend.friends.filter(id => id.toString() !== userId);

    await user.save();
    await friend.save();

    // Sockets: trigger real-time friends list reload
    const io = req.app.get('io');
    if (io && global.onlineUsers) {
      const friendSocket = global.onlineUsers.get(friendId.toString());
      if (friendSocket) {
        io.to(friendSocket.socketId).emit('friend-status-updated', { type: 'unfriend', friendId: userId });
      }
      
      const userSocket = global.onlineUsers.get(userId.toString());
      if (userSocket) {
        io.to(userSocket.socketId).emit('friend-status-updated', { type: 'unfriend', friendId: friendId });
      }
    }

    res.status(200).json({ message: 'Unfriended successfully.' });
  } catch (error) {
    console.error('Error removing friend:', error);
    res.status(500).json({ message: 'Error removing friend' });
  }
};

// Toggle profile like/reputation
exports.toggleLikeProfile = async (req, res) => {
  try {
    const likerId = req.user.id;
    const { userId: targetId } = req.params;

    if (likerId === targetId) {
      return res.status(400).json({ message: 'You cannot like your own profile.' });
    }

    const targetUser = await User.findById(targetId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const liker = await User.findById(likerId);
    if (!liker) {
      return res.status(404).json({ message: 'Liker not found.' });
    }

    const alreadyLiked = targetUser.likedBy.includes(likerId);

    if (alreadyLiked) {
      // Unlike
      targetUser.likedBy = targetUser.likedBy.filter(id => id.toString() !== likerId);
      targetUser.likes = Math.max(0, targetUser.likes - 1);
      await targetUser.save();
    } else {
      // Like
      targetUser.likedBy.push(likerId);
      targetUser.likes += 1;
      await targetUser.save();

      // Create notification alert for liking
      const notif = new Notification({
        recipient: targetId,
        sender: likerId,
        type: 'mention',
        message: `${liker.username} liked your profile! 👍`,
        link: `/profile/${liker.username}`
      });
      await notif.save();

      // Emit real-time notification alert via Sockets
      const populatedNotif = await Notification.findById(notif._id)
        .populate('sender', 'username profilePic level badge role gender');

      const io = req.app.get('io');
      if (io && global.onlineUsers) {
        const recipientSocket = global.onlineUsers.get(targetId.toString());
        if (recipientSocket) {
          io.to(recipientSocket.socketId).emit('new-notification', populatedNotif);
        }
      }
    }

    // Sockets: notify all clients that likes changed
    const io = req.app.get('io');
    if (io) {
      io.emit('profile-likes-updated', { userId: targetId, likes: targetUser.likes, likedBy: targetUser.likedBy });
    }

    res.status(200).json({ 
      likes: targetUser.likes, 
      likedBy: targetUser.likedBy,
      alreadyLiked: !alreadyLiked
    });
  } catch (error) {
    console.error('Error toggling profile like:', error);
    res.status(500).json({ message: 'Error updating likes.' });
  }
};

// Block user
exports.blockUser = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { userId: targetId } = req.params;

    if (currentUserId === targetId) {
      return res.status(400).json({ message: 'You cannot block yourself.' });
    }

    const user = await User.findById(currentUserId);
    if (!user.blockedUsers.includes(targetId)) {
      user.blockedUsers.push(targetId);
      await user.save();
    }

    res.status(200).json({ message: 'User blocked successfully.' });
  } catch (error) {
    console.error('Error blocking user:', error);
    res.status(500).json({ message: 'Error blocking user.' });
  }
};

// Unblock user
exports.unblockUser = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { userId: targetId } = req.params;

    const user = await User.findById(currentUserId);
    user.blockedUsers = user.blockedUsers.filter(id => id.toString() !== targetId);
    await user.save();

    res.status(200).json({ message: 'User unblocked successfully.' });
  } catch (error) {
    console.error('Error unblocking user:', error);
    res.status(500).json({ message: 'Error unblocking user.' });
  }
};

// Restrict user
exports.restrictUser = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { userId: targetId } = req.params;

    if (currentUserId === targetId) {
      return res.status(400).json({ message: 'You cannot restrict yourself.' });
    }

    const user = await User.findById(currentUserId);
    if (!user.restrictedUsers.includes(targetId)) {
      user.restrictedUsers.push(targetId);
      await user.save();
    }

    // Trigger dynamic socket list updates
    const io = req.app.get('io');
    if (io && global.onlineUsers) {
      const chatSocket = require('../sockets/chatSocket');
      if (typeof chatSocket.updateUsersEvent === 'function') {
        await chatSocket.updateUsersEvent(io);
      }
    }

    res.status(200).json({ message: 'User restricted successfully.' });
  } catch (error) {
    console.error('Error restricting user:', error);
    res.status(500).json({ message: 'Error restricting user.' });
  }
};

// Unrestrict user
exports.unrestrictUser = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { userId: targetId } = req.params;

    const user = await User.findById(currentUserId);
    user.restrictedUsers = user.restrictedUsers.filter(id => id.toString() !== targetId);
    await user.save();

    // Trigger dynamic socket list updates
    const io = req.app.get('io');
    if (io && global.onlineUsers) {
      const chatSocket = require('../sockets/chatSocket');
      if (typeof chatSocket.updateUsersEvent === 'function') {
        await chatSocket.updateUsersEvent(io);
      }
    }

    res.status(200).json({ message: 'User unrestricted successfully.' });
  } catch (error) {
    console.error('Error unrestricting user:', error);
    res.status(500).json({ message: 'Error unrestricting user.' });
  }
};

// Get actions status
exports.getActionsStatus = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { userId: targetId } = req.params;

    const me = await User.findById(currentUserId);
    const target = await User.findById(targetId);

    if (!me || !target) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json({
      isBlocked: me.blockedUsers.includes(targetId),
      isRestricted: me.restrictedUsers.includes(targetId),
      isIgnored: me.ignoredUsers ? me.ignoredUsers.includes(targetId) : false,
      doesBlockMe: target.blockedUsers.includes(currentUserId),
      doesRestrictMe: target.restrictedUsers.includes(currentUserId),
      doesIgnoreMe: target.ignoredUsers ? target.ignoredUsers.includes(currentUserId) : false,
    });
  } catch (error) {
    console.error('Error getting actions status:', error);
    res.status(500).json({ message: 'Error getting status.' });
  }
};

// Ignore user
exports.ignoreUser = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { userId: targetId } = req.params;

    if (currentUserId === targetId) {
      return res.status(400).json({ message: 'You cannot ignore yourself.' });
    }

    const user = await User.findById(currentUserId);
    if (!user.ignoredUsers) {
      user.ignoredUsers = [];
    }
    if (!user.ignoredUsers.includes(targetId)) {
      user.ignoredUsers.push(targetId);
      await user.save();
    }

    res.status(200).json({ message: 'User ignored successfully.' });
  } catch (error) {
    console.error('Error ignoring user:', error);
    res.status(500).json({ message: 'Error ignoring user.' });
  }
};

// Unignore user
exports.unignoreUser = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { userId: targetId } = req.params;

    const user = await User.findById(currentUserId);
    if (user.ignoredUsers) {
      user.ignoredUsers = user.ignoredUsers.filter(id => id.toString() !== targetId);
      await user.save();
    }

    res.status(200).json({ message: 'User unignored successfully.' });
  } catch (error) {
    console.error('Error unignoring user:', error);
    res.status(500).json({ message: 'Error unignoring user.' });
  }
};

// Report user
const Report = require('../models/Report');
exports.reportUser = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { userId: targetId } = req.params;
    const { reason } = req.body;

    if (currentUserId === targetId) {
      return res.status(400).json({ message: 'You cannot report yourself.' });
    }

    const report = new Report({
      reporter: currentUserId,
      reportedUser: targetId,
      reason: reason || 'General Report'
    });
    await report.save();

    // Escalation checks
    const targetUser = await User.findById(targetId);
    if (targetUser) {
      if (!targetUser.moderation) {
        targetUser.moderation = {
          riskLevel: 'clean',
          warningsCount: 0,
          speedViolationsCount: 0,
          repeatedViolationsCount: 0,
          abuseViolationsCount: 0,
          unsafeImageCount: 0,
          reportsReceivedCount: 0
        };
      }
      targetUser.moderation.reportsReceivedCount = (targetUser.moderation.reportsReceivedCount || 0) + 1;
      
      let escalated = false;
      const holdTime = new Date(Date.now() + 15 * 60 * 1000);
      if (targetUser.moderation.reportsReceivedCount >= 5 && (!targetUser.moderation.holdUntil || targetUser.moderation.holdUntil < new Date())) {
        targetUser.moderation.holdUntil = holdTime;
        targetUser.moderation.holdStart = new Date();
        targetUser.moderation.holdReason = 'excessive user reports';
        targetUser.moderation.riskLevel = 'suspicious';
        escalated = true;
      }
      await targetUser.save();

      if (escalated) {
        const io = req.app.get('io');
        const onlineInfo = global.onlineUsers?.get(targetId);
        if (io && onlineInfo?.socketId) {
          io.to(onlineInfo.socketId).emit('moderation-event', {
            type: 'hold',
            message: `⏳ Your chat access is on hold due to receiving multiple user reports.`,
            until: holdTime
          });
        }
      }
    }

    res.status(200).json({ message: 'User reported successfully.' });
  } catch (error) {
    console.error('Error reporting user:', error);
    res.status(500).json({ message: 'Error reporting user.' });
  }
};

// Add coins to user's wallet
exports.addCoins = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { amount } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Invalid coin amount.' });
    }

    const user = await User.findById(currentUserId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    user.coins = (user.coins || 0) + Number(amount);
    await user.save();

    // Trigger update-users to update in real-time
    const io = req.app.get('io');
    if (io && global.onlineUsers) {
      if (global.onlineUsers.has(currentUserId)) {
        const info = global.onlineUsers.get(currentUserId);
        info.coins = user.coins;
        global.onlineUsers.set(currentUserId, info);
      }
      const chatSocket = require('../sockets/chatSocket');
      if (typeof chatSocket.updateUsersEvent === 'function') {
        await chatSocket.updateUsersEvent(io);
      }
    }

    res.status(200).json({ 
      message: 'Coins purchased successfully!', 
      coins: user.coins 
    });
  } catch (error) {
    console.error('Error adding coins:', error);
    res.status(500).json({ message: 'Error purchasing coins.' });
  }
};

// Send a virtual gift to a user using coins
exports.sendGift = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { userId: recipientId } = req.params;
    const { giftName } = req.body; // 'crown' | 'heart' | 'rose' | 'diamond'

    if (senderId === recipientId) {
      return res.status(400).json({ message: 'You cannot send a gift to yourself.' });
    }

    // Gift definition with cost and icon (31 premium virtual gifts costing 100 coins each)
    const GIFT_STORE = {
      // Page 1
      clover: { cost: 100, icon: '🍀', label: 'Clover' },
      clown: { cost: 100, icon: '🤡', label: 'Clown' },
      coffee: { cost: 100, icon: '☕', label: 'Coffee Cup' },
      cool: { cost: 100, icon: '😎', label: 'Cool Smiley' },
      crown: { cost: 100, icon: '👑', label: 'Crown' },
      potion_blue: { cost: 100, icon: '🧪', label: 'Blue Potion' },
      diamond: { cost: 100, icon: '💎', label: 'Diamond' },
      fish_skeleton: { cost: 100, icon: '🦴', label: 'Fish Skeleton' },
      flowers: { cost: 100, icon: '💐', label: 'Flowers' },
      gift_pink: { cost: 100, icon: '🎁', label: 'Gift Box' },
      gold_pot: { cost: 100, icon: '🍯', label: 'Pot of Gold' },
      fire: { cost: 100, icon: '🔥', label: 'Fire' },

      // Page 2
      rose_heart: { cost: 100, icon: '💖', label: 'Rose Heart' },
      couple: { cost: 100, icon: '💑', label: 'Couple' },
      cute_kitten: { cost: 100, icon: '🐱', label: 'Cute Kitten' },
      stick_figures: { cost: 100, icon: '🧑‍🤝‍🧑', label: 'Stick Figures' },
      voodoo_doll: { cost: 100, icon: '🧸', label: 'Voodoo Doll' },
      potion_green: { cost: 100, icon: '🧪', label: 'Green Potion' },
      kissing_emoji: { cost: 100, icon: '😘', label: 'Kissing Emoji' },

      // Page 3
      ice_cream: { cost: 100, icon: '🍦', label: 'Ice Cream' },
      ice_hand: { cost: 100, icon: '🖐️', label: 'Ice Hand' },
      thumbs_up: { cost: 100, icon: '👍', label: 'Thumbs Up' },
      potion_heart: { cost: 100, icon: '🧪', label: 'Heart Potion' },
      bandaged_heart: { cost: 100, icon: '🩹', label: 'Bandaged Heart' },
      star_medal: { cost: 100, icon: '🏅', label: 'Star Medal' },
      stack_cash: { cost: 100, icon: '💵', label: 'Stack of Cash' },
      potion_lightning: { cost: 100, icon: '🧪', label: 'Lightning Potion' },
      diamond_ring: { cost: 100, icon: '💍', label: 'Diamond Ring' },
      red_rose: { cost: 100, icon: '🌹', label: 'Red Rose' },
      big_grin: { cost: 100, icon: '😀', label: 'Big Grin Smiley' },
      gift_green: { cost: 100, icon: '🎁', label: 'Green Gift Box' }
    };

    const giftKey = giftName.toLowerCase();
    const giftConfig = GIFT_STORE[giftKey];

    if (!giftConfig) {
      return res.status(400).json({ message: 'Invalid gift selected.' });
    }

    const sender = await User.findById(senderId);
    const recipient = await User.findById(recipientId);

    if (!sender || !recipient) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if ((sender.coins || 0) < giftConfig.cost) {
      return res.status(400).json({ message: `Insufficient coins! ${giftConfig.label} costs ${giftConfig.cost} coins.` });
    }

    // Deduct coins from sender
    sender.coins = (sender.coins || 0) - giftConfig.cost;
    await sender.save();

    // Add gift to recipient
    if (!recipient.gifts) {
      recipient.gifts = [];
    }

    const existingGift = recipient.gifts.find(g => g.name.toLowerCase() === giftKey);
    if (existingGift) {
      existingGift.count = (existingGift.count || 1) + 1;
    } else {
      recipient.gifts.push({
        name: giftConfig.label,
        icon: giftConfig.icon,
        count: 1
      });
    }

    await recipient.save();

    // Emit real-time events to both users if online
    const io = req.app.get('io');
    if (io) {
      // 1. Emit updated coins and info to sender
      if (global.onlineUsers && global.onlineUsers.has(senderId.toString())) {
        const senderSocketInfo = global.onlineUsers.get(senderId.toString());
        if (senderSocketInfo) {
          io.to(senderSocketInfo.socketId).emit('activity-reward', {
            level: sender.level,
            xp: sender.xp,
            coins: sender.coins,
            leveledUp: false
          });
        }
      }

      // 2. Emit gift notification and update to recipient if online
      if (global.onlineUsers && global.onlineUsers.has(recipientId.toString())) {
        const recipientSocketInfo = global.onlineUsers.get(recipientId.toString());
        if (recipientSocketInfo) {
          // Push a live notification
          const Notification = require('../models/Notification');
          const notification = new Notification({
            recipient: recipientId,
            sender: senderId,
            type: 'like', // Reuse the beautiful like layout
            message: `${sender.username} sent you a virtual ${giftConfig.label}! ${giftConfig.icon}`,
            link: '/chat'
          });
          await notification.save();
          
          const populatedNotif = await Notification.findById(notification._id)
            .populate('sender', 'username profilePic level badge role gender');
          io.to(recipientSocketInfo.socketId).emit('new-notification', populatedNotif);
          
          io.to(recipientSocketInfo.socketId).emit('activity-reward', {
            level: recipient.level,
            xp: recipient.xp,
            coins: recipient.coins,
            leveledUp: false
          });
        }
      }
    }

    res.status(200).json({
      message: `${giftConfig.label} sent successfully!`,
      coins: sender.coins,
      recipientGifts: recipient.gifts
    });
  } catch (error) {
    console.error('Error sending virtual gift:', error);
    res.status(500).json({ message: 'Error processing gift transmission.' });
  }
};

// Transfer coins to another user's wallet
exports.transferCoins = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { userId: recipientId } = req.params;
    const { amount } = req.body;

    if (senderId === recipientId) {
      return res.status(400).json({ message: 'You cannot transfer coins to yourself.' });
    }

    const coinAmount = Number(amount);
    if (!coinAmount || isNaN(coinAmount) || coinAmount < 20 || coinAmount > 100) {
      return res.status(400).json({ message: 'Transfer amount must be between 20 and 100 coins.' });
    }

    const sender = await User.findById(senderId);
    const recipient = await User.findById(recipientId);

    if (!sender || !recipient) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if ((sender.coins || 0) < coinAmount) {
      return res.status(400).json({ message: 'Insufficient coins in your wallet.' });
    }

    sender.coins = (sender.coins || 0) - coinAmount;
    recipient.coins = (recipient.coins || 0) + coinAmount;

    await sender.save();
    await recipient.save();

    // Emit real-time events to both users
    const io = req.app.get('io');
    if (io) {
      // Notify sender
      if (global.onlineUsers && global.onlineUsers.has(senderId.toString())) {
        const senderSocketInfo = global.onlineUsers.get(senderId.toString());
        if (senderSocketInfo) {
          io.to(senderSocketInfo.socketId).emit('activity-reward', {
            level: sender.level,
            xp: sender.xp,
            coins: sender.coins,
            leveledUp: false
          });
        }
      }
      // Notify recipient
      if (global.onlineUsers && global.onlineUsers.has(recipientId.toString())) {
        const recipientSocketInfo = global.onlineUsers.get(recipientId.toString());
        if (recipientSocketInfo) {
          io.to(recipientSocketInfo.socketId).emit('activity-reward', {
            level: recipient.level,
            xp: recipient.xp,
            coins: recipient.coins,
            leveledUp: false
          });
          
          const Notification = require('../models/Notification');
          const notification = new Notification({
            recipient: recipientId,
            sender: senderId,
            type: 'like',
            message: `${sender.username} sent you ${coinAmount} Coins! 💸`,
            link: '/chat'
          });
          await notification.save();
          const populatedNotif = await Notification.findById(notification._id)
            .populate('sender', 'username profilePic level badge role gender');
          io.to(recipientSocketInfo.socketId).emit('new-notification', populatedNotif);
        }
      }
    }

    res.status(200).json({
      message: `Transferred ${coinAmount} coins to ${recipient.username} successfully!`,
      coins: sender.coins
    });
  } catch (error) {
    console.error('Error transferring coins:', error);
    res.status(500).json({ message: 'Error processing coin transfer.' });
  }
};

exports.getLeaderboard = async (req, res) => {
  try {
    const { type } = req.query; // 'xp', 'level', 'coins', 'gifts', 'likes'
    let users = [];

    if (type === 'gifts') {
      users = await User.aggregate([
        {
          $project: {
            username: 1,
            profilePic: 1,
            level: 1,
            totalGifts: {
              $reduce: {
                input: { $ifNull: ["$gifts", []] },
                initialValue: 0,
                in: { $add: ["$$value", "$$this.count"] }
              }
            }
          }
        },
        { $sort: { totalGifts: -1, username: 1 } },
        { $limit: 20 }
      ]);
    } else {
      let sortField = 'xp';
      if (type === 'level') sortField = 'level';
      else if (type === 'coins') sortField = 'coins';
      else if (type === 'likes') sortField = 'likes';

      users = await User.find(
        {},
        { username: 1, profilePic: 1, level: 1, [sortField]: 1 }
      )
      .sort({ [sortField]: -1, username: 1 })
      .limit(20);
    }

    res.json(users);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ message: 'Server error fetching leaderboard' });
  }
};
exports.changeEmail = async (req, res) => {
  try {
    const { newEmail, password } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Incorrect password' });
    
    const existingUser = await User.findOne({ email: newEmail });
    if (existingUser && existingUser._id.toString() !== user._id.toString()) {
      return res.status(400).json({ message: 'Email is already in use' });
    }
    
    user.email = newEmail;
    await user.save();
    res.json({ message: 'Email updated successfully', email: user.email });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Incorrect current password' });
    
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getIgnoredUsersList = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).populate('ignoredUsers', 'username profilePic level role gender isOnline lastSeen');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user.ignoredUsers || []);
  } catch (error) {
    console.error('Error fetching ignored users list:', error);
    res.status(500).json({ message: 'Error fetching ignored users list' });
  }
};

const { uploadToCloudinary } = require('../utils/uploadToCloudinary');

exports.uploadProfilePic = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const secureUrl = await uploadToCloudinary(req.file.buffer, 'profiles');

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.profilePic = secureUrl;
    await user.save();

    res.status(200).json({
      message: 'Profile picture updated successfully',
      profilePic: secureUrl,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        age: user.age,
        gender: user.gender,
        country: user.country,
        profilePic: user.profilePic,
        level: user.level,
        badge: user.badge,
        role: user.role,
        motto: user.motto,
        relationshipStatus: user.relationshipStatus,
        bio: user.bio,
        profileColor: user.profileColor,
        coverPhoto: user.coverPhoto,
        facebook: user.facebook,
        instagram: user.instagram,
        likes: user.likes,
        likedBy: user.likedBy
      }
    });
  } catch (error) {
    console.error('Error uploading profile pic:', error);
    res.status(500).json({ message: 'Error updating profile picture' });
  }
};

exports.uploadCoverPhoto = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const secureUrl = await uploadToCloudinary(req.file.buffer, 'covers');

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.coverPhoto = secureUrl;
    await user.save();

    res.status(200).json({
      message: 'Cover photo updated successfully',
      coverPhoto: secureUrl,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        age: user.age,
        gender: user.gender,
        country: user.country,
        profilePic: user.profilePic,
        level: user.level,
        badge: user.badge,
        role: user.role,
        motto: user.motto,
        relationshipStatus: user.relationshipStatus,
        bio: user.bio,
        profileColor: user.profileColor,
        coverPhoto: user.coverPhoto,
        facebook: user.facebook,
        instagram: user.instagram,
        likes: user.likes,
        likedBy: user.likedBy
      }
    });
  } catch (error) {
    console.error('Error uploading cover photo:', error);
    res.status(500).json({ message: 'Error updating cover photo' });
  }
};


