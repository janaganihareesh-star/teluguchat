const mongoose = require('mongoose');

const groupMessageSchema = new mongoose.Schema({
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    trim: true,
    default: ''
  },
  mediaUrl: {
    type: String,
    default: ''
  },
  voiceUrl: {
    type: String,
    default: ''
  },
  gifUrl: {
    type: String,
    default: ''
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedBy: {
    type: String,
    enum: ['user', 'admin', null],
    default: null
  },
  reactions: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    emoji: String
  }],
  replyTo: {
    messageId: { type: mongoose.Schema.Types.ObjectId },
    username: String,
    text: String
  },
  isStarredBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  location: {
    lat: { type: Number },
    lng: { type: Number },
    address: { type: String }
  },
  contact: {
    name: { type: String },
    phone: { type: String }
  },
  poll: {
    question: { type: String },
    options: [{
      text: { type: String },
      votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
    }]
  },
  isViewOnce: { type: Boolean, default: false },
  scheduledFor: { type: Date },
  isScheduledSent: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('GroupMessage', groupMessageSchema);
