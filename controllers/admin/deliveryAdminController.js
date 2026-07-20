// const Delivery = require('../../models/Delivery');
// const Order = require('../../models/Order');
// const Driver = require('../../models/Driver');
// const Customer = require('../../models/Customer');
// const DeliveryStatusHistory = require('../../models/DeliveryStatusHistory');
// const Notification = require('../../models/Notification');
// const mongoose = require('mongoose');
// const { successResponse, errorResponse } = require('../../utils/responseHelper');
// const { sendNotification } = require("../../utils/sendNotification")
// const { getSortedUpcomingForDriver } = require('../Driver/deliveryController');  


// // ============= RENDER DELIVERIES LIST =============
// // exports.renderDeliveriesList = async (req, res) => {
// //   try {
// //     const {
// //       page = 1,
// //       limit = 20,
// //       status,
// //       search,
// //       startDate,
// //       endDate
// //     } = req.query;

// //     const query = {};
// //     if (status) query.status = status;

// //     if (search) {
// //       query.$or = [
// //         { trackingNumber: { $regex: search, $options: 'i' } },
// //         { orderId: { $regex: search, $options: 'i' } }
// //       ];
// //     }

// //     if (startDate || endDate) {
// //       query.createdAt = {};
// //       if (startDate) query.createdAt.$gte = new Date(startDate);
// //       if (endDate) query.createdAt.$lte = new Date(endDate);
// //     }

// //     const skip = (parseInt(page) - 1) * parseInt(limit);

// //     const deliveries = await Delivery.find(query)
// //       .populate({
// //         path: 'customerId',
// //         model: 'Customer',
// //         select: 'name email phone companyName customerId'
// //       })
// //       .populate('driverId', 'name phone vehicleNumber')
// //       .sort({ createdAt: -1 })
// //       .skip(skip)
// //       .limit(parseInt(limit))
// //       .lean();

// //     const total = await Delivery.countDocuments(query);

// //     const stats = await Delivery.aggregate([
// //       {
// //         $facet: {
// //           total: [{ $count: 'count' }],
// //           delivered: [{ $match: { status: 'delivered' } }, { $count: 'count' }],
// //           inTransit: [
// //             { $match: { status: { $in: ['in_transit', 'assigned', 'picked_up', 'out_for_delivery'] } } },
// //             { $count: 'count' }
// //           ],
// //           pending: [{ $match: { status: { $in: ['pending', 'pending_acceptance'] } } }, { $count: 'count' }]
// //         }
// //       }
// //     ]);

// //     const statistics = {
// //       total: stats[0].total[0]?.count || 0,
// //       delivered: stats[0].delivered[0]?.count || 0,
// //       inTransit: stats[0].inTransit[0]?.count || 0,
// //       pending: stats[0].pending[0]?.count || 0
// //     };

// //     res.render('deliveries_list', {
// //       title: 'Deliveries Management',
// //       user: req.user,
// //       deliveries,
// //       stats: statistics,
// //       pagination: {
// //         total,
// //         page: parseInt(page),
// //         pages: Math.ceil(total / parseInt(limit)),
// //         limit: parseInt(limit)
// //       },
// //       filters: { status, search, startDate, endDate },
// //       url: req.originalUrl,
// //       messages: req.flash()
// //     });

// //   } catch (error) {
// //     console.error('[DELIVERIES-LIST] Error:', error);
// //     req.flash('error', 'Failed to load deliveries');
// //     res.redirect('/admin/dashboard');
// //   }
// // };

// // ============= RENDER DELIVERIES LIST =============
// exports.renderDeliveriesList = async (req, res) => {
//   try {
//     const {
//       page = 1,
//       limit = 20,
//       status,
//       search,
//       startDate,
//       endDate,
//       driverId
//     } = req.query;

//     const query = {};
//     if (status) query.status = status;
//     if (driverId) query.driverId = driverId;

//     if (search) {
//       query.$or = [
//         { trackingNumber: { $regex: search, $options: 'i' } },
//         { orderId: { $regex: search, $options: 'i' } }
//       ];
//     }

//     if (startDate || endDate) {
//       query.createdAt = {};
//       if (startDate) query.createdAt.$gte = new Date(startDate);
//       if (endDate) query.createdAt.$lte = new Date(endDate);
//     }

//     let deliveries = await Delivery.find(query)
//       .populate('customerId', 'name email phone companyName customerId')
//       .populate('driverId', 'name phone vehicleNumber currentLocation')
//       .lean();

//     // === Proximity Sorting ===
//     const driverGroups = {};
//     for (const del of deliveries) {
//       const dId = del.driverId?._id?.toString() || 'unassigned';
//       if (!driverGroups[dId]) driverGroups[dId] = [];
//       driverGroups[dId].push(del);
//     }

//     let finalDeliveries = [];

//     for (const [dId, group] of Object.entries(driverGroups)) {
//       if (dId === 'unassigned') {
//         finalDeliveries.push(...group);
//         continue;
//       }

//       try {
//         const sorted = await getSortedUpcomingForDriver(dId);
//         const upcomingMap = new Map(sorted.upcoming.map(item => [item.id, item]));

//         const orderedGroup = group
//           .map(del => {
//             const sortedItem = upcomingMap.get(del._id.toString());
//             return {
//               ...del,
//               __nearestRank: sortedItem ? sortedItem.nearestRank : 999,
//               __distance: sortedItem ? sortedItem.distanceFromDriver : null,
//               __hasRank: !!sortedItem,
//               deliveryLocation: del.deliveryLocation
//             };
//           })
//           .sort((a, b) => (a.__nearestRank || 999) - (b.__nearestRank || 999));

//         // ✅ Pickup Location ab route-chain ke hisaab se set hoti hai:
//         // Rank #1 (chain ki pehli delivery) → "Factory (Start)" label
//         // Rank #2, #3... → chain mein unse turant pehle wali delivery ka deliveryLocation
//         // Jinke paas rank nahi hai (completed/unassigned) → unka original pickup as-is
//         // (Same wording jo Route Chain widget mein use hoti hai, list view mein bhi consistent dikhegi)
//         let previousInChain = null;
//         for (const del of orderedGroup) {
//           if (del.__hasRank && previousInChain) {
//             del.pickupLocation = previousInChain.deliveryLocation;
//           } else if (del.__hasRank) {
//             // Chain ki sabse pehli delivery — yehi factory se start ho rahi hai
//             const originalPickup = del.originalPickupLocation || del.pickupLocation;
//             del.pickupLocation = { ...originalPickup, address: 'Factory (Start)' };
//           } else {
//             del.pickupLocation = del.originalPickupLocation || del.pickupLocation;
//           }
//           if (del.__hasRank) {
//             previousInChain = del;
//           }
//         }

//         finalDeliveries.push(...orderedGroup);

//       } catch (e) {
//         console.error(`Sorting failed for driver ${dId}`, e.message);
//         finalDeliveries.push(...group);
//       }
//     }

//     const skip = (parseInt(page) - 1) * parseInt(limit);
//     const paginatedDeliveries = finalDeliveries.slice(skip, skip + parseInt(limit));

//     // Stats
//     const stats = await Delivery.aggregate([{
//       $facet: {
//         total: [{ $count: 'count' }],
//         delivered: [{ $match: { status: 'delivered' } }, { $count: 'count' }],
//         inTransit: [{ $match: { status: { $in: ['in_transit', 'assigned', 'picked_up', 'out_for_delivery'] } } }, { $count: 'count' }],
//         pending: [{ $match: { status: { $in: ['pending', 'pending_acceptance'] } } }, { $count: 'count' }]
//       }
//     }]);

//     const statistics = {
//       total: stats[0].total[0]?.count || 0,
//       delivered: stats[0].delivered[0]?.count || 0,
//       inTransit: stats[0].inTransit[0]?.count || 0,
//       pending: stats[0].pending[0]?.count || 0
//     };

//     res.render('deliveries_list', {
//       title: 'Deliveries Management',
//       user: req.user,
//       deliveries: paginatedDeliveries,
//       stats: statistics,
//       pagination: {
//         total: finalDeliveries.length,
//         page: parseInt(page),
//         pages: Math.ceil(finalDeliveries.length / parseInt(limit)),
//         limit: parseInt(limit)
//       },
//       filters: { status, search, startDate, endDate, driverId },
//       url: req.originalUrl,
//       messages: req.flash()
//     });

//   } catch (error) {
//     console.error('[DELIVERIES-LIST] Error:', error);
//     req.flash('error', 'Failed to load deliveries');
//     res.redirect('/admin/dashboard');
//   }
// };
// // ============= RENDER DELIVERY DETAILS =============
// // exports.renderDeliveryDetails = async (req, res) => {
// //   try {
// //     const { deliveryId } = req.params;

// //     if (!mongoose.Types.ObjectId.isValid(deliveryId)) {
// //       req.flash('error', 'Invalid delivery ID');
// //       return res.redirect('/admin/deliveries');
// //     }

// //     const delivery = await Delivery.findById(deliveryId)
// //       .populate({
// //         path: 'customerId',
// //         model: 'Customer',
// //         select: 'name email phone companyName customerId'
// //       })
// //       .populate({
// //         path: 'driverId',
// //         select: 'name phone vehicleNumber profileImage currentLocation'
// //       })
// //       .populate('createdBy', 'name email')
// //       .lean();

// //     if (!delivery) {
// //       req.flash('error', 'Delivery not found');
// //       return res.redirect('/admin/deliveries');
// //     }

// //     // Get status history
// //     const statusHistory = await DeliveryStatusHistory.find({ deliveryId: delivery._id })
// //       .sort({ timestamp: -1 })
// //       .populate('updatedBy.userId', 'name email')
// //       .lean();

// //     res.render('delivery_details', {
// //       title: `Delivery ${delivery.trackingNumber}`,
// //       user: req.user,
// //       delivery,
// //       statusHistory,
// //       url: req.originalUrl,
// //       messages: req.flash()
// //     });

// //   } catch (error) {
// //     console.error('[DELIVERY-DETAILS] Error:', error);
// //     req.flash('error', 'Failed to load delivery details');
// //     res.redirect('/admin/deliveries');
// //   }
// // };

// // ============= RENDER DELIVERY DETAILS =============


// // ============= RENDER CREATE DELIVERY FROM ORDER =============


// // ============================================================
// // TOP OF FILE — add this import along with the others
// // (Delivery, Order, Driver, Customer, etc.)
// // ============================================================
// // const { getSortedUpcomingForDriver } = require('../Driver/deliveryController');


// exports.renderDeliveryDetails = async (req, res) => {
//   try {
//     const { deliveryId } = req.params;

//     if (!mongoose.Types.ObjectId.isValid(deliveryId)) {
//       req.flash('error', 'Invalid delivery ID');
//       return res.redirect('/admin/deliveries');
//     }

//     const delivery = await Delivery.findById(deliveryId)
//       .populate({
//         path: 'customerId',
//         model: 'Customer',
//         select: 'name email phone companyName customerId'
//       })
//       .populate({
//         path: 'driverId',
//         select: 'name phone vehicleNumber profileImage currentLocation'
//       })
//       .populate('createdBy', 'name email')
//       .lean();

//     if (!delivery) {
//       req.flash('error', 'Delivery not found');
//       return res.redirect('/admin/deliveries');
//     }

//     // ================================================================
//     // ✅ STRONG FIXED ROUTE CHAIN LOGIC
//     // ================================================================
//     let effectivePickupLocation = delivery.pickupLocation;
//     let routeChain = [];

//     if (delivery.driverId) {
//       try {
//         const driverIdForSort = delivery.driverId._id || delivery.driverId;
//         const sorted = await getSortedUpcomingForDriver(driverIdForSort);

//         // ✅ Bahut Strong Filter
//         const validUpcoming = sorted.upcoming.filter(u => {
//           const status = String(u.status || '').toLowerCase().trim();
//           return !['delivered', 'completed', 'cancelled', 'Delivered', 'Completed', 'Cancelled'].includes(status);
//         });

//         const myIndex = validUpcoming.findIndex(u => u.id === delivery._id.toString());

//         console.log(`[DELIVERY-DETAILS] Valid Upcoming: ${validUpcoming.length} | My Rank: ${myIndex >= 0 ? myIndex + 1 : 'Not Found'}`);

//         // Route Chain Build
//         routeChain.push({ label: 'Factory (Start)', isFactory: true, isCurrent: false });

//         validUpcoming.forEach((u) => {
//           routeChain.push({
//             label: u.trackingNumber,
//             isFactory: false,
//             isCurrent: u.id === delivery._id.toString()
//           });
//         });

//         // Effective Pickup Logic - Sirf Active Delivery se
//         if (myIndex > 0) {
//           const previousItem = validUpcoming[myIndex - 1];
//           const previousDoc = await Delivery.findById(previousItem.id)
//             .select('deliveryLocation trackingNumber status')
//             .lean();

//           const prevStatus = String(previousDoc?.status || '').toLowerCase().trim();

//           if (previousDoc && !['delivered', 'completed', 'cancelled'].includes(prevStatus)) {
//             effectivePickupLocation = previousDoc.deliveryLocation;
//             console.log(`[DELIVERY-DETAILS] Pickup chained from active delivery: ${previousDoc.trackingNumber}`);
//           } else {
//             console.log(`[DELIVERY-DETAILS] Previous delivery was already delivered - Using original pickup`);
//           }
//         } else if (myIndex === 0) {
//           // ✅ Chain ki sabse pehli delivery — List page jaisa hi "Factory (Start)" label
//           const originalPickup = delivery.originalPickupLocation || delivery.pickupLocation;
//           effectivePickupLocation = { ...originalPickup, address: 'Factory (Start)' };
//           console.log(`[DELIVERY-DETAILS] Rank #1 - Factory (Start) label lagaya`);
//         } else {
//           console.log(`[DELIVERY-DETAILS] Active chain mein nahi mila (completed/cancelled) - stored pickup as-is`);
//         }

//       } catch (err) {
//         console.error('[DELIVERY-DETAILS] Chain resolution failed:', err.message);
//       }
//     }

//     delivery.pickupLocation = effectivePickupLocation;

//     // Status History
//     const statusHistory = await DeliveryStatusHistory.find({ deliveryId: delivery._id })
//       .sort({ timestamp: -1 })
//       .populate('updatedBy.userId', 'name email')
//       .lean();

//     res.render('delivery_details', {
//       title: `Delivery ${delivery.trackingNumber}`,
//       user: req.user,
//       delivery,
//       statusHistory,
//       routeChain,
//       url: req.originalUrl,
//       messages: req.flash()
//     });

//   } catch (error) {
//     console.error('[DELIVERY-DETAILS] Error:', error);
//     req.flash('error', 'Failed to load delivery details');
//     res.redirect('/admin/deliveries');
//   }
// };
 
// // ============= RENDER CREATE DELIVERY FROM ORDER =============
// exports.renderCreateDeliveryFromOrder = async (req, res) => {
//   try {
//     const { orderId } = req.params;
 
//     if (!mongoose.Types.ObjectId.isValid(orderId)) {
//       req.flash('error', 'Invalid order ID');
//       return res.redirect('/admin/orders');
//     }
 
//     const order = await Order.findById(orderId)
//       .populate({
//         path: 'customerId',
//         model: 'Customer',
//         select: 'name email phone companyName customerId'
//       })
//       .lean();
 
//     if (!order) {
//       req.flash('error', 'Order not found');
//       return res.redirect('/admin/orders');
//     }
 
//     const existingDelivery = await Delivery.findOne({ orderId: order.orderNumber });
//     if (existingDelivery) {
//       req.flash('error', 'Delivery already exists for this order');
//       return res.redirect(`/admin/deliveries/${existingDelivery._id}`);
//     }
 
//     // Ensure coordinates exist with fallback
//     if (!order.pickupLocation?.coordinates) {
//       order.pickupLocation = order.pickupLocation || {};
//       order.pickupLocation.coordinates = { latitude: 23.0225, longitude: 72.5714 };
//     }
 
//     if (!order.deliveryLocation?.coordinates) {
//       order.deliveryLocation = order.deliveryLocation || {};
//       order.deliveryLocation.coordinates = { latitude: 23.0225, longitude: 72.5714 };
//     }
 
//     // Get available drivers
//     const drivers = await Driver.find({
//       isActive: true,
//       // isAvailable: true,
//       profileStatus: 'approved'
//     })
   
//       .select('name phone vehicleNumber profileImage isAvailable')
//       .lean();
 
//     res.render('delivery_create', {
//       title: `Create Delivery - ${order.orderNumber}`,
//       user: req.user,
//       order,
//       drivers,
//       url: req.originalUrl,
//       messages: req.flash()
//     });
 
//   } catch (error) {
//     console.error('[RENDER-CREATE-DELIVERY] Error:', error);
//     req.flash('error', 'Failed to load create delivery page');
//     res.redirect('/admin/orders');
//   }
// };


// exports.renderCreateDeliveryFromOrder = async (req, res) => {
//   try {
//     const { orderId } = req.params;

//     if (!mongoose.Types.ObjectId.isValid(orderId)) {
//       req.flash('error', 'Invalid order ID');
//       return res.redirect('/admin/orders');
//     }

//     const order = await Order.findById(orderId)
//       .populate({
//         path: 'customerId',
//         model: 'Customer',
//         select: 'name email phone companyName customerId'
//       })
//       .lean();

//     if (!order) {
//       req.flash('error', 'Order not found');
//       return res.redirect('/admin/orders');
//     }

//     const existingDelivery = await Delivery.findOne({ orderId: order.orderNumber });
//     if (existingDelivery) {
//       req.flash('error', 'Delivery already exists for this order');
//       return res.redirect(`/admin/deliveries/${existingDelivery._id}`);
//     }

//     // Ensure coordinates exist with fallback
//     if (!order.pickupLocation?.coordinates) {
//       order.pickupLocation = order.pickupLocation || {};
//       order.pickupLocation.coordinates = { latitude: 23.0225, longitude: 72.5714 };
//     }

//     if (!order.deliveryLocation?.coordinates) {
//       order.deliveryLocation = order.deliveryLocation || {};
//       order.deliveryLocation.coordinates = { latitude: 23.0225, longitude: 72.5714 };
//     }

//     // Get available drivers
//     const drivers = await Driver.find({
//       isActive: true,
//       // isAvailable: true,
//       profileStatus: 'approved'
//     })
   
//       .select('name phone vehicleNumber profileImage isAvailable')
//       .lean();

//     res.render('delivery_create', {
//       title: `Create Delivery - ${order.orderNumber}`,
//       user: req.user,
//       order,
//       drivers,
//       url: req.originalUrl,
//       messages: req.flash()
//     });

//   } catch (error) {
//     console.error('[RENDER-CREATE-DELIVERY] Error:', error);
//     req.flash('error', 'Failed to load create delivery page');
//     res.redirect('/admin/orders');
//   }
// };


// // exports.createDeliveryFromOrder = async (req, res) => {
// //   try {
// //     const { orderId } = req.params;
// //     const {
// //       customerId,
// //       driverId,
// //       scheduledPickupTime,
// //       scheduledDeliveryTime,
// //       instructions,
// //       waypoints,
// //       routeDistance,
// //       routeDuration
// //     } = req.body;

// //     const order = await Order.findById(orderId)
// //       .populate({
// //         path: 'customerId',
// //         model: 'Customer'
// //       });

// //     if (!order) {
// //       req.flash('error', 'Order not found');
// //       return res.redirect('/admin/orders');
// //     }

// //     const existing = await Delivery.findOne({ orderId: order.orderNumber });
// //     if (existing) {
// //       req.flash('error', 'Delivery already exists for this order');
// //       return res.redirect(`/admin/deliveries/${existing._id}`);
// //     }

// //     const driver = await Driver.findById(driverId);
// //     if (!driver) {
// //       req.flash('error', 'Driver not found');
// //       return res.redirect(`/admin/orders/${orderId}/create-delivery`);
// //     }

// //     if (driver.profileStatus !== 'approved') {
// //       req.flash('warning', 'Note: Driver is not approved yet, but assigning anyway');
// //       return res.redirect(`/admin/orders/${orderId}/create-delivery`);
// //     }

// //     // if (!driver.isAvailable) {
// //     //   req.flash('warning', 'Note: Driver is marked as unavailable, but multiple assignments allowed');
// //     // }

// //     // Generate tracking number
// //     const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
// //     const random = Math.floor(1000 + Math.random() * 9000);
// //     const trackingNumber = `DEL${dateStr}${random}`;

// //     // Parse waypoints
// //     let parsedWaypoints = [];
// //     if (waypoints) {
// //       try {
// //         parsedWaypoints = JSON.parse(waypoints);
// //       } catch (e) {
// //         console.error('Waypoints parse error:', e);
// //       }
// //     }

// //     // Safe coordinate extraction (defaulting to Ahmedabad coords)
// //     const pickupCoords = {
// //       latitude: order?.pickupLocation?.coordinates?.latitude || 23.0225,
// //       longitude: order?.pickupLocation?.coordinates?.longitude || 72.5714
// //     };

// //     const deliveryCoords = {
// //       latitude: order?.deliveryLocation?.coordinates?.latitude || 23.0225,
// //       longitude: order?.deliveryLocation?.coordinates?.longitude || 72.5714
// //     };

// //     // Create delivery
// //     const delivery = await Delivery.create({
// //       trackingNumber,
// //       orderId: order.orderNumber,
// //       customerId: order.customerId?._id || null,
// //       driverId,
// //       vehicleNumber: driver.vehicleNumber,
// //       pickupLocation: {
// //         ...order.pickupLocation,
// //         coordinates: pickupCoords
// //       },
// //       deliveryLocation: {
// //         ...order.deliveryLocation,
// //         coordinates: deliveryCoords
// //       },
// //       packageDetails: {
// //         description: order.items?.map(i => i.productName).join(', ') || 'Package',
// //         quantity: order.items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 1,
// //         weight: order.items?.reduce((sum, i) => sum + (i.specifications?.weight || 0), 0) || 0
// //       },
// //       scheduledPickupTime: scheduledPickupTime ? new Date(scheduledPickupTime) : null,
// //       scheduledDeliveryTime: scheduledDeliveryTime ? new Date(scheduledDeliveryTime) : null,
// //       instructions,
// //       waypoints: parsedWaypoints,
// //       distance: parseFloat(routeDistance) || 0,
// //       estimatedDuration: parseInt(routeDuration) || 0,
// //       status: 'assigned',
// //       priority: order.priority || 'medium',
// //       createdBy: req.user._id
// //     });

// //     // Update order
// //     order.deliveryId = delivery._id;
// //     order.status = 'assigned';
// //     await order.save();


// //     // Create status history
// //     await DeliveryStatusHistory.create({
// //       deliveryId: delivery._id,
// //       status: 'assigned',
// //       remarks: `Delivery assigned to ${driver.name} (${driver.vehicleNumber})`,
// //       updatedBy: {
// //         userId: req.user._id,
// //         userRole: req.user.role,
// //         userName: req.user.name
// //       }
// //     });

// //     // Notifications (push + in-app) – yeh same rahega
// //     // 1. Push Notification (FCM)
// //     if (driver.fcmToken) {
// //       const data = {
// //         deliveryId: delivery._id.toString(),
// //         trackingNumber: delivery.trackingNumber,
// //         type: "delivery_assigned",
// //         title: "Delivery Assigned 🚚",
// //         body: `You have a new delivery. Pickup from ${order?.pickupLocation?.address || 'location'}` //${delivery.trackingNumber}
// //       };

