const User = require('../models/User');
const { analyzeText: perspectiveAnalyze } = require('./contentModerator');
const { addToReviewQueue } = require('./moderationQueue');

// In-memory logs for speed and repeated message monitoring
// These do not need to persist across server restarts (holds/kicks/suspensions DO persist in DB)
const speedMap = new Map(); // userId -> Array of timestamps
const historyMap = new Map(); // userId -> Array of recent message strings
const mediaSpeedMap = new Map();
const muteMap = new Map(); // userId -> Array of timestamps for media uploads
const botSuspicionMap = new Map();

const roomProtection = {
  isLocked: false,
  lockedAt: null,
  newAccountJoins: [],
  spamBurst: []
};

const checkRoomProtection = (userId, accountAgeDays) => {
  const now = Date.now();
  
  // Track new account joins in last 5 minutes
  if (accountAgeDays < 1) {
    roomProtection.newAccountJoins = roomProtection.newAccountJoins
      .filter(t => now - t < 5 * 60 * 1000);
    roomProtection.newAccountJoins.push(now);
  }

  // If 5+ new accounts joined in 5 minutes - lock room
  if (roomProtection.newAccountJoins.length >= 5) {
    roomProtection.isLocked = true;
    roomProtection.lockedAt = now;
    console.log('[EMERGENCY] Room locked due to potential raid!');
  }

  // Auto unlock after 10 minutes
  if (roomProtection.isLocked && now - roomProtection.lockedAt > 10 * 60 * 1000) {
    roomProtection.isLocked = false;
    console.log('[EMERGENCY] Room lock lifted.');
  }

  return roomProtection.isLocked;
};

// Banned words dictionaries for Telugu and English (Mock AI classification)
const BANNED_TOXIC_SMALL = ['idiot', 'stupid', 'duffer', 'fool', 'bewakoof', 'waste', 'cheater', 'dhed', 'lathkor'];
const BANNED_TOXIC_HEAVY = ['kill you', 'die', 'bastard', 'bitch', 'asshole', 'motherfucker', 'abuse', 'fuck', 'dengu', 'lanja', 'munda', 'kodaka'];
const BANNED_NSFW_LIGHT = ['sexy', 'romance', 'hot pic', 'babe'];
const BANNED_NSFW_HEAVY = ['porn', 'naked', 'nudity', 'sex', 'boobs', 'penis', 'vagina', 'fuck me', 'kama', 'dengulata'];
const SCAM_KEYWORDS = ['free coins', 'double coins', 'earn cash', 'click here to win', 'get free money', 'giveaway free', 'phishing', 'telegram.me/join', 'bit.ly/', 'tinyurl.com', 'bit.ly', 't.co', 'shorturl', 'win prize', 'claim reward', 'verify account', 'free gift'];

/**
 * AI Moderation Engine
 */
