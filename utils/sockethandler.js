// // const Driver = require("../models/Driver");
// // const Journey = require("../models/Journey");
// // const Delivery = require("../models/Delivery");
// // const DeliveryStatusHistory = require("../models/DeliveryStatusHistory");
// // const Order = require("../models/Order")
// // const mongoose = require("mongoose")
// // const Notification = require("../models/Notification");
// // const { sendNotification } = require("../utils/sendNotification");

// // const { getSortedDeliveryQueueForDriver } = require("../utils/deliveryQueueHelper");


// // const activeDrivers = new Map();
// // const driverLocations = new Map();

// // const LOG_PREFIX = {
// //   SOCKET: "🔌 [SOCKET]",
// //   DRIVER: "🚗 [DRIVER]",
// //   ADMIN: "👔 [ADMIN]",
// //   LOC: "📍 [LOCATION]",
// //   EMIT: "📤 [EMIT]",
// //   RECV: "📥 [RECV]",
// //   ERR: "❌ [ERROR]",
// //   WARN: "⚠️  [WARN]",
// //   INFO: "ℹ️  [INFO]",
// // };

// // function log(type, ...args) {
// //   console.log(`[${new Date().toISOString()}] ${LOG_PREFIX[type] || type}`, ...args);
// // }

// // function setupSocketHandlers(io) {
// //   io.activeDrivers = activeDrivers;
// //   io.driverLocations = driverLocations;

// //   setInterval(() => {
// //     const connectedSockets = io.engine?.clientsCount || 0;
// //     log("INFO",
// //       `Active connections: ${connectedSockets} | ` +
// //       `Active drivers: ${activeDrivers.size} | ` +
// //       `Drivers with location: ${driverLocations.size}`
// //     );
// //   }, 30000);

// //   io.on("connection", (socket) => {
// //     log("SOCKET", `New client connected — socket.id: ${socket.id} | IP: ${socket.handshake.address} | Transport: ${socket.conn.transport.name}`);

// //     socket.onAny((eventName, ...args) => {
// //       log("RECV", `socket.id: ${socket.id} | event: "${eventName}" | data: ${JSON.stringify(args[0] || {}).substring(0, 200)}`);
// //     });

// //     // ─────────────────────────────────────────────
// //     // STEP 1: ADMIN — join-admin-room
// //     // ─────────────────────────────────────────────
// //     socket.on("join-admin-room", () => {
// //       socket.join("admin-room");
// //       log("ADMIN", `Admin joined admin-room | socket.id: ${socket.id}`);

// //       const driversList = Array.from(activeDrivers.values()).map((d) => ({
// //         ...d,
// //         location: driverLocations.get(d.driverId) || null,
// //       }));

// //       socket.emit("admin:drivers:list", driversList);
// //       socket.emit("admin:room:joined", {
// //         message: "Successfully joined admin-room",
// //         activeDrivers: driversList.length,
// //         timestamp: new Date().toISOString(),
// //       });
// //     });

// //     // ─────────────────────────────────────────────
// //     // STEP 2: DRIVER — driver:connect
// //     // ─────────────────────────────────────────────
// //     // socket.on("driver:connect", async (data) => {
// //     //   try {
// //     //     const { driverId, driverName, vehicleNumber } = data || {};

// //     //     if (!driverId) {
// //     //       log("WARN", `driver:connect — driverId missing | socket: ${socket.id}`);
// //     //       return;
// //     //     }

// //     //     activeDrivers.set(driverId, {
// //     //       socketId: socket.id,
// //     //       driverId,
// //     //       driverName: driverName || "Driver",
// //     //       vehicleNumber: vehicleNumber || "N/A",
// //     //       connectedAt: new Date().toISOString(),
// //     //       isOnline: true,
// //     //     });

// //     //     socket.join(`driver-${driverId}`);
// //     //     socket.driverId = driverId;

// //     //     log("DRIVER", `Driver ONLINE | name: ${driverName} | socket: ${socket.id} | total: ${activeDrivers.size}`);

// //     //     io.to("admin-room").emit("driver:online", {
// //     //       driverId,
// //     //       driverName,
// //     //       vehicleNumber,
// //     //       status: "online",
// //     //       timestamp: new Date().toISOString(),
// //     //     });

// //     //     socket.emit("driver:connect:ack", {
// //     //       success: true,
// //     //       message: "Connected to server",
// //     //       timestamp: new Date().toISOString(),
// //     //     });
// //     //   } catch (err) {
// //     //     log("ERR", `driver:connect | ${err.message}`);
// //     //   }
// //     // });

// //     socket.on("driver:connect", async (data) => {
// //       try {
// //         const { driverId, driverName, vehicleNumber } = data || {};
// //         if (!driverId) return;

// //         // ✅ FIX: agar isi driverId ka purana socket already connected hai, use disconnect karo
// //         const existing = activeDrivers.get(driverId);
// //         if (existing && existing.socketId !== socket.id) {
// //           const oldSocket = io.sockets.sockets.get(existing.socketId);
// //           if (oldSocket) {
// //             log("WARN", `Duplicate connection for driverId ${driverId} — disconnecting old socket ${existing.socketId}`);
// //             oldSocket.leave(`driver-${driverId}`);
// //             oldSocket.disconnect(true);
// //           }
// //         }

// //         activeDrivers.set(driverId, {
// //           socketId: socket.id,
// //           driverId,
// //           driverName: driverName || "Driver",
// //           vehicleNumber: vehicleNumber || "N/A",
// //           connectedAt: new Date().toISOString(),
// //           isOnline: true,
// //         });

// //         socket.join(`driver-${driverId}`);
// //         socket.driverId = driverId;

// //         log("DRIVER", `Driver ONLINE | name: ${driverName} | socket: ${socket.id} | total: ${activeDrivers.size}`);

// //         io.to("admin-room").emit("driver:online", {
// //           driverId,
// //           driverName,
// //           vehicleNumber,
// //           status: "online",
// //           timestamp: new Date().toISOString(),
// //         });

// //         socket.emit("driver:connect:ack", {
// //           success: true,
// //           message: "Connected to server",
// //           timestamp: new Date().toISOString(),
// //         });
// //       } catch (err) { log("ERR", `driver:connect | ${err.message}`); }
// //     });

// //     // ─────────────────────────────────────────────
// //     // STEP 3: DRIVER — driver:journey:started
// //     // FIX: Proper ACK callback pattern
// //     // ─────────────────────────────────────────────

// //     socket.on("driver:journey:started", async (data, callback) => {
// //       try {
// //         const { driverId, deliveryId, address } = data || {};

// //         const latitude = data?.latitude ?? data?.location?.latitude;
// //         const longitude = data?.longitude ?? data?.location?.longitude;

// //         if (!latitude || !longitude) {
// //           const driverDoc = await Driver.findById(driverId).select('currentLocation');
// //           if (driverDoc?.currentLocation?.latitude && driverDoc?.currentLocation?.longitude) {
// //             latitude = driverDoc.currentLocation.latitude;
// //             longitude = driverDoc.currentLocation.longitude;
// //             log("WARN", `driver:journey:started — location missing from app, using last known DB location`);
// //           }
// //         }

// //         // ── Validation ──
// //         if (!driverId || !deliveryId) {
// //           log("WARN", `driver:journey:started — driverId/deliveryId missing | data: ${JSON.stringify(data)}`);
// //           if (typeof callback === 'function') {
// //             callback({ success: false, message: "driverId and deliveryId required" });
// //           }
// //           return;
// //         }

// //         if (!latitude || !longitude) {
// //           log("WARN", `driver:journey:started — location missing | received: ${JSON.stringify(data)}`);
// //           if (typeof callback === 'function') {
// //             callback({ success: false, message: "latitude and longitude required" });
// //           }
// //           return;
// //         }

// //         // ── Delivery check ──
// //         const delivery = await Delivery.findOne({
// //           _id: deliveryId,
// //           driverId: driverId,
// //           status: 'assigned',
// //         });

// //         if (!delivery) {
// //           log("WARN", `driver:journey:started — delivery not found | deliveryId: ${deliveryId}`);
// //           if (typeof callback === 'function') {
// //             callback({ success: false, message: "Delivery not found or not assigned to you" });
// //           }
// //           return;
// //         }

// //         // ── Already started check ──
// //         const existingJourney = await Journey.findOne({
// //           deliveryId,
// //           status: { $in: ['Started', 'In_transit', 'In_progress'] },
// //         });

// //         if (existingJourney) {
// //           log("WARN", `driver:journey:started — journey already exists | journeyId: ${existingJourney._id}`);
// //           if (typeof callback === 'function') {
// //             callback({
// //               success: true,
// //               journeyId: existingJourney._id.toString(),
// //               deliveryId,
// //               status: existingJourney.status,
// //               message: "Journey already in progress",
// //             });
// //           }
// //           return;
// //         }

// //         const locationData = {
// //           latitude: Number(latitude),
// //           longitude: Number(longitude),
// //           address: address || 'GPS Location',
// //           lastUpdated: new Date(),
// //         };

// //         // ── DB mein Journey create karo ──
// //         const journey = await Journey.create({
// //           deliveryId,
// //           driverId: driverId,
// //           startLocation: {
// //             coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
// //             address: address || 'Location captured via GPS',
// //           },
// //           startTime: new Date(),
// //           status: 'In_transit',
// //         });

// //         log("DRIVER", `Journey created in DB | journeyId: ${journey._id} | driverId: ${driverId}`);

// //         // ── Delivery status update ──
// //         delivery.status = 'In_transit';
// //         delivery.actualPickupTime = new Date();
// //         await delivery.save();

// //         await DeliveryStatusHistory.create({
// //           deliveryId: delivery._id,
// //           status: 'In_transit',
// //           location: {
// //             coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
// //             address: address || 'GPS Location',
// //           },
// //           remarks: 'Driver started journey via socket',
// //           updatedBy: {
// //             userId: driverId,
// //             userRole: 'driver',
// //             userName: activeDrivers.get(driverId)?.driverName || 'Driver',
// //           },
// //         });

// //         // ── Driver model update ──
// //         await Driver.findByIdAndUpdate(driverId, {
// //           currentJourney: journey._id,
// //           activeDelivery: delivery._id,
// //           currentLocation: locationData,
// //           lastLocationUpdate: new Date(),
// //         });

// //         // ── In-memory update ──
// //         driverLocations.set(driverId, {
// //           ...locationData,
// //           journeyId: journey._id.toString(),
// //           deliveryId,
// //         });

// //         if (activeDrivers.has(driverId)) {
// //           const di = activeDrivers.get(driverId);
// //           activeDrivers.set(driverId, {
// //             ...di,
// //             journeyId: journey._id.toString(),
// //             deliveryId,
// //           });
// //         }

// //         // ── Admin broadcast ──
// //         const driverInfo = activeDrivers.get(driverId);

// //         io.to("admin-room").emit("driver:journey:started", {
// //           driverId,
// //           driverName: driverInfo?.driverName || "Driver",
// //           vehicleNumber: driverInfo?.vehicleNumber || "N/A",
// //           journeyId: journey._id.toString(),
// //           deliveryId,
// //           location: locationData,
// //           status: "In_transit",
// //           timestamp: new Date().toISOString(),
// //         });

// //         io.to("admin-room").emit("driver:location:update", {
// //           driverId,
// //           driverName: driverInfo?.driverName || "Driver",
// //           vehicleNumber: driverInfo?.vehicleNumber || "N/A",
// //           journeyId: journey._id.toString(),
// //           deliveryId,
// //           location: locationData,
// //           isAvailable: false,
// //           status: "In_transit",
// //           timestamp: new Date().toISOString(),
// //         });

// //         // ============================================================
// //         // 👇👇👇 YAHAN NAYA CODE PASTE KARO 👇👇👇
// //         // ============================================================
// //         // ✅ NAYA: Journey start hote hi driver ko fresh sorted queue bhejo
// //         // ============================================================
// //         try {
// //           const sortedQueue = await getSortedDeliveryQueueForDriver(driverId, {
// //             latitude: Number(latitude),
// //             longitude: Number(longitude),
// //           });

// //           io.to(`driver-${driverId}`).emit("driver:queue:updated", {
// //             nextDelivery: sortedQueue[0] || null,
// //             queue: sortedQueue,
// //             reason: "journey_started",
// //             timestamp: new Date().toISOString(),
// //           });

// //           log("EMIT", `driver:queue:updated pushed after journey start | driverId: ${driverId}`);
// //         } catch (queueErr) {
// //           log("ERR", `Queue push after journey start failed | ${queueErr.message}`);
// //         }
// //         // ============================================================
// //         // 👆👆👆 YAHAN TAK NAYA CODE 👆👆👆
// //         // ============================================================

// //         log("EMIT", `journey:start:ack sent via callback | journeyId: ${journey._id}`);

// //         // ✅ Proper ACK callback — event emit nahi, direct callback (EXISTING CODE)
// //         if (typeof callback === 'function') {
// //           callback({
// //             success: true,
// //             journeyId: journey._id.toString(),
// //             deliveryId,
// //             status: 'In_transit',
// //             message: "Journey started successfully",
// //           });
// //         }

// //       } catch (err) {
// //         log("ERR", `driver:journey:started | ${err.stack}`);
// //         if (typeof callback === 'function') {
// //           callback({ success: false, message: "Server error while starting journey" });
// //         }
// //       }
// //     });


// //     // ─────────────────────────────────────────────
// //     // ADMIN — admin:order:update
// //     // Pura socket-driven order update. REST controller (updateOrder)
// //     // bilkul use nahi hota. Driver ko turant address + ETA reset +
// //     // notification — sab ek hi event me milta hai.
// //     // ─────────────────────────────────────────────
// //     socket.on("admin:order:update", async (data, callback) => {
// //       try {
// //         const {
// //           orderId,
// //           customerId,
// //           items,
// //           deliveryLocation,
// //           specialInstructions,
// //           packagingInstructions,
// //           priority,
// //           orderType,
// //           scheduledPickupDate,
// //           scheduledDeliveryDate,
// //           updatedByName
// //         } = data || {};

// //         log("ADMIN", `admin:order:update received | orderId: ${orderId}`);

// //         // ── Step 1: Validate orderId ──
// //         if (!orderId) {
// //           if (typeof callback === 'function') {
// //             callback({ success: false, message: "orderId is required" });
// //           }
// //           return;
// //         }

// //         // ── Step 2: Order fetch ──
// //         const order = await Order.findById(orderId);
// //         if (!order) {
// //           if (typeof callback === 'function') {
// //             callback({ success: false, message: "Order not found" });
// //           }
// //           return;
// //         }

// //         log("INFO", `Order found | orderNumber: ${order.orderNumber} | currentStatus: ${order.status} | deliveryId: ${order.deliveryId || 'NONE'}`);

// //         // ── Step 3: canBeModified check — HARD BLOCK ──
// //         // Yeh check backend-level security hai — frontend bypass ho bhi jaye to yahan rukega
// //         if (!order.canUpdateOrder || !order.canUpdateOrder()) {
// //           log("WARN", `admin:order:update — order cannot be modified | status: ${order.status}`);
// //           if (typeof callback === 'function') {
// //             callback({
// //               success: false,
// //               orderLocked: true,
// //               message: `Order cannot be edited — current status is "${order.status}". Only Pending/Confirmed orders can be updated.`
// //             });
// //           }
// //           return;
// //         }

// //         // ── Step 4: Update simple fields ──
// //         if (customerId) order.customerId = customerId;
// //         if (orderType) order.orderType = orderType;
// //         if (packagingInstructions !== undefined) order.packagingInstructions = packagingInstructions;
// //         if (specialInstructions !== undefined) order.specialInstructions = specialInstructions;
// //         if (priority) order.priority = priority;
// //         if (scheduledPickupDate) order.scheduledPickupDate = new Date(scheduledPickupDate);
// //         if (scheduledDeliveryDate) order.scheduledDeliveryDate = new Date(scheduledDeliveryDate);

// //         // ── Step 5: Items update ──
// //         if (Array.isArray(items) && items.length > 0) {
// //           order.items = items.map(item => ({
// //             productName: item.productName?.trim() || '',
// //             productCode: item.productCode || null,
// //             category: item.category || 'other',
// //             quantity: Number(item.quantity) || 1,
// //             description: item.description || ''
// //           }));
// //           log("INFO", `Items updated | count: ${order.items.length}`);
// //         }

// //         // ── Step 6: Delivery location merge (old + new, coordinates optional) ──
// //         if (deliveryLocation) {
// //           const oldLoc = order.deliveryLocation ? order.deliveryLocation.toObject() : {};

// //           const hasNewCoords =
// //             deliveryLocation.coordinates?.latitude !== undefined &&
// //             deliveryLocation.coordinates?.latitude !== '' &&
// //             deliveryLocation.coordinates?.longitude !== undefined &&
// //             deliveryLocation.coordinates?.longitude !== '';

// //           order.deliveryLocation = {
// //             ...oldLoc,
// //             address: deliveryLocation.address ?? oldLoc.address,
// //             contactPerson: deliveryLocation.contactPerson ?? oldLoc.contactPerson,
// //             contactPhone: deliveryLocation.contactPhone ?? oldLoc.contactPhone,
// //             city: deliveryLocation.city ?? oldLoc.city,
// //             state: deliveryLocation.state ?? oldLoc.state,
// //             pincode: deliveryLocation.pincode ?? oldLoc.pincode,
// //             landmark: deliveryLocation.landmark ?? oldLoc.landmark,
// //             coordinates: hasNewCoords
// //               ? {
// //                 latitude: Number(deliveryLocation.coordinates.latitude),
// //                 longitude: Number(deliveryLocation.coordinates.longitude)
// //               }
// //               : oldLoc.coordinates
// //           };

// //           log("INFO", `deliveryLocation merged | new address: ${order.deliveryLocation.address}`);
// //         }

// //         // ── Step 7: Order save ──
// //         await order.save();
// //         log("INFO", `Order saved successfully | orderNumber: ${order.orderNumber}`);

// //         // ── Step 8: Delivery collection sync + ETA reset ──
// //         let etaWasReset = false;
// //         let deliveryDriverId = null;

// //         if (order.deliveryId) {
// //           try {
// //             const deliveryUpdate = {
// //               'deliveryLocation.address': order.deliveryLocation.address,
// //               'deliveryLocation.contactPerson': order.deliveryLocation.contactPerson,
// //               'deliveryLocation.contactPhone': order.deliveryLocation.contactPhone,
// //               'deliveryLocation.city': order.deliveryLocation.city,
// //               'deliveryLocation.state': order.deliveryLocation.state,
// //               'deliveryLocation.pincode': order.deliveryLocation.pincode,
// //             };

// //             if (order.deliveryLocation?.coordinates?.latitude && order.deliveryLocation?.coordinates?.longitude) {
// //               deliveryUpdate['deliveryLocation.coordinates.latitude'] = order.deliveryLocation.coordinates.latitude;
// //               deliveryUpdate['deliveryLocation.coordinates.longitude'] = order.deliveryLocation.coordinates.longitude;
// //             }

// //             const updatedDelivery = await Delivery.findByIdAndUpdate(
// //               order.deliveryId,
// //               deliveryUpdate,
// //               { new: true }
// //             ).select('driverId');

// //             deliveryDriverId = updatedDelivery?.driverId ? updatedDelivery.driverId.toString() : null;
// //             log("INFO", `Delivery document synced | deliveryId: ${order.deliveryId} | driverId: ${deliveryDriverId || 'NONE'}`);

// //             // ✅ Active Journey ka pehle se calculated ETA reset karo
// //             // taaki driver app dubara /navigate call karke naya distance/time nikale
// //             const activeJourney = await Journey.findOne({
// //               deliveryId: order.deliveryId,
// //               status: { $in: ['Started', 'In_transit', 'In_progress', 'Arrived'] }
// //             });

// //             if (activeJourney) {
// //               activeJourney.estimatedDurationFromGoogle = null;
// //               activeJourney.googleDistanceMeters = null;
// //               activeJourney.googleDurationInTrafficSeconds = null;
// //               await activeJourney.save();
// //               etaWasReset = true;
// //               log("INFO", `Journey ETA reset | journeyId: ${activeJourney._id}`);
// //             }
// //           } catch (delErr) {
// //             log("ERR", `Delivery sync failed | ${delErr.message}`);
// //           }
// //         }

// //         // ── Step 9: Poora updated data ek payload me taiyar karo ──
// //         const updatePayload = {
// //           orderId: order._id.toString(),
// //           orderNumber: order.orderNumber,
// //           deliveryId: order.deliveryId ? order.deliveryId.toString() : null,
// //           updatedDeliveryLocation: order.deliveryLocation || null,
// //           updatedItems: order.items || [],
// //           updatedSpecialInstructions: order.specialInstructions || null,
// //           updatedPackagingInstructions: order.packagingInstructions || null,
// //           updatedPriority: order.priority || null,
// //           updatedOrderType: order.orderType || null,
// //           updatedScheduledPickupDate: order.scheduledPickupDate || null,
// //           updatedScheduledDeliveryDate: order.scheduledDeliveryDate || null,
// //           etaReset: etaWasReset,          // driver app isko dekhkar dobara navigate API call kare
// //           message: `Order ${order.orderNumber} updated by ${updatedByName || 'Admin'}`,
// //           updatedByName: updatedByName || 'Admin',
// //           timestamp: new Date().toISOString(),
// //         };

// //         // ── Step 10: Driver ko turant bhejo (agar deliveryId + driver assigned hai) ──
// //         if (deliveryDriverId) {
// //           io.to(`driver-${deliveryDriverId}`).emit("order:updated", updatePayload);
// //           log("EMIT", `order:updated emitted to driver-${deliveryDriverId}`);

// //           // ============================================================
// //           // ✅ NAYA: Address update hone ke baad queue turant re-sort karo
// //           // Ho sakta hai jo delivery pehle dur thi, wo update ke baad
// //           // driver ke sabse nazdeek ban gayi ho (ya far ho gayi ho)
// //           // ============================================================
// //           try {
// //             const liveLoc = driverLocations.get(deliveryDriverId);
// //             const sortedQueue = await getSortedDeliveryQueueForDriver(
// //               deliveryDriverId,
// //               liveLoc ? { latitude: liveLoc.latitude, longitude: liveLoc.longitude } : null
// //             );

// //             io.to(`driver-${deliveryDriverId}`).emit("driver:queue:updated", {
// //               nextDelivery: sortedQueue[0] || null,
// //               queue: sortedQueue,
// //               reason: "delivery_address_updated",
// //               updatedOrderId: order._id.toString(),
// //               timestamp: new Date().toISOString(),
// //             });

