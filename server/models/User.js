const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  age: { type: Number, required: true, min: 18 },
  dob: { type: Date },
  infoEdited: { type: Boolean, default: false },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  country: { type: String },
  profilePic: { type: String, default: 'https://res.cloudinary.com/demo/image/upload/v1519759714/avatar.png' },
  bio: { type: String },
  level: { type: Number, default: 1 },
  xp: { type: Number, default: 0 },
  coins: { type: Number, default: 0 },
  badge: { type: String, default: 'none' },
  role: { type: String, enum: ['user', 'admin', 'guest'], default: 'user' },
  isVerified: { type: Boolean, default: false },
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  restrictedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  ignoredUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  mutedUntil: { type: Date },
  otp: { type: String },
  otpExpiry: { type: Date },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  motto: { type: String, default: '' },
  relationshipStatus: { type: String, enum: ['Single', 'In a relationship', 'Committed', 'Married', 'It\'s complicated', 'None'], default: 'None' },
  instagram: { type: String, default: '' },
  facebook: { type: String, default: '' },
  profileColor: { type: String, default: '#6366f1' },
  coverPhoto: { type: String, default: 'linear-gradient(135deg, #4f46e5, #ec4899)' },
  friendRequestsSent: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  preferences: {
    call: { type: String, enum: ['On', 'Off'], default: 'On' },
    privateChat: { type: String, enum: ['On', 'Off'], default: 'On' },
    memberTextColors: { type: String, enum: ['On', 'Off'], default: 'On' },
    autoPlayMusic: { type: String, enum: ['On', 'Off'], default: 'On' },
    friendRequest: { type: String, enum: ['On', 'Off'], default: 'On' },
    loginMethod: { type: String, enum: ['Username or email', 'Username only', 'Email only'], default: 'Username or email' }
  },
  privacy: {
    showAge: { type: Boolean, default: true },
    showGender: { type: Boolean, default: true },
    showLocation: { type: Boolean, default: true },
    showFriendList: { type: Boolean, default: true },
    showGiftList: { type: Boolean, default: true }
  },
  settings: {
    language: { type: String, default: 'English' },
    timezone: { type: String, default: 'Asia/Kolkata' }
  },

  likes: { type: Number, default: 0 },
  likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  messageCount: { type: Number, default: 0 },
  onlineMinutes: { type: Number, default: 0 },
  gifts: [{
    name: { type: String, required: true },
    icon: { type: String, required: true },
    count: { type: Number, default: 1 }
  }],
  moderation: {
    riskLevel: { type: String, enum: ['clean', 'suspicious', 'high-risk'], default: 'clean' },
    warningsCount: { type: Number, default: 0 },
    speedViolationsCount: { type: Number, default: 0 },
    repeatedViolationsCount: { type: Number, default: 0 },
    abuseViolationsCount: { type: Number, default: 0 },
    unsafeImageCount: { type: Number, default: 0 },
    holdUntil: { type: Date },
    holdStart: { type: Date },
    holdReason: { type: String },
    kickUntil: { type: Date },
    kickStart: { type: Date },
    kickReason: { type: String },
    suspendedUntil: { type: Date },
    suspensionReason: { type: String },
    visibilityLimitedUntil: { type: Date },
    visibilityLimitedStart: { type: Date },
    reportsReceivedCount: { type: Number, default: 0 }
  }
});

module.exports = mongoose.model('User', userSchema);
