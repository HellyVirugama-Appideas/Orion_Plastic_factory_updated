const Delivery = require('../../models/Delivery');
const Order = require('../../models/Order');
const Driver = require('../../models/Driver');
const Customer = require('../../models/Customer');
const DeliveryStatusHistory = require('../../models/DeliveryStatusHistory');
const Notification = require('../../models/Notification');
const mongoose = require('mongoose');
const { successResponse, errorResponse } = require('../../utils/responseHelper');
const { sendNotification } = require("../../utils/sendNotification")

// ============= RENDER DELIVERIES LIST =============
exports.renderDeliveriesList = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      startDate,
      endDate
    } = req.query;

    const query = {};
    if (status) query.status = status;

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

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const deliveries = await Delivery.find(query)
      .populate({
        path: 'customerId',
        model: 'Customer',
        select: 'name email phone companyName customerId'
      })
      .populate('driverId', 'name phone vehicleNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Delivery.countDocuments(query);

    const stats = await Delivery.aggregate([
      {
        $facet: {
          total: [{ $count: 'count' }],
          delivered: [{ $match: { status: 'delivered' } }, { $count: 'count' }],
          inTransit: [
            { $match: { status: { $in: ['in_transit', 'assigned', 'picked_up', 'out_for_delivery'] } } },
            { $count: 'count' }
          ],
          pending: [{ $match: { status: { $in: ['pending', 'pending_acceptance'] } } }, { $count: 'count' }]
        }
      }
    ]);

    const statistics = {
      total: stats[0].total[0]?.count || 0,
      delivered: stats[0].delivered[0]?.count || 0,
      inTransit: stats[0].inTransit[0]?.count || 0,
      pending: stats[0].pending[0]?.count || 0
    };

    res.render('deliveries_list', {
      title: 'Deliveries Management',
      user: req.user,
      deliveries,
      stats: statistics,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      },
      filters: { status, search, startDate, endDate },
      url: req.originalUrl,
      messages: req.flash()
    });

  } catch (error) {
    console.error('[DELIVERIES-LIST] Error:', error);
    req.flash('error', 'Failed to load deliveries');
    res.redirect('/admin/dashboard');
  }
};

