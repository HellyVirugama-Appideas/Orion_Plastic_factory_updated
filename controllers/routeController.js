const Route = require('../models/Route');
const Delivery = require('../models/Delivery');
const Driver = require('../models/Driver');
const Admin = require('../models/Admin');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { optimizeRoute, calculateDistance } = require('../utils/geoHelper');

// Create Route (Admin)
exports.createRoute = async (req, res) => {
  try {
    const { name, driverId, deliveryIds, startLocation } = req.body;

    if (!name || !driverId || !deliveryIds || !Array.isArray(deliveryIds)) {
      return errorResponse(res, 'Name, driver ID, and delivery IDs are required', 400);
    }

    // Get admin
    const admin = await Admin.findOne({ userId: req.user._id });
    if (!admin) {
      return errorResponse(res, 'Admin profile not found', 404);
    }

    // Verify driver
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return errorResponse(res, 'Driver not found', 404);
    }

    // Get deliveries
    const deliveries = await Delivery.find({
      _id: { $in: deliveryIds },
      status: 'assigned',
      driverId: driver._id
    });

    if (deliveries.length !== deliveryIds.length) {
      return errorResponse(res, 'Some deliveries are invalid or not assigned to this driver', 400);
    }

    // Create route with deliveries in sequence
    const routeDeliveries = deliveries.map((delivery, index) => ({
      deliveryId: delivery._id,
      sequence: index + 1,
      status: 'pending'
    }));

    const route = await Route.create({
      name,
      driverId: driver._id,
      vehicleNumber: driver.vehicleNumber,
      deliveries: routeDeliveries,
      startLocation,
      status: 'planned',
      createdBy: admin._id
    });

    // Update deliveries with route reference
    await Delivery.updateMany(
      { _id: { $in: deliveryIds } },
      { $set: { route: route._id, status: 'assigned' } }
    );

    return successResponse(res, 'Route created successfully', { route }, 201);

  } catch (error) {
    console.error('Create Route Error:', error);
    return errorResponse(res, error.message || 'Failed to create route', 500);
  }
};


// Auto-arrange Route based on Geolocation
exports.autoArrangeRoute = async (req, res) => {
  try {
    const { routeId } = req.params;

    const route = await Route.findById(routeId)
      .populate('deliveries.deliveryId');

    if (!route) {
      return errorResponse(res, 'Route not found', 404);
    }

    if (route.status !== 'planned') {
      return errorResponse(res, 'Can only optimize routes with planned status', 400);
    }

    // Get all delivery locations
    const locations = route.deliveries.map(d => ({
      id: d.deliveryId._id,
      latitude: d.deliveryId.deliveryLocation.coordinates.latitude,
      longitude: d.deliveryId.deliveryLocation.coordinates.longitude,
      priority: d.deliveryId.priority
    }));

    // Get start location (or use first delivery's pickup location)
    const startLat = route.startLocation?.coordinates?.latitude ||
      route.deliveries[0].deliveryId.pickupLocation.coordinates.latitude;
    const startLng = route.startLocation?.coordinates?.longitude ||
      route.deliveries[0].deliveryId.pickupLocation.coordinates.longitude;

    // Optimize route
    const optimizedSequence = optimizeRoute(startLat, startLng, locations);

    // Update delivery sequences
    let totalDistance = 0;
    let prevLat = startLat;
    let prevLng = startLng;

    route.deliveries = optimizedSequence.map((location, index) => {
      const delivery = route.deliveries.find(
        d => d.deliveryId._id.toString() === location.id.toString()
      );

      // Calculate distance from previous point
      const distance = calculateDistance(prevLat, prevLng, location.latitude, location.longitude);
      totalDistance += distance;

      prevLat = location.latitude;
      prevLng = location.longitude;

      return {
        ...delivery.toObject(),
        sequence: index + 1
      };
    });

    route.totalDistance = parseFloat(totalDistance.toFixed(2));
    route.totalDuration = Math.round((totalDistance / 40) * 60); // Assuming 40 km/h average
    route.optimized = true;
    await route.save();

    return successResponse(res, 'Route optimized successfully', { route });

  } catch (error) {
    console.error('Auto Arrange Route Error:', error);
    return errorResponse(res, error.message || 'Failed to optimize route', 500);
  }
};

// Manual Route Arrangement (Admin)
exports.manualArrangeRoute = async (req, res) => {
  try {
    const { routeId } = req.params;
    const { deliverySequence } = req.body; // Array of { deliveryId, sequence }

    if (!Array.isArray(deliverySequence)) {
      return errorResponse(res, 'Delivery sequence array is required', 400);
    }

    const route = await Route.findById(routeId);
    if (!route) {
      return errorResponse(res, 'Route not found', 404);
    }

    // Validate all deliveries exist in route
    const deliveryIds = route.deliveries.map(d => d.deliveryId.toString());
    const sequenceIds = deliverySequence.map(d => d.deliveryId);

    const allValid = sequenceIds.every(id => deliveryIds.includes(id));
    if (!allValid) {
      return errorResponse(res, 'Some delivery IDs are not in this route', 400);
    }

    // Update sequences
    deliverySequence.forEach(({ deliveryId, sequence }) => {
      const delivery = route.deliveries.find(
        d => d.deliveryId.toString() === deliveryId
      );
      if (delivery) {
        delivery.sequence = sequence;
      }
    });

    // Sort by sequence
    route.deliveries.sort((a, b) => a.sequence - b.sequence);
    route.optimized = false; // Manual arrangement
    await route.save();

    return successResponse(res, 'Route arranged successfully', { route });

  } catch (error) {
    console.error('Manual Arrange Route Error:', error);
    return errorResponse(res, error.message || 'Failed to arrange route', 500);
  }
};

