const express = require('express');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const router = express.Router();

router.post('/', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const ext = req.file.originalname.split('.').pop();
    const filename = `upload_${Date.now()}_${Math.floor(Math.random()*1000)}.${ext}`;
    
    // Save to client/public/uploads
    const uploadDir = path.join(__dirname, '../../client/public/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, req.file.buffer);
    
    const localUrl = `/uploads/${filename}`;
    res.status(200).json({ url: localUrl });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Server error during upload' });
  }
});

router.post('/voice', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const ext = 'webm';
    const filename = `voice_${Date.now()}_${Math.floor(Math.random()*1000)}.${ext}`;
    
    // Save to client/public/uploads
    const uploadDir = path.join(__dirname, '../../client/public/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, req.file.buffer);
    
    const localUrl = `/uploads/${filename}`;
    res.status(200).json({ url: localUrl });
  } catch (error) {
    console.error('Voice upload error:', error);
    res.status(500).json({ message: 'Server error during voice upload' });
  }
});

module.exports = router;
