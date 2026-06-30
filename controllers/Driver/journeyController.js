const mongoose = require("mongoose");
const Journey = require('../../models/Journey');
const Delivery = require('../../models/Delivery');
const Driver = require('../../models/Driver');
const Remark = require("../../models/Remark");
const Order = require("../../models/Order");
const DeliveryStatusHistory = require('../../models/DeliveryStatusHistory');
const { successResponse, errorResponse } = require('../../utils/responseHelper');
const { calculateDistance } = require('../../utils/geoHelper');
const { logDriverActivity } = require("../../utils/activityLogger");
const axios = require("axios");

// ─── Helper: io safe getter ────────────────────────────────
// req.app.get('io') ke bajaye yeh use karo — never throws
function getIO(req) {
  return req?.app?.get('io') || global.io || null;
}

// ─── Helper: admin-room broadcast ─────────────────────────
function broadcastToAdmin(req, event, payload) {
  const io = getIO(req);
  if (io) {
    io.to('admin-room').emit(event, {
      ...payload,
      timestamp: new Date().toISOString(),
    });
  }
}

function toRadians(deg) { return deg * Math.PI / 180; }
function toDegrees(rad) { return rad * 180 / Math.PI; }

function calculateBearing(startLat, startLng, destLat, destLng) {
  startLat = toRadians(startLat); startLng = toRadians(startLng);
  destLat = toRadians(destLat); destLng = toRadians(destLng);
  const y = Math.sin(destLng - startLng) * Math.cos(destLat);
  const x = Math.cos(startLat) * Math.sin(destLat) -
    Math.sin(startLat) * Math.cos(destLat) * Math.cos(destLng - startLng);
  return ((toDegrees(Math.atan2(y, x)) + 360) % 360);
}

// ==================== UPDATE JOURNEY LOCATION ====================
// Driver app se yeh API + socket dono call honge
exports.updateJourneyLocation = async (req, res) => {
  try {
    const { journeyId } = req.params;
    const { latitude, longitude, address, speed, heading } = req.body;

    if (!latitude || !longitude) {
      return errorResponse(res, 'Latitude and longitude are required', 400);
    }

    const driver = req.user;
    const journey = await Journey.findById(journeyId);

    if (!journey) return errorResponse(res, 'Journey not found', 404);

    if (journey.driverId.toString() !== driver._id.toString()) {
      return errorResponse(res, 'Unauthorized', 403);
    }

    if (!['Started', 'In_transit', 'In_progress', 'assigned', 'Arrived'].includes(journey.status)) {
      return errorResponse(res, 'Journey is not active', 400);
    }

    const newLat = Number(latitude);
    const newLng = Number(longitude);
    const newTime = new Date();

    // ── Speed & Heading auto-calculate if not provided ──
    const previousDriver = await Driver.findById(driver._id).select('currentLocation');
    let calcSpeed = speed ? Number(speed) : undefined;
    let calcHeading = heading ? Number(heading) : undefined;

    if (
      previousDriver?.currentLocation?.latitude &&
      previousDriver?.currentLocation?.longitude &&
      previousDriver?.currentLocation?.lastUpdated
    ) {
      const oldLat = previousDriver.currentLocation.latitude;
      const oldLng = previousDriver.currentLocation.longitude;
      const oldTime = previousDriver.currentLocation.lastUpdated;
      const dist = calculateDistance(oldLat, oldLng, newLat, newLng);
      const timeDiffHours = (newTime - oldTime) / 3600000;

      if (!speed && timeDiffHours > 0) {
        calcSpeed = dist / timeDiffHours;
      }
      if (!heading) {
        calcHeading = calculateBearing(oldLat, oldLng, newLat, newLng);
      }
    }

    const locationData = {
      latitude: newLat,
      longitude: newLng,
      address: address || 'GPS Location',
      speed: calcSpeed !== undefined ? Number(calcSpeed.toFixed(1)) : 0,
      heading: calcHeading !== undefined ? Number(calcHeading.toFixed(1)) : 0,
      lastUpdated: newTime,
    };

    // ── DB Update ──
    await Driver.findByIdAndUpdate(
      driver._id,
      { currentLocation: locationData, lastLocationUpdate: newTime },
      { new: false }
    );

    // ── Socket Broadcast (MAIN live tracking) ──
    broadcastToAdmin(req, 'driver:location:update', {
      driverId: driver._id.toString(),
      driverName: driver.name,
      vehicleNumber: driver.vehicleNumber || driver.vehicle?.vehicleNumber || 'N/A',
      journeyId: journey._id.toString(),
      deliveryId: journey.deliveryId?.toString(),
      location: locationData,
      isAvailable: false,
      status: journey.status,
    });

    // Journey-specific room ko bhi emit karo
    const io = getIO(req);
    if (io) {
      io.to(`journey-${journeyId}`).emit('journey:location:update', {
        journeyId,
        driverId: driver._id.toString(),
        location: locationData,
        status: journey.status,
        timestamp: newTime.toISOString(),
      });
    }

    return successResponse(res, 'Location updated successfully', {
      location: locationData,
      journeyStatus: journey.status,
    });

  } catch (error) {
    console.error('❌ Update Journey Location Error:', error);
    return errorResponse(res, 'Failed to update location', 500);
  }
};

