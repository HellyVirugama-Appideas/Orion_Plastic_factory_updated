const express = require('express');
const router = express.Router();
const chatController = require('../../controllers/Driver/driverChatController');
const { authenticateDriver, isDriver } = require('../../middleware/authMiddleware');
const { uploadChatMedia, handleUploadError } = require('../../middleware/uploadMiddleware');


router.get(
    '/conversations',
    authenticateDriver,
    isDriver, chatController
    .getDriverConversations
);
router.get(
    '/messages/:conversationId',
    authenticateDriver,
    isDriver,
    chatController.getDriverMessages
);
router.post(
    '/send',
    authenticateDriver,
    isDriver,
    uploadChatMedia,
    handleUploadError,
    chatController.sendMessageFromDriver
);
router.patch(
    "/message/:messageId/edit",
    authenticateDriver,
    isDriver,
    chatController.editMessage
)
router.post(
    "/message/clear",
    authenticateDriver,
    isDriver,
    chatController.clearChat
)
// router.delete(
//     "/message/:messageId",
//     authenticateDriver,
//     isDriver,
//     chatController.deleteMessage
// )

module.exports = router; 
