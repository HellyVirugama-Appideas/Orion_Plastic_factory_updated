const mongoose = require('mongoose');

const deliveryStatusHistorySchema = new mongoose.Schema({
  deliveryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Delivery',
    required: true
  },
  status: {
    type: String,
    required: true
  },
  location: {
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    address: String
  },
  remarks: String,
  updatedBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    userRole: String,
    userName: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false
});

// Index for efficient querying
deliveryStatusHistorySchema.index({ deliveryId: 1, timestamp: -1 });

module.exports = mongoose.model('DeliveryStatusHistory', deliveryStatusHistorySchema);