// //       sendNotification(driver.fcmToken, data);   // ← assuming your helper accepts token + object
// //     } else {
// //       console.warn(`No FCM token for driver ${driver._id} → assignment notification skipped`);
// //     }

// //     // 2. In-app Notification
// //     try {
// //       const notificationDoc = await Notification.create({
// //         recipientId: driver._id,          // matches your schema
// //         recipientType: 'Driver',          // required for refPath
// //         type: 'delivery_assigned',
// //         title: 'New Delivery Assigned',
// //         message: `You have been assigned delivery. Check details in your app.`, //${delivery.trackingNumber}
// //         referenceId: delivery._id,
// //         referenceModel: 'Delivery',
// //         priority: `${delivery.priority}`,
// //         createdAt: new Date()
// //       });

// //       console.log(`[NOTIF-SUCCESS] In-app notification created → _id: ${notificationDoc._id}`);
// //     } catch (notifErr) {
// //       console.error("[NOTIF-ERROR] Failed to create in-app notification:", notifErr.message || notifErr);
// //     }

// //     console.log('[CREATE-DELIVERY] Success:', delivery.trackingNumber);
// //     req.flash('success', 'Delivery created and driver assigned successfully!');
// //     res.redirect(`/admin/deliveries/${delivery._id}`);

// //   } catch (error) {
// //     console.error('[CREATE-DELIVERY] Error:', error);
// //     req.flash('error', error.message || 'Failed to create delivery');
// //     res.redirect(`/admin/orders/${req.params.orderId}/create-delivery`);
// //   }
// // };
// // exports.createDeliveryFromOrder = async (req, res) => {
// //   try {
// //     const { orderId } = req.params;
// //     const {
// //       customerId,
// //       driverId,
// //       scheduledPickupTime,
// //       scheduledDeliveryTime,
// //       instructions,
// //       waypoints,
// //       routeDistance,
// //       routeDuration
// //     } = req.body;

// //     const order = await Order.findById(orderId)
// //       .populate({
// //         path: 'customerId',
// //         model: 'Customer'
// //       });

// //     if (!order) {
// //       req.flash('error', 'Order not found');
// //       return res.redirect('/admin/orders');
// //     }

// //     const existing = await Delivery.findOne({ orderId: order.orderNumber });
// //     if (existing) {
// //       req.flash('error', 'Delivery already exists for this order');
// //       return res.redirect(`/admin/deliveries/${existing._id}`);
// //     }

// //     const driver = await Driver.findById(driverId);
// //     if (!driver) {
// //       req.flash('error', 'Driver not found');
// //       return res.redirect(`/admin/orders/${orderId}/create-delivery`);
// //     }

// //     if (driver.profileStatus !== 'approved') {
// //       req.flash('warning', 'Note: Driver is not approved yet, but assigning anyway');
// //       return res.redirect(`/admin/orders/${orderId}/create-delivery`);
// //     }

// //     // if (!driver.isAvailable) {
// //     //   req.flash('warning', 'Note: Driver is marked as unavailable, but multiple assignments allowed');
// //     // }

// //     // Generate tracking number
// //     const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
// //     const random = Math.floor(1000 + Math.random() * 9000);
// //     const trackingNumber = `DEL${dateStr}${random}`;

// //     // Parse waypoints
// //     let parsedWaypoints = [];
// //     if (waypoints) {
// //       try {
// //         parsedWaypoints = JSON.parse(waypoints);
// //       } catch (e) {
// //         console.error('Waypoints parse error:', e);
// //       }
// //     }

// //     // ================================================================
// //     // ✅ CHAINING FIX: agar isi driver ki koi pehle se delivery bani hui
// //     // hai (chahe kisi bhi order se ho), to us delivery ka "destination"
// //     // hi is naye delivery ka "pickup point" banega — factory nahi.
// //     // Isse route hamesha Factory→A, A→B, B→C bante hain (Factory→C nahi).
// //     // ================================================================
// //     const previousDeliveryForDriver = await Delivery.findOne({ driverId })
// //       .sort({ createdAt: -1 })
// //       .select('deliveryLocation trackingNumber');

// //     const hasValidPreviousStop = !!(
// //       previousDeliveryForDriver?.deliveryLocation?.coordinates?.latitude &&
// //       previousDeliveryForDriver?.deliveryLocation?.coordinates?.longitude &&
// //       previousDeliveryForDriver?.deliveryLocation?.address
// //     );

// //     // Pickup location decide karo: chain me pichla stop mile to wahi, warna order ka factory pickup
// //     const effectivePickupLocation = hasValidPreviousStop
// //       ? previousDeliveryForDriver.deliveryLocation
// //       : order.pickupLocation;

// //     if (hasValidPreviousStop) {
// //       console.log(`[CREATE-DELIVERY] 🔗 Chained pickup — using previous delivery's destination as pickup: "${previousDeliveryForDriver.deliveryLocation.address}" (from ${previousDeliveryForDriver.trackingNumber})`);
// //     } else {
// //       console.log(`[CREATE-DELIVERY] No previous delivery for this driver — using factory as pickup`);
// //     }

// //     // Safe coordinate extraction (defaulting to Ahmedabad coords)
// //     const pickupCoords = {
// //       latitude: effectivePickupLocation?.coordinates?.latitude || 23.0225,
// //       longitude: effectivePickupLocation?.coordinates?.longitude || 72.5714
// //     };

// //     const deliveryCoords = {
// //       latitude: order?.deliveryLocation?.coordinates?.latitude || 23.0225,
// //       longitude: order?.deliveryLocation?.coordinates?.longitude || 72.5714
// //     };

// //     // Create delivery
// //     const delivery = await Delivery.create({
// //       trackingNumber,
// //       orderId: order.orderNumber,
// //       customerId: order.customerId?._id || null,
// //       driverId,
// //       vehicleNumber: driver.vehicleNumber,
// //       pickupLocation: {
// //         ...effectivePickupLocation,
// //         coordinates: pickupCoords
// //       },
// //       deliveryLocation: {
// //         ...order.deliveryLocation,
// //         coordinates: deliveryCoords
// //       },
// //       // ✅ Chain reference — traceability ke liye (schema me field na ho to Mongoose ise silently ignore kar dega, crash nahi hoga)
// //       previousDeliveryId: previousDeliveryForDriver?._id || null,
// //       packageDetails: {
// //         description: order.items?.map(i => i.productName).join(', ') || 'Package',
// //         quantity: order.items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 1,
// //         weight: order.items?.reduce((sum, i) => sum + (i.specifications?.weight || 0), 0) || 0
// //       },
// //       scheduledPickupTime: scheduledPickupTime ? new Date(scheduledPickupTime) : null,
// //       scheduledDeliveryTime: scheduledDeliveryTime ? new Date(scheduledDeliveryTime) : null,
// //       instructions,
// //       waypoints: parsedWaypoints,
// //       distance: parseFloat(routeDistance) || 0,
// //       estimatedDuration: parseInt(routeDuration) || 0,
// //       status: 'assigned',
// //       priority: order.priority || 'medium',
// //       createdBy: req.user._id
// //     });

// //     // ✅ Pichli delivery ka nextDeliveryId bhi set kar do (chain dono taraf se traceable rahe)
// //     if (previousDeliveryForDriver?._id) {
// //       await Delivery.findByIdAndUpdate(previousDeliveryForDriver._id, { nextDeliveryId: delivery._id });
// //     }

// //     // Update order
// //     order.deliveryId = delivery._id;
// //     order.status = 'assigned';
// //     await order.save();


// //     // Create status history
// //     await DeliveryStatusHistory.create({
// //       deliveryId: delivery._id,
// //       status: 'assigned',
// //       remarks: hasValidPreviousStop
// //         ? `Delivery assigned to ${driver.name} (${driver.vehicleNumber}) — chained pickup from ${previousDeliveryForDriver.trackingNumber}`
// //         : `Delivery assigned to ${driver.name} (${driver.vehicleNumber})`,
// //       updatedBy: {
// //         userId: req.user._id,
// //         userRole: req.user.role,
// //         userName: req.user.name
// //       }
// //     });

// //     // Notifications (push + in-app) – yeh same rahega
// //     // 1. Push Notification (FCM)
// //     if (driver.fcmToken) {
// //       const data = {
// //         deliveryId: delivery._id.toString(),
// //         trackingNumber: delivery.trackingNumber,
// //         type: "delivery_assigned",
// //         title: "Delivery Assigned 🚚",
// //         body: `You have a new delivery. Pickup from ${effectivePickupLocation?.address || 'location'}` //${delivery.trackingNumber}
// //       };

// //       sendNotification(driver.fcmToken, data);   // ← assuming your helper accepts token + object
// //     } else {
// //       console.warn(`No FCM token for driver ${driver._id} → assignment notification skipped`);
// //     }

// //     // 2. In-app Notification
// //     try {
// //       const notificationDoc = await Notification.create({
// //         recipientId: driver._id,          // matches your schema
// //         recipientType: 'Driver',          // required for refPath
// //         type: 'delivery_assigned',
// //         title: 'New Delivery Assigned',
// //         message: `You have been assigned delivery. Check details in your app.`, //${delivery.trackingNumber}
// //         referenceId: delivery._id,
// //         referenceModel: 'Delivery',
// //         priority: `${delivery.priority}`,
// //         createdAt: new Date()
// //       });

// //       console.log(`[NOTIF-SUCCESS] In-app notification created → _id: ${notificationDoc._id}`);
// //     } catch (notifErr) {
// //       console.error("[NOTIF-ERROR] Failed to create in-app notification:", notifErr.message || notifErr);
// //     }

// //     console.log('[CREATE-DELIVERY] Success:', delivery.trackingNumber);
// //     req.flash('success', 'Delivery created and driver assigned successfully!');
// //     res.redirect(`/admin/deliveries/${delivery._id}`);

// //   } catch (error) {
// //     console.error('[CREATE-DELIVERY] Error:', error);
// //     req.flash('error', error.message || 'Failed to create delivery');
// //     res.redirect(`/admin/orders/${req.params.orderId}/create-delivery`);
// //   }
// // };



// // exports.createDeliveryFromOrder = async (req, res) => {
// //   try {
// //     const { orderId } = req.params;
// //     const {
// //       customerId,
// //       driverId,
// //       scheduledPickupTime,
// //       scheduledDeliveryTime,
// //       instructions,
// //       waypoints,
// //       routeDistance,
// //       routeDuration
// //     } = req.body;

// //     const order = await Order.findById(orderId)
// //       .populate({
// //         path: 'customerId',
// //         model: 'Customer'
// //       });

// //     if (!order) {
// //       req.flash('error', 'Order not found');
// //       return res.redirect('/admin/orders');
// //     }

// //     const existing = await Delivery.findOne({ orderId: order.orderNumber });
// //     if (existing) {
// //       req.flash('error', 'Delivery already exists for this order');
// //       return res.redirect(`/admin/deliveries/${existing._id}`);
// //     }

// //     const driver = await Driver.findById(driverId);
// //     if (!driver) {
// //       req.flash('error', 'Driver not found');
// //       return res.redirect(`/admin/orders/${orderId}/create-delivery`);
// //     }

// //     if (driver.profileStatus !== 'approved') {
// //       req.flash('warning', 'Note: Driver is not approved yet, but assigning anyway');
// //       return res.redirect(`/admin/orders/${orderId}/create-delivery`);
// //     }

// //     // Generate tracking number
// //     const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
// //     const random = Math.floor(1000 + Math.random() * 9000);
// //     const trackingNumber = `DEL${dateStr}${random}`;

// //     // Parse waypoints
// //     let parsedWaypoints = [];
// //     if (waypoints) {
// //       try {
// //         parsedWaypoints = JSON.parse(waypoints);
// //       } catch (e) {
// //         console.error('Waypoints parse error:', e);
// //       }
// //     }

// //     // ================================================================
// //     // ✅ CHAINING FIX (v2): agar isi driver ki koi ACTIVE (abhi tak
// //     // delivered/cancelled/failed NAHI hui) delivery pehle se bani hui
// //     // hai, to us delivery ka "destination" hi is naye delivery ka
// //     // "pickup point" banega — factory nahi.
// //     //
// //     // ⚠️ ROOT-CAUSE FIX: pehle status check nahi hota tha — sirf
// //     // "sabse recently CREATED" delivery utha li jaati thi, chahe wo
// //     // already COMPLETED kyun na ho chuki ho. Isse purani (subah wali,
// //     // already delivered) delivery ka address naye batch (sham wali)
// //     // ki pehli delivery ka galat pickup ban jata tha.
// //     //
// //     // Ab sirf un deliveries ko "chain link" maana jayega jo abhi bhi
// //     // ACTIVE hain. Agar driver ki saari pichli deliveries complete ho
// //     // chuki hain, naya batch FACTORY se hi shuru hoga.
// //     // ================================================================
// //     const previousDeliveryForDriver = await Delivery.findOne({
// //       driverId,
// //       status: { $nin: ['Delivered', 'Failed', 'Cancelled', 'Completed', 'delivered', 'failed', 'cancelled', 'completed'] }
// //     })
// //       .sort({ createdAt: -1 })
// //       .select('deliveryLocation trackingNumber status');

// //     const hasValidPreviousStop = !!(
// //       previousDeliveryForDriver?.deliveryLocation?.coordinates?.latitude &&
// //       previousDeliveryForDriver?.deliveryLocation?.coordinates?.longitude &&
// //       previousDeliveryForDriver?.deliveryLocation?.address
// //     );

// //     // Pickup location decide karo: chain me pichla ACTIVE stop mile to wahi, warna order ka factory pickup
// //     const effectivePickupLocation = hasValidPreviousStop
// //       ? previousDeliveryForDriver.deliveryLocation
// //       : order.pickupLocation;

// //     if (hasValidPreviousStop) {
// //       console.log(`[CREATE-DELIVERY] 🔗 Chained pickup — using ACTIVE previous delivery's destination as pickup: "${previousDeliveryForDriver.deliveryLocation.address}" (from ${previousDeliveryForDriver.trackingNumber}, status: ${previousDeliveryForDriver.status})`);
// //     } else {
// //       console.log(`[CREATE-DELIVERY] No ACTIVE previous delivery for this driver (saari pichli deliveries complete ho chuki hain ya koi hai hi nahi) — using factory as pickup`);
// //     }

// //     // Safe coordinate extraction (defaulting to Ahmedabad coords)
// //     const pickupCoords = {
// //       latitude: effectivePickupLocation?.coordinates?.latitude || 23.0225,
// //       longitude: effectivePickupLocation?.coordinates?.longitude || 72.5714
// //     };

// //     const deliveryCoords = {
// //       latitude: order?.deliveryLocation?.coordinates?.latitude || 23.0225,
// //       longitude: order?.deliveryLocation?.coordinates?.longitude || 72.5714
// //     };

// //     // Create delivery
// //     const delivery = await Delivery.create({
// //       trackingNumber,
// //       orderId: order.orderNumber,
// //       customerId: order.customerId?._id || null,
// //       driverId,
// //       vehicleNumber: driver.vehicleNumber,
// //       pickupLocation: {
// //         ...effectivePickupLocation,
// //         coordinates: pickupCoords
// //       },
// //       deliveryLocation: {
// //         ...order.deliveryLocation,
// //         coordinates: deliveryCoords
// //       },
// //       // ✅ Chain reference — traceability ke liye (schema me field na ho to Mongoose ise silently ignore kar dega, crash nahi hoga)
// //       previousDeliveryId: previousDeliveryForDriver?._id || null,
// //       packageDetails: {
// //         description: order.items?.map(i => i.productName).join(', ') || 'Package',
// //         quantity: order.items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 1,
// //         weight: order.items?.reduce((sum, i) => sum + (i.specifications?.weight || 0), 0) || 0
// //       },
// //       scheduledPickupTime: scheduledPickupTime ? new Date(scheduledPickupTime) : null,
// //       scheduledDeliveryTime: scheduledDeliveryTime ? new Date(scheduledDeliveryTime) : null,
// //       instructions,
// //       waypoints: parsedWaypoints,
// //       distance: parseFloat(routeDistance) || 0,
// //       estimatedDuration: parseInt(routeDuration) || 0,
// //       status: 'assigned',
// //       priority: order.priority || 'medium',
// //       createdBy: req.user._id
// //     });

// //     // ✅ Pichli delivery ka nextDeliveryId bhi set kar do (chain dono taraf se traceable rahe)
// //     if (previousDeliveryForDriver?._id) {
// //       await Delivery.findByIdAndUpdate(previousDeliveryForDriver._id, { nextDeliveryId: delivery._id });
// //     }

// //     // Update order
// //     order.deliveryId = delivery._id;
// //     order.status = 'assigned';
// //     await order.save();


// //     // Create status history
// //     await DeliveryStatusHistory.create({
// //       deliveryId: delivery._id,
// //       status: 'assigned',
// //       remarks: hasValidPreviousStop
// //         ? `Delivery assigned to ${driver.name} (${driver.vehicleNumber}) — chained pickup from ${previousDeliveryForDriver.trackingNumber}`
// //         : `Delivery assigned to ${driver.name} (${driver.vehicleNumber})`,
// //       updatedBy: {
// //         userId: req.user._id,
// //         userRole: req.user.role,
// //         userName: req.user.name
// //       }
// //     });

// //     // Notifications (push + in-app) – yeh same rahega
// //     // 1. Push Notification (FCM)
// //     if (driver.fcmToken) {
// //       const data = {
// //         deliveryId: delivery._id.toString(),
// //         trackingNumber: delivery.trackingNumber,
// //         type: "delivery_assigned",
// //         title: "Delivery Assigned 🚚",
// //         body: `You have a new delivery. Pickup from ${effectivePickupLocation?.address || 'location'}` //${delivery.trackingNumber}
// //       };

// //       sendNotification(driver.fcmToken, data);   // ← assuming your helper accepts token + object
// //     } else {
// //       console.warn(`No FCM token for driver ${driver._id} → assignment notification skipped`);
// //     }

// //     // 2. In-app Notification
// //     try {
// //       const notificationDoc = await Notification.create({
// //         recipientId: driver._id,          // matches your schema
// //         recipientType: 'Driver',          // required for refPath
// //         type: 'delivery_assigned',
// //         title: 'New Delivery Assigned',
// //         message: `You have been assigned delivery. Check details in your app.`, //${delivery.trackingNumber}
// //         referenceId: delivery._id,
// //         referenceModel: 'Delivery',
// //         priority: `${delivery.priority}`,
// //         createdAt: new Date()
// //       });

// //       console.log(`[NOTIF-SUCCESS] In-app notification created → _id: ${notificationDoc._id}`);
// //     } catch (notifErr) {
// //       console.error("[NOTIF-ERROR] Failed to create in-app notification:", notifErr.message || notifErr);
// //     }

// //     console.log('[CREATE-DELIVERY] Success:', delivery.trackingNumber);
// //     req.flash('success', 'Delivery created and driver assigned successfully!');
// //     res.redirect(`/admin/deliveries/${delivery._id}`);

// //   } catch (error) {
// //     console.error('[CREATE-DELIVERY] Error:', error);
// //     req.flash('error', error.message || 'Failed to create delivery');
// //     res.redirect(`/admin/orders/${req.params.orderId}/create-delivery`);
// //   }
// // };

// exports.createDeliveryFromOrder = async (req, res) => {
//   try {
//     const { orderId } = req.params;
//     const {
//       customerId,
//       driverId,
//       scheduledPickupTime,
//       scheduledDeliveryTime,
//       instructions,
//       waypoints,
//       routeDistance,
//       routeDuration
//     } = req.body;

//     const order = await Order.findById(orderId)
//       .populate({
//         path: 'customerId',
//         model: 'Customer'
//       });

//     if (!order) {
//       req.flash('error', 'Order not found');
//       return res.redirect('/admin/orders');
//     }

//     const existing = await Delivery.findOne({ orderId: order.orderNumber });
//     if (existing) {
//       req.flash('error', 'Delivery already exists for this order');
//       return res.redirect(`/admin/deliveries/${existing._id}`);
//     }

//     const driver = await Driver.findById(driverId);
//     if (!driver) {
//       req.flash('error', 'Driver not found');
//       return res.redirect(`/admin/orders/${orderId}/create-delivery`);
//     }

//     if (driver.profileStatus !== 'approved') {
//       req.flash('warning', 'Note: Driver is not approved yet, but assigning anyway');
//       return res.redirect(`/admin/orders/${orderId}/create-delivery`);
//     }

//     // Generate tracking number
//     const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
//     const random = Math.floor(1000 + Math.random() * 9000);
//     const trackingNumber = `DEL${dateStr}${random}`;

//     // Parse waypoints
//     let parsedWaypoints = [];
//     if (waypoints) {
//       try {
//         parsedWaypoints = JSON.parse(waypoints);
//       } catch (e) {
//         console.error('Waypoints parse error:', e);
//       }
//     }

//     // ================================================================
//     // CHAINING LOGIC — ab creation-order se nahi, balki actual live
//     // proximity-optimized route ke LAST STOP se chain hota hai.
//     // Isse ek-ek karke (one-by-one) assign karne par bhi route
//     // optimization sahi rehta hai, chahe assign karne ka order kuch bhi ho.
//     // ================================================================
//     let previousDeliveryForDriver = null;
//     try {
//       const sorted = await getSortedUpcomingForDriver(driverId);
//       const validUpcoming = (sorted.upcoming || []).filter(u => {
//         const status = String(u.status || '').toLowerCase().trim();
//         return !['delivered', 'completed', 'cancelled'].includes(status);
//       });

//       if (validUpcoming.length > 0) {
//         // Route chain ka actual aakhri stop — isi se naya delivery chain hoga
//         const lastStop = validUpcoming[validUpcoming.length - 1];
//         previousDeliveryForDriver = await Delivery.findById(lastStop.id)
//           .select('deliveryLocation trackingNumber status');
//         console.log(`[CREATE-DELIVERY] Route ka actual last stop: ${previousDeliveryForDriver?.trackingNumber}`);
//       }
//     } catch (chainErr) {
//       console.error('[CREATE-DELIVERY] Live route chain lookup failed, falling back to most-recent:', chainErr.message);
//       // Fallback: agar live proximity lookup fail ho jaaye (jaise driver location missing),
//       // purani chronological logic use karo taaki delivery creation block na ho
//       previousDeliveryForDriver = await Delivery.findOne({
//         driverId,
//         status: { $nin: ['Delivered', 'Failed', 'Cancelled', 'Completed', 'delivered', 'failed', 'cancelled', 'completed'] }
//       })
//         .sort({ createdAt: -1 })
//         .select('deliveryLocation trackingNumber status');
//     }

//     const hasValidPreviousStop = !!(
//       previousDeliveryForDriver?.deliveryLocation?.coordinates?.latitude &&
//       previousDeliveryForDriver?.deliveryLocation?.coordinates?.longitude &&
//       previousDeliveryForDriver?.deliveryLocation?.address
//     );

//     const effectivePickupLocation = hasValidPreviousStop
//       ? previousDeliveryForDriver.deliveryLocation
//       : order.pickupLocation;

//     if (hasValidPreviousStop) {
//       console.log(`[CREATE-DELIVERY] 🔗 Chained pickup from: ${previousDeliveryForDriver.trackingNumber}`);
//     } else {
//       console.log(`[CREATE-DELIVERY] Using original factory pickup`);
//     }

