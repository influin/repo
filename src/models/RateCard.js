const mongoose = require('mongoose');
const { Schema } = mongoose;

const RateCardSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },

  platform: {
    type: String,
    enum: ['Instagram', 'YouTube', 'TikTok', 'LinkedIn', 'Facebook'],
    required: true,
  },

  contentType: {
    type: String,
    enum: ['Story', 'Post', 'Reel', 'Video Shoutout', 'Live Session'],
    required: true,
  },

  price: {
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    negotiable: { type: Boolean, default: false },
  },

  description: String, // Extra notes like usage rights, exclusivity, duration

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('RateCard', RateCardSchema);