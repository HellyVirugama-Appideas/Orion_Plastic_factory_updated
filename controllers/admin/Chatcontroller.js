const ChatMessage = require('../../models/Chatmessage');
const Driver = require('../../models/Driver');
const Notification = require("../../models/Notification")
const {sendNotification} = require("../../utils/sendNotification")

// Helper
const generateConversationId = (adminId, driverId) => {
  const ids = [adminId.toString(), driverId.toString()].sort();
  return `${ids[0]}_${ids[1]}`;
};

// Get all conversations (already good – minor fix for driver populate)
exports.getConversations = async (req, res) => {
  try {
    const conversations = await ChatMessage.aggregate([
      { $match: { $or: [{ senderType: 'Admin' }, { receiverType: 'Admin' }] } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$conversationId',
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [{ $and: [{ $eq: ['$receiverType', 'Admin'] }, { $eq: ['$isRead', false] }] }, 1, 0]
            }
          }
        }
      },
      { $sort: { 'lastMessage.createdAt': -1 } }
    ]);

    for (let conv of conversations) {
      const driverId = conv._id.split('_').find(id => id !== 'admin'); // assuming admin has no _id in DB
      if (driverId) {
        const driver = await Driver.findById(driverId).select('name phone vehicleNumber profileImage');
        if (driver) {
          conv.participant = {
            id: driver._id,
            name: driver.name,
            phone: driver.phone,
            vehicleNumber: driver.vehicleNumber,
            profileImage: driver.profileImage || '/images/driver-default.png',
            type: 'driver'
          };
        }
      }
    }

    res.status(200).json({ success: true, data: { conversations } });
  } catch (error) {
    console.error('Admin Get Conversations Error:', error);
    res.status(500).json({ success: false, message: 'Failed to load conversations' });
  }
};

// Get messages
exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const messages = await ChatMessage.find({ conversationId })
      .sort({ createdAt: 1 })
      .populate('senderId', 'name profileImage vehicleNumber')
      .lean();

    // Mark as read for admin
    await ChatMessage.updateMany(
      { conversationId, receiverType: 'Admin', isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.status(200).json({ success: true, data: { messages } });
  } catch (error) {
    console.error('Admin Get Messages Error:', error);
    res.status(500).json({ success: false, message: 'Failed to load messages' });
  }
};

// Send Message
// exports.sendMessage = async (req, res) => {
//   try {
//     // All fields come from FormData → req.body
//     const { driverId, content, messageType = 'text' } = req.body;

//     // Location can come as string (JSON) or already parsed object
//     let location = req.body.location;
//     if (location && typeof location === 'string') {
//       try {
//         location = JSON.parse(location);
//       } catch {
//         location = null;
//       }
//     }

//     if (!driverId) {
//       return res.status(400).json({
//         success: false,
//         message: 'driverId is required'
//       });
//     }

//     let mediaUrl = null;
//     let fileName = null;
//     let mimeType = null;
//     let finalMessageType = messageType;

//     // File handling (field name must be 'file')
//     if (req.file) {
//       mediaUrl = `/uploads/chat/${req.file.filename}`;
//       fileName = req.file.originalname;
//       mimeType = req.file.mimetype;

//       // Auto-detect messageType from file if not provided
//       if (mimeType.startsWith('image/')) finalMessageType = 'image';
//       else if (mimeType.startsWith('video/')) finalMessageType = 'video';
//       else if (mimeType.startsWith('audio/')) finalMessageType = 'audio';
//       else if (mimeType === 'application/pdf' || mimeType.includes('document')) {
//         finalMessageType = 'document';
//       } else {
//         finalMessageType = 'document'; // fallback
//       }
//     }

//     // Validation: kuch to bhejna chahiye
//     if (!content && !mediaUrl && finalMessageType !== 'location') {
//       return res.status(400).json({
//         success: false,
//         message: 'Content or media or location is required'
//       });
//     }

//     const conversationId = generateConversationId('admin', driverId);

