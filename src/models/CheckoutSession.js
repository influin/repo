const mongoose = require('mongoose');

const CheckoutSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cartSnapshot: Object, // Optional backup of cart at checkout
  totalAmount: Number,
  currency: { type: String, default: 'INR' },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  paymentMethod: String,
  transactionId: String,
  orderRefs: [mongoose.Schema.Types.ObjectId], // All related order IDs created

  createdAt: { type: Date, default: Date.now },
  completedAt: Date,
});

module.exports = mongoose.model('CheckoutSession', CheckoutSessionSchema);