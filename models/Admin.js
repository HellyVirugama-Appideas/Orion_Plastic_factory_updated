// const mongoose = require('mongoose');

// const adminSchema = new mongoose.Schema({
//   userId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true,
//     unique: true
//   },
//   department: {
//     type: String,
//     trim: true
//   },
//   employeeId: {
//     type: String,
//     unique: true,
//     trim: true
//   },
//   permissions: [{
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Permission'
//   }],
//   createdAt: {
//     type: Date,
//     default: Date.now
//   }
// }, {
//   timestamps: true
// });

// module.exports = mongoose.model('Admin', adminSchema);


// models/Admin.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  role: {
    type: String,
    enum: ['S', 'A'], // S = Super Admin, A = Sub Admin
    default: 'A'
  },
  isSuperAdmin: {
  type: Boolean,
  default: false
},
  permission: [ // For Sub Admin (role: 'A')
    {
      key: { type: String },
      module: { type: String },
      isView: { type: Boolean, default: false },
      isAdd: { type: Boolean, default: false },
      isEdit: { type: Boolean, default: false },
      isDelete: { type: Boolean, default: false }
    }
  ],

  // Admin specific fields
  department: {
    type: String,
    trim: true,
    default: 'General'
  },
  employeeId: {
    type: String,
    unique: true,
    trim: true,
    sparse: true
  },
  photo: {
    type: String,
     default: '/img/avatar.png',
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isSuperAdmin: {
    type: Boolean,
    default: false
  },

  resetPasswordToken: String,
  resetPasswordExpires: Date,

}, { timestamps: true });


// Hash password before saving
adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
adminSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Clean JSON output (password hata do)
adminSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpires;
  return obj;
};

module.exports = mongoose.model('Admin', adminSchema);