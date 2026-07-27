const mongoose = require('mongoose');

const bannedIPSchema = new mongoose.Schema({
  ipAddress: {
    type: String,
    required: true,
    unique: true
  },
  reason: {
    type: String,
    default: 'Banned by Admin'
  },
  bannedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('BannedIP', bannedIPSchema);
