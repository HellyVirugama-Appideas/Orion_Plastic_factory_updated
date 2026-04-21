module.exports = {
  secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  accessTokenExpiry: '7d',
  refreshTokenExpiry: '7d',
  resetTokenExpiry: '1h',
};