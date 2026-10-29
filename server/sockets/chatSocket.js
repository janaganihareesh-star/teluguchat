const onlineUsers = new Map(); // userId -> socketId
global.onlineUsers = onlineUsers;
const User = require('../models/User');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const { calculateLevel, getBadge } = require('../utils/xpSystem');
const { moderateMessage } = require('../utils/aiModerator');
const { getOrCreateSystemAdmin } = require('../utils/adminHelper');
const { getOrCreateTeluguAIBot } = require('../utils/teluguAIHelper');
const { generateTeluguAIReply } = require('../services/teluguAIService');
const cron = require('node-cron');

const privateSocket = require('./privateSocket');
const matchmakingSocket = require('./matchmakingSocket');

// Room sentiment & heated argument tracker
const roomSentimentLogs = new Map(); // roomId -> Array of { text, senderId, time }
const roomSlowModeTimers = new Map(); // roomId -> expiry timestamp

const AGGRESSIVE_KEYWORDS = [
  'dammunte', 'chustha', 'ra ra', 'shut up', 'musuko', 'waste fellow', 
  'nuvvu pedda', 'chepthe vinu', 'g musuko', 'kottukondi', 'fight', 
  'cheat', 'fraud', 'podduna nunchi', 'neeku siggu', 'bastard', 'lanja'
];

const addActivityReward = async (userId, activityType, io) => {
  try {
    const user = await User.findById(userId);
    if (!user || user.role === 'guest') return;

    let xpAmount = 0;

    let coinEarnedMsg = null;
    if (activityType === 'message') {
      xpAmount = 10;
      user.messageCount = (user.messageCount || 0) + 1;
      if (user.messageCount > 0 && user.messageCount % 10 === 0) {
        user.coins = (user.coins || 0) + 1;
        coinEarnedMsg = 'You earned 1 Coin for sending 10 messages! 💬🎉';
      }
    } else if (activityType === 'online') {
      xpAmount = 5;
      user.onlineMinutes = (user.onlineMinutes || 0) + 1;
      if (user.onlineMinutes > 0 && user.onlineMinutes % 30 === 0) {
        user.coins = (user.coins || 0) + 1;
        coinEarnedMsg = 'You earned 1 Coin for staying active for 30 minutes! ⏳🎉';
      }
    }

    user.xp = (user.xp || 0) + xpAmount;
    
    let leveledUp = false;
    const oldLevel = user.level || 1;
    const newLevel = calculateLevel(user.xp);

    if (newLevel > oldLevel) {
      user.level = newLevel;
      user.badge = getBadge(newLevel, user.gender);
      leveledUp = true;
      
      const levelsGained = newLevel - oldLevel;
      // Award 50 bonus coins per level up
      user.coins = (user.coins || 0) + (levelsGained * 50);

      if (onlineUsers.has(userId)) {
        const info = onlineUsers.get(userId);
        info.level = user.level;
        info.badge = user.badge;
        onlineUsers.set(userId, info);
      }
    }

    await user.save();

    const userSocketInfo = onlineUsers.get(userId);
    if (userSocketInfo) {
      io.to(userSocketInfo.socketId).emit('activity-reward', {
        level: user.level,
        xp: user.xp,
        coins: user.coins,
        leveledUp
      });
      
      if (coinEarnedMsg) {
        const adminUser = await User.findOne({ role: 'admin' }) || await User.findOne({ username: 'Admin' });
        if (adminUser) {
          const notif = new Notification({
            recipient: user._id,
            sender: adminUser._id,
            type: 'system',
            message: coinEarnedMsg,
            link: '/goals'
          });
          await notif.save();
          const populatedNotif = await Notification.findById(notif._id).populate('sender', 'username profilePic level badge role gender');
          io.to(userSocketInfo.socketId).emit('new-notification', populatedNotif);
          io.to(userSocketInfo.socketId).emit('coin-earned', { message: coinEarnedMsg });
        }
      }
    }

    if (leveledUp) {
      await updateUsersEvent(io);
    }
  } catch (err) {
    console.error('Error adding activity reward to user:', err);
  }
};

