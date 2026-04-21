const express = require('express');
const router = express.Router();
const customerController = require('../../controllers/admin/customerController');
const { isAdmin, protectAdmin } = require('../../middleware/authMiddleware');
const { checkPermission } = require('../../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const { uploadUpdateDriverDocuments, uploadUpdateCustomerDocuments } = require('../../middleware/uploadMiddleware');

//  CUSTOMER CRUD 

router.get(
  "/create-customer",
  protectAdmin,
  isAdmin,
  checkPermission('customers', 'create'),
  customerController.getCreateCustomer
)

// Create customer
// router.post(
//   '/',
//   protectAdmin,
//   isAdmin,
//   checkPermission('customers', 'create'),
//   customerController.createCustomer
// );

router.post(
  '/',
  protectAdmin,
  isAdmin,
  checkPermission('customers', 'create'),
  uploadUpdateCustomerDocuments, 
  customerController.createCustomer
);

// Get all customers
router.get(
  '/',
  protectAdmin,
  isAdmin,
  checkPermission('customers', 'read'),
  customerController.getAllCustomers
);
// View single customer
router.get(
  '/view/:customerId',
  protectAdmin,
  isAdmin,
  checkPermission('customers', 'read'),
  customerController.viewCustomer
);

// Get customer by ID
// router.get(
//   '/:customerId',
//   protectAdmin,
//   isAdmin,
//   checkPermission('customers', 'read'),
//   customerController.getCustomerById
// );

// Update customer
// Edit customer form
router.get(
  '/:customerId/edit',
  protectAdmin,
  isAdmin,
  checkPermission('customers', 'update'),
  customerController.getEditCustomer
);

router.post(
  '/:customerId/edit',
  protectAdmin,
  isAdmin,
  checkPermission('customers', 'update'),
  uploadUpdateCustomerDocuments,          
  customerController.updateCustomer
);


// Delete customer
router.post(
  '/:customerId/delete',
  protectAdmin,
  isAdmin,
  checkPermission('customers', 'delete'),
  customerController.deleteCustomer
);



//  LOCATION MANAGEMENT 

// Add location
router.post(
  '/:customerId/locations',
  protectAdmin,
  isAdmin,
  checkPermission('customers', 'update'),
  customerController.addLocation
);

// Update location
router.put(
  '/:customerId/locations/:locationId',
  protectAdmin,
  isAdmin,
  checkPermission('customers', 'update'),
  customerController.updateLocation
);

// Delete location
router.delete(
  '/:customerId/locations/:locationId',
  protectAdmin,
  isAdmin,
  checkPermission('customers', 'delete'),
  customerController.deleteLocation
);

router.post(
  "/:customerId/toggle-status",
  protectAdmin,
  isAdmin,
  checkPermission('customers', 'update'),
  customerController.toggleCustomerStatus
)

// Override region for location
// router.patch(
//   '/:customerId/locations/:locationId/override-region',
//   protectAdmin,
//   isAdmin,
//   checkPermission('customers', 'update'),
//   customerController.overrideRegion
// );

//  PREFERENCES 

// // Toggle feedback notification
// router.patch(
//   '/:customerId/toggle-feedback',
//   protectAdmin,
//   isAdmin,
//   checkPermission('customers', 'update'),
//   customerController.toggleFeedbackNotification
// );

// // Update preferences
// router.patch(
//   '/:customerId/preferences',
//   protectAdmin,
//   isAdmin,
//   checkPermission('customers', 'update'),
//   customerController.updatePreferences
// );

// //  BULK OPERATIONS 

// // Bulk import (CSV)
// router.post(
//   '/bulk/import',
//   protectAdmin,
//   isAdmin,
//   checkPermission('customers', 'create'),
//   // upload.single('csvFile'),
//   customerController.bulkImport
// );

// // Bulk export (CSV)
// router.get(
//   '/bulk/export',
//   protectAdmin,
//   isAdmin,
//   checkPermission('customers', 'read'),
//   customerController.bulkExport
// );

// //  STATISTICS 

// // Get customer statistics
// router.get(
//   '/stats/overview',
//   protectAdmin,
//   isAdmin,
//   checkPermission('customers', 'read'),
//   customerController.getCustomerStatistics
// );

module.exports = router;