// //             log("EMIT", `driver:queue:updated pushed to driver-${deliveryDriverId} | queueSize: ${sortedQueue.length}`);
// //           } catch (queueErr) {
// //             log("ERR", `Queue recalculation failed | ${queueErr.message}`);
// //           }

// //           // ── Notification DB record (existing code, as-is) ──
// //           try {
// //             const driver = await Driver.findById(deliveryDriverId).select('fcmToken name');

// //             await Notification.create({
// //               recipientId: deliveryDriverId,
// //               recipientType: 'Driver',
// //               type: 'delivery_updated',
// //               title: `Order Updated — ${order.orderNumber}`,
// //               message: `Delivery details updated. Address/items/instructions may have changed.`,
// //               data: { orderId: order._id, deliveryId: order.deliveryId },
// //               channels: {
// //                 push: {
// //                   sent: !!driver?.fcmToken,
// //                   sentAt: driver?.fcmToken ? new Date() : undefined,
// //                 }
// //               },
// //               priority: 'high',
// //               isRead: false,
// //             });
// //             log("INFO", `Notification DB record created for driver ${deliveryDriverId}`);

// //             if (driver?.fcmToken) {
// //               try {
// //                 await sendNotification(driver.fcmToken, {
// //                   title: `Order Updated — ${order.orderNumber}`,
// //                   body: `Delivery details have been updated. Tap to view.`,
// //                   type: 'order_updated',
// //                   orderId: order._id.toString(),
// //                   orderNumber: order.orderNumber,
// //                   deliveryId: order.deliveryId ? order.deliveryId.toString() : '',
// //                   address: order.deliveryLocation?.address || '',
// //                   etaReset: String(etaWasReset),
// //                 });
// //                 log("INFO", `FCM push sent to driver ${deliveryDriverId}`);
// //               } catch (fcmErr) {
// //                 log("ERR", `FCM push failed | ${fcmErr.message}`);
// //               }
// //             }
// //           } catch (notifErr) {
// //             log("ERR", `Notification creation failed | ${notifErr.message}`);
// //           }
// //         } else {
// //           log("WARN", `No driver assigned yet — order:updated not sent to any driver room`);
// //         }

// //         // ── Step 11: Admin room ko bhi broadcast (dusre logged-in admins ke liye) ──
// //         io.to("admin-room").emit("order:updated", updatePayload);
// //         log("EMIT", `order:updated broadcasted to admin-room`);

// //         // ── Step 12: ACK callback — admin panel ko turant response ──
// //         if (typeof callback === 'function') {
// //           callback({
// //             success: true,
// //             message: "Order updated successfully",
// //             orderId: order._id.toString(),
// //             deliveryLocation: order.deliveryLocation,
// //             etaReset: etaWasReset,
// //             driverNotified: !!deliveryDriverId,
// //           });
// //         }

// //         log("ADMIN", `admin:order:update completed successfully | orderNumber: ${order.orderNumber}`);

// //       } catch (err) {
// //         log("ERR", `admin:order:update | ${err.stack}`);
// //         if (typeof callback === 'function') {
// //           callback({ success: false, message: "Server error while updating order" });
// //         }
// //       }
// //     });
// //     // ─────────────────────────────────────────────
// //     // STEP 4: DRIVER — driver:location (live tracking)
// //     // ─────────────────────────────────────────────
// //     // socket.on("driver:location", async (data) => {
// //     //   try {
// //     //     const { driverId, journeyId, deliveryId, latitude, longitude, speed, heading, accuracy, timestamp } = data || {};

// //     //     if (!driverId || !latitude || !longitude) {
// //     //       log("WARN", `driver:location — invalid data | socket: ${socket.id}`);
// //     //       return;
// //     //     }

// //     //     log("LOC", `From driver ${driverId} | lat: ${latitude} | lng: ${longitude} | speed: ${speed}`);

// //     //     // DB update (non-blocking)
// //     //     Driver.findByIdAndUpdate(
// //     //       driverId,
// //     //       {
// //     //         "currentLocation.latitude": latitude,
// //     //         "currentLocation.longitude": longitude,
// //     //         "currentLocation.speed": speed || 0,
// //     //         "currentLocation.heading": heading || 0,
// //     //         "currentLocation.accuracy": accuracy || 0,
// //     //         "currentLocation.lastUpdated": new Date(),
// //     //         lastLocationUpdate: new Date(),
// //     //       },
// //     //       { new: false }
// //     //     )
// //     //       .then(() => log("INFO", `DB location saved for driver ${driverId}`))
// //     //       .catch((e) => log("ERR", `DB location save failed | ${e.message}`));

// //     //     const locationPayload = {
// //     //       latitude,
// //     //       longitude,
// //     //       speed: speed || 0,
// //     //       heading: heading || 0,
// //     //       accuracy: accuracy || 0,
// //     //       timestamp: timestamp || new Date().toISOString(),
// //     //       journeyId,
// //     //       deliveryId,
// //     //     };

// //     //     driverLocations.set(driverId, locationPayload);

// //     //     if (activeDrivers.has(driverId)) {
// //     //       const di = activeDrivers.get(driverId);
// //     //       activeDrivers.set(driverId, { ...di, lastSeen: new Date().toISOString() });
// //     //     } else {
// //     //       log("WARN", `driver:location — driverId ${driverId} not in activeDrivers! Call driver:connect first.`);
// //     //     }

// //     //     const driverInfo = activeDrivers.get(driverId);

// //     //     const adminRoomSockets = await io.in("admin-room").allSockets();
// //     //     if (adminRoomSockets.size === 0) {
// //     //       log("WARN", `No clients in admin-room!`);
// //     //     }

// //     //     io.to("admin-room").emit("driver:location:update", {
// //     //       driverId,
// //     //       driverName: driverInfo?.driverName || "Driver",
// //     //       vehicleNumber: driverInfo?.vehicleNumber || "N/A",
// //     //       journeyId,
// //     //       deliveryId,
// //     //       location: locationPayload,
// //     //       isAvailable: false,
// //     //       status: "In_transit",
// //     //       timestamp: new Date().toISOString(),
// //     //     });

// //     //     if (deliveryId) {
// //     //       io.to(`delivery-${deliveryId}`).emit("delivery:location:update", {
// //     //         deliveryId,
// //     //         driverId,
// //     //         location: { latitude, longitude },
// //     //         speed,
// //     //         heading,
// //     //         timestamp: timestamp || new Date().toISOString(),
// //     //       });
// //     //     }

// //     //     if (journeyId) {
// //     //       io.to(`journey-${journeyId}`).emit("journey:location:update", {
// //     //         journeyId,
// //     //         driverId,
// //     //         location: { latitude, longitude, speed, heading, accuracy },
// //     //         timestamp: timestamp || new Date().toISOString(),
// //     //       });
// //     //     }
// //     //   } catch (err) {
// //     //     log("ERR", `driver:location | ${err.stack}`);
// //     //   }
// //     // });

// //     socket.on("driver:location", async (data) => {
// //       try {
// //         const { driverId, journeyId, deliveryId, latitude, longitude, speed, heading, accuracy, timestamp } = data || {};

// //         if (!driverId || !latitude || !longitude) {
// //           log("WARN", `driver:location — invalid data | socket: ${socket.id}`);
// //           return;
// //         }

// //         log("LOC", `From driver ${driverId} | lat: ${latitude} | lng: ${longitude} | speed: ${speed}`);

// //         // DB update (non-blocking)
// //         Driver.findByIdAndUpdate(
// //           driverId,
// //           {
// //             "currentLocation.latitude": latitude,
// //             "currentLocation.longitude": longitude,
// //             "currentLocation.speed": speed || 0,
// //             "currentLocation.heading": heading || 0,
// //             "currentLocation.accuracy": accuracy || 0,
// //             "currentLocation.lastUpdated": new Date(),
// //             lastLocationUpdate: new Date(),
// //           },
// //           { new: false }
// //         )
// //           .then(() => log("INFO", `DB location saved for driver ${driverId}`))
// //           .catch((e) => log("ERR", `DB location save failed | ${e.message}`));

// //         const locationPayload = {
// //           latitude,
// //           longitude,
// //           speed: speed || 0,
// //           heading: heading || 0,
// //           accuracy: accuracy || 0,
// //           timestamp: timestamp || new Date().toISOString(),
// //           journeyId,
// //           deliveryId,
// //         };

// //         driverLocations.set(driverId, locationPayload);

// //         if (activeDrivers.has(driverId)) {
// //           const di = activeDrivers.get(driverId);
// //           activeDrivers.set(driverId, { ...di, lastSeen: new Date().toISOString() });
// //         } else {
// //           log("WARN", `driver:location — driverId ${driverId} not in activeDrivers! Call driver:connect first.`);
// //         }

// //         const driverInfo = activeDrivers.get(driverId);

// //         const adminRoomSockets = await io.in("admin-room").allSockets();
// //         if (adminRoomSockets.size === 0) {
// //           log("WARN", `No clients in admin-room!`);
// //         }

// //         io.to("admin-room").emit("driver:location:update", {
// //           driverId,
// //           driverName: driverInfo?.driverName || "Driver",
// //           vehicleNumber: driverInfo?.vehicleNumber || "N/A",
// //           journeyId,
// //           deliveryId,
// //           location: locationPayload,
// //           isAvailable: false,
// //           status: "In_transit",
// //           timestamp: new Date().toISOString(),
// //         });

// //         if (deliveryId) {
// //           io.to(`delivery-${deliveryId}`).emit("delivery:location:update", {
// //             deliveryId,
// //             driverId,
// //             location: { latitude, longitude },
// //             speed,
// //             heading,
// //             timestamp: timestamp || new Date().toISOString(),
// //           });
// //         }

// //         if (journeyId) {
// //           io.to(`journey-${journeyId}`).emit("journey:location:update", {
// //             journeyId,
// //             driverId,
// //             location: { latitude, longitude, speed, heading, accuracy },
// //             timestamp: timestamp || new Date().toISOString(),
// //           });
// //         }

// //         // ============================================================
// //         // ✅ NAYA: Throttled proximity re-sort
// //         // Sirf tab chalega jab driver ke paas 1 se zyada active delivery ho
// //         // Max har 20 second mein ek baar (per-socket throttle)
// //         // ============================================================
// //         const now = Date.now();
// //         const lastRecalc = socket._lastQueueRecalc || 0;

// //         if (now - lastRecalc > 20000) {
// //           try {
// //             const activeCount = await Delivery.countDocuments({
// //               driverId,
// //               status: { $in: ['assigned', 'In_transit', 'Arrived'] }
// //             });

// //             if (activeCount > 1) {
// //               socket._lastQueueRecalc = now;

// //               const sortedQueue = await getSortedDeliveryQueueForDriver(driverId, { latitude, longitude });
// //               const currentClosestId = sortedQueue[0]?._id?.toString();

// //               // Optional optimization: agar closest delivery pehle jaisi hi hai,
// //               // to bhi bhej do (light payload) — frontend khud decide karega redraw karna hai ya nahi
// //               io.to(`driver-${driverId}`).emit("driver:queue:updated", {
// //                 nextDelivery: sortedQueue[0] || null,
// //                 queue: sortedQueue,
// //                 reason: "driver_moved",
// //                 timestamp: new Date().toISOString(),
// //               });

// //               log("EMIT", `driver:queue:updated (auto re-sort) | driverId: ${driverId} | closest: ${currentClosestId}`);
// //             }
// //           } catch (queueErr) {
// //             log("ERR", `driver:location — queue re-sort failed | ${queueErr.message}`);
// //           }
// //         }

// //       } catch (err) {
// //         log("ERR", `driver:location | ${err.stack}`);
// //       }
// //     });

// //     socket.on("driver:journey:location", async (data) => {
// //       try {
// //         const { driverId, journeyId, deliveryId, latitude, longitude, speed, heading, status } = data || {};
// //         if (!driverId || !latitude || !longitude) return;

// //         // ✅ FIX: map update missing tha
// //         driverLocations.set(driverId, {
// //           latitude, longitude, speed: speed || 0, heading: heading || 0,
// //           timestamp: new Date().toISOString(), journeyId, deliveryId,
// //         });

// //         const driverInfo = activeDrivers.get(driverId);
// //         io.to("admin-room").emit("driver:location:update", {
// //           driverId,
// //           driverName: driverInfo?.driverName || "Driver",
// //           vehicleNumber: driverInfo?.vehicleNumber || "N/A",
// //           journeyId, deliveryId,
// //           location: { latitude, longitude, speed: speed || 0, heading: heading || 0 },
// //           isAvailable: false,
// //           status: status || "In_transit",
// //           timestamp: new Date().toISOString(),
// //         });
// //       } catch (err) {
// //         log("ERR", `driver:journey:location | ${err.message}`);
// //       }
// //     });

// //     socket.on("driver:journey:ended", async (data, callback) => {
// //       try {
// //         const { driverId, journeyId, deliveryId } = data || {};

// //         // ── Sirf memory cleanup — marker remove ──
// //         if (driverId) {
// //           driverLocations.delete(driverId);
// //           if (activeDrivers.has(driverId)) {
// //             const di = activeDrivers.get(driverId);
// //             activeDrivers.set(driverId, { ...di, journeyId: null, deliveryId: null });
// //           }
// //         }

// //         log("DRIVER", `Journey ENDED (marker removed) | journeyId: ${journeyId} | driverId: ${driverId}`);

// //         // ── Admin ko broadcast — marker remove karo ──
// //         io.to("admin-room").emit("driver:journey:ended", {
// //           driverId,
// //           journeyId,
// //           deliveryId,
// //           status: "Completed",
// //           timestamp: new Date().toISOString(),
// //         });

// //         // ── Driver offline bhi bhejo — map se marker hatane ke liye ──
// //         io.to("admin-room").emit("driver:offline", {
// //           driverId,
// //           status: "offline",
// //           timestamp: new Date().toISOString(),
// //         });

// //         log("EMIT", `Marker removed for driverId: ${driverId}`);

// //         // ── ACK ──
// //         if (typeof callback === 'function') {
// //           callback({ success: true, message: "Journey ended, marker removed" });
// //         }

// //       } catch (err) {
// //         log("ERR", `driver:journey:ended | ${err.message}`);
// //         if (typeof callback === 'function') {
// //           callback({ success: false, message: "Server error" });
// //         }
// //       }
// //     });


// //     // ─────────────────────────────────────────────
// //     // STEP 6 (FIXED): DRIVER — delivery:completed
// //     // FIX: DB update + driverId String normalize
// //     // ─────────────────────────────────────────────
// //     socket.on("delivery:completed", async (data) => {
// //       try {
// //         log("DRIVER", `Delivery COMPLETED | data: ${JSON.stringify(data)}`);

// //         const { driverId, deliveryId, journeyId, latitude, longitude, address } = data || {};

// //         if (!driverId) {
// //           log("WARN", `delivery:completed — driverId missing`);
// //           return;
// //         }

// //         // ── Memory cleanup ──
// //         driverLocations.delete(driverId);
// //         if (activeDrivers.has(driverId)) {
// //           const di = activeDrivers.get(driverId);
// //           activeDrivers.set(driverId, { ...di, journeyId: null, deliveryId: null });
// //         }

// //         // ── FIX: Journey status update ──
// //         if (journeyId) {
// //           try {
// //             await Journey.findByIdAndUpdate(
// //               journeyId,
// //               {
// //                 status: "completed",
// //                 endTime: new Date(),
// //                 ...(latitude && longitude && {
// //                   endLocation: {
// //                     coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
// //                     address: address || "Delivery completed",
// //                   },
// //                 }),
// //               },
// //               { new: false }
// //             );
// //             log("INFO", `Journey completed in DB | journeyId: ${journeyId}`);
// //           } catch (dbErr) {
// //             log("ERR", `Journey DB update failed | ${dbErr.message}`);
// //           }
// //         }

// //         // ── FIX: Delivery status update ──
// //         if (deliveryId) {
// //           try {
// //             await Delivery.findByIdAndUpdate(
// //               deliveryId,
// //               { status: "delivered", actualDeliveryTime: new Date() },
// //               { new: false }
// //             );

// //             await DeliveryStatusHistory.create({
// //               deliveryId,
// //               status: "delivered",
// //               location: latitude && longitude ? {
// //                 coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
// //                 address: address || "Delivery location",
// //               } : undefined,
// //               remarks: "Delivery completed by driver via socket",
// //               updatedBy: {
// //                 userId: driverId,
// //                 userRole: "driver",
// //                 userName: activeDrivers.get(driverId)?.driverName || "Driver",
// //               },
// //             });

// //             log("INFO", `Delivery marked delivered in DB | deliveryId: ${deliveryId}`);
// //           } catch (dbErr) {
// //             log("ERR", `Delivery DB update failed | ${dbErr.message}`);
// //           }
// //         }

// //         // ── Driver DB update ──
// //         await Driver.findByIdAndUpdate(
// //           driverId,
// //           {
// //             isAvailable: true,
// //             currentJourney: null,
// //             "currentLocation.latitude": null,
// //             "currentLocation.longitude": null,
// //             "currentLocation.lastUpdated": null,
// //           },
// //           { new: false }
// //         ).catch((e) => log("ERR", `Driver update failed | ${e.message}`));

// //         log("INFO", `Driver ${driverId} marked available in DB`);

// //         // ── FIX: driverId clearly String mein bhejo admin ko ──
// //         io.to("admin-room").emit("driver:delivery:completed", {
// //           driverId: String(driverId),
// //           deliveryId: String(deliveryId || ""),
// //           journeyId: String(journeyId || ""),
// //           status: "completed",
// //           timestamp: new Date().toISOString(),
// //         });

// //         log("EMIT", `driver:delivery:completed emitted | driverId: ${driverId}`);

// //       } catch (err) {
// //         log("ERR", `delivery:completed | ${err.stack}`);
// //       }
// //     });

// //     // ─────────────────────────────────────────────
// //     // JOURNEY: Room join/leave
// //     // ─────────────────────────────────────────────
// //     socket.on("join-journey", (journeyId) => {
// //       socket.join(`journey-${journeyId}`);
// //       log("INFO", `Client joined journey-${journeyId}`);
// //     });

// //     socket.on("leave-journey", (journeyId) => {
// //       socket.leave(`journey-${journeyId}`);
// //     });

// //     // DELIVERY: Room join/leave
// //     socket.on("join-delivery", (deliveryId) => {
// //       socket.join(`delivery-${deliveryId}`);
// //     });

// //     socket.on("leave-delivery", (deliveryId) => {
// //       socket.leave(`delivery-${deliveryId}`);
// //     });

// //     // driver:journey:arrived
// //     socket.on("driver:journey:arrived", (data) => {
// //       const { journeyId, deliveryId, location, status, driverId } = data || {};
// //       log("DRIVER", `Journey ARRIVED | journeyId: ${journeyId}`);
// //       io.to("admin-room").emit("driver:journey:arrived", {
// //         driverId,
// //         journeyId,
// //         deliveryId,
// //         location,
// //         status: status || "Arrived",
// //         timestamp: new Date().toISOString(),
// //       });
// //     });

// //     // driver:journey:location (alternative location event)
// //     socket.on("driver:journey:location", async (data) => {
// //       try {
// //         const { driverId, journeyId, deliveryId, latitude, longitude, speed, heading, status } = data || {};
// //         if (!driverId || !latitude || !longitude) return;

// //         const driverInfo = activeDrivers.get(driverId);
// //         io.to("admin-room").emit("driver:location:update", {
// //           driverId,
// //           driverName: driverInfo?.driverName || "Driver",
// //           vehicleNumber: driverInfo?.vehicleNumber || "N/A",
// //           journeyId,
// //           deliveryId,
// //           location: { latitude, longitude, speed: speed || 0, heading: heading || 0 },
// //           isAvailable: false,
// //           status: status || "In_transit",
// //           timestamp: new Date().toISOString(),
// //         });
// //       } catch (err) {
// //         log("ERR", `driver:journey:location | ${err.message}`);
// //       }
// //     });


// //     /////////////////////////////////////////

// //     // CHAT
// //     socket.on("chat:join", (data) => {
// //       socket.join(`user-${data?.userId}`);
// //     });

// //     socket.on("chat:join-conversation", (data) => {
// //       socket.join(`conversation-${data?.conversationId}`);
// //     });

// //     socket.on("chat:typing", (data) => {
// //       const { conversationId, userId, isTyping } = data || {};
// //       socket.to(`conversation-${conversationId}`).emit("chat:typing", { userId, isTyping });
// //     });

// //     // NOTIFICATIONS
// //     socket.on("notifications:subscribe", (data) => {
// //       socket.join(`notifications-${data?.userId}`);
// //     });

// //     // MAINTENANCE
// //     socket.on("driver-completed-service", async ({ scheduleId, driverName, vehicleNumber } = {}) => {
// //       try {
// //         const MaintenanceSchedule = require("./models/MaintenanceSchedule");
// //         const maintenance = await MaintenanceSchedule.findById(scheduleId).populate("vehicle");
// //         if (maintenance) {
// //           io.to("admin-room").emit("new-service-request", {
// //             type: "service_completion_request",
// //             message: `${vehicleNumber || "Vehicle"} - Driver "${driverName}" completed service!`,
// //             scheduleId,
// //             vehicleNumber: vehicleNumber || maintenance.vehicle?.vehicleNumber,
// //             driverName,
// //             requestedAt: new Date().toISOString(),
// //             status: maintenance.status,
// //           });
// //         }
// //       } catch (err) {
// //         log("ERR", `maintenance socket | ${err.message}`);
// //       }
// //     });

// //     // PING
// //     socket.on("ping:driver", (data) => {
// //       socket.emit("pong:driver", { ...data, serverTime: new Date().toISOString() });
// //     });

// //     // ─────────────────────────────────────────────
// //     // DISCONNECT
// //     // ─────────────────────────────────────────────
// //     socket.on("disconnect", (reason) => {
// //       log("SOCKET", `Disconnected | socket: ${socket.id} | reason: ${reason}`);

// //       const driverId = socket.driverId;
// //       if (driverId && activeDrivers.has(driverId)) {
// //         const driver = activeDrivers.get(driverId);
// //         activeDrivers.delete(driverId);
// //         driverLocations.delete(driverId);

// //         log("DRIVER", `Driver OFFLINE | name: ${driver.driverName} | driverId: ${driverId} | total: ${activeDrivers.size}`);

