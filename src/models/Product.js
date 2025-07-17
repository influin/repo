const mongoose = require('mongoose');
const { Schema } = mongoose;

const ProductSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  title: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  category: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  },
  subCategory: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
  },
  
  images: [String], // Image URLs
  thumbnail: { type: String }, // Featured image

  inventory: { type: Number, default: 0 },
  sku: { type: String, unique: true, sparse: true },
  
  tags: [String], // Search or filter tags

  shipping: {
    weight: Number,
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
    },
    isFreeShipping: { type: Boolean, default: false },
  },

  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },

  rating: { type: Number, default: 0 },
  totalSales: { type: Number, default: 0 },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Update the updatedAt field on save
ProductSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Product', ProductSchema);