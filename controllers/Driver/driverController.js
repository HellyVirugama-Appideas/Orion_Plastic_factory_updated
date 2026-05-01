// const mongoose = require("mongoose")
// const Driver = require('../../models/Driver');
// const TempDriver = require('../../models/TempDriver');
// const { v4: uuidv4 } = require('uuid');
// const bcrypt = require('bcryptjs');
// const jwtHelper = require('../../utils/jwtHelper');
// const { generateAccessToken, generateRefreshToken } = require('../../utils/jwtHelper');
// const { successResponse, errorResponse } = require('../../utils/responseHelper');
// const DriverActivityLog = require('../../models/DriverActivityLog');
// const { logDriverActivity } = require("../../utils/activityLogger")
// const Session = require('../../models/Session');


// exports.saveStep1 = async (req, res) => {
//   try {
//     let { tempId, fullName, contactNumber, contactCountryCode, emiratesId, vehicleNumber, region } = req.body;
//     tempId = tempId || uuidv4();

//     if (!fullName || !contactNumber || !emiratesId || !vehicleNumber || !region) {
//       return errorResponse(res, 'All fields required', 400);
//     }

//     // Normalize contact number with country code
//     contactCountryCode = contactCountryCode || '+971';

//     const result = await TempDriver.findOneAndUpdate(
//       { tempId },
//       {
//         $set: {
//           tempId,
//           personalDetails: {
//             fullName: fullName.trim(),
//             contactNumber,           // ← Full number with country code
//             contactCountryCode: contactCountryCode,     // ← Separate country code
//             emiratesId,
//             vehicleNumber: vehicleNumber.toUpperCase(),
//             region
//           }
//         }
//       },
//       { upsert: true, new: true }
//     );

//     return successResponse(res, 'Step 1 saved successfully!', {
//       tempId,
//       nextStep: 'step2'
//     });

//   } catch (error) {
//     console.error('Save Step 1 Error:', error);
//     return errorResponse(res, 'Failed to save Step 1', 500);
//   }
// };

// // Step 2: Upload License
// exports.saveStep2 = async (req, res) => {
//   try {
//     const { tempId, licenseNumber } = req.body;
//     const files = req.files;

//     if (!tempId || !licenseNumber || !files?.licenseFront?.[0] || !files?.licenseBack?.[0]) {
//       return errorResponse(res, 'All fields required', 400);
//     }

//     await TempDriver.findOneAndUpdate({ tempId }, {
//       license: {
//         licenseNumber: licenseNumber.toUpperCase(),
//         frontUrl: files.licenseFront[0].path.replace('public', ''),
//         backUrl: files.licenseBack[0].path.replace('public', '')
//       }
//     });

//     return successResponse(res, 'License saved', { nextStep: 'step3' });
//   } catch (error) {
//     return errorResponse(res, 'Upload failed', 500);
//   }
// };

// // Step 3: Upload RC
// exports.saveStep3 = async (req, res) => {
//   try {
//     const { tempId, registrationNumber } = req.body;
//     const files = req.files;

//     if (!tempId || !registrationNumber || !files?.rcFront?.[0] || !files?.rcBack?.[0]) {
//       return errorResponse(res, 'All fields required', 400);
//     }

//     await TempDriver.findOneAndUpdate({ tempId }, {
//       rc: {
//         registrationNumber: registrationNumber.toUpperCase(),
//         frontUrl: files.rcFront[0].path.replace('public', ''),
//         backUrl: files.rcBack[0].path.replace('public', '')
//       }
//     });

//     return successResponse(res, 'All data saved!', { nextStep: 'phone-signup' });
//   } catch (error) {
//     return errorResponse(res, 'Upload failed', 500);
//   }
// };

// exports.finalSignup = async (req, res) => {
//   try {
//     let { tempId, phone, countryCode } = req.body;

//     // Validation
//     if (!tempId || !phone || !/^\d{10}$/.test(phone)) {
//       return errorResponse(res, 'Valid 10-digit phone number required', 400);
//     }

//     countryCode = countryCode || '+971';

//     // const fullPhone = `${countryCode}${phone}`;

//     const tempExists = await TempDriver.findOne({ tempId });
//     if (!tempExists) {
//       return errorResponse(res, 'Session expired. Please start again.', 400);
//     }

//     // Check duplicate with full phone (countryCode + phone)
//     const driverExists = await Driver.findOne({ phone });
//     if (driverExists) {
//       return errorResponse(res, 'Phone number already registered', 400);
//     }

//     const otp = Math.floor(1000 + Math.random() * 9000).toString();
//     const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

//     const updated = await TempDriver.findOneAndUpdate(
//       { tempId },
//       {
//         $set: {
//           phone,
//           countryCode: countryCode,
//           otp,
//           otpExpiresAt
//         }
//       },
//       { new: true }
//     );

//     if (!updated) {
//       return errorResponse(res, 'Failed to save OTP. Try again.', 500);
//     }

//     console.log(`OTP for ${phone}: ${otp}`);

//     return successResponse(res, 'OTP sent successfully!', {
//       message: 'Check your phone for 4-digit code',
//       otp: otp
//     });

//   } catch (error) {
//     console.error('Final Signup Error:', error.message);
//     return errorResponse(res, 'Server error', 500);
//   }
// };


// exports.verifyOtpAndCreateDriver = async (req, res) => {
//   try {
//     const { tempId, phone, otp, countryCode: inputCountryCode } = req.body;

//     // Validate phone (must be 10 digits)
//     const cleanedPhone = phone?.replace(/\D/g, '') || '';
//     if (cleanedPhone.length !== 10) {
//       return errorResponse(res, 'Valid 10-digit phone number required', 400);
//     }

//     // Use provided country code or default to +971
//     const countryCode = inputCountryCode?.trim() || '+971';

//     // Full international format (only for validation)
//     const fullPhoneForValidation = `${countryCode}${cleanedPhone}`;

//     // Find temp driver with full phone
//     const temp = await TempDriver.findOne({
//       tempId,
//       phone,
//       otp,
//       otpExpiresAt: { $gt: new Date() }
//     });

//     if (!temp) {
//       return errorResponse(res, 'Invalid or expired OTP', 400);
//     }

//     // Prepare driver data
//     const driverData = {
//       phone: cleanedPhone,                        // ← Store only 10 digits
//       countryCode: countryCode,                   // ← Store country code separately
//       name: temp.personalDetails.fullName?.trim() || 'Driver',
//       licenseNumber: temp.license?.licenseNumber?.toUpperCase(),
//       vehicleNumber: temp.personalDetails.vehicleNumber?.toUpperCase(),
//       'address.city': temp.personalDetails.region,
//       'governmentIds.emiratesId': temp.personalDetails.emiratesId,

//       documents: [
//         {
//           documentType: 'license_front',
//           fileUrl: temp.license?.frontUrl || '',
//           documentNumber: temp.license?.licenseNumber
//         },
//         {
//           documentType: 'license_back',
//           fileUrl: temp.license?.backUrl || '',
//           documentNumber: temp.license?.licenseNumber
//         },
//         {
//           documentType: 'vehicle_rc_front',
//           fileUrl: temp.rc?.frontUrl || '',
//           documentNumber: temp.rc?.registrationNumber
//         },
//         {
//           documentType: 'vehicle_rc_back',
//           fileUrl: temp.rc?.backUrl || '',
//           documentNumber: temp.rc?.registrationNumber
//         }
//       ],

//       profileStatus: 'pending_pin_setup'
//     };

//     // Create driver instance
//     const driver = new Driver(driverData);

//     // Temporary override for validation (only for this step)
//     driver.phone = fullPhoneForValidation;  // ← Make validator happy

//     // Validate
//     const validationError = driver.validateSync();
//     if (validationError) {
//       console.error("Validation Error:", validationError.message);
//       return errorResponse(res, 'Data validation failed: ' + validationError.message, 400);
//     }

//     // Restore original phone before saving
//     driver.phone = cleanedPhone;               // ← Save only 10 digits

//     // Save driver
//     await driver.save();

//     // Clean up temp data
//     await TempDriver.deleteOne({ tempId });

//     // Generate access token
//     const accessToken = jwtHelper.generateAccessToken(driver._id, 'driver');

//     return successResponse(res, 'Account created successfully!', {
//       accessToken,
//       message: 'Now create your 4-digit PIN',
//       nextStep: 'create-pin'
//     });

//   } catch (error) {
//     console.error('Create Driver Failed:', error);