//     // Safe coordinates
//     const pickupCoords = {
//       latitude: effectivePickupLocation?.coordinates?.latitude || 23.0225,
//       longitude: effectivePickupLocation?.coordinates?.longitude || 72.5714
//     };

//     const deliveryCoords = {
//       latitude: order?.deliveryLocation?.coordinates?.latitude || 23.0225,
//       longitude: order?.deliveryLocation?.coordinates?.longitude || 72.5714
//     };

//     // ==================== CREATE DELIVERY ====================
//     const delivery = await Delivery.create({
//       trackingNumber,
//       orderId: order.orderNumber,
//       customerId: order.customerId?._id || null,
//       driverId,
//       vehicleNumber: driver.vehicleNumber,

//       // Original Factory Pickup (List view ke liye important)
//       originalPickupLocation: order.pickupLocation,     // ← Yeh line important hai

//       // Effective pickup (chaining ke liye)
//       pickupLocation: {
//         ...effectivePickupLocation,
//         coordinates: pickupCoords
//       },

//       deliveryLocation: {
//         ...order.deliveryLocation,
//         coordinates: deliveryCoords
//       },

//       previousDeliveryId: previousDeliveryForDriver?._id || null,

//       packageDetails: {
//         description: order.items?.map(i => i.productName).join(', ') || 'Package',
//         quantity: order.items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 1,
//         weight: order.items?.reduce((sum, i) => sum + (i.specifications?.weight || 0), 0) || 0
//       },

//       scheduledPickupTime: scheduledPickupTime ? new Date(scheduledPickupTime) : null,
//       scheduledDeliveryTime: scheduledDeliveryTime ? new Date(scheduledDeliveryTime) : null,
//       instructions,
//       waypoints: parsedWaypoints,
//       distance: parseFloat(routeDistance) || 0,
//       estimatedDuration: parseInt(routeDuration) || 0,
//       status: 'assigned',
//       priority: order.priority || 'medium',
//       createdBy: req.user._id
//     });

//     // Update previous delivery's nextDeliveryId
//     if (previousDeliveryForDriver?._id) {
//       await Delivery.findByIdAndUpdate(previousDeliveryForDriver._id, { 
//         nextDeliveryId: delivery._id 
//       });
//     }

//     // Update order
//     order.deliveryId = delivery._id;
//     order.status = 'assigned';
//     await order.save();

//     // Status History
//     await DeliveryStatusHistory.create({
//       deliveryId: delivery._id,
//       status: 'assigned',
//       remarks: hasValidPreviousStop
//         ? `Delivery assigned to ${driver.name} — chained from ${previousDeliveryForDriver.trackingNumber}`
//         : `Delivery assigned to ${driver.name}`,
//       updatedBy: {
//         userId: req.user._id,
//         userRole: req.user.role,
//         userName: req.user.name
//       }
//     });

//     // Notifications (existing code)
//     if (driver.fcmToken) {
//       const data = {
//         deliveryId: delivery._id.toString(),
//         trackingNumber: delivery.trackingNumber,
//         type: "delivery_assigned",
//         title: "Delivery Assigned 🚚",
//         body: `You have a new delivery. Pickup from ${effectivePickupLocation?.address || 'location'}`
//       };
//       sendNotification(driver.fcmToken, data);
//     }

//     try {
//       await Notification.create({
//         recipientId: driver._id,
//         recipientType: 'Driver',
//         type: 'delivery_assigned',
//         title: 'New Delivery Assigned',
//         message: `You have been assigned delivery ${delivery.trackingNumber}.`,
//         referenceId: delivery._id,
//         referenceModel: 'Delivery',
//         priority: `${delivery.priority}`,
//         createdAt: new Date()
//       });
//     } catch (notifErr) {
//       console.error("[NOTIF-ERROR]", notifErr.message);
//     }

//     console.log('[CREATE-DELIVERY] Success:', delivery.trackingNumber);
//     req.flash('success', 'Delivery created and driver assigned successfully!');
//     res.redirect(`/admin/deliveries/${delivery._id}`);

//   } catch (error) {
//     console.error('[CREATE-DELIVERY] Error:', error);
//     req.flash('error', error.message || 'Failed to create delivery');
//     res.redirect(`/admin/orders/${req.params.orderId}/create-delivery`);
//   }
// };

// // ============= CANCEL DELIVERY (ADMIN CAN ONLY CANCEL) =============
// exports.cancelDelivery = async (req, res) => {
//   try {
//     const { deliveryId } = req.params;
//     const { remarks = 'Cancelled by admin' } = req.body;

//     const delivery = await Delivery.findById(deliveryId);
//     if (!delivery) {
//       return res.status(404).json({ success: false, message: 'Delivery not found' });
//     }

//     if (['Delivered', 'Cancelled'].includes(delivery.status)) {
//       return res.status(400).json({
//         success: false,
//         message: `Cannot cancel delivery in ${delivery.status} status`
//       });
//     }

//     const previousStatus = delivery.status;
//     delivery.status = 'Cancelled';
//     await delivery.save();

//     // Fetch driver
//     let driver = null;
//     if (delivery.driverId) {
//       driver = await Driver.findById(delivery.driverId).select('name fcmToken');

//       // Free the driver
//       await Driver.findByIdAndUpdate(delivery.driverId, {
//         isAvailable: true,
//         $unset: { currentLocation: "" } // optional: clear live location
//       });
//     }

//     // Update order if linked
//     if (delivery.orderId) {
//       await Order.updateOne(
//         { orderNumber: delivery.orderId },
//         { status: 'Cancelled' }
//       );
//     }

//     // Status history
//     await DeliveryStatusHistory.create({
//       deliveryId: delivery._id,
//       status: 'Cancelled',
//       previousStatus: previousStatus,
//       remarks: remarks,
//       updatedBy: {
//         userId: req.user._id,
//         userRole: req.user.role,
//         userName: req.user.name
//       }
//     });

//     // ────────────────────────────────────────────────
//     // NOTIFICATIONS – only if driver exists
//     // ────────────────────────────────────────────────
//     if (driver) {
//       console.log(`[CANCEL-NOTIF] Preparing for driver ${driver._id} (${driver.name})`);

//       // 1. Push Notification (FCM)
//       if (driver.fcmToken && driver.fcmToken.trim().length > 20) {
//         console.log(`[CANCEL-FCM] Attempting send to: ${driver.fcmToken.substring(0, 20)}...`);
//         try {
//           const result = await sendNotification(
//             driver.name || "Driver",
//             "english",
//             driver.fcmToken,
//             "delivery_cancelled",
//             {
//               deliveryId: delivery._id.toString(),
//               trackingNumber: delivery.trackingNumber,
//               reason: remarks,
//               type: "delivery_cancelled"
//             }
//           );
//           console.log(`[CANCEL-NOTIF-SUCCESS] FCM sent → ${result?.messageId || 'ok'}`);
//         } catch (pushErr) {
//           console.error("[CANCEL-FCM-ERROR]", pushErr.code || pushErr.message || pushErr);
//         }
//       } else {
//         console.warn("[CANCEL-NOTIF] No valid fcmToken", { length: driver.fcmToken?.length || 0 });
//       }

//       // 2. In-app Notification (consistent with schema)
//       try {
//         const notif = await Notification.create({
//           recipientId: driver._id,
//           recipientType: 'Driver',
//           type: 'delivery_cancelled',
//           title: 'Delivery Cancelled',
//           message: `Your assigned delivery ${delivery.trackingNumber} has been cancelled.\nReason: ${remarks}`,
//           referenceId: delivery._id,
//           referenceModel: 'Delivery',
//           priority: 'high',
//           createdAt: new Date()
//         });
//         console.log(`[CANCEL-NOTIF-SUCCESS] In-app created → ID: ${notif._id}`);
//       } catch (notifErr) {
//         console.error("[CANCEL-NOTIF-ERROR]", notifErr.message || notifErr);
//       }
//     } else {
//       console.warn("[CANCEL-NOTIF] No driver attached to delivery");
//     }

//     // Socket emit (if using)
//     if (global.io && driver) {
//       global.io.to('admin-room').emit('delivery:status:update', {
//         deliveryId: delivery._id,
//         status: 'Cancelled',
//         timestamp: new Date()
//       });

//       global.io.to('admin-room').emit('driver:available', {
//         driverId: delivery.driverId,
//         driverName: driver.name,
//         status: 'available'
//       });
//     }

//     return res.json({
//       success: true,
//       message: 'Delivery cancelled successfully. Driver is now available again.'
//     });

//   } catch (error) {
//     console.error('[CANCEL-DELIVERY] Error:', error);
//     return res.status(500).json({ success: false, message: 'Failed to cancel delivery' });
//   }
// };

// // ============= GET DRIVER'S CURRENT LOCATION (API) =============
// exports.getDriverCurrentLocation = async (req, res) => {
//   try {
//     const { deliveryId } = req.params;

//     const delivery = await Delivery.findById(deliveryId)
//       .populate({
//         path: 'driverId',
//         select: 'name vehicleNumber currentLocation'
//       })
//       .populate('journeyId')   // ← add this if you have journeyId in Delivery
//       .lean();

//     if (!delivery) {
//       return res.status(404).json({ success: false, message: 'Delivery not found' });
//     }

//     if (!delivery.driverId) {
//       return res.status(404).json({ success: false, message: 'No driver assigned' });
//     }

//     let locationData = {
//       driverId: delivery.driverId._id,
//       driverName: delivery.driverId.name,
//       vehicleNumber: delivery.driverId.vehicleNumber,
//       currentLocation: delivery.driverId.currentLocation || null,
//       deliveryStatus: delivery.status,
//       lastUpdate: delivery.driverId.currentLocation?.timestamp || null
//     };

//     // If journey exists and has history → send full path for completed/in-progress
//     if (delivery.journeyId?.locationHistory?.length > 0) {
//       locationData.pathHistory = delivery.journeyId.locationHistory.map(point => ({
//         lat: point.latitude,
//         lng: point.longitude,
//         timestamp: point.timestamp
//       }));
//     }

//     return res.json({
//       success: true,
//       data: locationData
//     });

//   } catch (error) {
//     console.error('[GET-DRIVER-LOCATION] Error:', error);
//     return res.status(500).json({ success: false, message: 'Failed to get location' });
//   }
// };

// // ============= EDIT DELIVERY =============
// exports.renderEditDelivery = async (req, res) => {
//   try {
//     const { deliveryId } = req.params;

//     const delivery = await Delivery.findById(deliveryId)
//       .populate('customerId')
//       .populate('driverId', 'name phone vehicleNumber')
//       .lean();

//     if (!delivery) {
//       req.flash('error', 'Delivery not found');
//       return res.redirect('/admin/deliveries');
//     }

//     // Get available drivers (current driver + all available ones)
//     const drivers = await Driver.find({
//       $or: [
//         { _id: delivery.driverId },
//         { isActive: true, isAvailable: true, profileStatus: 'approved' }
//       ]
//     })
//       .select('name phone vehicleNumber profileImage isAvailable')
//       .sort({ name: 1 })
//       .lean();

//     res.render('delivery_edit', {
//       title: `Edit Delivery - ${delivery.trackingNumber}`,
//       delivery,
//       drivers,
//       user: req.user,
//       url: req.originalUrl,
//       messages: req.flash()
//     });

//   } catch (error) {
//     console.error('[RENDER-EDIT-DELIVERY] Error:', error);
//     req.flash('error', 'Failed to load edit page');
//     res.redirect('/admin/deliveries');
//   }
// };


// exports.updateDelivery = async (req, res) => {
//   try {
//     const { deliveryId } = req.params;
//     const {
//       driverId: inputDriverId,
//       scheduledPickupTime,
//       scheduledDeliveryTime,
//       instructions,
//       waypoints,
//       routeDistance,
//       routeDuration
//     } = req.body;

//     console.log('[UPDATE-DEBUG] Input driverId:', inputDriverId);
//     console.log('[UPDATE-DEBUG] Input driverId type:', typeof inputDriverId);
//     console.log('[UPDATE-DEBUG] Request body:', req.body);

//     // ────────────────────────────────────────────────
//     // Clean & Validate driverId (handle [object Object] case)
//     // ────────────────────────────────────────────────
//     let cleanDriverId = null;

//     if (inputDriverId) {
//       // Invalid case from bad form serialization
//       if (String(inputDriverId).includes('[object') || String(inputDriverId) === '[object Object]') {
//         console.error('[UPDATE-ERROR] Invalid driverId format from form:', inputDriverId);
//         req.flash('error', 'Invalid driver selection. Please try again.');
//         return res.redirect(`/admin/deliveries/${deliveryId}/edit`);
//       }

//       try {
//         if (typeof inputDriverId === 'string' && inputDriverId.length === 24) {
//           cleanDriverId = inputDriverId;
//         } else if (typeof inputDriverId === 'object' && inputDriverId._id) {
//           cleanDriverId = inputDriverId._id.toString();
//         } else if (inputDriverId.toString && inputDriverId.toString().length === 24) {
//           cleanDriverId = inputDriverId.toString();
//         } else {
//           throw new Error('Cannot extract valid driver ID');
//         }
//       } catch (parseErr) {
//         console.error('[UPDATE-ERROR] Failed to parse driverId:', parseErr.message);
//         req.flash('error', 'Invalid driver ID format. Please select a driver from the dropdown.');
//         return res.redirect(`/admin/deliveries/${deliveryId}/edit`);
//       }
//     }

//     console.log('[UPDATE-DEBUG] Cleaned driverId:', cleanDriverId);

//     // Fetch delivery
//     const delivery = await Delivery.findById(deliveryId);
//     if (!delivery) {
//       req.flash('error', 'Delivery not found');
//       return res.redirect('/admin/deliveries');
//     }

//     const currentDriverIdStr = delivery.driverId ? delivery.driverId.toString() : null;
//     console.log('[UPDATE-DEBUG] Current driverId (string):', currentDriverIdStr);

//     // Parse waypoints
//     let parsedWaypoints = [];
//     if (waypoints) {
//       try {
//         parsedWaypoints = JSON.parse(waypoints);
//       } catch (e) {
//         console.warn('Invalid waypoints JSON:', e.message);
//       }
//     }

//     // Update non-driver fields
//     if (scheduledPickupTime) delivery.scheduledPickupTime = new Date(scheduledPickupTime);
//     if (scheduledDeliveryTime) delivery.scheduledDeliveryTime = new Date(scheduledDeliveryTime);
//     if (instructions) delivery.instructions = instructions;
//     if (parsedWaypoints.length > 0) delivery.waypoints = parsedWaypoints;
//     if (routeDistance) delivery.distance = parseFloat(routeDistance) || delivery.distance;
//     if (routeDuration) delivery.estimatedDuration = parseInt(routeDuration) || delivery.estimatedDuration;

//     // Handle driver change
//     let driverChanged = false;
//     let oldDriver = null;
//     let newDriver = null;
//     const newDriverIdStr = cleanDriverId;

//     if (newDriverIdStr && newDriverIdStr !== currentDriverIdStr) {
//       console.log('[UPDATE-DEBUG] Driver change detected');

//       newDriver = await Driver.findById(newDriverIdStr);
//       if (!newDriver) {
//         req.flash('error', 'Selected driver not found');
//         return res.redirect(`/admin/deliveries/${deliveryId}/edit`);
//       }

//       if (!newDriver.isAvailable || newDriver.profileStatus !== 'approved') {
//         req.flash('error', 'Selected driver is not available or not approved');
//         return res.redirect(`/admin/deliveries/${deliveryId}/edit`);
//       }

//       // Free old driver
//       if (currentDriverIdStr) {
//         oldDriver = await Driver.findById(currentDriverIdStr);
//         if (oldDriver) {
//           oldDriver.isAvailable = true;
//           await oldDriver.save();
//           console.log(`[UPDATE] Freed old driver: ${oldDriver.name}`);
//         }
//       }

//       // Assign new driver
//       delivery.driverId = newDriver._id;
//       delivery.vehicleNumber = newDriver.vehicleNumber;
//       newDriver.isAvailable = false;
//       await newDriver.save();

//       driverChanged = true;
//       console.log(`[UPDATE] Reassigned to new driver: ${newDriver.name}`);
//     }

//     // Save updated delivery
//     await delivery.save();
//     console.log('[UPDATE-DEBUG] Delivery saved successfully');

//     // Status history
//     await DeliveryStatusHistory.create({
//       deliveryId: delivery._id,
//       status: delivery.status,
//       remarks: driverChanged
//         ? `Delivery reassigned from ${oldDriver?.name || 'previous driver'} to ${newDriver?.name}`
//         : 'Delivery details updated (route/schedule/etc.)',
//       updatedBy: {
//         userId: req.user._id,
//         userRole: req.user.role,
//         userName: req.user.name
//       }
//     });

//     // ────────────────────────────────────────────────
//     // NOTIFICATIONS
//     // ────────────────────────────────────────────────
//     console.log('[UPDATE-NOTIF] Starting notifications...');

//     if (driverChanged) {
//       console.log('[UPDATE-NOTIF] Driver changed - notifying both old and new');

//       // OLD DRIVER (cancel/reassign notification)
//       if (oldDriver) {
//         console.log(`[UPDATE-NOTIF] Notifying OLD driver: ${oldDriver.name}`);

//         // Push notification
//         if (oldDriver.fcmToken && oldDriver.fcmToken.trim().length > 20) {
//           try {
//             await sendNotification(
//               oldDriver.name || "Driver",
//               "english",
//               oldDriver.fcmToken,
//               "delivery_cancelled",
//               {
//                 deliveryId: delivery._id.toString(),
//                 trackingNumber: delivery.trackingNumber,
//                 reason: "Reassigned to another driver",
//                 type: "delivery_cancelled"
//               }
//             );
//             console.log(`[UPDATE-NOTIF] FCM sent to OLD driver`);
//           } catch (e) {
//             console.error("[UPDATE-FCM-OLD-ERROR]", e.message || e);
//           }
//         } else {
//           console.warn("[UPDATE-NOTIF] No valid FCM token for OLD driver");
//         }

//         // In-app notification
//         try {
//           await Notification.create({
//             recipientId: oldDriver._id,
//             recipientType: 'Driver',
//             type: 'delivery_cancelled',
//             title: 'Delivery Reassigned',
//             message: `Delivery ${delivery.trackingNumber} has been reassigned to another driver.`,
//             referenceId: delivery._id,
//             referenceModel: 'Delivery',
//             priority: 'high',
//             createdAt: new Date()
//           });
//           console.log(`[UPDATE-NOTIF] In-app sent to OLD driver`);
//         } catch (e) {
//           console.error("[UPDATE-INAPP-OLD-ERROR]", e.message || e);
//         }
//       }

//       // NEW DRIVER (assigned notification)
//       if (newDriver) {
//         console.log(`[UPDATE-NOTIF] Notifying NEW driver: ${newDriver.name}`);

//         // Push notification
//         if (newDriver.fcmToken && newDriver.fcmToken.trim().length > 20) {
//           try {
//             await sendNotification(
//               newDriver.name || "Driver",
//               "english",
//               newDriver.fcmToken,
//               "delivery_assigned",
//               {
//                 deliveryId: delivery._id.toString(),
//                 trackingNumber: delivery.trackingNumber,
//                 customerName: delivery.customerId?.name || "Customer",
//                 pickup: delivery.pickupLocation?.address || "",
//                 type: "delivery_assigned"
//               }
//             );
//             console.log(`[UPDATE-NOTIF] FCM sent to NEW driver`);
//           } catch (e) {
//             console.error("[UPDATE-FCM-NEW-ERROR]", e.message || e);
//           }
//         } else {
//           console.warn("[UPDATE-NOTIF] No valid FCM token for NEW driver");
//         }

//         // In-app notification
//         try {
//           await Notification.create({
//             recipientId: newDriver._id,
//             recipientType: 'Driver',
//             type: 'delivery_assigned',
//             title: 'New Delivery Assigned',
//             message: `Delivery ${delivery.trackingNumber} has been assigned to you. Please check details in the app.`,
//             referenceId: delivery._id,
//             referenceModel: 'Delivery',
//             priority: 'high',
//             createdAt: new Date()
//           });
//           console.log(`[UPDATE-NOTIF] In-app sent to NEW driver`);
//         } catch (e) {
//           console.error("[UPDATE-INAPP-NEW-ERROR]", e.message || e);
//         }
//       }
//     } else {
//       // No driver change → notify current driver about update
//       console.log('[UPDATE-NOTIF] No driver change - notifying current driver');

//       const currentDriver = await Driver.findById(delivery.driverId);
//       if (currentDriver) {
//         console.log(`[UPDATE-NOTIF] Current driver: ${currentDriver.name}`);

//         // Push notification
//         if (currentDriver.fcmToken && currentDriver.fcmToken.trim().length > 20) {
//           try {
//             await sendNotification(
//               currentDriver.name || "Driver",
//               "english",
//               currentDriver.fcmToken,
//               "delivery_updated",
//               {
//                 deliveryId: delivery._id.toString(),
//                 trackingNumber: delivery.trackingNumber,
//                 type: "delivery_updated"
//               }
//             );
//             console.log(`[UPDATE-NOTIF] FCM update sent to current driver`);
//           } catch (e) {
//             console.error("[UPDATE-FCM-CURRENT-ERROR]", e.message || e);
//           }
//         } else {
//           console.warn("[UPDATE-NOTIF] No valid FCM token for current driver");
//         }

//         // In-app notification
//         try {
//           await Notification.create({
//             recipientId: currentDriver._id,
//             recipientType: 'Driver',
//             type: 'delivery_updated',
//             title: 'Delivery Updated',
//             message: `Delivery ${delivery.trackingNumber} details have been updated. Please check the app.`,
//             referenceId: delivery._id,
//             referenceModel: 'Delivery',
//             priority: 'medium',
//             createdAt: new Date()
//           });
//           console.log(`[UPDATE-NOTIF] In-app update created for current driver`);
//         } catch (e) {
//           console.error("[UPDATE-INAPP-CURRENT-ERROR]", e.message || e);
//         }
//       } else {
//         console.warn("[UPDATE-NOTIF] No current driver found");
//       }
//     }

//     console.log('[UPDATE-DEBUG] Update completed successfully');
//     req.flash('success', 'Delivery updated successfully!');
//     res.redirect(`/admin/deliveries/${delivery._id}`);

//   } catch (error) {
//     console.error('[UPDATE-DELIVERY] Error:', error);
//     console.error('[UPDATE-DELIVERY] Stack:', error.stack);
//     req.flash('error', error.message || 'Failed to update delivery');
//     res.redirect(`/admin/deliveries/${req.params.deliveryId}/edit`);
//   }
// };

// // ============= GET COMPLETED JOURNEY ROUTE (for delivered deliveries) =============
// exports.getCompletedJourneyRoute = async (req, res) => {
//   try {
//     const { deliveryId } = req.params;

//     // Find journey for this delivery
//     const Journey = require('../../models/Journey');
//     const journey = await Journey.findOne({ deliveryId })
//       .select('waypoints totalDistance totalDuration averageSpeed startLocation endLocation')
//       .lean();

//     if (!journey) {
//       return res.status(404).json({
//         success: false,
//         message: 'No journey found for this delivery'
//       });
//     }

//     // Build path from journey waypoints
//     const path = [];

