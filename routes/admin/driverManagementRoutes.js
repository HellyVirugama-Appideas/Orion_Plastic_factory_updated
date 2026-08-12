
const express = require('express');
const router = express.Router();
const Driver = require("../../models/Driver");
const driverManagementController = require('../../controllers/admin/driverManagementController');
const { protectAdmin, isAdmin } = require('../../middleware/authMiddleware');
const { checkPermission } = require('../../middleware/authMiddleware');
const adminDashboardController = require("../../controllers/admin/adminDashboardController");
const { uploadDocument, handleUploadError, uploadDriverDocuments, uploadUpdateDriverDocuments } = require('../../middleware/uploadMiddleware');
const { getDriversDocumentsPage, verifySingleDocument, rejectSingleDocument, getSingleDriverDocumentsPage } = require('../../controllers/admin/documentVerificationController');

// Specific routes FIRST (fixed order)

// Create driver - only if 'create' permission
router.get('/create', protectAdmin, isAdmin, checkPermission('drivers', 'create'), driverManagementController.getCreateDriver);
router.post('/create', protectAdmin, isAdmin, checkPermission('drivers', 'create'), uploadDriverDocuments, handleUploadError, driverManagementController.createDriver);

// View single driver - only if 'read' permission
router.get('/view/:driverId', protectAdmin, isAdmin, checkPermission('drivers', 'read'), adminDashboardController.renderDriverDetails);

// Toggle profile status (approve/reject) - only if 'update' permission
router.get('/profile-status/:driverId/:status', protectAdmin, isAdmin, checkPermission('drivers', 'update'), adminDashboardController.toggleDriverProfileStatus);

// Block/Unblock driver - only if 'update' permission
router.post('/:driverId/block', protectAdmin, isAdmin, checkPermission('drivers', 'update'), driverManagementController.blockDriver);
router.post('/:driverId/unblock', protectAdmin, isAdmin, checkPermission('drivers', 'update'), driverManagementController.unblockDriver);

// Edit driver - only if 'update' permission
router.get('/edit/:driverId', protectAdmin, isAdmin, checkPermission('drivers', 'update'), driverManagementController.getEditDriverForm);
router.post('/edit/:driverId', protectAdmin, isAdmin, checkPermission('drivers', 'update'), uploadUpdateDriverDocuments, handleUploadError, driverManagementController.updateDriverDetails);

// Delete driver - only if 'delete' permission
router.post('/delete/:driverId', protectAdmin, isAdmin, checkPermission('drivers', 'delete'), driverManagementController.deleteDriver);

// Update bank details - only if 'update' permission
router.patch('/:driverId/bank-details', protectAdmin, isAdmin, checkPermission('drivers', 'update'), driverManagementController.updateBankDetails);

// Driver performance - only if 'read' permission
router.get('/:driverId/performance', protectAdmin, isAdmin, checkPermission('drivers', 'read'), driverManagementController.getDriverPerformance);

// List page - only if 'read' permission
router.get('/', protectAdmin, isAdmin, checkPermission('drivers', 'read'), adminDashboardController.renderDriversList);

// Statistics - only if 'read' permission
router.get('/stats/overview', protectAdmin, isAdmin, checkPermission('drivers', 'read'), driverManagementController.getDriverStatistics);

// Documents & verification - only if 'read' or 'update' permission
router.get('/documents/:driverId', protectAdmin, isAdmin, checkPermission('drivers', 'read'), getSingleDriverDocumentsPage);
router.get('/document/:driverId/:documentId/verify', protectAdmin, isAdmin, checkPermission('drivers', 'update'), verifySingleDocument);
router.post('/document/:driverId/:documentId/reject', protectAdmin, isAdmin, checkPermission('drivers', 'update'), rejectSingleDocument);

router.post(
  '/:driverId/toggle-status',
  protectAdmin,
  isAdmin,
  checkPermission('drivers', 'update'),
  driverManagementController.toggleDriverStatus
);

router.get(
  "/logs/:driverId",
  protectAdmin,
  isAdmin,
  checkPermission("drivers","read"),
  driverManagementController.getDriverLogs
)


module.exports = router;