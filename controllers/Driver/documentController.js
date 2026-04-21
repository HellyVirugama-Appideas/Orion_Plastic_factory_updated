const Document = require('../../models/Document');
const Driver = require('../../models/Driver');
const { successResponse, errorResponse } = require('../../utils/responseHelper');
const fs = require('fs');
const path = require('path');

// Upload Document
exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, 'No file uploaded', 400);
    }

    const { documentType, documentNumber, expiryDate } = req.body;

    // Driver directly _id se dhundo (kyunki ab standalone hai)
    const driver = await Driver.findById(req.user._id);
    if (!driver) {
      return errorResponse(res, 'Driver not found', 404);
    }

    // File URL banao
    const fileUrl = `/uploads/documents/${req.file.filename}`;

    // Document ko driver ke documents array mein push karo
    const newDocument = {
      documentType,
      fileUrl,
      documentNumber: documentNumber || undefined,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      status: 'pending',
      uploadedAt: new Date()
    };

    driver.documents.push(newDocument);

    // Agar pehli baar upload kar raha hai to status update karo
    if (driver.profileStatus === 'incomplete') {
      driver.profileStatus = 'pending_verification';
    }

    await driver.save();

    // Latest pushed document ko response mein bhejo
    const uploadedDoc = driver.documents[driver.documents.length - 1];

    return successResponse(res, 'Document uploaded successfully!', {
      document: uploadedDoc,
      totalDocuments: driver.documents.length,
      profileStatus: driver.profileStatus
    }, 201);

  } catch (error) {
    console.error('Upload Document Error:', error);
    return errorResponse(res, error.message || 'Upload failed', 500);
  }
};

// Upload Multiple Documents
// exports.uploadMultipleDocuments = async (req, res) => {
//   try {
//     // req.files ab array hai (any() use karne par)
//     if (!req.files || req.files.length === 0) {
//       return errorResponse(res, 'No files uploaded', 400);
//     }

//     const driver = await Driver.findById(req.user._id);
//     if (!driver) return errorResponse(res, 'Driver not found', 404);

//     const documents = [];

//     for (const file of req.files) {
//       const doc = await Document.create({
//         driverId: driver._id,
//         documentType: file.fieldname, // profilePhoto, aadhaarFront, etc.
//         fileUrl: `/uploads/documents/${file.filename}`,
//         status: 'pending'
//       });
//       documents.push(doc);
//     }

//     if (driver.profileStatus === 'incomplete') {
//       driver.profileStatus = 'pending_verification';
//       await driver.save();
//     }

//     return successResponse(res, 'Documents uploaded successfully!', {
//       count: documents.length,
//       documents
//     }, 201);

//   } catch (error) {
//     console.error('Upload Error:', error);
//     return errorResponse(res, error.message || 'Upload failed', 500);
//   }
// };

exports.uploadMultipleDocuments = async (req, res) => {
  try {
    console.log("Files received:", req.files?.map(f => f.fieldname)); // ← YEHI DAALO

    if (!req.files || req.files.length === 0) {
      return errorResponse(res, 'No files uploaded', 400);
    }

    const driver = await Driver.findById(req.user._id);
    if (!driver) return errorResponse(res, 'Driver not found', 404);

    console.log("Before push - documents count:", driver.documents.length); // ← CHECK

    for (const file of req.files) {
      const newDoc = {
        documentType: file.fieldname,
        fileUrl: `/uploads/documents/${file.filename}`,
        status: 'pending',
        uploadedAt: new Date()
      };

      if (file.fieldname === 'profilePhoto') {
        driver.profileImage = newDoc.fileUrl;
      }

      driver.documents.push(newDoc);
    }

    console.log("After push - documents count:", driver.documents.length); // ← CHECK

    if (driver.profileStatus === 'incomplete') {
      driver.profileStatus = 'pending_verilas';
    }

    await driver.save(); // ← YEHI SABSE ZAROORI HAI

    console.log("SAVED! Final documents count:", driver.documents.length); // ← FINAL CHECK

    return successResponse(res, 'Documents uploaded successfully!', {
      total: driver.documents.length,
      documents: driver.documents
    });

  } catch (error) {
    console.error('Upload Error:', error);
    return errorResponse(res, error.message || 'Upload failed', 500);
  }
};

