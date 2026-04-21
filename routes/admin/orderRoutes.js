const express = require('express');
const router = express.Router();

const orderController = require('../../controllers/admin/orderController');
const { protectAdmin, isAdmin } = require('../../middleware/authMiddleware');
const { checkPermission } = require('../../middleware/authMiddleware');

// ============= PAGE ROUTES =============

// Orders list page
router.get(
  '/',
  protectAdmin,
  isAdmin,
  checkPermission('orders', 'read'),
  orderController.renderOrdersList
);

// Create order page
router.get(
  '/create',
  protectAdmin,
  isAdmin,
  checkPermission('orders', 'create'),
  orderController.renderCreateOrder
);

// Order details page (MUST be after /create to avoid route conflicts)
router.get(
  '/view/:orderId',
  protectAdmin,
  isAdmin,
  checkPermission('orders', 'read'),
  orderController.renderOrderDetails
);



// Edit order page
router.get(
  '/edit/:orderId',
  protectAdmin,
  isAdmin,
  checkPermission('orders', 'update'),
  orderController.renderEditOrder
);

router.post(
  '/delete/:orderId',
  protectAdmin,
  isAdmin,
  checkPermission('orders', 'delete'),
  orderController.deleteOrder
);

// Create delivery from order page
router.get(
  '/:orderId/create-delivery',
  protectAdmin,
  isAdmin,
  checkPermission('deliveries', 'create'),
  orderController.renderCreateDeliveryFromOrder
);

// ============= POST/PATCH ACTIONS =============

// Create order (from orderController)
router.post(
  '/create',
  protectAdmin,
  isAdmin,
  checkPermission('orders', 'create'),
  orderController.createOrder
);

// Update order
router.put(
  '/edit/:orderId',
  protectAdmin,
  isAdmin,
  checkPermission('orders', 'update'),
  orderController.updateOrder
);


/// delete order
router.delete(
  "/:orderId",
  protectAdmin,
  isAdmin,
  orderController.deleteOrder
)

// Confirm order
router.patch(
  '/:orderId/confirm',
  protectAdmin,
  isAdmin,
  checkPermission('orders', 'update'),
  orderController.confirmOrder
);

// Update order status
router.patch(
  '/:orderId/status',
  protectAdmin,
  isAdmin,
  checkPermission('orders', 'update'),
  orderController.updateOrderStatus
);

// Create delivery from order (API endpoint)
router.post(
  '/:orderId/create-delivery',
  protectAdmin,
  isAdmin,
  checkPermission('deliveries', 'create'),
  orderController.createDeliveryFromOrder
);

// ============= API ENDPOINTS =============

// Get order statistics
router.get(
  '/stats/overview',
  protectAdmin,
  isAdmin,
  checkPermission('orders', 'read'),
  orderController.getOrderStatistics
);

// Get all orders (API)
router.get(
  '/all',
  protectAdmin,
  isAdmin,
  checkPermission('orders', 'read'),
  orderController.getAllOrders
);

router.patch(
  '/:orderId/priority',
  protectAdmin,
  isAdmin,
  orderController.updateOrderPriority
);

// Get single order (API)
router.get(
  '/:orderId',
  protectAdmin,
  isAdmin,
  checkPermission('orders', 'read'),
  orderController.getOrderDetails
);

// ======================== PICKUP LOCATION ROUTES ========================

// Create new pickup location
router.post(
  '/pickup-locations/create',
  protectAdmin,
  isAdmin,
  checkPermission('orders', 'create'),
  orderController.createPickupLocation
);

// Update pickup location
router.post(
  '/pickup-locations/:locationId/update',
  protectAdmin,
  isAdmin,
  checkPermission('orders', 'update'),
  orderController.updatePickupLocation
);

// Delete pickup location
router.delete(
  '/pickup-locations/:locationId/delete',
  protectAdmin,
  isAdmin,
  checkPermission('orders', 'delete'),
  orderController.deletePickupLocation
);

// ── PRIORITY UPDATE ──
router.patch('/:orderId/priority', protectAdmin, isAdmin, orderController.updateOrderPriority);

module.exports = router;