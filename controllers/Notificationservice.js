const Notification = require('../models/Notification');
const axios = require('axios');

// ==================== NOTIFICATION SERVICE ====================
// Supports: FCM (Push), SMS, WhatsApp, Email

class NotificationService {

  // Main method to send notification via all requested channels
  static async sendNotification({
    recipientId,
    recipientType,
    type,
    title,
    message,
    data = {},
    channels = ['push'], // 'push', 'sms', 'whatsapp', 'email'
    priority = 'medium',
    actionUrl = null
  }) {
    try {
      // Create notification record
      const notification = await Notification.create({
        recipientId,
        recipientType,
        type,
        title,
        message,
        data,
        priority,
        actionUrl
      });

      // Send via requested channels
      const promises = [];

      if (channels.includes('push')) {
        promises.push(this.sendPushNotification(notification));
      }

      if (channels.includes('sms')) {
        promises.push(this.sendSMS(notification));
      }

      if (channels.includes('whatsapp')) {
        promises.push(this.sendWhatsApp(notification));
      }

      if (channels.includes('email')) {
        promises.push(this.sendEmail(notification));
      }

      await Promise.allSettled(promises);

      // Emit via Socket.IO for real-time
      if (global.io) {
        global.io.to(`user-${recipientId}`).emit('notification:new', {
          notificationId: notification._id,
          type,
          title,
          message,
          data,
          createdAt: notification.createdAt
        });
      }

      return notification;

    } catch (error) {
      console.error('Send Notification Error:', error);
      throw error;
    }
  }

  // ==================== PUSH NOTIFICATION (FCM) ====================
  // static async sendPushNotification(notification) {
  //   try {
  //     // Get user's FCM token
  //     const fcmToken = await this.getUserFCMToken(
  //       notification.recipientId,
  //       notification.recipientType
  //     );

  //     if (!fcmToken) {
  //       console.log('No FCM token found for user');
  //       return;
  //     }

  //     // Firebase Cloud Messaging API
  //     const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY;
  //     const FCM_URL = 'https://fcm.googleapis.com/fcm/send';

  //     const payload = {
  //       to: fcmToken,
  //       notification: {
  //         title: notification.title,
  //         body: notification.message,
  //         icon: 'ic_notification',
  //         sound: 'default',
  //         badge: '1',
  //         priority: notification.priority === 'urgent' ? 'high' : 'normal'
  //       },
  //       data: {
  //         notificationId: notification._id.toString(),
  //         type: notification.type,
  //         actionUrl: notification.actionUrl || '',
  //         ...notification.data
  //       },
  //       android: {
  //         priority: notification.priority === 'urgent' ? 'high' : 'normal',
  //         ttl: 86400 // 24 hours
  //       },
  //       apns: {
  //         headers: {
  //           'apns-priority': notification.priority === 'urgent' ? '10' : '5'
  //         }
  //       }
  //     };

  //     const response = await axios.post(FCM_URL, payload, {
  //       headers: {
  //         'Content-Type': 'application/json',
  //         'Authorization': `key=${FCM_SERVER_KEY}`
  //       }
  //     });

  //     // Update notification
  //     await Notification.findByIdAndUpdate(notification._id, {
  //       'channels.push.sent': true,
  //       'channels.push.sentAt': new Date(),
  //       'channels.push.fcmMessageId': response.data.multicast_id
  //     });

  //     console.log('✅ Push notification sent:', response.data);

  //   } catch (error) {
  //     console.error('❌ Push notification error:', error.message);
  //     await Notification.findByIdAndUpdate(notification._id, {
  //       'channels.push.error': error.message
  //     });
  //   }
  // }

