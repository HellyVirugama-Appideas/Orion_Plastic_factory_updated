// const mongoose = require('mongoose');

// const orderItemSchema = new mongoose.Schema({
//   productId: {
//     type: String,
//     required: false
//   },
//   productName: {
//     type: String,
//     required: true
//   },
//   productCode: {
//     type: String
//   },
//   category: {
//     type: String,
//     enum: ['containers', 'bottles', 'bags', 'sheets', 'custom', 'other'],
//     default: 'other'
//   },
//   description: {
//     type: String
//   },
//   quantity: {
//     type: Number,
//     required: true,
//     min: 1
//   },
//   unitPrice: {
//     type: Number,
//     required: false,
//     min: 0
//   },
//   totalPrice: {
//     type: Number,
//     required: false,
//     min: 0
//   },
//   specifications: {
//     material: String,
//     color: String,
//     size: String,
//     weight: Number,
//     customRequirements: String
//   }
// });

// const orderSchema = new mongoose.Schema({
//   orderNumber: {
//     type: String,
//     required: true,
//     unique: true,
//     index: true
//   },
//   customerId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Customer',
//     required: true,
//     index: true
//   },
//   orderType: {
//     type: String,
//     enum: ['retail', 'wholesale', 'bulk', 'custom'],
//     default: 'retail'
//   },
//   items: [orderItemSchema],

//   // // Pricing
//   // subtotal: {
//   //   type: Number,
//   //   required: false,
//   //   min: 0
//   // },
//   // taxAmount: {
//   //   type: Number,
//   //   default: 0,
//   //   min: 0
//   // },
//   // taxPercentage: {
//   //   type: Number,
//   //   default: 0,
//   //   min: 0,
//   //   max: 100
//   // },
//   // shippingCharges: {
//   //   type: Number,
//   //   default: 0,
//   //   min: 0
//   // },
//   // discount: {
//   //   amount: {
//   //     type: Number,
//   //     default: 0,
//   //     min: 0
//   //   },
//   //   percentage: {
//   //     type: Number,
//   //     default: 0,
//   //     min: 0,
//   //     max: 100
//   //   },
//   //   code: String,
//   //   reason: String
//   // },
//   // totalAmount: {
//   //   type: Number,
//   //   required: false,
//   //   min: 0
//   // },

//   // Pickup Location
//   pickupLocation: {
//     name: {
//       type: String,
//       required: true,
//       trim: true
//     },
//     address: {
//       type: String,
//       required: true
//     },
//     coordinates: {
//       latitude: {
//         type: Number,
//         required: true
//       },
//       longitude: {
//         type: Number,
//         required: true
//       }
//     },
//     contactPerson: String,
//     contactPhone: String
//   },

//   // Delivery Location
//   deliveryLocation: {
//     address: {
//       type: String,
//       required: true
//     },
//     city: String,
//     state: String,
//     pincode: String,
//     country: {
//       type: String,
//       default: 'India'
//     },
//     coordinates: {
//       latitude: Number,
//       longitude: Number
//     },
//     contactPerson: {
//       type: String,
//       required: true
//     },
//     contactPhone: {
//       type: String,
//       required: true
//     },
//     landmark: String,
//     locationType: {
//       type: String,
//       enum: ['home', 'office', 'warehouse', 'store', 'other'],
//       default: 'other'
//     }
//   },

//   // Order Status
//   status: {
//     type: String,
//     enum: [
//       'pending',           // Order placed, awaiting confirmation
//       'confirmed',         // Order confirmed by admin
//       'processing',        // Order being prepared
//       'ready_for_pickup',  // Order ready for delivery
//       'assigned',          // Delivery assigned
//       'in_transit',        // Out for delivery
//       'delivered',         // Successfully delivered
//       'cancelled',         // Order cancelled
//       'rejected',          // Order rejected
//       'on_hold'           // Order on hold
//     ],
//     default: 'pending',
//     index: true
//   },

//   // Payment Details
//   // paymentDetails: {
//   //   method: {
//   //     type: String,
//   //     enum: ['cod', 'online', 'upi', 'card', 'netbanking', 'wallet', 'credit'],
//   //     default: 'cod'
//   //   },
//   //   status: {
//   //     type: String,
//   //     enum: ['pending', 'paid', 'failed', 'refunded', 'partial'],
//   //     default: 'pending'
//   //   },
//   //   transactionId: String,
//   //   paidAmount: { 
//   //     type: Number,
//   //     default: 0
//   //   },
//   //   paidAt: Date,
//   //   dueAmount: {
//   //     type: Number,
//   //     default: 0
//   //   }
//   // },

