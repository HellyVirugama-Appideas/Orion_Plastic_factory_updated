const mongoose = require('mongoose');

const remarkSchema = new mongoose.Schema({
  // Remark Type
  remarkType: {
    type: String,
    required: true,
    enum: ['predefined', 'custom'], 
    default: 'predefined',
    index: true
  },
  
  // Remark Content
  remarkText: {
    type: String,
    required: true,
    trim: true
  },
  
  // Category
  category: {
    type: String,
    required: true,
    enum: [
      'delivery_status',      // On time, delayed, rescheduled
      'customer_interaction', // Customer not available, refused delivery
      'vehicle_issue',        // Flat tire, engine problem
      'traffic_weather',      // Heavy traffic, bad weather
      'documentation',        // Missing documents, wrong address
      'quality',              // Damaged goods, wrong items
      'payment',              // Payment collected, pending
      'route',                // Route deviation, detour taken
      'other'                 // Custom remarks
    ],
    index: true
  },
  
  // Severity/Priority
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  
  // Active Status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // Predefined Remark Management (Admin)
  isPredefined: {
    type: Boolean,
    default: false
  },
  
  // Order/Sorting
  displayOrder: {
    type: Number,
    default: 0
  },
  
  // Usage Statistics
  usageCount: {
    type: Number,
    default: 0
  },
  lastUsedAt: Date,
  
  // Created by (Admin or Driver)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: true
  },
  
  // Association tracking
  associatedDeliveries: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Delivery'
  }],
  
  // Additional metadata
  description: String,
  tags: [String],
  
  // Approval (for custom remarks if admin approval required)
  requiresApproval: {
    type: Boolean,
    default: false
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date
  
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
remarkSchema.index({ remarkType: 1, category: 1, isActive: 1 });
remarkSchema.index({ isPredefined: 1, isActive: 1 });
remarkSchema.index({ usageCount: -1 });
remarkSchema.index({ createdBy: 1 });

// Virtual for popularity score
remarkSchema.virtual('popularityScore').get(function() {
  const daysSinceCreation = (Date.now() - this.createdAt) / (1000 * 60 * 60 * 24);
  return this.usageCount / (daysSinceCreation || 1);
});

// Static method to get predefined remarks by category
remarkSchema.statics.getPredefinedByCategory = async function(category) {
  return this.find({
    isPredefined: true,
    isActive: true,
    category: category
  }).sort({ displayOrder: 1, remarkText: 1 });
};

// Static method to get most used remarks
remarkSchema.statics.getMostUsed = async function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ usageCount: -1 })
    .limit(limit);
};

// Static method to increment usage count
remarkSchema.statics.incrementUsage = async function(remarkId) {
  return this.findByIdAndUpdate(
    remarkId,
    { 
      $inc: { usageCount: 1 },
      lastUsedAt: Date.now()
    },
    { new: true }
  );
};

// Method to add delivery association
remarkSchema.methods.addDeliveryAssociation = async function(deliveryId) {
  if (!this.associatedDeliveries.includes(deliveryId)) {
    this.associatedDeliveries.push(deliveryId);
    this.usageCount += 1;
    this.lastUsedAt = Date.now();
    await this.save();
  }
  return this;
};

module.exports = mongoose.model('Remark', remarkSchema);