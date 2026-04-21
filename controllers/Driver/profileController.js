const User = require('../../models/User');
const Driver = require('../../models/Driver');
const { successResponse, errorResponse } = require('../../utils/responseHelper');
const fs = require('fs');
const path = require('path');

// Get User Profile
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // If driver, get driver details too
    if (user.role === 'driver') {
      const driver = await Driver.findOne({ userId: user._id });
      return successResponse(res, 'Profile retrieved successfully', {
        user,
        driver
      });
    }

    successResponse(res, 'Profile retrieved successfully', { user });
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// Update User Profile
exports.updateUserProfile = async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    // Check if email or phone already exists for another user
    if (email || phone) {
      const existingUser = await User.findOne({
        _id: { $ne: req.user._id },
        $or: [
          ...(email ? [{ email }] : []),
          ...(phone ? [{ phone }] : [])
        ]
      });

      if (existingUser) {
        return errorResponse(res, 'Email or phone already in use', 400);
      }
    }

    // Update user
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    successResponse(res, 'Profile updated successfully', { user });
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// Upload Profile Image
exports.uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, 'No file uploaded', 400);
    }

    const user = await User.findById(req.user._id);

    // Delete old profile image if exists
    if (user.profileImage) {
      const oldImagePath = path.join(__dirname, '..', user.profileImage);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    // Save new image path
    const imagePath = `/uploads/profiles/${req.file.filename}`;
    user.profileImage = imagePath;
    await user.save();

    successResponse(res, 'Profile image uploaded successfully', {
      profileImage: imagePath
    });
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// Update Driver Profile
exports.updateDriverProfile = async (req, res) => {
  try {
    const {
      licenseNumber,
      vehicleType,
      vehicleNumber,
      vehicleModel,
      vehicleColor
    } = req.body;

    const driver = await Driver.findOne({ userId: req.user._id });

    if (!driver) {
      return errorResponse(res, 'Driver profile not found', 404);
    }

    // Check if license or vehicle number already exists for another driver
    if (licenseNumber || vehicleNumber) {
      const existingDriver = await Driver.findOne({
        _id: { $ne: driver._id },
        $or: [
          ...(licenseNumber ? [{ licenseNumber }] : []),
          ...(vehicleNumber ? [{ vehicleNumber }] : [])
        ]
      });

      if (existingDriver) {
        return errorResponse(res, 'License or vehicle number already registered', 400);
      }
    }

    // Update driver
    if (licenseNumber) driver.licenseNumber = licenseNumber;
    if (vehicleType) driver.vehicleType = vehicleType;
    if (vehicleNumber) driver.vehicleNumber = vehicleNumber;
    if (vehicleModel) driver.vehicleModel = vehicleModel;
    if (vehicleColor) driver.vehicleColor = vehicleColor;

    await driver.save();

    successResponse(res, 'Driver profile updated successfully', { driver });
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// Delete Account
exports.deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;

    // Get user
    const user = await User.findById(req.user._id);

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return errorResponse(res, 'Invalid password', 401);
    }

    // Soft delete - deactivate account
    user.isActive = false;
    await user.save();

    // If driver, deactivate driver profile too
    if (user.role === 'driver') {
      await Driver.updateOne(
        { userId: user._id },
        { isAvailable: false }
      );
    }

    successResponse(res, 'Account deleted successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
};