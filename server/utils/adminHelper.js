const User = require('../models/User');

const getOrCreateSystemAdmin = async () => {
  try {
    let admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      admin = await User.findOne({ username: 'Admin' });
    }
    if (!admin) {
      admin = new User({
        username: 'Admin',
        email: 'admin@system.local',
        password: 'system-password-placeholder-not-accessible',
        age: 18,
        role: 'admin',
        level: 100,
        gender: 'male',
        isOnline: true
      });
      await admin.save();
    }
    return admin;
  } catch (err) {
    console.error('Error finding or creating system admin:', err);
    return null;
  }
};

module.exports = { getOrCreateSystemAdmin };
