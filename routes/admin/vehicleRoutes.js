const express = require('express');
const router = express.Router();
const vehicleController = require('../../controllers/admin/vehicleController');
const { checkPermission, protectAdmin, isAdmin } = require('../../middleware/authMiddleware');


// Create vehicle
router.post(
  '/',
  protectAdmin,
  isAdmin,
  checkPermission('vehicles', 'create'),
  vehicleController.createVehicle
);

router.get(
  "/create",
  protectAdmin,
  isAdmin,
   checkPermission('vehicles', 'create'),
   vehicleController.getCreateVehicle
)

// Get all vehicles
router.get(
  '/',
  protectAdmin,
  isAdmin,
  checkPermission('vehicles', 'read'),
  vehicleController.getAllVehicles
);

// // Get vehicle by ID
// router.get( 
//   '/:vehicleId',
//   protectAdmin,
//   isAdmin,
//   checkPermission('vehicles', 'read'),
//   vehicleController.getVehicleById
// );

// Update vehicle

router.get(
  "/edit/:vehicleId",
  protectAdmin,
  isAdmin,
  checkPermission('vehicles', 'update'),
  vehicleController.getEditVehicle
)
router.post(
  '/edit/:vehicleId',
  protectAdmin,
  isAdmin,
  checkPermission('vehicles', 'update'),
  vehicleController.updateVehicle
);

// Delete vehicle 
router.post(
  '/delete/:vehicleId',
  protectAdmin,
  isAdmin,
  checkPermission('vehicles', 'delete'),
  vehicleController.deleteVehicle
);

// Assign vehicle to driver
router.post(
  '/:vehicleId/assign',
  protectAdmin,
  isAdmin,
  checkPermission('vehicles', 'update'),
  vehicleController.assignVehicleToDriver
);

// // Unassign vehicle from driver
router.post(
  '/:vehicleId/unassign',
  protectAdmin,
  isAdmin,
  checkPermission('vehicles', 'update'),
  vehicleController.unassignVehicle
);

//  STATUS MANAGEMENT 

// Update vehicle status
// router.patch(
//   '/:vehicleId/status',
//   protectAdmin,
//   isAdmin,
//   checkPermission('vehicles', 'update'),
//   vehicleController.updateVehicleStatus
// );

//  STATISTICS 

// // Get vehicle statistics
// router.get(
//   '/stats/overview',
//   protectAdmin,
//   isAdmin,
//   checkPermission('vehicles', 'read'),
//   vehicleController.getVehicleStatistics
// );

module.exports = router;