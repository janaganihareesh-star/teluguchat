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
  createdAt: { type: Date, default: Date.now },
});

privateMessageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });

module.exports = mongoose.model('PrivateMessage', privateMessageSchema);
