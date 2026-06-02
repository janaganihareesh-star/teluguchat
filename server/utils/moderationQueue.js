const reviewQueue = [];

const addToReviewQueue = (userId, username, reason, evidence) => {
  reviewQueue.push({
    userId,
    username,
    reason,
    evidence,
    flaggedAt: new Date(),
    status: 'pending'
  });
  console.log(`[MOD QUEUE] Flagged user ${username} for: ${reason}`);
};

const getReviewQueue = () => reviewQueue;

module.exports = { addToReviewQueue, getReviewQueue };