// ==================== START JOURNEY ====================
exports.startJourney = async (req, res) => {
  try {
    const { deliveryId, latitude, longitude, address } = req.body;

    if (!deliveryId || latitude === undefined || longitude === undefined) {
      return errorResponse(res, 'deliveryId, latitude and longitude are required', 400);
    }

    const driver = req.user;
    if (!driver) return errorResponse(res, 'Driver not authenticated', 401);

    const delivery = await Delivery.findOne({
      _id: deliveryId,
      driverId: driver._id,
      status: 'assigned',
    });
    if (!delivery) return errorResponse(res, 'Delivery not found or not assigned to you', 404);

    const existingJourney = await Journey.findOne({
      deliveryId,
      status: { $in: ['Started', 'In_transit', 'In_progress'] },
    });
    if (existingJourney) return errorResponse(res, 'Journey already started', 400);

    const journey = await Journey.create({
      deliveryId,
      driverId: driver._id,
      startLocation: {
        coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
        address: address || 'Location captured via GPS',
      },
      startTime: new Date(),
      status: 'In_transit',
    });

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
      remarks: 'Driver started journey - Package picked up',
      updatedBy: { userId: driver._id, userRole: 'driver', userName: driver.name },
    });

    const locationData = {
      latitude: Number(latitude),
      longitude: Number(longitude),
      address: address || 'GPS Location',
      lastUpdated: new Date(),
    };

    await Driver.findByIdAndUpdate(driver._id, {
      currentJourney: journey._id,
      activeDelivery: delivery._id,
      currentLocation: locationData,
      lastLocationUpdate: new Date(),
    });

    // ── Socket: Journey started + location ──
    broadcastToAdmin(req, 'driver:journey:started', {
      driverId: driver._id.toString(),
      driverName: driver.name,
      vehicleNumber: driver.vehicleNumber || 'N/A',
      journeyId: journey._id.toString(),
      deliveryId: delivery._id.toString(),
      location: locationData,
      isAvailable: false,
      status: 'In_transit',
    });

    broadcastToAdmin(req, 'driver:location:update', {
      driverId: driver._id.toString(),
      driverName: driver.name,
      vehicleNumber: driver.vehicleNumber || 'N/A',
      journeyId: journey._id.toString(),
      deliveryId: delivery._id.toString(),
      location: locationData,
      isAvailable: false,
      status: 'In_transit',
    });

    try {
      await logDriverActivity(
        driver._id,
        'JOURNEY_STARTED',
        {
          journeyId: journey._id.toString(),
          deliveryId: delivery._id.toString(),
          trackingNumber: delivery.trackingNumber || 'N/A',
          startLocation: { latitude: Number(latitude), longitude: Number(longitude), address: address || 'GPS' },
          startTime: new Date().toISOString(),
        },
        req
      );
    } catch (logError) {
      console.error('Log error:', logError.message);
    }

    return successResponse(res, 'Journey started successfully! Package picked up.', {
      journeyId: journey._id,
      deliveryStatus: delivery.status,
      trackingNumber: delivery.trackingNumber,
      pickupTime: delivery.actualPickupTime,
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
    if (!deliveryId) return errorResponse(res, 'deliveryId is required', 400);

    const driver = req.user;
    if (!driver) return errorResponse(res, 'Driver not authenticated', 401);

    const delivery = await Delivery.findOne({ _id: deliveryId, driverId: driver._id });
    if (!delivery) return errorResponse(res, 'Delivery not found or not assigned to you', 404);

    const journey = await Journey.findOne({
      deliveryId,
      driverId: driver._id,
      status: { $in: ['Started', 'In_transit', 'In_progress', 'Picked_up', 'Arrived', "Proof_uploaded"] },
    }).populate('deliveryId', 'trackingNumber recipientName recipientPhone recipientAddress');

    if (!journey) return errorResponse(res, 'No active journey found for this delivery', 404);

    await Driver.findByIdAndUpdate(driver._id, {
      isAvailable: false,
      currentJourney: journey._id,
      activeDelivery: delivery._id,
    });

    try {
      await logDriverActivity(driver._id, 'JOURNEY_CONTINUED', {
        journeyId: journey._id.toString(),
        deliveryId: delivery._id.toString(),
        trackingNumber: delivery.trackingNumber || 'N/A',
        currentStatus: journey.status,
        continuedAt: new Date().toISOString(),
      }, req);
    } catch (logError) {
      console.error('Log error:', logError.message);
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
        address: delivery.recipientAddress,
      },
      waypoints: journey.waypoints || [],
      totalDistance: journey.totalDistance || 0,
      totalDuration: journey.totalDuration || 0,
    });

  } catch (error) {
    console.error('Continue Journey Error:', error.message);
    return errorResponse(res, error.message || 'Failed to continue journey', 500);
  }
};

// ==================== GET ACTIVE JOURNEY BY DELIVERY ID ====================
exports.getActiveJourneyByDeliveryId = async (req, res) => {
  try {
    const { deliveryId } = req.params;
    if (!deliveryId) return errorResponse(res, 'deliveryId is required', 400);

    const driver = req.user;
    if (!driver) return errorResponse(res, 'Driver not authenticated', 401);

    const journey = await Journey.findOne({
      deliveryId,
      driverId: driver._id,
      status: { $in: ['Started', 'In_transit', 'In_progress', 'Picked_up'] },
    })
      .populate('deliveryId', 'trackingNumber recipientName recipientPhone recipientAddress estimatedDeliveryTime')
      .populate('driverId', 'name phone vehicle');

    if (!journey) return errorResponse(res, 'No active journey found for this delivery', 404);

    return successResponse(res, 'Active journey retrieved successfully', { journey, isActive: true });
  } catch (error) {
    return errorResponse(res, error.message || 'Failed to get active journey', 500);
  }
};

// ==================== ADD CHECKPOINT ====================
exports.addCheckpoint = async (req, res) => {
  try {
    const { journeyId } = req.params;
    const { latitude, longitude, address, activity, remarks } = req.body;

    if (!latitude || !longitude) return errorResponse(res, 'Location (latitude & longitude) is required', 400);

    const driver = req.user;
    const journey = await Journey.findById(journeyId);
    if (!journey) return errorResponse(res, 'Journey not found', 404);
    if (journey.driverId.toString() !== driver._id.toString()) return errorResponse(res, 'Unauthorized', 403);
    if (!['started', 'in_progress', 'In_transit', 'Started'].includes(journey.status)) {
      return errorResponse(res, 'Journey is not active', 400);
    }

    const checkpoint = {
      location: {
        coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
        address: address || 'Checkpoint location',
      },
      timestamp: new Date(),
      activity: activity || 'checkpoint',
      remarks: remarks || '',
    };

    journey.waypoints.push(checkpoint);
    await journey.save();

    const delivery = await Delivery.findById(journey.deliveryId);
    if (delivery) {
      await DeliveryStatusHistory.create({
        deliveryId: delivery._id,
        status: 'In_transit',
        location: {
          coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
          address: address || 'Checkpoint',
        },
        remarks: remarks || `Driver added checkpoint: ${activity}`,
        updatedBy: { userId: driver._id, userRole: 'driver', userName: driver.name },
      });
    }

    return successResponse(res, 'Checkpoint added successfully', {
      checkpointIndex: journey.waypoints.length - 1,
      checkpoint,
      totalCheckpoints: journey.waypoints.length,
    });
  } catch (error) {
    return errorResponse(res, error.message || 'Failed to add checkpoint', 500);
  }
};

