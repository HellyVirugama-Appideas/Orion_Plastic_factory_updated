// // const Driver = require('../../models/Driver');
// // const { successResponse, errorResponse } = require('../../utils/responseHelper');
// // const bcrypt = require('bcryptjs');

// // // In-memory session (production mein Redis ya DB use karna)
// // const Sessions = {};

// // // 1. Phone + Emirates → OTP 
// // exports.sendPinResetOtp = async (req, res) => {
// //   try {
// //     const { phone, emiratesId } = req.body;

// //     if (!phone || !emiratesId) {
// //       return errorResponse(res, 'Phone number and Emirates ID are required', 400);
// //     }

// //     if (!/^[0-9]{10}$/.test(phone)) {
// //       return errorResponse(res, 'Valid 10-digit phone number required', 400);
// //     }

// //     const driver = await Driver.findOne({
// //       phone: phone.trim(),
// //       'governmentIds.emiratesId': emiratesId.trim(),
// //       profileStatus: 'approved'
// //     });

// //     if (!driver) {
// //       return errorResponse(res, 'No approved driver found with these details', 404);
// //     }

// //     // Generate 4-digit OTP
// //     const otp = Math.floor(1000 + Math.random() * 9000).toString();
// //     const otpExpires = Date.now() + 5 * 60 * 1000; // 5 min

// //     Sessions[driver._id.toString()] = {
// //       otp,
// //       otpExpires,
// //       phone,
// //       emiratesId,
// //       verified: false,
// //       newPin: null
// //     };

// //     console.log(`PIN Reset OTP → ${driver.name} (${phone}): ${otp}`);

// //     // TODO: Real SMS bhejo
// //     // await sendSMS(phone, `Your PIN reset code is ${otp}. Valid for 5 minutes.`);

// //     return successResponse(res, 'OTP sent successfully!', {
// //       driverId: driver._id,
// //       name: driver.name,
// //       otp : otp,
// //       maskedPhone: phone.replace(/(\d{6})\d{4}/, '$1****')
// //     });

// //   } catch (error) {
// //     console.error('Send OTP Error:', error);
// //     return errorResponse(res, 'Server error', 500);
// //   }
// // };

// // // 2. OTP Verify
// // exports.verifyPinResetOtp = async (req, res) => {
// //   try {
// //     const { driverId, otp } = req.body;

// //     const session = Sessions[driverId];
// //     if (!session || session.otp !== otp || Date.now() > session.otpExpires) {
// //       return errorResponse(res, 'Invalid or expired OTP', 400);
// //     }

// //     session.verified = true;
// //     Sessions[driverId] = session;

// //     return successResponse(res, 'OTP verified!', {
// //       message: 'Now create your new 4-digit PIN'
// //     });

// //   } catch (error) {
// //     return errorResponse(res, 'Verification failed', 500);
// //   }
// // };

// // // 3. Set New PIN
// // exports.setNewPin = async (req, res) => {
// //   try {
// //     const { driverId, newPin } = req.body;

// //     if (!/^\d{4}$/.test(newPin)) {
// //       return errorResponse(res, 'PIN must be exactly 4 digits', 400);
// //     }

// //     const session = Sessions[driverId];
// //     if (!session || !session.verified) {
// //       return errorResponse(res, 'Session expired. Please try again.', 400);
// //     }

// //     session.newPin = newPin;
// //     Sessions[driverId] = session;

// //     return successResponse(res, 'PIN received', {
// //       message: 'Now confirm your new PIN'
// //     });

// //   } catch (error) {
// //     return errorResponse(res, 'Failed', 500);
// //   }
// // };

// // // 4. Confirm PIN → Final Save
// // exports.confirmNewPin = async (req, res) => {
// //   try {
// //     const { driverId, confirmPin } = req.body;

// //     const session = Sessions[driverId];
// //     if (!session || !session.verified || !session.newPin) {
// //       return errorResponse(res, 'Invalid session. Start again.', 400);
// //     }