// ============= RENDER DELIVERY DETAILS =============
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

    // Get status history
    const statusHistory = await DeliveryStatusHistory.find({ deliveryId: delivery._id })
      .sort({ timestamp: -1 })
      .populate('updatedBy.userId', 'name email')
      .lean();

    res.render('delivery_details', {
      title: `Delivery ${delivery.trackingNumber}`,
      user: req.user,
      delivery,
      statusHistory,
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
      isAvailable: true,
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


// ============= CREATE DELIVERY FROM ORDER =============
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
//     if (!driver || !driver.isAvailable || driver.profileStatus !== 'approved') {
//       req.flash('error', 'Driver is not available or not approved');
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

//     // Safe coordinate extraction
//     const pickupCoords = {
//       latitude: order?.pickupLocation?.coordinates?.latitude || 23.0225,
//       longitude: order?.pickupLocation?.coordinates?.longitude || 72.5714
//     };

//     const deliveryCoords = {
//       latitude: order?.deliveryLocation?.coordinates?.latitude || 23.0225,
//       longitude: order?.deliveryLocation?.coordinates?.longitude || 72.5714
//     };

//     // Create delivery
//     const delivery = await Delivery.create({
//       trackingNumber,
//       orderId: order.orderNumber,
//       customerId: order.customerId?._id || null,
//       driverId,
//       vehicleNumber: driver.vehicleNumber,
//       pickupLocation: {
//         ...order.pickupLocation,
//         coordinates: pickupCoords
//       },
//       deliveryLocation: {
//         ...order.deliveryLocation,
//         coordinates: deliveryCoords
//       },
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

//     // Update order
//     order.deliveryId = delivery._id;
//     order.status = 'assigned';
//     await order.save();

//     // Mark driver as unavailable
//     driver.isAvailable = false;
//     await driver.save();

//     // Create status history
//     await DeliveryStatusHistory.create({
//       deliveryId: delivery._id,
//       status: 'assigned',
//       remarks: `Delivery assigned to ${driver.name} (${driver.vehicleNumber})`,
//       updatedBy: {
//         userId: req.user._id,
//         userRole: req.user.role,
//         userName: req.user.name
//       }
//     });

//     // ───────────────────────────────────────────────
//     //          NOTIFICATIONS – BOTH PUSH + IN-APP
//     // ───────────────────────────────────────────────
//     console.log("Saving notification with driverId type:", typeof driver._id, driver._id);
//     console.log("driver._id instanceof ObjectId:", driver._id instanceof mongoose.Types.ObjectId);
//     console.log(`[NOTIF-DEBUG] Preparing notifications for driver ${driver._id} (${driver.name})`);

//     // ──── ADD THE DEBUG LINES HERE ────
//     console.log("[FCM-CHECK] Token status:", driver.fcmToken ? "present" : "missing");
//     if (!driver.fcmToken) {
//       console.log("[FCM-CHECK-DETAIL] No token found in driver document");
//       // driver.fcmToken = "fake-test-token-1234567890"; // ← uncomment ONLY for testing (will skip warn but FCM will fail)
//     }

//     // 1. Push Notification (FCM)
//     if (driver.fcmToken && driver.fcmToken.trim().length > 20) {
//       console.log(`[FCM-DEBUG] Attempting send to token (preview): ${driver.fcmToken.substring(0, 20)}...`);
//       try {
//         const pushResult = await sendNotification(
//           driver.name || "Driver",
//           "english",
//           driver.fcmToken,
//           "delivery_assigned",
//           {
//             deliveryId: delivery._id.toString(),
//             trackingNumber: delivery.trackingNumber,
//             customerName: order?.customerId?.name || "Customer",
//             pickup: order?.pickupLocation?.address || "",
//             type: "delivery_assigned"
//           }
//         );

//         if (pushResult) {
//           console.log(`[NOTIF-SUCCESS] FCM push sent → messageId: ${pushResult.messageId || pushResult.name}`);
//         } else {
//           console.warn("[NOTIF-WARN] FCM send returned null/undefined");
//         }
//       } catch (pushErr) {
//         console.error("[FCM-ERROR] Push failed:", pushErr.code || pushErr.message || pushErr);
//       }
//     } else {
//       console.warn("[NOTIF-WARN] No valid fcmToken found for driver", {
//         hasToken: !!driver.fcmToken,
//         tokenLength: driver.fcmToken?.length || 0
//       });
//     }

//     // 2. In-app Notification
//     try {
//       const notificationDoc = await Notification.create({
//         recipientId: driver._id,          // matches your schema
//         recipientType: 'Driver',          // required for refPath
//         type: 'delivery_assigned',
//         title: 'New Delivery Assigned',
//         message: `You have been assigned delivery ${delivery.trackingNumber}. Check details in your app.`,
//         referenceId: delivery._id,
//         referenceModel: 'Delivery',
//         priority: 'high',
//         createdAt: new Date()
//       });

//       console.log(`[NOTIF-SUCCESS] In-app notification created → _id: ${notificationDoc._id}`);
//     } catch (notifErr) {
//       console.error("[NOTIF-ERROR] Failed to create in-app notification:", notifErr.message || notifErr);
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

    if (!driver.isAvailable) {
      req.flash('warning', 'Note: Driver is marked as unavailable, but multiple assignments allowed');
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

    // Safe coordinate extraction (defaulting to Ahmedabad coords)
    const pickupCoords = {
      latitude: order?.pickupLocation?.coordinates?.latitude || 23.0225,
      longitude: order?.pickupLocation?.coordinates?.longitude || 72.5714
    };

    const deliveryCoords = {
      latitude: order?.deliveryLocation?.coordinates?.latitude || 23.0225,
      longitude: order?.deliveryLocation?.coordinates?.longitude || 72.5714
    };

    // Create delivery
    const delivery = await Delivery.create({
      trackingNumber,
      orderId: order.orderNumber,
      customerId: order.customerId?._id || null,
      driverId,
      vehicleNumber: driver.vehicleNumber,
      pickupLocation: {
        ...order.pickupLocation,
        coordinates: pickupCoords
      },
      deliveryLocation: {
        ...order.deliveryLocation,
        coordinates: deliveryCoords
      },
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

    // Update order
    order.deliveryId = delivery._id;
    order.status = 'assigned';
    await order.save();


    // Create status history
    await DeliveryStatusHistory.create({
      deliveryId: delivery._id,
      status: 'assigned',
      remarks: `Delivery assigned to ${driver.name} (${driver.vehicleNumber})`,
      updatedBy: {
        userId: req.user._id,
        userRole: req.user.role,
        userName: req.user.name
      }
    });

    // Notifications (push + in-app) – yeh same rahega
    // 1. Push Notification (FCM)
    if (driver.fcmToken) {
      const data = {
        deliveryId: delivery._id.toString(),
        trackingNumber: delivery.trackingNumber,
        type: "delivery_assigned",
        title: "Delivery Assigned 🚚",
        body: `You have a new delivery. Pickup from ${order?.pickupLocation?.address || 'location'}` //${delivery.trackingNumber}
      };

      sendNotification(driver.fcmToken, data);   // ← assuming your helper accepts token + object
    } else {
      console.warn(`No FCM token for driver ${driver._id} → assignment notification skipped`);
    }

    // 2. In-app Notification
    try {
      const notificationDoc = await Notification.create({
        recipientId: driver._id,          // matches your schema
        recipientType: 'Driver',          // required for refPath
        type: 'delivery_assigned',
        title: 'New Delivery Assigned',
        message: `You have been assigned delivery. Check details in your app.`, //${delivery.trackingNumber}
        referenceId: delivery._id,
        referenceModel: 'Delivery',
        priority: `${delivery.priority}`,
        createdAt: new Date()
      });

      console.log(`[NOTIF-SUCCESS] In-app notification created → _id: ${notificationDoc._id}`);
    } catch (notifErr) {
      console.error("[NOTIF-ERROR] Failed to create in-app notification:", notifErr.message || notifErr);
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
      if (driver.fcmToken && driver.fcmToken.trim().length > 20) {
        console.log(`[CANCEL-FCM] Attempting send to: ${driver.fcmToken.substring(0, 20)}...`);
        try {
          const result = await sendNotification(
            driver.name || "Driver",
            "english",
            driver.fcmToken,
            "delivery_cancelled",
            {
              deliveryId: delivery._id.toString(),
              trackingNumber: delivery.trackingNumber,
              reason: remarks,
              type: "delivery_cancelled"
            }
          );
          console.log(`[CANCEL-NOTIF-SUCCESS] FCM sent → ${result?.messageId || 'ok'}`);
        } catch (pushErr) {
          console.error("[CANCEL-FCM-ERROR]", pushErr.code || pushErr.message || pushErr);
        }
      } else {
        console.warn("[CANCEL-NOTIF] No valid fcmToken", { length: driver.fcmToken?.length || 0 });
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

//     // ═══════════════════════════════════════════════
//     // CRITICAL FIX: Handle [object Object] from form
//     // ═══════════════════════════════════════════════
//     let cleanDriverId = null;

//     if (inputDriverId) {
//       // If it's literally the string "[object Object]", it's invalid
//       if (inputDriverId === '[object Object]' || inputDriverId.includes('[object')) {
//         console.error('[UPDATE-ERROR] Invalid driverId format from form:', inputDriverId);
//         req.flash('error', 'Invalid driver selection. Please try again.');
//         return res.redirect(`/admin/deliveries/${deliveryId}/edit`);
//       }

//       // Try to extract valid ObjectId
//       try {
//         // If it's already a string ObjectId, use it
//         if (typeof inputDriverId === 'string' && inputDriverId.length === 24) {
//           cleanDriverId = inputDriverId;
//         }
//         // If it's an object with _id property
//         else if (typeof inputDriverId === 'object' && inputDriverId._id) {
//           cleanDriverId = inputDriverId._id.toString();
//         }
//         // If it's already an ObjectId instance
//         else if (inputDriverId.toString && inputDriverId.toString().length === 24) {
//           cleanDriverId = inputDriverId.toString();
//         }
//         else {
//           throw new Error('Cannot extract valid driver ID');
//         }
//       } catch (parseErr) {
//         console.error('[UPDATE-ERROR] Failed to parse driverId:', parseErr.message);
//         req.flash('error', 'Invalid driver ID format. Please select a driver from the dropdown.');
//         return res.redirect(`/admin/deliveries/${deliveryId}/edit`);
//       }
//     }

//     console.log('[UPDATE-DEBUG] Cleaned driverId:', cleanDriverId);

//     // Fetch delivery WITHOUT .lean() so we can save it later
//     const delivery = await Delivery.findById(deliveryId);
//     if (!delivery) {
//       req.flash('error', 'Delivery not found');
//       return res.redirect('/admin/deliveries');
//     }

//     // Convert current driver ID to string for comparison
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
//     if (scheduledPickupTime) {
//       delivery.scheduledPickupTime = new Date(scheduledPickupTime);
//     }
//     if (scheduledDeliveryTime) {
//       delivery.scheduledDeliveryTime = new Date(scheduledDeliveryTime);
//     }
//     if (instructions) {
//       delivery.instructions = instructions;
//     }
//     if (parsedWaypoints.length > 0) {
//       delivery.waypoints = parsedWaypoints;
//     }
//     if (routeDistance) {
//       delivery.distance = parseFloat(routeDistance) || delivery.distance;
//     }
//     if (routeDuration) {
//       delivery.estimatedDuration = parseInt(routeDuration) || delivery.estimatedDuration;
//     }

//     // Handle driver change
//     let driverChanged = false;
//     let oldDriver = null;
//     let newDriver = null;
//     const newDriverIdStr = inputDriverId ? inputDriverId.toString() : null;

//     console.log('[UPDATE-DEBUG] Comparing drivers:', {
//       current: currentDriverIdStr,
//       new: newDriverIdStr,
//       same: newDriverIdStr === currentDriverIdStr
//     });

//     if (newDriverIdStr && newDriverIdStr !== currentDriverIdStr) {
//       console.log('[UPDATE-DEBUG] Driver change detected');

//       // Validate new driver
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

//       // Update delivery with new driver
//       delivery.driverId = newDriver._id;
//       delivery.vehicleNumber = newDriver.vehicleNumber;

//       // Mark new driver unavailable
//       newDriver.isAvailable = false;
//       await newDriver.save();

//       driverChanged = true;
//       console.log(`[UPDATE] Reassigned to new driver: ${newDriver.name}`);
//     }

//     // Save delivery
//     await delivery.save();
//     console.log('[UPDATE-DEBUG] Delivery saved successfully');

//     // Create status history
//     await DeliveryStatusHistory.create({
//       deliveryId: delivery._id,
//       status: delivery.status,
//       remarks: driverChanged
//         ? `Delivery reassigned from ${oldDriver?.name || 'previous driver'} to ${newDriver?.name}`
//         : 'Delivery details updated (route/schedule)',
//       updatedBy: {
//         userId: req.user._id,
//         userRole: req.user.role,
//         userName: req.user.name
//       }
//     });

//     // ────────────────────────────────────────────────
//     // NOTIFICATIONS
//     // ────────────────────────────────────────────────
//     console.log('[UPDATE-DEBUG] Starting notifications...');

//     if (driverChanged) {
//       console.log('[UPDATE-NOTIF] Driver changed - sending notifications');

//       // Notify OLD driver (if exists)
//       if (oldDriver) {
//         console.log(`[UPDATE-NOTIF] Notifying old driver: ${oldDriver.name}`);

//         // Push notification
//         if (oldDriver.fcmToken?.trim()) {
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
//             console.log(`[UPDATE-NOTIF] FCM sent to old driver`);
//           } catch (pushErr) {
//             console.error("[UPDATE-NOTIF-ERROR] Old driver FCM failed:", pushErr.message);
//           }
//         }

//         // In-app notification
//         try {
//           await Notification.create({
//             userId: oldDriver._id,
//             type: 'delivery_cancelled',
//             title: 'Delivery Reassigned',
//             message: `Delivery ${delivery.trackingNumber} has been reassigned to another driver.`,
//             referenceId: delivery._id,
//             referenceModel: 'Delivery',
//             priority: 'high',
//             createdAt: new Date()
//           });
//           console.log(`[UPDATE-NOTIF] In-app notification created for old driver`);
//         } catch (notifErr) {
//           console.error("[UPDATE-NOTIF-ERROR] Old driver in-app failed:", notifErr.message);
//         }
//       }

//       // Notify NEW driver
//       if (newDriver) {
//         console.log(`[UPDATE-NOTIF] Notifying new driver: ${newDriver.name}`);

//         // Push notification
//         if (newDriver.fcmToken?.trim()) {
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
//             console.log(`[UPDATE-NOTIF] FCM sent to new driver`);
//           } catch (pushErr) {
//             console.error("[UPDATE-NOTIF-ERROR] New driver FCM failed:", pushErr.message);
//           }
//         }

//         // In-app notification
//         try {
//           await Notification.create({
//             userId: newDriver._id,
//             type: 'delivery_assigned',
//             title: 'New Delivery Assigned',
//             message: `Delivery ${delivery.trackingNumber} has been assigned to you. Please check details in your app.`,
//             referenceId: delivery._id,
//             referenceModel: 'Delivery',
//             priority: 'high',
//             createdAt: new Date()
//           });
//           console.log(`[UPDATE-NOTIF] In-app notification created for new driver`);
//         } catch (notifErr) {
//           console.error("[UPDATE-NOTIF-ERROR] New driver in-app failed:", notifErr.message);
//         }
//       }

//     } else {
//       // Normal update - notify current driver
//       console.log('[UPDATE-NOTIF] Normal update - notifying current driver');

//       const currentDriver = await Driver.findById(delivery.driverId);
//       if (currentDriver) {
//         console.log(`[UPDATE-NOTIF] Current driver: ${currentDriver.name}`);

//         // Push notification
//         if (currentDriver.fcmToken?.trim()) {
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
//             console.log(`[UPDATE-NOTIF] FCM sent to current driver`);
//           } catch (pushErr) {
//             console.error("[UPDATE-NOTIF-ERROR] Current driver FCM failed:", pushErr.message);
//           }
//         }

//         // In-app notification
//         try {
//           await Notification.create({
//             userId: currentDriver._id,
//             type: 'delivery_updated',
//             title: 'Delivery Updated',
//             message: `Delivery ${delivery.trackingNumber} has been updated. Please check details in your app.`,
//             referenceId: delivery._id,
//             referenceModel: 'Delivery',
//             priority: 'medium',
//             createdAt: new Date()
//           });
//           console.log(`[UPDATE-NOTIF] In-app notification created for current driver`);
//         } catch (notifErr) {
//           console.error("[UPDATE-NOTIF-ERROR] Current driver in-app failed:", notifErr.message);
//         }
//       } else {
//         console.warn('[UPDATE-NOTIF] No current driver found for notification');
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



// ============= ADD DELIVERY REMARK =============

// ============= UPDATE DELIVERY =============

// ============= UPDATE DELIVERY =============
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
        if (oldDriver.fcmToken && oldDriver.fcmToken.trim().length > 20) {
          try {
            await sendNotification(
              oldDriver.name || "Driver",
              "english",
              oldDriver.fcmToken,
              "delivery_cancelled",
              {
                deliveryId: delivery._id.toString(),
                trackingNumber: delivery.trackingNumber,
                reason: "Reassigned to another driver",
                type: "delivery_cancelled"
              }
            );
            console.log(`[UPDATE-NOTIF] FCM sent to OLD driver`);
          } catch (e) {
            console.error("[UPDATE-FCM-OLD-ERROR]", e.message || e);
          }
        } else {
          console.warn("[UPDATE-NOTIF] No valid FCM token for OLD driver");
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
        if (newDriver.fcmToken && newDriver.fcmToken.trim().length > 20) {
          try {
            await sendNotification(
              newDriver.name || "Driver",
              "english",
              newDriver.fcmToken,
              "delivery_assigned",
              {
                deliveryId: delivery._id.toString(),
                trackingNumber: delivery.trackingNumber,
                customerName: delivery.customerId?.name || "Customer",
                pickup: delivery.pickupLocation?.address || "",
                type: "delivery_assigned"
              }
            );
            console.log(`[UPDATE-NOTIF] FCM sent to NEW driver`);
          } catch (e) {
            console.error("[UPDATE-FCM-NEW-ERROR]", e.message || e);
          }
        } else {
          console.warn("[UPDATE-NOTIF] No valid FCM token for NEW driver");
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
        if (currentDriver.fcmToken && currentDriver.fcmToken.trim().length > 20) {
          try {
            await sendNotification(
              currentDriver.name || "Driver",
              "english",
              currentDriver.fcmToken,
              "delivery_updated",
              {
                deliveryId: delivery._id.toString(),
                trackingNumber: delivery.trackingNumber,
                type: "delivery_updated"
              }
            );
            console.log(`[UPDATE-NOTIF] FCM update sent to current driver`);
          } catch (e) {
            console.error("[UPDATE-FCM-CURRENT-ERROR]", e.message || e);
          }
        } else {
          console.warn("[UPDATE-NOTIF] No valid FCM token for current driver");
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
// In deliveryAdminController.js


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
// Add these functions to the END of your deliveryAdminController.js
// (just before module.exports = exports;)

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