const getRestrictedSocketIds = async (userId, io) => {
  try {
    if (!userId) return [];
    const user = await User.findById(userId).select('restrictedUsers');
    const myRestricted = user?.restrictedUsers?.map(id => id.toString()) || [];
    
    const restrictedMeUsers = await User.find({ restrictedUsers: userId }).select('_id');
    const restrictedMe = restrictedMeUsers.map(u => u._id.toString());
    
    const restrictedSet = new Set([...myRestricted, ...restrictedMe]);
    
    const excludedSocketIds = [];
    const sockets = await io.fetchSockets();
    for (const s of sockets) {
      if (s.user && s.user.id && restrictedSet.has(s.user.id.toString())) {
        excludedSocketIds.push(s.id);
      }
    }
    return excludedSocketIds;
  } catch (err) {
    console.error('Error getting restricted socket IDs:', err);
    return [];
  }
};

const updateUsersEvent = async (io) => {
  try {
    const sockets = await io.fetchSockets();
    const onlineUserIds = Array.from(onlineUsers.keys());
    const usersWithRestrictions = await User.find({ _id: { $in: onlineUserIds } }).select('_id restrictedUsers');
    
    const restrictedGraph = new Map();
    onlineUserIds.forEach(id => restrictedGraph.set(id.toString(), new Set()));
    
    usersWithRestrictions.forEach(user => {
      const uId = user._id.toString();
      user.restrictedUsers?.forEach(rId => {
         const rIdStr = rId.toString();
         if (restrictedGraph.has(uId)) restrictedGraph.get(uId).add(rIdStr);
         if (restrictedGraph.has(rIdStr)) restrictedGraph.get(rIdStr).add(uId);
      });
    });

    for (const s of sockets) {
      if (s.user && s.user.id) {
        const currentUserId = s.user.id.toString();
        const restrictedSet = restrictedGraph.get(currentUserId) || new Set();

        const filteredList = Array.from(onlineUsers.entries())
          .filter(([uid]) => !restrictedSet.has(uid.toString()))
          .map(([uid, info]) => ({
            _id: uid,
            username: info.username,
            profilePic: info.profilePic,
            level: info.level,
            role: info.role,
            badge: info.badge,
            gender: info.gender,
            motto: info.motto
          }));

        s.emit('update-users', filteredList);
      }
    }
  } catch (err) {
    console.error('Error updating users list:', err);
  }
};


