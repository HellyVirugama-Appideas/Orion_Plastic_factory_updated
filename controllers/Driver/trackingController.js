// const TrackingLog = require('../models/TrackingLog');
// const Delivery = require('../models/Delivery');
// const Driver = require('../models/Driver');
// const { successResponse, errorResponse } = require('../utils/responseHelper');
// const { calculateDistance } = require('../utils/geoHelper');

// // ======================== UPDATE LOCATION (DRIVER) ========================

// // Update real-time location
// exports.updateLocation = async (req, res) => {
//   try {
//     const {
//       deliveryId,
//       latitude,
//       longitude,
//       address,
//       accuracy,
//       speed,
//       heading,
//       batteryLevel
//     } = req.body;

//     // Validate delivery
//     const delivery = await Delivery.findById(deliveryId);
//     if (!delivery) {
//       return errorResponse(res, 'Delivery not found', 404);
//     }

//     // Check if driver is assigned to this delivery
//     if (delivery.driverId.toString() !== req.user.driverId.toString()) {
//       return errorResponse(res, 'You are not assigned to this delivery', 403);
//     }

//     // Create tracking log
//     const trackingLog = await TrackingLog.create({
//       deliveryId,
//       driverId: req.user.driverId,
//       location: {
//         coordinates: {
//           latitude,
//           longitude
//         },
//         address,
//         accuracy
//       },
//       speed,
//       heading,
//       batteryLevel
//     });

//     // Calculate distance from delivery location
//     const distanceFromDestination = calculateDistance(
//       latitude,
//       longitude,
//       delivery.deliveryLocation.coordinates.latitude,
//       delivery.deliveryLocation.coordinates.longitude
//     );

//     // Update delivery estimated time based on distance and speed
//     if (speed > 0) {
//       const estimatedMinutes = (distanceFromDestination / speed) * 60;
//       delivery.estimatedDeliveryTime = new Date(Date.now() + estimatedMinutes * 60000);
//     }

//     // Auto-update delivery status based on proximity
//     if (distanceFromDestination < 0.5 && delivery.status === 'in_transit') {
//       delivery.status = 'out_for_delivery';
//       await delivery.save();
//     }

//     // Broadcast location update via Socket.IO (we'll add this)
//     if (global.io) {
//       global.io.to(`delivery-${deliveryId}`).emit('location-update', {
//         deliveryId,
//         location: {
//           latitude,
//           longitude,
//           address,
//           accuracy
//         },
//         speed,
//         heading,
//         timestamp: trackingLog.timestamp,
//         distanceFromDestination,
//         estimatedArrival: delivery.estimatedDeliveryTime
//       });
//     }

//     return successResponse(res, 'Location updated successfully', {
//       trackingLog: {
//         id: trackingLog._id,
//         timestamp: trackingLog.timestamp,
//         location: trackingLog.location
//       },
//       distanceFromDestination: `${distanceFromDestination.toFixed(2)} km`,
//       estimatedArrival: delivery.estimatedDeliveryTime
//     });

//   } catch (error) {
//     console.error('Update Location Error:', error);
//     return errorResponse(res, error.message || 'Failed to update location', 500);
//   }
// };

// // ======================== GET LIVE LOCATION (PUBLIC/ADMIN) ========================

// // Get current live location
// exports.getCurrentLocation = async (req, res) => {
//   try {
//     const { deliveryId } = req.params;

//     const delivery = await Delivery.findById(deliveryId)
//       .populate('customerId', 'name email phone')
//       .populate({
//         path: 'driverId',
//         populate: {
//           path: 'userId',
//           select: 'name phone profileImage'
//         }
//       });

//     if (!delivery) {
//       return errorResponse(res, 'Delivery not found', 404);
//     }

//     // Get latest location
//     const currentLocation = await TrackingLog.findOne({ 
//       deliveryId: delivery._id 
//     })
//     .sort({ timestamp: -1 });