//     // Add start location
//     if (journey.startLocation?.coordinates) {
//       path.push({
//         lat: journey.startLocation.coordinates.latitude,
//         lng: journey.startLocation.coordinates.longitude
//       });
//     }

//     // Add all waypoints
//     if (journey.waypoints && journey.waypoints.length > 0) {
//       journey.waypoints.forEach(wp => {
//         if (wp.location?.coordinates) {
//           path.push({
//             lat: wp.location.coordinates.latitude,
//             lng: wp.location.coordinates.longitude
//           });
//         }
//       });
//     }

//     // Add end location
//     if (journey.endLocation?.coordinates) {
//       path.push({
//         lat: journey.endLocation.coordinates.latitude,
//         lng: journey.endLocation.coordinates.longitude
//       });
//     }

//     console.log(`[GET-JOURNEY-ROUTE] Delivery: ${deliveryId}, Path points: ${path.length}`);

//     return res.json({
//       success: true,
//       data: {
//         path,
//         stats: {
//           totalDistance: journey.totalDistance ? `${journey.totalDistance.toFixed(2)} km` : 'N/A',
//           totalDuration: journey.totalDuration ? `${journey.totalDuration} mins` : 'N/A',
//           averageSpeed: journey.averageSpeed ? `${journey.averageSpeed.toFixed(1)} km/h` : 'N/A'
//         }
//       }
//     });

//   } catch (error) {
//     console.error('[GET-JOURNEY-ROUTE] Error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to fetch journey route',
//       error: error.message
//     });
//   }
// };

// exports.addDeliveryRemark = async (req, res) => {
//   try {
//     const { deliveryId } = req.params;
//     const { message, images } = req.body;

//     const delivery = await Delivery.findById(deliveryId);
//     if (!delivery) {
//       return errorResponse(res, 'Delivery not found', 404);
//     }

//     const remark = {
//       message,
//       images: images || [],
//       createdBy: req.user._id,
//       createdAt: new Date()
//     };

//     if (!delivery.remarks) delivery.remarks = [];
//     delivery.remarks.push(remark);

//     await delivery.save();

//     return successResponse(res, 'Remark added successfully', { remark });

//   } catch (error) {
//     console.error('[ADD-REMARK] Error:', error);
//     return errorResponse(res, 'Failed to add remark', 500);
//   }
// };
// // Add these functions to the END of your deliveryAdminController.js
// // (just before module.exports = exports;)

// // ============= GET ALL DRIVER LOCATIONS FOR DASHBOARD =============
// exports.getAllDriverLocations = async (req, res) => {
//   try {
//     // Find all active drivers with their current locations
//     const drivers = await Driver.find({
//       isActive: true,
//       profileStatus: 'approved'
//     })
//       .select('name phone vehicleNumber profileImage isAvailable currentLocation')
//       .lean();

//     // Filter drivers who have valid location data
//     const driversWithLocation = drivers.filter(driver =>
//       driver.currentLocation &&
//       driver.currentLocation.latitude &&
//       driver.currentLocation.longitude
//     );

//     // Format response
//     const formattedDrivers = driversWithLocation.map(driver => ({
//       _id: driver._id,
//       name: driver.name,
//       phone: driver.phone,
//       vehicleNumber: driver.vehicleNumber,
//       profileImage: driver.profileImage,
//       isAvailable: driver.isAvailable,
//       currentLocation: {
//         latitude: driver.currentLocation.latitude,
//         longitude: driver.currentLocation.longitude,
//         timestamp: driver.currentLocation.timestamp || new Date(),
//         speed: driver.currentLocation.speed || 0,
//         heading: driver.currentLocation.heading || 0
//       }
//     }));

//     console.log(`[GET-ALL-DRIVER-LOCATIONS] Returning ${formattedDrivers.length} drivers with location`);

//     return res.json({
//       success: true,
//       data: formattedDrivers,
//       count: formattedDrivers.length
//     });

//   } catch (error) {
//     console.error('[GET-ALL-DRIVER-LOCATIONS] Error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to fetch driver locations',
//       error: error.message
//     });
//   }
// };

// // ============= GET SINGLE DRIVER LOCATION =============
// exports.getSingleDriverLocation = async (req, res) => {
//   try {
//     const { driverId } = req.params;

//     const driver = await Driver.findById(driverId)
//       .select('name phone vehicleNumber isAvailable currentLocation')
//       .lean();

//     if (!driver) {
//       return res.status(404).json({
//         success: false,
//         message: 'Driver not found'
//       });
//     }

//     if (!driver.currentLocation || !driver.currentLocation.latitude) {
//       return res.status(404).json({
//         success: false,
//         message: 'Driver location not available'
//       });
//     }

//     return res.json({
//       success: true,
//       data: {
//         _id: driver._id,
//         name: driver.name,
//         phone: driver.phone,
//         vehicleNumber: driver.vehicleNumber,
//         isAvailable: driver.isAvailable,
//         currentLocation: driver.currentLocation
//       }
//     });

//   } catch (error) {
//     console.error('[GET-SINGLE-DRIVER-LOCATION] Error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to fetch driver location',
//       error: error.message
//     });
//   }
// };

// // ============= GET DRIVERS BY STATUS =============
// exports.getDriversByStatus = async (req, res) => {
//   try {
//     const { status } = req.query; // 'available', 'busy', 'all'

//     let query = {
//       isActive: true,
//       profileStatus: 'approved'
//     };

//     if (status === 'available') {
//       query.isAvailable = true;
//     } else if (status === 'busy') {
//       query.isAvailable = false;
//     }

//     const drivers = await Driver.find(query)
//       .select('name phone vehicleNumber profileImage isAvailable currentLocation')
//       .lean();

//     const driversWithLocation = drivers.filter(driver =>
//       driver.currentLocation &&
//       driver.currentLocation.latitude &&
//       driver.currentLocation.longitude
//     );

//     console.log(`[GET-DRIVERS-BY-STATUS] Status: ${status || 'all'}, Found: ${driversWithLocation.length} drivers`);

//     return res.json({
//       success: true,
//       data: driversWithLocation,
//       count: driversWithLocation.length
//     });

//   } catch (error) {
//     console.error('[GET-DRIVERS-BY-STATUS] Error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to fetch drivers',
//       error: error.message
//     });
//   }
// };

// // ============= UPDATE DELIVERY PRIORITY (Socket + Logs + Full Response) =============
// // exports.updateDeliveryPriority = async (req, res) => {
// //     console.log('\n=== [PRIORITY UPDATE] ENDPOINT HIT ===');
// //     console.log('URL:', req.originalUrl);
// //     console.log('Params:', req.params);
// //     console.log('Body:', req.body);

// //     try {
// //         const { deliveryId } = req.params;
// //         const { priority } = req.body;

// //         if (!deliveryId) {
// //             console.log('❌ Missing deliveryId');
// //             return res.status(400).json({ success: false, message: 'Delivery ID is required' });
// //         }

// //         if (!['low', 'medium', 'high', 'urgent'].includes(priority)) {
// //             console.log('❌ Invalid priority:', priority);
// //             return res.status(400).json({ success: false, message: 'Invalid priority value' });
// //         }

// //         // Fetch full delivery with driver
// //         const delivery = await Delivery.findById(deliveryId)
// //             .populate('driverId', 'name fcmToken vehicleNumber')
// //             .populate('customerId', 'name companyName');

// //         if (!delivery) {
// //             console.log('❌ Delivery not found');
// //             return res.status(404).json({ success: false, message: 'Delivery not found' });
// //         }

// //         const oldPriority = delivery.priority;
// //         delivery.priority = priority;
// //         await delivery.save();

// //         console.log(`✅ Priority updated: ${oldPriority} → ${priority} | Delivery: ${delivery.trackingNumber}`);

// //         // ==================== SOCKET BROADCAST ====================
// //         const io = req.app.get('io');
// //         if (io) {
// //             const payload = {
// //                 deliveryId: delivery._id.toString(),
// //                 trackingNumber: delivery.trackingNumber,
// //                 priority: priority,
// //                 oldPriority: oldPriority,
// //                 status: delivery.status,
// //                 customerName: delivery.customerId?.companyName || delivery.customerId?.name || 'Customer',
// //                 driverName: delivery.driverId?.name || null,
// //                 pickupAddress: delivery.pickupLocation?.address || '',
// //                 deliveryAddress: delivery.deliveryLocation?.address || '',
// //                 timestamp: new Date().toISOString(),
// //                 message: `Priority changed to ${priority.toUpperCase()}`
// //             };

// //             // Admin ko real-time update
// //             io.to("admin-room").emit("delivery:priority:updated", payload);
// //             console.log('📤 Socket emitted to admin-room: delivery:priority:updated');

// //             // Driver ko bhi notify (agar assigned hai)
// //             if (delivery.driverId) {
// //                 io.to(`driver-${delivery.driverId._id}`).emit("delivery:priority:updated", payload);
// //                 console.log(`📤 Socket emitted to driver-${delivery.driverId._id}`);
// //             }
// //         } else {
// //             console.log('⚠️ io not found on req.app');
// //         }

// //         // FCM Notification (optional)
// //         if (delivery.driverId?.fcmToken) {
// //             try {
// //                 await sendNotification(delivery.driverId.fcmToken, {
// //                     title: `Priority Updated: ${priority.toUpperCase()}`,
// //                     body: `Your delivery ${delivery.trackingNumber} priority has been changed.`,
// //                     type: 'priority_changed',
// //                     deliveryId: delivery._id.toString(),
// //                     trackingNumber: delivery.trackingNumber
// //                 });
// //                 console.log('📱 FCM sent to driver');
// //             } catch (fcmErr) {
// //                 console.error('FCM Error:', fcmErr.message);
// //             }
// //         }

// //         return res.json({
// //             success: true,
// //             message: `Priority updated to ${priority.toUpperCase()}`,
// //             delivery: {
// //                 _id: delivery._id,
// //                 trackingNumber: delivery.trackingNumber,
// //                 priority: priority,
// //                 status: delivery.status,
// //                 deliveryAddress: delivery.deliveryLocation?.address
// //             }
// //         });

// //     } catch (error) {
// //         console.error('=== PRIORITY UPDATE ERROR ===', error);
// //         return res.status(500).json({ success: false, message: 'Server error' });
// //     }
// // };

// // ============= UPDATE DELIVERY PRIORITY (FULL SOCKET UPDATE) =============
// exports.updateDeliveryPriority = async (req, res) => {
//     console.log('\n=== [PRIORITY UPDATE] ENDPOINT HIT ===');
//     console.log('URL:', req.originalUrl);
//     console.log('Params:', req.params);
//     console.log('Body:', req.body);

//     try {
//         const { deliveryId } = req.params;
//         const { priority } = req.body;

//         if (!deliveryId) {
//             console.log('❌ Missing deliveryId');
//             return res.status(400).json({ success: false, message: 'Delivery ID is required' });
//         }

//         if (!['low', 'medium', 'high', 'urgent'].includes(priority)) {
//             console.log('❌ Invalid priority:', priority);
//             return res.status(400).json({ success: false, message: 'Invalid priority value' });
//         }

//         // Full delivery fetch with relations
//         const delivery = await Delivery.findById(deliveryId)
//             .populate('driverId', 'name fcmToken vehicleNumber')
//             .populate('customerId', 'name companyName')
//             .lean();

//         if (!delivery) {
//             console.log('❌ Delivery not found');
//             return res.status(404).json({ success: false, message: 'Delivery not found' });
//         }

//         const oldPriority = delivery.priority;

//         // Update in DB
//         await Delivery.findByIdAndUpdate(deliveryId, { priority });

//         console.log(`✅ Priority updated: ${oldPriority} → ${priority}`);

//         // Refresh full delivery data
//         const updatedDelivery = await Delivery.findById(deliveryId)
//             .populate('driverId', 'name fcmToken vehicleNumber')
//             .populate('customerId', 'name companyName')
//             .lean();

//         // ==================== SOCKET PAYLOAD ====================
//         const io = req.app.get('io');
//         const socketPayload = {
//             type: "delivery:priority:updated",
//             deliveryId: updatedDelivery._id.toString(),
//             trackingNumber: updatedDelivery.trackingNumber,
//             priority: updatedDelivery.priority,
//             oldPriority: oldPriority,
//             status: updatedDelivery.status,
//             customerName: updatedDelivery.customerId?.companyName || updatedDelivery.customerId?.name || 'Customer',
//             driverName: updatedDelivery.driverId?.name || null,
//             vehicleNumber: updatedDelivery.driverId?.vehicleNumber || null,
//             pickupAddress: updatedDelivery.pickupLocation?.address || '',
//             deliveryAddress: updatedDelivery.deliveryLocation?.address || '',
//             scheduledPickupTime: updatedDelivery.scheduledPickupTime,
//             scheduledDeliveryTime: updatedDelivery.scheduledDeliveryTime,
//             actualPickupTime: updatedDelivery.actualPickupTime,
//             actualDeliveryTime: updatedDelivery.actualDeliveryTime,
//             timestamp: new Date().toISOString(),
//             message: `Priority changed to ${priority.toUpperCase()}`
//         };

//         if (io) {
//             // Admin ko full update
//             io.to("admin-room").emit("delivery:updated", socketPayload);
//             console.log('📤 Socket emitted to admin-room: delivery:updated');

//             // Driver ko bhi (agar assigned hai)
//             if (updatedDelivery.driverId) {
//                 io.to(`driver-${updatedDelivery.driverId._id}`).emit("delivery:updated", socketPayload);
//                 console.log(`📤 Socket emitted to driver room`);
//             }
//         }

//         // FCM (optional)
//         if (updatedDelivery.driverId?.fcmToken) {
//             try {
//                 await sendNotification(updatedDelivery.driverId.fcmToken, {
//                     title: `Priority Updated: ${priority.toUpperCase()}`,
//                     body: `Your delivery ${updatedDelivery.trackingNumber} priority has been changed.`,
//                     type: 'priority_changed',
//                     deliveryId: updatedDelivery._id.toString(),
//                     trackingNumber: updatedDelivery.trackingNumber
//                 });
//             } catch (e) {}
//         }

//         return res.json({
//             success: true,
//             message: `Priority updated to ${priority.toUpperCase()}`,
//             delivery: {
//                 _id: updatedDelivery._id,
//                 trackingNumber: updatedDelivery.trackingNumber,
//                 priority: updatedDelivery.priority,
//                 status: updatedDelivery.status,
//                 pickupAddress: updatedDelivery.pickupLocation?.address,
//                 deliveryAddress: updatedDelivery.deliveryLocation?.address,
//                 driverName: updatedDelivery.driverId?.name
//             }
//         });

//     } catch (error) {
//         console.error('=== PRIORITY UPDATE ERROR ===', error);
//         return res.status(500).json({ success: false, message: 'Server error' });
//     }
// // };


// const Delivery = require('../../models/Delivery');
// const Order = require('../../models/Order');
// const Driver = require('../../models/Driver');
// const Customer = require('../../models/Customer');
// const DeliveryStatusHistory = require('../../models/DeliveryStatusHistory');
// const Notification = require('../../models/Notification');
// const mongoose = require('mongoose');
// const { successResponse, errorResponse } = require('../../utils/responseHelper');
// const { sendNotification } = require("../../utils/sendNotification")
// const { getSortedUpcomingForDriver } = require('../Driver/deliveryController');  


// // ============= RENDER DELIVERIES LIST =============
// exports.renderDeliveriesList = async (req, res) => {
//   try {
//     const {
//       page = 1,
//       limit = 20,
//       status,
//       search,
//       startDate,
//       endDate,
//       driverId
//     } = req.query;

//     const query = {};
//     if (status) query.status = status;
//     if (driverId) query.driverId = driverId;

//     if (search) {
//       query.$or = [
//         { trackingNumber: { $regex: search, $options: 'i' } },
//         { orderId: { $regex: search, $options: 'i' } }
//       ];
//     }

//     if (startDate || endDate) {
//       query.createdAt = {};
//       if (startDate) query.createdAt.$gte = new Date(startDate);
//       if (endDate) query.createdAt.$lte = new Date(endDate);
//     }

//     let deliveries = await Delivery.find(query)
//       .populate('customerId', 'name email phone companyName customerId')
//       .populate('driverId', 'name phone vehicleNumber currentLocation')
//       .lean();

//     // === Proximity Sorting ===
//     const driverGroups = {};
//     for (const del of deliveries) {
//       const dId = del.driverId?._id?.toString() || 'unassigned';
//       if (!driverGroups[dId]) driverGroups[dId] = [];
//       driverGroups[dId].push(del);
//     }

//     let finalDeliveries = [];

//     for (const [dId, group] of Object.entries(driverGroups)) {
//       if (dId === 'unassigned') {
//         finalDeliveries.push(...group);
//         continue;
//       }

//       try {
//         const sorted = await getSortedUpcomingForDriver(dId);
//         const upcomingMap = new Map(sorted.upcoming.map(item => [item.id, item]));

//         const orderedGroup = group
//           .map(del => {
//             const sortedItem = upcomingMap.get(del._id.toString());
//             return {
//               ...del,
//               // ✅ Display ke liye rank sirf tab set hoti hai jab delivery
//               // active route-chain mein ho. Completed/cancelled deliveries
//               // ke liye null rakha — EJS me "-" dikhega, "#999" nahi.
//               __nearestRank: sortedItem ? sortedItem.nearestRank : null,
//               // Chain mein na ho to bhi, agar delivery ka apna record hua
//               // actual distance (delivery complete hote waqt save hua) ho
//               // to wahi dikhado — bilkul N/A nahi.
//               __distance: sortedItem ? sortedItem.distanceFromDriver : (del.distance ? `${del.distance.toFixed(1)} km` : null),
//               __hasRank: !!sortedItem,
//               // Sirf INTERNAL sorting ke liye — display mein kabhi use nahi hota
//               __sortKey: sortedItem ? sortedItem.nearestRank : 999,
//               deliveryLocation: del.deliveryLocation
//             };
//           })
//           .sort((a, b) => a.__sortKey - b.__sortKey);

//         // ✅ Pickup Location ab route-chain ke hisaab se set hoti hai:
//         // Rank #1 (chain ki pehli delivery) → "Factory (Start)" label
//         // Rank #2, #3... → chain mein unse turant pehle wali delivery ka deliveryLocation
//         // Jinke paas rank nahi hai (completed/unassigned) → unka original pickup as-is
//         // (Same wording jo Route Chain widget mein use hoti hai, list view mein bhi consistent dikhegi)
//         let previousInChain = null;
//         for (const del of orderedGroup) {
//           if (del.__hasRank && previousInChain) {
//             del.pickupLocation = previousInChain.deliveryLocation;
//           } else if (del.__hasRank) {
//             // Chain ki sabse pehli delivery — yehi factory se start ho rahi hai
//             const originalPickup = del.originalPickupLocation || del.pickupLocation;
//             del.pickupLocation = { ...originalPickup, address: 'Factory (Start)' };
//           } else {
//             del.pickupLocation = del.originalPickupLocation || del.pickupLocation;
//           }
//           if (del.__hasRank) {
//             previousInChain = del;
//           }
//         }

//         finalDeliveries.push(...orderedGroup);

//       } catch (e) {
//         console.error(`Sorting failed for driver ${dId}`, e.message);
//         finalDeliveries.push(...group);
//       }
//     }

//     const skip = (parseInt(page) - 1) * parseInt(limit);
//     const paginatedDeliveries = finalDeliveries.slice(skip, skip + parseInt(limit));

//     // Stats
//     const stats = await Delivery.aggregate([{
//       $facet: {
//         total: [{ $count: 'count' }],
//         delivered: [{ $match: { status: 'delivered' } }, { $count: 'count' }],
//         inTransit: [{ $match: { status: { $in: ['in_transit', 'assigned', 'picked_up', 'out_for_delivery'] } } }, { $count: 'count' }],
//         pending: [{ $match: { status: { $in: ['pending', 'pending_acceptance'] } } }, { $count: 'count' }]
//       }
//     }]);

//     const statistics = {
//       total: stats[0].total[0]?.count || 0,
//       delivered: stats[0].delivered[0]?.count || 0,
//       inTransit: stats[0].inTransit[0]?.count || 0,
//       pending: stats[0].pending[0]?.count || 0
//     };

//     res.render('deliveries_list', {
//       title: 'Deliveries Management',
//       user: req.user,
//       deliveries: paginatedDeliveries,
//       stats: statistics,
//       pagination: {
//         total: finalDeliveries.length,
//         page: parseInt(page),
//         pages: Math.ceil(finalDeliveries.length / parseInt(limit)),
//         limit: parseInt(limit)
//       },
//       filters: { status, search, startDate, endDate, driverId },
//       url: req.originalUrl,
//       messages: req.flash()
//     });

//   } catch (error) {
//     console.error('[DELIVERIES-LIST] Error:', error);
//     req.flash('error', 'Failed to load deliveries');
//     res.redirect('/admin/dashboard');
//   }
// };

// exports.renderDeliveryDetails = async (req, res) => {
//   try {
//     const { deliveryId } = req.params;

//     if (!mongoose.Types.ObjectId.isValid(deliveryId)) {
//       req.flash('error', 'Invalid delivery ID');
//       return res.redirect('/admin/deliveries');
//     }

//     const delivery = await Delivery.findById(deliveryId)
//       .populate({
//         path: 'customerId',
//         model: 'Customer',
//         select: 'name email phone companyName customerId'
//       })
//       .populate({
//         path: 'driverId',
//         select: 'name phone vehicleNumber profileImage currentLocation'
//       })
//       .populate('createdBy', 'name email')
//       .lean();

//     if (!delivery) {
//       req.flash('error', 'Delivery not found');
//       return res.redirect('/admin/deliveries');
//     }

//     // ================================================================
//     // ✅ STRONG FIXED ROUTE CHAIN LOGIC
//     // ================================================================
//     let effectivePickupLocation = delivery.pickupLocation;
//     let routeChain = [];

//     if (delivery.driverId) {
//       try {
//         const driverIdForSort = delivery.driverId._id || delivery.driverId;
//         const sorted = await getSortedUpcomingForDriver(driverIdForSort);

//         // ✅ Bahut Strong Filter
//         const validUpcoming = sorted.upcoming.filter(u => {
//           const status = String(u.status || '').toLowerCase().trim();
//           return !['delivered', 'completed', 'cancelled', 'Delivered', 'Completed', 'Cancelled'].includes(status);
//         });

//         const myIndex = validUpcoming.findIndex(u => u.id === delivery._id.toString());

//         console.log(`[DELIVERY-DETAILS] Valid Upcoming: ${validUpcoming.length} | My Rank: ${myIndex >= 0 ? myIndex + 1 : 'Not Found'}`);

//         // Route Chain Build
//         routeChain.push({ label: 'Factory (Start)', isFactory: true, isCurrent: false });

//         validUpcoming.forEach((u) => {
//           routeChain.push({
//             label: u.trackingNumber,
//             isFactory: false,
//             isCurrent: u.id === delivery._id.toString()
//           });
//         });

//         // Effective Pickup Logic - Sirf Active Delivery se
//         if (myIndex > 0) {
//           const previousItem = validUpcoming[myIndex - 1];
//           const previousDoc = await Delivery.findById(previousItem.id)
//             .select('deliveryLocation trackingNumber status')
//             .lean();

//           const prevStatus = String(previousDoc?.status || '').toLowerCase().trim();

