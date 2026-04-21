const express = require('express');
const router = express.Router();
const routeController = require('../controllers/routeController');
const { authenticate, isAdmin, isDriver, protectAdmin, authenticateDriver } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/authMiddleware');

// Admin Routes
router.post(
  '/',  
  protectAdmin,
  isAdmin,
  checkPermission('routes', 'create'),
  routeController.createRoute
);

router.patch(
  '/:routeId/auto-arrange',
  protectAdmin,
  isAdmin,
  checkPermission('routes', 'update'),
  routeController.autoArrangeRoute
);

router.patch(
  '/:routeId/manual-arrange',
  protectAdmin,
  isAdmin,
  checkPermission('routes', 'update'),
  routeController.manualArrangeRoute
);

router.get(
  '/',
  protectAdmin,
  isAdmin,
  checkPermission('routes', 'read'),
  routeController.getAllRoutes
);

router.get(
  '/:routeId',
  authenticate,
  routeController.getRouteDetails
);

router.delete(
  '/:routeId',
  protectAdmin,
  isAdmin,
  checkPermission('routes', 'delete'),
  routeController.deleteRoute
);

// Driver Routes
router.get(
  '/driver/active',
  authenticateDriver,
  isDriver,
  routeController.getDriverActiveRoutes
);

router.patch(
  '/:routeId/start',
  authenticateDriver,
  isDriver,
  routeController.startRoute
);

router.patch(
  '/:routeId/complete',
  authenticateDriver,
  isDriver,
  routeController.completeRoute
);

module.exports = router;