// ==================== ADD JOURNEY IMAGE ====================
exports.addJourneyImage = async (req, res) => {
  try {
    const { journeyId } = req.params;
    const { caption, latitude, longitude, imageType } = req.body;

    if (!req.file) return errorResponse(res, 'Image file is required', 400);

    const journey = await Journey.findById(journeyId);
    if (!journey) return errorResponse(res, 'Journey not found', 404);

    const driver = req.user;
    if (journey.driverId.toString() !== driver._id.toString()) return errorResponse(res, 'Unauthorized', 403);

    const imageData = {
      url: `/uploads/journey/${req.file.filename}`,
      caption: caption || 'Journey image',
      timestamp: new Date(),
      imageType: imageType || 'general',
    };

    if (latitude && longitude) {
      imageData.location = { latitude: parseFloat(latitude), longitude: parseFloat(longitude) };
    }

    journey.images.push(imageData);
    await journey.save();

    return successResponse(res, 'Image added to journey successfully!', {
      image: journey.images[journey.images.length - 1],
      totalImages: journey.images.length,
    });
  } catch (error) {
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
    if (!journey) return errorResponse(res, 'Journey not found', 404);
    if (journey.driverId.toString() !== driver._id.toString()) return errorResponse(res, 'Unauthorized', 403);
    if (!journey.isActive()) return errorResponse(res, 'Journey is not active', 400);

    const delivery = await Delivery.findById(journey.deliveryId)
      .populate('customerId', 'phoneNumber phone name fullName');
    if (!delivery) return errorResponse(res, 'Delivery not found', 404);

    const phoneNumber = providedPhone || delivery.customerId?.phoneNumber || delivery.customerId?.phone;
    if (!phoneNumber) return errorResponse(res, 'Customer phone number not found', 400);

    const finalContactName = contactName || delivery.customerId?.name || delivery.customerId?.fullName || 'Customer';

    journey.communicationLog.push({
      type: 'call',
      phoneNumber,
      contactName: finalContactName,
      timestamp: new Date(),
      duration: 0,
    });
    await journey.save();

    return successResponse(res, 'Call initiated successfully', {
      callId: journey.communicationLog[journey.communicationLog.length - 1]._id,
      phoneNumber,
      callUrl: `tel:${phoneNumber}`,
      contactName: finalContactName,
      totalCalls: journey.communicationLog.filter(l => l.type === 'call').length,
    });
  } catch (error) {
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
    if (!journey) return errorResponse(res, 'Journey not found', 404);
    if (journey.driverId.toString() !== driver._id.toString()) return errorResponse(res, 'Unauthorized', 403);

    const callLog = journey.communicationLog.id(callId);
    if (!callLog) return errorResponse(res, 'Call log not found', 404);

    callLog.duration = duration || 0;
    callLog.status = status || 'completed';
    await journey.save();

    return successResponse(res, 'Call ended and logged successfully', {
      callId: callLog._id,
      duration: `${duration} seconds`,
      status: callLog.status,
    });
  } catch (error) {
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
      .populate({ path: 'deliveryId', populate: { path: 'customerId', select: 'phone name fullName' } });

    if (!journey) return errorResponse(res, 'Journey not found', 404);
    if (journey.driverId.toString() !== driver._id.toString()) return errorResponse(res, 'Unauthorized', 403);
    if (!journey.isActive()) return errorResponse(res, 'Journey is not active', 400);

    const delivery = journey.deliveryId;
    if (!delivery) return errorResponse(res, 'Delivery not found', 404);

    let phoneNumber = providedPhone || delivery.recipientPhone || delivery.customerId?.phone;
    if (!phoneNumber) return errorResponse(res, 'Phone number not available', 400);

    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    const whatsappPhone = cleanPhone.startsWith('91') && cleanPhone.length === 12
      ? cleanPhone
      : cleanPhone.startsWith('0')
        ? '91' + cleanPhone.substring(1)
        : cleanPhone.length === 10
          ? '91' + cleanPhone
          : cleanPhone;

    const finalContactName = contactName || delivery.recipientName || delivery.customerId?.fullName || 'Customer';
    const defaultMessage = message || `Hello ${finalContactName}, your delivery is on the way. - ${driver.name}`;

    journey.communicationLog.push({
      type: 'whatsapp',
      phoneNumber: whatsappPhone,
      contactName: finalContactName,
      timestamp: new Date(),
      remarks: defaultMessage,
    });
    await journey.save();

    return successResponse(res, 'WhatsApp initiated successfully', {
      whatsappId: journey.communicationLog[journey.communicationLog.length - 1]._id,
      phoneNumber: whatsappPhone,
      whatsappUrl: `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(defaultMessage)}`,
      contactName: finalContactName,
      message: defaultMessage,
    });
  } catch (error) {
    return errorResponse(res, 'Failed to initiate WhatsApp', 500);
  }
};

