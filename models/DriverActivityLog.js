const mongoose = require('mongoose');

const driverActivityLogSchema = new mongoose.Schema(
  {
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      required: true,
    },
    action: {
      type: String,
      enum: [
        'LOGIN',
        'LOGOUT',
        'PROFILE_UPDATED',
        'DOCUMENT_UPLOADED',
        'DOCUMENT_VERIFIED',
        'DOCUMENT_REJECTED',
        'BLOCKED',
        'UNBLOCKED',
        'VEHICLE_ASSIGNED',
        'VEHICLE_UNASSIGNED',
        'JOURNEY_STARTED',
        'DELIVERY_COMPLETED',
        'DELIVERY_CANCELLED',
      ],
      required: true,
    },
    targetRef: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'targetModel',
      default: null,
    },
    targetModel: {
      type: String,
      enum: ['Delivery', 'Vehicle', 'Document', 'Driver', 'BankDetails'],
      default: null,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed, // Any extra info: reason, document type, previous values, etc.
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin', // who performed the action (admin or system)
      default: null,
    },
    expireAt: { 
      type: Date,
      expires: 0,
      default: () => new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days TTL
    },
  },
  { timestamps: true }
);

driverActivityLogSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('DriverActivityLog', driverActivityLogSchema);