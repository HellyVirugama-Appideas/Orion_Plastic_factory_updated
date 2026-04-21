// const TrackingLog = require('../../models/TrackingLog');
// const Delivery = require('../../models/Delivery');
// const Driver = require('../../models/Driver');

// // ==================== ADMIN TRACKING CONTROLLER ====================
// // Admin can:
// // ✅ See live location on map
// // ✅ See full route history
// // ✅ See all drivers on map (fleet view)
// // ✅ See final delivery location proof

// // ======================== GET LIVE LOCATION ON MAP ========================

// /**
//  * @desc    Get current location of vehicle/driver on map
//  * @route   GET /api/admin/tracking/live-location/:deliveryId
//  * @access  Admin Only
//  */
// exports.getLiveLocation = async (req, res) => {
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
//       return res.status(404).json({
//         success: false,
//         message: 'Delivery not found'
//       });
//     }

//     // Get latest location
//     const currentLocation = await TrackingLog.findOne({ 
//       deliveryId: delivery._id 
//     })
//     .sort({ timestamp: -1 });

//     if (!currentLocation) {
//       return res.status(404).json({
//         success: false,
//         message: 'No tracking data available yet'
//       });
//     }

//     // Calculate distance from destination
//     const distanceFromDestination = calculateDistance(
//       currentLocation.location.coordinates.latitude,
//       currentLocation.location.coordinates.longitude,
//       delivery.deliveryLocation.coordinates.latitude,
//       delivery.deliveryLocation.coordinates.longitude
//     );

//     return res.status(200).json({
//       success: true,
//       message: 'Live location retrieved successfully',
//       data: {
//         delivery: {
//           id: delivery._id,
//           trackingNumber: delivery.trackingNumber,
//           orderId: delivery.orderId,
//           status: delivery.status,
//           priority: delivery.priority,
//           estimatedDeliveryTime: delivery.estimatedDeliveryTime,
//           pickupLocation: delivery.pickupLocation,
//           deliveryLocation: delivery.deliveryLocation
//         },
//         driver: delivery.driverId ? {
//           id: delivery.driverId._id,
//           name: delivery.driverId.userId.name,
//           phone: delivery.driverId.userId.phone,
//           profileImage: delivery.driverId.userId.profileImage,
//           vehicleNumber: delivery.driverId.vehicleNumber,
//           vehicleType: delivery.driverId.vehicleType
//         } : null,
//         currentLocation: {
//           coordinates: currentLocation.location.coordinates,
//           address: currentLocation.location.address,
//           accuracy: currentLocation.location.accuracy,
//           speed: currentLocation.speed,
//           heading: currentLocation.heading,
//           batteryLevel: currentLocation.batteryLevel,
//           timestamp: currentLocation.timestamp,
//           minutesAgo: Math.floor((Date.now() - new Date(currentLocation.timestamp).getTime()) / 60000)
//         },
//         distance: {
//           fromDestination: `${distanceFromDestination.toFixed(2)} km`,
//           estimatedTime: currentLocation.speed > 0 
//             ? `${Math.ceil((distanceFromDestination / currentLocation.speed) * 60)} min` 
//             : 'N/A'
//         },
//         estimatedArrival: delivery.estimatedDeliveryTime
//       }
//     });

//   } catch (error) {
//     console.error('Admin Get Live Location Error:', error);
//     return res.status(500).json({
//       success: false,
//       message: error.message || 'Failed to get live location'
//     });
//   }
// };

// // ======================== GET FULL ROUTE HISTORY ========================

// /**
//  * @desc    See full route history with all tracking points
//  * @route   GET /api/admin/tracking/route-history/:deliveryId
//  * @access  Admin Only
//  */
// exports.getRouteHistory = async (req, res) => {
//   try {
//     const { deliveryId } = req.params;
//     const { limit = 1000 } = req.query;

//     const delivery = await Delivery.findById(deliveryId)
//       .populate('driverId', 'vehicleNumber userId')
//       .populate({
//         path: 'driverId',
//         populate: {
//           path: 'userId',
//           select: 'name'
//         }
//       });

//     if (!delivery) {
//       return res.status(404).json({
//         success: false,
//         message: 'Delivery not found'
//       });
//     }

//     // Get all tracking logs
//     const trackingLogs = await TrackingLog.find({ 
//       deliveryId: delivery._id 
//     })
//     .sort({ timestamp: 1 })
//     .limit(parseInt(limit));

//     // Format for map polyline
//     const route = trackingLogs.map(log => ({
//       latitude: log.location.coordinates.latitude,
//       longitude: log.location.coordinates.longitude,
//       address: log.location.address,
//       speed: log.speed,
//       heading: log.heading,
//       batteryLevel: log.batteryLevel,
//       timestamp: log.timestamp
//     }));

//     // Calculate total distance
//     let totalDistance = 0;
//     for (let i = 1; i < route.length; i++) {
//       totalDistance += calculateDistance(
//         route[i-1].latitude,
//         route[i-1].longitude,
//         route[i].latitude,
//         route[i].longitude
//       );
//     }

