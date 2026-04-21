// const Document = require('../../models/Document');
// const Driver = require('../../models/Driver');
// const Admin = require('../../models/Admin');
// const { successResponse, errorResponse } = require('../../utils/responseHelper');

// // Get All Documents for Verification
// exports.getAllDocuments = async (req, res) => {
//   try {
//     const { page = 1, limit = 10, status, documentType, driverId } = req.query;

//     // Build query
//     const query = {};
//     if (status) query.status = status;
//     if (documentType) query.documentType = documentType;
//     if (driverId) query.driverId = driverId;

//     // Get documents
//     const documents = await Document.find(query)
//       .populate({
//         path: 'driverId',
//         populate: {
//           path: 'userId',
//           select: 'name email phone'
//         }
//       })
//       .populate('verifiedBy', 'name email')
//       .sort({ uploadedAt: -1 })
//       .limit(limit * 1)
//       .skip((page - 1) * limit);

//     const total = await Document.countDocuments(query);

//     successResponse(res, 'Documents retrieved successfully', {
//       documents,
//       pagination: {
//         total,
//         page: parseInt(page),
//         pages: Math.ceil(total / limit)
//       }
//     });
//   } catch (error) {
//     errorResponse(res, error.message);
//   }
// };

// // Get Pending Documents
// exports.getPendingDocuments = async (req, res) => {
//   try {
//     const { page = 1, limit = 10 } = req.query;

//     const documents = await Document.find({ status: 'pending' })
//       .populate({ 
//         path: 'driverId',
//         populate: {
//           path: 'userId',
//           select: 'name email phone'
//         }
//       })
//       .sort({ uploadedAt: 1 }) // Oldest first
//       .limit(limit * 1)
//       .skip((page - 1) * limit);

//     const total = await Document.countDocuments({ status: 'pending' });

//     successResponse(res, 'Pending documents retrieved successfully', {
//       documents,
//       pagination: {
//         total,
//         page: parseInt(page),
//         pages: Math.ceil(total / limit)
//       }
//     });
//   } catch (error) {
//     errorResponse(res, error.message);
//   }
// };

// // Get Single Document
// exports.getDocumentDetails = async (req, res) => {
//   try {
//     const { documentId } = req.params;

//     const document = await Document.findById(documentId)
//       .populate({
//         path: 'driverId',
//         populate: {
//           path: 'userId',
//           select: 'name email phone profileImage'
//         }
//       })
//       .populate('verifiedBy', 'name email department');

//     if (!document) {
//       return errorResponse(res, 'Document not found', 404);
//     }

//     successResponse(res, 'Document details retrieved successfully', { document });
//   } catch (error) {
//     errorResponse(res, error.message);
//   }
// };

// // Get Driver Documents
// exports.getDriverDocuments = async (req, res) => {
//   try {
//     const { driverId } = req.params;

//     const driver = await Driver.findById(driverId);
//     if (!driver) {
//       return errorResponse(res, 'Driver not found', 404);
//     }

//     const documents = await Document.find({ driverId })
//       .populate('verifiedBy', 'name email')
//       .sort({ uploadedAt: -1 });

//     successResponse(res, 'Driver documents retrieved successfully', {
//       documents,
//       driver: {
//         id: driver._id,
//         profileStatus: driver.profileStatus
//       }
//     });
//   } catch (error) {
//     errorResponse(res, error.message);
//   }
// };

// // Verify Document (Approve)
// exports.verifyDocument = async (req, res) => {
//   try {
//     const { documentId } = req.params;

//     const document = await Document.findById(documentId);
//     if (!document) {
//       return errorResponse(res, 'Document not found', 404);
//     }

//     // Get admin
//     const admin = await Admin.findOne({ userId: req.user._id });
//     if (!admin) {
//       return errorResponse(res, 'Admin profile not found', 404);
//     }

//     // Update document status
//     document.status = 'verified';
//     document.verifiedBy = admin._id;
//     document.verifiedAt = new Date();
//     document.rejectionReason = null;
//     await document.save();

//     // Check if all driver documents are verified
//     const driver = await Driver.findById(document.driverId);
//     const allDocuments = await Document.find({ driverId: driver._id });

