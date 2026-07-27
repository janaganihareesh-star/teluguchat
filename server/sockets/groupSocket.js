const Group = require('../models/Group');
const GroupMessage = require('../models/GroupMessage');
const User = require('../models/User');
const { getOrCreateSystemAdmin } = require('../utils/adminHelper');

module.exports = (io, onlineUsers) => {
  io.on('connection', (socket) => {
    socket.on('join-group', async (groupId) => {
      try {
        const group = await Group.findById(groupId);
        if (group && group.members.includes(socket.user.id)) {
          socket.join(`group_${groupId}`);
          console.log(`User ${socket.user.id} joined group ${groupId}`);
        }
      } catch (err) {
        console.error('Error joining group:', err);
      }
    });

    socket.on('leave-group', (groupId) => {
      socket.leave(`group_${groupId}`);
    });

    socket.on('update-group-theme', async (data) => {
      const { groupId, theme } = data;
      try {
        const group = await Group.findById(groupId);
        if (group && group.admin.toString() === socket.user.id) {
          group.theme = theme;
          await group.save();
          io.to(`group_${groupId}`).emit('group-theme-updated', { groupId, theme });
        }
      } catch (err) {
        console.error('Error updating group theme via socket:', err);
      }
    });

    socket.on('group-message', async (data) => {
      const { groupId, message, mediaUrl, gifUrl, voiceUrl, location, contact, poll, scheduledFor, isViewOnce } = data;
      const senderId = socket.user.id;
      
      try {
        const group = await Group.findById(groupId);
        if (!group || !group.members.includes(senderId)) return;
        
        const newMsg = new GroupMessage({
          group: groupId,
          sender: senderId,
          message,
          mediaUrl,
          gifUrl,
          voiceUrl,
          location,
          contact,
          poll,
          scheduledFor,
          isViewOnce
        });
        await newMsg.save();
        const populatedMsg = await GroupMessage.findById(newMsg._id).populate('sender', 'username profilePic role level gender');
        
        io.to(`group_${groupId}`).emit('group-message', populatedMsg);

        // --- Pet Logic ---
        if (group.pet) {
          if (message && message.trim().toLowerCase() === '/feed') {
            group.pet.happiness = Math.min(100, group.pet.happiness + 20);
            group.pet.lastFed = Date.now();
            io.to(`group_${groupId}`).emit('system-message', {
              message: `🦴 <b>${populatedMsg.sender.username}</b> fed ${group.pet.name}! Happiness is now ${group.pet.happiness}/100.`,
              icon: '🐶'
            });
          } else {
            // General chatting keeps pet happy (up to 100)
            group.pet.happiness = Math.min(100, group.pet.happiness + 1);
          }
          await group.save();
          // Broadcast pet update
          io.to(`group_${groupId}`).emit('group-pet-update', group.pet);
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

                    const aiMessage = new GroupMessage({
                      group: groupId,
                      message: aiResponse,
                      sender: adminUser._id,
                    });
                    await aiMessage.save();
                    
                    const populatedAiMsg = await GroupMessage.findById(aiMessage._id).populate('sender', 'username profilePic role level gender');
                    io.to(`group_${groupId}`).emit('group-message', populatedAiMsg);
                  }
                } catch (err) {
                  console.error('Error generating blood match reply in group:', err);
                }
              }, 1000);
            }
          }
        }
      } catch (err) {
        console.error('Error sending group message:', err);
      }
    });

    socket.on('start-group-call', (groupId) => {
      socket.join(`group_call_${groupId}`);
      io.to(`group_${groupId}`).emit('group-call-started', { groupId, adminId: socket.user.id });
    });

    socket.on('request-join-group-call', ({ groupId, user }) => {
      socket.join(`group_call_${groupId}`);
      // Notify admin (who should be in group_call_groupId)
      socket.to(`group_call_${groupId}`).emit('user-requested-join', user);
    });

    socket.on('accept-join-request', ({ groupId, userId }) => {
      // Find the socket of the accepted user and tell them to initiate P2P
      const userSocketId = Array.from(onlineUsers.entries()).find(([k, v]) => k === userId)?.[1];
      if (userSocketId) {
        io.to(userSocketId).emit('join-request-accepted', socket.id);
      }
    });

    socket.on('sending-signal', payload => {
      io.to(payload.userToSignal).emit('user-joined-call', { signal: payload.signal, callerID: payload.callerID });
    });

    socket.on('returning-signal', payload => {
      io.to(payload.callerID).emit('receiving-returned-signal', { signal: payload.signal, id: socket.id });
    });

    socket.on('leave-group-call', (groupId) => {
      socket.leave(`group_call_${groupId}`);
    });
  });
};