// Start Route (Driver)
exports.startRoute = async (req, res) => {
  try {
    const { routeId } = req.params;

    const driver = await Driver.findOne({ userId: req.user._id });
    if (!driver) {
      return errorResponse(res, 'Driver profile not found', 404);
    }

    const route = await Route.findOne({
      _id: routeId,
      driverId: driver._id
    });

    if (!route) {
      return errorResponse(res, 'Route not found or not assigned to you', 404);
    }

    if (route.status !== 'planned') {
      return errorResponse(res, 'Route is not in planned status', 400);
    }

    route.status = 'in_progress';
    await route.save();

    // Update all deliveries status
    await Delivery.updateMany(
      { route: route._id },
      { $set: { status: 'in_transit' } }
    );

    return successResponse(res, 'Route started successfully', { route });

  } catch (error) {
    console.error('Start Route Error:', error);
    return errorResponse(res, error.message || 'Failed to start route', 500);
  }
};

// Complete Route (Driver)
exports.completeRoute = async (req, res) => {
  try {
    const { routeId } = req.params;
    const { remarks } = req.body;

    const driver = await Driver.findOne({ userId: req.user._id });
    if (!driver) {
      return errorResponse(res, 'Driver profile not found', 404);
    }

    const route = await Route.findOne({
      _id: routeId,
      driverId: driver._id
    });

    if (!route) {
      return errorResponse(res, 'Route not found', 404);
    }

    // Check if all deliveries are completed
    const incompleteDeliveries = await Delivery.countDocuments({
      route: route._id,
      status: { $nin: ['delivered', 'cancelled', 'failed'] }
    });

    if (incompleteDeliveries > 0) {
      return errorResponse(res, `${incompleteDeliveries} deliveries are still incomplete`, 400);
    }

    route.status = 'completed';
    await route.save();

    return successResponse(res, 'Route completed successfully', { route });

  } catch (error) {
    console.error('Complete Route Error:', error);
    return errorResponse(res, error.message || 'Failed to complete route', 500);
  }
};

// Get Route Details
exports.getRouteDetails = async (req, res) => {
  try {
    const { routeId } = req.params;

    const route = await Route.findById(routeId)
      .populate({
        path: 'deliveries.deliveryId',
        populate: { path: 'customerId', select: 'name phone' }
      })
      .populate({
        path: 'driverId',
        populate: { path: 'userId', select: 'name phone profileImage' }
      });

    if (!route) {
      return errorResponse(res, 'Route not found', 404);
    }

    return successResponse(res, 'Route details retrieved successfully', { route });

  } catch (error) {
    console.error('Get Route Details Error:', error);
    return errorResponse(res, 'Failed to retrieve route details', 500);
  }
};

// Get Driver's Active Routes
exports.getDriverActiveRoutes = async (req, res) => {
  try {
    const driver = await Driver.findOne({ userId: req.user._id });
    if (!driver) {
      return errorResponse(res, 'Driver profile not found', 404);
    }

    const routes = await Route.find({
      driverId: driver._id,
      status: { $in: ['planned', 'in_progress'] }
    }).populate('deliveries.deliveryId', 'trackingNumber orderId status deliveryLocation');

    return successResponse(res, 'Active routes retrieved successfully', { routes });

  } catch (error) {
    console.error('Get Driver Active Routes Error:', error);
    return errorResponse(res, 'Failed to retrieve active routes', 500);
  }
};

// Get All Routes (Admin)
exports.getAllRoutes = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, driverId } = req.query;

    const query = {};
    if (status) query.status = status;
    if (driverId) query.driverId = driverId;

    const routes = await Route.find(query)
      .populate({
        path: 'driverId',
        populate: { path: 'userId', select: 'name phone' }
      })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Route.countDocuments(query);

    return successResponse(res, 'Routes retrieved successfully', {
      routes,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get All Routes Error:', error);
    return errorResponse(res, 'Failed to retrieve routes', 500);
  }
};

// Delete Route (Admin)
exports.deleteRoute = async (req, res) => {
  try {
    const { routeId } = req.params;

    const route = await Route.findById(routeId);
    if (!route) {
      return errorResponse(res, 'Route not found', 404);
    }

    if (route.status === 'in_progress') {
      return errorResponse(res, 'Cannot delete route that is in progress', 400);
    }

    // Remove route reference from deliveries
    await Delivery.updateMany(
      { route: route._id },
      { $unset: { route: 1 } }
    );

    await Route.deleteOne({ _id: routeId });

    return successResponse(res, 'Route deleted successfully');

  } catch (error) {
    console.error('Delete Route Error:', error);
    return errorResponse(res, 'Failed to delete route', 500);
  }
};