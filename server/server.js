// Nodemon restart trigger (Gemini update v3)
const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const NodeCache = require('node-cache');

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
    origin: [
      process.env.FRONTEND_URL,
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174'
    ].filter(Boolean),
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

const musicCache = new NodeCache({ stdTTL: 86400 }); // Cache for 24 hours

app.get('/api/music', async (req, res) => {
  try {
    const API_KEY = process.env.GOOGLE_DRIVE_API_KEY;
    const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

    // Return empty if Drive credentials are missing
    if (!API_KEY || !FOLDER_ID) {
      console.warn('[Music API] Google Drive credentials missing. Please set GOOGLE_DRIVE_API_KEY and GOOGLE_DRIVE_FOLDER_ID in .env');
      return res.json([]);
    }

    const cacheKey = 'google_drive_music_playlist';
    const cachedPlaylist = musicCache.get(cacheKey);
    if (cachedPlaylist) {
      return res.json(cachedPlaylist);
    }

    // Query Google Drive API
    const driveUrl = `https://www.googleapis.com/drive/v3/files`;
    const query = `'${FOLDER_ID}' in parents and mimeType contains 'audio/' and trashed = false`;
    
    const response = await axios.get(driveUrl, {
      params: {
        q: query,
        key: API_KEY,
        fields: 'files(id, name)',
        pageSize: 1000
      }
    });

    const files = response.data.files || [];
    
    if (files.length === 0) {
      return res.json([]);
    }

    const playlist = files.map(file => {
      let cleanTitle = file.name.replace(/\.(mp3|wav|m4a|ogg|flac)$/i, ''); 
      cleanTitle = cleanTitle.replace(/[-_\s]*SenSongsMp3\.(Com|Co|Org)/gi, '');
      cleanTitle = cleanTitle.replace(/SenSongsMp3/gi, ''); 
      cleanTitle = cleanTitle.replace(/^\d+[-_\s]*/, ''); 
      cleanTitle = cleanTitle.replace(/[-_]/g, ' '); 
      cleanTitle = cleanTitle.replace(/\s+/g, ' ').trim(); 
      
      return {
        title: cleanTitle,
        url: `/api/music/stream/${file.id}`
      };
    });
    
    musicCache.set(cacheKey, playlist);
    res.json(playlist);
  } catch (error) {
    console.error('[Music API] Error fetching from Google Drive:', error.response?.data || error.message);
    res.status(500).json({ message: 'Error fetching music playlist' });
  }
});

app.get('/api/music/stream/:id', async (req, res) => {
  try {
    const fileId = req.params.id;
    const API_KEY = process.env.GOOGLE_DRIVE_API_KEY;

    if (!API_KEY) {
      console.error('[Music Stream] Google Drive API Key is missing.');
      return res.status(500).json({ message: 'Drive configuration missing' });
    }

    const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${API_KEY}`;
    
    const headers = {};
    if (req.headers.range) {
      headers['Range'] = req.headers.range;
    }

    const response = await axios({
      method: 'get',
      url: driveUrl,
      headers: headers,
      responseType: 'stream'
    });

    res.status(response.status);

    const headersToForward = [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges'
    ];

    headersToForward.forEach(header => {
      if (response.headers[header]) {
        res.setHeader(header, response.headers[header]);
      }
    });

    if (!res.getHeader('Content-Type')) {
      res.setHeader('Content-Type', 'audio/mpeg');
    }
    if (!res.getHeader('Accept-Ranges')) {
      res.setHeader('Accept-Ranges', 'bytes');
    }

    response.data.pipe(res);

  } catch (error) {
    console.error('[Music Stream] Error streaming from Google Drive:', error.response?.data || error.message);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error streaming audio' });
    }
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
