const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { addToReviewQueue } = require('../utils/moderationQueue');
const User = require('../models/User');

// Track recent reports for crowd moderation: { reportedUserId: [{ reporterId, timestamp }] }
const reportTracker = new Map();

// @route   POST /api/report
// @desc    Submit a silent report with decrypted chat evidence
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { reportedUserId, evidence, context } = req.body;

    if (!reportedUserId || !evidence) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const reportedUser = await User.findById(reportedUserId);
    if (!reportedUser) {
      return res.status(404).json({ message: 'Reported user not found' });
    }

    // Immediately flag user as high risk if multiple reports are received
    // For now, we will add them to the moderation queue with high priority
    const evidenceText = evidence.map(msg => `[${new Date(msg.timestamp).toLocaleString()}] ${msg.sender}: ${msg.text}`).join('\n');
    
    addToReviewQueue(
      reportedUser._id.toString(),
      reportedUser.username,
      'silent-report',
      `Reporter: ${req.user.username}\nContext: ${context || 'N/A'}\n\nEvidence:\n${evidenceText}`
    );

    reportedUser.moderation = reportedUser.moderation || {};
    reportedUser.moderation.riskLevel = 'high-risk';
    reportedUser.moderation.lastViolationAt = new Date();

    // Crowd Moderation Logic
    const now = Date.now();
    let recentReports = reportTracker.get(reportedUserId) || [];
    
    // Filter reports to only those within the last 5 minutes
    recentReports = recentReports.filter(r => now - r.timestamp < 5 * 60 * 1000);
    
    // Add current reporter if not already in the recent reports list
    const reporterId = req.user.id.toString();
    if (!recentReports.some(r => r.reporterId === reporterId)) {
      recentReports.push({ reporterId, timestamp: now });
    }

    // Check if threshold reached (3 unique reporters in 5 mins)
    if (recentReports.length >= 3) {
      // Auto-mute for 1 hour
      reportedUser.moderation.holdUntil = new Date(now + 60 * 60 * 1000);
      reportedUser.moderation.holdReason = 'Crowd moderation auto-mute due to multiple reports';
      reportedUser.moderation.riskLevel = 'suspicious';
      // Clear the tracker for this user to avoid infinite muting loop
      reportTracker.delete(reportedUserId);
      console.log(`[Auto-Moderation] User ${reportedUser.username} muted for 1 hour due to crowd reports.`);
    } else {
      reportTracker.set(reportedUserId, recentReports);
    }

    await reportedUser.save();

    res.status(200).json({ message: 'Report submitted successfully. We will review this shortly.' });
  } catch (err) {
    console.error('Error submitting report:', err);
    res.status(500).json({ message: 'Failed to submit report' });
  }
});

module.exports = router;
