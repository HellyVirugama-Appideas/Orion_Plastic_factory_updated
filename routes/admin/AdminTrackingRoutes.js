// const express = require('express');
// const router = express.Router();
// const { protectAdmin, isAdmin } = require('../../middleware/authMiddleware');
// const { getLiveLocation, getRouteHistory, trackDeliveryProgress, getFleetView, getFinalLocationProof, getDriverLocation, deleteOldTrackingLogs, getAllDriverLocations } = require('../../controllers/admin/AdminTrackingcontroller');
// const { renderLiveTracking } = require('../../controllers/admin/adminDashboardController');

// // ✅ FIXED: was '/tracking/live' (wrong nested path), now '/live'
// router.get('/live', renderLiveTracking);

// // ✅ NEW: Get all driver locations for fleet map (no auth for socket page refresh)
// router.get('/all-driver-locations', protectAdmin, getAllDriverLocations);
// // router.get('/tracking/:trackingNumber', deliveryController.renderTrackingPage);

// router.get(
//   '/live-location/:deliveryId',
//   protectAdmin,
//   isAdmin,
//   getLiveLocation
// );

// router.get(
//   '/route-history/:deliveryId',
//   protectAdmin,
//   isAdmin,
//   getRouteHistory
// );

// router.get(
//   '/progress/:deliveryId',
//   protectAdmin,
//   isAdmin,
//   trackDeliveryProgress
// );

// router.get(
//   '/fleet-view',
//   protectAdmin,
//   isAdmin,
//   getFleetView
// );

// router.get(
//   '/final-location/:deliveryId',
//   protectAdmin,
//   isAdmin,
//   getFinalLocationProof
// );

// router.get(
//   '/driver/:driverId/location',
//   protectAdmin,
//   isAdmin,
//   getDriverLocation
// );

// router.delete(
//   '/cleanup',
//   protectAdmin,
//   isAdmin,
//   deleteOldTrackingLogs
// );

// module.exports = router;

// FILE: routes/admin/AdminTrackingRoutes.js

const express = require('express');
const router = express.Router();
const { protectAdmin, isAdmin } = require('../../middleware/authMiddleware');
const {
  getLiveLocation,
  getRouteHistory,
  trackDeliveryProgress,
  getFleetView,
  getFinalLocationProof,
  getDriverLocation,
  deleteOldTrackingLogs,
  getAllDriverLocations
} = require('../../controllers/admin/AdminTrackingcontroller');
const {
  renderLiveTracking,
  getAllDriverLocations: getDashboardDriverLocations
} = require('../../controllers/admin/adminDashboardController');

// ── Render Pages ──────────────────────────────────────────────
router.get('/live', renderLiveTracking);

// ── API: Driver Locations (Dashboard + Live Tracking page dono use karte hain) ──
// IMPORTANT: Yeh route /admin/tracking/api/drivers/locations pe accessible hoga
// Dashboard mein fetch('/admin/api/drivers/locations') call hota hai
// Isliye adminDashboardController ka function use karo
router.get('/api/drivers/locations', protectAdmin, getDashboardDriverLocations);

// Purana route bhi rakho backward compatibility ke liye
router.get('/all-driver-locations', protectAdmin, getAllDriverLocations);

// ── Live Location APIs ────────────────────────────────────────
router.get('/live-location/:deliveryId', protectAdmin, isAdmin, getLiveLocation);
router.get('/route-history/:deliveryId', protectAdmin, isAdmin, getRouteHistory);
router.get('/progress/:deliveryId', protectAdmin, isAdmin, trackDeliveryProgress);
router.get('/fleet-view', protectAdmin, isAdmin, getFleetView);
router.get('/final-location/:deliveryId', protectAdmin, isAdmin, getFinalLocationProof);
router.get('/driver/:driverId/location', protectAdmin, isAdmin, getDriverLocation);
router.delete('/cleanup', protectAdmin, isAdmin, deleteOldTrackingLogs);

module.exports = router;