//     if (!currentLocation) {
//       return errorResponse(res, 'No tracking data available yet', 404);
//     }

//     // Calculate distance from destination
//     const distanceFromDestination = calculateDistance(
//       currentLocation.location.coordinates.latitude,
//       currentLocation.location.coordinates.longitude,
//       delivery.deliveryLocation.coordinates.latitude,
//       delivery.deliveryLocation.coordinates.longitude
//     );

//     return successResponse(res, 'Current location retrieved successfully', {
//       delivery: {
//         id: delivery._id,
//         trackingNumber: delivery.trackingNumber,
//         status: delivery.status,
//         estimatedDeliveryTime: delivery.estimatedDeliveryTime,
//         pickupLocation: delivery.pickupLocation,
//         deliveryLocation: delivery.deliveryLocation
//       },
//       driver: delivery.driverId ? {
//         name: delivery.driverId.userId.name,
//         phone: delivery.driverId.userId.phone,
//         profileImage: delivery.driverId.userId.profileImage,
//         vehicleNumber: delivery.driverId.vehicleNumber,
//         vehicleType: delivery.driverId.vehicleType
//       } : null,
//       currentLocation: {
//         location: currentLocation.location,
//         speed: currentLocation.speed,
//         heading: currentLocation.heading,
//         batteryLevel: currentLocation.batteryLevel,
//         timestamp: currentLocation.timestamp
//       },
//       distanceFromDestination: `${distanceFromDestination.toFixed(2)} km`,
//       estimatedArrival: delivery.estimatedDeliveryTime
//     });

//   } catch (error) {
//     console.error('Get Current Location Error:', error);
//     return errorResponse(res, error.message || 'Failed to get current location', 500);
//   }
// };

// // ======================== GET LIVE ROUTE PATH ========================

// // Get complete route path (for drawing polyline on map)
// exports.getRouteRecording = async (req, res) => {
//   try {
//     const { deliveryId } = req.params;

//     const delivery = await Delivery.findById(deliveryId);
//     if (!delivery) {
//       return errorResponse(res, 'Delivery not found', 404);
//     }

//     // Get all tracking logs for this delivery
//     const trackingLogs = await TrackingLog.find({ 
//       deliveryId: delivery._id 
//     })
//     .sort({ timestamp: 1 })
//     .select('location.coordinates.latitude location.coordinates.longitude speed heading timestamp');

//     // Format for map polyline
//     const route = trackingLogs.map(log => ({
//       latitude: log.location.coordinates.latitude,
//       longitude: log.location.coordinates.longitude,
//       speed: log.speed,
//       heading: log.heading,
//       timestamp: log.timestamp
//     }));

//     return successResponse(res, 'Route recording retrieved successfully', {
//       delivery: {
//         id: delivery._id,
//         trackingNumber: delivery.trackingNumber,
//         status: delivery.status
//       },
//       route,
//       routePoints: route.length,
//       startTime: route.length > 0 ? route[0].timestamp : null,
//       lastUpdate: route.length > 0 ? route[route.length - 1].timestamp : null
//     });

//   } catch (error) {
//     console.error('Get Route Recording Error:', error);
//     return errorResponse(res, error.message || 'Failed to get route recording', 500);
//   }
// };

// // ======================== TRACK DELIVERY PROGRESS ========================

// exports.trackDeliveryProgress = async (req, res) => {
//   try {
//     const { deliveryId } = req.params;

//     const delivery = await Delivery.findById(deliveryId)
//       .populate('customerId', 'name phone')
//       .populate({
//         path: 'driverId',
//         populate: {
//           path: 'userId',
//           select: 'name phone profileImage'
//         }
//       });

//     if (!delivery) {
//       return errorResponse(res, 'Delivery not found', 404);
//     }

//     // Get current location
//     const currentLocation = await TrackingLog.findOne({ 
//       deliveryId: delivery._id 
//     }).sort({ timestamp: -1 });

