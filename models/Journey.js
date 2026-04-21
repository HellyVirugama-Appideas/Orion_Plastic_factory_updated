// const mongoose = require('mongoose');

// const journeySchema = new mongoose.Schema({
//   deliveryId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Delivery',
//     required: true
//   },
//   driverId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Driver',
//     required: true
//   },
//   startLocation: {
//     address: String,
//     coordinates: {
//       latitude: { type: Number, required: true },
//       longitude: { type: Number, required: true }
//     }
//   },
//   endLocation: {
//     address: String,
//     coordinates: {
//       latitude: Number,
//       longitude: Number
//     }
//   },
//   startTime: {
//     type: Date,
//     required: true,
//     default: Date.now
//   },
//   endTime: Date,
//   status: {
//     type: String,
//     enum: ['started', 'in_progress', 'completed', 'cancelled'],
//     default: 'started'
//   },
//   waypoints: [{
//     location: {
//       coordinates: {
//         latitude: Number,
//         longitude: Number
//       },
//       address: String
//     },
//     timestamp: Date,
//     activity: String // 'stop', 'traffic', 'checkpoint', etc.
//   }],
//   images: [{
//     url: String,
//     caption: String,
//     timestamp: Date,
//     location: {
//       latitude: Number,
//       longitude: Number
//     }
//   }],
//   totalDistance: { type: Number, default: 0 },
//   totalDuration: { type: Number, default: 0 }, // in minutes
//   averageSpeed: Number,
//   maxSpeed: Number,
//   finalRemarks: String,
//   createdAt: {
//     type: Date,
//     default: Date.now
//   }
// }, {
//   timestamps: true
// });

// // Index
// journeySchema.index({ deliveryId: 1 });
// journeySchema.index({ driverId: 1, startTime: -1 });

// module.exports = mongoose.model('Journey', journeySchema);

// const mongoose = require('mongoose');

// const journeySchema = new mongoose.Schema({
//   deliveryId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Delivery',
//     required: true,
//     index: true
//   },
//   driverId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Driver',
//     required: true,
//     index: true
//   },

//   // Start Location 
//   startLocation: {
//     address: String,
//     coordinates: {
//       latitude: { type: Number, required: true },
//       longitude: { type: Number, required: true }
//     }
//   },

//   // End Location 
//   endLocation: {
//     address: String,
//     coordinates: {
//       latitude: Number,
//       longitude: Number
//     }
//   },

//   // Journey Timeline
//   startTime: {
//     type: Date,
//     required: true,
//     default: Date.now
//   },
//   endTime: Date,

//   // Journey Status
//   status: {
//     type: String,
//     enum: [
//       'pending',
//       'assigned',
//       "started",
//       'picked_up',
//       'in_transit',
//       "in_progress",
//       'arrived',
//       'signature_obtained',
//       'proof_uploaded',
//       'delivered',
//       'failed',
//       'cancelled',
//       'completed',
//       'returned'
//     ],
//     default: 'pending',
//     index: true
//   },

//   communicationLog: {
//     type: [{
//       type: String,
//       phoneNumber: String,
//       contactName: String,
//       timestamp: Date,
//       status: String,
//       duration: Number,
//       remarks: String
//     }],
//     default: []
//   },
//   // Checkpoints/Stops 
//   waypoints: [{
//     location: {
//       coordinates: {
//         latitude: { type: Number, required: true },
//         longitude: { type: Number, required: true }
//       },
//       address: String
//     },
//     timestamp: {
//       type: Date,
//       default: Date.now
//     },
//     activity: {
//       type: String,
//       enum: ['checkpoint', 'stop', 'traffic', 'break', 'refuel', 'other'],
//       default: 'checkpoint'
//     },
//     remarks: String
//   }],
//   recordings: [{
//     recordingId: String,
//     type: String,
//     url: String,
//     timestamp: Date,
//     waypointIndex: Number,
//     fileSize: Number,
//     duration: Number,
//     isHidden: { type: Boolean, default: false }
//   }],

//   hiddenRecordings: [{
//     recordingId: String,
//     type: { type: String, default: 'secret_screenshot' },
//     url: String,
//     timestamp: Date,
//     waypointIndex: Number,
//     fileSize: Number
//   }],

