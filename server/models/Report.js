const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reportedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  messageId: { type: mongoose.Schema.Types.ObjectId }, // Optional reference to the reported message
  chatType: { type: String, enum: ['general', 'private', 'user'], default: 'user' }, // Type of report
  reason: { type: String, default: 'General Report' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Report', reportSchema);