//     // Calculate progress
//     let progress = {
//       totalDistanceTraveled: 0,
//       remainingDistance: 0,
//       completionPercentage: 0
//     };

//     if (currentLocation && delivery.status !== 'pending' && delivery.status !== 'assigned') {
//       // Calculate total distance traveled
//       const allLogs = await TrackingLog.find({ 
//         deliveryId: delivery._id 
//       }).sort({ timestamp: 1 });

//       for (let i = 1; i < allLogs.length; i++) {
//         const dist = calculateDistance(
//           allLogs[i-1].location.coordinates.latitude,
//           allLogs[i-1].location.coordinates.longitude,
//           allLogs[i].location.coordinates.latitude,
//           allLogs[i].location.coordinates.longitude
//         );
//         progress.totalDistanceTraveled += dist;
//       }

//       // Calculate remaining distance to destination
//       progress.remainingDistance = calculateDistance(
//         currentLocation.location.coordinates.latitude,
//         currentLocation.location.coordinates.longitude,
//         delivery.deliveryLocation.coordinates.latitude,
//         delivery.deliveryLocation.coordinates.longitude
//       );

//       // Calculate completion percentage
//       const totalExpectedDistance = progress.totalDistanceTraveled + progress.remainingDistance;
//       if (totalExpectedDistance > 0) {
//         progress.completionPercentage = (progress.totalDistanceTraveled / totalExpectedDistance) * 100;
//       }
//     }

//     return successResponse(res, 'Delivery progress retrieved successfully', {
//       delivery: {
//         id: delivery._id,
//         trackingNumber: delivery.trackingNumber,
//         status: delivery.status,
//         scheduledDeliveryTime: delivery.scheduledDeliveryTime,
//         estimatedDeliveryTime: delivery.estimatedDeliveryTime,
//         pickupLocation: delivery.pickupLocation,
//         deliveryLocation: delivery.deliveryLocation
//       },
//       driver: delivery.driverId ? {
//         name: delivery.driverId.userId.name,
//         phone: delivery.driverId.userId.phone,
//         profileImage: delivery.driverId.userId.profileImage,
//         vehicleNumber: delivery.driverId.vehicleNumber
//       } : null,
//       progress: {
//         totalDistanceTraveled: progress.totalDistanceTraveled.toFixed(2),
//         remainingDistance: progress.remainingDistance.toFixed(2),
//         completionPercentage: progress.completionPercentage.toFixed(2)
//       },
//       currentLocation: currentLocation ? {
//         location: currentLocation.location,
//         speed: currentLocation.speed,
//         heading: currentLocation.heading,
//         timestamp: currentLocation.timestamp
//       } : null,
//       trackingLogsCount: await TrackingLog.countDocuments({ deliveryId: delivery._id })
//     });

//   } catch (error) {
//     console.error('Track Delivery Progress Error:', error);
//     return errorResponse(res, error.message || 'Failed to track delivery progress', 500);
//   }
// };

// //  ADMIN: GET TRACKING HISTORY 

// exports.getTrackingHistory = async (req, res) => {
//   try {
//     const { deliveryId } = req.params;

//     const delivery = await Delivery.findById(deliveryId);
//     if (!delivery) {
//       return errorResponse(res, 'Delivery not found', 404);
//     }

//     const trackingLogs = await TrackingLog.find({ 
//       deliveryId: delivery._id 
//     })
//     .sort({ timestamp: -1 })
//     .limit(1000); // Last 1000 points

//     return successResponse(res, 'Tracking history retrieved successfully', {
//       delivery: {
//         id: delivery._id,
//         trackingNumber: delivery.trackingNumber,
//         status: delivery.status
//       },
//       trackingLogs,
//       totalPoints: trackingLogs.length
//     });

//   } catch (error) {
//     console.error('Get Tracking History Error:', error);
//     return errorResponse(res, error.message || 'Failed to get tracking history', 500);
//   }
// };

