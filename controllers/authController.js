// const User = require('../models/User');
// const Driver = require('../models/Driver');
// const Session = require('../models/Session');
// const RefreshToken = require('../models/RefreshToken');
// const jwtHelper = require('../utils/jwtHelper');
// const { hashPin, isValidPinFormat } = require('../utils/pinHelper');
// const { sendWelcomeEmail, sendPasswordResetEmail } = require('../utils/emailHelper');
// const { sendOTP } = require('../utils/smsHelper');
// const { successResponse, errorResponse } = require('../utils/responseHelper');

// // Customer Signup
// exports.customerSignup = async (req, res) => {
//   try {
//     const { name, email, phone, password } = req.body;

//     // Check if user already exists
//     const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
//     if (existingUser) {
//       return errorResponse(res, 'User with this email or phone already exists', 400);
//     }

//     // Create user
//     const user = await User.create({
//       name,
//       email,
//       phone,
//       password,
//       role: 'customer'
//     });

//     // Generate tokens using correct function names
//     const accessToken = jwtHelper.generateAccessToken(user._id, user.role);
//     const refreshToken = jwtHelper.generateRefreshToken(user._id);

//     // Save refresh token
//     const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
//     await RefreshToken.create({
//       userId: user._id,
//       token: refreshToken,
//       expiresAt
//     });

//     // Create session
//     await Session.create({
//       userId: user._id,
//       token: accessToken,
//       deviceInfo: req.headers['user-agent'],
//       ipAddress: req.ip,
//       expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
//     });

//     // Send welcome email
//     await sendWelcomeEmail(user.email, user.name);

//     successResponse(res, 'Customer registered successfully', {
//       user: {
//         id: user._id,
//         name: user.name,
//         email: user.email,
//         phone: user.phone,
//         role: user.role
//       },
//       accessToken,
//       refreshToken
//     }, 201);
//   } catch (error) {
//     console.error('Signup Error:', error);
//     errorResponse(res, error.message);
//   }
// };

// // Customer Signin
// exports.customerSignin = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     // Find user
//     const user = await User.findOne({ email, role: 'customer' });
//     if (!user) {
//       return errorResponse(res, 'Invalid credentials', 401);
//     }

//     // Check if user is active
//     if (!user.isActive) {
//       return errorResponse(res, 'Account is deactivated', 403);
//     }

//     // Verify password
//     const isPasswordValid = await user.comparePassword(password);
//     if (!isPasswordValid) {
//       return errorResponse(res, 'Invalid credentials', 401);
//     }

//     // Generate tokens
//     const accessToken = jwtHelper.generateAccessToken(user._id, user.role);
//     const refreshToken = jwtHelper.generateRefreshToken(user._id);

//     // Save refresh token
//     const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
//     await RefreshToken.create({
//       userId: user._id,
//       token: refreshToken,
//       expiresAt
//     });

//     // Create session
//     await Session.create({
//       userId: user._id,
//       token: accessToken,
//       deviceInfo: req.headers['user-agent'],
//       ipAddress: req.ip,
//       expiresAt: new Date(Date.now() + 15 * 60 * 1000)
//     });

//     successResponse(res, 'Login successful', {
//       user: {
//         id: user._id,
//         name: user.name,
//         email: user.email,
//         phone: user.phone,
//         role: user.role
//       },
//       accessToken,
//       refreshToken
//     });
//   } catch (error) {
//     console.error('Signin Error:', error);
//     errorResponse(res, error.message);
//   }
// };

// // Refresh Token
// exports.refreshToken = async (req, res) => {
//   try {
//     const { refreshToken } = req.body;

//     if (!refreshToken) {
//       return errorResponse(res, 'Refresh token is required', 400);
//     }

//     // Verify refresh token
//     const decoded = jwtHelper.verifyToken(refreshToken);
//     if (!decoded) {
//       return errorResponse(res, 'Invalid or expired refresh token', 401);
//     }

//     // Check if refresh token exists and is active
//     const storedToken = await RefreshToken.findOne({
//       token: refreshToken,
//       userId: decoded.userId,
//       isActive: true,
//       expiresAt: { $gt: new Date() }
//     });

//     if (!storedToken) {
//       return errorResponse(res, 'Invalid or expired refresh token', 401);
//     }

//     // Get user
//     const user = await User.findById(decoded.userId);
//     if (!user || !user.isActive) {
//       return errorResponse(res, 'User not found or inactive', 401);
//     }