//   // Schedule
//   scheduledPickupDate: Date,
//   scheduledDeliveryDate: Date,
//   expectedDeliveryDate: Date,

//   // Priority
//   priority: {
//     type: String,
//     enum: ['low', 'medium', 'high', 'urgent'],
//     default: 'medium'
//   },

//   // Special Instructions
//   specialInstructions: String,
//   packagingInstructions: String,
//   handlingInstructions: String,

//   // Delivery Reference
//   deliveryId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Delivery',
//     index: true
//   },

//   // Order Management
//   createdBy: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Customer'
//   },
//   confirmedBy: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Customer'
//   },
//   confirmedAt: Date,
//   cancelledBy: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Customer'
//   },
//   cancelledAt: Date,
//   cancellationReason: String,

//   // Metadata
//   notes: String,
//   internalNotes: String,
//   customerNotes: String,
//   tags: [String]

// }, {
//   timestamps: true
// });

// // Indexes for better performance
// orderSchema.index({ orderNumber: 1 });
// orderSchema.index({ customerId: 1, status: 1 });
// orderSchema.index({ status: 1, createdAt: -1 });
// orderSchema.index({ 'deliveryLocation.pincode': 1 });
// orderSchema.index({ createdAt: -1 });

// // Virtual for order age in hours
// orderSchema.virtual('orderAgeHours').get(function () {
//   if (!this.createdAt) return 0;
//   const now = new Date();
//   const diffMs = now - this.createdAt;
//   return Math.floor(diffMs / (1000 * 60 * 60));
// });

// // Pre-save middleware to calculate totals
// // orderSchema.pre('save', function(next) {
// //   // Calculate subtotal from items
// //   if (this.items && this.items.length > 0) {
// //     this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
// //   }

// //   // Calculate total amount
// //   let total = this.subtotal;

// //   // Add tax
// //   if (this.taxPercentage > 0) {
// //     this.taxAmount = (this.subtotal * this.taxPercentage) / 100;
// //     total += this.taxAmount;
// //   }

// //   // Add shipping charges
// //   total += this.shippingCharges || 0;

// //   // Subtract discount
// //   if (this.discount.percentage > 0) {
// //     this.discount.amount = (this.subtotal * this.discount.percentage) / 100;
// //   }
// //   total -= this.discount.amount || 0;

// //   this.totalAmount = Math.max(0, total);

// //   // // Calculate due amount
// //   // if (this.paymentDetails) {
// //   //   this.paymentDetails.dueAmount = this.totalAmount - (this.paymentDetails.paidAmount || 0);
// //   // }

// //   next();
// // });

// // Static method to generate order number
// orderSchema.statics.generateOrderNumber = async function () {
//   const date = new Date();
//   const year = date.getFullYear().toString().slice(-2);
//   const month = String(date.getMonth() + 1).padStart(2, '0');
//   const day = String(date.getDate()).padStart(2, '0');

//   // Find last order of the day
//   const startOfDay = new Date(date.setHours(0, 0, 0, 0));
//   const endOfDay = new Date(date.setHours(23, 59, 59, 999));

//   const lastOrder = await this.findOne({
//     createdAt: { $gte: startOfDay, $lte: endOfDay }
//   }).sort({ createdAt: -1 });

//   let sequence = 1;
//   if (lastOrder && lastOrder.orderNumber) {
//     const lastSequence = parseInt(lastOrder.orderNumber.slice(-4));
//     sequence = lastSequence + 1;
//   }

//   return `ORD${year}${month}${day}${String(sequence).padStart(4, '0')}`;
// };

// // Method to check if order can be cancelled
// orderSchema.methods.canBeCancelled = function () {
//   return ['pending', 'confirmed', 'processing'].includes(this.status);
// };

// // Method to check if order can be modified
// orderSchema.methods.canBeModified = function () {
//   return ['pending', 'confirmed'].includes(this.status);
// };

// const Order = mongoose.model('Order', orderSchema);

// module.exports = Order;


const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: false
  },
  productName: {
    type: String,
    required: true
  },
  productCode: {
    type: String
  },
  category: {
    type: String,
    enum: ['containers', 'bottles', 'bags', 'sheets', 'custom', 'other'],
    default: 'other'
  },
  description: {
    type: String
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: false,
    min: 0
  },
  totalPrice: {
    type: Number,
    required: false,
    min: 0
  },
  specifications: {
    material: String,
    color: String,
    size: String,
    weight: Number,
    customRequirements: String
  }
});