//     if (error.code === 11000) {
//       const field = Object.keys(error.keyValue)[0];
//       const value = error.keyValue[field];
//       const messages = {
//         phone: 'Phone number already registered',
//         licenseNumber: 'License number already registered',
//         vehicleNumber: 'Vehicle number already registered',
//         email: 'Email already registered'
//       };
//       return errorResponse(res, messages[field] || 'Duplicate entry found', 400);
//     }

//     return errorResponse(res, 'Failed to create account', 500);
//   }
// };

// // Resend OTP for phone verification
// exports.resendOtp = async (req, res) => {
//   try {
//     const { tempId } = req.body;

//     if (!tempId) {
//       return errorResponse(res, 'tempId is required', 400);
//     }

//     // Find the temp driver
//     const temp = await TempDriver.findOne({ tempId });

//     if (!temp) {
//       // Agar document nahi mila → matlab TTL se delete ho gaya
//       return errorResponse(res, 'Registration session has expired. Please start the signup process again.', 410); // 410 Gone status better hai
//     }

//     // Optional: Check if previous OTP was expired
//     const isPreviousOtpExpired = temp.otpExpiresAt < new Date();

//     // Generate new OTP anyway
//     const newOtp = Math.floor(1000 + Math.random() * 9000).toString();
//     const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes fresh

//     // Update the document
//     temp.otp = newOtp;
//     temp.otpExpiresAt = otpExpiresAt;
//     await temp.save();

//     console.log(`RESEND OTP → ${temp.phone}: ${newOtp} | tempId: ${tempId} | Previous expired: ${isPreviousOtpExpired}`);

//     return successResponse(res, 'New OTP sent successfully!', {
//       message: 'Check your phone for the new 4-digit code',
//       otp: newOtp  // Remove in production
//     });

//   } catch (error) {
//     console.error('Resend OTP Error:', error);
//     return errorResponse(res, 'Server error. Please try again.', 500);
//   }
// };


// // Create PIN (After Final Signup)
// exports.createPin = async (req, res) => {
//   try {
//     if (!req.user) {
//       return errorResponse(res, 'Unauthorized', 401);
//     }

//     const { newPin, confirmPin } = req.body;

//     if (String(newPin) !== String(confirmPin)) {
//       return errorResponse(res, 'PINs do not match', 400);
//     }

//     if (!/^\d{4}$/.test(newPin)) {
//       return errorResponse(res, 'PIN must be exactly 4 digits', 400);
//     }

//     if (req.user.profileStatus !== 'pending_pin_setup') {
//       return errorResponse(res, 'Cannot set PIN at this stage', 400);
//     }

//     const salt = await bcrypt.genSalt(10);
//     req.user.pin = await bcrypt.hash(String(newPin), salt);

//     req.user.profileStatus = 'pending_verification';
//     await req.user.save();

//     return successResponse(res, 'PIN created successfully!', {
//       message: 'Your account is now pending admin approval'
//     });

//   } catch (error) {
//     console.error("Create PIN error:", error);
//     return errorResponse(res, 'Failed to create PIN', 500);
//   }
// };


// /////login 
// // Step 1: Emirates ID + Vehicle Number 
// exports.login = async (req, res) => {
//   try {
//     const { emiratesId, vehicleNumber } = req.body;

//     if (!emiratesId || !vehicleNumber) {
//       return errorResponse(res, 'Emirates ID and Vehicle Number are required', 400);
//     }

//     const emiratesIdClean = emiratesId.trim();
//     const vehicleNumberClean = vehicleNumber.trim().toUpperCase();

//     console.log("Searching:", { emiratesIdClean, vehicleNumberClean });

//     // YE LINE SAHI KARO — single quotes hata do!
//     const driver = await Driver.findOne({
//       "governmentIds.emiratesId": emiratesIdClean,
//       vehicleNumber: vehicleNumberClean,
//       profileStatus: 'approved'
//     });

//     if (!driver) {
//       // Debug ke liye — yeh hata dena baad mein
//       const all = await Driver.find({ profileStatus: 'approved' }).select('governmentIds.emiratesId vehicleNumber name');
//       console.log("All approved drivers:", all);

//       return errorResponse(res, 'Invalid Emirates ID or Vehicle Number', 400);
//     }

//     if (!driver.pin) {
//       return errorResponse(res, 'PIN not set. Contact admin.', 400);
//     }

//     return successResponse(res, 'Credentials valid. Now enter PIN', {
//       driverId: driver._id,
//       name: driver.name,
//       phone: driver.phone,
//       vehicleNumber: driver.vehicleNumber
//     });

//   } catch (error) {
//     console.error('Login Error:', error);
//     return errorResponse(res, 'Server error', 500);
//   }
// };


// exports.verifyPin = async (req, res) => {
//   try {
//     const { driverId, pin } = req.body;

//     // Validate input
//     if (!driverId || !pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
//       return errorResponse(res, 'Valid 4-digit PIN required', 400);
//     }

//     // Fetch driver with required fields
//     const driver = await Driver.findById(driverId).select(
//       '+pin +documents +governmentIds +pinAttempts +pinLockedUntil ' +
//       '+profileStatus +vehicleNumber +vehicleType +rating +address'
//     );

//     if (!driver) {
//       return errorResponse(res, 'Driver not found', 404);
//     }

//     // Check approval status
//     if (driver.profileStatus !== 'approved') {
//       return errorResponse(res, 'Account not approved by admin yet', 403);
//     }

//     // Check PIN lock
//     if (driver.pinLockedUntil && new Date() < driver.pinLockedUntil) {
//       const minutesLeft = Math.ceil(
//         (driver.pinLockedUntil - new Date()) / 60000
//       );
//       return errorResponse(
//         res,
//         `PIN locked. Try again in ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}`,
//         423
//       );
//     }

//     // Verify PIN
//     const isMatch = await driver.comparePin(pin);
//     if (!isMatch) {
//       driver.pinAttempts = (driver.pinAttempts || 0) + 1;

//       if (driver.pinAttempts >= 5) {
//         driver.pinLockedUntil = new Date(Date.now() + 30 * 60 * 1000);
//       }

//       await driver.save();

//       // Optional: Log failed attempt (very useful for security monitoring)
//       await new DriverActivityLog({
//         driverId: driver._id,
//         action: 'LOGIN_FAILED',
//         meta: {
//           reason: 'Incorrect PIN',
//           attempts: driver.pinAttempts,
//           ip: req.ip || req.connection.remoteAddress || 'unknown',
//           userAgent: req.headers['user-agent'] || 'unknown',
//           timestamp: new Date().toISOString()
//         }
//       }).save().catch(err => console.log('Failed login log error:', err));

//       return errorResponse(res, 'Incorrect PIN', 400);
//     }

//     // ── SUCCESSFUL LOGIN ──
//     // Reset attempts & update last login
//     driver.pinAttempts = 0;
//     driver.pinLockedUntil = null;
//     driver.lastLoginAt = new Date();

//     // ★★★ LOGIN SUCCESS LOG - Same style as vendor expects ★★★
//     await new DriverActivityLog({
//       driverId: driver._id,
//       action: 'LOGIN',
//       meta: {
//         ip: req.ip || req.connection.remoteAddress || 'unknown',
//         userAgent: req.headers['user-agent'] || 'unknown',
//         loginMethod: 'EmiratesID + VehicleNumber + PIN',
//         timestamp: new Date().toISOString(),
//         emiratesId: driver.governmentIds?.emiratesId,
//         vehicleNumber: driver.vehicleNumber
//       },
//       performedBy: null
//     }).save();

//     // Generate tokens
//     const accessToken = generateAccessToken(driver._id, 'driver');
//     const refreshToken = generateRefreshToken(driver._id, 'driver');
//     driver.refreshToken = refreshToken;

//     await driver.save();

//     // ================= DOCUMENT EXTRACTION =================
//     const docs = driver.documents || [];

//     let licenseNumber = null;
//     let licenseFront = null;
//     let licenseBack = null;
//     let rcNumber = null;
//     let rcFront = null;
//     let rcBack = null;

//     docs.forEach(doc => {
//       switch (doc.documentType) {
//         case 'license_front':
//           licenseFront = doc.fileUrl;
//           if (doc.documentNumber) licenseNumber = doc.documentNumber;
//           break;

//         case 'license_back':
//           licenseBack = doc.fileUrl;
//           break;

//         case 'vehicle_rc_front':
//           rcFront = doc.fileUrl;
//           if (doc.documentNumber) rcNumber = doc.documentNumber;
//           break;

//         case 'vehicle_rc_back':
//           rcBack = doc.fileUrl;
//           break;
//       }
//     });