const _moderateMessageInner = async (userId, data, user, now) => {
  const { message = '', mediaUrl = '', isVoice = false } = data;

  const accountAgeMs = now - new Date(user.createdAt).getTime();
  const accountAgeDays = accountAgeMs / (1000 * 60 * 60 * 24);

  let trustMultiplier = 1.0;
  if (accountAgeDays < 1) trustMultiplier = 0.5;
  else if (accountAgeDays <= 7) trustMultiplier = 0.75;
  else if (accountAgeDays > 30) trustMultiplier = 1.5;

  if (accountAgeDays > 30 && user.moderation.riskLevel === 'clean') {
    user.moderation.isTrusted = true;
  } else {
    user.moderation.isTrusted = false;
  }

  const isRoomLocked = checkRoomProtection(userId, accountAgeDays);
  if (isRoomLocked && accountAgeDays < 1) {
    return {
      action: 'warn',
      blocked: true,
      message: '⚠ Chat room is temporarily restricted. Please try again in a few minutes.'
    };
  }

  const botScore = botSuspicionMap.get(userId.toString()) || 0;

  // Increase bot score for suspicious behavior
  let newBotScore = botScore;
  if (accountAgeDays < 1) newBotScore += 1;
  if (message && message.length < 3) newBotScore += 1;
  if (message && /^(.)\1{8,}$/.test(message.trim())) newBotScore += 2;

  botSuspicionMap.set(userId.toString(), newBotScore);

  // If bot score >= 5, apply strict monitoring
  if (newBotScore >= 5) {
    user.moderation.riskLevel = 'high-risk';
    user.moderation.lastViolationAt = new Date();
    await user.save();
    addToReviewQueue(userId, user.username, 'bot-suspicion', message);
    return {
      action: 'warn',
      blocked: true,
      message: '⚠ Unusual activity detected on your account. Please chat normally.'
    };
  }

  // Exclude administrators from AI moderation checks
  if (user.role === 'admin') {
    return { action: 'allow' };
  }

  // 0. Active Punishment Checks
  // Check if suspended
  if (user.moderation?.suspendedUntil && user.moderation.suspendedUntil > now) {
    return {
      action: 'suspend',
      blocked: true,
      message: `🚫 Your account has been temporarily suspended due to severe community guideline violations.`,
      until: user.moderation.suspendedUntil
    };
  }

  // Check if kicked
  if (user.moderation?.kickUntil && user.moderation.kickUntil > now) {
    return {
      action: 'kick',
      blocked: true,
      message: `🚫 You have been removed from this room due to repeated violations.`,
      until: user.moderation.kickUntil
    };
  }

  // Check if on hold
  if (user.moderation?.holdUntil && user.moderation.holdUntil > now) {
    return {
      action: 'hold',
      blocked: true,
      message: `⏳ Your chat access is on hold until ${formatTime(user.moderation.holdUntil)} due to activity violations.`,
      until: user.moderation.holdUntil
    };
  }

  // Initialize moderation object if empty
  if (!user.moderation) {
    user.moderation = {
      riskLevel: 'clean',
      warningsCount: 0,
      speedViolationsCount: 0,
      repeatedViolationsCount: 0,
      abuseViolationsCount: 0,
      unsafeImageCount: 0
    };
  }

  // 1. MESSAGE SPEED MONITORING
  const userTimes = speedMap.get(userId.toString()) || [];
  // Clean timestamps older than 3 seconds
  const recentTimes = userTimes.filter(t => now - t < 3000);
  recentTimes.push(now);
  speedMap.set(userId.toString(), recentTimes);

  const spamThreshold = Math.round(10 * trustMultiplier);
  if (recentTimes.length >= spamThreshold) {
    // Spam detected! (10 messages in 3 seconds)
    const speedCount = (user.moderation.speedViolationsCount || 0) + 1;
    user.moderation.speedViolationsCount = speedCount;

    if (speedCount === 1) {
      // 1st Speed violation: Warning
      user.moderation.lastViolationAt = new Date();
        await user.save();
      return {
        action: 'warn',
        blocked: true,
        message: '⚠ Slow down. You are sending messages too fast.'
      };
    } else {
      // Hold Escalation
      let durationMs = 0;
      let reason = 'spam activity';
      let holdType = 'hold';

      if (speedCount === 2) durationMs = 5 * 60 * 1000; // 5 mins
      else if (speedCount === 3) durationMs = 15 * 60 * 1000; // 15 mins
      else if (speedCount === 4) durationMs = 30 * 60 * 1000; // 30 mins
      else if (speedCount === 5) durationMs = 60 * 60 * 1000; // 1 hour
      else {
        // 6th or more violations -> Kick from room
        holdType = 'kick';
        // First Kick: 30 minutes. Subsequent Kicks: 24 hours
        durationMs = speedCount === 6 ? 30 * 60 * 1000 : 24 * 60 * 60 * 1000;
        reason = 'repeated spam violations';
      }

      const untilTime = new Date(now + durationMs);
      if (holdType === 'hold') {
        user.moderation.holdUntil = untilTime;
        user.moderation.holdStart = new Date();
        user.moderation.holdReason = reason;
        user.moderation.riskLevel = 'suspicious';
      } else {
        user.moderation.kickUntil = untilTime;
        user.moderation.kickStart = new Date();
        user.moderation.kickReason = reason;
        user.moderation.riskLevel = 'high-risk';
      }

      await user.save();

      const timeStrStart = formatTime(new Date());
      const timeStrEnd = formatTime(untilTime);

      if (holdType === 'hold') {
        return {
          action: 'hold',
          blocked: true,
          until: untilTime,
          message: speedCount === 2 
            ? `⏳ Your chat access is on hold from ${timeStrStart} to ${timeStrEnd} due to spam activity.`
            : `⚠ Repeated spam activity detected. Your chat access is restricted from ${timeStrStart} to ${timeStrEnd}.`
        };
      } else {
        return {
          action: 'kick',
          blocked: true,
          until: untilTime,
          message: `🚫 You have been removed from this room due to repeated spam violations.`
        };
      }
    }
  }

  // 1.5 TYPING SPAM DETECTION
  if (message.trim()) {
    const cleanMsg = message.trim();
    const hasCharSpam = /(.)\1{9,}/u.test(cleanMsg);
    const hasEmojiSpam = /(\p{Emoji})\1{7,}/u.test(cleanMsg);
    
    if (!user.moderation.isTrusted && (hasCharSpam || hasEmojiSpam)) {
      const typingSpamCount = (user.moderation.typingSpamCount || 0) + 1;
      user.moderation.typingSpamCount = typingSpamCount;

      if (typingSpamCount === 1) {
        user.moderation.lastViolationAt = new Date();
        await user.save();
        return {
          action: 'warn',
          blocked: true,
          message: '⚠ Please avoid sending meaningless characters or emoji spam.'
        };
      } else if (typingSpamCount === 2) {
        const holdTime = new Date(now + 5 * 60 * 1000);
        user.moderation.holdUntil = holdTime;
        user.moderation.holdStart = new Date();
        user.moderation.holdReason = 'typing spam';
        user.moderation.riskLevel = 'suspicious';
        user.moderation.lastViolationAt = new Date();
        await user.save();
        return {
          action: 'hold',
          blocked: true,
          until: holdTime,
          message: `⏳ Your chat access is on hold from ${formatTime(new Date())} to ${formatTime(holdTime)} due to typing spam.`
        };
      } else {
        let durationMs = 0;
        let holdType = 'hold';
        if (typingSpamCount === 3) durationMs = 15 * 60 * 1000;
        else if (typingSpamCount === 4) durationMs = 30 * 60 * 1000;
        else if (typingSpamCount === 5) durationMs = 60 * 60 * 1000;
        else {
          holdType = 'kick';
          durationMs = typingSpamCount === 6 ? 30 * 60 * 1000 : 24 * 60 * 60 * 1000;
        }
        const untilTime = new Date(now + durationMs);
        if (holdType === 'hold') {
          user.moderation.holdUntil = untilTime;
          user.moderation.holdStart = new Date();
          user.moderation.holdReason = 'repeated typing spam';
          user.moderation.riskLevel = 'suspicious';
          user.moderation.lastViolationAt = new Date();
        await user.save();
          return {
            action: 'hold',
            blocked: true,
            until: untilTime,
            message: `⏳ Your chat access is on hold until ${formatTime(untilTime)} due to typing spam.`
          };
        } else {
          user.moderation.kickUntil = untilTime;
          user.moderation.kickStart = new Date();
          user.moderation.kickReason = 'repeated typing spam';
          user.moderation.riskLevel = 'high-risk';
          user.moderation.lastViolationAt = new Date();
        await user.save();
          return {
            action: 'kick',
            blocked: true,
            until: untilTime,
            message: `🚫 You have been removed from this room due to repeated typing spam violations.`
          };
        }
      }
    }
  }

  // 2. REPEATED MESSAGE MONITORING
  if (message.trim()) {
    const userHistory = historyMap.get(userId.toString()) || [];
    const cleanMsg = message.trim().toLowerCase();
    
    // Check if the last 3 messages are identical
    const isRepeated = userHistory.length >= 2 && userHistory.slice(-2).every(m => m === cleanMsg);
    
    userHistory.push(cleanMsg);
    if (userHistory.length > 5) userHistory.shift();
    historyMap.set(userId.toString(), userHistory);

    if (isRepeated) {
      const repeatCount = (user.moderation.repeatedViolationsCount || 0) + 1;
      user.moderation.repeatedViolationsCount = repeatCount;

      if (repeatCount === 1) {
        if (user.moderation.isTrusted) return { action: 'allow' };
        user.moderation.lastViolationAt = new Date();
        await user.save();
        return {
          action: 'warn',
          blocked: true,
          message: '⚠ Please avoid repeating the same message. (Spam/Bot check)'
        };
      } else if (repeatCount === 2) {
        // 5 min hold
        const holdTime = new Date(now + 5 * 60 * 1000);
        user.moderation.holdUntil = holdTime;
        user.moderation.holdStart = new Date();
        user.moderation.holdReason = 'repeated message spam';
        user.moderation.riskLevel = 'suspicious';
        user.moderation.lastViolationAt = new Date();
        await user.save();
        return {
          action: 'hold',
          blocked: true,
          until: holdTime,
          message: `⏳ Your chat access is on hold from ${formatTime(new Date())} to ${formatTime(holdTime)} due to repeated message spam.`
        };
      } else {
        // Room kick
        const kickTime = new Date(now + 30 * 60 * 1000); // 30 min kick
        user.moderation.kickUntil = kickTime;
        user.moderation.kickStart = new Date();
        user.moderation.kickReason = 'repeated message spam';
        user.moderation.riskLevel = 'high-risk';
        user.moderation.lastViolationAt = new Date();
        await user.save();
        return {
          action: 'kick',
          blocked: true,
          until: kickTime,
          message: `🚫 You have been removed from this room due to repeated message violations.`
        };
      }
    }
  }

  // 3. VOICE MONITORING (Transcribe voice simulation)
  let analyzedText = message;
  if (isVoice && mediaUrl) {
    // Simulate transcribing voice note
    // If filename has keywords, simulate specific text transcripts
    const lowerUrl = mediaUrl.toLowerCase();
    if (lowerUrl.includes('toxic') || lowerUrl.includes('abuse')) {
      analyzedText = "you stupid idiot";
    } else if (lowerUrl.includes('scam') || lowerUrl.includes('cash')) {
      analyzedText = "click here to win free coins now";
    } else if (lowerUrl.includes('nsfw') || lowerUrl.includes('naked')) {
      analyzedText = "want some sex and porn";
    } else {
      analyzedText = "hello, this is a clean Telugu voice note message.";
    }

    // If transcribed text is toxic/bad, block voice note
    const isVoiceBad = BANNED_TOXIC_HEAVY.some(w => analyzedText.toLowerCase().includes(w)) ||
                      BANNED_NSFW_HEAVY.some(w => analyzedText.toLowerCase().includes(w)) ||
                      SCAM_KEYWORDS.some(w => analyzedText.toLowerCase().includes(w));
    if (isVoiceBad) {
      return {
        action: 'block_voice',
        blocked: true,
        message: '❌ Voice message violates platform safety rules and was not delivered.'
      };
    }
  }

  // 4. IMAGE / MEDIA SCANNER MOCK
  if (mediaUrl && !isVoice) {
    const lowerUrl = mediaUrl.toLowerCase();
    const isImage = lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.png') || lowerUrl.endsWith('.jpeg') || lowerUrl.endsWith('.gif') || lowerUrl.includes('image');
    
    if (isImage) {
      const isUnsafe = lowerUrl.includes('nsfw') || lowerUrl.includes('nudity') || lowerUrl.includes('gore') || lowerUrl.includes('violence') || lowerUrl.includes('explicit') || lowerUrl.includes('porn');
      if (isUnsafe) {
        const unsafeCount = (user.moderation.unsafeImageCount || 0) + 1;
        user.moderation.unsafeImageCount = unsafeCount;

        if (unsafeCount >= 3) {
          // Repeated unsafe images -> room kick
          const kickTime = new Date(now + 30 * 60 * 1000);
          user.moderation.kickUntil = kickTime;
          user.moderation.kickStart = new Date();
          user.moderation.kickReason = 'repeated unsafe media upload';
          user.moderation.riskLevel = 'high-risk';
          user.moderation.lastViolationAt = new Date();
        await user.save();
          return {
            action: 'kick',
            blocked: true,
            until: kickTime,
            message: `🚫 You have been removed from this room due to repeated unsafe media violations.`
          };
        } else {
          user.moderation.lastViolationAt = new Date();
        await user.save();
          return {
            action: 'block_image',
            blocked: true,
            message: '❌ This image violates platform safety rules and was not delivered.'
          };
        }
      }
    }
  }

  // 4.5 MEDIA SPAM DETECTION
  if (mediaUrl) {
    const userMedia = mediaSpeedMap.get(userId.toString()) || [];
    const recentMedia = userMedia.filter(t => now - t < 10 * 60 * 1000);
    recentMedia.push(now);
    mediaSpeedMap.set(userId.toString(), recentMedia);

    if (recentMedia.length >= 5) {
      const mediaSpamCount = (user.moderation.mediaSpamCount || 0) + 1;
      user.moderation.mediaSpamCount = mediaSpamCount;

      if (mediaSpamCount === 1) {
        user.moderation.lastViolationAt = new Date();
        await user.save();
        return {
          action: 'warn',
          blocked: true,
          message: '⚠ Please avoid sending excessive media in a short time.'
        };
      } else if (mediaSpamCount === 2) {
        const holdTime = new Date(now + 10 * 60 * 1000);
        user.moderation.holdUntil = holdTime;
        user.moderation.holdStart = new Date();
        user.moderation.holdReason = 'media spam';
        user.moderation.riskLevel = 'suspicious';
        user.moderation.lastViolationAt = new Date();
        await user.save();
        return {
          action: 'hold',
          blocked: true,
          until: holdTime,
          message: `⏳ Your chat access is on hold from ${formatTime(new Date())} to ${formatTime(holdTime)} due to media spam.`
        };
      } else {
        const holdTime = new Date(now + 30 * 60 * 1000);
        user.moderation.holdUntil = holdTime;
        user.moderation.holdStart = new Date();
        user.moderation.holdReason = 'repeated media spam';
        user.moderation.riskLevel = 'high-risk';
        user.moderation.lastViolationAt = new Date();
        await user.save();
        return {
          action: 'hold',
          blocked: true,
          until: holdTime,
          message: `⏳ Your chat access is on hold until ${formatTime(holdTime)} due to repeated media spam.`
        };
      }
    }
  }

  // 5. TOXICITY / ABUSE MONITORING
  if (analyzedText.trim()) {
    const cleanMsg = analyzedText.toLowerCase();

    // Check Local Dictionary first
    const hasHeavyAbuse = BANNED_TOXIC_HEAVY.some(w => cleanMsg.includes(w));
    const hasSmallAbuse = BANNED_TOXIC_SMALL.some(w => cleanMsg.includes(w));

    // Call Perspective API as backup / verification
    let perspectiveScore = 0;
    try {
      const pRes = await perspectiveAnalyze(analyzedText);
      if (!pRes.isSafe) {
        // Perspective flagged it
        perspectiveScore = pRes.scores?.TOXICITY?.summaryScore?.value || 0.9;
      }
    } catch (e) {}

    if (hasHeavyAbuse || perspectiveScore > 0.92) {
      // EXTREME ABUSE -> Instant Room Kick / Temporary suspension
      const abuseCount = (user.moderation.abuseViolationsCount || 0) + 1;
      user.moderation.abuseViolationsCount = abuseCount;

      if (abuseCount >= 2 || perspectiveScore > 0.97) {
        // Account suspension for 24 hours
        const suspTime = new Date(now + 24 * 60 * 60 * 1000);
        user.moderation.suspendedUntil = suspTime;
        user.moderation.suspensionReason = 'severe community guideline violations';
        user.moderation.riskLevel = 'high-risk';
        user.moderation.lastViolationAt = new Date();
        await user.save();
        return {
          action: 'suspend',
          blocked: true,
          until: suspTime,
          message: `🚫 Your account has been temporarily suspended due to severe community guideline violations.`
        };
      } else {
        // Room kick for 30 minutes
        const kickTime = new Date(now + 30 * 60 * 1000);
        user.moderation.kickUntil = kickTime;
        user.moderation.kickStart = new Date();
        user.moderation.kickReason = 'severe abusive language';
        user.moderation.riskLevel = 'high-risk';
        user.moderation.lastViolationAt = new Date();
        await user.save();
        return {
          action: 'kick',
          blocked: true,
          until: kickTime,
          message: `🚫 You have been removed from this room due to severe abusive language violations.`
        };
      }
    } else {
      const perspectiveThreshold = user.moderation.isTrusted ? 0.85 : 0.70;
      if (hasSmallAbuse || perspectiveScore > perspectiveThreshold) {
        // SMALL / MODERATE ABUSE
        const abuseCount = (user.moderation.abuseViolationsCount || 0) + 1;
        user.moderation.abuseViolationsCount = abuseCount;

        if (abuseCount === 1) {
          // 1st time Small Abuse: Warning
          user.moderation.lastViolationAt = new Date();
          await user.save();
          return {
            action: 'warn',
            blocked: true,
            message: '⚠ Please maintain respectful communication.'
          };
        } else {
          // Moderate Abuse: 15-min hold
          const holdTime = new Date(now + 15 * 60 * 1000);
          user.moderation.holdUntil = holdTime;
          user.moderation.holdStart = new Date();
          user.moderation.holdReason = 'abusive language';
          user.moderation.riskLevel = 'suspicious';
          user.moderation.lastViolationAt = new Date();
          await user.save();
          return {
            action: 'hold',
            blocked: true,
            until: holdTime,
            message: `⏳ Your chat privileges are temporarily restricted due to abusive language from ${formatTime(new Date())} to ${formatTime(holdTime)}.`
          };
        }
      }
    }
  }

  // 6. SCAM LINK MONITORING
  if (analyzedText.trim()) {
    const hasScamLink = SCAM_KEYWORDS.some(w => analyzedText.toLowerCase().includes(w)) || 
                        (analyzedText.includes('http') && analyzedText.match(/https?:\/\/[^\s]+/gi)?.length > 2); // Mass link check

    if (hasScamLink) {
      const warnings = (user.moderation.warningsCount || 0) + 1;
      user.moderation.warningsCount = warnings;

      if (analyzedText.match(/https?:\/\/[^\s]+/gi)?.length > 2) {
        // Mass link spam -> Instant Room Kick
        const kickTime = new Date(now + 30 * 60 * 1000);
        user.moderation.kickUntil = kickTime;
        user.moderation.kickStart = new Date();
        user.moderation.kickReason = 'mass link spam';
        user.moderation.riskLevel = 'high-risk';
        user.moderation.lastViolationAt = new Date();
        await user.save();
        return {
          action: 'kick',
          blocked: true,
          until: kickTime,
          message: `🚫 Suspicious link activity detected. You have been removed temporarily.`
        };
      } else {
        // Warning first, then hold
        if (warnings === 1) {
          user.moderation.lastViolationAt = new Date();
        await user.save();
          return {
            action: 'warn',
            blocked: true,
            message: '⚠ Suspicious link activity detected. Please avoid sharing unauthorized links.'
          };
        } else {
          // Hold 15 minutes
          const holdTime = new Date(now + 15 * 60 * 1000);
          user.moderation.holdUntil = holdTime;
          user.moderation.holdStart = new Date();
          user.moderation.holdReason = 'unauthorized link sharing';
          user.moderation.riskLevel = 'suspicious';
          user.moderation.lastViolationAt = new Date();
        await user.save();
          return {
            action: 'hold',
            blocked: true,
            until: holdTime,
            message: `⏳ Your chat privileges are restricted from ${formatTime(new Date())} to ${formatTime(holdTime)} due to link sharing rules.`
          };
        }
      }
    }
  }

  // 7. SEXUAL / NSFW TEXT MONITORING
  if (analyzedText.trim()) {
    const cleanMsg = analyzedText.toLowerCase();
    const hasNsfwHeavy = BANNED_NSFW_HEAVY.some(w => cleanMsg.includes(w));
    const hasNsfwLight = BANNED_NSFW_LIGHT.some(w => cleanMsg.includes(w));

    if (hasNsfwHeavy) {
      // Extreme sexual content -> direct suspension for 24 hours
      const suspTime = new Date(now + 24 * 60 * 60 * 1000);
      user.moderation.suspendedUntil = suspTime;
      user.moderation.suspensionReason = 'severe NSFW content violation';
      user.moderation.riskLevel = 'high-risk';
      user.moderation.lastViolationAt = new Date();
        await user.save();
      return {
        action: 'suspend',
        blocked: true,
        until: suspTime,
        message: `🚫 Your account has been temporarily suspended due to severe community guideline violations.`
      };
    } else if (hasNsfwLight) {
      const warnings = (user.moderation.warningsCount || 0) + 1;
      user.moderation.warningsCount = warnings;

      if (warnings === 1) {
        user.moderation.lastViolationAt = new Date();
        await user.save();
        return {
          action: 'warn',
          blocked: true,
          message: '⚠ Please avoid using explicit or inappropriate language.'
        };
      } else {
        // Hold 15 minutes
        const holdTime = new Date(now + 15 * 60 * 1000);
        user.moderation.holdUntil = holdTime;
        user.moderation.holdStart = new Date();
        user.moderation.holdReason = 'inappropriate language';
        user.moderation.riskLevel = 'suspicious';
        user.moderation.lastViolationAt = new Date();
        await user.save();
        return {
          action: 'hold',
          blocked: true,
          until: holdTime,
          message: `⏳ Chat privileges restricted from ${formatTime(new Date())} to ${formatTime(holdTime)} due to inappropriate chat.`
        };
      }
    }
  }

  // 8. SHADOW BAN / IGNORE MODE CHECK
  if (user.moderation?.visibilityLimitedUntil && user.moderation.visibilityLimitedUntil > now) {
    return {
      action: 'ignore',
      blocked: false, // Don't block from their screen (shadow ban!)
      message: `⚠ Your recent activity has reduced your chat visibility temporarily from ${formatTime(user.moderation.visibilityLimitedStart)} to ${formatTime(user.moderation.visibilityLimitedUntil)}.`
    };
  }

  // 9. AI USER LEVEL AUTO-MODERATION GRADIENTS
  const totalViolations = (user.moderation.speedViolationsCount || 0) + 
                          (user.moderation.repeatedViolationsCount || 0) + 
                          (user.moderation.abuseViolationsCount || 0) +
                          (user.moderation.unsafeImageCount || 0);

  if (totalViolations >= 6) {
    user.moderation.riskLevel = 'high-risk';
  } else if (totalViolations >= 3) {
    user.moderation.riskLevel = 'suspicious';
  } else {
    user.moderation.riskLevel = 'clean';
  }

  const lastViolation = user.moderation.lastViolationAt;
  if (lastViolation) {
    const daysSinceViolation = (now - new Date(lastViolation).getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceViolation >= 30 && user.moderation.riskLevel === 'suspicious') {
      user.moderation.riskLevel = 'clean';
    } else if (daysSinceViolation >= 7 && user.moderation.riskLevel === 'high-risk') {
      user.moderation.riskLevel = 'suspicious';
    }
  }

  await user.save();

  return { action: 'allow' };
};

