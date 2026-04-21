const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { authenticate, isCustomer } = require('../middleware/authMiddleware');

// Customer Routes
router.post(
  '/',
  authenticate,
  isCustomer,
  feedbackController.submitFeedback
);

// Public/Admin Routes
router.get(
  '/delivery/:deliveryId',
  authenticate,
  feedbackController.getFeedbackByDelivery
);

router.get(
  '/driver/:driverId',
  feedbackController.getDriverFeedbacks
);

module.exports = router;

