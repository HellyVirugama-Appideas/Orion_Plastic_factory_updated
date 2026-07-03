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