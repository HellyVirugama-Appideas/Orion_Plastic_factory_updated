// const mongoose = require("mongoose");
// const Journey = require('../../models/Journey');
// const Delivery = require('../../models/Delivery');
// const Driver = require('../../models/Driver');
// const Remark = require("../../models/Remark")
// const DeliveryStatusHistory = require('../../models/DeliveryStatusHistory');
// const { successResponse, errorResponse } = require('../../utils/responseHelper');
// const { calculateDistance } = require('../../utils/geoHelper');
// const { logDriverActivity } = require("../../utils/activityLogger")
// const axios = require("axios")

// exports.updateJourneyLocation = async (req, res) => {
//   try {
//     const { journeyId } = req.params;
//     const { latitude, longitude, address, speed, heading } = req.body;

//     if (!latitude || !longitude) {
//       return errorResponse(res, 'Latitude and longitude are required', 400);
//     }

//     const driver = req.user;
//     const journey = await Journey.findById(journeyId);

//     if (!journey) {
//       return errorResponse(res, 'Journey not found', 404);
//     }

//     if (journey.driverId.toString() !== driver._id.toString()) {
//       return errorResponse(res, 'Unauthorized', 403);
//     }

//     // Check if journey is active
//     if (!['Started', 'In_transit', 'In_progress', 'assigned'].includes(journey.status)) {
//       return errorResponse(res, 'Journey is not active', 400);
//     }

//     const locationData = {
//       latitude: Number(latitude),
//       longitude: Number(longitude),
//       address: address || 'GPS Location',
//       lastUpdated: new Date()
//     };

//     if (speed) locationData.speed = Number(speed);
//     if (heading) locationData.heading = Number(heading);

//     // Update driver's current location in Driver model
//     await Driver.findByIdAndUpdate(
//       driver._id,
//       { 
//         currentLocation: locationData,
//         lastLocationUpdate: new Date()
//       },
//       { new: true }
//     );

//     // ────────────────── ✅ SOCKET.IO EMIT TO ADMIN DASHBOARD ──────────────────
//     const io = req.app.get('io');
//     if (io) {
//       io.to('admin-room').emit('driver:location:update', {
//         driverId: driver._id.toString(),
//         driverName: driver.name,
//         vehicleNumber: driver.vehicleNumber || driver.vehicle?.vehicleNumber || 'N/A',
//         location: locationData,
//         isAvailable: driver.isAvailable || false,
//         status: journey.status,
//         journeyId: journey._id.toString(),
//         timestamp: new Date().toISOString()
//       });
      
//       console.log(`📍 [SOCKET] Location broadcasted for driver: ${driver.name} at ${latitude}, ${longitude}`);
//     } else {
//       console.warn('⚠️ Socket.IO not available - location not broadcasted');
//     }
//     // ─────────────────────────────────────────────────────────────────────────

//     return successResponse(res, 'Location updated successfully', {
//       location: locationData,
//       journeyStatus: journey.status
//     });

//   } catch (error) {
//     console.error('❌ Update Journey Location Error:', error);
//     return errorResponse(res, 'Failed to update location', 500);
//   }
// };


// // exports.startJourney = async (req, res) => {
// //   try {
// //     const { deliveryId, latitude, longitude, address } = req.body;

// //     if (!deliveryId || latitude === undefined || longitude === undefined) {
// //       return errorResponse(res, 'deliveryId, latitude and longitude are required', 400);
// //     }

// //     const driver = req.user;

// //     if (!driver) {
// //       return errorResponse(res, 'Driver not authenticated', 401);
// //     }

// //     // Verify delivery assigned to this driver
// //     const delivery = await Delivery.findOne({
// //       _id: deliveryId,
// //       driverId: driver._id,
// //       status: 'assigned'
// //     });

// //     if (!delivery) {
// //       return errorResponse(res, 'Delivery not found or not assigned to you', 404);
// //     }

// //     // Check if journey already exists
// //     const existingJourney = await Journey.findOne({
// //       deliveryId,
// //       status: { $in: ['Started', 'In_transit', 'In_progress'] }
// //     });

// //     if (existingJourney) {
// //       return errorResponse(res, 'Journey already started', 400);
// //     }

// //     // Create Journey
// //     const journey = await Journey.create({
// //       deliveryId,
// //       driverId: driver._id,
// //       startLocation: {
// //         coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
// //         address: address || 'Location captured via GPS'
// //       },
// //       startTime: new Date(),
// //       status: 'assigned'  // Initial status
// //     });

// //     // Update delivery status to picked_up
// //     delivery.status = 'In_transit';
// //     delivery.actualPickupTime = new Date();
// //     await delivery.save();

// //     // Delivery Status History
// //     await DeliveryStatusHistory.create({
// //       deliveryId: delivery._id,
// //       status: 'In_transit',
// //       location: {
// //         coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
// //         address: address || 'GPS Location'
// //       },
// //       remarks: 'Driver started journey - Package picked up',
// //       updatedBy: {
// //         userId: driver._id,
// //         userRole: 'driver',
// //         userName: driver.name
// //       }
// //     });

// //     // Update driver status
// //     await Driver.findByIdAndUpdate(driver._id, {
// //       // isAvailable: false,
// //       currentJourney: journey._id,
// //       activeDelivery: delivery._id
// //     });

// //     // ────────────────── DRIVER ACTIVITY LOGGING ──────────────────
// //     try {
// //       await logDriverActivity(
// //         driver._id,
// //         'JOURNEY_STARTED',
// //         {
// //           journeyId: journey._id.toString(),
// //           deliveryId: delivery._id.toString(),
// //           trackingNumber: delivery.trackingNumber || 'N/A',
// //           vehicleId: driver.vehicle ? driver.vehicle.toString() : null,
// //           startLocation: {
// //             latitude: Number(latitude),
// //             longitude: Number(longitude),
// //             address: address || 'GPS captured'
// //           },
// //           startTime: new Date().toISOString()
// //         },
// //         req
// //       );
// //     } catch (logError) {
// //       console.error('Failed to log JOURNEY_STARTED activity:', logError.message);
// //     }
// //     // ─────────────────────────────────────────────────────────────

// //     // Automatically update to In_transit status
// //     setTimeout(async () => {
// //       try {
// //         const updatedJourney = await Journey.findByIdAndUpdate(
// //           journey._id,
// //           { status: 'In_transit' },
// //           { new: true }
// //         );

// //         await DeliveryStatusHistory.create({
// //           deliveryId: delivery._id,
// //           status: 'In_transit',
// //           location: {
// //             coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
// //             address: address || 'GPS Location'
// //           },
// //           remarks: 'Package is now in transit',
// //           updatedBy: {
// //             userId: driver._id,
// //             userRole: 'driver',
// //             userName: driver.name
// //           }
// //         });

// //         delivery.status = 'In_transit';
// //         await delivery.save();
// //       } catch (error) {
// //         console.error('Failed to update to In_transit:', error.message);
// //       }
// //     }, 2000); // Update after 2 seconds

// //     return successResponse(res, 'Journey started successfully! Package picked up.', {
// //       journeyId: journey._id,
// //       deliveryStatus: delivery.status,
// //       trackingNumber: delivery.trackingNumber,
// //       pickupTime: delivery.actualPickupTime
// //     }, 201);

// //   } catch (error) {
// //     console.error('Start Journey Error:', error.message);
// //     return errorResponse(res, error.message || 'Failed to start journey', 500);
// //   }
// // };

// // ==================== CONTINUE JOURNEY ====================

// // exports.startJourney = async (req, res) => {
// //   try {
// //     const { deliveryId, latitude, longitude, address } = req.body;

// //     if (!deliveryId || latitude === undefined || longitude === undefined) {
// //       return errorResponse(res, 'deliveryId, latitude and longitude are required', 400);
// //     }

// //     const driver = req.user;

// //     if (!driver) {
// //       return errorResponse(res, 'Driver not authenticated', 401);
// //     }

// //     // Verify delivery assigned to this driver
// //     const delivery = await Delivery.findOne({
// //       _id: deliveryId,
// //       driverId: driver._id,
// //       status: 'assigned'
// //     });

// //     if (!delivery) {
// //       return errorResponse(res, 'Delivery not found or not assigned to you', 404);
// //     }

// //     // Check if journey already exists
// //     const existingJourney = await Journey.findOne({
// //       deliveryId,
// //       status: { $in: ['Started', 'In_transit', 'In_progress'] }
// //     });

// //     if (existingJourney) {
// //       return errorResponse(res, 'Journey already started', 400);
// //     }

// //     // Create Journey
// //     const journey = await Journey.create({
// //       deliveryId,
// //       driverId: driver._id,
// //       startLocation: {
// //         coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
// //         address: address || 'Location captured via GPS'
// //       },
// //       startTime: new Date(),
// //       status: 'assigned'
// //     });

// //     delivery.status = 'In_transit';
// //     delivery.actualPickupTime = new Date();
// //     await delivery.save();

// //     await DeliveryStatusHistory.create({
// //       deliveryId: delivery._id,
// //       status: 'In_transit',
// //       location: {
// //         coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
// //         address: address || 'GPS Location'
// //       },
// //       remarks: 'Driver started journey - Package picked up',
// //       updatedBy: {
// //         userId: driver._id,
// //         userRole: 'driver',
// //         userName: driver.name
// //       }
// //     });

// //     // Update driver with current location
// //     await Driver.findByIdAndUpdate(driver._id, {
// //       currentJourney: journey._id,
// //       activeDelivery: delivery._id,
// //       currentLocation: {
// //         latitude: Number(latitude),
// //         longitude: Number(longitude),
// //         address: address || 'GPS Location',
// //         lastUpdated: new Date()
// //       },
// //       lastLocationUpdate: new Date()
// //     });

// //     // ────────────────── SOCKET.IO - JOURNEY STARTED ──────────────────
// //     const io = req.app.get('io');
// //     if (io) {
// //       io.to('admin-room').emit('driver:journey:started', {
// //         driverId: driver._id.toString(),
// //         driverName: driver.name,
// //         vehicleNumber: driver.vehicleNumber || 'N/A',
// //         journeyId: journey._id.toString(),
// //         deliveryId: delivery._id.toString(),
// //         location: {
// //           latitude: Number(latitude),
// //           longitude: Number(longitude),
// //           address: address || 'GPS Location',
// //           lastUpdated: new Date()
// //         },
// //         isAvailable: false,
// //         status: 'In_transit',
// //         timestamp: new Date().toISOString()
// //       });

// //       console.log(`🚀 Journey started broadcast for: ${driver.name}`);
// //     }
// //     // ─────────────────────────────────────────────────────────────────

// //     // Activity logging
// //     try {
// //       await logDriverActivity(
// //         driver._id,
// //         'JOURNEY_STARTED',
// //         {
// //           journeyId: journey._id.toString(),
// //           deliveryId: delivery._id.toString(),
// //           trackingNumber: delivery.trackingNumber || 'N/A',
// //           vehicleId: driver.vehicle ? driver.vehicle.toString() : null,
// //           startLocation: {
// //             latitude: Number(latitude),
// //             longitude: Number(longitude),
// //             address: address || 'GPS captured'
// //           },
// //           startTime: new Date().toISOString()
// //         },
// //         req
// //       );
// //     } catch (logError) {
// //       console.error('Failed to log JOURNEY_STARTED activity:', logError.message);
// //     }

// //     // Auto-update to In_transit after 2 seconds
// //     setTimeout(async () => {
// //       try {
// //         const updatedJourney = await Journey.findByIdAndUpdate(
// //           journey._id,
// //           { status: 'In_transit' },
// //           { new: true }
// //         );

// //         await DeliveryStatusHistory.create({
// //           deliveryId: delivery._id,
// //           status: 'In_transit',
// //           location: {
// //             coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
// //             address: address || 'GPS Location'
// //           },
// //           remarks: 'Package is now in transit',
// //           updatedBy: {
// //             userId: driver._id,
// //             userRole: 'driver',
// //             userName: driver.name
// //           }
// //         });

// //         delivery.status = 'In_transit';
// //         await delivery.save();

// //         // Broadcast status change
// //         if (io) {
// //           io.to('admin-room').emit('driver:status:change', {
// //             driverId: driver._id.toString(),
// //             isAvailable: false,
// //             status: 'In_transit',
// //             journeyId: journey._id.toString()
// //           });
// //         }

// //       } catch (error) {
// //         console.error('Failed to update to In_transit:', error.message);
// //       }
// //     }, 2000);

// //     return successResponse(res, 'Journey started successfully! Package picked up.', {
// //       journeyId: journey._id,
// //       deliveryStatus: delivery.status,
// //       trackingNumber: delivery.trackingNumber,
// //       pickupTime: delivery.actualPickupTime
// //     }, 201);

// //   } catch (error) {
// //     console.error('Start Journey Error:', error.message);
// //     return errorResponse(res, error.message || 'Failed to start journey', 500);
// //   }
// // };

// exports.startJourney = async (req, res) => {
//   try {
//     const { deliveryId, latitude, longitude, address } = req.body;

//     if (!deliveryId || latitude === undefined || longitude === undefined) {
//       return errorResponse(res, 'deliveryId, latitude and longitude are required', 400);
//     }

//     const driver = req.user;

//     if (!driver) {
//       return errorResponse(res, 'Driver not authenticated', 401);
//     }

//     const delivery = await Delivery.findOne({
//       _id: deliveryId,
//       driverId: driver._id,
//       status: 'assigned'
//     });

//     if (!delivery) {
//       return errorResponse(res, 'Delivery not found or not assigned to you', 404);
//     }

//     const existingJourney = await Journey.findOne({
//       deliveryId,
//       status: { $in: ['Started', 'In_transit', 'In_progress'] }
//     });

//     if (existingJourney) {
//       return errorResponse(res, 'Journey already started', 400);
//     }

//     const journey = await Journey.create({
//       deliveryId,
//       driverId: driver._id,
//       startLocation: {
//         coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
//         address: address || 'Location captured via GPS'
//       },
//       startTime: new Date(),
//       status: 'assigned'
//     });

//     delivery.status = 'In_transit';
//     delivery.actualPickupTime = new Date();
//     await delivery.save();

//     await DeliveryStatusHistory.create({
//       deliveryId: delivery._id,
//       status: 'In_transit',
//       location: {
//         coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
//         address: address || 'GPS Location'
//       },
//       remarks: 'Driver started journey - Package picked up',
//       updatedBy: {
//         userId: driver._id,
//         userRole: 'driver',
//         userName: driver.name
//       }
//     });

//     // ✅ Update driver with current location
//     await Driver.findByIdAndUpdate(driver._id, {
//       currentJourney: journey._id,
//       activeDelivery: delivery._id,
//       currentLocation: {
//         latitude: Number(latitude),
//         longitude: Number(longitude),
//         address: address || 'GPS Location',
//         lastUpdated: new Date()
//       },
//       lastLocationUpdate: new Date()
//     });

//     // ────────────────── ✅ SOCKET.IO - JOURNEY STARTED ──────────────────
//     const io = req.app.get('io');
//     if (io) {
//       io.to('admin-room').emit('driver:journey:started', {
//         driverId: driver._id.toString(),
//         driverName: driver.name,
//         vehicleNumber: driver.vehicleNumber || 'N/A',
//         journeyId: journey._id.toString(),
//         deliveryId: delivery._id.toString(),
//         location: {
//           latitude: Number(latitude),
//           longitude: Number(longitude),
//           address: address || 'GPS Location',
//           lastUpdated: new Date()
//         },
//         isAvailable: false,
//         status: 'In_transit',
//         timestamp: new Date().toISOString()
//       });

//       console.log(`🚀 [SOCKET] Journey started broadcast for: ${driver.name}`);
//     }
//     // ─────────────────────────────────────────────────────────────────

//     // Activity logging
//     try {
//       await logDriverActivity(
//         driver._id,
//         'JOURNEY_STARTED',
//         {
//           journeyId: journey._id.toString(),
//           deliveryId: delivery._id.toString(),
//           trackingNumber: delivery.trackingNumber || 'N/A',
//           vehicleId: driver.vehicle ? driver.vehicle.toString() : null,
//           startLocation: {
//             latitude: Number(latitude),
//             longitude: Number(longitude),
//             address: address || 'GPS captured'
//           },
//           startTime: new Date().toISOString()
//         },
//         req
//       );
//     } catch (logError) {
//       console.error('Failed to log JOURNEY_STARTED activity:', logError.message);
//     }

//     // Auto-update to In_transit after 2 seconds
//     setTimeout(async () => {
//       try {
//         await Journey.findByIdAndUpdate(
//           journey._id,
//           { status: 'In_transit' },
//           { new: true }
//         );

//         await DeliveryStatusHistory.create({
//           deliveryId: delivery._id,
//           status: 'In_transit',
//           location: {
//             coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
//             address: address || 'GPS Location'
//           },
//           remarks: 'Package is now in transit',
//           updatedBy: {
//             userId: driver._id,
//             userRole: 'driver',
//             userName: driver.name
//           }
//         });

//         delivery.status = 'In_transit';
//         await delivery.save();

//         // ✅ Broadcast status change
//         if (io) {
//           io.to('admin-room').emit('driver:status:change', {
//             driverId: driver._id.toString(),
//             isAvailable: false,
//             status: 'In_transit',
//             journeyId: journey._id.toString()
//           });
//         }

//       } catch (error) {
//         console.error('Failed to update to In_transit:', error.message);
//       }
//     }, 2000);

//     return successResponse(res, 'Journey started successfully! Package picked up.', {
//       journeyId: journey._id,
//       deliveryStatus: delivery.status,
//       trackingNumber: delivery.trackingNumber,
//       pickupTime: delivery.actualPickupTime
//     }, 201);

//   } catch (error) {
//     console.error('Start Journey Error:', error.message);
//     return errorResponse(res, error.message || 'Failed to start journey', 500);
//   }
// };

// // exports.continueJourney = async (req, res) => {
// //   try {
// //     const { deliveryId } = req.body;

// //     if (!deliveryId) {
// //       return errorResponse(res, 'deliveryId is required', 400);
// //     }

// //     const driver = req.user;

// //     if (!driver) {
// //       return errorResponse(res, 'Driver not authenticated', 401);
// //     }

// //     // Find the delivery
// //     const delivery = await Delivery.findOne({
// //       _id: deliveryId,
// //       driverId: driver._id
// //     });

// //     if (!delivery) {
// //       return errorResponse(res, 'Delivery not found or not assigned to you', 404);
// //     }

// //     // Find active journey for this delivery
// //     const journey = await Journey.findOne({
// //       deliveryId,
// //       driverId: driver._id,
// //       status: {
// //         $in: ['Started', 'In_transit', 'In_progress', 'Picked_up']
// //       }
// //     }).populate('deliveryId', 'trackingNumber recipientName recipientPhone recipientAddress');

// //     if (!journey) {
// //       return errorResponse(res, 'No active journey found for this delivery', 404);
// //     }

// //     // Update driver's current journey reference (in case it was lost)
// //     await Driver.findByIdAndUpdate(driver._id, {
// //       isAvailable: false,
// //       currentJourney: journey._id,
// //       activeDelivery: delivery._id
// //     });

// //     // ────────────────── DRIVER ACTIVITY LOGGING ──────────────────
// //     try {
// //       await logDriverActivity(
// //         driver._id,
// //         'JOURNEY_CONTINUED',
// //         {
// //           journeyId: journey._id.toString(),
// //           deliveryId: delivery._id.toString(),
// //           trackingNumber: delivery.trackingNumber || 'N/A',
// //           currentStatus: journey.status,
// //           continuedAt: new Date().toISOString()
// //         },
// //         req
// //       );
// //     } catch (logError) {
// //       console.error('Failed to log JOURNEY_CONTINUED activity:', logError.message);
// //     }
// //     // ─────────────────────────────────────────────────────────────

// //     return successResponse(res, 'Journey resumed successfully!', {
// //       journeyId: journey._id,
// //       deliveryId: delivery._id,
// //       trackingNumber: delivery.trackingNumber,
// //       currentStatus: journey.status,
// //       startTime: journey.startTime,
// //       startLocation: journey.startLocation,
// //       recipientDetails: {
// //         name: delivery.recipientName,
// //         phone: delivery.recipientPhone,
// //         address: delivery.recipientAddress
// //       },
// //       waypoints: journey.waypoints || [],
// //       totalDistance: journey.totalDistance || 0,
// //       totalDuration: journey.totalDuration || 0
// //     }, 200);

// //   } catch (error) {
// //     console.error('Continue Journey Error:', error.message);
// //     return errorResponse(res, error.message || 'Failed to continue journey', 500);
// //   }
// // };

// // ==================== GET ACTIVE JOURNEY BY DELIVERY ID ====================

// exports.continueJourney = async (req, res) => {
//   try {
//     const { deliveryId } = req.body;

//     if (!deliveryId) {
//       return errorResponse(res, 'deliveryId is required', 400);
//     }

//     const driver = req.user;

//     if (!driver) {
//       return errorResponse(res, 'Driver not authenticated', 401);
//     }

//     const delivery = await Delivery.findOne({
//       _id: deliveryId,
//       driverId: driver._id
//     });

//     if (!delivery) {
//       return errorResponse(res, 'Delivery not found or not assigned to you', 404);
//     }

