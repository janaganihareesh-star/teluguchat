const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 30
  },
  description: {
    type: String,
    maxlength: 200,
    default: ''
  },
  icon: {
    type: String,
    default: '👥'
  },
  theme: {
    type: String,
    default: 'theme-dark'
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  inviteCode: {
    type: String,
    unique: true
  },
  pet: {
    name: { type: String, default: 'Chitti' },
    type: { type: String, enum: ['dog', 'cat', 'dragon'], default: 'dog' },
    happiness: { type: Number, default: 100 },
    lastFed: { type: Date, default: Date.now },
    level: { type: Number, default: 1 }
  },
  lastMessage: {
    text: String,
    sender: String,
    timestamp: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('Group', groupSchema);