// Removed old postDailyNews logic (now handled by newsGenerator.js)
const setupAutoClear = (io) => {
  const Message = require('../models/Message');
  const User = require('../models/User');
  const Notification = require('../models/Notification');
  const aiModerator = require('../utils/aiModerator');

  // System Admin is fetched globally now

  // Set up 1-hour interval for auto-clearing at the top of every hour
  const cron = require('node-cron');
  cron.schedule('0 * * * *', async () => {
    try {
      console.log('[Auto-Clear] Initiating hourly chat cleanup...');
      const adminUser = await getOrCreateSystemAdmin();
      if (!adminUser) {
        console.error('[Auto-Clear] Could not retrieve admin user, skipping clearing.');
        return;
      }

      // 1. Delete all messages from general room
      const deleteResult = await Message.deleteMany({ room: 'general' });
      console.log(`[Auto-Clear] Deleted ${deleteResult.deletedCount} messages from general room.`);

      // 2. Create the "Admin cleared all the chats" message
      const sysMsg = new Message({
        room: 'general',
        message: 'Admin cleared all the chats',
        sender: adminUser._id
      });
      await sysMsg.save();

      // Populate sender details so the client renders it correctly
      const populatedSysMsg = await Message.findById(sysMsg._id).populate('sender', 'username profilePic level badge role');

      // 3. Emit the clear event to all clients in the general room
      io.to('general').emit('chats-cleared', populatedSysMsg);
      console.log('[Auto-Clear] Cleanup complete. Broadcasted admin message.');
    } catch (err) {
      console.error('[Auto-Clear] Error in auto-clear routine:', err);
    }
  });

  // Scheduled Messages Cron (Runs every minute)
  const PrivateMessage = require('../models/PrivateMessage');
  const GroupMessage = require('../models/GroupMessage');
  const Conversation = require('../models/Conversation');
  
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      
      // 1. Process Private Scheduled Messages
      const privateMsgs = await PrivateMessage.find({ scheduledFor: { $lte: now }, isScheduledSent: false })
        .populate('sender', 'username profilePic role level badge')
        .populate('receiver', 'username profilePic');
        
      for (const msg of privateMsgs) {
        msg.isScheduledSent = true;
        await msg.save();
        
        // Update conversation unread count
        let conversation = await Conversation.findOne({ participants: { $all: [msg.sender._id, msg.receiver._id] } });
        if (conversation) {
          conversation.lastMessage = msg.message || 'Scheduled Message';
          conversation.lastMessageAt = Date.now();
          const currentUnread = conversation.unreadCount.get(msg.receiver._id.toString()) || 0;
          conversation.unreadCount.set(msg.receiver._id.toString(), currentUnread + 1);
          await conversation.save();
        }
        
        // Find if receiver is online (assuming onlineUsers is passed or global, let's just emit to their socket if possible)
        // Wait, onlineUsers is not available in setupAutoClear unless we pass it.
        // I will emit using the receiver's ID as room, or just emit generally and let clients filter.
        // Actually, we can just use io.emit for private messages if they are listening, but private messages usually use socket ID.
        // For now, let's emit a global event that clients can listen to if it's for them.
        io.emit('private-message-scheduled', msg);
      }
      
      // 2. Process Group Scheduled Messages
      const groupMsgs = await GroupMessage.find({ scheduledFor: { $lte: now }, isScheduledSent: false })
        .populate('sender', 'username profilePic role level gender');
        
      for (const msg of groupMsgs) {
        msg.isScheduledSent = true;
        await msg.save();
        io.to(`group_${msg.group}`).emit('group-message', msg);
      }
      
    } catch (err) {
      console.error('[Scheduled-Messages] Error:', err);
    }
  });

  const rulesList = [
    "⚠️ System Rule: Abusive language, slurs, or harassment will result in an instant ban.",
    "⚠️ System Rule: Do not share personal information like phone numbers or exact locations here.",
    "⚠️ System Rule: Spamming repetitive messages or promotional links is strictly prohibited.",
    "⚠️ System Rule: Please maintain respect and keep the discussions friendly for everyone!"
  ];
  let currentRuleIndex = 0;

  // Set up 30-minute friendly reminder interval
  setInterval(async () => {
    try {
      const adminUser = await getOrCreateSystemAdmin();
      if (!adminUser) return;

      const ruleMsg = new Message({
        room: 'general',
        message: rulesList[currentRuleIndex],
        sender: adminUser._id
      });
      await ruleMsg.save();

      const populatedRuleMsg = await Message.findById(ruleMsg._id).populate('sender', 'username profilePic level badge role');
      io.to('general').emit('receive-message', populatedRuleMsg);

      currentRuleIndex = (currentRuleIndex + 1) % rulesList.length;
      console.log('[Reminder] Broadcasted 30-min rule reminder.');
    } catch (err) {
      console.error('[Reminder] Error in friendly reminder routine:', err);
    }
  }, 30 * 60 * 1000); // 30 minutes
};