//     const allVerified = allDocuments.every(doc => doc.status === 'verified');
//     const hasRejected = allDocuments.some(doc => doc.status === 'rejected');

//     // Update driver profile status
//     if (allVerified && allDocuments.length >= 3) { // Assuming minimum 3 documents required
//       driver.profileStatus = 'approved';
//     } else if (hasRejected) {
//       driver.profileStatus = 'rejected';
//     } else {
//       driver.profileStatus = 'pending_verification';
//     }
//     await driver.save();

//     successResponse(res, 'Document verified successfully', {
//       document,
//       driverProfileStatus: driver.profileStatus
//     });
//   } catch (error) {
//     errorResponse(res, error.message);
//   }
// };

// // Reject Document
// exports.rejectDocument = async (req, res) => {
//   try {
//     const { documentId } = req.params;
//     const { rejectionReason } = req.body;

//     if (!rejectionReason) {
//       return errorResponse(res, 'Rejection reason is required', 400);
//     }

//     const document = await Document.findById(documentId);
//     if (!document) {
//       return errorResponse(res, 'Document not found', 404);
//     }

//     // Get admin
//     const admin = await Admin.findOne({ userId: req.user._id });
//     if (!admin) {
//       return errorResponse(res, 'Admin profile not found', 404);
//     }

//     // Update document status
//     document.status = 'rejected';
//     document.verifiedBy = admin._id;
//     document.verifiedAt = new Date();
//     document.rejectionReason = rejectionReason;
//     await document.save();

//     // Update driver profile status
//     const driver = await Driver.findById(document.driverId);
//     driver.profileStatus = 'rejected';
//     await driver.save();

//     successResponse(res, 'Document rejected successfully', {
//       document,
//       driverProfileStatus: driver.profileStatus
//     });
//   } catch (error) {
//     errorResponse(res, error.message);
//   }
// };

// // Approve Driver Profile
// exports.approveDriverProfile = async (req, res) => {
//   try {
//     const { driverId } = req.params;

//     const driver = await Driver.findById(driverId);
//     if (!driver) {
//       return errorResponse(res, 'Driver not found', 404);
//     }

//     // Check if all required documents are uploaded and verified
//     const documents = await Document.find({ driverId });

//     const requiredDocTypes = ['license', 'insurance', 'registration'];
//     const uploadedDocTypes = documents.map(doc => doc.documentType);
//     const missingDocs = requiredDocTypes.filter(type => !uploadedDocTypes.includes(type));

//     if (missingDocs.length > 0) {
//       return errorResponse(res, `Missing required documents: ${missingDocs.join(', ')}`, 400);
//     }

//     const allVerified = documents.every(doc => doc.status === 'verified');
//     if (!allVerified) {
//       return errorResponse(res, 'All documents must be verified before approving profile', 400);
//     }

//     // Approve profile
//     driver.profileStatus = 'approved';
//     await driver.save();

//     successResponse(res, 'Driver profile approved successfully', { driver });
//   } catch (error) {
//     errorResponse(res, error.message);
//   }
// };

// // Reject Driver Profile
// exports.rejectDriverProfile = async (req, res) => {
//   try {
//     const { driverId } = req.params;
//     const { rejectionReason } = req.body;

//     const driver = await Driver.findById(driverId);
//     if (!driver) {
//       return errorResponse(res, 'Driver not found', 404);
//     }

//     // Reject profile
//     driver.profileStatus = 'rejected';
//     await driver.save();

//     successResponse(res, 'Driver profile rejected successfully', { driver });
//   } catch (error) {
//     errorResponse(res, error.message);
//   }
// };


const mongoose = require("mongoose")
const Driver = require('../../models/Driver');
const Admin = require('../../models/Admin');
const { successResponse, errorResponse } = require('../../utils/responseHelper');

