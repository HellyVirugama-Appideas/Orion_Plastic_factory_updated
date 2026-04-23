// const mongoose = require('mongoose');

// const tempDriverSchema = new mongoose.Schema({
//     tempId: { type: String, required: true, unique: true },

//     // Step 1
//     name: String,
//     contactNumber: String,
//     emiratesId: String,
//     vehicleNumber: { type: String, uppercase: true },
//     region: String,

//     // Step 2
//     licenseNumber: { type: String, uppercase: true },
//     licenseFront: String,
//     licenseBack: String,

//     // Step 3
//     registrationNumber: { type: String, uppercase: true },
//     rcFront: String,
//     rcBack: String,

//     phone: String,
//     otp: String,
//     otpExpiresAt: Date,

//     createdAt: { type: Date, default: Date.now, expires: '72h' } // 3 days
// });

// module.exports = mongoose.model('TempDriver', tempDriverSchema);


const mongoose = require('mongoose');

const tempDriverSchema = new mongoose.Schema({
  tempId: { type: String, required: true, unique: true },
  email: {
    type: String,
    default: null,
    lowercase: true,
    trim: true
  },
  personalDetails: {
    fullName: String,
    contactNumber: String,
    emiratesId: String,
    vehicleNumber: String,
    region: String,
  },

  license: {
    licenseNumber: String,
    frontUrl: String,
    backUrl: String
  },

  Mulkia: {
    frontUrl: String,
    backUrl: String
  },

  phone: String,
  otp: String,
  otpExpiresAt: Date,

  createdAt: { type: Date, default: Date.now } ///expires: '72h'
});
tempDriverSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('TempDriver', tempDriverSchema);