// ==================== GET NAVIGATION ====================
exports.getNavigation = async (req, res) => {
  try {
    const { journeyId } = req.params;
    const { currentLatitude, currentLongitude } = req.query;

    const driver = req.user;
    const journey = await Journey.findById(journeyId)
      .populate({
        path: 'deliveryId',
        select: 'deliveryLocation deliveryNumber trackingNumber companyName customerId recipientName recipientPhone',
        populate: { path: 'customerId', select: 'name fullName firstName lastName phone mobile' },
      });

    if (!journey) return errorResponse(res, 'Journey not found', 404);
    if (journey.driverId.toString() !== driver._id.toString()) return errorResponse(res, 'Unauthorized', 403);

    const delivery = journey.deliveryId;
    const destination = delivery.deliveryLocation;
    if (!destination?.coordinates) return errorResponse(res, 'Delivery location not available', 400);

    const destLat = destination.coordinates.latitude;
    const destLng = destination.coordinates.longitude;

    let distance = null, duration = null, routePolyline = null;
    let actualDistance = 0;
    const points = [journey.startLocation.coordinates, ...journey.waypoints.map(wp => wp.location.coordinates)];

    if (currentLatitude && currentLongitude && !isNaN(currentLatitude) && !isNaN(currentLongitude)) {
      points.push({ latitude: parseFloat(currentLatitude), longitude: parseFloat(currentLongitude) });

      try {
        const res2 = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
          params: {
            origin: `${currentLatitude},${currentLongitude}`,
            destination: `${destLat},${destLng}`,
            key: process.env.GOOGLE_MAPS_API_KEY,
            mode: 'driving',
            traffic_model: 'best_guess',
            departure_time: 'now',
          },
        });

        if (res2.data.status === 'OK' && res2.data.routes?.length > 0) {
          const leg = res2.data.routes[0].legs[0];
          distance = leg.distance?.value ? leg.distance.value / 1000 : null;
          duration = leg.duration_in_traffic?.value
            ? Math.round(leg.duration_in_traffic.value / 60)
            : leg.duration?.value ? Math.round(leg.duration.value / 60) : null;
          routePolyline = res2.data.routes[0].overview_polyline?.points || null;

          if (journey.estimatedDurationFromGoogle === null) {
            journey.estimatedDurationFromGoogle = duration;
            journey.googleDistanceMeters = leg.distance?.value;
            await journey.save();
          }
        }
      } catch (apiErr) {
        console.error('[Navigation] Google API failed:', apiErr.message);
      }
    }

    for (let i = 0; i < points.length - 1; i++) {
      actualDistance += calculateDistance(
        points[i].latitude, points[i].longitude,
        points[i + 1].latitude, points[i + 1].longitude
      );
    }

    const actualMinutes = Math.round((new Date() - new Date(journey.startTime)) / 60000);
    const actualHours = actualMinutes / 60;
    const averageSpeed = actualHours > 0 ? (actualDistance / actualHours).toFixed(1) : 'N/A';

    const estimatedMin = journey.estimatedDurationFromGoogle || duration;
    let timeDifferenceText = '';
    if (estimatedMin !== null) {
      const diff = actualMinutes - estimatedMin;
      timeDifferenceText = diff > 5 ? `Delayed by ${diff} mins` : diff < -5 ? `Ahead by ${Math.abs(diff)} mins` : 'On time';
    }

    journey.navigationHistory.push({
      destination: { address: destination.address || 'Unknown', coordinates: { latitude: destLat, longitude: destLng } },
      startedAt: new Date(),
      estimatedDistance: distance,
      estimatedDuration: duration,
    });
    await journey.save();

    const customerDoc = delivery.customerId;
    const customerName = customerDoc
      ? (customerDoc.name || customerDoc.fullName || [customerDoc.firstName, customerDoc.lastName].filter(Boolean).join(' ').trim() || 'Unknown')
      : 'Unknown';
    const customerPhone = customerDoc?.phone || customerDoc?.mobile || null;

    return successResponse(res, 'Navigation data ready', {
      currentLocation: currentLatitude && currentLongitude ? { latitude: parseFloat(currentLatitude), longitude: parseFloat(currentLongitude) } : null,
      destination: { address: destination.address || 'Unknown', coordinates: { latitude: destLat, longitude: destLng } },
      routePolyline: routePolyline || null,
      distance: distance ? `${distance.toFixed(1)} km` : 'Calculating...',
      durationMinutes: duration,
      estimatedTime: duration ? `${duration} mins` : 'N/A',
      currentStop: {
        number: 1,
        deliveryNumber: delivery.deliveryNumber || 'N/A',
        trackingNumber: delivery.trackingNumber || 'N/A',
        companyName: delivery.companyName || customerName || 'Customer',
        address: destination.address || 'N/A',
        eta: duration ? `${duration} Mins` : 'N/A',
        status: 'In_transit',
      },
      customer: { name: customerName, phone: customerPhone },
      salesman: { name: driver.name || 'Driver', phone: driver.phone || null },
      navigationHistoryId: journey.navigationHistory[journey.navigationHistory.length - 1]._id,
      isGoogleData: !!routePolyline,
      actualMetrics: {
        traveledDistance: `${actualDistance.toFixed(2)} km`,
        timeTaken: `${actualMinutes} mins`,
        averageSpeed: `${averageSpeed} km/h`,
        timeDifference: timeDifferenceText || 'N/A',
      },
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
    const { type, waypointIndex } = req.body;

    if (!req.file) return errorResponse(res, 'Recording file is required', 400);

    const journey = await Journey.findById(journeyId);
    if (!journey) return errorResponse(res, 'Journey not found', 404);
    if (journey.driverId.toString() !== req.user._id.toString()) return errorResponse(res, 'Unauthorized', 403);

    journey.recordings.push({
      recordingId: `REC_${Date.now()}`,
      type: type || 'screenshot',
      url: `/uploads/recordings/${req.file.filename}`,
      timestamp: new Date(),
      waypointIndex: waypointIndex ? parseInt(waypointIndex) : null,
      fileSize: req.file.size,
      isHidden: false,
    });
    await journey.save();

    return successResponse(res, 'Recording uploaded successfully', {
      recording: journey.recordings[journey.recordings.length - 1],
      totalRecordings: journey.recordings.length,
    });
  } catch (error) {
    return errorResponse(res, error.message || 'Failed to upload recording', 500);
  }
};