// Get All Documents (from all drivers)
exports.getAllDocuments = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, documentType, driverId } = req.query;

    const query = {};
    if (status) query['documents.status'] = status;
    if (documentType) query['documents.documentType'] = documentType;
    if (driverId) query._id = driverId;

    const drivers = await Driver.find(query)
      .select('name phone email licenseNumber vehicleNumber documents profileStatus')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Flatten documents for response
    const allDocuments = [];
    drivers.forEach(driver => {
      driver.documents.forEach(doc => {
        allDocuments.push({
          ...doc.toObject(),
          driver: {
            _id: driver._id,
            name: driver.name,
            email: driver.email,
            phone: driver.phone,
            licenseNumber: driver.licenseNumber,
            vehicleNumber: driver.vehicleNumber,
            profileStatus: driver.profileStatus
          }
        });
      });
    });

    const total = await Driver.aggregate([
      { $unwind: '$documents' },
      { $match: status ? { 'documents.status': status } : {} },
      { $count: 'total' }
    ]);

    successResponse(res, 'Documents retrieved successfully', {
      documents: allDocuments,
      pagination: {
        total: total[0]?.total || 0,
        page: parseInt(page),
        pages: Math.ceil((total[0]?.total || 0) / limit)
      }
    });
  } catch (error) {
    console.error(error);
    errorResponse(res, 'Failed to fetch documents', 500);
  }
};

// Get Pending Documents
exports.getPendingDocuments = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const drivers = await Driver.find({ 'documents.status': 'pending' })
      .select('name email phone documents')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const pendingDocs = [];
    drivers.forEach(d => {
      d.documents
        .filter(doc => doc.status === 'pending')
        .forEach(doc => {
          pendingDocs.push({
            ...doc.toObject(),
            driver: { name: d.name, email: d.email, phone: d.phone, _id: d._id }
          });
        });
    });

    const total = await Driver.aggregate([
      { $unwind: '$documents' },
      { $match: { 'documents.status': 'pending' } },
      { $count: 'total' }
    ]);

    successResponse(res, 'Pending documents retrieved', {
      documents: pendingDocs,
      total: total[0]?.total || 0
    });
  } catch (error) {
    errorResponse(res, 'Error fetching pending documents', 500);
  }
};

// Get Single Document (by document _id inside array)
exports.getDocumentDetails = async (req, res) => {
  try {
    const { documentId } = req.params;

    const driver = await Driver.findOne({ 'documents._id': documentId })
      .select('name email phone licenseNumber documents');

    if (!driver) return errorResponse(res, 'Document not found', 404);

    const document = driver.documents.id(documentId);
    if (!document) return errorResponse(res, 'Document not found', 404);

    successResponse(res, 'Document found', {
      document: {
        ...document.toObject(),
        driver: {
          name: driver.name,
          email: driver.email,
          phone: driver.phone,
          licenseNumber: driver.licenseNumber
        }
      }
    });
  } catch (error) {
    errorResponse(res, 'Error', 500);
  }
};

// Get Driver's All Documents
exports.getDriverDocuments = async (req, res) => {
  try {
    const { driverId } = req.params;
    const driver = await Driver.findById(driverId)
      .select('name email phone licenseNumber vehicleNumber profileStatus documents');

    if (!driver) return errorResponse(res, 'Driver not found', 404);

    successResponse(res, 'Driver documents', {
      driver: {
        _id: driver._id,
        name: driver.name,
        email: driver.email,
        phone: driver.phone,
        profileStatus: driver.profileStatus
      },
      documents: driver.documents
    });
  } catch (error) {
    errorResponse(res, 'Error', 500);
  }
};

// Verify Document
exports.verifyDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const admin = req.admin; // from protectAdmin

    const driver = await Driver.findOne({ 'documents._id': documentId });
    if (!driver) return errorResponse(res, 'Document not found', 404);

    const doc = driver.documents.id(documentId);
    doc.status = 'verified';
    doc.verifiedBy = admin._id;
    doc.verifiedAt = new Date();
    doc.rejectionReason = null;

    await driver.save();

    // Check if all documents verified
    const allVerified = driver.documents.every(d => d.status === 'verified');
    const hasRejected = driver.documents.some(d => d.status === 'rejected');

    if (allVerified && driver.documents.length >= 5) {
      driver.profileStatus = 'approved';
    } else if (hasRejected) {
      driver.profileStatus = 'rejected';
    } else {
      driver.profileStatus = 'pending_verification';
    }
    await driver.save();

    successResponse(res, 'Document verified!', { profileStatus: driver.profileStatus });
  } catch (error) {
    errorResponse(res, 'Verification failed', 500);
  }
};

