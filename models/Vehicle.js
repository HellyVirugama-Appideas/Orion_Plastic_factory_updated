const mongoose = require('mongoose');

const maintenanceRecordSchema = new mongoose.Schema({
  maintenanceType: {
    type: String,
    required: true,
    enum: ['service', 'repair', 'inspection', 'oil_change', 'tire_change', 'brake_service', 'other']
  },
  description: {
    type: String,
    required: true
  },
  cost: {
    type: Number,
    required: true,
    min: 0
  },
  performedBy: {
    type: String,
    required: true
  },
  meterReading: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  nextServiceDate: Date,
  nextServiceReading: Number,
  parts: [{
    name: String,
    quantity: Number,
    cost: Number
  }],
  invoiceNumber: String,
  invoiceUrl: String,
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

const vehicleSchema = new mongoose.Schema({
  vehicleNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true
  },
  vehicleType: {
    type: String,
    required: true,
    enum: ['car', 'bike', 'auto', 'truck', 'van', 'tempo'],
    index: true
  },
  manufacturer: {
    type: String,
    required: true
  },
  model: {
    type: String,
    required: true
  },
  year: {
    type: Number,
    required: true,
    min: 1990,
    max: new Date().getFullYear() + 1
  },
  color: {
    type: String,
  },

  // Registration & Insurance
  registrationDate: {
    type: Date,
    required: true
  },
  registrationExpiryDate: {
    type: Date,
    required: true
  },
  insuranceProvider: {
    type: String,
    required: true
  },
  insurancePolicyNumber: {
    type: String,
    required: true,
    unique: true
  },
  insuranceExpiryDate: {
    type: Date,
    required: true
  },
  insuranceAmount: {
    type: Number,
    required: true,
    min: 0
  },

  // Meter/Odometer
  currentMeterReading: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  lastMeterUpdate: {
    type: Date,
    default: Date.now
  },

  // Service & Maintenance
  lastServiceDate: Date,
  lastServiceReading: Number,
  nextServiceDate: Date,
  nextServiceReading: Number,
  serviceIntervalKm: {
    type: Number,
    default: 5000
  },
  serviceIntervalDays: {
    type: Number,
    default: 180
  },

  // Documents
  documents: [{
    documentType: {
      type: String,
      enum: ['rc_book', 'insurance', 'pollution_certificate', 'fitness_certificate', 'permit', 'other']
    },
    fileUrl: String,
    documentNumber: String,
    expiryDate: Date,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Maintenance Records
  maintenanceRecords: [maintenanceRecordSchema],

  // Assignment
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    default: null,
    required: false
  },
  assignedAt: Date,
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedDriver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    default: null
  },
  // Status
  status: {
    type: String,
    enum: ['available', 'assigned', 'in_service', 'out_of_service', 'retired'],
    default: 'available',
    index: true
  },
  isActive: {
    type: Boolean,
    default: true
  },

  // Additional Info
  fuelType: {
    type: String,
    enum: ['petrol', 'diesel', 'cng', 'electric', 'hybrid'],
    required: true
  },
  seatingCapacity: Number,
  loadCapacity: Number, // in kg

  // Purchase Info
  purchaseDate: Date,
  purchasePrice: Number,
  currentValue: Number,

  notes: String,

}, { timestamps: true });

// Indexes
vehicleSchema.index({ vehicleNumber: 1 });
vehicleSchema.index({ status: 1 });
vehicleSchema.index({ vehicleType: 1 });
vehicleSchema.index({ assignedTo: 1 });

// Virtual for service due
vehicleSchema.virtual('isServiceDue').get(function () {
  if (!this.nextServiceDate && !this.nextServiceReading) return false;

  const dateDue = this.nextServiceDate && new Date(this.nextServiceDate) <= new Date();
  const readingDue = this.nextServiceReading && this.currentMeterReading >= this.nextServiceReading;

  return dateDue || readingDue;
});

// Virtual for insurance expiry warning
vehicleSchema.virtual('insuranceExpiryWarning').get(function () {
  if (!this.insuranceExpiryDate) return false;

  const daysToExpiry = Math.ceil((new Date(this.insuranceExpiryDate) - new Date()) / (1000 * 60 * 60 * 24));
  return daysToExpiry <= 30; // Warning if expires within 30 days
});

// Method to calculate next service date
vehicleSchema.methods.calculateNextService = function () {
  if (this.lastServiceDate && this.serviceIntervalDays) {
    const nextDate = new Date(this.lastServiceDate);
    nextDate.setDate(nextDate.getDate() + this.serviceIntervalDays);
    this.nextServiceDate = nextDate;
  }

  if (this.lastServiceReading && this.serviceIntervalKm) {
    this.nextServiceReading = this.lastServiceReading + this.serviceIntervalKm;
  }
};

// Method to update meter reading
vehicleSchema.methods.updateMeterReading = function (newReading) {
  if (newReading < this.currentMeterReading) {
    throw new Error('New meter reading cannot be less than current reading');
  }

  this.currentMeterReading = newReading;
  this.lastMeterUpdate = new Date();
};

module.exports = mongoose.model('Vehicle', vehicleSchema);