//     // ================= FINAL RESPONSE =================
//     return successResponse(res, 'Login successful!', {
//       tokens: {
//         accessToken,
//         refreshToken,
//         expiresIn: 24 * 60 * 60
//       },
//       driver: {
//         _id: driver._id,
//         name: driver.name,
//         phone: driver.phone,
//         region: driver.address?.city || driver.address?.country || null,
//         vehicleNumber: driver.vehicleNumber,
//         vehicleType: driver.vehicleType,
//         emiratesId: driver.governmentIds?.emiratesId || null,
//         profileImage: driver.profileImage || null,
//         isAvailable: driver.isAvailable,
//         rating: driver.rating || 0,

//         license: {
//           number: licenseNumber,
//           frontImage: licenseFront,
//           backImage: licenseBack
//         },
//         vehicleRegistration: {
//           number: rcNumber,
//           frontImage: rcFront,
//           backImage: rcBack
//         }
//       }
//     });

//   } catch (error) {
//     console.error('PIN Verify Error:', error);
//     return errorResponse(res, 'Login failed. Please try again.', 500);
//   }
// };

// exports.refreshToken = async (req, res) => {
//   try {
//     const { refreshToken } = req.body;

//     if (!refreshToken) {
//       return errorResponse(res, 'Refresh token required', 400);
//     }

//     // Verify refresh token
//     const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

//     const driver = await Driver.findById(decoded.id);
//     if (!driver || driver.refreshToken !== refreshToken) {
//       return errorResponse(res, 'Invalid refresh token', 401);
//     }

//     // Generate new access token
//     const newAccessToken = generateAccessToken(driver._id, 'driver');

//     return successResponse(res, 'Token refreshed', {
//       accessToken: newAccessToken,
//       expiresIn: 24 * 60 * 60
//     });

//   } catch (error) {
//     return errorResponse(res, 'Session expired. Please login again.', 401);
//   }
// };


// ///////setting update profile details
// // PUT /api/driver/profile/update-personal
// // exports.updatePersonalDetails = async (req, res) => {
// //   try {
// //     const driver = req.user;
// //     const { fullName, contactNumber, emiratesId, region } = req.body;

// //     if (emiratesId) {
// //       const exists = await Driver.findOne({
// //         'governmentIds.emiratesId': emiratesId,
// //         _id: { $ne: driver._id }
// //       });
// //       if (exists) return errorResponse(res, 'Emirates ID already used', 400);
// //     }

// //     driver.name = fullName || driver.name;
// //     driver.phone = contactNumber || driver.phone;
// //     driver.governmentIds.emiratesId = emiratesId || driver.governmentIds.emiratesId;
// //     driver['address.city'] = region || driver.address?.city;

// //     await driver.save();

// //     return successResponse(res, 'Profile updated successfully!', {
// //       driver: {
// //         name: driver.name,
// //         phone: driver.phone,
// //         emiratesId: driver.governmentIds.emiratesId,
// //         region: driver.address?.city
// //       }
// //     });

// //   } catch (error) {
// //     return errorResponse(res, 'Update failed', 500);
// //   }
// // };

// exports.updatePersonalDetails = async (req, res) => {
//   try {
//     const driver = req.user;
//     const { fullName, phone, countryCode, emiratesId, region } = req.body;

//     // Phone update with country code
//     if (phone) {
//       if (!/^\d{10}$/.test(phone.replace(/\D/g, ''))) {
//         return errorResponse(res, 'Phone must be 10 digits', 400);
//       }
//       const newCountryCode = countryCode || driver.countryCode || '+971';
//       const fullPhone = `${newCountryCode}${phone.replace(/\D/g, '')}`;

//       // Check duplicate
//       const exists = await Driver.findOne({ phone: fullPhone, _id: { $ne: driver._id } });
//       if (exists) {
//         return errorResponse(res, 'Phone number already registered', 400);
//       }

//       driver.phone = fullPhone;
//       driver.countryCode = newCountryCode;
//     }

//     if (emiratesId) {
//       const exists = await Driver.findOne({
//         'governmentIds.emiratesId': emiratesId,
//         _id: { $ne: driver._id }
//       });
//       if (exists) return errorResponse(res, 'Emirates ID already used', 400);
//     }

//     driver.name = fullName || driver.name;
//     driver.governmentIds.emiratesId = emiratesId || driver.governmentIds.emiratesId;
//     driver['address.city'] = region || driver.address?.city;

//     await driver.save();

//     await logDriverActivity(driver._id, 'PROFILE_UPDATED', {
//       changedFields: Object.keys(req.body).filter(k => req.body[k] !== undefined),
//       updatedBy: 'driver'
//     }, req);

//     return successResponse(res, 'Profile updated successfully!', {
//       driver: {
//         name: driver.name,
//         phone: driver.phone,
//         countryCode: driver.countryCode,
//         emiratesId: driver.governmentIds.emiratesId,
//         region: driver.address?.city
//       }
//     });

//   } catch (error) {
//     console.error('Update Personal Details Error:', error);
//     return errorResponse(res, 'Update failed', 500);
//   }
// };

// // PUT /api/driver/profile/update-license
// exports.updateLicense = async (req, res) => {
//   try {
//     const driver = req.user;
//     const { licenseNumber } = req.body;
//     const files = req.files;

//     console.log('=== UPDATE LICENSE API CALLED ===');
//     console.log('Driver ID:', driver._id);
//     console.log('License Number from body:', licenseNumber);
//     console.log('Files received:', files ? Object.keys(files) : 'No files uploaded');

//     // Validation
//     if (!licenseNumber && !files?.licenseFront?.[0] && !files?.licenseBack?.[0]) {
//       console.log('Validation failed: Nothing to update');
//       return errorResponse(res, 'Nothing to update - provide license number or files', 400);
//     }

//     // License number update + duplicate check
//     if (licenseNumber) {
//       const normalizedLicense = licenseNumber.trim().toUpperCase();
//       console.log('Checking duplicate for license:', normalizedLicense);
//       const exists = await Driver.findOne({
//         licenseNumber: normalizedLicense,
//         _id: { $ne: driver._id }
//       });

//       if (exists) {
//         console.log('Duplicate license found');
//         return errorResponse(res, 'License number already used by another driver', 400);
//       }

//       driver.licenseNumber = normalizedLicense;
//     }

//     // Clean old license documents
//     console.log('Cleaning old license documents...');
//     driver.documents = driver.documents.filter(d =>
//       !['license_front', 'license_back'].includes(d.documentType)
//     );

//     // Add new front
//     if (files?.licenseFront?.[0]) {
//       console.log('Adding license front image');
//       driver.documents.push({
//         documentType: 'license_front',
//         fileUrl: files.licenseFront[0].path.replace('public', ''),
//         documentNumber: licenseNumber || driver.licenseNumber,
//         uploadedAt: new Date()
//       });
//     }

//     // Add new back
//     if (files?.licenseBack?.[0]) {
//       console.log('Adding license back image');
//       driver.documents.push({
//         documentType: 'license_back',
//         fileUrl: files.licenseBack[0].path.replace('public', ''),
//         documentNumber: licenseNumber || driver.licenseNumber,
//         uploadedAt: new Date()
//       });
//     }

//     console.log('Saving driver changes...');
//     await driver.save();
//     console.log('Driver saved successfully - ID:', driver._id);

//     // === Logging Block - Bulletproof with debug ===
//     console.log('=== Attempting to log DOCUMENT_UPLOADED ===');
//     if (typeof logDriverActivity !== 'function') {
//       console.error('CRITICAL: logDriverActivity is NOT a function! Import failed.');
//       console.error('Current type:', typeof logDriverActivity);
//     } else {
//       try {
//         await logDriverActivity(driver._id, 'DOCUMENT_UPLOADED', {
//           documentTypes: ['license_front', 'license_back'],
//           licenseNumber: licenseNumber || driver.licenseNumber || 'Not updated',
//           updatedBy: 'driver_self',
//           fileCount: (files?.licenseFront ? 1 : 0) + (files?.licenseBack ? 1 : 0)
//         }, req);
//         console.log('=== DOCUMENT_UPLOADED LOG SAVED SUCCESSFULLY ===');
//       } catch (logError) {
//         console.error('=== LOGGING FAILED ===', logError.message);
//         console.error('Log error stack:', logError.stack);
//       }
//     }

//     // Success response
//     return successResponse(res, 'License updated successfully!', {
//       licenseNumber: driver.licenseNumber || 'Not updated',
//       licenseDocuments: driver.documents
//         .filter(d => ['license_front', 'license_back'].includes(d.documentType))
//         .map(d => ({
//           type: d.documentType,
//           url: d.fileUrl,
//           documentNumber: d.documentNumber || 'N/A'
//         }))
//     });

