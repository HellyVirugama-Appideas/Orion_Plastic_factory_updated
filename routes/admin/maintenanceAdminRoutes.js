const express = require('express');
const router = express.Router();
const { protectAdmin, isAdmin } = require('../../middleware/authMiddleware');
const upload = require('../../middleware/uploadMiddleware');
const {
  scheduleMaintenance,
  recordServiceDetails,
  uploadServiceDocuments,
  updateMaintenanceSchedule,
  cancelMaintenanceSchedule,
  getMaintenanceCostSummary,
  approveOrRejectService
} = require('../../controllers/admin/maintenanceAdminController');
const {uploadMaintenanceDocuments,handleUploadError} = require("../../middleware/uploadMiddleware")

router.post('/schedule', protectAdmin, scheduleMaintenance);
router.post('/:scheduleId/record-service', protectAdmin, recordServiceDetails);

// router.post('/:scheduleId/documents', protectAdmin, upload.fields([
//   { name: 'invoice', maxCount: 5 },
//   { name: 'receipt', maxCount: 5 },
//   { name: 'before_photo', maxCount: 10 },
//   { name: 'after_photo', maxCount: 10 },
//   { name: 'report', maxCount: 5 },
//   { name: 'warranty', maxCount: 5 }
// ]), uploadServiceDocuments);

router.post("/:scheduleId/documents",
  protectAdmin,
  uploadMaintenanceDocuments,
  uploadServiceDocuments
)

router.post('/:scheduleId/documents',
  protectAdmin,
  uploadMaintenanceDocuments,     
  handleUploadError,              
  uploadServiceDocuments          
);

router.put('/:scheduleId', protectAdmin, updateMaintenanceSchedule);
router.delete('/:scheduleId', protectAdmin, cancelMaintenanceSchedule);
router.get('/costs/summary', protectAdmin, getMaintenanceCostSummary);

router.post('/:scheduleId/approve-reject', protectAdmin, isAdmin,approveOrRejectService)

module.exports = router;