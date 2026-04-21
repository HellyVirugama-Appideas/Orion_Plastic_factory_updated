// const express = require('express');
// const router = express.Router();
// const maintenanceController = require('../controllers/maintenanceController');
// const { isAdmin, protectAdmin, authenticateDriver } = require('../middleware/authMiddleware');
// const upload = require('../middleware/uploadMiddleware'); 

// //  MAINTENANCE SCHEDULING 

// // Schedule maintenance (Admin only)
// router.post(
//   '/schedule', 
//   protectAdmin,
//   isAdmin,
//   maintenanceController.scheduleMaintenance
// );

// // Get all maintenance schedules (All authenticated users)
// router.get(
//   '/schedules',
//   authenticateDriver,
//   maintenanceController.getAllMaintenanceSchedules
// );

// // Get due maintenance (All authenticated users)
// router.get(
//   '/due',
//   authenticateDriver,
//   maintenanceController.getDueMaintenance
// );

// // Get upcoming maintenance (All authenticated users)
// router.get(
//   '/upcoming',
//   authenticateDriver,
//   maintenanceController.getUpcomingMaintenance
// );

// //  RECORD SERVICE DETAILS 

// // Record service details (Admin only)
// router.post(
//   '/:scheduleId/record-service',
//   protectAdmin,
//   isAdmin,
//   maintenanceController.recordServiceDetails
// );

// // Upload service documents (Admin only)
// // router.post(
// //   '/:scheduleId/documents',
// //   protectAdmin,
// //   isAdmin,
// //   upload.fields([
// //     { name: 'invoice', maxCount: 5 },
// //     { name: 'receipt', maxCount: 5 },
// //     { name: 'before_photo', maxCount: 10 },
// //     { name: 'after_photo', maxCount: 10 },
// //     { name: 'report', maxCount: 5 },
// //     { name: 'warranty', maxCount: 5 }
// //   ]),
// //   maintenanceController.uploadServiceDocuments
// // );

// //  CALCULATE NEXT SERVICE DATE 

// // Calculate next service date (based on 10k km intervals)
// router.get(
//   '/next-service/calculate',
//   authenticateDriver,
//   maintenanceController.calculateNextServiceDate
// );

// //  MAINTENANCE COST TRACKING 

// // Get maintenance cost summary
// router.get(
//   '/costs/summary',
//   authenticateDriver,
//   maintenanceController.getMaintenanceCostSummary
// );

// //  SERVICE HISTORY 

// // Get service history for a vehicle
// router.get(
//   '/history',
//   authenticateDriver,
//   maintenanceController.getServiceHistory
// );

// //  UPDATE & DELETE OPERATIONS 

// // Update maintenance schedule (Admin only)
// router.put(
//   '/:scheduleId',
//   protectAdmin,
//   isAdmin,
//   maintenanceController.updateMaintenanceSchedule
// );

// // Cancel maintenance schedule (Admin only)
// router.delete(
//   '/:scheduleId',
//   protectAdmin,
//   isAdmin,
//   maintenanceController.cancelMaintenanceSchedule
// );

// module.exports = router;


const express = require('express');
const router = express.Router();
const {
  getAllMaintenanceSchedules,
  getDueMaintenance,
  getUpcomingMaintenance,
  calculateNextServiceDate,
  getServiceHistory,
  completeServiceByDriver
} = require('../../controllers/Driver/maintenanceController');
const { isDriver, authenticateDriver } = require('../../middleware/authMiddleware');
const { uploadMaintenanceDocuments, handleUploadError } = require('../../middleware/uploadMiddleware');

router.get('/schedules', authenticateDriver ,isDriver, getAllMaintenanceSchedules);
router.get('/due', authenticateDriver,isDriver, getDueMaintenance);
router.get('/upcoming', authenticateDriver,isDriver, getUpcomingMaintenance);
router.get('/next-service/calculate', authenticateDriver,isDriver, calculateNextServiceDate);
router.get('/history', authenticateDriver,isDriver, getServiceHistory);

router.post(
  "/complete_service",
  authenticateDriver,
  isDriver,
  uploadMaintenanceDocuments,
  handleUploadError,
  completeServiceByDriver
)

module.exports = router;