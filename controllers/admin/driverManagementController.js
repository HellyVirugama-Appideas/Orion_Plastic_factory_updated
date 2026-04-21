const mongoose = require("mongoose")
const Driver = require('../../models/Driver');
const Vehicle = require('../../models/Vehicle');
const Delivery = require('../../models/Delivery');
const Region = require('../../models/Region')
const DriverActivityLog = require("../../models/DriverActivityLog")
const { successResponse, errorResponse } = require('../../utils/responseHelper');
const {logDriverActivity} = require("../../utils/activityLogger")

//BLOCK DRIVER
exports.blockDriver = async (req, res) => {
  try {
    const { driverId } = req.params;
    console.log('[BLOCK DRIVER] Driver ID:', driverId);
    console.log('[BLOCK DRIVER] Request body:', req.body);

    // More lenient body check
    const reason = req.body?.reason?.trim() || 'No reason provided';
    const blockType = req.body?.blockType || 'temporary';
    
    // Use current date if no date provided
    const unblockDate = req.body?.unblockDate || null;

    const driver = await Driver.findById(driverId);

    if (!driver) {
      return errorResponse(res, 'Driver not found', 404);
    }

    if (driver.blockStatus?.isBlocked) {
      return errorResponse(res, 'Driver is already blocked', 400);
    }

    // Block the driver
    driver.blockStatus = {
      isBlocked: true,
      blockedAt: new Date(), // Automatic current date
      blockedBy: req.user._id || req.admin._id, // Admin who blocked
      blockReason: reason,
      blockType: blockType,
      unblockDate: unblockDate ? new Date(unblockDate) : null
    };

    driver.isActive = false;
    driver.isAvailable = false;

    await driver.save();

    // Log the activity
    try {
      await logDriverActivity(driver._id, 'BLOCKED', {
        reason: reason,
        blockType: blockType,
        unblockDate: unblockDate,
        blockedBy: req.user._id || req.admin._id,
        blockedAt: new Date().toISOString(),
        updatedBy: 'admin',
        timestamp: new Date().toISOString()
      }, req);

      console.log(`[DRIVER LOG] BLOCKED logged for driver ${driver._id}`);
    } catch (logError) {
      console.error('=== BLOCK LOGGING FAILED ===', logError.message);
      // Don't fail the main operation if logging fails
    }

    return successResponse(res, 'Driver blocked successfully', {
      driver: {
        id: driver._id,
        name: driver.name,
        phone: driver.phone,
        email: driver.email,
        isActive: driver.isActive,
        blockStatus: driver.blockStatus
      }
    });

  } catch (error) {
    console.error('Block Driver Error:', error.message);
    console.error('Full error:', error);
    return errorResponse(res, 'Failed to block driver: ' + error.message, 500);
  }
};

//UNBLOCK DRIVER
exports.unblockDriver = async (req, res) => {
  try {
    const { driverId } = req.params;
    console.log('[UNBLOCK DRIVER] Driver ID:', driverId);

    const notes = req.body?.notes?.trim() || 'Unblocked by admin';

    const driver = await Driver.findById(driverId);

    if (!driver) {
      return errorResponse(res, 'Driver not found', 404);
    }

    if (!driver.blockStatus?.isBlocked) {
      return errorResponse(res, 'Driver is not currently blocked', 400);
    }

    // Unblock driver
    driver.blockStatus.isBlocked = false;
    driver.blockStatus.blockedAt = null;
    driver.blockStatus.blockedBy = null;
    driver.blockStatus.blockReason = null;
    driver.blockStatus.blockType = null;
    driver.blockStatus.unblockDate = null;

    driver.isActive = true;
    driver.isAvailable = true;

    if (notes) {
      driver.notes = notes;
    }

    await driver.save();

    // Log the activity
    try {
      await logDriverActivity(driver._id, 'UNBLOCKED', {
        notes: notes,
        unblockedBy: req.user._id || req.admin._id,
        unblockedAt: new Date().toISOString(),
        updatedBy: 'admin',
        timestamp: new Date().toISOString()
      }, req);

      console.log(`[DRIVER LOG] UNBLOCKED logged for driver ${driver._id}`);
    } catch (logError) {
      console.error('=== UNBLOCK LOGGING FAILED ===', logError.message);
    }

    return successResponse(res, 'Driver unblocked successfully', {
      driver: {
        id: driver._id,
        name: driver.name,
        phone: driver.phone,
        email: driver.email,
        isActive: driver.isActive,
        blockStatus: driver.blockStatus
      }
    });

  } catch (error) {
    console.error('Unblock Driver Error:', error);
    return errorResponse(res, 'Failed to unblock driver: ' + error.message, 500);
  }
};