//           if (previousDoc && !['delivered', 'completed', 'cancelled'].includes(prevStatus)) {
//             effectivePickupLocation = previousDoc.deliveryLocation;
//             console.log(`[DELIVERY-DETAILS] Pickup chained from active delivery: ${previousDoc.trackingNumber}`);
//           } else {
//             console.log(`[DELIVERY-DETAILS] Previous delivery was already delivered - Using original pickup`);
//           }
//         } else if (myIndex === 0) {
//           // ✅ Chain ki sabse pehli delivery — List page jaisa hi "Factory (Start)" label
//           const originalPickup = delivery.originalPickupLocation || delivery.pickupLocation;
//           effectivePickupLocation = { ...originalPickup, address: 'Factory (Start)' };
//           console.log(`[DELIVERY-DETAILS] Rank #1 - Factory (Start) label lagaya`);
//         } else {
//           console.log(`[DELIVERY-DETAILS] Active chain mein nahi mila (completed/cancelled) - stored pickup as-is`);
//         }

//       } catch (err) {
//         console.error('[DELIVERY-DETAILS] Chain resolution failed:', err.message);
//       }
//     }

//     delivery.pickupLocation = effectivePickupLocation;

//     // Status History
//     const statusHistory = await DeliveryStatusHistory.find({ deliveryId: delivery._id })
//       .sort({ timestamp: -1 })
//       .populate('updatedBy.userId', 'name email')
//       .lean();

//     res.render('delivery_details', {
//       title: `Delivery ${delivery.trackingNumber}`,
//       user: req.user,
//       delivery,
//       statusHistory,
//       routeChain,
//       url: req.originalUrl,
//       messages: req.flash()
//     });

//   } catch (error) {
//     console.error('[DELIVERY-DETAILS] Error:', error);
//     req.flash('error', 'Failed to load delivery details');
//     res.redirect('/admin/deliveries');
//   }
// };
 
// // ============= RENDER CREATE DELIVERY FROM ORDER =============
// exports.renderCreateDeliveryFromOrder = async (req, res) => {
//   try {
//     const { orderId } = req.params;

//     if (!mongoose.Types.ObjectId.isValid(orderId)) {
//       req.flash('error', 'Invalid order ID');
//       return res.redirect('/admin/orders');
//     }

//     const order = await Order.findById(orderId)
//       .populate({
//         path: 'customerId',
//         model: 'Customer',
//         select: 'name email phone companyName customerId'
//       })
//       .lean();

//     if (!order) {
//       req.flash('error', 'Order not found');
//       return res.redirect('/admin/orders');
//     }

//     const existingDelivery = await Delivery.findOne({ orderId: order.orderNumber });
//     if (existingDelivery) {
//       req.flash('error', 'Delivery already exists for this order');
//       return res.redirect(`/admin/deliveries/${existingDelivery._id}`);
//     }

//     // Ensure coordinates exist with fallback
//     if (!order.pickupLocation?.coordinates) {
//       order.pickupLocation = order.pickupLocation || {};
//       order.pickupLocation.coordinates = { latitude: 23.0225, longitude: 72.5714 };
//     }

//     if (!order.deliveryLocation?.coordinates) {
//       order.deliveryLocation = order.deliveryLocation || {};
//       order.deliveryLocation.coordinates = { latitude: 23.0225, longitude: 72.5714 };
//     }

//     // Get available drivers
//     const drivers = await Driver.find({
//       isActive: true,
//       // isAvailable: true,
//       profileStatus: 'approved'
//     })
   
//       .select('name phone vehicleNumber profileImage isAvailable')
//       .lean();

//     res.render('delivery_create', {
//       title: `Create Delivery - ${order.orderNumber}`,
//       user: req.user,
//       order,
//       drivers,
//       url: req.originalUrl,
//       messages: req.flash()
//     });

//   } catch (error) {
//     console.error('[RENDER-CREATE-DELIVERY] Error:', error);
//     req.flash('error', 'Failed to load create delivery page');
//     res.redirect('/admin/orders');
//   }
// };

// exports.createDeliveryFromOrder = async (req, res) => {
//   try {
//     const { orderId } = req.params;
//     const {
//       customerId,
//       driverId,
//       scheduledPickupTime,
//       scheduledDeliveryTime,
//       instructions,
//       waypoints,
//       routeDistance,
//       routeDuration
//     } = req.body;

//     const order = await Order.findById(orderId)
//       .populate({
//         path: 'customerId',
//         model: 'Customer'
//       });

//     if (!order) {
//       req.flash('error', 'Order not found');
//       return res.redirect('/admin/orders');
//     }

//     const existing = await Delivery.findOne({ orderId: order.orderNumber });
//     if (existing) {
//       req.flash('error', 'Delivery already exists for this order');
//       return res.redirect(`/admin/deliveries/${existing._id}`);
//     }

//     const driver = await Driver.findById(driverId);
//     if (!driver) {
//       req.flash('error', 'Driver not found');
//       return res.redirect(`/admin/orders/${orderId}/create-delivery`);
//     }

//     if (driver.profileStatus !== 'approved') {
//       req.flash('warning', 'Note: Driver is not approved yet, but assigning anyway');
//       return res.redirect(`/admin/orders/${orderId}/create-delivery`);
//     }

//     // Generate tracking number
//     const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
//     const random = Math.floor(1000 + Math.random() * 9000);
//     const trackingNumber = `DEL${dateStr}${random}`;

//     // Parse waypoints
//     let parsedWaypoints = [];
//     if (waypoints) {
//       try {
//         parsedWaypoints = JSON.parse(waypoints);
//       } catch (e) {
//         console.error('Waypoints parse error:', e);
//       }
//     }

//     // ================================================================
//     // CHAINING LOGIC — ab creation-order se nahi, balki actual live
//     // proximity-optimized route ke LAST STOP se chain hota hai.
//     // Isse ek-ek karke (one-by-one) assign karne par bhi route
//     // optimization sahi rehta hai, chahe assign karne ka order kuch bhi ho.
//     // ================================================================
//     let previousDeliveryForDriver = null;
//     try {
//       const sorted = await getSortedUpcomingForDriver(driverId);
//       const validUpcoming = (sorted.upcoming || []).filter(u => {
//         const status = String(u.status || '').toLowerCase().trim();
//         return !['delivered', 'completed', 'cancelled'].includes(status);
//       });

//       if (validUpcoming.length > 0) {
//         // Route chain ka actual aakhri stop — isi se naya delivery chain hoga
//         const lastStop = validUpcoming[validUpcoming.length - 1];
//         previousDeliveryForDriver = await Delivery.findById(lastStop.id)
//           .select('deliveryLocation trackingNumber status');
//         console.log(`[CREATE-DELIVERY] Route ka actual last stop: ${previousDeliveryForDriver?.trackingNumber}`);
//       }
//     } catch (chainErr) {
//       console.error('[CREATE-DELIVERY] Live route chain lookup failed, falling back to most-recent:', chainErr.message);
//       // Fallback: agar live proximity lookup fail ho jaaye (jaise driver location missing),
//       // purani chronological logic use karo taaki delivery creation block na ho
//       previousDeliveryForDriver = await Delivery.findOne({
//         driverId,
//         status: { $nin: ['Delivered', 'Failed', 'Cancelled', 'Completed', 'delivered', 'failed', 'cancelled', 'completed'] }
//       })
//         .sort({ createdAt: -1 })
//         .select('deliveryLocation trackingNumber status');
//     }

//     const hasValidPreviousStop = !!(
//       previousDeliveryForDriver?.deliveryLocation?.coordinates?.latitude &&
//       previousDeliveryForDriver?.deliveryLocation?.coordinates?.longitude &&
//       previousDeliveryForDriver?.deliveryLocation?.address
//     );

//     const effectivePickupLocation = hasValidPreviousStop
//       ? previousDeliveryForDriver.deliveryLocation
//       : order.pickupLocation;

//     if (hasValidPreviousStop) {
//       console.log(`[CREATE-DELIVERY] 🔗 Chained pickup from: ${previousDeliveryForDriver.trackingNumber}`);
//     } else {
//       console.log(`[CREATE-DELIVERY] Using original factory pickup`);
//     }

//     // Safe coordinates
//     const pickupCoords = {
//       latitude: effectivePickupLocation?.coordinates?.latitude || 23.0225,
//       longitude: effectivePickupLocation?.coordinates?.longitude || 72.5714
//     };

//     const deliveryCoords = {
//       latitude: order?.deliveryLocation?.coordinates?.latitude || 23.0225,
//       longitude: order?.deliveryLocation?.coordinates?.longitude || 72.5714
//     };

//     // ==================== CREATE DELIVERY ====================
//     const delivery = await Delivery.create({
//       trackingNumber,
//       orderId: order.orderNumber,
//       customerId: order.customerId?._id || null,
//       driverId,
//       vehicleNumber: driver.vehicleNumber,

//       // Original Factory Pickup (List view ke liye important)
//       originalPickupLocation: order.pickupLocation,     // ← Yeh line important hai

//       // Effective pickup (chaining ke liye)
//       pickupLocation: {
//         ...effectivePickupLocation,
//         coordinates: pickupCoords
//       },

//       deliveryLocation: {
//         ...order.deliveryLocation,
//         coordinates: deliveryCoords
//       },

//       previousDeliveryId: previousDeliveryForDriver?._id || null,

//       packageDetails: {
//         description: order.items?.map(i => i.productName).join(', ') || 'Package',
//         quantity: order.items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 1,
//         weight: order.items?.reduce((sum, i) => sum + (i.specifications?.weight || 0), 0) || 0
//       },

//       scheduledPickupTime: scheduledPickupTime ? new Date(scheduledPickupTime) : null,
//       scheduledDeliveryTime: scheduledDeliveryTime ? new Date(scheduledDeliveryTime) : null,
//       instructions,
//       waypoints: parsedWaypoints,
//       distance: parseFloat(routeDistance) || 0,
//       estimatedDuration: parseInt(routeDuration) || 0,
//       status: 'assigned',
//       priority: order.priority || 'medium',
//       createdBy: req.user._id
//     });

//     // Update previous delivery's nextDeliveryId
//     if (previousDeliveryForDriver?._id) {
//       await Delivery.findByIdAndUpdate(previousDeliveryForDriver._id, { 
//         nextDeliveryId: delivery._id 
//       });
//     }

//     // Update order
//     order.deliveryId = delivery._id;
//     order.status = 'assigned';
//     await order.save();

//     // Status History
//     await DeliveryStatusHistory.create({
//       deliveryId: delivery._id,
//       status: 'assigned',
//       remarks: hasValidPreviousStop
//         ? `Delivery assigned to ${driver.name} — chained from ${previousDeliveryForDriver.trackingNumber}`
//         : `Delivery assigned to ${driver.name}`,
//       updatedBy: {
//         userId: req.user._id,
//         userRole: req.user.role,
//         userName: req.user.name
//       }
//     });

//     // Notifications
//     if (driver.fcmToken) {
//       try {
//         const result = await sendNotification(driver.fcmToken, {
//           title: "Delivery Assigned 🚚",
//           body: `You have a new delivery. Pickup from ${effectivePickupLocation?.address || 'location'}`,
//           deliveryId: delivery._id.toString(),
//           trackingNumber: delivery.trackingNumber,
//           type: "delivery_assigned"
//         });
//         if (result) {
//           console.log(`[CREATE-DELIVERY-NOTIF-SUCCESS] FCM push sent to driver ${driver._id}`);
//         } else {
//           console.warn(`[CREATE-DELIVERY-NOTIF] sendNotification returned null — check driver.fcmToken validity`);
//         }
//       } catch (pushErr) {
//         console.error("[CREATE-DELIVERY-FCM-ERROR]", pushErr.code || pushErr.message || pushErr);
//       }
//     } else {
//       console.warn(`No FCM token for driver ${driver._id} → assignment push notification skipped`);
//     }

//     try {
//       await Notification.create({
//         recipientId: driver._id,
//         recipientType: 'Driver',
//         type: 'delivery_assigned',
//         title: 'New Delivery Assigned',
//         message: `You have been assigned delivery ${delivery.trackingNumber}.`,
//         referenceId: delivery._id,
//         referenceModel: 'Delivery',
//         priority: `${delivery.priority}`,
//         createdAt: new Date()
//       });
//     } catch (notifErr) {
//       console.error("[NOTIF-ERROR]", notifErr.message);
//     }

//     console.log('[CREATE-DELIVERY] Success:', delivery.trackingNumber);
//     req.flash('success', 'Delivery created and driver assigned successfully!');
//     res.redirect(`/admin/deliveries/${delivery._id}`);

//   } catch (error) {
//     console.error('[CREATE-DELIVERY] Error:', error);
//     req.flash('error', error.message || 'Failed to create delivery');
//     res.redirect(`/admin/orders/${req.params.orderId}/create-delivery`);
//   }
// };

// // ============= CANCEL DELIVERY (ADMIN CAN ONLY CANCEL) =============
// exports.cancelDelivery = async (req, res) => {
//   try {
//     const { deliveryId } = req.params;
//     const { remarks = 'Cancelled by admin' } = req.body;

//     const delivery = await Delivery.findById(deliveryId);
//     if (!delivery) {
//       return res.status(404).json({ success: false, message: 'Delivery not found' });
//     }

//     if (['Delivered', 'Cancelled'].includes(delivery.status)) {
//       return res.status(400).json({
//         success: false,
//         message: `Cannot cancel delivery in ${delivery.status} status`
//       });
//     }

//     const previousStatus = delivery.status;
//     delivery.status = 'Cancelled';
//     await delivery.save();

//     // Fetch driver
//     let driver = null;
//     if (delivery.driverId) {
//       driver = await Driver.findById(delivery.driverId).select('name fcmToken');

//       // Free the driver
//       await Driver.findByIdAndUpdate(delivery.driverId, {
//         isAvailable: true,
//         $unset: { currentLocation: "" } // optional: clear live location
//       });
//     }

//     // Update order if linked
//     if (delivery.orderId) {
//       await Order.updateOne(
//         { orderNumber: delivery.orderId },
//         { status: 'Cancelled' }
//       );
//     }

//     // Status history
//     await DeliveryStatusHistory.create({
//       deliveryId: delivery._id,
//       status: 'Cancelled',
//       previousStatus: previousStatus,
//       remarks: remarks,
//       updatedBy: {
//         userId: req.user._id,
//         userRole: req.user.role,
//         userName: req.user.name
//       }
//     });

//     // ────────────────────────────────────────────────
//     // NOTIFICATIONS – only if driver exists
//     // ────────────────────────────────────────────────
//     if (driver) {
//       console.log(`[CANCEL-NOTIF] Preparing for driver ${driver._id} (${driver.name})`);

//       // 1. Push Notification (FCM)
//       if (driver.fcmToken) {
//         console.log(`[CANCEL-FCM] Attempting send to: ${driver.fcmToken.substring(0, 20)}...`);
//         try {
//           const result = await sendNotification(driver.fcmToken, {
//             title: "Delivery Cancelled",
//             body: `Your assigned delivery ${delivery.trackingNumber} has been cancelled.\nReason: ${remarks}`,
//             deliveryId: delivery._id.toString(),
//             trackingNumber: delivery.trackingNumber,
//             reason: remarks,
//             type: "delivery_cancelled"
//           });
//           if (result) {
//             console.log(`[CANCEL-NOTIF-SUCCESS] FCM sent`);
//           } else {
//             console.warn(`[CANCEL-NOTIF] sendNotification returned null`);
//           }
//         } catch (pushErr) {
//           console.error("[CANCEL-FCM-ERROR]", pushErr.code || pushErr.message || pushErr);
//         }
//       } else {
//         console.warn("[CANCEL-NOTIF] No fcmToken for driver");
//       }

//       // 2. In-app Notification (consistent with schema)
//       try {
//         const notif = await Notification.create({
//           recipientId: driver._id,
//           recipientType: 'Driver',
//           type: 'delivery_cancelled',
//           title: 'Delivery Cancelled',
//           message: `Your assigned delivery ${delivery.trackingNumber} has been cancelled.\nReason: ${remarks}`,
//           referenceId: delivery._id,
//           referenceModel: 'Delivery',
//           priority: 'high',
//           createdAt: new Date()
//         });
//         console.log(`[CANCEL-NOTIF-SUCCESS] In-app created → ID: ${notif._id}`);
//       } catch (notifErr) {
//         console.error("[CANCEL-NOTIF-ERROR]", notifErr.message || notifErr);
//       }
//     } else {
//       console.warn("[CANCEL-NOTIF] No driver attached to delivery");
//     }

//     // Socket emit (if using)
//     if (global.io && driver) {
//       global.io.to('admin-room').emit('delivery:status:update', {
//         deliveryId: delivery._id,
//         status: 'Cancelled',
//         timestamp: new Date()
//       });

//       global.io.to('admin-room').emit('driver:available', {
//         driverId: delivery.driverId,
//         driverName: driver.name,
//         status: 'available'
//       });
//     }

//     return res.json({
//       success: true,
//       message: 'Delivery cancelled successfully. Driver is now available again.'
//     });

//   } catch (error) {
//     console.error('[CANCEL-DELIVERY] Error:', error);
//     return res.status(500).json({ success: false, message: 'Failed to cancel delivery' });
//   }
// };

// // ============= GET DRIVER'S CURRENT LOCATION (API) =============
// exports.getDriverCurrentLocation = async (req, res) => {
//   try {
//     const { deliveryId } = req.params;

//     const delivery = await Delivery.findById(deliveryId)
//       .populate({
//         path: 'driverId',
//         select: 'name vehicleNumber currentLocation'
//       })
//       .populate('journeyId')   // ← add this if you have journeyId in Delivery
//       .lean();

//     if (!delivery) {
//       return res.status(404).json({ success: false, message: 'Delivery not found' });
//     }

//     if (!delivery.driverId) {
//       return res.status(404).json({ success: false, message: 'No driver assigned' });
//     }

//     let locationData = {
//       driverId: delivery.driverId._id,
//       driverName: delivery.driverId.name,
//       vehicleNumber: delivery.driverId.vehicleNumber,
//       currentLocation: delivery.driverId.currentLocation || null,
//       deliveryStatus: delivery.status,
//       lastUpdate: delivery.driverId.currentLocation?.timestamp || null
//     };

//     // If journey exists and has history → send full path for completed/in-progress
//     if (delivery.journeyId?.locationHistory?.length > 0) {
//       locationData.pathHistory = delivery.journeyId.locationHistory.map(point => ({
//         lat: point.latitude,
//         lng: point.longitude,
//         timestamp: point.timestamp
//       }));
//     }

//     return res.json({
//       success: true,
//       data: locationData
//     });

//   } catch (error) {
//     console.error('[GET-DRIVER-LOCATION] Error:', error);
//     return res.status(500).json({ success: false, message: 'Failed to get location' });
//   }
// };

// // ============= EDIT DELIVERY =============
// exports.renderEditDelivery = async (req, res) => {
//   try {
//     const { deliveryId } = req.params;

//     const delivery = await Delivery.findById(deliveryId)
//       .populate('customerId')
//       .populate('driverId', 'name phone vehicleNumber')
//       .lean();

//     if (!delivery) {
//       req.flash('error', 'Delivery not found');
//       return res.redirect('/admin/deliveries');
//     }

//     // Get available drivers (current driver + all available ones)
//     const drivers = await Driver.find({
//       $or: [
//         { _id: delivery.driverId },
//         { isActive: true, isAvailable: true, profileStatus: 'approved' }
//       ]
//     })
//       .select('name phone vehicleNumber profileImage isAvailable')
//       .sort({ name: 1 })
//       .lean();

//     res.render('delivery_edit', {
//       title: `Edit Delivery - ${delivery.trackingNumber}`,
//       delivery,
//       drivers,
//       user: req.user,
//       url: req.originalUrl,
//       messages: req.flash()
//     });

//   } catch (error) {
//     console.error('[RENDER-EDIT-DELIVERY] Error:', error);
//     req.flash('error', 'Failed to load edit page');
//     res.redirect('/admin/deliveries');
//   }
// };


// exports.updateDelivery = async (req, res) => {
//   try {
//     const { deliveryId } = req.params;
//     const {
//       driverId: inputDriverId,
//       scheduledPickupTime,
//       scheduledDeliveryTime,
//       instructions,
//       waypoints,
//       routeDistance,
//       routeDuration
//     } = req.body;

//     console.log('[UPDATE-DEBUG] Input driverId:', inputDriverId);
//     console.log('[UPDATE-DEBUG] Input driverId type:', typeof inputDriverId);
//     console.log('[UPDATE-DEBUG] Request body:', req.body);

//     // ────────────────────────────────────────────────
//     // Clean & Validate driverId (handle [object Object] case)
//     // ────────────────────────────────────────────────
//     let cleanDriverId = null;

//     if (inputDriverId) {
//       // Invalid case from bad form serialization
//       if (String(inputDriverId).includes('[object') || String(inputDriverId) === '[object Object]') {
//         console.error('[UPDATE-ERROR] Invalid driverId format from form:', inputDriverId);
//         req.flash('error', 'Invalid driver selection. Please try again.');
//         return res.redirect(`/admin/deliveries/${deliveryId}/edit`);
//       }

//       try {
//         if (typeof inputDriverId === 'string' && inputDriverId.length === 24) {
//           cleanDriverId = inputDriverId;
//         } else if (typeof inputDriverId === 'object' && inputDriverId._id) {
//           cleanDriverId = inputDriverId._id.toString();
//         } else if (inputDriverId.toString && inputDriverId.toString().length === 24) {
//           cleanDriverId = inputDriverId.toString();
//         } else {
//           throw new Error('Cannot extract valid driver ID');
//         }
//       } catch (parseErr) {
//         console.error('[UPDATE-ERROR] Failed to parse driverId:', parseErr.message);
//         req.flash('error', 'Invalid driver ID format. Please select a driver from the dropdown.');
//         return res.redirect(`/admin/deliveries/${deliveryId}/edit`);
//       }
//     }

//     console.log('[UPDATE-DEBUG] Cleaned driverId:', cleanDriverId);

//     // Fetch delivery
//     const delivery = await Delivery.findById(deliveryId);
//     if (!delivery) {
//       req.flash('error', 'Delivery not found');
//       return res.redirect('/admin/deliveries');
//     }

//     const currentDriverIdStr = delivery.driverId ? delivery.driverId.toString() : null;
//     console.log('[UPDATE-DEBUG] Current driverId (string):', currentDriverIdStr);

//     // Parse waypoints
//     let parsedWaypoints = [];
//     if (waypoints) {
//       try {
//         parsedWaypoints = JSON.parse(waypoints);
//       } catch (e) {
//         console.warn('Invalid waypoints JSON:', e.message);
//       }
//     }

//     // Update non-driver fields
//     if (scheduledPickupTime) delivery.scheduledPickupTime = new Date(scheduledPickupTime);
//     if (scheduledDeliveryTime) delivery.scheduledDeliveryTime = new Date(scheduledDeliveryTime);
//     if (instructions) delivery.instructions = instructions;
//     if (parsedWaypoints.length > 0) delivery.waypoints = parsedWaypoints;
//     if (routeDistance) delivery.distance = parseFloat(routeDistance) || delivery.distance;
//     if (routeDuration) delivery.estimatedDuration = parseInt(routeDuration) || delivery.estimatedDuration;

