const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  locationName: {
    type: String,
    required: true,
    trim: true
  },
  addressLine1: {
    type: String,
    required: true
  },
  addressLine2: String,
  city: {
    type: String,
    // required: true
  },
  state: {
    type: String,
    // required: true
  },
  zipcode: {
    type: String,
    // required: true,
    match: [/^\d{6}$/, 'Zipcode must be 6 digits']
  },
  country: {
    type: String,
    default: 'India'
  },
  coordinates: {
    latitude: Number,
    longitude: Number
  },
  regionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Region'
  },
  regionAutoAssigned: {
    type: Boolean,
    default: true
  },  
  contactPerson: {
    name: String,
    phone: String,
    email: String,
    designation: String 
  },
  isPrimary: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  googleMapLink: {
    type: String,
    trim: true,
    default: null
  }
}, { timestamps: true });

const customerSchema = new mongoose.Schema({
  customerId: {
    type: String,
    unique: true,
    ref: 'Customer',
    uppercase: true
  },
  customerType: {
    type: String,
    enum: ['individual', 'business', 'enterprise'],
    required: true,
    default: 'individual'
  },

  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  companyName: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Valid email required']
  },
  phone: {
    type: String,
    required: true,
    match: [/^5[0-9]{8}$/, 'Valid UAE phone number required (9 digits starting with 5)']
  },
  alternatePhone: {
    type: String,
    match: [/^5[0-9]{8}$/, 'Valid UAE phone number required (9 digits starting with 5)']
  },

  // Business Information (VAT Number)
  gstNumber: {
    type: String,
    uppercase: true,
    sparse: true
  },

  // Multiple Locations
  locations: [locationSchema],

  // Billing Information
  billingAddress: {
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    zipcode: String,
    country: {
      type: String,
      default: 'India'
    }
  },

  // Payment Details
  paymentTerms: {
    type: String,
    enum: ['cod', 'credit_30', 'credit_45', 'credit_60', 'credit_90', 'credit_120'],
    default: 'cod'
  },
  creditLimit: {
    type: Number,
    default: 0,
    min: 0
  },
  currentCredit: {
    type: Number,
    default: 0,
    min: 0
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'blocked', 'suspended'],
    default: 'active',
    index: true
  },

  // Preferences
  preferences: {
    feedbackNotification: {
      type: Boolean,
      default: true
    },
    smsNotification: {
      type: Boolean,
      default: true
    },
    emailNotification: {
      type: Boolean,
      default: true
    },
    preferredDeliveryTime: String,
    specialInstructions: String
  },

  // Statistics
  stats: {
    totalOrders: {
      type: Number,
      default: 0
    },
    totalDeliveries: {
      type: Number,
      default: 0
    },
    totalSpent: {
      type: Number,
      default: 0
    },
    averageOrderValue: {
      type: Number,
      default: 0
    },
    lastOrderDate: Date,
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    }
  },

  // Tags & Categories
  tags: [String],
  category: {
    type: String,
    enum: ['vip', 'regular', 'wholesale', 'retail', 'distributor'],
    default: 'regular'
  },

  // Documents
  documents: [{
    documentType: String,
    fileUrl: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Notes
  notes: String,
  internalNotes: String,

  // Account Management
  accountManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }

}, { timestamps: true });

// Indexes
customerSchema.index({ customerId: 1 });
customerSchema.index({ name: 1 });
customerSchema.index({ email: 1 });
customerSchema.index({ phone: 1 });
customerSchema.index({ status: 1 });
customerSchema.index({ 'locations.zipcode': 1 });
customerSchema.index({ 'locations.regionId': 1 });

// Pre-save middleware to generate customer ID
customerSchema.pre('save', async function (next) {
  if (!this.customerId) {
    const count = await mongoose.model('Customer').countDocuments();
    this.customerId = `CUST${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Method to get primary location
customerSchema.methods.getPrimaryLocation = function () {
  return this.locations.find(loc => loc.isPrimary) || this.locations[0];
};

// Method to add location
customerSchema.methods.addLocation = function (locationData) {
  // If this is the first location, make it primary
  if (this.locations.length === 0) {
    locationData.isPrimary = true;
  }

  this.locations.push(locationData);
};

// Method to toggle feedback notification
customerSchema.methods.toggleFeedbackNotification = function () {
  this.preferences.feedbackNotification = !this.preferences.feedbackNotification;
};

module.exports = mongoose.model('Customer', customerSchema);