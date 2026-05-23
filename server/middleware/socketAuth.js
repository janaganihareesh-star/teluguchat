const jwt = require('jsonwebtoken');

const socketAuth = (socket, next) => {
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