//     // Calculate journey duration
//     const journeyDuration = route.length > 0
//       ? Math.floor((new Date(route[route.length - 1].timestamp) - new Date(route[0].timestamp)) / 60000)
//       : 0;

//     return res.status(200).json({
//       success: true,
//       message: 'Route history retrieved successfully',
//       data: {
//         delivery: {
//           id: delivery._id,
//           trackingNumber: delivery.trackingNumber,
//           status: delivery.status,
//           driver: delivery.driverId ? {
//             name: delivery.driverId.userId.name,
//             vehicleNumber: delivery.driverId.vehicleNumber
//           } : null
//         },
//         route,
//         statistics: {
//           totalPoints: route.length,
//           totalDistance: `${totalDistance.toFixed(2)} km`,
//           journeyDuration: `${journeyDuration} minutes`,
//           avgSpeed: route.length > 1 
//             ? `${(route.reduce((sum, r) => sum + (r.speed || 0), 0) / route.length).toFixed(2)} km/h`
//             : 'N/A',
//           startTime: route.length > 0 ? route[0].timestamp : null,
//           lastUpdate: route.length > 0 ? route[route.length - 1].timestamp : null
//         }
//       }
//     });

//   } catch (error) {
//     console.error('Admin Get Route History Error:', error);
//     return res.status(500).json({
//       success: false,
//       message: error.message || 'Failed to get route history'
//     });
//   }
// };

// // ======================== TRACK DELIVERY PROGRESS ========================

// /**
//  * @desc    Track delivery progress with percentage
//  * @route   GET /api/admin/tracking/progress/:deliveryId
//  * @access  Admin Only
//  */
// exports.trackDeliveryProgress = async (req, res) => {
//   try {
//     const { deliveryId } = req.params;

//     const delivery = await Delivery.findById(deliveryId)
//       .populate('customerId', 'name phone')
//       .populate({
//         path: 'driverId',
//         populate: {
//           path: 'userId',
//           select: 'name phone'
//         }
//       });

//     if (!delivery) {
//       return res.status(404).json({
//         success: false,
//         message: 'Delivery not found'
//       });
//     }

//     // Get current location
//     const currentLocation = await TrackingLog.findOne({ 
//       deliveryId: delivery._id 
//     }).sort({ timestamp: -1 });

//     // Calculate progress
//     let progress = {
//       totalDistanceTraveled: 0,
//       remainingDistance: 0,
//       completionPercentage: 0,
//       status: delivery.status
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

//       // Calculate remaining distance
//       progress.remainingDistance = calculateDistance(
//         currentLocation.location.coordinates.latitude,
//         currentLocation.location.coordinates.longitude,
//         delivery.deliveryLocation.coordinates.latitude,
//         delivery.deliveryLocation.coordinates.longitude
//       );

//       // Calculate percentage
//       const totalExpectedDistance = progress.totalDistanceTraveled + progress.remainingDistance;
//       if (totalExpectedDistance > 0) {
//         progress.completionPercentage = (progress.totalDistanceTraveled / totalExpectedDistance) * 100;
//       }
//     }

//     return res.status(200).json({
//       success: true,
//       message: 'Delivery progress retrieved successfully',
//       data: {
//         delivery: {
//           id: delivery._id,
//           trackingNumber: delivery.trackingNumber,
//           orderId: delivery.orderId,
//           status: delivery.status,
//           scheduledDeliveryTime: delivery.scheduledDeliveryTime,
//           estimatedDeliveryTime: delivery.estimatedDeliveryTime,
//           customer: delivery.customerId
//         },
//         driver: delivery.driverId ? {
//           name: delivery.driverId.userId.name,
//           phone: delivery.driverId.userId.phone,
//           vehicleNumber: delivery.driverId.vehicleNumber
//         } : null,
//         progress: {
//           totalDistanceTraveled: `${progress.totalDistanceTraveled.toFixed(2)} km`,
//           remainingDistance: `${progress.remainingDistance.toFixed(2)} km`,
//           completionPercentage: `${progress.completionPercentage.toFixed(2)}%`,
//           status: progress.status
//         },
//         currentLocation: currentLocation ? {
//           coordinates: currentLocation.location.coordinates,
//           address: currentLocation.location.address,
//           speed: currentLocation.speed,
//           heading: currentLocation.heading,
//           timestamp: currentLocation.timestamp
//         } : null,
//         trackingPoints: await TrackingLog.countDocuments({ deliveryId: delivery._id })
//       }
//     });

//   } catch (error) {
//     console.error('Track Delivery Progress Error:', error);
//     return res.status(500).json({
//       success: false,
//       message: error.message || 'Failed to track delivery progress'
//     });
//   }
// };

// // ======================== SEE ALL DRIVERS ON MAP (FLEET VIEW) ========================