//     const journey = await Journey.findOne({
//       deliveryId,
//       driverId: driver._id,
//       status: {
//         $in: ['Started', 'In_transit', 'In_progress', 'Picked_up']
//       }
//     }).populate('deliveryId', 'trackingNumber recipientName recipientPhone recipientAddress');

//     if (!journey) {
//       return errorResponse(res, 'No active journey found for this delivery', 404);
//     }

//     await Driver.findByIdAndUpdate(driver._id, {
//       isAvailable: false,
//       currentJourney: journey._id,
//       activeDelivery: delivery._id
//     });

//     try {
//       await logDriverActivity(
//         driver._id,
//         'JOURNEY_CONTINUED',
//         {
//           journeyId: journey._id.toString(),
//           deliveryId: delivery._id.toString(),
//           trackingNumber: delivery.trackingNumber || 'N/A',
//           currentStatus: journey.status,
//           continuedAt: new Date().toISOString()
//         },
//         req
//       );
//     } catch (logError) {
//       console.error('Failed to log JOURNEY_CONTINUED activity:', logError.message);
//     }

//     return successResponse(res, 'Journey resumed successfully!', {
//       journeyId: journey._id,
//       deliveryId: delivery._id,
//       trackingNumber: delivery.trackingNumber,
//       currentStatus: journey.status,
//       startTime: journey.startTime,
//       startLocation: journey.startLocation,
//       recipientDetails: {
//         name: delivery.recipientName,
//         phone: delivery.recipientPhone,
//         address: delivery.recipientAddress
//       },
//       waypoints: journey.waypoints || [],
//       totalDistance: journey.totalDistance || 0,
//       totalDuration: journey.totalDuration || 0
//     }, 200);

//   } catch (error) {
//     console.error('Continue Journey Error:', error.message);
//     return errorResponse(res, error.message || 'Failed to continue journey', 500);
//   }
// };

// exports.getActiveJourneyByDeliveryId = async (req, res) => {
//   try {
//     const { deliveryId } = req.params;

//     if (!deliveryId) {
//       return errorResponse(res, 'deliveryId is required', 400);
//     }

//     const driver = req.user;

//     if (!driver) {
//       return errorResponse(res, 'Driver not authenticated', 401);
//     }

//     // Find active journey
//     const journey = await Journey.findOne({
//       deliveryId,
//       driverId: driver._id,
//       status: {
//         $in: ['Started', 'In_transit', 'In_progress', 'Picked_up']
//       }
//     })
//       .populate('deliveryId', 'trackingNumber recipientName recipientPhone recipientAddress estimatedDeliveryTime')
//       .populate('driverId', 'name phone vehicle');

//     if (!journey) {
//       return errorResponse(res, 'No active journey found for this delivery', 404);
//     }

//     return successResponse(res, 'Active journey retrieved successfully', {
//       journey,
//       isActive: true
//     }, 200);

//   } catch (error) {
//     console.error('Get Active Journey Error:', error.message);
//     return errorResponse(res, error.message || 'Failed to get active journey', 500);
//   }
// };

// // ADD CHECKPOINT 
// exports.addCheckpoint = async (req, res) => {
//   try {
//     const { journeyId } = req.params;
//     const { latitude, longitude, address, activity, remarks } = req.body;

//     if (!latitude || !longitude) {
//       return errorResponse(res, 'Location (latitude & longitude) is required', 400);
//     }

//     const driver = req.user;

//     // Get active journey
//     const journey = await Journey.findById(journeyId);
//     if (!journey) {
//       return errorResponse(res, 'Journey not found', 404);
//     }

//     // Verify driver ownership
//     if (journey.driverId.toString() !== driver._id.toString()) {
//       return errorResponse(res, 'Unauthorized: This journey does not belong to you', 403);
//     }

//     // Check if journey is active
//     if (!['started', 'in_progress'].includes(journey.status)) {
//       return errorResponse(res, 'Journey is not active', 400);
//     }

//     // Add checkpoint/waypoint
//     const checkpoint = {
//       location: {
//         coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
//         address: address || 'Checkpoint location'
//       },
//       timestamp: new Date(),
//       activity: activity || 'checkpoint',
//       remarks: remarks || ''
//     };

//     journey.waypoints.push(checkpoint);
//     journey.status = 'in_progress';
//     await journey.save();

//     // Create status history for checkpoint
//     const delivery = await Delivery.findById(journey.deliveryId);
//     if (delivery) {
//       await DeliveryStatusHistory.create({
//         deliveryId: delivery._id,
//         status: 'in_transit',
//         location: {
//           coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
//           address: address || 'Checkpoint'
//         },
//         remarks: remarks || `Driver added checkpoint: ${activity}`,
//         updatedBy: {
//           userId: driver._id,
//           userRole: 'driver',
//           userName: driver.name
//         }
//       });
//     }

//     return successResponse(res, 'Checkpoint added successfully', {
//       checkpointIndex: journey.waypoints.length - 1,
//       checkpoint,
//       totalCheckpoints: journey.waypoints.length
//     });

//   } catch (error) {
//     console.error('Add Checkpoint Error:', error.message);
//     return errorResponse(res, error.message || 'Failed to add checkpoint', 500);
//   }
// };

// //  ADD JOURNEY IMAGE 
// exports.addJourneyImage = async (req, res) => {
//   try {
//     const { journeyId } = req.params;
//     const { caption, latitude, longitude, imageType } = req.body;

//     if (!req.file) {
//       return errorResponse(res, 'Image file is required', 400);
//     }

//     const journey = await Journey.findById(journeyId);
//     if (!journey) {
//       return errorResponse(res, 'Journey not found', 404);
//     }

//     const driver = req.user;

//     if (journey.driverId.toString() !== driver._id.toString()) {
//       return errorResponse(res, 'Unauthorized: This journey does not belong to you', 403);
//     }

//     if (!['started', 'in_progress'].includes(journey.status)) {
//       return errorResponse(res, 'Cannot add image: Journey is not active', 400);
//     }

//     const imageUrl = `/uploads/journey/${req.file.filename}`;

//     const imageData = {
//       url: imageUrl,
//       caption: caption || 'Journey image',
//       timestamp: new Date(),
//       imageType: imageType || 'general'
//     };

//     if (latitude && longitude) {
//       imageData.location = {
//         latitude: parseFloat(latitude),
//         longitude: parseFloat(longitude)
//       };
//     }

//     journey.images.push(imageData);
//     await journey.save();

//     const addedImage = journey.images[journey.images.length - 1];

//     return successResponse(res, 'Image added to journey successfully!', {
//       image: addedImage,
//       totalImages: journey.images.length
//     });

//   } catch (error) {
//     console.error('Add Journey Image Error:', error.message);
//     return errorResponse(res, error.message || 'Failed to add image', 500);
//   }
// };

// // INITIATE CALL 
// // exports.initiateCall = async (req, res) => {
// //   try {
// //     const { journeyId } = req.params;
// //     const { contactName, phoneNumber: providedPhone } = req.body; // phoneNumber is optional

// //     const driver = req.user;
// //     const journey = await Journey.findById(journeyId);

// //     if (!journey) {
// //       return errorResponse(res, 'Journey not found', 404);
// //     }

// //     if (journey.driverId.toString() !== driver._id.toString()) {
// //       return errorResponse(res, 'Unauthorized: This journey does not belong to you', 403);
// //     }

// //     if (!journey.isActive()) {
// //       return errorResponse(res, 'Journey is not active', 400);
// //     }

// //     // Fetch delivery to get customer phone
// //     const delivery = await Delivery.findById(journey.deliveryId);

// //     if (!delivery) {
// //       return errorResponse(res, 'Delivery not found', 404);
// //     }

// //     // Determine phone number: use provided one OR fallback to delivery's recipient phone
// //     const phoneNumber = providedPhone || delivery.recipientPhone;

// //     // NOW validate: only after trying to get it from delivery
// //     if (!phoneNumber) {
// //       return errorResponse(res, 'Phone number not available. Customer phone is missing in delivery.', 400);
// //     }

// //     const finalContactName = contactName || delivery.recipientName || 'Customer';

// //     // Log the call
// //     const callLog = {
// //       type: 'call',
// //       phoneNumber,
// //       contactName: finalContactName,
// //       timestamp: new Date(),
// //       status: 'initiated',
// //       duration: 0
// //     };

// //     journey.communicationLog.push(callLog);
// //     await journey.save();

// //     return successResponse(res, 'Call initiated successfully', {
// //       callId: journey.communicationLog[journey.communicationLog.length - 1]._id,
// //       phoneNumber,
// //       callUrl: `tel:${phoneNumber}`,
// //       contactName: finalContactName,
// //       totalCalls: journey.communicationLog.filter(log => log.type === 'call').length
// //     });

// //   } catch (error) {
// //     console.error('Initiate Call Error:', error.message);
// //     return errorResponse(res, error.message || 'Failed to initiate call', 500);
// //   }
// // };

// exports.initiateCall = async (req, res) => {
//   try {
//     const { journeyId } = req.params;
//     const { contactName, phoneNumber: providedPhone } = req.body; // phoneNumber optional

//     const driver = req.user;
//     const journey = await Journey.findById(journeyId);

//     if (!journey) {
//       return errorResponse(res, 'Journey not found', 404);
//     }

//     if (journey.driverId.toString() !== driver._id.toString()) {
//       return errorResponse(res, 'Unauthorized: This journey does not belong to you', 403);
//     }

//     if (!journey.isActive()) {
//       return errorResponse(res, 'Journey is not active', 400);
//     }

//     // Fetch delivery
//     const delivery = await Delivery.findById(journey.deliveryId)
//       .populate('customerId', 'phoneNumber phone name fullName'); // Populate customer fields

//     if (!delivery) {
//       return errorResponse(res, 'Delivery not found', 404);
//     }

//     if (!delivery.customerId) {
//       return errorResponse(res, 'Customer not associated with this delivery', 400);
//     }

//     // Determine phone number
//     const phoneNumber = providedPhone || delivery.customerId.phoneNumber || delivery.customerId.phone;

//     if (!phoneNumber) {
//       return errorResponse(res, 'Customer phone number not found', 400);
//     }

//     // Determine contact name
//     const finalContactName =
//       contactName ||
//       delivery.customerId.name ||
//       delivery.customerId.fullName ||
//       delivery.recipientName ||
//       'Customer';

//     // Log the call
//     const callLog = {
//       type: 'call',
//       phoneNumber,
//       contactName: finalContactName,
//       timestamp: new Date(),
//       status: 'initiated',
//       duration: 0
//     };

//     journey.communicationLog.push(callLog);
//     await journey.save();

//     return successResponse(res, 'Call initiated successfully', {
//       callId: journey.communicationLog[journey.communicationLog.length - 1]._id,
//       phoneNumber,
//       callUrl: `tel:${phoneNumber}`,
//       contactName: finalContactName,
//       totalCalls: journey.communicationLog.filter(log => log.type === 'call').length
//     });

//   } catch (error) {
//     console.error('Initiate Call Error:', error.message);
//     return errorResponse(res, error.message || 'Failed to initiate call', 500);
//   }
// };

// // END CALL 
// exports.endCall = async (req, res) => {
//   try {
//     const { journeyId, callId } = req.params;
//     const { duration, status } = req.body;

//     const driver = req.user;
//     const journey = await Journey.findById(journeyId);

//     if (!journey) {
//       return errorResponse(res, 'Journey not found', 404);
//     }

//     if (journey.driverId.toString() !== driver._id.toString()) {
//       return errorResponse(res, 'Unauthorized', 403);
//     }

//     // Find the call log entry
//     const callLog = journey.communicationLog.id(callId);

//     if (!callLog) {
//       return errorResponse(res, 'Call log not found', 404);
//     }

//     // Update call details
//     callLog.duration = duration || 0;
//     callLog.status = status || 'completed';

//     await journey.save();

//     return successResponse(res, 'Call ended and logged successfully', {
//       callId: callLog._id,
//       duration: `${duration} seconds`,
//       status: callLog.status
//     });

//   } catch (error) {
//     console.error('End Call Error:', error.message);
//     return errorResponse(res, error.message || 'Failed to end call', 500);
//   }
// };

// // INITIATE WHATSAPP 
// exports.initiateWhatsApp = async (req, res) => {
//   try {
//     const { journeyId } = req.params;
//     const { contactName, phoneNumber: providedPhone, message } = req.body;

//     const driver = req.user;
//     const journey = await Journey.findById(journeyId)
//       .populate({
//         path: 'deliveryId',
//         populate: { path: 'customerId', select: 'phone name fullName' }
//       });

//     if (!journey) {
//       return errorResponse(res, 'Journey not found', 404);
//     }

//     if (journey.driverId.toString() !== driver._id.toString()) {
//       return errorResponse(res, 'Unauthorized', 403);
//     }

//     if (!journey.isActive()) {
//       return errorResponse(res, 'Journey is not active', 400);
//     }

//     const delivery = journey.deliveryId;

//     if (!delivery) {
//       return errorResponse(res, 'Delivery not found', 404);
//     }

//     // Priority: providedPhone > recipientPhone > customer.phone
//     let phoneNumber = providedPhone || delivery.recipientPhone || delivery.customerId?.phone;

//     if (!phoneNumber) {
//       return errorResponse(res, 'Phone number not available', 400);
//     }

//     // Clean phone for WhatsApp (remove + , spaces, dashes)
//     const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');

//     // If phone starts with 0 (local format), remove it and add country code if needed
//     // Optional: Agar India mein ho to +91 add kar do agar nahi hai
//     const whatsappReadyPhone = cleanPhone.startsWith('91') && cleanPhone.length === 12
//       ? cleanPhone
//       : cleanPhone.startsWith('0')
//         ? '91' + cleanPhone.substring(1)
//         : cleanPhone.length === 10
//           ? '91' + cleanPhone
//           : cleanPhone;

//     const finalContactName = contactName || delivery.recipientName || delivery.customerId?.fullName || delivery.customerId?.name || 'Customer';

//     // Default message agar nahi diya
//     const defaultMessage = message || `Hello ${finalContactName}, your delivery is on the way. I'll reach you soon. - ${driver.name}`;

//     // Log in journey
//     const whatsappLog = {
//       type: 'whatsapp',
//       phoneNumber: whatsappReadyPhone,
//       contactName: finalContactName,
//       timestamp: new Date(),
//       status: 'initiated',
//       remarks: defaultMessage
//     };

//     journey.communicationLog.push(whatsappLog);
//     await journey.save();

//     // Generate WhatsApp deep link
//     const whatsappUrl = `https://wa.me/${whatsappReadyPhone}?text=${encodeURIComponent(defaultMessage)}`;

//     return successResponse(res, 'WhatsApp initiated successfully', {
//       whatsappId: journey.communicationLog[journey.communicationLog.length - 1]._id,
//       phoneNumber: whatsappReadyPhone,
//       whatsappUrl,
//       contactName: finalContactName,
//       message: defaultMessage,
//       totalWhatsAppMessages: journey.communicationLog.filter(log => log.type === 'whatsapp').length
//     });

//   } catch (error) {
//     console.error('Initiate WhatsApp Error:', error);
//     return errorResponse(res, 'Failed to initiate WhatsApp', 500);
//   }
// };

// // exports.getNavigation = async (req, res) => {
// //   try {
// //     const { journeyId } = req.params;
// //     const { currentLatitude, currentLongitude } = req.query;

// //     const driver = req.user;

// //     const journey = await Journey.findById(journeyId)
// //       .populate({
// //         path: 'deliveryId',
// //         select: 'deliveryLocation recipientName recipientPhone'
// //       });

// //     if (!journey) {
// //       return errorResponse(res, 'Journey not found', 404);
// //     }

// //     if (journey.driverId.toString() !== driver._id.toString()) {
// //       return errorResponse(res, 'Unauthorized', 403);
// //     }

// //     if (!journey.isActive()) {
// //       return errorResponse(res, 'Journey is not active', 400);
// //     }

// //     const delivery = journey.deliveryId;
// //     const destination = delivery.deliveryLocation;

// //     if (!destination || !destination.coordinates) {
// //       return errorResponse(res, 'Delivery location not available', 400);
// //     }

// //     const destLat = destination.coordinates.latitude;
// //     const destLng = destination.coordinates.longitude;

// //     // Default values
// //     let distance = null;
// //     let duration = null;
// //     let routePolyline = null; // for drawing route on map

// //     // If current location provided, calculate real distance using Google Directions API
// //     if (currentLatitude && currentLongitude) {
// //       const origin = `${currentLatitude},${currentLongitude}`;
// //       const destinationCoord = `${destLat},${destLng}`;

// //       try {
// //         const directionsResponse = await axios.get(
// //           `https://maps.googleapis.com/maps/api/directions/json`,
// //           {
// //             params: {
// //               origin,
// //               destination: destinationCoord,
// //               key: process.env.GOOGLE_MAPS_API_KEY,
// //               mode: 'driving',
// //               traffic_model: 'best_guess',
// //               departure_time: 'now'
// //             }
// //           }
// //         );

// //         const route = directionsResponse.data.routes[0];
// //         if (route) {
// //           const leg = route.legs[0];
// //           distance = leg.distance.value / 1000; // meters to km
// //           duration = Math.round(leg.duration_in_traffic?.value / 60) || Math.round(leg.duration.value / 60); // minutes

// //           // Polyline for drawing route on map
// //           routePolyline = route.overview_polyline.points;
// //         }
// //       } catch (apiError) {
// //         console.error('Google Directions API Error:', apiError.message);
// //         // Fallback to Haversine if API fails
// //         distance = calculateDistance(
// //           parseFloat(currentLatitude),
// //           parseFloat(currentLongitude),
// //           destLat,
// //           destLng
// //         );
// //         duration = Math.round((distance / 40) * 60); // rough estimate
// //       }
// //     }

// //     // Log navigation
// //     const navLog = {
// //       destination: {
// //         address: destination.address || 'Unknown',
// //         coordinates: { latitude: destLat, longitude: destLng }
// //       },
// //       startedAt: new Date(),
// //       estimatedDistance: distance,
// //       estimatedDuration: duration
// //     };

// //     journey.navigationHistory.push(navLog);
// //     await journey.save();

// //     return successResponse(res, 'Navigation data ready for in-app map', {
// //       destination: {
// //         address: destination.address || 'Unknown Address',
// //         coordinates: { latitude: destLat, longitude: destLng },
// //         recipientName: delivery.recipientName || 'Customer',
// //         recipientPhone: delivery.recipientPhone || null
// //       },
// //       driverCurrentLocation: currentLatitude && currentLongitude ? {
// //         latitude: parseFloat(currentLatitude),
// //         longitude: parseFloat(currentLongitude)
// //       } : null,
// //       distance: distance ? `${distance.toFixed(2)} km` : 'N/A',
// //       duration: duration ? `${duration} mins` : 'N/A',
// //       routePolyline: routePolyline || null, // frontend map pe route draw karega
// //       navigationHistoryId: journey.navigationHistory[journey.navigationHistory.length - 1]._id
// //     });

// //   } catch (error) {
// //     console.error('Get Navigation Error:', error);
// //     return errorResponse(res, 'Failed to get navigation data', 500);
// //   }
// // };

// //  UPLOAD RECORDING/SCREENSHOT 

// // exports.getNavigation = async (req, res) => {
// //   try {
// //     const { journeyId } = req.params;
// //     const { currentLatitude, currentLongitude } = req.query;

// //     const driver = req.user; // this is your logged-in driver/salesman

// //     const journey = await Journey.findById(journeyId)
// //       .populate({
// //         path: 'deliveryId',
// //         select: 'deliveryLocation recipientName recipientPhone deliveryNumber companyName' // ← add deliveryNumber & companyName if they exist in your Delivery model
// //       });

// //     if (!journey) {
// //       return errorResponse(res, 'Journey not found', 404);
// //     }

// //     if (journey.driverId.toString() !== driver._id.toString()) {
// //       return errorResponse(res, 'Unauthorized', 403);
// //     }

// //     if (!journey.isActive()) {
// //       return errorResponse(res, 'Journey is not active', 400);
// //     }

// //     const delivery = journey.deliveryId;
// //     const destination = delivery.deliveryLocation;

// //     if (!destination || !destination.coordinates) {
// //       return errorResponse(res, 'Delivery location not available', 400);
// //     }

// //     const destLat  = destination.coordinates.latitude;
// //     const destLng  = destination.coordinates.longitude;

// //     let distance = null;
// //     let duration = null;           // in minutes
// //     let routePolyline = null;

// //     if (currentLatitude && currentLongitude) {
// //       const origin = `${currentLatitude},${currentLongitude}`;
// //       const destinationCoord = `${destLat},${destLng}`;

// //       try {
// //         const directionsResponse = await axios.get(
// //           `https://maps.googleapis.com/maps/api/directions/json`,
// //           {
// //             params: {
// //               origin,
// //               destination: destinationCoord,
// //               key: process.env.GOOGLE_MAPS_API_KEY,
// //               mode: 'driving',
// //               traffic_model: 'best_guess',
// //               departure_time: 'now'
// //             }
// //           }
// //         );

