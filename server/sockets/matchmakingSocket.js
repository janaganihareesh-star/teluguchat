const User = require('../models/User');

const matchQueue = [];
const activeMatches = new Map();

module.exports = (io, onlineUsers) => {
  io.on('connection', (socket) => {
    
    socket.on('join-blind-chat', async () => {
      try {
        const userId = socket.user.id;
        
        // Prevent double queueing
        if (matchQueue.includes(userId)) return;
        
        // If someone is waiting, match them!
        if (matchQueue.length > 0) {
          const partnerId = matchQueue.shift();
          
          const roomId = `blind_${Date.now()}`;
          activeMatches.set(userId, { roomId, partnerId });
          activeMatches.set(partnerId, { roomId, partnerId: userId });

          socket.join(roomId);
          
          // Get partner socket
          const partnerInfo = onlineUsers.get(partnerId.toString());
          const partnerSocketId = partnerInfo ? (typeof partnerInfo === 'string' ? partnerInfo : partnerInfo.socketId) : null;
          
          if (partnerSocketId) {
            const partnerSocket = io.sockets.sockets.get(partnerSocketId);
            if (partnerSocket) partnerSocket.join(roomId);
          }

          io.to(roomId).emit('blind-match-found', { roomId });
          
          // Auto-end match after 5 minutes
          setTimeout(() => {
            io.to(roomId).emit('blind-match-ended', { reason: 'timeout' });
            activeMatches.delete(userId);
            activeMatches.delete(partnerId);
          }, 5 * 60 * 1000);
          
        } else {
          // Add to queue
          matchQueue.push(userId);
          socket.emit('blind-match-waiting');
        }
      } catch (err) {
        console.error('Error in blind chat:', err);
      }
    });

    socket.on('blind-message', (data) => {
      const { roomId, message } = data;
      // Broadcast to room except sender
      socket.to(roomId).emit('blind-message', { sender: 'Stranger', message });
    });

    socket.on('leave-blind-chat', () => {
      const userId = socket.user?.id;
      if (!userId) return;

      const match = activeMatches.get(userId);
      if (match) {
        const { roomId, partnerId } = match;
        io.to(roomId).emit('blind-match-ended', { reason: 'partner_left' });
        activeMatches.delete(userId);
        activeMatches.delete(partnerId);
        socket.leave(roomId);
      } else {
        // Remove from queue if waiting
        const index = matchQueue.indexOf(userId);
        if (index > -1) {
          matchQueue.splice(index, 1);
        }
      }
    });

    socket.on('disconnect', () => {
      const userId = socket.user?.id;
      if (!userId) return;

      const match = activeMatches.get(userId);
      if (match) {
        const { roomId, partnerId } = match;
        io.to(roomId).emit('blind-match-ended', { reason: 'partner_disconnected' });
        activeMatches.delete(userId);
        activeMatches.delete(partnerId);
      }
      
      const index = matchQueue.indexOf(userId);
      if (index > -1) {
        matchQueue.splice(index, 1);
      }
    });

  });
};
