const express = require('express');
const router = express.Router();
const profileController = require('../../controllers/Driver/profileController');
const documentController = require('../../controllers/Driver/documentController');
const { authenticate ,authenticateDriver, isDriver } = require('../../middleware/authMiddleware');
const { uploadProfileImage, uploadDocument, handleUploadError } = require('../../middleware/uploadMiddleware');
const { validateRequiredFields } = require('../../middleware/validator');
const { uploadAnyDocuments, uploadSingleDocument } = require('../../config/multer');

// User Profile Routes
router.get('/', authenticate, profileController.getUserProfile);

router.put(
  '/',
  authenticate,
  profileController.updateUserProfile
);

router.post(
  '/upload-image',
  authenticate,
  uploadProfileImage,
  handleUploadError,
  profileController.uploadProfileImage
);

router.delete(
  '/',
  authenticate,
  validateRequiredFields(['password']),
  profileController.deleteAccount
);

// Driver Profile Routes
router.put(
  '/driver',
  authenticateDriver,
  isDriver,
  profileController.updateDriverProfile
);

// Document Routes (Driver Only)
router.post(
  '/documents',
  authenticateDriver,
  isDriver,
  uploadSingleDocument,
  handleUploadError,
  validateRequiredFields(['documentType']),
  documentController.uploadDocument
);

router.post(
  '/documents/multiple',
  authenticateDriver,
  isDriver,
  uploadAnyDocuments,
  handleUploadError,
  documentController.uploadMultipleDocuments
);

router.get(
  '/documents',
  authenticateDriver,
  isDriver,
  documentController.getDriverDocuments
);

router.get(
  '/documents/:documentId',
  authenticateDriver,
  isDriver,
  documentController.getDocument
);

router.put(
  '/documents/:documentId',
  authenticateDriver,
  isDriver,
  uploadDocument,
  documentController.updateDocument
);

router.delete(
  '/documents/:documentId',
  authenticateDriver,
  isDriver,
  documentController.deleteDocument
);

module.exports = router;