// /**
//  * @desc    Get all active drivers with their current locations (fleet view)
//  * @route   GET /api/admin/tracking/fleet-view
//  * @access  Admin Only
//  */
// exports.getFleetView = async (req, res) => {
//   try {
//     const { radius, centerLat, centerLon, status } = req.query;

//     // Build query for drivers
//     let driverQuery = { 
//       profileStatus: 'approved'
//     };

//     if (status) {
//       driverQuery.isAvailable = status === 'available';
//     }

//     // Get all drivers
//     const drivers = await Driver.find(driverQuery)
//       .populate('userId', 'name phone profileImage');

//     const driversWithLocation = [];

//     for (const driver of drivers) {
//       // Get latest location
//       const lastLocation = await TrackingLog.findOne({ 
//         driverId: driver._id 
//       })
//       .sort({ timestamp: -1 })
//       .populate('deliveryId', 'trackingNumber status orderId');

//       if (lastLocation) {
//         let includeDriver = true;

//         // Filter by radius if provided
//         if (radius && centerLat && centerLon) {
//           const distance = calculateDistance(
//             parseFloat(centerLat),
//             parseFloat(centerLon),
//             lastLocation.location.coordinates.latitude,
//             lastLocation.location.coordinates.longitude
//           );
//           includeDriver = distance <= parseFloat(radius);
//         }

//         if (includeDriver) {
//           // Calculate time since last update
//           const minutesSinceUpdate = Math.floor(
//             (Date.now() - new Date(lastLocation.timestamp).getTime()) / 60000
//           );

//           driversWithLocation.push({
//             driver: {
//               id: driver._id,
//               name: driver.userId.name,
//               phone: driver.userId.phone,
//               profileImage: driver.userId.profileImage,
//               vehicleNumber: driver.vehicleNumber,
//               vehicleType: driver.vehicleType,
//               isAvailable: driver.isAvailable,
//               rating: driver.rating || 0
//             },
//             currentLocation: {
//               coordinates: lastLocation.location.coordinates,
//               address: lastLocation.location.address,
//               accuracy: lastLocation.location.accuracy
//             },
//             movement: {
//               speed: lastLocation.speed,
//               heading: lastLocation.heading
//             },
//             status: {
//               batteryLevel: lastLocation.batteryLevel,
//               lastUpdate: lastLocation.timestamp,
//               minutesSinceUpdate,
//               isActive: minutesSinceUpdate < 5 // Active if updated in last 5 minutes
//             },
//             activeDelivery: lastLocation.deliveryId ? {
//               id: lastLocation.deliveryId._id,
//               trackingNumber: lastLocation.deliveryId.trackingNumber,
//               orderId: lastLocation.deliveryId.orderId,
//               status: lastLocation.deliveryId.status
//             } : null
//           });
//         }
//       }
//     }

//     // Sort by last update (most recent first)
//     driversWithLocation.sort((a, b) => 
//       new Date(b.status.lastUpdate) - new Date(a.status.lastUpdate)
//     );

//     return res.status(200).json({
//       success: true,
//       message: 'Fleet view retrieved successfully',
//       data: {
//         drivers: driversWithLocation,
//         statistics: {
//           totalDrivers: driversWithLocation.length,
//           activeDrivers: driversWithLocation.filter(d => d.status.isActive).length,
//           availableDrivers: driversWithLocation.filter(d => d.driver.isAvailable).length,
//           onDelivery: driversWithLocation.filter(d => d.activeDelivery).length
//         },
//         filters: { radius, centerLat, centerLon, status }
//       }
//     });

//   } catch (error) {
//     console.error('Get Fleet View Error:', error);
//     return res.status(500).json({
//       success: false,
//       message: error.message || 'Failed to get fleet view'
//     });
//   }
// };

// // ======================== GET FINAL DELIVERY LOCATION PROOF ========================

// /**
//  * @desc    Get final delivery location proof
//  * @route   GET /api/admin/tracking/final-location/:deliveryId
//  * @access  Admin Only
//  */
// exports.getFinalLocationProof = async (req, res) => {
//   try {
//     const { deliveryId } = req.params;

//     const delivery = await Delivery.findById(deliveryId)
//       .populate('driverId', 'vehicleNumber userId')
//       .populate({
//         path: 'driverId',
//         populate: {
//           path: 'userId',
//           select: 'name phone'
//         }
//       });

//     if (!delivery) {
//       return res.status(404).json({
//         success: false,
//         message: 'Delivery not found'
//       });
//     }

//     // Get final tracking log (last location before completion)
//     const finalLocation = await TrackingLog.findOne({ 
//       deliveryId: delivery._id 
//     }).sort({ timestamp: -1 });

//     if (!finalLocation) {
//       return res.status(404).json({
//         success: false,
//         message: 'No final location data available'
//       });
//     }

//     // Calculate distance from expected delivery location
//     const distanceFromExpected = calculateDistance(
//       finalLocation.location.coordinates.latitude,
//       finalLocation.location.coordinates.longitude,
//       delivery.deliveryLocation.coordinates.latitude,
//       delivery.deliveryLocation.coordinates.longitude
//     );

