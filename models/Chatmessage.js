// const mongoose = require('mongoose');

// const chatMessageSchema = new mongoose.Schema({
//   conversationId: {
//     type: String,
//     required: true,
//     index: true
//   },
//   senderId: {
//     type: mongoose.Schema.Types.ObjectId,
//     required: false,
//     refPath: 'senderType'
//   },
//   senderType: {
//     type: String,
//     required: true,
//     enum: ['Admin', 'Driver', 'Customer']
//   },
//   receiverId: {
//     type: mongoose.Schema.Types.ObjectId,
//     required: false,
//     refPath: 'receiverType'
//   },
//   receiverType: {
//     type: String,
//     required: true,
//     enum: ['Admin', 'Driver', 'Customer']
//   },
//   messageType: {
//     type: String,
//     enum: ['text', 'image', 'video', 'audio', 'document', 'location'],
//     default: 'text'
//   }, 
//   content: {
//     type: String,
//     required: true
//   },
//   mediaUrl: String,
//   fileName: { type: String }, // document ka original name (e.g. invoice.pdf)
//   mimeType: { type: String }, // image/jpeg, application/pdf etc.
//   location: {
//     latitude: Number,
//     longitude: Number,
//     address: String
//   },
//   deliveryId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Delivery'
//   },
//   isRead: {
//     type: Boolean,
//     default: false
//   },
//   readAt: Date,
//   isDelivered: {
//     type: Boolean,
//     default: false
//   },
//   deliveredAt: Date,
//   metadata: {
//     type: Map,
//     of: String
//   },
//   // Edit & Delete features
//   isEdited: {
//     type: Boolean,
//     default: false
//   },
//   editedAt: {
//     type: Date
//   },
//   isDeleted: {
//     type: Boolean,
//     default: false
//   },
//   deletedAt: { type: Date },
//   deletedForEveryone: { type: Boolean, default: false },
// }, {
//   timestamps: true
// });

// // Indexes for efficient querying
// chatMessageSchema.index({ conversationId: 1, createdAt: -1 });
// chatMessageSchema.index({ senderId: 1, receiverId: 1 });
// chatMessageSchema.index({ deliveryId: 1 });
// chatMessageSchema.index({ isRead: 1 });

// // Auto-delete messages older than 90 days
// chatMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

// module.exports = mongoose.model('ChatMessage', chatMessageSchema);


const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  conversationId: {
    type: String,
    required: true,
    index: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false,
    refPath: 'senderType'
  },
  senderType: {
    type: String,
    required: true,
    enum: ['Admin', 'Driver', 'Customer']
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false,
    refPath: 'receiverType'
  },
  receiverType: {
    type: String,
    required: true,
    enum: ['Admin', 'Driver', 'Customer']
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'document', 'location'],
    default: 'text'
  }, 
  content: {
    type: String,
    required: false  // ← changed to false for media messages
  },
  mediaUrl: String,
  fileName: { type: String },
  mimeType: { type: String },
  location: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  deliveryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Delivery'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  isDelivered: {
    type: Boolean,
    default: false
  },
  deliveredAt: Date,
  metadata: {
    type: Map,
    of: String
  },
  // Edit & Delete features
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  isDeleted: {
    type: Boolean,  
    default: false
  },
  deletedAt: { type: Date },
  deletedForEveryone: { type: Boolean, default: false },
  
  // ✅ NEW: Individual soft delete fields
  deletedForDriver: { type: Boolean, default: false },
  deletedForAdmin: { type: Boolean, default: false },
}, {
  timestamps: true
});

// Indexes
chatMessageSchema.index({ conversationId: 1, createdAt: -1 });
chatMessageSchema.index({ senderId: 1, receiverId: 1 });
chatMessageSchema.index({ deliveryId: 1 });
chatMessageSchema.index({ isRead: 1 });
chatMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);