//     // Handle driver change
//     let driverChanged = false;
//     let oldDriver = null;
//     let newDriver = null;
//     const newDriverIdStr = cleanDriverId;

//     if (newDriverIdStr && newDriverIdStr !== currentDriverIdStr) {
//       console.log('[UPDATE-DEBUG] Driver change detected');

//       newDriver = await Driver.findById(newDriverIdStr);
//       if (!newDriver) {
//         req.flash('error', 'Selected driver not found');
//         return res.redirect(`/admin/deliveries/${deliveryId}/edit`);
//       }

//       if (!newDriver.isAvailable || newDriver.profileStatus !== 'approved') {
//         req.flash('error', 'Selected driver is not available or not approved');
//         return res.redirect(`/admin/deliveries/${deliveryId}/edit`);
//       }

//       // Free old driver
//       if (currentDriverIdStr) {
//         oldDriver = await Driver.findById(currentDriverIdStr);
//         if (oldDriver) {
//           oldDriver.isAvailable = true;
//           await oldDriver.save();
//           console.log(`[UPDATE] Freed old driver: ${oldDriver.name}`);
//         }
//       }

//       // Assign new driver
//       delivery.driverId = newDriver._id;
//       delivery.vehicleNumber = newDriver.vehicleNumber;
//       newDriver.isAvailable = false;
//       await newDriver.save();

//       driverChanged = true;
//       console.log(`[UPDATE] Reassigned to new driver: ${newDriver.name}`);
//     }

//     // Save updated delivery
//     await delivery.save();
//     console.log('[UPDATE-DEBUG] Delivery saved successfully');

//     // Status history
//     await DeliveryStatusHistory.create({
//       deliveryId: delivery._id,
//       status: delivery.status,
//       remarks: driverChanged
//         ? `Delivery reassigned from ${oldDriver?.name || 'previous driver'} to ${newDriver?.name}`
//         : 'Delivery details updated (route/schedule/etc.)',
//       updatedBy: {
//         userId: req.user._id,
//         userRole: req.user.role,
//         userName: req.user.name
//       }
//     });

//     // ────────────────────────────────────────────────
//     // NOTIFICATIONS
//     // ────────────────────────────────────────────────
//     console.log('[UPDATE-NOTIF] Starting notifications...');

//     if (driverChanged) {
//       console.log('[UPDATE-NOTIF] Driver changed - notifying both old and new');

//       // OLD DRIVER (cancel/reassign notification)
//       if (oldDriver) {
//         console.log(`[UPDATE-NOTIF] Notifying OLD driver: ${oldDriver.name}`);

//         // Push notification
//         if (oldDriver.fcmToken) {
//           try {
//             await sendNotification(oldDriver.fcmToken, {
//               title: "Delivery Reassigned",
//               body: `Delivery ${delivery.trackingNumber} has been reassigned to another driver.`,
//               deliveryId: delivery._id.toString(),
//               trackingNumber: delivery.trackingNumber,
//               reason: "Reassigned to another driver",
//               type: "delivery_cancelled"
//             });
//             console.log(`[UPDATE-NOTIF] FCM sent to OLD driver`);
//           } catch (e) {
//             console.error("[UPDATE-FCM-OLD-ERROR]", e.message || e);
//           }
//         } else {
//           console.warn("[UPDATE-NOTIF] No FCM token for OLD driver");
//         }

//         // In-app notification
//         try {
//           await Notification.create({
//             recipientId: oldDriver._id,
//             recipientType: 'Driver',
//             type: 'delivery_cancelled',
//             title: 'Delivery Reassigned',
//             message: `Delivery ${delivery.trackingNumber} has been reassigned to another driver.`,
//             referenceId: delivery._id,
//             referenceModel: 'Delivery',
//             priority: 'high',
//             createdAt: new Date()
//           });
//           console.log(`[UPDATE-NOTIF] In-app sent to OLD driver`);
//         } catch (e) {
//           console.error("[UPDATE-INAPP-OLD-ERROR]", e.message || e);
//         }
//       }

//       // NEW DRIVER (assigned notification)
//       if (newDriver) {
//         console.log(`[UPDATE-NOTIF] Notifying NEW driver: ${newDriver.name}`);

//         // Push notification
//         if (newDriver.fcmToken) {
//           try {
//             await sendNotification(newDriver.fcmToken, {
//               title: "New Delivery Assigned",
//               body: `Delivery ${delivery.trackingNumber} has been assigned to you. Please check details in the app.`,
//               deliveryId: delivery._id.toString(),
//               trackingNumber: delivery.trackingNumber,
//               customerName: delivery.customerId?.name || "Customer",
//               pickup: delivery.pickupLocation?.address || "",
//               type: "delivery_assigned"
//             });
//             console.log(`[UPDATE-NOTIF] FCM sent to NEW driver`);
//           } catch (e) {
//             console.error("[UPDATE-FCM-NEW-ERROR]", e.message || e);
//           }
//         } else {
//           console.warn("[UPDATE-NOTIF] No FCM token for NEW driver");
//         }

//         // In-app notification
//         try {
//           await Notification.create({
//             recipientId: newDriver._id,
//             recipientType: 'Driver',
//             type: 'delivery_assigned',
//             title: 'New Delivery Assigned',
//             message: `Delivery ${delivery.trackingNumber} has been assigned to you. Please check details in the app.`,
//             referenceId: delivery._id,
//             referenceModel: 'Delivery',
//             priority: 'high',
//             createdAt: new Date()
//           });
//           console.log(`[UPDATE-NOTIF] In-app sent to NEW driver`);
//         } catch (e) {
//           console.error("[UPDATE-INAPP-NEW-ERROR]", e.message || e);
//         }
//       }
//     } else {
//       // No driver change → notify current driver about update
//       console.log('[UPDATE-NOTIF] No driver change - notifying current driver');

//       const currentDriver = await Driver.findById(delivery.driverId);
//       if (currentDriver) {
//         console.log(`[UPDATE-NOTIF] Current driver: ${currentDriver.name}`);

//         // Push notification
//         if (currentDriver.fcmToken) {
//           try {
//             await sendNotification(currentDriver.fcmToken, {
//               title: "Delivery Updated",
//               body: `Delivery ${delivery.trackingNumber} details have been updated. Please check the app.`,
//               deliveryId: delivery._id.toString(),
//               trackingNumber: delivery.trackingNumber,
//               type: "delivery_updated"
//             });
//             console.log(`[UPDATE-NOTIF] FCM update sent to current driver`);
//           } catch (e) {
//             console.error("[UPDATE-FCM-CURRENT-ERROR]", e.message || e);
//           }
//         } else {
//           console.warn("[UPDATE-NOTIF] No FCM token for current driver");
//         }

//         // In-app notification
//         try {
//           await Notification.create({
//             recipientId: currentDriver._id,
//             recipientType: 'Driver',
//             type: 'delivery_updated',
//             title: 'Delivery Updated',
//             message: `Delivery ${delivery.trackingNumber} details have been updated. Please check the app.`,
//             referenceId: delivery._id,
//             referenceModel: 'Delivery',
//             priority: 'medium',
//             createdAt: new Date()
//           });
//           console.log(`[UPDATE-NOTIF] In-app update created for current driver`);
//         } catch (e) {
//           console.error("[UPDATE-INAPP-CURRENT-ERROR]", e.message || e);
//         }
//       } else {
//         console.warn("[UPDATE-NOTIF] No current driver found");
//       }
//     }

//     console.log('[UPDATE-DEBUG] Update completed successfully');
//     req.flash('success', 'Delivery updated successfully!');
//     res.redirect(`/admin/deliveries/${delivery._id}`);

//   } catch (error) {
//     console.error('[UPDATE-DELIVERY] Error:', error);
//     console.error('[UPDATE-DELIVERY] Stack:', error.stack);
//     req.flash('error', error.message || 'Failed to update delivery');
//     res.redirect(`/admin/deliveries/${req.params.deliveryId}/edit`);
//   }
// };

// // ============= GET COMPLETED JOURNEY ROUTE (for delivered deliveries) =============
// exports.getCompletedJourneyRoute = async (req, res) => {
//   try {
//     const { deliveryId } = req.params;

//     // Find journey for this delivery
//     const Journey = require('../../models/Journey');
//     const journey = await Journey.findOne({ deliveryId })
//       .select('waypoints totalDistance totalDuration averageSpeed startLocation endLocation')
//       .lean();

//     if (!journey) {
//       return res.status(404).json({
//         success: false,
//         message: 'No journey found for this delivery'
//       });
//     }

//     // Build path from journey waypoints
//     const path = [];

//     // Add start location
//     if (journey.startLocation?.coordinates) {
//       path.push({
//         lat: journey.startLocation.coordinates.latitude,
//         lng: journey.startLocation.coordinates.longitude
//       });
//     }

//     // Add all waypoints
//     if (journey.waypoints && journey.waypoints.length > 0) {
//       journey.waypoints.forEach(wp => {
//         if (wp.location?.coordinates) {
//           path.push({
//             lat: wp.location.coordinates.latitude,
//             lng: wp.location.coordinates.longitude
//           });
//         }
//       });
//     }

//     // Add end location
//     if (journey.endLocation?.coordinates) {
//       path.push({
//         lat: journey.endLocation.coordinates.latitude,
//         lng: journey.endLocation.coordinates.longitude
//       });
//     }

//     console.log(`[GET-JOURNEY-ROUTE] Delivery: ${deliveryId}, Path points: ${path.length}`);

//     return res.json({
//       success: true,
//       data: {
//         path,
//         stats: {
//           totalDistance: journey.totalDistance ? `${journey.totalDistance.toFixed(2)} km` : 'N/A',
//           totalDuration: journey.totalDuration ? `${journey.totalDuration} mins` : 'N/A',
//           averageSpeed: journey.averageSpeed ? `${journey.averageSpeed.toFixed(1)} km/h` : 'N/A'
//         }
//       }
//     });

//   } catch (error) {
//     console.error('[GET-JOURNEY-ROUTE] Error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to fetch journey route',
//       error: error.message
//     });
//   }
// };

// exports.addDeliveryRemark = async (req, res) => {
//   try {
//     const { deliveryId } = req.params;
//     const { message, images } = req.body;

//     const delivery = await Delivery.findById(deliveryId);
//     if (!delivery) {
//       return errorResponse(res, 'Delivery not found', 404);
//     }

//     const remark = {
//       message,
//       images: images || [],
//       createdBy: req.user._id,
//       createdAt: new Date()
//     };

//     if (!delivery.remarks) delivery.remarks = [];
//     delivery.remarks.push(remark);

//     await delivery.save();

//     return successResponse(res, 'Remark added successfully', { remark });

//   } catch (error) {
//     console.error('[ADD-REMARK] Error:', error);
//     return errorResponse(res, 'Failed to add remark', 500);
//   }
// };

// // ============= GET ALL DRIVER LOCATIONS FOR DASHBOARD =============
// exports.getAllDriverLocations = async (req, res) => {
//   try {
//     // Find all active drivers with their current locations
//     const drivers = await Driver.find({
//       isActive: true,
//       profileStatus: 'approved'
//     })
//       .select('name phone vehicleNumber profileImage isAvailable currentLocation')
//       .lean();

//     // Filter drivers who have valid location data
//     const driversWithLocation = drivers.filter(driver =>
//       driver.currentLocation &&
//       driver.currentLocation.latitude &&
//       driver.currentLocation.longitude
//     );

//     // Format response
//     const formattedDrivers = driversWithLocation.map(driver => ({
//       _id: driver._id,
//       name: driver.name,
//       phone: driver.phone,
//       vehicleNumber: driver.vehicleNumber,
//       profileImage: driver.profileImage,
//       isAvailable: driver.isAvailable,
//       currentLocation: {
//         latitude: driver.currentLocation.latitude,
//         longitude: driver.currentLocation.longitude,
//         timestamp: driver.currentLocation.timestamp || new Date(),
//         speed: driver.currentLocation.speed || 0,
//         heading: driver.currentLocation.heading || 0
//       }
//     }));

//     console.log(`[GET-ALL-DRIVER-LOCATIONS] Returning ${formattedDrivers.length} drivers with location`);

//     return res.json({
//       success: true,
//       data: formattedDrivers,
//       count: formattedDrivers.length
//     });

//   } catch (error) {
//     console.error('[GET-ALL-DRIVER-LOCATIONS] Error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to fetch driver locations',
//       error: error.message
//     });
//   }
// };

// // ============= GET SINGLE DRIVER LOCATION =============
// exports.getSingleDriverLocation = async (req, res) => {
//   try {
//     const { driverId } = req.params;

//     const driver = await Driver.findById(driverId)
//       .select('name phone vehicleNumber isAvailable currentLocation')
//       .lean();

//     if (!driver) {
//       return res.status(404).json({
//         success: false,
//         message: 'Driver not found'
//       });
//     }

//     if (!driver.currentLocation || !driver.currentLocation.latitude) {
//       return res.status(404).json({
//         success: false,
//         message: 'Driver location not available'
//       });
//     }

//     return res.json({
//       success: true,
//       data: {
//         _id: driver._id,
//         name: driver.name,
//         phone: driver.phone,
//         vehicleNumber: driver.vehicleNumber,
//         isAvailable: driver.isAvailable,
//         currentLocation: driver.currentLocation
//       }
//     });

//   } catch (error) {
//     console.error('[GET-SINGLE-DRIVER-LOCATION] Error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to fetch driver location',
//       error: error.message
//     });
//   }
// };

// // ============= GET DRIVERS BY STATUS =============
// exports.getDriversByStatus = async (req, res) => {
//   try {
//     const { status } = req.query; // 'available', 'busy', 'all'

//     let query = {
//       isActive: true,
//       profileStatus: 'approved'
//     };

//     if (status === 'available') {
//       query.isAvailable = true;
//     } else if (status === 'busy') {
//       query.isAvailable = false;
//     }

//     const drivers = await Driver.find(query)
//       .select('name phone vehicleNumber profileImage isAvailable currentLocation')
//       .lean();

//     const driversWithLocation = drivers.filter(driver =>
//       driver.currentLocation &&
//       driver.currentLocation.latitude &&
//       driver.currentLocation.longitude
//     );

//     console.log(`[GET-DRIVERS-BY-STATUS] Status: ${status || 'all'}, Found: ${driversWithLocation.length} drivers`);

//     return res.json({
//       success: true,
//       data: driversWithLocation,
//       count: driversWithLocation.length
//     });

//   } catch (error) {
//     console.error('[GET-DRIVERS-BY-STATUS] Error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to fetch drivers',
//       error: error.message
//     });
//   }
// };

// // ============= UPDATE DELIVERY PRIORITY (FULL SOCKET UPDATE) =============
// exports.updateDeliveryPriority = async (req, res) => {
//     console.log('\n=== [PRIORITY UPDATE] ENDPOINT HIT ===');
//     console.log('URL:', req.originalUrl);
//     console.log('Params:', req.params);
//     console.log('Body:', req.body);

//     try {
//         const { deliveryId } = req.params;
//         const { priority } = req.body;

//         if (!deliveryId) {
//             console.log('❌ Missing deliveryId');
//             return res.status(400).json({ success: false, message: 'Delivery ID is required' });
//         }

//         if (!['low', 'medium', 'high', 'urgent'].includes(priority)) {
//             console.log('❌ Invalid priority:', priority);
//             return res.status(400).json({ success: false, message: 'Invalid priority value' });
//         }

//         // Full delivery fetch with relations
//         const delivery = await Delivery.findById(deliveryId)
//             .populate('driverId', 'name fcmToken vehicleNumber')
//             .populate('customerId', 'name companyName')
//             .lean();

//         if (!delivery) {
//             console.log('❌ Delivery not found');
//             return res.status(404).json({ success: false, message: 'Delivery not found' });
//         }

//         const oldPriority = delivery.priority;

//         // Update in DB
//         await Delivery.findByIdAndUpdate(deliveryId, { priority });

//         console.log(`✅ Priority updated: ${oldPriority} → ${priority}`);

//         // Refresh full delivery data
//         const updatedDelivery = await Delivery.findById(deliveryId)
//             .populate('driverId', 'name fcmToken vehicleNumber')
//             .populate('customerId', 'name companyName')
//             .lean();

//         // ==================== SOCKET PAYLOAD ====================
//         const io = req.app.get('io');
//         const socketPayload = {
//             type: "delivery:priority:updated",
//             deliveryId: updatedDelivery._id.toString(),
//             trackingNumber: updatedDelivery.trackingNumber,
//             priority: updatedDelivery.priority,
//             oldPriority: oldPriority,
//             status: updatedDelivery.status,
//             customerName: updatedDelivery.customerId?.companyName || updatedDelivery.customerId?.name || 'Customer',
//             driverName: updatedDelivery.driverId?.name || null,
//             vehicleNumber: updatedDelivery.driverId?.vehicleNumber || null,
//             pickupAddress: updatedDelivery.pickupLocation?.address || '',
//             deliveryAddress: updatedDelivery.deliveryLocation?.address || '',
//             scheduledPickupTime: updatedDelivery.scheduledPickupTime,
//             scheduledDeliveryTime: updatedDelivery.scheduledDeliveryTime,
//             actualPickupTime: updatedDelivery.actualPickupTime,
//             actualDeliveryTime: updatedDelivery.actualDeliveryTime,
//             timestamp: new Date().toISOString(),
//             message: `Priority changed to ${priority.toUpperCase()}`
//         };

//         if (io) {
//             // Admin ko full update
//             io.to("admin-room").emit("delivery:updated", socketPayload);
//             console.log('📤 Socket emitted to admin-room: delivery:updated');

//             // Driver ko bhi (agar assigned hai)
//             if (updatedDelivery.driverId) {
//                 io.to(`driver-${updatedDelivery.driverId._id}`).emit("delivery:updated", socketPayload);
//                 console.log(`📤 Socket emitted to driver room`);
//             }
//         }

//         // FCM (optional)
//         if (updatedDelivery.driverId?.fcmToken) {
//             try {
//                 await sendNotification(updatedDelivery.driverId.fcmToken, {
//                     title: `Priority Updated: ${priority.toUpperCase()}`,
//                     body: `Your delivery ${updatedDelivery.trackingNumber} priority has been changed.`,
//                     type: 'priority_changed',
//                     deliveryId: updatedDelivery._id.toString(),
//                     trackingNumber: updatedDelivery.trackingNumber
//                 });
//                 console.log(`[PRIORITY-NOTIF-SUCCESS] FCM sent to driver`);
//             } catch (e) {
//                 console.error("[PRIORITY-FCM-ERROR]", e.message || e);
//             }
//         }

//         return res.json({
//             success: true,
//             message: `Priority updated to ${priority.toUpperCase()}`,
//             delivery: {
//                 _id: updatedDelivery._id,
//                 trackingNumber: updatedDelivery.trackingNumber,
//                 priority: updatedDelivery.priority,
//                 status: updatedDelivery.status,
//                 pickupAddress: updatedDelivery.pickupLocation?.address,
//                 deliveryAddress: updatedDelivery.deliveryLocation?.address,
//                 driverName: updatedDelivery.driverId?.name
//             }
//         });

//     } catch (error) {
//         console.error('=== PRIORITY UPDATE ERROR ===', error);
//         return res.status(500).json({ success: false, message: 'Server error' });
//     }
// };


const Delivery = require('../../models/Delivery');
const Order = require('../../models/Order');
const Driver = require('../../models/Driver');
const Customer = require('../../models/Customer');
const DeliveryStatusHistory = require('../../models/DeliveryStatusHistory');
const Notification = require('../../models/Notification');
const mongoose = require('mongoose');
const { successResponse, errorResponse } = require('../../utils/responseHelper');
const { sendNotification } = require("../../utils/sendNotification")
const { getSortedUpcomingForDriver } = require('../Driver/deliveryController');
const { PickupLocation } = require('../../models/Order'); // ✅ Factory (Start) ke liye asli/verified default pickup location

// ✅ "Factory (Start)" ke liye hamesha MASTER Pickup Locations table se
// hi asli/verified coordinates lete hain — delivery record ke apne
// originalPickupLocation par bharosa nahi karte, kyunki wo kabhi kabhi
// missing/stale ho sakta hai aur galat jagah map par dikha deta hai.
// ✅ India ke bounds ke bahar wale (jaise Abu Dhabi glitch) ya missing
// coordinates ko "implausible" maankar reject karta hai.
function isPlausibleLocation(loc) {
  if (!loc?.latitude || !loc?.longitude) return false;
  return loc.latitude >= 6 && loc.latitude <= 38 && loc.longitude >= 68 && loc.longitude <= 98;
}

// ✅ "Factory (Start)" ke liye — SABSE PEHLE order ka apna asli chuna hua
// pickup location (originalPickupLocation) use karo, kyunki alag-alag
// orders alag-alag pickup locations (branches/warehouses) se ho sakte hain.
// SIRF tab MASTER default pickup pe fallback karo jab wo record missing ho
// ya uske coordinates clearly galat/corrupt hon (purane bug se bache records).
async function resolveFactoryLocation(delivery) {
  // ⚠️ IMPORTANT: sirf originalPickupLocation trust karo — delivery.pickupLocation
  // hamesha CHAINED value hoti hai (pichli delivery ki jagah se), asli factory
  // nahi. Isko fallback maanna hi bug tha (kisi aur delivery ki location "Factory
  // (Start)" ban jaati thi jab originalPickupLocation missing hoti thi).
  const ownPickup = delivery.originalPickupLocation;

  if (ownPickup?.address && isPlausibleLocation(ownPickup?.coordinates)) {
    return { address: 'Factory (Start)', coordinates: ownPickup.coordinates };
  }

  console.warn(`[FACTORY-LOCATION] ⚠️ ${delivery.trackingNumber} ka originalPickupLocation missing/corrupt hai — verified default pe fallback kar rahe hain`);
  const verifiedDefault = await getVerifiedFactoryLocation();
  if (verifiedDefault) return verifiedDefault;

  // Kuch na mile to jo tha wahi rakho (kam se kam address dikhega)
  return { address: 'Factory (Start)', coordinates: ownPickup?.coordinates || null };
}

// ✅ Master Pickup Locations table se verified default factory location.
// Ab default entry ke coordinates bhi plausibility-check hote hain — agar
// wo khud galat/corrupt hain (jaise UAE coordinates ke saath India address),
// to usse skip karke koi aur valid active pickup location dhoondhi jaati hai.
async function getVerifiedFactoryLocation() {
  try {
    const defaultPickup = await PickupLocation.findOne({ isDefault: true, isActive: true });
    if (defaultPickup?.coordinates && isPlausibleLocation(defaultPickup.coordinates)) {
      return {
        address: 'Factory (Start)',
        coordinates: {
          latitude: defaultPickup.coordinates.latitude,
          longitude: defaultPickup.coordinates.longitude
        }
      };
    }
    if (defaultPickup) {
      console.warn(`[FACTORY-LOCATION] ⚠️ Default pickup location "${defaultPickup.name || defaultPickup.address}" ke coordinates hi galat hain (${defaultPickup.coordinates?.latitude}, ${defaultPickup.coordinates?.longitude}) — "Manage Pickup Locations" mein isko fix karo. Koi aur valid pickup dhoond rahe hain...`);
    }

    // Default nahi mila ya galat tha — koi bhi active pickup jiske coordinates plausible hon
    const candidates = await PickupLocation.find({ isActive: true }).sort({ createdAt: 1 });
    const validCandidate = candidates.find(p => p.coordinates && isPlausibleLocation(p.coordinates));
    if (validCandidate) {
      return {
        address: 'Factory (Start)',
        coordinates: {
          latitude: validCandidate.coordinates.latitude,
          longitude: validCandidate.coordinates.longitude
        }
      };
    }

    console.error('[FACTORY-LOCATION] ❌ Koi bhi active Pickup Location valid coordinates ke saath nahi mili — "Manage Pickup Locations" mein data check karo');
  } catch (err) {
    console.error('[FACTORY-LOCATION] getVerifiedFactoryLocation error:', err.message);
  }
  return null;
}