//     // Generate new access token
//     const newAccessToken = jwtHelper.generateAccessToken(user._id, user.role);

//     // Create new session
//     await Session.create({
//       userId: user._id,
//       token: newAccessToken,
//       deviceInfo: req.headers['user-agent'],
//       ipAddress: req.ip,
//       expiresAt: new Date(Date.now() + 15 * 60 * 1000)
//     });

//     successResponse(res, 'Token refreshed successfully', {
//       accessToken: newAccessToken
//     });
//   } catch (error) {
//     console.error('Refresh Token Error:', error);
//     errorResponse(res, error.message);
//   }
// };

// // Logout
// exports.logout = async (req, res) => {
//   try {
//     const token = req.token;

//     // Deactivate session
//     await Session.updateOne(
//       { token, userId: req.user._id },
//       { isActive: false }
//     );

//     successResponse(res, 'Logged out successfully');
//   } catch (error) {
//     console.error('Logout Error:', error);
//     errorResponse(res, error.message);
//   }
// };

// // Logout from all devices
// exports.logoutAll = async (req, res) => {
//   try {
//     // Deactivate all sessions
//     await Session.updateMany(
//       { userId: req.user._id },
//       { isActive: false }
//     );

//     // Deactivate all refresh tokens
//     await RefreshToken.updateMany(
//       { userId: req.user._id },
//       { isActive: false }
//     );

//     successResponse(res, 'Logged out from all devices successfully');
//   } catch (error) {
//     console.error('Logout All Error:', error);
//     errorResponse(res, error.message);
//   }
// };

// // Forgot Password
// exports.forgotPassword = async (req, res) => {
//   try {
//     const { email } = req.body;

//     // Find user
//     const user = await User.findOne({ email });
//     if (!user) {
//       // Don't reveal if user exists
//       return successResponse(res, 'If email exists, password reset link has been sent');
//     }

//     // Generate reset token
//     const resetToken = jwtHelper.generateResetToken(user._id);

//     // Save reset token to user
//     user.resetPasswordToken = resetToken;
//     user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
//     await user.save();

//     // Send reset email
//     await sendPasswordResetEmail(user.email, resetToken);

//     successResponse(res, 'Password reset link has been sent to your email');
//   } catch (error) {
//     console.error('Forgot Password Error:', error);
//     errorResponse(res, error.message);
//   }
// };
// ////using send grid
// // exports.forgotPassword = async (req, res) => {
// //   try {
// //     const { email } = req.body;

// //     const user = await User.findOne({ email });
// //     if (!user) {
// //       return successResponse(res, 'If email exists, reset link has been sent');
// //     }

// //     const resetToken = jwtHelper.generateResetToken(user._id);

// //     user.resetPasswordToken = resetToken;
// //     user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
// //     await user.save();

// //     // Email bhejo — agar fail ho toh catch jaayega
// //     await sendPasswordResetEmail(user.email, resetToken);

// //     successResponse(res, 'Password reset link sent to your email');
// //   } catch (error) {
// //     console.error('Forgot Password Error:', error.message);
// //     errorResponse(res, 'Failed to send reset email. Please try again.');
// //   }
// // };

// // Reset Password
// exports.resetPassword = async (req, res) => {
//   try {
//     const { resetToken, newPassword } = req.body;

//     // Verify reset token
//     const decoded = jwtHelper.verifyToken(resetToken);
//     if (!decoded || decoded.type !== 'reset') {
//       return errorResponse(res, 'Invalid or expired reset token', 400);
//     }

//     // Find user
//     const user = await User.findOne({
//       _id: decoded.userId,
//       resetPasswordToken: resetToken,
//       resetPasswordExpires: { $gt: new Date() }
//     });

//     if (!user) {
//       return errorResponse(res, 'Invalid or expired reset token', 400);
//     }

//     // Update password
//     user.password = newPassword;
//     user.resetPasswordToken = undefined;
//     user.resetPasswordExpires = undefined;
//     await user.save();

//     // Invalidate all sessions
//     await Session.updateMany(
//       { userId: user._id },
//       { isActive: false }
//     );

//     successResponse(res, 'Password reset successful');
//   } catch (error) {
//     console.error('Reset Password Error:', error);
//     errorResponse(res, error.message);
//   }
// };


// // Change Password
// exports.changePassword = async (req, res) => {
//   try {
//     const { currentPassword, newPassword } = req.body;

//     // Get user
//     const user = await User.findById(req.user._id);

