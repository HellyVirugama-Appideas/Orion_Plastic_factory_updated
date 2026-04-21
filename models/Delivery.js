// const mongoose = require('mongoose');

// const deliverySchema = new mongoose.Schema({
//   trackingNumber: {
//     type: String,
//     required: true,
//     unique: true,
//     uppercase: true
//   },
//   orderId: {
//     type: String,
//     required: true,
//     unique: true
//   },
//   customerId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Customer',
//     required: true
//   },
//   userId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User'
//   },
//   recipientName: String,
//   recipientPhone: String, // fallback if needed

//   driverId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Driver',
//     default: null
//   },
//   journeyId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Journey',
//     index: true
//   },
//   vehicleNumber: {
//     type: String,
//     default: null
//   },

//   pickupLocation: {
//     address: { type: String, required: true },
//     coordinates: {
//       latitude: { type: Number, required: true },
//       longitude: { type: Number, required: true }
//     },
//     contactPerson: String,
//     contactPhone: String
//   },
//   deliveryLocation: {
//     address: { type: String, required: true },
//     coordinates: {
//       latitude: { type: Number, required: true },
//       longitude: { type: Number, required: true }
//     },
//     contactPerson: { type: String, required: true },
//     contactPhone: { type: String, required: true }
//   },
//   status: {
//     type: String,
//     enum: ['pending', "pending_acceptance", 'assigned', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'cancelled', 'failed'],
//     default: 'pending'
//   },
//   priority: {
//     type: String,
//     enum: ['low', 'medium', 'high', 'urgent'],
//     default: 'medium'
//   },
//   packageDetails: {
//     description: String,
//     weight: Number,
//     dimensions: {
//       length: Number,
//       width: Number,
//       height: Number
//     },
//     quantity: { type: Number, default: 1 },
//     value: Number,
//     fragile: { type: Boolean, default: false }
//   },
//   scheduledPickupTime: Date,
//   scheduledDeliveryTime: Date,
//   actualPickupTime: Date,
//   actualDeliveryTime: Date,
//   estimatedDeliveryTime: Date,
//   deliveryProof: {
//     signature: String, // Image URL
//     photos: [String], // Array of image URLs
//     otp: String,
//     otpVerified: { type: Boolean, default: false },
//     receiverName: String
//   },

//   remarks: {
//     type: [{
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Remark'
//     }],
//     default: []
//   },
//   route: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Route',
//     default: null
//   },
//   distance: { type: Number, default: 0 }, // in kilometers
//   estimatedDuration: { type: Number, default: 0 }, // in minutes
//   instructions: String,
//   createdBy: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Admin',
//     required: false
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now
//   },
//   updatedAt: {
//     type: Date,
//     default: Date.now
//   }
// }, {
//   timestamps: true
// });

// // Generate unique tracking number
// deliverySchema.pre('save', async function (next) {
//   if (this.isNew && !this.trackingNumber) {
//     this.trackingNumber = `ORN${Date.now()}${Math.floor(Math.random() * 1000)}`;
//   }
//   next();
// });

// // Index for faster queries
// deliverySchema.index({ trackingNumber: 1 });
// deliverySchema.index({ orderId: 1 });
// deliverySchema.index({ driverId: 1, status: 1 });
// deliverySchema.index({ status: 1 });

// module.exports = mongoose.model('Delivery', deliverySchema);


const mongoose = require('mongoose');

const waypointSchema = new mongoose.Schema({
  address: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['stop', 'break', 'fuel', 'checkpoint'],
    default: 'stop'
  },
  order: {
    type: Number,
    required: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: Date,
  remarks: String,
  photo: String
});

const remarkSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true
  },
  images: [String],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const deliverySchema = new mongoose.Schema({
  trackingNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  recipientName: String,
  recipientPhone: String,

  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    default: null
  },
  journeyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Journey',
    default: null,
    index: true
  },
  vehicleNumber: {
    type: String,
    default: null
  },

  pickupLocation: {
    address: { type: String, required: true },
    coordinates: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true }
    },
    contactPerson: String,
    contactPhone: String
  },

  deliveryLocation: {
    address: { type: String, required: true },
    coordinates: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true }
    },
    contactPerson: { type: String, required: true },
    contactPhone: { type: String, required: true }
  },

  // Waypoints / Break Points
  waypoints: [waypointSchema],

  status: {
    type: String,
    enum: [
      'Pending',
      'Pending_acceptance',
      'assigned',
      "Completed",
      "Arrived",
      'Picked_up',
      'In_transit',
      "Proof_uploaded",
      'Out_for_delivery',
      'Delivered',
      'Cancelled',
      'Failed'
    ],
    default: 'pending'
  },

  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },

  packageDetails: {
    description: String,
    weight: Number,
    dimensions: {
      length: Number,
      width: Number,
      height: Number
    },
    quantity: { type: Number, default: 1 },
    value: Number,
    fragile: { type: Boolean, default: false }
  },

  scheduledPickupTime: Date,
  scheduledDeliveryTime: Date,
  actualPickupTime: Date,
  actualDeliveryTime: Date,
  estimatedDeliveryTime: Date,

  deliveryProof: {
    signature: String, // Image URL
    photos: [String], // Array of image URLs
    otp: String,
    otpVerified: { type: Boolean, default: false },
    receiverName: String
  },

  // Driver Remarks
  remarks: [remarkSchema],

  route: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route',
    default: null
  },

  distance: { type: Number, default: 0 }, // in kilometers
  estimatedDuration: { type: Number, default: 0 }, // in minutes
  instructions: String,

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  }
}, {
  timestamps: true
});

// Generate unique tracking number
deliverySchema.pre('save', async function (next) {
  if (this.isNew && !this.trackingNumber) {
    this.trackingNumber = `ORN${Date.now()}${Math.floor(Math.random() * 1000)}`;
  }
  next();
});

// Index for faster queries
deliverySchema.index({ trackingNumber: 1 });
deliverySchema.index({ orderId: 1 });
deliverySchema.index({ driverId: 1, status: 1 });
deliverySchema.index({ status: 1 });
deliverySchema.index({ createdAt: -1 });

// Method to calculate progress percentage
deliverySchema.methods.getProgressPercentage = function () {
  if (!this.waypoints || this.waypoints.length === 0) {
    const statusProgress = {
      'Pending': 0,
      'Pending_acceptance': 10,
      'assigned': 20,
      'Picked_up': 40,
      'In_transit': 60,
      'Out_for_delivery': 80,
      'Delivered': 100,
      'Cancelled': 0,
      'Failed': 0
    };
    return statusProgress[this.status] || 0;
  }

  const completed = this.waypoints.filter(w => w.completed).length;
  return Math.round((completed / this.waypoints.length) * 100);
};

module.exports = mongoose.model('Delivery', deliverySchema);