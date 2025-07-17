const mongoose = require('mongoose');

const CartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  items: [{
    type: { type: String, enum: ['product', 'service', 'tutor', 'influencer'], required: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
    quantity: { type: Number, default: 1 },
    customNote: String
  }],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Cart', CartSchema);