// //         // ✅ driverId clearly bhejo
// //         io.to("admin-room").emit("driver:offline", {
// //           driverId,                       // marker remove ke liye
// //           driverName: driver.driverName,
// //           vehicleNumber: driver.vehicleNumber,
// //           status: "offline",
// //           timestamp: new Date().toISOString(),
// //         });
// //       }
// //     });

// //     socket.on("connect_error", (err) => {
// //       log("ERR", `connect_error | ${err.message}`);
// //     });
// //   });

// //   // Broadcast helper for REST API controllers
// //   io.broadcastDriverLocation = async function (driverData, locationData) {
// //     const adminSockets = await io.in("admin-room").allSockets();
// //     if (adminSockets.size === 0) {
// //       log("WARN", `broadcastDriverLocation — nobody in admin-room!`);
// //     }

// //     io.to("admin-room").emit("driver:location:update", {
// //       driverId: driverData.driverId || driverData._id?.toString(),
// //       driverName: driverData.driverName || driverData.name || "Driver",
// //       vehicleNumber: driverData.vehicleNumber || "N/A",
// //       journeyId: driverData.journeyId,
// //       deliveryId: driverData.deliveryId,
// //       location: locationData,
// //       isAvailable: false,
// //       status: driverData.status || "In_transit",
// //       timestamp: new Date().toISOString(),
// //     });
// //   };

// //   log("INFO", "✅ Socket handlers initialized");
// //   return { activeDrivers, driverLocations };
// // }

// // module.exports = setupSocketHandlers;



// const Driver = require("../models/Driver");
// const Journey = require("../models/Journey");
// const Delivery = require("../models/Delivery");
// const DeliveryStatusHistory = require("../models/DeliveryStatusHistory");
// const Order = require("../models/Order")
// const Notification = require("../models/Notification");
// const { sendNotification } = require("./sendNotification");
// const { calculateDistance } = require("./geoHelper");
// const mongoose = require("mongoose")

// const { PickupLocation } = require("../models/Order"); // PickupLocation wahi Order.js me export hota hai
// const NotificationService = require("../utils/sendNotification");
// const { optimizeRoute } = require("../utils/routeOptimizer");

// const activeDrivers = new Map();
// const driverLocations = new Map();

// const LOG_PREFIX = {
//   SOCKET: "🔌 [SOCKET]",
//   DRIVER: "🚗 [DRIVER]",
//   ADMIN: "👔 [ADMIN]",
//   LOC: "📍 [LOCATION]",
//   EMIT: "📤 [EMIT]",
//   RECV: "📥 [RECV]",
//   ERR: "❌ [ERROR]",
//   WARN: "⚠️  [WARN]",
//   INFO: "ℹ️  [INFO]",
// };

// function log(type, ...args) {
//   console.log(`[${new Date().toISOString()}] ${LOG_PREFIX[type] || type}`, ...args);
// }

// function setupSocketHandlers(io) {
//   io.activeDrivers = activeDrivers;
//   io.driverLocations = driverLocations;

//   setInterval(() => {
//     const connectedSockets = io.engine?.clientsCount || 0;
//     log("INFO",
//       `Active connections: ${connectedSockets} | ` +
//       `Active drivers: ${activeDrivers.size} | ` +
//       `Drivers with location: ${driverLocations.size}`
//     );
//   }, 30000);

//   io.on("connection", (socket) => {
//     log("SOCKET", `New client connected — socket.id: ${socket.id} | IP: ${socket.handshake.address} | Transport: ${socket.conn.transport.name}`);

//     socket.onAny((eventName, ...args) => {
//       log("RECV", `socket.id: ${socket.id} | event: "${eventName}" | data: ${JSON.stringify(args[0] || {}).substring(0, 200)}`);
//     });

//     // ─────────────────────────────────────────────
//     // STEP 1: ADMIN — join-admin-room
//     // ─────────────────────────────────────────────
//     socket.on("join-admin-room", () => {
//       socket.join("admin-room");
//       log("ADMIN", `Admin joined admin-room | socket.id: ${socket.id}`);

//       const driversList = Array.from(activeDrivers.values()).map((d) => ({
//         ...d,
//         location: driverLocations.get(d.driverId) || null,
//       }));

//       socket.emit("admin:drivers:list", driversList);
//       socket.emit("admin:room:joined", {
//         message: "Successfully joined admin-room",
//         activeDrivers: driversList.length,
//         timestamp: new Date().toISOString(),
//       });
//     });

//     // ─────────────────────────────────────────────
//     // STEP 2: DRIVER — driver:connect
//     // ─────────────────────────────────────────────
//     // socket.on("driver:connect", async (data) => {
//     //   try {
//     //     const { driverId, driverName, vehicleNumber } = data || {};

//     //     if (!driverId) {
//     //       log("WARN", `driver:connect — driverId missing | socket: ${socket.id}`);
//     //       return;
//     //     }

//     //     activeDrivers.set(driverId, {
//     //       socketId: socket.id,
//     //       driverId,
//     //       driverName: driverName || "Driver",
//     //       vehicleNumber: vehicleNumber || "N/A",
//     //       connectedAt: new Date().toISOString(),
//     //       isOnline: true,
//     //     });

//     //     socket.join(`driver-${driverId}`);
//     //     socket.driverId = driverId;

//     //     log("DRIVER", `Driver ONLINE | name: ${driverName} | socket: ${socket.id} | total: ${activeDrivers.size}`);

//     //     io.to("admin-room").emit("driver:online", {
//     //       driverId,
//     //       driverName,
//     //       vehicleNumber,
//     //       status: "online",
//     //       timestamp: new Date().toISOString(),
//     //     });

//     //     socket.emit("driver:connect:ack", {
//     //       success: true,
//     //       message: "Connected to server",
//     //       timestamp: new Date().toISOString(),
//     //     });
//     //   } catch (err) {
//     //     log("ERR", `driver:connect | ${err.message}`);
//     //   }
//     // });

//     socket.on("driver:connect", async (data) => {
//       try {
//         const { driverId, driverName, vehicleNumber } = data || {};
//         if (!driverId) return;

//         // ✅ FIX: agar isi driverId ka purana socket already connected hai, use disconnect karo
//         const existing = activeDrivers.get(driverId);
//         if (existing && existing.socketId !== socket.id) {
//           const oldSocket = io.sockets.sockets.get(existing.socketId);
//           if (oldSocket) {
//             log("WARN", `Duplicate connection for driverId ${driverId} — disconnecting old socket ${existing.socketId}`);
//             oldSocket.leave(`driver-${driverId}`);
//             oldSocket.disconnect(true);
//           }
//         }

//         activeDrivers.set(driverId, {
//           socketId: socket.id,
//           driverId,
//           driverName: driverName || "Driver",
//           vehicleNumber: vehicleNumber || "N/A",
//           connectedAt: new Date().toISOString(),
//           isOnline: true,
//         });

//         socket.join(`driver-${driverId}`);
//         socket.driverId = driverId;

//         log("DRIVER", `Driver ONLINE | name: ${driverName} | socket: ${socket.id} | total: ${activeDrivers.size}`);

//         io.to("admin-room").emit("driver:online", {
//           driverId,
//           driverName,
//           vehicleNumber,
//           status: "online",
//           timestamp: new Date().toISOString(),
//         });

//         socket.emit("driver:connect:ack", {
//           success: true,
//           message: "Connected to server",
//           timestamp: new Date().toISOString(),
//         });
//       } catch (err) { log("ERR", `driver:connect | ${err.message}`); }
//     });

//     // ─────────────────────────────────────────────
//     // STEP 3: DRIVER — driver:journey:started
//     // FIX: Proper ACK callback pattern
//     // ─────────────────────────────────────────────

//     socket.on("driver:journey:started", async (data, callback) => {
//       try {
//         const { driverId, deliveryId, address } = data || {};

//         const latitude = data?.latitude ?? data?.location?.latitude;
//         const longitude = data?.longitude ?? data?.location?.longitude;

//         if (!latitude || !longitude) {
//           const driverDoc = await Driver.findById(driverId).select('currentLocation');
//           if (driverDoc?.currentLocation?.latitude && driverDoc?.currentLocation?.longitude) {
//             latitude = driverDoc.currentLocation.latitude;
//             longitude = driverDoc.currentLocation.longitude;
//             log("WARN", `driver:journey:started — location missing from app, using last known DB location`);
//           }
//         }

//         // ── Validation ──
//         if (!driverId || !deliveryId) {
//           log("WARN", `driver:journey:started — driverId/deliveryId missing | data: ${JSON.stringify(data)}`);
//           if (typeof callback === 'function') {
//             callback({ success: false, message: "driverId and deliveryId required" });
//           }
//           return;
//         }

//         if (!latitude || !longitude) {
//           log("WARN", `driver:journey:started — location missing | received: ${JSON.stringify(data)}`);
//           if (typeof callback === 'function') {
//             callback({ success: false, message: "latitude and longitude required" });
//           }
//           return;
//         }

//         // ── Delivery check ──
//         const delivery = await Delivery.findOne({
//           _id: deliveryId,
//           driverId: driverId,
//           status: 'assigned',
//         });

//         if (!delivery) {
//           log("WARN", `driver:journey:started — delivery not found | deliveryId: ${deliveryId}`);
//           if (typeof callback === 'function') {
//             callback({ success: false, message: "Delivery not found or not assigned to you" });
//           }
//           return;
//         }

//         // ── Already started check ──
//         const existingJourney = await Journey.findOne({
//           deliveryId,
//           status: { $in: ['Started', 'In_transit', 'In_progress'] },
//         });

//         if (existingJourney) {
//           log("WARN", `driver:journey:started — journey already exists | journeyId: ${existingJourney._id}`);
//           if (typeof callback === 'function') {
//             callback({
//               success: true,
//               journeyId: existingJourney._id.toString(),
//               deliveryId,
//               status: existingJourney.status,
//               message: "Journey already in progress",
//             });
//           }
//           return;
//         }

//         const locationData = {
//           latitude: Number(latitude),
//           longitude: Number(longitude),
//           address: address || 'GPS Location',
//           lastUpdated: new Date(),
//         };

//         // ── DB mein Journey create karo ──
//         const journey = await Journey.create({
//           deliveryId,
//           driverId: driverId,
//           startLocation: {
//             coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
//             address: address || 'Location captured via GPS',
//           },
//           startTime: new Date(),
//           status: 'In_transit',
//         });

//         log("DRIVER", `Journey created in DB | journeyId: ${journey._id} | driverId: ${driverId}`);

//         // ── Delivery status update ──
//         delivery.status = 'In_transit';
//         delivery.actualPickupTime = new Date();
//         await delivery.save();

//         await DeliveryStatusHistory.create({
//           deliveryId: delivery._id,
//           status: 'In_transit',
//           location: {
//             coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
//             address: address || 'GPS Location',
//           },
//           remarks: 'Driver started journey via socket',
//           updatedBy: {
//             userId: driverId,
//             userRole: 'driver',
//             userName: activeDrivers.get(driverId)?.driverName || 'Driver',
//           },
//         });

//         // ── Driver model update ──
//         await Driver.findByIdAndUpdate(driverId, {
//           currentJourney: journey._id,
//           activeDelivery: delivery._id,
//           currentLocation: locationData,
//           lastLocationUpdate: new Date(),
//         });

//         // ── In-memory update ──
//         driverLocations.set(driverId, {
//           ...locationData,
//           journeyId: journey._id.toString(),
//           deliveryId,
//         });

//         if (activeDrivers.has(driverId)) {
//           const di = activeDrivers.get(driverId);
//           activeDrivers.set(driverId, {
//             ...di,
//             journeyId: journey._id.toString(),
//             deliveryId,
//           });
//         }

//         // ── Admin broadcast ──
//         const driverInfo = activeDrivers.get(driverId);

//         io.to("admin-room").emit("driver:journey:started", {
//           driverId,
//           driverName: driverInfo?.driverName || "Driver",
//           vehicleNumber: driverInfo?.vehicleNumber || "N/A",
//           journeyId: journey._id.toString(),
//           deliveryId,
//           location: locationData,
//           status: "In_transit",
//           timestamp: new Date().toISOString(),
//         });

//         io.to("admin-room").emit("driver:location:update", {
//           driverId,
//           driverName: driverInfo?.driverName || "Driver",
//           vehicleNumber: driverInfo?.vehicleNumber || "N/A",
//           journeyId: journey._id.toString(),
//           deliveryId,
//           location: locationData,
//           isAvailable: false,
//           status: "In_transit",
//           timestamp: new Date().toISOString(),
//         });

//         log("EMIT", `journey:start:ack sent via callback | journeyId: ${journey._id}`);

//         // ✅ Proper ACK callback — event emit nahi, direct callback
//         if (typeof callback === 'function') {
//           callback({
//             success: true,
//             journeyId: journey._id.toString(),
//             deliveryId,
//             status: 'In_transit',
//             message: "Journey started successfully",
//           });
//         }

//       } catch (err) {
//         log("ERR", `driver:journey:started | ${err.stack}`);
//         if (typeof callback === 'function') {
//           callback({ success: false, message: "Server error while starting journey" });
//         }
//       }
//     });

//     // ─────────────────────────────────────────────
//     // ADMIN — admin:order:update
//     // Pura socket-driven order update. Driver ko turant address +
//     // ETA reset + notification — sab ek hi event me milta hai.
//     // ─────────────────────────────────────────────
//     // socket.on("admin:order:update", async (data, callback) => {
//     //   try {
//     //     const {
//     //       orderId,
//     //       customerId,
//     //       items,
//     //       deliveryLocation,
//     //       specialInstructions,
//     //       packagingInstructions,
//     //       priority,
//     //       orderType,
//     //       scheduledPickupDate,
//     //       scheduledDeliveryDate,
//     //       updatedByName
//     //     } = data || {};

//     //     log("ADMIN", `admin:order:update received | orderId: ${orderId}`);

//     //     if (!orderId) {
//     //       if (typeof callback === 'function') {
//     //         callback({ success: false, message: "orderId is required" });
//     //       }
//     //       return;
//     //     }

//     //     const order = await Order.findById(orderId);
//     //     if (!order) {
//     //       if (typeof callback === 'function') {
//     //         callback({ success: false, message: "Order not found" });
//     //       }
//     //       return;
//     //     }

//     //     log("INFO", `Order found | orderNumber: ${order.orderNumber} | currentStatus: ${order.status} | deliveryId: ${order.deliveryId || 'NONE'}`);

//     //     // ── HARD BLOCK — backend-level security, frontend bypass ho bhi jaye to yahan rukega ──
//     //     if (!order.canUpdateOrder || !order.canUpdateOrder()) {
//     //       log("WARN", `admin:order:update — order cannot be modified | status: ${order.status}`);
//     //       if (typeof callback === 'function') {
//     //         callback({
//     //           success: false,
//     //           orderLocked: true,
//     //           message: `Order cannot be edited — current status is "${order.status}". Only Pending/Confirmed orders can be updated.`
//     //         });
//     //       }
//     //       return;
//     //     }

//     //     // ── Simple fields ──
//     //     if (customerId) order.customerId = customerId;
//     //     if (orderType) order.orderType = orderType;
//     //     if (packagingInstructions !== undefined) order.packagingInstructions = packagingInstructions;
//     //     if (specialInstructions !== undefined) order.specialInstructions = specialInstructions;
//     //     if (priority) order.priority = priority;
//     //     if (scheduledPickupDate) order.scheduledPickupDate = new Date(scheduledPickupDate);
//     //     if (scheduledDeliveryDate) order.scheduledDeliveryDate = new Date(scheduledDeliveryDate);

//     //     // ── Items ──
//     //     if (Array.isArray(items) && items.length > 0) {
//     //       order.items = items.map(item => ({
//     //         productName: item.productName?.trim() || '',
//     //         productCode: item.productCode || null,
//     //         category: item.category || 'other',
//     //         quantity: Number(item.quantity) || 1,
//     //         description: item.description || ''
//     //       }));
//     //       log("INFO", `Items updated | count: ${order.items.length}`);
//     //     }

//     //     // ── Delivery location merge (old + new, coordinates optional) ──
//     //     if (deliveryLocation) {
//     //       const oldLoc = order.deliveryLocation ? order.deliveryLocation.toObject() : {};

//     //       const hasNewCoords =
//     //         deliveryLocation.coordinates?.latitude !== undefined &&
//     //         deliveryLocation.coordinates?.latitude !== '' &&
//     //         deliveryLocation.coordinates?.longitude !== undefined &&
//     //         deliveryLocation.coordinates?.longitude !== '';

//     //       order.deliveryLocation = {
//     //         ...oldLoc,
//     //         address: deliveryLocation.address ?? oldLoc.address,
//     //         contactPerson: deliveryLocation.contactPerson ?? oldLoc.contactPerson,
//     //         contactPhone: deliveryLocation.contactPhone ?? oldLoc.contactPhone,
//     //         city: deliveryLocation.city ?? oldLoc.city,
//     //         state: deliveryLocation.state ?? oldLoc.state,
//     //         pincode: deliveryLocation.pincode ?? oldLoc.pincode,
//     //         landmark: deliveryLocation.landmark ?? oldLoc.landmark,
//     //         coordinates: hasNewCoords
//     //           ? {
//     //             latitude: Number(deliveryLocation.coordinates.latitude),
//     //             longitude: Number(deliveryLocation.coordinates.longitude)
//     //           }
//     //           : oldLoc.coordinates
//     //       };

//     //       log("INFO", `deliveryLocation merged | new address: ${order.deliveryLocation.address}`);
//     //     }

//     //     await order.save();
//     //     log("INFO", `Order saved successfully | orderNumber: ${order.orderNumber}`);

//     //     // ── Delivery collection sync + ETA reset ──
//     //     let etaWasReset = false;
//     //     let deliveryDriverId = null;

//     //     if (order.deliveryId) {
//     //       try {
//     //         const deliveryUpdate = {
//     //           'deliveryLocation.address': order.deliveryLocation.address,
//     //           'deliveryLocation.contactPerson': order.deliveryLocation.contactPerson,
//     //           'deliveryLocation.contactPhone': order.deliveryLocation.contactPhone,
//     //         };

//     //         if (order.deliveryLocation?.coordinates?.latitude && order.deliveryLocation?.coordinates?.longitude) {
//     //           deliveryUpdate['deliveryLocation.coordinates.latitude'] = order.deliveryLocation.coordinates.latitude;
//     //           deliveryUpdate['deliveryLocation.coordinates.longitude'] = order.deliveryLocation.coordinates.longitude;
//     //         }

//     //         const updatedDelivery = await Delivery.findByIdAndUpdate(
//     //           order.deliveryId,
//     //           deliveryUpdate,
//     //           { new: true }
//     //         ).select('driverId nextDeliveryId');

//     //         deliveryDriverId = updatedDelivery?.driverId ? updatedDelivery.driverId.toString() : null;
//     //         log("INFO", `Delivery document synced | deliveryId: ${order.deliveryId} | driverId: ${deliveryDriverId || 'NONE'}`);

//     //         // ✅ Active Journey ka pehle se calculated ETA reset karo
//     //         const activeJourney = await Journey.findOne({
//     //           deliveryId: order.deliveryId,
//     //           status: { $in: ['Started', 'In_transit', 'In_progress', 'Arrived'] }
//     //         });

//     //         if (activeJourney) {
//     //           activeJourney.estimatedDurationFromGoogle = null;
//     //           activeJourney.googleDistanceMeters = null;
//     //           activeJourney.googleDurationInTrafficSeconds = null;
//     //           await activeJourney.save();
//     //           etaWasReset = true;
//     //           log("INFO", `Journey ETA reset | journeyId: ${activeJourney._id}`);
//     //         }
//     //       } catch (delErr) {
//     //         log("ERR", `Delivery sync failed | ${delErr.message}`);
//     //       }
//     //     }

//     //     // ── Poora updated data ek payload me taiyar karo ──
//     //     const updatePayload = {
//     //       orderId: order._id.toString(),
//     //       orderNumber: order.orderNumber,
//     //       deliveryId: order.deliveryId ? order.deliveryId.toString() : null,
//     //       updatedDeliveryLocation: order.deliveryLocation || null,
//     //       updatedItems: order.items || [],
//     //       updatedSpecialInstructions: order.specialInstructions || null,
//     //       updatedPackagingInstructions: order.packagingInstructions || null,
//     //       updatedPriority: order.priority || null,
//     //       updatedOrderType: order.orderType || null,
//     //       updatedScheduledPickupDate: order.scheduledPickupDate || null,
//     //       updatedScheduledDeliveryDate: order.scheduledDeliveryDate || null,
//     //       etaReset: etaWasReset,
//     //       message: `Order ${order.orderNumber} updated by ${updatedByName || 'Admin'}`,
//     //       updatedByName: updatedByName || 'Admin',
//     //       timestamp: new Date().toISOString(),
//     //     };

//     //     // ── Driver ko turant bhejo ──
//     //     if (deliveryDriverId) {
//     //       io.to(`driver-${deliveryDriverId}`).emit("order:updated", updatePayload);
//     //       log("EMIT", `order:updated emitted to driver-${deliveryDriverId}`);

//     //       try {
//     //         const driver = await Driver.findById(deliveryDriverId).select('fcmToken name');

//     //         await Notification.create({
//     //           recipientId: deliveryDriverId,
//     //           recipientType: 'Driver',
//     //           type: 'delivery_updated',
//     //           title: `Order Updated — ${order.orderNumber}`,
//     //           message: `Delivery details updated. Address/items/instructions may have changed.`,
//     //           data: { deliveryId: order.deliveryId },
//     //           channels: {
//     //             push: {
//     //               sent: !!driver?.fcmToken,
//     //               sentAt: driver?.fcmToken ? new Date() : undefined,
//     //             }
//     //           },
//     //           priority: 'high',
//     //           isRead: false,
//     //         });
//     //         log("INFO", `Notification DB record created for driver ${deliveryDriverId}`);

//     //         if (driver?.fcmToken) {
//     //           try {
//     //             await sendNotification(driver.fcmToken, {
//     //               title: `Order Updated — ${order.orderNumber}`,
//     //               body: `Delivery details have been updated. Tap to view.`,
//     //               type: 'order_updated',
//     //               orderId: order._id.toString(),
//     //               orderNumber: order.orderNumber,
//     //               deliveryId: order.deliveryId ? order.deliveryId.toString() : '',
//     //               address: order.deliveryLocation?.address || '',
//     //               etaReset: String(etaWasReset),
//     //             });
//     //             log("INFO", `FCM push sent to driver ${deliveryDriverId}`);
//     //           } catch (fcmErr) {
//     //             log("ERR", `FCM push failed | ${fcmErr.message}`);
//     //           }
//     //         }
//     //       } catch (notifErr) {
//     //         log("ERR", `Notification creation failed | ${notifErr.message}`);
//     //       }
//     //     } else {
//     //       log("WARN", `No driver assigned yet — order:updated not sent to any driver room`);
//     //     }

