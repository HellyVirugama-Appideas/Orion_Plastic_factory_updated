const express = require('express');
const router = express.Router();
const deliveryController = require('../../controllers/Driver/deliveryController');
const { authenticateDriver,isDriver } = require('../../middleware/authMiddleware');

// // Driver Routes
// router.get(
//   '/driver/my-deliveries',  
//   authenticateDriver,
//   isDriver,
//   deliveryController.getDriverDeliveries
// );

// router.patch(
//   '/:deliveryId/status',
//   authenticateDriver,
//   isDriver,
//   deliveryController.updateDeliveryStatus
// );

// router.post(
//   '/:deliveryId/generate-otp',
//   authenticateDriver,
//   isDriver,
//   deliveryController.generateDeliveryOTP
// );

// router.post(
//   '/:deliveryId/verify-otp',
//   authenticateDriver,
//   isDriver,
//   deliveryController.verifyOTPAndComplete
// );

// router.post(
//   '/:deliveryId/accept',
//   authenticateDriver,
//   isDriver,
//   deliveryController.acceptDelivery
// )

router.get(
  "/driver/my-delivery",
  authenticateDriver,
  isDriver,
  deliveryController.getDriverDeliveries
)

router.get(
  "/details/:deliveryId",
  authenticateDriver,
  isDriver,
  deliveryController.getDeliveryDetails
)

module.exports = router;