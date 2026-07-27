const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  room: { type: String, required: true, default: 'general' },
  message: { type: String },
  mediaUrl: { type: String },
  voiceUrl: { type: String },
  gifUrl: { type: String },
  stickerUrl: { type: String },
  mentions: [{ type: String }],
  reactions: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    emoji: { type: String }
  }],
  replyTo: {
    messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    username: { type: String },
    text: { type: String }
  },
  location: {
    lat: { type: Number },
    lng: { type: Number }
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
  scheduledFor: { type: Date },
  isScheduledSent: { type: Boolean, default: false },
  isViewOnce: { type: Boolean, default: false },
  isStarredBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isDeleted: { type: Boolean, default: false },
  deletedBy: { type: String, enum: ['user', 'admin'] },
  createdAt: { type: Date, default: Date.now },
});

messageSchema.index({ room: 1, createdAt: -1 });
messageSchema.index({ mentions: 1 });
messageSchema.index({ isDeleted: 1 });

module.exports = mongoose.model('Message', messageSchema);
