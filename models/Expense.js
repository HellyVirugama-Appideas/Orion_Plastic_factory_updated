// const mongoose = require('mongoose');

// const expenseSchema = new mongoose.Schema({
//   // Basic Information
//   expenseType: {
//     type: String,
//     required: true,
//     enum: ['fuel', 'maintenance', 'toll', 'parking', 'repair', 'other'],
//     default: 'fuel',
//     index: true
//   },

//   // Driver & Vehicle Reference
//   driver: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Driver',
//     required: false,
//     index: true
//   },

//   vehicle: {
//     vehicleNumber: {
//       type: String,
//       required: true
//     },
//     vehicleType: {
//       type: String,
//       enum: ['car', 'bike', 'truck', 'van', 'auto']
//     },
//     model: String
//   },

//   // Journey/Delivery Reference (Integration with existing system)
//   journey: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Journey'
//   },
//   delivery: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Delivery'
//   },

//   // Fuel Specific Data
//   fuelDetails: {
//     quantity: {
//       type: Number,
//       min: 0
//     },
//     pricePerUnit: {
//       type: Number,
//       min: 0
//     },
//     totalAmount: {
//       type: Number,
//       required: true,
//       min: 0
//     },
//     fuelType: {
//       type: String,
//       enum: ['petrol', 'diesel', 'cng', 'electric']
//     },
//     stationName: String,
//     stationLocation: {
//       address: String,
//       coordinates: {
//         latitude: Number,
//         longitude: Number
//       }
//     }
//   },

//   // Meter Reading (for mileage calculation)
//   meterReading: {
//     current: {
//       type: Number,
//       required: true,
//       min: 0
//     },
//     previous: {
//       type: Number,
//       min: 0
//     },
//     difference: {
//       type: Number,
//       min: 0
//     }
//   },

//   // Mileage Calculation
//   mileageData: {
//     distanceCovered: {
//       type: Number,
//       min: 0
//     },
//     fuelConsumed: {
//       type: Number,
//       min: 0
//     },
//     averageMileage: {
//       type: Number,
//       min: 0
//     },
//     unit: {
//       type: String,
//       enum: ['km/l', 'km/kg', 'km/kwh'],
//       default: 'km/l'
//     }
//   },

//   // Receipt & Photo Management
//   receipts: [{
//     type: {
//       type: String,
//       enum: ['fuel_receipt', 'meter_photo', 'vehicle_photo', 'invoice', 'other'],
//       required: true
//     },
//     url: {
//       type: String,
//       required: true
//     },
//     filename: String,
//     uploadedAt: {
//       type: Date,
//       default: Date.now
//     }
//   }],

//   // Date & Time (Auto-fetched)
//   expenseDate: {
//     type: Date,
//     required: true,
//     default: Date.now,
//     index: true
//   },

//   // Approval Workflow (Driver → Admin → Finance)
//   approvalStatus: {
//     type: String,
//     enum: ['pending', 'approved_by_admin', 'approved_by_finance', 'rejected', 'resubmitted'],
//     default: 'pending',
//     index: true
//   },

//   approvalWorkflow: {
//     submittedAt: {
//       type: Date,
//       default: Date.now
//     },
//     submittedBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Driver'
//     },
//     adminApproval: {
//       approvedBy: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'User'
//       },
//       approvedAt: Date,
//       comments: String,
//       status: {
//         type: String,
//         enum: ['pending', 'approved', 'rejected']
//       }
//     },
//     financeApproval: {
//       approvedBy: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'User'
//       },
//       approvedAt: Date,
//       comments: String,
//       status: {
//         type: String,
//         enum: ['pending', 'approved', 'rejected']
//       },
//       paymentReference: String,
//       paidAt: Date
//     }
//   },

//   // Rejection Details
//   rejectionReason: String,
//   rejectedBy: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User'
//   },
//   rejectedAt: Date,

//   // Additional Information
//   description: String,
//   remarks: String,
//   category: {
//     type: String,
//     enum: ['operational', 'emergency', 'scheduled', 'unexpected']
//   },

//   // Payment Status
//   paymentStatus: {
//     type: String,
//     enum: ['unpaid', 'partially_paid', 'paid', 'reimbursed'],
//     default: 'unpaid'
//   },

//   // Analytics & Reporting
//   tags: [String]

