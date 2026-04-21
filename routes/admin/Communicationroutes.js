const express = require('express');
const router = express.Router();
const chatController = require('../../controllers/admin/Chatcontroller');
const reportsController = require('../../controllers/admin/Reportscontroller');
const analyticsController = require('../../controllers/admin/Analyticscontroller');
const { protectAdmin, isAdmin } = require('../../middleware/authMiddleware');
const { checkPermission } = require('../../middleware/authMiddleware');
const { uploadChatMedia, handleUploadError } = require('../../middleware/uploadMiddleware');

// ==================== CHAT ROUTES ====================

// Chat Dashboard (list) - requires 'read' permission
router.get(
  '/',
  protectAdmin,
  isAdmin,
  checkPermission('chat', 'read'),
  chatController.renderChatDashboard
);

// Single Conversation - requires 'read' permission
router.get(
  '/:conversationId',
  protectAdmin,
  isAdmin,
  checkPermission('chat', 'read'),
  chatController.renderConversation
);

// Get conversations list - requires 'read'
router.get(
  '/conversations',
  protectAdmin,
  isAdmin,
  checkPermission('chat', 'read'),
  chatController.getConversations
);

// Get messages - requires 'read'
router.get(
  '/:conversationId/messages',
  protectAdmin,
  isAdmin,
  checkPermission('chat', 'read'),
  chatController.getMessages
);

// Send message - requires 'create' permission
router.post(
  '/send',
  protectAdmin,
  isAdmin,
  checkPermission('chat', 'create'),
  uploadChatMedia,
  handleUploadError,
  chatController.sendMessage
);

// Edit message - requires 'update'
router.patch(
  "/message/:messageId/edit",
  protectAdmin,
  isAdmin,
  checkPermission('chat', 'update'),
  chatController.editMessage
);

// Delete message - requires 'delete'
router.delete(
  "/message/:messageId",
  protectAdmin,
  isAdmin,
  checkPermission('chat', 'delete'),
  chatController.deleteMessage
);

// ==================== REPORTS ROUTES ====================

// All reports require 'read' permission (reports module ke liye)
router.get('/reports/deliveries', protectAdmin, isAdmin, checkPermission('reports', 'read'), reportsController.getDeliveryReport);
router.get('/reports/customers', protectAdmin, isAdmin, checkPermission('reports', 'read'), reportsController.getCustomerReport);
router.get('/reports/vehicles', protectAdmin, isAdmin, checkPermission('reports', 'read'), reportsController.getVehicleReport);
router.get('/reports/maintenance', protectAdmin, isAdmin, checkPermission('reports', 'read'), reportsController.getMaintenanceReport);
router.get('/reports/fuel-expenses', protectAdmin, isAdmin, checkPermission('reports', 'read'), reportsController.getFuelExpenseReport);
router.get('/reports/driver-performance', protectAdmin, isAdmin, checkPermission('reports', 'read'), reportsController.getDriverPerformanceReport);
router.get('/reports/punctuality', protectAdmin, isAdmin, checkPermission('reports', 'read'), reportsController.getOnTimeDelayedReport);
router.get('/reports/region-distribution', protectAdmin, isAdmin, checkPermission('reports', 'read'), reportsController.getRegionDistributionReport);

// Export reports - requires 'read'
router.get('/reports/export/excel', protectAdmin, isAdmin, checkPermission('reports', 'read'), reportsController.exportToExcel);
router.get('/reports/export/pdf', protectAdmin, isAdmin, checkPermission('reports', 'read'), reportsController.exportToPDF);

// ==================== ANALYTICS ROUTES ====================

// All analytics require 'read' permission (analytics module ke liye)
router.get('/analytics/fuel', protectAdmin, isAdmin, checkPermission('analytics', 'read'), analyticsController.getFuelAnalytics);
router.get('/analytics/punctuality', protectAdmin, isAdmin, checkPermission('analytics', 'read'), analyticsController.getPunctualityMetrics);
router.get('/analytics/driver-score', protectAdmin, isAdmin, checkPermission('analytics', 'read'), analyticsController.getDriverPerformanceScore);
router.get('/analytics/kpis', protectAdmin, isAdmin, checkPermission('analytics', 'read'), analyticsController.getDashboardKPIs);

module.exports = router;