//     //     // ── Admin room ko bhi broadcast ──
//     //     io.to("admin-room").emit("order:updated", updatePayload);
//     //     log("EMIT", `order:updated broadcasted to admin-room`);

//     //     if (typeof callback === 'function') {
//     //       callback({
//     //         success: true,
//     //         message: "Order updated successfully",
//     //         orderId: order._id.toString(),
//     //         deliveryLocation: order.deliveryLocation,
//     //         etaReset: etaWasReset,
//     //         driverNotified: !!deliveryDriverId,
//     //       });
//     //     }

//     //     log("ADMIN", `admin:order:update completed successfully | orderNumber: ${order.orderNumber}`);

//     //   } catch (err) {
//     //     log("ERR", `admin:order:update | ${err.stack}`);
//     //     if (typeof callback === 'function') {
//     //       callback({ success: false, message: "Server error while updating order" });
//     //     }
//     //   }
//     // });

//         socket.on("admin:order:update", async (data, callback) => {
//       try {
//         const {
//           orderId,
//           customerId,
//           items,
//           deliveryLocation,
//           specialInstructions,
//           packagingInstructions,
//           priority,
//           orderType,
//           scheduledPickupDate,
//           scheduledDeliveryDate,
//           updatedByName
//         } = data || {};

//         log("ADMIN", `admin:order:update received | orderId: ${orderId}`);

//         if (!orderId) {
//           if (typeof callback === 'function') {
//             callback({ success: false, message: "orderId is required" });
//           }
//           return;
//         }

//         const order = await Order.findById(orderId);
//         if (!order) {
//           if (typeof callback === 'function') {
//             callback({ success: false, message: "Order not found" });
//           }
//           return;
//         }

//         log("INFO", `Order found | orderNumber: ${order.orderNumber} | currentStatus: ${order.status} | deliveryId: ${order.deliveryId || 'NONE'}`);

//         // ── HARD BLOCK — backend-level security, frontend bypass ho bhi jaye to yahan rukega ──
//         if (!order.canUpdateOrder || !order.canUpdateOrder()) {
//           log("WARN", `admin:order:update — order cannot be modified | status: ${order.status}`);
//           if (typeof callback === 'function') {
//             callback({
//               success: false,
//               orderLocked: true,
//               message: `Order cannot be edited — current status is "${order.status}". Only Pending/Confirmed orders can be updated.`
//             });
//           }
//           return;
//         }

//         // ── Simple fields ──
//         if (customerId) order.customerId = customerId;
//         if (orderType) order.orderType = orderType;
//         if (packagingInstructions !== undefined) order.packagingInstructions = packagingInstructions;
//         if (specialInstructions !== undefined) order.specialInstructions = specialInstructions;
//         if (priority) order.priority = priority;
//         if (scheduledPickupDate) order.scheduledPickupDate = new Date(scheduledPickupDate);
//         if (scheduledDeliveryDate) order.scheduledDeliveryDate = new Date(scheduledDeliveryDate);

//         // ── Items ──
//         if (Array.isArray(items) && items.length > 0) {
//           order.items = items.map(item => ({
//             productName: item.productName?.trim() || '',
//             productCode: item.productCode || null,
//             category: item.category || 'other',
//             quantity: Number(item.quantity) || 1,
//             description: item.description || ''
//           }));
//           log("INFO", `Items updated | count: ${order.items.length}`);
//         }

//         // ── Delivery location merge (old + new, coordinates optional) ──
//         if (deliveryLocation) {
//           const oldLoc = order.deliveryLocation ? order.deliveryLocation.toObject() : {};

//           const hasNewCoords =
//             deliveryLocation.coordinates?.latitude !== undefined &&
//             deliveryLocation.coordinates?.latitude !== '' &&
//             deliveryLocation.coordinates?.longitude !== undefined &&
//             deliveryLocation.coordinates?.longitude !== '';

//           order.deliveryLocation = {
//             ...oldLoc,
//             address: deliveryLocation.address ?? oldLoc.address,
//             contactPerson: deliveryLocation.contactPerson ?? oldLoc.contactPerson,
//             contactPhone: deliveryLocation.contactPhone ?? oldLoc.contactPhone,
//             city: deliveryLocation.city ?? oldLoc.city,
//             state: deliveryLocation.state ?? oldLoc.state,
//             pincode: deliveryLocation.pincode ?? oldLoc.pincode,
//             landmark: deliveryLocation.landmark ?? oldLoc.landmark,
//             coordinates: hasNewCoords
//               ? {
//                 latitude: Number(deliveryLocation.coordinates.latitude),
//                 longitude: Number(deliveryLocation.coordinates.longitude)
//               }
//               : oldLoc.coordinates
//           };

//           log("INFO", `deliveryLocation merged | new address: ${order.deliveryLocation.address}`);
//         }

//         await order.save();
//         log("INFO", `Order saved successfully | orderNumber: ${order.orderNumber}`);

//         // ── Delivery collection sync + ETA reset ──
//         let etaWasReset = false;
//         let deliveryDriverId = null;

//         if (order.deliveryId) {
//           try {
//             const deliveryUpdate = {
//               'deliveryLocation.address': order.deliveryLocation.address,
//               'deliveryLocation.contactPerson': order.deliveryLocation.contactPerson,
//               'deliveryLocation.contactPhone': order.deliveryLocation.contactPhone,
//             };

//             if (order.deliveryLocation?.coordinates?.latitude && order.deliveryLocation?.coordinates?.longitude) {
//               deliveryUpdate['deliveryLocation.coordinates.latitude'] = order.deliveryLocation.coordinates.latitude;
//               deliveryUpdate['deliveryLocation.coordinates.longitude'] = order.deliveryLocation.coordinates.longitude;
//             }

//             const updatedDelivery = await Delivery.findByIdAndUpdate(
//               order.deliveryId,
//               deliveryUpdate,
//               { new: true }
//             ).select('driverId nextDeliveryId');

//             deliveryDriverId = updatedDelivery?.driverId ? updatedDelivery.driverId.toString() : null;
//             log("INFO", `Delivery document synced | deliveryId: ${order.deliveryId} | driverId: ${deliveryDriverId || 'NONE'}`);

//             // ✅ Active Journey ka pehle se calculated ETA reset karo
//             const activeJourney = await Journey.findOne({
//               deliveryId: order.deliveryId,
//               status: { $in: ['Started', 'In_transit', 'In_progress', 'Arrived'] }
//             });

//             if (activeJourney) {
//               activeJourney.estimatedDurationFromGoogle = null;
//               activeJourney.googleDistanceMeters = null;
//               activeJourney.googleDurationInTrafficSeconds = null;
//               await activeJourney.save();
//               etaWasReset = true;
//               log("INFO", `Journey ETA reset | journeyId: ${activeJourney._id}`);
//             }
//           } catch (delErr) {
//             log("ERR", `Delivery sync failed | ${delErr.message}`);
//           }
//         }

//         // ── Poora updated data ek payload me taiyar karo ──
//         const updatePayload = {
//           orderId: order._id.toString(),
//           orderNumber: order.orderNumber,
//           deliveryId: order.deliveryId ? order.deliveryId.toString() : null,
//           updatedDeliveryLocation: order.deliveryLocation || null,
//           updatedItems: order.items || [],
//           updatedSpecialInstructions: order.specialInstructions || null,
//           updatedPackagingInstructions: order.packagingInstructions || null,
//           updatedPriority: order.priority || null,
//           updatedOrderType: order.orderType || null,
//           updatedScheduledPickupDate: order.scheduledPickupDate || null,
//           updatedScheduledDeliveryDate: order.scheduledDeliveryDate || null,
//           etaReset: etaWasReset,
//           message: `Order ${order.orderNumber} updated by ${updatedByName || 'Admin'}`,
//           updatedByName: updatedByName || 'Admin',
//           timestamp: new Date().toISOString(),
//         };

//         // ── Driver ko turant bhejo ──
//         if (deliveryDriverId) {
//           io.to(`driver-${deliveryDriverId}`).emit("order:updated", updatePayload);
//           log("EMIT", `order:updated emitted to driver-${deliveryDriverId}`);

//           try {
//             const driver = await Driver.findById(deliveryDriverId).select('fcmToken name');

//             await Notification.create({
//               recipientId: deliveryDriverId,
//               recipientType: 'Driver',
//               type: 'delivery_updated',
//               title: `Order Updated — ${order.orderNumber}`,
//               message: `Delivery details updated. Address/items/instructions may have changed.`,
//               data: { deliveryId: order.deliveryId },
//               channels: {
//                 push: {
//                   sent: !!driver?.fcmToken,
//                   sentAt: driver?.fcmToken ? new Date() : undefined,
//                 }
//               },
//               priority: 'high',
//               isRead: false,
//             });
//             log("INFO", `Notification DB record created for driver ${deliveryDriverId}`);

//             if (driver?.fcmToken) {
//               try {
//                 await sendNotification(driver.fcmToken, {
//                   title: `Order Updated — ${order.orderNumber}`,
//                   body: `Delivery details have been updated. Tap to view.`,
//                   type: 'order_updated',
//                   orderId: order._id.toString(),
//                   orderNumber: order.orderNumber,
//                   deliveryId: order.deliveryId ? order.deliveryId.toString() : '',
//                   address: order.deliveryLocation?.address || '',
//                   etaReset: String(etaWasReset),
//                 });
//                 log("INFO", `FCM push sent to driver ${deliveryDriverId}`);
//               } catch (fcmErr) {
//                 log("ERR", `FCM push failed | ${fcmErr.message}`);
//               }
//             }
//           } catch (notifErr) {
//             log("ERR", `Notification creation failed | ${notifErr.message}`);
//           }
//         } else {
//           log("WARN", `No driver assigned yet — order:updated not sent to any driver room`);
//         }

//         // ✅ NAYA (FIX): Address/details update hote hi turant route re-optimize
//         // karo. Isse agar naya address kisi doosri pending delivery se
//         // najdeek/dur ho gaya hai, to queue ka order turant update ho jayega.
//         if (deliveryDriverId) {
//           try {
//             await optimizeDriverRouteAndNotify(deliveryDriverId, io);
//             log("INFO", `✅ Route re-optimized after order address update for driver: ${deliveryDriverId}`);
//           } catch (routeErr) {
//             log("ERR", `Route re-optimization failed after order update (non-fatal): ${routeErr.message}`);
//           }
//         }

//         // ── Admin room ko bhi broadcast ──
//         io.to("admin-room").emit("order:updated", updatePayload);
//         log("EMIT", `order:updated broadcasted to admin-room`);

//         if (typeof callback === 'function') {
//           callback({
//             success: true,
//             message: "Order updated successfully",
//             orderId: order._id.toString(),
//             deliveryLocation: order.deliveryLocation,
//             etaReset: etaWasReset,
//             driverNotified: !!deliveryDriverId,
//           });
//         }

//         log("ADMIN", `admin:order:update completed successfully | orderNumber: ${order.orderNumber}`);

//       } catch (err) {
//         log("ERR", `admin:order:update | ${err.stack}`);
//         if (typeof callback === 'function') {
//           callback({ success: false, message: "Server error while updating order" });
//         }
//       }
//     });

//     // ─────────────────────────────────────────────
//     // STEP 4: DRIVER — driver:location (live tracking)
//     // ─────────────────────────────────────────────
//     socket.on("driver:location", async (data) => {
//       try {
//         const { driverId, journeyId, deliveryId, latitude, longitude, speed, heading, accuracy, timestamp } = data || {};

//         if (!driverId || !latitude || !longitude) {
//           log("WARN", `driver:location — invalid data | socket: ${socket.id}`);
//           return;
//         }

//         log("LOC", `From driver ${driverId} | lat: ${latitude} | lng: ${longitude} | speed: ${speed}`);

//         // DB update (non-blocking)
//         Driver.findByIdAndUpdate(
//           driverId,
//           {
//             "currentLocation.latitude": latitude,
//             "currentLocation.longitude": longitude,
//             "currentLocation.speed": speed || 0,
//             "currentLocation.heading": heading || 0,
//             "currentLocation.accuracy": accuracy || 0,
//             "currentLocation.lastUpdated": new Date(),
//             lastLocationUpdate: new Date(),
//           },
//           { new: false }
//         )
//           .then(() => log("INFO", `DB location saved for driver ${driverId}`))
//           .catch((e) => log("ERR", `DB location save failed | ${e.message}`));

//         const locationPayload = {
//           latitude,
//           longitude,
//           speed: speed || 0,
//           heading: heading || 0,
//           accuracy: accuracy || 0,
//           timestamp: timestamp || new Date().toISOString(),
//           journeyId,
//           deliveryId,
//         };

//         driverLocations.set(driverId, locationPayload);

//         if (activeDrivers.has(driverId)) {
//           const di = activeDrivers.get(driverId);
//           activeDrivers.set(driverId, { ...di, lastSeen: new Date().toISOString() });
//         } else {
//           log("WARN", `driver:location — driverId ${driverId} not in activeDrivers! Call driver:connect first.`);
//         }

//         const driverInfo = activeDrivers.get(driverId);

//         const adminRoomSockets = await io.in("admin-room").allSockets();
//         if (adminRoomSockets.size === 0) {
//           log("WARN", `No clients in admin-room!`);
//         }

//         io.to("admin-room").emit("driver:location:update", {
//           driverId,
//           driverName: driverInfo?.driverName || "Driver",
//           vehicleNumber: driverInfo?.vehicleNumber || "N/A",
//           journeyId,
//           deliveryId,
//           location: locationPayload,
//           isAvailable: false,
//           status: "In_transit",
//           timestamp: new Date().toISOString(),
//         });

//         if (deliveryId) {
//           io.to(`delivery-${deliveryId}`).emit("delivery:location:update", {
//             deliveryId,
//             driverId,
//             location: { latitude, longitude },
//             speed,
//             heading,
//             timestamp: timestamp || new Date().toISOString(),
//           });
//         }

//         if (journeyId) {
//           io.to(`journey-${journeyId}`).emit("journey:location:update", {
//             journeyId,
//             driverId,
//             location: { latitude, longitude, speed, heading, accuracy },
//             timestamp: timestamp || new Date().toISOString(),
//           });
//         }
//       } catch (err) {
//         log("ERR", `driver:location | ${err.stack}`);
//       }
//     });

//     socket.on("driver:journey:location", async (data) => {
//       try {
//         const { driverId, journeyId, deliveryId, latitude, longitude, speed, heading, status } = data || {};
//         if (!driverId || !latitude || !longitude) return;

//         // ✅ FIX: map update missing tha
//         driverLocations.set(driverId, {
//           latitude, longitude, speed: speed || 0, heading: heading || 0,
//           timestamp: new Date().toISOString(), journeyId, deliveryId,
//         });

//         const driverInfo = activeDrivers.get(driverId);
//         io.to("admin-room").emit("driver:location:update", {
//           driverId,
//           driverName: driverInfo?.driverName || "Driver",
//           vehicleNumber: driverInfo?.vehicleNumber || "N/A",
//           journeyId, deliveryId,
//           location: { latitude, longitude, speed: speed || 0, heading: heading || 0 },
//           isAvailable: false,
//           status: status || "In_transit",
//           timestamp: new Date().toISOString(),
//         });
//       } catch (err) {
//         log("ERR", `driver:journey:location | ${err.message}`);
//       }
//     });

//     // ─────────────────────────────────────────────
//     // STEP 5 (FIXED): DRIVER — driver:journey:ended
//     // FIX: DB mein Journey + Delivery status update karo
//     // ─────────────────────────────────────────────

//     // socket.on("driver:journey:ended", async (data, callback) => {
//     //   try {
//     //     const { driverId, journeyId, deliveryId, latitude, longitude, address } = data || {};

//     //     // ── Memory cleanup ──
//     //     if (driverId) {
//     //       driverLocations.delete(driverId);
//     //       if (activeDrivers.has(driverId)) {
//     //         const di = activeDrivers.get(driverId);
//     //         activeDrivers.set(driverId, { ...di, journeyId: null, deliveryId: null });
//     //       }
//     //     }

//     //     log("DRIVER", `Journey ENDED | journeyId: ${journeyId} | driverId: ${driverId}`);

//     //     // ── Journey DB update ──
//     //     let journeyDoc = null;
//     //     if (journeyId) {
//     //       const now = new Date();

//     //       journeyDoc = await Journey.findById(journeyId);
//     //       if (journeyDoc) {
//     //         const actualMinutes = journeyDoc.startTime
//     //           ? Math.round((now - new Date(journeyDoc.startTime)) / 60000)
//     //           : null;

//     //         journeyDoc.status = "Completed";
//     //         journeyDoc.endTime = now;
//     //         journeyDoc.totalDuration = actualMinutes;
//     //         if (latitude && longitude) {
//     //           journeyDoc.endLocation = {
//     //             coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
//     //             address: address || "Journey ended",
//     //           };
//     //         }
//     //         await journeyDoc.save();

//     //         log("INFO", `Journey updated | journeyId: ${journeyId} | duration: ${actualMinutes} mins`);
//     //       }
//     //     }

//     //     // ── Delivery DB update + Order update ──
//     //     // let deliveryDoc = null;
//     //     // let companyName = 'N/A';
//     //     // let deliveryAddress = 'N/A';

//     //     // if (deliveryId) {
//     //     //   try {
//     //     //     deliveryDoc = await Delivery.findByIdAndUpdate(
//     //     //       deliveryId,
//     //     //       { status: "delivered", actualDeliveryTime: new Date() },
//     //     //       { new: true }
//     //     //     ).populate({ path: 'customerId', select: 'companyName name locations' });

//     //     //     log("INFO", `Delivery marked delivered | deliveryId: ${deliveryId}`);

//     //     //     // ── Customer info extract ──
//     //     //     const customer = deliveryDoc?.customerId;
//     //     //     if (customer) {
//     //     //       companyName = customer.companyName || customer.name || 'N/A';
//     //     //       if (customer.locations?.length > 0) {
//     //     //         const loc = customer.locations.find(l => l.isPrimary) || customer.locations[0];
//     //     //         deliveryAddress = [
//     //     //           loc.addressLine1, loc.addressLine2,
//     //     //           loc.city, loc.state,
//     //     //           loc.zipcode, loc.country
//     //     //         ].filter(Boolean).join(', ') || 'N/A';
//     //     //       }
//     //     //     }

//     //     //     // ── Order update ──
//     //     //     if (deliveryDoc?.orderId) {
//     //     //       const orderQuery = mongoose.Types.ObjectId.isValid(deliveryDoc.orderId)
//     //     //         ? { _id: deliveryDoc.orderId }
//     //     //         : { orderNumber: deliveryDoc.orderId };

//     //     //       const updatedOrder = await Order.findOneAndUpdate(
//     //     //         orderQuery,
//     //     //         { status: "delivered", updatedAt: new Date() },
//     //     //         { new: true }
//     //     //       );

//     //     //       if (updatedOrder) {
//     //     //         log("INFO", `Order marked delivered | orderNumber: ${updatedOrder.orderNumber}`);
//     //     //       } else {
//     //     //         log("WARN", `Order NOT found | orderId: ${deliveryDoc.orderId}`);
//     //     //       }
//     //     //     }

//     //     //     // ── DeliveryStatusHistory ──
//     //     //     await DeliveryStatusHistory.create({
//     //     //       deliveryId,
//     //     //       status: "delivered",
//     //     //       location: latitude && longitude ? {
//     //     //         coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
//     //     //         address: address || "Delivery location",
//     //     //       } : undefined,
//     //     //       remarks: "Journey ended by driver via socket",
//     //     //       updatedBy: {
//     //     //         userId: driverId,
//     //     //         userRole: "driver",
//     //     //         userName: activeDrivers.get(driverId)?.driverName || "Driver",
//     //     //       },
//     //     //     }).catch(e => log("ERR", `DeliveryStatusHistory failed | ${e.message}`));

//     //     //   } catch (dbErr) {
//     //     //     log("ERR", `Delivery/Order DB update failed | ${dbErr.message}`);
//     //     //   }
//     //     // }



//     //     // ── Driver available mark karo ──
//     //     if (driverId) {
//     //       await Driver.findByIdAndUpdate(
//     //         driverId,
//     //         {
//     //           isAvailable: true,
//     //           currentJourney: null,
//     //           activeDelivery: null,
//     //           "currentLocation.latitude": null,
//     //           "currentLocation.longitude": null,
//     //           "currentLocation.lastUpdated": null,
//     //         },
//     //         { new: false }
//     //       ).catch(e => log("ERR", `Driver update failed | ${e.message}`));

//     //       log("INFO", `Driver ${driverId} marked available`);
//     //     }

//     //     // ── Timing calculate karo (same as completeDelivery API) ──
//     //     const now = new Date();
//     //     const actualMinutes = journeyDoc?.startTime
//     //       ? Math.round((now - new Date(journeyDoc.startTime)) / 60000)
//     //       : null;
//     //     const estimatedMin = journeyDoc?.estimatedDurationFromGoogle || null;

//     //     let timeDifferenceText = 'N/A';
//     //     if (estimatedMin !== null && actualMinutes !== null) {
//     //       const diff = actualMinutes - estimatedMin;
//     //       timeDifferenceText = diff > 5
//     //         ? `Delayed by ${diff} mins`
//     //         : diff < -5
//     //           ? `Ahead by ${Math.abs(diff)} mins`
//     //           : 'On time';
//     //     }

//     //     const arrivalTime = now.toLocaleString('en-IN', {
//     //       timeZone: 'Asia/Kolkata',
//     //       dateStyle: 'medium',
//     //       timeStyle: 'short',
//     //     });

//     //     // ── Admin broadcast ──
//     //     io.to("admin-room").emit("driver:journey:ended", {
//     //       driverId,
//     //       journeyId,
//     //       deliveryId,
//     //       location: latitude && longitude ? { latitude, longitude, address } : null,
//     //       status: "Completed",
//     //       timestamp: now.toISOString(),
//     //     });

