const mongoose = require('mongoose');

const SubscriptionPlanSchema = new mongoose.Schema({
  name: String,                 // e.g., "Free Plan", "Pro Plan"
  price: Number,                // ₹0 or ₹1000
  billingCycle: String,         // 'monthly', 'yearly', etc.
  features: [String],           // e.g., ["Influencer Booking", "Store Access"]
  durationInMonths: Number,     // e.g., 6 for free plan
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true  // Adds createdAt and updatedAt timestamps
});

module.exports = mongoose.model('SubscriptionPlan', SubscriptionPlanSchema);