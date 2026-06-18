// // ============================================================
// // FILE: socketHandlers.js  (root/utils folder mein rakh do)
// // CHANGES: Comprehensive logging add kiya debug ke liye
// // ============================================================

// const Driver = require("../models/Driver");
// const Journey = require("../models/Journey");

// const activeDrivers = new Map();
// const driverLocations = new Map();

// // ── Debug logger ───────────────────────────────────────────
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

//   // ── Log total connections every 30s ───────────────────────
//   setInterval(() => {
//     const connectedSockets = io.engine?.clientsCount || 0;
//     log("INFO",
//       `Active connections: ${connectedSockets} | ` +
//       `Active drivers: ${activeDrivers.size} | ` +
//       `Drivers with location: ${driverLocations.size}`
//     );
//   }, 30000);

//   io.on("connection", (socket) => {
//     log("SOCKET", `New client connected — socket.id: ${socket.id} | ` +
//       `IP: ${socket.handshake.address} | ` +
//       `Transport: ${socket.conn.transport.name}`
//     );

//     // ── Room join diagnostics ──────────────────────────────
//     socket.onAny((eventName, ...args) => {
//       log("RECV", `socket.id: ${socket.id} | event: "${eventName}" | ` +
//         `data: ${JSON.stringify(args[0] || {}).substring(0, 200)}`
//       );
//     });

//     // ─────────────────────────────────────────────
//     // ADMIN: Join admin-room
//     // ─────────────────────────────────────────────
//     socket.on("join-admin-room", () => {
//       socket.join("admin-room");
//       log("ADMIN", `Admin joined admin-room | socket.id: ${socket.id}`);

//       const driversList = Array.from(activeDrivers.values()).map((d) => ({
//         ...d,
//         location: driverLocations.get(d.driverId) || null,
//       }));

//       log("EMIT", `Sending admin:drivers:list to ${socket.id} | count: ${driversList.length}`);
//       socket.emit("admin:drivers:list", driversList);

//       // Admin ko confirm karo ki room join hua
//       socket.emit("admin:room:joined", {
//         message: "Successfully joined admin-room",
//         activeDrivers: driversList.length,
//         timestamp: new Date().toISOString(),
//       });
//     });

//     // ─────────────────────────────────────────────
//     // DRIVER: Online
//     // ─────────────────────────────────────────────
//     socket.on("driver:connect", async (data) => {
//       try {
//         const { driverId, driverName, vehicleNumber } = data || {};

//         if (!driverId) {
//           log("WARN", `driver:connect — driverId missing | socket: ${socket.id} | data: ${JSON.stringify(data)}`);
//           return;
//         }

//         const existing = activeDrivers.get(driverId);
//         if (existing) {
//           log("WARN", `Driver reconnecting (was socket: ${existing.socketId}) → new socket: ${socket.id} | driverId: ${driverId}`);
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

//         log("DRIVER", `Driver ONLINE | name: ${driverName} | vehicle: ${vehicleNumber} | socket: ${socket.id} | total active: ${activeDrivers.size}`);

//         const payload = {
//           driverId,
//           driverName,
//           vehicleNumber,
//           status: "online",
//           timestamp: new Date().toISOString(),
//         };

//         log("EMIT", `Emitting driver:online to admin-room | driverId: ${driverId}`);
//         io.to("admin-room").emit("driver:online", payload);

//         // Driver ko confirm karo
//         socket.emit("driver:connect:ack", { success: true, message: "Connected to server", timestamp: new Date().toISOString() });
//       } catch (err) {
//         log("ERR", `driver:connect handler | socket: ${socket.id} | error: ${err.message}`);
//       }
//     });

//     // ─────────────────────────────────────────────
//     // DRIVER: Location update (MAIN live tracking)
//     // ─────────────────────────────────────────────
//     socket.on("driver:location", async (data) => {
//       try {
//         const { driverId, journeyId, deliveryId, latitude, longitude, speed, heading, accuracy, timestamp } = data || {};

//         if (!driverId || !latitude || !longitude) {
//           log("WARN", `driver:location — invalid data | socket: ${socket.id} | received: ${JSON.stringify(data).substring(0, 300)}`);
//           return;
//         }