  // services/NotificationService.js — sendPushNotification fix karo
static async sendPushNotification(notification) {
  try {
    const fcmToken = await this.getUserFCMToken(
      notification.recipientId,
      notification.recipientType
    );

    if (!fcmToken) {
      console.log(`⚠️ No FCM token | recipientId: ${notification.recipientId} | type: ${notification.recipientType}`);
      return;
    }

    const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY;
    if (!FCM_SERVER_KEY) {
      console.warn('⚠️ FCM_SERVER_KEY not set in .env');
      return;
    }

    // ✅ FIX: Map ko plain object me convert karo safely
    let extraData = {};
    if (notification.data) {
      // deliveryId, journeyId etc — direct fields
      if (notification.data.deliveryId) extraData.deliveryId = notification.data.deliveryId.toString();
      if (notification.data.journeyId)  extraData.journeyId  = notification.data.journeyId.toString();
      if (notification.data.expenseId)  extraData.expenseId  = notification.data.expenseId.toString();

      // customData Map — iterate करके plain object banao
      if (notification.data.customData instanceof Map) {
        notification.data.customData.forEach((value, key) => {
          extraData[key] = String(value);
        });
      } else if (notification.data.customData && typeof notification.data.customData === 'object') {
        // Agar Map nahi toh plain object ke keys iterate karo
        Object.entries(notification.data.customData).forEach(([key, value]) => {
          extraData[key] = String(value);
        });
      }
    }

    const payload = {
      to: fcmToken,
      notification: {
        title: notification.title,
        body: notification.message,
        icon: 'ic_notification',
        sound: 'default',
        badge: '1',
        priority: notification.priority === 'urgent' ? 'high' : 'normal'
      },
      data: {
        notificationId: notification._id.toString(),
        type: notification.type,
        actionUrl: notification.actionUrl || '',
        ...extraData   // ✅ safe plain object spread
      },
      android: {
        priority: notification.priority === 'urgent' ? 'high' : 'normal',
        ttl: 86400
      },
      apns: {
        headers: {
          'apns-priority': notification.priority === 'urgent' ? '10' : '5'
        }
      }
    };

    console.log(`[FCM-SEND] Sending to token: ${fcmToken.substring(0, 20)}... | title: ${notification.title}`);

    const response = await axios.post('https://fcm.googleapis.com/fcm/send', payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${FCM_SERVER_KEY}`
      }
    });

    console.log(`✅ FCM response: success=${response.data.success} | failure=${response.data.failure}`);

    // FCM rejection check (token invalid etc)
    if (response.data.failure > 0) {
      const result = response.data.results?.[0];
      console.error(`❌ FCM delivery failed | error: ${result?.error}`);
    }

    await Notification.findByIdAndUpdate(notification._id, {
      'channels.push.sent': response.data.success > 0,
      'channels.push.sentAt': new Date(),
      'channels.push.fcmMessageId': response.data.multicast_id?.toString()
    });

  } catch (error) {
    console.error('❌ Push notification error:', error.message);
    await Notification.findByIdAndUpdate(notification._id, {
      'channels.push.error': error.message
    }).catch(() => {});
  }
}

  // ==================== SMS GATEWAY ====================
  static async sendSMS(notification) {
    try {
      // Get user's phone number
      const phoneNumber = await this.getUserPhone(
        notification.recipientId,
        notification.recipientType
      );

      if (!phoneNumber) {
        console.log('No phone number found for user');
        return;
      }

      // Example: Twilio SMS Gateway
      const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
      const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
      const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

      const params = new URLSearchParams();
      params.append('To', phoneNumber);
      params.append('From', TWILIO_PHONE_NUMBER);
      params.append('Body', `${notification.title}\n\n${notification.message}`);

      const response = await axios.post(twilioUrl, params, {
        auth: {
          username: TWILIO_ACCOUNT_SID,
          password: TWILIO_AUTH_TOKEN
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      // Update notification
      await Notification.findByIdAndUpdate(notification._id, {
        'channels.sms.sent': true,
        'channels.sms.sentAt': new Date(),
        'channels.sms.messageId': response.data.sid
      });

      console.log('✅ SMS sent:', response.data.sid);

    } catch (error) {
      console.error('❌ SMS error:', error.message);
      await Notification.findByIdAndUpdate(notification._id, {
        'channels.sms.error': error.message
      });
    }
  }

  // ==================== WHATSAPP NOTIFICATION ====================
  static async sendWhatsApp(notification) {
    try {
      // Get user's phone number
      const phoneNumber = await this.getUserPhone(
        notification.recipientId,
        notification.recipientType
      );

      if (!phoneNumber) {
        console.log('No phone number found for user');
        return;
      }

      // Example: Twilio WhatsApp API
      const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
      const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
      const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER; // whatsapp:+14155238886

      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

      const params = new URLSearchParams();
      params.append('To', `whatsapp:${phoneNumber}`);
      params.append('From', TWILIO_WHATSAPP_NUMBER);
      params.append('Body', `*${notification.title}*\n\n${notification.message}`);

      const response = await axios.post(twilioUrl, params, {
        auth: {
          username: TWILIO_ACCOUNT_SID,
          password: TWILIO_AUTH_TOKEN
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      // Update notification
      await Notification.findByIdAndUpdate(notification._id, {
        'channels.whatsapp.sent': true,
        'channels.whatsapp.sentAt': new Date(),
        'channels.whatsapp.messageId': response.data.sid
      });

      console.log('✅ WhatsApp sent:', response.data.sid);

    } catch (error) {
      console.error('❌ WhatsApp error:', error.message);
      await Notification.findByIdAndUpdate(notification._id, {
        'channels.whatsapp.error': error.message
      });
    }
  }

  // ==================== EMAIL NOTIFICATION ====================
  static async sendEmail(notification) {
    try {
      // Get user's email
      const email = await this.getUserEmail(
        notification.recipientId,
        notification.recipientType
      );

      if (!email) {
        console.log('No email found for user');
        return;
      }

      // Example: Using Nodemailer with Gmail
      const nodemailer = require('nodemailer');

      const transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      // Get email template
      const emailTemplate = this.getEmailTemplate(notification);

      const mailOptions = {
        from: `"Orion Delivery" <${process.env.SMTP_USER}>`,
        to: email,
        subject: notification.title,
        html: emailTemplate
      };

      const info = await transporter.sendMail(mailOptions);

      // Update notification
      await Notification.findByIdAndUpdate(notification._id, {
        'channels.email.sent': true,
        'channels.email.sentAt': new Date(),
        'channels.email.messageId': info.messageId
      });

      console.log('✅ Email sent:', info.messageId);

    } catch (error) {
      console.error('❌ Email error:', error.message);
      await Notification.findByIdAndUpdate(notification._id, {
        'channels.email.error': error.message
      });
    }
  }

  // ==================== HELPER METHODS ====================

  // static async getUserFCMToken(userId, userType) {
  //   try {
  //     let model;
  //     if (userType === 'Driver') {
  //       model = require('../models/Driver');
  //     } else if (userType === 'Admin') {
  //       model = require('../models/Admin');
  //     } else if (userType === 'Customer') {
  //       model = require('../models/Customer');
  //     }

  //     const user = await model.findById(userId).populate('userId');
  //     return user?.fcmToken || user?.userId?.fcmToken;
  //   } catch (error) {
  //     console.error('Get FCM Token Error:', error);
  //     return null;
  //   }
  // }

  // services/NotificationService.js — getUserFCMToken fix karo
  static async getUserFCMToken(userId, userType) {
    try {
      let model;
      if (userType === 'Driver') {
        model = require('../models/Driver');
      } else if (userType === 'Admin') {
        model = require('../models/Admin');
      } else if (userType === 'Customer') {
        model = require('../models/Customer');
      }

      if (!model) return null;

      // ✅ FIX: seedha fcmToken fetch karo — userId populate karna galat tha
      const user = await model.findById(userId).select('fcmToken');
      console.log(`[FCM-TOKEN] userId: ${userId} | type: ${userType} | token: ${user?.fcmToken ? 'found' : 'NOT FOUND'}`);
      return user?.fcmToken || null;

    } catch (error) {
      console.error('Get FCM Token Error:', error);
      return null;
    }
  }

  static async getUserPhone(userId, userType) {
    try {
      let model;
      if (userType === 'Driver') {
        model = require('../models/Driver');
      } else if (userType === 'Customer') {
        model = require('../models/Customer');
      }

      const user = await model.findById(userId).populate('userId');
      return user?.phone || user?.userId?.phone;
    } catch (error) {
      console.error('Get Phone Error:', error);
      return null;
    }
  }

  static async getUserEmail(userId, userType) {
    try {
      let model;
      if (userType === 'Driver') {
        model = require('../models/Driver');
      } else if (userType === 'Admin') {
        model = require('../models/Admin');
      } else if (userType === 'Customer') {
        model = require('../models/Customer');
      }

      const user = await model.findById(userId).populate('userId');
      return user?.email || user?.userId?.email;
    } catch (error) {
      console.error('Get Email Error:', error);
      return null;
    }
  }

  // Email templates
  static getEmailTemplate(notification) {
    const templates = {
      delivery_assigned: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #667eea;">${notification.title}</h2>
          <p>${notification.message}</p>
          ${notification.actionUrl ? `
            <a href="${notification.actionUrl}" 
               style="display: inline-block; padding: 12px 24px; background: #667eea; 
                      color: white; text-decoration: none; border-radius: 5px; margin-top: 20px;">
              View Delivery
            </a>
          ` : ''}
        </div>
      `,
      journey_started: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">🚗 ${notification.title}</h2>
          <p>${notification.message}</p>
        </div>
      `,
      delivery_completed: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">✅ ${notification.title}</h2>
          <p>${notification.message}</p>
          <p style="color: #666; margin-top: 30px;">Thank you for using our service!</p>
        </div>
      `
    };

    return templates[notification.type] || `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${notification.title}</h2>
        <p>${notification.message}</p>
      </div>
    `;
  }
}

module.exports = NotificationService;