// ============================================================
// PICKUP LOCATION SCHEMA
// Alag file nahi — isi Order.js file mein define kiya hai
// Admin panel se CRUD hoga, Order create/edit pe yahan se select
// ============================================================
const pickupLocationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  state: {
    type: String,
    trim: true
  },
  pincode: {
    type: String,
    trim: true
  },
  coordinates: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    }
  },
  contactPerson: {
    type: String,
    trim: true
  },
  contactPhone: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Sirf ek hi default location ho — save se pehle baaki sab ka isDefault false karo
pickupLocationSchema.pre('save', async function (next) {
  if (this.isDefault) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next();
});

// ============================================================
// ORDER SCHEMA
// ============================================================
const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    index: true
  },
  orderType: {
    type: String,
    enum: ['retail', 'wholesale', 'bulk', 'custom'],
    default: 'retail'
  },
  items: [orderItemSchema],

  // Order create karte waqt selected PickupLocation ka snapshot yahan store hoga
  pickupLocation: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    address: {
      type: String,
      required: true
    },
    coordinates: {
      latitude: {
        type: Number,
        required: true
      },
      longitude: {
        type: Number,
        required: true
      }
    },
    contactPerson: String,
    contactPhone: String
  },

  // Delivery Location
  deliveryLocation: {
    address: {
      type: String,
      required: true
    },
    city: String,
    state: String,
    pincode: String,
    country: {
      type: String,
      default: 'India'
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    contactPerson: {
      type: String,
      required: true
    },
    contactPhone: {
      type: String,
      required: true
    },
    landmark: String,
    locationType: {
      type: String,
      enum: ['home', 'office', 'warehouse', 'store', 'other'],
      default: 'other'
    }
  },

  // Order Status
  status: {
    type: String,
    enum: [
      'pending',
      'confirmed',
      'processing',
      'ready_for_pickup',
      'assigned',
      'in_transit',
      'delivered',
      'cancelled',
      'rejected',
      'on_hold'
    ],
    default: 'pending',
    index: true
  },

  // Schedule
  scheduledPickupDate: Date,
  scheduledDeliveryDate: Date,
  expectedDeliveryDate: Date,

  // Priority
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },

  // Special Instructions
  specialInstructions: String,
  packagingInstructions: String,
  handlingInstructions: String,

  // Delivery Reference
  deliveryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Delivery',
    index: true
  },

  // Order Management
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  confirmedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  confirmedAt: Date,
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  cancelledAt: Date,
  cancellationReason: String,

  // Metadata
  notes: String,
  internalNotes: String,
  customerNotes: String,
  tags: [String]

}, {
  timestamps: true
});

// Indexes
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ customerId: 1, status: 1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ 'deliveryLocation.pincode': 1 });
orderSchema.index({ createdAt: -1 });

// Virtual for order age in hours
orderSchema.virtual('orderAgeHours').get(function () {
  if (!this.createdAt) return 0;
  const now = new Date();
  const diffMs = now - this.createdAt;
  return Math.floor(diffMs / (1000 * 60 * 60));
});

// Static method to generate order number
orderSchema.statics.generateOrderNumber = async function () {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  const startOfDay = new Date(date.setHours(0, 0, 0, 0));
  const endOfDay = new Date(date.setHours(23, 59, 59, 999));

  const lastOrder = await this.findOne({
    createdAt: { $gte: startOfDay, $lte: endOfDay }
  }).sort({ createdAt: -1 });

  let sequence = 1;
  if (lastOrder && lastOrder.orderNumber) {
    const lastSequence = parseInt(lastOrder.orderNumber.slice(-4));
    sequence = lastSequence + 1;
  }

  return `ORD${year}${month}${day}${String(sequence).padStart(4, '0')}`;
};

// Method to check if order can be cancelled
orderSchema.methods.canBeCancelled = function () {
  return ['pending', 'confirmed', 'processing'].includes(this.status);
};

// Method to check if order can be modified
orderSchema.methods.canBeModified = function () {
  return ['pending', 'confirmed'].includes(this.status);
};

// ============================================================
// EXPORTS
// Order — default export
// PickupLocation — named export (same file se)
//
// Controller mein use:
//   const Order = require('../../models/Order');
//   const { PickupLocation } = require('../../models/Order');
// ============================================================
const Order = mongoose.model('Order', orderSchema);
const PickupLocation = mongoose.model('PickupLocation', pickupLocationSchema);

module.exports = Order;
module.exports.PickupLocation = PickupLocation;