// Reject Document
exports.rejectDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { rejectionReason } = req.body;
    const admin = req.admin;

    if (!rejectionReason) return errorResponse(res, 'Reason required', 400);

    const driver = await Driver.findOne({ 'documents._id': documentId });
    if (!driver) return errorResponse(res, 'Document not found', 404);

    const doc = driver.documents.id(documentId);
    doc.status = 'rejected'; 0
    doc.verifiedAt = new Date();
    doc.rejectionReason = rejectionReason;

    driver.profileStatus = 'rejected';
    await driver.save();

    successResponse(res, 'Document rejected');
  } catch (error) {
    errorResponse(res, 'Rejection failed', 500);
  }
};

// Approve/Reject Driver Profile
// exports.approveDriverProfile = async (req, res) => {
//   try {
//     const { driverId } = req.params;
//     const driver = await Driver.findById(driverId);
//     if (!driver) return errorResponse(res, 'Driver not found', 404);

//     const allVerified = driver.documents.every(d => d.status === 'verified');
//     if (!allVerified) return errorResponse(res, 'All documents must be verified', 400);

//     driver.profileStatus = 'approved';
//     await driver.save();

//     successResponse(res, 'Driver approved!');
//   } catch (error) {
//     errorResponse(res, 'Approval failed', 500);
//   }
// };

// Approve Driver Profile
exports.approveDriverProfile = async (req, res) => {
  try {
    const { driverId } = req.params;
    const driver = await Driver.findById(driverId);
    if (!driver) return errorResponse(res, 'Driver not found', 404);

    const allVerified = driver.documents.every(d => d.status === 'verified');
    if (!allVerified) return errorResponse(res, 'All documents must be verified before approval', 400);

    // Avoid duplicate approval
    if (driver.profileStatus === 'approved') {
      return successResponse(res, 'Driver is already approved', { driverId });
    }

    driver.profileStatus = 'approved';
    driver.rejectionReason = null; // clear old reason
    await driver.save();

    // Send approval notification (same style as acceptRequest)
    if (driver.fcmToken) {
      const data = {
        driverId: driver._id.toString(),
        profileStatus: 'approved',
        title: 'Profile Approved 🎉',
        body: `Congratulations ${driver.name || 'Driver'}! Your profile has been approved by admin. You can now go online and start accepting rides/deliveries.`
      };

      // Call notification (same pattern as acceptRequest)
      sendNotification(driver.fcmToken, data);
    } else {
      console.warn(`No FCM token for driver ${driver._id} → Approval notification skipped`);
    }

    return successResponse(res, 'Driver approved successfully!', { driverId });

  } catch (error) {
    console.error('Approval failed:', error);
    return errorResponse(res, 'Approval failed', 500);
  }
};

// Reject Driver Profile
exports.rejectDriverProfile = async (req, res) => {
  try {
    const { driverId } = req.params;
    const { rejectionReason } = req.body;

    const driver = await Driver.findById(driverId);
    if (!driver) return errorResponse(res, 'Driver not found', 404);

    // Avoid duplicate rejection
    if (driver.profileStatus === 'rejected') {
      return successResponse(res, 'Driver is already rejected', { driverId });
    }

    driver.profileStatus = 'rejected';
    driver.rejectionReason = rejectionReason?.trim() || 'Documents did not meet our requirements';
    await driver.save();

    // Send rejection notification (same style as acceptRequest)
    if (driver.fcmToken) {
      const data = {
        driverId: driver._id.toString(),
        profileStatus: 'rejected',
        reason: driver.rejectionReason,
        title: 'Profile Rejected',
        body: `Hello ${driver.name || 'Driver'}, your profile has been reviewed and rejected. Reason: ${driver.rejectionReason}. Please update your documents and resubmit.`
      };

      // Call notification (same pattern)
      sendNotification(driver.fcmToken, data);
    } else {
      console.warn(`No FCM token for driver ${driver._id} → Rejection notification skipped`);
    }

    return successResponse(res, 'Driver rejected successfully', {
      driverId,
      rejectionReason: driver.rejectionReason
    });

  } catch (error) {
    console.error('Rejection failed:', error);
    return errorResponse(res, 'Rejection failed', 500);
  }
}; 

