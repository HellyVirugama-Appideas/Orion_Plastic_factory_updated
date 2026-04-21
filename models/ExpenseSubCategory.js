// models/ExpenseSubCategory.js
const mongoose = require('mongoose');

const expenseSubCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  icon: String,                
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 999                
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'                 
  }
}, {
  timestamps: true
});

expenseSubCategorySchema.index({ name: 1 });
expenseSubCategorySchema.index({ isActive: 1, order: 1 });

module.exports = mongoose.model('ExpenseSubCategory', expenseSubCategorySchema);