// ==================== GET COMMUNICATION HISTORY ====================
exports.getCommunicationHistory = async (req, res) => {
  try {
    const { journeyId } = req.params;
    const { type } = req.query;

    const journey = await Journey.findById(journeyId)
      .populate('deliveryId', 'trackingNumber recipientName recipientPhone');
    if (!journey) return errorResponse(res, 'Journey not found', 404);
    if (journey.driverId.toString() !== req.user._id.toString()) return errorResponse(res, 'Unauthorized', 403);

    let log = journey.communicationLog;
    if (type) log = log.filter(l => l.type === type);

    return successResponse(res, 'Communication history retrieved', {
      delivery: {
        trackingNumber: journey.deliveryId.trackingNumber,
        recipientName: journey.deliveryId.recipientName,
        recipientPhone: journey.deliveryId.recipientPhone,
      },
      summary: {
        totalCalls: journey.communicationLog.filter(l => l.type === 'call').length,
        totalWhatsApp: journey.communicationLog.filter(l => l.type === 'whatsapp').length,
      },
      communicationLog: log.map(l => ({
        id: l._id,
        type: l.type,
        contactName: l.contactName,
        phoneNumber: l.phoneNumber,
        timestamp: l.timestamp,
        duration: l.duration ? `${l.duration} seconds` : 'N/A',
        remarks: l.remarks,
      })),
    });
  } catch (error) {
    return errorResponse(res, error.message || 'Failed to get communication history', 500);
  }
};

// ==================== UPLOAD PROOF SIGNATURE ====================
// exports.uploadProofSignature = async (req, res) => {
//   try {
//     const { deliveryId } = req.params;
//     if (!req.file) return errorResponse(res, 'Signature image is required', 400);

//     const delivery = await Delivery.findById(deliveryId);
//     if (!delivery) return errorResponse(res, 'Delivery not found', 404);
//     if (delivery.driverId.toString() !== req.user._id.toString()) return errorResponse(res, 'Unauthorized', 403);

//     const signatureUrl = `/uploads/signatures/${req.file.filename}`;
//     delivery.deliveryProof = delivery.deliveryProof || {};
//     delivery.deliveryProof.signature = signatureUrl;
//     delivery.deliveryProof.signedAt = new Date();
//     delivery.status = 'Delivered';
//     delivery.actualDeliveryTime = new Date();
//     await delivery.save();

//     if (delivery.orderId) {
//       await Order.findByIdAndUpdate(
//         delivery.orderId,
//         { status: 'delivered' },
//         { new: false }
//       );
//     }

//     const journey = await Journey.findOne({ deliveryId: delivery._id });
//     if (journey) {
//       journey.deliveryProof = journey.deliveryProof || {};
//       journey.deliveryProof.signature = signatureUrl;
//       journey.status = 'Completed';
//       await journey.save();

//       broadcastToAdmin(req, 'driver:journey:ended', {
//         driverId: req.user._id.toString(),
//         driverName: req.user.name,
//         journeyId: journey._id.toString(),
//         deliveryId: delivery._id.toString(),
//         isAvailable: true,
//         status: 'completed',
//       });
//     }

//     await DeliveryStatusHistory.create({
//       deliveryId: delivery._id,
//       status: 'Delivered',
//       remarks: 'Customer signature obtained',
//       updatedBy: { userId: req.user._id, userRole: 'driver', userName: req.user.name },
//     });

//     return successResponse(res, 'Signature uploaded! Delivery marked as delivered.', {
//       signatureUrl,
//       deliveryStatus: delivery.status,
//       journeyStatus: journey?.status || null,
//     });
//   } catch (error) {
//     return errorResponse(res, 'Failed to upload signature', 500);
//   }
// };

// ==================== UPLOAD PROOF SIGNATURE ====================
exports.uploadProofSignature = async (req, res) => {
  try {
    const { deliveryId } = req.params;
    if (!req.file) return errorResponse(res, 'Signature image is required', 400);

    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) return errorResponse(res, 'Delivery not found', 404);
    if (delivery.driverId.toString() !== req.user._id.toString()) return errorResponse(res, 'Unauthorized', 403);

    const signatureUrl = `/uploads/signatures/${req.file.filename}`;
    delivery.deliveryProof = delivery.deliveryProof || {};
    delivery.deliveryProof.signature = signatureUrl;
    delivery.deliveryProof.signedAt = new Date();
    delivery.status = 'Delivered';
    delivery.actualDeliveryTime = new Date();
    await delivery.save();

    // ✅ FIX: orderId string ya ObjectId dono handle karo
    if (delivery.orderId) {
      try {
        const orderQuery = mongoose.Types.ObjectId.isValid(delivery.orderId)
          ? { _id: delivery.orderId }
          : { orderNumber: delivery.orderId };

        const updatedOrder = await Order.findOneAndUpdate(
          orderQuery,
          { status: 'delivered', updatedAt: new Date() },
          { new: true }
        );

        if (updatedOrder) {
          console.log(`✅ Order marked delivered | orderNumber: ${updatedOrder.orderNumber}`);
        } else {
          console.log(`⚠️ Order NOT found | orderId: ${delivery.orderId}`);
        }
      } catch (orderErr) {
        console.error('❌ Order update failed:', orderErr.message);
        // Order update fail hone se signature upload fail nahi hoga
      }
    }

    const journey = await Journey.findOne({
      deliveryId: delivery._id,
      status: { $in: ['In_transit', 'In_progress', 'Started', 'Arrived', 'Completed', 'Proof_uploaded'] },
    });

    if (journey) {
      journey.deliveryProof = journey.deliveryProof || {};
      journey.deliveryProof.signature = signatureUrl;
      journey.status = 'Completed';
      await journey.save();

      broadcastToAdmin(req, 'driver:journey:ended', {
        driverId: req.user._id.toString(),
        driverName: req.user.name,
        journeyId: journey._id.toString(),
        deliveryId: delivery._id.toString(),
        isAvailable: true,
        status: 'completed',
      });
    }

    await DeliveryStatusHistory.create({
      deliveryId: delivery._id,
      status: 'Delivered',
      remarks: 'Customer signature obtained',
      updatedBy: { userId: req.user._id, userRole: 'driver', userName: req.user.name },
    }).catch(e => console.error('DeliveryStatusHistory error:', e.message));

    return successResponse(res, 'Signature uploaded! Delivery marked as delivered.', {
      signatureUrl,
      deliveryStatus: delivery.status,
      journeyStatus: journey?.status || null,
    });

  } catch (error) {
    console.error('❌ uploadProofSignature error:', error.message, error.stack);
    return errorResponse(res, 'Failed to upload signature', 500);
  }
};

