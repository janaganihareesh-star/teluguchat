const BannedIP = require('../models/BannedIP');
const jwt = require('jsonwebtoken');

const socketAuth = async (socket, next) => {
  const ip = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
  try {
    const isBanned = await BannedIP.findOne({ ipAddress: ip });
    if (isBanned) {
      return next(new Error('Your IP is banned.'));
    }
  } catch(e) {
    console.error("Error checking banned IP in socketAuth:", e);
  }

  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded; // Attach decoded user info
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
};

module.exports = { socketAuth };