//     //     // ── ACK callback — completeDelivery API jaisa full response ──
//     //     if (typeof callback === 'function') {
//     //       callback({
//     //         success: true,
//     //         message: "Journey ended successfully",
//     //         journeyId,
//     //         deliveryId,
//     //         journeyStatus: "Completed",
//     //         deliveryStatus: "delivered",
//     //         location: { latitude, longitude },
//     //         customer: {
//     //           companyName,
//     //           deliveryAddress,
//     //           customerId: deliveryDoc?.customerId?._id || null,
//     //         },
//     //         arrivalTime,
//     //         arrivalTimeISO: now.toISOString(),
//     //         timing: {
//     //           actualTimeTaken: actualMinutes !== null ? `${actualMinutes} mins` : 'N/A',
//     //           estimatedTime: estimatedMin ? `${estimatedMin} mins` : 'N/A',
//     //           difference: timeDifferenceText,
//     //           startTime: journeyDoc?.startTime?.toISOString() || null,
//     //           arrivedAt: now.toISOString(),
//     //         },
//     //       });
//     //     }

//     //   } catch (err) {
//     //     log("ERR", `driver:journey:ended | ${err.message}`);
//     //     if (typeof callback === 'function') {
//     //       callback({ success: false, message: "Server error while ending journey" });
//     //     }
//     //   }
//     // });

//     // socket.on("driver:journey:ended", async (data, callback) => {
//     //   try {
//     //     const { driverId, journeyId, deliveryId, latitude, longitude, address } = data || {};

//     //     // ── Memory cleanup ──
//     //     if (driverId) {
//     //       driverLocations.delete(driverId);
//     //       if (activeDrivers.has(driverId)) {
//     //         const di = activeDrivers.get(driverId);
//     //         activeDrivers.set(driverId, { ...di, journeyId: null, deliveryId: null });
//     //       }
//     //     }

//     //     log("DRIVER", `Journey ENDED | journeyId: ${journeyId} | driverId: ${driverId}`);

//     //     // ── Journey DB update ──
//     //     let journeyDoc = null;
//     //     if (journeyId) {
//     //       const now = new Date();

//     //       journeyDoc = await Journey.findById(journeyId);
//     //       if (journeyDoc) {
//     //         const actualMinutes = journeyDoc.startTime
//     //           ? Math.round((now - new Date(journeyDoc.startTime)) / 60000)
//     //           : null;

//     //         journeyDoc.status = "Completed";
//     //         journeyDoc.endTime = now;
//     //         journeyDoc.totalDuration = actualMinutes;
//     //         if (latitude && longitude) {
//     //           journeyDoc.endLocation = {
//     //             coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
//     //             address: address || "Journey ended",
//     //           };
//     //         }
//     //         await journeyDoc.save();

//     //         log("INFO", `Journey updated | journeyId: ${journeyId} | duration: ${actualMinutes} mins`);
//     //       } else {
//     //         log("WARN", `Journey not found in DB | journeyId: ${journeyId}`);
//     //       }
//     //     }

//     //     // ── Delivery DB update + Order update ──
//     //     let deliveryDoc = null;
//     //     let companyName = 'N/A';
//     //     let deliveryAddress = 'N/A';
//     //     let customerId = null;

//     //     if (deliveryId) {
//     //       try {
//     //         // ✅ Step 1: pehle update karo
//     //         await Delivery.findByIdAndUpdate(
//     //           deliveryId,
//     //           { status: "delivered", actualDeliveryTime: new Date() },
//     //           { new: false }
//     //         );

//     //         // ✅ Step 2: alag query se populate karo — findByIdAndUpdate ke saath populate reliable nahi
//     //         deliveryDoc = await Delivery.findById(deliveryId)
//     //           .populate({ path: 'customerId', select: 'companyName name locations' });

//     //         log("INFO", `Delivery marked delivered | deliveryId: ${deliveryId}`);
//     //         log("INFO", `customerId raw: ${JSON.stringify(deliveryDoc?.customerId)}`);

//     //         // ── Customer info extract ──
//     //         const customer = deliveryDoc?.customerId;
//     //         if (customer) {
//     //           customerId = customer._id?.toString() || null;
//     //           companyName = customer.companyName || customer.name || 'N/A';
//     //           log("INFO", `Customer found | companyName: ${companyName} | customerId: ${customerId}`);

//     //           if (customer.locations?.length > 0) {
//     //             const loc = customer.locations.find(l => l.isPrimary) || customer.locations[0];
//     //             deliveryAddress = [
//     //               loc.addressLine1,
//     //               loc.addressLine2,
//     //               loc.city,
//     //               loc.state,
//     //               loc.zipcode,
//     //               loc.country
//     //             ].filter(Boolean).join(', ') || 'N/A';
//     //           } else {
//     //             // fallback — delivery model ka deliveryLocation use karo
//     //             deliveryAddress = deliveryDoc?.deliveryLocation?.address || 'N/A';
//     //             log("WARN", `Customer locations empty, fallback address: ${deliveryAddress}`);
//     //           }
//     //         } else {
//     //           // customer populate nahi hua — delivery address fallback
//     //           deliveryAddress = deliveryDoc?.deliveryLocation?.address || 'N/A';
//     //           log("WARN", `customerId null after populate | deliveryId: ${deliveryId}`);
//     //         }

//     //         // ── Order update ──
//     //         if (deliveryDoc?.orderId) {
//     //           const orderQuery = mongoose.Types.ObjectId.isValid(deliveryDoc.orderId)
//     //             ? { _id: deliveryDoc.orderId }
//     //             : { orderNumber: deliveryDoc.orderId };

//     //           const updatedOrder = await Order.findOneAndUpdate(
//     //             orderQuery,
//     //             { status: "delivered", updatedAt: new Date() },
//     //             { new: true }
//     //           );

//     //           if (updatedOrder) {
//     //             log("INFO", `Order marked delivered | orderNumber: ${updatedOrder.orderNumber}`);
//     //           } else {
//     //             log("WARN", `Order NOT found | orderId: ${deliveryDoc.orderId}`);
//     //           }
//     //         } else {
//     //           log("WARN", `Delivery has no orderId | deliveryId: ${deliveryId}`);
//     //         }

//     //         // ── DeliveryStatusHistory ──
//     //         await DeliveryStatusHistory.create({
//     //           deliveryId,
//     //           status: "delivered",
//     //           location: latitude && longitude ? {
//     //             coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
//     //             address: address || "Delivery location",
//     //           } : undefined,
//     //           remarks: "Journey ended by driver via socket",
//     //           updatedBy: {
//     //             userId: driverId,
//     //             userRole: "driver",
//     //             userName: activeDrivers.get(driverId)?.driverName || "Driver",
//     //           },
//     //         }).catch(e => log("ERR", `DeliveryStatusHistory failed | ${e.message}`));

//     //       } catch (dbErr) {
//     //         log("ERR", `Delivery/Order DB update failed | ${dbErr.message}`);
//     //       }
//     //     }

//     //     // ── Driver available mark karo ──
//     //     if (driverId) {
//     //       await Driver.findByIdAndUpdate(
//     //         driverId,
//     //         {
//     //           isAvailable: true,
//     //           currentJourney: null,
//     //           activeDelivery: null,
//     //           "currentLocation.latitude": null,
//     //           "currentLocation.longitude": null,
//     //           "currentLocation.lastUpdated": null,
//     //         },
//     //         { new: false }
//     //       ).catch(e => log("ERR", `Driver update failed | ${e.message}`));

//     //       log("INFO", `Driver ${driverId} marked available`);
//     //     }

//     //     // ── Timing calculate ──
//     //     const now = new Date();
//     //     const actualMinutes = journeyDoc?.startTime
//     //       ? Math.round((now - new Date(journeyDoc.startTime)) / 60000)
//     //       : null;
//     //     const estimatedMin = journeyDoc?.estimatedDurationFromGoogle || null;

//     //     let timeDifferenceText = 'N/A';
//     //     if (estimatedMin !== null && actualMinutes !== null) {
//     //       const diff = actualMinutes - estimatedMin;
//     //       timeDifferenceText = diff > 5
//     //         ? `Delayed by ${diff} mins`
//     //         : diff < -5
//     //           ? `Ahead by ${Math.abs(diff)} mins`
//     //           : 'On time';
//     //     }

//     //     const arrivalTime = now.toLocaleString('en-IN', {
//     //       timeZone: 'Asia/Kolkata',
//     //       dateStyle: 'medium',
//     //       timeStyle: 'short',
//     //     });

//     //     // ── Admin broadcast ──
//     //     io.to("admin-room").emit("driver:journey:ended", {
//     //       driverId,
//     //       journeyId,
//     //       deliveryId,
//     //       location: latitude && longitude ? { latitude, longitude, address } : null,
//     //       status: "Completed",
//     //       timestamp: now.toISOString(),
//     //     });

//     //     log("EMIT", `driver:journey:ended emitted to admin-room | driverId: ${driverId}`);

//     //     // ── ACK callback ──
//     //     if (typeof callback === 'function') {
//     //       callback({
//     //         success: true,
//     //         message: "Journey ended successfully",
//     //         journeyId,
//     //         deliveryId,
//     //         journeyStatus: "Completed",
//     //         deliveryStatus: "delivered",
//     //         location: { latitude, longitude },
//     //         customer: {
//     //           customerId,
//     //           companyName,
//     //           deliveryAddress,
//     //         },
//     //         arrivalTime,
//     //         arrivalTimeISO: now.toISOString(),
//     //         timing: {
//     //           actualTimeTaken: actualMinutes !== null ? `${actualMinutes} mins` : 'N/A',
//     //           estimatedTime: estimatedMin ? `${estimatedMin} mins` : 'N/A',
//     //           difference: timeDifferenceText,
//     //           startTime: journeyDoc?.startTime?.toISOString() || null,
//     //           arrivedAt: now.toISOString(),
//     //         },
//     //       });
//     //     }

//     //   } catch (err) {
//     //     log("ERR", `driver:journey:ended | ${err.message}`);
//     //     if (typeof callback === 'function') {
//     //       callback({ success: false, message: "Server error while ending journey" });
//     //     }
//     //   }
//     // });


//     socket.on("driver:journey:ended", async (data, callback) => {
//       try {
//         const { driverId, journeyId, deliveryId } = data || {};

//         // ── Sirf memory cleanup — marker remove ──
//         if (driverId) {
//           driverLocations.delete(driverId);
//           if (activeDrivers.has(driverId)) {
//             const di = activeDrivers.get(driverId);
//             activeDrivers.set(driverId, { ...di, journeyId: null, deliveryId: null });
//           }
//         }

//         log("DRIVER", `Journey ENDED (marker removed) | journeyId: ${journeyId} | driverId: ${driverId}`);

//         // ── Admin ko broadcast — marker remove karo ──
//         io.to("admin-room").emit("driver:journey:ended", {
//           driverId,
//           journeyId,
//           deliveryId,
//           status: "Completed",
//           timestamp: new Date().toISOString(),
//         });

//         // ── Driver offline bhi bhejo — map se marker hatane ke liye ──
//         io.to("admin-room").emit("driver:offline", {
//           driverId,
//           status: "offline",
//           timestamp: new Date().toISOString(),
//         });

//         log("EMIT", `Marker removed for driverId: ${driverId}`);

//         // ── ACK ──
//         if (typeof callback === 'function') {
//           callback({ success: true, message: "Journey ended, marker removed" });
//         }

//       } catch (err) {
//         log("ERR", `driver:journey:ended | ${err.message}`);
//         if (typeof callback === 'function') {
//           callback({ success: false, message: "Server error" });
//         }
//       }
//     });


//     // ─────────────────────────────────────────────
//     // STEP 6 (FIXED): DRIVER — delivery:completed
//     // FIX: DB update + driverId String normalize
//     // ─────────────────────────────────────────────
//     // socket.on("delivery:completed", async (data) => {
//     //   try {
//     //     log("DRIVER", `Delivery COMPLETED | data: ${JSON.stringify(data)}`);

//     //     const { driverId, deliveryId, journeyId, latitude, longitude, address } = data || {};

//     //     if (!driverId) {
//     //       log("WARN", `delivery:completed — driverId missing`);
//     //       return;
//     //     }

//     //     // ── Memory cleanup ──
//     //     driverLocations.delete(driverId);
//     //     if (activeDrivers.has(driverId)) {
//     //       const di = activeDrivers.get(driverId);
//     //       activeDrivers.set(driverId, { ...di, journeyId: null, deliveryId: null });
//     //     }

//     //     // ── FIX: Journey status update ──
//     //     if (journeyId) {
//     //       try {
//     //         await Journey.findByIdAndUpdate(
//     //           journeyId,
//     //           {
//     //             status: "completed",
//     //             endTime: new Date(),
//     //             ...(latitude && longitude && {
//     //               endLocation: {
//     //                 coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
//     //                 address: address || "Delivery completed",
//     //               },
//     //             }),
//     //           },
//     //           { new: false }
//     //         );
//     //         log("INFO", `Journey completed in DB | journeyId: ${journeyId}`);
//     //       } catch (dbErr) {
//     //         log("ERR", `Journey DB update failed | ${dbErr.message}`);
//     //       }
//     //     }

//     //     // ── FIX: Delivery status update ──
//     //     if (deliveryId) {
//     //       try {
//     //         await Delivery.findByIdAndUpdate(
//     //           deliveryId,
//     //           { status: "delivered", actualDeliveryTime: new Date() },
//     //           { new: false }
//     //         );

//     //         await DeliveryStatusHistory.create({
//     //           deliveryId,
//     //           status: "delivered",
//     //           location: latitude && longitude ? {
//     //             coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
//     //             address: address || "Delivery location",
//     //           } : undefined,
//     //           remarks: "Delivery completed by driver via socket",
//     //           updatedBy: {
//     //             userId: driverId,
//     //             userRole: "driver",
//     //             userName: activeDrivers.get(driverId)?.driverName || "Driver",
//     //           },
//     //         });

//     //         log("INFO", `Delivery marked delivered in DB | deliveryId: ${deliveryId}`);
//     //       } catch (dbErr) {
//     //         log("ERR", `Delivery DB update failed | ${dbErr.message}`);
//     //       }
//     //     }

//     //     // ── Driver DB update ──
//     //     await Driver.findByIdAndUpdate(
//     //       driverId,
//     //       {
//     //         isAvailable: true,
//     //         currentJourney: null,
//     //         "currentLocation.latitude": null,
//     //         "currentLocation.longitude": null,
//     //         "currentLocation.lastUpdated": null,
//     //       },
//     //       { new: false }
//     //     ).catch((e) => log("ERR", `Driver update failed | ${e.message}`));

//     //     log("INFO", `Driver ${driverId} marked available in DB`);

//     //     // ── FIX: driverId clearly String mein bhejo admin ko ──
//     //     io.to("admin-room").emit("driver:delivery:completed", {
//     //       driverId: String(driverId),
//     //       deliveryId: String(deliveryId || ""),
//     //       journeyId: String(journeyId || ""),
//     //       status: "completed",
//     //       timestamp: new Date().toISOString(),
//     //     });

//     //     log("EMIT", `driver:delivery:completed emitted | driverId: ${driverId}`);

//     //   } catch (err) {
//     //     log("ERR", `delivery:completed | ${err.stack}`);
//     //   }
//     // });



//     socket.on("delivery:completed", async (data) => {
//       try {
//         log("DRIVER", `Delivery COMPLETED | data: ${JSON.stringify(data)}`);

//         const { driverId, deliveryId, journeyId, latitude, longitude, address } = data || {};

//         if (!driverId) {
//           log("WARN", `delivery:completed — driverId missing`);
//           return;
//         }

//         // ── Memory cleanup ──
//         driverLocations.delete(driverId);
//         if (activeDrivers.has(driverId)) {
//           const di = activeDrivers.get(driverId);
//           activeDrivers.set(driverId, { ...di, journeyId: null, deliveryId: null });
//         }

//         // ── Journey status update ──
//         if (journeyId) {
//           try {
//             await Journey.findByIdAndUpdate(
//               journeyId,
//               {
//                 status: "completed",
//                 endTime: new Date(),
//                 ...(latitude && longitude && {
//                   endLocation: {
//                     coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
//                     address: address || "Delivery completed",
//                   },
//                 }),
//               },
//               { new: false }
//             );
//             log("INFO", `Journey completed in DB | journeyId: ${journeyId}`);
//           } catch (dbErr) {
//             log("ERR", `Journey DB update failed | ${dbErr.message}`);
//           }
//         }

//         // ── Delivery status update ──
//         let completedDelivery = null;
//         if (deliveryId) {
//           try {
//             completedDelivery = await Delivery.findByIdAndUpdate(
//               deliveryId,
//               { status: "delivered", actualDeliveryTime: new Date() },
//               { new: true }
//             );

//             await DeliveryStatusHistory.create({
//               deliveryId,
//               status: "delivered",
//               location: latitude && longitude ? {
//                 coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
//                 address: address || "Delivery location",
//               } : undefined,
//               remarks: "Delivery completed by driver via socket",
//               updatedBy: {
//                 userId: driverId,
//                 userRole: "driver",
//                 userName: activeDrivers.get(driverId)?.driverName || "Driver",
//               },
//             });

//             log("INFO", `Delivery marked delivered in DB | deliveryId: ${deliveryId}`);
//           } catch (dbErr) {
//             log("ERR", `Delivery DB update failed | ${dbErr.message}`);
//           }
//         }

//         // ── Driver DB update: available mark karo + current location update ──
//         // ✅ NAYA: currentLocation ko is completed delivery ke destination pe set karo
//         // (agar app ne latitude/longitude bheja hai to wahi use karo, warna
//         //  completed delivery ke deliveryLocation coordinates use karo)
//         const finalLat = latitude || completedDelivery?.deliveryLocation?.coordinates?.latitude;
//         const finalLng = longitude || completedDelivery?.deliveryLocation?.coordinates?.longitude;

//         await Driver.findByIdAndUpdate(
//           driverId,
//           {
//             isAvailable: true,
//             currentJourney: null,
//             ...(finalLat && finalLng && {
//               "currentLocation.latitude": finalLat,
//               "currentLocation.longitude": finalLng,
//               "currentLocation.lastUpdated": new Date(),
//             }),
//           },
//           { new: false }
//         ).catch((e) => log("ERR", `Driver update failed | ${e.message}`));

//         log("INFO", `Driver ${driverId} marked available | new location: ${finalLat}, ${finalLng}`);

//         // ── Admin broadcast ──
//         io.to("admin-room").emit("driver:delivery:completed", {
//           driverId: String(driverId),
//           deliveryId: String(deliveryId || ""),
//           journeyId: String(journeyId || ""),
//           status: "completed",
//           timestamp: new Date().toISOString(),
//         });

//         log("EMIT", `driver:delivery:completed emitted | driverId: ${driverId}`);

//         // ✅ NAYA: Baaki bachi hui deliveries ka route turant re-optimize karo
//         // Driver ka naya current point (jaha abhi delivery complete hui) se
//         // najdeeki wali delivery automatically agli ban jayegi
//         try {
//           const orderController = require('../controllers/admin/orderController');
//           await orderController._optimizeDriverRouteAndNotify(driverId, io);
//           log("INFO", `✅ Route re-optimized after delivery completion for driver: ${driverId}`);
//         } catch (routeErr) {
//           log("ERR", `Route re-optimization failed (non-fatal): ${routeErr.message}`);
//         }

//       } catch (err) {
//         log("ERR", `delivery:completed | ${err.stack}`);
//       }
//     });



// async function getWarehouseLocation() {
//   try {
//     const defaultPickup = await PickupLocation.findOne({ isDefault: true, isActive: true });
//     if (defaultPickup?.coordinates?.latitude && defaultPickup?.coordinates?.longitude) {
//       return {
//         latitude: defaultPickup.coordinates.latitude,
//         longitude: defaultPickup.coordinates.longitude,
//         address: defaultPickup.name || defaultPickup.address || 'Warehouse'
//       };
//     }

//     const anyPickup = await PickupLocation.findOne({ isActive: true }).sort({ createdAt: 1 });
//     if (anyPickup?.coordinates?.latitude && anyPickup?.coordinates?.longitude) {
//       log("WARN", `Koi default PickupLocation nahi mila - "${anyPickup.name}" ko warehouse maan rahe hain`);
//       return {
//         latitude: anyPickup.coordinates.latitude,
//         longitude: anyPickup.coordinates.longitude,
//         address: anyPickup.name || anyPickup.address || 'Warehouse'
//       };
//     }

//     log("WARN", `DB me koi bhi PickupLocation nahi hai - admin panel se ek pickup location add karo`);
//     return null;

//   } catch (err) {
//     log("ERR", `getWarehouseLocation error: ${err.message}`);
//     return null;
//   }
// }

// async function optimizeDriverRouteAndNotify(driverId, io) {
//   try {
//     const activeDelivery = await Delivery.findOne({
//       driverId,
//       status: 'In_transit'
//     }).select('deliveryLocation _id');

//     const pendingDeliveries = await Delivery.find({
//       driverId,
//       status: { $in: ['assigned', 'ready_for_pickup'] }
//     }).sort({ createdAt: 1 });

//     if (pendingDeliveries.length === 0) {
//       log("INFO", `[ROUTE-OPT] Driver ${driverId} ke paas koi pending delivery nahi hai`);
//       return;
//     }

//     let startPoint;

//     if (activeDelivery?.deliveryLocation?.coordinates?.latitude) {
//       startPoint = {
//         latitude: activeDelivery.deliveryLocation.coordinates.latitude,
//         longitude: activeDelivery.deliveryLocation.coordinates.longitude,
//         address: activeDelivery.deliveryLocation.address || 'Next stop after current delivery'
//       };
//       log("INFO", `[ROUTE-OPT] Active delivery (${activeDelivery._id}) ke destination ko reference point banaya`);
//     } else {
//       const driver = await Driver.findById(driverId).select('currentLocation');

//       if (driver?.currentLocation?.latitude && driver?.currentLocation?.longitude) {
//         startPoint = {
//           latitude: driver.currentLocation.latitude,
//           longitude: driver.currentLocation.longitude,
//           address: 'Current Location'
//         };
//         log("INFO", `[ROUTE-OPT] Driver ki live location use ki`);
//       } else {
//         startPoint = await getWarehouseLocation();
//         if (!startPoint) {
//           log("WARN", `[ROUTE-OPT] Koi reference point nahi mila - route optimization skip`);
//           return;
//         }
//         log("INFO", `[ROUTE-OPT] Dynamic warehouse location use kiya:`, startPoint);
//       }
//     }

//     const optimizedOrder = optimizeRoute(startPoint, pendingDeliveries);