//         log("LOC", `Received from driver ${driverId} | lat: ${latitude} | lng: ${longitude} | speed: ${speed} | socket: ${socket.id}`);

//         // 1. DB update (async, non-blocking)
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
//           .catch((e) => log("ERR", `DB location save failed for driver ${driverId} | ${e.message}`));

//         // 2. In-memory update
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
//           log("WARN", `driver:location — driverId ${driverId} not in activeDrivers map! Driver did not call driver:connect first.`);
//         }

//         // 3. Admin broadcast
//         const driverInfo = activeDrivers.get(driverId);
//         const adminPayload = {
//           driverId,
//           driverName: driverInfo?.driverName || "Driver",
//           vehicleNumber: driverInfo?.vehicleNumber || "N/A",
//           journeyId,
//           deliveryId,
//           location: locationPayload,
//           isAvailable: false,
//           status: "In_transit",
//           timestamp: new Date().toISOString(),
//         };

//         const adminRoomSockets = await io.in("admin-room").allSockets();
//         log("EMIT", `Emitting driver:location:update to admin-room | ` +
//           `driverId: ${driverId} | ` +
//           `admin-room members: ${adminRoomSockets.size} | ` +
//           `lat: ${latitude} | lng: ${longitude}`
//         );

//         if (adminRoomSockets.size === 0) {
//           log("WARN", `No clients in admin-room! Location update has nobody to receive it. Is admin dashboard open and connected?`);
//         }

//         io.to("admin-room").emit("driver:location:update", adminPayload);

//         // 4. Delivery-specific room
//         if (deliveryId) {
//           const deliveryRoomSockets = await io.in(`delivery-${deliveryId}`).allSockets();
//           log("EMIT", `Emitting delivery:location:update | deliveryId: ${deliveryId} | members: ${deliveryRoomSockets.size}`);
//           io.to(`delivery-${deliveryId}`).emit("delivery:location:update", {
//             deliveryId,
//             driverId,
//             location: { latitude, longitude },
//             speed,
//             heading,
//             timestamp: timestamp || new Date().toISOString(),
//           });
//         }

//         // 5. Journey-specific room
//         if (journeyId) {
//           const journeyRoomSockets = await io.in(`journey-${journeyId}`).allSockets();
//           log("EMIT", `Emitting journey:location:update | journeyId: ${journeyId} | members: ${journeyRoomSockets.size}`);
//           io.to(`journey-${journeyId}`).emit("journey:location:update", {
//             journeyId,
//             driverId,
//             location: { latitude, longitude, speed, heading, accuracy },
//             timestamp: timestamp || new Date().toISOString(),
//           });
//         }
//       } catch (err) {
//         log("ERR", `driver:location handler | socket: ${socket.id} | error: ${err.stack}`);
//       }
//     });

//     // ─────────────────────────────────────────────
//     // DRIVER: Journey-specific location
//     // ─────────────────────────────────────────────
//     socket.on("driver:journey:location", async (data) => {
//       try {
//         const { driverId, journeyId, deliveryId, latitude, longitude, speed, heading, status } = data || {};
//         if (!driverId || !latitude || !longitude) {
//           log("WARN", `driver:journey:location — invalid data | ${JSON.stringify(data).substring(0, 200)}`);
//           return;
//         }

//         log("LOC", `Journey location | driverId: ${driverId} | journeyId: ${journeyId} | lat: ${latitude} | lng: ${longitude}`);

//         const driverInfo = activeDrivers.get(driverId);
//         const payload = {
//           driverId,
//           driverName: driverInfo?.driverName || "Driver",
//           vehicleNumber: driverInfo?.vehicleNumber || "N/A",
//           journeyId,
//           deliveryId,
//           location: { latitude, longitude, speed: speed || 0, heading: heading || 0 },
//           isAvailable: false,
//           status: status || "In_transit",
//           timestamp: new Date().toISOString(),
//         };

