const crypto = require('crypto');

// Generate 6-digit OTP
exports.generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate 4-digit OTP
exports.generateShortOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// Generate random token
exports.generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Hash OTP (optional, for added security)
exports.hashOTP = async (otp) => {
  const bcrypt = require('bcryptjs');
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(otp, salt);
};

// Verify hashed OTP
exports.verifyOTP = async (inputOtp, hashedOtp) => {
  const bcrypt = require('bcryptjs');
  return await bcrypt.compare(inputOtp, hashedOtp);
};