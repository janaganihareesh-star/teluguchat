const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['general', 'festival', 'motivation', 'safety', 'engagement'],
    default: 'general',
  },
  generatedByAI: {
    type: Boolean,
    default: true,
  },
  specialEventType: {
    type: String,
    default: null, // e.g. 'Diwali', 'NewYear'
  },
  imageUrl: {
    type: String,
    default: null,
  },
  priority: {
    type: Number,
    default: 0, // 0 = standard, 1 = important, 2 = festival/urgent
  },
  authorName: {
    type: String,
    default: 'System Admin',
  },
  replies: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

// Index for auto-cleanup and sorting
newsSchema.index({ createdAt: -1 });

module.exports = mongoose.model('News', newsSchema);