//   } catch (error) {
//     console.error('Update License Error:', error.message);
//     console.error('Full error stack:', error.stack);
//     return errorResponse(res, 'Update failed - please try again', 500);
//   }
// };


// // Update RC - ADD LOGGING HERE TOO
// exports.updateRC = async (req, res) => {
//   try {
//     const driver = req.user;
//     const { registrationNumber } = req.body;
//     const files = req.files;

//     if (registrationNumber) {
//       driver.registrationNumber = registrationNumber.toUpperCase();
//     }

//     driver.documents = driver.documents.filter(d =>
//       !['vehicle_rc_front', 'vehicle_rc_back'].includes(d.documentType)
//     );

//     if (files?.rcFront?.[0]) {
//       driver.documents.push({
//         documentType: 'vehicle_rc_front',
//         fileUrl: files.rcFront[0].path.replace('public', ''),
//         documentNumber: registrationNumber || driver.registrationNumber || driver.vehicleNumber
//       });
//     }

//     if (files?.rcBack?.[0]) {
//       driver.documents.push({
//         documentType: 'vehicle_rc_back',
//         fileUrl: files.rcBack[0].path.replace('public', ''),
//         documentNumber: registrationNumber || driver.registrationNumber || driver.vehicleNumber
//       });
//     }

//     await driver.save();

//     // ★★★ ADD THIS - Logging for RC update ★★★
//     await logDriverActivity(driver._id, 'DOCUMENT_UPLOADED', {
//       documentTypes: ['vehicle_rc_front', 'vehicle_rc_back'],
//       registrationNumber: registrationNumber || driver.registrationNumber
//     }, req);

//     return successResponse(res, 'RC Book updated successfully!', {
//       registrationNumber: driver.registrationNumber || 'Not updated',
//       rcDocuments: driver.documents
//         .filter(d => ['vehicle_rc_front', 'vehicle_rc_back'].includes(d.documentType))
//         .map(d => ({
//           type: d.documentType,
//           url: d.fileUrl
//         }))
//     });

//   } catch (error) {
//     console.error('Update RC Error:', error);
//     return errorResponse(res, 'Update failed', 500);
//   }
// };

// // DELETE /api/account/delete/:id
// exports.deleteAccount = async (req, res) => {
//   try {
//     const { id } = req.params;

//     if (!id || !mongoose.Types.ObjectId.isValid(id)) {
//       return errorResponse(res, 'Invalid driver ID', 400);
//     }

//     // Find driver first
//     const driver = await Driver.findById(id);
//     if (!driver) {
//       return errorResponse(res, 'Driver not found', 404);
//     }

//     // Delete everything related to this driver
//     await Driver.deleteOne({ _id: id });
//     await Session.deleteMany({ driverId: id });
//     await TempDriver.deleteMany({ phone: driver.phone });

//     console.log(`Account deleted by admin: ${driver.name} (${driver.phone})`);

//     return successResponse(res, 'Account deleted successfully!', {
//       deletedDriver: {
//         id: driver._id,
//         name: driver.name,
//         phone: driver.phone,
//         emiratesId: driver.governmentIds?.emiratesId
//       },
//       deletedAt: new Date()
//     });

//   } catch (error) {
//     console.error('Delete Account Error:', error);
//     return errorResponse(res, 'Failed to delete account', 500);
//   }
// };

// // POST /api/driver/auth/logout
// exports.logout = async (req, res) => {
//   try {
//     const driver = req.user;

//     // Clear refresh token
//     driver.refreshToken = null;
//     await driver.save();

//     await logDriverActivity(driver._id, 'LOGOUT', {
//       reason: 'User requested logout'
//     }, req);

//     return successResponse(res, 'Logged out successfully!', {
//       message: 'You have been logged out'
//     });

//   } catch (error) {
//     return errorResponse(res, 'Logout failed', 500);
//   }
// };



const mongoose = require("mongoose")
const Driver = require('../../models/Driver');
const TempDriver = require('../../models/TempDriver');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwtHelper = require('../../utils/jwtHelper');
const { generateAccessToken, generateRefreshToken } = require('../../utils/jwtHelper');
const { successResponse, errorResponse } = require('../../utils/responseHelper');
const DriverActivityLog = require('../../models/DriverActivityLog');
const { logDriverActivity } = require("../../utils/activityLogger")
const Session = require('../../models/Session');


exports.saveStep1 = async (req, res) => {
  try {
    let { tempId, fullName, contactNumber, contactCountryCode, emiratesId, vehicleNumber, region } = req.body;
    tempId = tempId || uuidv4();

    if (!fullName || !contactNumber || !emiratesId || !vehicleNumber || !region) {
      return errorResponse(res, 'All fields required', 400);
    }

    // Normalize contact number with country code
    contactCountryCode = contactCountryCode || '+971';

    const result = await TempDriver.findOneAndUpdate(
      { tempId },
      {
        $set: {
          tempId,
          personalDetails: {
            fullName: fullName.trim(),
            contactNumber,           // ← Full number with country code
            contactCountryCode: contactCountryCode,     // ← Separate country code
            emiratesId,
            vehicleNumber: vehicleNumber.toUpperCase(),
            region
          }
        }
      },
      { upsert: true, new: true }
    );

    return successResponse(res, 'Step 1 saved successfully!', {
      tempId,
      nextStep: 'step2'
    });

  } catch (error) {
    console.error('Save Step 1 Error:', error);
    return errorResponse(res, 'Failed to save Step 1', 500);
  }
};

// Step 2: Upload License
exports.saveStep2 = async (req, res) => {
  try {
    const { tempId, licenseNumber } = req.body;
    const files = req.files;

    if (!tempId || !licenseNumber || !files?.licenseFront?.[0] || !files?.licenseBack?.[0]) {
      return errorResponse(res, 'All fields required', 400);
    }

    await TempDriver.findOneAndUpdate({ tempId }, {
      license: {
        licenseNumber: licenseNumber.toUpperCase(),
        frontUrl: files.licenseFront[0].path.replace('public', ''),
        backUrl: files.licenseBack[0].path.replace('public', '')
      }
    });

    return successResponse(res, 'License saved', { nextStep: 'step3' });
  } catch (error) {
    return errorResponse(res, 'Upload failed', 500);
  }
};

// // Step 3: Upload Mulkia (was RC)
// exports.saveStep3 = async (req, res) => {
//   try {
//     const { tempId, vehicleNumber } = req.body;
//     const files = req.files;

//     if (!tempId) {
//       return errorResponse(res, 'Session ID required', 400);
//     }

//     const updateData = {};
//     if (vehicleNumber) updateData.vehicleNumber = vehicleNumber.toUpperCase();
//     if (files?.rcFront?.[0]) {
//       updateData['mulkia.frontUrl'] = files.rcFront[0].path.replace('public', '');
//     }
//     if (files?.rcBack?.[0]) {
//       updateData['mulkia.backUrl'] = files.rcBack[0].path.replace('public', '');
//     }

//     await TempDriver.findOneAndUpdate({ tempId }, { $set: updateData });

//     return successResponse(res, 'Mulkia data saved!', { nextStep: 'email-signup' });
//   } catch (error) {
//     return errorResponse(res, 'Upload failed', 500);
//   }
// };

// controllers/Driver/driverController.js → saveStep3

exports.saveStep3 = async (req, res) => {
  try {
    const { tempId, vehicleNumber } = req.body;
    const files = req.files || {};

    console.log('🔍 Step 3 Files Received:', Object.keys(files));

    if (!tempId) {
      return errorResponse(res, 'Session ID (tempId) required', 400);
    }

    const updateData = {};
    if (vehicleNumber) {
      updateData['personalDetails.vehicleNumber'] = vehicleNumber.toUpperCase();
    }

    const frontFile = files.mulkiaFront?.[0] || files.rcFront?.[0];
    const backFile = files.mulkiaBack?.[0] || files.rcBack?.[0];

    if (frontFile) {
      // ✅ FIX: 'mulkia' → 'Mulkia' (capital M — TempDriver schema ke anusaar)
      updateData['Mulkia.frontUrl'] = frontFile.path.replace('public', '');
      console.log('✅ Mulkia Front Saved:', updateData['Mulkia.frontUrl']);
    }

    if (backFile) {
      // ✅ FIX: 'mulkia' → 'Mulkia' (capital M)
      updateData['Mulkia.backUrl'] = backFile.path.replace('public', '');
      console.log('✅ Mulkia Back Saved:', updateData['Mulkia.backUrl']);
    }

    if (!frontFile && !backFile) {
      console.log('⚠️ Warning: No Mulkia files received in Step 3');
    }

    const result = await TempDriver.findOneAndUpdate(
      { tempId },
      { $set: updateData },
      { new: true, upsert: true }
    );

    // ✅ Debug: Save ke baad TempDriver print karo confirm karne ke liye
    console.log('TempDriver Mulkia after save:', {
      front: result?.Mulkia?.frontUrl || 'NOT SAVED',
      back: result?.Mulkia?.backUrl || 'NOT SAVED',
    });

    return successResponse(res, 'Mulkia (Vehicle Registration) saved successfully!', {
      nextStep: 'email-signup'
    });

  } catch (error) {
    console.error('Save Step 3 (Mulkia) Error:', error);
    return errorResponse(res, 'Upload failed', 500);
  }
};