// ==================== UPLOAD PROOF PHOTOS ====================
exports.uploadProofPhotos = async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const { recipientName, mobileNumber, remarks = '' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(deliveryId)) return errorResponse(res, 'Invalid delivery ID', 400);
    if (!recipientName?.trim()) return errorResponse(res, 'Recipient name is required', 400);
    if (!mobileNumber?.trim()) return errorResponse(res, 'Mobile number is required', 400);

    const delivery = await Delivery.findById(deliveryId).populate({ path: 'customerId', select: 'companyName name locations phone email' });
    if (!delivery) return errorResponse(res, 'Delivery not found', 404);
    if (delivery.driverId?.toString() !== req.user._id.toString()) return errorResponse(res, 'Unauthorized', 403);

    let proofPhotos = [];
    if (req.files?.photos?.length) {
      proofPhotos = req.files.photos.map(f => `/uploads/proof/${f.filename}`);
    }

    let companyStampUrl = null, stampUploadedAt = null;
    if (req.files?.companyStamp?.length) {
      companyStampUrl = `/uploads/stamps/${req.files.companyStamp[0].filename}`;
      stampUploadedAt = new Date();
    }

    let remarkId = null;
    const remarkText = remarks.trim() || null;
    if (remarkText) {
      const saved = await new Remark({
        remarkType: 'custom', remarkText, category: 'delivery_status', severity: 'low',
        isPredefined: false, isActive: true, createdBy: req.user._id,
        approvalStatus: 'approved', requiresApproval: false,
        usageCount: 1, lastUsedAt: new Date(), associatedDeliveries: [delivery._id],
      }).save();
      remarkId = saved._id;
    }

    delivery.status = 'Proof_uploaded';
    delivery.deliveryProof = {
      photos: proofPhotos,
      photosTakenAt: proofPhotos.length ? new Date() : null,
      recipientName: recipientName.trim(),
      mobileNumber: mobileNumber.trim(),
      companyStamp: companyStampUrl,
      companyStampUploadedAt: stampUploadedAt,
      remarks: remarkText,
      remarkId,
      uploadedAt: new Date(),
    };
    await delivery.save();

    const journey = await Journey.findOneAndUpdate(
      { deliveryId: delivery._id },
      { $set: { status: 'Proof_uploaded', 'deliveryProof.photos': proofPhotos, 'deliveryProof.recipientName': recipientName.trim() } },
      { new: true }
    );

    await DeliveryStatusHistory.create({
      deliveryId: delivery._id,
      status: 'Proof_uploaded',
      remarks: 'Proof photos and recipient details uploaded',
      updatedBy: { userId: req.user._id, userRole: 'driver', userName: req.user.name || 'Driver' },
    });

    return successResponse(res, 'Delivery proof uploaded successfully', {
      deliveryId: delivery._id,
      deliveryStatus: delivery.status,
      journeyStatus: journey?.status || null,
      proof: { photos: proofPhotos, photosCount: proofPhotos.length, companyStamp: companyStampUrl || 'Not uploaded', recipientName: recipientName.trim(), mobileNumber: mobileNumber.trim() },
      uploadedAt: new Date().toISOString(),
    });
  } catch (error) {
    return errorResponse(res, error.message || 'Failed to upload delivery proof', 500);
  }
};

// ==================== COMPLETE DELIVERY ====================
exports.completeDelivery = async (req, res) => {
  try {
    const { journeyId } = req.params;
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) return errorResponse(res, 'Location coordinates required', 400);

    const journey = await Journey.findById(journeyId).populate({
      path: 'deliveryId',
      populate: { path: 'customerId', select: 'companyName name locations' },
    });

    if (!journey) return errorResponse(res, 'Journey not found', 404);
    if (journey.driverId.toString() !== req.user._id.toString()) return errorResponse(res, 'Unauthorized', 403);

    const now = new Date();
    const actualMinutes = Math.round((now - new Date(journey.startTime)) / 60000);
    const estimatedMin = journey.estimatedDurationFromGoogle;

    let timeDifferenceText = '';
    if (estimatedMin !== null) {
      const diff = actualMinutes - estimatedMin;
      timeDifferenceText = diff > 5 ? `Delayed by ${diff} mins` : diff < -5 ? `Ahead by ${Math.abs(diff)} mins` : 'On time';
    }

    journey.status = 'Arrived';
    journey.endTime = now;
    journey.endLocation = {
      coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
      address: 'Driver reached delivery location',
    };
    journey.totalDuration = actualMinutes;
    await journey.save();

    const delivery = journey.deliveryId;
    delivery.status = 'Arrived';
    await delivery.save();

    await DeliveryStatusHistory.create({
      deliveryId: delivery._id,
      status: 'Arrived',
      location: { coordinates: { latitude: Number(latitude), longitude: Number(longitude) }, address: 'Driver reached delivery location' },
      remarks: 'Driver reached destination',
      updatedBy: { userId: req.user._id, userRole: 'driver', userName: req.user.name },
    });

    broadcastToAdmin(req, 'driver:journey:arrived', {
      driverId: req.user._id.toString(),
      driverName: req.user.name,
      journeyId: journey._id.toString(),
      deliveryId: delivery._id.toString(),
      location: { latitude, longitude },
    });

    const customer = delivery.customerId;
    let companyName = 'N/A', deliveryAddress = 'N/A';
    if (customer) {
      companyName = customer.companyName || customer.name || 'N/A';
      if (customer.locations?.length > 0) {
        const loc = customer.locations.find(l => l.isPrimary) || customer.locations[0];
        deliveryAddress = [loc.addressLine1, loc.addressLine2, loc.city, loc.state, loc.zipcode, loc.country].filter(Boolean).join(', ') || 'N/A';
      }
    }

    return successResponse(res, 'Delivery marked as completed! Please collect customer signature if pending.', {
      journeyId: journey._id,
      deliveryId: delivery._id.toString(),
      journeyStatus: journey.status,
      deliveryStatus: delivery.status,
      location: { latitude, longitude },
      customer: { companyName, deliveryAddress, customerId: delivery.customerId },
      arrivalTime: now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }),
      arrivalTimeISO: now.toISOString(),
      nextStep: 'upload-signature',
      timing: {
        actualTimeTaken: `${actualMinutes} mins`,
        estimatedTime: estimatedMin ? `${estimatedMin} mins` : 'N/A',
        difference: timeDifferenceText || 'N/A',
        startTime: journey.startTime.toISOString(),
        arrivedAt: now.toISOString(),
      },
    });
  } catch (error) {
    return errorResponse(res, 'Failed to mark delivery as completed', 500);
  }
};

