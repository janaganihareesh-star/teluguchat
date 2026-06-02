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
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL 
      : ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'], 
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
// Manual NoSQL injection sanitization (Express 5 compatible)
app.use((req, res, next) => {
  const sanitize = (obj) => {
    if (obj && typeof obj === 'object') {
      Object.keys(obj).forEach(key => {
        if (key.startsWith('$') || key.includes('.')) {
          delete obj[key];
        } else {
          sanitize(obj[key]);
        }
      });
    }
  };
  sanitize(req.body);
  sanitize(req.params);
  next();
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
});
app.use('/api', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many attempts. Please try again after 15 minutes.' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: { message: 'Too many uploads. Please slow down.' }
});
app.use('/api/upload', uploadLimiter);

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
app.use('/api/news', require('./routes/newsRoutes'));

// Initialize Daily News Cron Job
const initDailyNewsCron = require('./services/dailyNewsCron');
initDailyNewsCron(app);

// Guest account cleanup — delete guests older than 1 day
const cron = require('node-cron');
const User = require('./models/User');
cron.schedule('0 0 * * *', async () => {
  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await User.deleteMany({ 
      role: 'guest', 
      createdAt: { $lt: yesterday } 
    });
    console.log(`[Guest Cleanup] Deleted ${result.deletedCount} old guest accounts.`);
  } catch (err) {
    console.error('[Guest Cleanup] Error:', err);
  }
});

app.use(errorHandler);

const PORT = process.env.PORT || 3500;
let retryCount = 0;
const MAX_RETRIES = 5;

const startServer = () => {
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    retryCount = 0; // reset on success
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      if (retryCount >= MAX_RETRIES) {
        console.error(`[Error] Port ${PORT} is permanently blocked by another terminal. Please close this duplicate terminal tab!`);
        process.exit(1);
      }
      retryCount++;
      console.log(`[Warning] Port ${PORT} is in use. Retrying in 3 seconds... (Attempt ${retryCount}/${MAX_RETRIES})`);
      setTimeout(() => {
        server.close();
        startServer();
      }, 3000);
    } else {
      console.error('Server error:', err);
    }
  });
};

startServer();

// Graceful shutdown handlers for Nodemon / Terminal
const gracefulShutdown = (signal) => {
  console.log(`\nReceived ${signal}. Closing server gracefully...`);
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
};

process.once('SIGUSR2', () => {
  server.close(() => {
    process.kill(process.pid, 'SIGUSR2');
  });
});
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