// //         const route = directionsResponse.data.routes[0];
// //         if (route) {
// //           const leg = route.legs[0];
// //           distance     = leg.distance.value / 1000; // km
// //           duration     = Math.round((leg.duration_in_traffic?.value || leg.duration.value) / 60); // minutes
// //           routePolyline = route.overview_polyline.points; // encoded polyline string
// //         }
// //       } catch (apiError) {
// //         console.error('Google Directions API Error:', apiError.message);
// //         distance = calculateDistance(
// //           parseFloat(currentLatitude),
// //           parseFloat(currentLongitude),
// //           destLat,
// //           destLng
// //         );
// //         duration = Math.round((distance / 40) * 60); // rough 40km/h avg
// //       }
// //     }

// //     // Log navigation
// //     const navLog = {
// //       destination: {
// //         address: destination.address || 'Unknown',
// //         coordinates: { latitude: destLat, longitude: destLng }
// //       },
// //       startedAt: new Date(),
// //       estimatedDistance: distance,
// //       estimatedDuration: duration
// //     };

// //     journey.navigationHistory.push(navLog);
// //     await journey.save();

// //     // Final response – added fields to match screenshot
// //     return successResponse(res, 'Navigation data ready for in-app map', {
// //       // ── Map & Route ───────────────────────────────────────
// //       currentLocation: currentLatitude && currentLongitude ? {
// //         latitude: parseFloat(currentLatitude),
// //         longitude: parseFloat(currentLongitude)
// //       } : null,
// //       destination: {
// //         address: destination.address || 'Unknown Address',
// //         coordinates: { latitude: destLat, longitude: destLng }
// //       },
// //       routePolyline: routePolyline || null,           // frontend decodes & draws pink line
// //       distance: distance ? `${distance.toFixed(2)} km` : 'N/A',
// //       durationMinutes: duration || null,              // used for "Max ETA xx Mins"

// //       // ── Stop / Delivery Info (like screenshot) ────────────
// //       currentStop: {
// //         number: 1,                                    // hardcoded or journey.stopIndex || 1
// //         deliveryNumber: delivery.deliveryNumber || 'DN-XXXXXX', // ← add this field in Delivery model if not present
// //         companyName: delivery.companyName || 'Acme Corporation', // ← add if you have it
// //         address: destination.address || 'Unknown',
// //         eta: duration ? `${duration} Mins` : 'N/A',   // or "Max ETA"
// //         status: 'In Transit'                          // you can make dynamic later
// //       },

// //       // ── Customer Info ─────────────────────────────────────
// //       customer: {
// //         name: delivery.recipientName || 'Customer',
// //         phone: delivery.recipientPhone || null,
// //         // whatsapp: delivery.recipientPhone ? `https://wa.me/${delivery.recipientPhone}` : null
// //       },

// //       // ── Salesman / Driver Info (logged in user) ───────────
// //       salesman: {
// //         name: driver.name || driver.fullName || 'Salesman', // adjust according to your User model
// //         phone: driver.phone || null
// //       },

// //       // optional – if you want to show navigation log id
// //       navigationHistoryId: journey.navigationHistory[journey.navigationHistory.length - 1]._id
// //     });

// //   } catch (error) {
// //     console.error('Get Navigation Error:', error);
// //     return errorResponse(res, 'Failed to get navigation data', 500);
// //   }
// // };


// exports.getNavigation = async (req, res) => {
//   try {
//     const { journeyId } = req.params;
//     const { currentLatitude, currentLongitude } = req.query;

//     const driver = req.user;

//     const journey = await Journey.findById(journeyId)
//       .populate({
//         path: 'deliveryId',
//         select: 'deliveryLocation deliveryNumber companyName address customerId pickupLocation deliveryLocation recipientName recipientPhone',
//         populate: {
//           path: 'customerId',
//           select: 'name fullName firstName lastName phone mobile number'
//         }
//       });

//     if (!journey) {
//       return errorResponse(res, 'Journey not found', 404);
//     }

//     if (journey.driverId.toString() !== driver._id.toString()) {
//       return errorResponse(res, 'Unauthorized access', 403);
//     }

//     // if (!journey.isActive()) {
//     //   return errorResponse(res, 'Journey is not active', 400);
//     // }

//     const delivery = journey.deliveryId;
//     const destination = delivery.deliveryLocation;

//     if (!destination || !destination.coordinates) {
//       return errorResponse(res, 'Delivery location coordinates not available', 400);
//     }

//     const destLat = destination.coordinates.latitude;
//     const destLng = destination.coordinates.longitude;

//     // ──────────────────────────────────────────────────────────────
//     // Google Directions part (unchanged from your latest version)
//     // ──────────────────────────────────────────────────────────────
//     let distance = null;
//     let duration = null;
//     let routePolyline = null;

//     if (currentLatitude && currentLongitude && !isNaN(currentLatitude) && !isNaN(currentLongitude)) {
//       const origin = `${currentLatitude.trim()},${currentLongitude.trim()}`;
//       const destinationCoord = `${destLat},${destLng}`;

//       console.log(`[Navigation] Requesting Google: ${origin} → ${destinationCoord}`);

//       try {
//         const directionsResponse = await axios.get(
//           'https://maps.googleapis.com/maps/api/directions/json',
//           {
//             params: {
//               origin,
//               destination: destinationCoord,
//               key: process.env.GOOGLE_MAPS_API_KEY,
//               mode: 'driving',
//               traffic_model: 'best_guess',
//               departure_time: 'now'
//             }
//           }
//         );

//         const apiData = directionsResponse.data;
//         console.log('[Navigation] Status:', apiData.status);

//         if (apiData.status === 'OK' && apiData.routes?.length > 0) {
//           const leg = apiData.routes[0].legs[0];
//           distance = leg.distance?.value ? leg.distance.value / 1000 : null;
//           duration = leg.duration_in_traffic?.value
//             ? Math.round(leg.duration_in_traffic.value / 60)
//             : (leg.duration?.value ? Math.round(leg.duration.value / 60) : null);
//           routePolyline = apiData.routes[0].overview_polyline?.points || null;

//           console.log(`[Navigation] Success → ${distance?.toFixed(1)} km | ${duration} min`);
//         }
//       } catch (apiError) {
//         console.error('[Navigation] Google API failed:', apiError.message);
//       }
//     } else {
//       console.warn('[Navigation] No current location provided');
//     }

//     // Log navigation
//     const navLog = {
//       destination: { address: destination.address || 'Unknown', coordinates: { latitude: destLat, longitude: destLng } },
//       startedAt: new Date(),
//       estimatedDistance: distance,
//       estimatedDuration: duration,
//       usedGoogle: !!routePolyline
//     };

//     journey.navigationHistory.push(navLog);
//     await journey.save();

//     // ──────────────────────────────────────────────────────────────
//     // Customer from populated customerId
//     // ──────────────────────────────────────────────────────────────
//     const customerDoc = delivery.customerId;

//     const customerName = customerDoc
//       ? (customerDoc.name ||
//         customerDoc.fullName ||
//         [customerDoc.firstName, customerDoc.lastName].filter(Boolean).join(' ').trim() ||
//         'Unknown Customer')
//       : 'Unknown Customer';

//     const customerPhone = customerDoc?.phone || customerDoc?.mobile || customerDoc?.number || null;

//     // Salesman / Driver
//     const salesmanName = driver.name ||
//       driver.fullName ||
//       [driver.firstName, driver.lastName].filter(Boolean).join(' ').trim() ||
//       driver.username ||
//       'Salesman';

//     const salesmanPhone = driver.phone || driver.mobile || null;

//     // Response
//     return successResponse(res, 'Navigation data ready', {
//       currentLocation: currentLatitude && currentLongitude ? {
//         latitude: parseFloat(currentLatitude),
//         longitude: parseFloat(currentLongitude)
//       } : null,

//       destination: {
//         address: destination.address || 'Unknown Address',
//         coordinates: { latitude: destLat, longitude: destLng }
//       },

//       routePolyline: routePolyline || null,

//       distance: distance ? `${distance.toFixed(1)} km` : 'Calculating...',
//       durationMinutes: duration,
//       estimatedTime: duration ? `${duration} mins` : 'N/A',

//       currentStop: {
//         number: 1,
//         deliveryNumber: delivery.deliveryNumber || delivery.trackingNumber || 'N/A',
//         companyName: delivery.companyName || customerName || 'Customer',
//         address: destination.address || 'Address not available',
//         eta: duration ? `${duration} Mins` : 'N/A',
//         status: 'In Transit'
//       },

//       customer: {
//         name: customerName,
//         phone: customerPhone
//       },

//       salesman: {
//         name: salesmanName,
//         phone: salesmanPhone
//       },

//       navigationHistoryId: journey.navigationHistory[journey.navigationHistory.length - 1]._id,
//       isGoogleData: !!routePolyline
//     });

//   } catch (error) {
//     console.error('Get Navigation Error:', error);
//     return errorResponse(res, 'Failed to fetch navigation data', 500);
//   }
// };

// exports.uploadRecording = async (req, res) => {
//   try {
//     const { journeyId } = req.params;
//     const { type, caption, waypointIndex } = req.body;

//     if (!req.file) {
//       return errorResponse(res, 'Recording file is required', 400);
//     }

//     const driver = req.user;
//     const journey = await Journey.findById(journeyId);

//     if (!journey) {
//       return errorResponse(res, 'Journey not found', 404);
//     }

//     if (journey.driverId.toString() !== driver._id.toString()) {
//       return errorResponse(res, 'Unauthorized', 403);
//     }

//     const recordingUrl = `/uploads/recordings/${req.file.filename}`;

//     const recording = {
//       recordingId: `REC_${Date.now()}`,
//       type: type || 'screenshot',
//       url: recordingUrl,
//       timestamp: new Date(),
//       waypointIndex: waypointIndex ? parseInt(waypointIndex) : null,
//       fileSize: req.file.size,
//       duration: req.body.duration || null,
//       isHidden: false
//     };

//     journey.recordings.push(recording);
//     await journey.save();

//     return successResponse(res, 'Recording uploaded successfully', {
//       recording: journey.recordings[journey.recordings.length - 1],
//       totalRecordings: journey.recordings.length
//     });

//   } catch (error) {
//     console.error('Upload Recording Error:', error.message);
//     return errorResponse(res, error.message || 'Failed to upload recording', 500);
//   }
// };

// //  GET COMMUNICATION HISTORY 
// exports.getCommunicationHistory = async (req, res) => {
//   try {
//     const { journeyId } = req.params;
//     const { type } = req.query; // 'call', 'whatsapp', 'sms'

//     const driver = req.user;
//     const journey = await Journey.findById(journeyId)
//       .populate('deliveryId', 'trackingNumber recipientName recipientPhone');

//     if (!journey) {
//       return errorResponse(res, 'Journey not found', 404);
//     }

//     if (journey.driverId.toString() !== driver._id.toString()) {
//       return errorResponse(res, 'Unauthorized', 403);
//     }

//     let communicationLog = journey.communicationLog;

//     // Filter by type if specified
//     if (type) {
//       communicationLog = communicationLog.filter(log => log.type === type);
//     }

//     // Format the response
//     const formattedLog = communicationLog.map(log => ({
//       id: log._id,
//       type: log.type,
//       contactName: log.contactName,
//       phoneNumber: log.phoneNumber,
//       timestamp: log.timestamp,
//       duration: log.duration ? `${log.duration} seconds` : 'N/A',
//       status: log.status,
//       remarks: log.remarks
//     }));

//     // Summary statistics
//     const summary = {
//       totalCalls: journey.communicationLog.filter(log => log.type === 'call').length,
//       totalWhatsApp: journey.communicationLog.filter(log => log.type === 'whatsapp').length,
//       totalSMS: journey.communicationLog.filter(log => log.type === 'sms').length,
//       totalDuration: journey.communicationLog
//         .filter(log => log.type === 'call' && log.duration)
//         .reduce((sum, log) => sum + log.duration, 0)
//     };

//     return successResponse(res, 'Communication history retrieved', {
//       delivery: {
//         trackingNumber: journey.deliveryId.trackingNumber,
//         recipientName: journey.deliveryId.recipientName,
//         recipientPhone: journey.deliveryId.recipientPhone
//       },
//       summary,
//       communicationLog: formattedLog
//     });

//   } catch (error) {
//     console.error('Get Communication History Error:', error.message);
//     return errorResponse(res, error.message || 'Failed to get communication history', 500);
//   }
// };

// exports.uploadProofSignature = async (req, res) => {
//   try {
//     const { deliveryId } = req.params;

//     // 1. File check
//     if (!req.file) {
//       return errorResponse(res, 'Signature image is required', 400);
//     }

//     // 2. Find delivery
//     const delivery = await Delivery.findById(deliveryId);

//     if (!delivery) {
//       return errorResponse(res, 'Delivery not found', 404);
//     }

//     // 3. Authorization
//     if (delivery.driverId.toString() !== req.user._id.toString()) {
//       return errorResponse(res, 'Unauthorized: Not assigned to you', 403);
//     }

//     // 5. Save signature
//     const signatureUrl = `/uploads/signatures/${req.file.filename}`;

//     delivery.deliveryProof = delivery.deliveryProof || {};
//     delivery.deliveryProof.signature = signatureUrl;
//     delivery.deliveryProof.signedAt = new Date();

//     // ⭐ NOW set status to "delivered"
//     delivery.status = 'Delivered';
//     delivery.actualDeliveryTime = new Date();

//     await delivery.save();

//     // 6. Sync to Journey
//     const journey = await Journey.findOne({ deliveryId: delivery._id });

//     if (journey) {
//       journey.deliveryProof = journey.deliveryProof || {};
//       journey.deliveryProof.signature = signatureUrl;
//       journey.deliveryProof.signedAt = new Date();
//       journey.status = 'Completed';

//       await journey.save();
//     }

//     // 7. Status History
//     await DeliveryStatusHistory.create({
//       deliveryId: delivery._id,
//       status: 'Delivered',
//       location: delivery.deliveryProof.location || null,
//       remarks: 'Customer signature obtained',
//       updatedBy: {
//         userId: req.user._id,
//         userRole: 'driver',
//         userName: req.user.name
//       }
//     });

//     // 8. Success response
//     return successResponse(res, 'Signature uploaded! Delivery marked as delivered.', {
//       signatureUrl,
//       deliveryStatus: delivery.status,
//       journeyStatus: journey?.status || null
//     });

//   } catch (error) {
//     console.error('Upload Signature Error:', error);
//     return errorResponse(res, 'Failed to upload signature', 500);
//   }
// };

// exports.uploadProofPhotos = async (req, res) => {
//   try {
//     const { deliveryId } = req.params;
//     const { recipientName, mobileNumber, remarks = '' } = req.body;

//     // ─── 1. Validate deliveryId early ───
//     if (!deliveryId || typeof deliveryId !== 'string' || deliveryId.length < 18) {
//       return errorResponse(res, 'Invalid delivery ID format', 400);
//     }

//     if (!mongoose.Types.ObjectId.isValid(deliveryId)) {
//       return errorResponse(res, 'Invalid delivery ID (not a valid ObjectId)', 400);
//     }

//     // Required fields
//     if (!recipientName?.trim()) {
//       return errorResponse(res, 'Recipient name is required', 400);
//     }
//     if (!mobileNumber?.trim()) {
//       return errorResponse(res, 'Mobile number is required', 400);
//     }

//     // Find delivery + populate customer
//     const delivery = await Delivery.findById(deliveryId)
//       .populate({
//         path: 'customerId',
//         select: 'companyName name locations phone email'
//       });

//     if (!delivery) {
//       return errorResponse(res, 'Delivery not found', 404);
//     }

//     if (delivery.driverId?.toString() !== req.user._id.toString()) {
//       return errorResponse(res, 'Unauthorized – You are not the assigned driver', 403);
//     }

//     // ─── 2. Handle uploaded files ───
//     let proofPhotos = [];
//     if (req.files?.photos && Array.isArray(req.files.photos)) {
//       proofPhotos = req.files.photos.map(file => `/uploads/proof/${file.filename}`);
//     }

//     let companyStampUrl = null;
//     let stampUploadedAt = null;

//     if (req.files?.companyStamp && req.files.companyStamp.length > 0) {
//       const stampFile = req.files.companyStamp[0];
//       companyStampUrl = `/uploads/stamps/${stampFile.filename}`;
//       stampUploadedAt = new Date();
//     }

//     // Optional: enforce at least one photo
//     // if (proofPhotos.length === 0) {
//     //   return errorResponse(res, 'At least one proof photo is required', 400);
//     // }

//     // ─── 3. Handle remarks (optional) ───
//     let remarkId = null;
//     let remarkText = remarks.trim() || null;

//     if (remarkText) {
//       const newRemark = new Remark({
//         remarkType: 'custom',
//         remarkText,
//         category: 'delivery_status',
//         severity: 'low',
//         isPredefined: false,
//         isActive: true,
//         createdBy: req.user._id,
//         approvalStatus: 'approved',
//         requiresApproval: false,
//         usageCount: 1,
//         lastUsedAt: new Date(),
//         associatedDeliveries: [delivery._id]
//       });
//       const savedRemark = await newRemark.save();
//       remarkId = savedRemark._id;
//     }

//     // ─── 4. Update Delivery document ───
//     delivery.status = 'Proof_uploaded'; // or 'ProofUploaded' / 'CompletedWithProof' – choose one

//     delivery.deliveryProof = {
//       photos: proofPhotos,
//       photosTakenAt: proofPhotos.length > 0 ? new Date() : null,
//       recipientName: recipientName.trim(),
//       mobileNumber: mobileNumber.trim(),
//       companyStamp: companyStampUrl,
//       companyStampUploadedAt: stampUploadedAt,
//       remarks: remarkText,
//       remarkId,
//       uploadedBy: req.user._id,
//       uploadedAt: new Date()
//     };

//     await delivery.save();

//     // ─── 5. Sync to Journey (if exists) ───
//     const journey = await Journey.findOneAndUpdate(
//       { deliveryId: delivery._id },
//       {
//         $set: {
//           status: 'Proof_uploaded',
//           deliveryProof: {
//             photos: proofPhotos,
//             photosTakenAt: delivery.deliveryProof.photosTakenAt,
//             recipientName: recipientName.trim(),
//             mobileNumber: mobileNumber.trim(),
//             companyStamp: companyStampUrl,
//             companyStampUploadedAt: stampUploadedAt,
//             remarks: remarkText,
//             remarkId,
//             uploadedAt: new Date()
//           }
//         }
//       },
//       { new: true }
//     );

//     // ─── 6. Create status history entry ───
//     await DeliveryStatusHistory.create({
//       deliveryId: delivery._id,
//       status: 'Proof_uploaded',
//       location: delivery.currentLocation || null, // if you track location
//       remarks: 'Proof photos, recipient details and company stamp uploaded',
//       updatedBy: {
//         userId: req.user._id,
//         userRole: 'driver',
//         userName: req.user.name || 'Driver'
//       }
//     });

//     // ─── 7. Prepare customer info for response ───
//     const customer = delivery.customerId || {};
//     const companyName = customer.companyName || customer.name || 'N/A';
//     let deliveryAddress = 'N/A';

//     if (customer.locations?.length > 0) {
//       const primary = customer.locations.find(l => l.isPrimary) || customer.locations[0];
//       deliveryAddress = [
//         primary.addressLine1,
//         primary.addressLine2,
//         primary.city,
//         primary.state,
//         primary.zipcode,
//         primary.country
//       ].filter(Boolean).join(', ') || 'N/A';
//     }

//     // ─── 8. Success response ───
//     return successResponse(res, 'Delivery proof uploaded successfully', {
//       deliveryId: delivery._id,
//       deliveryStatus: delivery.status,
//       journeyStatus: journey?.status || null,

//       proof: {
//         photos: proofPhotos,
//         photosCount: proofPhotos.length,
//         companyStamp: companyStampUrl || 'Not uploaded',
//         recipientName: recipientName.trim(),
//         mobileNumber: mobileNumber.trim(),
//         remarks: remarkText || null,
//       },

//       customer: {
//         companyName,
//         deliveryAddress,
//         customerId: customer._id || null
//       },

//       uploadedAt: new Date().toISOString()
//     });

//   } catch (error) {
//     console.error('Upload Proof Photos Error:', error);
//     return errorResponse(res, error.message || 'Failed to upload delivery proof', 500);
//   }
// };

// // exports.completeDelivery = async (req, res) => {
// //   try {
// //     const { journeyId } = req.params;
// //     const { latitude, longitude } = req.body;

// //     if (!latitude || !longitude) {
// //       return errorResponse(res, 'Location coordinates required', 400);
// //     }

// //     // Populate delivery + customer
// //     const journey = await Journey.findById(journeyId)
// //       .populate({
// //         path: 'deliveryId',
// //         populate: {
// //           path: 'customerId',
// //           select: 'companyName name locations billingAddress'
// //         }
// //       });

// //     if (!journey) return errorResponse(res, 'Journey not found', 404);

// //     if (journey.driverId.toString() !== req.user._id.toString()) {
// //       return errorResponse(res, 'Unauthorized', 403);
// //     }

// //     const now = new Date();
// //     const actualDurationMs = now - new Date(journey.startTime);
// //     const actualMinutes = Math.round(actualDurationMs / 60000);

// //     // Time difference logic
// //     const estimatedMin = journey.estimatedDurationFromGoogle;
// //     let timeDifferenceText = '';
// //     if (estimatedMin !== null) {
// //       const diff = actualMinutes - estimatedMin;
// //       if (diff > 5) timeDifferenceText = `Delayed by ${diff} mins`;
// //       else if (diff < -5) timeDifferenceText = `Ahead by ${Math.abs(diff)} mins`;
// //       else timeDifferenceText = 'On time';
// //     }