// //     if (session.newPin !== confirmPin) {
// //       return errorResponse(res, 'PINs do not match', 400);
// //     }

// //     const driver = await Driver.findById(driverId);
// //     if (!driver) return errorResponse(res, 'Driver not found', 404);

// //     // Hash & Save New PIN
// //     const salt = await bcrypt.genSalt(10);
// //     driver.pin = await bcrypt.hash(confirmPin, salt);
// //     driver.pinAttempts = 0;
// //     driver.pinLockedUntil = null;
// //     await driver.save();

// //     // Clear session
// //     delete Sessions[driverId];

// //     return successResponse(res, 'PIN changed successfully!', {
// //       message: 'You can now login with your new PIN'
// //     });

// //   } catch (error) {
// //     console.error('Confirm PIN Error:', error);
// //     return errorResponse(res, 'PIN reset failed', 500);
// //   }
// // };

// const Driver = require('../../models/Driver');
// const Session = require('../../models/Session');
// const { successResponse, errorResponse } = require('../../utils/responseHelper');
// const bcrypt = require('bcryptjs');


// // exports.sendPinResetOtp = async (req, res) => {
// //   try {
// //     const { phone, emiratesId } = req.body;

// //     if (!phone || !emiratesId) {
// //       return errorResponse(res, 'Phone number and Emirates ID are required', 400);
// //     }

// //     if (!/^[0-9]{10}$/.test(phone)) {
// //       return errorResponse(res, 'Valid 10-digit phone number required', 400);
// //     }

// //     const driver = await Driver.findOne({
// //       phone: phone.trim(),
// //       'governmentIds.emiratesId': emiratesId.trim(),
// //       profileStatus: 'approved'
// //     });

// //     if (!driver) {
// //       return errorResponse(res, 'No approved driver found with these details', 404);
// //     }

// //     const otp = Math.floor(1000 + Math.random() * 9000).toString();

// //     await Session.findOneAndUpdate(
// //       { driverId: driver._id },
// //       {
// //         driverId: driver._id,
// //         otp,
// //         otpExpires: Date.now() + 5 * 60 * 1000,
// //         verified: false,
// //         newPin: null
// //       },
// //       { upsert: true, setDefaultsOnInsert: true }
// //     );

// //     console.log(`PIN Reset OTP → ${driver.name} (${phone}): ${otp}`);

// //     return successResponse(res, 'OTP sent successfully!', {
// //       driverId: driver._id,
// //       name: driver.name,
// //       otp: otp,
// //       maskedPhone: phone.replace(/(\d{6})\d{4}/, '$1****') 
// //     });

// //   } catch (error) {
// //     console.error('Send OTP Error:', error);
// //     return errorResponse(res, 'Server error', 500);
// //   }
// // };

// exports.sendPinResetOtp = async (req, res) => {
//   try {
//     let { phone, emiratesId, countryCode: inputCountryCode } = req.body;

//     if (!phone || !emiratesId) {
//       return errorResponse(res, 'Phone number and Emirates ID are required', 400);
//     }

//     // Clean phone - remove all non-digits
//     const cleanedPhone = phone.replace(/\D/g, '');

//     // Default to +971 if no country code provided
//     const countryCode = inputCountryCode?.trim() || '+971';
//     const emiratesIdClean = emiratesId.trim();

//     // Find approved driver with matching phone, countryCode and Emirates ID
//     const driver = await Driver.findOne({
//       phone: cleanedPhone,
//       countryCode: countryCode,
//       'governmentIds.emiratesId': emiratesIdClean,
//       profileStatus: 'approved'
//     });

//     if (!driver) {
//       return errorResponse(res, 'No approved driver found with these details', 404);
//     }

//     // Generate 4-digit OTP
//     const otp = Math.floor(1000 + Math.random() * 9000).toString();
//     const otpExpires = Date.now() + 5 * 60 * 1000; // 5 minutes expiry