//     return res.status(200).json({
//       success: true,
//       message: 'Final location proof retrieved successfully',
//       data: {
//         delivery: {
//           id: delivery._id,
//           trackingNumber: delivery.trackingNumber,
//           orderId: delivery.orderId,
//           status: delivery.status,
//           scheduledDeliveryTime: delivery.scheduledDeliveryTime,
//           actualDeliveryTime: delivery.actualDeliveryTime,
//           finalRemarks: delivery.finalRemarks
//         },
//         driver: delivery.driverId ? {
//           name: delivery.driverId.userId.name,
//           phone: delivery.driverId.userId.phone,
//           vehicleNumber: delivery.driverId.vehicleNumber
//         } : null,
//         expectedLocation: delivery.deliveryLocation,
//         actualLocation: delivery.actualDeliveryLocation || finalLocation.location,
//         finalLocationProof: {
//           coordinates: finalLocation.location.coordinates,
//           address: finalLocation.location.address,
//           accuracy: finalLocation.location.accuracy,
//           timestamp: finalLocation.timestamp,
//           distanceFromExpected: `${distanceFromExpected.toFixed(2)} km`,
//           withinAcceptableRange: distanceFromExpected < 0.5 // 500 meters
//         },
//         deliveryProof: {
//           signature: delivery.customerSignature || null,
//           otp: delivery.otpVerified ? 'Verified' : 'Not verified',
//           photos: delivery.deliveryPhotos || []
//         }
//       }
//     });

//   } catch (error) {
//     console.error('Get Final Location Proof Error:', error);
//     return res.status(500).json({
//       success: false,
//       message: error.message || 'Failed to get final location proof'
//     });
//   }
// };

// // ======================== GET SPECIFIC DRIVER LOCATION ========================

// /**
//  * @desc    Get current location of specific driver
//  * @route   GET /api/admin/tracking/driver/:driverId/location
//  * @access  Admin Only
//  */
// exports.getDriverLocation = async (req, res) => {
//   try {
//     const { driverId } = req.params;

//     const driver = await Driver.findById(driverId)
//       .populate('userId', 'name phone profileImage');

//     if (!driver) {
//       return res.status(404).json({
//         success: false,
//         message: 'Driver not found'
//       });
//     }

//     // Get latest location
//     const currentLocation = await TrackingLog.findOne({ 
//       driverId: driver._id 
//     })
//     .sort({ timestamp: -1 })
//     .populate('deliveryId', 'trackingNumber status orderId');

//     if (!currentLocation) {
//       return res.status(404).json({
//         success: false,
//         message: 'No tracking data available for this driver'
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       message: 'Driver location retrieved successfully',
//       data: {
//         driver: {
//           id: driver._id,
//           name: driver.userId.name,
//           phone: driver.userId.phone,
//           vehicleNumber: driver.vehicleNumber,
//           vehicleType: driver.vehicleType,
//           isAvailable: driver.isAvailable
//         },
//         currentLocation: {
//           coordinates: currentLocation.location.coordinates,
//           address: currentLocation.location.address,
//           accuracy: currentLocation.location.accuracy,
//           speed: currentLocation.speed,
//           heading: currentLocation.heading,
//           batteryLevel: currentLocation.batteryLevel,
//           timestamp: currentLocation.timestamp
//         },
//         activeDelivery: currentLocation.deliveryId ? {
//           id: currentLocation.deliveryId._id,
//           trackingNumber: currentLocation.deliveryId.trackingNumber,
//           orderId: currentLocation.deliveryId.orderId,
//           status: currentLocation.deliveryId.status
//         } : null
//       }
//     });

//   } catch (error) {
//     console.error('Get Driver Location Error:', error);
//     return res.status(500).json({
//       success: false,
//       message: error.message || 'Failed to get driver location'
//     });
//   }
// };

// // ======================== DELETE OLD TRACKING LOGS ========================

// /**
//  * @desc    Delete old tracking logs (maintenance)
//  * @route   DELETE /api/admin/tracking/cleanup
//  * @access  Admin Only
//  */
// exports.deleteOldTrackingLogs = async (req, res) => {
//   try {
//     const { days = 30 } = req.query;
    
//     const cutoffDate = new Date();
//     cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

//     const result = await TrackingLog.deleteMany({
//       timestamp: { $lt: cutoffDate }
//     });

//     return res.status(200).json({
//       success: true,
//       message: 'Old tracking logs deleted successfully',
//       data: {
//         deletedCount: result.deletedCount,
//         cutoffDate,
//         daysDeleted: parseInt(days)
//       }
//     });

//   } catch (error) {
//     console.error('Delete Old Tracking Logs Error:', error);
//     return res.status(500).json({
//       success: false,
//       message: error.message || 'Failed to delete old logs'
//     });
//   }
// };

