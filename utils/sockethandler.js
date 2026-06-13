// ============================================================
// FILE: socketHandlers.js  (root/utils folder mein rakh do)
// CHANGES: Comprehensive logging add kiya debug ke liye
// ============================================================

const Driver = require("../models/Driver");
const Journey = require("../models/Journey");

const activeDrivers = new Map();
const driverLocations = new Map();

// ── Debug logger ───────────────────────────────────────────
const LOG_PREFIX = {
  SOCKET: "🔌 [SOCKET]",
  DRIVER: "🚗 [DRIVER]",
  ADMIN:  "👔 [ADMIN]",
  LOC:    "📍 [LOCATION]",
  EMIT:   "📤 [EMIT]",
  RECV:   "📥 [RECV]",
  ERR:    "❌ [ERROR]",
  WARN:   "⚠️  [WARN]",
  INFO:   "ℹ️  [INFO]",
};

function log(type, ...args) {
  console.log(`[${new Date().toISOString()}] ${LOG_PREFIX[type] || type}`, ...args);
}

function setupSocketHandlers(io) {
  io.activeDrivers = activeDrivers;
  io.driverLocations = driverLocations;

  // ── Log total connections every 30s ───────────────────────
  setInterval(() => {
    const connectedSockets = io.engine?.clientsCount || 0;
    log("INFO",
      `Active connections: ${connectedSockets} | ` +
      `Active drivers: ${activeDrivers.size} | ` +
      `Drivers with location: ${driverLocations.size}`
    );
  }, 30000);

  io.on("connection", (socket) => {
    log("SOCKET", `New client connected — socket.id: ${socket.id} | ` +
      `IP: ${socket.handshake.address} | ` +
      `Transport: ${socket.conn.transport.name}`
    );

    // ── Room join diagnostics ──────────────────────────────
    socket.onAny((eventName, ...args) => {
      log("RECV", `socket.id: ${socket.id} | event: "${eventName}" | ` +
        `data: ${JSON.stringify(args[0] || {}).substring(0, 200)}`
      );
    });

    // ─────────────────────────────────────────────
    // ADMIN: Join admin-room
    // ─────────────────────────────────────────────
    socket.on("join-admin-room", () => {
      socket.join("admin-room");
      log("ADMIN", `Admin joined admin-room | socket.id: ${socket.id}`);

      const driversList = Array.from(activeDrivers.values()).map((d) => ({
        ...d,
        location: driverLocations.get(d.driverId) || null,
      }));

      log("EMIT", `Sending admin:drivers:list to ${socket.id} | count: ${driversList.length}`);
      socket.emit("admin:drivers:list", driversList);

      // Admin ko confirm karo ki room join hua
      socket.emit("admin:room:joined", {
        message: "Successfully joined admin-room",
        activeDrivers: driversList.length,
        timestamp: new Date().toISOString(),
      });
    });

    // ─────────────────────────────────────────────
    // DRIVER: Online
    // ─────────────────────────────────────────────
    socket.on("driver:connect", async (data) => {
      try {
        const { driverId, driverName, vehicleNumber } = data || {};

        if (!driverId) {
          log("WARN", `driver:connect — driverId missing | socket: ${socket.id} | data: ${JSON.stringify(data)}`);
          return;
        }

        const existing = activeDrivers.get(driverId);
        if (existing) {
          log("WARN", `Driver reconnecting (was socket: ${existing.socketId}) → new socket: ${socket.id} | driverId: ${driverId}`);
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

        log("DRIVER", `Driver ONLINE | name: ${driverName} | vehicle: ${vehicleNumber} | socket: ${socket.id} | total active: ${activeDrivers.size}`);

        const payload = {
          driverId,
          driverName,
          vehicleNumber,
          status: "online",
          timestamp: new Date().toISOString(),
        };

        log("EMIT", `Emitting driver:online to admin-room | driverId: ${driverId}`);
        io.to("admin-room").emit("driver:online", payload);

        // Driver ko confirm karo
        socket.emit("driver:connect:ack", { success: true, message: "Connected to server", timestamp: new Date().toISOString() });
      } catch (err) {
        log("ERR", `driver:connect handler | socket: ${socket.id} | error: ${err.message}`);
      }
    });

    // ─────────────────────────────────────────────
    // DRIVER: Location update (MAIN live tracking)
    // ─────────────────────────────────────────────
    socket.on("driver:location", async (data) => {
      try {
        const { driverId, journeyId, deliveryId, latitude, longitude, speed, heading, accuracy, timestamp } = data || {};

        if (!driverId || !latitude || !longitude) {
          log("WARN", `driver:location — invalid data | socket: ${socket.id} | received: ${JSON.stringify(data).substring(0, 300)}`);
          return;
        }

        log("LOC", `Received from driver ${driverId} | lat: ${latitude} | lng: ${longitude} | speed: ${speed} | socket: ${socket.id}`);

        // 1. DB update (async, non-blocking)
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
          .catch((e) => log("ERR", `DB location save failed for driver ${driverId} | ${e.message}`));

        // 2. In-memory update
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
          log("WARN", `driver:location — driverId ${driverId} not in activeDrivers map! Driver did not call driver:connect first.`);
        }

        // 3. Admin broadcast
        const driverInfo = activeDrivers.get(driverId);
        const adminPayload = {
          driverId,
          driverName: driverInfo?.driverName || "Driver",
          vehicleNumber: driverInfo?.vehicleNumber || "N/A",
          journeyId,
          deliveryId,
          location: locationPayload,
          isAvailable: false,
          status: "In_transit",
          timestamp: new Date().toISOString(),
        };

        const adminRoomSockets = await io.in("admin-room").allSockets();
        log("EMIT", `Emitting driver:location:update to admin-room | ` +
          `driverId: ${driverId} | ` +
          `admin-room members: ${adminRoomSockets.size} | ` +
          `lat: ${latitude} | lng: ${longitude}`
        );

        if (adminRoomSockets.size === 0) {
          log("WARN", `No clients in admin-room! Location update has nobody to receive it. Is admin dashboard open and connected?`);
        }

        io.to("admin-room").emit("driver:location:update", adminPayload);

        // 4. Delivery-specific room
        if (deliveryId) {
          const deliveryRoomSockets = await io.in(`delivery-${deliveryId}`).allSockets();
          log("EMIT", `Emitting delivery:location:update | deliveryId: ${deliveryId} | members: ${deliveryRoomSockets.size}`);
          io.to(`delivery-${deliveryId}`).emit("delivery:location:update", {
            deliveryId,
            driverId,
            location: { latitude, longitude },
            speed,
            heading,
            timestamp: timestamp || new Date().toISOString(),
          });
        }

        // 5. Journey-specific room
        if (journeyId) {
          const journeyRoomSockets = await io.in(`journey-${journeyId}`).allSockets();
          log("EMIT", `Emitting journey:location:update | journeyId: ${journeyId} | members: ${journeyRoomSockets.size}`);
          io.to(`journey-${journeyId}`).emit("journey:location:update", {
            journeyId,
            driverId,
            location: { latitude, longitude, speed, heading, accuracy },
            timestamp: timestamp || new Date().toISOString(),
          });
        }
      } catch (err) {
        log("ERR", `driver:location handler | socket: ${socket.id} | error: ${err.stack}`);
      }
    });

    // ─────────────────────────────────────────────
    // DRIVER: Journey-specific location
    // ─────────────────────────────────────────────
    socket.on("driver:journey:location", async (data) => {
      try {
        const { driverId, journeyId, deliveryId, latitude, longitude, speed, heading, status } = data || {};
        if (!driverId || !latitude || !longitude) {
          log("WARN", `driver:journey:location — invalid data | ${JSON.stringify(data).substring(0, 200)}`);
          return;
        }

        log("LOC", `Journey location | driverId: ${driverId} | journeyId: ${journeyId} | lat: ${latitude} | lng: ${longitude}`);

        const driverInfo = activeDrivers.get(driverId);
        const payload = {
          driverId,
          driverName: driverInfo?.driverName || "Driver",
          vehicleNumber: driverInfo?.vehicleNumber || "N/A",
          journeyId,
          deliveryId,
          location: { latitude, longitude, speed: speed || 0, heading: heading || 0 },
          isAvailable: false,
          status: status || "In_transit",
          timestamp: new Date().toISOString(),
        };

        log("EMIT", `Emitting driver:location:update (journey) to admin-room | driverId: ${driverId}`);
        io.to("admin-room").emit("driver:location:update", payload);
      } catch (err) {
        log("ERR", `driver:journey:location | ${err.message}`);
      }
    });

    // ─────────────────────────────────────────────
    // JOURNEY: Room join/leave
    // ─────────────────────────────────────────────
    socket.on("join-journey", (journeyId) => {
      socket.join(`journey-${journeyId}`);
      log("INFO", `Client joined journey-${journeyId} | socket: ${socket.id}`);
    });

    socket.on("leave-journey", (journeyId) => {
      socket.leave(`journey-${journeyId}`);
      log("INFO", `Client left journey-${journeyId} | socket: ${socket.id}`);
    });

    // ─────────────────────────────────────────────
    // DELIVERY: Room join/leave
    // ─────────────────────────────────────────────
    socket.on("join-delivery", (deliveryId) => {
      socket.join(`delivery-${deliveryId}`);
      log("INFO", `Client joined delivery-${deliveryId} | socket: ${socket.id}`);
    });

    socket.on("leave-delivery", (deliveryId) => {
      socket.leave(`delivery-${deliveryId}`);
      log("INFO", `Client left delivery-${deliveryId} | socket: ${socket.id}`);
    });

    // ─────────────────────────────────────────────
    // JOURNEY EVENTS
    // ─────────────────────────────────────────────
    socket.on("driver:journey:started", (data) => {
      log("DRIVER", `Journey STARTED | journeyId: ${data?.journeyId} | driverId: ${data?.driverId}`);
      io.to("admin-room").emit("driver:journey:started", { ...data, timestamp: new Date().toISOString() });
    });

    socket.on("driver:journey:arrived", (data) => {
      log("DRIVER", `Journey ARRIVED | journeyId: ${data?.journeyId}`);
      io.to("admin-room").emit("driver:journey:arrived", { ...data, timestamp: new Date().toISOString() });
    });

    socket.on("driver:journey:ended", (data) => {
      const { driverId } = data || {};
      if (driverId) driverLocations.delete(driverId);
      log("DRIVER", `Journey ENDED | journeyId: ${data?.journeyId} | driverId: ${driverId}`);
      io.to("admin-room").emit("driver:journey:ended", { ...data, timestamp: new Date().toISOString() });
    });

    // ─────────────────────────────────────────────
    // DELIVERY COMPLETED
    // ─────────────────────────────────────────────
    socket.on("delivery:completed", async (data) => {
      try {
        const { driverId, deliveryId } = data || {};
        log("DRIVER", `Delivery COMPLETED | driverId: ${driverId} | deliveryId: ${deliveryId}`);
        driverLocations.delete(driverId);

        await Driver.findByIdAndUpdate(driverId, { isAvailable: true, currentJourney: null }).catch(() => {});

        io.to("admin-room").emit("driver:delivery:completed", {
          driverId,
          deliveryId,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        log("ERR", `delivery:completed | ${err.message}`);
      }
    });

    // ─────────────────────────────────────────────
    // CHAT
    // ─────────────────────────────────────────────
    socket.on("chat:join", (data) => {
      socket.join(`user-${data?.userId}`);
      log("INFO", `Chat join | userId: ${data?.userId} | socket: ${socket.id}`);
    });

    socket.on("chat:join-conversation", (data) => {
      socket.join(`conversation-${data?.conversationId}`);
      log("INFO", `Chat conversation join | conversationId: ${data?.conversationId}`);
    });

    socket.on("chat:typing", (data) => {
      const { conversationId, userId, isTyping } = data || {};
      socket.to(`conversation-${conversationId}`).emit("chat:typing", { userId, isTyping });
    });

    // ─────────────────────────────────────────────
    // NOTIFICATIONS
    // ─────────────────────────────────────────────
    socket.on("notifications:subscribe", (data) => {
      socket.join(`notifications-${data?.userId}`);
      log("INFO", `Notifications subscribe | userId: ${data?.userId}`);
    });

    // ─────────────────────────────────────────────
    // MAINTENANCE
    // ─────────────────────────────────────────────
    socket.on("driver-completed-service", async ({ scheduleId, driverName, vehicleNumber } = {}) => {
      try {
        const MaintenanceSchedule = require("./models/MaintenanceSchedule");
        const maintenance = await MaintenanceSchedule.findById(scheduleId).populate("vehicle");
        if (maintenance) {
          log("INFO", `Maintenance completed | scheduleId: ${scheduleId} | driver: ${driverName}`);
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

    // ─────────────────────────────────────────────
    // PING health check
    // ─────────────────────────────────────────────
    socket.on("ping:driver", (data) => {
      log("INFO", `Ping from ${socket.id}`);
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

        log("DRIVER", `Driver OFFLINE | name: ${driver.driverName} | driverId: ${driverId} | total active: ${activeDrivers.size}`);

        io.to("admin-room").emit("driver:offline", {
          driverId,
          driverName: driver.driverName,
          vehicleNumber: driver.vehicleNumber,
          status: "offline",
          timestamp: new Date().toISOString(),
        });
      }
    });

    socket.on("connect_error", (err) => {
      log("ERR", `connect_error | socket: ${socket.id} | ${err.message}`);
    });
  });

  // ── Broadcast helper for controllers ──────────────────────
  io.broadcastDriverLocation = async function (driverData, locationData) {
    const adminSockets = await io.in("admin-room").allSockets();
    log("EMIT", `broadcastDriverLocation (REST API) | ` +
      `driverId: ${driverData.driverId || driverData._id} | ` +
      `admin-room members: ${adminSockets.size}`
    );

    if (adminSockets.size === 0) {
      log("WARN", `broadcastDriverLocation — nobody in admin-room to receive!`);
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

  log("INFO", "✅ Socket handlers initialized with full logging");
  return { activeDrivers, driverLocations };
}

module.exports = setupSocketHandlers;