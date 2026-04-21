// const express = require('express');
// const router = express.Router();
// const trackingController = require('../controllers/trackingController');
// const { authenticateDriver, isDriver, isAdmin, protectAdmin } = require('../middleware/authMiddleware');

// // Driver Routes
// router.post(
//   '/update-location',
//   authenticateDriver,
//   isDriver,
//   trackingController.updateLocation
// );

// // Public/Customer Routes
// router.get(
//   '/current/:deliveryId',
//   trackingController.getCurrentLocation
// );

// router.get(
//   '/progress/:deliveryId',
//   trackingController.trackDeliveryProgress
// );

// router.get(
//   '/route/:deliveryId',
//   trackingController.getRouteRecording
// );

// // Admin Routes
// router.get(
//   '/history/:deliveryId',
//   protectAdmin,
//   isAdmin,
//   trackingController.getTrackingHistory
// );

// router.delete(
//   '/cleanup',
//   protectAdmin,
//   isAdmin,
//   trackingController.deleteOldTrackingLogs
// );

// module.exports = router;

const express = require('express');
const router = express.Router();
const trackingController = require('../../controllers/Driver/trackingController');
const { authenticateDriver, isDriver } = require('../../middleware/authMiddleware');


// Driver can ONLY update location, CANNOT view location data

router.post(
  '/update-location',
  authenticateDriver,
  isDriver,
 trackingController.updateLocation
);

router.post(
  '/capture-final-location',
  authenticateDriver,
  isDriver,
  trackingController.captureFinalLocation
);

router.get(
  '/my-status',
  authenticateDriver,
  isDriver,
  trackingController.getMyStatus
);

module.exports = router;

