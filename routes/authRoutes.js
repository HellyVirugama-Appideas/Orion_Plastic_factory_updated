const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');
const { validateEmail, validatePhone, validatePassword, validateRequiredFields } = require('../middleware/validator');

// Customer Routes
router.post(
  '/customer/signup',
  validateRequiredFields(['name', 'email', 'phone', 'password']),
  validateEmail,
  validatePhone,
  validatePassword,
  authController.customerSignup
);

router.post(
  '/customer/signin',
  validateRequiredFields(['email', 'password']),
  validateEmail,
  authController.customerSignin
);

// Token Management
router.post('/refresh-token', authController.refreshToken);

// Logout
router.post('/logout', authenticate, authController.logout);
router.post('/logout-all', authenticate, authController.logoutAll);

// Password Management
router.post(
  '/forgot-password',
  validateRequiredFields(['email']),
  validateEmail,
  authController.forgotPassword
);

// router.post(
//   '/reset-password',
//   // validateRequiredFields(['resetToken', 'newPassword']),
//   // validatePassword,
//   authController.resetPassword
// );

router.post("/reset-password",authController.resetPasswordWithToken)

router.post(
  '/change-password',
  authenticate,
  validateRequiredFields(['currentPassword', 'newPassword']),
  authController.changePassword
);

module.exports = router;