//   // Journey Images 
//   images: [{
//     url: {
//       type: String,
//       required: true
//     },
//     caption: String,
//     timestamp: {
//       type: Date,
//       default: Date.now
//     },
//     location: {
//       latitude: Number,
//       longitude: Number
//     },
//     imageType: {
//       type: String,
//       enum: ['pickup', 'delivery', 'damage', 'general', 'checkpoint'],
//       default: 'general'
//     }
//   }],

//   // Journey Metrics
//   totalDistance: {
//     type: Number,
//     default: 0
//   }, // in kilometers

//   totalDuration: {
//     type: Number,
//     default: 0
//   }, // in minutes

//   averageSpeed: Number, // km/h
//   maxSpeed: Number, // km/h

//   remarks: [{
//     remarkId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Remark'           // Predefined remark ka reference
//     },
//     remarkText: {
//       type: String,           // Actual text jo use hua (snapshot)
//       required: true
//     },
//     category: String,
//     severity: String,
//     addedBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Driver'            
//     },
//     addedAt: {
//       type: Date,
//       default: Date.now
//     },
//     isCustom: {
//       type: Boolean,
//       default: false
//     },
//     // Optional: agar future mein edit history chahiye
//     updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
//     updatedAt: Date
//   }],
//   finalRemarks: String,          // optional - old style ke liye rakh sakte ho

//   communicationLog: [{
//     type: {
//       type: String,
//       enum: ['call', "whatsapp", 'message', 'note', 'status_update'],
//       required: true
//     },
//     phoneNumber: String,
//     contactName: String,
//     timestamp: {
//       type: Date,
//       default: Date.now
//     },
//     // status: {
//     //   type: String,
//     //   enum: ['initiated', 'completed', 'failed', 'missed', 'sent'],
//     //   default: 'initiated'
//     // },
//     duration: {
//       type: Number,
//       default: 0
//     },
//     message: String,
//     note: String
//   }],

//   navigationHistory: {
//     type: [{
//       destination: {
//         address: String,
//         coordinates: {
//           latitude: Number,
//           longitude: Number
//         }
//       },
//       startedAt: {
//         type: Date,
//         default: Date.now
//       },
//       navigationApp: {
//         type: String,
//         enum: ['google_maps', 'apple_maps', 'waze'],
//         default: 'google_maps'
//       },
//       estimatedDistance: Number,    // in km
//       estimatedDuration: Number     // in minutes
//     }],
//     default: []
//   },

//   createdAt: {
//     type: Date,
//     default: Date.now
//   }
// }, {
//   timestamps: true
// });

// // Compound Indexes for better query performance
// journeySchema.index({ deliveryId: 1, status: 1 });
// journeySchema.index({ driverId: 1, startTime: -1 });
// journeySchema.index({ driverId: 1, status: 1 });

// // Virtual for journey duration in readable format
// journeySchema.virtual('durationFormatted').get(function () {
//   if (!this.totalDuration) return 'N/A';
//   const hours = Math.floor(this.totalDuration / 60);
//   const minutes = this.totalDuration % 60;
//   return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
// });

// // Virtual for distance in readable format
// journeySchema.virtual('distanceFormatted').get(function () {
//   if (!this.totalDistance) return 'N/A';
//   return `${this.totalDistance.toFixed(2)} km`;
// });

// // Method to check if journey is active
// journeySchema.methods.isActive = function () {
//   return ['started', 'in_progress'].includes(this.status);
// };

// // Method to calculate current duration
// journeySchema.methods.getCurrentDuration = function () {
//   const end = this.endTime || new Date();
//   const durationMs = end - new Date(this.startTime);
//   return Math.round(durationMs / 60000);
// };

// // Static method to find active journey for a driver
// journeySchema.statics.findActiveJourney = function (driverId) {
//   return this.findOne({
//     driverId,
//     status: { $in: ['started', 'in_progress'] }
//   });
// };

// module.exports = mongoose.model('Journey', journeySchema);



const mongoose = require('mongoose');

