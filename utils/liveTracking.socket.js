// ============================================================
// FILE: utils/liveTracking.socket.js
// Driver app se is file ko import karo aur tracking start karo
// ============================================================

const { io: socketIOClient } = require("socket.io-client");

const SERVER_URL = process.env.SOCKET_SERVER_URL || "http://localhost:8000";

let socket = null;
let trackingInterval = null;
let isConnected = false;

/**
 * Driver ka socket connect karo
 * @param {Object} driverInfo - { driverId, driverName, vehicleNumber }
 */
function connectDriverSocket(driverInfo) {
  if (socket && isConnected) {
    console.log("[SOCKET] Already connected");
    return socket;
  }

  socket = socketIOClient(SERVER_URL, {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
    timeout: 20000,
  });

  socket.on("connect", () => {
    isConnected = true;
    console.log("[SOCKET] Connected:", socket.id);

    // Admin room ko bata do driver online hai
    socket.emit("driver:connect", {
      driverId: driverInfo.driverId,
      driverName: driverInfo.driverName,
      vehicleNumber: driverInfo.vehicleNumber || "N/A",
    });
  });

  socket.on("disconnect", (reason) => {
    isConnected = false;
    console.log("[SOCKET] Disconnected:", reason);
  });

  socket.on("connect_error", (err) => {
    console.error("[SOCKET] Connection error:", err.message);
  });

  socket.on("reconnect", (attempt) => {
    console.log("[SOCKET] Reconnected after", attempt, "attempts");
    // Reconnect ke baad phir se driver:connect bhejo
    socket.emit("driver:connect", {
      driverId: driverInfo.driverId,
      driverName: driverInfo.driverName,
      vehicleNumber: driverInfo.vehicleNumber || "N/A",
    });
  });

  return socket;
}

/**
 * Real-time location tracking start karo
 * @param {Object} options
 * @param {string} options.driverId
 * @param {string} options.journeyId
 * @param {string} options.deliveryId
 * @param {Function} options.getLocation - async function jo { latitude, longitude, speed, heading, accuracy } return kare
 * @param {number} options.intervalMs - default 5000 (5 seconds)
 */
function startLiveTracking(options) {
  const {
    driverId,
    journeyId,
    deliveryId,
    getLocation,
    intervalMs = 5000,
  } = options;

  if (!socket || !isConnected) {
    console.error("[TRACKING] Socket not connected. Call connectDriverSocket() first.");
    return;
  }

  if (trackingInterval) {
    console.warn("[TRACKING] Tracking already running. Stopping old one.");
    stopLiveTracking();
  }

  console.log(`[TRACKING] Starting live tracking for journey: ${journeyId}`);

  // Pehli baar turant bhejo
  _emitLocation({ driverId, journeyId, deliveryId, getLocation });

  // Phir har intervalMs seconds baad
  trackingInterval = setInterval(() => {
    _emitLocation({ driverId, journeyId, deliveryId, getLocation });
  }, intervalMs);
}

async function _emitLocation({ driverId, journeyId, deliveryId, getLocation }) {
  try {
    const locationData = await getLocation();

    if (!locationData || !locationData.latitude || !locationData.longitude) {
      console.warn("[TRACKING] Invalid location data, skipping emit");
      return;
    }

    const payload = {
      driverId,
      journeyId,
      deliveryId,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      speed: locationData.speed || 0,
      heading: locationData.heading || 0,
      accuracy: locationData.accuracy || 0,
      timestamp: new Date().toISOString(),
    };

    // Socket se emit karo (HTTP call nahi)
    socket.emit("driver:location", payload);

    // Alag event bhi bhejo for journey-specific room
    socket.emit("driver:journey:location", {
      ...payload,
      status: "In_transit",
    });

    console.log(
      `[TRACKING] Emitted: ${locationData.latitude}, ${locationData.longitude}`
    );
  } catch (err) {
    console.error("[TRACKING] Error emitting location:", err.message);
  }
}

/**
 * Live tracking band karo
 */
function stopLiveTracking() {
  if (trackingInterval) {
    clearInterval(trackingInterval);
    trackingInterval = null;
    console.log("[TRACKING] Stopped live tracking");
  }
}

/**
 * Journey status update bhejo (start, arrived, completed, etc.)
 * @param {string} event - socket event name
 * @param {Object} data
 */
function emitJourneyEvent(event, data) {
  if (!socket || !isConnected) {
    console.warn("[SOCKET] Not connected, cannot emit:", event);
    return;
  }
  socket.emit(event, data);
  console.log(`[SOCKET] Emitted event: ${event}`);
}

/**
 * Socket disconnect karo (journey end hone ke baad)
 */
function disconnectSocket() {
  stopLiveTracking();
  if (socket) {
    socket.disconnect();
    socket = null;
    isConnected = false;
    console.log("[SOCKET] Socket disconnected");
  }
}

/**
 * Current connection status
 */
function getConnectionStatus() {
  return {
    isConnected,
    socketId: socket?.id || null,
  };
}

module.exports = {
  connectDriverSocket,
  startLiveTracking,
  stopLiveTracking,
  emitJourneyEvent,
  disconnectSocket,
  getConnectionStatus,
};