const moderateMessage = async (userId, data) => {
  const user = await User.findById(userId);
  if (!user) return { action: 'allow' };
  const now = Date.now();

  const isFirstPunishment = !user.moderation?.holdUntil && !user.moderation?.kickUntil;

  const originalSave = user.save.bind(user);
  let saveCalled = false;
  user.save = async () => { saveCalled = true; };

  const result = await _moderateMessageInner(userId, data, user, now);

  if (result.action === 'hold' && !isFirstPunishment) {
    const muteCount = (user.moderation.muteCount || 0) + 1;
    user.moderation.muteCount = muteCount;

    if (muteCount === 1) {
      user.moderation.holdUntil = new Date(now + 5 * 60 * 1000);
      result.message = '🔇 You have been muted for 5 minutes due to violations.';
    } else if (muteCount === 2) {
      user.moderation.holdUntil = new Date(now + 15 * 60 * 1000);
      result.message = '🔇 You have been muted for 15 minutes due to violations.';
    } else if (muteCount === 3) {
      user.moderation.holdUntil = new Date(now + 60 * 60 * 1000);
      result.message = '🔇 You have been muted for 60 minutes due to violations.';
    } else {
      result.action = 'kick';
      user.moderation.kickUntil = new Date(now + 30 * 60 * 1000);
      result.message = '🚫 You have been removed from this room due to repeated violations.';
    }
    result.until = result.action === 'hold' ? user.moderation.holdUntil : user.moderation.kickUntil;
  }

  if ((result.action === 'hold' || result.action === 'kick') && isFirstPunishment) {
    user.moderation.holdUntil = new Date(1); // Set to past so it's no longer null
    user.moderation.kickUntil = undefined;
    user.moderation.suspendedUntil = undefined;
    await originalSave();
    return {
      action: 'warn',
      blocked: true,
      message: '⚠ Please slow down. Repeated violations may temporarily restrict your chatting.'
    };
  }

  if (saveCalled) {
    await originalSave();
  }

  if (result.action === 'suspend') {
    addToReviewQueue(userId, user.username, 'suspension', message);
  } else if (result.action === 'kick') {
    addToReviewQueue(userId, user.username, 'kick', message);
  }

  return result;
};