//     // Verify current password
//     const isPasswordValid = await user.comparePassword(currentPassword);
//     if (!isPasswordValid) {
//       return errorResponse(res, 'Current password is incorrect', 401);
//     }

//     // Update password
//     user.password = newPassword;
//     await user.save();

//     // Invalidate all other sessions
//     await Session.updateMany(
//       { userId: user._id, token: { $ne: req.token } },
//       { isActive: false }
//     );

//     successResponse(res, 'Password changed successfully');
//   } catch (error) {
//     console.error('Change Password Error:', error);
//     errorResponse(res, error.message);
//   }
// };

const User = require('../models/User');
const Session = require('../models/Session');
const RefreshToken = require('../models/RefreshToken');
const jwtHelper = require('../utils/jwtHelper');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../utils/emailHelper');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const bcrypt = require('bcryptjs');

// Customer Signup
exports.customerSignup = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { phone }] 
    });
    
    if (existingUser) {
      if (existingUser.email === email) {
        return errorResponse(res, 'Email is already registered', 400);
      }
      if (existingUser.phone === phone) {
        return errorResponse(res, 'Phone number is already registered', 400);
      }
    }

    // Create user (password will be hashed by pre-save middleware)
    const user = await User.create({
      name,
      email,
      phone,
      password,
      role: 'customer'
    });

    // Generate tokens
    const accessToken = jwtHelper.generateAccessToken(user._id, user.role);
    const refreshToken = jwtHelper.generateRefreshToken(user._id);

    // Calculate expiry dates
    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const accessTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Save refresh token
    await RefreshToken.create({
      userId: user._id,
      token: refreshToken,
      expiresAt: refreshTokenExpiry
    });

    // Create session
    await Session.create({
      userId: user._id,
      token: accessToken,
      deviceInfo: req.headers['user-agent'] || 'Unknown',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'Unknown',
      expiresAt: accessTokenExpiry
    });

    // Send welcome email (don't wait for it)
    sendWelcomeEmail(user.email, user.name).catch(err => 
      console.error('Welcome email error:', err)
    );

    return successResponse(res, 'Customer registered successfully', {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      },
      accessToken,
      refreshToken
    }, 201);

  } catch (error) {
    console.error('Customer Signup Error:', error);
    
    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return errorResponse(res, errors[0], 400);
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return errorResponse(res, `${field} is already registered`, 400);
    }
    
    return errorResponse(res, error.message || 'Registration failed', 500);
  }
};

// Customer Signin
exports.customerSignin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return errorResponse(res, 'Email and password are required', 400);
    }

    // Find user (include password for comparison)
    const user = await User.findOne({ email, role: 'customer' }).select('+password');
    
    if (!user) {
      return errorResponse(res, 'Invalid email or password', 401);
    }

    // Check if user is active
    if (!user.isActive) {
      return errorResponse(res, 'Your account has been deactivated. Please contact support.', 403);
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return errorResponse(res, 'Invalid email or password', 401);
    }

    // Generate tokens
    const accessToken = jwtHelper.generateAccessToken(user._id, user.role);
    const refreshToken = jwtHelper.generateRefreshToken(user._id);

    // Calculate expiry dates
    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const accessTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);

    // Save refresh token
    await RefreshToken.create({
      userId: user._id,
      token: refreshToken,
      expiresAt: refreshTokenExpiry
    });

    // Create session
    await Session.create({
      userId: user._id,
      token: accessToken,
      deviceInfo: req.headers['user-agent'] || 'Unknown',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'Unknown',
      expiresAt: accessTokenExpiry
    });

    // Remove password from response
    user.password = undefined;

    return successResponse(res, 'Login successful', {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profileImage: user.profileImage
      },
      accessToken,
      refreshToken
    });

  } catch (error) {
    console.error('Customer Signin Error:', error);
    return errorResponse(res, 'Login failed. Please try again.', 500);
  }
};

// Refresh Token
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return errorResponse(res, 'Refresh token is required', 400);
    }

    // Verify refresh token
    const decoded = jwtHelper.verifyToken(refreshToken);
    
    if (!decoded) {
      return errorResponse(res, 'Invalid or expired refresh token', 401);
    }

    // Check if refresh token exists in database
    const storedToken = await RefreshToken.findOne({
      token: refreshToken,
      userId: decoded.userId,
      isActive: true,
      expiresAt: { $gt: new Date() }
    });

    if (!storedToken) {
      return errorResponse(res, 'Refresh token not found or expired', 401);
    }

    // Get user
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.isActive) {
      return errorResponse(res, 'User not found or inactive', 401);
    }

    // Generate new access token
    const newAccessToken = jwtHelper.generateAccessToken(user._id, user.role);
    const accessTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);

    // Create new session
    await Session.create({
      userId: user._id,
      token: newAccessToken,
      deviceInfo: req.headers['user-agent'] || 'Unknown',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'Unknown',
      expiresAt: accessTokenExpiry
    });

    return successResponse(res, 'Token refreshed successfully', {
      accessToken: newAccessToken
    });

  } catch (error) {
    console.error('Refresh Token Error:', error);
    return errorResponse(res, 'Token refresh failed', 401);
  }
};

