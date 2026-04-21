const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: true
  },
  documentType: {
    type: String,
    required: true,
    enum: [
      'aadhaarFront',
      'aadhaarBack',
      'licenseFront',
      'licenseBack',
      'panCard',
      'vehicleRC',
      'vehicleInsurance',
      'policeVerification',
      'fitnessCertificate',
      'permit',
      'other'
    ]
  },
  documentNumber: {
    type: String,
    trim: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    default: null
  },
  expiryDate: {
    type: Date,
    default: null
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Document', documentSchema);