//     log("INFO", `[ROUTE-OPT] Optimized queue: ${JSON.stringify(optimizedOrder.map(d => ({
//       id: d._id, seq: d.routeSequence, distance: d.distanceFromPrevious + ' km'
//     })))}`);

//     for (const item of optimizedOrder) {
//       await Delivery.findByIdAndUpdate(item._id, {
//         routeSequence: item.routeSequence,
//         distanceFromPrevious: item.distanceFromPrevious,
//         effectivePickupLocation: item.effectivePickupLocation
//       });
//     }

//     if (io) {
//       const driverRoom = `driver-${driverId.toString()}`;
//       io.to(driverRoom).emit('route:optimized', {
//         driverId: driverId.toString(),
//         activeDeliveryId: activeDelivery?._id?.toString() || null,
//         totalStops: optimizedOrder.length,
//         route: optimizedOrder.map(d => ({
//           deliveryId: d._id,
//           sequence: d.routeSequence,
//           distanceFromPrevious: d.distanceFromPrevious,
//           pickupFrom: d.effectivePickupLocation,
//           deliverTo: d.deliveryLocation,
//         })),
//         timestamp: new Date().toISOString(),
//       });
//       log("EMIT", `[ROUTE-OPT] route:optimized emitted to room: ${driverRoom}`);
//     }

//   } catch (err) {
//     log("ERR", `[ROUTE-OPT] Error: ${err.message}`);
//     console.error(err.stack);
//   }
// }

//     /**
//      * Driver ki saari pending deliveries ko nearest-neighbor order me
//      * reorder karta hai. Active (In_transit) delivery ko kabhi touch nahi
//      * karta - uske DESTINATION ko reference point banake baaki queue
//      * reorder karta hai.
//      */
//     async function optimizeDriverRouteAndNotify(driverId, io) {
//       try {
//         const activeDelivery = await Delivery.findOne({
//           driverId,
//           status: 'In_transit'
//         }).select('deliveryLocation _id');

//         const pendingDeliveries = await Delivery.find({
//           driverId,
//           status: { $in: ['assigned', 'ready_for_pickup'] }
//         }).sort({ createdAt: 1 });

//         if (pendingDeliveries.length === 0) {
//           log("INFO", `[ROUTE-OPT] Driver ${driverId} ke paas koi pending delivery nahi hai`);
//           return;
//         }

//         let startPoint;

//         if (activeDelivery?.deliveryLocation?.coordinates?.latitude) {
//           startPoint = {
//             latitude: activeDelivery.deliveryLocation.coordinates.latitude,
//             longitude: activeDelivery.deliveryLocation.coordinates.longitude,
//             address: activeDelivery.deliveryLocation.address || 'Next stop after current delivery'
//           };
//           log("INFO", `[ROUTE-OPT] Active delivery (${activeDelivery._id}) ke destination ko reference point banaya`);
//         } else {
//           const driver = await Driver.findById(driverId).select('currentLocation');

//           if (driver?.currentLocation?.latitude && driver?.currentLocation?.longitude) {
//             startPoint = {
//               latitude: driver.currentLocation.latitude,
//               longitude: driver.currentLocation.longitude,
//               address: 'Current Location'
//             };
//             log("INFO", `[ROUTE-OPT] Driver ki live location use ki`);
//           } else {
//             // FIX: ab fully dynamic - DB se hi warehouse location lega
//             startPoint = await getWarehouseLocation();
//             if (!startPoint) {
//               log("WARN", `[ROUTE-OPT] Koi reference point nahi mila (driver location bhi nahi, warehouse bhi nahi) - route optimization skip`);
//               return;
//             }
//             log("INFO", `[ROUTE-OPT] Dynamic warehouse location use kiya:`, startPoint);
//           }
//         }

//         const optimizedOrder = optimizeRoute(startPoint, pendingDeliveries);

//         log("INFO", `[ROUTE-OPT] Optimized queue: ${JSON.stringify(optimizedOrder.map(d => ({
//           id: d._id, seq: d.routeSequence, distance: d.distanceFromPrevious + ' km'
//         })))}`);

//         for (const item of optimizedOrder) {
//           await Delivery.findByIdAndUpdate(item._id, {
//             routeSequence: item.routeSequence,
//             distanceFromPrevious: item.distanceFromPrevious,
//             effectivePickupLocation: item.effectivePickupLocation
//           });
//         }

//         if (io) {
//           const driverRoom = `driver-${driverId.toString()}`;
//           io.to(driverRoom).emit('route:optimized', {
//             driverId: driverId.toString(),
//             activeDeliveryId: activeDelivery?._id?.toString() || null,
//             totalStops: optimizedOrder.length,
//             route: optimizedOrder.map(d => ({
//               deliveryId: d._id,
//               sequence: d.routeSequence,
//               distanceFromPrevious: d.distanceFromPrevious,
//               pickupFrom: d.effectivePickupLocation,
//               deliverTo: d.deliveryLocation,
//             })),
//             timestamp: new Date().toISOString(),
//           });
//           log("EMIT", `[ROUTE-OPT] route:optimized emitted to room: ${driverRoom}`);
//         }

//       } catch (err) {
//         log("ERR", `[ROUTE-OPT] Error: ${err.message}`);
//         console.error(err.stack);
//       }
//     }


//     // ─────────────────────────────────────────────
//     // JOURNEY: Room join/leave
//     // ─────────────────────────────────────────────
//     socket.on("join-journey", (journeyId) => {
//       socket.join(`journey-${journeyId}`);
//       log("INFO", `Client joined journey-${journeyId}`);
//     });

//     socket.on("leave-journey", (journeyId) => {
//       socket.leave(`journey-${journeyId}`);
//     });

//     // DELIVERY: Room join/leave
//     socket.on("join-delivery", (deliveryId) => {
//       socket.join(`delivery-${deliveryId}`);
//     });

//     socket.on("leave-delivery", (deliveryId) => {
//       socket.leave(`delivery-${deliveryId}`);
//     });

//     // driver:journey:arrived
//     socket.on("driver:journey:arrived", (data) => {
//       const { journeyId, deliveryId, location, status, driverId } = data || {};
//       log("DRIVER", `Journey ARRIVED | journeyId: ${journeyId}`);
//       io.to("admin-room").emit("driver:journey:arrived", {
//         driverId,
//         journeyId,
//         deliveryId,
//         location,
//         status: status || "Arrived",
//         timestamp: new Date().toISOString(),
//       });
//     });

//     // driver:journey:location (alternative location event)
//     socket.on("driver:journey:location", async (data) => {
//       try {
//         const { driverId, journeyId, deliveryId, latitude, longitude, speed, heading, status } = data || {};
//         if (!driverId || !latitude || !longitude) return;

//         const driverInfo = activeDrivers.get(driverId);
//         io.to("admin-room").emit("driver:location:update", {
//           driverId,
//           driverName: driverInfo?.driverName || "Driver",
//           vehicleNumber: driverInfo?.vehicleNumber || "N/A",
//           journeyId,
//           deliveryId,
//           location: { latitude, longitude, speed: speed || 0, heading: heading || 0 },
//           isAvailable: false,
//           status: status || "In_transit",
//           timestamp: new Date().toISOString(),
//         });
//       } catch (err) {
//         log("ERR", `driver:journey:location | ${err.message}`);
//       }
//     });

//     // CHAT
//     socket.on("chat:join", (data) => {
//       socket.join(`user-${data?.userId}`);
//     });

//     socket.on("chat:join-conversation", (data) => {
//       socket.join(`conversation-${data?.conversationId}`);
//     });

//     socket.on("chat:typing", (data) => {
//       const { conversationId, userId, isTyping } = data || {};
//       socket.to(`conversation-${conversationId}`).emit("chat:typing", { userId, isTyping });
//     });

//     // NOTIFICATIONS
//     socket.on("notifications:subscribe", (data) => {
//       socket.join(`notifications-${data?.userId}`);
//     });

//     // MAINTENANCE
//     socket.on("driver-completed-service", async ({ scheduleId, driverName, vehicleNumber } = {}) => {
//       try {
//         const MaintenanceSchedule = require("./models/MaintenanceSchedule");
//         const maintenance = await MaintenanceSchedule.findById(scheduleId).populate("vehicle");
//         if (maintenance) {
//           io.to("admin-room").emit("new-service-request", {
//             type: "service_completion_request",
//             message: `${vehicleNumber || "Vehicle"} - Driver "${driverName}" completed service!`,
//             scheduleId,
//             vehicleNumber: vehicleNumber || maintenance.vehicle?.vehicleNumber,
//             driverName,
//             requestedAt: new Date().toISOString(),
//             status: maintenance.status,
//           });
//         }
//       } catch (err) {
//         log("ERR", `maintenance socket | ${err.message}`);
//       }
//     });

//     // PING
//     socket.on("ping:driver", (data) => {
//       socket.emit("pong:driver", { ...data, serverTime: new Date().toISOString() });
//     });

//     // ─────────────────────────────────────────────
//     // DISCONNECT
//     // ─────────────────────────────────────────────
//     socket.on("disconnect", (reason) => {
//       log("SOCKET", `Disconnected | socket: ${socket.id} | reason: ${reason}`);

//       const driverId = socket.driverId;
//       if (driverId && activeDrivers.has(driverId)) {
//         const driver = activeDrivers.get(driverId);
//         activeDrivers.delete(driverId);
//         driverLocations.delete(driverId);

//         log("DRIVER", `Driver OFFLINE | name: ${driver.driverName} | driverId: ${driverId} | total: ${activeDrivers.size}`);

//         // ✅ driverId clearly bhejo
//         io.to("admin-room").emit("driver:offline", {
//           driverId,                       // marker remove ke liye
//           driverName: driver.driverName,
//           vehicleNumber: driver.vehicleNumber,
//           status: "offline",
//           timestamp: new Date().toISOString(),
//         });
//       }
//     });

//     socket.on("connect_error", (err) => {
//       log("ERR", `connect_error | ${err.message}`);
//     });
//   });

//   // Broadcast helper for REST API controllers
//   io.broadcastDriverLocation = async function (driverData, locationData) {
//     const adminSockets = await io.in("admin-room").allSockets();
//     if (adminSockets.size === 0) {
//       log("WARN", `broadcastDriverLocation — nobody in admin-room!`);
//     }

//     io.to("admin-room").emit("driver:location:update", {
//       driverId: driverData.driverId || driverData._id?.toString(),
//       driverName: driverData.driverName || driverData.name || "Driver",
//       vehicleNumber: driverData.vehicleNumber || "N/A",
//       journeyId: driverData.journeyId,
//       deliveryId: driverData.deliveryId,
//       location: locationData,
//       isAvailable: false,
//       status: driverData.status || "In_transit",
//       timestamp: new Date().toISOString(),
//     });
//   };

//   log("INFO", "✅ Socket handlers initialized");
//   return { activeDrivers, driverLocations };
// }

// module.exports = setupSocketHandlers;


const Driver = require("../models/Driver");
const { getSortedUpcomingForDriver } = require("../controllers/Driver/deliveryController");
const Journey = require("../models/Journey");
const Delivery = require("../models/Delivery");
const DeliveryStatusHistory = require("../models/DeliveryStatusHistory");
const Order = require("../models/Order")
const Notification = require("../models/Notification");
const { sendNotification } = require("./sendNotification");
const { calculateDistance } = require("./geoHelper");
const mongoose = require("mongoose")

const activeDrivers = new Map();
const driverLocations = new Map();

const LOG_PREFIX = {
  SOCKET: "🔌 [SOCKET]",
  DRIVER: "🚗 [DRIVER]",
  ADMIN: "👔 [ADMIN]",
  LOC: "📍 [LOCATION]",
  EMIT: "📤 [EMIT]",
  RECV: "📥 [RECV]",
  ERR: "❌ [ERROR]",
  WARN: "⚠️  [WARN]",
  INFO: "ℹ️  [INFO]",
};

function log(type, ...args) {
  console.log(`[${new Date().toISOString()}] ${LOG_PREFIX[type] || type}`, ...args);
}

