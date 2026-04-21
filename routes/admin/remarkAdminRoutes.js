// const express = require('express');
// const router = express.Router();
// const remarkController = require('../../controllers/admin/remarkAdminController');
// const { isAdmin, protectAdmin } = require('../../middleware/authMiddleware');

// //  PREDEFINED REMARKS (ADMIN) 
// // Create predefined remark (Admin only)
// router.post(
//   '/predefined',
//   protectAdmin,
//   isAdmin,
//   remarkController.createPredefinedRemark
// );

// // Update predefined remark (Admin only)
// router.put(
//   '/predefined/:remarkId',
//   protectAdmin,
//   isAdmin,
//   remarkController.updatePredefinedRemark
// );

// // Delete predefined remark (Admin only)
// router.delete(
//   '/predefined/:remarkId',
//   protectAdmin,
//   isAdmin,
//   remarkController.deletePredefinedRemark
// );


// //  ADMIN APPROVAL FOR CUSTOM REMARKS 

// // Get pending custom remarks (Admin)
// router.get(
//   '/custom/pending',
//   protectAdmin,
//   isAdmin,
//   remarkController.getPendingCustomRemarks
// );

// // Approve custom remark (Admin)
// router.post(
//   '/custom/:remarkId/approve',
//   protectAdmin,
//   isAdmin,
//   remarkController.approveCustomRemark
// );

// // Reject custom remark (Admin)
// router.post(
//   '/custom/:remarkId/reject',
//   protectAdmin,
//   isAdmin,
//   remarkController.rejectCustomRemark
// );

// // Get remark statistics (Admin)
// router.get(
//   '/analytics/statistics',
//   protectAdmin,
//   isAdmin,
//   remarkController.getRemarkStatistics
// );

// module.exports = router;

// routes/admin/remarks.js (Updated for EJS views)
const express = require('express');
const router = express.Router();
const remarkController = require('../../controllers/admin/remarkAdminController');
const { isAdmin, protectAdmin } = require('../../middleware/authMiddleware');

// JSON APIs (keep your existing ones)

// ───────────────────────────────────────────────────────────────
// EJS Routes for Admin Pages

// List predefined remarks
router.get('/', protectAdmin, isAdmin, remarkController.listPredefinedRemarks);

// Show create form
router.get('/create', protectAdmin, isAdmin, remarkController.showCreatePredefinedRemark);

// Create new predefined
router.post('/create', protectAdmin, isAdmin, remarkController.createPredefinedRemarkEJS);

// Show edit form
router.get('/:remarkId/edit', protectAdmin, isAdmin, remarkController.showEditPredefinedRemark);

// Update predefined
router.post('/:remarkId/edit', protectAdmin, isAdmin, remarkController.updatePredefinedRemarkEJS);

// Delete predefined
router.post('/:remarkId/delete', protectAdmin, isAdmin, remarkController.deletePredefinedRemarkEJS);

// List pending custom remarks
router.get('/pending-custom', protectAdmin, isAdmin, remarkController.listPendingCustomRemarks);

// Approve custom
router.post('/custom/:remarkId/approve', protectAdmin, isAdmin, remarkController.approveCustomRemarkEJS);

// Reject custom
router.post('/custom/:remarkId/reject', protectAdmin, isAdmin, remarkController.rejectCustomRemarkEJS);

// Show statistics
router.get('/statistics', protectAdmin, isAdmin, remarkController.showRemarkStatistics);

router.get('/:remarkId/view',protectAdmin,isAdmin,remarkController.viewRemark)

module.exports = router;