// UPDATE BANK DETAILS
exports.updateBankDetails = async (req, res) => {
  try {
    const { driverId } = req.params;
    const { accountHolderName, accountNumber, ifscCode, bankName, branch, accountType } = req.body;

    const driver = await Driver.findById(driverId);

    if (!driver) {
      return errorResponse(res, 'Driver not found', 404);
    }

    driver.bankDetails = {
      accountHolderName,
      accountNumber,
      ifscCode,
      bankName,
      branch,
      accountType
    };

    await driver.save();

    return successResponse(res, 'Bank details updated successfully', {
      driver: {
        id: driver._id,
        name: driver.name,
        bankDetails: driver.bankDetails
      }
    });

  } catch (error) {
    console.error('Update Bank Details Error:', error);
    return errorResponse(res, 'Failed to update bank details', 500);
  }
};

//GET DRIVER PERFORMANCE

exports.getDriverPerformance = async (req, res) => {
  try {
    const { driverId } = req.params;
    const { startDate, endDate } = req.query;

    const driver = await Driver.findById(driverId)
      .select('name email phone performance');

    if (!driver) {
      return errorResponse(res, 'Driver not found', 404);
    }

    // Get delivery statistics for date range
    let dateFilter = { driverId: driver._id };

    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    const deliveryStats = await Delivery.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalDeliveries: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          },
          onTime: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'delivered'] },
                    { $lte: ['$actualDeliveryTime', '$scheduledDeliveryTime'] }
                  ]
                },
                1,
                0
              ]
            }
          },
          totalDistance: { $sum: '$distance' }
        }
      }
    ]);

    const stats = deliveryStats[0] || {
      totalDeliveries: 0,
      completed: 0,
      cancelled: 0,
      onTime: 0,
      totalDistance: 0
    };

    const onTimeRate = stats.completed > 0
      ? ((stats.onTime / stats.completed) * 100).toFixed(2)
      : 0;

    return successResponse(res, 'Driver performance retrieved successfully', {
      driver: {
        id: driver._id,
        name: driver.name,
        email: driver.email,
        phone: driver.phone
      },
      performance: {
        ...driver.performance.toObject(),
        periodStats: {
          totalDeliveries: stats.totalDeliveries,
          completedDeliveries: stats.completed,
          cancelledDeliveries: stats.cancelled,
          onTimeDeliveries: stats.onTime,
          onTimeDeliveryRate: parseFloat(onTimeRate),
          totalDistance: stats.totalDistance
        }
      }
    });

  } catch (error) {
    console.error('Get Driver Performance Error:', error);
    return errorResponse(res, 'Failed to retrieve driver performance', 500);
  }
};