//     // Upsert a session document specifically for forgot_pin
//     // We match by both driverId AND type to avoid conflicts with login sessions
//     const result = await Session.findOneAndUpdate(
//       {
//         driverId: driver._id,
//         type: 'forgot_pin'  // Important: scope to forgot_pin only
//       },
//       {
//         $set: {
//           otp,
//           otpExpires,
//           verified: false,
//           newPin: null,
//           oldPinVerified: false,
//           deviceInfo: req.headers['user-agent'] || 'Unknown',
//           ipAddress: req.ip || req.connection.remoteAddress
//         },
//         $setOnInsert: {
//           driverId: driver._id,
//           type: 'forgot_pin'
//         }
//       },
//       {
//         upsert: true,           // Create if doesn't exist
//         new: true,              // Return updated document
//         setDefaultsOnInsert: true
//       }
//     );

//     console.log(`PIN Reset OTP → ${driver.name} (${countryCode}${cleanedPhone}): ${otp}`);

//     // Mask phone for response
//     const maskedPhone = cleanedPhone.replace(/(\d{6})\d{4}/, '$1****');
//     const maskedFullPhone = `${countryCode}${maskedPhone}`;

//     return successResponse(res, 'OTP sent successfully!', {
//       driverId: driver._id,
//       name: driver.name,
//       phone: cleanedPhone,
//       maskedPhone: maskedFullPhone,
//       countryCode,
//       otp: otp,
//       expiresIn: '5 minutes',
//       message: `OTP sent to ${maskedFullPhone}`
//     });

//   } catch (error) {
//     // Handle duplicate key error gracefully (shouldn't happen with above fix)
//     if (error.code === 11000) {
//       console.error('Duplicate session conflict (should not occur):', error);
//       return errorResponse(res, 'Session conflict. Please try again.', 409);
//     }

//     console.error('Send PIN Reset OTP Error:', error);
//     return errorResponse(res, 'Server error. Please try again later.', 500);
//   }
// };

// // exports.resendPinResetOtp = async (req, res) => {
// //   try {
// //     let { phone, emiratesId, countryCode: inputCountryCode } = req.body;

// //     if (!phone || !emiratesId) {
// //       return errorResponse(res, 'Phone number and Emirates ID are required', 400);
// //     }

// //     // Clean phone - only digits
// //     const cleanedPhone = phone.replace(/\D/g, '');



// //     // Use provided country code or default +91
// //     const countryCode = inputCountryCode?.trim() || '+91';

// //     // Full international phone number
// //     const fullPhone = `${countryCode}${cleanedPhone}`;

// //     const emiratesIdClean = emiratesId.trim();

// //     // Find the driver
// //     const driver = await Driver.findOne({
// //       phone: fullPhone,
// //       'governmentIds.emiratesId': emiratesIdClean,
// //       profileStatus: 'approved'
// //     });

// //     if (!driver) {
// //       return errorResponse(res, 'No approved driver found with these details', 404);
// //     }

// //     // Check if there is an existing PIN reset session
// //     const existingSession = await Session.findOne({ driverId: driver._id });

// //     if (!existingSession) {
// //       return errorResponse(res, 'No active PIN reset request found. Please initiate forgot PIN first.', 400);
// //     }

// //     // Generate new OTP
// //     const newOtp = Math.floor(1000 + Math.random() * 9000).toString();
// //     const otpExpires = Date.now() + 5 * 60 * 1000; // 5 minutes

// //     // Update the existing session with new OTP
// //     await Session.findOneAndUpdate(
// //       { driverId: driver._id },
// //       {
// //         otp: newOtp,
// //         otpExpires,
// //         verified: false 
// //       },
// //       { new: true }
// //     );

// //     console.log(`RESEND PIN Reset OTP → ${driver.name} (${fullPhone}): ${newOtp}`);

// //     // Mask phone for response
// //     const maskedPhone = cleanedPhone.replace(/(\d{6})\d{4}/, '$1****');
// //     const maskedFullPhone = `${countryCode}${maskedPhone}`;