/**
 * Format date objects to hh:mm AM/PM format
 */
function formatTime(date) {
  const d = new Date(date);
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const minStr = minutes < 10 ? '0' + minutes : minutes;
  return `${hours}:${minStr} ${ampm}`;
}

const reviewAppeal = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return { approved: false, reason: 'User not found' };

    const moderation = user.moderation;
    if (!moderation) return { approved: false, reason: 'No moderation data' };

    const now = Date.now();

    // Check total violations
    const totalViolations = (moderation.speedViolationsCount || 0) +
      (moderation.repeatedViolationsCount || 0) +
      (moderation.abuseViolationsCount || 0) +
      (moderation.unsafeImageCount || 0);

    // First time offenders get approved
    if (totalViolations <= 2) {
      // Remove punishment
      if (moderation.holdUntil && moderation.holdUntil > now) {
        user.moderation.holdUntil = null;
        user.moderation.holdReason = null;
      }
      if (moderation.kickUntil && moderation.kickUntil > now) {
        user.moderation.kickUntil = new Date(now + 5 * 60 * 1000); // reduce to 5 mins
        user.moderation.kickReason = 'reduced after appeal';
      }
      if (moderation.suspendedUntil && moderation.suspendedUntil > now) {
        user.moderation.suspendedUntil = new Date(now + 30 * 60 * 1000); // reduce to 30 mins
        user.moderation.suspensionReason = 'reduced after appeal';
      }
      user.moderation.riskLevel = 'suspicious';
      await user.save();
      return { approved: true, reason: 'First time violation. Punishment reduced.' };
    }

    // Repeat offenders (3-5 violations) get partial reduction
    if (totalViolations <= 5) {
      if (moderation.holdUntil && moderation.holdUntil > now) {
        // Reduce hold by half
        const remaining = new Date(moderation.holdUntil).getTime() - now;
        user.moderation.holdUntil = new Date(now + remaining / 2);
      }
      if (moderation.kickUntil && moderation.kickUntil > now) {
        const remaining = new Date(moderation.kickUntil).getTime() - now;
        user.moderation.kickUntil = new Date(now + remaining / 2);
      }
      // Suspensions not reduced for repeat offenders
      await user.save();
      return { approved: true, reason: 'Punishment reduced by 50%.' };
    }

    // High risk users — appeal rejected
    return { 
      approved: false, 
      reason: 'Due to repeated violations, this appeal cannot be approved automatically.' 
    };

  } catch (err) {
    console.error('Appeal review error:', err);
    return { approved: false, reason: 'Review failed. Please try again later.' };
  }
};

module.exports = {
  moderateMessage,
  formatTime,
  checkRoomProtection,
  roomProtection,
  reviewAppeal
};