// // Helper function to calculate distance
// function calculateDistance(lat1, lon1, lat2, lon2) {
//   const R = 6371; // Earth's radius in km
//   const dLat = toRad(lat2 - lat1);
//   const dLon = toRad(lon2 - lon1);
//   const a =
//     Math.sin(dLat / 2) * Math.sin(dLat / 2) +
//     Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
//     Math.sin(dLon / 2) * Math.sin(dLon / 2);
//   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//   return R * c;
// }

// function toRad(degrees) {
//   return degrees * (Math.PI / 180);
// }

// module.exports = exports;


const TrackingLog = require('../../models/TrackingLog');
const Delivery = require('../../models/Delivery');
const Driver = require('../../models/Driver');

// ==================== ADMIN TRACKING CONTROLLER ====================
// Admin can:
// ✅ See live location on map
// ✅ See full route history
// ✅ See all drivers on map (fleet view)
// ✅ See final delivery location proof

// ======================== GET LIVE LOCATION ON MAP ========================

/**
 * @desc    Get current location of vehicle/driver on map
 * @route   GET /api/admin/tracking/live-location/:deliveryId
 * @access  Admin Only
 */
exports.getLiveLocation = async (req, res) => {
  try {
    const { deliveryId } = req.params;

    const delivery = await Delivery.findById(deliveryId)
      .populate('customerId', 'name email phone')
      .populate({
        path: 'driverId',
        populate: {
          path: 'userId',
          select: 'name phone profileImage'
        }
      });

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
    }

    // Get latest location
    const currentLocation = await TrackingLog.findOne({ 
      deliveryId: delivery._id 
    })
    .sort({ timestamp: -1 });

    if (!currentLocation) {
      return res.status(404).json({
        success: false,
        message: 'No tracking data available yet'
      });
    }

    // Calculate distance from destination
    const distanceFromDestination = calculateDistance(
      currentLocation.location.coordinates.latitude,
      currentLocation.location.coordinates.longitude,
      delivery.deliveryLocation.coordinates.latitude,
      delivery.deliveryLocation.coordinates.longitude
    );

    return res.status(200).json({
      success: true,
      message: 'Live location retrieved successfully',
      data: {
        delivery: {
          id: delivery._id,
          trackingNumber: delivery.trackingNumber,
          orderId: delivery.orderId,
          status: delivery.status,
          priority: delivery.priority,
          estimatedDeliveryTime: delivery.estimatedDeliveryTime,
          pickupLocation: delivery.pickupLocation,
          deliveryLocation: delivery.deliveryLocation
        },
        driver: delivery.driverId ? {
          id: delivery.driverId._id,
          name: delivery.driverId.userId.name,
          phone: delivery.driverId.userId.phone,
          profileImage: delivery.driverId.userId.profileImage,
          vehicleNumber: delivery.driverId.vehicleNumber,
          vehicleType: delivery.driverId.vehicleType
        } : null,
        currentLocation: {
          coordinates: currentLocation.location.coordinates,
          address: currentLocation.location.address,
          accuracy: currentLocation.location.accuracy,
          speed: currentLocation.speed,
          heading: currentLocation.heading,
          batteryLevel: currentLocation.batteryLevel,
          timestamp: currentLocation.timestamp,
          minutesAgo: Math.floor((Date.now() - new Date(currentLocation.timestamp).getTime()) / 60000)
        },
        distance: {
          fromDestination: `${distanceFromDestination.toFixed(2)} km`,
          estimatedTime: currentLocation.speed > 0 
            ? `${Math.ceil((distanceFromDestination / currentLocation.speed) * 60)} min` 
            : 'N/A'
        },
        estimatedArrival: delivery.estimatedDeliveryTime
      }
    });

  } catch (error) {
    console.error('Admin Get Live Location Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get live location'
    });
  }
};

// ======================== GET FULL ROUTE HISTORY ========================

/**
 * @desc    See full route history with all tracking points
 * @route   GET /api/admin/tracking/route-history/:deliveryId
 * @access  Admin Only
 */
exports.getRouteHistory = async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const { limit = 1000 } = req.query;

    const delivery = await Delivery.findById(deliveryId)
      .populate('driverId', 'vehicleNumber userId')
      .populate({
        path: 'driverId',
        populate: {
          path: 'userId',
          select: 'name'
        }
      });

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
    }

    // Get all tracking logs
    const trackingLogs = await TrackingLog.find({ 
      deliveryId: delivery._id 
    })
    .sort({ timestamp: 1 })
    .limit(parseInt(limit));

    // Format for map polyline
    const route = trackingLogs.map(log => ({
      latitude: log.location.coordinates.latitude,
      longitude: log.location.coordinates.longitude,
      address: log.location.address,
      speed: log.speed,
      heading: log.heading,
      batteryLevel: log.batteryLevel,
      timestamp: log.timestamp
    }));

    // Calculate total distance
    let totalDistance = 0;
    for (let i = 1; i < route.length; i++) {
      totalDistance += calculateDistance(
        route[i-1].latitude,
        route[i-1].longitude,
        route[i].latitude,
        route[i].longitude
      );
    }

    // Calculate journey duration
    const journeyDuration = route.length > 0
      ? Math.floor((new Date(route[route.length - 1].timestamp) - new Date(route[0].timestamp)) / 60000)
      : 0;

    return res.status(200).json({
      success: true,
      message: 'Route history retrieved successfully',
      data: {
        delivery: {
          id: delivery._id,
          trackingNumber: delivery.trackingNumber,
          status: delivery.status,
          driver: delivery.driverId ? {
            name: delivery.driverId.userId.name,
            vehicleNumber: delivery.driverId.vehicleNumber
          } : null
        },
        route,
        statistics: {
          totalPoints: route.length,
          totalDistance: `${totalDistance.toFixed(2)} km`,
          journeyDuration: `${journeyDuration} minutes`,
          avgSpeed: route.length > 1 
            ? `${(route.reduce((sum, r) => sum + (r.speed || 0), 0) / route.length).toFixed(2)} km/h`
            : 'N/A',
          startTime: route.length > 0 ? route[0].timestamp : null,
          lastUpdate: route.length > 0 ? route[route.length - 1].timestamp : null
        }
      }
    });

  } catch (error) {
    console.error('Admin Get Route History Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get route history'
    });
  }
};

