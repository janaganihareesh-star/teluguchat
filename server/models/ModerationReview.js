const mongoose = require('mongoose');

const moderationReviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  evidence: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'resolved', 'dismissed'],
    default: 'pending'
  },
  actionTaken: {
    type: String,
    default: ''
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  flaggedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: {
    type: Date
  }
});

moderationReviewSchema.index({ status: 1, flaggedAt: -1 });

module.exports = mongoose.model('ModerationReview', moderationReviewSchema);