// Get All Driver Documents (Embedded in Driver)
exports.getDriverDocuments = async (req, res) => {
  try {
    const driver = await Driver.findById(req.user._id)
      .select('documents profileImage');

    if (!driver) {
      return errorResponse(res, 'Driver not found', 404);
    }

    return successResponse(res, 'Documents retrieved successfully', {
      profileImage: driver.profileImage,
      documents: driver.documents || [],
      total: driver.documents?.length || 0
    });

  } catch (error) {
    console.error('Get Documents Error:', error);
    return errorResponse(res, 'Failed to fetch documents', 500);
  }
};

// Get Single Document (from embedded array)
exports.getDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const driver = await Driver.findById(req.user._id);

    if (!driver) {
      return errorResponse(res, 'Driver not found', 404);
    }

    const document = driver.documents.id(documentId);

    if (!document) {
      return errorResponse(res, 'Document not found', 404);
    }

    return successResponse(res, 'Document retrieved successfully', { document });

  } catch (error) {
    console.error('Get Document Error:', error);
    return errorResponse(res, 'Failed to fetch document', 500);
  }
};

// Delete Document (from embedded array + file delete)
exports.deleteDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const driver = await Driver.findById(req.user._id);

    if (!driver) {
      return errorResponse(res, 'Driver not found', 404);
    }

    const document = driver.documents.id(documentId);
    if (!document) {
      return errorResponse(res, 'Document not found', 404);
    }

    // Delete file from server
    const filePath = path.join(__dirname, '..', 'public', document.fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove from array
    driver.documents.id(documentId).deleteOne();
    await driver.save();

    return successResponse(res, 'Document deleted successfully');

  } catch (error) {
    console.error('Delete Document Error:', error);
    return errorResponse(res, 'Failed to delete document', 500);
  }
};

// Update Document (embedded + optional file replace)
exports.updateDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { documentNumber, expiryDate } = req.body || {};

    const driver = await Driver.findById(req.user._id);
    if (!driver) return errorResponse(res, 'Driver not found', 404);

    const document = driver.documents.id(documentId);
    if (!document) return errorResponse(res, 'Document not found', 404);

    if (document.status === 'verified') {
      return errorResponse(res, 'Verified document cannot be updated', 400);
    }

    // Update fields
    if (documentNumber) document.documentNumber = documentNumber.trim();
    if (expiryDate) document.expiryDate = new Date(expiryDate);

    // Replace file if new uploaded
    if (req.file) {
      // Delete old file
      const oldPath = path.join(__dirname, '..', 'public', document.fileUrl);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);

      document.fileUrl = `/uploads/documents/${req.file.filename}`;
    }

    await driver.save();

    return successResponse(res, 'Document updated successfully!', {
      document: driver.documents.id(documentId)
    });

  } catch (error) {
    console.error('Update Document Error:', error);
    return errorResponse(res, error.message || 'Update failed', 500);
  }
};


exports.uploadDriverDocuments = async (req, res) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      return errorResponse(res, 'No files uploaded', 400);
    }

    const driver = await Driver.findOne({ userId: req.user._id });
    if (!driver) {
      return errorResponse(res, 'Driver profile not found', 404);
    }

    const uploadedDocuments = [];

    // Process each uploaded file
    for (const [fieldName, files] of Object.entries(req.files)) {
      const file = files[0]; // Each field has array with 1 file
      
      // Map fieldname to document type
      const documentTypeMap = {
        'profilePhoto': 'profile',
        'aadhaarFront': 'aadhaar_front',
        'aadhaarBack': 'aadhaar_back',
        'licenseFront': 'license_front',
        'licenseBack': 'license_back',
        'panCard': 'pan_card',
        'vehicleRC': 'vehicle_rc',
        'vehicleInsurance': 'insurance',
        'policeVerification': 'police_verification',
        'otherDocument': 'other'
      };

      const documentType = documentTypeMap[fieldName] || 'other';
      const fileUrl = `/uploads/documents/${file.filename}`;

      // Create document record
      const document = await Document.create({
        driverId: driver._id,
        documentType,
        fileUrl,
        status: 'pending'
      });

      uploadedDocuments.push({
        fieldName,
        documentType,
        fileUrl,
        documentId: document._id
      });
    }

    // Update driver profile status
    if (driver.profileStatus === 'incomplete') {
      driver.profileStatus = 'pending_verification';
      await driver.save();
    }

    return successResponse(res, 'Documents uploaded successfully', {
      uploadedCount: uploadedDocuments.length,
      documents: uploadedDocuments
    }, 201);

  } catch (error) {
    console.error('Upload Driver Documents Error:', error);
    return errorResponse(res, error.message || 'Failed to upload documents', 500);
  }
};