// ======================== TRACK DELIVERY PROGRESS ========================

/**
 * @desc    Track delivery progress with percentage
 * @route   GET /api/admin/tracking/progress/:deliveryId
 * @access  Admin Only
 */
exports.trackDeliveryProgress = async (req, res) => {
  try {
    const { deliveryId } = req.params;

    const delivery = await Delivery.findById(deliveryId)
      .populate('customerId', 'name phone')
      .populate({
        path: 'driverId',
        populate: {
          path: 'userId',
          select: 'name phone'
        }
      });

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
    }

    // Get current location
    const currentLocation = await TrackingLog.findOne({ 
      deliveryId: delivery._id 
    }).sort({ timestamp: -1 });

    // Calculate progress
    let progress = {
      totalDistanceTraveled: 0,
      remainingDistance: 0,
      completionPercentage: 0,
      status: delivery.status
    };

    if (currentLocation && delivery.status !== 'pending' && delivery.status !== 'assigned') {
      // Calculate total distance traveled
      const allLogs = await TrackingLog.find({ 
        deliveryId: delivery._id 
      }).sort({ timestamp: 1 });

      for (let i = 1; i < allLogs.length; i++) {
        const dist = calculateDistance(
          allLogs[i-1].location.coordinates.latitude,
          allLogs[i-1].location.coordinates.longitude,
          allLogs[i].location.coordinates.latitude,
          allLogs[i].location.coordinates.longitude
        );
        progress.totalDistanceTraveled += dist;
      }

      // Calculate remaining distance
      progress.remainingDistance = calculateDistance(
        currentLocation.location.coordinates.latitude,
        currentLocation.location.coordinates.longitude,
        delivery.deliveryLocation.coordinates.latitude,
        delivery.deliveryLocation.coordinates.longitude
      );

      // Calculate percentage
      const totalExpectedDistance = progress.totalDistanceTraveled + progress.remainingDistance;
      if (totalExpectedDistance > 0) {
        progress.completionPercentage = (progress.totalDistanceTraveled / totalExpectedDistance) * 100;
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Delivery progress retrieved successfully',
      data: {
        delivery: {
          id: delivery._id,
          trackingNumber: delivery.trackingNumber,
          orderId: delivery.orderId,
          status: delivery.status,
          scheduledDeliveryTime: delivery.scheduledDeliveryTime,
          estimatedDeliveryTime: delivery.estimatedDeliveryTime,
          customer: delivery.customerId
        },
        driver: delivery.driverId ? {
          name: delivery.driverId.userId.name,
          phone: delivery.driverId.userId.phone,
          vehicleNumber: delivery.driverId.vehicleNumber
        } : null,
        progress: {
          totalDistanceTraveled: `${progress.totalDistanceTraveled.toFixed(2)} km`,
          remainingDistance: `${progress.remainingDistance.toFixed(2)} km`,
          completionPercentage: `${progress.completionPercentage.toFixed(2)}%`,
          status: progress.status
        },
        currentLocation: currentLocation ? {
          coordinates: currentLocation.location.coordinates,
          address: currentLocation.location.address,
          speed: currentLocation.speed,
          heading: currentLocation.heading,
          timestamp: currentLocation.timestamp
        } : null,
        trackingPoints: await TrackingLog.countDocuments({ deliveryId: delivery._id })
      }
    });

  } catch (error) {
    console.error('Track Delivery Progress Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to track delivery progress'
    });
  }
};

// ======================== SEE ALL DRIVERS ON MAP (FLEET VIEW) ========================

/**
 * @desc    Get all active drivers with their current locations (fleet view)
 * @route   GET /api/admin/tracking/fleet-view
 * @access  Admin Only
 */