// //  DELETE OLD TRACKING LOGS 

// exports.deleteOldTrackingLogs = async (req, res) => {
//   try {
//     const { days = 30 } = req.query;
    
//     const cutoffDate = new Date();
//     cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

//     const result = await TrackingLog.deleteMany({
//       timestamp: { $lt: cutoffDate }
//     });

//     return successResponse(res, 'Old tracking logs deleted successfully', {
//       deletedCount: result.deletedCount,
//       cutoffDate
//     });

//   } catch (error) {
//     console.error('Delete Old Tracking Logs Error:', error);
//     return errorResponse(res, error.message || 'Failed to delete old logs', 500);
//   }
// };

// module.exports = exports;





const TrackingLog = require('../../models/TrackingLog');
const Delivery = require('../../models/Delivery');
const Driver = require('../../models/Driver');

// ==================== DRIVER TRACKING CONTROLLER ====================
// Driver can ONLY update location every 5-10 seconds
// Driver CANNOT see live location on map
// Driver CANNOT see full route history
// Driver CANNOT see other drivers

// ======================== UPDATE LOCATION (EVERY 5-10 SECONDS) ========================

/**
 * @desc    Real-time location update endpoint (driver → server)
 * @route   POST /api/driver/tracking/update-location
 * @access  Driver Only
 * @frequency Every 5-10 seconds
 */
exports.updateLocation = async (req, res) => {
  try {
    const {
      deliveryId,
      latitude,
      longitude,
      address,
      accuracy,
      speed,
      heading,
      batteryLevel
    } = req.body;

    // Validate required fields
    if (!deliveryId || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Delivery ID, latitude, and longitude are required'
      });
    }

    // Validate coordinates
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates'
      });
    }

    // Get driver from token
    const driver = await Driver.findOne({ userId: req.user._id });
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver profile not found'
      });
    }

    // Validate delivery
    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
    }

    // Check if driver is assigned to this delivery
    if (delivery.driverId.toString() !== driver._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this delivery'
      });
    }

    // Create tracking log
    const trackingLog = await TrackingLog.create({
      deliveryId,
      driverId: driver._id,
      location: {
        coordinates: {
          latitude,
          longitude
        },
        address: address || '',
        accuracy: accuracy || null
      },
      speed: speed || null,
      heading: heading || null,
      batteryLevel: batteryLevel || null
    });

    // Calculate distance from delivery location
    const distanceFromDestination = calculateDistance(
      latitude,
      longitude,
      delivery.deliveryLocation.coordinates.latitude,
      delivery.deliveryLocation.coordinates.longitude
    );

    // Update delivery estimated time based on distance and speed
    if (speed && speed > 0) {
      const estimatedMinutes = (distanceFromDestination / speed) * 60;
      delivery.estimatedDeliveryTime = new Date(Date.now() + estimatedMinutes * 60000);
      await delivery.save();
    }

    // Auto-update delivery status based on proximity
    if (distanceFromDestination < 0.5 && delivery.status === 'in_transit') {
      delivery.status = 'out_for_delivery';
      await delivery.save();
    }

    // Real-time broadcast via Socket.IO (for admin/customer to see)
    if (global.io) {
      // Broadcast to admin room
      global.io.to('admin-room').emit('driver-location-update', {
        driverId: driver._id,
        driverName: driver.userId?.name || 'Unknown',
        vehicleNumber: driver.vehicleNumber,
        deliveryId,
        location: {
          latitude,
          longitude,
          address,
          accuracy
        },
        speed,
        heading,
        timestamp: trackingLog.timestamp,
        distanceFromDestination: distanceFromDestination.toFixed(2)
      });

      // Broadcast to specific delivery room (for customer tracking)
      global.io.to(`delivery-${deliveryId}`).emit('location-update', {
        deliveryId,
        location: {
          latitude,
          longitude,
          address
        },
        speed,
        timestamp: trackingLog.timestamp,
        distanceFromDestination: distanceFromDestination.toFixed(2),
        estimatedArrival: delivery.estimatedDeliveryTime
      });
    }

    // Response - Driver only gets confirmation, NOT location data
    return res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      data: {
        timestamp: trackingLog.timestamp,
        distanceRemaining: `${distanceFromDestination.toFixed(2)} km`,
        estimatedArrival: delivery.estimatedDeliveryTime
      }
    });

  } catch (error) {
    console.error('Driver Update Location Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update location'
    });
  }
};