//         log("EMIT", `Emitting driver:location:update (journey) to admin-room | driverId: ${driverId}`);
//         io.to("admin-room").emit("driver:location:update", payload);
//       } catch (err) {
//         log("ERR", `driver:journey:location | ${err.message}`);
//       }
//     });

//     // ─────────────────────────────────────────────
//     // JOURNEY: Room join/leave
//     // ─────────────────────────────────────────────
//     socket.on("join-journey", (journeyId) => {
//       socket.join(`journey-${journeyId}`);
//       log("INFO", `Client joined journey-${journeyId} | socket: ${socket.id}`);
//     });

//     socket.on("leave-journey", (journeyId) => {
//       socket.leave(`journey-${journeyId}`);
//       log("INFO", `Client left journey-${journeyId} | socket: ${socket.id}`);
//     });

//     // ─────────────────────────────────────────────
//     // DELIVERY: Room join/leave
//     // ─────────────────────────────────────────────
//     socket.on("join-delivery", (deliveryId) => {
//       socket.join(`delivery-${deliveryId}`);
//       log("INFO", `Client joined delivery-${deliveryId} | socket: ${socket.id}`);
//     });

//     socket.on("leave-delivery", (deliveryId) => {
//       socket.leave(`delivery-${deliveryId}`);
//       log("INFO", `Client left delivery-${deliveryId} | socket: ${socket.id}`);
//     });

//     // ─────────────────────────────────────────────
//     // JOURNEY EVENTS
//     // ─────────────────────────────────────────────
//     // socket.on("driver:journey:started", (data) => {
//     //   log("DRIVER", `Journey STARTED | journeyId: ${data?.journeyId} | driverId: ${data?.driverId}`);
//     //   io.to("admin-room").emit("driver:journey:started", { ...data, timestamp: new Date().toISOString() });
//     // });

//     socket.on("driver:journey:started", (data) => {
//       // ── CHANGE 1: sirf journeyId, deliveryId, location, status rakhna ──
//       const { journeyId, deliveryId, location, status } = data || {};
//       log("DRIVER", `Journey STARTED | journeyId: ${journeyId}`);
//       io.to("admin-room").emit("driver:journey:started", {
//         journeyId,
//         deliveryId,
//         location,
//         status: status || "In_transit",
//         timestamp: new Date().toISOString(),
//       });
//     });

//     socket.on("driver:journey:arrived", (data) => {
//       log("DRIVER", `Journey ARRIVED | journeyId: ${data?.journeyId}`);
//       io.to("admin-room").emit("driver:journey:arrived", { ...data, timestamp: new Date().toISOString() });
//     });

//     // socket.on("driver:journey:ended", (data) => {
//     //   const { driverId } = data || {};
//     //   if (driverId) driverLocations.delete(driverId);
//     //   log("DRIVER", `Journey ENDED | journeyId: ${data?.journeyId} | driverId: ${driverId}`);
//     //   io.to("admin-room").emit("driver:journey:ended", { ...data, timestamp: new Date().toISOString() });
//     // });

//     socket.on("driver:journey:ended", (data) => {
//       // ── CHANGE 2: sirf journeyId, deliveryId, location, status rakhna ──
//       const { driverId, journeyId, deliveryId, location, status } = data || {};
//       if (driverId) driverLocations.delete(driverId);
//       log("DRIVER", `Journey ENDED | journeyId: ${journeyId}`);
//       io.to("admin-room").emit("driver:journey:ended", {
//         journeyId,
//         deliveryId,
//         location,
//         status: status || "completed",
//         timestamp: new Date().toISOString(),
//       });
//     });

//     // ─────────────────────────────────────────────
//     // DELIVERY COMPLETED
//     // ─────────────────────────────────────────────
//     // socket.on("delivery:completed", async (data) => {
//     //   try {
//     //     const { driverId, deliveryId } = data || {};
//     //     log("DRIVER", `Delivery COMPLETED | driverId: ${driverId} | deliveryId: ${deliveryId}`);
//     //     driverLocations.delete(driverId);

//     //     await Driver.findByIdAndUpdate(driverId, { isAvailable: true, currentJourney: null }).catch(() => { });

