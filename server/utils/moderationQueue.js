const ModerationReview = require('../models/ModerationReview');
const Redis = require('ioredis');

const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;
if (redis) {
  redis.on('error', (err) => console.error('[Redis ModerationQueue Error]:', err.message));
}

// In-memory fallback cache
let localMemoryQueue = [];

/**
 * Add a flagged event to persistent queue (MongoDB + Redis)
 */
const addToReviewQueue = async (userId, username, reason, evidence) => {
  const item = {
    userId,
    username,
    reason,
    evidence: typeof evidence === 'object' ? JSON.stringify(evidence) : String(evidence || ''),
    flaggedAt: new Date(),
    status: 'pending'
  };

  try {
    // 1. Save to MongoDB
    const reviewDoc = new ModerationReview(item);
    await reviewDoc.save();
    console.log(`[MOD QUEUE - Persistent DB] Flagged user ${username} for: ${reason} (ID: ${reviewDoc._id})`);

    // 2. Push to Redis list if available
    if (redis) {
      await redis.lpush('mod:review_queue', JSON.stringify({
        ...item,
        _id: reviewDoc._id
      }));
      // Keep last 500 items in Redis
      await redis.ltrim('mod:review_queue', 0, 499);
    }

    return reviewDoc;
  } catch (err) {
    console.error('[MOD QUEUE] Error persisting flagged item to MongoDB:', err.message);
    // Fallback to in-memory queue
    localMemoryQueue.unshift(item);
    if (localMemoryQueue.length > 100) localMemoryQueue.pop();
    return item;
  }
};

/**
 * Get review queue items (sorted newest first)
 */
const getReviewQueue = async (status = 'pending', limit = 50) => {
  try {
    const items = await ModerationReview.find({ status })
      .sort({ flaggedAt: -1 })
      .limit(limit)
      .populate('userId', 'username profilePic level badge moderation role');
    return items;
  } catch (err) {
    console.error('[MOD QUEUE] Error fetching review queue from DB:', err.message);
    return localMemoryQueue.filter(item => item.status === status);
  }
};

/**
 * Resolve or dismiss a review item
 */
const resolveReviewItem = async (reviewId, action, adminId) => {
  try {
    const item = await ModerationReview.findById(reviewId);
    if (!item) return null;

    item.status = action === 'dismiss' ? 'dismissed' : 'resolved';
    item.actionTaken = action;
    item.reviewedBy = adminId;
    item.reviewedAt = new Date();
    await item.save();

    console.log(`[MOD QUEUE] Resolved review ${reviewId} with action ${action}`);
    return item;
  } catch (err) {
    console.error('[MOD QUEUE] Error resolving review item:', err.message);
    return null;
  }
};

module.exports = { 
  addToReviewQueue, 
  getReviewQueue,
  resolveReviewItem 
};
