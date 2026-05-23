const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  room: { type: String, required: true, default: 'general' },
  message: { type: String },
  mediaUrl: { type: String },
  voiceUrl: { type: String },
  gifUrl: { type: String },
  stickerUrl: { type: String },
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  reactions: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    emoji: { type: String }
  }],
  isDeleted: { type: Boolean, default: false },
  deletedBy: { type: String, enum: ['user', 'admin'] },
  createdAt: { type: Date, default: Date.now },
});

messageSchema.index({ room: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