//     //     io.to("admin-room").emit("driver:delivery:completed", {
//     //       driverId,
//     //       deliveryId,
//     //       timestamp: new Date().toISOString(),
//     //     });
//     //   } catch (err) {
//     //     log("ERR", `delivery:completed | ${err.message}`);
//     //   }
//     // });

//     // ─────────────────────────────────────────────
//     // DELIVERY COMPLETED
//     // ─────────────────────────────────────────────
//     socket.on("delivery:completed", async (data) => {
//       try {
//         console.log("📦 DELIVERY COMPLETED RECEIVED:", data);

//         const { driverId, deliveryId } = data || {};

//         if (!driverId) {
//           console.log("❌ driverId missing");
//           return;
//         }

//         console.log("🚗 driverId:", driverId);
//         console.log("📦 deliveryId:", deliveryId);

//         // Memory se location remove
//         driverLocations.delete(driverId);

//         // Driver Available karo
//         await Driver.findByIdAndUpdate(
//           driverId,
//           {
//             isAvailable: true,
//             currentJourney: null,
//             currentLocation: {
//               latitude: null,
//               longitude: null,
//               speed: 0,
//               heading: 0,
//               accuracy: 0,
//               lastUpdated: null
//             }
//           },
//           { new: true }
//         );

//         console.log("✅ Driver updated in DB");

//         // Admin dashboard ko notify
//         io.to("admin-room").emit("driver:delivery:completed", {
//           driverId: String(driverId),
//           deliveryId: String(deliveryId),
//           status: "completed",
//           timestamp: new Date().toISOString()
//         });

//         console.log("📤 driver:delivery:completed emitted");

//         // Marker remove karne ke liye offline event
//         io.to("admin-room").emit("driver:offline", {
//           driverId
//         });

//         console.log("📤 driver:offline emitted", {
//           driverId: String(driverId)
//         });

//       } catch (err) {
//         console.log("❌ DELIVERY COMPLETED ERROR:", err);
//       }
//     });

//     // ─────────────────────────────────────────────
//     // CHAT
//     // ─────────────────────────────────────────────
//     socket.on("chat:join", (data) => {
//       socket.join(`user-${data?.userId}`);
//       log("INFO", `Chat join | userId: ${data?.userId} | socket: ${socket.id}`);
//     });

//     socket.on("chat:join-conversation", (data) => {
//       socket.join(`conversation-${data?.conversationId}`);
//       log("INFO", `Chat conversation join | conversationId: ${data?.conversationId}`);
//     });

//     socket.on("chat:typing", (data) => {
//       const { conversationId, userId, isTyping } = data || {};
//       socket.to(`conversation-${conversationId}`).emit("chat:typing", { userId, isTyping });
//     });

//     // ─────────────────────────────────────────────
//     // NOTIFICATIONS
//     // ─────────────────────────────────────────────
//     socket.on("notifications:subscribe", (data) => {
//       socket.join(`notifications-${data?.userId}`);
//       log("INFO", `Notifications subscribe | userId: ${data?.userId}`);
//     });

//     // ─────────────────────────────────────────────
//     // MAINTENANCE
//     // ─────────────────────────────────────────────
//     socket.on("driver-completed-service", async ({ scheduleId, driverName, vehicleNumber } = {}) => {
//       try {
//         const MaintenanceSchedule = require("./models/MaintenanceSchedule");
//         const maintenance = await MaintenanceSchedule.findById(scheduleId).populate("vehicle");
//         if (maintenance) {
//           log("INFO", `Maintenance completed | scheduleId: ${scheduleId} | driver: ${driverName}`);
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

//     // ─────────────────────────────────────────────
//     // PING health check
//     // ─────────────────────────────────────────────
//     socket.on("ping:driver", (data) => {
//       log("INFO", `Ping from ${socket.id}`);
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

//         log("DRIVER", `Driver OFFLINE | name: ${driver.driverName} | driverId: ${driverId} | total active: ${activeDrivers.size}`);

//         io.to("admin-room").emit("driver:offline", {
//           driverId,
//           driverName: driver.driverName,
//           vehicleNumber: driver.vehicleNumber,
//           status: "offline",
//           timestamp: new Date().toISOString(),
//         });
//       }
//     });