// ======================== CAPTURE FINAL LOCATION (AT DELIVERY COMPLETION) ========================

/**
 * @desc    Final location capture at delivery completion
 * @route   POST /api/driver/tracking/capture-final-location
 * @access  Driver Only
 */
exports.captureFinalLocation = async (req, res) => {
  try {
    const { deliveryId, latitude, longitude, address, remarks } = req.body;

    if (!deliveryId || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Delivery ID, latitude, and longitude are required'
      });
    }

    // Get driver
    const driver = await Driver.findOne({ userId: req.user._id });
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver profile not found'
      });
    }

    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
    }

    // Verify ownership
    if (delivery.driverId.toString() !== driver._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this delivery'
      });
    }

    // Create final tracking log
    const finalTrackingLog = await TrackingLog.create({
      deliveryId,
      driverId: driver._id,
      location: {
        coordinates: {
          latitude,
          longitude
        },
        address: address || 'Delivery location',
        accuracy: 0
      },
      speed: 0,
      heading: 0,
      batteryLevel: req.body.batteryLevel || 100
    });

    // Update delivery with final location
    delivery.actualDeliveryLocation = {
      coordinates: {
        latitude,
        longitude
      },
      address: address || 'Delivery completed'
    };
    delivery.actualDeliveryTime = new Date();
    delivery.finalRemarks = remarks || '';
    
    await delivery.save();

    // Broadcast completion to admin
    if (global.io) {
      global.io.to('admin-room').emit('delivery-completed', {
        deliveryId,
        driverId: driver._id,
        finalLocation: {
          latitude,
          longitude,
          address
        },
        completedAt: delivery.actualDeliveryTime
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Final location captured successfully',
      data: {
        deliveryId: delivery._id,
        status: delivery.status,
        completedAt: delivery.actualDeliveryTime
      }
    });

  } catch (error) {
    console.error('Capture Final Location Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to capture final location'
    });
  }
};

// ======================== GET MY CURRENT STATUS (LIMITED INFO) ========================

/**
 * @desc    Get driver's own current delivery status
 * @route   GET /api/driver/tracking/my-status
 * @access  Driver Only
 */
exports.getMyStatus = async (req, res) => {
  try {
    const driver = await Driver.findOne({ userId: req.user._id });
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver profile not found'
      });
    }

    // Get active delivery
    const activeDelivery = await Delivery.findOne({
      driverId: driver._id,
      status: { $in: ['assigned', 'picked_up', 'in_transit', 'out_for_delivery'] }
    });

    // Get last location update time
    const lastLocation = await TrackingLog.findOne({ 
      driverId: driver._id 
    }).sort({ timestamp: -1 });

    return res.status(200).json({
      success: true,
      data: {
        isActive: driver.isAvailable,
        activeDelivery: activeDelivery ? {
          id: activeDelivery._id,
          trackingNumber: activeDelivery.trackingNumber,
          status: activeDelivery.status
        } : null,
        lastLocationUpdate: lastLocation ? lastLocation.timestamp : null,
        totalUpdatesToday: await TrackingLog.countDocuments({
          driverId: driver._id,
          timestamp: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        })
      }
    });

  } catch (error) {
    console.error('Get My Status Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get status'
    });
  }
};

// Helper function to calculate distance
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

module.exports = exports;