// //     return successResponse(res, 'New OTP sent successfully!', {
// //       driverId: driver._id,
// //       name: driver.name,
// //       phone: fullPhone,
// //       maskedPhone: maskedFullPhone,
// //       countryCode: countryCode,
// //       otp: newOtp 
// //     });

// //   } catch (error) {
// //     console.error('Resend PIN Reset OTP Error:', error);
// //     return errorResponse(res, 'Server error. Please try again.', 500);
// //   }
// // };

// exports.resendPinResetOtp = async (req, res) => {
//   try {
//     let { phone, emiratesId, countryCode: inputCountryCode } = req.body;

//     if (!phone || !emiratesId) {
//       return errorResponse(res, 'Phone number and Emirates ID are required', 400);
//     }

//     // Clean phone - only digits
//     const cleanedPhone = phone.replace(/\D/g, '');

//     // Use provided country code or default +971
//     const countryCode = inputCountryCode?.trim() || '+971';

//     const emiratesIdClean = emiratesId.trim();

//     // Find the driver
//     const driver = await Driver.findOne({
//       phone: cleanedPhone,
//       countryCode: countryCode,
//       'governmentIds.emiratesId': emiratesIdClean,
//       profileStatus: 'approved'
//     });

//     if (!driver) {
//       return errorResponse(res, 'No approved driver found with these details', 404);
//     }

//     // Check if there is an existing PIN reset session
//     const existingSession = await Session.findOne({ driverId: driver._id });

//     if (!existingSession) {
//       return errorResponse(res, 'No active PIN reset request found. Please initiate forgot PIN first.', 400);
//     }

//     // Generate new OTP
//     const newOtp = Math.floor(1000 + Math.random() * 9000).toString();
//     const otpExpires = Date.now() + 5 * 60 * 1000; // 5 minutes

//     // Update the existing session with new OTP
//     await Session.findOneAndUpdate(
//       { driverId: driver._id },
//       {
//         otp: newOtp,
//         otpExpires,
//         verified: false 
//       },
//       { new: true }
//     );

//     console.log(`RESEND PIN Reset OTP → ${driver.name} (${countryCode}${cleanedPhone}): ${newOtp}`);

//     // Mask phone for response
//     const maskedPhone = cleanedPhone.replace(/(\d{6})\d{4}/, '$1****');
//     const maskedFullPhone = `${countryCode}${maskedPhone}`;

//     return successResponse(res, 'New OTP sent successfully!', {
//       driverId: driver._id,
//       name: driver.name,
//       phone: cleanedPhone,
//       maskedPhone: maskedFullPhone,
//       countryCode: countryCode,
//       otp: newOtp 
//     });

//   } catch (error) {
//     console.error('Resend PIN Reset OTP Error:', error);
//     return errorResponse(res, 'Server error. Please try again.', 500);
//   }
// };

// exports.verifyPinResetOtp = async (req, res) => {
//   try {
//     const { driverId, otp } = req.body;

//     const session = await Session.findOne({ driverId });
//     if (!session || session.otp !== otp || Date.now() > session.otpExpires) {
//       return errorResponse(res, 'Invalid or expired OTP', 400);
//     }

//     session.verified = true;
//     await session.save();

//     return successResponse(res, 'OTP verified!', {
//       message: 'Now create your new 4-digit PIN'
//     });

//   } catch (error) {
//     return errorResponse(res, 'Verification failed', 500);
//   }
// };

// exports.setNewPin = async (req, res) => {
//   try {
//     const { driverId, newPin } = req.body;

//     if (!/^\d{4}$/.test(newPin)) {
//       return errorResponse(res, 'PIN must be exactly 4 digits', 400);
//     }

//     const session = await Session.findOne({ driverId });
//     if (!session || !session.verified) {
//       return errorResponse(res, 'Session expired. Please try again.', 400);
//     }

//     session.newPin = newPin;
//     await session.save();

//     return successResponse(res, 'PIN received', {
//       message: 'Now confirm your new PIN'
//     });