//     const message = await ChatMessage.create({
//       conversationId,
//       senderId: null,
//       senderType: 'Admin',
//       receiverId: driverId,
//       receiverType: 'Driver',
//       messageType: finalMessageType,
//       content: content || null,
//       mediaUrl,
//       fileName,
//       mimeType,
//       location: location || null,
//       isDelivered: true,
//       deliveredAt: new Date()
//     });

//     const messageObj = message.toObject();

//     await message.populate('senderId', 'name profileImage vehicleNumber');

//     // Socket.IO emit (same as before)
//     if (global.io) {
//       const payload = {
//         conversationId,
//         message: {
//           ...messageObj,
//           sender: {
//             name: 'Support',
//             profileImage: '/images/support-avatar.png'
//           }
//         }
//       };

//       global.io.to(`driver-${driverId}`).emit('chat:new-message', payload);
//       global.io.to('admin-room').emit('chat:new-message', payload);
//     }

//     const driver = await Driver.findById(driverId).select('userId fcmToken name');

//     if (driver) {
//       // 1. In-app notification (for pink list)
//       await Notification.create({
//         userId: driver.userId || driver._id,   // use whichever field you store for user/driver
//         type: 'chat_message',
//         title: 'New Message from Support',
//         message: content
//           ? content.substring(0, 60) + (content.length > 60 ? '...' : '')
//           : (finalMessageType === 'image' ? 'Sent a photo' :
//             finalMessageType === 'document' ? 'Sent a document' : 'Sent media'),
//         referenceId: message._id,
//         referenceModel: 'ChatMessage',
//         priority: 'medium',
//         createdAt: new Date()
//       });

//       // 2. Optional: Push notification via FCM (if you want instant alert)
//       if (driver.fcmToken) {
//         await sendNotification(
//           driver.name || "Driver",
//           "english",
//           driver.fcmToken,
//           "chat_message",
//           {
//             type: "chat_message",
//             conversationId: conversationId,
//             messageId: message._id.toString(),
//             sender: "Support",
//             click_action: "FLUTTER_NOTIFICATION_CLICK" // for deep linking to chat
//           }
//         ).catch(err => console.error("Chat push failed:", err.message));
//       }
//     }

//     return res.status(201).json({
//       success: true,
//       message: 'Message sent successfully',
//       data: { message: messageObj }
//     });

//   } catch (error) {
//     console.error('Admin Send Message Error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to send message',
//       error: error.message
//     });
//   }
// };