// //     // ─── Update Journey ───
// //     journey.status = 'Arrived';
// //     journey.endTime = now;
// //     journey.endLocation = {
// //       coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
// //       address: 'Driver reached delivery location'
// //     };
// //     journey.totalDuration = actualMinutes;
// //     await journey.save();

// //     // ─── Update Delivery ───
// //     const delivery = journey.deliveryId;
// //     delivery.status = 'Arrived';   // Changed from 'Arrived'
// //     await delivery.save();

// //     // ─── Status History ───
// //     await DeliveryStatusHistory.create({
// //       deliveryId: delivery._id,
// //       status: 'Completed',
// //       location: {
// //         coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
// //         address: 'Driver reached delivery location'
// //       },
// //       remarks: 'Driver reached destination and marked delivery as completed. Awaiting final signature/confirmation.',
// //       updatedBy: {
// //         userId: req.user._id,
// //         userRole: 'driver',
// //         userName: req.user.name
// //       }
// //     });

// //     // Extract customer info
// //     const customer = delivery.customerId;

// //     let companyName = 'N/A';
// //     let deliveryAddress = 'N/A';

// //     if (customer) {
// //       companyName = customer.companyName || customer.name || 'N/A';

// //       if (customer.locations?.length > 0) {
// //         const primaryLoc = customer.locations.find(loc => loc.isPrimary) || customer.locations[0];

// //         deliveryAddress = [
// //           primaryLoc.addressLine1,
// //           primaryLoc.addressLine2 || '',
// //           primaryLoc.city,
// //           primaryLoc.state,
// //           primaryLoc.zipcode,
// //           primaryLoc.country
// //         ]
// //           .filter(Boolean)
// //           .join(', ') || 'N/A';
// //       }
// //     }

// //     const arrivalTime = now.toLocaleString('en-IN', {
// //       timeZone: 'Asia/Kolkata',
// //       dateStyle: 'medium',
// //       timeStyle: 'short'
// //     });

// //     return successResponse(res, 'Delivery marked as completed! Please collect customer signature if pending.', {
// //       journeyId: journey._id,
// //       journeyStatus: journey.status,
// //       deliveryStatus: delivery.status,
// //       location: { latitude, longitude },

// //       customer: {
// //         companyName,
// //         deliveryAddress,
// //         customerId: delivery.customerId,
// //       },

// //       arrivalTime,
// //       arrivalTimeISO: now.toISOString(),

// //       nextStep: 'upload-signature',
// //       message: 'Signature still required to finalize delivery',

// //       timing: {
// //         actualTimeTaken: `${actualMinutes} mins`,
// //         estimatedTime: estimatedMin ? `${estimatedMin} mins` : 'N/A',
// //         difference: timeDifferenceText || 'N/A',
// //         startTime: journey.startTime.toISOString(),
// //         arrivedAt: now.toISOString()
// //       }
// //     });

// //   } catch (error) {
// //     console.error('Complete Delivery Error:', error);
// //     return errorResponse(res, 'Failed to mark delivery as completed', 500);
// //   }
// // };

// exports.completeDelivery = async (req, res) => {
//   try {
//     const { journeyId } = req.params;
//     const { latitude, longitude } = req.body;

//     if (!latitude || !longitude) {
//       return errorResponse(res, 'Location coordinates required', 400);
//     }

//     // Populate delivery + customer
//     const journey = await Journey.findById(journeyId)
//       .populate({
//         path: 'deliveryId',
//         populate: {
//           path: 'customerId',
//           select: 'companyName name locations billingAddress'
//         }
//       });

//     if (!journey) return errorResponse(res, 'Journey not found', 404);

//     if (journey.driverId.toString() !== req.user._id.toString()) {
//       return errorResponse(res, 'Unauthorized', 403);
//     }

//     const now = new Date();
//     const actualDurationMs = now - new Date(journey.startTime);
//     const actualMinutes = Math.round(actualDurationMs / 60000);

//     // Time difference logic
//     const estimatedMin = journey.estimatedDurationFromGoogle;
//     let timeDifferenceText = '';
//     if (estimatedMin !== null) {
//       const diff = actualMinutes - estimatedMin;
//       if (diff > 5) timeDifferenceText = `Delayed by ${diff} mins`;
//       else if (diff < -5) timeDifferenceText = `Ahead by ${Math.abs(diff)} mins`;
//       else timeDifferenceText = 'On time';
//     }

//     // ─── Update Journey ───
//     journey.status = 'Arrived';
//     journey.endTime = now;
//     journey.endLocation = {
//       coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
//       address: 'Driver reached delivery location'
//     };
//     journey.totalDuration = actualMinutes;
//     await journey.save();

//     // ─── Update Delivery ───
//     const delivery = journey.deliveryId;
//     delivery.status = 'Arrived';
//     await delivery.save();

//     // ─── Status History ───
//     await DeliveryStatusHistory.create({
//       deliveryId: delivery._id,
//       status: 'Arrived',
//       location: {
//         coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
//         address: 'Driver reached delivery location'
//       },
//       remarks: 'Driver reached destination and marked delivery as completed. Awaiting final signature/confirmation.',
//       updatedBy: {
//         userId: req.user._id,
//         userRole: 'driver',
//         userName: req.user.name
//       }
//     });

//     // Extract customer info
//     const customer = delivery.customerId;

//     let companyName = 'N/A';
//     let deliveryAddress = 'N/A';

//     if (customer) {
//       companyName = customer.companyName || customer.name || 'N/A';

//       if (customer.locations?.length > 0) {
//         const primaryLoc = customer.locations.find(loc => loc.isPrimary) || customer.locations[0];

//         deliveryAddress = [
//           primaryLoc.addressLine1,
//           primaryLoc.addressLine2 || '',
//           primaryLoc.city,
//           primaryLoc.state,
//           primaryLoc.zipcode,
//           primaryLoc.country
//         ]
//           .filter(Boolean)
//           .join(', ') || 'N/A';
//       }
//     }

//     const arrivalTime = now.toLocaleString('en-IN', {
//       timeZone: 'Asia/Kolkata',
//       dateStyle: 'medium',
//       timeStyle: 'short'
//     });

//     return successResponse(res, 'Delivery marked as completed! Please collect customer signature if pending.', {
//       journeyId: journey._id,
//       deliveryId: delivery._id.toString(),          // ← Added this line
//       journeyStatus: journey.status,
//       deliveryStatus: delivery.status,
//       location: { latitude, longitude },

//       customer: {
//         companyName,
//         deliveryAddress,
//         customerId: delivery.customerId,
//       },

//       arrivalTime,
//       arrivalTimeISO: now.toISOString(),

//       nextStep: 'upload-signature',
//       message: 'Signature still required to finalize delivery',

//       timing: {
//         actualTimeTaken: `${actualMinutes} mins`,
//         estimatedTime: estimatedMin ? `${estimatedMin} mins` : 'N/A',
//         difference: timeDifferenceText || 'N/A',
//         startTime: journey.startTime.toISOString(),
//         arrivedAt: now.toISOString()
//       }
//     });

//   } catch (error) {
//     console.error('Complete Delivery Error:', error);
//     return errorResponse(res, 'Failed to mark delivery as completed', 500);
//   }
// };

// // exports.endJourney = async (req, res) => {
// //   try {
// //     const { journeyId } = req.params;
// //     const { latitude, longitude, address, finalRemarks } = req.body;

// //     if (!latitude || !longitude) {
// //       return errorResponse(res, 'End location (latitude & longitude) is required', 400);
// //     }

// //     const journey = await Journey.findById(journeyId);
// //     if (!journey) {
// //       return errorResponse(res, 'Journey not found', 404);
// //     }

// //     const driver = req.user;

// //     if (journey.driverId.toString() !== driver._id.toString()) {
// //       return errorResponse(res, 'Unauthorized: This journey does not belong to you', 403);
// //     }

// //     if (['completed', 'cancelled'].includes(journey.status)) {
// //       return errorResponse(res, 'Journey already ended', 400);
// //     }

// //     // Calculate total distance (your existing logic - unchanged)
// //     let totalDistance = 0;

// //     if (journey.waypoints && journey.waypoints.length > 0) {
// //       totalDistance += calculateDistance(
// //         journey.startLocation.coordinates.latitude,
// //         journey.startLocation.coordinates.longitude,
// //         journey.waypoints[0].location.coordinates.latitude,
// //         journey.waypoints[0].location.coordinates.longitude
// //       );

// //       for (let i = 1; i < journey.waypoints.length; i++) {
// //         const prev = journey.waypoints[i - 1].location.coordinates;
// //         const curr = journey.waypoints[i].location.coordinates;
// //         totalDistance += calculateDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
// //       }

// //       const lastWaypoint = journey.waypoints[journey.waypoints.length - 1];
// //       totalDistance += calculateDistance(
// //         lastWaypoint.location.coordinates.latitude,
// //         lastWaypoint.location.coordinates.longitude,
// //         latitude,
// //         longitude
// //       );
// //     } else {
// //       totalDistance = calculateDistance(
// //         journey.startLocation.coordinates.latitude,
// //         journey.startLocation.coordinates.longitude,
// //         latitude,
// //         longitude
// //       );
// //     }

// //     // Duration & Speed
// //     const endTime = new Date();
// //     const durationMs = endTime - new Date(journey.startTime);
// //     const durationMinutes = Math.round(durationMs / 60000);
// //     const durationHours = durationMinutes / 60;
// //     const averageSpeed = durationHours > 0 ? totalDistance / durationHours : 0;

// //     // Update Journey
// //     journey.endLocation = {
// //       coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
// //       address: address || 'Delivery completed'
// //     };
// //     journey.endTime = endTime;
// //     journey.status = 'completed';
// //     journey.totalDistance = parseFloat(totalDistance.toFixed(2));
// //     journey.totalDuration = durationMinutes;
// //     journey.averageSpeed = parseFloat(averageSpeed.toFixed(2));
// //     journey.finalRemarks = finalRemarks || 'Delivery completed successfully';
// //     await journey.save();

// //     // Update Delivery
// //     const delivery = await Delivery.findById(journey.deliveryId);
// //     if (delivery) {
// //       delivery.status = 'delivered';
// //       delivery.actualDeliveryTime = endTime;
// //       await delivery.save();

// //       await DeliveryStatusHistory.create({
// //         deliveryId: delivery._id,
// //         status: 'delivered',
// //         location: {
// //           coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
// //           address: address || 'Final destination'
// //         },
// //         remarks: 'Journey completed by driver',
// //         updatedBy: {
// //           userId: driver._id,
// //           userRole: 'driver',
// //           userName: driver.name || 'Driver'
// //         }
// //       });
// //     }

// //     // Update driver availability
// //     await Driver.findByIdAndUpdate(
// //       driver._id,
// //       {
// //         isAvailable: true,
// //         currentJourney: null,
// //         $unset: { activeDelivery: "" }
// //       },
// //       { new: true }
// //     );

// //     // SAFE: Add null checks for communicationLog, images, waypoints
// //     const communicationLog = journey.communicationLog || [];
// //     const images = journey.images || [];
// //     const waypoints = journey.waypoints || [];

// //     return successResponse(res, 'Journey ended successfully! You are now free for new deliveries', {
// //       journey: {
// //         id: journey._id,
// //         status: journey.status,
// //         totalDistance: journey.totalDistance + ' km',
// //         totalDuration: journey.totalDuration + ' mins',
// //         averageSpeed: journey.averageSpeed + ' km/h',
// //         totalCheckpoints: waypoints.length,
// //         totalImages: images.length,
// //         totalCalls: communicationLog.filter(log => log.type === 'call').length,
// //         totalWhatsApp: communicationLog.filter(log => log.type === 'whatsapp').length
// //       },
// //       driverStatus: 'Available',
// //       deliveryStatus: delivery?.status || 'delivered'
// //     });

// //   } catch (error) {
// //     console.error('End Journey Error:', error.message);
// //     return errorResponse(res, error.message || 'Failed to end journey', 500);
// //   }
// // };

// //  GET ACTIVE JOURNEY 

// exports.endJourney = async (req, res) => {
//   try {
//     const { journeyId } = req.params;
//     const { latitude, longitude, address, finalRemarks } = req.body;

//     if (!latitude || !longitude) {
//       return errorResponse(res, 'End location (latitude & longitude) is required', 400);
//     }

//     const journey = await Journey.findById(journeyId);
//     if (!journey) {
//       return errorResponse(res, 'Journey not found', 404);
//     }

//     const driver = req.user;

//     if (journey.driverId.toString() !== driver._id.toString()) {
//       return errorResponse(res, 'Unauthorized: This journey does not belong to you', 403);
//     }

//     if (['completed', 'cancelled'].includes(journey.status)) {
//       return errorResponse(res, 'Journey already ended', 400);
//     }

//     // Calculate total distance
//     let totalDistance = 0;

//     if (journey.waypoints && journey.waypoints.length > 0) {
//       totalDistance += calculateDistance(
//         journey.startLocation.coordinates.latitude,
//         journey.startLocation.coordinates.longitude,
//         journey.waypoints[0].location.coordinates.latitude,
//         journey.waypoints[0].location.coordinates.longitude
//       );

//       for (let i = 1; i < journey.waypoints.length; i++) {
//         const prev = journey.waypoints[i - 1].location.coordinates;
//         const curr = journey.waypoints[i].location.coordinates;
//         totalDistance += calculateDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
//       }

//       const lastWaypoint = journey.waypoints[journey.waypoints.length - 1];
//       totalDistance += calculateDistance(
//         lastWaypoint.location.coordinates.latitude,
//         lastWaypoint.location.coordinates.longitude,
//         latitude,
//         longitude
//       );
//     } else {
//       totalDistance = calculateDistance(
//         journey.startLocation.coordinates.latitude,
//         journey.startLocation.coordinates.longitude,
//         latitude,
//         longitude
//       );
//     }

//     const endTime = new Date();
//     const durationMs = endTime - new Date(journey.startTime);
//     const durationMinutes = Math.round(durationMs / 60000);
//     const durationHours = durationMinutes / 60;
//     const averageSpeed = durationHours > 0 ? totalDistance / durationHours : 0;

//     // Update Journey
//     journey.endLocation = {
//       coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
//       address: address || 'Delivery completed'
//     };
//     journey.endTime = endTime;
//     journey.status = 'completed';
//     journey.totalDistance = parseFloat(totalDistance.toFixed(2));
//     journey.totalDuration = durationMinutes;
//     journey.averageSpeed = parseFloat(averageSpeed.toFixed(2));
//     journey.finalRemarks = finalRemarks || 'Delivery completed successfully';
//     await journey.save();

//     // Update Delivery
//     const delivery = await Delivery.findById(journey.deliveryId);
//     if (delivery) {
//       delivery.status = 'delivered';
//       delivery.actualDeliveryTime = endTime;
//       await delivery.save();

//       await DeliveryStatusHistory.create({
//         deliveryId: delivery._id,
//         status: 'delivered',
//         location: {
//           coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
//           address: address || 'Final destination'
//         },
//         remarks: 'Journey completed by driver',
//         updatedBy: {
//           userId: driver._id,
//           userRole: 'driver',
//           userName: driver.name || 'Driver'
//         }
//       });
//     }

//     // Update driver availability
//     await Driver.findByIdAndUpdate(
//       driver._id,
//       {
//         isAvailable: true,
//         currentJourney: null,
//         $unset: { activeDelivery: "" }
//       },
//       { new: true }
//     );

//     // ────────────────── SOCKET.IO - JOURNEY ENDED ──────────────────
//     const io = req.app.get('io');
//     if (io) {
//       io.to('admin-room').emit('driver:journey:ended', {
//         driverId: driver._id.toString(),
//         driverName: driver.name,
//         journeyId: journey._id.toString(),
//         deliveryId: delivery._id.toString(),
//         isAvailable: true,
//         status: 'available',
//         endLocation: {
//           latitude: Number(latitude),
//           longitude: Number(longitude),
//           address: address || 'Delivery completed'
//         },
//         timestamp: new Date().toISOString()
//       });

//       console.log(`✅ Journey ended broadcast for: ${driver.name}`);
//     }
//     // ─────────────────────────────────────────────────────────────────

//     const communicationLog = journey.communicationLog || [];
//     const images = journey.images || [];
//     const waypoints = journey.waypoints || [];

//     return successResponse(res, 'Journey ended successfully! You are now free for new deliveries', {
//       journey: {
//         id: journey._id,
//         status: journey.status,
//         totalDistance: journey.totalDistance + ' km',
//         totalDuration: journey.totalDuration + ' mins',
//         averageSpeed: journey.averageSpeed + ' km/h',
//         totalCheckpoints: waypoints.length,
//         totalImages: images.length,
//         totalCalls: communicationLog.filter(log => log.type === 'call').length,
//         totalWhatsApp: communicationLog.filter(log => log.type === 'whatsapp').length
//       },
//       driverStatus: 'Available',
//       deliveryStatus: delivery?.status || 'delivered'
//     });

//   } catch (error) {
//     console.error('End Journey Error:', error.message);
//     return errorResponse(res, error.message || 'Failed to end journey', 500);
//   }
// };

// exports.getActiveJourney = async (req, res) => {
//   try {
//     const driver = req.user;

//     const journey = await Journey.findOne({
//       driverId: driver._id,
//       status: { $in: ['started', 'in_progress'] }
//     })
//       .populate({
//         path: 'deliveryId',
//         select: 'trackingNumber status pickupLocation deliveryLocation recipientName recipientPhone packageDetails estimatedDeliveryTime'
//       })
//       .lean();

//     if (!journey) {
//       return successResponse(res, 'No active journey found', { journey: null });
//     }

//     // Calculate communication summary
//     const communicationSummary = {
//       totalCalls: journey.communicationLog?.filter(log => log.type === 'call').length || 0,
//       totalWhatsApp: journey.communicationLog?.filter(log => log.type === 'whatsapp').length || 0,
//       lastCall: journey.communicationLog?.filter(log => log.type === 'call').pop() || null,
//       lastWhatsApp: journey.communicationLog?.filter(log => log.type === 'whatsapp').pop() || null
//     };

//     // Format response for screen display
//     const response = {
//       journeyId: journey._id,
//       status: journey.status,
//       startTime: journey.startTime,
//       duration: journey.totalDuration || Math.round((new Date() - new Date(journey.startTime)) / 60000),
//       delivery: {
//         trackingNumber: journey.deliveryId?.trackingNumber,
//         status: journey.deliveryId?.status,
//         recipient: journey.deliveryId?.recipientName,
//         phone: journey.deliveryId?.recipientPhone,
//         pickup: journey.deliveryId?.pickupLocation,
//         destination: journey.deliveryId?.deliveryLocation,
//         packageDetails: journey.deliveryId?.packageDetails,
//         estimatedTime: journey.deliveryId?.estimatedDeliveryTime
//       },
//       startLocation: journey.startLocation,
//       checkpoints: journey.waypoints?.map((wp, idx) => ({
//         index: idx + 1,
//         location: wp.location,
//         time: wp.timestamp,
//         activity: wp.activity,
//         remarks: wp.remarks
//       })) || [],
//       images: journey.images?.map((img, idx) => ({
//         index: idx + 1,
//         url: img.url,
//         caption: img.caption,
//         timestamp: img.timestamp,
//         type: img.imageType
//       })) || [],
//       communication: communicationSummary,
//       recordings: journey.recordings?.map((rec, idx) => ({
//         index: idx + 1,
//         type: rec.type,
//         url: rec.url,
//         timestamp: rec.timestamp
//       })) || [],
//       totalCheckpoints: journey.waypoints?.length || 0,
//       totalImages: journey.images?.length || 0,
//       totalRecordings: journey.recordings?.length || 0
//     };

//     return successResponse(res, 'Active journey retrieved successfully', response);

//   } catch (error) {
//     console.error('Get Active Journey Error:', error.message);
//     return errorResponse(res, 'Failed to retrieve active journey', 500);
//   }
// };

// exports.getJourneyDetails = async (req, res) => {
//   try {
//     const { journeyId } = req.params;

//     if (!/^[0-9a-fA-F]{24}$/.test(journeyId)) {
//       return errorResponse(res, 'Invalid journey ID format', 400);
//     }

//     const journey = await Journey.findById(journeyId)
//       .populate({
//         path: 'deliveryId',
//         select: 'trackingNumber status pickupLocation deliveryLocation recipientName recipientPhone packageDetails deliveryProof'
//       })
//       .populate({
//         path: 'driverId',
//         select: 'name phone vehicleNumber vehicleType profileImage rating'
//       })
//       .lean();

//     if (!journey) {
//       return errorResponse(res, 'Journey not found', 404);
//     }

//     // === CALCULATE DURATION, DISTANCE, SPEED ON-THE-FLY IF MISSING ===
//     let durationMinutes = journey.totalDuration || 0;
//     let distanceKm = journey.totalDistance || 0;
//     let avgSpeed = journey.averageSpeed || 0;

//     const startTime = new Date(journey.startTime);
//     const endTime = journey.endTime ? new Date(journey.endTime) : new Date(); // use now if ongoing

//     // Calculate actual duration
//     const actualDurationMs = endTime - startTime;
//     durationMinutes = Math.round(actualDurationMs / 60000); // ms to minutes