// ============= RENDER DELIVERIES LIST =============
exports.renderDeliveriesList = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      startDate,
      endDate,
      driverId
    } = req.query;

    const query = {};
    if (status) query.status = status;
    if (driverId) query.driverId = driverId;

    if (search) {
      query.$or = [
        { trackingNumber: { $regex: search, $options: 'i' } },
        { orderId: { $regex: search, $options: 'i' } }
      ];
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    let deliveries = await Delivery.find(query)
      .populate('customerId', 'name email phone companyName customerId')
      .populate('driverId', 'name phone vehicleNumber currentLocation')
      .lean();

    // === Proximity Sorting ===
    const driverGroups = {};
    for (const del of deliveries) {
      const dId = del.driverId?._id?.toString() || 'unassigned';
      if (!driverGroups[dId]) driverGroups[dId] = [];
      driverGroups[dId].push(del);
    }

    let finalDeliveries = [];

    for (const [dId, group] of Object.entries(driverGroups)) {
      if (dId === 'unassigned') {
        finalDeliveries.push(...group);
        continue;
      }

      try {
        const sorted = await getSortedUpcomingForDriver(dId);
        const upcomingMap = new Map(sorted.upcoming.map(item => [item.id, item]));

        const orderedGroup = group
          .map(del => {
            const sortedItem = upcomingMap.get(del._id.toString());
            return {
              ...del,
              // ✅ Display ke liye rank sirf tab set hoti hai jab delivery
              // active route-chain mein ho. Completed/cancelled deliveries
              // ke liye null rakha — EJS me "-" dikhega, "#999" nahi.
              __nearestRank: sortedItem ? sortedItem.nearestRank : null,
              // Chain mein na ho to bhi, agar delivery ka apna record hua
              // actual distance (delivery complete hote waqt save hua) ho
              // to wahi dikhado — bilkul N/A nahi.
              __distance: sortedItem ? sortedItem.distanceFromDriver : (del.distance ? `${del.distance.toFixed(1)} km` : null),
              __hasRank: !!sortedItem,
              // Sirf INTERNAL sorting ke liye — display mein kabhi use nahi hota
              __sortKey: sortedItem ? sortedItem.nearestRank : 999,
              deliveryLocation: del.deliveryLocation
            };
          })
          .sort((a, b) => a.__sortKey - b.__sortKey);

        // ✅ Pickup Location ab route-chain ke hisaab se set hoti hai:
        // Rank #1 (chain ki pehli delivery) → "Factory (Start)" label
        // Rank #2, #3... → chain mein unse turant pehle wali delivery ka deliveryLocation
        // Jinke paas rank nahi hai (completed/unassigned) → unka original pickup as-is
        // (Same wording jo Route Chain widget mein use hoti hai, list view mein bhi consistent dikhegi)
        let previousInChain = null;
        for (const del of orderedGroup) {
          if (del.__hasRank && previousInChain) {
            del.pickupLocation = previousInChain.deliveryLocation;
          } else if (del.__hasRank) {
            // Chain ki sabse pehli delivery — is order ka apna sahi pickup
            // (agar valid hai), warna verified default factory pe fallback
            del.pickupLocation = await resolveFactoryLocation(del);
          } else {
            del.pickupLocation = del.originalPickupLocation || del.pickupLocation;
          }
          if (del.__hasRank) {
            previousInChain = del;
          }
        }

        finalDeliveries.push(...orderedGroup);

      } catch (e) {
        console.error(`Sorting failed for driver ${dId}`, e.message);
        finalDeliveries.push(...group);
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedDeliveries = finalDeliveries.slice(skip, skip + parseInt(limit));

    // Stats
    const stats = await Delivery.aggregate([{
      $facet: {
        total: [{ $count: 'count' }],
        delivered: [{ $match: { status: 'delivered' } }, { $count: 'count' }],
        inTransit: [{ $match: { status: { $in: ['in_transit', 'assigned', 'picked_up', 'out_for_delivery'] } } }, { $count: 'count' }],
        pending: [{ $match: { status: { $in: ['pending', 'pending_acceptance'] } } }, { $count: 'count' }]
      }
    }]);

    const statistics = {
      total: stats[0].total[0]?.count || 0,
      delivered: stats[0].delivered[0]?.count || 0,
      inTransit: stats[0].inTransit[0]?.count || 0,
      pending: stats[0].pending[0]?.count || 0
    };

    res.render('deliveries_list', {
      title: 'Deliveries Management',
      user: req.user,
      deliveries: paginatedDeliveries,
      stats: statistics,
      pagination: {
        total: finalDeliveries.length,
        page: parseInt(page),
        pages: Math.ceil(finalDeliveries.length / parseInt(limit)),
        limit: parseInt(limit)
      },
      filters: { status, search, startDate, endDate, driverId },
      url: req.originalUrl,
      messages: req.flash()
    });

  } catch (error) {
    console.error('[DELIVERIES-LIST] Error:', error);
    req.flash('error', 'Failed to load deliveries');
    res.redirect('/admin/dashboard');
  }
};

exports.renderDeliveryDetails = async (req, res) => {
  try {
    const { deliveryId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(deliveryId)) {
      req.flash('error', 'Invalid delivery ID');
      return res.redirect('/admin/deliveries');
    }

    const delivery = await Delivery.findById(deliveryId)
      .populate({
        path: 'customerId',
        model: 'Customer',
        select: 'name email phone companyName customerId'
      })
      .populate({
        path: 'driverId',
        select: 'name phone vehicleNumber profileImage currentLocation'
      })
      .populate('createdBy', 'name email')
      .lean();

    if (!delivery) {
      req.flash('error', 'Delivery not found');
      return res.redirect('/admin/deliveries');
    }

    // ================================================================
    // ✅ STRONG FIXED ROUTE CHAIN LOGIC
    // ================================================================
    let effectivePickupLocation = delivery.pickupLocation;
    let routeChain = [];

    if (delivery.driverId) {
      try {
        const driverIdForSort = delivery.driverId._id || delivery.driverId;
        const sorted = await getSortedUpcomingForDriver(driverIdForSort);

        // ✅ Bahut Strong Filter
        const validUpcoming = sorted.upcoming.filter(u => {
          const status = String(u.status || '').toLowerCase().trim();
          return !['delivered', 'completed', 'cancelled', 'Delivered', 'Completed', 'Cancelled'].includes(status);
        });

        const myIndex = validUpcoming.findIndex(u => u.id === delivery._id.toString());

        console.log(`[DELIVERY-DETAILS] Valid Upcoming: ${validUpcoming.length} | My Rank: ${myIndex >= 0 ? myIndex + 1 : 'Not Found'}`);

        // Route Chain Build
        routeChain.push({ label: 'Factory (Start)', isFactory: true, isCurrent: false });

        validUpcoming.forEach((u) => {
          routeChain.push({
            label: u.trackingNumber,
            isFactory: false,
            isCurrent: u.id === delivery._id.toString()
          });
        });

        // Effective Pickup Logic - Sirf Active Delivery se
        if (myIndex > 0) {
          const previousItem = validUpcoming[myIndex - 1];
          const previousDoc = await Delivery.findById(previousItem.id)
            .select('deliveryLocation trackingNumber status')
            .lean();

          const prevStatus = String(previousDoc?.status || '').toLowerCase().trim();

          if (previousDoc && !['delivered', 'completed', 'cancelled'].includes(prevStatus)) {
            effectivePickupLocation = previousDoc.deliveryLocation;
            console.log(`[DELIVERY-DETAILS] Pickup chained from active delivery: ${previousDoc.trackingNumber}`);
          } else {
            console.log(`[DELIVERY-DETAILS] Previous delivery was already delivered - Using original pickup`);
          }
        } else if (myIndex === 0) {
          // ✅ Chain ki sabse pehli delivery — is order ka apna sahi pickup
          // location use hoga (agar valid hai), warna verified default pe
          // fallback hoga — dono cases mein "Factory (Start)" label lagega.
          effectivePickupLocation = await resolveFactoryLocation(delivery);
          console.log(`[DELIVERY-DETAILS] Rank #1 - Factory (Start) coords: ${JSON.stringify(effectivePickupLocation.coordinates)}`);
        } else {
          console.log(`[DELIVERY-DETAILS] Active chain mein nahi mila (completed/cancelled) - stored pickup as-is`);
        }

      } catch (err) {
        console.error('[DELIVERY-DETAILS] Chain resolution failed:', err.message);
      }
    }

    delivery.pickupLocation = effectivePickupLocation;

    // Status History
    const statusHistory = await DeliveryStatusHistory.find({ deliveryId: delivery._id })
      .sort({ timestamp: -1 })
      .populate('updatedBy.userId', 'name email')
      .lean();

    res.render('delivery_details', {
      title: `Delivery ${delivery.trackingNumber}`,
      user: req.user,
      delivery,
      statusHistory,
      routeChain,
      url: req.originalUrl,
      messages: req.flash()
    });

  } catch (error) {
    console.error('[DELIVERY-DETAILS] Error:', error);
    req.flash('error', 'Failed to load delivery details');
    res.redirect('/admin/deliveries');
  }
};
 
// ============= RENDER CREATE DELIVERY FROM ORDER =============
exports.renderCreateDeliveryFromOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      req.flash('error', 'Invalid order ID');
      return res.redirect('/admin/orders');
    }

    const order = await Order.findById(orderId)
      .populate({
        path: 'customerId',
        model: 'Customer',
        select: 'name email phone companyName customerId'
      })
      .lean();

    if (!order) {
      req.flash('error', 'Order not found');
      return res.redirect('/admin/orders');
    }

    const existingDelivery = await Delivery.findOne({ orderId: order.orderNumber });
    if (existingDelivery) {
      req.flash('error', 'Delivery already exists for this order');
      return res.redirect(`/admin/deliveries/${existingDelivery._id}`);
    }

    // Ensure coordinates exist with fallback
    if (!order.pickupLocation?.coordinates) {
      order.pickupLocation = order.pickupLocation || {};
      order.pickupLocation.coordinates = { latitude: 23.0225, longitude: 72.5714 };
    }

    if (!order.deliveryLocation?.coordinates) {
      order.deliveryLocation = order.deliveryLocation || {};
      order.deliveryLocation.coordinates = { latitude: 23.0225, longitude: 72.5714 };
    }

    // Get available drivers
    const drivers = await Driver.find({
      isActive: true,
      // isAvailable: true,
      profileStatus: 'approved'
    })
   
      .select('name phone vehicleNumber profileImage isAvailable')
      .lean();

    res.render('delivery_create', {
      title: `Create Delivery - ${order.orderNumber}`,
      user: req.user,
      order,
      drivers,
      url: req.originalUrl,
      messages: req.flash()
    });

  } catch (error) {
    console.error('[RENDER-CREATE-DELIVERY] Error:', error);
    req.flash('error', 'Failed to load create delivery page');
    res.redirect('/admin/orders');
  }
};

exports.createDeliveryFromOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const {
      customerId,
      driverId,
      scheduledPickupTime,
      scheduledDeliveryTime,
      instructions,
      waypoints,
      routeDistance,
      routeDuration
    } = req.body;

    const order = await Order.findById(orderId)
      .populate({
        path: 'customerId',
        model: 'Customer'
      });

    if (!order) {
      req.flash('error', 'Order not found');
      return res.redirect('/admin/orders');
    }

    const existing = await Delivery.findOne({ orderId: order.orderNumber });
    if (existing) {
      req.flash('error', 'Delivery already exists for this order');
      return res.redirect(`/admin/deliveries/${existing._id}`);
    }

    const driver = await Driver.findById(driverId);
    if (!driver) {
      req.flash('error', 'Driver not found');
      return res.redirect(`/admin/orders/${orderId}/create-delivery`);
    }

    if (driver.profileStatus !== 'approved') {
      req.flash('warning', 'Note: Driver is not approved yet, but assigning anyway');
      return res.redirect(`/admin/orders/${orderId}/create-delivery`);
    }

    // Generate tracking number
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const random = Math.floor(1000 + Math.random() * 9000);
    const trackingNumber = `DEL${dateStr}${random}`;

    // Parse waypoints
    let parsedWaypoints = [];
    if (waypoints) {
      try {
        parsedWaypoints = JSON.parse(waypoints);
      } catch (e) {
        console.error('Waypoints parse error:', e);
      }
    }

    // ================================================================
    // CHAINING LOGIC — ab creation-order se nahi, balki actual live
    // proximity-optimized route ke LAST STOP se chain hota hai.
    // Isse ek-ek karke (one-by-one) assign karne par bhi route
    // optimization sahi rehta hai, chahe assign karne ka order kuch bhi ho.
    // ================================================================
    let previousDeliveryForDriver = null;
    try {
      const sorted = await getSortedUpcomingForDriver(driverId);
      const validUpcoming = (sorted.upcoming || []).filter(u => {
        const status = String(u.status || '').toLowerCase().trim();
        return !['delivered', 'completed', 'cancelled'].includes(status);
      });

      if (validUpcoming.length > 0) {
        // Route chain ka actual aakhri stop — isi se naya delivery chain hoga
        const lastStop = validUpcoming[validUpcoming.length - 1];
        previousDeliveryForDriver = await Delivery.findById(lastStop.id)
          .select('deliveryLocation trackingNumber status');
        console.log(`[CREATE-DELIVERY] Route ka actual last stop: ${previousDeliveryForDriver?.trackingNumber}`);
      }
    } catch (chainErr) {
      console.error('[CREATE-DELIVERY] Live route chain lookup failed, falling back to most-recent:', chainErr.message);
      // Fallback: agar live proximity lookup fail ho jaaye (jaise driver location missing),
      // purani chronological logic use karo taaki delivery creation block na ho
      previousDeliveryForDriver = await Delivery.findOne({
        driverId,
        status: { $nin: ['Delivered', 'Failed', 'Cancelled', 'Completed', 'delivered', 'failed', 'cancelled', 'completed'] }
      })
        .sort({ createdAt: -1 })
        .select('deliveryLocation trackingNumber status');
    }

    const hasValidPreviousStop = !!(
      previousDeliveryForDriver?.deliveryLocation?.coordinates?.latitude &&
      previousDeliveryForDriver?.deliveryLocation?.coordinates?.longitude &&
      previousDeliveryForDriver?.deliveryLocation?.address
    );

    const effectivePickupLocation = hasValidPreviousStop
      ? previousDeliveryForDriver.deliveryLocation
      : order.pickupLocation;

    if (hasValidPreviousStop) {
      console.log(`[CREATE-DELIVERY] 🔗 Chained pickup from: ${previousDeliveryForDriver.trackingNumber}`);
    } else {
      console.log(`[CREATE-DELIVERY] Using original factory pickup`);
    }

    // Safe coordinates
    const pickupCoords = {
      latitude: effectivePickupLocation?.coordinates?.latitude || 23.0225,
      longitude: effectivePickupLocation?.coordinates?.longitude || 72.5714
    };

    const deliveryCoords = {
      latitude: order?.deliveryLocation?.coordinates?.latitude || 23.0225,
      longitude: order?.deliveryLocation?.coordinates?.longitude || 72.5714
    };

    // ==================== CREATE DELIVERY ====================
    const delivery = await Delivery.create({
      trackingNumber,
      orderId: order.orderNumber,
      customerId: order.customerId?._id || null,
      driverId,
      vehicleNumber: driver.vehicleNumber,

      // Original Factory Pickup (List view ke liye important)
      originalPickupLocation: order.pickupLocation,     // ← Yeh line important hai

      // Effective pickup (chaining ke liye)
      pickupLocation: {
        ...effectivePickupLocation,
        coordinates: pickupCoords
      },

      deliveryLocation: {
        ...order.deliveryLocation,
        coordinates: deliveryCoords
      },

      previousDeliveryId: previousDeliveryForDriver?._id || null,

      packageDetails: {
        description: order.items?.map(i => i.productName).join(', ') || 'Package',
        quantity: order.items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 1,
        weight: order.items?.reduce((sum, i) => sum + (i.specifications?.weight || 0), 0) || 0
      },

      scheduledPickupTime: scheduledPickupTime ? new Date(scheduledPickupTime) : null,
      scheduledDeliveryTime: scheduledDeliveryTime ? new Date(scheduledDeliveryTime) : null,
      instructions,
      waypoints: parsedWaypoints,
      distance: parseFloat(routeDistance) || 0,
      estimatedDuration: parseInt(routeDuration) || 0,
      status: 'assigned',
      priority: order.priority || 'medium',
      createdBy: req.user._id
    });

    // Update previous delivery's nextDeliveryId
    if (previousDeliveryForDriver?._id) {
      await Delivery.findByIdAndUpdate(previousDeliveryForDriver._id, { 
        nextDeliveryId: delivery._id 
      });
    }

    // Update order
    order.deliveryId = delivery._id;
    order.status = 'assigned';
    await order.save();

    // Status History
    await DeliveryStatusHistory.create({
      deliveryId: delivery._id,
      status: 'assigned',
      remarks: hasValidPreviousStop
        ? `Delivery assigned to ${driver.name} — chained from ${previousDeliveryForDriver.trackingNumber}`
        : `Delivery assigned to ${driver.name}`,
      updatedBy: {
        userId: req.user._id,
        userRole: req.user.role,
        userName: req.user.name
      }
    });

    // Notifications
    if (driver.fcmToken) {
      try {
        const result = await sendNotification(driver.fcmToken, {
          title: "Delivery Assigned 🚚",
          body: `You have a new delivery. Pickup from ${effectivePickupLocation?.address || 'location'}`,
          deliveryId: delivery._id.toString(),
          trackingNumber: delivery.trackingNumber,
          type: "delivery_assigned"
        });
        if (result) {
          console.log(`[CREATE-DELIVERY-NOTIF-SUCCESS] FCM push sent to driver ${driver._id}`);
        } else {
          console.warn(`[CREATE-DELIVERY-NOTIF] sendNotification returned null — check driver.fcmToken validity`);
        }
      } catch (pushErr) {
        console.error("[CREATE-DELIVERY-FCM-ERROR]", pushErr.code || pushErr.message || pushErr);
      }
    } else {
      console.warn(`No FCM token for driver ${driver._id} → assignment push notification skipped`);
    }

    try {
      await Notification.create({
        recipientId: driver._id,
        recipientType: 'Driver',
        type: 'delivery_assigned',
        title: 'New Delivery Assigned',
        message: `You have been assigned delivery ${delivery.trackingNumber}.`,
        referenceId: delivery._id,
        referenceModel: 'Delivery',
        priority: `${delivery.priority}`,
        createdAt: new Date()
      });
    } catch (notifErr) {
      console.error("[NOTIF-ERROR]", notifErr.message);
    }

    console.log('[CREATE-DELIVERY] Success:', delivery.trackingNumber);
    req.flash('success', 'Delivery created and driver assigned successfully!');
    res.redirect(`/admin/deliveries/${delivery._id}`);

  } catch (error) {
    console.error('[CREATE-DELIVERY] Error:', error);
    req.flash('error', error.message || 'Failed to create delivery');
    res.redirect(`/admin/orders/${req.params.orderId}/create-delivery`);
  }
};

