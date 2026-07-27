const mongoose = require('mongoose');

const privateMessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String },
  mediaUrl: { type: String },
  voiceUrl: { type: String },
  gifUrl: { type: String },
  isRead: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
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
  isViewOnce: { type: Boolean, default: false },
  expiresAt: { type: Date },
  scheduledFor: { type: Date },
  isScheduledSent: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

// TTL index for disappearing messages
privateMessageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

privateMessageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });

module.exports = mongoose.model('PrivateMessage', privateMessageSchema);
