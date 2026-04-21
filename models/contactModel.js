const mongoose = require('mongoose');

const contactSchema = mongoose.Schema(
    {
        email: {
            type: String,
            default: 'fsd',
            required: [true, 'Email is required.'],
            lowercase: true,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = new mongoose.model('contact', contactSchema);