//  GET ALL DRIVERS (WITH FILTERS)
exports.getAllDrivers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      profileStatus,
      isBlocked,
      vehicleType,
      isAvailable,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    // Filters
    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;
    if (profileStatus) query.profileStatus = profileStatus;
    if (isBlocked === 'true') query['blockStatus.isBlocked'] = true;
    if (isBlocked === 'false') query['blockStatus.isBlocked'] = false;
    if (vehicleType) query.vehicleType = vehicleType;
    if (isAvailable === 'true') query.isAvailable = true;
    if (isAvailable === 'false') query.isAvailable = false;

    // Search
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { licenseNumber: { $regex: search, $options: 'i' } },
        { vehicleNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [drivers, total] = await Promise.all([
      Driver.find(query)
        .select('-password -pin -resetPinToken -resetPinExpires')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      Driver.countDocuments(query)
    ]);

    return successResponse(res, 'Drivers retrieved successfully', {
      drivers,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get All Drivers Error:', error);
    return errorResponse(res, 'Failed to retrieve drivers', 500);
  }
};

exports.getDriverDetails = async (req, res) => {
  try {
    const driverId = req.params.driverId || req.params.id;

    if (!driverId) {
      return errorResponse(res, 'Driver ID is required', 400);
    }

    // Validate MongoDB ObjectId
    if (!driverId.match(/^[0-9a-fA-F]{24}$/)) {
      return errorResponse(res, 'Invalid Driver ID format', 400);
    }

    const driver = await Driver.findById(driverId)
      .select(`
        name email phone alternatePhone address aadhaarNumber licenseNumber
        licenseExpiry bloodGroup dateOfBirth joiningDate status isActive
        emergencyContact profileImage currentLocation
        totalTrips completedTrips cancelledTrips rating averageRating
        totalEarnings walletBalance bankDetails documents createdAt updatedAt
      `)
      .lean();

    if (!driver) {
      return errorResponse(res, 'Driver not found', 404);
    }

    // Assigned vehicle
    const assignedVehicle = await Vehicle.findOne({ assignedDriver: driverId })
      .select('vehicleNumber vehicleType currentMeterReading status')
      .lean();

    driver.assignedVehicle = assignedVehicle || null;

    return successResponse(res, 'Driver details fetched successfully', driver);

  } catch (error) {
    console.error('Get driver details error:', error);
    return errorResponse(res, 'Server error', 500);
  }
};

// GET DRIVER STATISTICS 
exports.getDriverStatistics = async (req, res) => {
  try {
    const [
      totalDrivers,
      activeDrivers,
      availableDrivers,
      blockedDrivers,
      pendingApproval,
      approvedDrivers,
      driversByVehicleType,
      topPerformers
    ] = await Promise.all([
      Driver.countDocuments(),
      Driver.countDocuments({ isActive: true }),
      Driver.countDocuments({ isAvailable: true, profileStatus: 'approved' }),
      Driver.countDocuments({ 'blockStatus.isBlocked': true }),
      Driver.countDocuments({ profileStatus: 'pending_verification' }),
      Driver.countDocuments({ profileStatus: 'approved' }),
      Driver.aggregate([
        { $match: { vehicleType: { $ne: null } } },
        { $group: { _id: '$vehicleType', count: { $sum: 1 } } }
      ]),
      Driver.find({ profileStatus: 'approved' })
        .select('name email performance.averageRating performance.totalDeliveries')
        .sort({ 'performance.averageRating': -1, 'performance.totalDeliveries': -1 })
        .limit(10)
    ]);

    return successResponse(res, 'Driver statistics retrieved successfully', {
      totalDrivers,
      activeDrivers,
      availableDrivers,
      blockedDrivers,
      pendingApproval,
      approvedDrivers,
      driversByVehicleType,
      topPerformers
    });

  } catch (error) {
    console.error('Get Driver Statistics Error:', error);
    return errorResponse(res, 'Failed to retrieve driver statistics', 500);
  }
};

// GET - Render Create Driver Form (EJS)
exports.getCreateDriver = async (req, res) => {
  try {
    console.log('[CREATE FORM] Loading create driver form');

    // Fetch all active regions
    const regions = await Region.find({ isActive: true })
      .select('regionName regionCode state')
      .sort({ regionName: 1 })
      .lean();

    res.render('driver_add', {
      title: 'Create New Driver',
      user: req.admin,
      url: req.originalUrl,
      regions
    });
  } catch (error) {
    console.error('[CREATE FORM] Error:', error);
    res.redirect('/admin/drivers?error=Failed to load create form');
  }
};

// POST - Create New Driver (Admin Only) - With File Uploads
// exports.createDriver = async (req, res) => {
//   try {
//     console.log('[CREATE-DRIVER] Body:', req.body);
//     console.log('[CREATE-DRIVER] Files:', req.files ? Object.keys(req.files) : 'No files');

//     const {
//       fullName,
//       contactCountryCode,
//       contactNumber,
//       emiratesId,
//       vehicleNumber,
//       registrationNumber,
//       region,
//       licenseNumber,
//       pin
//     } = req.body;

//     // Validation - Required fields
//     if (!fullName || !contactNumber || !licenseNumber) {
//       req.flash('error', 'Full Name, phone, and license number are required');
//       return res.redirect('/admin/drivers/create');
//     }

//     // ✅ Emirates ID is required
//     if (!emiratesId || emiratesId.trim() === '') {
//       req.flash('error', 'Emirates ID is required');
//       return res.redirect('/admin/drivers/create');
//     }

//     // Format phone number
//     const code = contactCountryCode || '+91';
//     const number = contactNumber.replace(/\D/g, '');

//     // Validate phone length for Indian numbers
//     if (code === '+91' && number.length !== 10) {
//       req.flash('error', 'Indian phone number must be exactly 10 digits');
//       return res.redirect('/admin/drivers/create');
//     }

//     const fullPhone = `${code}${number}`;

//     // ✅ Map emiratesId properly (NOT null)
//     const governmentIds = {
//       emiratesId: emiratesId.trim()
//     };

//     // ✅ FIX: Build documents array instead of top-level fields
//     const documents = [];

//     if (req.files?.licenseFront?.[0]) {
//       documents.push({
//         documentType: 'license_front',
//         fileUrl: req.files.licenseFront[0].filename, // Store only filename
//         uploadedAt: new Date(),
//         verificationStatus: 'pending'
//       });
//     }

//     if (req.files?.licenseBack?.[0]) {
//       documents.push({
//         documentType: 'license_back',
//         fileUrl: req.files.licenseBack[0].filename,
//         uploadedAt: new Date(),
//         verificationStatus: 'pending'
//       });
//     }

//     if (req.files?.rcFront?.[0]) {
//       documents.push({
//         documentType: 'vehicle_rc_front',
//         fileUrl: req.files.rcFront[0].filename,
//         uploadedAt: new Date(),
//         verificationStatus: 'pending'
//       });
//     }

//     if (req.files?.rcBack?.[0]) {
//       documents.push({
//         documentType: 'vehicle_rc_back',
//         fileUrl: req.files.rcBack[0].filename,
//         uploadedAt: new Date(),
//         verificationStatus: 'pending'
//       });
//     }

//     console.log('[CREATE-DRIVER] Documents array:', documents);

//     // Create new driver
//     const newDriver = new Driver({
//       name: fullName,
//       phone: fullPhone,
//       licenseNumber,
//       vehicleNumber: vehicleNumber || null,
//       registrationNumber: registrationNumber || null,
//       governmentIds,
//       region: region || null,
//       pin: pin || undefined,
//       documents, // ✅ Store as array
//       isActive: true,
//       isAvailable: true,
//       profileStatus: 'pending_verification',
//     });

//     await newDriver.save();

//     console.log('[CREATE-DRIVER] Successfully created:', newDriver._id);
//     req.flash('success', 'Driver created successfully!');
//     res.redirect(`/admin/drivers/view/${newDriver._id}`);

//   } catch (error) {
//     console.error('[CREATE-DRIVER] ERROR:', error);

//     let errorMsg = 'Failed to create driver';

//     if (error.code === 11000) {
//       const field = Object.keys(error.keyPattern || {})[0];
//       errorMsg = `Duplicate ${field}: This value already exists`;
//     } else if (error.name === 'ValidationError') {
//       errorMsg = Object.values(error.errors).map(err => err.message).join(', ');
//     } else if (error.message) {
//       errorMsg = error.message;
//     }

//     req.flash('error', errorMsg);
//     res.redirect('/admin/drivers/create');
//   }
// };

exports.createDriver = async (req, res) => {
  try {
    console.log('[CREATE-DRIVER] Body:', req.body);
    console.log('[CREATE-DRIVER] Files:', req.files ? Object.keys(req.files) : 'No files');

    const {
      fullName,
      email,
      contactCountryCode,
      contactNumber,
      eidNumber,
      vehicleNumber,
      region,
      licenseNumber,
      pin
    } = req.body;

    if (!fullName || !contactNumber || !licenseNumber) {
      req.flash('error', 'Full Name, phone, and license number are required');
      return res.redirect('/admin/drivers/create');
    }

    if (!email || !email.includes('@')) {
      req.flash('error', 'Valid email address is required for sending login credentials');
      return res.redirect('/admin/drivers/create');
    }

    const code = contactCountryCode || '+971';
    const number = contactNumber.replace(/\D/g, '');
    const fullPhone = `${code}${number}`;

    const documents = [];
    const baseUrl = process.env.NODE_ENV === 'production'
      ? (process.env.APP_URL || 'https://yourdomain.com')
      : 'http://localhost:5001';
    const documentBasePath = '/uploads/documents/';

    const addDocument = (fieldName, docType) => {
      if (req.files?.[fieldName]?.[0]) {
        const file = req.files[fieldName][0];
        const fileUrl = documentBasePath + file.filename;
        documents.push({
          documentType: docType,
          fileUrl: fileUrl,
          fullUrl: `${baseUrl}${fileUrl}`,
          uploadedAt: new Date(),
          verificationStatus: 'pending'
        });
      }
    };

    addDocument('licenseFront', 'license_front');
    addDocument('licenseBack', 'license_back');
    addDocument('MulkiaFront', 'vehicle_Mulkia_front');
    addDocument('MulkiaBack', 'vehicle_Mulkia_back');

    const newDriver = new Driver({
      name: fullName,
      email: email.toLowerCase().trim(),
      phone: fullPhone,
      licenseNumber,
      vehicleNumber: vehicleNumber || null,
      governmentIds: { eidNumber: eidNumber?.trim() || null },
      region: region || null,
      pin: pin || undefined,
      documents,
      isActive: true,
      isAvailable: true,
      profileStatus: 'pending_verification',
    });

    await newDriver.save();

    // ── Send login credentials via email (SMTP) ──
    try {
      const { sendEmail } = require('../../utils/emailHelper');
      const appName = process.env.APP_NAME || 'Orion';
      const loginPin = pin || '(set by admin)';

      const emailHtml = `
        <div style="font-family:Arial,sans-serif;max-width:540px;margin:auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#1a237e,#3949ab);padding:24px;text-align:center;">
            <h2 style="color:white;margin:0;">${appName} Driver App</h2>
            <p style="color:#c5cae9;margin:6px 0 0;">Your Login Credentials</p>
          </div>
          <div style="padding:28px;">
            <p style="font-size:15px;color:#333;">Hello <strong>${fullName}</strong>,</p>
            <p style="color:#555;">Your driver account has been created by the admin. Use the details below to log in:</p>
            <table style="width:100%;border-collapse:collapse;margin:20px 0;">
              <tr><td style="padding:10px;background:#f5f5f5;border-radius:4px 0 0 4px;width:40%;color:#888;font-size:13px;">Phone</td>
                  <td style="padding:10px;background:#f5f5f5;border-radius:0 4px 4px 0;font-weight:600;color:#1a237e;">${fullPhone}</td></tr>
              <tr><td style="padding:10px;width:40%;color:#888;font-size:13px;">Email</td>
                  <td style="padding:10px;font-weight:600;color:#1a237e;">${email}</td></tr>
              <tr><td style="padding:10px;background:#f5f5f5;border-radius:4px 0 0 4px;width:40%;color:#888;font-size:13px;">PIN</td>
                  <td style="padding:10px;background:#f5f5f5;border-radius:0 4px 4px 0;font-weight:600;font-size:22px;letter-spacing:6px;color:#e53935;">${loginPin}</td></tr>
            </table>
            <p style="color:#e53935;font-size:13px;">⚠️ Please change your PIN after first login for security.</p>
            <p style="color:#555;font-size:13px;">If you have any issues logging in, contact your admin.</p>
          </div>
          <div style="background:#f5f5f5;padding:12px;text-align:center;font-size:12px;color:#999;">
            ${appName} | This is an automated email — do not reply
          </div>
        </div>`;

      await sendEmail(email, `${appName} — Your Driver Login Credentials`, emailHtml);
      console.log('[CREATE-DRIVER] Login email sent to:', email);
    } catch (emailErr) {
      // Don't fail driver creation if email fails
      console.error('[CREATE-DRIVER] Email send failed:', emailErr.message);
    }

    console.log('[CREATE-DRIVER] Successfully created:', newDriver._id);
    req.flash('success', `Driver created! Login credentials sent to ${email}`);
    res.redirect(`/admin/drivers/view/${newDriver._id}`);

  } catch (error) {
    console.error('[CREATE-DRIVER] ERROR:', error);
    let errorMsg = 'Failed to create driver';
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      errorMsg = `Duplicate ${field}: This value already exists`;
    } else if (error.name === 'ValidationError') {
      errorMsg = Object.values(error.errors).map(err => err.message).join(', ');
    } else if (error.message) {
      errorMsg = error.message;
    }
    req.flash('error', errorMsg);
    res.redirect('/admin/drivers/create');
  }
};