//   } catch (error) {
//     return errorResponse(res, 'Failed', 500);
//   }
// };

// exports.confirmNewPin = async (req, res) => {
//   try {
//     const { driverId, confirmPin } = req.body;

//     const session = await Session.findOne({ driverId });
//     if (!session || !session.verified || !session.newPin) {
//       return errorResponse(res, 'Invalid session. Start again.', 400);
//     }

//     if (session.newPin !== confirmPin) {
//       return errorResponse(res, 'PINs do not match', 400);
//     }
//     const driver = await Driver.findById(driverId);
//     if (!driver) return errorResponse(res, 'Driver not found', 404);

//     const salt = await bcrypt.genSalt(10);
//     driver.pin = await bcrypt.hash(confirmPin, salt);
//     driver.pinAttempts = 0;
//     driver.pinLockedUntil = null;
//     await driver.save();

//     await Session.deleteOne({ driverId });

//     return successResponse(res, 'PIN changed successfully!', {
//       message: 'You can now login with your new PIN'
//     });

//   } catch (error) {
//     console.error('Confirm PIN Error:', error);
//     return errorResponse(res, 'PIN reset failed', 500);
//   }
// };



const Driver = require('../../models/Driver');
const Session = require('../../models/Session');
const { successResponse, errorResponse } = require('../../utils/responseHelper');
const bcrypt = require('bcryptjs');
const { sendOTPEmail } = require('../../utils/emailHelper');

// ==================== SEND PIN RESET OTP ====================
exports.sendPinResetOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      return errorResponse(res, 'Valid email address is required', 400);
    }

    const driver = await Driver.findOne({
      email: email.toLowerCase().trim(),
      profileStatus: 'approved'
    });

    if (!driver) {
      return errorResponse(res, 'No approved driver found with this email', 404);
    }

    // const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 5 * 60 * 1000; // 5 minutes

    await Session.findOneAndUpdate(
      { driverId: driver._id, type: 'forgot_pin' },
      {
        $set: {
          otp,
          otpExpires,
          verified: false,
          newPin: null,
          oldPinVerified: false,
          deviceInfo: req.headers['user-agent'] || 'Unknown',
          ipAddress: req.ip || req.connection.remoteAddress
        },
        $setOnInsert: {
          driverId: driver._id,
          type: 'forgot_pin'
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log(`[FORGOT-PIN] OTP → ${driver.name} (${email}): ${otp}`);

    // ✅ Sirf email pe bhejo
    try {
      await sendOTPEmail(email.toLowerCase().trim(), otp, driver.name);
      console.log(`[FORGOT-PIN] OTP email sent to: ${email}`);
    } catch (emailErr) {
      console.error('[FORGOT-PIN] Email send failed:', emailErr.message);
      return errorResponse(res, 'Failed to send OTP email. Please try again.', 500);
    }

    return successResponse(res, 'OTP sent successfully!', {
      driverId: driver._id,
      name: driver.name,
      maskedEmail: email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
      expiresIn: '5 minutes',
      message: `OTP sent to your email`,
      ...(process.env.NODE_ENV !== 'production' && { otp })
    });

  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 'Session conflict. Please try again.', 409);
    }
    console.error('[FORGOT-PIN] Send OTP Error:', error);
    return errorResponse(res, 'Server error. Please try again later.', 500);
  }
};