// ============= CANCEL DELIVERY (ADMIN CAN ONLY CANCEL) =============
exports.cancelDelivery = async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const { remarks = 'Cancelled by admin' } = req.body;

    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found' });
    }

    if (['Delivered', 'Cancelled'].includes(delivery.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel delivery in ${delivery.status} status`
      });
    }

    const previousStatus = delivery.status;
    delivery.status = 'Cancelled';
    await delivery.save();

    // Fetch driver
    let driver = null;
    if (delivery.driverId) {
      driver = await Driver.findById(delivery.driverId).select('name fcmToken');

      // Free the driver
      await Driver.findByIdAndUpdate(delivery.driverId, {
        isAvailable: true,
        $unset: { currentLocation: "" } // optional: clear live location
      });
    }

    // Update order if linked
    if (delivery.orderId) {
      await Order.updateOne(
        { orderNumber: delivery.orderId },
        { status: 'Cancelled' }
      );
    }

    // Status history
    await DeliveryStatusHistory.create({
      deliveryId: delivery._id,
      status: 'Cancelled',
      previousStatus: previousStatus,
      remarks: remarks,
      updatedBy: {
        userId: req.user._id,
        userRole: req.user.role,
        userName: req.user.name
      }
    });

    // ────────────────────────────────────────────────
    // NOTIFICATIONS – only if driver exists
    // ────────────────────────────────────────────────
    if (driver) {
      console.log(`[CANCEL-NOTIF] Preparing for driver ${driver._id} (${driver.name})`);

      // 1. Push Notification (FCM)
      if (driver.fcmToken) {
        console.log(`[CANCEL-FCM] Attempting send to: ${driver.fcmToken.substring(0, 20)}...`);
        try {
          const result = await sendNotification(driver.fcmToken, {
            title: "Delivery Cancelled",
            body: `Your assigned delivery ${delivery.trackingNumber} has been cancelled.\nReason: ${remarks}`,
            deliveryId: delivery._id.toString(),
            trackingNumber: delivery.trackingNumber,
            reason: remarks,
            type: "delivery_cancelled"
          });
          if (result) {
            console.log(`[CANCEL-NOTIF-SUCCESS] FCM sent`);
          } else {
            console.warn(`[CANCEL-NOTIF] sendNotification returned null`);
          }
        } catch (pushErr) {
          console.error("[CANCEL-FCM-ERROR]", pushErr.code || pushErr.message || pushErr);
        }
      } else {
        console.warn("[CANCEL-NOTIF] No fcmToken for driver");
      }

      // 2. In-app Notification (consistent with schema)
      try {
        const notif = await Notification.create({
          recipientId: driver._id,
          recipientType: 'Driver',
          type: 'delivery_cancelled',
          title: 'Delivery Cancelled',
          message: `Your assigned delivery ${delivery.trackingNumber} has been cancelled.\nReason: ${remarks}`,
          referenceId: delivery._id,
          referenceModel: 'Delivery',
          priority: 'high',
          createdAt: new Date()
        });
        console.log(`[CANCEL-NOTIF-SUCCESS] In-app created → ID: ${notif._id}`);
      } catch (notifErr) {
        console.error("[CANCEL-NOTIF-ERROR]", notifErr.message || notifErr);
      }
    } else {
      console.warn("[CANCEL-NOTIF] No driver attached to delivery");
    }

    // Socket emit (if using)
    if (global.io && driver) {
      global.io.to('admin-room').emit('delivery:status:update', {
        deliveryId: delivery._id,
        status: 'Cancelled',
        timestamp: new Date()
      });

      global.io.to('admin-room').emit('driver:available', {
        driverId: delivery.driverId,
        driverName: driver.name,
        status: 'available'
      });
    }

    return res.json({
      success: true,
      message: 'Delivery cancelled successfully. Driver is now available again.'
    });

  } catch (error) {
    console.error('[CANCEL-DELIVERY] Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to cancel delivery' });
  }
};

// ============= GET DRIVER'S CURRENT LOCATION (API) =============
exports.getDriverCurrentLocation = async (req, res) => {
  try {
    const { deliveryId } = req.params;

    const delivery = await Delivery.findById(deliveryId)
      .populate({
        path: 'driverId',
        select: 'name vehicleNumber currentLocation'
      })
      .populate('journeyId')   // ← add this if you have journeyId in Delivery
      .lean();

    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found' });
    }

    if (!delivery.driverId) {
      return res.status(404).json({ success: false, message: 'No driver assigned' });
    }

    let locationData = {
      driverId: delivery.driverId._id,
      driverName: delivery.driverId.name,
      vehicleNumber: delivery.driverId.vehicleNumber,
      currentLocation: delivery.driverId.currentLocation || null,
      deliveryStatus: delivery.status,
      lastUpdate: delivery.driverId.currentLocation?.timestamp || null
    };

    // If journey exists and has history → send full path for completed/in-progress
    if (delivery.journeyId?.locationHistory?.length > 0) {
      locationData.pathHistory = delivery.journeyId.locationHistory.map(point => ({
        lat: point.latitude,
        lng: point.longitude,
        timestamp: point.timestamp
      }));
    }

    return res.json({
      success: true,
      data: locationData
    });

  } catch (error) {
    console.error('[GET-DRIVER-LOCATION] Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get location' });
  }
};

// ============= EDIT DELIVERY =============
exports.renderEditDelivery = async (req, res) => {
  try {
    const { deliveryId } = req.params;

    const delivery = await Delivery.findById(deliveryId)
      .populate('customerId')
      .populate('driverId', 'name phone vehicleNumber')
      .lean();

    if (!delivery) {
      req.flash('error', 'Delivery not found');
      return res.redirect('/admin/deliveries');
    }

    // Get available drivers (current driver + all available ones)
    const drivers = await Driver.find({
      $or: [
        { _id: delivery.driverId },
        { isActive: true, isAvailable: true, profileStatus: 'approved' }
      ]
    })
      .select('name phone vehicleNumber profileImage isAvailable')
      .sort({ name: 1 })
      .lean();

    res.render('delivery_edit', {
      title: `Edit Delivery - ${delivery.trackingNumber}`,
      delivery,
      drivers,
      user: req.user,
      url: req.originalUrl,
      messages: req.flash()
    });

  } catch (error) {
    console.error('[RENDER-EDIT-DELIVERY] Error:', error);
    req.flash('error', 'Failed to load edit page');
    res.redirect('/admin/deliveries');
  }
};


exports.updateDelivery = async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const {
      driverId: inputDriverId,
      scheduledPickupTime,
      scheduledDeliveryTime,
      instructions,
      waypoints,
      routeDistance,
      routeDuration
    } = req.body;

    console.log('[UPDATE-DEBUG] Input driverId:', inputDriverId);
    console.log('[UPDATE-DEBUG] Input driverId type:', typeof inputDriverId);
    console.log('[UPDATE-DEBUG] Request body:', req.body);

    // ────────────────────────────────────────────────
    // Clean & Validate driverId (handle [object Object] case)
    // ────────────────────────────────────────────────
    let cleanDriverId = null;

    if (inputDriverId) {
      // Invalid case from bad form serialization
      if (String(inputDriverId).includes('[object') || String(inputDriverId) === '[object Object]') {
        console.error('[UPDATE-ERROR] Invalid driverId format from form:', inputDriverId);
        req.flash('error', 'Invalid driver selection. Please try again.');
        return res.redirect(`/admin/deliveries/${deliveryId}/edit`);
      }

      try {
        if (typeof inputDriverId === 'string' && inputDriverId.length === 24) {
          cleanDriverId = inputDriverId;
        } else if (typeof inputDriverId === 'object' && inputDriverId._id) {
          cleanDriverId = inputDriverId._id.toString();
        } else if (inputDriverId.toString && inputDriverId.toString().length === 24) {
          cleanDriverId = inputDriverId.toString();
        } else {
          throw new Error('Cannot extract valid driver ID');
        }
      } catch (parseErr) {
        console.error('[UPDATE-ERROR] Failed to parse driverId:', parseErr.message);
        req.flash('error', 'Invalid driver ID format. Please select a driver from the dropdown.');
        return res.redirect(`/admin/deliveries/${deliveryId}/edit`);
      }
    }

    console.log('[UPDATE-DEBUG] Cleaned driverId:', cleanDriverId);

    // Fetch delivery
    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) {
      req.flash('error', 'Delivery not found');
      return res.redirect('/admin/deliveries');
    }

    const currentDriverIdStr = delivery.driverId ? delivery.driverId.toString() : null;
    console.log('[UPDATE-DEBUG] Current driverId (string):', currentDriverIdStr);

    // Parse waypoints
    let parsedWaypoints = [];
    if (waypoints) {
      try {
        parsedWaypoints = JSON.parse(waypoints);
      } catch (e) {
        console.warn('Invalid waypoints JSON:', e.message);
      }
    }

    // Update non-driver fields
    if (scheduledPickupTime) delivery.scheduledPickupTime = new Date(scheduledPickupTime);
    if (scheduledDeliveryTime) delivery.scheduledDeliveryTime = new Date(scheduledDeliveryTime);
    if (instructions) delivery.instructions = instructions;
    if (parsedWaypoints.length > 0) delivery.waypoints = parsedWaypoints;
    if (routeDistance) delivery.distance = parseFloat(routeDistance) || delivery.distance;
    if (routeDuration) delivery.estimatedDuration = parseInt(routeDuration) || delivery.estimatedDuration;

    // Handle driver change
    let driverChanged = false;
    let oldDriver = null;
    let newDriver = null;
    const newDriverIdStr = cleanDriverId;

    if (newDriverIdStr && newDriverIdStr !== currentDriverIdStr) {
      console.log('[UPDATE-DEBUG] Driver change detected');

      newDriver = await Driver.findById(newDriverIdStr);
      if (!newDriver) {
        req.flash('error', 'Selected driver not found');
        return res.redirect(`/admin/deliveries/${deliveryId}/edit`);
      }

      if (!newDriver.isAvailable || newDriver.profileStatus !== 'approved') {
        req.flash('error', 'Selected driver is not available or not approved');
        return res.redirect(`/admin/deliveries/${deliveryId}/edit`);
      }

      // Free old driver
      if (currentDriverIdStr) {
        oldDriver = await Driver.findById(currentDriverIdStr);
        if (oldDriver) {
          oldDriver.isAvailable = true;
          await oldDriver.save();
          console.log(`[UPDATE] Freed old driver: ${oldDriver.name}`);
        }
      }

      // Assign new driver
      delivery.driverId = newDriver._id;
      delivery.vehicleNumber = newDriver.vehicleNumber;
      newDriver.isAvailable = false;
      await newDriver.save();

      driverChanged = true;
      console.log(`[UPDATE] Reassigned to new driver: ${newDriver.name}`);
    }

    // Save updated delivery
    await delivery.save();
    console.log('[UPDATE-DEBUG] Delivery saved successfully');

    // Status history
    await DeliveryStatusHistory.create({
      deliveryId: delivery._id,
      status: delivery.status,
      remarks: driverChanged
        ? `Delivery reassigned from ${oldDriver?.name || 'previous driver'} to ${newDriver?.name}`
        : 'Delivery details updated (route/schedule/etc.)',
      updatedBy: {
        userId: req.user._id,
        userRole: req.user.role,
        userName: req.user.name
      }
    });

    // ────────────────────────────────────────────────
    // NOTIFICATIONS
    // ────────────────────────────────────────────────
    console.log('[UPDATE-NOTIF] Starting notifications...');

    if (driverChanged) {
      console.log('[UPDATE-NOTIF] Driver changed - notifying both old and new');

      // OLD DRIVER (cancel/reassign notification)
      if (oldDriver) {
        console.log(`[UPDATE-NOTIF] Notifying OLD driver: ${oldDriver.name}`);

        // Push notification
        if (oldDriver.fcmToken) {
          try {
            await sendNotification(oldDriver.fcmToken, {
              title: "Delivery Reassigned",
              body: `Delivery ${delivery.trackingNumber} has been reassigned to another driver.`,
              deliveryId: delivery._id.toString(),
              trackingNumber: delivery.trackingNumber,
              reason: "Reassigned to another driver",
              type: "delivery_cancelled"
            });
            console.log(`[UPDATE-NOTIF] FCM sent to OLD driver`);
          } catch (e) {
            console.error("[UPDATE-FCM-OLD-ERROR]", e.message || e);
          }
        } else {
          console.warn("[UPDATE-NOTIF] No FCM token for OLD driver");
        }

        // In-app notification
        try {
          await Notification.create({
            recipientId: oldDriver._id,
            recipientType: 'Driver',
            type: 'delivery_cancelled',
            title: 'Delivery Reassigned',
            message: `Delivery ${delivery.trackingNumber} has been reassigned to another driver.`,
            referenceId: delivery._id,
            referenceModel: 'Delivery',
            priority: 'high',
            createdAt: new Date()
          });
          console.log(`[UPDATE-NOTIF] In-app sent to OLD driver`);
        } catch (e) {
          console.error("[UPDATE-INAPP-OLD-ERROR]", e.message || e);
        }
      }

      // NEW DRIVER (assigned notification)
      if (newDriver) {
        console.log(`[UPDATE-NOTIF] Notifying NEW driver: ${newDriver.name}`);

        // Push notification
        if (newDriver.fcmToken) {
          try {
            await sendNotification(newDriver.fcmToken, {
              title: "New Delivery Assigned",
              body: `Delivery ${delivery.trackingNumber} has been assigned to you. Please check details in the app.`,
              deliveryId: delivery._id.toString(),
              trackingNumber: delivery.trackingNumber,
              customerName: delivery.customerId?.name || "Customer",
              pickup: delivery.pickupLocation?.address || "",
              type: "delivery_assigned"
            });
            console.log(`[UPDATE-NOTIF] FCM sent to NEW driver`);
          } catch (e) {
            console.error("[UPDATE-FCM-NEW-ERROR]", e.message || e);
          }
        } else {
          console.warn("[UPDATE-NOTIF] No FCM token for NEW driver");
        }

        // In-app notification
        try {
          await Notification.create({
            recipientId: newDriver._id,
            recipientType: 'Driver',
            type: 'delivery_assigned',
            title: 'New Delivery Assigned',
            message: `Delivery ${delivery.trackingNumber} has been assigned to you. Please check details in the app.`,
            referenceId: delivery._id,
            referenceModel: 'Delivery',
            priority: 'high',
            createdAt: new Date()
          });
          console.log(`[UPDATE-NOTIF] In-app sent to NEW driver`);
        } catch (e) {
          console.error("[UPDATE-INAPP-NEW-ERROR]", e.message || e);
        }
      }
    } else {
      // No driver change → notify current driver about update
      console.log('[UPDATE-NOTIF] No driver change - notifying current driver');

      const currentDriver = await Driver.findById(delivery.driverId);
      if (currentDriver) {
        console.log(`[UPDATE-NOTIF] Current driver: ${currentDriver.name}`);

        // Push notification
        if (currentDriver.fcmToken) {
          try {
            await sendNotification(currentDriver.fcmToken, {
              title: "Delivery Updated",
              body: `Delivery ${delivery.trackingNumber} details have been updated. Please check the app.`,
              deliveryId: delivery._id.toString(),
              trackingNumber: delivery.trackingNumber,
              type: "delivery_updated"
            });
            console.log(`[UPDATE-NOTIF] FCM update sent to current driver`);
          } catch (e) {
            console.error("[UPDATE-FCM-CURRENT-ERROR]", e.message || e);
          }
        } else {
          console.warn("[UPDATE-NOTIF] No FCM token for current driver");
        }

        // In-app notification
        try {
          await Notification.create({
            recipientId: currentDriver._id,
            recipientType: 'Driver',
            type: 'delivery_updated',
            title: 'Delivery Updated',
            message: `Delivery ${delivery.trackingNumber} details have been updated. Please check the app.`,
            referenceId: delivery._id,
            referenceModel: 'Delivery',
            priority: 'medium',
            createdAt: new Date()
          });
          console.log(`[UPDATE-NOTIF] In-app update created for current driver`);
        } catch (e) {
          console.error("[UPDATE-INAPP-CURRENT-ERROR]", e.message || e);
        }
      } else {
        console.warn("[UPDATE-NOTIF] No current driver found");
      }
    }

    console.log('[UPDATE-DEBUG] Update completed successfully');
    req.flash('success', 'Delivery updated successfully!');
    res.redirect(`/admin/deliveries/${delivery._id}`);

  } catch (error) {
    console.error('[UPDATE-DELIVERY] Error:', error);
    console.error('[UPDATE-DELIVERY] Stack:', error.stack);
    req.flash('error', error.message || 'Failed to update delivery');
    res.redirect(`/admin/deliveries/${req.params.deliveryId}/edit`);
  }
};

// ============= GET COMPLETED JOURNEY ROUTE (for delivered deliveries) =============
exports.getCompletedJourneyRoute = async (req, res) => {
  try {
    const { deliveryId } = req.params;

    // Find journey for this delivery
    const Journey = require('../../models/Journey');
    const journey = await Journey.findOne({ deliveryId })
      .select('waypoints totalDistance totalDuration averageSpeed startLocation endLocation')
      .lean();

    if (!journey) {
      return res.status(404).json({
        success: false,
        message: 'No journey found for this delivery'
      });
    }

    // Build path from journey waypoints
    const path = [];

    // Add start location
    if (journey.startLocation?.coordinates) {
      path.push({
        lat: journey.startLocation.coordinates.latitude,
        lng: journey.startLocation.coordinates.longitude
      });
    }

    // Add all waypoints
    if (journey.waypoints && journey.waypoints.length > 0) {
      journey.waypoints.forEach(wp => {
        if (wp.location?.coordinates) {
          path.push({
            lat: wp.location.coordinates.latitude,
            lng: wp.location.coordinates.longitude
          });
        }
      });
    }

    // Add end location
    if (journey.endLocation?.coordinates) {
      path.push({
        lat: journey.endLocation.coordinates.latitude,
        lng: journey.endLocation.coordinates.longitude
      });
    }

    console.log(`[GET-JOURNEY-ROUTE] Delivery: ${deliveryId}, Path points: ${path.length}`);

    return res.json({
      success: true,
      data: {
        path,
        stats: {
          totalDistance: journey.totalDistance ? `${journey.totalDistance.toFixed(2)} km` : 'N/A',
          totalDuration: journey.totalDuration ? `${journey.totalDuration} mins` : 'N/A',
          averageSpeed: journey.averageSpeed ? `${journey.averageSpeed.toFixed(1)} km/h` : 'N/A'
        }
      }
    });

  } catch (error) {
    console.error('[GET-JOURNEY-ROUTE] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch journey route',
      error: error.message
    });
  }
};

exports.addDeliveryRemark = async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const { message, images } = req.body;

    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) {
      return errorResponse(res, 'Delivery not found', 404);
    }

    const remark = {
      message,
      images: images || [],
      createdBy: req.user._id,
      createdAt: new Date()
    };

    if (!delivery.remarks) delivery.remarks = [];
    delivery.remarks.push(remark);

    await delivery.save();

    return successResponse(res, 'Remark added successfully', { remark });

  } catch (error) {
    console.error('[ADD-REMARK] Error:', error);
    return errorResponse(res, 'Failed to add remark', 500);
  }
};

// ============= GET ALL DRIVER LOCATIONS FOR DASHBOARD =============
exports.getAllDriverLocations = async (req, res) => {
  try {
    // Find all active drivers with their current locations
    const drivers = await Driver.find({
      isActive: true,
      profileStatus: 'approved'
    })
      .select('name phone vehicleNumber profileImage isAvailable currentLocation')
      .lean();

    // Filter drivers who have valid location data
    const driversWithLocation = drivers.filter(driver =>
      driver.currentLocation &&
      driver.currentLocation.latitude &&
      driver.currentLocation.longitude
    );

    // Format response
    const formattedDrivers = driversWithLocation.map(driver => ({
      _id: driver._id,
      name: driver.name,
      phone: driver.phone,
      vehicleNumber: driver.vehicleNumber,
      profileImage: driver.profileImage,
      isAvailable: driver.isAvailable,
      currentLocation: {
        latitude: driver.currentLocation.latitude,
        longitude: driver.currentLocation.longitude,
        timestamp: driver.currentLocation.timestamp || new Date(),
        speed: driver.currentLocation.speed || 0,
        heading: driver.currentLocation.heading || 0
      }
    }));

    console.log(`[GET-ALL-DRIVER-LOCATIONS] Returning ${formattedDrivers.length} drivers with location`);

    return res.json({
      success: true,
      data: formattedDrivers,
      count: formattedDrivers.length
    });

  } catch (error) {
    console.error('[GET-ALL-DRIVER-LOCATIONS] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch driver locations',
      error: error.message
    });
  }
};

// ============= GET SINGLE DRIVER LOCATION =============
exports.getSingleDriverLocation = async (req, res) => {
  try {
    const { driverId } = req.params;

    const driver = await Driver.findById(driverId)
      .select('name phone vehicleNumber isAvailable currentLocation')
      .lean();

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    if (!driver.currentLocation || !driver.currentLocation.latitude) {
      return res.status(404).json({
        success: false,
        message: 'Driver location not available'
      });
    }

    return res.json({
      success: true,
      data: {
        _id: driver._id,
        name: driver.name,
        phone: driver.phone,
        vehicleNumber: driver.vehicleNumber,
        isAvailable: driver.isAvailable,
        currentLocation: driver.currentLocation
      }
    });

  } catch (error) {
    console.error('[GET-SINGLE-DRIVER-LOCATION] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch driver location',
      error: error.message
    });
  }
};

// ============= GET DRIVERS BY STATUS =============
exports.getDriversByStatus = async (req, res) => {
  try {
    const { status } = req.query; // 'available', 'busy', 'all'

    let query = {
      isActive: true,
      profileStatus: 'approved'
    };

    if (status === 'available') {
      query.isAvailable = true;
    } else if (status === 'busy') {
      query.isAvailable = false;
    }

    const drivers = await Driver.find(query)
      .select('name phone vehicleNumber profileImage isAvailable currentLocation')
      .lean();

    const driversWithLocation = drivers.filter(driver =>
      driver.currentLocation &&
      driver.currentLocation.latitude &&
      driver.currentLocation.longitude
    );

    console.log(`[GET-DRIVERS-BY-STATUS] Status: ${status || 'all'}, Found: ${driversWithLocation.length} drivers`);

    return res.json({
      success: true,
      data: driversWithLocation,
      count: driversWithLocation.length
    });

  } catch (error) {
    console.error('[GET-DRIVERS-BY-STATUS] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch drivers',
      error: error.message
    });
  }
};

// ============= UPDATE DELIVERY PRIORITY (FULL SOCKET UPDATE) =============
exports.updateDeliveryPriority = async (req, res) => {
    console.log('\n=== [PRIORITY UPDATE] ENDPOINT HIT ===');
    console.log('URL:', req.originalUrl);
    console.log('Params:', req.params);
    console.log('Body:', req.body);

    try {
        const { deliveryId } = req.params;
        const { priority } = req.body;

        if (!deliveryId) {
            console.log('❌ Missing deliveryId');
            return res.status(400).json({ success: false, message: 'Delivery ID is required' });
        }

        if (!['low', 'medium', 'high', 'urgent'].includes(priority)) {
            console.log('❌ Invalid priority:', priority);
            return res.status(400).json({ success: false, message: 'Invalid priority value' });
        }

        // Full delivery fetch with relations
        const delivery = await Delivery.findById(deliveryId)
            .populate('driverId', 'name fcmToken vehicleNumber')
            .populate('customerId', 'name companyName')
            .lean();

        if (!delivery) {
            console.log('❌ Delivery not found');
            return res.status(404).json({ success: false, message: 'Delivery not found' });
        }

        const oldPriority = delivery.priority;

        // Update in DB
        await Delivery.findByIdAndUpdate(deliveryId, { priority });

        console.log(`✅ Priority updated: ${oldPriority} → ${priority}`);

        // Refresh full delivery data
        const updatedDelivery = await Delivery.findById(deliveryId)
            .populate('driverId', 'name fcmToken vehicleNumber')
            .populate('customerId', 'name companyName')
            .lean();

        // ==================== SOCKET PAYLOAD ====================
        const io = req.app.get('io');
        const socketPayload = {
            type: "delivery:priority:updated",
            deliveryId: updatedDelivery._id.toString(),
            trackingNumber: updatedDelivery.trackingNumber,
            priority: updatedDelivery.priority,
            oldPriority: oldPriority,
            status: updatedDelivery.status,
            customerName: updatedDelivery.customerId?.companyName || updatedDelivery.customerId?.name || 'Customer',
            driverName: updatedDelivery.driverId?.name || null,
            vehicleNumber: updatedDelivery.driverId?.vehicleNumber || null,
            pickupAddress: updatedDelivery.pickupLocation?.address || '',
            deliveryAddress: updatedDelivery.deliveryLocation?.address || '',
            scheduledPickupTime: updatedDelivery.scheduledPickupTime,
            scheduledDeliveryTime: updatedDelivery.scheduledDeliveryTime,
            actualPickupTime: updatedDelivery.actualPickupTime,
            actualDeliveryTime: updatedDelivery.actualDeliveryTime,
            timestamp: new Date().toISOString(),
            message: `Priority changed to ${priority.toUpperCase()}`
        };

        if (io) {
            // Admin ko full update
            io.to("admin-room").emit("delivery:updated", socketPayload);
            console.log('📤 Socket emitted to admin-room: delivery:updated');

            // Driver ko bhi (agar assigned hai)
            if (updatedDelivery.driverId) {
                io.to(`driver-${updatedDelivery.driverId._id}`).emit("delivery:updated", socketPayload);
                console.log(`📤 Socket emitted to driver room`);
            }
        }

        // FCM (optional)
        if (updatedDelivery.driverId?.fcmToken) {
            try {
                await sendNotification(updatedDelivery.driverId.fcmToken, {
                    title: `Priority Updated: ${priority.toUpperCase()}`,
                    body: `Your delivery ${updatedDelivery.trackingNumber} priority has been changed.`,
                    type: 'priority_changed',
                    deliveryId: updatedDelivery._id.toString(),
                    trackingNumber: updatedDelivery.trackingNumber
                });
                console.log(`[PRIORITY-NOTIF-SUCCESS] FCM sent to driver`);
            } catch (e) {
                console.error("[PRIORITY-FCM-ERROR]", e.message || e);
            }
        }

        return res.json({
            success: true,
            message: `Priority updated to ${priority.toUpperCase()}`,
            delivery: {
                _id: updatedDelivery._id,
                trackingNumber: updatedDelivery.trackingNumber,
                priority: updatedDelivery.priority,
                status: updatedDelivery.status,
                pickupAddress: updatedDelivery.pickupLocation?.address,
                deliveryAddress: updatedDelivery.deliveryLocation?.address,
                driverName: updatedDelivery.driverId?.name
            }
        });

    } catch (error) {
        console.error('=== PRIORITY UPDATE ERROR ===', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};