// Render Edit Form (GET)
exports.getEditDriverForm = async (req, res) => {
  try {
    const { driverId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(driverId)) {
      req.flash('error', 'Invalid driver ID');
      return res.redirect('/admin/drivers');
    }

    const driver = await Driver.findById(driverId)
      .select('-password -pin -resetPinToken -resetPinExpires')
      .lean();

    if (!driver) {
      req.flash('error', 'Driver not found');
      return res.redirect('/admin/drivers');
    }

    res.render('edit-driver', {
      title: `Edit Driver - ${driver.name}`,
      user: req.admin,
      driver,
      url: req.originalUrl,
      messages: req.flash()
    });

  } catch (err) {
    console.error('Get Edit Driver Error:', err);
    req.flash('error', 'Failed to load edit form');
    res.redirect('/admin/drivers');
  }
};

// UPDATE DRIVER
exports.updateDriverDetails = async (req, res) => {
  try {
    const { driverId } = req.params;

    console.log('[UPDATE-DRIVER] Body:', req.body);
    console.log('[UPDATE-DRIVER] Files:', req.files ? Object.keys(req.files) : 'No files');

    const updates = { ...req.body };

    if (updates.fullName) {
      updates.name = updates.fullName;
      delete updates.fullName;
    }

    const uniqueFields = ['vehicleNumber', 'licenseNumber'];
    uniqueFields.forEach(field => {
      if (updates[field] === '' || updates[field] === undefined) {
        updates[field] = null;
      }
    });

    if (updates.region === '') {
      updates.region = null;
    }

    ['password', 'pin', 'role', 'blockStatus', 'performance', 'fcmToken'].forEach(f => delete updates[f]);

    if (updates.contactCountryCode || updates.contactNumber) {
      const code = updates.contactCountryCode || '+91';
      const number = (updates.contactNumber || '').replace(/\D/g, '');

      if (code === '+91' && number.length !== 10) {
        throw new Error('Indian phone number must be exactly 10 digits');
      }

      updates.phone = `${code}${number}`;
      delete updates.contactCountryCode;
      delete updates.contactNumber;
    }

    if (updates.emiratesId !== undefined) {
      updates.governmentIds = {
        ...(updates.governmentIds || {}),
        emiratesId: updates.emiratesId?.trim() || null
      };
      delete updates.emiratesId;
    }

    if (req.files && Object.keys(req.files).length > 0) {
      console.log('[UPDATE-DRIVER] Processing files:', Object.keys(req.files));

      const currentDriver = await Driver.findById(driverId).select('documents');
      let documents = currentDriver?.documents || [];

      documents = documents.filter(doc => doc && doc.documentType);

      const baseUrl = process.env.NODE_ENV === 'production'
        ? 'https://yourdomain.com'
        : 'http://localhost:5001';

      const documentBasePath = '/uploads/documents/';

      const documentMapping = {
        licenseFront: 'license_front',
        licenseBack: 'license_back',
        MulkiaFront: 'vehicle_Mulkia_front',
        MulkiaBack: 'vehicle_Mulkia_back'
      };

      const consoleDetails = {};

      for (const [fieldName, docType] of Object.entries(documentMapping)) {
        if (req.files[fieldName]?.[0]) {
          const file = req.files[fieldName][0];
          const relativePath = documentBasePath + file.filename;

          const existingIndex = documents.findIndex(d => d.documentType === docType);

          if (existingIndex >= 0) {
            documents[existingIndex] = {
              documentType: docType,
              fileUrl: relativePath,
              uploadedAt: new Date(),
              verificationStatus: 'pending'
            };
          } else {
            documents.push({
              documentType: docType,
              fileUrl: relativePath,
              uploadedAt: new Date(),
              verificationStatus: 'pending'
            });
          }

          consoleDetails[docType] = `${baseUrl}${relativePath}`;
          console.log(`[UPDATE-DRIVER] ${existingIndex >= 0 ? 'Updated' : 'Added'} ${docType}: ${file.filename}`);
        }
      }

      // Show nice console output like in create driver
      if (Object.keys(consoleDetails).length > 0) {
        console.log('[UPDATE-DRIVER] Fixed Document URLs:', consoleDetails);
      }

      updates.documents = documents;
    }

    console.log('[UPDATE-DRIVER] Final updates:', updates);

    // Perform the update
    const driver = await Driver.findByIdAndUpdate(
      driverId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password -pin -__v');

    if (!driver) {
      req.flash('error', 'Driver not found');
      return res.redirect(`/admin/drivers/edit/${driverId}`);
    }

    console.log('[UPDATE-DRIVER] Successfully updated:', driver.name);
    req.flash('success', 'Driver updated successfully!');
    res.redirect(`/admin/drivers/view/${driverId}`);

  } catch (error) {
    console.error('[UPDATE-DRIVER] ERROR:', error);

    let msg = error.message || 'Failed to update driver';

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      msg = `Duplicate ${field}: This value already exists`;
    } else if (error.name === 'ValidationError') {
      msg = Object.values(error.errors)
        .map(e => e.message)
        .join(', ');
    }

    req.flash('error', msg);
    res.redirect(`/admin/drivers/edit/${req.params.driverId}`);
  }
};