function setupSocketHandlers(io) {
  io.activeDrivers = activeDrivers;
  io.driverLocations = driverLocations;

  setInterval(() => {
    const connectedSockets = io.engine?.clientsCount || 0;
    log("INFO",
      `Active connections: ${connectedSockets} | ` +
      `Active drivers: ${activeDrivers.size} | ` +
      `Drivers with location: ${driverLocations.size}`
    );
  }, 30000);

  io.on("connection", (socket) => {
    log("SOCKET", `New client connected — socket.id: ${socket.id} | IP: ${socket.handshake.address} | Transport: ${socket.conn.transport.name}`);

    socket.onAny((eventName, ...args) => {
      log("RECV", `socket.id: ${socket.id} | event: "${eventName}" | data: ${JSON.stringify(args[0] || {}).substring(0, 200)}`);
    });

    // ─────────────────────────────────────────────
    // STEP 1: ADMIN — join-admin-room
    // ─────────────────────────────────────────────
    socket.on("join-admin-room", () => {
      socket.join("admin-room");
      log("ADMIN", `Admin joined admin-room | socket.id: ${socket.id}`);

      const driversList = Array.from(activeDrivers.values()).map((d) => ({
        ...d,
        location: driverLocations.get(d.driverId) || null,
      }));

      socket.emit("admin:drivers:list", driversList);
      socket.emit("admin:room:joined", {
        message: "Successfully joined admin-room",
        activeDrivers: driversList.length,
        timestamp: new Date().toISOString(),
      });
    });

    // ─────────────────────────────────────────────
    // STEP 2: DRIVER — driver:connect
    // ─────────────────────────────────────────────
    // socket.on("driver:connect", async (data) => {
    //   try {
    //     const { driverId, driverName, vehicleNumber } = data || {};

    //     if (!driverId) {
    //       log("WARN", `driver:connect — driverId missing | socket: ${socket.id}`);
    //       return;
    //     }

    //     activeDrivers.set(driverId, {
    //       socketId: socket.id,
    //       driverId,
    //       driverName: driverName || "Driver",
    //       vehicleNumber: vehicleNumber || "N/A",
    //       connectedAt: new Date().toISOString(),
    //       isOnline: true,
    //     });

    //     socket.join(`driver-${driverId}`);
    //     socket.driverId = driverId;

    //     log("DRIVER", `Driver ONLINE | name: ${driverName} | socket: ${socket.id} | total: ${activeDrivers.size}`);

    //     io.to("admin-room").emit("driver:online", {
    //       driverId,
    //       driverName,
    //       vehicleNumber,
    //       status: "online",
    //       timestamp: new Date().toISOString(),
    //     });

    //     socket.emit("driver:connect:ack", {
    //       success: true,
    //       message: "Connected to server",
    //       timestamp: new Date().toISOString(),
    //     });
    //   } catch (err) {
    //     log("ERR", `driver:connect | ${err.message}`);
    //   }
    // });

    socket.on("driver:connect", async (data) => {
      try {
        const { driverId, driverName, vehicleNumber } = data || {};
        if (!driverId) return;

        // ✅ FIX: agar isi driverId ka purana socket already connected hai, use disconnect karo
        const existing = activeDrivers.get(driverId);
        if (existing && existing.socketId !== socket.id) {
          const oldSocket = io.sockets.sockets.get(existing.socketId);
          if (oldSocket) {
            log("WARN", `Duplicate connection for driverId ${driverId} — disconnecting old socket ${existing.socketId}`);
            oldSocket.leave(`driver-${driverId}`);
            oldSocket.disconnect(true);
          }
        }

        activeDrivers.set(driverId, {
          socketId: socket.id,
          driverId,
          driverName: driverName || "Driver",
          vehicleNumber: vehicleNumber || "N/A",
          connectedAt: new Date().toISOString(),
          isOnline: true,
        });

        socket.join(`driver-${driverId}`);
        socket.driverId = driverId;

        log("DRIVER", `Driver ONLINE | name: ${driverName} | socket: ${socket.id} | total: ${activeDrivers.size}`);

        io.to("admin-room").emit("driver:online", {
          driverId,
          driverName,
          vehicleNumber,
          status: "online",
          timestamp: new Date().toISOString(),
        });

        socket.emit("driver:connect:ack", {
          success: true,
          message: "Connected to server",
          timestamp: new Date().toISOString(),
        });
      } catch (err) { log("ERR", `driver:connect | ${err.message}`); }
    });

    // ─────────────────────────────────────────────
    // STEP 3: DRIVER — driver:journey:started
    // FIX: Proper ACK callback pattern
    // ─────────────────────────────────────────────

    socket.on("driver:journey:started", async (data, callback) => {
      try {
        const { driverId, deliveryId, address } = data || {};

        const latitude = data?.latitude ?? data?.location?.latitude;
        const longitude = data?.longitude ?? data?.location?.longitude;

        if (!latitude || !longitude) {
          const driverDoc = await Driver.findById(driverId).select('currentLocation');
          if (driverDoc?.currentLocation?.latitude && driverDoc?.currentLocation?.longitude) {
            latitude = driverDoc.currentLocation.latitude;
            longitude = driverDoc.currentLocation.longitude;
            log("WARN", `driver:journey:started — location missing from app, using last known DB location`);
          }
        }

        // ── Validation ──
        if (!driverId || !deliveryId) {
          log("WARN", `driver:journey:started — driverId/deliveryId missing | data: ${JSON.stringify(data)}`);
          if (typeof callback === 'function') {
            callback({ success: false, message: "driverId and deliveryId required" });
          }
          return;
        }

        if (!latitude || !longitude) {
          log("WARN", `driver:journey:started — location missing | received: ${JSON.stringify(data)}`);
          if (typeof callback === 'function') {
            callback({ success: false, message: "latitude and longitude required" });
          }
          return;
        }

        // ── Delivery check ──
        const delivery = await Delivery.findOne({
          _id: deliveryId,
          driverId: driverId,
          status: 'assigned',
        });

        if (!delivery) {
          log("WARN", `driver:journey:started — delivery not found | deliveryId: ${deliveryId}`);
          if (typeof callback === 'function') {
            callback({ success: false, message: "Delivery not found or not assigned to you" });
          }
          return;
        }

        // ── Already started check ──
        const existingJourney = await Journey.findOne({
          deliveryId,
          status: { $in: ['Started', 'In_transit', 'In_progress'] },
        });

        if (existingJourney) {
          log("WARN", `driver:journey:started — journey already exists | journeyId: ${existingJourney._id}`);
          if (typeof callback === 'function') {
            callback({
              success: true,
              journeyId: existingJourney._id.toString(),
              deliveryId,
              status: existingJourney.status,
              message: "Journey already in progress",
            });
          }
          return;
        }

        const locationData = {
          latitude: Number(latitude),
          longitude: Number(longitude),
          address: address || 'GPS Location',
          lastUpdated: new Date(),
        };

        // ── DB mein Journey create karo ──
        const journey = await Journey.create({
          deliveryId,
          driverId: driverId,
          startLocation: {
            coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
            address: address || 'Location captured via GPS',
          },
          startTime: new Date(),
          status: 'In_transit',
        });

        log("DRIVER", `Journey created in DB | journeyId: ${journey._id} | driverId: ${driverId}`);

        // ── Delivery status update ──
        delivery.status = 'In_transit';
        delivery.actualPickupTime = new Date();
        await delivery.save();

        await DeliveryStatusHistory.create({
          deliveryId: delivery._id,
          status: 'In_transit',
          location: {
            coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
            address: address || 'GPS Location',
          },
          remarks: 'Driver started journey via socket',
          updatedBy: {
            userId: driverId,
            userRole: 'driver',
            userName: activeDrivers.get(driverId)?.driverName || 'Driver',
          },
        });

        // ── Driver model update ──
        await Driver.findByIdAndUpdate(driverId, {
          currentJourney: journey._id,
          activeDelivery: delivery._id,
          currentLocation: locationData,
          lastLocationUpdate: new Date(),
        });

        // ── In-memory update ──
        driverLocations.set(driverId, {
          ...locationData,
          journeyId: journey._id.toString(),
          deliveryId,
        });

        if (activeDrivers.has(driverId)) {
          const di = activeDrivers.get(driverId);
          activeDrivers.set(driverId, {
            ...di,
            journeyId: journey._id.toString(),
            deliveryId,
          });
        }

        // ── Admin broadcast ──
        const driverInfo = activeDrivers.get(driverId);

        io.to("admin-room").emit("driver:journey:started", {
          driverId,
          driverName: driverInfo?.driverName || "Driver",
          vehicleNumber: driverInfo?.vehicleNumber || "N/A",
          journeyId: journey._id.toString(),
          deliveryId,
          location: locationData,
          status: "In_transit",
          timestamp: new Date().toISOString(),
        });

        io.to("admin-room").emit("driver:location:update", {
          driverId,
          driverName: driverInfo?.driverName || "Driver",
          vehicleNumber: driverInfo?.vehicleNumber || "N/A",
          journeyId: journey._id.toString(),
          deliveryId,
          location: locationData,
          isAvailable: false,
          status: "In_transit",
          timestamp: new Date().toISOString(),
        });

        log("EMIT", `journey:start:ack sent via callback | journeyId: ${journey._id}`);

        // ✅ Proper ACK callback — event emit nahi, direct callback
        if (typeof callback === 'function') {
          callback({
            success: true,
            journeyId: journey._id.toString(),
            deliveryId,
            status: 'In_transit',
            message: "Journey started successfully",
          });
        }

      } catch (err) {
        log("ERR", `driver:journey:started | ${err.stack}`);
        if (typeof callback === 'function') {
          callback({ success: false, message: "Server error while starting journey" });
        }
      }
    });

    // ─────────────────────────────────────────────
    // ADMIN — admin:order:update
    // Pura socket-driven order update. Driver ko turant address +
    // ETA reset + notification — sab ek hi event me milta hai.
    // ─────────────────────────────────────────────
    socket.on("admin:order:update", async (data, callback) => {
      try {
        const {
          orderId,
          customerId,
          items,
          deliveryLocation,
          specialInstructions,
          packagingInstructions,
          priority,
          orderType,
          scheduledPickupDate,
          scheduledDeliveryDate,
          updatedByName
        } = data || {};

        log("ADMIN", `admin:order:update received | orderId: ${orderId}`);

        if (!orderId) {
          if (typeof callback === 'function') {
            callback({ success: false, message: "orderId is required" });
          }
          return;
        }

        const order = await Order.findById(orderId);
        if (!order) {
          if (typeof callback === 'function') {
            callback({ success: false, message: "Order not found" });
          }
          return;
        }

        log("INFO", `Order found | orderNumber: ${order.orderNumber} | currentStatus: ${order.status} | deliveryId: ${order.deliveryId || 'NONE'}`);

        // ── HARD BLOCK — backend-level security, frontend bypass ho bhi jaye to yahan rukega ──
        if (!order.canBeModified || !order.canBeModified()) {
          log("WARN", `admin:order:update — order cannot be modified | status: ${order.status}`);
          if (typeof callback === 'function') {
            callback({
              success: false,
              orderLocked: true,
              message: `Order cannot be edited — current status is "${order.status}". Only Pending/Confirmed orders can be updated.`
            });
          }
          return;
        }

        // ── Simple fields ──
        if (customerId) order.customerId = customerId;
        if (orderType) order.orderType = orderType;
        if (packagingInstructions !== undefined) order.packagingInstructions = packagingInstructions;
        if (specialInstructions !== undefined) order.specialInstructions = specialInstructions;
        if (priority) order.priority = priority;
        if (scheduledPickupDate) order.scheduledPickupDate = new Date(scheduledPickupDate);
        if (scheduledDeliveryDate) order.scheduledDeliveryDate = new Date(scheduledDeliveryDate);

        // ── Items ──
        if (Array.isArray(items) && items.length > 0) {
          order.items = items.map(item => ({
            productName: item.productName?.trim() || '',
            productCode: item.productCode || null,
            category: item.category || 'other',
            quantity: Number(item.quantity) || 1,
            description: item.description || ''
          }));
          log("INFO", `Items updated | count: ${order.items.length}`);
        }

        // ── Delivery location merge (old + new, coordinates optional) ──
        if (deliveryLocation) {
          const oldLoc = order.deliveryLocation ? order.deliveryLocation.toObject() : {};

          const hasNewCoords =
            deliveryLocation.coordinates?.latitude !== undefined &&
            deliveryLocation.coordinates?.latitude !== '' &&
            deliveryLocation.coordinates?.longitude !== undefined &&
            deliveryLocation.coordinates?.longitude !== '';

          order.deliveryLocation = {
            ...oldLoc,
            address: deliveryLocation.address ?? oldLoc.address,
            contactPerson: deliveryLocation.contactPerson ?? oldLoc.contactPerson,
            contactPhone: deliveryLocation.contactPhone ?? oldLoc.contactPhone,
            city: deliveryLocation.city ?? oldLoc.city,
            state: deliveryLocation.state ?? oldLoc.state,
            pincode: deliveryLocation.pincode ?? oldLoc.pincode,
            landmark: deliveryLocation.landmark ?? oldLoc.landmark,
            coordinates: hasNewCoords
              ? {
                latitude: Number(deliveryLocation.coordinates.latitude),
                longitude: Number(deliveryLocation.coordinates.longitude)
              }
              : oldLoc.coordinates
          };

          log("INFO", `deliveryLocation merged | new address: ${order.deliveryLocation.address}`);
        }

        await order.save();
        log("INFO", `Order saved successfully | orderNumber: ${order.orderNumber}`);

        // ── Delivery collection sync + ETA reset ──
        let etaWasReset = false;
        let deliveryDriverId = null;

        if (order.deliveryId) {
          try {
            const deliveryUpdate = {
              'deliveryLocation.address': order.deliveryLocation.address,
              'deliveryLocation.contactPerson': order.deliveryLocation.contactPerson,
              'deliveryLocation.contactPhone': order.deliveryLocation.contactPhone,
            };

            if (order.deliveryLocation?.coordinates?.latitude && order.deliveryLocation?.coordinates?.longitude) {
              deliveryUpdate['deliveryLocation.coordinates.latitude'] = order.deliveryLocation.coordinates.latitude;
              deliveryUpdate['deliveryLocation.coordinates.longitude'] = order.deliveryLocation.coordinates.longitude;
            }

            const updatedDelivery = await Delivery.findByIdAndUpdate(
              order.deliveryId,
              deliveryUpdate,
              { new: true }
            ).select('driverId nextDeliveryId');

            deliveryDriverId = updatedDelivery?.driverId ? updatedDelivery.driverId.toString() : null;
            log("INFO", `Delivery document synced | deliveryId: ${order.deliveryId} | driverId: ${deliveryDriverId || 'NONE'}`);

            // ✅ Active Journey ka pehle se calculated ETA reset karo
            const activeJourney = await Journey.findOne({
              deliveryId: order.deliveryId,
              status: { $in: ['Started', 'In_transit', 'In_progress', 'Arrived'] }
            });

            if (activeJourney) {
              activeJourney.estimatedDurationFromGoogle = null;
              activeJourney.googleDistanceMeters = null;
              activeJourney.googleDurationInTrafficSeconds = null;
              await activeJourney.save();
              etaWasReset = true;
              log("INFO", `Journey ETA reset | journeyId: ${activeJourney._id}`);
            }
          } catch (delErr) {
            log("ERR", `Delivery sync failed | ${delErr.message}`);
          }
        }

        // ── Poora updated data ek payload me taiyar karo ──
        const updatePayload = {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          deliveryId: order.deliveryId ? order.deliveryId.toString() : null,
          updatedDeliveryLocation: order.deliveryLocation || null,
          updatedItems: order.items || [],
          updatedSpecialInstructions: order.specialInstructions || null,
          updatedPackagingInstructions: order.packagingInstructions || null,
          updatedPriority: order.priority || null,
          updatedOrderType: order.orderType || null,
          updatedScheduledPickupDate: order.scheduledPickupDate || null,
          updatedScheduledDeliveryDate: order.scheduledDeliveryDate || null,
          etaReset: etaWasReset,
          message: `Order ${order.orderNumber} updated by ${updatedByName || 'Admin'}`,
          updatedByName: updatedByName || 'Admin',
          timestamp: new Date().toISOString(),
        };

        // ── Driver ko turant bhejo ──
        if (deliveryDriverId) {
          io.to(`driver-${deliveryDriverId}`).emit("order:updated", updatePayload);
          log("EMIT", `order:updated emitted to driver-${deliveryDriverId}`);

          try {
            const driver = await Driver.findById(deliveryDriverId).select('fcmToken name');

            await Notification.create({
              recipientId: deliveryDriverId,
              recipientType: 'Driver',
              type: 'delivery_updated',
              title: `Order Updated — ${order.orderNumber}`,
              message: `Delivery details updated. Address/items/instructions may have changed.`,
              data: { deliveryId: order.deliveryId },
              channels: {
                push: {
                  sent: !!driver?.fcmToken,
                  sentAt: driver?.fcmToken ? new Date() : undefined,
                }
              },
              priority: 'high',
              isRead: false,
            });
            log("INFO", `Notification DB record created for driver ${deliveryDriverId}`);

            if (driver?.fcmToken) {
              try {
                await sendNotification(driver.fcmToken, {
                  title: `Order Updated — ${order.orderNumber}`,
                  body: `Delivery details have been updated. Tap to view.`,
                  type: 'order_updated',
                  orderId: order._id.toString(),
                  orderNumber: order.orderNumber,
                  deliveryId: order.deliveryId ? order.deliveryId.toString() : '',
                  address: order.deliveryLocation?.address || '',
                  etaReset: String(etaWasReset),
                });
                log("INFO", `FCM push sent to driver ${deliveryDriverId}`);
              } catch (fcmErr) {
                log("ERR", `FCM push failed | ${fcmErr.message}`);
              }
            }
          } catch (notifErr) {
            log("ERR", `Notification creation failed | ${notifErr.message}`);
          }
        } else {
          log("WARN", `No driver assigned yet — order:updated not sent to any driver room`);
        }

        // ── Admin room ko bhi broadcast ──
        io.to("admin-room").emit("order:updated", updatePayload);
        log("EMIT", `order:updated broadcasted to admin-room`);

        if (typeof callback === 'function') {
          callback({
            success: true,
            message: "Order updated successfully",
            orderId: order._id.toString(),
            deliveryLocation: order.deliveryLocation,
            etaReset: etaWasReset,
            driverNotified: !!deliveryDriverId,
          });
        }

        log("ADMIN", `admin:order:update completed successfully | orderNumber: ${order.orderNumber}`);

      } catch (err) {
        log("ERR", `admin:order:update | ${err.stack}`);
        if (typeof callback === 'function') {
          callback({ success: false, message: "Server error while updating order" });
        }
      }
    });

    // ─────────────────────────────────────────────
    // STEP 4: DRIVER — driver:location (live tracking)
    // ─────────────────────────────────────────────
    // socket.on("driver:location", async (data) => {
    //   try {
    //     const { driverId, journeyId, deliveryId, latitude, longitude, speed, heading, accuracy, timestamp } = data || {};

    //     if (!driverId || !latitude || !longitude) {
    //       log("WARN", `driver:location — invalid data | socket: ${socket.id}`);
    //       return;
    //     }

    //     log("LOC", `From driver ${driverId} | lat: ${latitude} | lng: ${longitude} | speed: ${speed}`);

    //     // DB update
    //     try {
    //       await Driver.findByIdAndUpdate(
    //         driverId,
    //         {
    //           "currentLocation.latitude": latitude,
    //           "currentLocation.longitude": longitude,
    //           "currentLocation.speed": speed || 0,
    //           "currentLocation.heading": heading || 0,
    //           "currentLocation.accuracy": accuracy || 0,
    //           "currentLocation.timestamp": new Date(),
    //           lastLocationUpdate: new Date(),
    //         },
    //         { new: false }
    //       );
    //       log("INFO", `DB location saved for driver ${driverId}`);

    //       // ✅ AUTO-PUSH: location save hone ke turant baad driver ko naya
    //       // nearest-first sorted delivery list bhi bhej do — REST call ka
    //       // wait nahi karna padta, app khulte hi pehli baar bhi sahi order
    //       // mil jaata hai (bas location ek baar bhej diya ho).
    //       try {
    //         const sorted = await getSortedUpcomingForDriver(driverId);
    //         io.to(`driver-${driverId}`).emit("driver:deliveries:updated", {
    //           upcoming: sorted.upcoming,
    //           completed: sorted.completed,
    //           sortedByProximity: sorted.sortedByProximity,
    //           timestamp: new Date().toISOString(),
    //         });
    //         log("EMIT", `driver:deliveries:updated pushed to driver-${driverId} | sortedByProximity: ${sorted.sortedByProximity}`);
    //       } catch (sortErr) {
    //         log("ERR", `Auto-push sorted deliveries failed | ${sortErr.message}`);
    //       }
    //     } catch (e) {
    //       log("ERR", `DB location save failed | ${e.message}`);
    //     }

    //     const locationPayload = {
    //       latitude,
    //       longitude,
    //       speed: speed || 0,
    //       heading: heading || 0,
    //       accuracy: accuracy || 0,
    //       timestamp: timestamp || new Date().toISOString(),
    //       journeyId,
    //       deliveryId,
    //     };

    //     driverLocations.set(driverId, locationPayload);

    //     if (activeDrivers.has(driverId)) {
    //       const di = activeDrivers.get(driverId);
    //       activeDrivers.set(driverId, { ...di, lastSeen: new Date().toISOString() });
    //     } else {
    //       log("WARN", `driver:location — driverId ${driverId} not in activeDrivers! Call driver:connect first.`);
    //     }

    //     const driverInfo = activeDrivers.get(driverId);

    //     const adminRoomSockets = await io.in("admin-room").allSockets();
    //     if (adminRoomSockets.size === 0) {
    //       log("WARN", `No clients in admin-room!`);
    //     }

    //     io.to("admin-room").emit("driver:location:update", {
    //       driverId,
    //       driverName: driverInfo?.driverName || "Driver",
    //       vehicleNumber: driverInfo?.vehicleNumber || "N/A",
    //       journeyId,
    //       deliveryId,
    //       location: locationPayload,
    //       isAvailable: false,
    //       status: "In_transit",
    //       timestamp: new Date().toISOString(),
    //     });

    //     if (deliveryId) {
    //       io.to(`delivery-${deliveryId}`).emit("delivery:location:update", {
    //         deliveryId,
    //         driverId,
    //         location: { latitude, longitude },
    //         speed,
    //         heading,
    //         timestamp: timestamp || new Date().toISOString(),
    //       });
    //     }

    //     if (journeyId) {
    //       io.to(`journey-${journeyId}`).emit("journey:location:update", {
    //         journeyId,
    //         driverId,
    //         location: { latitude, longitude, speed, heading, accuracy },
    //         timestamp: timestamp || new Date().toISOString(),
    //       });
    //     }
    //   } catch (err) {
    //     log("ERR", `driver:location | ${err.stack}`);
    //   }
    // });



    socket.on("driver:location", async (data) => {
      try {
        const { driverId, journeyId, deliveryId, latitude, longitude, speed, heading, accuracy, timestamp } = data || {};

        if (!driverId || !latitude || !longitude) {
          log("WARN", `driver:location — invalid data | socket: ${socket.id}`);
          return;
        }

        log("LOC", `From driver ${driverId} | lat: ${latitude} | lng: ${longitude} | speed: ${speed}`);

        // DB update (non-blocking) — Driver ka current location
        Driver.findByIdAndUpdate(
          driverId,
          {
            "currentLocation.latitude": latitude,
            "currentLocation.longitude": longitude,
            "currentLocation.speed": speed || 0,
            "currentLocation.heading": heading || 0,
            "currentLocation.accuracy": accuracy || 0,
            "currentLocation.lastUpdated": new Date(),
            lastLocationUpdate: new Date(),
          },
          { new: false }
        )
          .then(() => log("INFO", `DB location saved for driver ${driverId}`))
          .catch((e) => log("ERR", `DB location save failed | ${e.message}`));

        // ✅ NAYA FIX: Journey ke waypoints array me bhi ye GPS point push karo —
        // isi se "actual traveled route" ban ke store hota hai. Isके bina
        // Journey.waypoints hamesha khaali reh jaata tha, isliye map pe
        // completed delivery ka route kabhi nahi dikhta tha.
        if (journeyId) {
          Journey.findByIdAndUpdate(
            journeyId,
            {
              $push: {
                waypoints: {
                  location: {
                    coordinates: {
                      latitude: Number(latitude),
                      longitude: Number(longitude)
                    }
                  },
                  speed: speed || 0,
                  heading: heading || 0,
                  timestamp: timestamp ? new Date(timestamp) : new Date()
                }
              }
            },
            { new: false }
          )
            .then(() => log("INFO", `Waypoint saved to Journey ${journeyId}`))
            .catch((e) => log("ERR", `Waypoint save failed | journeyId: ${journeyId} | ${e.message}`));
        } else {
          log("WARN", `driver:location — journeyId missing, waypoint NAHI save hua (route incomplete rahega)`);
        }

        const locationPayload = {
          latitude,
          longitude,
          speed: speed || 0,
          heading: heading || 0,
          accuracy: accuracy || 0,
          timestamp: timestamp || new Date().toISOString(),
          journeyId,
          deliveryId,
        };

        driverLocations.set(driverId, locationPayload);

        if (activeDrivers.has(driverId)) {
          const di = activeDrivers.get(driverId);
          activeDrivers.set(driverId, { ...di, lastSeen: new Date().toISOString() });
        } else {
          log("WARN", `driver:location — driverId ${driverId} not in activeDrivers! Call driver:connect first.`);
        }

        const driverInfo = activeDrivers.get(driverId);

        io.to("admin-room").emit("driver:location:update", {
          driverId,
          driverName: driverInfo?.driverName || "Driver",
          vehicleNumber: driverInfo?.vehicleNumber || "N/A",
          journeyId,
          deliveryId,
          location: locationPayload,
          isAvailable: false,
          status: "In_transit",
          timestamp: new Date().toISOString(),
        });

        if (deliveryId) {
          io.to(`delivery-${deliveryId}`).emit("delivery:location:update", {
            deliveryId,
            driverId,
            location: { latitude, longitude },
            speed,
            heading,
            timestamp: timestamp || new Date().toISOString(),
          });
        }

        if (journeyId) {
          io.to(`journey-${journeyId}`).emit("journey:location:update", {
            journeyId,
            driverId,
            location: { latitude, longitude, speed, heading, accuracy },
            timestamp: timestamp || new Date().toISOString(),
          });
        }
      } catch (err) {
        log("ERR", `driver:location | ${err.stack}`);
      }
    });

    socket.on("driver:journey:location", async (data) => {
      try {
        const { driverId, journeyId, deliveryId, latitude, longitude, speed, heading, status } = data || {};
        if (!driverId || !latitude || !longitude) return;

        // ✅ In-memory map update (existing behavior kept)
        driverLocations.set(driverId, {
          latitude, longitude, speed: speed || 0, heading: heading || 0,
          timestamp: new Date().toISOString(), journeyId, deliveryId,
        });

        // ✅ FIX: yeh event pehle sirf in-memory update karta tha, DB me
        // currentLocation kabhi save hi nahi hota tha — isi wajah se
        // proximity-sorting (getDriverDeliveries) hamesha "sortedByProximity:false"
        // deti thi. Ab DB save + journey waypoint track + auto-push sab hoga.
        try {
          await Driver.findByIdAndUpdate(
            driverId,
            {
              "currentLocation.latitude": latitude,
              "currentLocation.longitude": longitude,
              "currentLocation.speed": speed || 0,
              "currentLocation.heading": heading || 0,
              "currentLocation.timestamp": new Date(),
              lastLocationUpdate: new Date(),
            },
            { new: false }
          );
          log("INFO", `DB location saved (via driver:journey:location) for driver ${driverId}`);

          // ✅ ACTUAL-TRAVELED-PATH: is location ping ko active Journey ke
          // waypoints me bhi jod do, taaki delivery details page pe driver
          // ka ASLI chala hua route dikhaya ja sake (predicted route nahi).
          if (journeyId) {
            try {
              await Journey.findByIdAndUpdate(journeyId, {
                $push: {
                  waypoints: {
                    location: {
                      coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
                      address: 'Live GPS'
                    },
                    timestamp: new Date(),
                    activity: 'checkpoint'
                  }
                }
              });
            } catch (wpErr) {
              log("ERR", `Journey waypoint push failed | ${wpErr.message}`);
            }
          }

          // ✅ AUTO-PUSH: naya sorted list turant driver ko bhej do
          try {
            const sorted = await getSortedUpcomingForDriver(driverId);
            io.to(`driver-${driverId}`).emit("driver:deliveries:updated", {
              upcoming: sorted.upcoming,
              completed: sorted.completed,
              sortedByProximity: sorted.sortedByProximity,
              timestamp: new Date().toISOString(),
            });
            log("EMIT", `driver:deliveries:updated pushed (via journey:location) | sortedByProximity: ${sorted.sortedByProximity}`);
          } catch (sortErr) {
            log("ERR", `Auto-push sorted deliveries failed | ${sortErr.message}`);
          }
        } catch (dbErr) {
          log("ERR", `DB location save failed (driver:journey:location) | ${dbErr.message}`);
        }

        const driverInfo = activeDrivers.get(driverId);
        io.to("admin-room").emit("driver:location:update", {
          driverId,
          driverName: driverInfo?.driverName || "Driver",
          vehicleNumber: driverInfo?.vehicleNumber || "N/A",
          journeyId, deliveryId,
          location: { latitude, longitude, speed: speed || 0, heading: heading || 0 },
          isAvailable: false,
          status: status || "In_transit",
          timestamp: new Date().toISOString(),
        });

        // Delivery/Journey-specific rooms ko bhi bhejo (map live-tracking ke liye)
        if (deliveryId) {
          io.to(`delivery-${deliveryId}`).emit("delivery:location:update", {
            deliveryId, driverId,
            location: { latitude, longitude },
            speed, heading,
            timestamp: new Date().toISOString(),
          });
        }
        if (journeyId) {
          io.to(`journey-${journeyId}`).emit("journey:location:update", {
            journeyId, driverId,
            location: { latitude, longitude, speed, heading },
            timestamp: new Date().toISOString(),
          });
        }
      } catch (err) {
        log("ERR", `driver:journey:location | ${err.message}`);
      }
    });

    // ─────────────────────────────────────────────
    // STEP 5 (FIXED): DRIVER — driver:journey:ended
    // FIX: DB mein Journey + Delivery status update karo
    // ─────────────────────────────────────────────

    // socket.on("driver:journey:ended", async (data, callback) => {
    //   try {
    //     const { driverId, journeyId, deliveryId, latitude, longitude, address } = data || {};

    //     // ── Memory cleanup ──
    //     if (driverId) {
    //       driverLocations.delete(driverId);
    //       if (activeDrivers.has(driverId)) {
    //         const di = activeDrivers.get(driverId);
    //         activeDrivers.set(driverId, { ...di, journeyId: null, deliveryId: null });
    //       }
    //     }

    //     log("DRIVER", `Journey ENDED | journeyId: ${journeyId} | driverId: ${driverId}`);

    //     // ── Journey DB update ──
    //     let journeyDoc = null;
    //     if (journeyId) {
    //       const now = new Date();

    //       journeyDoc = await Journey.findById(journeyId);
    //       if (journeyDoc) {
    //         const actualMinutes = journeyDoc.startTime
    //           ? Math.round((now - new Date(journeyDoc.startTime)) / 60000)
    //           : null;

    //         journeyDoc.status = "Completed";
    //         journeyDoc.endTime = now;
    //         journeyDoc.totalDuration = actualMinutes;
    //         if (latitude && longitude) {
    //           journeyDoc.endLocation = {
    //             coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
    //             address: address || "Journey ended",
    //           };
    //         }
    //         await journeyDoc.save();

    //         log("INFO", `Journey updated | journeyId: ${journeyId} | duration: ${actualMinutes} mins`);
    //       }
    //     }

    //     // ── Delivery DB update + Order update ──
    //     // let deliveryDoc = null;
    //     // let companyName = 'N/A';
    //     // let deliveryAddress = 'N/A';

    //     // if (deliveryId) {
    //     //   try {
    //     //     deliveryDoc = await Delivery.findByIdAndUpdate(
    //     //       deliveryId,
    //     //       { status: "delivered", actualDeliveryTime: new Date() },
    //     //       { new: true }
    //     //     ).populate({ path: 'customerId', select: 'companyName name locations' });

    //     //     log("INFO", `Delivery marked delivered | deliveryId: ${deliveryId}`);

    //     //     // ── Customer info extract ──
    //     //     const customer = deliveryDoc?.customerId;
    //     //     if (customer) {
    //     //       companyName = customer.companyName || customer.name || 'N/A';
    //     //       if (customer.locations?.length > 0) {
    //     //         const loc = customer.locations.find(l => l.isPrimary) || customer.locations[0];
    //     //         deliveryAddress = [
    //     //           loc.addressLine1, loc.addressLine2,
    //     //           loc.city, loc.state,
    //     //           loc.zipcode, loc.country
    //     //         ].filter(Boolean).join(', ') || 'N/A';
    //     //       }
    //     //     }

    //     //     // ── Order update ──
    //     //     if (deliveryDoc?.orderId) {
    //     //       const orderQuery = mongoose.Types.ObjectId.isValid(deliveryDoc.orderId)
    //     //         ? { _id: deliveryDoc.orderId }
    //     //         : { orderNumber: deliveryDoc.orderId };

    //     //       const updatedOrder = await Order.findOneAndUpdate(
    //     //         orderQuery,
    //     //         { status: "delivered", updatedAt: new Date() },
    //     //         { new: true }
    //     //       );

    //     //       if (updatedOrder) {
    //     //         log("INFO", `Order marked delivered | orderNumber: ${updatedOrder.orderNumber}`);
    //     //       } else {
    //     //         log("WARN", `Order NOT found | orderId: ${deliveryDoc.orderId}`);
    //     //       }
    //     //     }

    //     //     // ── DeliveryStatusHistory ──
    //     //     await DeliveryStatusHistory.create({
    //     //       deliveryId,
    //     //       status: "delivered",
    //     //       location: latitude && longitude ? {
    //     //         coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
    //     //         address: address || "Delivery location",
    //     //       } : undefined,
    //     //       remarks: "Journey ended by driver via socket",
    //     //       updatedBy: {
    //     //         userId: driverId,
    //     //         userRole: "driver",
    //     //         userName: activeDrivers.get(driverId)?.driverName || "Driver",
    //     //       },
    //     //     }).catch(e => log("ERR", `DeliveryStatusHistory failed | ${e.message}`));

    //     //   } catch (dbErr) {
    //     //     log("ERR", `Delivery/Order DB update failed | ${dbErr.message}`);
    //     //   }
    //     // }



    //     // ── Driver available mark karo ──
    //     if (driverId) {
    //       await Driver.findByIdAndUpdate(
    //         driverId,
    //         {
    //           isAvailable: true,
    //           currentJourney: null,
    //           activeDelivery: null,
    //           "currentLocation.latitude": null,
    //           "currentLocation.longitude": null,
    //           "currentLocation.lastUpdated": null,
    //         },
    //         { new: false }
    //       ).catch(e => log("ERR", `Driver update failed | ${e.message}`));

    //       log("INFO", `Driver ${driverId} marked available`);
    //     }

    //     // ── Timing calculate karo (same as completeDelivery API) ──
    //     const now = new Date();
    //     const actualMinutes = journeyDoc?.startTime
    //       ? Math.round((now - new Date(journeyDoc.startTime)) / 60000)
    //       : null;
    //     const estimatedMin = journeyDoc?.estimatedDurationFromGoogle || null;

    //     let timeDifferenceText = 'N/A';
    //     if (estimatedMin !== null && actualMinutes !== null) {
    //       const diff = actualMinutes - estimatedMin;
    //       timeDifferenceText = diff > 5
    //         ? `Delayed by ${diff} mins`
    //         : diff < -5
    //           ? `Ahead by ${Math.abs(diff)} mins`
    //           : 'On time';
    //     }

    //     const arrivalTime = now.toLocaleString('en-IN', {
    //       timeZone: 'Asia/Kolkata',
    //       dateStyle: 'medium',
    //       timeStyle: 'short',
    //     });

    //     // ── Admin broadcast ──
    //     io.to("admin-room").emit("driver:journey:ended", {
    //       driverId,
    //       journeyId,
    //       deliveryId,
    //       location: latitude && longitude ? { latitude, longitude, address } : null,
    //       status: "Completed",
    //       timestamp: now.toISOString(),
    //     });

    //     // ── ACK callback — completeDelivery API jaisa full response ──
    //     if (typeof callback === 'function') {
    //       callback({
    //         success: true,
    //         message: "Journey ended successfully",
    //         journeyId,
    //         deliveryId,
    //         journeyStatus: "Completed",
    //         deliveryStatus: "delivered",
    //         location: { latitude, longitude },
    //         customer: {
    //           companyName,
    //           deliveryAddress,
    //           customerId: deliveryDoc?.customerId?._id || null,
    //         },
    //         arrivalTime,
    //         arrivalTimeISO: now.toISOString(),
    //         timing: {
    //           actualTimeTaken: actualMinutes !== null ? `${actualMinutes} mins` : 'N/A',
    //           estimatedTime: estimatedMin ? `${estimatedMin} mins` : 'N/A',
    //           difference: timeDifferenceText,
    //           startTime: journeyDoc?.startTime?.toISOString() || null,
    //           arrivedAt: now.toISOString(),
    //         },
    //       });
    //     }

    //   } catch (err) {
    //     log("ERR", `driver:journey:ended | ${err.message}`);
    //     if (typeof callback === 'function') {
    //       callback({ success: false, message: "Server error while ending journey" });
    //     }
    //   }
    // });

    // socket.on("driver:journey:ended", async (data, callback) => {
    //   try {
    //     const { driverId, journeyId, deliveryId, latitude, longitude, address } = data || {};

    //     // ── Memory cleanup ──
    //     if (driverId) {
    //       driverLocations.delete(driverId);
    //       if (activeDrivers.has(driverId)) {
    //         const di = activeDrivers.get(driverId);
    //         activeDrivers.set(driverId, { ...di, journeyId: null, deliveryId: null });
    //       }
    //     }

    //     log("DRIVER", `Journey ENDED | journeyId: ${journeyId} | driverId: ${driverId}`);

    //     // ── Journey DB update ──
    //     let journeyDoc = null;
    //     if (journeyId) {
    //       const now = new Date();

    //       journeyDoc = await Journey.findById(journeyId);
    //       if (journeyDoc) {
    //         const actualMinutes = journeyDoc.startTime
    //           ? Math.round((now - new Date(journeyDoc.startTime)) / 60000)
    //           : null;

    //         journeyDoc.status = "Completed";
    //         journeyDoc.endTime = now;
    //         journeyDoc.totalDuration = actualMinutes;
    //         if (latitude && longitude) {
    //           journeyDoc.endLocation = {
    //             coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
    //             address: address || "Journey ended",
    //           };
    //         }
    //         await journeyDoc.save();

    //         log("INFO", `Journey updated | journeyId: ${journeyId} | duration: ${actualMinutes} mins`);
    //       } else {
    //         log("WARN", `Journey not found in DB | journeyId: ${journeyId}`);
    //       }
    //     }

    //     // ── Delivery DB update + Order update ──
    //     let deliveryDoc = null;
    //     let companyName = 'N/A';
    //     let deliveryAddress = 'N/A';
    //     let customerId = null;

    //     if (deliveryId) {
    //       try {
    //         // ✅ Step 1: pehle update karo
    //         await Delivery.findByIdAndUpdate(
    //           deliveryId,
    //           { status: "delivered", actualDeliveryTime: new Date() },
    //           { new: false }
    //         );

    //         // ✅ Step 2: alag query se populate karo — findByIdAndUpdate ke saath populate reliable nahi
    //         deliveryDoc = await Delivery.findById(deliveryId)
    //           .populate({ path: 'customerId', select: 'companyName name locations' });

    //         log("INFO", `Delivery marked delivered | deliveryId: ${deliveryId}`);
    //         log("INFO", `customerId raw: ${JSON.stringify(deliveryDoc?.customerId)}`);

    //         // ── Customer info extract ──
    //         const customer = deliveryDoc?.customerId;
    //         if (customer) {
    //           customerId = customer._id?.toString() || null;
    //           companyName = customer.companyName || customer.name || 'N/A';
    //           log("INFO", `Customer found | companyName: ${companyName} | customerId: ${customerId}`);

    //           if (customer.locations?.length > 0) {
    //             const loc = customer.locations.find(l => l.isPrimary) || customer.locations[0];
    //             deliveryAddress = [
    //               loc.addressLine1,
    //               loc.addressLine2,
    //               loc.city,
    //               loc.state,
    //               loc.zipcode,
    //               loc.country
    //             ].filter(Boolean).join(', ') || 'N/A';
    //           } else {
    //             // fallback — delivery model ka deliveryLocation use karo
    //             deliveryAddress = deliveryDoc?.deliveryLocation?.address || 'N/A';
    //             log("WARN", `Customer locations empty, fallback address: ${deliveryAddress}`);
    //           }
    //         } else {
    //           // customer populate nahi hua — delivery address fallback
    //           deliveryAddress = deliveryDoc?.deliveryLocation?.address || 'N/A';
    //           log("WARN", `customerId null after populate | deliveryId: ${deliveryId}`);
    //         }

    //         // ── Order update ──
    //         if (deliveryDoc?.orderId) {
    //           const orderQuery = mongoose.Types.ObjectId.isValid(deliveryDoc.orderId)
    //             ? { _id: deliveryDoc.orderId }
    //             : { orderNumber: deliveryDoc.orderId };

    //           const updatedOrder = await Order.findOneAndUpdate(
    //             orderQuery,
    //             { status: "delivered", updatedAt: new Date() },
    //             { new: true }
    //           );

    //           if (updatedOrder) {
    //             log("INFO", `Order marked delivered | orderNumber: ${updatedOrder.orderNumber}`);
    //           } else {
    //             log("WARN", `Order NOT found | orderId: ${deliveryDoc.orderId}`);
    //           }
    //         } else {
    //           log("WARN", `Delivery has no orderId | deliveryId: ${deliveryId}`);
    //         }

    //         // ── DeliveryStatusHistory ──
    //         await DeliveryStatusHistory.create({
    //           deliveryId,
    //           status: "delivered",
    //           location: latitude && longitude ? {
    //             coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
    //             address: address || "Delivery location",
    //           } : undefined,
    //           remarks: "Journey ended by driver via socket",
    //           updatedBy: {
    //             userId: driverId,
    //             userRole: "driver",
    //             userName: activeDrivers.get(driverId)?.driverName || "Driver",
    //           },
    //         }).catch(e => log("ERR", `DeliveryStatusHistory failed | ${e.message}`));

    //       } catch (dbErr) {
    //         log("ERR", `Delivery/Order DB update failed | ${dbErr.message}`);
    //       }
    //     }

    //     // ── Driver available mark karo ──
    //     if (driverId) {
    //       await Driver.findByIdAndUpdate(
    //         driverId,
    //         {
    //           isAvailable: true,
    //           currentJourney: null,
    //           activeDelivery: null,
    //           "currentLocation.latitude": null,
    //           "currentLocation.longitude": null,
    //           "currentLocation.lastUpdated": null,
    //         },
    //         { new: false }
    //       ).catch(e => log("ERR", `Driver update failed | ${e.message}`));

    //       log("INFO", `Driver ${driverId} marked available`);
    //     }

    //     // ── Timing calculate ──
    //     const now = new Date();
    //     const actualMinutes = journeyDoc?.startTime
    //       ? Math.round((now - new Date(journeyDoc.startTime)) / 60000)
    //       : null;
    //     const estimatedMin = journeyDoc?.estimatedDurationFromGoogle || null;

    //     let timeDifferenceText = 'N/A';
    //     if (estimatedMin !== null && actualMinutes !== null) {
    //       const diff = actualMinutes - estimatedMin;
    //       timeDifferenceText = diff > 5
    //         ? `Delayed by ${diff} mins`
    //         : diff < -5
    //           ? `Ahead by ${Math.abs(diff)} mins`
    //           : 'On time';
    //     }

    //     const arrivalTime = now.toLocaleString('en-IN', {
    //       timeZone: 'Asia/Kolkata',
    //       dateStyle: 'medium',
    //       timeStyle: 'short',
    //     });

    //     // ── Admin broadcast ──
    //     io.to("admin-room").emit("driver:journey:ended", {
    //       driverId,
    //       journeyId,
    //       deliveryId,
    //       location: latitude && longitude ? { latitude, longitude, address } : null,
    //       status: "Completed",
    //       timestamp: now.toISOString(),
    //     });

    //     log("EMIT", `driver:journey:ended emitted to admin-room | driverId: ${driverId}`);

    //     // ── ACK callback ──
    //     if (typeof callback === 'function') {
    //       callback({
    //         success: true,
    //         message: "Journey ended successfully",
    //         journeyId,
    //         deliveryId,
    //         journeyStatus: "Completed",
    //         deliveryStatus: "delivered",
    //         location: { latitude, longitude },
    //         customer: {
    //           customerId,
    //           companyName,
    //           deliveryAddress,
    //         },
    //         arrivalTime,
    //         arrivalTimeISO: now.toISOString(),
    //         timing: {
    //           actualTimeTaken: actualMinutes !== null ? `${actualMinutes} mins` : 'N/A',
    //           estimatedTime: estimatedMin ? `${estimatedMin} mins` : 'N/A',
    //           difference: timeDifferenceText,
    //           startTime: journeyDoc?.startTime?.toISOString() || null,
    //           arrivedAt: now.toISOString(),
    //         },
    //       });
    //     }

    //   } catch (err) {
    //     log("ERR", `driver:journey:ended | ${err.message}`);
    //     if (typeof callback === 'function') {
    //       callback({ success: false, message: "Server error while ending journey" });
    //     }
    //   }
    // });


    socket.on("driver:journey:ended", async (data, callback) => {
      try {
        const { driverId, journeyId, deliveryId } = data || {};

        // ── Sirf memory cleanup — marker remove ──
        if (driverId) {
          driverLocations.delete(driverId);
          if (activeDrivers.has(driverId)) {
            const di = activeDrivers.get(driverId);
            activeDrivers.set(driverId, { ...di, journeyId: null, deliveryId: null });
          }
        }

        log("DRIVER", `Journey ENDED (marker removed) | journeyId: ${journeyId} | driverId: ${driverId}`);

        // ── Admin ko broadcast — marker remove karo ──
        io.to("admin-room").emit("driver:journey:ended", {
          driverId,
          journeyId,
          deliveryId,
          status: "Completed",
          timestamp: new Date().toISOString(),
        });

        // ── Driver offline bhi bhejo — map se marker hatane ke liye ──
        io.to("admin-room").emit("driver:offline", {
          driverId,
          status: "offline",
          timestamp: new Date().toISOString(),
        });

        log("EMIT", `Marker removed for driverId: ${driverId}`);

        // ── ACK ──
        if (typeof callback === 'function') {
          callback({ success: true, message: "Journey ended, marker removed" });
        }

      } catch (err) {
        log("ERR", `driver:journey:ended | ${err.message}`);
        if (typeof callback === 'function') {
          callback({ success: false, message: "Server error" });
        }
      }
    });


    // ─────────────────────────────────────────────
    // STEP 6 (FIXED): DRIVER — delivery:completed
    // FIX: DB update + driverId String normalize
    // ─────────────────────────────────────────────
    socket.on("delivery:completed", async (data) => {
      try {
        log("DRIVER", `Delivery COMPLETED | data: ${JSON.stringify(data)}`);

        const { driverId, deliveryId, journeyId, latitude, longitude, address } = data || {};

        if (!driverId) {
          log("WARN", `delivery:completed — driverId missing`);
          return;
        }

        // ── Memory cleanup ──
        driverLocations.delete(driverId);
        if (activeDrivers.has(driverId)) {
          const di = activeDrivers.get(driverId);
          activeDrivers.set(driverId, { ...di, journeyId: null, deliveryId: null });
        }

        // ── FIX: Journey status update ──
        if (journeyId) {
          try {
            await Journey.findByIdAndUpdate(
              journeyId,
              {
                status: "completed",
                endTime: new Date(),
                ...(latitude && longitude && {
                  endLocation: {
                    coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
                    address: address || "Delivery completed",
                  },
                }),
              },
              { new: false }
            );
            log("INFO", `Journey completed in DB | journeyId: ${journeyId}`);
          } catch (dbErr) {
            log("ERR", `Journey DB update failed | ${dbErr.message}`);
          }
        }

        // ── FIX: Delivery status update ──
        if (deliveryId) {
          try {
            await Delivery.findByIdAndUpdate(
              deliveryId,
              { status: "delivered", actualDeliveryTime: new Date() },
              { new: false }
            );

            await DeliveryStatusHistory.create({
              deliveryId,
              status: "delivered",
              location: latitude && longitude ? {
                coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
                address: address || "Delivery location",
              } : undefined,
              remarks: "Delivery completed by driver via socket",
              updatedBy: {
                userId: driverId,
                userRole: "driver",
                userName: activeDrivers.get(driverId)?.driverName || "Driver",
              },
            });

            log("INFO", `Delivery marked delivered in DB | deliveryId: ${deliveryId}`);
          } catch (dbErr) {
            log("ERR", `Delivery DB update failed | ${dbErr.message}`);
          }
        }

        // ── Driver DB update ──
        await Driver.findByIdAndUpdate(
          driverId,
          {
            isAvailable: true,
            currentJourney: null,
            "currentLocation.latitude": null,
            "currentLocation.longitude": null,
            "currentLocation.lastUpdated": null,
          },
          { new: false }
        ).catch((e) => log("ERR", `Driver update failed | ${e.message}`));

        log("INFO", `Driver ${driverId} marked available in DB`);

        // ── FIX: driverId clearly String mein bhejo admin ko ──
        io.to("admin-room").emit("driver:delivery:completed", {
          driverId: String(driverId),
          deliveryId: String(deliveryId || ""),
          journeyId: String(journeyId || ""),
          status: "completed",
          timestamp: new Date().toISOString(),
        });

        log("EMIT", `driver:delivery:completed emitted | driverId: ${driverId}`);

      } catch (err) {
        log("ERR", `delivery:completed | ${err.stack}`);
      }
    });

    // ─────────────────────────────────────────────
    // JOURNEY: Room join/leave
    // ─────────────────────────────────────────────
    socket.on("join-journey", (journeyId) => {
      socket.join(`journey-${journeyId}`);
      log("INFO", `Client joined journey-${journeyId}`);
    });

    socket.on("leave-journey", (journeyId) => {
      socket.leave(`journey-${journeyId}`);
    });

    // DELIVERY: Room join/leave
    socket.on("join-delivery", (deliveryId) => {
      socket.join(`delivery-${deliveryId}`);
    });

    socket.on("leave-delivery", (deliveryId) => {
      socket.leave(`delivery-${deliveryId}`);
    });

    // driver:journey:arrived
    socket.on("driver:journey:arrived", (data) => {
      const { journeyId, deliveryId, location, status, driverId } = data || {};
      log("DRIVER", `Journey ARRIVED | journeyId: ${journeyId}`);
      io.to("admin-room").emit("driver:journey:arrived", {
        driverId,
        journeyId,
        deliveryId,
        location,
        status: status || "Arrived",
        timestamp: new Date().toISOString(),
      });
    });

    // NOTE: duplicate "driver:journey:location" handler yahan pehle tha —
    // hata diya gaya hai kyunki wahi event upar (DB-save + waypoint-track
    // wala) already properly handle ho raha hai. Do listeners same event
    // pe hone se DB me double writes aur Journey me duplicate waypoints
    // ban rahe the.

    // CHAT
    socket.on("chat:join", (data) => {
      socket.join(`user-${data?.userId}`);
    });

    socket.on("chat:join-conversation", (data) => {
      socket.join(`conversation-${data?.conversationId}`);
    });

    socket.on("chat:typing", (data) => {
      const { conversationId, userId, isTyping } = data || {};
      socket.to(`conversation-${conversationId}`).emit("chat:typing", { userId, isTyping });
    });

    // NOTIFICATIONS
    socket.on("notifications:subscribe", (data) => {
      socket.join(`notifications-${data?.userId}`);
    });

    // MAINTENANCE
    socket.on("driver-completed-service", async ({ scheduleId, driverName, vehicleNumber } = {}) => {
      try {
        const MaintenanceSchedule = require("./models/MaintenanceSchedule");
        const maintenance = await MaintenanceSchedule.findById(scheduleId).populate("vehicle");
        if (maintenance) {
          io.to("admin-room").emit("new-service-request", {
            type: "service_completion_request",
            message: `${vehicleNumber || "Vehicle"} - Driver "${driverName}" completed service!`,
            scheduleId,
            vehicleNumber: vehicleNumber || maintenance.vehicle?.vehicleNumber,
            driverName,
            requestedAt: new Date().toISOString(),
            status: maintenance.status,
          });
        }
      } catch (err) {
        log("ERR", `maintenance socket | ${err.message}`);
      }
    });

    // PING
    socket.on("ping:driver", (data) => {
      socket.emit("pong:driver", { ...data, serverTime: new Date().toISOString() });
    });

    // ─────────────────────────────────────────────
    // DISCONNECT
    // ─────────────────────────────────────────────
    socket.on("disconnect", (reason) => {
      log("SOCKET", `Disconnected | socket: ${socket.id} | reason: ${reason}`);

      const driverId = socket.driverId;
      if (driverId && activeDrivers.has(driverId)) {
        const driver = activeDrivers.get(driverId);
        activeDrivers.delete(driverId);
        driverLocations.delete(driverId);

        log("DRIVER", `Driver OFFLINE | name: ${driver.driverName} | driverId: ${driverId} | total: ${activeDrivers.size}`);

        // ✅ driverId clearly bhejo
        io.to("admin-room").emit("driver:offline", {
          driverId,                       // marker remove ke liye
          driverName: driver.driverName,
          vehicleNumber: driver.vehicleNumber,
          status: "offline",
          timestamp: new Date().toISOString(),
        });
      }
    });

    socket.on("connect_error", (err) => {
      log("ERR", `connect_error | ${err.message}`);
    });
  });

  // Broadcast helper for REST API controllers
  io.broadcastDriverLocation = async function (driverData, locationData) {
    const adminSockets = await io.in("admin-room").allSockets();
    if (adminSockets.size === 0) {
      log("WARN", `broadcastDriverLocation — nobody in admin-room!`);
    }

    io.to("admin-room").emit("driver:location:update", {
      driverId: driverData.driverId || driverData._id?.toString(),
      driverName: driverData.driverName || driverData.name || "Driver",
      vehicleNumber: driverData.vehicleNumber || "N/A",
      journeyId: driverData.journeyId,
      deliveryId: driverData.deliveryId,
      location: locationData,
      isAvailable: false,
      status: driverData.status || "In_transit",
      timestamp: new Date().toISOString(),
    });
  };

  log("INFO", "✅ Socket handlers initialized");
  return { activeDrivers, driverLocations };
}

module.exports = setupSocketHandlers;