// const express = require('express');
// const router = express.Router();
// const expenseController = require('../../controllers/Driver/expenseController');
// const { uploadExpenseReceipts, handleUploadError } = require('../../middleware/uploadMiddleware');
// const { authenticateDriver, isDriver } = require('../../middleware/authMiddleware');

// //  DRIVER EXPENSE ROUTES 

// // Create fuel expense
// router.post(
//     '/fuel',
//     authenticateDriver,
//     isDriver,
//     expenseController.createFuelExpense
// );

// // Upload receipts and meter photos
// router.post(    
//     '/:expenseId/receipts',
//     authenticateDriver,
//     isDriver,
//     uploadExpenseReceipts,
//     handleUploadError,
//     expenseController.uploadReceipts
// );

// // Get my expenses
// router.get(
//     '/my-expenses',
//     authenticateDriver,
//     isDriver,
//     expenseController.getMyExpenses
// );

// // Get expense by ID
// router.get(
//     '/:expenseId',
//     authenticateDriver,
//     isDriver,
//     expenseController.getExpenseById
// );

// // Calculate my mileage
// router.get(
//     '/mileage/calculate',
//     authenticateDriver,
//     isDriver,
//     expenseController.calculateMyMileage
// );

// // Get my expense summary
// router.get(
//     '/summary/stats',
//     authenticateDriver,
//     isDriver,
//     expenseController.getMyExpenseSummary
// );

// // Update expense (only if pending or rejected)
// router.put(
//     '/:expenseId',
//     authenticateDriver,
//     isDriver,
//     expenseController.updateExpense
// );

// // Delete expense (only if pending)
// router.delete(
//     '/:expenseId',
//     authenticateDriver,
//     isDriver,
//     expenseController.deleteExpense
// );
 
// module.exports = router;
 
 
const express = require('express');
const router = express.Router();
const expenseController = require('../../controllers/Driver/expenseController');
const { uploadExpenseReceipts, handleUploadError } = require('../../middleware/uploadMiddleware');
const { authenticateDriver, isDriver } = require('../../middleware/authMiddleware');


// CREATE EXPENSES
// Create fuel expense - Matches "Add Fuel Expense" screen
router.post(
  '/fuel',
  authenticateDriver,
  isDriver,
  uploadExpenseReceipts,
  handleUploadError,
  expenseController.createFuelExpense
);

// Create vehicle expense - Matches "Add Vehicle Expense" screen
router.post(
  '/vehicle',
  authenticateDriver,
  isDriver,
  uploadExpenseReceipts,
  handleUploadError,
  expenseController.createVehicleExpense
);

// UPLOAD FILES

// Upload receipts, photos, and files - Matches file upload screens
router.post(    
  '/:expenseId/receipts',
  authenticateDriver,
  isDriver,
  uploadExpenseReceipts,
  handleUploadError,
  expenseController.uploadReceipts
);

// GET EXPENSES

// Get my expenses with filters - Matches expenses list screen (All/Fuel/Maintenance/Vehicle tabs)
router.get(
  '/my-expenses',
  authenticateDriver,
  isDriver,
  expenseController.getMyExpenses
);

// Get expense by ID - Matches expense details screen
router.get(
  '/:expenseId',
  authenticateDriver,
  isDriver,
  expenseController.getExpenseById
);

// ANALYTICS & REPORTS

// Calculate my mileage
router.get(
  '/mileage/calculate',
  authenticateDriver,
  isDriver,
  expenseController.calculateMyMileage
);

// Get my expense summary
router.get(
  '/summary/stats',
  authenticateDriver,
  isDriver,
  expenseController.getMyExpenseSummary
);

// UPDATE & DELETE

// Update expense (only if pending or rejected)
router.put(
  '/:expenseId',
  authenticateDriver,
  isDriver,
  expenseController.updateExpense
);

// Delete expense (only if pending)
router.delete(
  '/:expenseId',
  authenticateDriver,
  isDriver,
  expenseController.deleteExpense
);

module.exports = router;