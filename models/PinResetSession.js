const mongoose = require('mongoose');

const pinResetSchema = new mongoose.Schema({
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: true,
    unique: true
  },
  otp: { type: String, required: true },
  otpExpires: { type: Date, required: true },
  newPin: { type: String },
  verified: { type: Boolean, default: false }
}, { timestamps: true });

// 24 hours ->  auto delete
pinResetSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('PinResetSession', pinResetSchema);