//     socket.on("connect_error", (err) => {
//       log("ERR", `connect_error | socket: ${socket.id} | ${err.message}`);
//     });
//   });

//   // ── Broadcast helper for controllers ──────────────────────
//   io.broadcastDriverLocation = async function (driverData, locationData) {
//     const adminSockets = await io.in("admin-room").allSockets();
//     log("EMIT", `broadcastDriverLocation (REST API) | ` +
//       `driverId: ${driverData.driverId || driverData._id} | ` +
//       `admin-room members: ${adminSockets.size}`
//     );

//     if (adminSockets.size === 0) {
//       log("WARN", `broadcastDriverLocation — nobody in admin-room to receive!`);
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

//   log("INFO", "✅ Socket handlers initialized with full logging");
//   return { activeDrivers, driverLocations };
// }

// module.exports = setupSocketHandlers;



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
    socket.on("driver:connect", async (data) => {
      try {
        const { driverId, driverName, vehicleNumber } = data || {};

        if (!driverId) {
          log("WARN", `driver:connect — driverId missing | socket: ${socket.id}`);
          return;
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
      } catch (err) {
        log("ERR", `driver:connect | ${err.message}`);
      }
    });

    // ─────────────────────────────────────────────
    // STEP 3: DRIVER — driver:journey:started
    // FIX: DB mein Journey create karo, journeyId generate karo
    // ─────────────────────────────────────────────
    // socket.on("driver:journey:started", async (data) => {
    //   try {
    //     const { driverId, deliveryId, address } = data || {};

    //     // ✅ FIX: location nested object se nikalo — dono formats support karo
    //     // Format 1: { latitude, longitude }  (flat)
    //     // Format 2: { location: { latitude, longitude } }  (nested) ← driver app bhejta hai
    //     const latitude = data?.latitude ?? data?.location?.latitude;
    //     const longitude = data?.longitude ?? data?.location?.longitude;

    //     if (!driverId || !deliveryId) {
    //       log("WARN", `driver:journey:started — driverId/deliveryId missing | data: ${JSON.stringify(data)}`);
    //       socket.emit("journey:start:error", { message: "driverId and deliveryId required" });
    //       return;
    //     }

    //     if (!latitude || !longitude) {
    //       log("WARN", `driver:journey:started — location missing | received: ${JSON.stringify(data)}`);
    //       socket.emit("journey:start:error", { message: "latitude and longitude required" });
    //       return;
    //     }

    //     // ── Delivery check ──
    //     const delivery = await Delivery.findOne({
    //       _id: deliveryId,
    //       driverId: driverId,
    //       status: 'assigned',
    //     });

    //     if (!delivery) {
    //       log("WARN", `driver:journey:started — delivery not found or not assigned | deliveryId: ${deliveryId}`);
    //       socket.emit("journey:start:error", { message: "Delivery not found or not assigned to you" });
    //       return;
    //     }

    //     // ── Already started check ──
    //     const existingJourney = await Journey.findOne({
    //       deliveryId,
    //       status: { $in: ['Started', 'In_transit', 'In_progress'] },
    //     });

    //     if (existingJourney) {
    //       log("WARN", `driver:journey:started — journey already exists | journeyId: ${existingJourney._id}`);
    //       // Already started hai to existing journeyId bhejo
    //       socket.emit("journey:start:ack", {
    //         success: true,
    //         journeyId: existingJourney._id.toString(),
    //         deliveryId,
    //         status: existingJourney.status,
    //         message: "Journey already in progress",
    //       });
    //       return;
    //     }

    //     const locationData = {
    //       latitude: Number(latitude),
    //       longitude: Number(longitude),
    //       address: address || 'GPS Location',
    //       lastUpdated: new Date(),
    //     };

    //     // ── DB mein Journey create karo ──
    //     const journey = await Journey.create({
    //       deliveryId,
    //       driverId: driverId,
    //       startLocation: {
    //         coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
    //         address: address || 'Location captured via GPS',
    //       },
    //       startTime: new Date(),
    //       status: 'In_transit',
    //     });

    //     log("DRIVER", `Journey created in DB | journeyId: ${journey._id} | driverId: ${driverId}`);

    //     // ── Delivery status update ──
    //     delivery.status = 'In_transit';
    //     delivery.actualPickupTime = new Date();
    //     await delivery.save();

    //     await DeliveryStatusHistory.create({
    //       deliveryId: delivery._id,
    //       status: 'In_transit',
    //       location: {
    //         coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
    //         address: address || 'GPS Location',
    //       },
    //       remarks: 'Driver started journey via socket',
    //       updatedBy: { userId: driverId, userRole: 'driver', userName: activeDrivers.get(driverId)?.driverName || 'Driver' },
    //     });

    //     // ── Driver model update ──
    //     await Driver.findByIdAndUpdate(driverId, {
    //       currentJourney: journey._id,
    //       activeDelivery: delivery._id,
    //       currentLocation: locationData,
    //       lastLocationUpdate: new Date(),
    //     });

    //     // ── driverLocations update ──
    //     driverLocations.set(driverId, {
    //       ...locationData,
    //       journeyId: journey._id.toString(),
    //       deliveryId,
    //     });

    //     // ── activeDrivers mein journeyId save karo ──
    //     if (activeDrivers.has(driverId)) {
    //       const di = activeDrivers.get(driverId);
    //       activeDrivers.set(driverId, {
    //         ...di,
    //         journeyId: journey._id.toString(),
    //         deliveryId,
    //       });
    //     }

    //     // ── Driver ko journeyId bhejo (ACK) ──
    //     socket.emit("journey:start:ack", {
    //       success: true,
    //       journeyId: journey._id.toString(),
    //       deliveryId,
    //       status: 'In_transit',
    //       message: "Journey started successfully",
    //     });

    //     log("EMIT", `journey:start:ack sent to driver | journeyId: ${journey._id}`);

    //     // ── Admin ko broadcast karo ──
    //     const driverInfo = activeDrivers.get(driverId);
    //     io.to("admin-room").emit("driver:journey:started", {
    //       driverId,
    //       driverName: driverInfo?.driverName || "Driver",
    //       vehicleNumber: driverInfo?.vehicleNumber || "N/A",
    //       journeyId: journey._id.toString(),
    //       deliveryId,
    //       location: locationData,
    //       status: "In_transit",
    //       timestamp: new Date().toISOString(),
    //     });

    //     // ── Admin ko initial location update bhi bhejo ──
    //     io.to("admin-room").emit("driver:location:update", {
    //       driverId,
    //       driverName: driverInfo?.driverName || "Driver",
    //       vehicleNumber: driverInfo?.vehicleNumber || "N/A",
    //       journeyId: journey._id.toString(),
    //       deliveryId,
    //       location: locationData,
    //       isAvailable: false,
    //       status: "In_transit",
    //       timestamp: new Date().toISOString(),
    //     });

    //   } catch (err) {
    //     log("ERR", `driver:journey:started | ${err.stack}`);
    //     socket.emit("journey:start:error", { message: "Server error while starting journey" });
    //   }
    // });

    // ─────────────────────────────────────────────
    // STEP 3: DRIVER — driver:journey:started
    // FIX: Proper ACK callback pattern
    // ─────────────────────────────────────────────
    socket.on("driver:journey:started", async (data, callback) => {
      try {
        const { driverId, deliveryId, address } = data || {};

        const latitude = data?.latitude ?? data?.location?.latitude;
        const longitude = data?.longitude ?? data?.location?.longitude;

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

    // ─────────────────────────────────────────────
    // STEP 5 (FIXED): DRIVER — driver:journey:ended
    // FIX: DB mein Journey + Delivery status update karo
    // ─────────────────────────────────────────────
    // socket.on("driver:journey:ended", async (data) => {
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

    //     // ── FIX: DB update — Journey status update karo ──
    //     if (journeyId) {
    //       try {
    //         const endLocation = latitude && longitude ? {
    //           coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
    //           address: address || "Driver ended journey",
    //         } : undefined;

    //         const journeyUpdate = {
    //           status: "completed",
    //           endTime: new Date(),
    //           ...(endLocation && { endLocation }),
    //         };

    //         await Journey.findByIdAndUpdate(journeyId, journeyUpdate, { new: false });
    //         log("INFO", `Journey DB updated to completed | journeyId: ${journeyId}`);
    //       } catch (dbErr) {
    //         log("ERR", `Journey DB update failed | ${dbErr.message}`);
    //       }
    //     }

    //     // ── FIX: DB update — Delivery status update karo ──
    //     if (deliveryId) {
    //       try {
    //         await Delivery.findByIdAndUpdate(
    //           deliveryId,
    //           { status: "delivered", actualDeliveryTime: new Date() },
    //           { new: false }
    //         );

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
    //         });

    //         log("INFO", `Delivery DB updated to delivered | deliveryId: ${deliveryId}`);
    //       } catch (dbErr) {
    //         log("ERR", `Delivery DB update failed | ${dbErr.message}`);
    //       }
    //     }

    //     // ── FIX: Driver ko available mark karo ──
    //     if (driverId) {
    //       try {
    //         await Driver.findByIdAndUpdate(
    //           driverId,
    //           {
    //             isAvailable: true,
    //             currentJourney: null,
    //             "currentLocation.latitude": null,
    //             "currentLocation.longitude": null,
    //             "currentLocation.lastUpdated": null,
    //           },
    //           { new: false }
    //         );
    //         log("INFO", `Driver ${driverId} marked available in DB`);
    //       } catch (dbErr) {
    //         log("ERR", `Driver DB update failed | ${dbErr.message}`);
    //       }
    //     }

    //     // ── Admin ko broadcast karo — driverId clearly bhejo ──
    //     io.to("admin-room").emit("driver:journey:ended", {
    //       driverId,
    //       journeyId,
    //       deliveryId,
    //       location: latitude && longitude ? { latitude, longitude, address } : null,
    //       status: "completed",
    //       timestamp: new Date().toISOString(),
    //     });

    //   } catch (err) {
    //     log("ERR", `driver:journey:ended | ${err.message}`);
    //   }
    // });


    // socket.on("driver:journey:ended", async (data) => {
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
    //     if (journeyId) {
    //       await Journey.findByIdAndUpdate(
    //         journeyId,
    //         {
    //           status: "completed",
    //           endTime: new Date(),
    //           ...(latitude && longitude && {
    //             endLocation: {
    //               coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
    //               address: address || "Journey ended",
    //             },
    //           }),
    //         },
    //         { new: false }
    //       ).catch(e => log("ERR", `Journey update failed | ${e.message}`));
    //     }

    //     // ── Delivery DB update + Order update ──
    //     if (deliveryId) {
    //       try {
    //         const delivery = await Delivery.findByIdAndUpdate(
    //           deliveryId,
    //           { status: "delivered", actualDeliveryTime: new Date() },
    //           { new: true }  // new: true — updated delivery chahiye orderId ke liye
    //         );

    //         log("INFO", `Delivery marked delivered | deliveryId: ${deliveryId}`);

    //         // ✅ FIX: orderId string ho sakta hai (orderNumber) ya ObjectId
    //         // Dono cases handle karo
    //         if (delivery?.orderId) {
    //           const orderQuery = mongoose.Types.ObjectId.isValid(delivery.orderId)
    //             ? { _id: delivery.orderId }           // ObjectId hai
    //             : { orderNumber: delivery.orderId };  // String orderNumber hai jaise "ORD2606180003"

    //           const updatedOrder = await Order.findOneAndUpdate(
    //             orderQuery,
    //             {
    //               status: "delivered",
    //               updatedAt: new Date(),
    //             },
    //             { new: true }
    //           );

    //           if (updatedOrder) {
    //             log("INFO", `Order marked delivered | orderId: ${delivery.orderId} | orderNumber: ${updatedOrder.orderNumber}`);
    //           } else {
    //             log("WARN", `Order NOT found | orderId value: ${delivery.orderId}`);
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
    //         }).catch(e => log("ERR", `DeliveryStatusHistory create failed | ${e.message}`));

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

    //     // ── Admin broadcast ──
    //     io.to("admin-room").emit("driver:journey:ended", {
    //       driverId,
    //       journeyId,
    //       deliveryId,
    //       location: latitude && longitude ? { latitude, longitude, address } : null,
    //       status: "completed",
    //       timestamp: new Date().toISOString(),
    //     });

    //   } catch (err) {
    //     log("ERR", `driver:journey:ended | ${err.message}`);
    //   }
    // });

    socket.on("driver:journey:ended", async (data, callback) => {
      try {
        const { driverId, journeyId, deliveryId, latitude, longitude, address } = data || {};

        // ── Memory cleanup ──
        if (driverId) {
          driverLocations.delete(driverId);
          if (activeDrivers.has(driverId)) {
            const di = activeDrivers.get(driverId);
            activeDrivers.set(driverId, { ...di, journeyId: null, deliveryId: null });
          }
        }

        log("DRIVER", `Journey ENDED | journeyId: ${journeyId} | driverId: ${driverId}`);

        // ── Journey DB update ──
        if (journeyId) {
          await Journey.findByIdAndUpdate(
            journeyId,
            {
              status: "completed",
              endTime: new Date(),
              ...(latitude && longitude && {
                endLocation: {
                  coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
                  address: address || "Journey ended",
                },
              }),
            },
            { new: false }
          ).catch(e => log("ERR", `Journey update failed | ${e.message}`));
        }

        // ── Delivery DB update + Order update ──
        if (deliveryId) {
          try {
            const delivery = await Delivery.findByIdAndUpdate(
              deliveryId,
              { status: "delivered", actualDeliveryTime: new Date() },
              { new: true }
            );

            log("INFO", `Delivery marked delivered | deliveryId: ${deliveryId}`);

            if (delivery?.orderId) {
              const orderQuery = mongoose.Types.ObjectId.isValid(delivery.orderId)
                ? { _id: delivery.orderId }
                : { orderNumber: delivery.orderId };

              const updatedOrder = await Order.findOneAndUpdate(
                orderQuery,
                { status: "delivered", updatedAt: new Date() },
                { new: true }
              );

              if (updatedOrder) {
                log("INFO", `Order marked delivered | orderNumber: ${updatedOrder.orderNumber}`);
              } else {
                log("WARN", `Order NOT found | orderId value: ${delivery.orderId}`);
              }
            }

            await DeliveryStatusHistory.create({
              deliveryId,
              status: "delivered",
              location: latitude && longitude ? {
                coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
                address: address || "Delivery location",
              } : undefined,
              remarks: "Journey ended by driver via socket",
              updatedBy: {
                userId: driverId,
                userRole: "driver",
                userName: activeDrivers.get(driverId)?.driverName || "Driver",
              },
            }).catch(e => log("ERR", `DeliveryStatusHistory failed | ${e.message}`));

          } catch (dbErr) {
            log("ERR", `Delivery/Order DB update failed | ${dbErr.message}`);
          }
        }

        // ── Driver available mark karo ──
        if (driverId) {
          await Driver.findByIdAndUpdate(
            driverId,
            {
              isAvailable: true,
              currentJourney: null,
              activeDelivery: null,
              "currentLocation.latitude": null,
              "currentLocation.longitude": null,
              "currentLocation.lastUpdated": null,
            },
            { new: false }
          ).catch(e => log("ERR", `Driver update failed | ${e.message}`));

          log("INFO", `Driver ${driverId} marked available`);
        }

        // ── Admin broadcast ──
        io.to("admin-room").emit("driver:journey:ended", {
          driverId,
          journeyId,
          deliveryId,
          location: latitude && longitude ? { latitude, longitude, address } : null,
          status: "completed",
          timestamp: new Date().toISOString(),
        });

        // ✅ ACK callback — frontend ko confirm karo
        if (typeof callback === 'function') {
          callback({ success: true, message: "Journey ended successfully" });
        }

      } catch (err) {
        log("ERR", `driver:journey:ended | ${err.message}`);
        if (typeof callback === 'function') {
          callback({ success: false, message: "Server error while ending journey" });
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