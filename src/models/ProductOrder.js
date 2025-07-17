const mongoose = require('mongoose');

const ProductOrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  products: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: Number,
    priceAtPurchase: Number,
  }],
  status: { type: String, enum: ['pending', 'confirmed', 'shipped', 'delivered'], default: 'pending' },
  shippingAddress: String,
  deliveryPartner: String,
  trackingId: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ProductOrder', ProductOrderSchema);