const journeySchema = new mongoose.Schema({
  deliveryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Delivery',
    required: true,
    index: true
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: true,
    index: true
  },

  // Start Location 
  startLocation: {
    address: String,
    coordinates: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true }
    }
  },

  // End Location 
  endLocation: {
    address: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },

  // Journey Timeline
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  endTime: Date,

  // Journey Status
  status: {
    type: String,
    enum: [
      'Pending',
      'assigned',
      "Arrived",
      'Started',
      'Picked_up',
      'In_transit',
      'In_progress',
      'Arrived',
      'Signature_obtained',
      'Proof_uploaded',
      'Delivered',
      'Failed',
      'Cancelled',
      'Completed',
      'Returned'
    ],
    default: 'Pending',
    index: true
  },

  deliveryProof: {
    type: {
      signature: String,
      photos: [String],
      photosTakenAt: Date,
      recipientName: String,
      mobileNumber: String,
      remarks: String,
      remarkId: { type: mongoose.Schema.Types.ObjectId, ref: 'Remark' },

      // COMPANY STAMP YAHAN HAI – ROOT PE NAHI!
      companyStamp: {
        type: String,
        default: 'Not Provided'
      },
      companyStampUploadedAt: {
        type: Date,
        default: null
      }
    },
    default: () => ({})
  },

  communicationLog: [{
    type: {
      type: String,
      enum: ['call', 'whatsapp', 'message', 'note', 'status_update'],
      required: true
    },
    phoneNumber: String,
    contactName: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    duration: {
      type: Number,
      default: 0
    },
    message: String,
    note: String
  }],

  // Checkpoints/Stops 
  waypoints: [{
    location: {
      coordinates: {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true }
      },
      address: String
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    activity: {
      type: String,
      enum: ['checkpoint', 'stop', 'traffic', 'break', 'refuel', 'other'],
      default: 'checkpoint'
    },
    remarks: String
  }],

  recordings: [{
    recordingId: String,
    type: String,
    url: String,
    timestamp: Date,
    waypointIndex: Number,
    fileSize: Number,
    duration: Number,
    isHidden: { type: Boolean, default: false }
  }],


  // Journey Images 
  images: [{
    url: {
      type: String,
      required: true
    },
    caption: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    location: {
      latitude: Number,
      longitude: Number
    },
    imageType: {
      type: String,
      enum: ['pickup', 'delivery', 'damage', 'general', 'checkpoint'],
      default: 'general'
    }
  }],

  // Journey Metrics
  totalDistance: { type: Number, default: 0 }, // in kilometers
  totalDuration: { type: Number, default: 0 }, // in minutes
  averageSpeed: Number, // km/h
  maxSpeed: Number, // km/h

  remarks: [{
    remarkId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Remark'
    },
    remarkText: {
      type: String,
      required: true
    },
    category: String,
    severity: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver'
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    isCustom: {
      type: Boolean,
      default: false
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    updatedAt: Date
  }],

  finalRemarks: String,

  navigationHistory: [{
    destination: {
      address: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    navigationApp: {
      type: String,
      enum: ['google_maps', 'apple_maps', 'waze'],
      default: 'google_maps'
    },
    estimatedDistance: Number,
    estimatedDuration: Number
  }],

  estimatedDurationFromGoogle: {        // minutes — what Google predicted at start
    type: Number,
    default: null
  },
  estimatedArrivalTime: {               // absolute timestamp
    type: Date,
    default: null
  },
  googleDistanceMeters: Number,
  googleDurationInTrafficSeconds: Number,

  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
journeySchema.index({ deliveryId: 1, status: 1 });
journeySchema.index({ driverId: 1, startTime: -1 });
journeySchema.index({ driverId: 1, status: 1 });

// Virtuals
journeySchema.virtual('durationFormatted').get(function () {
  if (!this.totalDuration) return 'N/A';
  const hours = Math.floor(this.totalDuration / 60);
  const minutes = this.totalDuration % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
});

journeySchema.virtual('distanceFormatted').get(function () {
  if (!this.totalDistance) return 'N/A';
  return `${this.totalDistance.toFixed(2)} km`;
});

// Methods
journeySchema.methods.isActive = function () {
  return ['started', 'in_progress'].includes(this.status);
};

journeySchema.methods.getCurrentDuration = function () {
  const end = this.endTime || new Date();
  const durationMs = end - new Date(this.startTime);
  return Math.round(durationMs / 60000);
};

// Statics
journeySchema.statics.findActiveJourney = function (driverId) {
  return this.findOne({
    driverId,
    status: { $in: ['started', 'in_progress'] }
  });
};

module.exports = mongoose.model('Journey', journeySchema);