//     // If journey is completed and totalDistance is missing/0, you may want to calculate it properly elsewhere
//     // But for now, show 0 if not tracked
//     if (journey.status === 'completed' && journey.totalDistance > 0) {
//       distanceKm = Number(journey.totalDistance.toFixed(2));
//       avgSpeed = durationMinutes > 0
//         ? Number((journey.totalDistance / (durationMinutes / 60)).toFixed(1))
//         : 0;
//     }

//     // Format duration nicely
//     const hours = Math.floor(durationMinutes / 60);
//     const mins = durationMinutes % 60;
//     const durationFormatted = hours > 0
//       ? `${hours}h ${mins}m`
//       : `${mins}m`;

//     const isOngoing = !['completed', 'delivered', 'failed', 'cancelled', 'returned'].includes(journey.status);

//     // === BUILD RESPONSE ===
//     const response = {
//       journey: {
//         id: journey._id,
//         status: journey.status,
//         startTime: journey.startTime,
//         endTime: journey.endTime || null,
//         duration: isOngoing ? 'Ongoing' : durationFormatted,
//         distance: journey.totalDistance > 0
//           ? `${distanceKm} km`
//           : (isOngoing ? 'Calculating...' : 'Not recorded'),
//         averageSpeed: avgSpeed > 0
//           ? `${avgSpeed} km/h`
//           : (isOngoing ? 'Calculating...' : 'N/A'),
//         startLocation: journey.startLocation,
//         endLocation: journey.endLocation || null,
//         finalRemarks: journey.finalRemarks || null
//       },
//       delivery: journey.deliveryId ? {
//         trackingNumber: journey.deliveryId.trackingNumber,
//         status: journey.deliveryId.status,
//         recipient: journey.deliveryId.recipientName,
//         phone: journey.deliveryId.recipientPhone,
//         pickup: journey.deliveryId.pickupLocation,
//         destination: journey.deliveryId.deliveryLocation,
//         packageDetails: journey.deliveryId.packageDetails,
//         proof: journey.deliveryId.deliveryProof || null
//       } : null,
//       driver: journey.driverId ? {
//         id: journey.driverId._id,
//         name: journey.driverId.name,
//         phone: journey.driverId.phone,
//         vehicle: `${journey.driverId.vehicleType} - ${journey.driverId.vehicleNumber}`,
//         profileImage: journey.driverId.profileImage || null,
//         rating: journey.driverId.rating || 0
//       } : null,
//       checkpoints: journey.waypoints?.map((wp, idx) => ({
//         number: idx + 1,
//         location: wp.location,
//         time: wp.timestamp,
//         activity: wp.activity,
//         remarks: wp.remarks
//       })) || [],
//       images: journey.images?.map((img, idx) => ({
//         number: idx + 1,
//         url: img.url,
//         caption: img.caption || null,
//         timestamp: img.timestamp,
//         location: img.location || null,
//         type: img.imageType
//       })) || [],
//       communications: journey.communicationLog?.map((comm, idx) => ({
//         number: idx + 1,
//         type: comm.type,
//         contactName: comm.contactName,
//         phoneNumber: comm.phoneNumber,
//         timestamp: comm.timestamp,
//         duration: comm.duration || 0,
//         status: comm.status
//       })) || [],
//       recordings: journey.recordings?.map((rec, idx) => ({
//         number: idx + 1,
//         type: rec.type,
//         url: rec.url,
//         timestamp: rec.timestamp,
//         fileSize: rec.fileSize
//       })) || [],
//       navigation: journey.navigationHistory?.map((nav, idx) => ({
//         number: idx + 1,
//         destination: nav.destination,
//         startedAt: nav.startedAt,
//         app: nav.navigationApp,
//         estimatedDistance: nav.estimatedDistance,
//         estimatedDuration: nav.estimatedDuration
//       })) || []
//     };

//     return successResponse(res, 'Journey details retrieved successfully', response);

//   } catch (error) {
//     console.error('Get Journey Details Error:', error.message);
//     return errorResponse(res, 'Failed to retrieve journey details', 500);
//   }
// };

// //  DRIVER JOURNEY HISTORY 
// exports.getDriverJourneyHistory = async (req, res) => {
//   try {
//     const { page = 1, limit = 10, status } = req.query;
//     const driver = req.user;

//     const query = { driverId: driver._id };
//     if (status) query.status = status;

//     const journeys = await Journey.find(query)
//       .populate({
//         path: 'deliveryId',
//         select: 'trackingNumber status pickupLocation deliveryLocation'
//       })
//       .select('status startTime endTime totalDistance totalDuration averageSpeed waypoints images communicationLog recordings')
//       .sort({ startTime: -1 })
//       .limit(limit * 1)
//       .skip((page - 1) * limit)
//       .lean();

//     const total = await Journey.countDocuments(query);

//     const formattedJourneys = journeys.map(j => ({
//       journeyId: j._id,
//       trackingNumber: j.deliveryId?.trackingNumber || 'N/A',
//       status: j.status,
//       deliveryStatus: j.deliveryId?.status || 'unknown',
//       startTime: j.startTime,
//       endTime: j.endTime || null,
//       duration: j.totalDuration ? `${j.totalDuration} mins` : 'In Progress',
//       distance: j.totalDistance ? `${j.totalDistance.toFixed(2)} km` : 'N/A',
//       averageSpeed: j.averageSpeed ? `${j.averageSpeed.toFixed(1)} km/h` : 'N/A',
//       pickup: j.deliveryId?.pickupLocation?.address || 'N/A',
//       delivery: j.deliveryId?.deliveryLocation?.address || 'N/A',
//       totalCheckpoints: j.waypoints?.length || 0,
//       totalImages: j.images?.length || 0,
//       totalCalls: j.communicationLog?.filter(log => log.type === 'call').length || 0,
//       totalWhatsApp: j.communicationLog?.filter(log => log.type === 'whatsapp').length || 0,
//       totalRecordings: j.recordings?.length || 0
//     }));

//     return successResponse(res, 'Journey history retrieved successfully', {
//       total,
//       page: parseInt(page),
//       pages: Math.ceil(total / limit),
//       journeys: formattedJourneys
//     });

//   } catch (error) {
//     console.error('Get Driver Journey History Error:', error.message);
//     return errorResponse(res, 'Failed to retrieve journey history', 500);
//   }
// };

// //  CANCEL JOURNEY 
// exports.cancelJourney = async (req, res) => {
//   try {
//     const { journeyId } = req.params;
//     const { reason, latitude, longitude } = req.body;

//     if (!reason) {
//       return errorResponse(res, 'Cancellation reason is required', 400);
//     }

//     const driver = req.user;
//     const journey = await Journey.findById(journeyId);

//     if (!journey) {
//       return errorResponse(res, 'Journey not found', 404);
//     }

//     if (journey.driverId.toString() !== driver._id.toString()) {
//       return errorResponse(res, 'Unauthorized', 403);
//     }

//     if (!journey.isActive()) {
//       return errorResponse(res, 'Journey is not active', 400);
//     }

//     // Update journey status
//     journey.status = 'cancelled';
//     journey.endTime = new Date();
//     journey.finalRemarks = `Cancelled: ${reason}`;

//     if (latitude && longitude) {
//       journey.endLocation = {
//         coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
//         address: 'Journey cancelled here'
//       };
//     }

//     await journey.save();

//     // Update delivery status
//     const delivery = await Delivery.findById(journey.deliveryId);
//     if (delivery) {
//       delivery.status = 'cancelled';
//       await delivery.save();

//       await DeliveryStatusHistory.create({
//         deliveryId: delivery._id,
//         status: 'cancelled',
//         location: {
//           coordinates: {
//             latitude: Number(latitude) || 0,
//             longitude: Number(longitude) || 0
//           },
//           address: 'Journey cancelled'
//         },
//         remarks: `Journey cancelled by driver: ${reason}`,
//         updatedBy: {
//           userId: driver._id,
//           userRole: 'driver',
//           userName: driver.name
//         }
//       });
//     }

//     // Update driver status
//     await Driver.findByIdAndUpdate(
//       driver._id,
//       {
//         isAvailable: true,
//         currentJourney: null,
//         $unset: { activeDelivery: "" }
//       }
//     );

//     return successResponse(res, 'Journey cancelled successfully', {
//       journeyId: journey._id,
//       status: journey.status,
//       reason: journey.finalRemarks,
//       driverStatus: 'Available'
//     });

//   } catch (error) {
//     console.error('Cancel Journey Error:', error.message);
//     return errorResponse(res, error.message || 'Failed to cancel journey', 500);
//   }
// };



const mongoose = require("mongoose");
const Journey = require('../../models/Journey');
const Delivery = require('../../models/Delivery');
const Driver = require('../../models/Driver');
const Remark = require("../../models/Remark")
const DeliveryStatusHistory = require('../../models/DeliveryStatusHistory');
const { successResponse, errorResponse } = require('../../utils/responseHelper');
const { calculateDistance } = require('../../utils/geoHelper');
const { logDriverActivity } = require("../../utils/activityLogger")
const axios = require("axios")

function toRadians(deg) {
  return deg * Math.PI / 180;
}

function toDegrees(rad) {
  return rad * 180 / Math.PI;
}

function calculateBearing(startLat, startLng, destLat, destLng) {
  startLat = toRadians(startLat);
  startLng = toRadians(startLng);
  destLat = toRadians(destLat);
  destLng = toRadians(destLng);

  const y = Math.sin(destLng - startLng) * Math.cos(destLat);
  const x = Math.cos(startLat) * Math.sin(destLat) - Math.sin(startLat) * Math.cos(destLat) * Math.cos(destLng - startLng);
  let brng = Math.atan2(y, x);
  brng = toDegrees(brng);
  return (brng + 360) % 360;
}

// ==================== UPDATE JOURNEY LOCATION (Real-time tracking) ====================
// exports.updateJourneyLocation = async (req, res) => {
//   try {
//     const { journeyId } = req.params;
//     const { latitude, longitude, address, speed, heading } = req.body;

//     if (!latitude || !longitude) {
//       return errorResponse(res, 'Latitude and longitude are required', 400);
//     }

//     const driver = req.user;
//     const journey = await Journey.findById(journeyId);

//     if (!journey) {
//       return errorResponse(res, 'Journey not found', 404);
//     }

//     if (journey.driverId.toString() !== driver._id.toString()) {
//       return errorResponse(res, 'Unauthorized', 403);
//     }

//     // Check if journey is active
//     if (!['Started', 'In_transit', 'In_progress', 'assigned'].includes(journey.status)) {
//       return errorResponse(res, 'Journey is not active', 400);
//     }

//     const locationData = {
//       latitude: Number(latitude),
//       longitude: Number(longitude),
//       address: address || 'GPS Location',
//       lastUpdated: new Date()
//     };

//     if (speed) locationData.speed = Number(speed);
//     if (heading) locationData.heading = Number(heading);

//     // Update driver's current location in Driver model
//     await Driver.findByIdAndUpdate(
//       driver._id,
//       { 
//         currentLocation: locationData,
//         lastLocationUpdate: new Date()
//       },
//       { new: true }
//     );

//     // ────────────────── ✅ SOCKET.IO EMIT TO ADMIN DASHBOARD ──────────────────
//     const io = req.app.get('io');
//     if (io) {
//       io.to('admin-room').emit('driver:location:update', {
//         driverId: driver._id.toString(),
//         driverName: driver.name,
//         vehicleNumber: driver.vehicleNumber || driver.vehicle?.vehicleNumber || 'N/A',
//         location: locationData,
//         isAvailable: driver.isAvailable || false,
//         status: journey.status,
//         journeyId: journey._id.toString(),
//         timestamp: new Date().toISOString()
//       });
      
//       console.log(`📍 [SOCKET] Location broadcasted for driver: ${driver.name} at ${latitude}, ${longitude}`);
//     } else {
//       console.warn('⚠️ Socket.IO not available - location not broadcasted');
//     }
//     // ─────────────────────────────────────────────────────────────────────────

//     return successResponse(res, 'Location updated successfully', {
//       location: locationData,
//       journeyStatus: journey.status
//     });

//   } catch (error) {
//     console.error('❌ Update Journey Location Error:', error);
//     return errorResponse(res, 'Failed to update location', 500);
//   }
// };
exports.updateJourneyLocation = async (req, res) => {
  try {
    const { journeyId } = req.params;
    const { latitude, longitude, address, speed, heading } = req.body;

    if (!latitude || !longitude) {
      return errorResponse(res, 'Latitude and longitude are required', 400);
    }

    const driver = req.user;
    const journey = await Journey.findById(journeyId);

    if (!journey) {
      return errorResponse(res, 'Journey not found', 404);
    }

    if (journey.driverId.toString() !== driver._id.toString()) {
      return errorResponse(res, 'Unauthorized', 403);
    }

    // Check if journey is active
    if (!['Started', 'In_transit', 'In_progress', 'assigned'].includes(journey.status)) {
      return errorResponse(res, 'Journey is not active', 400);
    }

    const newLat = Number(latitude);
    const newLng = Number(longitude);
    const newTime = new Date();

    // Fetch previous location
    const previousDriver = await Driver.findById(driver._id).select('currentLocation');

    let calcSpeed = speed;
    let calcHeading = heading;

    if (previousDriver.currentLocation && previousDriver.currentLocation.latitude && previousDriver.currentLocation.longitude && previousDriver.currentLocation.lastUpdated) {
      const oldLat = previousDriver.currentLocation.latitude;
      const oldLng = previousDriver.currentLocation.longitude;
      const oldTime = previousDriver.currentLocation.lastUpdated;

      const dist = calculateDistance(oldLat, oldLng, newLat, newLng);
      const timeDiffMs = newTime - oldTime;
      const timeDiffHours = timeDiffMs / 3600000;

      if (timeDiffHours > 0) {
        const computedSpeed = dist / timeDiffHours;
        if (!speed) calcSpeed = computedSpeed;
      }

      const computedHeading = calculateBearing(oldLat, oldLng, newLat, newLng);
      if (!heading) calcHeading = computedHeading;
    }

    const locationData = {
      latitude: newLat,
      longitude: newLng,
      address: address || 'GPS Location',
      lastUpdated: newTime
    };

    if (calcSpeed !== undefined) locationData.speed = Number(calcSpeed);
    if (calcHeading !== undefined) locationData.heading = Number(calcHeading);

    // Update driver's current location in Driver model
    await Driver.findByIdAndUpdate(
      driver._id,
      { 
        currentLocation: locationData,
        lastLocationUpdate: new Date()
      },
      { new: true }
    );

    // ────────────────── ✅ SOCKET.IO EMIT TO ADMIN DASHBOARD ──────────────────
    const io = req.app.get('io');
    if (io) {
      io.to('admin-room').emit('driver:location:update', {
        driverId: driver._id.toString(),
        driverName: driver.name,
        vehicleNumber: driver.vehicleNumber || driver.vehicle?.vehicleNumber || 'N/A',
        location: locationData,
        isAvailable: driver.isAvailable || false,
        status: journey.status,
        journeyId: journey._id.toString(),
        timestamp: new Date().toISOString()
      });
      
      console.log(`📍 [SOCKET] Location broadcasted for driver: ${driver.name} at ${latitude}, ${longitude}`);
    } else {
      console.warn('⚠️ Socket.IO not available - location not broadcasted');
    }
    // ─────────────────────────────────────────────────────────────────────────

    return successResponse(res, 'Location updated successfully', {
      location: locationData,
      journeyStatus: journey.status
    });

  } catch (error) {
    console.error('❌ Update Journey Location Error:', error);
    return errorResponse(res, 'Failed to update location', 500);
  }
};

// ==================== START JOURNEY (with Socket.IO integration) ====================
exports.startJourney = async (req, res) => {
  try {
    const { deliveryId, latitude, longitude, address } = req.body;

    if (!deliveryId || latitude === undefined || longitude === undefined) {
      return errorResponse(res, 'deliveryId, latitude and longitude are required', 400);
    }

    const driver = req.user;

    if (!driver) {
      return errorResponse(res, 'Driver not authenticated', 401);
    }

    const delivery = await Delivery.findOne({
      _id: deliveryId,
      driverId: driver._id,
      status: 'assigned'
    });

    if (!delivery) {
      return errorResponse(res, 'Delivery not found or not assigned to you', 404);
    }

    const existingJourney = await Journey.findOne({
      deliveryId,
      status: { $in: ['Started', 'In_transit', 'In_progress'] }
    });

    if (existingJourney) {
      return errorResponse(res, 'Journey already started', 400);
    }

    // Create Journey
    const journey = await Journey.create({
      deliveryId,
      driverId: driver._id,
      startLocation: {
        coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
        address: address || 'Location captured via GPS'
      },
      startTime: new Date(),
      status: 'assigned'
    });

    // Update delivery status
    delivery.status = 'In_transit';
    delivery.actualPickupTime = new Date();
    await delivery.save();

    // Create delivery status history
    await DeliveryStatusHistory.create({
      deliveryId: delivery._id,
      status: 'In_transit',
      location: {
        coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
        address: address || 'GPS Location'
      },
      remarks: 'Driver started journey - Package picked up',
      updatedBy: {
        userId: driver._id,
        userRole: 'driver',
        userName: driver.name
      }
    });

    // ✅ Update driver with current location and journey info
    await Driver.findByIdAndUpdate(driver._id, {
      currentJourney: journey._id,
      activeDelivery: delivery._id,
      currentLocation: {
        latitude: Number(latitude),
        longitude: Number(longitude),
        address: address || 'GPS Location',
        lastUpdated: new Date()
      },
      lastLocationUpdate: new Date()
    });

    // ────────────────── ✅ SOCKET.IO - JOURNEY STARTED ──────────────────
    const io = req.app.get('io');
    if (io) {
      // Broadcast to admin room
      io.to('admin-room').emit('driver:journey:started', {
        driverId: driver._id.toString(),
        driverName: driver.name,
        vehicleNumber: driver.vehicleNumber || 'N/A',
        journeyId: journey._id.toString(),
        deliveryId: delivery._id.toString(),
        location: {
          latitude: Number(latitude),
          longitude: Number(longitude),
          address: address || 'GPS Location',
          lastUpdated: new Date()
        },
        // isAvailable: false,
        status: 'In_transit',
        timestamp: new Date().toISOString()
      });

      console.log(`🚀 [SOCKET] Journey started broadcast for: ${driver.name}`);
      console.log(`   📦 Delivery ID: ${delivery._id.toString()}`);
      console.log(`   🚗 Driver ID: ${driver._id.toString()}`);
      console.log(`   📍 Location: ${latitude}, ${longitude}`);
    } else {
      console.warn('⚠️ Socket.IO not available - journey start not broadcasted');
    }
    // ─────────────────────────────────────────────────────────────────

    // Activity logging
    try {
      await logDriverActivity(
        driver._id,
        'JOURNEY_STARTED',
        {
          journeyId: journey._id.toString(),
          deliveryId: delivery._id.toString(),
          trackingNumber: delivery.trackingNumber || 'N/A',
          vehicleId: driver.vehicle ? driver.vehicle.toString() : null,
          startLocation: {
            latitude: Number(latitude),
            longitude: Number(longitude),
            address: address || 'GPS captured'
          },
          startTime: new Date().toISOString()
        },
        req
      );
    } catch (logError) {
      console.error('Failed to log JOURNEY_STARTED activity:', logError.message);
    }

    // Auto-update to In_transit after 2 seconds
    setTimeout(async () => {
      try {
        await Journey.findByIdAndUpdate(
          journey._id,
          { status: 'In_transit' },
          { new: true }
        );

        await DeliveryStatusHistory.create({
          deliveryId: delivery._id,
          status: 'In_transit',
          location: {
            coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
            address: address || 'GPS Location'
          },
          remarks: 'Package is now in transit',
          updatedBy: {
            userId: driver._id,
            userRole: 'driver',
            userName: driver.name
          }
        });

        delivery.status = 'In_transit';
        await delivery.save();

        // ✅ Broadcast status change
        if (io) {
          io.to('admin-room').emit('driver:status:change', {
            driverId: driver._id.toString(),
            isAvailable: false,
            status: 'In_transit',
            journeyId: journey._id.toString()
          });
          
          console.log(`🔄 [SOCKET] Status change broadcasted: In_transit`);
        }

      } catch (error) {
        console.error('Failed to update to In_transit:', error.message);
      }
    }, 2000);

    return successResponse(res, 'Journey started successfully! Package picked up.', {
      journeyId: journey._id,
      deliveryStatus: delivery.status,
      trackingNumber: delivery.trackingNumber,
      pickupTime: delivery.actualPickupTime
    }, 201);

  } catch (error) {
    console.error('Start Journey Error:', error.message);
    return errorResponse(res, error.message || 'Failed to start journey', 500);
  }
};