exports.sendMessage = async (req, res) => {
  try {
    const admin = req.user;

    // All fields from FormData → req.body
    const { driverId, content, messageType = 'text' } = req.body;

    // Location (if sent)
    let location = req.body.location;
    if (location && typeof location === 'string') {
      try {
        location = JSON.parse(location);
      } catch {
        location = null;
      }
    }

    if (!driverId) {
      return res.status(400).json({
        success: false,
        message: 'driverId is required'
      });
    }

    let mediaUrl = null;
    let fileName = null;
    let mimeType = null;
    let finalMessageType = messageType;

    // Handle file upload (field name must be 'file' in form-data)
    if (req.file) {
      mediaUrl = `/uploads/chat/${req.file.filename}`;
      fileName = req.file.originalname;
      mimeType = req.file.mimetype;

      // Auto-detect type
      if (mimeType.startsWith('image/')) finalMessageType = 'image';
      else if (mimeType.startsWith('video/')) finalMessageType = 'video';
      else if (mimeType.startsWith('audio/')) finalMessageType = 'audio';
      else if (mimeType === 'application/pdf' || mimeType.includes('document')) {
        finalMessageType = 'document';
      } else {
        finalMessageType = 'document';
      }
    }

    // Validation
    if (!content && !mediaUrl && finalMessageType !== 'location') {
      return res.status(400).json({
        success: false,
        message: 'Content or media or location is required'
      });
    }

    const conversationId = generateConversationId('admin', driverId);

    // Create chat message
    const message = await ChatMessage.create({
      conversationId,
      senderId: null,               // Admin has no _id
      senderType: 'Admin',
      receiverId: driverId,
      receiverType: 'Driver',
      messageType: finalMessageType,
      content: content || null,
      mediaUrl,
      fileName,
      mimeType,
      location: location || null,
      isDelivered: true,
      deliveredAt: new Date()
    });

    // Populate sender info for response
    const messageObj = message.toObject();

    // Real-time socket emit (already good)
    if (global.io) {
      const payload = {
        conversationId,
        message: {
          ...messageObj,
          sender: {
            name: 'Support',
            profileImage: '/images/support-avatar.png'
          }
        }
      };

      global.io.to(`driver-${driverId}`).emit('chat:new-message', payload);
      global.io.to('admin-room').emit('chat:new-message', payload);
    }

    // ────────────────────────────────────────────────
    // NOTIFICATIONS TO DRIVER (bell + push)
    // ────────────────────────────────────────────────
    const driver = await Driver.findById(driverId).select('name fcmToken');

    if (driver) {
      // 1. In-app notification (bell icon / list)
      try {
        await Notification.create({
          recipientId: driver._id,              // Use recipientId (matches schema)
          recipientType: 'Driver',
          type: 'chat_message',
          title: 'New Message from Support',
          message: content
            ? content.substring(0, 60) + (content.length > 60 ? '...' : '')
            : (finalMessageType === 'image' ? 'Sent a photo'
              : finalMessageType === 'document' ? 'Sent a document'
              : finalMessageType === 'video' ? 'Sent a video'
              : 'Sent media'),
          referenceId: message._id,
          referenceModel: 'ChatMessage',
          priority: 'medium',
          createdAt: new Date()
        });

        console.log(`[CHAT-NOTIF] In-app notification created for driver ${driver._id}`);
      } catch (notifErr) {
        console.error("[CHAT-INAPP-ERROR]", notifErr.message || notifErr);
      }

      // 2. Push notification (FCM) – deep link to chat
      if (driver.fcmToken && driver.fcmToken.trim().length > 20) {
        try {
          await sendNotification(
            driver.name || "Driver",
            "english",
            driver.fcmToken,
            "chat_message",
            {
              type: "chat_message",
              conversationId: conversationId,
              messageId: message._id.toString(),
              sender: "Support",
              title: "New Message from Support",
              body: content || (finalMessageType === 'image' ? 'Sent a photo' : 'Sent media'),
              click_action: "FLUTTER_NOTIFICATION_CLICK", // for Flutter deep linking
              route: `/chat/${conversationId}` // optional – your app can use this
            }
          );
          console.log(`[CHAT-NOTIF] FCM push sent to driver ${driver._id}`);
        } catch (pushErr) {
          console.error("[CHAT-FCM-ERROR]", pushErr.code || pushErr.message || pushErr);
        }
      } else {
        console.warn("[CHAT-NOTIF] No valid FCM token for driver", { driverId: driver._id });
      }
    } else {
      console.warn("[CHAT-NOTIF] Driver not found for notification", { driverId });
    }

    return res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { message: messageObj }
    });

  } catch (error) {
    console.error('Admin Send Message Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
};

// EDIT MESSAGE (Admin)
exports.editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body || {};

    if (!content) {
      return res.status(400).json({ success: false, message: 'New content required' });
    }

    const message = await ChatMessage.findOne({
      _id: messageId,
      senderType: 'Admin',
      isDeleted: false
    });

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found or not yours' });
    }

    message.content = content;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    if (global.io) {
      const payload = { conversationId: message.conversationId, message: message.toObject() };
      global.io.to('admin-room').emit('chat:message-edited', payload);
      const driverId = message.conversationId.split('_').find(id => id.length === 24);
      if (driverId) global.io.to(`driver-${driverId}`).emit('chat:message-edited', payload);
    }

    res.status(200).json({ success: true, message: 'Message edited' });
  } catch (error) {
    console.error('Admin Edit Error:', error);
    res.status(500).json({ success: false, message: 'Failed to edit' });
  }
};

