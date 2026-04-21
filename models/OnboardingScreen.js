const mongoose = require('mongoose');

const onboardingScreenSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['splash', 'tutorial'],
    required: true
  },
  mediaType: {
    type: String,
    enum: ['image', 'video'],
    required: function() { return this.type === 'splash'; }
  },
  mediaUrl: {
    type: String,
    required: function() { return this.type === 'splash'; }
  },

  // For Tutorial Screens
  imageUrl: { type: String },
  title: { type: String },
  description: { type: String },
  buttonText: { type: String, default: 'Next' },
  buttonColor: { type: String, default: '#8a8585ff' }, 

  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Ensure only one splash screen
onboardingScreenSchema.pre('save', async function(next) {
  if (this.type === 'splash' && this.isNew) {
    const existing = await this.constructor.findOne({ type: 'splash' });
    if (existing) {
      return next(new Error('Only one splash screen allowed!'));
    }
  }
  next();
});

module.exports = mongoose.model('OnboardingScreen', onboardingScreenSchema);