// ==================== CONTINUE JOURNEY ====================
exports.continueJourney = async (req, res) => {
  try {
    const { deliveryId } = req.body;

    if (!deliveryId) {
      return errorResponse(res, 'deliveryId is required', 400);
    }

    const driver = req.user;

    if (!driver) {
      return errorResponse(res, 'Driver not authenticated', 401);
    }

    const delivery = await Delivery.findOne({
      _id: deliveryId,
      driverId: driver._id
    });

    if (!delivery) {
      return errorResponse(res, 'Delivery not found or not assigned to you', 404);
    }

    const journey = await Journey.findOne({
      deliveryId,
      driverId: driver._id,
      status: {
        $in: ['Started', 'In_transit', 'In_progress', 'Picked_up','Arrived']
      }
    }).populate('deliveryId', 'trackingNumber recipientName recipientPhone recipientAddress');

    if (!journey) {
      return errorResponse(res, 'No active journey found for this delivery', 404);
    }

    await Driver.findByIdAndUpdate(driver._id, {
      isAvailable: false,
      currentJourney: journey._id,
      activeDelivery: delivery._id
    });

    try {
      await logDriverActivity(
        driver._id,
        'JOURNEY_CONTINUED',
        {
          journeyId: journey._id.toString(),
          deliveryId: delivery._id.toString(),
          trackingNumber: delivery.trackingNumber || 'N/A',
          currentStatus: journey.status,
          continuedAt: new Date().toISOString()
        },
        req
      );
    } catch (logError) {
      console.error('Failed to log JOURNEY_CONTINUED activity:', logError.message);
    }

    return successResponse(res, 'Journey resumed successfully!', {
      journeyId: journey._id,
      deliveryId: delivery._id,
      trackingNumber: delivery.trackingNumber,
      currentStatus: journey.status,
      startTime: journey.startTime,
      startLocation: journey.startLocation,
      recipientDetails: {
        name: delivery.recipientName,
        phone: delivery.recipientPhone,
        address: delivery.recipientAddress
      },
      waypoints: journey.waypoints || [],
      totalDistance: journey.totalDistance || 0,
      totalDuration: journey.totalDuration || 0
    }, 200);

  } catch (error) {
    console.error('Continue Journey Error:', error.message);
    return errorResponse(res, error.message || 'Failed to continue journey', 500);
  }
};

// ==================== GET ACTIVE JOURNEY BY DELIVERY ID ====================
exports.getActiveJourneyByDeliveryId = async (req, res) => {
  try {
    const { deliveryId } = req.params;

    if (!deliveryId) {
      return errorResponse(res, 'deliveryId is required', 400);
    }

    const driver = req.user;

    if (!driver) {
      return errorResponse(res, 'Driver not authenticated', 401);
    }

    const journey = await Journey.findOne({
      deliveryId,
      driverId: driver._id,
      status: {
        $in: ['Started', 'In_transit', 'In_progress', 'Picked_up']
      }
    })
      .populate('deliveryId', 'trackingNumber recipientName recipientPhone recipientAddress estimatedDeliveryTime')
      .populate('driverId', 'name phone vehicle');

    if (!journey) {
      return errorResponse(res, 'No active journey found for this delivery', 404);
    }

    return successResponse(res, 'Active journey retrieved successfully', {
      journey,
      isActive: true
    }, 200);

  } catch (error) {
    console.error('Get Active Journey Error:', error.message);
    return errorResponse(res, error.message || 'Failed to get active journey', 500);
  }
};

// ==================== ADD CHECKPOINT ====================
exports.addCheckpoint = async (req, res) => {
  try {
    const { journeyId } = req.params;
    const { latitude, longitude, address, activity, remarks } = req.body;

    if (!latitude || !longitude) {
      return errorResponse(res, 'Location (latitude & longitude) is required', 400);
    }

    const driver = req.user;
    const journey = await Journey.findById(journeyId);
    
    if (!journey) {
      return errorResponse(res, 'Journey not found', 404);
    }

    if (journey.driverId.toString() !== driver._id.toString()) {
      return errorResponse(res, 'Unauthorized: This journey does not belong to you', 403);
    }

    if (!['started', 'in_progress'].includes(journey.status)) {
      return errorResponse(res, 'Journey is not active', 400);
    }

    const checkpoint = {
      location: {
        coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
        address: address || 'Checkpoint location'
      },
      timestamp: new Date(),
      activity: activity || 'checkpoint',
      remarks: remarks || ''
    };

    journey.waypoints.push(checkpoint);
    journey.status = 'in_progress';
    await journey.save();

    const delivery = await Delivery.findById(journey.deliveryId);
    if (delivery) {
      await DeliveryStatusHistory.create({
        deliveryId: delivery._id,
        status: 'in_transit',
        location: {
          coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
          address: address || 'Checkpoint'
        },
        remarks: remarks || `Driver added checkpoint: ${activity}`,
        updatedBy: {
          userId: driver._id,
          userRole: 'driver',
          userName: driver.name
        }
      });
    }

    return successResponse(res, 'Checkpoint added successfully', {
      checkpointIndex: journey.waypoints.length - 1,
      checkpoint,
      totalCheckpoints: journey.waypoints.length
    });

  } catch (error) {
    console.error('Add Checkpoint Error:', error.message);
    return errorResponse(res, error.message || 'Failed to add checkpoint', 500);
  }
};

// ==================== ADD JOURNEY IMAGE ====================
exports.addJourneyImage = async (req, res) => {
  try {
    const { journeyId } = req.params;
    const { caption, latitude, longitude, imageType } = req.body;

    if (!req.file) {
      return errorResponse(res, 'Image file is required', 400);
    }

    const journey = await Journey.findById(journeyId);
    if (!journey) {
      return errorResponse(res, 'Journey not found', 404);
    }

    const driver = req.user;

    if (journey.driverId.toString() !== driver._id.toString()) {
      return errorResponse(res, 'Unauthorized: This journey does not belong to you', 403);
    }

    if (!['started', 'in_progress'].includes(journey.status)) {
      return errorResponse(res, 'Cannot add image: Journey is not active', 400);
    }

    const imageUrl = `/uploads/journey/${req.file.filename}`;

    const imageData = {
      url: imageUrl,
      caption: caption || 'Journey image',
      timestamp: new Date(),
      imageType: imageType || 'general'
    };

    if (latitude && longitude) {
      imageData.location = {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      };
    }

    journey.images.push(imageData);
    await journey.save();

    const addedImage = journey.images[journey.images.length - 1];

    return successResponse(res, 'Image added to journey successfully!', {
      image: addedImage,
      totalImages: journey.images.length
    });

  } catch (error) {
    console.error('Add Journey Image Error:', error.message);
    return errorResponse(res, error.message || 'Failed to add image', 500);
  }
};

// ==================== INITIATE CALL ====================
exports.initiateCall = async (req, res) => {
  try {
    const { journeyId } = req.params;
    const { contactName, phoneNumber: providedPhone } = req.body;

    const driver = req.user;
    const journey = await Journey.findById(journeyId);

    if (!journey) {
      return errorResponse(res, 'Journey not found', 404);
    }

    if (journey.driverId.toString() !== driver._id.toString()) {
      return errorResponse(res, 'Unauthorized: This journey does not belong to you', 403);
    }

    if (!journey.isActive()) {
      return errorResponse(res, 'Journey is not active', 400);
    }

    const delivery = await Delivery.findById(journey.deliveryId)
      .populate('customerId', 'phoneNumber phone name fullName');

    if (!delivery) {
      return errorResponse(res, 'Delivery not found', 404);
    }

    if (!delivery.customerId) {
      return errorResponse(res, 'Customer not associated with this delivery', 400);
    }

    const phoneNumber = providedPhone || delivery.customerId.phoneNumber || delivery.customerId.phone;

    if (!phoneNumber) {
      return errorResponse(res, 'Customer phone number not found', 400);
    }

    const finalContactName =
      contactName ||
      delivery.customerId.name ||
      delivery.customerId.fullName ||
      delivery.recipientName ||
      'Customer';

    const callLog = {
      type: 'call',
      phoneNumber,
      contactName: finalContactName,
      timestamp: new Date(),
      status: 'initiated',
      duration: 0
    };

    journey.communicationLog.push(callLog);
    await journey.save();

    return successResponse(res, 'Call initiated successfully', {
      callId: journey.communicationLog[journey.communicationLog.length - 1]._id,
      phoneNumber,
      callUrl: `tel:${phoneNumber}`,
      contactName: finalContactName,
      totalCalls: journey.communicationLog.filter(log => log.type === 'call').length
    });

  } catch (error) {
    console.error('Initiate Call Error:', error.message);
    return errorResponse(res, error.message || 'Failed to initiate call', 500);
  }
};

// ==================== END CALL ====================
exports.endCall = async (req, res) => {
  try {
    const { journeyId, callId } = req.params;
    const { duration, status } = req.body;

    const driver = req.user;
    const journey = await Journey.findById(journeyId);

    if (!journey) {
      return errorResponse(res, 'Journey not found', 404);
    }

    if (journey.driverId.toString() !== driver._id.toString()) {
      return errorResponse(res, 'Unauthorized', 403);
    }

    const callLog = journey.communicationLog.id(callId);

    if (!callLog) {
      return errorResponse(res, 'Call log not found', 404);
    }

    callLog.duration = duration || 0;
    callLog.status = status || 'completed';

    await journey.save();

    return successResponse(res, 'Call ended and logged successfully', {
      callId: callLog._id,
      duration: `${duration} seconds`,
      status: callLog.status
    });

  } catch (error) {
    console.error('End Call Error:', error.message);
    return errorResponse(res, error.message || 'Failed to end call', 500);
  }
};

// ==================== INITIATE WHATSAPP ====================
exports.initiateWhatsApp = async (req, res) => {
  try {
    const { journeyId } = req.params;
    const { contactName, phoneNumber: providedPhone, message } = req.body;

    const driver = req.user;
    const journey = await Journey.findById(journeyId)
      .populate({
        path: 'deliveryId',
        populate: { path: 'customerId', select: 'phone name fullName' }
      });

    if (!journey) {
      return errorResponse(res, 'Journey not found', 404);
    }

    if (journey.driverId.toString() !== driver._id.toString()) {
      return errorResponse(res, 'Unauthorized', 403);
    }

    if (!journey.isActive()) {
      return errorResponse(res, 'Journey is not active', 400);
    }

    const delivery = journey.deliveryId;

    if (!delivery) {
      return errorResponse(res, 'Delivery not found', 404);
    }

    let phoneNumber = providedPhone || delivery.recipientPhone || delivery.customerId?.phone;

    if (!phoneNumber) {
      return errorResponse(res, 'Phone number not available', 400);
    }

    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');

    const whatsappReadyPhone = cleanPhone.startsWith('91') && cleanPhone.length === 12
      ? cleanPhone
      : cleanPhone.startsWith('0')
        ? '91' + cleanPhone.substring(1)
        : cleanPhone.length === 10
          ? '91' + cleanPhone
          : cleanPhone;

    const finalContactName = contactName || delivery.recipientName || delivery.customerId?.fullName || delivery.customerId?.name || 'Customer';

    const defaultMessage = message || `Hello ${finalContactName}, your delivery is on the way. I'll reach you soon. - ${driver.name}`;

    const whatsappLog = {
      type: 'whatsapp',
      phoneNumber: whatsappReadyPhone,
      contactName: finalContactName,
      timestamp: new Date(),
      status: 'initiated',
      remarks: defaultMessage
    };

    journey.communicationLog.push(whatsappLog);
    await journey.save();

    const whatsappUrl = `https://wa.me/${whatsappReadyPhone}?text=${encodeURIComponent(defaultMessage)}`;

    return successResponse(res, 'WhatsApp initiated successfully', {
      whatsappId: journey.communicationLog[journey.communicationLog.length - 1]._id,
      phoneNumber: whatsappReadyPhone,
      whatsappUrl,
      contactName: finalContactName,
      message: defaultMessage,
      totalWhatsAppMessages: journey.communicationLog.filter(log => log.type === 'whatsapp').length
    });

  } catch (error) {
    console.error('Initiate WhatsApp Error:', error);
    return errorResponse(res, 'Failed to initiate WhatsApp', 500);
  }
};

// ==================== GET NAVIGATION ====================
// exports.getNavigation = async (req, res) => {
//   try {
//     const { journeyId } = req.params;
//     const { currentLatitude, currentLongitude } = req.query;

//     const driver = req.user;

//     const journey = await Journey.findById(journeyId)
//       .populate({
//         path: 'deliveryId',
//         select: 'deliveryLocation deliveryNumber companyName address customerId pickupLocation deliveryLocation recipientName recipientPhone',
//         populate: {
//           path: 'customerId',
//           select: 'name fullName firstName lastName phone mobile number'
//         }
//       });

//     if (!journey) {
//       return errorResponse(res, 'Journey not found', 404);
//     }

//     if (journey.driverId.toString() !== driver._id.toString()) {
//       return errorResponse(res, 'Unauthorized access', 403);
//     }

//     const delivery = journey.deliveryId;
//     const destination = delivery.deliveryLocation;

//     if (!destination || !destination.coordinates) {
//       return errorResponse(res, 'Delivery location coordinates not available', 400);
//     }

//     const destLat = destination.coordinates.latitude;
//     const destLng = destination.coordinates.longitude;

//     let distance = null;
//     let duration = null;
//     let routePolyline = null;

//     if (currentLatitude && currentLongitude && !isNaN(currentLatitude) && !isNaN(currentLongitude)) {
//       const origin = `${currentLatitude.trim()},${currentLongitude.trim()}`;
//       const destinationCoord = `${destLat},${destLng}`;

//       console.log(`[Navigation] Requesting Google: ${origin} → ${destinationCoord}`);

//       try {
//         const directionsResponse = await axios.get(
//           'https://maps.googleapis.com/maps/api/directions/json',
//           {
//             params: {
//               origin,
//               destination: destinationCoord,
//               key: process.env.GOOGLE_MAPS_API_KEY,
//               mode: 'driving',
//               traffic_model: 'best_guess',
//               departure_time: 'now'
//             }
//           }
//         );

//         const apiData = directionsResponse.data;
//         console.log('[Navigation] Status:', apiData.status);

//         if (apiData.status === 'OK' && apiData.routes?.length > 0) {
//           const leg = apiData.routes[0].legs[0];
//           distance = leg.distance?.value ? leg.distance.value / 1000 : null;
//           duration = leg.duration_in_traffic?.value
//             ? Math.round(leg.duration_in_traffic.value / 60)
//             : (leg.duration?.value ? Math.round(leg.duration.value / 60) : null);
//           routePolyline = apiData.routes[0].overview_polyline?.points || null;

//           console.log(`[Navigation] Success → ${distance?.toFixed(1)} km | ${duration} min`);
//         }
//       } catch (apiError) {
//         console.error('[Navigation] Google API failed:', apiError.message);
//       }
//     } else {
//       console.warn('[Navigation] No current location provided');
//     }

//     const navLog = {
//       destination: { address: destination.address || 'Unknown', coordinates: { latitude: destLat, longitude: destLng } },
//       startedAt: new Date(),
//       estimatedDistance: distance,
//       estimatedDuration: duration,
//       usedGoogle: !!routePolyline
//     };

//     journey.navigationHistory.push(navLog);
//     await journey.save();

//     const customerDoc = delivery.customerId;

//     const customerName = customerDoc
//       ? (customerDoc.name ||
//         customerDoc.fullName ||
//         [customerDoc.firstName, customerDoc.lastName].filter(Boolean).join(' ').trim() ||
//         'Unknown Customer')
//       : 'Unknown Customer';

//     const customerPhone = customerDoc?.phone || customerDoc?.mobile || customerDoc?.number || null;

//     const salesmanName = driver.name ||
//       driver.fullName ||
//       [driver.firstName, driver.lastName].filter(Boolean).join(' ').trim() ||
//       driver.username ||
//       'Salesman';

//     const salesmanPhone = driver.phone || driver.mobile || null;

//     return successResponse(res, 'Navigation data ready', {
//       currentLocation: currentLatitude && currentLongitude ? {
//         latitude: parseFloat(currentLatitude),
//         longitude: parseFloat(currentLongitude)
//       } : null,

//       destination: {
//         address: destination.address || 'Unknown Address',
//         coordinates: { latitude: destLat, longitude: destLng }
//       },

//       routePolyline: routePolyline || null,

//       distance: distance ? `${distance.toFixed(1)} km` : 'Calculating...',
//       durationMinutes: duration,
//       estimatedTime: duration ? `${duration} mins` : 'N/A',

//       currentStop: {
//         number: 1,
//         deliveryNumber: delivery.deliveryNumber || delivery.trackingNumber || 'N/A',
//         companyName: delivery.companyName || customerName || 'Customer',
//         address: destination.address || 'Address not available',
//         eta: duration ? `${duration} Mins` : 'N/A',
//         status: 'In Transit'
//       },

//       customer: {
//         name: customerName,
//         phone: customerPhone
//       },

//       salesman: {
//         name: salesmanName,
//         phone: salesmanPhone
//       },

//       navigationHistoryId: journey.navigationHistory[journey.navigationHistory.length - 1]._id,
//       isGoogleData: !!routePolyline
//     });

//   } catch (error) {
//     console.error('Get Navigation Error:', error);
//     return errorResponse(res, 'Failed to fetch navigation data', 500);
//   }
// };

// ==================== GET NAVIGATION ====================
// exports.getNavigation = async (req, res) => {
//   try {
//     const { journeyId } = req.params;
//     const { currentLatitude, currentLongitude } = req.query;

//     const driver = req.user;

//     const journey = await Journey.findById(journeyId)
//       .populate({
//         path: 'deliveryId',
//         select: 'deliveryLocation deliveryNumber companyName address customerId pickupLocation deliveryLocation recipientName recipientPhone',
//         populate: {
//           path: 'customerId',
//           select: 'name fullName firstName lastName phone mobile number'
//         }
//       });

//     if (!journey) {
//       return errorResponse(res, 'Journey not found', 404);
//     }

//     if (journey.driverId.toString() !== driver._id.toString()) {
//       return errorResponse(res, 'Unauthorized access', 403);
//     }

//     const delivery = journey.deliveryId;
//     const destination = delivery.deliveryLocation;

//     if (!destination || !destination.coordinates) {
//       return errorResponse(res, 'Delivery location coordinates not available', 400);
//     }

//     const destLat = destination.coordinates.latitude;
//     const destLng = destination.coordinates.longitude;

//     let distance = null;
//     let duration = null;
//     let routePolyline = null;

//     // Calculate actual traveled distance based on start, waypoints, and current location
//     let actualDistance = 0;
//     const points = [journey.startLocation.coordinates, ...journey.waypoints.map(wp => wp.location.coordinates)];

//     if (currentLatitude && currentLongitude && !isNaN(currentLatitude) && !isNaN(currentLongitude)) {
//       points.push({ latitude: parseFloat(currentLatitude), longitude: parseFloat(currentLongitude) });

//       const origin = `${currentLatitude.trim()},${currentLongitude.trim()}`;
//       const destinationCoord = `${destLat},${destLng}`;

//       console.log(`[Navigation] Requesting Google: ${origin} → ${destinationCoord}`);

//       try {
//         const directionsResponse = await axios.get(
//           'https://maps.googleapis.com/maps/api/directions/json',
//           {
//             params: {
//               origin,
//               destination: destinationCoord,
//               key: process.env.GOOGLE_MAPS_API_KEY,
//               mode: 'driving',
//               traffic_model: 'best_guess',
//               departure_time: 'now'
//             }
//           }
//         );

//         const apiData = directionsResponse.data;
//         console.log('[Navigation] Status:', apiData.status);

//         if (apiData.status === 'OK' && apiData.routes?.length > 0) {
//           const leg = apiData.routes[0].legs[0];
//           distance = leg.distance?.value ? leg.distance.value / 1000 : null;
//           duration = leg.duration_in_traffic?.value
//             ? Math.round(leg.duration_in_traffic.value / 60)
//             : (leg.duration?.value ? Math.round(leg.duration.value / 60) : null);
//           routePolyline = apiData.routes[0].overview_polyline?.points || null;

//           // Update journey with Google estimates if not already set
//           if (journey.estimatedDurationFromGoogle === null) {
//             journey.estimatedDurationFromGoogle = duration;
//             journey.googleDistanceMeters = leg.distance?.value;
//             journey.googleDurationInTrafficSeconds = leg.duration_in_traffic?.value;
//             await journey.save();
//           }

//           console.log(`[Navigation] Success → ${distance?.toFixed(1)} km | ${duration} min`);
//         }
//       } catch (apiError) {
//         console.error('[Navigation] Google API failed:', apiError.message);
//       }
//     } else {
//       console.warn('[Navigation] No current location provided');
//     }

//     // Calculate actual distance traveled so far
//     for (let i = 0; i < points.length - 1; i++) {
//       actualDistance += calculateDistance(
//         points[i].latitude,
//         points[i].longitude,
//         points[i + 1].latitude,
//         points[i + 1].longitude
//       );
//     }

//     // Calculate actual time taken so far
//     const now = new Date();
//     const actualDurationMs = now - new Date(journey.startTime);
//     const actualMinutes = Math.round(actualDurationMs / 60000);

//     // Calculate average speed so far
//     const actualHours = actualMinutes / 60;
//     const averageSpeed = actualHours > 0 ? (actualDistance / actualHours).toFixed(1) : 'N/A';

//     // Time difference calculation
//     const estimatedMin = journey.estimatedDurationFromGoogle || duration;
//     let timeDifferenceText = '';
//     if (estimatedMin !== null) {
//       const diff = actualMinutes - estimatedMin;
//       if (diff > 5) timeDifferenceText = `Delayed by ${diff} mins`;
//       else if (diff < -5) timeDifferenceText = `Ahead by ${Math.abs(diff)} mins`;
//       else timeDifferenceText = 'On time';
//     }

