const express = require("express")
const { startJourney, addJourneyImage, endJourney, getActiveJourney, getJourneyDetails, getDriverJourneyHistory, addCheckpoint, cancelJourney, initiateCall, endCall, initiateWhatsApp, getCommunicationHistory, getNavigation, uploadRecording, completeDelivery, uploadProofPhotos, uploadProofSignature, updateJourneyLocation, continueJourney, getActiveJourneyByDeliveryId } = require("../../controllers/Driver/journeyController")
const { authenticateDriver, isDriver } = require("../../middleware/authMiddleware")
const { uploadJourneyImage, handleUploadError, uploadSignature,uploadProofAndStamp } = require("../../middleware/uploadMiddleware")

const router = express.Router()

router.put(
  "/update-location/:journeyId",
  authenticateDriver, 
  isDriver,
  updateJourneyLocation
);

router.post(
  "/start",
  authenticateDriver,
  isDriver,
  startJourney 
)

router.post(
  "/continue",
  authenticateDriver,
  isDriver,
  continueJourney
);

// ==================== GET ACTIVE JOURNEY BY DELIVERY ID ====================
// To check if journey exists for a delivery
router.get(
  "/active/:deliveryId",
  authenticateDriver,
  isDriver,
  getActiveJourneyByDeliveryId
);

router.post(
  "/checkpoint/:journeyId",
  authenticateDriver,
  isDriver,
  addCheckpoint
)

router.post(
  "/image/:journeyId",
  authenticateDriver,
  isDriver,
  uploadJourneyImage,
  handleUploadError,
  addJourneyImage
)

router.post(
  "/signature/:deliveryId",
  authenticateDriver,
  isDriver,
  uploadSignature,
  handleUploadError,
  uploadProofSignature
)
router.post(
  "/proof-photos/:deliveryId",
  authenticateDriver,
  isDriver,
  uploadProofAndStamp,
  handleUploadError,
  uploadProofPhotos
),
router.post(
  "/complete-delivery/:journeyId",
  authenticateDriver,
  isDriver,
  completeDelivery
)

router.post(
  "/:journeyId/end",
  authenticateDriver,
  isDriver,
  endJourney
)

router.post(
  "/cancel/:journeyId",
  authenticateDriver,
  isDriver,
  cancelJourney
)

router.post(
  "/call/:journeyId",
  authenticateDriver,
  isDriver,
  initiateCall
)

router.put(
  "/:journeyId/call/:callId/end/call",
  authenticateDriver,
  isDriver,
  endCall
)

router.post(
  "/whatsapp/:journeyId",
  authenticateDriver,
  isDriver,
  initiateWhatsApp
)

router.get(
  "/communications/:journeyId",
  authenticateDriver,
  isDriver,
  getCommunicationHistory
)

////
router.get(
  "/navigate/:journeyId",
  authenticateDriver,
  isDriver,
  getNavigation
)

router.post(
  "/recordings/:journeyId",
  authenticateDriver,
  isDriver,
  uploadRecording
)

router.get(
  "/active",
  authenticateDriver,
  isDriver,
  getActiveJourney
)

router.get(
  "/:journeyId",
  authenticateDriver,
  isDriver,
  getJourneyDetails
)

router.get(
  "/",
  authenticateDriver,
  isDriver,
  getDriverJourneyHistory
)
 

router.get(
  "/active",
  authenticateDriver,
  isDriver,
  getActiveJourney
)

router.get(
  "/:journeyId",
  authenticateDriver,
  isDriver,
  getJourneyDetails
)

router.get(
  "/history",
  authenticateDriver,
  isDriver,
  getDriverJourneyHistory
)


module.exports = router



