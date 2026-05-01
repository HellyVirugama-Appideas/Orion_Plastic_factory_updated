const express = require('express');
const router = express.Router();
const adminAuthController = require('../../controllers/admin/adminAuthController');
const adminDashboardController = require('../../controllers/admin/adminDashboardController');
const documentVerificationController = require('../../controllers/admin/documentVerificationController');
const { protectAdmin, isAdmin, isSuperAdmin } = require('../../middleware/authMiddleware');
const { checkPermission } = require('../../middleware/authMiddleware');
const { validateEmail, validatePassword, validateRequiredFields } = require('../../middleware/validator');


// ========== Admin Authentication Routes ==========
router.get('/signin', adminAuthController.renderLogin);

router.post(
  '/signup',
  validateRequiredFields(['name', 'email', 'phone', 'password']),
  validateEmail,
  validatePassword,
  adminAuthController.adminSignup
);

router.post(
  '/signin',
  validateRequiredFields(['email', 'password']),
  validateEmail,
  adminAuthController.adminSignin
);


// Dashboard
router.get('/', protectAdmin, isAdmin, adminDashboardController.renderDashboard);
// router.get('/', (req, res) => res.redirect('/admin/dashboard'));

router.get('/profile', protectAdmin, adminAuthController.getAdminProfile);

router.put('/profile', protectAdmin, adminAuthController.updateAdminProfile);

router.get("/logout", protectAdmin, adminAuthController.adminLogout)

router.post("/logout/all", protectAdmin, adminAuthController.adminLogoutAll)

router.get("/changepass", protectAdmin, isAdmin, adminAuthController.getChangePass)

router.post("/changepass", protectAdmin,isAdmin,adminAuthController.postChangePass)

// ========== Dashboard Routes ==========
// router.get('/dashboard/stats', protectAdmin,  adminDashboardController.getDashboardStats);
router.get('/dashboard', protectAdmin, adminDashboardController.renderDashboard);

router.get('/api/drivers/locations', protectAdmin, adminDashboardController.getAllDriverLocations);
router.get('/api/drivers/:driverId/location', protectAdmin, adminDashboardController.getDriverLocation);


// ========== Driver Management Routes ==========

// router.get('/drivers/create', driverController.renderCreateDriver);

// router.get(
//   '/drivers',
//   protectAdmin,
//   checkPermission('drivers', 'read'),
//   adminDashboardController.getAllDrivers
// );

router.get(
  '/drivers/:driverId/documents',
  protectAdmin,
  checkPermission('documents', 'read'),
  documentVerificationController.getDriverDocuments
);

router.patch(
  '/drivers/:driverId/approve',
  protectAdmin,
  checkPermission('drivers', 'approve'),
  documentVerificationController.approveDriverProfile
);

router.patch(
  '/drivers/:driverId/reject',
  protectAdmin,

  checkPermission('drivers', 'reject'),
  validateRequiredFields(['rejectionReason']),
  documentVerificationController.rejectDriverProfile
);

// ========== Document Verification Routes ==========
router.get(
  '/documents',
  protectAdmin,

  checkPermission('documents', 'read'),
  documentVerificationController.getAllDocuments
);

router.get(
  '/documents/pending',
  protectAdmin,

  checkPermission('documents', 'read'),
  documentVerificationController.getPendingDocuments
);

router.get(
  '/documents/:documentId',
  protectAdmin,

  checkPermission('documents', 'read'),
  documentVerificationController.getDocumentDetails
);

router.patch(
  '/documents/:documentId/verify',
  protectAdmin,

  checkPermission('documents', 'approve'),
  documentVerificationController.verifyDocument
);

router.patch(
  '/documents/:documentId/reject',
  protectAdmin,

  checkPermission('documents', 'reject'),
  validateRequiredFields(['rejectionReason']),
  documentVerificationController.rejectDocument
);

// Sub Admin Management (Only Super Admin can access)
router.get(
  '/sub-admin/list',
  protectAdmin,
  isSuperAdmin,
  adminAuthController.getSubAdminList
);
router.get(
  '/sub-admin/add',
  protectAdmin,
  isSuperAdmin,
  adminAuthController.getAddSubAdmin
);
router.post(
  '/sub-admin/add',
  protectAdmin,
  isSuperAdmin,
  adminAuthController.postSubAdmin
);
router.get(
  '/sub-admin/edit/:id',
  protectAdmin,
  isSuperAdmin,
  adminAuthController.getEditSubAdmin
);
router.post(
  '/sub-admin/edit/:id',
  protectAdmin,
  isSuperAdmin,
  adminAuthController.postEditSubAdmin
);
router.post(
  '/sub-admin/status/:id/:status',
  protectAdmin,
  isSuperAdmin,
  adminAuthController.changeAdminStatus
);
router.post(
  '/sub-admin/delete/:id',
  protectAdmin,
  isSuperAdmin,
  adminAuthController.deleteSubAdmin
);

router.get(
  "/sub-admin/status/:id/:status",
  protectAdmin,
  isSuperAdmin,
  adminAuthController.updateSubAdminStatus
)


module.exports = router;