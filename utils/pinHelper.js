// const bcrypt = require('bcryptjs');
// const crypto = require('crypto');

// // Hash 4-digit PIN
// exports.hashPin = async (pin) => {
//   const salt = await bcrypt.genSalt(10);
//   return await bcrypt.hash(pin, salt);
// };

// // Validate PIN
// exports.validatePin = async (inputPin, hashedPin) => {
//   return await bcrypt.compare(inputPin, hashedPin);
// };

// // Generate Random 4-digit PIN
// exports.generateRandomPin = () => {
//   return Math.floor(1000 + Math.random() * 9000).toString();
// };

// // Generate Reset Token
// exports.generateResetToken = () => {
//   return crypto.randomBytes(32).toString('hex');
// };

// // Validate PIN format
// exports.isValidPinFormat = (pin) => {
//   return /^\d{4}$/.test(pin);
// };


const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Hash 4-digit PIN
exports.hashPin = async (pin) => {
  try {
    // Convert PIN to string if it's a number
    const pinString = String(pin);
    
    // Generate salt and hash
    const salt = await bcrypt.genSalt(10);
    const hashedPin = await bcrypt.hash(pinString, salt);
    
    return hashedPin;
  } catch (error) {
    console.error('Hash PIN Error:', error);
    throw new Error('Failed to hash PIN');
  }
};

// Validate PIN
exports.validatePin = async (inputPin, hashedPin) => {
  try {
    // Convert PIN to string if it's a number
    const pinString = String(inputPin);
    
    // Compare PIN with hashed PIN
    const isValid = await bcrypt.compare(pinString, hashedPin);
    
    return isValid;
  } catch (error) {
    console.error('Validate PIN Error:', error);
    throw new Error('Failed to validate PIN');
  }
};

// Generate Random 4-digit PIN
exports.generateRandomPin = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// Generate Reset Token (for forgot PIN)
exports.generateResetToken = () => {
  // Generate 6-digit random code
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Validate PIN format (must be exactly 4 digits)
exports.isValidPinFormat = (pin) => {
  // Convert to string and check if it's exactly 4 digits
  const pinString = String(pin);
  return /^\d{4}$/.test(pinString);
};

// Hash Password (alternative method if needed)
exports.hashPassword = async (password) => {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
  } catch (error) {
    console.error('Hash Password Error:', error);
    throw new Error('Failed to hash password');
  }
};

// Validate Password
exports.validatePassword = async (inputPassword, hashedPassword) => {
  try {
    const isValid = await bcrypt.compare(inputPassword, hashedPassword);
    return isValid;
  } catch (error) {
    console.error('Validate Password Error:', error);
    throw new Error('Failed to validate password');
  }
};