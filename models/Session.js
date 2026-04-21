// const mongoose = require('mongoose');

// const sessionSchema = new mongoose.Schema({
//   driverId: {
//     type: mongoose.Schema.Types.ObjectId,
//     // ref: 'Driver',
//     required: false,               
//     unique: true
//   },
//   type: {
//     type: String,
//     required: false               
//   },
//   otp: { type: String },
//   otpExpires: { type: Date },
//   oldPinVerified: { type: Boolean, default: false },
//   newPin: { type: String },
//   verified: { type: Boolean, default: false },

//   userType: {
//     type: String,
//     enum: ['driver', 'admin'],
//     required: function() { 
//       return this.token !== undefined; 
//     }
//   },
//   token: {
//     type: String,
//     required: function() { 
//       return this.type === undefined || this.type.includes('login'); 
//     }
//   },
//   deviceInfo: {
//     type: String,
//     default: 'Unknown'
//   },
//   ipAddress: { type: String }, 
//   expiresAt: { type: Date }   
// }, { timestamps: true });

// sessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

// module.exports = mongoose.model('Session', sessionSchema);

////////////////////////////////2

// const mongoose = require('mongoose');

// const sessionSchema = new mongoose.Schema({
//   driverId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Driver',
//     required: false,                
//     index: true                  
//   },
//   adminId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Admin',
//     required: false,
//     index: true
//   },
//   type: {
//     type: String,
//     required: true,               
//     enum: ['login', 'forgot_pin','login_session'],
//     index: true
//   },
//   otp: { type: String },
//   otpExpires: { type: Date },
//   oldPinVerified: { type: Boolean, default: false },
//   newPin: { type: String },
//   verified: { type: Boolean, default: false },

//   userType: {
//     type: String,
//     enum: ['driver', 'admin'],
//    index : true
//   },
//   token: {
//     type: String,
//     sparse: true,                  
//     unique: true,                  
//     required: function() { 
//       return this.type === 'login'|| this.type === 'login_session'; 
//     }
//   },
//   deviceInfo: {
//     type: String,
//     default: 'Unknown'
//   },
//   ipAddress: { type: String }, 
//   expiresAt: { type: Date }   
// }, { 
//   timestamps: true 
// });

// // sessionSchema.index({ driverId: 1, type: 1 }, { unique: true });
// // sessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 }); // auto delete old sessions
// // sessionSchema.index({ otpExpires: 1 }, { expireAfterSeconds: 0 });

// // ========== IMPORTANT: UNIQUE INDEX HATAYA (kyunki null values duplicate allow nahi karte) ==========
// sessionSchema.index({ driverId: 1, type: 1 });           // ← unique nahi, normal index
// sessionSchema.index({ adminId: 1, type: 1 });            // ← unique nahi, normal index
// sessionSchema.index({ userType: 1, type: 1 });

// // Token pe unique rakho (ye safe hai kyunki token hamesha unique hota hai)
// sessionSchema.index({ token: 1 }, { unique: true, sparse: true });

// // Auto cleanup
// sessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });
// sessionSchema.index({ otpExpires: 1 }, { expireAfterSeconds: 0 });

// module.exports = mongoose.model('Session', sessionSchema);



const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: false,
    index: true
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: false,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['login', 'forgot_pin', 'login_session'],
    index: true
  },
  otp: { type: String },
  otpExpires: { type: Date },
  oldPinVerified: { type: Boolean, default: false },
  newPin: { type: String },
  verified: { type: Boolean, default: false },

  userType: {
    type: String,
    enum: ['driver', 'admin', 'superadmin'],
    required: true,
    default: 'driver',
    index: true
  },
  token: {
    type: String,
    sparse: true,
    unique: true,
    required: function() { 
      return this.type === 'login' || this.type === 'login_session';
    }
  },
  deviceInfo: { type: String, default: 'Unknown' },
  ipAddress: { type: String },
  expiresAt: { type: Date }
}, { timestamps: true });

sessionSchema.index({ driverId: 1, type: 1 });          
sessionSchema.index({ adminId: 1, type: 1 });            
sessionSchema.index({ userType: 1, type: 1 });


sessionSchema.index({ token: 1 }, { unique: true, sparse: true });

// Auto cleanup
sessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });
sessionSchema.index({ otpExpires: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Session', sessionSchema);