exports.finalSignup = async (req, res) => {
  try {
    let { tempId, email, phone, countryCode } = req.body;

    countryCode = countryCode || '+971';

    const tempExists = await TempDriver.findOne({ tempId });
    if (!tempExists) {
      return errorResponse(res, 'Session expired. Please start again.', 400);
    }

    // Validate email
    if (!email || !email.includes('@')) {
      return errorResponse(res, 'Valid email address is required for OTP verification', 400);
    }

    // Check duplicate email
    const driverExists = await Driver.findOne({ email: email.toLowerCase() });
    if (driverExists) {
      return errorResponse(res, 'Email already registered', 400);
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const updated = await TempDriver.findOneAndUpdate(
      { tempId },
      {
        $set: {
          email: email.toLowerCase(),
          phone: phone || tempExists.phone,
          countryCode,
          otp,
          otpExpiresAt
        }
      },
      { new: true }
    );

    console.log('TempDriver after finalSignup:', {
      tempId: updated.tempId,
      email: updated.email,     // ← Yeh null nahi hona chahiye
      otp: updated.otp
    });

    if (!updated) {
      return errorResponse(res, 'Failed to save OTP. Try again.', 500);
    }

    // Send OTP via EMAIL (not SMS)
    try {
      const { sendOTPEmail } = require('../../utils/emailHelper');
      sendOTPEmail(email, otp, tempExists.name || 'Driver')
        .then(() => console.log("OTP email sent"))
        .catch(err => console.error("Email failed:", err.message));
      console.log(`Email OTP sent to ${email}: ${otp}`);
    } catch (emailErr) {
      console.error('Email OTP send failed:', emailErr.message);
      // Still return otp in dev for testing
    }

    return successResponse(res, 'OTP sent to your email!', {
      message: 'Check your email for 6-digit OTP code',
      ...(process.env.NODE_ENV !== 'production' && { otp }) // expose in dev only
    });

  } catch (error) {
    console.error('Final Signup Error:', error.message);
    return errorResponse(res, 'Server error', 500);
  }
};


exports.verifyOtpAndCreateDriver = async (req, res) => {
  try {
    const { tempId, phone, otp, countryCode: inputCountryCode, fcmToken } = req.body;

    const cleanedPhone = phone?.replace(/\D/g, '') || '';
    const countryCode = inputCountryCode?.trim() || '+971';

    const temp = await TempDriver.findOne({
      tempId,
      otp,
      otpExpiresAt: { $gt: new Date() }
    });

    if (!temp) {
      return errorResponse(res, 'Invalid or expired OTP', 400);
    }

    // ✅ EMAIL CHECK (IMPORTANT)
    if (!temp.email) {
      return errorResponse(res, 'Email not found. Please restart signup.', 400);
    }

    // Duplicate Checks
    const existingEmail = await Driver.findOne({ email: temp.email.toLowerCase() });
    if (existingEmail) {
      return errorResponse(res, 'Email already registered', 400);
    }

    // Duplicate Checks
    const existingEmirates = await Driver.findOne({
      'governmentIds.emiratesId': temp.personalDetails?.emiratesId
    });
    if (existingEmirates) return errorResponse(res, 'This Emirates ID is already registered', 400);

    const existingLicense = await Driver.findOne({
      licenseNumber: temp.license?.licenseNumber?.toUpperCase()
    });
    if (existingLicense) return errorResponse(res, 'This License Number is already registered', 400);

    const existingVehicle = await Driver.findOne({
      vehicleNumber: temp.personalDetails?.vehicleNumber?.toUpperCase()
    });
    if (existingVehicle) return errorResponse(res, 'This Vehicle Number is already registered', 400);

    // ================= SAFE DOCUMENTS ARRAY =================
    const documents = [];

    if (temp.license?.frontUrl) {
      documents.push({
        documentType: 'license_front',
        fileUrl: temp.license.frontUrl,
        documentNumber: temp.license.licenseNumber || ''
      });
    }

    if (temp.license?.backUrl) {
      documents.push({
        documentType: 'license_back',
        fileUrl: temp.license.backUrl,
        documentNumber: temp.license.licenseNumber || ''
      });
    }

    // ✅ FIX: temp.mulkia → temp.Mulkia (capital M)
    if (temp.Mulkia?.frontUrl) {
      documents.push({
        documentType: 'vehicle_Mulkia_front',
        fileUrl: temp.Mulkia.frontUrl,
        documentNumber: temp.personalDetails?.vehicleNumber || ''
      });
    }

    if (temp.Mulkia?.backUrl) {
      documents.push({
        documentType: 'vehicle_Mulkia_back',
        fileUrl: temp.Mulkia.backUrl,
        documentNumber: temp.personalDetails?.vehicleNumber || ''
      });
    }

    // ✅ Debug log — confirm karo ki documents array mein 4 items hain
    console.log('📄 Documents to save:', documents.map(d => d.documentType));
    // Should print: ['license_front', 'license_back', 'vehicle_Mulkia_front', 'vehicle_Mulkia_back']


    // Agar koi document nahi hai to bhi empty array bhej sakte ho (schema allow karega)
    if (documents.length === 0) {
      console.log('⚠️ Warning: No documents found for driver creation');
    }

    const driverData = {
      phone: cleanedPhone,
      countryCode,
      email: temp.email || null,   // ✅ FIX HERE
      name: temp.personalDetails?.fullName?.trim() || 'Driver',
      licenseNumber: temp.license?.licenseNumber?.toUpperCase(),
      vehicleNumber: temp.personalDetails?.vehicleNumber?.toUpperCase(),
      'address.city': temp.personalDetails?.region,
      'governmentIds.emiratesId': temp.personalDetails?.emiratesId,
      fcmToken: fcmToken || null,
      documents: documents,
      profileStatus: 'pending_pin_setup'
    };

    const driver = new Driver(driverData);
    await driver.save();

    await TempDriver.deleteOne({ tempId });

    const accessToken = jwtHelper.generateAccessToken(driver._id, 'driver');

    return successResponse(res, 'Account created successfully!', {
      accessToken,
      message: 'Now create your 4-digit PIN',
      nextStep: 'create-pin'
    });

  } catch (error) {
    console.error('Create Driver Failed:', error);

    if (error.code === 11000) {
      return errorResponse(res, 'Duplicate Emirates ID, License or Vehicle Number', 400);
    }

    return errorResponse(res, 'Failed to create account', 500);
  }
};

exports.resendOtp = async (req, res) => {
  try {
    const { tempId } = req.body;

    if (!tempId) {
      return errorResponse(res, 'tempId is required', 400);
    }

    // Find the temp driver
    const temp = await TempDriver.findOne({ tempId });

    if (!temp) {
      return errorResponse(res, 'Registration session has expired. Please start the signup process again.', 410);
    }

    // Generate new 6-digit OTP (better than 4-digit for security)
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update OTP and expiry
    temp.otp = newOtp;
    temp.otpExpiresAt = otpExpiresAt;
    await temp.save();

    // Logging for debugging
    console.log(`RESEND OTP → Phone: ${temp.phone} | TempID: ${tempId} | New OTP: ${newOtp}`);

    // Send OTP via Email (same as finalSignup)
    try {
      const { sendOTPEmail } = require('../../utils/emailHelper');
      await sendOTPEmail(
        temp.email,
        newOtp,
        temp.personalDetails?.fullName || 'Driver'
      );
      console.log(`Resend OTP Email sent successfully to ${temp.email}`);
    } catch (emailErr) {
      console.error('Resend OTP Email failed:', emailErr.message);
      // Still continue - don't fail the request just because email failed
    }

    return successResponse(res, 'New OTP sent successfully!', {
      message: 'Check your email for the new 6-digit OTP code',
      // Remove otp in production for security
      ...(process.env.NODE_ENV !== 'production' && { otp: newOtp })
    });

  } catch (error) {
    console.error('Resend OTP Error:', error);
    return errorResponse(res, 'Failed to resend OTP. Please try again.', 500);
  }
};

// Create PIN (After Final Signup)
exports.createPin = async (req, res) => {
  try {
    if (!req.user) {
      return errorResponse(res, 'Unauthorized', 401);
    }

    const { newPin, confirmPin } = req.body;

    if (String(newPin) !== String(confirmPin)) {
      return errorResponse(res, 'PINs do not match', 400);
    }

    if (!/^\d{4}$/.test(newPin)) {
      return errorResponse(res, 'PIN must be exactly 4 digits', 400);
    }

    if (req.user.profileStatus !== 'pending_pin_setup') {
      return errorResponse(res, 'Cannot set PIN at this stage', 400);
    }

    const salt = await bcrypt.genSalt(10);
    req.user.pin = await bcrypt.hash(String(newPin), salt);

    req.user.profileStatus = 'pending_verification';
    await req.user.save();

    return successResponse(res, 'PIN created successfully!', {
      message: 'Your account is now pending admin approval'
    });

  } catch (error) {
    console.error("Create PIN error:", error);
    return errorResponse(res, 'Failed to create PIN', 500);
  }
};


/////login 
// Step 1: Emirates ID + Vehicle Number 
// exports.login = async (req, res) => {
//   try {
//     const { emiratesId, vehicleNumber } = req.body;

//     if (!emiratesId || !vehicleNumber) {
//       return errorResponse(res, 'Emirates ID and Vehicle Number are required', 400);
//     }

//     const emiratesIdClean = emiratesId.trim();
//     const vehicleNumberClean = vehicleNumber.trim().toUpperCase();

//     console.log("Searching:", { emiratesIdClean, vehicleNumberClean });

//     // YE LINE SAHI KARO — single quotes hata do!
//     const driver = await Driver.findOne({
//       "governmentIds.emiratesId": emiratesIdClean,
//       vehicleNumber: vehicleNumberClean,
//       profileStatus: 'approved'
//     });

//     if (!driver) {
//       // Debug ke liye — yeh hata dena baad mein
//       const all = await Driver.find({ profileStatus: 'approved' }).select('governmentIds.emiratesId vehicleNumber name');
//       console.log("All approved drivers:", all);

//       return errorResponse(res, 'Invalid Emirates ID or Vehicle Number', 400);
//     }

//     if (!driver.pin) {
//       return errorResponse(res, 'PIN not set. Contact admin.', 400);
//     }

//     return successResponse(res, 'Credentials valid. Now enter PIN', {
//       driverId: driver._id,
//       name: driver.name,
//       phone: driver.phone,
//       vehicleNumber: driver.vehicleNumber
//     });

//   } catch (error) {
//     console.error('Login Error:', error);
//     return errorResponse(res, 'Server error', 500);
//   }
// };

// exports.login = async (req, res) => {
//   try {
//     const { emiratesId, vehicleNumber } = req.body;

//     if (!emiratesId || !vehicleNumber) {
//       return errorResponse(res, 'Emirates ID and Vehicle Number are required', 400);
//     }

//     const emiratesIdClean = emiratesId.trim();
//     const vehicleNumberClean = vehicleNumber.trim().toUpperCase();

//     // Find driver
//     const driver = await Driver.findOne({
//       "governmentIds.emiratesId": emiratesIdClean,
//       vehicleNumber: vehicleNumberClean
//     });

//     // 1️⃣ Account not found
//     if (!driver) {
//       return res.status(404).json({
//         status: false,
//         message: "No account found. Please sign up first."
//       });
//     } 

//     // 2️⃣ Account exists but not approved
//     if (driver.profileStatus !== 'approved') {
//       return res.status(403).json({
//         status: false,
//         message: "Your account is pending admin approval. Please wait until approval to login."
//       });
//     }

//     // 3️⃣ Wrong Emirates ID or Vehicle Number (already covered above, but extra safety)
//     if (!driver) {
//       return res.status(400).json({
//         status: false,
//         message: "Invalid vehicle number or Emirates ID. Please check and try again."
//       });
//     }

//     // 4️⃣ Success → PIN screen pe bhej do
//     if (!driver.pin) {
//       return errorResponse(res, 'PIN not set. Contact admin.', 400);
//     }

//     return successResponse(res, 'Login successful.', {
//       driverId: driver._id,
//       name: driver.name,
//       phone: driver.phone,
//       vehicleNumber: driver.vehicleNumber,
//       message: "Login successful. Now enter your 4-digit PIN."
//     });

//   } catch (error) {
//     console.error('Login Error:', error);
//     return errorResponse(res, 'Server error', 500);
//   }
// };  

exports.login = async (req, res) => {
  try {
    const { emiratesId, vehicleNumber } = req.body;

    if (!emiratesId || !vehicleNumber) {
      return errorResponse(res, 'Emirates ID and Vehicle Number are required', 400);
    }

    const emiratesIdClean = emiratesId.trim();
    const vehicleNumberClean = vehicleNumber.trim().toUpperCase();

    // Check if account exists with Emirates ID only
    const driverByEmiratesId = await Driver.findOne({
      "governmentIds.emiratesId": emiratesIdClean
    });

    // 1) No account found at all
    if (!driverByEmiratesId) {
      return res.status(404).json({
        status: false,
        message: "No account found. Please create an account to get started."
      });
    }

    // 2) Account found but vehicle number is wrong
    if (driverByEmiratesId.vehicleNumber !== vehicleNumberClean) {
      return res.status(400).json({
        status: false,
        message: "Invalid Emirates ID or Vehicle Number. Please check your credentials and try again."
      });
    }

    const driver = driverByEmiratesId;

    // 3) Account exists but not approved yet
    if (driver.profileStatus !== 'approved') {
      return res.status(403).json({
        status: false,
        message: "Your account is currently under review. Please wait while the admin approves your account.",
        accountStatus: driver.profileStatus
      });
    }

    // 4) PIN not set
    if (!driver.pin) {
      return errorResponse(res, 'PIN not set. Please contact admin.', 400);
    }

    // 5) Valid approved account → success
    return successResponse(res, 'Credentials verified successfully. Please enter your 4-digit PIN to continue.', {
      driverId: driver._id,
      name: driver.name,
      phone: driver.phone,
      vehicleNumber: driver.vehicleNumber,
      accountStatus: driver.profileStatus,
      isApproved: true
    });

  } catch (error) {
    console.error('Login Error:', error);
    return errorResponse(res, 'Server error', 500);
  }
};

exports.verifyPin = async (req, res) => {
  try {
    const { driverId, pin, fcmToken } = req.body;  // ← FCM token add kiya

    // Validate input
    if (!driverId || !pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return errorResponse(res, 'Valid 4-digit PIN required', 400);
    }

    // Fetch driver with required fields
    const driver = await Driver.findById(driverId).select(
      '+pin +documents +governmentIds +pinAttempts +pinLockedUntil ' +
      '+profileStatus +vehicleNumber +vehicleType +rating +address'
    );

    if (!driver) {
      return errorResponse(res, 'Driver not found', 404);
    }

    // Check approval status
    if (driver.profileStatus !== 'approved') {
      return errorResponse(res, 'Account not approved by admin yet', 403);
    }

    // Check PIN lock
    if (driver.pinLockedUntil && new Date() < driver.pinLockedUntil) {
      const minutesLeft = Math.ceil(
        (driver.pinLockedUntil - new Date()) / 60000
      );
      return errorResponse(
        res,
        `PIN locked. Try again in ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}`,
        423
      );
    }

    // Verify PIN
    const isMatch = await driver.comparePin(pin);
    if (!isMatch) {
      driver.pinAttempts = (driver.pinAttempts || 0) + 1;

      if (driver.pinAttempts >= 5) {
        driver.pinLockedUntil = new Date(Date.now() + 30 * 60 * 1000);
      }

      await driver.save();

      // Optional: Log failed attempt (very useful for security monitoring)
      await new DriverActivityLog({
        driverId: driver._id,
        action: 'LOGIN_FAILED',
        meta: {
          reason: 'Incorrect PIN',
          attempts: driver.pinAttempts,
          ip: req.ip || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown',
          timestamp: new Date().toISOString()
        }
      }).save().catch(err => console.log('Failed login log error:', err));

      return errorResponse(res, 'Incorrect PIN', 400);
    }

    // ── SUCCESSFUL LOGIN ──
    // Reset attempts & update last login
    driver.pinAttempts = 0;
    driver.pinLockedUntil = null;
    driver.lastLoginAt = new Date();

    // ★★★ FCM TOKEN UPDATE - Login time pe save/update karo ★★★
    if (fcmToken && fcmToken.trim()) {
      driver.fcmToken = fcmToken.trim();
      console.log(`FCM Token updated for driver ${driver._id}: ${fcmToken.substring(0, 20)}...`);
    }

    // ★★★ LOGIN SUCCESS LOG - Same style as vendor expects ★★★
    await new DriverActivityLog({
      driverId: driver._id,
      action: 'LOGIN',
      meta: {
        ip: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        loginMethod: 'EmiratesID + VehicleNumber + PIN',
        timestamp: new Date().toISOString(),
        emiratesId: driver.governmentIds?.emiratesId,
        vehicleNumber: driver.vehicleNumber,
        fcmTokenUpdated: !!fcmToken  // ← Track FCM token update
      },
      performedBy: null
    }).save();

    // Generate tokens
    const accessToken = generateAccessToken(driver._id, 'driver');
    const refreshToken = generateRefreshToken(driver._id, 'driver');
    driver.refreshToken = refreshToken;

    await driver.save();

    // ================= DOCUMENT EXTRACTION =================
    const docs = driver.documents || [];

    let licenseNumber = null;
    let licenseFront = null;
    let licenseBack = null;
    let MulkiaNumber = null;
    let MulkiaFront = null;
    let MulkiaBack = null;

    docs.forEach(doc => {
      switch (doc.documentType) {
        case 'license_front':
          licenseFront = doc.fileUrl;
          if (doc.documentNumber) licenseNumber = doc.documentNumber;
          break;

        case 'license_back':
          licenseBack = doc.fileUrl;
          break;

        case 'vehicle_Mulkia_front':
          MulkiaFront = doc.fileUrl;
          if (doc.documentNumber) MulkiaNumber = doc.documentNumber;
          break;

        case 'vehicle_Mulkia_back':
          MulkiaBack = doc.fileUrl;
          break;
      }
    });

    // ================= FINAL RESPONSE =================
    return successResponse(res, 'Login successful!', {
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 24 * 60 * 60
      },
      driver: {
        _id: driver._id,
        name: driver.name,
        phone: driver.phone,
        email: driver.email || null,
        region: driver.address?.city || driver.address?.country || null,
        vehicleNumber: driver.vehicleNumber,
        vehicleType: driver.vehicleType,
        emiratesId: driver.governmentIds?.emiratesId || null,
        profileImage: driver.profileImage || null,
        isAvailable: driver.isAvailable,
        rating: driver.rating || 0,
        fcmTokenRegistered: !!driver.fcmToken,  // ← Client ko batao ki token registered hai

        license: {
          number: licenseNumber,
          frontImage: licenseFront,
          backImage: licenseBack
        },
        vehicleRegistration: {
          number: MulkiaNumber,
          frontImage: MulkiaFront,
          backImage: MulkiaBack
        }
      }
    });

  } catch (error) {
    console.error('PIN Verify Error:', error);
    return errorResponse(res, 'Login failed. Please try again.', 500);
  }
};



exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return errorResponse(res, 'Refresh token required', 400);
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const driver = await Driver.findById(decoded.id);
    if (!driver || driver.refreshToken !== refreshToken) {
      return errorResponse(res, 'Invalid refresh token', 401);
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(driver._id, 'driver');

    return successResponse(res, 'Token refreshed', {
      accessToken: newAccessToken,
      expiresIn: 24 * 60 * 60
    });

  } catch (error) {
    return errorResponse(res, 'Session expired. Please login again.', 401);
  }
};


// ★★★ NEW API - FCM Token Update (agar driver app restart kare ya token change ho) ★★★
exports.updateFcmToken = async (req, res) => {
  try {
    const driver = req.user;  // auth middleware se milega
    const { fcmToken } = req.body;

    if (!fcmToken || !fcmToken.trim()) {
      return errorResponse(res, 'FCM token is required', 400);
    }

    // Token update karo
    driver.fcmToken = fcmToken.trim();
    await driver.save();

    console.log(`FCM Token updated for driver ${driver._id}`);

    // Optional: Log this activity
    await logDriverActivity(driver._id, 'FCM_TOKEN_UPDATED', {
      tokenLength: fcmToken.length,
      timestamp: new Date().toISOString()
    }, req);

    return successResponse(res, 'FCM token updated successfully', {
      fcmTokenRegistered: true
    });

  } catch (error) {
    console.error('Update FCM Token Error:', error);
    return errorResponse(res, 'Failed to update FCM token', 500);
  }
};