// Logout
exports.logout = async (req, res) => {
  try {
    const token = req.token;

    // Deactivate current session
    await Session.updateOne(
      { token, userId: req.user._id, isActive: true },
      { $set: { isActive: false } }
    );

    return successResponse(res, 'Logged out successfully');

  } catch (error) {
    console.error('Logout Error:', error);
    return errorResponse(res, 'Logout failed', 500);
  }
};

// Logout from All Devices
exports.logoutAll = async (req, res) => {
  try {
    // Deactivate all sessions
    await Session.updateMany(
      { userId: req.user._id, isActive: true },
      { $set: { isActive: false } }
    );

    // Deactivate all refresh tokens
    await RefreshToken.updateMany(
      { userId: req.user._id, isActive: true },
      { $set: { isActive: false } }
    );

    return successResponse(res, 'Logged out from all devices successfully');

  } catch (error) {
    console.error('Logout All Error:', error);
    return errorResponse(res, 'Logout failed', 500);
  }
};

// Forgot Password
// exports.forgotPassword = async (req, res) => {
//   try {
//     const { email } = req.body;

//     if (!email) {
//       return errorResponse(res, 'Email is required', 400);
//     }

//     // Find user
//     const user = await User.findOne({ email });
    
//     // Always return success message (security best practice)
//     if (!user) {
//       return successResponse(res, 'If your email exists in our system, you will receive a password reset link');
//     }

//     // Generate reset token
//     const resetToken = jwtHelper.generateResetToken(user._id);

//     // Save reset token and expiry
//     user.resetPasswordToken = resetToken;
//     user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
//     await user.save({ validateBeforeSave: false });

//     // Send reset email (don't wait)
//     sendPasswordResetEmail(user.email, resetToken).catch(err =>
//       console.error('Password reset email error:', err)
//     );

//     return successResponse(res, 'If your email exists in our system, you will receive a password reset link');

//   } catch (error) {
//     console.error('Forgot Password Error:', error);
//     return errorResponse(res, 'Password reset request failed', 500);
//   }
// };

// Forgot Password - 100% WORKING
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return errorResponse(res, 'Email is required', 400);
    }

    const user = await User.findOne({ email });
    
    // Hamesha success dikhao (security)
    if (!user) {
      return successResponse(res, 'If email exists, reset link has been sent');
    }

    // Generate reset token
    const resetToken = jwtHelper.generateResetToken(user._id);

    // Save in DB
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save({ validateBeforeSave: false });

    // Yeh link email mein bhejna hai
    const resetLink = `https://yourapp.com/reset-password?token=${resetToken}`;
    // Ya phir frontend route: http://localhost:3000/reset-password/${resetToken}

    // Email bhejo
    await sendPasswordResetEmail(user.email, resetLink);

    return successResponse(res, 'Password reset link sent to your email');

  } catch (error) {
    console.error('Forgot Password Error:', error);
    return errorResponse(res, 'Failed to send reset email', 500);
  }
};

// Reset Password
// exports.resetPassword = async (req, res) => {
//   try {
//     const { resetToken, newPassword } = req.body;

//     // Validate input
//     if (!resetToken || !newPassword) {
//       return errorResponse(res, 'Reset token and new password are required', 400);
//     }

//     // Validate password length
//     if (newPassword.length < 6) {
//       return errorResponse(res, 'Password must be at least 6 characters long', 400);
//     }

//     // Verify reset token
//     const decoded = jwtHelper.verifyToken(resetToken);
    
//     if (!decoded || decoded.type !== 'reset') {
//       return errorResponse(res, 'Invalid or expired reset token', 400);
//     }

//     // Find user with valid reset token
//     const user = await User.findOne({
//       _id: decoded.userId,
//       resetPasswordToken: resetToken,
//       resetPasswordExpires: { $gt: new Date() }
//     });

