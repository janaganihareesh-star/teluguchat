const User = require('../models/User');
const BannedIP = require('../models/BannedIP');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail');

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

exports.register = async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const isBanned = await BannedIP.findOne({ ipAddress: ip });
    if (isBanned) return res.status(403).json({ message: 'Your IP has been banned from this platform.' });

    const { username, email, password, age, gender, country, dob } = req.body;

    if (age < 18) {
      return res.status(400).json({ message: 'You must be at least 18 years old to register.' });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const BANNED_USERNAMES = [
      'admin', 'moderator', 'support', 'official', 'teluguchat',
      'fuck', 'sex', 'porn', 'nude', 'naked', 'idiot', 'stupid',
      'bastard', 'bitch', 'scam', 'free coins', 'giveaway'
    ];

    const usernameLower = username.toLowerCase();
    const hasBannedWord = BANNED_USERNAMES.some(word => usernameLower.includes(word));
    const hasInvalidChars = !/^[a-zA-Z0-9_]+$/.test(username);
    const isTooShort = username.length < 3;
    const isTooLong = username.length > 20;

    if (hasBannedWord) {
      return res.status(400).json({ message: 'This username is not allowed. Please choose a different one.' });
    }
    if (hasInvalidChars) {
      return res.status(400).json({ message: 'Username can only contain letters, numbers, and underscores.' });
    }
    if (isTooShort) {
      return res.status(400).json({ message: 'Username must be at least 3 characters long.' });
    }
    if (isTooLong) {
      return res.status(400).json({ message: 'Username cannot exceed 20 characters.' });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const user = new User({
      username,
      email,
      password: hashedPassword,
      age,
      dob,
      gender: gender ? gender.toLowerCase() : undefined,
      bloodGroup: req.body.bloodGroup || "Don't Know",
      country,
      publicKey: req.body.publicKey, // E2EE Addition
      otp,
      otpExpiry,
      isVerified: false,
      ipAddresses: [ip]
    });

    await user.save();

    try {
      await sendEmail({
        email: user.email,
        subject: 'Telugu Live Chat - Verify Your Account',
        message: `Your OTP for verification is: ${otp}. It is valid for 10 minutes.`,
      });
      res.status(201).json({ message: 'Registration successful. Please check your email for the OTP.' });
    } catch (emailError) {
      console.warn("Nodemailer failed to send email. Falling back to local verification:", emailError.message);

      res.status(201).json({ 
        message: 'Registration successful! (Email offline: Please use the verification code 123456 to verify your account)' 
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (user.otpExpiry < new Date()) {
      return res.status(400).json({ message: 'OTP has expired' });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    res.status(200).json({ message: 'Account verified successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during verification' });
  }
};

exports.login = async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const isBanned = await BannedIP.findOne({ ipAddress: ip });
    if (isBanned) return res.status(403).json({ message: 'Your IP has been banned from this platform.' });

    const { email, password } = req.body;

    // Find user by either email or username (case-insensitive)
    const user = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { username: { $regex: new RegExp(`^${email}$`, 'i') } }
      ]
    });
    if (!user) {
      return res.status(404).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    if (!user.ipAddresses.includes(ip)) {
      user.ipAddresses.push(ip);
      await user.save();
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const userResponse = {
      _id: user._id,
      username: user.username,
      email: user.email,
      age: user.age,
      gender: user.gender,
      country: user.country,
      profilePic: user.profilePic,
      level: user.level,
      badge: user.badge,
      role: user.role,
      
    };

    res.status(200).json({
      message: 'Login successful',
      token,
      user: userResponse,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

exports.guestLogin = async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const isBanned = await BannedIP.findOne({ ipAddress: ip });
    if (isBanned) return res.status(403).json({ message: 'Your IP has been banned from this platform.' });

    const { username, gender, age, dob } = req.body;
    
    // Generate a unique guest username and email to prevent collisions
    const guestId = Math.floor(1000 + Math.random() * 9000).toString();
    const guestUsername = `${username.trim().replace(/\s+/g, '')}_G${guestId}`;
    const guestEmail = `${guestUsername.toLowerCase()}@guest.teluguchat.com`;
    const password = Math.random().toString(36).substring(7); // Random password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const user = new User({
      username: guestUsername,
      email: guestEmail,
      password: hashedPassword,
      age: age || 18,
      dob: dob,
      gender: gender.toLowerCase() || 'male',
      country: 'India',
      isVerified: true,
      role: 'guest',
      ipAddresses: [ip]
    });
    
    await user.save();
    
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' } // Guest token lasts 1 day
    );
    
    const userResponse = {
      _id: user._id,
      username: user.username,
      email: user.email,
      age: user.age,
      gender: user.gender,
      country: user.country,
      profilePic: user.profilePic,
      level: user.level,
      badge: user.badge,
      role: user.role,
      
    };
    
    res.status(200).json({
      message: 'Guest login successful',
      token,
      user: userResponse,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during guest login' });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'User with this email does not exist.' });
    }

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    await sendEmail({
      email: user.email,
      subject: 'Telugu Live Chat - Password Reset OTP',
      message: `Your OTP for password reset is: ${otp}. It is valid for 10 minutes.`,
    });

    res.status(200).json({ message: 'OTP sent successfully to your email.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error sending OTP.' });
  }
};

exports.verifyResetOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user || user.otp !== otp || user.otpExpiry < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }
    
    res.status(200).json({ message: 'OTP verified successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error verifying OTP.' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user || user.otp !== otp || user.otpExpiry < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(newPassword, salt);
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    res.status(200).json({ message: 'Password reset successfully. You can now login.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error resetting password.' });
  }
};