exports.getFleetView = async (req, res) => {
  try {
    const { radius, centerLat, centerLon, status } = req.query;

    // Build query for drivers
    let driverQuery = { 
      profileStatus: 'approved'
    };

    if (status) {
      driverQuery.isAvailable = status === 'available';
    }

    // Get all drivers
    const drivers = await Driver.find(driverQuery)
      .populate('userId', 'name phone profileImage');

    const driversWithLocation = [];

    for (const driver of drivers) {
      // Get latest location
      const lastLocation = await TrackingLog.findOne({ 
        driverId: driver._id 
      })
      .sort({ timestamp: -1 })
      .populate('deliveryId', 'trackingNumber status orderId');

      if (lastLocation) {
        let includeDriver = true;

        // Filter by radius if provided
        if (radius && centerLat && centerLon) {
          const distance = calculateDistance(
            parseFloat(centerLat),
            parseFloat(centerLon),
            lastLocation.location.coordinates.latitude,
            lastLocation.location.coordinates.longitude
          );
          includeDriver = distance <= parseFloat(radius);
        }

        if (includeDriver) {
          // Calculate time since last update
          const minutesSinceUpdate = Math.floor(
            (Date.now() - new Date(lastLocation.timestamp).getTime()) / 60000
          );

          driversWithLocation.push({
            driver: {
              id: driver._id,
              name: driver.userId.name,
              phone: driver.userId.phone,
              profileImage: driver.userId.profileImage,
              vehicleNumber: driver.vehicleNumber,
              vehicleType: driver.vehicleType,
              isAvailable: driver.isAvailable,
              rating: driver.rating || 0
            },
            currentLocation: {
              coordinates: lastLocation.location.coordinates,
              address: lastLocation.location.address,
              accuracy: lastLocation.location.accuracy
            },
            movement: {
              speed: lastLocation.speed,
              heading: lastLocation.heading
            },
            status: {
              batteryLevel: lastLocation.batteryLevel,
              lastUpdate: lastLocation.timestamp,
              minutesSinceUpdate,
              isActive: minutesSinceUpdate < 5 // Active if updated in last 5 minutes
            },
            activeDelivery: lastLocation.deliveryId ? {
              id: lastLocation.deliveryId._id,
              trackingNumber: lastLocation.deliveryId.trackingNumber,
              orderId: lastLocation.deliveryId.orderId,
              status: lastLocation.deliveryId.status
            } : null
          });
        }
      }
    }

    // Sort by last update (most recent first)
    driversWithLocation.sort((a, b) => 
      new Date(b.status.lastUpdate) - new Date(a.status.lastUpdate)
    );

    return res.status(200).json({
      success: true,
      message: 'Fleet view retrieved successfully',
      data: {
        drivers: driversWithLocation,
        statistics: {
          totalDrivers: driversWithLocation.length,
          activeDrivers: driversWithLocation.filter(d => d.status.isActive).length,
          availableDrivers: driversWithLocation.filter(d => d.driver.isAvailable).length,
          onDelivery: driversWithLocation.filter(d => d.activeDelivery).length
        },
        filters: { radius, centerLat, centerLon, status }
      }
    });

  } catch (error) {
    console.error('Get Fleet View Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get fleet view'
    });
  }
};

// ======================== GET FINAL DELIVERY LOCATION PROOF ========================

/**
 * @desc    Get final delivery location proof
 * @route   GET /api/admin/tracking/final-location/:deliveryId
 * @access  Admin Only
 */
exports.getFinalLocationProof = async (req, res) => {
  try {
    const { deliveryId } = req.params;

    const delivery = await Delivery.findById(deliveryId)
      .populate('driverId', 'vehicleNumber userId')
      .populate({
        path: 'driverId',
        populate: {
          path: 'userId',
          select: 'name phone'
        }
      });

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
    }

    // Get final tracking log (last location before completion)
    const finalLocation = await TrackingLog.findOne({ 
      deliveryId: delivery._id 
    }).sort({ timestamp: -1 });

    if (!finalLocation) {
      return res.status(404).json({
        success: false,
        message: 'No final location data available'
      });
    }

    // Calculate distance from expected delivery location
    const distanceFromExpected = calculateDistance(
      finalLocation.location.coordinates.latitude,
      finalLocation.location.coordinates.longitude,
      delivery.deliveryLocation.coordinates.latitude,
      delivery.deliveryLocation.coordinates.longitude
    );

    return res.status(200).json({
      success: true,
      message: 'Final location proof retrieved successfully',
      data: {
        delivery: {
          id: delivery._id,
          trackingNumber: delivery.trackingNumber,
          orderId: delivery.orderId,
          status: delivery.status,
          scheduledDeliveryTime: delivery.scheduledDeliveryTime,
          actualDeliveryTime: delivery.actualDeliveryTime,
          finalRemarks: delivery.finalRemarks
        },
        driver: delivery.driverId ? {
          name: delivery.driverId.userId.name,
          phone: delivery.driverId.userId.phone,
          vehicleNumber: delivery.driverId.vehicleNumber
        } : null,
        expectedLocation: delivery.deliveryLocation,
        actualLocation: delivery.actualDeliveryLocation || finalLocation.location,
        finalLocationProof: {
          coordinates: finalLocation.location.coordinates,
          address: finalLocation.location.address,
          accuracy: finalLocation.location.accuracy,
          timestamp: finalLocation.timestamp,
          distanceFromExpected: `${distanceFromExpected.toFixed(2)} km`,
          withinAcceptableRange: distanceFromExpected < 0.5 // 500 meters
        },
        deliveryProof: {
          signature: delivery.customerSignature || null,
          otp: delivery.otpVerified ? 'Verified' : 'Not verified',
          photos: delivery.deliveryPhotos || []
        }
      }
    });

  } catch (error) {
    console.error('Get Final Location Proof Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get final location proof'
    });
  }
};

