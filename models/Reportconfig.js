const mongoose = require('mongoose');

const reportConfigSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  }, 
  reportType: {
    type: String,
    required: true,
    enum: [
      'delivery_summary',
      'customer_based',
      'vehicle_based',
      'vehicle_maintenance',
      'fuel_expense',
      'driver_performance',
      'ontime_delayed',
      'maintenance_cost',
      'customer_distribution',
      'custom'
    ]
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  filters: {
    dateRange: {
      startDate: Date,
      endDate: Date
    },
    period: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom']
    },
    driverIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver'
    }],
    customerIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer'
    }],
    vehicleNumbers: [String],
    deliveryStatus: [String],
    regions: [String],
    customFilters: Map
  },
  columns: [{
    field: String,
    label: String,
    visible: { type: Boolean, default: true },
    sortable: { type: Boolean, default: true }
  }],
  groupBy: [String],
  sortBy: {
    field: String,
    order: { type: String, enum: ['asc', 'desc'], default: 'desc' }
  },
  schedule: {
    enabled: { type: Boolean, default: false },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly']
    },
    time: String, // "08:00" format
    dayOfWeek: Number, // 0-6 for weekly
    dayOfMonth: Number, // 1-31 for monthly
    recipients: [{
      email: String,
      name: String
    }]
  },
  exportFormats: {
    excel: { type: Boolean, default: true },
    pdf: { type: Boolean, default: true },
    csv: { type: Boolean, default: false }
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
reportConfigSchema.index({ reportType: 1 });
reportConfigSchema.index({ createdBy: 1 });
reportConfigSchema.index({ isActive: 1 });

module.exports = mongoose.model('ReportConfig', reportConfigSchema);