// }, { 
//   timestamps: true,
//   toJSON: { virtuals: true },
//   toObject: { virtuals: true }
// });

// // Indexes for better query performance
// expenseSchema.index({ driver: 1, expenseDate: -1 });
// expenseSchema.index({ approvalStatus: 1, expenseDate: -1 });
// expenseSchema.index({ 'meterReading.current': 1 });
// expenseSchema.index({ 'vehicle.vehicleNumber': 1 });
// expenseSchema.index({ journey: 1 });
// expenseSchema.index({ delivery: 1 });

// // Calculate mileage before saving
// expenseSchema.pre('save', async function(next) {
//   if (this.expenseType === 'fuel' && this.meterReading.previous && this.fuelDetails.quantity) {
//     this.meterReading.difference = this.meterReading.current - this.meterReading.previous;
//     this.mileageData.distanceCovered = this.meterReading.difference;
//     this.mileageData.fuelConsumed = this.fuelDetails.quantity;
//     this.mileageData.averageMileage = parseFloat((this.meterReading.difference / this.fuelDetails.quantity).toFixed(2));
//   }
//   next();
// });

// // Static method to get vehicle mileage history
// expenseSchema.statics.getVehicleMileageHistory = async function(vehicleNumber, startDate, endDate) {
//   return this.aggregate([
//     {
//       $match: {
//         'vehicle.vehicleNumber': vehicleNumber,
//         expenseType: 'fuel',
//         expenseDate: { $gte: startDate, $lte: endDate }
//       }
//     },
//     {
//       $group: {
//         _id: null,
//         totalDistance: { $sum: '$mileageData.distanceCovered' },
//         totalFuel: { $sum: '$mileageData.fuelConsumed' },
//         averageMileage: { $avg: '$mileageData.averageMileage' }
//       }
//     }
//   ]);
// };

// // Static method to get pending expenses count
// expenseSchema.statics.getPendingExpensesCount = async function() {
//   return this.countDocuments({ approvalStatus: 'pending' });
// };

// module.exports = mongoose.model('Expense', expenseSchema);


