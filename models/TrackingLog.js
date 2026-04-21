// const mongoose = require('mongoose');

// const trackingLogSchema = new mongoose.Schema({
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
//   location: {
//     coordinates: {
//       latitude: { type: Number, required: true },
//       longitude: { type: Number, required: true }
//     },
//     address: String,
//     accuracy: Number // in meters
//   },
//   speed: Number, // km/h
//   heading: Number, // direction in degrees
//   batteryLevel: Number,
//   timestamp: {
//     type: Date,
//     default: Date.now
//   }
// }, {
//   timestamps: false
// });

// // Index for efficient querying
// trackingLogSchema.index({ deliveryId: 1, timestamp: -1 });
// trackingLogSchema.index({ driverId: 1, timestamp: -1 });

// // Auto-delete logs older than 30 days
// trackingLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

// module.exports = mongoose.model('TrackingLog', trackingLogSchema);


const mongoose = require('mongoose');

const trackingLogSchema = new mongoose.Schema({
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
  
  // Location Data
  location: {
    coordinates: {
      latitude: { 
        type: Number, 
        required: true,
        min: -90,
        max: 90
      },
      longitude: { 
        type: Number, 
        required: true,
        min: -180,
        max: 180
      }
    },
    address: {
      type: String,
      trim: true
    },
    accuracy: {
      type: Number, // in meters
      min: 0
    }
  },
  
  // Movement Data
  speed: {
    type: Number, // km/h
    min: 0,
    max: 200
  },
  heading: {
    type: Number, // direction in degrees (0-360)
    min: 0,
    max: 360
  },
  altitude: {
    type: Number // meters above sea level
  },
  
  // Device Info
  batteryLevel: {
    type: Number, // percentage (0-100)
    min: 0,
    max: 100
  },
  
  // Distance Calculations
  distanceFromPickup: {
    type: Number, // km
    min: 0
  },
  distanceFromDestination: {
    type: Number, // km
    min: 0
  },
  distanceTraveled: {
    type: Number, // km from last point
    min: 0
  },
  
  // Timestamp
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  },
  
  // Additional Info
  isKeyLocation: {
    type: Boolean,
    default: false // Mark important locations (start, stop, near destination)
  },
  eventType: {
    type: String,
    enum: ['journey_start', 'waypoint', 'near_destination', 'journey_end', 'idle', 'moving'],
    default: 'waypoint'
  },
  notes: String

}, {
  timestamps: true
});

// Compound indexes for efficient querying
trackingLogSchema.index({ deliveryId: 1, timestamp: -1 });
trackingLogSchema.index({ driverId: 1, timestamp: -1 });
trackingLogSchema.index({ deliveryId: 1, eventType: 1 });

// GeoJSON index for location-based queries (optional for future use)
trackingLogSchema.index({ 'location.coordinates': '2dsphere' });

// Auto-delete logs older than 60 days (for storage optimization)
trackingLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 5184000 }); // 60 days

// Virtual for formatted location
trackingLogSchema.virtual('formattedLocation').get(function() {
  return `${this.location.coordinates.latitude}, ${this.location.coordinates.longitude}`;
});

// Method to check if driver is moving
trackingLogSchema.methods.isMoving = function() {
  return this.speed && this.speed > 5;
};

// Static method to get latest location
trackingLogSchema.statics.getLatestLocation = async function(deliveryId) {
  return this.findOne({ deliveryId })
    .sort({ timestamp: -1 })
    .populate('driverId', 'userId vehicleNumber vehicleType');
};

// Static method to get route path
trackingLogSchema.statics.getRoutePath = async function(deliveryId, limit = 1000) {
  return this.find({ deliveryId })
    .sort({ timestamp: 1 })
    .limit(limit)
    .select('location.coordinates timestamp speed heading eventType');
};

// Static method to get journey summary
trackingLogSchema.statics.getJourneySummary = async function(deliveryId) {
  const logs = await this.find({ deliveryId }).sort({ timestamp: 1 });
  
  if (logs.length === 0) return null;
  
  let totalDistance = 0;
  let maxSpeed = 0;
  let avgSpeed = 0;
  let speedCount = 0;
  
  logs.forEach((log, index) => {
    if (log.distanceTraveled) {
      totalDistance += log.distanceTraveled;
    }
    if (log.speed) {
      maxSpeed = Math.max(maxSpeed, log.speed);
      avgSpeed += log.speed;
      speedCount++;
    }
  });
  
  return {
    totalPoints: logs.length,
    totalDistance: totalDistance.toFixed(2),
    maxSpeed: maxSpeed.toFixed(2),
    avgSpeed: speedCount > 0 ? (avgSpeed / speedCount).toFixed(2) : 0,
    startTime: logs[0].timestamp,
    lastUpdate: logs[logs.length - 1].timestamp,
    duration: Math.floor((logs[logs.length - 1].timestamp - logs[0].timestamp) / 1000 / 60) // minutes
  };
};

// Pre-save middleware to mark key locations
trackingLogSchema.pre('save', function(next) {
  // Mark as key location if it's a journey event
  if (['journey_start', 'journey_end', 'near_destination'].includes(this.eventType)) {
    this.isKeyLocation = true;
  }
  next();
});

module.exports = mongoose.model('TrackingLog', trackingLogSchema);