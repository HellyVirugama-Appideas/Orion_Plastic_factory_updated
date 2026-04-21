const mongoose = require('mongoose');

const regionSchema = new mongoose.Schema({
  regionCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  regionName: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  description: String,
  
  // Geographic Coverage
  state: {
    type: String,
    required: true
  },
  cities: [{
    type: String,
    trim: true
  }],
  
  // Zipcode Mapping
  zipcodes: [{
    zipcode: {
      type: String,
      required: true,
      match: [/^\d{6}$/, 'Zipcode must be 6 digits']
    },
    area: String,
    city: String
  }],
  
  // Region Manager
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Statistics
  stats: {
    totalCustomers: {
      type: Number,
      default: 0
    },
    totalDeliveries: {
      type: Number,
      default: 0
    },
    activeDrivers: {
      type: Number,
      default: 0
    }
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Settings
  settings: {
    autoAssignment: {
      type: Boolean,
      default: true
    },
    maxDeliveryRadius: {
      type: Number,
      default: 50 // in kilometers
    }
  },
  
  // Contact
  contactInfo: {
    phone: String,
    email: String,
    address: String
  },
  
  notes: String
  
}, { timestamps: true });

// Indexes
regionSchema.index({ regionCode: 1 });
regionSchema.index({ regionName: 1 });
regionSchema.index({ 'zipcodes.zipcode': 1 });
regionSchema.index({ state: 1 });

// Method to check if zipcode exists in region
regionSchema.methods.hasZipcode = function(zipcode) {
  return this.zipcodes.some(z => z.zipcode === zipcode);
};

// Method to add zipcode
regionSchema.methods.addZipcode = function(zipcodeData) {
  if (this.hasZipcode(zipcodeData.zipcode)) {
    throw new Error('Zipcode already exists in this region');
  }
  this.zipcodes.push(zipcodeData);
};

// Method to remove zipcode
regionSchema.methods.removeZipcode = function(zipcode) {
  this.zipcodes = this.zipcodes.filter(z => z.zipcode !== zipcode);
};

// Static method to find region by zipcode
regionSchema.statics.findByZipcode = async function(zipcode) {
  return await this.findOne({
    'zipcodes.zipcode': zipcode,
    isActive: true
  });
};

module.exports = mongoose.model('Region', regionSchema);