const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  // Basic Information
  expenseType: {
    type: String,
    required: true,
    enum: ['fuel', 'vehicle'],
    default: 'fuel',
    index: true
  },
  subCategory: {
    type: String,
    enum: [
      'maintenance',
      'repair',
      'washing',
      'toll',
      'parking',
      'insurance',
      'general',
      'other'
    ],
    default: 'maintenance',
    required: function() { return this.expenseType === 'vehicle'; }
  },

  // Driver & Vehicle Reference
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: true,
    index: true
  },

  vehicle: {
    vehicleNumber: {
      type: String,
      required: true
    },
    vehicleType: {
      type: String,
      enum: ['car', 'bike', 'truck', 'van', 'auto'],
      required: false
    },
    model: String
  },

  // Journey/Delivery Reference
  journey: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Journey'
  },
  delivery: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Delivery'
  },

  // Fuel Specific Data (for expenseType: 'fuel')
  fuelDetails: {
    quantity: {
      type: Number,
      min: 0
    },
    pricePerLitre: {
      type: Number,
      min: 0
    },
    totalFuelCost: {
      type: Number,
      min: 0
    },
    fuelType: {
      type: String,
      enum: ['petrol', 'diesel', 'cng', 'electric']
    },
    stationName: String,
    stationAddress: String,
    stationLocation: {
      latitude: Number,
      longitude: Number
    }
  },

  // Vehicle Expense Specific Data (for expenseType: 'vehicle'/'maintenance')
  vehicleExpenseDetails: {
    expenseAmount: {
      type: Number,
      min: 0
    },
    expenseType: String, // Additional sub-type
    additionalNotes: String
  },

  // Meter Reading (for mileage calculation)
  meterReading: {
    current: {
      type: Number,
      min: 0
    },
    previous: {
      type: Number,
      min: 0
    },
    difference: {
      type: Number,
      min: 0
    }
  },

  // Mileage Calculation
  mileageData: {
    distanceCovered: {
      type: Number,
      min: 0
    },
    fuelConsumed: {
      type: Number,
      min: 0
    },
    averageMileage: {
      type: Number,
      min: 0
    },
    unit: {
      type: String,
      enum: ['km/l', 'km/kg', 'km/kwh'],
      default: 'km/l'
    }
  },

  // Receipt & Photo Management
  receipts: [{
    type: {
      type: String,
      enum: ['fuel_receipt', 'meter_photo', 'vehicle_photo', 'invoice', 'expense_bill', 'other'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    filename: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Browse & Upload Files tracking
  browseUploadFiles: [{
    filename: String,
    url: String,
    fileType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Payment Receipt Photo
  paymentReceiptPhoto: [{
    url: String,
    filename: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Date & Time
  expenseDate: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },

  // Approval Workflow
  approvalStatus: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending',
    index: true
  },

  approvalWorkflow: {
    submittedAt: {
      type: Date,
      default: Date.now
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver'
    },
    adminApproval: {
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      approvedAt: Date,
      comments: String,
      status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected']
      }
    },
    financeApproval: {
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      approvedAt: Date,
      comments: String,
      status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected']
      },
      paymentReference: String,
      paidAt: Date
    }
  },

  // Rejection Details
  rejectionReason: String,
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectedAt: Date,

  // Additional Information
  description: String,
  remarks: String,
  additionalNotes: String,
  category: {
    type: String,
    enum: ['operational', 'emergency', 'scheduled', 'unexpected']
  },

  // Payment Status
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'partially_paid', 'paid', 'reimbursed'],
    default: 'unpaid'
  },

  // Resubmission tracking
  resubmittedAt: Date,
  resubmittedCount: {
    type: Number,
    default: 0
  },

  // Analytics & Reporting
  tags: [String]

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
expenseSchema.index({ driver: 1, expenseDate: -1 });
expenseSchema.index({ approvalStatus: 1, expenseDate: -1 });
expenseSchema.index({ 'meterReading.current': 1 });
expenseSchema.index({ 'vehicle.vehicleNumber': 1 });
expenseSchema.index({ journey: 1 });
expenseSchema.index({ delivery: 1 });
expenseSchema.index({ expenseType: 1, driver: 1 });

// Virtual for total amount (handles both fuel and vehicle expenses)
// expenseSchema.virtual('totalAmount').get(function () {
//   if (this.expenseType === 'fuel' && this.fuelDetails) {
//     return this.fuelDetails.totalFuelCost || 0;
//   } else if (this.vehicleExpenseDetails) {
//     return this.vehicleExpenseDetails.expenseAmount || 0;
//   }
//   return 0;
// });

// Calculate mileage before saving (for fuel expenses)
expenseSchema.pre('save', async function (next) {
  if (this.expenseType === 'fuel' && this.meterReading.previous && this.fuelDetails.quantity) {
    this.meterReading.difference = this.meterReading.current - this.meterReading.previous;
    this.mileageData.distanceCovered = this.meterReading.difference;
    this.mileageData.fuelConsumed = this.fuelDetails.quantity;
    this.mileageData.averageMileage = parseFloat((this.meterReading.difference / this.fuelDetails.quantity).toFixed(2));
  }
  next();
});

// Static method to get vehicle mileage history
expenseSchema.statics.getVehicleMileageHistory = async function (vehicleNumber, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        'vehicle.vehicleNumber': vehicleNumber,
        expenseType: 'fuel',
        expenseDate: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalDistance: { $sum: '$mileageData.distanceCovered' },
        totalFuel: { $sum: '$mileageData.fuelConsumed' },
        averageMileage: { $avg: '$mileageData.averageMileage' }
      }
    }
  ]);
};

// Static method to get pending expenses count
expenseSchema.statics.getPendingExpensesCount = async function () {
  return this.countDocuments({ approvalStatus: 'pending' });
};

// Static method to get expenses by type
expenseSchema.statics.getExpensesByType = async function (driverId, expenseType) {
  const query = { driver: driverId };
  if (expenseType && expenseType !== 'all') {
    query.expenseType = expenseType;
  }
  return this.find(query).sort({ expenseDate: -1 });
};

expenseSchema.virtual('totalAmount').get(function () {
  if (this.expenseType === 'fuel' && this.fuelDetails) { 
    // return this.fuelDetails.totalAmount || 0;  
    return this.fuelDetails.totalAmount || 0;
  } 
  if (this.vehicleExpenseDetails) {
    return this.vehicleExpenseDetails.expenseAmount || 0;
  }
  return 0;
});

module.exports = mongoose.model('Expense', expenseSchema);