// exports.rejectDriverProfile = async (req, res) => {
//   try {
//     const { driverId } = req.params;
//     const driver = await Driver.findById(driverId);
//     if (!driver) return errorResponse(res, 'Driver not found', 404);

//     driver.profileStatus = 'rejected';
//     await driver.save();

//     successResponse(res, 'Driver rejected');
//   } catch (error) {
//     errorResponse(res, 'Rejection failed', 500);
//   }
// };

// Render page with SINGLE driver's documents
exports.getSingleDriverDocumentsPage = async (req, res) => {
  try {
    const { driverId } = req.params;

    // ID valid hai ya nahi check karo
    if (!mongoose.Types.ObjectId.isValid(driverId)) {
      req.flash('error', 'Invalid driver ID');
      return res.redirect('/admin/drivers');
    }

    // Sirf ek driver fetch karo
    const driver = await Driver.findById(driverId)
      .select('name phone email profileStatus documents')
      .lean();

    if (!driver) {
      req.flash('error', 'Driver not found');
      return res.redirect('/admin/drivers');
    }

    // View ko waise hi render karo, bas drivers array mein sirf ek driver bhejo
    res.render('driver-documents', {
      title: `Documents - ${driver.name}`,
      user: req.admin,
      url: req.originalUrl,
      drivers: [driver]   // ← array with only 1 driver
    });

  } catch (err) {
    console.error('Error loading single driver documents:', err);
    req.flash('error', 'Failed to load driver documents');
    res.redirect('/admin/drivers');
  }
};
exports.verifySingleDocument = async (req, res) => {
  try {
    const { driverId, documentId } = req.params;

    // Basic validation
    if (!mongoose.Types.ObjectId.isValid(driverId) || !mongoose.Types.ObjectId.isValid(documentId)) {
      req.flash('error', 'Invalid ID format');
      return res.redirect('/admin/drivers/documents');
    }

    // Find driver with this exact document
    const driver = await Driver.findOne({
      _id: driverId,
      'documents._id': documentId
    });

    if (!driver) {
      req.flash('error', 'Driver or document not found');
      return res.redirect('/admin/drivers/documents');
    }

    const doc = driver.documents.id(documentId);
    doc.status = 'verified';
    doc.verifiedBy = req.admin._id;
    doc.verifiedAt = new Date();
    doc.rejectionReason = null;

    await driver.save();

    // Update profile status logic (same as before)
    const allVerified = driver.documents.every(d => d.status === 'verified');
    const hasRejected = driver.documents.some(d => d.status === 'rejected');

    if (allVerified) driver.profileStatus = 'approved';
    else if (hasRejected) driver.profileStatus = 'rejected';
    else driver.profileStatus = 'pending_verification';

    await driver.save();

    // FCM notification (same as before)

    req.flash('success', 'Document verified successfully');
    res.redirect(`/admin/drivers/documents/${driverId}`); // back to same driver's documents

  } catch (err) {
    console.error(err);
    req.flash('error', 'Verification failed');
    res.redirect('/admin/drivers/documents');
  }
};

// rejectSingleDocument – similar changes
exports.rejectSingleDocument = async (req, res) => {
  try {
    const { driverId, documentId } = req.params;
    const { rejectionReason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(driverId) || !mongoose.Types.ObjectId.isValid(documentId)) {
      throw new Error('Invalid ID format');
    }

    if (!rejectionReason?.trim()) {
      throw new Error('Rejection reason is required');
    }

    const driver = await Driver.findOne({
      _id: driverId,
      'documents._id': documentId
    });

    if (!driver) throw new Error('Driver or document not found');

    const doc = driver.documents.id(documentId);
    doc.status = 'rejected';
    doc.verifiedBy = req.admin._id;
    doc.verifiedAt = new Date();
    doc.rejectionReason = rejectionReason.trim();

    await driver.save();

    driver.profileStatus = 'rejected';
    await driver.save();

    // FCM notification (same)

    req.flash('success', 'Document rejected');
    res.redirect(`/admin/drivers/documents/${driverId}`);

  } catch (err) {
    req.flash('error', err.message || 'Rejection failed');
    res.redirect('/admin/drivers/documents');
  }
};