// ======================== GET SPECIFIC DRIVER LOCATION ========================

/**
 * @desc    Get current location of specific driver
 * @route   GET /api/admin/tracking/driver/:driverId/location
 * @access  Admin Only
 */
exports.getDriverLocation = async (req, res) => {
  try {
    const { driverId } = req.params;

    const driver = await Driver.findById(driverId)
      .populate('userId', 'name phone profileImage');

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    // Get latest location
    const currentLocation = await TrackingLog.findOne({ 
      driverId: driver._id 
    })
    .sort({ timestamp: -1 })
    .populate('deliveryId', 'trackingNumber status orderId');

    if (!currentLocation) {
      return res.status(404).json({
        success: false,
        message: 'No tracking data available for this driver'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Driver location retrieved successfully',
      data: {
        driver: {
          id: driver._id,
          name: driver.userId.name,
          phone: driver.userId.phone,
          vehicleNumber: driver.vehicleNumber,
          vehicleType: driver.vehicleType,
          isAvailable: driver.isAvailable
        },
        currentLocation: {
          coordinates: currentLocation.location.coordinates,
          address: currentLocation.location.address,
          accuracy: currentLocation.location.accuracy,
          speed: currentLocation.speed,
          heading: currentLocation.heading,
          batteryLevel: currentLocation.batteryLevel,
          timestamp: currentLocation.timestamp
        },
        activeDelivery: currentLocation.deliveryId ? {
          id: currentLocation.deliveryId._id,
          trackingNumber: currentLocation.deliveryId.trackingNumber,
          orderId: currentLocation.deliveryId.orderId,
          status: currentLocation.deliveryId.status
        } : null
      }
    });

  } catch (error) {
    console.error('Get Driver Location Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get driver location'
    });
  }
};

// ======================== DELETE OLD TRACKING LOGS ========================

/**
 * @desc    Delete old tracking logs (maintenance)
 * @route   DELETE /api/admin/tracking/cleanup
 * @access  Admin Only
 */
exports.deleteOldTrackingLogs = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    const result = await TrackingLog.deleteMany({
      timestamp: { $lt: cutoffDate }
    });

    return res.status(200).json({
      success: true,
      message: 'Old tracking logs deleted successfully',
      data: {
        deletedCount: result.deletedCount,
        cutoffDate,
        daysDeleted: parseInt(days)
      }
    });

  } catch (error) {
    console.error('Delete Old Tracking Logs Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete old logs'
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

// ======================== GET ALL ACTIVE DRIVER LOCATIONS (FOR ADMIN FLEET MAP) ========================

/**
 * @desc    Get all drivers' current live locations from DB (for initial map load)
 * @route   GET /admin/tracking/all-driver-locations
 * @access  Admin Only
 */
exports.getAllDriverLocations = async (req, res) => {
  try {
    const drivers = await Driver.find({
      profileStatus: 'approved',
      isActive: true
    }).populate('userId', 'name phone profileImage');

    const result = [];

    for (const driver of drivers) {
      if (
        driver.currentLocation &&
        driver.currentLocation.latitude &&
        driver.currentLocation.longitude
      ) {
        // Only include if location updated within last 30 minutes
        const lastUpdate = driver.currentLocation.timestamp;
        const minutesAgo = lastUpdate
          ? Math.floor((Date.now() - new Date(lastUpdate).getTime()) / 60000)
          : 9999;

        result.push({
          driverId: driver._id,
          driverName: driver.userId ? driver.userId.name : driver.name || 'Unknown',
          vehicleNumber: driver.vehicleNumber || 'N/A',
          phone: driver.userId ? driver.userId.phone : driver.phone || '',
          profileImage: driver.userId ? driver.userId.profileImage : driver.profileImage || null,
          isAvailable: driver.isAvailable,
          location: {
            latitude: driver.currentLocation.latitude,
            longitude: driver.currentLocation.longitude,
            speed: driver.currentLocation.speed || 0,
            heading: driver.currentLocation.heading || 0,
            accuracy: driver.currentLocation.accuracy || 0,
            timestamp: driver.currentLocation.timestamp
          },
          minutesAgo,
          isOnline: minutesAgo < 5
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: result,
      total: result.length
    });

  } catch (error) {
    console.error('Get All Driver Locations Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get driver locations'
    });
  }
};