// ==================== RESEND PIN RESET OTP ====================
exports.resendPinResetOtp = async (req, res) => {
  try {
    const { driverId } = req.body;

    if (!driverId) {
      return errorResponse(res, 'driverId is required', 400);
    }

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return errorResponse(res, 'Driver not found', 404);
    }

    if (!driver.email) {
      return errorResponse(res, 'No email found for this driver. Contact admin.', 400);
    }

    const existingSession = await Session.findOne({
      driverId: driver._id,
      type: 'forgot_pin'
    });

    if (!existingSession) {
      return errorResponse(res, 'No active PIN reset request found. Please initiate forgot PIN first.', 400);
    }

    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 5 * 60 * 1000;

    await Session.findOneAndUpdate(
      { driverId: driver._id, type: 'forgot_pin' },
      { $set: { otp: newOtp, otpExpires, verified: false } },
      { new: true }
    );

    console.log(`[RESEND-FORGOT-PIN] New OTP → ${driver.name} (${driver.email}): ${newOtp}`);

    // ✅ Sirf email pe bhejo
    try {
      await sendOTPEmail(driver.email, newOtp, driver.name);
      console.log(`[RESEND-FORGOT-PIN] OTP email sent to: ${driver.email}`);
    } catch (emailErr) {
      console.error('[RESEND-FORGOT-PIN] Email send failed:', emailErr.message);
      return errorResponse(res, 'Failed to resend OTP email. Please try again.', 500);
    }

    return successResponse(res, 'New OTP sent successfully!', {
      driverId: driver._id,
      name: driver.name,
      maskedEmail: driver.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
      message: 'New OTP sent to your email',
      ...(process.env.NODE_ENV !== 'production' && { otp: newOtp })
    });

  } catch (error) {
    console.error('[RESEND-FORGOT-PIN] Error:', error);
    return errorResponse(res, 'Server error. Please try again.', 500);
  }
};

// ==================== VERIFY OTP ====================
exports.verifyPinResetOtp = async (req, res) => {
  try {
    const { driverId, otp } = req.body;

    if (!driverId || !otp) {
      return errorResponse(res, 'driverId and OTP are required', 400);
    }

    const session = await Session.findOne({ driverId, type: 'forgot_pin' });

    if (!session) {
      return errorResponse(res, 'No active session found. Please request OTP again.', 400);
    }

    if (session.otp !== otp) {
      return errorResponse(res, 'Invalid OTP', 400);
    }

    if (Date.now() > session.otpExpires) {
      return errorResponse(res, 'OTP has expired. Please request a new one.', 400);
    }

    session.verified = true;
    await session.save();

    return successResponse(res, 'OTP verified successfully!', {
      message: 'Now create your new 4-digit PIN'
    });

  } catch (error) {
    console.error('[VERIFY-OTP] Error:', error);
    return errorResponse(res, 'Verification failed', 500);
  }
};

// ==================== SET NEW PIN ====================

exports.setNewPin = async (req, res) => {
  try {
    const { driverId, newPin } = req.body;

    if (!/^\d{4}$/.test(newPin)) {
      return errorResponse(res, 'PIN must be exactly 4 digits', 400);
    }

    const session = await Session.findOne({ driverId });
    if (!session || !session.verified) {
      return errorResponse(res, 'Session expired. Please try again.', 400);
    }

    session.newPin = newPin;
    await session.save();

    return successResponse(res, 'PIN received', {
      message: 'Now confirm your new PIN'
    });

  } catch (error) {
    return errorResponse(res, 'Failed', 500);
  }
};

exports.confirmNewPin = async (req, res) => {
  try {
    const { driverId, confirmPin } = req.body;

    const session = await Session.findOne({ driverId });
    if (!session || !session.verified || !session.newPin) {
      return errorResponse(res, 'Invalid session. Start again.', 400);
    }

    if (session.newPin !== confirmPin) {
      return errorResponse(res, 'PINs do not match', 400);
    }
    const driver = await Driver.findById(driverId);
    if (!driver) return errorResponse(res, 'Driver not found', 404);

    const salt = await bcrypt.genSalt(10);
    driver.pin = await bcrypt.hash(confirmPin, salt);
    driver.pinAttempts = 0;
    driver.pinLockedUntil = null;
    await driver.save();

    await Session.deleteOne({ driverId });

    return successResponse(res, 'PIN changed successfully!', {
      message: 'You can now login with your new PIN'
    });

  } catch (error) {
    console.error('Confirm PIN Error:', error);
    return errorResponse(res, 'PIN reset failed', 500);
  }
};