//     if (!user) {
//       return errorResponse(res, 'Invalid or expired reset token', 400);
//     }

//     // Update password (will be hashed by pre-save middleware)
//     user.password = newPassword;
//     user.resetPasswordToken = undefined;
//     user.resetPasswordExpires = undefined;
//     await user.save();

//     // Invalidate all existing sessions
//     await Session.updateMany(
//       { userId: user._id, isActive: true },
//       { $set: { isActive: false } }
//     );

//     // Invalidate all refresh tokens
//     await RefreshToken.updateMany(
//       { userId: user._id, isActive: true },
//       { $set: { isActive: false } }
//     );

//     return successResponse(res, 'Password reset successful. Please login with your new password.');

//   } catch (error) {
//     console.error('Reset Password Error:', error);
//     return errorResponse(res, 'Password reset failed', 500);
//   }
// };


exports.resetPasswordWithToken = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return errorResponse(res, 'Token and new password are required', 400);
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return errorResponse(res, 'Invalid or expired reset token', 401);
    }

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // Check if token matches and not expired
    if (user.resetPasswordToken !== token || user.resetPasswordExpires < new Date()) {
      return errorResponse(res, 'Invalid or expired reset token', 400);
    }

    // YEHI FINAL FIX — Direct update karo, save() mat use karo!
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          password: hashedPassword,
          resetPasswordToken: null,
          resetPasswordExpires: null
        }
      }
    );

    // Invalidate all sessions
    await Session.updateMany({ userId: user._id }, { isActive: false });
    await RefreshToken.updateMany({ userId: user._id }, { isActive: false });

    return successResponse(res, 'Password reset successful! Please login with new password.');

  } catch (error) {
    console.error('Reset Password Error:', error);
    return errorResponse(res, 'Server error', 500);
  }
};

// Change Password
// exports.changePassword = async (req, res) => {
//   try {
//     const { currentPassword, newPassword } = req.body;

//     // Validate input
//     if (!currentPassword || !newPassword) {
//       return errorResponse(res, 'Current password and new password are required', 400);
//     }

//     // Validate new password length
//     if (newPassword.length < 6) {
//       return errorResponse(res, 'New password must be at least 6 characters long', 400);
//     }

//     // Check if new password is same as current
//     if (currentPassword === newPassword) {
//       return errorResponse(res, 'New password must be different from current password', 400);
//     }

//     // Get user with password field
//     const user = await User.findById(req.user._id).select('+password');

//     if (!user) {
//       return errorResponse(res, 'User not found', 404);
//     }

//     // Verify current password
//     const isPasswordValid = await user.comparePassword(currentPassword);
    
//     if (!isPasswordValid) {
//       return errorResponse(res, 'Current password is incorrect', 401);
//     }

//     // Update password (will be hashed by pre-save middleware)
//     user.password = newPassword;
//     await user.save();

//     // Invalidate all other sessions (keep current session active)
//     await Session.updateMany(
//       { 
//         userId: user._id, 
//         token: { $ne: req.token },
//         isActive: true 
//       },
//       { $set: { isActive: false } }
//     );

//     // Invalidate all refresh tokens except current
//     await RefreshToken.updateMany(
//       { 
//         userId: user._id,
//         isActive: true 
//       },
//       { $set: { isActive: false } }
//     );

//     return successResponse(res, 'Password changed successfully. Other sessions have been logged out.');

//   } catch (error) {
//     console.error('Change Password Error:', error);
//     return errorResponse(res, 'Password change failed', 500);
//   }
// };

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return errorResponse(res, 'Both passwords are required', 400);
    }

    if (newPassword.length < 6) {
      return errorResponse(res, 'New password must be at least 6 characters', 400);
    }

    if (currentPassword === newPassword) {
      return errorResponse(res, 'New password must be different', 400);
    }

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');
    if (!user) return errorResponse(res, 'User not found', 404);

    // Check current password
    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) return errorResponse(res, 'Current password is wrong', 401);

    // YEHI FIX — Direct update karo, validation bypass!
    const hashed = await bcrypt.hash(newPassword, 10);

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          password: hashed
        }
      }
    );

    // Logout from all other devices
    await Session.updateMany(
      { userId: user._id, token: { $ne: req.token } },
      { isActive: false }
    );

    await RefreshToken.updateMany(
      { userId: user._id },
      { isActive: false }
    );

    return successResponse(res, 'Password changed successfully!');

  } catch (error) {
    console.error('Change Password Error:', error);
    return errorResponse(res, 'Failed to change password', 500);
  }
};