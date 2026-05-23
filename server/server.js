const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const fs = require('fs');
const path = require('path');

// Load env vars
dotenv.config();

// Connect to database
connectDB(); // Now connected using real MONGODB_URL

const app = express();
const server = http.createServer(app);

const { socketAuth } = require('./middleware/socketAuth');

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*', 
    methods: ['GET', 'POST'],
  },
});

app.set('io', io);

io.use(socketAuth);

// Load Socket Handlers
const chatSocket = require('./sockets/chatSocket');
chatSocket(io);

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const { errorHandler } = require('./middleware/errorMiddleware');

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(cors({ 
  origin: function(origin, callback) {
    if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1') || origin === process.env.FRONTEND_URL) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '10kb' })); // Limit body size against payload spoofing
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Data sanitization against NoSQL query injection
// app.use(mongoSanitize()); // Disabled: Incompatible with Express 5.x (req.query is read-only)
// Data sanitization against XSS
// app.use(xss()); // Disabled: Incompatible with Express 5.x (req.query is read-only)

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // Increased limit to prevent blocking during development
});
app.use('/api', limiter);

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Server running' });
});

// Music endpoint
app.use('/music', express.static(path.join(__dirname, 'music')));

app.get('/api/music', (req, res) => {
  try {
    const musicDir = path.join(__dirname, 'music');
    if (!fs.existsSync(musicDir)) {
      fs.mkdirSync(musicDir, { recursive: true });
    }
    const files = fs.readdirSync(musicDir).filter(f => f.toLowerCase().endsWith('.mp3'));
    
    if (files.length === 0) {
      // Send an empty list or fallback default
      return res.json([]);
    }

    const playlist = files.map(f => {
      let cleanTitle = f.replace(/\.mp3$/i, ''); // Strip extension
      cleanTitle = cleanTitle.replace(/[-_\s]*SenSongsMp3\.(Com|Co|Org)/gi, ''); // Strip common download site tags
      cleanTitle = cleanTitle.replace(/SenSongsMp3/gi, ''); // Clean remaining tags
      cleanTitle = cleanTitle.replace(/^\d+[-_\s]*/, ''); // Strip track numbers (like "1- ", "02-")
      cleanTitle = cleanTitle.replace(/[-_]/g, ' '); // Replace hyphens/underscores with space
      cleanTitle = cleanTitle.replace(/\s+/g, ' ').trim(); // Collapse and trim spaces
      
      return {
        title: cleanTitle,
        url: `/music/${encodeURIComponent(f)}`
      };
    });
    
    res.json(playlist);
  } catch (error) {
    console.error('Error reading music directory:', error);
    res.status(500).json({ message: 'Error fetching music playlist' });
  }
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/inbox', require('./routes/inboxRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/stats', require('./routes/statsRoutes'));
app.use('/api/users', require('./routes/userRoutes'));

app.use(errorHandler);

const PORT = process.env.PORT || 3500;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