// DELETE DRIVER
exports.deleteDriver = async (req, res) => {
  try {
    const { driverId } = req.params;

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(driverId)) {
      req.flash('error', 'Invalid driver ID');
      return res.redirect('/admin/drivers');
    }

    // Find and delete the driver
    const driver = await Driver.findByIdAndDelete(driverId);

    if (!driver) {
      req.flash('error', 'Driver not found');
      return res.redirect('/admin/drivers');
    }

    // Optional: Clean up related data (if any)
    // Example: Remove from Vehicle assignedDriver if exists
    // await Vehicle.updateMany({ assignedDriver: driverId }, { $unset: { assignedDriver: "" } });

    // Optional: Delete uploaded files (license, RC, etc.) from disk
    // You can use fs.unlink if you want to remove physical files
    // Example:
    if (driver.licenseFront) fs.unlinkSync(path.join(__dirname, '../../public', driver.licenseFront));
    if (driver.licenseBack) fs.unlinkSync(path.join(__dirname, '../../public', driver.licenseBack));


    req.flash('success', `Driver ${driver.name} (${driver.phone}) deleted successfully`);
    res.redirect('/admin/drivers');

  } catch (error) {
    console.error('Delete Driver Error:', error);
    req.flash('error', 'Failed to delete driver. Please try again.');
    res.redirect('/admin/drivers');
  }
};

