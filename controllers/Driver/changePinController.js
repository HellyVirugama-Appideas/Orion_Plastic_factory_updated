// controllers/driver/changePinController.js

const Driver = require('../../models/Driver');
const Session = require('../../models/Session');
const bcrypt = require('bcryptjs');
const { successResponse, errorResponse } = require('../../utils/responseHelper');

// exports.verifyOldPin = async (req, res) => {
//   try {
//     const { oldPin } = req.body;
//     const driver = req.user;

//     if (!oldPin || !/^\d{4}$/.test(oldPin)) {
//       return errorResponse(res, 'Enter valid 4-digit old PIN', 400);
//     }

//     const isMatch = await driver.comparePin(oldPin);
//     if (!isMatch) {
//       return errorResponse(res, 'Incorrect old PIN', 400);
//     }

//     await Session.replaceOne(
//       { driverId: driver._id },
//       {
//         driverId: driver._id,
//         type: 'change_pin',
//         oldPinVerified: true,
//         newPin: null
//       },
//       { upsert: true }
//     );

//     return successResponse(res, 'Old PIN verified!', {
//       message: 'Now create your new 4-digit PIN'
//     });

//   } catch (error) {
//     console.error(error);
//     return errorResponse(res, 'Server error', 500);
//   }
// };

exports.verifyOldPin = async (req, res) => {
  try {
    const { oldPin } = req.body;
    const driver = req.user;

    if (!oldPin || !/^\d{4}$/.test(oldPin)) {
      return errorResponse(res, 'Enter valid 4-digit old PIN', 400);
    }

    const isMatch = await driver.comparePin(oldPin);
    if (!isMatch) {
      return errorResponse(res, 'Incorrect old PIN', 400);
    }

    // Use findOneAndUpdate with compound query (driverId + type)
    await Session.findOneAndUpdate(
      { driverId: driver._id, type: 'change_pin' },
      {
        driverId: driver._id,
        type: 'change_pin',
        oldPinVerified: true,
        newPin: null,
        verified: false
        // Do NOT set token at all
      },
      { upsert: true, new: true }
    );

    return successResponse(res, 'Old PIN verified!', {
      message: 'Now create your new 4-digit PIN'
    });

  } catch (error) {
    console.error('Verify old PIN error:', error);
    if (error.code === 11000) {
      return errorResponse(res, 'Session conflict. Please try again.', 409);
    }
    return errorResponse(res, 'Server error', 500);
  }
};

exports.setNewpin = async (req, res) => {
  try {
    const { newPin } = req.body;
    const driver = req.user;

    if (!/^\d{4}$/.test(newPin)) {
      return errorResponse(res, 'New PIN must be 4 digits', 400);
    }

    const session = await Session.findOneAndUpdate(
      { driverId: driver._id, type: 'change_pin', oldPinVerified: true },
      { newPin },
      { new: true }
    );

    if (!session) {
      return errorResponse(res, 'Please verify old PIN first', 400);
    }

    return successResponse(res, 'New PIN saved', {
      message: 'Now confirm your PIN'
    });

  } catch (error) {
    console.error(error);
    return errorResponse(res, 'Failed', 500);
  }
};

exports.confirmAndChangePin = async (req, res) => {
  try {
    const { confirmPin } = req.body;
    const driver = req.user;

    const session = await Session.findOne({
      driverId: driver._id,
      type: 'change_pin',
      oldPinVerified: true
    });

    if (!session || !session.newPin) {
      return errorResponse(res, 'Session expired or invalid', 400);
    }

    if (session.newPin !== confirmPin) {
      return errorResponse(res, 'PINs do not match', 400);
    }

    const isSame = await driver.comparePin(confirmPin);
    if (isSame) {
      return errorResponse(res, 'New PIN cannot be same as old', 400);
    }

    const salt = await bcrypt.genSalt(10);
    driver.pin = await bcrypt.hash(confirmPin, salt);
    await driver.save();

    // Clean up session
    await Session.deleteOne({ driverId: driver._id, type: 'change_pin' });

    return successResponse(res, 'PIN changed successfully!', {
      message: 'Your PIN has been updated'
    });

  } catch (error) {
    console.error(error);
    return errorResponse(res, 'Failed', 500);
  }
};