const express = require('express');
const router = express.Router();
const deliveryController = require('../../controllers/Driver/deliveryController');
const { authenticateDriver,isDriver } = require('../../middleware/authMiddleware');


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