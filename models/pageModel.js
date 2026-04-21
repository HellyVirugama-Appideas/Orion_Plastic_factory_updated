const mongoose = require('mongoose');

const pageSchema = new mongoose.Schema({
  key: {
    type: String,
    required: [true, 'Page key is required'],
    unique: true,
    trim: true,
    lowercase: true,
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
  },
  content: {
    type: String,
    default: '',
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('Page', pageSchema);