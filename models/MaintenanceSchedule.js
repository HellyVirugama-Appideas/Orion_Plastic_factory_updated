const mongoose = require('mongoose');

const maintenanceScheduleSchema = new mongoose.Schema({
  // Vehicle Reference
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true,
    index: true
  },

  // Maintenance Type
  maintenanceType: {
    type: String,
    required: true,
    enum: [
      'regular_service',
      'oil_change',
      'brake_service',
      'tire_rotation',
      'tire_replacement',
      'battery_replacement',
      'ac_service',
      'engine_repair',
      'transmission_service',
      'coolant_change',
      'filter_replacement',
      'suspension_check',
      'alignment',
      'inspection',
      'emergency_repair',
      'other'
    ],
    index: true
  },

  // Schedule Information
  scheduleType: {
    type: String,
    enum: ['distance_based', 'time_based', 'both'],
    default: 'distance_based'
  },

  // Distance-based scheduling (10k km intervals)
  distanceSchedule: {
    intervalKm: {
      type: Number,
      default: 10000, // 10k km default
      min: 0
    },
    lastServiceKm: {
      type: Number,
      default: 0,
      min: 0
    },
    nextServiceKm: {
      type: Number,
      min: 0
    },
    currentKm: {
      type: Number,
      min: 0
    },
    remainingKm: {
      type: Number
    }
  },

  // Time-based scheduling
  timeSchedule: {
    intervalMonths: {
      type: Number,
      min: 0
    },
    lastServiceDate: Date,
    nextServiceDate: Date,
    daysRemaining: Number
  },

  // Service Details
  serviceDetails: {
    description: String,
    estimatedCost: {
      type: Number,
      min: 0
    },
    actualCost: {
      type: Number,
      min: 0
    },
    serviceProvider: String,
    serviceLocation: String,
    duration: Number, // in hours
    parts: [{
      name: String,
      quantity: Number,
      cost: Number
    }]
  },

  // Status
  // status: {
  //   type: String,
  //   enum: ['scheduled', 'due', 'overdue', 'in_progress', 'completed', 'cancelled'],
  //   default: 'scheduled',
  //   index: true
  // },

  status: {
    type: String,
    enum: [
      'scheduled',
      'due',
      'overdue',
      'in_progress',
      'pending_approval',
      'completed',
      'cancelled'
    ],
    default: 'scheduled',
    index: true
  },

  // Priority
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },

  // Completion Details
  completedAt: Date,
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Cost Tracking
  costBreakdown: {
    laborCost: {
      type: Number,
      default: 0,
      min: 0
    },
    partsCost: {
      type: Number,
      default: 0,
      min: 0
    },
    additionalCost: {
      type: Number,
      default: 0,
      min: 0
    },
    totalCost: {
      type: Number,
      default: 0,
      min: 0
    }
  },

  // Documents
  documents: [{
    type: {
      type: String,
      enum: ['invoice', 'receipt', 'before_photo', 'after_photo', 'report', 'warranty', 'other']
    },
    url: String,
    filename: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Service History Reference
  serviceHistoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expense'
  },

  // Notifications
  notificationsSent: [{
    type: {
      type: String,
      enum: ['reminder', 'due', 'overdue', 'completed']
    },
    sentAt: Date,
    sentTo: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  }],

  // Reminder Settings
  reminders: {
    kmBeforeDue: {
      type: Number,
      default: 1000 // Remind 1000 km before
    },
    daysBeforeDue: {
      type: Number,
      default: 7 // Remind 7 days before
    },
    enabled: {
      type: Boolean,
      default: true
    }
  },

  // Notes and Comments
  notes: String,
  adminComments: String,

  // Recurring Schedule
  isRecurring: {
    type: Boolean,
    default: true
  },
  nextScheduleCreated: {
    type: Boolean,
    default: false
  },

  // Created by
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Approval (if required)
  requiresApproval: {
    type: Boolean,
    default: false
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

// Indexes
maintenanceScheduleSchema.index({ vehicle: 1, status: 1 });
maintenanceScheduleSchema.index({ 'distanceSchedule.nextServiceKm': 1 });
maintenanceScheduleSchema.index({ 'timeSchedule.nextServiceDate': 1 });
maintenanceScheduleSchema.index({ status: 1, priority: 1 });

// Virtual for service status
maintenanceScheduleSchema.virtual('isDue').get(function () {
  if (this.scheduleType === 'distance_based' || this.scheduleType === 'both') {
    return this.distanceSchedule.currentKm >= this.distanceSchedule.nextServiceKm;
  }
  if (this.scheduleType === 'time_based') {
    return new Date() >= this.timeSchedule.nextServiceDate;
  }
  return false;
});

// Calculate next service date (based on 10k km intervals)
maintenanceScheduleSchema.pre('save', function (next) {
  // Calculate next service km
  if (this.scheduleType === 'distance_based' || this.scheduleType === 'both') {
    if (!this.distanceSchedule.nextServiceKm) {
      this.distanceSchedule.nextServiceKm =
        (this.distanceSchedule.lastServiceKm || 0) + (this.distanceSchedule.intervalKm || 10000);
    }

    // Calculate remaining km
    if (this.distanceSchedule.currentKm) {
      this.distanceSchedule.remainingKm =
        this.distanceSchedule.nextServiceKm - this.distanceSchedule.currentKm;
    }
  }

  // Calculate next service date
  if (this.scheduleType === 'time_based' || this.scheduleType === 'both') {
    if (this.timeSchedule.lastServiceDate && this.timeSchedule.intervalMonths) {
      const nextDate = new Date(this.timeSchedule.lastServiceDate);
      nextDate.setMonth(nextDate.getMonth() + this.timeSchedule.intervalMonths);
      this.timeSchedule.nextServiceDate = nextDate;

      // Calculate days remaining
      const today = new Date();
      const diffTime = nextDate - today;
      this.timeSchedule.daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
  }

  // Calculate total cost
  if (this.costBreakdown) {
    this.costBreakdown.totalCost =
      (this.costBreakdown.laborCost || 0) +
      (this.costBreakdown.partsCost || 0) +
      (this.costBreakdown.additionalCost || 0);
  }

  // Auto-update status
  if (this.isDue && this.status === 'scheduled') {
    this.status = 'due';
  }

  next();
});

// Static method to get due maintenance
maintenanceScheduleSchema.statics.getDueMaintenance = async function (vehicleId) {
  const query = { status: { $in: ['due', 'overdue'] } };
  if (vehicleId) {
    query.vehicle = vehicleId;
  }
  return this.find(query).populate('vehicle').sort({ priority: -1 });
};

// Static method to get upcoming maintenance
maintenanceScheduleSchema.statics.getUpcomingMaintenance = async function (vehicleId, daysAhead = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  const query = {
    status: 'scheduled',
    'timeSchedule.nextServiceDate': { $lte: futureDate }
  };

  if (vehicleId) {
    query.vehicle = vehicleId;
  }

  return this.find(query).populate('vehicle').sort({ 'timeSchedule.nextServiceDate': 1 });
};

// Static method to create next recurring schedule
maintenanceScheduleSchema.statics.createNextSchedule = async function (maintenanceId) {
  const maintenance = await this.findById(maintenanceId);

  if (!maintenance || !maintenance.isRecurring || maintenance.nextScheduleCreated) {
    return null;
  }

  const nextSchedule = new this({
    vehicle: maintenance.vehicle,
    maintenanceType: maintenance.maintenanceType,
    scheduleType: maintenance.scheduleType,
    distanceSchedule: {
      intervalKm: maintenance.distanceSchedule.intervalKm,
      lastServiceKm: maintenance.distanceSchedule.nextServiceKm,
      nextServiceKm: maintenance.distanceSchedule.nextServiceKm + maintenance.distanceSchedule.intervalKm
    },
    timeSchedule: {
      intervalMonths: maintenance.timeSchedule.intervalMonths,
      lastServiceDate: maintenance.timeSchedule.nextServiceDate
    },
    serviceDetails: {
      description: maintenance.serviceDetails.description,
      estimatedCost: maintenance.serviceDetails.estimatedCost
    },
    priority: maintenance.priority,
    reminders: maintenance.reminders,
    isRecurring: true,
    createdBy: maintenance.createdBy
  });

  maintenance.nextScheduleCreated = true;
  await maintenance.save();

  return await nextSchedule.save();
};

module.exports = mongoose.model('MaintenanceSchedule', maintenanceScheduleSchema);