// ==================== END JOURNEY ====================
exports.endJourney = async (req, res) => {
  try {
    const { journeyId } = req.params;
    const { latitude, longitude, address, finalRemarks } = req.body;

    if (!latitude || !longitude) return errorResponse(res, 'End location required', 400);

    const journey = await Journey.findById(journeyId);
    if (!journey) return errorResponse(res, 'Journey not found', 404);

    const driver = req.user;
    if (journey.driverId.toString() !== driver._id.toString()) return errorResponse(res, 'Unauthorized', 403);
    if (['completed', 'cancelled'].includes(journey.status)) return errorResponse(res, 'Journey already ended', 400);

    let totalDistance = 0;
    if (journey.waypoints?.length > 0) {
      totalDistance += calculateDistance(
        journey.startLocation.coordinates.latitude, journey.startLocation.coordinates.longitude,
        journey.waypoints[0].location.coordinates.latitude, journey.waypoints[0].location.coordinates.longitude
      );
      for (let i = 1; i < journey.waypoints.length; i++) {
        const p = journey.waypoints[i - 1].location.coordinates;
        const c = journey.waypoints[i].location.coordinates;
        totalDistance += calculateDistance(p.latitude, p.longitude, c.latitude, c.longitude);
      }
      const last = journey.waypoints[journey.waypoints.length - 1];
      totalDistance += calculateDistance(last.location.coordinates.latitude, last.location.coordinates.longitude, latitude, longitude);
    } else {
      totalDistance = calculateDistance(
        journey.startLocation.coordinates.latitude, journey.startLocation.coordinates.longitude, latitude, longitude
      );
    }

    const endTime = new Date();
    const durationMinutes = Math.round((endTime - new Date(journey.startTime)) / 60000);
    const averageSpeed = durationMinutes > 0 ? totalDistance / (durationMinutes / 60) : 0;

    journey.endLocation = { coordinates: { latitude: Number(latitude), longitude: Number(longitude) }, address: address || 'Delivery completed' };
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
        location: { coordinates: { latitude: Number(latitude), longitude: Number(longitude) }, address: address || 'Final destination' },
        remarks: 'Journey completed by driver',
        updatedBy: { userId: driver._id, userRole: 'driver', userName: driver.name || 'Driver' },
      });
    }

    await Driver.findByIdAndUpdate(driver._id, {
      isAvailable: true,
      currentJourney: null,
      $unset: { activeDelivery: "" },
    });

    // ── Socket: Journey ended, driver now available ──
    broadcastToAdmin(req, 'driver:journey:ended', {
      driverId: driver._id.toString(),
      driverName: driver.name,
      journeyId: journey._id.toString(),
      deliveryId: delivery?._id?.toString(),
      isAvailable: true,
      status: 'available',
      endLocation: { latitude: Number(latitude), longitude: Number(longitude), address: address || 'Delivery completed' },
    });

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
        totalCalls: communicationLog.filter(l => l.type === 'call').length,
        totalWhatsApp: communicationLog.filter(l => l.type === 'whatsapp').length,
      },
      driverStatus: 'Available',
      deliveryStatus: delivery?.status || 'delivered',
    });
  } catch (error) {
    return errorResponse(res, error.message || 'Failed to end journey', 500);
  }
};

// ==================== GET ACTIVE JOURNEY ====================
exports.getActiveJourney = async (req, res) => {
  try {
    const driver = req.user;
    const journey = await Journey.findOne({
      driverId: driver._id,
      status: { $in: ['started', 'in_progress', 'In_transit', 'Started'] },
    })
      .populate({ path: 'deliveryId', select: 'trackingNumber status pickupLocation deliveryLocation recipientName recipientPhone packageDetails estimatedDeliveryTime' })
      .lean();

    if (!journey) return successResponse(res, 'No active journey found', { journey: null });

    const communicationSummary = {
      totalCalls: journey.communicationLog?.filter(l => l.type === 'call').length || 0,
      totalWhatsApp: journey.communicationLog?.filter(l => l.type === 'whatsapp').length || 0,
    };

    return successResponse(res, 'Active journey retrieved successfully', {
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
      },
      startLocation: journey.startLocation,
      checkpoints: journey.waypoints?.map((wp, i) => ({ index: i + 1, location: wp.location, time: wp.timestamp, activity: wp.activity })) || [],
      communication: communicationSummary,
      totalCheckpoints: journey.waypoints?.length || 0,
      totalImages: journey.images?.length || 0,
    });
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve active journey', 500);
  }
};