//     const navLog = {
//       destination: { address: destination.address || 'Unknown', coordinates: { latitude: destLat, longitude: destLng } },
//       startedAt: new Date(),
//       estimatedDistance: distance,
//       estimatedDuration: duration,
//       usedGoogle: !!routePolyline
//     };

//     journey.navigationHistory.push(navLog);
//     await journey.save();

//     const customerDoc = delivery.customerId;

//     const customerName = customerDoc
//       ? (customerDoc.name ||
//         customerDoc.fullName ||
//         [customerDoc.firstName, customerDoc.lastName].filter(Boolean).join(' ').trim() ||
//         'Unknown Customer')
//       : 'Unknown Customer';

//     const customerPhone = customerDoc?.phone || customerDoc?.mobile || customerDoc?.number || null;

//     const salesmanName = driver.name ||
//       driver.fullName ||
//       [driver.firstName, driver.lastName].filter(Boolean).join(' ').trim() ||
//       driver.username ||
//       'Salesman';

//     const salesmanPhone = driver.phone || driver.mobile || null;

//     return successResponse(res, 'Navigation data ready', {
//       currentLocation: currentLatitude && currentLongitude ? {
//         latitude: parseFloat(currentLatitude),
//         longitude: parseFloat(currentLongitude)
//       } : null,

//       destination: {
//         address: destination.address || 'Unknown Address',
//         coordinates: { latitude: destLat, longitude: destLng }
//       },

//       routePolyline: routePolyline || null,

//       distance: distance ? `${distance.toFixed(1)} km` : 'Calculating...',
//       durationMinutes: duration,
//       estimatedTime: duration ? `${duration} mins` : 'N/A',

//       currentStop: {
//         number: 1,
//         deliveryNumber: delivery.deliveryNumber || 'N/A',
//         trackingNumber: delivery.trackingNumber || 'N/A',
//         companyName: delivery.companyName || customerName || 'Customer',
//         address: destination.address || 'Address not available',
//         eta: duration ? `${duration} Mins` : 'N/A',
//         status: 'In_transit'
//       },

//       customer: {
//         name: customerName,
//         phone: customerPhone
//       },

//       salesman: {
//         name: salesmanName,
//         phone: salesmanPhone
//       },

//       navigationHistoryId: journey.navigationHistory[journey.navigationHistory.length - 1]._id,
//       isGoogleData: !!routePolyline,

//       actualMetrics: {
//         traveledDistance: `${actualDistance.toFixed(2)} km`,
//         timeTaken: `${actualMinutes} mins`,
//         averageSpeed: `${averageSpeed} km/h`,
//         timeDifference: timeDifferenceText || 'N/A'
//       }
//     });

//   } catch (error) {
//     console.error('Get Navigation Error:', error);
//     return errorResponse(res, 'Failed to fetch navigation data', 500);
//   }
// };

exports.getNavigation = async (req, res) => {
  try {
    const { journeyId } = req.params;
    const { currentLatitude, currentLongitude } = req.query;

    const driver = req.user;

    const journey = await Journey.findById(journeyId)
      .populate({
        path: 'deliveryId',
        select: 'deliveryLocation deliveryNumber trackingNumber companyName address customerId pickupLocation deliveryLocation recipientName recipientPhone',
        populate: {
          path: 'customerId',
          select: 'name fullName firstName lastName phone mobile number'
        }
      });

    if (!journey) {
      return errorResponse(res, 'Journey not found', 404);
    }

    if (journey.driverId.toString() !== driver._id.toString()) {
      return errorResponse(res, 'Unauthorized access', 403);
    }

    const delivery = journey.deliveryId;
    const destination = delivery.deliveryLocation;

    if (!destination || !destination.coordinates) {
      return errorResponse(res, 'Delivery location coordinates not available', 400);
    }

    const destLat = destination.coordinates.latitude;
    const destLng = destination.coordinates.longitude;

    let distance = null;
    let duration = null;
    let routePolyline = null;

    // Calculate actual traveled distance based on start, waypoints, and current location
    let actualDistance = 0;
    const points = [journey.startLocation.coordinates, ...journey.waypoints.map(wp => wp.location.coordinates)];

    if (currentLatitude && currentLongitude && !isNaN(currentLatitude) && !isNaN(currentLongitude)) {
      points.push({ latitude: parseFloat(currentLatitude), longitude: parseFloat(currentLongitude) });

      const origin = `${currentLatitude.trim()},${currentLongitude.trim()}`;
      const destinationCoord = `${destLat},${destLng}`;

      console.log(`[Navigation] Requesting Google: ${origin} → ${destinationCoord}`);

      try {
        const directionsResponse = await axios.get(
          'https://maps.googleapis.com/maps/api/directions/json',
          {
            params: {
              origin,
              destination: destinationCoord,
              key: process.env.GOOGLE_MAPS_API_KEY,
              mode: 'driving',
              traffic_model: 'best_guess',
              departure_time: 'now'
            }
          }
        );

        const apiData = directionsResponse.data;
        console.log('[Navigation] Status:', apiData.status);

        if (apiData.status === 'OK' && apiData.routes?.length > 0) {
          const leg = apiData.routes[0].legs[0];
          distance = leg.distance?.value ? leg.distance.value / 1000 : null;
          duration = leg.duration_in_traffic?.value
            ? Math.round(leg.duration_in_traffic.value / 60)
            : (leg.duration?.value ? Math.round(leg.duration.value / 60) : null);
          routePolyline = apiData.routes[0].overview_polyline?.points || null;

          // Update journey with Google estimates if not already set
          if (journey.estimatedDurationFromGoogle === null) {
            journey.estimatedDurationFromGoogle = duration;
            journey.googleDistanceMeters = leg.distance?.value;
            journey.googleDurationInTrafficSeconds = leg.duration_in_traffic?.value;
            await journey.save();
          }

          console.log(`[Navigation] Success → ${distance?.toFixed(1)} km | ${duration} min`);
        }
      } catch (apiError) {
        console.error('[Navigation] Google API failed:', apiError.message);
      }
    } else {
      console.warn('[Navigation] No current location provided');
    }

    // Calculate actual distance traveled so far
    for (let i = 0; i < points.length - 1; i++) {
      actualDistance += calculateDistance(
        points[i].latitude,
        points[i].longitude,
        points[i + 1].latitude,
        points[i + 1].longitude
      );
    }

    // Calculate actual time taken so far
    const now = new Date();
    const actualDurationMs = now - new Date(journey.startTime);
    const actualMinutes = Math.round(actualDurationMs / 60000);

    // Calculate average speed so far
    const actualHours = actualMinutes / 60;
    const averageSpeed = actualHours > 0 ? (actualDistance / actualHours).toFixed(1) : 'N/A';

    // Time difference calculation
    const estimatedMin = journey.estimatedDurationFromGoogle || duration;
    let timeDifferenceText = '';
    if (estimatedMin !== null) {
      const diff = actualMinutes - estimatedMin;
      if (diff > 5) timeDifferenceText = `Delayed by ${diff} mins`;
      else if (diff < -5) timeDifferenceText = `Ahead by ${Math.abs(diff)} mins`;
      else timeDifferenceText = 'On time';
    }

    const navLog = {
      destination: { address: destination.address || 'Unknown', coordinates: { latitude: destLat, longitude: destLng } },
      startedAt: new Date(),
      estimatedDistance: distance,
      estimatedDuration: duration,
      usedGoogle: !!routePolyline
    };

    journey.navigationHistory.push(navLog);
    await journey.save();

    const customerDoc = delivery.customerId;

    const customerName = customerDoc
      ? (customerDoc.name ||
        customerDoc.fullName ||
        [customerDoc.firstName, customerDoc.lastName].filter(Boolean).join(' ').trim() ||
        'Unknown Customer')
      : 'Unknown Customer';

    const customerPhone = customerDoc?.phone || customerDoc?.mobile || customerDoc?.number || null;

    const salesmanName = driver.name ||
      driver.fullName ||
      [driver.firstName, driver.lastName].filter(Boolean).join(' ').trim() ||
      driver.username ||
      'Salesman';

    const salesmanPhone = driver.phone || driver.mobile || null;

    return successResponse(res, 'Navigation data ready', {
      currentLocation: currentLatitude && currentLongitude ? {
        latitude: parseFloat(currentLatitude),
        longitude: parseFloat(currentLongitude)
      } : null,

      destination: {
        address: destination.address || 'Unknown Address',
        coordinates: { latitude: destLat, longitude: destLng }
      },

      routePolyline: routePolyline || null,

      distance: distance ? `${distance.toFixed(1)} km` : 'Calculating...',
      durationMinutes: duration,
      estimatedTime: duration ? `${duration} mins` : 'N/A',

      currentStop: {
        number: 1,
        deliveryNumber: delivery.deliveryNumber || 'N/A',
        trackingNumber: delivery.trackingNumber || 'N/A',
        companyName: delivery.companyName || customerName || 'Customer',
        address: destination.address || 'Address not available',
        eta: duration ? `${duration} Mins` : 'N/A',
        status: 'In_transit'
      },

      customer: {
        name: customerName,
        phone: customerPhone
      },

      salesman: {
        name: salesmanName,
        phone: salesmanPhone
      },

      navigationHistoryId: journey.navigationHistory[journey.navigationHistory.length - 1]._id,
      isGoogleData: !!routePolyline,

      actualMetrics: {
        traveledDistance: `${actualDistance.toFixed(2)} km`,
        timeTaken: `${actualMinutes} mins`,
        averageSpeed: `${averageSpeed} km/h`,
        timeDifference: timeDifferenceText || 'N/A'
      }
    });

  } catch (error) {
    console.error('Get Navigation Error:', error);
    return errorResponse(res, 'Failed to fetch navigation data', 500);
  }
};

// ==================== UPLOAD RECORDING ====================
exports.uploadRecording = async (req, res) => {
  try {
    const { journeyId } = req.params;
    const { type, caption, waypointIndex } = req.body;

    if (!req.file) {
      return errorResponse(res, 'Recording file is required', 400);
    }

    const driver = req.user;
    const journey = await Journey.findById(journeyId);

    if (!journey) {
      return errorResponse(res, 'Journey not found', 404);
    }

    if (journey.driverId.toString() !== driver._id.toString()) {
      return errorResponse(res, 'Unauthorized', 403);
    }

    const recordingUrl = `/uploads/recordings/${req.file.filename}`;

    const recording = {
      recordingId: `REC_${Date.now()}`,
      type: type || 'screenshot',
      url: recordingUrl,
      timestamp: new Date(),
      waypointIndex: waypointIndex ? parseInt(waypointIndex) : null,
      fileSize: req.file.size,
      duration: req.body.duration || null,
      isHidden: false
    };

    journey.recordings.push(recording);
    await journey.save();

    return successResponse(res, 'Recording uploaded successfully', {
      recording: journey.recordings[journey.recordings.length - 1],
      totalRecordings: journey.recordings.length
    });

  } catch (error) {
    console.error('Upload Recording Error:', error.message);
    return errorResponse(res, error.message || 'Failed to upload recording', 500);
  }
};

// ==================== GET COMMUNICATION HISTORY ====================
exports.getCommunicationHistory = async (req, res) => {
  try {
    const { journeyId } = req.params;
    const { type } = req.query;

    const driver = req.user;
    const journey = await Journey.findById(journeyId)
      .populate('deliveryId', 'trackingNumber recipientName recipientPhone');

    if (!journey) {
      return errorResponse(res, 'Journey not found', 404);
    }

    if (journey.driverId.toString() !== driver._id.toString()) {
      return errorResponse(res, 'Unauthorized', 403);
    }

    let communicationLog = journey.communicationLog;

    if (type) {
      communicationLog = communicationLog.filter(log => log.type === type);
    }

    const formattedLog = communicationLog.map(log => ({
      id: log._id,
      type: log.type,
      contactName: log.contactName,
      phoneNumber: log.phoneNumber,
      timestamp: log.timestamp,
      duration: log.duration ? `${log.duration} seconds` : 'N/A',
      status: log.status,
      remarks: log.remarks
    }));

    const summary = {
      totalCalls: journey.communicationLog.filter(log => log.type === 'call').length,
      totalWhatsApp: journey.communicationLog.filter(log => log.type === 'whatsapp').length,
      totalSMS: journey.communicationLog.filter(log => log.type === 'sms').length,
      totalDuration: journey.communicationLog
        .filter(log => log.type === 'call' && log.duration)
        .reduce((sum, log) => sum + log.duration, 0)
    };

    return successResponse(res, 'Communication history retrieved', {
      delivery: {
        trackingNumber: journey.deliveryId.trackingNumber,
        recipientName: journey.deliveryId.recipientName,
        recipientPhone: journey.deliveryId.recipientPhone
      },
      summary,
      communicationLog: formattedLog
    });

  } catch (error) {
    console.error('Get Communication History Error:', error.message);
    return errorResponse(res, error.message || 'Failed to get communication history', 500);
  }
};

// ==================== UPLOAD PROOF SIGNATURE ====================
exports.uploadProofSignature = async (req, res) => {
  try {
    const { deliveryId } = req.params;

    if (!req.file) {
      return errorResponse(res, 'Signature image is required', 400);
    }

    const delivery = await Delivery.findById(deliveryId);

    if (!delivery) {
      return errorResponse(res, 'Delivery not found', 404);
    }

    if (delivery.driverId.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'Unauthorized: Not assigned to you', 403);
    }

    const signatureUrl = `/uploads/signatures/${req.file.filename}`;

    delivery.deliveryProof = delivery.deliveryProof || {};
    delivery.deliveryProof.signature = signatureUrl;
    delivery.deliveryProof.signedAt = new Date();

    delivery.status = 'Delivered';
    delivery.actualDeliveryTime = new Date();

    await delivery.save();

    const journey = await Journey.findOne({ deliveryId: delivery._id });

    if (journey) {
      journey.deliveryProof = journey.deliveryProof || {};
      journey.deliveryProof.signature = signatureUrl;
      journey.deliveryProof.signedAt = new Date();
      journey.status = 'Completed';

      await journey.save();
    }

    await DeliveryStatusHistory.create({
      deliveryId: delivery._id,
      status: 'Delivered',
      location: delivery.deliveryProof.location || null,
      remarks: 'Customer signature obtained',
      updatedBy: {
        userId: req.user._id,
        userRole: 'driver',
        userName: req.user.name
      }
    });

    return successResponse(res, 'Signature uploaded! Delivery marked as delivered.', {
      signatureUrl,
      deliveryStatus: delivery.status,
      journeyStatus: journey?.status || null
    });

  } catch (error) {
    console.error('Upload Signature Error:', error);
    return errorResponse(res, 'Failed to upload signature', 500);
  }
};

// ==================== UPLOAD PROOF PHOTOS ====================
exports.uploadProofPhotos = async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const { recipientName, mobileNumber, remarks = '' } = req.body;

    if (!deliveryId || typeof deliveryId !== 'string' || deliveryId.length < 18) {
      return errorResponse(res, 'Invalid delivery ID format', 400);
    }

    if (!mongoose.Types.ObjectId.isValid(deliveryId)) {
      return errorResponse(res, 'Invalid delivery ID (not a valid ObjectId)', 400);
    }

    if (!recipientName?.trim()) {
      return errorResponse(res, 'Recipient name is required', 400);
    }
    if (!mobileNumber?.trim()) {
      return errorResponse(res, 'Mobile number is required', 400);
    }

    const delivery = await Delivery.findById(deliveryId)
      .populate({
        path: 'customerId',
        select: 'companyName name locations phone email'
      });

    if (!delivery) {
      return errorResponse(res, 'Delivery not found', 404);
    }

    if (delivery.driverId?.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'Unauthorized – You are not the assigned driver', 403);
    }

    let proofPhotos = [];
    if (req.files?.photos && Array.isArray(req.files.photos)) {
      proofPhotos = req.files.photos.map(file => `/uploads/proof/${file.filename}`);
    }

    let companyStampUrl = null;
    let stampUploadedAt = null;

    if (req.files?.companyStamp && req.files.companyStamp.length > 0) {
      const stampFile = req.files.companyStamp[0];
      companyStampUrl = `/uploads/stamps/${stampFile.filename}`;
      stampUploadedAt = new Date();
    }

    let remarkId = null;
    let remarkText = remarks.trim() || null;

    if (remarkText) {
      const newRemark = new Remark({
        remarkType: 'custom',
        remarkText,
        category: 'delivery_status',
        severity: 'low',
        isPredefined: false,
        isActive: true,
        createdBy: req.user._id,
        approvalStatus: 'approved',
        requiresApproval: false,
        usageCount: 1,
        lastUsedAt: new Date(),
        associatedDeliveries: [delivery._id]
      });
      const savedRemark = await newRemark.save();
      remarkId = savedRemark._id;
    }

    delivery.status = 'Proof_uploaded';

    delivery.deliveryProof = {
      photos: proofPhotos,
      photosTakenAt: proofPhotos.length > 0 ? new Date() : null,
      recipientName: recipientName.trim(),
      mobileNumber: mobileNumber.trim(),
      companyStamp: companyStampUrl,
      companyStampUploadedAt: stampUploadedAt,
      remarks: remarkText,
      remarkId,
      uploadedBy: req.user._id,
      uploadedAt: new Date()
    };

    await delivery.save();

    const journey = await Journey.findOneAndUpdate(
      { deliveryId: delivery._id },
      {
        $set: {
          status: 'Proof_uploaded',
          deliveryProof: {
            photos: proofPhotos,
            photosTakenAt: delivery.deliveryProof.photosTakenAt,
            recipientName: recipientName.trim(),
            mobileNumber: mobileNumber.trim(),
            companyStamp: companyStampUrl,
            companyStampUploadedAt: stampUploadedAt,
            remarks: remarkText,
            remarkId,
            uploadedAt: new Date()
          }
        }
      },
      { new: true }
    );

    await DeliveryStatusHistory.create({
      deliveryId: delivery._id,
      status: 'Proof_uploaded',
      location: delivery.currentLocation || null,
      remarks: 'Proof photos, recipient details and company stamp uploaded',
      updatedBy: {
        userId: req.user._id,
        userRole: 'driver',
        userName: req.user.name || 'Driver'
      }
    });

    const customer = delivery.customerId || {};
    const companyName = customer.companyName || customer.name || 'N/A';
    let deliveryAddress = 'N/A';

    if (customer.locations?.length > 0) {
      const primary = customer.locations.find(l => l.isPrimary) || customer.locations[0];
      deliveryAddress = [
        primary.addressLine1,
        primary.addressLine2,
        primary.city,
        primary.state,
        primary.zipcode,
        primary.country
      ].filter(Boolean).join(', ') || 'N/A';
    }

    return successResponse(res, 'Delivery proof uploaded successfully', {
      deliveryId: delivery._id,
      deliveryStatus: delivery.status,
      journeyStatus: journey?.status || null,

      proof: {
        photos: proofPhotos,
        photosCount: proofPhotos.length,
        companyStamp: companyStampUrl || 'Not uploaded',
        recipientName: recipientName.trim(),
        mobileNumber: mobileNumber.trim(),
        remarks: remarkText || null,
      },

      customer: {
        companyName,
        deliveryAddress,
        customerId: customer._id || null
      },

      uploadedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Upload Proof Photos Error:', error);
    return errorResponse(res, error.message || 'Failed to upload delivery proof', 500);
  }
};

// ==================== COMPLETE DELIVERY ====================
// exports.completeDelivery = async (req, res) => {
//   try {
//     const { journeyId } = req.params;
//     const { latitude, longitude } = req.body;

//     if (!latitude || !longitude) {
//       return errorResponse(res, 'Location coordinates required', 400);
//     }

//     const journey = await Journey.findById(journeyId)
//       .populate({
//         path: 'deliveryId',
//         populate: {
//           path: 'customerId',
//           select: 'companyName name locations billingAddress'
//         }
//       });

//     if (!journey) return errorResponse(res, 'Journey not found', 404);

//     if (journey.driverId.toString() !== req.user._id.toString()) {
//       return errorResponse(res, 'Unauthorized', 403);
//     }

//     const now = new Date();
//     const actualDurationMs = now - new Date(journey.startTime);
//     const actualMinutes = Math.round(actualDurationMs / 60000);

//     const estimatedMin = journey.estimatedDurationFromGoogle;
//     let timeDifferenceText = '';
//     if (estimatedMin !== null) {
//       const diff = actualMinutes - estimatedMin;
//       if (diff > 5) timeDifferenceText = `Delayed by ${diff} mins`;
//       else if (diff < -5) timeDifferenceText = `Ahead by ${Math.abs(diff)} mins`;
//       else timeDifferenceText = 'On time';
//     }

//     journey.status = 'Arrived';
//     journey.endTime = now;
//     journey.endLocation = {
//       coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
//       address: 'Driver reached delivery location'
//     };
//     journey.totalDuration = actualMinutes;
//     await journey.save();

//     const delivery = journey.deliveryId;
//     delivery.status = 'Arrived';
//     await delivery.save();

//     await DeliveryStatusHistory.create({
//       deliveryId: delivery._id,
//       status: 'Arrived',
//       location: {
//         coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
//         address: 'Driver reached delivery location'
//       },
//       remarks: 'Driver reached destination and marked delivery as completed. Awaiting final signature/confirmation.',
//       updatedBy: {
//         userId: req.user._id,
//         userRole: 'driver',
//         userName: req.user.name
//       }
//     });