///////setting update profile details
// exports.updatePersonalDetails = async (req, res) => {
//   try {
//     const driver = req.user;
//     const { fullName, phone, countryCode, emiratesId, region } = req.body;

//     // Phone update with country code
//     if (phone) {
//       // if (!/^\d{10}$/.test(phone.replace(/\D/g, ''))) {
//       //   return errorResponse(res, 'Phone must be 10 digits', 400);
//       // }
//       const newCountryCode = countryCode || driver.countryCode || '+971';
//       const fullPhone = `${newCountryCode}${phone.replace(/\D/g, '')}`;

//       // Check duplicate
//       const exists = await Driver.findOne({ phone: fullPhone, _id: { $ne: driver._id } });
//       if (exists) {
//         return errorResponse(res, 'Phone number already registered', 400);
//       }

//       driver.phone = fullPhone;
//       driver.countryCode = newCountryCode;
//     }

//     if (emiratesId) {
//       const exists = await Driver.findOne({
//         'governmentIds.emiratesId': emiratesId,
//         _id: { $ne: driver._id }
//       });
//       if (exists) return errorResponse(res, 'Emirates ID already used', 400);
//     }

//     driver.name = fullName || driver.name;
//     driver.governmentIds.emiratesId = emiratesId || driver.governmentIds.emiratesId;
//     driver['address.city'] = region || driver.address?.city;

//     await driver.save();

//     await logDriverActivity(driver._id, 'PROFILE_UPDATED', {
//       changedFields: Object.keys(req.body).filter(k => req.body[k] !== undefined),
//       updatedBy: 'driver'
//     }, req);

//     return successResponse(res, 'Profile updated successfully!', {
//       driver: {
//         name: driver.name,
//         phone: driver.phone,
//         countryCode: driver.countryCode,
//         emiratesId: driver.governmentIds.emiratesId,
//         region: driver.address?.city
//       }
//     });

//   } catch (error) {
//     console.error('Update Personal Details Error:', error);
//     return errorResponse(res, 'Update failed', 500);
//   }
// };

exports.updatePersonalDetails = async (req, res) => {
  try {
    const driver = req.user;
    const { fullName, phone, countryCode, emiratesId, region } = req.body;

    // Phone update with country code
    if (phone) {
      const cleanedPhone = phone.replace(/\D/g, '');
      if (cleanedPhone.length !== 10) {
        return errorResponse(res, 'Phone must be 10 digits', 400);
      }
      const newCountryCode = countryCode || driver.countryCode || '+971';
      const fullPhone = `${newCountryCode}${cleanedPhone}`;

      // Check duplicate
      const exists = await Driver.findOne({ phone: fullPhone, _id: { $ne: driver._id } });
      if (exists) {
        return errorResponse(res, 'Phone number already registered', 400);
      }

      driver.phone = fullPhone;
      driver.countryCode = newCountryCode;
    }

    // Emirates ID duplicate check
    if (emiratesId) {
      const exists = await Driver.findOne({
        'governmentIds.emiratesId': emiratesId,
        _id: { $ne: driver._id }
      });
      if (exists) return errorResponse(res, 'Emirates ID already used', 400);
      driver.governmentIds.emiratesId = emiratesId;
    }

    // Update other fields if provided
    if (fullName) driver.name = fullName.trim();
    if (region) driver['address.city'] = region.trim();

    await driver.save();

    // Log activity
    await logDriverActivity(driver._id, 'PROFILE_UPDATED', {
      changedFields: Object.keys(req.body).filter(k => req.body[k] !== undefined),
      updatedBy: 'driver'
    }, req);

    // ================= DOCUMENT EXTRACTION (same as login) =================
    const docs = driver.documents || [];

    let licenseNumber = null;
    let licenseFront = null;
    let licenseBack = null;
    let MulkiaNumber = null;
    let MulkiaFront = null;
    let MulkiaBack = null;

    docs.forEach(doc => {
      switch (doc.documentType) {
        case 'license_front':
          licenseFront = doc.fileUrl;
          if (doc.documentNumber) licenseNumber = doc.documentNumber;
          break;
        case 'license_back':
          licenseBack = doc.fileUrl;
          break;
        case 'vehicle_Mulkia_front':
          MulkiaFront = doc.fileUrl;
          if (doc.documentNumber) MulkiaNumber = doc.documentNumber;
          break;
        case 'vehicle_Mulkia_back':
          MulkiaBack = doc.fileUrl;
          break;
      }
    });

    // ================= FULL DRIVER RESPONSE (same structure as login) =================
    return successResponse(res, 'Profile updated successfully!', {
      driver: {
        _id: driver._id,
        name: driver.name,
        phone: driver.phone,
        countryCode: driver.countryCode,
        region: driver.address?.city || driver.address?.country || null,
        vehicleNumber: driver.vehicleNumber,
        vehicleType: driver.vehicleType,
        emiratesId: driver.governmentIds?.emiratesId || null,
        profileImage: driver.profileImage || null,
        isAvailable: driver.isAvailable,
        rating: driver.rating || 0,
        fcmTokenRegistered: !!driver.fcmToken,

        license: {
          number: licenseNumber,
          frontImage: licenseFront,
          backImage: licenseBack
        },
        vehicleRegistration: {
          number: MulkiaNumber,
          frontImage: MulkiaFront,
          backImage: MulkiaBack
        }
      }
    });

  } catch (error) {
    console.error('Update Personal Details Error:', error);
    return errorResponse(res, 'Update failed', 500);
  }
};