// ==================== GET JOURNEY DETAILS ====================
exports.getJourneyDetails = async (req, res) => {
  try {
    const { journeyId } = req.params;
    if (!/^[0-9a-fA-F]{24}$/.test(journeyId)) return errorResponse(res, 'Invalid journey ID format', 400);

    const journey = await Journey.findById(journeyId)
      .populate({ path: 'deliveryId', select: 'trackingNumber status pickupLocation deliveryLocation recipientName recipientPhone packageDetails deliveryProof' })
      .populate({ path: 'driverId', select: 'name phone vehicleNumber vehicleType profileImage rating' })
      .lean();

    if (!journey) return errorResponse(res, 'Journey not found', 404);

    const startTime = new Date(journey.startTime);
    const endTime = journey.endTime ? new Date(journey.endTime) : new Date();
    const durationMinutes = Math.round((endTime - startTime) / 60000);
    const hours = Math.floor(durationMinutes / 60);
    const mins = durationMinutes % 60;
    const isOngoing = !['completed', 'delivered', 'failed', 'cancelled', 'returned'].includes(journey.status);

    return successResponse(res, 'Journey details retrieved successfully', {
      journey: {
        id: journey._id,
        status: journey.status,
        startTime: journey.startTime,
        endTime: journey.endTime || null,
        duration: isOngoing ? 'Ongoing' : (hours > 0 ? `${hours}h ${mins}m` : `${mins}m`),
        distance: journey.totalDistance > 0 ? `${journey.totalDistance.toFixed(2)} km` : (isOngoing ? 'Calculating...' : 'Not recorded'),
        averageSpeed: journey.averageSpeed > 0 ? `${journey.averageSpeed} km/h` : 'N/A',
        startLocation: journey.startLocation,
        endLocation: journey.endLocation || null,
        finalRemarks: journey.finalRemarks || null,
      },
      delivery: journey.deliveryId ? {
        trackingNumber: journey.deliveryId.trackingNumber,
        status: journey.deliveryId.status,
        recipient: journey.deliveryId.recipientName,
        phone: journey.deliveryId.recipientPhone,
        pickup: journey.deliveryId.pickupLocation,
        destination: journey.deliveryId.deliveryLocation,
      } : null,
      driver: journey.driverId ? {
        id: journey.driverId._id,
        name: journey.driverId.name,
        phone: journey.driverId.phone,
        vehicle: `${journey.driverId.vehicleType || ''} - ${journey.driverId.vehicleNumber || ''}`.trim(),
      } : null,
      checkpoints: journey.waypoints?.map((wp, i) => ({ number: i + 1, location: wp.location, time: wp.timestamp, activity: wp.activity, remarks: wp.remarks })) || [],
      images: journey.images?.map((img, i) => ({ number: i + 1, url: img.url, caption: img.caption, timestamp: img.timestamp, type: img.imageType })) || [],
    });
  } catch (error) {
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

    const [journeys, total] = await Promise.all([
      Journey.find(query)
        .populate({ path: 'deliveryId', select: 'trackingNumber status pickupLocation deliveryLocation' })
        .select('status startTime endTime totalDistance totalDuration averageSpeed waypoints images communicationLog')
        .sort({ startTime: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean(),
      Journey.countDocuments(query),
    ]);

    return successResponse(res, 'Journey history retrieved successfully', {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      journeys: journeys.map(j => ({
        journeyId: j._id,
        trackingNumber: j.deliveryId?.trackingNumber || 'N/A',
        status: j.status,
        startTime: j.startTime,
        endTime: j.endTime || null,
        duration: j.totalDuration ? `${j.totalDuration} mins` : 'In Progress',
        distance: j.totalDistance ? `${j.totalDistance.toFixed(2)} km` : 'N/A',
        pickup: j.deliveryId?.pickupLocation?.address || 'N/A',
        delivery: j.deliveryId?.deliveryLocation?.address || 'N/A',
        totalCheckpoints: j.waypoints?.length || 0,
        totalImages: j.images?.length || 0,
      })),
    });
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve journey history', 500);
  }
};

// ==================== CANCEL JOURNEY ====================
exports.cancelJourney = async (req, res) => {
  try {
    const { journeyId } = req.params;
    const { reason, latitude, longitude } = req.body;

    if (!reason) return errorResponse(res, 'Cancellation reason is required', 400);

    const driver = req.user;
    const journey = await Journey.findById(journeyId);
    if (!journey) return errorResponse(res, 'Journey not found', 404);
    if (journey.driverId.toString() !== driver._id.toString()) return errorResponse(res, 'Unauthorized', 403);
    if (!journey.isActive()) return errorResponse(res, 'Journey is not active', 400);

    journey.status = 'cancelled';
    journey.endTime = new Date();
    journey.finalRemarks = `Cancelled: ${reason}`;
    if (latitude && longitude) {
      journey.endLocation = { coordinates: { latitude: Number(latitude), longitude: Number(longitude) }, address: 'Journey cancelled here' };
    }
    await journey.save();

    const delivery = await Delivery.findById(journey.deliveryId);
    if (delivery) {
      delivery.status = 'cancelled';
      await delivery.save();
      await DeliveryStatusHistory.create({
        deliveryId: delivery._id,
        status: 'cancelled',
        remarks: `Journey cancelled by driver: ${reason}`,
        updatedBy: { userId: driver._id, userRole: 'driver', userName: driver.name },
      });
    }

    await Driver.findByIdAndUpdate(driver._id, { isAvailable: true, currentJourney: null, $unset: { activeDelivery: "" } });

    broadcastToAdmin(req, 'driver:journey:ended', {
      driverId: driver._id.toString(),
      driverName: driver.name,
      journeyId: journey._id.toString(),
      isAvailable: true,
      status: 'cancelled',
    });

    return successResponse(res, 'Journey cancelled successfully', {
      journeyId: journey._id,
      status: journey.status,
      reason: journey.finalRemarks,
      driverStatus: 'Available',
    });
  } catch (error) {
    return errorResponse(res, error.message || 'Failed to cancel journey', 500);
  }
};

module.exports = exports;