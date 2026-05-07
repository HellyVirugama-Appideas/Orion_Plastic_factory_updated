const express = require("express");
const { saveStep1, saveStep2, saveStep3, finalSignup, verifyOtpAndCreateDriver, createPin, login, verifyPin, updatePersonalDetails, updateRC, deleteAccount, logout, resendOtp, updateLicense, updateMulkia, updateAvailability } = require("../../controllers/Driver/driverController");
const { uploadDriverDocuments, handleUploadError } = require("../../middleware/uploadMiddleware");
const { authenticatePendingDriver } = require("../../middleware/authPendingDriver");
const { sendPinResetOtp, verifyPinResetOtp, setNewPin, confirmNewPin, resendPinResetOtp } = require("../../controllers/Driver/forgotPinController");
const { verifyOldPin, setNewpin, confirmAndChangePin } = require("../../controllers/Driver/changePinController");
const { authenticateDriver, isDriver } = require("../../middleware/authMiddleware");
const { getNotifications, markNotificationsRead } = require("../../controllers/Driver/notificationController");

const router = express.Router()

router.post('/onboarding/step1', saveStep1);
router.post('/onboarding/step2', uploadDriverDocuments, handleUploadError, saveStep2);
router.post('/onboarding/step3', uploadDriverDocuments, handleUploadError, saveStep3);

router.post('/signup', finalSignup);
router.post('/signup/verify-otp', verifyOtpAndCreateDriver);
router.post("/signup/resend-otp", resendOtp)

router.post("/create-pin", authenticatePendingDriver, createPin)

////login
router.post("/login", login)

router.post("/login/verify-pin", verifyPin)

///forgot pin
router.post("/forgot-pin", sendPinResetOtp)
router.post("/forgot-pin/verify-otp", verifyPinResetOtp),
router.post("/forgot-pin/resend-otp", resendPinResetOtp)
router.post("/forgot-pin/new-pin", setNewPin)
router.post("/forgot-pin/confirm", confirmNewPin)

///change pin
router.post("/change-pin/verify-old", authenticateDriver, isDriver, verifyOldPin)
router.post("/change-pin/set-newPin", authenticateDriver, isDriver, setNewpin)
router.post("/change-pin/confirm", authenticateDriver, isDriver, confirmAndChangePin)

///profile
router.put("/profile/update-profile", authenticateDriver, isDriver, updatePersonalDetails)
router.put("/profile/update-license", authenticateDriver, isDriver, uploadDriverDocuments, updateLicense)
router.put("/profile/update-Mulkia", authenticateDriver, isDriver, uploadDriverDocuments, updateMulkia)

router.delete("/account/delete/:id", authenticateDriver, isDriver, deleteAccount)
router.post("/logout", authenticateDriver, isDriver, logout)

// notification 

router.get('/notification', authenticateDriver, isDriver, getNotifications);
router.patch("/notification/read", authenticateDriver, isDriver, markNotificationsRead )

router.put(
  '/update-availability',
  authenticateDriver,
  isDriver,
  updateAvailability
);

module.exports = router
