const mongoose = require('mongoose');

const customerFeedbackSchema = new mongoose.Schema({
  deliveryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Delivery',
    required: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  categories: {
    timeliness: { type: Number, min: 1, max: 5 },
    packaging: { type: Number, min: 1, max: 5 },
    driverBehavior: { type: Number, min: 1, max: 5 },
    communication: { type: Number, min: 1, max: 5 }
  },
  comment: String,
  issues: [{
    type: String,
    enum: ['late_delivery', 'damaged_package', 'wrong_address', 'poor_communication', 'rude_behavior', 'other']
  }],
  wouldRecommend: Boolean,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index
customerFeedbackSchema.index({ deliveryId: 1 });
customerFeedbackSchema.index({ driverId: 1 });
customerFeedbackSchema.index({ customerId: 1 });

module.exports = mongoose.model('CustomerFeedback', customerFeedbackSchema);