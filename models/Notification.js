const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false,
    refPath: 'recipientType'
  },
  recipientType: {
    type: String,
    required: false,
    enum: ['Admin', 'Driver', 'Customer']
  },
  type: {
    type: String,
    required: true,
    enum: [
      'delivery_assigned',
      'journey_started',
      'journey_ended',
      'delivery_completed',
      'delivery_cancelled',
      'delivery_updated',
      'new_message',
      'admin_announcement',
      'expense_approved',
      'expense_rejected',
      'maintenance_due',
      'chat_message',
      'custom'
    ]
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    deliveryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Delivery'
    },
    journeyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Journey'
    },
    chatMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatMessage'
    },
    expenseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Expense'
    },
    customData: Map
  },
  channels: {
    push: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      fcmMessageId: String,
      error: String
    },
    sms: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      messageId: String,
      error: String
    },
    whatsapp: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      messageId: String,
      error: String
    },
    email: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      messageId: String,
      error: String
    }
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  actionUrl: String,
  expiresAt: Date
}, {
  timestamps: true
});

// Indexes
notificationSchema.index({ recipientId: 1, recipientType: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ isRead: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Notification', notificationSchema);