module.exports = (io) => {
  // Initialize private socket messaging
  privateSocket(io, onlineUsers);
  matchmakingSocket(io, onlineUsers);

  // Initialize group socket messaging
  const groupSocket = require('./groupSocket');
  groupSocket(io, onlineUsers);

  // Start the 30-minute auto-clearing timer
  setupAutoClear(io);

  // Setup level-up XP and Coins periodic active checking (5 XP + 5 Coins per minute online)
  setInterval(async () => {
    try {
      for (const [userId, info] of onlineUsers.entries()) {
        if (info.role !== 'guest') {
          await addActivityReward(userId, 'online', io);
        }
      }
    } catch (err) {
      console.error('Error in periodic active reward tick:', err);
    }
  }, 60 * 1000);

  io.on('connection', (socket) => {
    console.log(`User connected to chat: ${socket.id}`);

    socket.on('user-online', async (userId) => {
      try {
        const userObj = await User.findById(userId, 'username profilePic level badge role gender motto restrictedUsers moderation');
        if (userObj) {
          const now = Date.now();
          if (userObj.moderation?.suspendedUntil && userObj.moderation.suspendedUntil > now) {
            socket.emit('moderation-event', {
              type: 'suspend',
              message: `🚫 Your account has been temporarily suspended due to severe community guideline violations.`,
              until: userObj.moderation.suspendedUntil
            });
            socket.disconnect(true);
            return;
          }

          onlineUsers.set(userId, {
            socketId: socket.id,
            username: userObj.username,
            profilePic: userObj.profilePic,
            level: userObj.level,
            role: userObj.role,
            badge: userObj.badge,
            gender: userObj.gender,
            motto: userObj.motto
          });

          await updateUsersEvent(io);

          // Broadcast join-notification selectively (hide if restricted)
          const excludedSocketIds = await getRestrictedSocketIds(userId, io);
          if (excludedSocketIds.length > 0) {
            socket.broadcast.except(excludedSocketIds).emit('join-notification', { username: userObj.username });
          } else {
            socket.broadcast.emit('join-notification', { username: userObj.username });
          }
        }
      } catch(e) {}
      try { await User.findByIdAndUpdate(userId, { isOnline: true }); } catch(e) {}
    });

    socket.on('user-offline', async (userId) => {
      const userInfo = onlineUsers.get(userId);
      onlineUsers.delete(userId);
      await updateUsersEvent(io);
      
      if (userInfo) {
        // Broadcast leave-notification selectively (hide if restricted)
        const excludedSocketIds = await getRestrictedSocketIds(userId, io);
        if (excludedSocketIds.length > 0) {
          socket.broadcast.except(excludedSocketIds).emit('leave-notification', { username: userInfo.username });
        } else {
          socket.broadcast.emit('leave-notification', { username: userInfo.username });
        }
      }
    });

    socket.on('join-room', async (roomId) => {
      try {
        const user = await User.findById(socket.user.id);
        const now = Date.now();
        if (user) {
          if (user.moderation?.suspendedUntil && user.moderation.suspendedUntil > now) {
            socket.emit('moderation-event', {
              type: 'suspend',
              message: `🚫 Your account has been temporarily suspended due to severe community guideline violations.`,
              until: user.moderation.suspendedUntil
            });
            socket.disconnect(true);
            return;
          }
          if (user.moderation?.kickUntil && user.moderation.kickUntil > now) {
            socket.emit('moderation-event', {
              type: 'kick',
              message: `🚫 You have been removed from this room due to repeated violations.`,
              until: user.moderation.kickUntil
            });
            return;
          }
        }
      } catch (e) {
        console.error('join-room moderation check failed:', e);
      }
      socket.join(roomId);
      console.log(`USER JOINED ROOM: ${socket.id} ${roomId}`);
      const clients = await io.in(roomId).fetchSockets();
      console.log(`CLIENTS IN ROOM: ${clients.length}`);
      
      try {
        const joinedUser = await User.findById(socket.user.id);
        if (joinedUser) {
          const now = new Date();
          // Only broadcast once ever per user
          if (!joinedUser.lastJoinBroadcast) {
            joinedUser.lastJoinBroadcast = now;
            await joinedUser.save();
            socket.to(roomId).emit('system-message', {
              message: `<b>${joinedUser.username}</b> has joined the room`,
              icon: '🩷'
            });
          }
        }
      } catch (e) {
        console.error('Error broadcasting join message:', e);
      }
    });

    socket.on('leave-room', (roomId) => {
      socket.leave(roomId);
      console.log(`Socket ${socket.id} left room ${roomId}`);
    });

    socket.on('react-message', async (data) => {
      try {
        const { messageId, emoji, roomId } = data;
        const userId = socket.user.id;

        const Message = require('../models/Message');
        const message = await Message.findById(messageId);
        if (!message) return;

        const existingIndex = message.reactions.findIndex(
          r => r.userId.toString() === userId && r.emoji === emoji
        );

        if (existingIndex > -1) {
          message.reactions.splice(existingIndex, 1);
        } else {
          message.reactions.push({ userId, emoji });
        }

        await message.save();
        io.to(roomId).emit('reaction-updated', {
          messageId,
          reactions: message.reactions
        });
      } catch (err) {
        console.error('Error in react-message:', err);
      }
    });

    socket.on('disconnect', async () => {
      let disconnectedUserId = null;
      for (let [userId, info] of onlineUsers.entries()) {
        if (info.socketId === socket.id) {
          disconnectedUserId = userId;
          break;
        }
      }
      
      if (disconnectedUserId) {
        const userInfo = onlineUsers.get(disconnectedUserId);
        onlineUsers.delete(disconnectedUserId);
        
        await updateUsersEvent(io);
        
        if (userInfo) {
          // Broadcast leave-notification selectively
          const excludedSocketIds = await getRestrictedSocketIds(disconnectedUserId, io);
          if (excludedSocketIds.length > 0) {
            socket.broadcast.except(excludedSocketIds).emit('leave-notification', { username: userInfo.username });
          } else {
            socket.broadcast.emit('leave-notification', { username: userInfo.username });
          }
        }
        try { await User.findByIdAndUpdate(disconnectedUserId, { isOnline: false, lastSeen: new Date() }); } catch(e) {}
      }
      console.log(`User disconnected from chat: ${socket.id}`);
    });

    socket.on('send-message', async (data) => {
      const senderId = socket.user.id; 
      const { roomId, message } = data;
      const mentions = data.mentions || [];
      const mediaUrl = data.mediaUrl || data.voiceUrl || data.gifUrl || '';
      const isVoice = !!data.voiceUrl;

      try {
        // Run AI Moderation Engine
        const moderation = await moderateMessage(senderId, { message, mediaUrl, isVoice });

        if (moderation.action !== 'allow' && moderation.action !== 'ignore') {
          // Send notification event to user
          socket.emit('moderation-event', {
            type: moderation.action,
            message: moderation.message,
            until: moderation.until
          });

          // Enforce room-kick or suspension if applicable
          if (moderation.action === 'kick') {
            socket.leave(roomId);
            try {
              const u = await User.findById(senderId);
              if (u) io.to(roomId).emit('system-message', { message: `<b>${u.username}</b> was removed from the room by the system.`, icon: '🚨' });
            } catch(e) {}
          } else if (moderation.action === 'suspend') {
            try {
              const u = await User.findById(senderId);
              if (u) io.to(roomId).emit('system-message', { message: `<b>${u.username}</b> was permanently blocked.`, icon: '⛔' });
            } catch(e) {}
            socket.disconnect(true);
          }
          return;
        }

        // If shadow-banned (Ignore mode)
        const isIgnored = moderation.action === 'ignore';
        if (isIgnored) {
          socket.emit('moderation-event', {
            type: 'ignore',
            message: moderation.message
          });
        }

        const finalMessageText = moderation.maskedMessage || message;
        
        const newMessage = new Message({
          room: roomId,
          message: finalMessageText,
          mediaUrl: data.mediaUrl || '',
          voiceUrl: data.voiceUrl || '',
          gifUrl: data.gifUrl || '',
          mentions,
          sender: senderId,
          replyTo: data.replyTo || null,
          location: data.location || null,
          contact: data.contact || null,
          poll: data.poll || null,
          scheduledFor: data.scheduledFor || null,
          isViewOnce: data.isViewOnce || false
        });
        await newMessage.save();

        await addActivityReward(senderId, 'message', io); 
        
        const populatedMessage = await Message.findById(newMessage._id).populate('sender', 'username profilePic level badge role');
        
        // --- Process Mentions and Replies for Notifications ---
        try {
          const senderInfo = await User.findById(senderId);
          if (senderInfo) {
            // Process Replies
            if (data.replyTo) {
              const repliedMessage = await Message.findById(data.replyTo);
              if (repliedMessage && repliedMessage.sender.toString() !== senderId) {
                const notif = new Notification({
                  recipient: repliedMessage.sender,
                  sender: senderId,
                  type: 'reply',
                  message: `${senderInfo.username} replied to your message.`,
                  link: '/chat'
                });
                await notif.save();
                const populatedNotif = await Notification.findById(notif._id).populate('sender', 'username profilePic level badge role gender');
                const targetSocket = global.onlineUsers?.get(repliedMessage.sender.toString());
                if (targetSocket) {
                  io.to(targetSocket.socketId).emit('new-notification', populatedNotif);
                }
              }
            }

            // Process Mentions
            if (mentions && mentions.length > 0) {
              for (const username of mentions) {
                // Find user by username
                const mentionedUser = await User.findOne({ username: username.replace('@', '') });
                if (mentionedUser && mentionedUser._id.toString() !== senderId && (!data.replyTo || (data.replyTo && mentionedUser._id.toString() !== senderId))) { // Avoid duplicate if already replied
                  const notif = new Notification({
                    recipient: mentionedUser._id,
                    sender: senderId,
                    type: 'mention',
                    message: `${senderInfo.username} mentioned you in the chat.`,
                    link: '/chat'
                  });
                  await notif.save();
                  const populatedNotif = await Notification.findById(notif._id).populate('sender', 'username profilePic level badge role gender');
                  const targetSocket = global.onlineUsers?.get(mentionedUser._id.toString());
                  if (targetSocket) {
                    io.to(targetSocket.socketId).emit('new-notification', populatedNotif);
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error("Error creating notifications:", error);
        }

        // Filter who gets the message based on restriction
        const excludedSocketIds = await getRestrictedSocketIds(senderId, io);
        if (isIgnored) {
          socket.emit('receive-message', populatedMessage);
        } else if (mentions && mentions.length > 0) {
          console.log("Broadcasting private mention to specific users");
          
          socket.emit('receive-message', populatedMessage); // Emit to sender
          
          for (const [id, userSocket] of global.onlineUsers.entries()) {
            if (id === senderId) continue;
            
            const isAdmin = userSocket.role === 'admin';
            const isMentioned = mentions.some(m => m.replace('@', '') === userSocket.username);
            
            if (isAdmin || isMentioned) {
              if (!excludedSocketIds.includes(userSocket.socketId)) {
                io.to(userSocket.socketId).emit('receive-message', populatedMessage);
              }
            }
          }
        } else {
          console.log("Message received from client");
          console.log("Broadcasting message to room", roomId);
          console.log("senderId", senderId);

          if (excludedSocketIds.length > 0) {
            io.to(roomId).except(excludedSocketIds).emit('receive-message', populatedMessage);
          } else {
            io.to(roomId).emit('receive-message', populatedMessage);
          }
        }
        
        // Challenge Check Logic
        if (roomId === 'general' && global.activeChallenge && !isIgnored) {
          if (message.toLowerCase().trim() === global.activeChallenge.answer) {
            const wonCoins = global.activeChallenge.coins;
            const u = await User.findById(senderId);
            if (u) {
              u.coins = (u.coins || 0) + wonCoins;
              await u.save();
              
              // Clear the active challenge
              global.activeChallenge = null;
              
              const adminUser = await getOrCreateSystemAdmin();
              
              const sysMsg = new Message({
                room: 'general',
                message: `🎉 **WINNER!** @${u.username} answered correctly and won ${wonCoins} coins!`,
                sender: adminUser._id
              });
              await sysMsg.save();
              const populatedSysMsg = await Message.findById(sysMsg._id).populate('sender', 'username profilePic level badge role');
              io.to('general').emit('receive-message', populatedSysMsg);
            }
          }
        }

        // --- Blood Donation Matching Logic ---
        if (message) {
          const msgLower = message.toLowerCase();
          const isBloodRequest = msgLower.includes('blood') && 
            (msgLower.includes('urgent') || msgLower.includes('need') || 
             msgLower.includes('kavali') || msgLower.includes('avasaram') || 
             msgLower.includes('please') || msgLower.includes('help'));
             
          if (isBloodRequest) {
            const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
            let requestedGroup = null;
            for (const bg of bloodGroups) {
              if (msgLower.includes(bg.toLowerCase()) || 
                  msgLower.includes(bg.charAt(0).toLowerCase() + ' +') || 
                  msgLower.includes(bg.charAt(0).toLowerCase() + ' positive') ||
                  msgLower.includes(bg.charAt(0).toLowerCase() + ' -') ||
                  msgLower.includes(bg.charAt(0).toLowerCase() + ' negative')) {
                requestedGroup = bg;
                break;
              }
            }

            if (requestedGroup) {
              setTimeout(async () => {
                try {
                  const adminUser = await getOrCreateSystemAdmin();
                  if (adminUser) {
                    const matchedUsers = await User.find({ bloodGroup: requestedGroup, isOnline: true }).select('username _id');
                    const filteredUsers = matchedUsers.filter(u => u._id.toString() !== senderId.toString());
                    
                    let aiResponse = '';
                    if (filteredUsers.length > 0) {
                      const names = filteredUsers.map(u => `@${u.username}`).join(', ');
                      aiResponse = `🩸 **Blood Request Matched!**\nThe following online users have **${requestedGroup}** blood group:\n${names}\n\nPlease message them directly if it is urgent!`;
                    } else {
                      aiResponse = `🩸 **Blood Request Alert:**\nCurrently, there are no online users with **${requestedGroup}** blood group. We request everyone to check and help if possible.`;
                    }

                    const aiMessage = new Message({
                      room: roomId,
                      message: aiResponse,
                      sender: adminUser._id,
                    });
                    await aiMessage.save();
                    
                    const populatedAiMsg = await Message.findById(aiMessage._id).populate('sender', 'username profilePic level badge role');
                    io.to(roomId).emit('receive-message', populatedAiMsg);
                  }
                } catch (err) {
                  console.error('Error generating blood match reply:', err);
                }
              }, 1000); // Small delay to appear after the user's message
            }
          }
        }

        // --- AI Auto-Reply Logic for @Admin ---
        if (message && message.toLowerCase().includes('@admin') && roomId === 'general') {
          setTimeout(async () => {
            try {
              const adminUser = await getOrCreateSystemAdmin();
              if (adminUser) {
                const userAsk = message.toLowerCase();
                let aiResponse = "Hello! 👋 How can the Admin team help you? Please remember to follow our community rules.";
                
                if (userAsk.includes('rule') || userAsk.includes('guideline')) {
                  aiResponse = "Our rules are simple: Be respectful, no spam, no adult content, and no abusive language. Keep the chat clean and friendly! ✅";
                } else if (userAsk.includes('coin') || userAsk.includes('level') || userAsk.includes('xp')) {
                  aiResponse = "You earn 10 XP per message and 5 XP per minute for being online. Every 10 messages you get 1 Coin. Keep chatting to level up! 🪙";
                } else if (userAsk.includes('report') || userAsk.includes('kick') || userAsk.includes('ban')) {
                  aiResponse = "Our AI moderation system strictly controls spam and abuse. If someone bothers you, click their message and hit 'Report'. We review it quickly! 🚨";
                } else if (userAsk.includes('admin') && (userAsk.includes('who') || userAsk.includes('what'))) {
                  aiResponse = "We are the official TeluguChat Admin Team. We use an automated AI Moderation system to keep the community safe for everyone! 🤖";
                }

                const aiMessage = new Message({
                  room: roomId,
                  message: aiResponse,
                  sender: adminUser._id,
                });
                await aiMessage.save();
                
                const populatedAiMsg = await Message.findById(aiMessage._id).populate('sender', 'username profilePic level badge role');
                io.to(roomId).emit('receive-message', populatedAiMsg);
              }
            } catch (err) {
              console.error('Error generating AI reply:', err);
            }
          }, 1500); // 1.5s delay for realistic "typing" feel
        }

        // --- TeluguAI Bot Integration (@TeluguAI or /ai) ---
        const isBotMentioned = (message && (
          message.toLowerCase().includes('@teluguai') ||
          message.toLowerCase().startsWith('/ai') ||
          (mentions && mentions.some(m => m.toLowerCase().replace('@', '') === 'teluguai'))
        ));

        if (isBotMentioned && !isIgnored) {
          (async () => {
            try {
              const botUser = await getOrCreateTeluguAIBot();
              if (!botUser) return;

              // Emit typing indicator for bot
              io.to(roomId).emit('typing', { username: botUser.username, isTyping: true });

              const senderUser = await User.findById(senderId).select('username');
              const botReplyText = await generateTeluguAIReply(message, senderUser?.username || 'Mitra', senderId);

              setTimeout(async () => {
                try {
                  const botMessage = new Message({
                    room: roomId,
                    message: botReplyText,
                    sender: botUser._id,
                    replyTo: newMessage._id
                  });
                  await botMessage.save();

                  const populatedBotMsg = await Message.findById(botMessage._id)
                    .populate('sender', 'username profilePic level badge role');

                  io.to(roomId).emit('typing', { username: botUser.username, isTyping: false });
                  io.to(roomId).emit('receive-message', populatedBotMsg);
                } catch (bErr) {
                  console.error('Error sending TeluguAI bot message:', bErr);
                  io.to(roomId).emit('typing', { username: 'TeluguAI', isTyping: false });
                }
              }, 800);
            } catch (botErr) {
              console.error('Error processing TeluguAI mention:', botErr);
            }
          })();
        }

        // --- Room Sentiment & Heated Conflict Predictor ---
        if (roomId && !isIgnored && message) {
          const roomLogs = roomSentimentLogs.get(roomId) || [];
          roomLogs.push({ text: message, senderId, time: Date.now() });
          if (roomLogs.length > 12) roomLogs.shift();
          roomSentimentLogs.set(roomId, roomLogs);

          let aggressionScore = 0;
          const msgLower = message.toLowerCase();
          
          if (AGGRESSIVE_KEYWORDS.some(k => msgLower.includes(k))) aggressionScore += 2;
          if (/[!?]{2,}/.test(message)) aggressionScore += 1;
          if (/[A-Z]{5,}/.test(message)) aggressionScore += 1;

          const hasRecentConflict = roomLogs.slice(-6).filter(l => AGGRESSIVE_KEYWORDS.some(k => l.text.toLowerCase().includes(k))).length >= 2;

          if ((aggressionScore >= 3 || hasRecentConflict) && (!roomSlowModeTimers.get(roomId) || Date.now() > roomSlowModeTimers.get(roomId))) {
            roomSlowModeTimers.set(roomId, Date.now() + 60 * 1000); // 1-min cooldown before next trigger
            
            setTimeout(async () => {
              try {
                const botUser = await getOrCreateTeluguAIBot();
                if (botUser) {
                  const deEscalationMessage = new Message({
                    room: roomId,
                    message: `🕊️ **Cool babailu!** 🔥 Koncham temperature tagginchandi!\nMana TeluguChat lo racha lepadam ante navvadam, kottukovadam kaadu. Brahmanandam garu cheppinattu: *'Peace peace... Mind fresh ga unchukondi!'* 😉✌️`,
                    sender: botUser._id
                  });
                  await deEscalationMessage.save();
                  const populatedBotMsg = await Message.findById(deEscalationMessage._id)
                    .populate('sender', 'username profilePic level badge role');
                  io.to(roomId).emit('receive-message', populatedBotMsg);
                }
              } catch (e) {
                console.error('Error sending de-escalation message:', e);
              }
            }, 1200);
          }
        }
      } catch (error) {
        console.error('Error saving message:', error.message || error);
        console.error('RoomId:', roomId);
        console.error('Socket ID:', socket.id);
        console.error('Payload:', data);
      }
    });

    socket.on('delete-message', async (data) => {
      try {
        const { messageId, roomId } = data;
        const senderId = socket.user.id;
        
        const Message = require('../models/Message');
        const message = await Message.findById(messageId);
        
        if (message && message.sender.toString() === senderId.toString()) {
          message.isDeleted = true;
          message.deletedBy = 'user';
          message.message = 'This message was deleted 🚫';
          message.mediaUrl = '';
          message.voiceUrl = '';
          message.gifUrl = '';
          await message.save();
          
          io.to(roomId).emit('message-deleted', { messageId });
        }
      } catch (err) {
        console.error('Error deleting message:', err);
      }
    });

    socket.on('typing', async (data) => {
      const senderId = socket.user.id;
      const excludedSocketIds = await getRestrictedSocketIds(senderId, io);
      if (excludedSocketIds.length > 0) {
        socket.broadcast.except(excludedSocketIds).emit('user-typing', data.username);
      } else {
        socket.broadcast.emit('user-typing', data.username);
      }
    });

    socket.on('stop-typing', async (roomId) => {
      const senderId = socket.user.id;
      const excludedSocketIds = await getRestrictedSocketIds(senderId, io);
      if (excludedSocketIds.length > 0) {
        socket.broadcast.except(excludedSocketIds).emit('user-stop-typing');
      } else {
        socket.broadcast.emit('user-stop-typing');
      }
    });
  });
};

// Export updateUsersEvent so controller can trigger it
module.exports.updateUsersEvent = updateUsersEvent;