// PUT /api/driver/profile/update-license
exports.updateLicense = async (req, res) => {
  try {
    const driver = req.user;
    const { licenseNumber } = req.body;
    const files = req.files;

    console.log('=== UPDATE LICENSE API CALLED ===');
    console.log('Driver ID:', driver._id);
    console.log('License Number from body:', licenseNumber);
    console.log('Files received:', files ? Object.keys(files) : 'No files uploaded');

    // Validation
    if (!licenseNumber && !files?.licenseFront?.[0] && !files?.licenseBack?.[0]) {
      console.log('Validation failed: Nothing to update');
      return errorResponse(res, 'Nothing to update - provide license number or files', 400);
    }

    // License number update + duplicate check
    if (licenseNumber) {
      const normalizedLicense = licenseNumber.trim().toUpperCase();
      console.log('Checking duplicate for license:', normalizedLicense);
      const exists = await Driver.findOne({
        licenseNumber: normalizedLicense,
        _id: { $ne: driver._id }
      });

      if (exists) {
        console.log('Duplicate license found');
        return errorResponse(res, 'License number already used by another driver', 400);
      }

      driver.licenseNumber = normalizedLicense;
    }

    // Clean old license documents
    console.log('Cleaning old license documents...');
    driver.documents = driver.documents.filter(d =>
      !['license_front', 'license_back'].includes(d.documentType)
    );

    // Add new front
    if (files?.licenseFront?.[0]) {
      console.log('Adding license front image');
      driver.documents.push({
        documentType: 'license_front',
        fileUrl: files.licenseFront[0].path.replace('public', ''),
        documentNumber: licenseNumber || driver.licenseNumber,
        uploadedAt: new Date()
      });
    }

    // Add new back
    if (files?.licenseBack?.[0]) {
      console.log('Adding license back image');
      driver.documents.push({
        documentType: 'license_back',
        fileUrl: files.licenseBack[0].path.replace('public', ''),
        documentNumber: licenseNumber || driver.licenseNumber,
        uploadedAt: new Date()
      });
    }

    console.log('Saving driver changes...');
    await driver.save();
    console.log('Driver saved successfully - ID:', driver._id);

    // === Logging Block - Bulletproof with debug ===
    console.log('=== Attempting to log DOCUMENT_UPLOADED ===');
    if (typeof logDriverActivity !== 'function') {
      console.error('CRITICAL: logDriverActivity is NOT a function! Import failed.');
      console.error('Current type:', typeof logDriverActivity);
    } else {
      try {
        await logDriverActivity(driver._id, 'DOCUMENT_UPLOADED', {
          documentTypes: ['license_front', 'license_back'],
          licenseNumber: licenseNumber || driver.licenseNumber || 'Not updated',
          updatedBy: 'driver_self',
          fileCount: (files?.licenseFront ? 1 : 0) + (files?.licenseBack ? 1 : 0)
        }, req);
        console.log('=== DOCUMENT_UPLOADED LOG SAVED SUCCESSFULLY ===');
      } catch (logError) {
        console.error('=== LOGGING FAILED ===', logError.message);
        console.error('Log error stack:', logError.stack);
      }
    }

    // Success response
    return successResponse(res, 'License updated successfully!', {
      licenseNumber: driver.licenseNumber || 'Not updated',
      licenseDocuments: driver.documents
        .filter(d => ['license_front', 'license_back'].includes(d.documentType))
        .map(d => ({
          type: d.documentType,
          url: d.fileUrl,
          documentNumber: d.documentNumber || 'N/A'
        }))
    });

  } catch (error) {
    console.error('Update License Error:', error.message);
    console.error('Full error stack:', error.stack);
    return errorResponse(res, 'Update failed - please try again', 500);
  }
};


// Update RC - ADD LOGGING HERE TOO
exports.updateMulkia = async (req, res) => {
  try {
    const driver = req.user;
    const files = req.files;



    // Remove old mulkia documents
    driver.documents = driver.documents.filter(d =>
      !['vehicle_Mulkia_front', 'vehicle_Mulkia_back'].includes(d.documentType)
    );

    if (files?.mulkiaFront?.[0]) {
      driver.documents.push({
        documentType: 'vehicle_Mulkia_front',
        fileUrl: files.mulkiaFront[0].path.replace('public', ''),
        uploadedAt: new Date()
      });
    }

    if (files?.mulkiaBack?.[0]) {
      driver.documents.push({
        documentType: 'vehicle_Mulkia_back',
        fileUrl: files.mulkiaBack[0].path.replace('public', ''),
        uploadedAt: new Date()
      });
    }

    await driver.save();

    await logDriverActivity(driver._id, 'DOCUMENT_UPLOADED', {
      documentTypes: ['vehicle_Mulkia_front', 'vehicle_Mulkia_back'],
    }, req);

    return successResponse(res, 'Mulkia updated successfully!', {
      vehicleNumber: driver.vehicleNumber,
      mulkiaDocuments: driver.documents
        .filter(d => ['vehicle_Mulkia_front', 'vehicle_Mulkia_back'].includes(d.documentType))
        .map(d => ({
          type: d.documentType,
          url: d.fileUrl
        }))
    });

  } catch (error) {
    console.error('Update Mulkia Error:', error);
    return errorResponse(res, 'Update failed', 500);
  }
};

// DELETE /api/account/delete/:id
exports.deleteAccount = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 'Invalid driver ID', 400);
    }

    // Find driver first
    const driver = await Driver.findById(id);
    if (!driver) {
      return errorResponse(res, 'Driver not found', 404);
    }

    // Delete everything related to this driver
    await Driver.deleteOne({ _id: id });
    await Session.deleteMany({ driverId: id });
    await TempDriver.deleteMany({ phone: driver.phone });

    console.log(`Account deleted by admin: ${driver.name} (${driver.phone})`);

    return successResponse(res, 'Account deleted successfully!', {
      deletedDriver: {
        id: driver._id,
        name: driver.name,
        phone: driver.phone,
        emiratesId: driver.governmentIds?.emiratesId
      },
      deletedAt: new Date()
    });

  } catch (error) {
    console.error('Delete Account Error:', error);
    return errorResponse(res, 'Failed to delete account', 500);
  }
};

// POST /api/driver/auth/logout
exports.logout = async (req, res) => {
  try {
    const driver = req.user;

    // ★★★ FCM Token clear karo logout pe ★★★
    driver.fcmToken = null;
    driver.refreshToken = null;
    await driver.save();

    await logDriverActivity(driver._id, 'LOGOUT', {
      reason: 'User requested logout',
      fcmTokenCleared: true  // ← Track that token was cleared
    }, req);

    return successResponse(res, 'Logged out successfully!', {
      message: 'You have been logged out. Notifications disabled.'
    });

  } catch (error) {
    console.error('Logout Error:', error);
    return errorResponse(res, 'Logout failed', 500);
  }
};