// Get Driver Documents
// exports.getDriverDocuments = async (req, res) => {
//   try {
//     const driver = await Driver.findOne({ userId: req.user._id });
//     if (!driver) {
//       return errorResponse(res, 'Driver profile not found', 404);
//     }

//     const documents = await Document.find({ driverId: driver._id })
//       .sort({ uploadedAt: -1 });

//     successResponse(res, 'Documents retrieved successfully', { documents });
//   } catch (error) {
//     errorResponse(res, error.message);
//   }
// };

// // Get Single Document  
// exports.getDocument = async (req, res) => {
//   try {
//     const { documentId } = req.params;

//     const driver = await Driver.findOne({ userId: req.user._id });
//     if (!driver) {
//       return errorResponse(res, 'Driver profile not found', 404);
//     }

//     const document = await Document.findOne({
//       _id: documentId,
//       driverId: driver._id
//     });

//     if (!document) {
//       return errorResponse(res, 'Document not found', 404);
//     }

//     successResponse(res, 'Document retrieved successfully', { document });
//   } catch (error) {
//     errorResponse(res, error.message);
//   }
// };

// // Delete Document
// exports.deleteDocument = async (req, res) => {
//   try {
//     const { documentId } = req.params;

//     const driver = await Driver.findOne({ userId: req.user._id });
//     if (!driver) {
//       return errorResponse(res, 'Driver profile not found', 404);
//     }

//     const document = await Document.findOne({
//       _id: documentId,
//       driverId: driver._id
//     });

//     if (!document) {
//       return errorResponse(res, 'Document not found', 404);
//     }

//     // Delete file from filesystem
//     const filePath = path.join(__dirname, '..', 'public', document.fileUrl);
//     if (fs.existsSync(filePath)) {
//       fs.unlinkSync(filePath);
//     }

//     // Delete document record
//     await Document.deleteOne({ _id: documentId });

//     successResponse(res, 'Document deleted successfully');
//   } catch (error) {
//     errorResponse(res, error.message);
//   }
// };

// // Update Document
// // exports.updateDocument = async (req, res) => {
// //   try {
// //     const { documentId } = req.params;
// //     const { documentNumber, expiryDate } = req.body;

// //     const driver = await Driver.findOne({ userId: req.user._id });
// //     if (!driver) {
// //       return errorResponse(res, 'Driver profile not found', 404);
// //     }

// //     const document = await Document.findOne({
// //       _id: documentId,
// //       driverId: driver._id
// //     });

// //     if (!document) {
// //       return errorResponse(res, 'Document not found', 404);
// //     }

// //     // Only allow update if document is not verified
// //     if (document.status === 'verified') {
// //       return errorResponse(res, 'Cannot update verified document', 400);
// //     }

// //     // Update document
// //     if (documentNumber) document.documentNumber = documentNumber;
// //     if (expiryDate) document.expiryDate = new Date(expiryDate);

// //     await document.save();

// //     successResponse(res, 'Document updated successfully', { document });
// //   } catch (error) {
// //     errorResponse(res, error.message);
// //   }
// // };


// exports.updateDocument = async (req, res) => {
//   try {
//     const { documentId } = req.params;

//     // DEBUG: Yeh console mein dikhega
//     console.log('req.body →', req.body);
//     console.log('req.file →', req.file);

//     // Safe access
//     const { documentNumber, expiryDate, documentType } = req.body || {};

//     const driver = await Driver.findOne({ userId: req.user._id });
//     if (!driver) return errorResponse(res, 'Driver not found', 404);

//     const document = await Document.findOne({
//       _id: documentId,
//       driverId: driver._id
//     });
//     if (!document) return errorResponse(res, 'Document not found', 404);
//     if (document.status === 'verified') return errorResponse(res, 'Verified document cannot be updated', 400);

//     // Update text fields
//     if (documentNumber) document.documentNumber = documentNumber.trim();
//     if (expiryDate) document.expiryDate = new Date(expiryDate);
//     if (documentType) document.documentType = documentType;

//     // Update file if uploaded
//     if (req.file) {
//       document.fileUrl = `/uploads/documents/${req.file.filename}`;
//     }

//     await document.save();

//     return successResponse(res, 'Document updated successfully!', { document });

//   } catch (error) {
//     console.error('Update Error:', error);
//     return errorResponse(res, error.message || 'Update failed', 500);
//   }
// };