// DELETE MESSAGE (Admin)
exports.deleteMessage = async (req, res) => {
  const data = { deleteForEveryone: false }; // Use object - safe even in catch

  try {
    const { messageId } = req.params;
    const body = req.body || {};

    // Update value safely
    data.deleteForEveryone = body.deleteForEveryone === true;

    const message = await ChatMessage.findOne({
      _id: messageId,
      senderType: 'Admin'
    });

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    message.deletedForEveryone = data.deleteForEveryone;

    await message.save();

    // Socket emit
    if (global.io) {
      const payload = {
        conversationId: message.conversationId,
        messageId: message._id,
        deletedForEveryone: data.deleteForEveryone
      };
      global.io.to('admin-room').emit('chat:message-deleted', payload);
      const driverId = message.conversationId.split('_').find(id => id.length === 24);
      if (driverId) global.io.to(`driver-${driverId}`).emit('chat:message-deleted', payload);
    }

    return res.status(200).json({
      success: true,
      message: data.deleteForEveryone ? 'Deleted for everyone' : 'Message deleted (for you)'
    });

  } catch (error) {
    console.error('Admin Delete Error:', error);

    // Now 100% safe - no ReferenceError possible
    return res.status(500).json({
      success: false,
      message: 'Failed to delete message',
      error: error.message,
      // Optional debug info (remove in production)
      attemptedDeleteForEveryone: data.deleteForEveryone
    });
  }
};

// RENDER: Chat Dashboard (list of conversations)
exports.renderChatDashboard = async (req, res) => {
  try {
    const admin = req.user;

    // Reuse your existing getConversations logic (but render EJS)
    const conversations = await ChatMessage.aggregate([
      { $match: { $or: [{ senderType: 'Admin' }, { receiverType: 'Admin' }] } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$conversationId',
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [{ $and: [{ $eq: ['$receiverType', 'Admin'] }, { $eq: ['$isRead', false] }] }, 1, 0]
            }
          }
        }
      },
      { $sort: { 'lastMessage.createdAt': -1 } }
    ]);

    // Populate driver info
    for (let conv of conversations) {
      const driverId = conv._id.split('_').find(id => id !== 'admin');
      if (driverId) {
        const driver = await Driver.findById(driverId)
          .select('name phone vehicleNumber profileImage')
          .lean();

        if (driver) {
          conv.participant = {
            id: driver._id,
            name: driver.name || 'Unknown Driver',
            phone: driver.phone || 'N/A',
            vehicleNumber: driver.vehicleNumber || 'N/A',
            profileImage: driver.profileImage || '/img/avatar.png',
            type: 'driver'
          };
        } else {
          conv.participant = { name: 'Deleted Driver', type: 'driver' };
        }
      }
    }

    res.render('chat', {
      title: 'Admin Chat Dashboard',
      user: req.user,
      conversations,
      activeMenu: 'chat',
      url: req.originalUrl,
      messages: req.flash()
    });

  } catch (error) {
    console.error('Render Chat Dashboard Error:', error);
    req.flash('error', 'Failed to load chat conversations');
    res.redirect('/admin/dashboard');
  }
};

// RENDER: Single Conversation View
exports.renderConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;

    // Find driver from conversationId
    const driverId = conversationId.split('_').find(id => id !== 'admin');
    if (!driverId) {
      req.flash('error', 'Invalid conversation');
      return res.redirect('/admin/chat');
    }

    const driver = await Driver.findById(driverId)
      .select('name phone vehicleNumber profileImage')
      .lean();

    if (!driver) {
      req.flash('error', 'Driver not found');
      return res.redirect('/admin/chat');
    }

    // Get messages (last 50 for performance, older ones via load more)
    const messages = await ChatMessage.find({ conversationId })
      .sort({ createdAt: 1 })
      .limit(50)
      .populate('senderId', 'name profileImage')
      .lean();

    // Mark messages as read for admin
    await ChatMessage.updateMany(
      { conversationId, receiverType: 'Admin', isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    res.render('chat_conversation', {
      title: `Chat with ${driver.name}`,
      user: req.user,
      driver,
      conversationId,
      chatMessages: messages,
      activeMenu: 'chat',
      url: req.originalUrl,
      messages: req.flash()
    });

  } catch (error) {
    console.error('Render Conversation Error:', error);
    req.flash('error', 'Failed to load conversation');
    res.redirect('/admin/chat');
  }
};