const Driver = require("../models/Driver");
const Journey = require("../models/Journey");
const Delivery = require("../models/Delivery");
const DeliveryStatusHistory = require("../models/DeliveryStatusHistory");
const Order = require("../models/Order")
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
    // STEP 4: DRIVER — driver:location (live tracking)
    // ─────────────────────────────────────────────
    socket.on("driver:location", async (data) => {
      try {
        const { driverId, journeyId, deliveryId, latitude, longitude, speed, heading, accuracy, timestamp } = data || {};

        if (!driverId || !latitude || !longitude) {
          log("WARN", `driver:location — invalid data | socket: ${socket.id}`);
          return;
        }

        log("LOC", `From driver ${driverId} | lat: ${latitude} | lng: ${longitude} | speed: ${speed}`);

        // DB update (non-blocking)
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

        const adminRoomSockets = await io.in("admin-room").allSockets();
        if (adminRoomSockets.size === 0) {
          log("WARN", `No clients in admin-room!`);
        }

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

        // ✅ FIX: map update missing tha
        driverLocations.set(driverId, {
          latitude, longitude, speed: speed || 0, heading: heading || 0,
          timestamp: new Date().toISOString(), journeyId, deliveryId,
        });

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

    // driver:journey:location (alternative location event)
    socket.on("driver:journey:location", async (data) => {
      try {
        const { driverId, journeyId, deliveryId, latitude, longitude, speed, heading, status } = data || {};
        if (!driverId || !latitude || !longitude) return;

        const driverInfo = activeDrivers.get(driverId);
        io.to("admin-room").emit("driver:location:update", {
          driverId,
          driverName: driverInfo?.driverName || "Driver",
          vehicleNumber: driverInfo?.vehicleNumber || "N/A",
          journeyId,
          deliveryId,
          location: { latitude, longitude, speed: speed || 0, heading: heading || 0 },
          isAvailable: false,
          status: status || "In_transit",
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        log("ERR", `driver:journey:location | ${err.message}`);
      }
    });

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