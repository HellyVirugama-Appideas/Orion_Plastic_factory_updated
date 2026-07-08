const express = require('express');
const router = express.Router();
const { protectAdmin, isAdmin, checkPermission } = require('../../middleware/authMiddleware');
const deliveryController = require('../../controllers/admin/deliveryAdminController');
const Notification = require("../../models/Notification")

// ============= API ENDPOINTS (MUST COME FIRST TO AVOID CONFLICTS) =============

// Get all driver locations for dashboard (SPECIFIC ROUTE FIRST)
router.get(
  '/api/drivers/locations',
  protectAdmin,
  isAdmin,
  deliveryController.getAllDriverLocations
);

// Get drivers by status (SPECIFIC ROUTE)
router.get(
  '/api/drivers/locations/by-status',
  protectAdmin,
  isAdmin,
  deliveryController.getDriversByStatus
);

// Get single driver location (SPECIFIC ROUTE WITH 'drivers' PREFIX)
router.get(
  '/api/drivers/:driverId/location',
  protectAdmin,
  isAdmin,
  deliveryController.getSingleDriverLocation
);

// Get driver's current location for a specific delivery
router.get(
  '/:deliveryId/driver-location',
  protectAdmin,
  isAdmin,
  deliveryController.getDriverCurrentLocation
);

// ============= PAGE ROUTES =============

// Deliveries list
router.get(
  '/',
  protectAdmin,
  isAdmin,
  checkPermission('deliveries', 'read'),
  deliveryController.renderDeliveriesList
);

// Create delivery from order page (SPECIFIC ROUTE BEFORE DYNAMIC PARAM)
router.get(
  '/create-from-order/:orderId',
  protectAdmin,
  isAdmin,
  checkPermission('deliveries', 'create'),
  deliveryController.renderCreateDeliveryFromOrder
);

// Edit delivery page (SPECIFIC ROUTE BEFORE DYNAMIC PARAM)
router.get(
  '/:deliveryId/edit',
  protectAdmin,
  isAdmin,
  checkPermission('deliveries', 'update'),
  deliveryController.renderEditDelivery
);

// Delivery details with live tracking (DYNAMIC PARAM LAST)
router.get(
  '/:deliveryId',
  protectAdmin,
  isAdmin,
  checkPermission('deliveries', 'read'),
  deliveryController.renderDeliveryDetails
);

// ============= POST ACTIONS =============

// Create delivery from order
router.post(
  '/create-from-order/:orderId',
  protectAdmin,
  isAdmin,
  checkPermission('deliveries', 'create'),
  deliveryController.createDeliveryFromOrder
);

// Cancel delivery
router.post(
  '/:deliveryId/cancel',
  protectAdmin,
  isAdmin,
  checkPermission('deliveries', 'delete'),
  deliveryController.cancelDelivery
);

// Update delivery details
router.post(
  '/:deliveryId/update',
  protectAdmin,
  isAdmin,
  checkPermission('deliveries', 'update'),
  deliveryController.updateDelivery
);

// Add remark to delivery
router.post(
  '/:deliveryId/remarks',
  protectAdmin,
  isAdmin,
  checkPermission('deliveries', 'update'),
  deliveryController.addDeliveryRemark
);

router.get('/:deliveryId/journey-route',
  protectAdmin,
  isAdmin,
  deliveryController.getCompletedJourneyRoute
);
router.patch('/:deliveryId/priority', protectAdmin, isAdmin, deliveryController.updateDeliveryPriority);

// ── ASSIGN DRIVER ──
router.patch('/:deliveryId/assign', protectAdmin, isAdmin, async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const { driverId } = req.body;
    if (!driverId) return res.status(400).json({ success: false, message: 'driverId required' });
    const Delivery = require('../../models/Delivery');
    const delivery = await Delivery.findByIdAndUpdate(
      deliveryId,
      { driverId, status: 'assigned', assignedAt: new Date() },
      { new: true }
    );
    if (!delivery) return res.status(404).json({ success: false, message: 'Delivery not found' });
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(`driver_${driverId}`).emit('delivery:assigned', {
          deliveryId, trackingNumber: delivery.trackingNumber,
          message: `New delivery assigned: ${delivery.trackingNumber}`
        });
      }
    } catch (e) { }
    return res.json({ success: true, message: 'Driver assigned' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ── CHANGE DELIVERY ADDRESS ──
router.patch('/:deliveryId/change-address', protectAdmin, isAdmin, async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const { address, latitude, longitude } = req.body;
    if (!address) return res.status(400).json({ success: false, message: 'Address required' });
    const Delivery = require('../../models/Delivery');
    const updateObj = { 'deliveryLocation.address': address };
    if (latitude) updateObj['deliveryLocation.latitude'] = parseFloat(latitude);
    if (longitude) updateObj['deliveryLocation.longitude'] = parseFloat(longitude);
    const delivery = await Delivery.findByIdAndUpdate(deliveryId, { $set: updateObj }, { new: true });
    if (!delivery) return res.status(404).json({ success: false, message: 'Delivery not found' });
    // Notify driver
    try {
      const io = req.app.get('io');
      if (io && delivery.driverId) {
        io.to(`driver_${delivery.driverId}`).emit('delivery:address:changed', {
          deliveryId,
          trackingNumber: delivery.trackingNumber,
          newAddress: address,
          message: `Delivery address updated for ${delivery.trackingNumber}`
        });
      }
    } catch (e) { }
    return res.json({ success: true, message: 'Address updated', address });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;