const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');

// Generate Access Token
// exports.generateAccessToken = (userId, role) => {
//   return jwt.sign(
//     { userId, role },
//     jwtConfig.secret,
//     { expiresIn: jwtConfig.accessTokenExpiry }
//   );
// };

// utils/jwtHelper.js
// exports.generateAccessToken = (userId, role) => {
//   return jwt.sign(
//     { userId, role }, 
//     process.env.JWT_SECRET,   
//     { expiresIn: process.env.JWT_EXPIRE || '7d' }
//   );
// };

// jwtHelper.js
exports.generateAccessToken = (userId, role) => {
  return jwt.sign(
    {
      id: userId,        
      role: role
    },
    process.env.JWT_SECRET,
    { expiresIn: '90d' }
  );
};

// Generate Refresh Token
exports.generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId },
    jwtConfig.secret,
    { expiresIn: jwtConfig.refreshTokenExpiry }
  );
};

// Generate Reset Token
exports.generateResetToken = (userId) => {
  return jwt.sign(
    { userId, type: 'reset' },
    jwtConfig.secret,
    { expiresIn: jwtConfig.resetTokenExpiry }
  );
};

// Verify Token
exports.verifyToken = (token) => {
  try {
    return jwt.verify(token, jwtConfig.secret);
  } catch (error) {
    return null;
  }
};

// Decode Token (without verification)
exports.decodeToken = (token) => {
  return jwt.decode(token);
};
