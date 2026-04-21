const mongoose = require('mongoose');

const orderStatusHistorySchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  status: {
    type: String,
    required: true
  },
  previousStatus: {
    type: String
  },
  remarks: String,
  location: {
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    address: String
  },
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
    default: Date.now,
    index: true
  }
}, {
  timestamps: false
});

// Index for efficient queries
orderStatusHistorySchema.index({ orderId: 1, timestamp: -1 });

const OrderStatusHistory = mongoose.model('OrderStatusHistory', orderStatusHistorySchema);

module.exports = OrderStatusHistory;