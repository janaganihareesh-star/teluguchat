const onlineUsers = new Map(); // userId -> socketId
global.onlineUsers = onlineUsers;
const User = require('../models/User');
const Message = require('../models/Message');
const { calculateLevel, getBadge } = require('../utils/xpSystem');
const { moderateMessage } = require('../utils/aiModerator');

const privateSocket = require('./privateSocket');

const addActivityReward = async (userId, activityType, io) => {
  try {
    const user = await User.findById(userId);
    if (!user || user.role === 'guest') return;

    let xpAmount = 0;

    if (activityType === 'message') {
      xpAmount = 10;
      user.messageCount = (user.messageCount || 0) + 1;
      if (user.messageCount > 0 && user.messageCount % 10 === 0) {
        user.coins = (user.coins || 0) + 1;
      }
    } else if (activityType === 'online') {
      xpAmount = 5;
      user.onlineMinutes = (user.onlineMinutes || 0) + 1;
      if (user.onlineMinutes > 0 && user.onlineMinutes % 30 === 0) {
        user.coins = (user.coins || 0) + 1;
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
    }

    if (leveledUp) {
      await updateUsersEvent(io);
    }
  } catch (err) {
    console.error('Error adding activity reward to user:', err);
  }
};

const checkRestriction = async (userAId, userBId) => {
  try {
    if (!userAId || !userBId) return false;
    const userA = await User.findById(userAId).select('restrictedUsers');
    const userB = await User.findById(userBId).select('restrictedUsers');
    
    const aRestrictsB = userA?.restrictedUsers?.some(id => id.toString() === userBId.toString());
    const bRestrictsA = userB?.restrictedUsers?.some(id => id.toString() === userAId.toString());
    
    return aRestrictsB || bRestrictsA;
  } catch (err) {
    return false;
  }
};

const updateUsersEvent = async (io) => {
  try {
    const sockets = await io.fetchSockets();
    for (const s of sockets) {
      if (s.user && s.user.id) {
        const currentUserId = s.user.id;
        
        // Find who this user restricted
        const currentUserObj = await User.findById(currentUserId).select('restrictedUsers');
        const myRestricted = (currentUserObj?.restrictedUsers || []).map(id => id.toString());
        
        // Find who restricted this user
        const usersWhoRestrictedMe = await User.find({ restrictedUsers: currentUserId }).select('_id');
        const restrictedMeIds = usersWhoRestrictedMe.map(u => u._id.toString());
        
        const restrictedSet = new Set([...myRestricted, ...restrictedMeIds]);

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

const getOrCreateSystemAdmin = async () => {
  const User = require('../models/User');
  try {
    let admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      admin = await User.findOne({ username: 'Admin' });
    }
    if (!admin) {
      admin = new User({
        username: 'Admin',
        email: 'admin@system.local',
        password: 'system-password-placeholder-not-accessible',
        age: 18,
        role: 'admin',
        level: 100,
        gender: 'male',
        isOnline: true
      });
      await admin.save();
    }
    return admin;
  } catch (err) {
    console.error('Error finding or creating system admin:', err);
    return null;
  }
};

const setupAutoClear = (io) => {
  const Message = require('../models/Message');
  const User = require('../models/User');

  // System Admin is fetched globally now

  // Set up 1-hour interval for auto-clearing
  setInterval(async () => {
    try {
      console.log('[Auto-Clear] Initiating 1-hour chat cleanup...');
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
  }, 60 * 60 * 1000); // 1 hour

  // Set up 30-minute friendly reminder interval
  setInterval(() => {
    try {
      io.to('general').emit('system-message', {
        message: "Don't do spam, be friendly! 😊",
        icon: '✨'
      });
      console.log('[Reminder] Broadcasted 30-min friendly reminder.');
    } catch (err) {
      console.error('[Reminder] Error in friendly reminder routine:', err);
    }
  }, 30 * 60 * 1000); // 30 minutes
};

module.exports = (io) => {
  // Initialize private socket messaging
  privateSocket(io, onlineUsers);

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
          const sockets = await io.fetchSockets();
          for (const s of sockets) {
            if (s.id !== socket.id && s.user && s.user.id) {
              const otherUserId = s.user.id;
              const restricted = await checkRestriction(userId, otherUserId);
              if (!restricted) {
                s.emit('join-notification', { username: userObj.username });
              }
            }
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
        const sockets = await io.fetchSockets();
        for (const s of sockets) {
          if (s.user && s.user.id) {
            const otherUserId = s.user.id;
            const restricted = await checkRestriction(userId, otherUserId);
            if (!restricted) {
              s.emit('leave-notification', { username: userInfo.username });
            }
          }
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
      } catch (e) {}
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room ${roomId}`);
      try {
        const joinedUser = await User.findById(socket.user.id);
        if (joinedUser) {
          socket.to(roomId).emit('system-message', {
            message: `<b>${joinedUser.username}</b> has joined the room`,
            icon: '🩷'
          });
        }
      } catch (e) {}
    });

    socket.on('leave-room', (roomId) => {
      socket.leave(roomId);
      console.log(`Socket ${socket.id} left room ${roomId}`);
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
          const sockets = await io.fetchSockets();
          for (const s of sockets) {
            if (s.user && s.user.id) {
              const otherUserId = s.user.id;
              const restricted = await checkRestriction(disconnectedUserId, otherUserId);
              if (!restricted) {
                s.emit('leave-notification', { username: userInfo.username });
              }
            }
          }
        }
        try { await User.findByIdAndUpdate(disconnectedUserId, { isOnline: false, lastSeen: new Date() }); } catch(e) {}
      }
      console.log(`User disconnected from chat: ${socket.id}`);
    });

    socket.on('send-message', async (data) => {
      const senderId = socket.user.id; 
      const { roomId, message, mentions } = data;
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

        const newMessage = new Message({
          room: roomId,
          message,
          mediaUrl: data.mediaUrl || '',
          voiceUrl: data.voiceUrl || '',
          gifUrl: data.gifUrl || '',
          mentions,
          sender: senderId,
        });
        await newMessage.save();

        await addActivityReward(senderId, 'message', io); 
        
        const populatedMessage = await Message.findById(newMessage._id).populate('sender', 'username profilePic level badge role');
        
        // Filter who gets the message based on restriction
        const roomSocketIds = io.sockets.adapter.rooms.get(roomId);
        if (roomSocketIds) {
          for (const socketId of roomSocketIds) {
            const s = io.sockets.sockets.get(socketId);
            const recipientUserId = s?.user?.id;
            
            if (recipientUserId) {
              // Self-message should never be restricted
              let restricted = false;
              if (senderId.toString() !== recipientUserId.toString()) {
                restricted = await checkRestriction(senderId.toString(), recipientUserId.toString());
              }
              if (!restricted) {
                if (isIgnored && recipientUserId.toString() !== senderId.toString()) {
                  continue;
                }
                s.emit('receive-message', populatedMessage);
              }
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
      } catch (error) {
        console.error('Error saving message:', error);
      }
    });

    socket.on('typing', async (data) => {
      const senderId = socket.user.id;
      const sockets = await io.fetchSockets();
      for (const s of sockets) {
        if (s.id !== socket.id && s.user && s.user.id) {
          const recipientUserId = s.user.id;
          const restricted = await checkRestriction(senderId, recipientUserId);
          if (!restricted) {
            s.emit('user-typing', data.username);
          }
        }
      }
    });

    socket.on('stop-typing', async (roomId) => {
      const senderId = socket.user.id;
      const sockets = await io.fetchSockets();
      for (const s of sockets) {
        if (s.id !== socket.id && s.user && s.user.id) {
          const recipientUserId = s.user.id;
          const restricted = await checkRestriction(senderId, recipientUserId);
          if (!restricted) {
            s.emit('user-stop-typing');
          }
        }
      }
    });
  });
};

// Export updateUsersEvent so controller can trigger it
module.exports.updateUsersEvent = updateUsersEvent;
