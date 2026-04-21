const mongoose = require("mongoose")
const Notification = require('../../models/Notification');

// Helper function (time ago)
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " min ago";
  return "Just now";
}

// GET all notifications for logged-in driver
exports.getNotifications = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: 'Unauthorized - no user found' });
    }

    const driverId = req.user._id;

    console.log("[GET-NOTIF-DEBUG] Fetching for driver:", driverId.toString());

    const {
      page = 1,
      limit = 20,
      unreadOnly = false,
      type
    } = req.query;

    const query = { 
      recipientId: driverId,                    
      recipientType: 'Driver'                  
    };

    if (unreadOnly === 'true' || unreadOnly === true) {
      query['channels.push.sent'] = true;     
      query.isRead = false;
    }

    if (type) {
      query.type = type;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Notification.countDocuments(query);

    console.log(`[GET-NOTIF-DEBUG] Found ${notifications.length} / ${total} notifications`);

    res.status(200).json({
      success: true,
      data: notifications.map(notif => ({
        id: notif._id.toString(),
        title: notif.title,
        message: notif.message,
        type: notif.type,
        priority: notif.priority,
        referenceId: notif.referenceId?.toString(),
        referenceModel: notif.referenceModel,
        isRead: notif.isRead || false,
        createdAt: notif.createdAt,
        timeAgo: getTimeAgo(notif.createdAt)
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        hasNext: skip + notifications.length < total
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Notifications fetch karne mein problem hui'
    });
  }
};


// PATCH - Mark notification(s) as read
exports.markNotificationsRead = async (req, res) => {
  try {
    const driverId = req.driver._id;
    const { notificationId, markAll } = req.body;

    if (markAll) {
      await Notification.updateMany(
        { userId: driverId, isRead: false },
        { $set: { isRead: true } }
      );
    } else if (notificationId) {
      await Notification.findOneAndUpdate(
        { _id: notificationId, userId: driverId },
        { $set: { isRead: true } },
        { new: true }
      );
    }

    res.status(200).json({
      success: true,
      message: markAll ? 'All unread notifications marked as read' : 'Notification marked as read'
    });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({
      success: false,
      message: 'Read mark karne mein problem hui'
    });
  }
};