//     const customer = delivery.customerId;

//     let companyName = 'N/A';
//     let deliveryAddress = 'N/A';

//     if (customer) {
//       companyName = customer.companyName || customer.name || 'N/A';

//       if (customer.locations?.length > 0) {
//         const primaryLoc = customer.locations.find(loc => loc.isPrimary) || customer.locations[0];

//         deliveryAddress = [
//           primaryLoc.addressLine1,
//           primaryLoc.addressLine2 || '',
//           primaryLoc.city,
//           primaryLoc.state,
//           primaryLoc.zipcode,
//           primaryLoc.country
//         ]
//           .filter(Boolean)
//           .join(', ') || 'N/A';
//       }
//     }

//     const arrivalTime = now.toLocaleString('en-IN', {
//       timeZone: 'Asia/Kolkata',
//       dateStyle: 'medium',
//       timeStyle: 'short'
//     });

//     return successResponse(res, 'Delivery marked as completed! Please collect customer signature if pending.', {
//       journeyId: journey._id,
//       deliveryId: delivery._id.toString(),
//       journeyStatus: journey.status,
//       deliveryStatus: delivery.status,
//       location: { latitude, longitude },

//       customer: {
//         companyName,
//         deliveryAddress,
//         customerId: delivery.customerId,
//       },

//       arrivalTime,
//       arrivalTimeISO: now.toISOString(),

//       nextStep: 'upload-signature',
//       message: 'Signature still required to finalize delivery',

//       timing: {
//         actualTimeTaken: `${actualMinutes} mins`,
//         estimatedTime: estimatedMin ? `${estimatedMin} mins` : 'N/A',
//         difference: timeDifferenceText || 'N/A',
//         startTime: journey.startTime.toISOString(),
//         arrivedAt: now.toISOString()
//       }
//     });

//   } catch (error) {
//     console.error('Complete Delivery Error:', error);
//     return errorResponse(res, 'Failed to mark delivery as completed', 500);
//   }
// };

exports.completeDelivery = async (req, res) => {
  try {
    const { journeyId } = req.params;
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return errorResponse(res, 'Location coordinates required', 400);
    }

    const journey = await Journey.findById(journeyId)
      .populate({
        path: 'deliveryId',
        populate: {
          path: 'customerId',
          select: 'companyName name locations billingAddress'
        }
      });

    if (!journey) return errorResponse(res, 'Journey not found', 404);

    if (journey.driverId.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'Unauthorized', 403);
    }

    const now = new Date();
    const actualDurationMs = now - new Date(journey.startTime);
    const actualMinutes = Math.round(actualDurationMs / 60000);

    const estimatedMin = journey.estimatedDurationFromGoogle;
    let timeDifferenceText = '';
    if (estimatedMin !== null) {
      const diff = actualMinutes - estimatedMin;
      if (diff > 5) timeDifferenceText = `Delayed by ${diff} mins`;
      else if (diff < -5) timeDifferenceText = `Ahead by ${Math.abs(diff)} mins`;
      else timeDifferenceText = 'On time';
    }

    journey.status = 'Arrived';
    journey.endTime = now;
    journey.endLocation = {
      coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
      address: 'Driver reached delivery location'
    };
    journey.totalDuration = actualMinutes;
    await journey.save();

    const delivery = journey.deliveryId;
    delivery.status = 'Arrived';
    await delivery.save();

    await DeliveryStatusHistory.create({
      deliveryId: delivery._id,
      status: 'Arrived',
      location: {
        coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
        address: 'Driver reached delivery location'
      },
      remarks: 'Driver reached destination and marked delivery as completed. Awaiting final signature/confirmation.',
      updatedBy: {
        userId: req.user._id,
        userRole: 'driver',
        userName: req.user.name
      }
    });

    const customer = delivery.customerId;

    let companyName = 'N/A';
    let deliveryAddress = 'N/A';

    if (customer) {
      companyName = customer.companyName || customer.name || 'N/A';

      if (customer.locations?.length > 0) {
        const primaryLoc = customer.locations.find(loc => loc.isPrimary) || customer.locations[0];

        deliveryAddress = [
          primaryLoc.addressLine1,
          primaryLoc.addressLine2 || '',
          primaryLoc.city,
          primaryLoc.state,
          primaryLoc.zipcode,
          primaryLoc.country
        ]
          .filter(Boolean)
          .join(', ') || 'N/A';
      }
    }

    const arrivalTime = now.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    return successResponse(res, 'Delivery marked as completed! Please collect customer signature if pending.', {
      journeyId: journey._id,
      deliveryId: delivery._id.toString(),
      journeyStatus: journey.status,
      deliveryStatus: delivery.status,
      location: { latitude, longitude },

      customer: {
        companyName,
        deliveryAddress,
        customerId: delivery.customerId,
      },

      arrivalTime,
      arrivalTimeISO: now.toISOString(),

      nextStep: 'upload-signature',
      message: 'Signature still required to finalize delivery',

      timing: {
        actualTimeTaken: `${actualMinutes} mins`,
        estimatedTime: estimatedMin ? `${estimatedMin} mins` : 'N/A',
        difference: timeDifferenceText || 'N/A',
        startTime: journey.startTime.toISOString(),
        arrivedAt: now.toISOString()
      }
    });

  } catch (error) {
    console.error('Complete Delivery Error:', error);
    return errorResponse(res, 'Failed to mark delivery as completed', 500);
  }
};

// ==================== END JOURNEY ====================
exports.endJourney = async (req, res) => {
  try {
    const { journeyId } = req.params;
    const { latitude, longitude, address, finalRemarks } = req.body;

    if (!latitude || !longitude) {
      return errorResponse(res, 'End location (latitude & longitude) is required', 400);
    }

    const journey = await Journey.findById(journeyId);
    if (!journey) {
      return errorResponse(res, 'Journey not found', 404);
    }

    const driver = req.user;

    if (journey.driverId.toString() !== driver._id.toString()) {
      return errorResponse(res, 'Unauthorized: This journey does not belong to you', 403);
    }

    if (['completed', 'cancelled'].includes(journey.status)) {
      return errorResponse(res, 'Journey already ended', 400);
    }

    let totalDistance = 0;

    if (journey.waypoints && journey.waypoints.length > 0) {
      totalDistance += calculateDistance(
        journey.startLocation.coordinates.latitude,
        journey.startLocation.coordinates.longitude,
        journey.waypoints[0].location.coordinates.latitude,
        journey.waypoints[0].location.coordinates.longitude
      );

      for (let i = 1; i < journey.waypoints.length; i++) {
        const prev = journey.waypoints[i - 1].location.coordinates;
        const curr = journey.waypoints[i].location.coordinates;
        totalDistance += calculateDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
      }

      const lastWaypoint = journey.waypoints[journey.waypoints.length - 1];
      totalDistance += calculateDistance(
        lastWaypoint.location.coordinates.latitude,
        lastWaypoint.location.coordinates.longitude,
        latitude,
        longitude
      );
    } else {
      totalDistance = calculateDistance(
        journey.startLocation.coordinates.latitude,
        journey.startLocation.coordinates.longitude,
        latitude,
        longitude
      );
    }

    const endTime = new Date();
    const durationMs = endTime - new Date(journey.startTime);
    const durationMinutes = Math.round(durationMs / 60000);
    const durationHours = durationMinutes / 60;
    const averageSpeed = durationHours > 0 ? totalDistance / durationHours : 0;

    journey.endLocation = {
      coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
      address: address || 'Delivery completed'
    };
    journey.endTime = endTime;
    journey.status = 'completed';
    journey.totalDistance = parseFloat(totalDistance.toFixed(2));
    journey.totalDuration = durationMinutes;
    journey.averageSpeed = parseFloat(averageSpeed.toFixed(2));
    journey.finalRemarks = finalRemarks || 'Delivery completed successfully';
    await journey.save();

    const delivery = await Delivery.findById(journey.deliveryId);
    if (delivery) {
      delivery.status = 'delivered';
      delivery.actualDeliveryTime = endTime;
      await delivery.save();

      await DeliveryStatusHistory.create({
        deliveryId: delivery._id,
        status: 'delivered',
        location: {
          coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
          address: address || 'Final destination'
        },
        remarks: 'Journey completed by driver',
        updatedBy: {
          userId: driver._id,
          userRole: 'driver',
          userName: driver.name || 'Driver'
        }
      });
    }

    await Driver.findByIdAndUpdate(
      driver._id,
      {
        isAvailable: true,
        currentJourney: null,
        $unset: { activeDelivery: "" }
      },
      { new: true }
    );

    // ────────────────── ✅ SOCKET.IO - JOURNEY ENDED ──────────────────
    const io = req.app.get('io');
    if (io) {
      io.to('admin-room').emit('driver:journey:ended', {
        driverId: driver._id.toString(),
        driverName: driver.name,
        journeyId: journey._id.toString(),
        deliveryId: delivery._id.toString(),
        isAvailable: true,
        status: 'available',
        endLocation: {
          latitude: Number(latitude),
          longitude: Number(longitude),
          address: address || 'Delivery completed'
        },
        timestamp: new Date().toISOString()
      });

      console.log(`✅ [SOCKET] Journey ended broadcast for: ${driver.name}`);
    }
    // ─────────────────────────────────────────────────────────────────

    const communicationLog = journey.communicationLog || [];
    const images = journey.images || [];
    const waypoints = journey.waypoints || [];

    return successResponse(res, 'Journey ended successfully! You are now free for new deliveries', {
      journey: {
        id: journey._id,
        status: journey.status,
        totalDistance: journey.totalDistance + ' km',
        totalDuration: journey.totalDuration + ' mins',
        averageSpeed: journey.averageSpeed + ' km/h',
        totalCheckpoints: waypoints.length,
        totalImages: images.length,
        totalCalls: communicationLog.filter(log => log.type === 'call').length,
        totalWhatsApp: communicationLog.filter(log => log.type === 'whatsapp').length
      },
      driverStatus: 'Available',
      deliveryStatus: delivery?.status || 'delivered'
    });

  } catch (error) {
    console.error('End Journey Error:', error.message);
    return errorResponse(res, error.message || 'Failed to end journey', 500);
  }
};

// ==================== GET ACTIVE JOURNEY ====================
exports.getActiveJourney = async (req, res) => {
  try {
    const driver = req.user;

    const journey = await Journey.findOne({
      driverId: driver._id,
      status: { $in: ['started', 'in_progress'] }
    })
      .populate({
        path: 'deliveryId',
        select: 'trackingNumber status pickupLocation deliveryLocation recipientName recipientPhone packageDetails estimatedDeliveryTime'
      })
      .lean();

    if (!journey) {
      return successResponse(res, 'No active journey found', { journey: null });
    }

    const communicationSummary = {
      totalCalls: journey.communicationLog?.filter(log => log.type === 'call').length || 0,
      totalWhatsApp: journey.communicationLog?.filter(log => log.type === 'whatsapp').length || 0,
      lastCall: journey.communicationLog?.filter(log => log.type === 'call').pop() || null,
      lastWhatsApp: journey.communicationLog?.filter(log => log.type === 'whatsapp').pop() || null
    };

    const response = {
      journeyId: journey._id,
      status: journey.status,
      startTime: journey.startTime,
      duration: journey.totalDuration || Math.round((new Date() - new Date(journey.startTime)) / 60000),
      delivery: {
        trackingNumber: journey.deliveryId?.trackingNumber,
        status: journey.deliveryId?.status,
        recipient: journey.deliveryId?.recipientName,
        phone: journey.deliveryId?.recipientPhone,
        pickup: journey.deliveryId?.pickupLocation,
        destination: journey.deliveryId?.deliveryLocation,
        packageDetails: journey.deliveryId?.packageDetails,
        estimatedTime: journey.deliveryId?.estimatedDeliveryTime
      },
      startLocation: journey.startLocation,
      checkpoints: journey.waypoints?.map((wp, idx) => ({
        index: idx + 1,
        location: wp.location,
        time: wp.timestamp,
        activity: wp.activity,
        remarks: wp.remarks
      })) || [],
      images: journey.images?.map((img, idx) => ({
        index: idx + 1,
        url: img.url,
        caption: img.caption,
        timestamp: img.timestamp,
        type: img.imageType
      })) || [],
      communication: communicationSummary,
      recordings: journey.recordings?.map((rec, idx) => ({
        index: idx + 1,
        type: rec.type,
        url: rec.url,
        timestamp: rec.timestamp
      })) || [],
      totalCheckpoints: journey.waypoints?.length || 0,
      totalImages: journey.images?.length || 0,
      totalRecordings: journey.recordings?.length || 0
    };

    return successResponse(res, 'Active journey retrieved successfully', response);

  } catch (error) {
    console.error('Get Active Journey Error:', error.message);
    return errorResponse(res, 'Failed to retrieve active journey', 500);
  }
};

// ==================== GET JOURNEY DETAILS ====================
exports.getJourneyDetails = async (req, res) => {
  try {
    const { journeyId } = req.params;

    if (!/^[0-9a-fA-F]{24}$/.test(journeyId)) {
      return errorResponse(res, 'Invalid journey ID format', 400);
    }

    const journey = await Journey.findById(journeyId)
      .populate({
        path: 'deliveryId',
        select: 'trackingNumber status pickupLocation deliveryLocation recipientName recipientPhone packageDetails deliveryProof'
      })
      .populate({
        path: 'driverId',
        select: 'name phone vehicleNumber vehicleType profileImage rating'
      })
      .lean();

    if (!journey) {
      return errorResponse(res, 'Journey not found', 404);
    }

    let durationMinutes = journey.totalDuration || 0;
    let distanceKm = journey.totalDistance || 0;
    let avgSpeed = journey.averageSpeed || 0;

    const startTime = new Date(journey.startTime);
    const endTime = journey.endTime ? new Date(journey.endTime) : new Date();

    const actualDurationMs = endTime - startTime;
    durationMinutes = Math.round(actualDurationMs / 60000);

    if (journey.status === 'completed' && journey.totalDistance > 0) {
      distanceKm = Number(journey.totalDistance.toFixed(2));
      avgSpeed = durationMinutes > 0
        ? Number((journey.totalDistance / (durationMinutes / 60)).toFixed(1))
        : 0;
    }

    const hours = Math.floor(durationMinutes / 60);
    const mins = durationMinutes % 60;
    const durationFormatted = hours > 0
      ? `${hours}h ${mins}m`
      : `${mins}m`;

    const isOngoing = !['completed', 'delivered', 'failed', 'cancelled', 'returned'].includes(journey.status);

    const response = {
      journey: {
        id: journey._id,
        status: journey.status,
        startTime: journey.startTime,
        endTime: journey.endTime || null,
        duration: isOngoing ? 'Ongoing' : durationFormatted,
        distance: journey.totalDistance > 0
          ? `${distanceKm} km`
          : (isOngoing ? 'Calculating...' : 'Not recorded'),
        averageSpeed: avgSpeed > 0
          ? `${avgSpeed} km/h`
          : (isOngoing ? 'Calculating...' : 'N/A'),
        startLocation: journey.startLocation,
        endLocation: journey.endLocation || null,
        finalRemarks: journey.finalRemarks || null
      },
      delivery: journey.deliveryId ? {
        trackingNumber: journey.deliveryId.trackingNumber,
        status: journey.deliveryId.status,
        recipient: journey.deliveryId.recipientName,
        phone: journey.deliveryId.recipientPhone,
        pickup: journey.deliveryId.pickupLocation,
        destination: journey.deliveryId.deliveryLocation,
        packageDetails: journey.deliveryId.packageDetails,
        proof: journey.deliveryId.deliveryProof || null
      } : null,
      driver: journey.driverId ? {
        id: journey.driverId._id,
        name: journey.driverId.name,
        phone: journey.driverId.phone,
        vehicle: `${journey.driverId.vehicleType} - ${journey.driverId.vehicleNumber}`,
        profileImage: journey.driverId.profileImage || null,
        rating: journey.driverId.rating || 0
      } : null,
      checkpoints: journey.waypoints?.map((wp, idx) => ({
        number: idx + 1,
        location: wp.location,
        time: wp.timestamp,
        activity: wp.activity,
        remarks: wp.remarks
      })) || [],
      images: journey.images?.map((img, idx) => ({
        number: idx + 1,
        url: img.url,
        caption: img.caption || null,
        timestamp: img.timestamp,
        location: img.location || null,
        type: img.imageType
      })) || [],
      communications: journey.communicationLog?.map((comm, idx) => ({
        number: idx + 1,
        type: comm.type,
        contactName: comm.contactName,
        phoneNumber: comm.phoneNumber,
        timestamp: comm.timestamp,
        duration: comm.duration || 0,
        status: comm.status
      })) || [],
      recordings: journey.recordings?.map((rec, idx) => ({
        number: idx + 1,
        type: rec.type,
        url: rec.url,
        timestamp: rec.timestamp,
        fileSize: rec.fileSize
      })) || [],
      navigation: journey.navigationHistory?.map((nav, idx) => ({
        number: idx + 1,
        destination: nav.destination,
        startedAt: nav.startedAt,
        app: nav.navigationApp,
        estimatedDistance: nav.estimatedDistance,
        estimatedDuration: nav.estimatedDuration
      })) || []
    };

    return successResponse(res, 'Journey details retrieved successfully', response);

  } catch (error) {
    console.error('Get Journey Details Error:', error.message);
    return errorResponse(res, 'Failed to retrieve journey details', 500);
  }
};

// ==================== GET DRIVER JOURNEY HISTORY ====================
exports.getDriverJourneyHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const driver = req.user;

    const query = { driverId: driver._id };
    if (status) query.status = status;

    const journeys = await Journey.find(query)
      .populate({
        path: 'deliveryId',
        select: 'trackingNumber status pickupLocation deliveryLocation'
      })
      .select('status startTime endTime totalDistance totalDuration averageSpeed waypoints images communicationLog recordings')
      .sort({ startTime: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Journey.countDocuments(query);

    const formattedJourneys = journeys.map(j => ({
      journeyId: j._id,
      trackingNumber: j.deliveryId?.trackingNumber || 'N/A',
      status: j.status,
      deliveryStatus: j.deliveryId?.status || 'unknown',
      startTime: j.startTime,
      endTime: j.endTime || null,
      duration: j.totalDuration ? `${j.totalDuration} mins` : 'In Progress',
      distance: j.totalDistance ? `${j.totalDistance.toFixed(2)} km` : 'N/A',
      averageSpeed: j.averageSpeed ? `${j.averageSpeed.toFixed(1)} km/h` : 'N/A',
      pickup: j.deliveryId?.pickupLocation?.address || 'N/A',
      delivery: j.deliveryId?.deliveryLocation?.address || 'N/A',
      totalCheckpoints: j.waypoints?.length || 0,
      totalImages: j.images?.length || 0,
      totalCalls: j.communicationLog?.filter(log => log.type === 'call').length || 0,
      totalWhatsApp: j.communicationLog?.filter(log => log.type === 'whatsapp').length || 0,
      totalRecordings: j.recordings?.length || 0
    }));

    return successResponse(res, 'Journey history retrieved successfully', {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      journeys: formattedJourneys
    });

  } catch (error) {
    console.error('Get Driver Journey History Error:', error.message);
    return errorResponse(res, 'Failed to retrieve journey history', 500);
  }
};

// ==================== CANCEL JOURNEY ====================
exports.cancelJourney = async (req, res) => {
  try {
    const { journeyId } = req.params;
    const { reason, latitude, longitude } = req.body;

    if (!reason) {
      return errorResponse(res, 'Cancellation reason is required', 400);
    }

    const driver = req.user;
    const journey = await Journey.findById(journeyId);

    if (!journey) {
      return errorResponse(res, 'Journey not found', 404);
    }

    if (journey.driverId.toString() !== driver._id.toString()) {
      return errorResponse(res, 'Unauthorized', 403);
    }

    if (!journey.isActive()) {
      return errorResponse(res, 'Journey is not active', 400);
    }

    journey.status = 'cancelled';
    journey.endTime = new Date();
    journey.finalRemarks = `Cancelled: ${reason}`;

    if (latitude && longitude) {
      journey.endLocation = {
        coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
        address: 'Journey cancelled here'
      };
    }

    await journey.save();

    const delivery = await Delivery.findById(journey.deliveryId);
    if (delivery) {
      delivery.status = 'cancelled';
      await delivery.save();

      await DeliveryStatusHistory.create({
        deliveryId: delivery._id,
        status: 'cancelled',
        location: {
          coordinates: {
            latitude: Number(latitude) || 0,
            longitude: Number(longitude) || 0
          },
          address: 'Journey cancelled'
        },
        remarks: `Journey cancelled by driver: ${reason}`,
        updatedBy: {
          userId: driver._id,
          userRole: 'driver',
          userName: driver.name
        }
      });
    }

    await Driver.findByIdAndUpdate(
      driver._id,
      {
        isAvailable: true,
        currentJourney: null,
        $unset: { activeDelivery: "" }
      }
    );

    return successResponse(res, 'Journey cancelled successfully', {
      journeyId: journey._id,
      status: journey.status,
      reason: journey.finalRemarks,
      driverStatus: 'Available'
    });

  } catch (error) {
    console.error('Cancel Journey Error:', error.message);
    return errorResponse(res, error.message || 'Failed to cancel journey', 500);
  }
};

module.exports = exports;