exports.toggleDriverStatus = async (req, res) => {
  try {
    const { driverId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    driver.isActive = isActive;
    driver.isAvailable = isActive;
    await driver.save();

    return res.json({
      success: true,
      message: `Driver ${isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('[TOGGLE-DRIVER-STATUS] Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET - Driver Activity Logs (Similar to vendor logs) 
exports.getDriverLogs = async (req, res) => {
  try {
    const { driverId } = req.params;

    // Validate driverId
    if (!mongoose.Types.ObjectId.isValid(driverId)) {
      req.flash('red', 'Invalid driver ID');
      return res.redirect('/admin/drivers');
    }

    // Check if driver exists
    const driverExists = await Driver.exists({ _id: driverId });
    if (!driverExists) {
      req.flash('red', 'Driver not found!');
      return res.redirect('/admin/drivers');
    }

    const logs = await DriverActivityLog.find({ driverId })
      .populate('driverId', 'name phone email')
      .populate('performedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.render('driver_logs', {
      logs,
      driverId,
      title: 'Driver Activity Logs',
      messages: req.flash(),
      user: req.admin,
      url: req.originalUrl
    });

  } catch (error) {
    console.error('Driver Logs Error:', error);

    if (error.name === 'CastError') {
      req.flash('red', 'Invalid driver ID');
    } else {
      req.flash('red', error.message || 'Error fetching driver logs');
    }

    res.redirect('/admin/drivers');
  }
};

module.exports = exports;